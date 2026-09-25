const ICONES = {
  passagens: '<path d="M4 26l40-16-10 30-9-10-7 6 1-9 19-15-24 13z"/>',
  hotel: '<circle cx="24" cy="18" r="7"/><path d="M24 5v3M11 18H8M40 18h-3M14.5 8.5l2 2M33.5 8.5l-2 2"/><path d="M4 32c5-4 9-4 14 0s9 4 14 0 9-4 12-1M4 40c5-4 9-4 14 0s9 4 14 0 9-4 12-1"/>',
  jantar: '<rect x="13" y="22" width="6" height="18" rx="1"/><rect x="29" y="22" width="6" height="18" rx="1"/><path d="M16 12c-2 3-2 6 0 7 2-1 2-4 0-7zM32 12c-2 3-2 6 0 7 2-1 2-4 0-7zM8 42h32"/>',
  barco: '<path d="M24 6v28M24 8l14 22H24M22 12L10 30h12"/><path d="M6 34h36l-5 7H11z"/><path d="M4 45c4-2 8-2 12 0s8 2 12 0 8-2 12 0"/>',
  geladeira: '<rect x="13" y="4" width="22" height="40" rx="3"/><path d="M13 18h22M18 9v5M18 23v8"/>',
  sofa: '<path d="M8 22v-6a4 4 0 014-4h24a4 4 0 014 4v6"/><path d="M4 26a4 4 0 018 0v4h24v-4a4 4 0 018 0v10H4z"/><path d="M8 36v4M40 36v4"/>',
  airfryer: '<path d="M12 10a6 6 0 016-6h12a6 6 0 016 6v28a4 4 0 01-4 4H16a4 4 0 01-4-4z"/><circle cx="24" cy="14" r="3"/><rect x="16" y="24" width="16" height="12" rx="2"/><path d="M22 30h4"/>',
  cafe: '<path d="M8 18h26v10a10 10 0 01-10 10h-6A10 10 0 018 28z"/><path d="M34 21h3a4 4 0 010 8h-3"/><path d="M16 6c-2 3 2 5 0 8M22 6c-2 3 2 5 0 8M28 6c-2 3 2 5 0 8M6 42h30"/>',
  churrasco: '<path d="M8 20h32a16 16 0 01-32 0z"/><path d="M16 34l-4 10M32 34l4 10M24 36v8"/><path d="M18 6c-2 3 2 5 0 8M24 6c-2 3 2 5 0 8M30 6c-2 3 2 5 0 8"/>',
  mercado: '<path d="M4 8h6l5 22h22l4-15H12"/><circle cx="18" cy="38" r="3"/><circle cx="34" cy="38" r="3"/>',
  plantinha: '<path d="M14 30h20l-3 14H17z"/><path d="M24 30V16"/><path d="M24 20c0-6-5-10-11-10 0 6 5 10 11 10zM24 16c0-6 5-10 11-10 0 6-5 10-11 10z"/>',
  pizza: '<path d="M24 6L6 40c11 5 25 5 36 0z"/><path d="M9 34c9 4 21 4 30 0"/><circle cx="22" cy="22" r="2"/><circle cx="28" cy="30" r="2"/><circle cx="18" cy="31" r="2"/>',
  sogra: '<path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10z"/><path d="M24 31s-8-5-8-10a4 4 0 018-1 4 4 0 018 1c0 5-8 10-8 10z"/>',
  livre: '<path d="M24 40S6 29 6 17a9 9 0 0118-3 9 9 0 0118 3c0 12-18 23-18 23z"/>',
  presente: '<rect x="6" y="18" width="36" height="10" rx="1"/><path d="M9 28v14h30V28M24 18v24"/><path d="M24 18c-4 0-10-2-10-7 0-3 3-5 6-3 3 2 4 10 4 10zM24 18c4 0 10-2 10-7 0-3-3-5-6-3-3 2-4 10-4 10z"/>',
  coracoes: '<path d="M18 36S6 28 6 19a6 6 0 0112-2 6 6 0 0112 2c0 9-12 17-12 17z"/><path d="M30 36s-12-8-12-17a6 6 0 0112-2 6 6 0 0112 2c0 9-12 17-12 17z"/>',
  calendario: '<rect x="8" y="10" width="32" height="30" rx="3"/><path d="M8 18h32M16 6v8M32 6v8M15 25h2M23 25h2M31 25h2M15 32h2M23 32h2M31 32h2"/>',
  igreja: '<path d="M24 4v8M21 7h6M14 22l10-10 10 10M16 20v22h16V20M8 42h32M21 42v-7a3 3 0 016 0v7"/><circle cx="24" cy="26" r="2"/>',
  tacas: '<path d="M12 6h10l-1 11a4 4 0 01-8 0zM17 21v15M13 36h8M26 6h10l-1 11a4 4 0 01-8 0zM31 21v15M27 36h8"/>',
  aliancas: '<circle cx="19" cy="28" r="10"/><circle cx="29" cy="28" r="10"/><path d="M26 13l3-5 3 5-3 3z"/>',
};

export function iconeSvg(chave) {
  const corpo = ICONES[chave] || ICONES.presente;
  return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`;
}

export function preencherIcones(raiz) {
  raiz.querySelectorAll('[data-icone]').forEach((el) => {
    el.innerHTML = iconeSvg(el.dataset.icone);
  });
}
