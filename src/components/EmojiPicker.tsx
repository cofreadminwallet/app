import React, { useState } from 'react';
import { EMOJI_GROUPS } from '../utils/emojiCatalog';
import { triggerHaptic } from '../utils/haptics';
import { X } from 'lucide-react';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  currentEmoji?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  currentEmoji,
}) => {
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const currentGroup = EMOJI_GROUPS[selectedGroupIdx];

  // Filter emojis if searching
  const allEmojis = EMOJI_GROUPS.flatMap(g => g.emojis);
  const displayedEmojis = searchQuery.trim()
    ? allEmojis.filter(e => e.includes(searchQuery.trim()))
    : currentGroup.emojis;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-sm bg-white border-t-2 sm:border-2 border-black rounded-t-[28px] sm:rounded-[24px] shadow-neo-xl overflow-hidden z-10 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200"
        id="emoji-picker-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black/10 bg-[#F4F6FB]">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentEmoji || '🎨'}</span>
            <h3 className="font-['Outfit'] font-black text-sm text-black">
              Escolha um Emoji
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-black bg-white flex items-center justify-center text-black hover:bg-neutral-100 transition-colors"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Group Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-2 border-b border-black/10 bg-white no-scrollbar">
          {EMOJI_GROUPS.map((group, idx) => (
            <button
              key={group.name}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSelectedGroupIdx(idx);
                setSearchQuery('');
              }}
              className={`px-2 py-1 rounded-lg text-xs font-['Outfit'] font-bold flex items-center gap-1 flex-shrink-0 transition-all border ${
                selectedGroupIdx === idx
                  ? 'bg-[#B8F256] text-black border-black shadow-neo-xs font-black'
                  : 'bg-neutral-50 text-neutral-600 border-transparent hover:bg-neutral-100'
              }`}
            >
              <span>{group.icon}</span>
              <span className="text-[10px]">{group.name}</span>
            </button>
          ))}
        </div>

        {/* Emoji Grid */}
        <div className="p-4 overflow-y-auto max-h-60 sm:max-h-72">
          <div className="grid grid-cols-6 gap-2">
            {displayedEmojis.map((emoji, index) => {
              const isSelected = emoji === currentEmoji;
              return (
                <button
                  key={`${emoji}-${index}`}
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    onSelectEmoji(emoji);
                    onClose();
                  }}
                  className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center text-2xl transition-all btn-press ${
                    isSelected
                      ? 'border-black bg-[#B8F256] shadow-neo-xs scale-105'
                      : 'border-black/20 hover:border-black bg-white hover:bg-neutral-50'
                  }`}
                >
                  <span>{emoji}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#F4F6FB] border-t border-black/10 text-center">
          <p className="text-[10px] font-bold text-neutral-500">
            Toque em qualquer emoji para aplicar na categoria
          </p>
        </div>
      </div>
    </div>
  );
};
