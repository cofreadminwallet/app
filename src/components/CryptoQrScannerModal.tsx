import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  X,
  Camera,
  AlertCircle,
  Copy,
  ArrowRight,
  RefreshCw,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  Globe,
  Star,
} from 'lucide-react';
import {
  validateCryptoInput,
  ParsedCryptoData,
  isValidEvmAddress,
} from '../utils/cryptoAddressUtils';
import { EnsResolutionService } from '../services/ensResolutionService';
import { db } from '../services';
import { SavedContact } from '../types';
import { Web3Service } from '../services/web3Service';
import { useI18n } from '../services/i18nService';
import { triggerHaptic } from '../utils/haptics';

interface CryptoQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: ParsedCryptoData) => void;
}

const CONTACT_EMOJIS = ['👤', '⚡', '🚀', '💎', '🦊', '💼', '🏠', '🍕'];

export const CryptoQrScannerModal: React.FC<CryptoQrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';
  const [activeTab, setActiveTab] = useState<'camera' | 'paste' | 'contacts'>('camera');
  const [pastedText, setPastedText] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Basenames (.base.eth) & ENS (.eth) live resolution state
  const [isResolvingEns, setIsResolvingEns] = useState(false);
  const [resolvedEnsData, setResolvedEnsData] = useState<{
    name: string;
    address: string;
    isBasename: boolean;
  } | null>(null);

  // Contact Book state
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactInput, setNewContactInput] = useState('');
  const [newContactEmoji, setNewContactEmoji] = useState('👤');
  const [contactFormError, setContactFormError] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'crypto-reader-container';

  useEffect(() => {
    if (isOpen) {
      setContacts(db.getContacts());
      setPasteError(null);
      setContactFormError(null);
    }
  }, [isOpen]);

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

  // Live debounced resolution when user types a .base.eth or .eth domain in Paste tab
  useEffect(() => {
    const trimmed = pastedText.trim().replace(/^@/, '');
    if (!EnsResolutionService.isDomainNameInput(trimmed)) {
      setResolvedEnsData(null);
      setIsResolvingEns(false);
      return;
    }

    let cancelled = false;
    setIsResolvingEns(true);
    setPasteError(null);

    const timer = setTimeout(async () => {
      const res = await EnsResolutionService.resolveName(trimmed, isEn);
      if (cancelled) return;
      setIsResolvingEns(false);
      if (res.isValid && res.address && res.normalizedName) {
        setResolvedEnsData({
          name: res.normalizedName,
          address: res.address,
          isBasename: Boolean(res.isBasename),
        });
        setPasteError(null);
      } else {
        setResolvedEnsData(null);
        if (res.error) {
          setPasteError(res.error);
        }
      }
    }, 420);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pastedText, isEn]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);

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
          // Ignore frame errors while framing
        }
      );
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(
        isEn
          ? 'Unable to access camera. You can paste a 0x address, .base.eth name, or pick a contact.'
          : 'Não foi possível acessar a câmera. Você pode digitar o endereço 0x, nome .base.eth ou escolher um contato.'
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

  const enrichWithSavedContact = (data: ParsedCryptoData): ParsedCryptoData => {
    const matched = contacts.find(
      (c) => c.address.toLowerCase() === data.address.toLowerCase()
    );
    if (matched) {
      return {
        ...data,
        contactName: data.contactName || matched.name,
        ensName: data.ensName || matched.ensName,
      };
    }
    return data;
  };

  const handleDecodedPayload = (raw: string) => {
    const result = validateCryptoInput(raw, 'qr');
    if (result.isValid && result.data) {
      triggerHaptic('success');
      stopCamera();
      onScanSuccess(enrichWithSavedContact(result.data));
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

  const handleManualSubmit = async () => {
    setPasteError(null);
    const raw = pastedText.trim();
    if (!raw) {
      triggerHaptic('warning');
      setPasteError(
        isEn
          ? 'Paste a 0x address, payment link, or type a .base.eth / .eth name.'
          : 'Cole um endereço 0x, link de cobrança ou digite um nome .base.eth / .eth.'
      );
      return;
    }

    // 1. Check if input is a Basename (.base.eth) or ENS (.eth)
    if (EnsResolutionService.isDomainNameInput(raw)) {
      if (resolvedEnsData) {
        triggerHaptic('success');
        onScanSuccess(
          enrichWithSavedContact({
            address: resolvedEnsData.address,
            ensName: resolvedEnsData.name,
            token: 'USDC',
            chainId: 8453,
            rawString: raw,
          })
        );
        return;
      }

      setIsResolvingEns(true);
      const ensRes = await EnsResolutionService.resolveName(raw, isEn);
      setIsResolvingEns(false);

      if (ensRes.isValid && ensRes.address) {
        triggerHaptic('success');
        onScanSuccess(
          enrichWithSavedContact({
            address: ensRes.address,
            ensName: ensRes.normalizedName,
            token: 'USDC',
            chainId: 8453,
            rawString: raw,
          })
        );
      } else {
        triggerHaptic('warning');
        setPasteError(
          ensRes.error ||
            (isEn
              ? 'Could not resolve this .base.eth / .eth name.'
              : 'Não foi possível resolver este nome .base.eth / .eth.')
        );
      }
      return;
    }

    // 2. Standard 0x address, EIP-681 URI, or CofreAdmin Payment Link
    const result = validateCryptoInput(raw, 'address');
    if (result.isValid && result.data) {
      triggerHaptic('success');
      onScanSuccess(enrichWithSavedContact(result.data));
    } else {
      triggerHaptic('warning');
      setPasteError(
        result.error ||
          (isEn
            ? 'Incompatible address. Please enter a valid Base network address or .base.eth name.'
            : 'Endereço não compatível. Digite um endereço 0x da rede Base ou nome .base.eth.')
      );
    }
  };

  const handleSelectContact = (contact: SavedContact) => {
    triggerHaptic('success');
    // Update lastUsedAt timestamp
    const updated = db.upsertContact({
      name: contact.name,
      address: contact.address,
      ensName: contact.ensName,
      emoji: contact.emoji,
      isFavorite: contact.isFavorite,
    });
    setContacts(updated);

    onScanSuccess({
      address: contact.address,
      contactName: contact.name,
      ensName: contact.ensName,
      token: 'USDC',
      chainId: 8453,
      rawString: contact.address,
    });
  };

  const handleSaveNewContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactFormError(null);

    const cleanName = newContactName.trim();
    const rawAddrOrEns = newContactInput.trim();

    if (!cleanName) {
      setContactFormError(isEn ? 'Enter a name for this contact.' : 'Digite um nome ou apelido para o contato.');
      return;
    }
    if (!rawAddrOrEns) {
      setContactFormError(isEn ? 'Enter a 0x address or .base.eth name.' : 'Digite um endereço 0x ou nome .base.eth.');
      return;
    }

    setIsSavingContact(true);
    try {
      let targetAddress = '';
      let targetEns: string | undefined = undefined;

      if (EnsResolutionService.isDomainNameInput(rawAddrOrEns)) {
        const ensRes = await EnsResolutionService.resolveName(rawAddrOrEns, isEn);
        if (!ensRes.isValid || !ensRes.address) {
          setContactFormError(
            ensRes.error || (isEn ? 'Could not resolve .base.eth / .eth name.' : 'Não foi possível encontrar este nome .base.eth / .eth.')
          );
          setIsSavingContact(false);
          return;
        }
        targetAddress = ensRes.address;
        targetEns = ensRes.normalizedName;
      } else {
        const val = validateCryptoInput(rawAddrOrEns, 'address');
        if (!val.isValid || !val.data || !isValidEvmAddress(val.data.address)) {
          setContactFormError(
            val.error || (isEn ? 'Invalid Base 0x address.' : 'Endereço 0x inválido ou incompatível com a rede Base.')
          );
          setIsSavingContact(false);
          return;
        }
        targetAddress = val.data.address;
      }

      const updated = db.upsertContact({
        name: cleanName,
        address: targetAddress,
        ensName: targetEns,
        emoji: newContactEmoji,
        isFavorite: true,
      });

      setContacts(updated);
      setNewContactName('');
      setNewContactInput('');
      setIsAddingContact(false);
      triggerHaptic('success');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteContact = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    const updated = db.deleteContact(id);
    setContacts(updated);
  };

  if (!isOpen) return null;

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      (c.ensName && c.ensName.toLowerCase().includes(q))
    );
  });

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
              <p className="text-[10px] text-neutral-500 font-bold">
                {isEn ? 'QR Code, 0x, .base.eth or Contacts' : 'QR Code, 0x, .base.eth ou Contatos'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center hover:bg-rose-100 btn-press cursor-pointer"
            id="btn-close-crypto-scanner"
            aria-label={isEn ? 'Close' : 'Fechar'}
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* 3-Tab Switcher: Camera | Paste/ENS | Contacts */}
        <div className="grid grid-cols-3 gap-1.5 my-3 p-1 bg-neutral-100 border-2 border-black rounded-2xl">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('camera');
            }}
            className={`py-2 px-2 rounded-xl font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-white border-2 border-black text-black shadow-neo-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
            id="btn-tab-scanner-camera"
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isEn ? 'QR Cam' : 'Câmera'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              stopCamera();
              setActiveTab('paste');
            }}
            className={`py-2 px-2 rounded-xl font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-white border-2 border-black text-black shadow-neo-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
            id="btn-tab-scanner-paste"
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isEn ? '0x / .eth' : '0x / .eth'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              stopCamera();
              setActiveTab('contacts');
            }}
            className={`py-2 px-2 rounded-xl font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-white border-2 border-black text-black shadow-neo-xs'
                : 'text-neutral-500 hover:text-black'
            }`}
            id="btn-tab-scanner-contacts"
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isEn ? 'Contacts' : 'Contatos'}
              {contacts.length > 0 ? ` (${contacts.length})` : ''}
            </span>
          </button>
        </div>

        {/* TAB 1: Camera Scanner */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            <div className="relative overflow-hidden bg-neutral-900 border-2 border-black rounded-2xl aspect-square flex items-center justify-center">
              <div id={scannerContainerId} className="w-full h-full" />

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
                      <span>{isEn ? 'Type 0x / .eth' : 'Digitar 0x / .eth'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-center text-neutral-500 font-medium">
              {isEn ? (
                <>⚠️ Reads Base <strong>USDC</strong> QR Codes & Payment Request Links.</>
              ) : (
                <>⚠️ Lê QR Codes de <strong>USDC na Base</strong> e Links de Cobrança.</>
              )}
            </p>
          </div>
        )}

        {/* TAB 2: Paste 0x / Basename (.base.eth) / Payment Link */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-['Outfit'] font-black text-black">
                  {isEn ? 'Address (0x), Basename (.base.eth) or Link:' : 'Endereço (0x), Nome (.base.eth) ou Link:'}
                </label>
                <span className="text-[10px] font-bold text-sky-900 bg-sky-100 px-2 py-0.5 rounded-md border border-black/15">
                  ENS & Base L2
                </span>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  if (pasteError) setPasteError(null);
                }}
                placeholder={
                  isEn
                    ? '0x... or name.base.eth or payment link...'
                    : '0x..., nome.base.eth, nome.eth ou link de cobrança...'
                }
                rows={3}
                className="w-full p-3 bg-neutral-50 border-2 border-black rounded-2xl font-mono text-xs text-black focus:outline-none focus:bg-white shadow-neo-xs"
              />
            </div>

            {/* Live Basename / ENS Resolution Preview Card */}
            {isResolvingEns && (
              <div className="p-2.5 bg-sky-50 border-2 border-black rounded-xl flex items-center gap-2 text-xs font-bold text-sky-950 animate-pulse">
                <div className="w-3.5 h-3.5 border-2 border-[#0052FF] border-t-transparent rounded-full animate-spin shrink-0" />
                <span>
                  {isEn ? 'Resolving name on Base blockchain...' : 'Resolvendo nome na blockchain Base...'}
                </span>
              </div>
            )}

            {resolvedEnsData && !isResolvingEns && (
              <div className="p-3 bg-[#DCFCE7] border-2 border-black rounded-2xl space-y-1 shadow-neo-xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-['Outfit'] font-black text-emerald-950 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>@{resolvedEnsData.name}</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-white text-emerald-900 border border-black rounded">
                    {resolvedEnsData.isBasename ? 'Basename L2' : 'ENS Verificado'}
                  </span>
                </div>
                <p className="font-mono text-[11px] font-bold text-neutral-800 break-all bg-white/80 p-1.5 rounded-lg border border-black/10">
                  {resolvedEnsData.address}
                </p>
              </div>
            )}

            {/* Quick Saved Contacts Strip */}
            {contacts.length > 0 && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-neutral-500">
                    {isEn ? 'Frequent Contacts' : 'Contatos Salvos'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('contacts')}
                    className="text-[10px] font-bold text-[#0052FF] hover:underline cursor-pointer"
                  >
                    {isEn ? 'View all →' : 'Ver todos →'}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {contacts.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectContact(c)}
                      className="px-2.5 py-1.5 bg-[#F8FAFC] hover:bg-[#B8F256] border-2 border-black rounded-xl flex items-center gap-1.5 shrink-0 shadow-neo-xs btn-press cursor-pointer transition-colors"
                    >
                      <span className="text-xs">{c.emoji || '👤'}</span>
                      <div className="text-left">
                        <p className="font-['Outfit'] font-black text-[11px] text-black leading-none">
                          {c.name}
                        </p>
                        <p className="font-mono text-[9px] text-neutral-500 leading-tight">
                          {c.ensName || Web3Service.truncateAddress(c.address)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pasteError && (
              <div className="p-2.5 bg-rose-50 border-2 border-rose-400 rounded-xl text-xs text-rose-900 font-bold flex items-center gap-2 shadow-neo-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{pasteError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={isResolvingEns}
              className="w-full py-2.5 px-4 bg-[#B8F256] hover:bg-[#A3E635] disabled:bg-neutral-200 border-2 border-black rounded-xl font-['Outfit'] font-black text-sm text-black shadow-neo-xs btn-press flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {isResolvingEns
                  ? isEn
                    ? 'Resolving Name...'
                    : 'Resolvendo Nome...'
                  : isEn
                  ? 'Proceed to Payment'
                  : 'Avançar para Pagamento'}
              </span>
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

        {/* TAB 3: Contact Book (Agenda de Contatos) */}
        {activeTab === 'contacts' && (
          <div className="space-y-3">
            {/* Top Bar: Search & Add Contact Button */}
            {!isAddingContact ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder={isEn ? 'Search contact or 0x...' : 'Buscar contato ou 0x...'}
                      className="w-full pl-8 pr-3 py-2 bg-neutral-50 border-2 border-black rounded-xl text-xs font-bold text-black focus:outline-none focus:bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setIsAddingContact(true);
                      setContactFormError(null);
                    }}
                    className="py-2 px-3 bg-[#B8F256] hover:bg-[#A3E635] border-2 border-black rounded-xl font-['Outfit'] font-black text-xs text-black shadow-neo-xs btn-press flex items-center gap-1 shrink-0 cursor-pointer"
                    id="btn-open-add-contact"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isEn ? 'New' : 'Novo'}</span>
                  </button>
                </div>

                {/* Contact List */}
                {filteredContacts.length === 0 ? (
                  <div className="p-6 bg-neutral-50 border-2 border-dashed border-black/30 rounded-2xl text-center space-y-2">
                    <div className="w-10 h-10 bg-[#FEF9C3] border-2 border-black rounded-xl mx-auto flex items-center justify-center text-lg shadow-neo-xs">
                      📇
                    </div>
                    <p className="font-['Outfit'] font-black text-xs text-black">
                      {contacts.length === 0
                        ? isEn
                          ? 'Your Contact Book is empty'
                          : 'Sua Agenda de Contatos está vazia'
                        : isEn
                        ? 'No matching contacts found'
                        : 'Nenhum contato encontrado'}
                    </p>
                    <p className="text-[11px] text-neutral-500 leading-snug max-w-[240px] mx-auto">
                      {isEn
                        ? 'Save trusted Base 0x addresses or .base.eth names to send USDC in 1 tap without copy-paste errors.'
                        : 'Salve endereços 0x ou nomes .base.eth de confiança para enviar USDC em 1 toque sem medo de errar.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        onClick={() => handleSelectContact(contact)}
                        className="p-2.5 bg-[#F8FAFC] hover:bg-[#F0FDF4] border-2 border-black rounded-2xl flex items-center justify-between gap-2.5 shadow-neo-xs cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-9 h-9 bg-white border-2 border-black rounded-xl flex items-center justify-center text-base shrink-0 shadow-2xs">
                            {contact.emoji || '👤'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-['Outfit'] font-black text-xs text-black truncate">
                                {contact.name}
                              </p>
                              {contact.ensName && (
                                <span className="text-[9px] font-mono font-bold bg-sky-100 text-sky-900 px-1.5 py-0.2 rounded border border-black/15 truncate">
                                  @{contact.ensName}
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[10px] text-neutral-500 truncate">
                              {contact.address}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteContact(contact.id, e)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={isEn ? 'Remove contact' : 'Remover contato'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="px-2.5 py-1 bg-[#B8F256] group-hover:bg-[#A3E635] border border-black rounded-lg font-['Outfit'] font-black text-[10px] text-black flex items-center gap-1">
                            <span>{isEn ? 'Pay' : 'Pagar'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Add New Contact Form */
              <form
                onSubmit={handleSaveNewContact}
                className="p-3.5 bg-[#F8FAFC] border-2 border-black rounded-2xl space-y-3 shadow-neo-xs animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="font-['Outfit'] font-black text-xs text-black flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span>{isEn ? 'Save Trusted Contact' : 'Salvar Contato de Confiança'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingContact(false)}
                    className="text-[11px] font-bold text-neutral-500 hover:text-black cursor-pointer"
                  >
                    {isEn ? 'Cancel' : 'Cancelar'}
                  </button>
                </div>

                {/* Emoji Picker */}
                <div className="flex items-center gap-1.5">
                  {CONTACT_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewContactEmoji(em)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm cursor-pointer transition-transform ${
                        newContactEmoji === em
                          ? 'bg-[#FEF9C3] border-2 border-black scale-105 shadow-2xs'
                          : 'bg-white border-black/20 hover:border-black'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-600 block">
                    {isEn ? 'Name / Nickname' : 'Nome / Apelido'}
                  </label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder={isEn ? 'e.g. Mom, Landlord, John...' : 'Ex: Mãe, Churrasco, João...'}
                    maxLength={35}
                    className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold text-black focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-600 block">
                    {isEn ? 'Base Address (0x...) or .base.eth' : 'Endereço Base (0x...) ou .base.eth'}
                  </label>
                  <input
                    type="text"
                    value={newContactInput}
                    onChange={(e) => setNewContactInput(e.target.value)}
                    placeholder="0x... ou nome.base.eth"
                    className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl font-mono text-xs text-black focus:outline-none"
                  />
                </div>

                {contactFormError && (
                  <div className="p-2 bg-rose-50 border border-rose-400 rounded-xl text-[11px] text-rose-900 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{contactFormError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingContact}
                  className="w-full py-2.5 bg-[#B8F256] hover:bg-[#A3E635] border-2 border-black rounded-xl font-['Outfit'] font-black text-xs text-black shadow-neo-xs btn-press flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSavingContact ? (
                    <span>{isEn ? 'Verifying on Base...' : 'Verificando na Base...'}</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Save Contact' : 'Salvar na Agenda'}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
