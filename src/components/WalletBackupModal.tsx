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
  Loader2,
  KeyRound,
  FileText
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { db } from '../services';
import { useI18n } from '../services/i18nService';

interface WalletBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicAddress: string;
  privateKey: string;
  mnemonic?: string;
  userEmail?: string;
  userUid?: string;
  isMandatory?: boolean;
  onAcknowledgeBackup?: (fingerprint: string) => void;
}

export const WalletBackupModal: React.FC<WalletBackupModalProps> = ({
  isOpen,
  onClose,
  publicAddress,
  privateKey,
  mnemonic,
  userEmail,
  userUid,
  isMandatory = false,
  onAcknowledgeBackup,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';
  const [hasAcknowledgedRisk, setHasAcknowledgedRisk] = useState(isMandatory);
  const [hasConfirmedWrittenDown, setHasConfirmedWrittenDown] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isLoggingAudit, setIsLoggingAudit] = useState(false);
  const [auditFingerprint, setAuditFingerprint] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mnemonic' | 'privateKey'>(mnemonic ? 'mnemonic' : 'privateKey');

  if (!isOpen) return null;

  const mnemonicWords = mnemonic ? mnemonic.trim().split(/\s+/) : [];

  const handleCopyPrivateKey = () => {
    if (!privateKey) return;
    navigator.clipboard.writeText(privateKey);
    setCopiedKey(true);
    triggerHaptic('success');
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleCopyMnemonic = () => {
    if (!mnemonic) return;
    navigator.clipboard.writeText(mnemonic);
    setCopiedMnemonic(true);
    triggerHaptic('success');
    setTimeout(() => setCopiedMnemonic(false), 3000);
  };

  const handleCopyAddress = () => {
    if (!publicAddress) return;
    navigator.clipboard.writeText(publicAddress);
    setCopiedAddress(true);
    triggerHaptic('success');
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleClose = () => {
    if (isMandatory && !hasConfirmedWrittenDown) {
      return;
    }
    setIsRevealed(false);
    onClose();
  };

  const handleConfirmMandatory = async () => {
    if (!hasConfirmedWrittenDown) return;
    setIsLoggingAudit(true);
    triggerHaptic('success');

    try {
      const fp = await db.logWalletBackupAcknowledgment({
        userEmail,
        walletAddress: publicAddress,
        userUid,
        statement: isEn
          ? 'Mandatory Web3 wallet backup confirmed. I declare that I wrote down my recovery phrase/key in a safe offline location and take sole responsibility for its custody.'
          : 'Backup obrigatório da carteira Web3 confirmado. Declaro que anotei minha frase de recuperação/chave em local seguro e offline, assumindo integral responsabilidade por sua custódia.',
      });
      if (fp) {
        setAuditFingerprint(fp);
        onAcknowledgeBackup?.(fp);
      }
    } catch (err) {
      console.warn('Erro ao registrar carimbo de backup:', err);
    } finally {
      setIsLoggingAudit(false);
      setIsRevealed(false);
      onClose();
    }
  };

  const handleToggleAcknowledge = async (checked: boolean) => {
    setHasAcknowledgedRisk(checked);
    triggerHaptic(checked ? 'medium' : 'light');

    if (checked) {
      setIsLoggingAudit(true);
      try {
        const fp = await db.logWalletBackupAcknowledgment({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white border-3 border-black rounded-[24px] shadow-neo max-w-md w-full p-5 sm:p-6 my-auto text-black relative space-y-4"
        id="wallet-backup-security-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center shadow-neo-xs ${isMandatory ? 'bg-[#FFE4E6]' : 'bg-[#FEF08A]'}`}>
              {isMandatory ? <ShieldAlert className="w-5 h-5 text-rose-700" /> : <KeyRound className="w-5 h-5 text-amber-900" />}
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-black leading-tight">
                {isMandatory
                  ? (isEn ? 'Mandatory Backup ⚠️' : 'Backup Obrigatório ⚠️')
                  : (isEn ? 'Wallet Backup' : 'Backup da Carteira')}
              </h3>
              <p className="text-[11px] text-neutral-600 font-bold">
                {isMandatory
                  ? (isEn ? 'Save your 12 words to activate' : 'Salve suas 12 palavras para ativar')
                  : (isEn ? 'Self-custody export' : 'Exportação de Autocustódia')}
              </p>
            </div>
          </div>
          {!isMandatory && (
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-neutral-100 btn-press text-black cursor-pointer"
              aria-label={isEn ? "Close" : "Fechar"}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Security Warning Callout */}
        <div className="bg-[#FFE4E6] border-2 border-black rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-rose-950 font-['Outfit'] font-black text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-700 flex-shrink-0" />
            <span>{isEn ? 'NEVER SHARE THIS WITH ANYONE' : 'NUNCA COMPARTILHE COM NINGUÉM'}</span>
          </div>
          <p className="text-[11px] text-rose-900 font-medium leading-relaxed">
            {isEn 
              ? <>Anyone who gets your recovery words or key has <strong>complete, permanent control over your balance</strong>. Store it on paper offline.</>
              : <>Quem tiver sua frase de 12 palavras ou chave privada tem <strong>acesso total e irreversível ao seu dinheiro</strong>. Anote em papel e guarde offline.</>}
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
              className="p-1.5 bg-white border border-black rounded-lg hover:bg-neutral-200 btn-press flex-shrink-0 cursor-pointer"
              title={isEn ? "Copy" : "Copiar"}
            >
              {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Tabs if mnemonic exists */}
        {mnemonic && (
          <div className="flex border-2 border-black rounded-xl p-1 bg-neutral-100 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('mnemonic')}
              className={`flex-1 py-1.5 text-xs font-['Outfit'] font-black rounded-lg transition-all ${
                activeTab === 'mnemonic'
                  ? 'bg-white text-black border border-black shadow-neo-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              {isEn ? '12-Word Phrase' : 'Frase de 12 Palavras'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privateKey')}
              className={`flex-1 py-1.5 text-xs font-['Outfit'] font-black rounded-lg transition-all ${
                activeTab === 'privateKey'
                  ? 'bg-white text-black border border-black shadow-neo-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              {isEn ? 'Private Key' : 'Chave Privada'}
            </button>
          </div>
        )}

        {/* Content Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-['Outfit'] font-black text-black flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-neutral-600" />
              {activeTab === 'mnemonic'
                ? (isEn ? 'BIP-39 Recovery Phrase:' : 'Frase Mnemônica BIP-39:')
                : (isEn ? 'Raw Private Key (32 bytes):' : 'Chave Privada (32 bytes):')}
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
                  <Eye className="w-3.5 h-3.5" /> {isEn ? 'Reveal' : 'Revelar'}
                </>
              )}
            </button>
          </div>

          {activeTab === 'mnemonic' && mnemonicWords.length > 0 ? (
            <div className="p-3 bg-neutral-900 text-white border-2 border-black rounded-xl space-y-2.5">
              {isRevealed ? (
                <div className="grid grid-cols-3 gap-2">
                  {mnemonicWords.map((word, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 p-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs"
                    >
                      <span className="text-neutral-500 font-mono text-[10px] w-4">{idx + 1}.</span>
                      <span className="font-mono font-bold text-[#B8F256] select-all">{word}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-neutral-500 text-xs font-mono font-bold">
                  ••••••••••••••••••••••••••••••••••••
                </div>
              )}

              {isRevealed && (
                <div className="pt-2 border-t border-neutral-700 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-neutral-400 font-bold">
                    {isEn ? 'Universal BIP-39 Standard' : 'Padrão Universal BIP-39'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMnemonic}
                    className="p-1.5 px-2.5 bg-[#B8F256] hover:bg-[#a6e043] text-black rounded-lg border border-black font-['Outfit'] font-black text-xs flex items-center gap-1 btn-press shadow-neo-xs cursor-pointer"
                  >
                    {copiedMnemonic ? <Check className="w-3.5 h-3.5 text-black stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-black" />}
                    <span>{copiedMnemonic ? (isEn ? "Copied" : "Copiado") : (isEn ? "Copy Words" : "Copiar Palavras")}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
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
                    {isEn ? 'Compatible with MetaMask & Coinbase Wallet' : 'Compatível com MetaMask e Coinbase Wallet'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPrivateKey}
                    className="p-1.5 px-2.5 bg-[#B8F256] hover:bg-[#a6e043] text-black rounded-lg border border-black font-['Outfit'] font-black text-xs flex items-center gap-1 btn-press shadow-neo-xs cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-black stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-black" />}
                    <span>{copiedKey ? (isEn ? "Copied" : "Copiado") : (isEn ? "Copy Key" : "Copiar Chave")}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirmation Checkbox */}
        <div className="p-3.5 bg-[#F8FAFC] border-2 border-black rounded-xl space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isMandatory ? hasConfirmedWrittenDown : hasAcknowledgedRisk}
              onChange={(e) => {
                if (isMandatory) {
                  setHasConfirmedWrittenDown(e.target.checked);
                  triggerHaptic(e.target.checked ? 'medium' : 'light');
                } else {
                  handleToggleAcknowledge(e.target.checked);
                }
              }}
              disabled={isLoggingAudit}
              className="mt-0.5 w-4 h-4 rounded border-2 border-black text-black focus:ring-black cursor-pointer accent-black"
            />
            <span className="text-xs font-bold text-neutral-800 leading-snug">
              {isMandatory
                ? (isEn
                  ? 'I confirm that I have written down and stored my 12 words / private key in a safe offline location. I understand that without it, funds cannot be recovered.'
                  : 'Confirmo que anotei e salvei minhas 12 palavras / chave privada em local seguro e offline. Sei que sem elas meus fundos serão irrecuperáveis.')
                : (isEn
                  ? 'I understand that I am solely responsible for the custody of my key and that I am in a private space.'
                  : 'Estou ciente de que sou o único responsável pela custódia da minha chave e que estou em um ambiente seguro.')}
            </span>
          </label>
        </div>

        {/* Action Button */}
        {isMandatory ? (
          <button
            type="button"
            onClick={handleConfirmMandatory}
            disabled={!hasConfirmedWrittenDown || isLoggingAudit}
            className={`w-full py-3 bg-[#B8F256] hover:bg-[#A3E635] text-black rounded-xl font-['Outfit'] font-black text-xs uppercase tracking-wider btn-press border-2 border-black shadow-neo-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
              !hasConfirmedWrittenDown ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            {isLoggingAudit ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>{isEn ? 'Recording backup...' : 'Registrando confirmação...'}</span>
              </>
            ) : (
              <span>{isEn ? 'Confirm Backup & Activate Wallet' : 'Confirmar Backup e Ativar Carteira'}</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2.5 bg-[#B8F256] hover:bg-[#A3E635] text-black rounded-xl font-['Outfit'] font-black text-xs uppercase tracking-wider btn-press border-2 border-black shadow-neo-xs cursor-pointer"
          >
            {isEn ? 'Understood & Close' : 'Entendido & Fechar'}
          </button>
        )}
      </motion.div>
    </div>
  );
};
