// Unlock audio context dengan user interaction pertama
let unlocked = false;

const unlock = () => {
  if (unlocked) return;
  // Buat AudioContext kosong untuk membuka autoplay gate browser
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      // Buat oscilator senyap sesaat untuk unlock
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0; // volume 0 — tidak terdengar
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.001);
      ctx.resume().then(() => { unlocked = true; });
    }
  } catch {}
};

if (typeof window !== 'undefined') {
  window.addEventListener('click', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });
  window.addEventListener('touchstart', unlock, { once: false });
}

export const playNotificationSound = () => {
  if (typeof window === 'undefined') return;
  try {
    // Buat Audio baru setiap kali — hindari masalah state audio element lama
    const audio = new Audio('/notification.mp3');
    audio.volume = 1.0;
    audio.play().catch(() => {
      // Fallback: coba unlock dulu, lalu play setelah delay kecil
      unlock();
      setTimeout(() => {
        const retry = new Audio('/notification.mp3');
        retry.volume = 1.0;
        retry.play().catch(() => {
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        });
      }, 200);
    });
  } catch {}
};
