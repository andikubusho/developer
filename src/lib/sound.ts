let notificationAudio: HTMLAudioElement | null = null;
let isAudioPrimed = false;

if (typeof window !== 'undefined') {
  notificationAudio = new Audio('/notification.mp3');
  notificationAudio.load();

  // Function to "prime" or unlock audio on first interaction
  const primeAudio = () => {
    if (isAudioPrimed || !notificationAudio) return;
    
    // Play and immediately pause to satisfy browser requirements
    notificationAudio.play()
      .then(() => {
        notificationAudio!.pause();
        notificationAudio!.currentTime = 0;
        isAudioPrimed = true;
        console.log('Audio primed and unlocked');
        // Remove listeners once primed
        window.removeEventListener('click', primeAudio);
        window.removeEventListener('keydown', primeAudio);
        window.removeEventListener('touchstart', primeAudio);
      })
      .catch(() => {
        // Still blocked, will try again on next interaction
      });
  };

  window.addEventListener('click', primeAudio);
  window.addEventListener('keydown', primeAudio);
  window.addEventListener('touchstart', primeAudio);
}

export const playNotificationSound = () => {
  if (!notificationAudio) return;
  
  try {
    notificationAudio.currentTime = 0;
    const playPromise = notificationAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('Playback blocked by browser. Please click on the page first.', error);
      });
    }
  } catch (err) {
    console.warn('Notification sound failed:', err);
  }
};
