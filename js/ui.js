export function mostrarBannerDemo() {
  const banner = document.createElement('div');
  banner.className = 'banner-demo';
  banner.textContent = 'Modo demonstração — configure apiUrl e chavePix em js/config.js.';
  document.body.prepend(banner);
  console.warn('[casamento] Modo demonstração: CONFIG.apiUrl vazio.');
}
