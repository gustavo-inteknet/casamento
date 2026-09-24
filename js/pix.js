// BR Code estático do Pix — Manual de Padrões para Iniciação do Pix (Banco Central do Brasil)
const GUI_PIX = 'br.gov.bcb.pix';

function campo(id, valor) {
  return id + String(valor.length).padStart(2, '0') + valor;
}

export function crc16(texto) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function normalizar(texto, max) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

export function gerarPayloadPix({ chave, nome, cidade, valor, txid = '***' }) {
  const conta = campo('00', GUI_PIX) + campo('01', chave);
  let payload = campo('00', '01') + campo('26', conta) + campo('52', '0000') + campo('53', '986');
  if (valor != null) payload += campo('54', Number(valor).toFixed(2));
  payload +=
    campo('58', 'BR') +
    campo('59', normalizar(nome, 25)) +
    campo('60', normalizar(cidade, 15)) +
    campo('62', campo('05', txid)) +
    '6304';
  return payload + crc16(payload);
}
