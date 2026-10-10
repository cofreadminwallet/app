import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  X, 
  Lock, 
  AlertTriangle,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { CloudSyncService } from '../services/cloudSync';
import { useI18n } from '../services/i18nService';

interface WalletBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicAddress: string;
  privateKey: string;
  userEmail?: string;
  userUid?: string;
  onAcknowledgeBackup?: (fingerprint: string) => void;
}

export const WalletBackupModal: React.FC<WalletBackupModalProps> = ({
  isOpen,
  onClose,
  publicAddress,
  privateKey,
  userEmail,
  userUid,
  onAcknowledgeBackup,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';
  const [hasAcknowledgedRisk, setHasAcknowledgedRisk] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isLoggingAudit, setIsLoggingAudit] = useState(false);
  const [auditFingerprint, setAuditFingerprint] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyPrivateKey = () => {
    if (!privateKey) return;
    navigator.clipboard.writeText(privateKey);
    setCopiedKey(true);
    triggerHaptic('success');
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleCopyAddress = () => {
    if (!publicAddress) return;
    navigator.clipboard.writeText(publicAddress);
    setCopiedAddress(true);
    triggerHaptic('success');
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleClose = () => {
    setIsRevealed(false);
    setHasAcknowledgedRisk(false);
    onClose();
  };

  const handleToggleAcknowledge = async (checked: boolean) => {
    setHasAcknowledgedRisk(checked);
    triggerHaptic(checked ? 'medium' : 'light');

    if (checked) {
      setIsLoggingAudit(true);
      try {
        const fp = await CloudSyncService.logWalletBackupAcknowledgment({
          userEmail,
          walletAddress: publicAddress,
          userUid,
          statement: isEn
            ? 'I declare for all legal purposes that I am in a safe environment and that I am solely responsible for the custody, storage, possession, and backup of my private key (Web3 self-custody), holding CofreAdmin harmless from any liability.'
            : 'Declaro para os devidos fins legais que estou em ambiente seguro e que sou o único e exclusivo responsável pela custódia, guarda, posse e backup da minha chave privada (autocustódia Web3), isentando integralmente o CofreAdmin de qualquer responsabilidade ou custódia por perda, extravio, vazamento ou acesso não autorizado aos fundos na blockchain.',
        });
        if (fp) {
          setAuditFingerprint(fp);
          onAcknowledgeBackup?.(fp);
        }
      } catch (err) {
        console.warn('Erro ao registrar auditoria de backup de carteira:', err);
      } finally {
        setIsLoggingAudit(false);
      }
    } else {
      setIsRevealed(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white border-2 border-black rounded-[24px] shadow-neo max-w-md w-full p-5 sm:p-6 my-auto text-black relative space-y-4"
        id="wallet-backup-security-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FEF08A] border-2 border-black flex items-center justify-center shadow-neo-xs">
              <ShieldAlert className="w-5 h-5 text-amber-900" />
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-black leading-tight">
                {isEn ? 'Wallet Backup' : 'Backup da Carteira'}
              </h3>
              <p className="text-[11px] text-neutral-500 font-bold">
                {isEn ? 'Private Key Export' : 'Exportar Chave Privada'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-neutral-100 btn-press text-black"
            aria-label={isEn ? "Close backup modal" : "Fechar modal de backup"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Warning Callout */}
        <div className="bg-[#FFE4E6] border-2 border-black rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-rose-950 font-['Outfit'] font-black text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-700 flex-shrink-0" />
            <span>{isEn ? 'NEVER SHARE YOUR PRIVATE KEY' : 'NUNCA COMPARTILHE SUA CHAVE PRIVADA'}</span>
          </div>
          <p className="text-[11px] text-rose-900 font-medium leading-relaxed">
            {isEn 
              ? <>Anyone with access to your private key has <strong>complete, irreversible control over your funds</strong>. The CofreAdmin team will <strong>NEVER</strong> ask for your private key.</>
              : <>Qualquer pessoa com acesso à sua chave privada tem <strong>controle total e irreversível sobre seus fundos</strong>. A equipe do CofreAdmin <strong>NUNCA</strong> solicitará sua chave privada.</>}
          </p>
        </div>

        {/* Public Address */}
        <div className="space-y-1">
          <span className="text-xs font-['Outfit'] font-black text-neutral-700">
            {isEn ? 'Public Address (Base Network):' : 'Endereço Público (Rede Base):'}
          </span>
          <div className="flex items-center gap-2 p-2.5 bg-neutral-100 border-2 border-black rounded-xl">
            <code className="font-mono-code text-[11px] text-neutral-800 break-all flex-1 select-all font-bold">
              {publicAddress}
            </code>
            <button
              type="button"
              onClick={handleCopyAddress}
              className="p-1.5 bg-white border border-black rounded-lg hover:bg-neutral-200 btn-press flex-shrink-0"
              title={isEn ? "Copy" : "Copiar"}
            >
              {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Risk Acknowledgment Checkbox */}
        {!hasAcknowledgedRisk ? (
          <div className="p-4 bg-[#F8FAFC] border-2 border-black rounded-xl space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasAcknowledgedRisk}
                onChange={(e) => handleToggleAcknowledge(e.target.checked)}
                disabled={isLoggingAudit}
                className="mt-0.5 w-4 h-4 rounded border-2 border-black text-black focus:ring-black cursor-pointer accent-black"
              />
              <span className="text-xs font-bold text-neutral-700 leading-snug">
                {isEn 
                  ? 'I understand that I am solely responsible for the custody of my key and that I am in a private space without cameras or onlookers.'
                  : 'Estou ciente de que sou o único responsável pela custódia da minha chave e que estou em um ambiente seguro sem câmeras ou pessoas olhando.'}
              </span>
            </label>
            {isLoggingAudit && (
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 font-bold animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                <span>{isEn ? 'Recording custody acknowledgment...' : 'Registrando carimbo de ciência na blindagem jurídica...'}</span>
              </div>
            )}
          </div>
        ) : (
          /* Private Key Reveal Section */
          <div className="space-y-2">
            {/* Auditable Legal Protection Badge */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-emerald-50 border-2 border-emerald-600/60 rounded-xl text-[10px] font-bold text-emerald-950 shadow-neo-xs">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{isEn ? 'Self-custody verified and recorded' : 'Ciência de autocustódia registrada na blindagem jurídica'}</span>
              </div>
              {auditFingerprint && (
                <span className="font-mono text-[9px] text-emerald-800 font-bold truncate max-w-[100px]" title={auditFingerprint}>
                  #{auditFingerprint.slice(0, 12)}...
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-['Outfit'] font-black text-black flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-neutral-600" />
                {isEn ? 'Private Key (Raw 32 bytes):' : 'Chave Privada (Raw Private Key - 32 bytes):'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsRevealed(!isRevealed);
                  triggerHaptic('medium');
                }}
                className="text-[11px] font-black text-neutral-700 hover:text-black flex items-center gap-1 underline cursor-pointer"
              >
                {isRevealed ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" /> {isEn ? 'Hide' : 'Ocultar'}
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" /> {isEn ? 'Reveal Key' : 'Revelar Chave'}
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-neutral-900 text-white border-2 border-black rounded-xl space-y-2">
              <div className="font-mono-code text-[11px] break-all leading-relaxed select-all">
                {isRevealed ? (
                  <span className="text-[#B8F256] font-bold">{privateKey}</span>
                ) : (
                  <span className="text-neutral-500 tracking-widest font-mono">
                    ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                  </span>
                )}
              </div>

              {isRevealed && (
                <div className="pt-2 border-t border-neutral-700 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-neutral-400 font-bold">
                    {isEn ? 'Compatible with MetaMask, Coinbase Wallet & Rainbow' : 'Compatível com MetaMask, Coinbase Wallet e Rainbow'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPrivateKey}
                    className="p-2 bg-[#B8F256] hover:bg-[#a6e043] text-black rounded-lg border border-black font-['Outfit'] font-black text-xs flex items-center justify-center btn-press shadow-neo-xs flex-shrink-0 cursor-pointer"
                    title={copiedKey ? (isEn ? "Copied!" : "Copiado!") : (isEn ? "Copy" : "Copiar")}
                    aria-label={isEn ? "Copy Private Key" : "Copiar Chave Privada"}
                  >
                    {copiedKey ? (
                      <Check className="w-4 h-4 text-emerald-950 stroke-[3]" />
                    ) : (
                      <Copy className="w-4 h-4 text-black" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-2.5 bg-[#B8F256] hover:bg-[#A3E635] text-black rounded-xl font-['Outfit'] font-black text-xs uppercase tracking-wider btn-press border-2 border-black shadow-neo-xs cursor-pointer"
        >
          {isEn ? 'Understood & Close' : 'Entendido & Fechar'}
        </button>
      </motion.div>
    </div>
  );
};
