import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarMoeda, valorCota, parseMoeda, escapeHtml } from '../js/format.js';

const semNbsp = (s) => s.replace(/\s/g, ' ');

test('formatarMoeda usa padrão brasileiro', () => {
  assert.equal(semNbsp(formatarMoeda(1234.5)), 'R$ 1.234,50');
  assert.equal(semNbsp(formatarMoeda(100)), 'R$ 100,00');
});

test('valorCota divide e arredonda a 2 casas', () => {
  assert.equal(valorCota(3000, 30), 100);
  assert.equal(valorCota(100, 3), 33.33);
});

test('parseMoeda aceita formatos comuns', () => {
  assert.equal(parseMoeda('50'), 50);
  assert.equal(parseMoeda('50,5'), 50.5);
  assert.equal(parseMoeda('1.234,56'), 1234.56);
  assert.equal(parseMoeda('R$ 10,00'), 10);
  assert.equal(parseMoeda(' 7 '), 7);
});

test('parseMoeda aceita ponto como decimal quando não há vírgula', () => {
  assert.equal(parseMoeda('50.5'), 50.5);
  assert.equal(parseMoeda('50.00'), 50);
  assert.equal(parseMoeda('1.234'), 1234);
  assert.equal(parseMoeda('1.234,56'), 1234.56);
});

test('parseMoeda rejeita entradas inválidas', () => {
  assert.ok(Number.isNaN(parseMoeda('')));
  assert.ok(Number.isNaN(parseMoeda('abc')));
  assert.ok(Number.isNaN(parseMoeda('10,999')));
  assert.ok(Number.isNaN(parseMoeda('-5')));
});

test('escapeHtml neutraliza HTML', () => {
  assert.equal(escapeHtml('<b>"a" & \'b\'</b>'), '&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;');
  assert.equal(escapeHtml(null), '');
});
