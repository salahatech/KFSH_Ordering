import { useLocalization } from '../../hooks/useLocalization';

interface FormattedDateProps {
  value: Date | string | null | undefined;
  includeTime?: boolean;
  timeOnly?: boolean;
  format?: string;
}

export function FormattedDate({ value, includeTime = true, timeOnly = false, format }: FormattedDateProps) {
  const { formatDateTime, formatDateOnly, formatTimeOnly } = useLocalization();

  if (!value) return <>-</>;

  if (timeOnly) {
    return <>{formatTimeOnly(value)}</>;
  }

  if (format) {
    return <>{formatDateTime(value, { format })}</>;
  }

  if (includeTime) {
    return <>{formatDateTime(value)}</>;
  }

  return <>{formatDateOnly(value)}</>;
}

interface FormattedMoneyProps {
  value: number | string | null | undefined;
  currency?: string;
  showCurrency?: boolean;
  decimals?: number;
}

export function FormattedMoney({ value, currency, showCurrency = true, decimals = 2 }: FormattedMoneyProps) {
  const { formatMoney } = useLocalization();

  if (value === null || value === undefined) return <>-</>;

  return <>{formatMoney(value, currency, { showCurrency, decimals })}</>;
}

interface FormattedNumberProps {
  value: number | string | null | undefined;
  decimals?: number;
  useGrouping?: boolean;
}

export function FormattedNumber({ value, decimals = 2, useGrouping = true }: FormattedNumberProps) {
  const { formatNumber } = useLocalization();

  if (value === null || value === undefined) return <>-</>;

  return <>{formatNumber(value, { decimals, useGrouping })}</>;
}

interface FormattedPercentProps {
  value: number | string | null | undefined;
  decimals?: number;
}

export function FormattedPercent({ value, decimals = 1 }: FormattedPercentProps) {
  const { formatPercent } = useLocalization();

  if (value === null || value === undefined) return <>-</>;

  return <>{formatPercent(value, decimals)}</>;
}

export default FormattedDate;
