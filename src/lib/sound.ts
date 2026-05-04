let notificationAudio: HTMLAudioElement | null = null;
let isAudioPrimed = false;

if (typeof window !== 'undefined') {
  notificationAudio = new Audio('/notification.mp3');
  notificationAudio.load();
  notificationAudio.volume = 1.0;

  // Function to "prime" or unlock audio on first interaction
  const primeAudio = () => {
    if (isAudioPrimed || !notificationAudio) return;
    
    // Play and immediately pause to satisfy browser requirements
    notificationAudio.play()
      .then(() => {
        notificationAudio!.pause();
        notificationAudio!.currentTime = 0;
        isAudioPrimed = true;
        console.log('🔔 Notification Audio: Primed and unlocked');
        // Remove listeners once primed
        window.removeEventListener('click', primeAudio);
        window.removeEventListener('keydown', primeAudio);
        window.removeEventListener('touchstart', primeAudio);
      })
      .catch((err) => {
        console.warn('🔔 Notification Audio: Unlock failed, will retry on next click', err);
      });
  };

  window.addEventListener('click', primeAudio);
  window.addEventListener('keydown', primeAudio);
  window.addEventListener('touchstart', primeAudio);
}

export const playNotificationSound = () => {
  if (!notificationAudio) {
    console.warn('🔔 Notification Audio: Audio object not initialized');
    return;
  }
  
  try {
    notificationAudio.currentTime = 0;
    notificationAudio.muted = false;
    notificationAudio.volume = 1.0;
    
    const playPromise = notificationAudio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => console.log('🔔 Notification Audio: Playing...'))
        .catch(error => {
          console.warn('🔔 Notification Audio: Playback blocked by browser.', error);
          // Fallback to vibration if possible
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        });
    }
  } catch (err) {
    console.warn('🔔 Notification Audio: Exception in play()', err);
  }
};
