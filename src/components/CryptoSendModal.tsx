import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Fingerprint,
  Lock,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  RefreshCw,
  ExternalLink,
  Copy,
  AlertTriangle,
  Tag,
  FileText,
  Sparkles,
  Fuel,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { ParsedCryptoData, validateCryptoInput } from '../utils/cryptoAddressUtils';
import {
  CryptoTransferService,
  CryptoReceipt,
  GasEstimate,
  QUOTE_TIMEOUT_SECONDS,
  GAS_LIMIT_BUFFER_PERCENT,
} from '../services/cryptoTransferService';
import { PaymasterService, PaymasterConfig } from '../services/paymasterService';
import { Web3Service, Web3Network } from '../services/web3Service';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { useI18n } from '../services/i18nService';
import { Category } from '../types';
import { WebAuthnService } from '../services/webAuthnService';
import { StorageService } from '../utils/storage';
import { triggerHaptic } from '../utils/haptics';
import { openSupportEmail } from '../utils/supportEmail';
import confetti from 'canvas-confetti';

interface CryptoSendModalProps {
  isOpen: boolean;
  cryptoData: ParsedCryptoData | null;
  userBalanceUSDC: number;
  totalBalanceUSDC?: number;
  lockedInVaultsUSDC?: number;
  walletAddress?: string;
  walletPrivateKey?: string;
  network?: Web3Network;
  userEmail?: string;
  categories?: Category[];
  onClose: () => void;
  onPaymentComplete: (
    receipt: CryptoReceipt,
    selectedCategoryId?: string,
    customDescription?: string
  ) => string | void;
  onUpdateCreatedTransaction?: (
    txId: string,
    categoryId: string,
    customDescription: string
  ) => void;
}

// Helper to format crypto amounts: 4 decimals when fractional cents exist (e.g. $0.2028), or 2 decimals for whole cents
const formatCryptoAmount = (val: number): string => {
  if (typeof val !== 'number' || isNaN(val)) return '0.00';
  const hasSubCent = Math.abs(Math.round(val * 100) - val * 100) > 0.0001;
  return hasSubCent ? val.toFixed(4) : val.toFixed(2);
};

