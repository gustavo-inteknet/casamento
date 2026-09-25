/**
 * Backend da lista de presentes — Gustavo & Caroline.
 * Cole este arquivo em Extensões > Apps Script da planilha, execute configurarPlanilha()
 * uma vez e publique como App da Web (Executar como: eu | Acesso: qualquer pessoa).
 * A anotação abaixo restringe o acesso do script apenas a esta planilha.
 */

/** @OnlyCurrentDoc */

var ABA_PRESENTES = 'Presentes';
var ABA_CONTRIBUICOES = 'Contribuicoes';
var CABECALHO_PRESENTES = ['id', 'nome', 'descricao', 'icone', 'imagem', 'valor_total', 'qtd_cotas', 'ativo', 'ordem'];
var CABECALHO_CONTRIBUICOES = ['data_hora', 'presente_id', 'presente_nome', 'cotas', 'valor', 'nome', 'recado', 'observacao', 'confirmado'];
var LIMITE_ENVIOS = 30;          // envios aceitos por janela
var JANELA_LIMITE_SEG = 600;     // janela de 10 minutos

var PRESENTES_INICIAIS = [
  ['passagens', 'Passagens da lua de mel', 'Para a gente chegar ao paraíso (de preferência na janela).', 'passagens', '', 3000, 30, true, 1],
  ['hotel', 'Diárias num hotel pé na areia', 'Acordar com barulho de mar e sem despertador.', 'hotel', '', 2400, 24, true, 2],
  ['jantar', 'Jantar romântico à luz de velas', 'Uma noite especial, sem louça para lavar.', 'jantar', '', 600, 6, true, 3],
  ['barco', 'Passeio de barco ao pôr do sol', 'O pôr do sol mais bonito da viagem, visto do mar.', 'barco', '', 500, 10, true, 4],
  ['geladeira', 'Geladeira nova (que não faz barulho)', 'Silenciosa, espaçosa e sempre cheia de coisa boa.', 'geladeira', '', 4000, 40, true, 5],
  ['sofa', 'Sofá para maratonar séries', 'Confortável o bastante para "só mais um episódio".', 'sofa', '', 3000, 30, true, 6],
  ['airfryer', 'Air fryer para o noivo aprender a cozinhar', 'Um voto de confiança nos dotes culinários do noivo.', 'airfryer', '', 500, 10, true, 7],
  ['cafe', 'Máquina de café para sobreviver às segundas', 'Combustível oficial das segundas-feiras.', 'cafe', '', 800, 16, true, 8],
  ['churrasco', 'Kit churrasco para os domingos em família', 'Para reunir família e amigos aos domingos.', 'churrasco', '', 400, 8, true, 9],
  ['mercado', 'Primeira compra do mercado a dois', 'O primeiro carrinho cheio da nossa casa.', 'mercado', '', 300, 6, true, 10],
  ['plantinha', 'Plantinha para testar se estamos prontos para um pet', 'Se ela sobreviver, pensamos no cachorro.', 'plantinha', '', 100, 2, true, 11],
  ['pizza', 'Pizza de reconciliação da primeira briga', 'Porque toda discussão termina melhor com pizza.', 'pizza', '', 150, 3, true, 12],
  ['sogra', 'Seguro contra a sogra', 'Cobertura completa para visitas surpresa. (Brincadeira, sogrinha!)', 'sogra', '', 250, 5, true, 13],
  ['livre', 'Contribua com o que o coração mandar', 'Escolha o valor que desejar. Todo carinho é bem-vindo.', 'livre', '', 0, 0, true, 14]
];

/* ---------- Regras puras (testadas em tests/backend.test.js) ---------- */

function linhasParaObjetos(linhas) {
  var cabecalho = linhas[0] || [];
  return linhas.slice(1)
    .filter(function (linha) { return linha[0] !== '' && linha[0] != null; })
    .map(function (linha) {
      var obj = {};
      cabecalho.forEach(function (chave, i) { obj[chave] = linha[i]; });
      return obj;
    });
}

