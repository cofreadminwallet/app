import React, { useState, useMemo, useEffect } from 'react';
import { X, Copy, Check, Share2, Download, ArrowLeftRight } from 'lucide-react';
import QRCode from 'qrcode';
import { isAddress, getAddress } from 'viem';
import { generateCryptoPaymentUri, generateShareablePaymentLink } from '../utils/cryptoAddressUtils';
import { Web3Service, Web3Network } from '../services/web3Service';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { useI18n } from '../services/i18nService';
import { triggerHaptic } from '../utils/haptics';

// Renders official Vault icon in pure canvas vectors (zero network, CORS, or external SVG dependencies)
const drawVaultVector = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) => {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 64;
  ctx.scale(scale, scale);

  // 1. Vault box with purple gradient
  const grad = ctx.createLinearGradient(0, 8, 0, 56);
  grad.addColorStop(0, '#9333EA');
  grad.addColorStop(1, '#6B21A8');

  ctx.fillStyle = grad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(6, 8, 40, 48, 8);
  } else {
    ctx.rect(6, 8, 40, 48);
  }
  ctx.fill();
  ctx.stroke();

  // 2. Vault outer dial wheel
  ctx.fillStyle = '#C084FC';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(26, 32, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Center hole of vault wheel
  ctx.fillStyle = '#3B0764';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(26, 32, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 4. Lime side panel (#B8F256)
  ctx.fillStyle = '#B8F256';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(46, 14, 12, 36, 3);
  } else {
    ctx.rect(46, 14, 12, 36);
  }
  ctx.fill();
  ctx.stroke();

  // 5. Black panel grooves
  ctx.fillStyle = '#000000';
  const stripes = [
    [48, 20, 8, 2],
    [50, 31, 8, 2],
    [47, 41, 8, 2],
  ];
  for (const [sx, sy, sw, sh] of stripes) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(sx, sy, sw, sh, 1);
    } else {
      ctx.rect(sx, sy, sw, sh);
    }
    ctx.fill();
  }

  ctx.restore();
};

interface CryptoReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail?: string;
  walletAddress?: string;
  network?: Web3Network;
}

