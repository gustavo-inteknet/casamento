const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor) {
  return moeda.format(valor);
}

export function valorCota(total, qtd) {
  return Math.round((total / qtd) * 100) / 100;
}

export function parseMoeda(texto) {
  const limpo = String(texto ?? '').replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return NaN;
  return Number(limpo);
}

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}
