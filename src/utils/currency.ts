/**
 * Currency utilities for Frisbii payment provider
 */

/**
 * Zero-decimal currencies (amounts not multiplied by 100)
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW',
  'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV',
  'XAF', 'XOF', 'XPF',
])

/**
 * Convert amount to minor units (cents)
 * @param amount - Amount in major units (e.g., 10.50 EUR)
 * @param currencyCode - ISO currency code (e.g., "EUR")
 * @returns Amount in minor units (e.g., 1050 for EUR, 10 for JPY)
 */
export function toMinorUnits(amount: number, currencyCode: string): number {
  const currency = currencyCode.toUpperCase()
  
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return Math.round(amount)
  }
  
  return Math.round(amount * 100)
}

/**
 * Convert amount from minor units to major units
 * @param amount - Amount in minor units (e.g., 1050 cents)
 * @param currencyCode - ISO currency code (e.g., "EUR")
 * @returns Amount in major units (e.g., 10.50 EUR)
 */
export function fromMinorUnits(amount: number, currencyCode: string): number {
  const currency = currencyCode.toUpperCase()
  
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return amount
  }
  
  return amount / 100
}

/**
 * Check if currency is zero-decimal
 * @param currencyCode - ISO currency code
 * @returns True if zero-decimal currency
 */
export function isZeroDecimalCurrency(currencyCode: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase())
}
