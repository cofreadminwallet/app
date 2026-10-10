import React from 'react';
import { TabType } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { Vault, Aperture } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../hooks/useI18n';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenPay: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = React.memo(({
  activeTab,
  onSelectTab,
  onOpenPay,
}) => {
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 sm:border-t-4 border-black pb-safe">
      <div className="max-w-2xl md:max-w-3xl mx-auto px-2 sm:px-6 h-16 sm:h-18 flex items-center justify-around sm:justify-between relative">
        {/* 1. Home tab */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic('light');
            onSelectTab('home');
          }}
          className={`flex flex-col items-center justify-center transition-all p-1 min-w-[48px] cursor-pointer ${
            activeTab === 'home'
              ? 'scale-105 font-black'
              : 'opacity-60 hover:opacity-100'
          }`}
          id="nav-tab-home"
          aria-label={t('nav_home')}
          aria-current={activeTab === 'home' ? 'page' : undefined}
        >
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
            {activeTab === 'home' && (
              <motion.div
                layoutId="activeNavBadge"
                className="absolute inset-0 bg-[#B8F256] border-2 border-black rounded-xl shadow-neo-xs"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 text-sm sm:text-base text-black">
              🏠
            </span>
          </div>
          <span className={`text-[9px] sm:text-[10px] font-['Outfit'] uppercase mt-0.5 ${
            activeTab === 'home' ? 'font-black text-black' : 'font-bold text-neutral-600'
          }`}>
            {t('nav_home')}
          </span>
        </motion.button>

        {/* 2. Vaults tab */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic('light');
            onSelectTab('vaults');
          }}
          className={`flex flex-col items-center justify-center transition-all p-1 min-w-[48px] cursor-pointer ${
            activeTab === 'vaults'
              ? 'scale-105 font-black'
              : 'opacity-60 hover:opacity-100'
          }`}
          id="nav-tab-vaults"
          aria-label={t('nav_vaults')}
          aria-current={activeTab === 'vaults' ? 'page' : undefined}
        >
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
            {activeTab === 'vaults' && (
              <motion.div
                layoutId="activeNavBadge"
                className="absolute inset-0 bg-[#B8F256] border-2 border-black rounded-xl shadow-neo-xs"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <Vault className="relative z-10 w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5] text-black" />
          </div>
          <span className={`text-[9px] sm:text-[10px] font-['Outfit'] uppercase mt-0.5 ${
            activeTab === 'vaults' ? 'font-black text-black' : 'font-bold text-neutral-600'
          }`}>
            {t('nav_vaults')}
          </span>
        </motion.button>

        {/* 3. Center Floating Action Button (Pagar / Escanear QR Cripto) */}
        <div className="flex flex-col items-center -mt-6 sm:-mt-7">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              triggerHaptic('medium');
              onOpenPay();
            }}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-[#B8F256] hover:bg-[#A3E635] border-2 border-black rounded-full shadow-neo flex items-center justify-center text-black btn-press group transition-all cursor-pointer"
            title="Pagar"
            id="nav-center-action-btn"
            aria-label="Pagar"
          >
            <Aperture className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5] text-black group-hover:rotate-45 transition-transform duration-300" />
          </motion.button>
        </div>

        {/* 4. Ledger / Transactions tab */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic('light');
            onSelectTab('transactions');
          }}
          className={`flex flex-col items-center justify-center transition-all p-1 min-w-[48px] cursor-pointer ${
            activeTab === 'transactions'
              ? 'scale-105 font-black'
              : 'opacity-60 hover:opacity-100'
          }`}
          id="nav-tab-transactions"
          aria-label={t('nav_activity')}
          aria-current={activeTab === 'transactions' ? 'page' : undefined}
        >
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
            {activeTab === 'transactions' && (
              <motion.div
                layoutId="activeNavBadge"
                className="absolute inset-0 bg-[#B8F256] border-2 border-black rounded-xl shadow-neo-xs"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 text-sm sm:text-base text-black">
              🧾
            </span>
          </div>
          <span className={`text-[9px] sm:text-[10px] font-['Outfit'] uppercase mt-0.5 ${
            activeTab === 'transactions' ? 'font-black text-black' : 'font-bold text-neutral-600'
          }`}>
            {t('nav_activity')}
          </span>
        </motion.button>

        {/* 5. Ajustes / Perfil / Backup */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic('light');
            onSelectTab('profile');
          }}
          className={`flex flex-col items-center justify-center transition-all p-1 min-w-[48px] cursor-pointer ${
            activeTab === 'profile'
              ? 'scale-105 font-black'
              : 'opacity-60 hover:opacity-100'
          }`}
          id="nav-tab-profile"
          aria-label={t('nav_settings')}
          aria-current={activeTab === 'profile' ? 'page' : undefined}
        >
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
            {activeTab === 'profile' && (
              <motion.div
                layoutId="activeNavBadge"
                className="absolute inset-0 bg-[#B8F256] border-2 border-black rounded-xl shadow-neo-xs"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 text-sm sm:text-base text-black">
              ⚙️
            </span>
          </div>
          <span className={`text-[9px] sm:text-[10px] font-['Outfit'] uppercase mt-0.5 ${
            activeTab === 'profile' ? 'font-black text-black' : 'font-bold text-neutral-600'
          }`}>
            {t('nav_settings')}
          </span>
        </motion.button>
      </div>
    </nav>
  );
});
