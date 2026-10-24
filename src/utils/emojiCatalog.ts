export interface EmojiGroup {
  name: string;
  icon: string;
  emojis: string[];
}

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    name: 'Comida & Bebida',
    icon: '🍔',
    emojis: ['🍔', '🍕', '🍟', '🌮', '🌭', '🥪', '🍦', '☕', '🧋', '🍩', '🍣', '🥩', '🍿', '🥤', '🍺', '🥑', '🍎', '🍜'],
  },
  {
    name: 'Entradas & Grana',
    icon: '💰',
    emojis: ['💰', '💵', '🪙', '💼', '💳', '🏦', '🤑', '💎', '📈', '✨', '🎁', '🏆', '🏷️', '📦', '💸', '🧧', '🤝', '👑'],
  },
  {
    name: 'Lazer & Games',
    icon: '🎮',
    emojis: ['🎮', '🕹️', '🎧', '🎬', '🎟️', '🎵', '📺', '⚽', '🏀', '🛹', '🎲', '🎨', '🏖️', '🎪', '🚴', '⛺', '🎳', '🎸'],
  },
  {
    name: 'Compras & Estilo',
    icon: '🛍️',
    emojis: ['🛍️', '👕', '👟', '👗', '🧢', '💄', '🕶️', '🎒', '📦', '🎁', '💍', '⌚', '🛒', '👠', '🧵', '💈'],
  },
  {
    name: 'Transporte & Viagem',
    icon: '🚗',
    emojis: ['🚗', '🚌', '🛵', '🚲', '⛽', '✈️', '🚆', '🚕', '🚀', '🚢', '🗺️', '🧳', '🛴', '🛳️', '🚁'],
  },
  {
    name: 'Casa, Tech & Contas',
    icon: '⚡',
    emojis: ['🏠', '⚡', '💧', '🌐', '📱', '💻', '🔑', '🛠️', '🛒', '🧹', '🖥️', '📡', '💡', '🔒', '🔌', '🖨️'],
  },
  {
    name: 'Educação & Saúde',
    icon: '📚',
    emojis: ['📚', '🎓', '💊', '🩺', '🏋️', '🧠', '🧘', '🐕', '🐱', '🦷', '🧪', '🌱', '💉', '👓', '🚑'],
  },
  {
    name: 'Outros & Ícones',
    icon: '⭐',
    emojis: ['⭐', '🔥', '💖', '🎯', '🛡️', '⚡', '🌟', '🦄', '🍀', '🚀', '🔮', '🎉', '📌', '🔔', '🏷️', '❓'],
  },
];

export interface ColorPreset {
  name: string;
  label: string;
  bg: string;
  text: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'lavender', label: 'Lavanda', bg: '#EDE9FE', text: '#5B21B6' },
  { name: 'rose', label: 'Rosa Claro', bg: '#FFE4E6', text: '#9F1239' },
  { name: 'mint', label: 'Azul Céu', bg: '#E0F2FE', text: '#075985' },
  { name: 'yellow', label: 'Amarelo', bg: '#FEF3C7', text: '#92400E' },
  { name: 'lime', label: 'Lima Neon', bg: '#E4F97E', text: '#3F6212' },
  { name: 'emerald', label: 'Esmeralda', bg: '#D1FAE5', text: '#065F46' },
  { name: 'orange', label: 'Laranja', bg: '#FFEDD5', text: '#9A3412' },
  { name: 'pink', label: 'Pink Pop', bg: '#FCE7F3', text: '#9D174D' },
  { name: 'purple', label: 'Púrpura', bg: '#F3E8FF', text: '#6B21A8' },
  { name: 'slate', label: 'Cinza Neutro', bg: '#F1F5F9', text: '#334155' },
];
