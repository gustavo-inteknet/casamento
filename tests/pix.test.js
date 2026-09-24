import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc16, normalizar, gerarPayloadPix } from '../js/pix.js';

const EXEMPLO_BACEN =
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';

test('crc16 bate com vetor padrão CCITT-FALSE', () => {
  assert.equal(crc16('123456789'), '29B1');
});

test('payload sem valor reproduz o exemplo do manual do Bacen', () => {
  const payload = gerarPayloadPix({
    chave: '123e4567-e12b-12d1-a456-426655440000',
    nome: 'Fulano de Tal',
    cidade: 'BRASILIA',
  });
  assert.equal(payload, EXEMPLO_BACEN);
});

test('payload com valor inclui campo 54 e CRC válido', () => {
  const payload = gerarPayloadPix({
    chave: '123e4567-e12b-12d1-a456-426655440000',
    nome: 'Fulano de Tal',
    cidade: 'BRASILIA',
    valor: 150,
  });
  assert.ok(payload.includes('5406150.00'));
  const semCrc = payload.slice(0, -4);
  assert.ok(semCrc.endsWith('6304'));
  assert.equal(payload.slice(-4), crc16(semCrc));
});

test('normalizar remove acentos, símbolos e trunca', () => {
  assert.equal(normalizar('Brasília', 15), 'Brasilia');
  assert.equal(normalizar('José  Conceição & Cia', 25), 'Jose Conceicao Cia');
  assert.equal(normalizar('Um nome muito comprido demais aqui', 25).length, 25);
});

test('nome com acento gera campo 59 com tamanho correto', () => {
  const payload = gerarPayloadPix({ chave: 'abc', nome: 'João', cidade: 'Curitiba', valor: 1 });
  assert.ok(payload.includes('5904Joao'));
  assert.ok(payload.includes('6008Curitiba'));
});
