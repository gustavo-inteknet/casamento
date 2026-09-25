import { CONFIG } from './config.js';
import { obterPresente, enviarContribuicao, modoDemo } from './api.js';
import { formatarMoeda, parseMoeda, escapeHtml } from './format.js';
import { gerarPayloadPix } from './pix.js';
import { iconeSvg, preencherIcones } from './icons.js';
import { mostrarBannerDemo } from './ui.js';

const $ = (id) => document.getElementById(id);
const ETAPAS = ['carregando', 'aviso', 'escolha', 'pagamento', 'recado', 'obrigado'];
const ERROS = {
  nao_encontrado: 'Este presente não está mais disponível.',
  cotas_invalidas: 'Quantidade de cotas inválida.',
  valor_invalido: 'Valor inválido.',
  nome_invalido: 'Informe seu nome (até 80 caracteres).',
  recado_invalido: 'O recado pode ter até 1000 caracteres.',
};

const estado = { presente: null, quantidade: 1, valor: 0, payload: '' };

preencherIcones(document);
if (modoDemo) mostrarBannerDemo();
carregar();

function mostrar(etapa) {
  for (const e of ETAPAS) $(`etapa-${e}`).hidden = e !== etapa;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function aviso(texto, podeTentar = false) {
  $('aviso-texto').textContent = texto;
  $('aviso-tentar').hidden = !podeTentar;
  mostrar('aviso');
}

async function carregar() {
  mostrar('carregando');
  const id = new URLSearchParams(location.search).get('id');
  let presente;
  try {
    presente = id ? await obterPresente(id) : null;
  } catch (err) {
    console.error(err);
    return aviso('Não conseguimos carregar o presente agora. Tente novamente em instantes.', true);
  }
  if (!presente) return aviso('Presente não encontrado.');
  if (presente.esgotado) return aviso('Este presente já foi todo presenteado. Que tal escolher outro?');
  estado.presente = presente;
  renderEscolha();
}

function restantes() {
  const p = estado.presente;
  return p.qtd_cotas - p.cotas_vendidas;
}

function renderEscolha() {
  const p = estado.presente;
  $('escolha-icone').innerHTML = p.imagem ? `<img src="${escapeHtml(p.imagem)}" alt="">` : iconeSvg(p.icone || p.id);
  $('escolha-nome').textContent = p.nome;
  $('escolha-descricao').textContent = p.descricao;
  $('bloco-cotas').hidden = p.livre;
  $('bloco-livre').hidden = !p.livre;
  if (!p.livre) {
    $('escolha-cota').textContent = `${formatarMoeda(p.valor_cota)} por cota`;
    $('restantes').textContent = `${restantes()} cota(s) disponível(is)`;
  }
  atualizarTotal();
  mostrar('escolha');
}

function atualizarTotal() {
  const p = estado.presente;
  if (p.livre) {
    const v = parseMoeda($('valor-livre').value);
    estado.valor = Number.isNaN(v) ? 0 : v;
  } else {
    $('quantidade').textContent = estado.quantidade;
    $('menos').disabled = estado.quantidade <= 1;
    $('mais').disabled = estado.quantidade >= restantes();
    estado.valor = Math.round(estado.quantidade * p.valor_cota * 100) / 100;
  }
  $('total').textContent = formatarMoeda(estado.valor);
}

$('menos').addEventListener('click', () => { estado.quantidade = Math.max(1, estado.quantidade - 1); atualizarTotal(); });
$('mais').addEventListener('click', () => { estado.quantidade = Math.min(restantes(), estado.quantidade + 1); atualizarTotal(); });
$('valor-livre').addEventListener('input', atualizarTotal);
$('aviso-tentar').addEventListener('click', carregar);
$('voltar-escolha').addEventListener('click', () => mostrar('escolha'));
$('ja-paguei').addEventListener('click', () => { mostrar('recado'); $('nome').focus(); });

$('ir-pagamento').addEventListener('click', () => {
  const erro = $('escolha-erro');
  erro.hidden = true;
  if (estado.presente.livre && (estado.valor < 1 || estado.valor > 100000)) {
    erro.textContent = 'Informe um valor entre R$ 1,00 e R$ 100.000,00.';
    erro.hidden = false;
    return;
  }
  if (!CONFIG.chavePix) {
    erro.textContent = 'Chave Pix não configurada (js/config.js).';
    erro.hidden = false;
    console.error('[casamento] CONFIG.chavePix vazio.');
    return;
  }
  estado.payload = gerarPayloadPix({
    chave: CONFIG.chavePix,
    nome: CONFIG.nomeRecebedor,
    cidade: CONFIG.cidade,
    valor: estado.valor,
  });
  try {
    $('qr').innerHTML = qrSvg(estado.payload);
    $('qr').hidden = false;
  } catch (err) {
    console.error(err);
    $('qr').hidden = true;
  }
  $('copia-cola').textContent = estado.payload;
  $('pagamento-total').textContent = formatarMoeda(estado.valor);
  $('recebedor').textContent = CONFIG.nomeRecebedor;
  $('copiar').textContent = 'Copiar código Pix';
  mostrar('pagamento');
});

$('copiar').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(estado.payload);
    $('copiar').textContent = 'Copiado!';
  } catch {
    const selecao = window.getSelection();
    const faixa = document.createRange();
    faixa.selectNodeContents($('copia-cola'));
    selecao.removeAllRanges();
    selecao.addRange(faixa);
    $('copiar').textContent = 'Selecionado — copie manualmente';
  }
});

$('form-recado').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const erro = $('recado-erro');
  const botao = $('enviar');
  const nome = $('nome').value.trim();
  const recado = $('recado').value.trim();
  erro.hidden = true;
  if (!nome || nome.length > 80) {
    erro.textContent = ERROS.nome_invalido;
    erro.hidden = false;
    return;
  }
  botao.disabled = true;
  botao.textContent = 'Enviando…';
  try {
    const p = estado.presente;
    const resposta = await enviarContribuicao({
      id: p.id,
      cotas: p.livre ? 0 : estado.quantidade,
      valor: estado.valor,
      nome,
      recado,
    });
    if (!resposta.ok) throw Object.assign(new Error(resposta.erro), { codigo: resposta.erro });
    $('obrigado-texto').textContent = `${nome}, seu carinho agora faz parte da nossa história. Mal podemos esperar para celebrar com você!`;
    mostrar('obrigado');
  } catch (err) {
    console.error(err);
    erro.textContent = ERROS[err.codigo] || 'Não foi possível enviar. Verifique sua conexão e tente novamente.';
    erro.hidden = false;
  } finally {
    botao.disabled = false;
    botao.textContent = 'Enviar';
  }
});

function qrSvg(texto) {
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" role="img" aria-label="QR Code Pix"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#1f2d4d"/></svg>`;
}
