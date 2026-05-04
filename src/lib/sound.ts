let audioCtx: AudioContext | null = null;

// Unlock AudioContext saat ada interaksi user pertama kali
const unlockAudio = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (_) {}
};

if (typeof window !== 'undefined') {
  ['click', 'touchstart', 'keydown'].forEach(evt =>
    window.addEventListener(evt, unlockAudio, { passive: true })
  );
}

export const playNotificationSound = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);

    // Dua nada pendek: ding-ding
    [0, 0.18].forEach((offset) => {
      const osc = audioCtx!.createOscillator();
      osc.connect(gain);
      osc.type = 'sine';
      osc.frequency.value = offset === 0 ? 880 : 1100;
      gain.gain.setValueAtTime(0.35, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25);
      osc.start(now + offset);
      osc.stop(now + offset + 0.25);
    });
  } catch (err) {
    console.warn('Notification sound failed:', err);
  }
};
