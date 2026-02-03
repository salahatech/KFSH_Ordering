import { useQuery } from '@tanstack/react-query';
import { format as formatDate, parseISO } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import api from '../lib/api';
import { useLanguageStore } from '../store/languageStore';

interface LocalizationSettings {
  defaultLanguageCode: string;
  defaultTimezone: string;
  baseCurrencyCode: string;
  enableMultiCurrencyDisplay: boolean;
  enableUserLanguageOverride: boolean;
  enableUserTimezoneOverride: boolean;
  enableUserCurrencyOverride: boolean;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
}

interface UserPreferences {
  preferredCurrencyCode: string;
  preferredLanguageCode: string;
  preferredTimezone: string;
}

interface ExchangeRate {
  fromCurrency: string;
  rate: number;
  date: string;
}

export function useLocalization() {
  const { language, direction } = useLanguageStore();

  const { data: settings } = useQuery<LocalizationSettings>({
    queryKey: ['localization-settings'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/localization/settings');
        return data;
      } catch {
        return {
          defaultLanguageCode: 'en',
          defaultTimezone: 'Asia/Riyadh',
          baseCurrencyCode: 'SAR',
          enableMultiCurrencyDisplay: true,
          enableUserLanguageOverride: true,
          enableUserTimezoneOverride: true,
          enableUserCurrencyOverride: true,
          dateFormat: 'yyyy-MM-dd',
          timeFormat: 'HH:mm',
          numberFormat: 'en-US',
        };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: userPrefs } = useQuery<UserPreferences>({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/localization/user-preferences');
        return data;
      } catch {
        return {
          preferredCurrencyCode: 'SAR',
          preferredLanguageCode: 'en',
          preferredTimezone: 'Asia/Riyadh',
        };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: exchangeRates = [] } = useQuery<ExchangeRate[]>({
    queryKey: ['exchange-rates-latest'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/localization/exchange-rates/latest');
        return data;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const timezone = settings?.enableUserTimezoneOverride
    ? (userPrefs?.preferredTimezone || settings?.defaultTimezone || 'Asia/Riyadh')
    : (settings?.defaultTimezone || 'Asia/Riyadh');

  const displayCurrency = settings?.enableUserCurrencyOverride
    ? (userPrefs?.preferredCurrencyCode || 'SAR')
    : 'SAR';

  const dateFormatStr = settings?.dateFormat || 'yyyy-MM-dd';
  const timeFormatStr = settings?.timeFormat || 'HH:mm';
  const numberLocale = settings?.numberFormat || 'en-US';

  const formatMoney = (
    amountSar: number | string | null | undefined,
    currency?: string,
    options?: { showCurrency?: boolean; decimals?: number }
  ): string => {
    if (amountSar === null || amountSar === undefined) return '-';
    
    const amount = typeof amountSar === 'string' ? parseFloat(amountSar) : amountSar;
    if (isNaN(amount)) return '-';

    const targetCurrency = currency || displayCurrency;
    const decimals = options?.decimals ?? 2;
    const showCurrency = options?.showCurrency ?? true;

    let displayAmount = amount;

    if (targetCurrency !== 'SAR' && settings?.enableMultiCurrencyDisplay) {
      const rate = exchangeRates.find(r => r.fromCurrency === targetCurrency);
      if (rate && rate.rate > 0) {
        displayAmount = amount / rate.rate;
      }
    }

    const formatted = new Intl.NumberFormat(numberLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(displayAmount);

    return showCurrency ? `${targetCurrency} ${formatted}` : formatted;
  };

  const formatDateTime = (
    dateInput: Date | string | null | undefined,
    options?: { includeTime?: boolean; format?: string }
  ): string => {
    if (!dateInput) return '-';

    try {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      const zonedDate = toZonedTime(date, timezone);

      if (options?.format) {
        return formatTz(zonedDate, options.format, { timeZone: timezone });
      }

      const dateStr = formatDate(zonedDate, dateFormatStr);
      
      if (options?.includeTime !== false) {
        const timeStr = formatDate(zonedDate, timeFormatStr);
        return `${dateStr} ${timeStr}`;
      }

      return dateStr;
    } catch {
      return String(dateInput);
    }
  };

  const formatDateOnly = (dateInput: Date | string | null | undefined): string => {
    return formatDateTime(dateInput, { includeTime: false });
  };

  const formatTimeOnly = (dateInput: Date | string | null | undefined): string => {
    if (!dateInput) return '-';

    try {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      const zonedDate = toZonedTime(date, timezone);
      return formatDate(zonedDate, timeFormatStr);
    } catch {
      return String(dateInput);
    }
  };

  const formatNumber = (
    value: number | string | null | undefined,
    options?: { decimals?: number; useGrouping?: boolean }
  ): string => {
    if (value === null || value === undefined) return '-';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    return new Intl.NumberFormat(numberLocale, {
      minimumFractionDigits: options?.decimals ?? 0,
      maximumFractionDigits: options?.decimals ?? 2,
      useGrouping: options?.useGrouping ?? true,
    }).format(num);
  };

  const formatPercent = (value: number | string | null | undefined, decimals: number = 1): string => {
    if (value === null || value === undefined) return '-';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    return new Intl.NumberFormat(numberLocale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num / 100);
  };

  const getExchangeRate = (currency: string): number | null => {
    if (currency === 'SAR') return 1;
    const rate = exchangeRates.find(r => r.fromCurrency === currency);
    return rate?.rate || null;
  };

  const convertToSar = (amount: number, fromCurrency: string): number | null => {
    if (fromCurrency === 'SAR') return amount;
    const rate = getExchangeRate(fromCurrency);
    return rate ? amount * rate : null;
  };

  const convertFromSar = (amountSar: number, toCurrency: string): number | null => {
    if (toCurrency === 'SAR') return amountSar;
    const rate = getExchangeRate(toCurrency);
    return rate && rate > 0 ? amountSar / rate : null;
  };

  return {
    language,
    direction,
    timezone,
    displayCurrency,
    baseCurrency: 'SAR',
    dateFormat: dateFormatStr,
    timeFormat: timeFormatStr,
    numberLocale,
    settings,
    userPrefs,
    exchangeRates,
    formatMoney,
    formatDateTime,
    formatDateOnly,
    formatTimeOnly,
    formatNumber,
    formatPercent,
    getExchangeRate,
    convertToSar,
    convertFromSar,
  };
}

export default useLocalization;