export const CryptoReceiveModal: React.FC<CryptoReceiveModalProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
  walletAddress,
  network = 'base',
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';
  const { rate } = useExchangeRate();
  const [customAmount, setCustomAmount] = useState<string>('');
  const [receiveUnit, setReceiveUnit] = useState<'USDC' | 'BRL'>('USDC');
  const [memo, setMemo] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [localQrDataUrl, setLocalQrDataUrl] = useState<string>('');

  const rawAddress = walletAddress || '';

  // EIP-55 checksum-verified address (anti-malware clipboard protection)
  const displayAddress = useMemo(() => {
    try {
      if (isAddress(rawAddress as `0x${string}`)) {
        return getAddress(rawAddress as `0x${string}`);
      }
    } catch {
      // Ignore and fallback to rawAddress
    }
    return rawAddress;
  }, [rawAddress]);

  const rawTypedVal = parseFloat(customAmount) > 0 ? parseFloat(customAmount) : 0;
  const amountVal = useMemo(() => {
    if (rawTypedVal <= 0) return undefined;
    if (receiveUnit === 'BRL') {
      return rate > 0 ? parseFloat((rawTypedVal / rate).toFixed(2)) : undefined;
    }
    return parseFloat(rawTypedVal.toFixed(2));
  }, [rawTypedVal, receiveUnit, rate]);

  const handleToggleReceiveUnit = () => {
    triggerHaptic('light');
    if (receiveUnit === 'USDC') {
      setReceiveUnit('BRL');
      if (amountVal && rate > 0) {
        setCustomAmount((amountVal * rate).toFixed(2));
      }
    } else {
      setReceiveUnit('USDC');
      if (amountVal) {
        setCustomAmount(amountVal.toFixed(2));
      }
    }
  };

  const cryptoUri = useMemo(() => {
    return generateCryptoPaymentUri({
      address: displayAddress,
      amount: amountVal,
      token: 'USDC',
      label: memo.trim() || userName || 'Cofre Base USDC',
      chainId: 8453,
    });
  }, [displayAddress, amountVal, memo, userName]);

  const paymentLink = useMemo(() => {
    return generateShareablePaymentLink({
      address: displayAddress,
      amount: amountVal,
      label: memo.trim() || undefined,
      chainId: 8453,
    });
  }, [displayAddress, amountVal, memo]);

  // 100% client-side QR generation in memory (Zero data leakage to third-party servers)
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(cryptoUri, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setLocalQrDataUrl(url);
      })
      .catch(() => {
        // Fallback silencioso
      });

    return () => {
      active = false;
    };
  }, [cryptoUri]);

  if (!isOpen) return null;

  const handleCopyAddress = () => {
    triggerHaptic('success');
    navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Clean QR Code with Level H error correction (30% redundancy).
  // Prioritizes local offline rendering with fallback if browser is restricted.
  const qrCodeUrl =
    localQrDataUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      cryptoUri
    )}&bgcolor=ffffff&color=000000&margin=2&ecc=H`;

  // Generates PNG QR Code card following exact app card styling:
  // Fundo branco, moldura neo-brutalista, margem de respiro interna generosa (quiet zone)
  // with centered official Vault icon at Level H correction ensuring flawless scannability.
  const generateQrWithLogoBlob = async (): Promise<Blob> => {
    const hasExtraInfo = Boolean(amountVal || memo.trim());
    const qrSize = 400;
    const cardPadding = 28; // Perfectly balanced padding across all 4 sides (top, bottom, left, right)

    // Dynamic extra height calculation when amount or memo is present
    let extraBottomSpace = 0;
    if (amountVal) extraBottomSpace += 38;
    if (memo.trim()) extraBottomSpace += 32;

    const cardW = qrSize + cardPadding * 2; // 456px (Quadrado perfeito quando sem extras)
    const cardH = qrSize + cardPadding * 2 + extraBottomSpace;

    const cardMargin = 16;
    const shadowOffset = 4;
    const canvasWidth = cardW + cardMargin * 2 + shadowOffset;
    const canvasHeight = cardH + cardMargin * 2 + shadowOffset;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    // 1. Fundo geral branco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Card with black border and rounded corners
    const cardX = cardMargin;
    const cardY = cardMargin;
    const cardRadius = 24;

    // Neo-brutalist card shadow (+4px)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cardX + shadowOffset, cardY + shadowOffset, cardW, cardH, cardRadius);
    } else {
      ctx.rect(cardX + shadowOffset, cardY + shadowOffset, cardW, cardH);
    }
    ctx.fill();

    // Card body (white background with solid 4px black border)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
    } else {
      ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.fill();
    ctx.stroke();

    // 3. QR Code centered with uniform spacing (28px padding on all sides)
    const qrX = cardX + cardPadding;
    const qrY = cardY + cardPadding;

    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, cryptoUri, {
      errorCorrectionLevel: 'H',
      margin: 0,
      width: qrSize,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // 4. Central official Vault badge (82x82px on 400px = ~20.5% QR width, only 4.2% total area)
    const badgeSize = 82;
    const badgeX = qrX + (qrSize - badgeSize) / 2;
    const badgeY = qrY + (qrSize - badgeSize) / 2;
    const badgeRadius = 18;

    // Badge white background with neo-brutalist black border
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, badgeRadius);
    } else {
      ctx.rect(badgeX, badgeY, badgeSize, badgeSize);
    }
    ctx.fill();
    ctx.stroke();

    // 5. Render vault vector icon in center of badge
    const iconPadding = 12;
    const iconSize = badgeSize - iconPadding * 2;
    drawVaultVector(ctx, badgeX + iconPadding, badgeY + iconPadding, iconSize);

    // 6. Render amount and memo tags below QR Code with balanced padding
    if (hasExtraInfo) {
      let currentY = qrY + qrSize + 14;

      if (amountVal) {
        const text = `Valor: $${amountVal.toFixed(2)} USDC`;
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const metrics = ctx.measureText(text);
        const pillW = metrics.width + 24;
        const pillH = 30;
        const pillX = cardX + (cardW - pillW) / 2;

        ctx.fillStyle = '#FEF9C3';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(pillX, currentY, pillW, pillH, 8);
        } else {
          ctx.rect(pillX, currentY, pillW, pillH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, cardX + cardW / 2, currentY + pillH / 2);
        currentY += pillH + 8;
      }

      if (memo.trim()) {
        const memoText = `Motivo: ${memo.trim()}`;
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const metrics = ctx.measureText(memoText);
        const pillW = Math.min(metrics.width + 20, cardW - 40);
        const pillH = 26;
        const pillX = cardX + (cardW - pillW) / 2;

        ctx.fillStyle = '#F5F5F5';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(pillX, currentY, pillW, pillH, 6);
        } else {
          ctx.rect(pillX, currentY, pillW, pillH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#374151';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(memoText, cardX + cardW / 2, currentY + pillH / 2);
      }
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao gerar blob do canvas'));
      }, 'image/png');
    });
  };

  // Download QR Code card PNG directly to device
  const handleDownloadQrCode = async () => {
    try {
      triggerHaptic('medium');
      const blob = await generateQrWithLogoBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cofreadmin-qrcode-usdc-${displayAddress.slice(0, 6)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    } catch (err) {
      console.error('Erro ao baixar QR Code:', err);
    }
  };

  // Share USDC Base receive address cleanly and directly
  const handleShareQrAndAddress = async () => {
    triggerHaptic('medium');

    const lines: string[] = [
      amountVal
        ? isEn
          ? `⚡ Payment Request: $${amountVal.toFixed(2)} USDC (Base Network)`
          : `⚡ Cobrança em USDC: $${amountVal.toFixed(2)} USDC (≈ R$ ${(amountVal * rate).toFixed(2).replace('.', ',')})`
        : isEn
        ? 'Hello! Here is my USDC receiving address (Base Network):'
        : 'Olá! Segue meu endereço para recebimento em USDC (Rede Base):',
      '',
      `${isEn ? 'Address (Base)' : 'Endereço (Base)'}: ${displayAddress}`,
    ];
    if (amountVal) {
      lines.push(`${isEn ? 'Exact Amount' : 'Valor Exato'}: $${amountVal.toFixed(2)} USDC`);
    }
    if (memo.trim()) {
      lines.push(`${isEn ? 'For' : 'Motivo'}: ${memo.trim()}`);
    }
    if (amountVal || memo.trim()) {
      lines.push('');
      lines.push(
        isEn
          ? `👉 Pay in 1 click (pre-filled): ${paymentLink}`
          : `👉 Pagar em 1 clique (já preenchido): ${paymentLink}`
      );
    }

    const shareTitle = isEn ? 'USDC Payment Request (Base)' : 'Cobrança USDC (Rede Base)';
    const shareText = lines.join('\n');

    let blob: Blob | null = null;
    try {
      blob = await generateQrWithLogoBlob();
    } catch (err) {
      console.error('Erro ao gerar blob do QR card:', err);
    }

    if (navigator.share && blob) {
      const qrFile = new File([blob], 'qrcode-recebimento-usdc.png', { type: 'image/png' });
      try {
        if (navigator.canShare && navigator.canShare({ files: [qrFile] })) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            files: [qrFile],
          });
          setShared(true);
          setTimeout(() => setShared(false), 2500);
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // If native share target rejects image files, attempt text share or fallback
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2500);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: copy clean address data to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch {
      handleCopyAddress();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      id="modal-crypto-receive"
    >
      <div className="w-full max-w-md bg-white border-2 border-black rounded-[28px] shadow-neo p-4 sm:p-5 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#0052FF] text-white border-2 border-black rounded-xl flex items-center justify-center text-lg shadow-neo-xs font-black">
              $
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-base sm:text-lg text-black leading-tight flex items-center gap-1.5">
                <span>{isEn ? 'Receive USDC' : 'Receber USDC'}</span>
                <span className="text-[10px] bg-[#B8F256] text-black px-2 py-0.5 rounded-full border border-black font-bold uppercase">
                  Base L2
                </span>
              </h3>
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center hover:bg-rose-100 btn-press cursor-pointer shadow-neo-xs"
              id="btn-close-crypto-receive"
              aria-label={isEn ? "Close" : "Fechar"}
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        <div className="space-y-3 pt-3 text-center">
          {/* QR Code Container with Centered Vault Badge */}
          <div className="relative p-3 bg-white border-2 border-black rounded-2xl shadow-neo-xs inline-block mx-auto">
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 mx-auto flex items-center justify-center">
              <img
                src={qrCodeUrl}
                alt="QR Code USDC Base"
                className="w-full h-full object-contain rounded-lg"
              />
              {/* Official Central Badge (Web3 Standard with Level H Correction) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-xl border-2 border-black shadow-sm flex items-center justify-center p-1.5 z-10">
                  <img
                    src="/favicon.svg"
                    alt="Cofre"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
            {(amountVal || memo.trim()) && (
              <div className="mt-2 flex flex-col items-center gap-1">
                {amountVal && (
                  <span className="inline-block bg-[#FEF9C3] border border-black rounded-lg px-2.5 py-0.5 text-xs font-['Outfit'] font-black text-black">
                    {isEn ? 'Amount' : 'Valor'}: ${amountVal.toFixed(2)} USDC
                  </span>
                )}
                {memo.trim() && (
                  <span className="inline-block bg-neutral-100 border border-black/20 rounded-md px-2 py-0.5 text-[11px] font-bold text-neutral-700 max-w-[200px] truncate">
                    {isEn ? 'For' : 'Motivo'}: {memo.trim()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Address Card with Action Buttons in Top Right */}
          <div className="p-2.5 sm:p-3 bg-neutral-50 border-2 border-black rounded-2xl text-left space-y-1.5 shadow-neo-xs">
            {/* Card Top: Left Label and Top-Right Action Buttons */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <label className="text-[10px] font-bold uppercase text-neutral-600">
                  {isEn ? 'Address (Base)' : 'Endereço (Base)'}
                </label>
                {(copied || shared || downloaded) && (
                  <span className="text-[10px] font-['Outfit'] font-black text-emerald-700 animate-in fade-in">
                    {copied
                      ? (isEn ? '✓ Copied!' : '✓ Copiado!')
                      : downloaded
                      ? (isEn ? '✓ Saved!' : '✓ Salvo!')
                      : (isEn ? '✓ Shared!' : '✓ Compartilhado!')}
                  </span>
                )}
              </div>

              {/* Action buttons in top right */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Copy Icon Button */}
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="w-6.5 h-6.5 sm:w-7 sm:h-7 bg-[#B8F256] hover:bg-[#A3E635] border-[1.5px] border-black rounded-lg text-black btn-press shadow-neo-xs flex items-center justify-center cursor-pointer transition-transform"
                  id="btn-copy-full-receive-address"
                  title={copied ? (isEn ? 'Address copied!' : 'Endereço copiado!') : (isEn ? 'Copy address' : 'Copiar endereço')}
                  aria-label={isEn ? "Copy address" : "Copiar endereço"}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />
                  ) : (
                    <Copy className="w-3 h-3 text-black stroke-[2.2]" />
                  )}
                </button>

                {/* Download Image Button */}
                <button
                  type="button"
                  onClick={handleDownloadQrCode}
                  className={`w-6.5 h-6.5 sm:w-7 sm:h-7 border-[1.5px] border-black rounded-lg text-black btn-press shadow-neo-xs flex items-center justify-center cursor-pointer transition-colors ${
                    downloaded ? 'bg-[#DCFCE7]' : 'bg-white hover:bg-neutral-100'
                  }`}
                  id="btn-download-crypto-qr-symbol"
                  title={downloaded ? (isEn ? 'Image saved!' : 'Imagem salva!') : (isEn ? 'Download QR Code Card Image' : 'Baixar Imagem do Card do QR Code')}
                  aria-label={isEn ? "Download QR Code Card Image" : "Baixar Imagem do Card do QR Code"}
                >
                  {downloaded ? (
                    <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />
                  ) : (
                    <Download className="w-3 h-3 text-black stroke-[2.2]" />
                  )}
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={handleShareQrAndAddress}
                  className={`w-6.5 h-6.5 sm:w-7 sm:h-7 border-[1.5px] border-black rounded-lg text-black btn-press shadow-neo-xs flex items-center justify-center cursor-pointer transition-colors ${
                    shared ? 'bg-[#DCFCE7]' : 'bg-white hover:bg-neutral-100'
                  }`}
                  id="btn-share-crypto-qr-symbol"
                  title={shared ? (isEn ? 'Data shared!' : 'Dados compartilhados!') : (isEn ? 'Share QR Code and Address' : 'Compartilhar QR Code e Endereço')}
                  aria-label={isEn ? "Share QR Code and Address" : "Compartilhar QR Code e Endereço"}
                >
                  {shared ? (
                    <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />
                  ) : (
                    <Share2 className="w-3 h-3 text-black stroke-[2.2]" />
                  )}
                </button>
              </div>
            </div>

            {/* Full unblocked address on its own line */}
            <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-black/20 flex items-center">
              <p
                className="font-mono text-[11px] sm:text-xs text-black whitespace-nowrap overflow-x-auto no-scrollbar select-all flex-1 tracking-tight leading-normal"
                title={displayAddress}
              >
                {displayAddress}
              </p>
            </div>
          </div>

          {/* Amount and Memo (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            {/* Amount with USDC / BRL Toggle */}
            <div className="p-2.5 bg-[#FEF9C3] border-2 border-black rounded-2xl space-y-1 shadow-neo-xs">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase text-amber-950">
                  {isEn ? 'Request Amount' : 'Valor a Cobrar'}
                </label>
                <button
                  type="button"
                  onClick={handleToggleReceiveUnit}
                  className="inline-flex items-center gap-1 text-[9px] bg-white hover:bg-amber-100 text-black border border-black px-1.5 py-0.5 rounded font-black cursor-pointer btn-press"
                  title={isEn ? 'Switch currency' : 'Alternar moeda'}
                >
                  <ArrowLeftRight className="w-2.5 h-2.5" />
                  <span>{receiveUnit === 'USDC' ? (isEn ? 'In BRL' : 'Em R$') : 'Em USDC'}</span>
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-['Outfit'] font-black text-base text-black">
                  {receiveUnit === 'USDC' ? '$' : 'R$'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent font-['Outfit'] font-black text-sm text-black focus:outline-none placeholder:text-neutral-400"
                />
                <span className="text-[10px] font-bold text-amber-900">{receiveUnit}</span>
              </div>
              {amountVal && rate > 0 && (
                <p className="text-[10px] font-bold text-amber-900/80 pt-0.5 border-t border-black/10">
                  {receiveUnit === 'USDC'
                    ? `≈ R$ ${(amountVal * rate).toFixed(2).replace('.', ',')}`
                    : `Cobrará $${amountVal.toFixed(2)} USDC`}
                </p>
              )}
            </div>

            {/* Memo / Reason */}
            <div className="p-2.5 bg-neutral-50 border-2 border-black rounded-2xl space-y-1 shadow-neo-xs flex flex-col justify-between">
              <div>
                <label className="text-[10px] font-bold uppercase text-neutral-600 block">
                  {isEn ? 'For / Note (Optional)' : 'Motivo (Opcional)'}
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder={isEn ? 'e.g., BBQ, Lunch, Split...' : 'Ex: Churrasco, Almoço...'}
                  maxLength={35}
                  className="w-full bg-transparent text-xs font-bold text-black focus:outline-none placeholder:text-neutral-400 mt-1"
                />
              </div>
              <p className="text-[9px] text-neutral-400 font-medium">
                {isEn ? 'Pre-fills payer description' : 'Já preenche a descrição de quem paga'}
              </p>
            </div>
          </div>

          {/* Direct Network Notice */}
          <p className="text-[10px] text-neutral-500 font-medium text-center pt-0.5">
            {isEn ? (
              <>⚠️ Only accepts <strong>USDC</strong> on the <strong>Base</strong> network.</>
            ) : (
              <>⚠️ Aceita exclusivamente <strong>USDC</strong> na rede <strong>Base</strong>.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
