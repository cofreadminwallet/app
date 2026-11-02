/**
 * Supported display/secondary currencies for real-time USDC quotation.
 * Static locked ranking strictly based on global currency usage/foreign exchange volume (BIS Triennial Survey, largest to smallest):
 * 1. USD - US Dollar (~88%)
 * 2. EUR - Euro (~31%)
 * 3. JPY - Japanese Yen (~17%)
 * 4. GBP - British Pound (~13%)
 * 5. CNY - Chinese Yuan (~7%)
 * 6. AUD - Australian Dollar (~6.4%)
 * 7. CAD - Canadian Dollar (~5.4%)
 * 8. CHF - Swiss Franc (~5.2%)
 * 9. MXN - Mexican Peso (~1.5%)
 * 10. BRL - Brazilian Real (~0.9%)
 * 11. ARS - Argentine Peso (~0.1%)
 */

export interface CurrencyConfig {
  code: string;
  name: string;
  nameEn: string;
  symbol: string;
  flag: string;
  fallbackRate: number; // 1 USD in this currency
  locale: string;
}

export const TOP_CURRENCIES: readonly CurrencyConfig[] = Object.freeze([
  { code: 'USD', name: 'Dólar Americano', nameEn: 'US Dollar', symbol: '$', flag: '🇺🇸', fallbackRate: 1.00, locale: 'en-US' },
  { code: 'EUR', name: 'Euro', nameEn: 'Euro', symbol: '€', flag: '🇪🇺', fallbackRate: 0.92, locale: 'de-DE' },
  { code: 'JPY', name: 'Iene Japonês', nameEn: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', fallbackRate: 154.5, locale: 'ja-JP' },
  { code: 'GBP', name: 'Libra Esterlina', nameEn: 'British Pound', symbol: '£', flag: '🇬🇧', fallbackRate: 0.79, locale: 'en-GB' },
  { code: 'CNY', name: 'Yuan Chinês', nameEn: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', fallbackRate: 7.23, locale: 'zh-CN' },
  { code: 'AUD', name: 'Dólar Australiano', nameEn: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', fallbackRate: 1.52, locale: 'en-AU' },
  { code: 'CAD', name: 'Dólar Canadense', nameEn: 'Canadian Dollar', symbol: 'CA$', flag: '🇨🇦', fallbackRate: 1.36, locale: 'en-CA' },
  { code: 'CHF', name: 'Franco Suíço', nameEn: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', fallbackRate: 0.90, locale: 'de-CH' },
  { code: 'MXN', name: 'Peso Mexicano', nameEn: 'Mexican Peso', symbol: 'Mex$', flag: '🇲🇽', fallbackRate: 18.2, locale: 'es-MX' },
  { code: 'BRL', name: 'Real Brasileiro', nameEn: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', fallbackRate: 5.11, locale: 'pt-BR' },
  { code: 'ARS', name: 'Peso Argentino', nameEn: 'Argentine Peso', symbol: 'ARS$', flag: '🇦🇷', fallbackRate: 980.0, locale: 'es-AR' },
]);

export function getTopCurrencies(lang?: string): CurrencyConfig[] {
  const isEn = lang === 'en-US';
  return TOP_CURRENCIES.map((c) => ({
    ...c,
    name: isEn ? c.nameEn : c.name,
  }));
}

export function getCurrencyConfig(code: string, lang?: string): CurrencyConfig {
  const normalized = (code || 'USD').toUpperCase();
  const base = normalized === 'USDC'
    ? TOP_CURRENCIES[0] // USD
    : TOP_CURRENCIES.find((c) => c.code === normalized) || TOP_CURRENCIES[0];

  const isEn = lang === 'en-US';
  return {
    ...base,
    name: isEn ? base.nameEn : base.name,
  };
}
