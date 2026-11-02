import { Transaction } from '../types';

export const isTransactionOrganized = (tx: Transaction): boolean => {
  if (tx.isOrganized === true) return true;
  if (tx.notes && tx.notes.trim().length > 0 && !tx.notes.startsWith('Liquidado na Base L2')) return true;

  const desc = (tx.description || '').trim();
  if (!desc) return false;

  const isGenericAddressOrTx =
    desc.startsWith('0x') ||
    desc.startsWith('Pagamento USDC: 0x') ||
    desc.startsWith('Transação Base: 0x') ||
    desc.startsWith('Transação 0x') ||
    desc.startsWith('Recebimento 0x') ||
    desc === 'Transação' ||
    desc === 'Transferência Base (USDC)' ||
    desc === 'Pagamento Base (USDC)';

  return !isGenericAddressOrTx;
};
