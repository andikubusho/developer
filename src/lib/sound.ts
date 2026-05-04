let notificationAudio: HTMLAudioElement | null = null;

if (typeof window !== 'undefined') {
  notificationAudio = new Audio('/notification.mp3');
  // Pre-load the audio
  notificationAudio.load();
}

export const playNotificationSound = () => {
  if (!notificationAudio) return;
  
  try {
    // Reset to beginning if it was already playing
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
