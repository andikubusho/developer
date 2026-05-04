let audioCtx: AudioContext | null = null;

const getCtx = (): AudioContext => {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
};

// Unlock saat interaksi pertama user
const unlockOnce = () => {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (_) {}
};

if (typeof window !== 'undefined') {
  document.addEventListener('click', unlockOnce, { once: true });
  document.addEventListener('touchstart', unlockOnce, { once: true });
  document.addEventListener('keydown', unlockOnce, { once: true });
}

const doBeep = (ctx: AudioContext) => {
  const now = ctx.currentTime;
  [[880, now, now + 0.25], [1100, now + 0.18, now + 0.43]].forEach(([freq, start, stop]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.4, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);
    osc.start(start);
    osc.stop(stop);
  });
};

export const playNotificationSound = () => {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => doBeep(ctx)).catch(() => {});
    } else {
      doBeep(ctx);
    }
  } catch (err) {
    console.warn('Notification sound failed:', err);
  }
};
