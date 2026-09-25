import { CONFIG } from './config.js';
import { PRESENTES_EXEMPLO } from './exemplo.js';

export const modoDemo = !CONFIG.apiUrl;

export async function listarPresentes() {
  if (modoDemo) return PRESENTES_EXEMPLO;
  const resposta = await fetch(`${CONFIG.apiUrl}?action=presentes`);
  const dados = await resposta.json();
  if (!dados.ok) throw new Error(dados.erro || 'erro_desconhecido');
  return dados.presentes;
}

export async function obterPresente(id) {
  const presentes = await listarPresentes();
  return presentes.find((p) => p.id === id) || null;
}

export async function enviarContribuicao({ id, cotas, valor, nome, recado, site }) {
  if (modoDemo) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, excedente: false };
  }
  // text/plain evita o preflight de CORS, que o Apps Script não responde
  const resposta = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'contribuir', id, cotas, valor, nome, recado, site }),
  });
  return resposta.json();
}
