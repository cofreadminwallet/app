import { TOP_CURRENCIES, getCurrencyConfig } from '../utils/currencies';

/**
 * Universal Multi-Currency Exchange Rate Service
 * Fetches real market rates for top currencies relative to USD/USDC
 * Direct public feeds from Open Exchange Rates and Coinbase with zero API keys required.
 */

export interface MultiCurrencyRates {
  base: string; // 'USD'
  rates: Record<string, number>;
  timestamp: number;
  source: string;
}

const STORAGE_RATES_KEY = 'cofre_multi_currency_rates_v1';

// Initial fallback rates
const DEFAULT_RATES: Record<string, number> = TOP_CURRENCIES.reduce((acc, curr) => {
  acc[curr.code] = curr.fallbackRate;
  return acc;
}, {} as Record<string, number>);

function getInitialRates(): MultiCurrencyRates {
  if (typeof window === 'undefined') {
    return {
      base: 'USD',
      rates: DEFAULT_RATES,
      timestamp: Date.now(),
      source: 'Default Base Rates',
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_RATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.rates && typeof parsed.rates.BRL === 'number') {
        return parsed;
      }
    }
  } catch {}

  return {
    base: 'USD',
    rates: DEFAULT_RATES,
    timestamp: Date.now(),
    source: 'Default Base Rates',
  };
}

let cachedRates: MultiCurrencyRates = getInitialRates();
const rateListeners = new Set<(rates: MultiCurrencyRates) => void>();
let isFetchingRates = false;
let autoRefreshTimer: any = null;

export class ExchangeRateService {
  /**
   * Get the active rate of 1 USDC/USD into target currency
   */
  public static getRate(targetCurrency: string = 'BRL'): number {
    const code = (targetCurrency || 'USD').toUpperCase();
    if (code === 'USD' || code === 'USDC') return 1.0;
    return cachedRates.rates[code] || getCurrencyConfig(code).fallbackRate;
  }

  /**
   * Get all cached rates
   */
  public static getAllRates(): MultiCurrencyRates {
    return { ...cachedRates };
  }

  /**
   * Convert an amount in USDC to the target secondary currency
   */
  public static convertFromUsdc(amountUsdc: number, targetCurrency: string = 'BRL'): number {
    if (typeof amountUsdc !== 'number' || isNaN(amountUsdc)) return 0;
    const rate = this.getRate(targetCurrency);
    return parseFloat((amountUsdc * rate).toFixed(2));
  }

  /**
   * Convert an amount from a secondary currency back to USDC
   */
  public static convertToUsdc(amountSecondary: number, targetCurrency: string = 'BRL'): number {
    if (typeof amountSecondary !== 'number' || isNaN(amountSecondary)) return 0;
    const rate = this.getRate(targetCurrency);
    if (rate <= 0) return 0;
    return parseFloat((amountSecondary / rate).toFixed(4));
  }

  /**
   * Backward compatibility helpers for BRL
   */
  public static usdcToBrl(amountUsdc: number, customRate?: number): number {
    const rate = customRate || this.getRate('BRL');
    return parseFloat((amountUsdc * rate).toFixed(2));
  }

  public static brlToUsdc(amountBrl: number, customRate?: number): number {
    const rate = customRate || this.getRate('BRL');
    if (rate <= 0) return 0;
    return parseFloat((amountBrl / rate).toFixed(4));
  }

  public static formatBrl(amount: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount || 0);
  }

  public static formatUsdc(amount: number): string {
    return `$ ${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
  }

  public static getRateData() {
    return {
      rate: this.getRate('BRL'),
      usdcRate: this.getRate('BRL'),
      usdRate: this.getRate('BRL'),
      timestamp: cachedRates.timestamp,
      source: cachedRates.source,
      isLive: Date.now() - cachedRates.timestamp < 1800000,
    };
  }

  /**
   * Subscribe to rate changes
   */
  public static subscribe(listener: (rates: MultiCurrencyRates) => void): () => void {
    rateListeners.add(listener);
    listener(cachedRates);
    return () => {
      rateListeners.delete(listener);
    };
  }

  private static notify(data: MultiCurrencyRates): void {
    cachedRates = data;
    try {
      localStorage.setItem(STORAGE_RATES_KEY, JSON.stringify(data));
    } catch {}
    rateListeners.forEach((fn) => {
      try {
        fn(data);
      } catch {}
    });
  }

  /**
   * Fetches real market rates for all currencies
   */
  public static async fetchRate(force = false): Promise<MultiCurrencyRates> {
    if (isFetchingRates && !force) {
      return cachedRates;
    }

    isFetchingRates = true;
    try {
      // 1. Open Exchange Rates API (free public USD base rates for all currencies)
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', {
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const json = await res.json();
          if (json && json.rates && typeof json.rates.BRL === 'number') {
            const newRates: Record<string, number> = { ...DEFAULT_RATES };
            
            TOP_CURRENCIES.forEach((curr) => {
              if (json.rates[curr.code] && typeof json.rates[curr.code] === 'number') {
                newRates[curr.code] = parseFloat(json.rates[curr.code].toFixed(4));
              }
            });

            newRates['USD'] = 1.0;
            newRates['USDC'] = 1.0;

            const updated: MultiCurrencyRates = {
              base: 'USD',
              rates: newRates,
              timestamp: Date.now(),
              source: 'Open Exchange Rates (Global Multi-Currency)',
            };

            this.notify(updated);
            return updated;
          }
        }
      } catch (err) {
        console.warn('[ExchangeRate] Primary provider (Open Exchange Rates) failed, trying Coinbase fallback:', err);
      }

      // 2. Coinbase Public Rates Fallback (https://api.coinbase.com/v2/exchange-rates?currency=USD)
      try {
        const cbRes = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD', {
          signal: AbortSignal.timeout(5000),
        });

        if (cbRes.ok) {
          const cbJson = await cbRes.json();
          if (cbJson && cbJson.data && cbJson.data.rates && cbJson.data.rates.BRL) {
            const newRates: Record<string, number> = { ...DEFAULT_RATES };

            TOP_CURRENCIES.forEach((curr) => {
              const rawVal = parseFloat(cbJson.data.rates[curr.code]);
              if (!isNaN(rawVal) && rawVal > 0) {
                newRates[curr.code] = parseFloat(rawVal.toFixed(4));
              }
            });

            newRates['USD'] = 1.0;
            newRates['USDC'] = 1.0;

            const updated: MultiCurrencyRates = {
              base: 'USD',
              rates: newRates,
              timestamp: Date.now(),
              source: 'Coinbase Public API (USD/USDC Market Feed)',
            };

            this.notify(updated);
            return updated;
          }
        }
      } catch (cbErr) {
        console.warn('[ExchangeRate] Secondary provider (Coinbase) failed:', cbErr);
      }
    } catch (e) {
      console.warn('[ExchangeRate] Global rate fetch fallback:', e);
    } finally {
      isFetchingRates = false;
    }

    return cachedRates;
  }

  public static initAutoRefresh(): void {
    if (typeof window === 'undefined') return;

    this.fetchRate();

    if (!autoRefreshTimer) {
      autoRefreshTimer = setInterval(() => {
        this.fetchRate();
      }, 180000);

      window.addEventListener('focus', () => {
        if (Date.now() - cachedRates.timestamp > 120000) {
          this.fetchRate();
        }
      });
    }
  }
}

if (typeof window !== 'undefined') {
  ExchangeRateService.initAutoRefresh();
}
