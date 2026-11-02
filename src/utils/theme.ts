import { NeoTheme } from '../types';

export function applyTheme(_theme: NeoTheme = 'original') {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', 'original');
}

export function getStoredTheme(): NeoTheme {
  return 'original';
}
