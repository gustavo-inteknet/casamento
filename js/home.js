import { CONFIG } from './config.js';
import { listarPresentes, modoDemo } from './api.js';
import { formatarMoeda, escapeHtml } from './format.js';
import { calcularContagem } from './contagem.js';
import { iconeSvg, preencherIcones } from './icons.js';
import { mostrarBannerDemo } from './ui.js';

preencherIcones(document);
if (modoDemo) mostrarBannerDemo();
iniciarContagem();
carregarPresentes();

function iniciarContagem() {
  const el = document.getElementById('contagem');
  const alvo = Date.parse(CONFIG.dataCasamento);
  const campos = Object.fromEntries([...el.querySelectorAll('[data-unidade]')].map((s) => [s.dataset.unidade, s]));

  function atualizar() {
    const c = calcularContagem(alvo, Date.now());
    if (c.fase !== 'antes') {
      clearInterval(timer);
      el.innerHTML = `<p class="contagem__fim">${c.fase === 'hoje' ? 'Hoje é o grande dia!' : 'Obrigado por celebrar conosco!'}</p>`;
      return;
    }
    for (const unidade of ['dias', 'horas', 'minutos', 'segundos']) {
      campos[unidade].textContent = String(c[unidade]).padStart(2, '0');
    }
  }
  const timer = setInterval(atualizar, 1000);
  atualizar();
}

async function carregarPresentes() {
  const grid = document.getElementById('lista-presentes');
  grid.innerHTML = '<p class="estado" style="grid-column:1/-1">Carregando presentes…</p>';
  try {
    const presentes = await listarPresentes();
    const ordenados = [...presentes].sort((a, b) => Number(a.esgotado) - Number(b.esgotado));
    grid.innerHTML = ordenados.map(cartaoPresente).join('');
  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div class="estado" style="grid-column:1/-1">
        <p>Não conseguimos carregar a lista agora. Tente novamente em instantes.</p>
        <button class="botao" type="button" id="tentar-novamente">Tentar novamente</button>
      </div>`;
    document.getElementById('tentar-novamente').addEventListener('click', carregarPresentes);
  }
}

function cartaoPresente(p) {
  const icone = p.imagem
    ? `<img src="${escapeHtml(p.imagem)}" alt="" loading="lazy">`
    : iconeSvg(p.icone || p.id);
  const link = `presente.html?id=${encodeURIComponent(p.id)}`;

  if (p.livre) {
    return `
      <article class="presente presente--livre">
        <div class="presente__icone">${icone}</div>
        <h3>${escapeHtml(p.nome)}</h3>
        <p>${escapeHtml(p.descricao)}</p>
        <div class="presente__valor">Valor livre</div>
        <a class="botao botao--cheio" href="${link}">Presentear</a>
      </article>`;
  }

  const pct = Math.round((p.cotas_vendidas / p.qtd_cotas) * 100);
  return `
    <article class="presente${p.esgotado ? ' presente--esgotado' : ''}">
      ${p.esgotado ? '<span class="selo">Esgotado</span>' : ''}
      <div class="presente__icone">${icone}</div>
      <h3>${escapeHtml(p.nome)}</h3>
      <p>${escapeHtml(p.descricao)}</p>
      <div class="presente__valor">${formatarMoeda(p.valor_cota)} <small>por cota</small></div>
      <div class="progresso" role="progressbar" aria-valuemin="0" aria-valuemax="${p.qtd_cotas}" aria-valuenow="${p.cotas_vendidas}" aria-label="Cotas presenteadas"><span style="width:${pct}%"></span></div>
      <div class="presente__cotas">${p.cotas_vendidas} de ${p.qtd_cotas} cotas</div>
      ${p.esgotado
        ? '<button class="botao" type="button" disabled>Esgotado</button>'
        : `<a class="botao botao--cheio" href="${link}">Presentear</a>`}
    </article>`;
}
