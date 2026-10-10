import { NeoTheme } from '../types';

export function applyTheme(_theme: NeoTheme = 'original') {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', 'original');
  try {
    localStorage.setItem('cofreadmin_theme', 'original');
  } catch (e) {
    // Ignore storage issues in sandboxed iframes
  }
}

export function getStoredTheme(): NeoTheme {
  return 'original';
}

