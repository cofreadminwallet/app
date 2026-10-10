import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  X,
  Camera,
  QrCode,
  AlertCircle,
  Copy,
  ArrowRight,
  ShieldCheck,
  Send,
  Zap,
  RefreshCw,
} from 'lucide-react';
import {
  validateCryptoInput,
  parseCryptoQrOrText,
  ParsedCryptoData,
  isValidEvmAddress,
} from '../utils/cryptoAddressUtils';
import { useI18n } from '../services/i18nService';
import { triggerHaptic } from '../utils/haptics';

interface CryptoQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: ParsedCryptoData) => void;
}

export const CryptoQrScannerModal: React.FC<CryptoQrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';
  const [activeTab, setActiveTab] = useState<'camera' | 'paste'>('camera');
  const [pastedText, setPastedText] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'crypto-reader-container';

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);

      // Short delay to ensure DOM element is ready
      await new Promise((r) => setTimeout(r, 200));

      const element = document.getElementById(scannerContainerId);
      if (!element) return;

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // Ignore
        }
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDecodedPayload(decodedText);
        },
        () => {
          // Scrape frame - ignore errors while framing
        }
      );
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(
        isEn
          ? 'Unable to access camera. You can paste the 0x address in the tab next to this.'
          : 'Não foi possível acessar a câmera. Você pode colar o endereço 0x na aba ao lado.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleDecodedPayload = (raw: string) => {
    const result = validateCryptoInput(raw, 'qr');
    if (result.isValid && result.data) {
      triggerHaptic('success');
      stopCamera();
      onScanSuccess(result.data);
    } else {
      triggerHaptic('warning');
      stopCamera();
      setCameraError(
        result.error ||
          (isEn
            ? 'Incompatible QR Code. Please provide a Base network QR Code.'
            : 'QR Code não compatível. Solicite um QR Code da rede/Base.')
      );
    }
  };

  const handleManualSubmit = () => {
    setPasteError(null);
    if (!pastedText.trim()) {
      triggerHaptic('warning');
      setPasteError(
        isEn
          ? 'Paste or type a Base network address.'
          : 'Cole ou digite um endereço da rede/Base.'
      );
      return;
    }

    const result = validateCryptoInput(pastedText, 'address');
    if (result.isValid && result.data) {
      triggerHaptic('success');
      onScanSuccess(result.data);
    } else {
      triggerHaptic('warning');
      setPasteError(
        result.error ||
          (isEn
            ? 'Incompatible address. Please enter a valid Base network address.'
            : 'Endereço não compatível. Solicite um Endereço da rede/Base.')
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      id="modal-crypto-scanner"
    >
      <div className="w-full max-w-md bg-white border-2 border-black rounded-3xl shadow-neo p-4 sm:p-5 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black/10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#B8F256] border-2 border-black rounded-xl flex items-center justify-center text-xl shadow-neo-xs">
              ⚡
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-base sm:text-lg text-black leading-tight flex items-center gap-1.5">
                <span>{isEn ? 'Scan / Pay' : 'Escanear / Pagar'}</span>
                <span className="text-[10px] bg-black text-[#B8F256] px-1.5 py-0.2 rounded font-bold uppercase">
                  Base
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center hover:bg-rose-100 btn-press cursor-pointer"
            id="btn-close-crypto-scanner"
            aria-label={isEn ? "Close" : "Fechar"}
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-2 my-3 p-1 bg-neutral-100 border-2 border-black rounded-2xl">
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('camera');
            }}
            className={`py-2 px-3 rounded-xl font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-white border-2 border-black text-black shadow-neo-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
            id="btn-tab-scanner-camera"
            aria-label={isEn ? "QR Camera" : "Câmera QR"}
            aria-selected={activeTab === 'camera'}
          >
            <Camera className="w-4 h-4" />
            <span>{isEn ? 'QR Camera' : 'Câmera QR'}</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              stopCamera();
              setActiveTab('paste');
            }}
            className={`py-2 px-3 rounded-xl font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-white border-2 border-black text-black shadow-neo-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
            id="btn-tab-scanner-paste"
            aria-label={isEn ? "Paste 0x" : "Digitar 0x"}
            aria-selected={activeTab === 'paste'}
          >
            <Copy className="w-4 h-4" />
            <span>{isEn ? 'Paste 0x' : 'Digitar 0x'}</span>
          </button>
        </div>

        {/* TAB 1: Camera Scanner */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            <div className="relative overflow-hidden bg-neutral-900 border-2 border-black rounded-2xl aspect-square flex items-center justify-center">
              <div id={scannerContainerId} className="w-full h-full" />

              {/* Scanning visual overlay */}
              {isScanning && !cameraError && (
                <div className="absolute inset-0 pointer-events-none border-4 border-[#B8F256]/60 rounded-2xl flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-dashed border-[#B8F256] rounded-xl animate-pulse flex items-center justify-center">
                    <span className="text-[11px] font-bold text-[#B8F256] bg-black/80 px-2 py-1 rounded-md">
                      {isEn ? 'Point at Base QR Code' : 'Aponte para o QR Code Base'}
                    </span>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-xs p-5 text-center text-white flex flex-col items-center justify-center gap-3 z-20 animate-in fade-in duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-rose-400" />
                  </div>
                  <div className="space-y-1 max-w-[280px]">
                    <p className="text-xs font-['Outfit'] font-black text-white leading-snug">
                      {cameraError}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 w-full max-w-[260px]">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setCameraError(null);
                        startCamera();
                      }}
                      className="w-full py-2 px-3 bg-[#B8F256] hover:bg-[#A3E635] text-black border-2 border-black rounded-xl font-['Outfit'] font-black text-xs shadow-neo-xs btn-press flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Scan again' : 'Escanear novamente'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setCameraError(null);
                        stopCamera();
                        setActiveTab('paste');
                      }}
                      className="w-full py-2 px-3 bg-white hover:bg-neutral-100 text-black border-2 border-black rounded-xl font-['Outfit'] font-bold text-xs shadow-neo-xs btn-press flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Paste 0x' : 'Digitar 0x'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-center text-neutral-500 font-medium">
              {isEn ? (
                <>⚠️ Only accepts <strong>USDC</strong> on the <strong>Base</strong> network.</>
              ) : (
                <>⚠️ Aceita apenas <strong>USDC</strong> na rede <strong>Base</strong>.</>
              )}
            </p>
          </div>
        )}

        {/* TAB 2: Paste / Manual 0x Address */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-['Outfit'] font-black text-black mb-1">
                {isEn ? 'Destination Address (0x...):' : 'Endereço de Destino (0x...):'}
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  if (pasteError) setPasteError(null);
                }}
                placeholder={isEn ? "0x... or ethereum:0x..." : "0x... ou ethereum:0x..."}
                rows={3}
                className="w-full p-3 bg-neutral-50 border-2 border-black rounded-2xl font-mono text-xs text-black focus:outline-none focus:bg-white shadow-neo-xs"
              />
            </div>

            {pasteError && (
              <div className="p-2.5 bg-rose-50 border-2 border-rose-400 rounded-xl text-xs text-rose-900 font-bold flex items-center gap-2 shadow-neo-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{pasteError}</span>
              </div>
            )}

            <button
              onClick={handleManualSubmit}
              className="w-full py-2.5 px-4 bg-[#B8F256] hover:bg-[#A3E635] border-2 border-black rounded-xl font-['Outfit'] font-black text-sm text-black shadow-neo-xs btn-press flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isEn ? 'Proceed to Payment' : 'Avançar para Pagamento'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-[10px] text-center text-neutral-500 font-medium">
              {isEn ? (
                <>⚠️ Only accepts <strong>USDC</strong> on the <strong>Base</strong> network.</>
              ) : (
                <>⚠️ Aceita apenas <strong>USDC</strong> na rede <strong>Base</strong>.</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
