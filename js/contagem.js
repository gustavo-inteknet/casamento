const DURACAO_HOJE_MS = 13.5 * 3600 * 1000; // do horário da cerimônia até 23:59 do dia

export function calcularContagem(alvoMs, agoraMs) {
  const diff = alvoMs - agoraMs;
  if (diff <= 0) return { fase: -diff < DURACAO_HOJE_MS ? 'hoje' : 'depois' };
  const s = Math.floor(diff / 1000);
  return {
    fase: 'antes',
    dias: Math.floor(s / 86400),
    horas: Math.floor((s % 86400) / 3600),
    minutos: Math.floor((s % 3600) / 60),
    segundos: s % 60,
  };
}
