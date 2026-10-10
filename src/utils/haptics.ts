// Haptic feedback & sound feedback utility for mobile and web
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') {
  if (typeof window === 'undefined') return;

  try {
    if ('vibrate' in navigator) {
      switch (type) {
        case 'light':
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(30);
          break;
        case 'heavy':
          navigator.vibrate(50);
          break;
        case 'success':
          navigator.vibrate([20, 50, 40]);
          break;
        case 'warning':
          navigator.vibrate([40, 60, 40, 60]);
          break;
      }
    }
  } catch (e) {
    // Ignore if not supported
  }
}
