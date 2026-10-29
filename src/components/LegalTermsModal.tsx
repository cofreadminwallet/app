import React from 'react';
import { ShieldCheck, Check, X, ExternalLink, Key, Lock, Shield } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { useI18n } from '../services/i18nService';

interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // External URL to full privacy policy and terms document (can be replaced/configured anytime)
  externalTermsUrl?: string;
  initialTab?: string;
}

export const LegalTermsModal: React.FC<LegalTermsModalProps> = ({
  isOpen,
  onClose,
  externalTermsUrl,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';

  const resolvedTermsUrl =
    externalTermsUrl ||
    (isEn
      ? 'https://github.com/cofreadminwallet/app/blob/main/docs/en-us/privacy-policy/privacy-policy.md'
      : 'https://github.com/cofreadminwallet/app/blob/main/docs/pt-br/termos/termos-e-privacidade.md');

  if (!isOpen) return null;

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      id="legal-terms-modal-overlay"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-white border-3 border-black rounded-[28px] shadow-neo-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        id="legal-terms-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-2 border-black bg-[#F4F6FB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white border-2 border-black flex items-center justify-center text-purple-600 shadow-neo-xs">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </span>
            <div>
              <h3 className="font-['Outfit'] font-black text-base sm:text-lg text-black leading-tight">
                {isEn ? 'Privacy Policy' : 'Política de Privacidade'}
              </h3>
              <p className="text-[10px] sm:text-xs font-bold text-neutral-500">
                {isEn ? 'Simplified summary' : 'Resumo simplificado'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black flex items-center justify-center text-black shadow-neo-xs btn-press cursor-pointer"
            id="btn-close-legal-modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Content - Concise and Clear Summary */}
        <div className="p-4 sm:p-5 space-y-3 text-xs font-medium text-neutral-700 leading-relaxed overflow-y-auto max-h-[60vh]">
          {/* Card 1: Self-Custody & Private Key */}
          <div className="bg-[#FEF9C3] border-2 border-black rounded-2xl p-3.5 space-y-1.5 shadow-neo-xs">
            <span className="font-['Outfit'] font-black text-xs text-amber-950 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-800 flex-shrink-0" />
              <span>{isEn ? 'Self-Custody & Private Key' : 'Auto-Custódia & Chave Privada'}</span>
            </span>
            <p className="text-[11px] text-amber-950 leading-relaxed font-medium">
              {isEn
                ? <>Your private key stays on your device only. CofreAdmin <strong>never holds custody</strong> and <strong>has no access</strong> to your funds. Backup is your responsibility.</>
                : <>Sua chave privada fica gravada apenas no seu dispositivo. O CofreAdmin <strong>não possui custódia</strong> e <strong>não tem acesso</strong> aos seus fundos. O backup é sua responsabilidade.</>}
            </p>
          </div>

          {/* Card 2: Privacy & Data Protection */}
          <div className="bg-[#ECFDF5] border-2 border-black rounded-2xl p-3.5 space-y-1.5 shadow-neo-xs">
            <span className="font-['Outfit'] font-black text-xs text-emerald-950 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-800 flex-shrink-0" />
              <span>{isEn ? 'Privacy & Data Protection' : 'Privacidade & Seus Dados'}</span>
            </span>
            <p className="text-[11px] text-emerald-950 leading-relaxed font-medium">
              {isEn
                ? <>Your financial entries belong strictly to you and are never sold. You can request <strong>permanent deletion of your data</strong> at any time in settings.</>
                : <>Seus lançamentos financeiros pertencem unicamente a você e nunca são vendidos. Você pode solicitar a <strong>exclusão definitiva de todos os dados</strong> a qualquer momento nas configurações.</>}
            </p>
          </div>

          {/* Card 3: Personal Financial Management */}
          <div className="bg-[#F3E8FF] border-2 border-black rounded-2xl p-3.5 space-y-1.5 shadow-neo-xs">
            <span className="font-['Outfit'] font-black text-xs text-purple-950 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-800 flex-shrink-0" />
              <span>{isEn ? 'Personal Financial Management' : 'Gestão Financeira Pessoal'}</span>
            </span>
            <p className="text-[11px] text-purple-950 leading-relaxed font-medium">
              {isEn
                ? 'Personal finance organization app. You have full autonomy over all your goals and transfers.'
                : 'Aplicativo de organização financeira pessoal. Você possui autonomia total sobre suas metas e transferências.'}
            </p>
          </div>

          {/* Official External Link for Complete Documentation */}
          <div className="pt-1">
            <a
              href={resolvedTermsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerHaptic('light')}
              className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-black border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press flex items-center justify-center gap-2 group cursor-pointer transition-all"
              id="link-external-full-terms"
            >
              <ExternalLink className="w-3.5 h-3.5 text-black group-hover:text-purple-600" />
              <span>{isEn ? 'View full Privacy Policy' : 'Acessar Política de Privacidade completa'}</span>
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t-2 border-black bg-[#F4F6FB] flex items-center justify-center">
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-3 px-5 bg-[#B8F256] hover:bg-[#a8e646] text-black border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press flex items-center justify-center gap-1.5 cursor-pointer"
            id="btn-confirm-legal-terms"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{isEn ? 'I Understand and Agree' : 'Entendi e Concordo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