function estaAtivo(valor) {
  return valor === true || String(valor).toUpperCase() === 'TRUE' || String(valor).toUpperCase() === 'SIM';
}

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

function montarPresentes(presentes, contribuicoes) {
  var vendidas = {};
  contribuicoes.forEach(function (c) {
    if (!estaAtivo(c.confirmado)) return; // só contam os Pix confirmados pelos noivos
    var id = String(c.presente_id);
    vendidas[id] = (vendidas[id] || 0) + (Number(c.cotas) || 0);
  });
  return presentes
    .filter(function (p) { return estaAtivo(p.ativo); })
    .map(function (p) {
      var id = String(p.id);
      var qtd = Number(p.qtd_cotas) || 0;
      var total = Number(p.valor_total) || 0;
      var livre = qtd === 0;
      var vendidasId = livre ? 0 : Math.min(vendidas[id] || 0, qtd);
      return {
        id: id,
        nome: String(p.nome || ''),
        descricao: String(p.descricao || ''),
        icone: String(p.icone || ''),
        imagem: /^https:\/\//.test(String(p.imagem || '')) ? String(p.imagem) : '',
        valor_total: total,
        qtd_cotas: qtd,
        valor_cota: livre ? 0 : arredondar(total / qtd),
        cotas_vendidas: vendidasId,
        livre: livre,
        esgotado: !livre && vendidasId >= qtd,
        ordem: Number(p.ordem) || 0
      };
    })
    .sort(function (a, b) { return a.ordem - b.ordem; });
}

function limparTexto(texto) {
  return String(texto == null ? '' : texto).replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim();
}

function protegerFormula(texto) {
  return /^[=+\-@]/.test(texto) ? "'" + texto : texto;
}

function validarContribuicao(dados, presentes) {
  var presente = presentes.filter(function (p) { return p.id === String(dados.id); })[0];
  if (!presente) return { ok: false, erro: 'nao_encontrado' };
  if (limparTexto(dados.site)) return { ok: true, ignorar: true }; // campo-isca: só robôs preenchem

  var nome = limparTexto(dados.nome);
  if (nome.length < 1 || nome.length > 80) return { ok: false, erro: 'nome_invalido' };
  var recado = limparTexto(dados.recado);
  if (recado.length > 1000) return { ok: false, erro: 'recado_invalido' };

  var cotas = 0;
  var valor;
  var observacao = '';
  if (presente.livre) {
    valor = Number(dados.valor);
    if (!isFinite(valor) || valor < 1 || valor > 100000) return { ok: false, erro: 'valor_invalido' };
    valor = arredondar(valor);
  } else {
    cotas = Number(dados.cotas);
    if (!Number.isInteger(cotas) || cotas < 1 || cotas > presente.qtd_cotas) return { ok: false, erro: 'cotas_invalidas' };
    valor = arredondar(cotas * presente.valor_cota);
    if (cotas > presente.qtd_cotas - presente.cotas_vendidas) observacao = 'excedente';
  }

  return {
    ok: true,
    registro: {
      presente_id: presente.id,
      presente_nome: protegerFormula(presente.nome),
      cotas: cotas,
      valor: valor,
      nome: protegerFormula(nome),
      recado: protegerFormula(recado),
      observacao: observacao
    }
  };
}

/** Índice (1-based) da última linha com a coluna A preenchida; caixas de seleção vazias não contam. */
function ultimaLinhaPreenchida(colunaA) {
  for (var i = colunaA.length - 1; i >= 0; i--) {
    if (colunaA[i][0] !== '' && colunaA[i][0] != null) return i + 1;
  }
  return 0;
}

/* ---------- Integração com Google Sheets ---------- */

function aba(nome) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
}

function lerPresentes() {
  return montarPresentes(
    linhasParaObjetos(aba(ABA_PRESENTES).getDataRange().getValues()),
    linhasParaObjetos(aba(ABA_CONTRIBUICOES).getDataRange().getValues())
  );
}

function responderJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Limite global de envios por janela (o Apps Script não expõe o IP de quem chama). */
function limiteExcedido() {
  var cache = CacheService.getScriptCache();
  var chave = 'envios_' + Math.floor(Date.now() / (JANELA_LIMITE_SEG * 1000));
  var total = Number(cache.get(chave) || 0) + 1;
  cache.put(chave, String(total), JANELA_LIMITE_SEG);
  return total > LIMITE_ENVIOS;
}

/** Grava na primeira linha livre (appendRow iria para o fim, depois das caixas de seleção). */
function gravarContribuicao(valores) {
  var folha = aba(ABA_CONTRIBUICOES);
  var linha = ultimaLinhaPreenchida(folha.getRange(1, 1, folha.getMaxRows(), 1).getValues()) + 1;
  if (linha > folha.getMaxRows()) folha.insertRowsAfter(folha.getMaxRows(), 100);
  folha.getRange(linha, 1, 1, valores.length).setValues([valores]);
  folha.getRange(linha, CABECALHO_CONTRIBUICOES.indexOf('confirmado') + 1).insertCheckboxes();
}

function doGet(e) {
  if (!e || !e.parameter || e.parameter.action !== 'presentes') return responderJson({ ok: false, erro: 'acao_invalida' });
  try {
    return responderJson({ ok: true, presentes: lerPresentes() });
  } catch (err) {
    console.error(err);
    return responderJson({ ok: false, erro: 'erro_interno' });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var dados = JSON.parse(e.postData.contents);
    if (dados.action !== 'contribuir') return responderJson({ ok: false, erro: 'acao_invalida' });
    if (limiteExcedido()) return responderJson({ ok: false, erro: 'limite' });
    lock.waitLock(10000);
    var resultado = validarContribuicao(dados, lerPresentes());
    if (!resultado.ok || resultado.ignorar) return responderJson({ ok: resultado.ok, erro: resultado.erro });
    var r = resultado.registro;
    gravarContribuicao([new Date(), r.presente_id, r.presente_nome, r.cotas, r.valor, r.nome, r.recado, r.observacao, false]);
    return responderJson({ ok: true, excedente: r.observacao === 'excedente' });
  } catch (err) {
    console.error(err);
    return responderJson({ ok: false, erro: 'erro_interno' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

/** Execute uma vez pelo editor do Apps Script para criar as abas e a lista inicial. */
function configurarPlanilha() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();

  var presentes = planilha.getSheetByName(ABA_PRESENTES) || planilha.insertSheet(ABA_PRESENTES);
  if (presentes.getLastRow() === 0) {
    presentes.getRange(1, 1, 1, CABECALHO_PRESENTES.length).setValues([CABECALHO_PRESENTES]).setFontWeight('bold');
    presentes.getRange(2, 1, PRESENTES_INICIAIS.length, CABECALHO_PRESENTES.length).setValues(PRESENTES_INICIAIS);
    presentes.getRange(2, 8, PRESENTES_INICIAIS.length, 1).insertCheckboxes();
    presentes.getRange(2, 6, PRESENTES_INICIAIS.length, 1).setNumberFormat('R$ #,##0.00');
    presentes.setFrozenRows(1);
    presentes.autoResizeColumns(1, CABECALHO_PRESENTES.length);
  }

  var contrib = planilha.getSheetByName(ABA_CONTRIBUICOES) || planilha.insertSheet(ABA_CONTRIBUICOES);
  if (contrib.getLastRow() === 0) {
    contrib.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm');
    contrib.getRange('E:E').setNumberFormat('R$ #,##0.00');
    contrib.setFrozenRows(1);
  }
  // Idempotente: também adiciona colunas novas (ex.: "confirmado") em planilhas já existentes.
  contrib.getRange(1, 1, 1, CABECALHO_CONTRIBUICOES.length).setValues([CABECALHO_CONTRIBUICOES]).setFontWeight('bold');
  var colConfirmado = CABECALHO_CONTRIBUICOES.indexOf('confirmado') + 1;
  contrib.getRange(2, colConfirmado, contrib.getMaxRows() - 1, 1).insertCheckboxes();
}
