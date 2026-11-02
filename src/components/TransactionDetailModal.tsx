import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Trash2,
  Tag,
  FileText,
  Calendar,
  Layers,
  StickyNote,
  AlertTriangle,
  Vault as VaultIcon,
} from 'lucide-react';
import { Transaction, Category, Vault } from '../types';
import { formatCurrency, formatRelativeDate } from '../utils/storage';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { useI18n } from '../services/i18nService';
import { triggerHaptic } from '../utils/haptics';
import { openSupportEmail } from '../utils/supportEmail';

interface TransactionDetailModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  categories: Category[];
  vaults?: Vault[];
  currency: string;
  userEmail?: string;
  onClose: () => void;
  onUpdate: (updatedTx: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  transaction,
  categories,
  vaults = [],
  currency,
  userEmail,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en-US';
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { rate: liveRate, convertFromUsdc, getRateFor } = useExchangeRate();
  const activeCurrency = (currency || 'BRL').toUpperCase();

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description || '');
      setSelectedCategoryId(transaction.categoryId || '');
      setNotes(transaction.notes || '');
      setShowDeleteConfirm(false);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const currentCategory = categories.find((c) => c.id === selectedCategoryId) || categories.find((c) => c.id === transaction.categoryId);
  const isIncome = transaction.type === 'income';
  const availableCategories = categories.filter(
    (c) => c.type === 'both' || c.type === transaction.type
  );

  const linkedVault = transaction.vaultId ? vaults.find((v) => v.id === transaction.vaultId) : undefined;
  const isVaultTransaction = Boolean(transaction.vaultId || transaction.categoryId === 'vault_deposit');

  const handleSave = () => {
    triggerHaptic('success');
    const updated: Transaction = {
      ...transaction,
      description: description.trim() || currentCategory?.name || (isEn ? 'Transaction' : 'Transação'),
      categoryId: selectedCategoryId || transaction.categoryId,
      notes: notes.trim() || undefined,
      isOrganized: true,
    };
    onUpdate(updated);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      id="modal-transaction-detail"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          triggerHaptic('light');
          onClose();
        }}
      />

      <div className="relative w-full max-w-md bg-white border-2 border-black rounded-3xl shadow-neo p-4 sm:p-5 flex flex-col max-h-[92vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black/10">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 border-2 border-black rounded-xl flex items-center justify-center text-xl shadow-neo-xs font-black"
              style={{ backgroundColor: currentCategory?.bgColor || '#EDE9FE' }}
            >
              {currentCategory?.emoji || (isIncome ? '💰' : '💸')}
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-base sm:text-lg text-black leading-tight">
                {isEn ? 'Edit' : 'Editar'}
              </h3>
              <p className="text-[11px] text-neutral-500 font-bold">
                {isEn ? 'Category and notes' : 'Categoria e notas'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center hover:bg-neutral-100 btn-press cursor-pointer"
            id="btn-close-tx-detail"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 pt-3.5">
          {/* Main Amount & Status Card */}
          <div
            className={`p-3.5 border-2 border-black rounded-2xl space-y-1 shadow-neo-xs text-center ${
              isIncome ? 'bg-[#DCFCE7]' : 'bg-[#FEF9C3]'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-700 block">
              {isIncome 
                ? (isEn ? 'Income' : 'Entrada')
                : (isEn ? 'Expense' : 'Gasto')}
            </span>
            <h4
              className={`font-['Outfit'] font-black text-2xl sm:text-3xl ${
                isIncome ? 'text-emerald-950' : 'text-amber-950'
              }`}
            >
              {isIncome ? '+' : '-'}{formatCurrency(convertFromUsdc(transaction.amount, activeCurrency), activeCurrency)}
            </h4>
            {activeCurrency !== 'USDC' ? (
              <p className="text-xs font-bold text-neutral-700 flex items-center justify-center gap-1.5 pt-0.5">
                <span>
                  ≈ $ {transaction.amount.toFixed(2)} USDC
                </span>
                <span className="text-[10px] font-normal text-neutral-600 bg-black/5 px-1.5 py-0.2 rounded-md">
                  ({isEn ? 'Quote:' : 'Cotação:'} 1 USDC ≈ {getRateFor(activeCurrency).toFixed(2)})
                </span>
              </p>
            ) : (
              <p className="text-xs font-bold text-neutral-700 flex items-center justify-center gap-1.5 pt-0.5">
                <span>
                  ≈ {formatCurrency(convertFromUsdc(transaction.amount, 'BRL'), 'BRL')}
                </span>
              </p>
            )}
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-neutral-600 pt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatRelativeDate(transaction.date, language)}
              </span>
              {transaction.isOnChain && (
                <span className="bg-[#0052FF]/10 text-[#0052FF] px-2 py-0.5 rounded-full border border-[#0052FF]/30 font-black text-[10px]">
                  🔵 {transaction.tokenSymbol || 'USDC'}
                </span>
              )}
            </div>
          </div>

          {/* EDIT FORM: Name & Category */}
          <div className="p-3.5 bg-neutral-50 border-2 border-black rounded-2xl space-y-3 shadow-neo-xs">
            <div className="flex items-center justify-between">
              <span className="font-['Outfit'] font-black text-xs text-black uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-700" />
                <span>{isEn ? 'Organize & Label Expense' : 'Organizar & Identificar Gasto'}</span>
              </span>
              <span className="text-[10px] font-bold text-neutral-400">{isEn ? 'Editable' : 'Editável'}</span>
            </div>

            {/* Expense Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-['Outfit'] font-bold text-neutral-700 flex items-center gap-1">
                <FileText className="w-3 h-3 text-blue-600" />
                <span>{isEn ? 'Name / Description' : 'Nome / Descrição do Gasto'}</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isEn ? "e.g., Rideshare, Sunday lunch, Groceries..." : "Ex: Uber pro shopping, Almoço de domingo, Mercado..."}
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl font-['Outfit'] font-bold text-xs text-black focus:outline-none shadow-neo-xs placeholder:text-neutral-400"
                id="input-edit-tx-desc"
              />
            </div>

            {/* Category Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-['Outfit'] font-bold text-neutral-700 flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-600" />
                <span>{isEn ? 'Category' : 'Categoria'}</span>
              </label>

              <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white border-2 border-black rounded-xl">
                {availableCategories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedCategoryId(cat.id);
                      }}
                      className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-black shadow-neo-xs font-bold scale-[1.02]'
                          : 'border-black/20 hover:border-black bg-white opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: isSelected ? cat.bgColor : '#FFFFFF' }}
                      id={`edit-cat-select-${cat.id}`}
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

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-['Outfit'] font-bold text-neutral-700 flex items-center gap-1">
                <StickyNote className="w-3 h-3 text-amber-600" />
                <span>{isEn ? 'Additional notes (optional)' : 'Anotações adicionais (opcional)'}</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isEn ? "Additional details, receipt notes, observations..." : "Detalhes adicionais, comprovante ou observações..."}
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl font-['Outfit'] font-medium text-xs text-black focus:outline-none shadow-neo-xs placeholder:text-neutral-400 resize-none"
                id="input-edit-tx-notes"
              />
            </div>
          </div>

          {/* Linked Vault card (if transaction is associated with a vault) */}
          {isVaultTransaction && (
            <div className="p-3.5 bg-[#EDE9FE] border-2 border-black rounded-2xl space-y-2 text-xs shadow-neo-xs">
              <div className="flex items-center justify-between">
                <span className="font-['Outfit'] font-black text-purple-950 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                  <VaultIcon className="w-3.5 h-3.5 text-purple-700 stroke-[2.5]" />
                  <span>{isEn ? 'Vault Activity' : 'Movimentação do Cofre'}</span>
                </span>
                <span className="bg-white/80 text-purple-900 px-2 py-0.5 rounded-full border border-purple-300 font-bold text-[10px]">
                  {isIncome 
                    ? (isEn ? '🔓 Withdrawal / Return' : '🔓 Resgate / Retorno')
                    : (isEn ? '🔒 Lock / Deposited' : '🔒 Aporte / Guardado')}
                </span>
              </div>

              <div className="bg-white border border-purple-300/80 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-600">{isEn ? 'Vault:' : 'Cofre:'}</span>
                  <div className="flex items-center gap-1 font-['Outfit'] font-black text-neutral-900">
                    <span>{linkedVault?.emoji || '🔒'}</span>
                    <span>{linkedVault?.title || transaction.description || (isEn ? 'Vault & Goal' : 'Cofre & Meta')}</span>
                  </div>
                </div>

                {linkedVault && (
                  <>
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600">
                      <span>{isEn ? 'Vault Balance:' : 'Saldo no Cofre:'}</span>
                      <span className="font-mono text-purple-900 font-black">
                        {formatCurrency(convertFromUsdc(linkedVault.currentAmount, activeCurrency), activeCurrency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600">
                      <span>{isEn ? 'Goal Target:' : 'Meta do Objetivo:'}</span>
                      <span className="font-mono text-neutral-700">
                        {formatCurrency(convertFromUsdc(linkedVault.targetAmount, activeCurrency), activeCurrency)}
                      </span>
                    </div>

                    {/* Mini progress bar */}
                    <div className="w-full bg-purple-100 rounded-full h-1.5 overflow-hidden border border-purple-200 mt-1">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((linkedVault.currentAmount / (linkedVault.targetAmount || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Delete Confirmation View or Action Buttons */}
          {showDeleteConfirm ? (
            <div className="p-3 bg-[#FFE4E6] border-2 border-rose-500 rounded-2xl space-y-2 text-center">
              <p className="text-xs font-bold text-rose-950">
                {isEn ? 'Are you sure you want to delete this transaction from the ledger?' : 'Tem certeza que deseja excluir esta transação do extrato?'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold btn-press"
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('warning');
                    onDelete(transaction.id);
                    onClose();
                  }}
                  className="flex-1 py-2 bg-rose-600 text-white border-2 border-black rounded-xl text-xs font-bold shadow-neo-xs btn-press"
                >
                  {isEn ? 'Confirm Deletion' : 'Confirmar Exclusão'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowDeleteConfirm(true);
                }}
                className="py-2.5 px-3 bg-white hover:bg-rose-50 border-2 border-black rounded-xl text-xs font-['Outfit'] font-bold text-rose-600 shadow-neo-xs btn-press flex items-center justify-center gap-1.5 cursor-pointer"
                title={isEn ? "Delete" : "Excluir"}
                id="btn-tx-detail-delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-2.5 px-4 bg-[#B8F256] hover:bg-[#A3E635] border-2 border-black rounded-xl text-xs font-['Outfit'] font-black text-black shadow-neo-sm btn-press flex items-center justify-center gap-1.5 cursor-pointer"
                id="btn-tx-detail-save"
              >
                <Check className="w-4 h-4" />
                <span>{isEn ? 'Save Changes' : 'Salvar Alterações'}</span>
              </button>
            </div>
          )}

          {/* Contextual Issue Reporting for Gen Alpha */}
          <div className="pt-2 border-t border-black/10 flex justify-center">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                openSupportEmail({
                  userEmail,
                  transaction,
                  actionContext: `${isEn ? 'Transaction' : 'Lançamento'} #${transaction.id.slice(0, 8)}`,
                  language,
                });
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 hover:text-rose-600 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-neutral-100"
              id="btn-report-tx-issue"
              title={isEn ? "Support" : "Suporte"}
            >
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>{isEn ? 'Report an issue with this entry' : 'Relatar problema neste lançamento'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
