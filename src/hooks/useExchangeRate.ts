import { useState, useEffect, useCallback } from 'react';
import { ExchangeRateService, MultiCurrencyRates } from '../services/exchangeRateService';

export function useExchangeRate() {
  const [ratesData, setRatesData] = useState<MultiCurrencyRates>(() =>
    ExchangeRateService.getAllRates()
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = ExchangeRateService.subscribe((data) => {
      setRatesData(data);
    });
    ExchangeRateService.fetchRate();
    return () => {
      unsubscribe();
    };
  }, []);

  const refreshRate = useCallback(async () => {
    setIsLoading(true);
    try {
      const updated = await ExchangeRateService.fetchRate(true);
      setRatesData(updated);
      return updated;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRateFor = useCallback(
    (currencyCode: string) => ExchangeRateService.getRate(currencyCode),
    [ratesData]
  );

  const convertFromUsdc = useCallback(
    (amountUsdc: number, currencyCode: string) =>
      ExchangeRateService.convertFromUsdc(amountUsdc, currencyCode),
    [ratesData]
  );

  const convertToUsdc = useCallback(
    (amount: number, currencyCode: string) =>
      ExchangeRateService.convertToUsdc(amount, currencyCode),
    [ratesData]
  );

  // Backward-compatible BRL helpers
  const usdcToBrl = useCallback(
    (amountUsdc: number) => ExchangeRateService.usdcToBrl(amountUsdc),
    [ratesData]
  );

  const brlToUsdc = useCallback(
    (amountBrl: number) => ExchangeRateService.brlToUsdc(amountBrl),
    [ratesData]
  );

  const formatBrl = useCallback((amount: number) => ExchangeRateService.formatBrl(amount), []);
  const formatUsdc = useCallback((amount: number) => ExchangeRateService.formatUsdc(amount), []);

  const getTimeAgo = useCallback(() => {
    if (!ratesData.timestamp) return 'Hoje';
    const diffSec = Math.floor((Date.now() - ratesData.timestamp) / 1000);
    if (diffSec < 45) return 'agora';
    if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)} min`;
    return 'hoje';
  }, [ratesData.timestamp]);

  return {
    rate: ratesData.rates['BRL'] || 5.11,
    rates: ratesData.rates,
    ratesData,
    isLoading,
    refreshRate,
    getRateFor,
    convertFromUsdc,
    convertToUsdc,
    usdcToBrl,
    brlToUsdc,
    formatBrl,
    formatUsdc,
    timeAgo: getTimeAgo(),
  };
}
