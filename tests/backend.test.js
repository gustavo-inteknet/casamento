import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({});
vm.runInContext(readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), ctx);
const plain = (x) => JSON.parse(JSON.stringify(x)); // objetos de outro realm

const PRESENTES = [
  { id: 'sofa', nome: 'Sofá', descricao: 'd', icone: 'sofa', imagem: '', valor_total: 3000, qtd_cotas: 30, ativo: true, ordem: 2 },
  { id: 'cafe', nome: 'Café', descricao: 'd', icone: 'cafe', imagem: '', valor_total: 100, qtd_cotas: 2, ativo: true, ordem: 1 },
  { id: 'oculto', nome: 'Oculto', descricao: '', icone: '', imagem: '', valor_total: 50, qtd_cotas: 1, ativo: false, ordem: 3 },
  { id: 'livre', nome: 'Livre', descricao: '', icone: 'livre', imagem: '', valor_total: 0, qtd_cotas: 0, ativo: true, ordem: 4 },
];
const CONTRIB = [
  { presente_id: 'cafe', cotas: 2, confirmado: true },
  { presente_id: 'sofa', cotas: 3, confirmado: true },
  { presente_id: 'sofa', cotas: 2, confirmado: 'TRUE' },
  { presente_id: 'sofa', cotas: 10, confirmado: false },
  { presente_id: 'sofa', cotas: 7, confirmado: '' },
];

test('linhasParaObjetos usa cabeçalho e ignora linhas vazias', () => {
  const r = plain(ctx.linhasParaObjetos([['id', 'nome'], ['a', 'A'], ['', ''], ['b', 'B']]));
  assert.deepEqual(r, [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }]);
});

test('montarPresentes filtra inativos, ordena e soma cotas', () => {
  const r = plain(ctx.montarPresentes(PRESENTES, CONTRIB));
  assert.deepEqual(r.map((p) => p.id), ['cafe', 'sofa', 'livre']);
  const [cafe, sofa, livre] = r;
  assert.equal(cafe.cotas_vendidas, 2);
  assert.equal(cafe.esgotado, true);
  assert.equal(cafe.valor_cota, 50);
  assert.equal(sofa.cotas_vendidas, 5);
  assert.equal(sofa.esgotado, false);
  assert.equal(livre.livre, true);
  assert.equal(livre.esgotado, false);
});

test('montarPresentes limita vendidas a qtd_cotas', () => {
  const r = plain(ctx.montarPresentes(PRESENTES, [...CONTRIB, { presente_id: 'cafe', cotas: 1, confirmado: true }]));
  assert.equal(r[0].cotas_vendidas, 2);
});

test('montarPresentes aceita "TRUE" textual em ativo', () => {
  const r = plain(ctx.montarPresentes([{ ...PRESENTES[0], ativo: 'TRUE' }], []));
  assert.equal(r.length, 1);
});

test('montarPresentes conta apenas contribuições confirmadas', () => {
  const pendentes = CONTRIB.map((c) => ({ ...c, confirmado: false }));
  const r = plain(ctx.montarPresentes(PRESENTES, pendentes));
  assert.equal(r.find((p) => p.id === 'sofa').cotas_vendidas, 0);
  assert.equal(r.find((p) => p.id === 'cafe').esgotado, false);
});

test('montarPresentes aceita apenas imagens https', () => {
  const com = (imagem) => plain(ctx.montarPresentes([{ ...PRESENTES[0], imagem }], []))[0].imagem;
  assert.equal(com('https://exemplo.com/a.jpg'), 'https://exemplo.com/a.jpg');
  assert.equal(com('http://exemplo.com/a.jpg'), '');
  assert.equal(com('javascript:alert(1)'), '');
});

const lista = () => ctx.montarPresentes(PRESENTES, CONTRIB);

test('contribuição válida em cotas calcula valor', () => {
  const r = plain(ctx.validarContribuicao({ id: 'sofa', cotas: 3, nome: ' Ana ', recado: 'Felicidades!' }, lista()));
  assert.deepEqual(r, {
    ok: true,
    registro: { presente_id: 'sofa', presente_nome: 'Sofá', cotas: 3, valor: 300, nome: 'Ana', recado: 'Felicidades!', observacao: '' },
  });
});

test('cotas acima das restantes gravam como excedente', () => {
  const r = plain(ctx.validarContribuicao({ id: 'cafe', cotas: 1, nome: 'Bia', recado: '' }, lista()));
  assert.equal(r.ok, true);
  assert.equal(r.registro.observacao, 'excedente');
});

test('valor livre usa o valor informado', () => {
  const r = plain(ctx.validarContribuicao({ id: 'livre', valor: 77.456, nome: 'Caio' }, lista()));
  assert.equal(r.registro.valor, 77.46);
  assert.equal(r.registro.cotas, 0);
});

test('erros de validação', () => {
  const v = (d) => plain(ctx.validarContribuicao(d, lista())).erro;
  assert.equal(v({ id: 'nada', cotas: 1, nome: 'X' }), 'nao_encontrado');
  assert.equal(v({ id: 'oculto', cotas: 1, nome: 'X' }), 'nao_encontrado');
  assert.equal(v({ id: 'sofa', cotas: 0, nome: 'X' }), 'cotas_invalidas');
  assert.equal(v({ id: 'sofa', cotas: 1.5, nome: 'X' }), 'cotas_invalidas');
  assert.equal(v({ id: 'sofa', cotas: 31, nome: 'X' }), 'cotas_invalidas');
  assert.equal(v({ id: 'livre', valor: 0.5, nome: 'X' }), 'valor_invalido');
  assert.equal(v({ id: 'livre', valor: 'abc', nome: 'X' }), 'valor_invalido');
  assert.equal(v({ id: 'livre', valor: 100001, nome: 'X' }), 'valor_invalido');
  assert.equal(v({ id: 'sofa', cotas: 1, nome: '   ' }), 'nome_invalido');
  assert.equal(v({ id: 'sofa', cotas: 1, nome: 'x'.repeat(81) }), 'nome_invalido');
  assert.equal(v({ id: 'sofa', cotas: 1, nome: 'X', recado: 'y'.repeat(1001) }), 'recado_invalido');
});

test('protege contra injeção de fórmula e remove controles', () => {
  const r = plain(ctx.validarContribuicao({ id: 'sofa', cotas: 1, nome: '=HYPERLINK("x")', recado: 'oi\u0007\nbeijos' }, lista()));
  assert.equal(r.registro.nome, '\'=HYPERLINK("x")');
  assert.equal(r.registro.recado, 'oi\nbeijos');
  assert.equal(ctx.protegerFormula('+55'), "'+55");
  assert.equal(ctx.protegerFormula('normal'), 'normal');
});

test('campo-isca preenchido é ignorado sem erro', () => {
  const r = plain(ctx.validarContribuicao({ id: 'sofa', cotas: 1, nome: 'Robô', site: 'http://spam' }, lista()));
  assert.deepEqual(r, { ok: true, ignorar: true });
});
