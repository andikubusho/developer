export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.play().catch((error) => {
      console.warn('Audio playback failed (usually due to browser autoplay policy):', error);
    });
  } catch (error) {
    console.error('Failed to initialize audio:', error);
  }
};
