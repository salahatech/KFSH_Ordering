import { formatCurrency, formatAmount } from '../lib/format';

interface MoneyProps {
  value: number | null | undefined;
  showCode?: boolean;
  showSymbol?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showSecondaryConversion?: boolean;
  secondaryCurrencyCode?: string;
  fxRate?: number;
  className?: string;
  style?: React.CSSProperties;
}

const SYSTEM_CURRENCY = 'SAR';
const SYSTEM_CURRENCY_SYMBOL = '﷼';

export default function Money({
  value,
  showCode = true,
  showSymbol = false,
  size = 'md',
  color,
  showSecondaryConversion = false,
  secondaryCurrencyCode,
  fxRate,
  className,
  style,
}: MoneyProps) {
  const amount = value ?? 0;
  
  const fontSizes = {
    sm: '0.8rem',
    md: '0.9rem',
    lg: '1.1rem',
  };

  const formatPrimary = (): string => {
    if (showSymbol) {
      return `${SYSTEM_CURRENCY_SYMBOL} ${formatAmount(amount)}`;
    }
    if (showCode) {
      return `${SYSTEM_CURRENCY} ${formatAmount(amount)}`;
    }
    return formatAmount(amount);
  };

  const formatSecondary = (): string | null => {
    if (!showSecondaryConversion || !secondaryCurrencyCode || !fxRate) {
      return null;
    }
    const convertedAmount = amount / fxRate;
    return `${secondaryCurrencyCode} ${formatAmount(convertedAmount)}`;
  };

  const secondaryText = formatSecondary();

  return (
    <span 
      className={className} 
      style={{ 
        fontSize: fontSizes[size], 
        color: color || 'inherit',
        fontFamily: 'var(--font-mono, monospace)',
        fontWeight: 500,
        ...style 
      }}
    >
      {formatPrimary()}
      {secondaryText && (
        <span style={{ 
          fontSize: '0.75em', 
          color: 'var(--text-secondary)', 
          marginLeft: '0.5rem',
          fontWeight: 400
        }}>
          ({secondaryText})
        </span>
      )}
    </span>
  );
}

export function MoneyRange({
  min,
  max,
  showCode = true,
}: {
  min: number | null | undefined;
  max: number | null | undefined;
  showCode?: boolean;
}) {
  const prefix = showCode ? `${SYSTEM_CURRENCY} ` : '';
  return (
    <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>
      {prefix}{formatAmount(min ?? 0)} - {prefix}{formatAmount(max ?? 0)}
    </span>
  );
}

export function formatMoney(value: number | null | undefined, showCode: boolean = true): string {
  const amount = value ?? 0;
  if (showCode) {
    return `${SYSTEM_CURRENCY} ${formatAmount(amount)}`;
  }
  return formatAmount(amount);
}

export function formatMoneyCompact(value: number | null | undefined): string {
  const amount = value ?? 0;
  if (amount >= 1000000) {
    return `${SYSTEM_CURRENCY} ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${SYSTEM_CURRENCY} ${(amount / 1000).toFixed(1)}K`;
  }
  return `${SYSTEM_CURRENCY} ${formatAmount(amount)}`;
}

export const SYSTEM_BASE_CURRENCY = SYSTEM_CURRENCY;