export const CryptoSendModal: React.FC<CryptoSendModalProps> = ({
  isOpen,
  cryptoData,
  userBalanceUSDC,
  totalBalanceUSDC,
  lockedInVaultsUSDC,
  walletAddress,
  walletPrivateKey,
  network = 'base',
  userEmail,
  categories = [],
  onClose,
  onPaymentComplete,
  onUpdateCreatedTransaction,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';

  // Navigation step: 'amount' (enter value) -> 'review' (network fees & sign)
  const [modalStep, setModalStep] = useState<'amount' | 'review'>('amount');
  const [amountStr, setAmountStr] = useState<string>('');
  const [inputUnit, setInputUnit] = useState<'USDC' | 'BRL'>('USDC');
  const [expenseTitle, setExpenseTitle] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [createdTxId, setCreatedTxId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settlementStep, setSettlementStep] = useState<string>('');
  const [receipt, setReceipt] = useState<CryptoReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isSavedTag, setIsSavedTag] = useState(false);

  // Real-time market exchange rate
  const { rate, isLoading: isRateLoading, refreshRate } = useExchangeRate();

  // Dynamic on-chain gas estimation state
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  const [quoteSecondsLeft, setQuoteSecondsLeft] = useState<number>(QUOTE_TIMEOUT_SECONDS);
  const [hasHardwareBiometrics, setHasHardwareBiometrics] = useState(false);
  const [paymasterConfig, setPaymasterConfig] = useState<PaymasterConfig | null>(null);

  // High-Value Security Guard: Double Confirmation for Large Amounts (>= $100 USDC or >= R$ 500)
  const [highValueConfirmed, setHighValueConfirmed] = useState(false);
  const [highValueCountdown, setHighValueCountdown] = useState(0);

  // Available expense categories
  const expenseCategories = categories.filter((c) => c.type === 'expense' || c.type === 'both');

  // Countdown timer for High-Value Security Lock (3 seconds anti-rash cooloff)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isOpen && modalStep === 'review' && highValueCountdown > 0) {
      timer = setInterval(() => {
        setHighValueCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, modalStep, highValueCountdown]);

  // Quote timeout countdown timer (30s industry standard)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isOpen && modalStep === 'review' && !receipt && !isProcessing) {
      timer = setInterval(() => {
        setQuoteSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, modalStep, receipt, isProcessing]);

  useEffect(() => {
    if (cryptoData) {
      if (cryptoData.amount && cryptoData.amount > 0) {
        setAmountStr(cryptoData.amount.toFixed(2));
      } else {
        setAmountStr('');
      }
      setExpenseTitle(cryptoData.label || '');
      setReceipt(null);
      setCreatedTxId(null);
      setErrorMessage(null);
      setIsProcessing(false);
      setIsSavedTag(false);
      setModalStep('amount');
      setGasEstimate(null);
      setIsEstimatingGas(false);
      setHighValueConfirmed(false);
      setHighValueCountdown(0);

      // Auto-select initial default category
      if (expenseCategories.length > 0) {
        const defaultCat =
          expenseCategories.find((c) =>
            ['munchies', 'food', 'market', 'drip', 'games', 'subs', 'uber', 'transport'].some((k) =>
              c.id.toLowerCase().includes(k) || c.name.toLowerCase().includes(k)
            )
          ) || expenseCategories[0];
        setSelectedCategoryId(defaultCat.id);
      }

      // Check recipient address network compatibility
      const val = validateCryptoInput(cryptoData.address, 'address');
      if (!val.isValid) {
        setErrorMessage(val.error || 'Endereço não compatível. Solicite um Endereço da rede/Base.');
      } else {
        setErrorMessage(null);
      }

      // Check device biometrics status
      WebAuthnService.isPlatformAuthenticatorAvailable().then((avail) => {
        setHasHardwareBiometrics(avail);
      });

      // Load Paymaster Proxy and Security status (Circle Paymaster & Allowlist)
      PaymasterService.getConfig().then((cfg) => {
        setPaymasterConfig(cfg);
      });
    }
  }, [cryptoData]);

  if (!isOpen || !cryptoData) return null;

  const recipientValidation = validateCryptoInput(cryptoData.address, 'address');
  
  // Calculate raw input value and current amount in USDC
  const rawInput = parseFloat(amountStr) || 0;
  const currentAmount = inputUnit === 'BRL'
    ? (rate > 0 ? parseFloat((rawInput / rate).toFixed(2)) : 0)
    : rawInput;
  const isAmountValid = currentAmount > 0;
  const feeBreakdown = CryptoTransferService.calculateProtocolFee(currentAmount);
  const senderAddress = walletAddress || Web3Service.generateDeterministicAddress(userEmail || 'crypto.user@base.org');

  // Threshold de Valor Expressivo: >= $100 USDC ou valor equivalente a R$ 500
  const isHighValue = currentAmount >= 100 || (rate > 0 && currentAmount * rate >= 500);

  // Dynamic gas fee from estimate or safe fallback (matching backend relayer 0.02 USDC)
  const estimatedGasUsd = gasEstimate ? gasEstimate.gasFeeUsd : 0.02;
  const totalDebitWithGas = parseFloat((currentAmount + feeBreakdown.feeAmount + estimatedGasUsd).toFixed(4));
  const hasSufficientBalance = userBalanceUSDC >= (modalStep === 'review' ? totalDebitWithGas : currentAmount);

  // Balance breakdown resolution (Total, Locked in Vaults, Free/Available)
  const resolvedLockedUSDC = typeof lockedInVaultsUSDC === 'number'
    ? lockedInVaultsUSDC
    : Math.max(0, (totalBalanceUSDC ?? userBalanceUSDC) - userBalanceUSDC);

  const resolvedTotalUSDC = typeof totalBalanceUSDC === 'number'
    ? totalBalanceUSDC
    : userBalanceUSDC + resolvedLockedUSDC;

  const formatBreakdownValue = (valUsdc: number) => {
    if (inputUnit === 'BRL') {
      const valBrl = valUsdc * rate;
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valBrl);
    }
    return `$ ${valUsdc.toFixed(2)}`;
  };

  // Toggle between typing in USDC ($) and typing in Reais (R$)
  const handleToggleInputUnit = () => {
    triggerHaptic('light');
    if (inputUnit === 'USDC') {
      setInputUnit('BRL');
      if (currentAmount > 0) {
        setAmountStr((currentAmount * rate).toFixed(2));
      }
    } else {
      setInputUnit('USDC');
      if (currentAmount > 0) {
        setAmountStr(currentAmount.toFixed(2));
      }
    }
    setErrorMessage(null);
  };

  // STEP 1 -> STEP 2: Query network for live gas & fees
  const handleProceedToReview = async () => {
    if (!recipientValidation.isValid) {
      triggerHaptic('warning');
      setErrorMessage(recipientValidation.error || 'Endereço não compatível. Solicite um Endereço da rede/Base.');
      return;
    }

    if (cryptoData.address.toLowerCase() === senderAddress.toLowerCase()) {
      triggerHaptic('warning');
      setErrorMessage('O endereço de destino é o seu próprio endereço. Não é permitido enviar para si mesmo (evita cobrança desnecessária de taxas).');
      return;
    }

    if (!isAmountValid) {
      triggerHaptic('warning');
      setErrorMessage('Digite uma quantia válida em USDC para prosseguir.');
      return;
    }

    if (currentAmount > userBalanceUSDC) {
      triggerHaptic('warning');
      if (resolvedLockedUSDC > 0 && currentAmount <= resolvedTotalUSDC) {
        setErrorMessage(
          `Saldo livre insuficiente (${formatBreakdownValue(userBalanceUSDC)}). Você possui ${formatBreakdownValue(resolvedLockedUSDC)} protegido nos seus cofres.`
        );
      } else {
        setErrorMessage(`Saldo livre insuficiente. Você possui ${formatBreakdownValue(userBalanceUSDC)} disponível.`);
      }
      return;
    }

    setErrorMessage(null);
    setIsEstimatingGas(true);
    triggerHaptic('medium');

    try {
      // Query Base RPC network gas in real time
      const estimate = await CryptoTransferService.estimateGasFee(
        (network as Web3Network) || 'base',
        currentAmount
      );
      setGasEstimate(estimate);
      setQuoteSecondsLeft(estimate.expiresInSeconds || QUOTE_TIMEOUT_SECONDS);

      const totalRequired = currentAmount + feeBreakdown.feeAmount + estimate.gasFeeUsd;
      if (userBalanceUSDC < totalRequired) {
        setErrorMessage(
          `Saldo insuficiente para cobrir envio + taxas da rede ($${totalRequired.toFixed(2)} USDC necessários, saldo atual: $${userBalanceUSDC.toFixed(2)}).`
        );
        setIsEstimatingGas(false);
        return;
      }

      setModalStep('review');
      if (isHighValue) {
        setHighValueCountdown(3);
        setHighValueConfirmed(false);
      } else {
        setHighValueCountdown(0);
        setHighValueConfirmed(true);
      }
    } catch (err) {
      console.error('Failed to query gas fees:', err);
      // Fallback matching backend relayer standard
      setGasEstimate({
        gasFeeUsd: 0.02,
        baseGasFeeUsd: 0.016,
        gasGwei: 0.008,
        gasUnits: 78000,
        baseGasUnits: 65000,
        bufferPercent: GAS_LIMIT_BUFFER_PERCENT,
        networkCongestion: 'low',
        congestionLabel: 'Baixa Congestão 🟢',
        source: 'calculated',
        timestamp: new Date().toISOString(),
        expiresInSeconds: QUOTE_TIMEOUT_SECONDS,
      });
      setQuoteSecondsLeft(QUOTE_TIMEOUT_SECONDS);
      setModalStep('review');
      if (isHighValue) {
        setHighValueCountdown(3);
        setHighValueConfirmed(false);
      } else {
        setHighValueCountdown(0);
        setHighValueConfirmed(true);
      }
    } finally {
      setIsEstimatingGas(false);
    }
  };

  // Re-fetch live gas fee on review screen
  const handleRefreshGas = async () => {
    if (isEstimatingGas) return;
    setIsEstimatingGas(true);
    triggerHaptic('light');
    try {
      const freshEstimate = await CryptoTransferService.estimateGasFee(
        (network as Web3Network) || 'base',
        currentAmount
      );
      setGasEstimate(freshEstimate);
      setQuoteSecondsLeft(freshEstimate.expiresInSeconds || QUOTE_TIMEOUT_SECONDS);
    } catch (err) {
      console.error('Error refreshing gas:', err);
    } finally {
      setIsEstimatingGas(false);
    }
  };

  // STEP 2 -> CONFIRM & BROADCAST ON-CHAIN
  const handleConfirmSend = async () => {
    if (!recipientValidation.isValid) {
      triggerHaptic('warning');
      setErrorMessage(
        recipientValidation.error ||
        (isEn ? 'Incompatible address. Please enter a valid Base network address.' : 'Endereço não compatível. Solicite um Endereço da rede/Base.')
      );
      return;
    }

    if (cryptoData.address.toLowerCase() === senderAddress.toLowerCase()) {
      triggerHaptic('warning');
      setErrorMessage(
        isEn
          ? 'Destination address is your own address. Sending to yourself is not permitted.'
          : 'O endereço de destino é o seu próprio endereço. Não é permitido enviar para si mesmo.'
      );
      return;
    }

    if (!isAmountValid) {
      triggerHaptic('warning');
      setErrorMessage(isEn ? 'Enter a valid amount to send in USDC.' : 'Digite uma quantia válida para enviar em USDC.');
      return;
    }

    // High-Value Security Guard: Require explicit user confirmation for high-value transfers
    if (isHighValue && (!highValueConfirmed || highValueCountdown > 0)) {
      triggerHaptic('warning');
      setErrorMessage(
        isEn
          ? 'Please confirm the security check for large amounts before proceeding.'
          : 'Confirme a verificação de segurança para valores expressivos antes de prosseguir.'
      );
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    triggerHaptic('medium');

    let activeGasFee = estimatedGasUsd;
    let activeTotalDebit = totalDebitWithGas;

    // If quote expired due to inactivity (>30s) or missing gas estimate, revalidate on-chain before signing
    if (quoteSecondsLeft <= 0 || !gasEstimate) {
      setSettlementStep(isEn ? 'Refreshing live quote on Base network...' : 'Revalidando cotação recente na rede Base...');
      try {
        const freshEstimate = await CryptoTransferService.estimateGasFee(
          (network as Web3Network) || 'base',
          currentAmount
        );
        setGasEstimate(freshEstimate);
        setQuoteSecondsLeft(freshEstimate.expiresInSeconds || QUOTE_TIMEOUT_SECONDS);
        activeGasFee = freshEstimate.gasFeeUsd;
        activeTotalDebit = parseFloat((currentAmount + feeBreakdown.feeAmount + activeGasFee).toFixed(4));
      } catch (err) {
        console.warn('Fallback on gas revalidation:', err);
      }
    }

    if (userBalanceUSDC < activeTotalDebit) {
      setIsProcessing(false);
      triggerHaptic('warning');
      setErrorMessage(
        isEn
          ? `Insufficient USDC balance for total of $${formatCryptoAmount(activeTotalDebit)} (Current balance: $${userBalanceUSDC.toFixed(2)}).`
          : `Saldo insuficiente em USDC para cobrir o total de $${formatCryptoAmount(activeTotalDebit)} (Saldo atual: $${userBalanceUSDC.toFixed(2)}).`
      );
      return;
    }

    try {
      // Step 1: Security check using native device security (Biometrics / Phone Screen Lock)
      const currentUser = StorageService.getUser();
      const isSecurityRequired = WebAuthnService.isDeviceSecurityEnabled(
        currentUser.deviceSecurityEnabled ?? currentUser.requireAuthForPayments
      );

      if (isSecurityRequired) {
        setSettlementStep(
          isEn
            ? 'Waiting for device authentication (Biometrics / PIN)...'
            : 'Aguardando autenticação no aparelho (Biometria / PIN do Celular)...'
        );
        const authResult = await WebAuthnService.authenticateBiometrics();
        if (!authResult.success) {
          if (authResult.cancelled) {
            setIsProcessing(false);
            setErrorMessage(isEn ? 'Biometric validation cancelled on device.' : 'Autorização biométrica cancelada no aparelho.');
            return;
          }
          throw new Error(authResult.message || (isEn ? 'Device security check failed.' : 'Falha na validação de segurança do celular.'));
        }
      }

      // Step 2: On-chain Base token signature
      setSettlementStep(
        isEn
          ? `Signing EIP-712 transaction of $${currentAmount.toFixed(2)} USDC...`
          : `Assinando transação EIP-712 de $${currentAmount.toFixed(2)} USDC...`
      );
      await new Promise((r) => setTimeout(r, 600));

      // Step 3: Broadcast to Base L2
      setSettlementStep(
        isEn
          ? 'Broadcasting transaction to Base network...'
          : 'Transmitindo transação para a rede Base...'
      );
      const finalReceipt = await CryptoTransferService.executeTransfer({
        recipientAddress: cryptoData.address,
        amount: currentAmount,
        token: 'USDC',
        senderAddress,
        network: (network as Web3Network) || 'base',
        label: expenseTitle.trim() || cryptoData.label,
        protocolFee: feeBreakdown.feeAmount,
        gasFee: activeGasFee,
        totalDebit: activeTotalDebit,
        userEmail,
        privateKey: walletPrivateKey,
      });

      triggerHaptic('success');
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#0052FF', '#B8F256', '#22C55E', '#3B82F6'],
      });

      setReceipt(finalReceipt);
      setIsProcessing(false);

      // Register payment in state immediately
      const newId = onPaymentComplete(finalReceipt, selectedCategoryId, expenseTitle.trim());
      if (typeof newId === 'string') {
        setCreatedTxId(newId);
      }
    } catch (err: any) {
      console.error('Crypto transfer error:', err);
      setIsProcessing(false);
      triggerHaptic('warning');
      setErrorMessage(err.message || (isEn ? 'Error processing transfer.' : 'Erro ao processar a transferência.'));
    }
  };

  // Live update post-payment organization data
  const handleUpdatePostPaymentDetails = (newCategory: string, newTitle: string) => {
    setSelectedCategoryId(newCategory);
    setExpenseTitle(newTitle);
    setIsSavedTag(true);

    if (createdTxId && onUpdateCreatedTransaction) {
      onUpdateCreatedTransaction(createdTxId, newCategory, newTitle);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      id="modal-crypto-send"
    >
      <div className="w-full max-w-md bg-white border-2 border-black rounded-3xl shadow-neo p-4 sm:p-5 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black/10">
          <div className="flex items-center gap-2">
            {modalStep === 'review' && !receipt ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setModalStep('amount');
                  setErrorMessage(null);
                }}
                className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center hover:bg-neutral-100 btn-press cursor-pointer"
                title={isEn ? "Back" : "Voltar"}
              >
                <ArrowLeft className="w-4 h-4 text-black" />
              </button>
            ) : (
              <div className="w-9 h-9 bg-[#0052FF] text-white border-2 border-black rounded-xl flex items-center justify-center text-lg shadow-neo-xs font-black">
                $
              </div>
            )}
            <div>
              <h3 className="font-['Outfit'] font-black text-base sm:text-lg text-black leading-tight">
                {receipt
                  ? (isEn ? 'On-Chain Receipt' : 'Comprovante On-Chain')
                  : modalStep === 'review'
                  ? (isEn ? 'Review & Sign' : 'Revisar & Assinar')
                  : (isEn ? 'Send USDC' : 'Pagar USDC')}
              </h3>
              <p className="text-[11px] text-neutral-500 font-bold">
                {receipt
                  ? (isEn ? 'Confirmed on Base ⚡' : 'Confirmado na Base ⚡')
                  : modalStep === 'review'
                  ? (isEn ? 'Step 2: Confirm' : 'Passo 2: Confirmação')
                  : (isEn ? 'Step 1: Amount' : 'Passo 1: Valor')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center hover:bg-rose-100 btn-press cursor-pointer"
            id="btn-close-crypto-send"
            aria-label={isEn ? "Close USDC send modal" : "Fechar janela de envio de USDC"}
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* VIEW A1: STEP 1 - DIGITAR VALOR & DETALHES               */}
        {/* ========================================================= */}
        {!receipt && modalStep === 'amount' && (
          <div className="space-y-3 pt-3">
            {/* Recipient Card */}
            <div className="p-2.5 sm:p-3 bg-[#F8FAFC] border-2 border-black rounded-2xl space-y-1.5 shadow-neo-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider block">
                  {isEn ? 'Recipient' : 'Destinatário'}
                </span>
                {recipientValidation.isValid ? (
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-[#E0F2FE] text-sky-900 border border-black/15 rounded-md">
                    {isEn ? 'Base L2 Network ⚡' : 'Rede Base L2 ⚡'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-md">
                    {isEn ? 'Incompatible Network ⚠️' : 'Rede Incompatível ⚠️'}
                  </span>
                )}
              </div>
              <div className="flex items-start justify-between gap-2.5 bg-white p-2.5 rounded-xl border border-black/10">
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-bold text-xs text-black select-all break-all leading-relaxed" id="recipient-crypto-address">
                    {cryptoData.address}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    navigator.clipboard.writeText(cryptoData.address);
                    setCopiedAddress(true);
                    setTimeout(() => setCopiedAddress(false), 2000);
                  }}
                  className="p-1.5 hover:bg-neutral-100 rounded-lg border border-neutral-300 flex-shrink-0 transition-colors btn-press cursor-pointer"
                  title={isEn ? "Copy" : "Copiar"}
                  aria-label={isEn ? "Copy" : "Copiar"}
                  id="btn-copy-recipient-address"
                >
                  {copiedAddress ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-neutral-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="p-3.5 bg-[#FEF9C3] border-2 border-black rounded-2xl space-y-2 shadow-neo-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-amber-950 tracking-wider">
                  {isEn ? 'Amount' : 'Valor'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleInputUnit}
                  className="inline-flex items-center gap-1 text-[10px] font-['Outfit'] font-black bg-white hover:bg-amber-100 border border-black/30 rounded-lg px-2 py-0.5 text-amber-950 shadow-2xs btn-press cursor-pointer"
                  title={isEn ? "Switch" : "Alternar"}
                >
                  <ArrowLeftRight className="w-3 h-3 text-amber-800" />
                  <span>{isEn ? `In ${inputUnit === 'USDC' ? 'BRL' : 'USDC'}` : `Em ${inputUnit === 'USDC' ? 'R$' : 'USDC'}`}</span>
                </button>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="font-['Outfit'] font-black text-2xl text-black">
                  {inputUnit === 'USDC' ? '$' : 'R$'}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="0.00"
                  className="w-full bg-transparent font-['Outfit'] font-black text-3xl text-black focus:outline-none placeholder:text-neutral-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
                <span className="font-['Outfit'] font-bold text-sm text-neutral-600">
                  {inputUnit}
                </span>
              </div>

              {/* Dynamic conversion with real-time rate */}
              <div className="flex items-center justify-between pt-1 border-t border-black/10">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-amber-950/80">
                    {inputUnit === 'USDC' ? (isEn ? 'In BRL:' : 'Em Reais:') : (isEn ? 'In USDC:' : 'Em USDC:')}
                  </span>
                  <span className="text-[9px] text-amber-900/60 font-mono">
                    (R$ {rate.toFixed(2).replace('.', ',')})
                  </span>
                </div>
                <span className="font-['Outfit'] font-bold text-xs text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded-lg border border-black/10">
                  {inputUnit === 'USDC'
                    ? `≈ R$ ${(currentAmount * rate).toFixed(2).replace('.', ',')}`
                    : `≈ $ ${currentAmount.toFixed(2)} USDC`}
                </span>
              </div>

              {/* Subtle balance distribution display (always centered) */}
              <div 
                className="pt-1.5 border-t border-black/10 flex items-center justify-center text-[10px] font-mono text-neutral-600 select-none text-center"
                id="crypto-send-balance-breakdown"
              >
                <span>{isEn ? 'Total:' : 'Total:'} <strong className="text-black font-semibold">{formatBreakdownValue(resolvedTotalUSDC)}</strong></span>
                <span className="text-black/30 mx-1.5">/</span>
                <span>{isEn ? 'Vaults:' : 'Cofre:'} <strong className="text-black font-semibold">{formatBreakdownValue(resolvedLockedUSDC)}</strong></span>
                <span className="text-black/30 mx-1.5">/</span>
                <span className="text-emerald-800">{isEn ? 'Available:' : 'Livre:'} <strong className="text-emerald-950 font-bold">{formatBreakdownValue(userBalanceUSDC)}</strong></span>
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-2.5 bg-[#FFE4E6] border-2 border-rose-500 rounded-xl space-y-1.5 text-xs text-rose-950 font-bold animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <div className="flex justify-end pt-1 border-t border-rose-200">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      openSupportEmail({
                        walletAddress: senderAddress,
                        userEmail,
                        errorMessage: isEn
                          ? `Send error: ${errorMessage} (Amount: ${currentAmount} USDC, Destination: ${cryptoData?.address})`
                          : `Erro no envio: ${errorMessage} (Valor: ${currentAmount} USDC, Destino: ${cryptoData?.address})`,
                        actionContext: isEn ? 'USDC Send Failure (Step 1)' : 'Falha no envio de USDC (Etapa 1)',
                        language,
                      });
                    }}
                    className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isEn ? 'Report error to support' : 'Relatar erro ao suporte'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Next Button: Proceed to review and quote gas */}
            <button
              type="button"
              onClick={handleProceedToReview}
              disabled={!recipientValidation.isValid || isEstimatingGas || !isAmountValid || currentAmount > userBalanceUSDC}
              className={`w-full py-3 px-4 rounded-2xl border-2 border-black font-['Outfit'] font-black text-sm shadow-neo-sm btn-press flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !recipientValidation.isValid || isEstimatingGas || !isAmountValid || currentAmount > userBalanceUSDC
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'bg-[#B8F256] hover:bg-[#A3E635] text-black'
              }`}
              id="btn-advance-to-review"
            >
              {isEstimatingGas ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>{isEn ? 'Estimating Base network gas...' : 'Consultando taxas na rede Base...'}</span>
                </>
              ) : (
                <>
                  <span>
                    {!recipientValidation.isValid
                      ? (isEn ? 'Incompatible Address (Not Base)' : 'Endereço Incompatível (Não é Base)')
                      : !isAmountValid
                      ? (isEn ? 'Enter an Amount' : 'Digite um Valor')
                      : currentAmount > userBalanceUSDC
                      ? (resolvedLockedUSDC > 0 && currentAmount <= resolvedTotalUSDC
                          ? (isEn ? 'Insufficient Free Balance' : 'Saldo Livre Insuficiente')
                          : (isEn ? 'Insufficient Balance' : 'Saldo Insuficiente'))
                      : (isEn ? 'Proceed to Review' : 'Avançar para Revisão')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW A2: STEP 2 - REVISAR & CONFIRMAR PAGAMENTO           */}
        {/* ========================================================= */}
        {!receipt && modalStep === 'review' && (
          <div className="space-y-3 pt-3">
            {/* Top Value Banner */}
            <div className="p-4 bg-[#F0FDF4] border-2 border-black rounded-2xl text-center shadow-neo-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
                {isEn ? 'Payment Amount' : 'Valor do Pagamento'}
              </span>
              <h4 className="font-['Outfit'] font-black text-3xl text-emerald-950">
                ${currentAmount.toFixed(2)} USDC
              </h4>
              <p className="text-xs font-bold text-emerald-800">
                ≈ R$ {(currentAmount * rate).toFixed(2).replace('.', ',')}
              </p>
            </div>

            {/* Clean Confirmation Summary Card */}
            <div className="p-3.5 bg-neutral-50 border-2 border-black rounded-2xl text-xs space-y-2.5 shadow-neo-xs">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500 font-medium">{isEn ? 'Recipient:' : 'Destinatário:'}</span>
                  <span className="text-[10px] font-bold text-sky-900 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                    {isEn ? 'Base L2 Network' : 'Rede Base L2'}
                  </span>
                </div>
                <div className="font-mono font-bold text-black text-xs bg-white p-2.5 rounded-xl border border-black/15 select-all break-all leading-relaxed">
                  {isHighValue && cryptoData.address.length >= 10 ? (
                    <span>
                      <span className="bg-amber-200 text-amber-950 px-1 py-0.5 rounded font-black border border-amber-400">
                        {cryptoData.address.slice(0, 6)}
                      </span>
                      <span className="text-neutral-500 px-0.5">
                        {cryptoData.address.slice(6, -4)}
                      </span>
                      <span className="bg-amber-200 text-amber-950 px-1 py-0.5 rounded font-black border border-amber-400">
                        {cryptoData.address.slice(-4)}
                      </span>
                    </span>
                  ) : (
                    cryptoData.address
                  )}
                </div>
                {isHighValue && (
                  <p className="text-[10px] text-amber-800 font-bold flex items-center gap-1 pt-0.5">
                    <span>{isEn ? '⚠️ Check the first 6 and last 4 characters before signing.' : '⚠️ Verifique os 6 primeiros e 4 últimos dígitos antes de assinar.'}</span>
                  </p>
                )}
              </div>

              {expenseTitle.trim() && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-medium">{isEn ? 'Description:' : 'Descrição:'}</span>
                  <span className="font-bold text-black text-right truncate max-w-[200px]">
                    {expenseTitle.trim()}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-medium">{isEn ? 'Category:' : 'Categoria:'}</span>
                <span className="font-bold text-black flex items-center gap-1">
                  <span>{categories.find((c) => c.id === selectedCategoryId)?.emoji}</span>
                  <span>{categories.find((c) => c.id === selectedCategoryId)?.name || (isEn ? 'General Expense' : 'Gasto Geral')}</span>
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-medium">{isEn ? 'Network:' : 'Rede:'}</span>
                <span className="font-bold text-sky-900 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 text-[11px]">
                  Base L2
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-black/5">
                <span className="text-neutral-500 font-medium">{isEn ? 'App Fee (0.2%):' : 'Taxa do App (0.2%):'}</span>
                <span className="font-mono font-medium text-neutral-700">
                  + ${feeBreakdown.feeAmount.toFixed(2)} USDC
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-neutral-500 font-medium">{isEn ? 'Network Gas (Base L2):' : 'Gás da Rede (Base L2):'}</span>
                <span className="font-mono font-medium text-neutral-700">
                  + ${estimatedGasUsd.toFixed(2)} USDC
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-600 font-bold">{isEn ? 'Total Fees:' : 'Total de Taxas:'}</span>
                <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-black/10">
                  + ${(feeBreakdown.feeAmount + estimatedGasUsd).toFixed(2)} USDC
                </span>
              </div>

              <div className="pt-2 border-t border-black/15 flex justify-between items-baseline">
                <span className="font-['Outfit'] font-black text-black text-sm">
                  {isEn ? 'Total Debit:' : 'Total a debitar:'}
                </span>
                <div className="text-right">
                  <span className="font-mono font-black text-base text-black block">
                    ${formatCryptoAmount(totalDebitWithGas)} USDC
                  </span>
                  <span className="text-[11px] font-bold text-neutral-500">
                    ≈ R$ {(totalDebitWithGas * rate).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>

            {/* Subtle Security Badge if Biometrics enabled */}
            {WebAuthnService.isDeviceSecurityEnabled(StorageService.getUser().deviceSecurityEnabled ?? StorageService.getUser().requireAuthForPayments) && (
              <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-center gap-1.5 text-[11px] text-emerald-900 font-medium">
                <Fingerprint className="w-3.5 h-3.5 text-emerald-700" />
                <span>{isEn ? 'Confirmation protected by biometrics / PIN' : 'Confirmação protegida por biometria / PIN'}</span>
              </div>
            )}

            {/* Error banner */}
            {errorMessage && (
              <div className="p-2.5 bg-[#FFE4E6] border-2 border-rose-500 rounded-xl space-y-1.5 text-xs text-rose-950 font-bold animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <div className="flex justify-end pt-1 border-t border-rose-200">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      openSupportEmail({
                        walletAddress: senderAddress,
                        userEmail,
                        errorMessage: isEn
                          ? `Settlement error: ${errorMessage} (Amount: ${currentAmount} USDC, Destination: ${cryptoData?.address})`
                          : `Erro na liquidação: ${errorMessage} (Valor: ${currentAmount} USDC, Destino: ${cryptoData?.address})`,
                        actionContext: isEn ? 'On-chain Settlement Failure (Step 2)' : 'Falha na liquidação on-chain (Etapa 2)',
                        language,
                      });
                    }}
                    className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isEn ? 'Report error to support' : 'Relatar erro ao suporte'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Progress status while broadcasting */}
            {isProcessing && (
              <div className="p-3 bg-[#E0F2FE] border-2 border-black rounded-2xl space-y-1 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#0052FF] border-t-transparent animate-spin" />
                  <span className="font-['Outfit'] font-black text-xs text-sky-950">
                    {isEn ? 'Processing On-Chain Transfer' : 'Processando Envio On-Chain'}
                  </span>
                </div>
                <p className="text-[11px] text-sky-900 font-medium">{settlementStep}</p>
              </div>
            )}

            {/* High-Value Security Lock: Double Confirmation for Large Amounts */}
            {isHighValue && (
              <div className="p-3 bg-[#FEF3C7] border-2 border-amber-500 rounded-2xl space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-800 flex-shrink-0" />
                  <span className="font-['Outfit'] font-black text-xs text-amber-950">
                    {isEn ? `High-Value Security Lock ($${currentAmount.toFixed(2)} USDC)` : `Trava de Segurança: Valor Expressivo ($${currentAmount.toFixed(2)} USDC)`}
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 leading-snug">
                  {isEn ? 'This is a significant transfer amount. Please double check the recipient address highlighted above to avoid errors.' : 'Esta é uma transferência de valor considerável. Verifique com atenção o endereço do destinatário destacado acima para garantir que não há erros de digitação ou cópia.'}
                </p>
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={highValueConfirmed}
                    onChange={(e) => {
                      triggerHaptic('light');
                      setHighValueConfirmed(e.target.checked);
                    }}
                    className="w-4 h-4 rounded border-2 border-black text-amber-600 focus:ring-amber-500 mt-0.5 cursor-pointer"
                    id="checkbox-confirm-high-value"
                  />
                  <span className="text-[11px] font-bold text-amber-950 leading-tight">
                    {isEn ? 'I verified the first and last characters and confirm the recipient is correct.' : 'Conferi os dígitos iniciais e finais do endereço e confirmo que o destinatário está correto.'}
                  </span>
                </label>
              </div>
            )}

            {/* Irreversible On-Chain Notice (Legal & User Protection) */}
            <p className="text-[10px] text-neutral-500 text-center font-medium leading-tight px-1">
              {isEn 
                ? '🔒 Blockchain transactions (Base) are immediate and irreversible. CofreAdmin cannot reverse transfers after signing.'
                : '🔒 Transações na blockchain (Base) são imediatas e irreversíveis. O CofreAdmin não pode cancelar ou estornar envios após a assinatura.'}
            </p>

            {/* Confirm and Sign Button */}
            <button
              type="button"
              onClick={handleConfirmSend}
              disabled={
                isProcessing ||
                (!hasSufficientBalance && quoteSecondsLeft > 0) ||
                (isHighValue && (!highValueConfirmed || highValueCountdown > 0))
              }
              className={`w-full py-3.5 px-4 rounded-2xl border-2 border-black font-['Outfit'] font-black text-sm shadow-neo-sm btn-press flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isProcessing ||
                (!hasSufficientBalance && quoteSecondsLeft > 0) ||
                (isHighValue && (!highValueConfirmed || highValueCountdown > 0))
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'bg-[#B8F256] hover:bg-[#A3E635] text-black'
              }`}
              id="btn-confirm-crypto-send"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isHighValue && highValueCountdown > 0 ? (
                <Clock className="w-4 h-4 animate-spin text-neutral-500" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>
                {isProcessing
                  ? (isEn ? 'Signing & Settling...' : 'Assinando e Liquidando...')
                  : !hasSufficientBalance
                  ? (isEn ? 'Insufficient Balance' : 'Saldo Insuficiente')
                  : isHighValue && highValueCountdown > 0
                  ? (isEn ? `Review carefully (${highValueCountdown}s)...` : `Revise com atenção (${highValueCountdown}s)...`)
                  : isHighValue && !highValueConfirmed
                  ? (isEn ? 'Check the address confirmation above' : 'Marque a confirmação do endereço acima')
                  : (isEn ? `Confirm & Pay $${formatCryptoAmount(totalDebitWithGas)} USDC` : `Confirmar e Pagar $${formatCryptoAmount(totalDebitWithGas)} USDC`)}
              </span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW B: POST-PAYMENT CONFIRMATION & EXPENSE ORGANIZER CARD (After Payment) */}
        {/* ========================================================================= */}
        {receipt && (
          <div className="space-y-3.5 pt-3">
            {/* Top Confirmed Banner */}
            <div className="p-4 border-2 border-black rounded-2xl space-y-2 shadow-neo-sm text-center bg-[#DCFCE7]">
              <div className="w-10 h-10 bg-white border-2 border-black rounded-full mx-auto flex items-center justify-center text-xl shadow-neo-xs">
                ✅
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest block text-emerald-800">
                  {isEn ? 'Payment Confirmed on Base Network ⚡' : 'Pagamento Confirmado na Rede Base ⚡'}
                </span>
                <h4 className="font-['Outfit'] font-black text-xl sm:text-2xl text-emerald-950">
                  ${receipt.amount.toFixed(2)} USDC
                </h4>
                <p className="text-xs font-bold text-emerald-800">
                  ≈ R$ {(receipt.amount * rate).toFixed(2).replace('.', ',')}
                </p>
                <p className="text-xs font-semibold text-emerald-900 mt-0.5">
                  {expenseTitle.trim() || receipt.label || (isEn ? 'Payment Complete' : 'Pagamento Realizado')}
                </p>
              </div>
            </div>

            {/* CARD: ENTER PAYMENT DETAILS / ORGANIZE EXPENSE */}
            <div className="p-3.5 bg-[#FFFBEB] border-2 border-black rounded-2xl space-y-3 shadow-neo-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-amber-700" />
                  <span className="font-['Outfit'] font-black text-xs text-black uppercase tracking-wider">
                    {isEn ? 'Organize this expense' : 'Organizar este gasto'}
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full border border-black/20">
                  {isSavedTag ? (isEn ? '✓ Saved to ledger' : '✓ Salvo no extrato') : (isEn ? 'Optional' : 'Opcional')}
                </span>
              </div>

              {/* Input: Expense Description / Memo */}
              <div className="space-y-1">
                <label className="text-[11px] font-['Outfit'] font-bold text-neutral-800 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isEn ? 'Expense Name' : 'Nome do Gasto'}</span>
                </label>
                <input
                  type="text"
                  value={expenseTitle}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleUpdatePostPaymentDetails(selectedCategoryId, val);
                  }}
                  placeholder={isEn ? "e.g. Rideshare, Dinner, Groceries..." : "Ex: Uber pro shopping, Almoço de domingo, Mercado..."}
                  className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl font-['Outfit'] font-bold text-xs text-black focus:outline-none shadow-neo-xs placeholder:text-neutral-400"
                />
              </div>

              {/* Selector: Expense Category */}
              <div className="space-y-1">
                <label className="text-[11px] font-['Outfit'] font-bold text-neutral-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                  <span>{isEn ? 'Choose Category' : 'Escolha a Categoria'}</span>
                </label>

                <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-1 bg-white border-2 border-black rounded-xl">
                  {expenseCategories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          handleUpdatePostPaymentDetails(cat.id, expenseTitle);
                        }}
                        className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-black shadow-neo-xs font-bold scale-[1.02]'
                            : 'border-black/20 hover:border-black bg-white opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: isSelected ? cat.bgColor : '#FFFFFF' }}
                        id={`post-pay-cat-${cat.id}`}
                      >
                        <span className="text-base">{cat.emoji}</span>
                        <span className="text-[10px] font-['Outfit'] font-bold text-neutral-900 leading-tight truncate w-full">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[10px] font-medium text-neutral-600 bg-amber-100/60 p-2 rounded-xl border border-amber-300">
                💡 <strong>{isEn ? 'Tip:' : 'Dica:'}</strong> {isEn ? 'If you are in a rush, you can finish now and organize or change the category later in your Ledger.' : 'Se estiver com pressa, você pode clicar em Concluir agora e organizar ou mudar a categoria depois acessando o seu Extrato.'}
              </p>
            </div>

            {/* Clean Receipt Details Table */}
            <div className="p-3 bg-neutral-50 border-2 border-black rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-black/10 pb-1.5">
                <span className="text-neutral-500 font-medium">{isEn ? 'Recipient:' : 'Destinatário:'}</span>
                <span className="font-mono text-[11px] text-black font-bold">
                  {Web3Service.truncateAddress(receipt.recipientAddress)}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-black/10 pb-1.5">
                <span className="text-neutral-500 font-medium">{isEn ? 'Category:' : 'Categoria:'}</span>
                <span className="font-bold text-black flex items-center gap-1">
                  <span>{categories.find((c) => c.id === selectedCategoryId)?.emoji}</span>
                  <span>{categories.find((c) => c.id === selectedCategoryId)?.name || (isEn ? 'General Expense' : 'Gasto Geral')}</span>
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-black/10 pb-1.5">
                <span className="text-neutral-500 font-medium">{isEn ? 'Total Debited:' : 'Total Debitado:'}</span>
                <span className="font-mono font-black text-rose-600 text-xs">
                  ${formatCryptoAmount(receipt.totalDebit || receipt.amount)} USDC
                </span>
              </div>

              <div className="flex justify-between items-center pt-0.5">
                <span className="text-neutral-500 font-medium">{isEn ? 'Receipt on Base:' : 'Comprovante na Base:'}</span>
                <a
                  href={Web3Service.getExplorerUrl(receipt.txHash, 'tx', receipt.network)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>{Web3Service.truncateAddress(receipt.txHash)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  navigator.clipboard.writeText(
                    isEn
                      ? `Payment Receipt\nName: ${expenseTitle.trim() || receipt.label || 'Payment'}\nAmount: $${receipt.amount.toFixed(2)} USDC\nRecipient: ${receipt.recipientAddress}\nHash: ${receipt.txHash}`
                      : `Comprovante Pagamento\nNome: ${expenseTitle.trim() || receipt.label || 'Pagamento'}\nValor: $${receipt.amount.toFixed(2)} USDC\nDestino: ${receipt.recipientAddress}\nHash: ${receipt.txHash}`
                  );
                  setCopiedReceipt(true);
                  setTimeout(() => setCopiedReceipt(false), 2500);
                }}
                className="flex-1 py-2.5 px-3 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-xs font-['Outfit'] font-bold text-black shadow-neo-xs btn-press flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedReceipt ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedReceipt ? (isEn ? 'Copied!' : 'Copiado!') : (isEn ? 'Copy' : 'Copiar')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('success');
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 bg-[#B8F256] hover:bg-[#A3E635] border-2 border-black rounded-xl text-xs font-['Outfit'] font-black text-black shadow-neo-xs btn-press flex items-center justify-center gap-1.5 cursor-pointer"
                id="btn-finish-crypto-send"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEn ? 'Finish' : 'Concluir'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
