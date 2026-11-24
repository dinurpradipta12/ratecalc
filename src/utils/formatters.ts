/**
 * Format raw number to Indonesian Rupiah representation: Rp 12.500.000
 */
export function formatIDR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absAmount);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Compact format: 12.5 Jt or 850 Rb
 */
export function formatIDRCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1)} M`;
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    return `${sign}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)} Jt`;
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    return `${sign}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(0)} Rb`;
  }
  return `${sign}${abs}`;
}

/**
 * Format percentage with 1 decimal place: 14.2%
 */
export function formatPercent(value: number): string {
  if (isNaN(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
}

/**
 * Parse an IDR formatted string or raw input into an integer
 */
export function parseIDRInput(raw: string): number {
  const digitsOnly = raw.replace(/[^0-9-]/g, '');
  if (!digitsOnly || digitsOnly === '-') return 0;
  return parseInt(digitsOnly, 10);
}
