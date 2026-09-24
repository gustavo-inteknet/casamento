import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularContagem } from '../js/contagem.js';

const alvo = Date.parse('2026-12-12T10:30:00-03:00');
const H = 3600 * 1000;

test('antes do casamento decompõe o tempo restante', () => {
  const agora = alvo - (2 * 24 * H + 3 * H + 4 * 60 * 1000 + 5 * 1000);
  assert.deepEqual(calcularContagem(alvo, agora), { fase: 'antes', dias: 2, horas: 3, minutos: 4, segundos: 5 });
});

test('no momento e durante o dia é "hoje"', () => {
  assert.deepEqual(calcularContagem(alvo, alvo), { fase: 'hoje' });
  assert.deepEqual(calcularContagem(alvo, alvo + 13 * H), { fase: 'hoje' });
});

test('depois do dia é "depois"', () => {
  assert.deepEqual(calcularContagem(alvo, alvo + 14 * H), { fase: 'depois' });
});
