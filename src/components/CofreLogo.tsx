import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
  isEn?: boolean;
}

export const CofreLogo: React.FC<LogoProps> = ({ size = 'md', showSubtitle = true, className = '', isEn = false }) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const subSize = size === 'sm' 
    ? 'text-[7px]' 
    : size === 'lg' 
    ? (isEn ? 'text-[8.5px] sm:text-[9px]' : 'text-[9.5px] sm:text-[10px]') 
    : (isEn ? 'text-[7.5px]' : 'text-[8.5px]');
  const dividerHeight = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-9' : 'h-8';

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {/* 3D Neo-Brutalist Purple Vault with Lime Sliders */}
      <div className={`relative ${iconSize} flex-shrink-0`}>
        {/* Vault body */}
        <div className="w-full h-full bg-gradient-to-b from-[#9333EA] to-[#6B21A8] border-2 border-black rounded-xl shadow-neo flex items-center justify-center relative overflow-hidden">
          {/* Top highlight */}
          <div className="absolute top-0.5 left-1 right-1 h-1 bg-purple-300/40 rounded-full" />
          
          {/* Vault Door Handle / Wheel */}
          <div className="w-5 h-5 rounded-full border-2 border-black bg-[#C084FC] flex items-center justify-center shadow-inner relative">
            <div className="w-2 h-2 rounded-full bg-purple-900 border border-black" />
            <div className="absolute w-0.5 h-full bg-black/40 rotate-45" />
            <div className="absolute w-0.5 h-full bg-black/40 -rotate-45" />
          </div>

          {/* Hinges */}
          <div className="absolute left-0.5 top-1.5 w-1 h-2 bg-purple-900 rounded-sm border border-black/30" />
          <div className="absolute left-0.5 bottom-1.5 w-1 h-2 bg-purple-900 rounded-sm border border-black/30" />
        </div>

        {/* Lime green admin equalizer/slider panel on right edge */}
        <div className="absolute -right-1 top-1 bottom-1 w-2.5 bg-[#B8F256] border-2 border-black rounded-md flex flex-col justify-around items-center py-0.5 shadow-sm">
          <div className="w-1.5 h-0.5 bg-black rounded-full" />
          <div className="w-1.5 h-0.5 bg-black rounded-full translate-x-0.5" />
          <div className="w-1.5 h-0.5 bg-black rounded-full -translate-x-0.5" />
        </div>
      </div>

      {/* Subtle Divider Line */}
      <div className={`${dividerHeight} w-[1.5px] bg-black/15 flex-shrink-0`} />

      {/* Brand Text & Slogan strictly aligned to exact same width */}
      <div className="flex flex-col justify-center text-left min-w-0">
        <div className={`font-['Outfit'] font-black tracking-tight leading-none ${textSize} flex items-center`}>
          <span className="text-black">Cofre</span>
          <span className="text-[#65A30D] bg-[#E4F97E] px-1 py-0.5 rounded-md border border-black/20 ml-0.5">Admin</span>
        </div>
        {showSubtitle && (
          <div className={`${subSize} text-neutral-700 font-bold leading-none mt-1 select-none whitespace-nowrap`}>
            {isEn ? (
              <div className="flex items-center justify-between gap-1 w-full">
                <span>Own</span>
                <span>your</span>
                <span className="text-[#65A30D] font-extrabold">money.</span>
                <span>Be</span>
                <span>the</span>
                <span className="text-[#9333EA] font-extrabold">admin.</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1 w-full">
                <span>Seja</span>
                <span>o</span>
                <span className="text-[#9333EA] font-extrabold">admin</span>
                <span>da</span>
                <span>sua</span>
                <span className="text-[#65A30D] font-extrabold">grana.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * CofreEmoji - Official CofreAdmin emoji badge
 * Renders Purple Vault + Lime Green Admin Slider in compact emoji form.
 */
export const CofreEmoji: React.FC<{ size?: number; className?: string; alt?: string }> = ({ 
  size = 20, 
  className = '', 
  alt = '🟪⚙️🟩' 
}) => {
  return (
    <img 
      src="/cofre-emoji.svg" 
      alt={alt}
      width={size}
      height={size}
      className={`inline-block align-middle select-none pointer-events-none ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};
