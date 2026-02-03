const DEFAULT_CURRENCY = 'SAR';
const DEFAULT_LOCALE = 'en-SA';

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  if (amount === null || amount === undefined) return `${currency} 0.00`;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatAmount(
  amount: number | null | undefined,
  decimals: number = 2
): string {
  if (amount === null || amount === undefined) return '0.00';
  
  return new Intl.NumberFormat('en-SA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('en-SA').format(value);
}

export function formatActivity(activity: number | null | undefined, unit: string = 'mCi'): string {
  if (activity === null || activity === undefined) return `0 ${unit}`;
  return `${formatAmount(activity)} ${unit}`;
}
