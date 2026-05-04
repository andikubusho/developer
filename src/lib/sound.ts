// Global audio instance
let audio: HTMLAudioElement | null = null;
let isUnlocked = false;

// Fungsi untuk inisialisasi audio (hanya sekali)
const initAudio = () => {
  if (audio) return audio;
  audio = new Audio('/notification.mp3');
  audio.preload = 'auto';
  return audio;
};

// Fungsi untuk unlock audio saat interaksi pertama
const unlockAudio = () => {
  const a = initAudio();
  
  // Putar sebentar lalu pause untuk unlock autoplay browser
  a.volume = 0;
  a.play()
    .then(() => {
      a.pause();
      a.currentTime = 0;
      a.volume = 1;
      isUnlocked = true;
      // Hapus listener setelah berhasil unlock
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      console.log('🔊 Audio system unlocked');
    })
    .catch((err) => {
      console.warn('⚠️ Audio unlock failed, waiting for next interaction:', err);
    });
};

// Pasang listener untuk interaksi pertama user
if (typeof window !== 'undefined') {
  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
}

export const playNotificationSound = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const a = initAudio();
    
    // Reset ke awal jika sedang berputar
    a.currentTime = 0;
    a.volume = 1;
    
    const playPromise = a.play();
    
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.error('❌ Playback failed:', error);
        // Jika gagal (karena belum unlock), coba vibrate sebagai cadangan
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      });
    }
  } catch (err) {
    console.error('💥 Audio error:', err);
  }
};
