import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink,
  Lock,
  RefreshCw
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { Web3Service } from '../services/web3Service';
import { useI18n } from '../services/i18nService';

interface WalletMigrationModalProps {
  isOpen: boolean;
  legacyAddress: string;
  legacyPrivateKey: string;
  newAddress: string;
  newPrivateKey: string;
  newMnemonic?: string;
  legacyUsdcBalance: number;
  legacyEthBalance: number;
  onCompleteMigration: (newAddress: string, newPrivateKey: string, newMnemonic?: string) => void;
}

export const WalletMigrationModal: React.FC<WalletMigrationModalProps> = ({
  isOpen,
  legacyAddress,
  legacyPrivateKey,
  newAddress,
  newPrivateKey,
  newMnemonic,
  legacyUsdcBalance,
  legacyEthBalance,
  onCompleteMigration,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';

  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedNewAddr, setCopiedNewAddr] = useState(false);

  if (!isOpen) return null;

  const hasFunds = legacyUsdcBalance > 0;

  const handleCopyNewAddress = () => {
    navigator.clipboard.writeText(newAddress);
    setCopiedNewAddr(true);
    triggerHaptic('success');
    setTimeout(() => setCopiedNewAddr(false), 2000);
  };

  const handleTransferAllFunds = async () => {
    setIsTransferring(true);
    setErrorMessage(null);
    triggerHaptic('medium');

    try {
      const estimatedGasFee = 0.02;
      // Calculates the maximum transferable amount ensuring that:
      // transferAmount + max(transferAmount * 0.002, 0.05) + estimatedGasFee <= legacyUsdcBalance
      const candidateFixedFee = legacyUsdcBalance - 0.05 - estimatedGasFee;
      const candidateProportionalFee = (legacyUsdcBalance - estimatedGasFee) / 1.002;
      const rawMaxAmount = Math.min(candidateFixedFee, candidateProportionalFee);
      const transferAmount = Math.max(0, Math.floor(rawMaxAmount * 10000) / 10000);

      if (transferAmount <= 0) {
        throw new Error(
          isEn
            ? 'Balance is too low to cover network gas fee. You can complete migration directly.'
            : 'Saldo muito baixo para cobrir a taxa de gás da rede. Você pode concluir a migração diretamente.'
        );
      }

      const calculatedProtocolFee = parseFloat(Math.max(transferAmount * 0.002, 0.05).toFixed(6));

      const res = await Web3Service.sendUsdcOnChain({
        recipientAddress: newAddress,
        amount: transferAmount,
        senderAddress: legacyAddress,
        privateKey: legacyPrivateKey,
        protocolFee: calculatedProtocolFee,
        gasFee: estimatedGasFee,
        network: 'base',
      });

      setTxHash(res.txHash);
      setTransferSuccess(true);
      triggerHaptic('success');
    } catch (err: any) {
      setErrorMessage(err?.message || (isEn ? 'Failed to transfer funds automatically.' : 'Falha na transferência automática de fundos.'));
      triggerHaptic('warning');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleFinish = () => {
    triggerHaptic('success');
    onCompleteMigration(newAddress, newPrivateKey, newMnemonic);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white border-3 border-black rounded-[24px] shadow-neo max-w-lg w-full p-5 sm:p-6 my-auto text-black relative space-y-4"
        id="wallet-migration-security-modal"
      >
        {/* Header Badge */}
        <div className="flex items-center gap-3 border-b-2 border-black pb-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FFE4E6] border-2 border-black flex items-center justify-center shadow-neo-xs flex-shrink-0">
            <ShieldAlert className="w-6 h-6 text-rose-700" />
          </div>
          <div>
            <h3 className="font-['Outfit'] font-black text-lg text-black leading-tight">
              {isEn ? 'Wallet Security Upgrade 🛡️' : 'Atualização de Segurança da Carteira 🛡️'}
            </h3>
            <p className="text-[11px] text-neutral-600 font-bold">
              {isEn ? 'Protocol upgrade & automated key rotation' : 'Atualização de protocolo e rotação de chaves'}
            </p>
          </div>
        </div>

        {/* Informative Explanation */}
        <div className="bg-[#FFFBEB] border-2 border-black rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-950 font-['Outfit'] font-black text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>{isEn ? 'WHY IS THIS UPGRADE AVAILABLE?' : 'COMO FUNCIONA ESTA ATUALIZAÇÃO?'}</span>
          </div>
          <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
            {isEn
              ? 'A new cryptographic wallet standard has been activated for your account. Transfer your existing on-chain balance to your upgraded BIP-39 HD wallet with 1 click.'
              : 'Um novo padrão criptográfico de carteira foi ativado para sua conta. Transfira o saldo da geração anterior para sua nova carteira BIP-39 HD com 1 clique.'}
          </p>
        </div>

        {/* Addresses Comparison */}
        <div className="space-y-3">
          {/* Previous Generation Address */}
          <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-['Outfit'] font-black uppercase text-rose-800">
                {isEn ? 'Previous Wallet Generation:' : 'Carteira da Geração Anterior:'}
              </span>
              <span className="text-xs font-black text-rose-950">
                ${legacyUsdcBalance.toFixed(2)} USDC
              </span>
            </div>
            <code className="block font-mono-code text-[11px] text-neutral-700 break-all select-all font-bold">
              {legacyAddress}
            </code>
          </div>

          {/* Migration Arrow */}
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[#B8F256] border-2 border-black flex items-center justify-center shadow-neo-xs">
              <ArrowRight className="w-4 h-4 text-black" />
            </div>
          </div>

          {/* New Safe Address */}
          <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-['Outfit'] font-black uppercase text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {isEn ? 'Upgraded HD Wallet (BIP-39):' : 'Nova Carteira Atualizada (BIP-39):'}
              </span>
              <button
                type="button"
                onClick={handleCopyNewAddress}
                className="text-[10px] font-black text-emerald-900 underline flex items-center gap-1 cursor-pointer"
              >
                {copiedNewAddr ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                {copiedNewAddr ? (isEn ? 'Copied' : 'Copiado') : (isEn ? 'Copy' : 'Copiar')}
              </button>
            </div>
            <code className="block font-mono-code text-[11px] text-emerald-950 break-all select-all font-bold">
              {newAddress}
            </code>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-100 border-2 border-black rounded-xl text-xs font-bold text-rose-950 flex items-start gap-2 shadow-neo-xs">
            <AlertTriangle className="w-4 h-4 text-rose-700 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {transferSuccess && (
          <div className="p-3 bg-emerald-100 border-2 border-black rounded-xl text-xs font-bold text-emerald-950 space-y-1 shadow-neo-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{isEn ? 'Funds transferred to your new wallet!' : 'Saldo transferido com sucesso para a nova carteira!'}</span>
            </div>
            {txHash && (
              <a
                href={Web3Service.getExplorerUrl(txHash, 'tx', 'base')}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-emerald-800 underline flex items-center gap-1 font-mono"
              >
                <span>{isEn ? 'View on BaseScan:' : 'Ver no BaseScan:'} {txHash.slice(0, 10)}...</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t-2 border-black">
          {hasFunds && !transferSuccess ? (
            <button
              type="button"
              onClick={handleTransferAllFunds}
              disabled={isTransferring}
              className={`w-full py-3.5 bg-[#0052FF] hover:bg-[#0045D8] text-white border-2 border-black rounded-xl font-['Outfit'] font-black text-xs uppercase tracking-wider shadow-neo btn-press flex items-center justify-center gap-2 cursor-pointer ${
                isTransferring ? 'opacity-70' : ''
              }`}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{isEn ? 'Transferring on Base L2...' : 'Transferindo fundos na Base L2...'}</span>
                </>
              ) : (
                <span>
                  {isEn
                    ? `Transfer $${legacyUsdcBalance.toFixed(2)} USDC to Safe Wallet`
                    : `Transferir $${legacyUsdcBalance.toFixed(2)} USDC para Nova Carteira`}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-3.5 bg-[#B8F256] hover:bg-[#A3E635] text-black border-2 border-black rounded-xl font-['Outfit'] font-black text-xs uppercase tracking-wider shadow-neo btn-press flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>{isEn ? 'Activate New Secure Wallet' : 'Ativar Nova Carteira Segura'}</span>
            </button>
          )}

          {hasFunds && !transferSuccess && (
            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-2 text-[11px] font-bold text-neutral-500 hover:text-black underline text-center cursor-pointer"
            >
              {isEn ? 'I have already transferred or will transfer manually' : 'Já transferi manualmente / Continuar migração'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
