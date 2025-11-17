/**
 * Money and Tax Utility Helpers
 * 
 * Provides consistent conversion between cents (Stripe) and dollars (database/API/UI)
 * 
 * Database Storage: DECIMAL columns store dollars (e.g., "7.14")
 * Stripe API: Integer cents (e.g., 714)
 * Frontend/API: Dollars (e.g., 7.14)
 * 
 * These helpers primarily convert between Stripe's cent-based amounts
 * and the dollar-based values used throughout the rest of the system.
 */

/**
 * Convert cents (integer) to dollars (float)
 * @param cents - Amount in cents (e.g., 714 for $7.14)
 * @returns Amount in dollars (e.g., 7.14)
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Convert dollars (float) to cents (integer)
 * @param dollars - Amount in dollars (e.g., 7.14)
 * @returns Amount in cents, rounded (e.g., 714)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents string (database storage) to dollars (float)
 * @param centsStr - Amount in cents as string (e.g., "714" for $7.14)
 * @returns Amount in dollars (e.g., 7.14)
 */
export function centsStringToDollars(centsStr: string | null | undefined): number {
  if (!centsStr) return 0;
  const cents = parseInt(centsStr, 10);
  if (isNaN(cents)) return 0;
  return centsToDollars(cents);
}

/**
 * Convert dollars to cents string (database storage)
 * @param dollars - Amount in dollars (e.g., 7.14)
 * @returns Amount in cents as string (e.g., "714")
 */
export function dollarsToCentsString(dollars: number): string {
  return dollarsToCents(dollars).toString();
}

/**
 * Parse tax rate from string to decimal
 * @param taxRateStr - Tax rate as string with 4 decimals (e.g., "0.0714" for 7.14%)
 * @returns Tax rate as decimal (e.g., 0.0714)
 */
export function parseTaxRate(taxRateStr: string | null | undefined): number {
  if (!taxRateStr) return 0;
  const rate = parseFloat(taxRateStr);
  if (isNaN(rate)) return 0;
  return rate;
}

/**
 * Format tax rate to fixed 4-decimal string for database storage
 * @param rate - Tax rate as decimal (e.g., 0.0714)
 * @returns Tax rate as string with 4 decimals (e.g., "0.0714")
 */
export function formatTaxRate(rate: number): string {
  return rate.toFixed(4);
}

/**
 * Calculate tax amount in cents from subtotal and tax rate
 * @param subtotalInCents - Subtotal in cents
 * @param taxRate - Tax rate as decimal (e.g., 0.0714 for 7.14%)
 * @returns Tax amount in cents, rounded
 */
export function calculateTaxInCents(subtotalInCents: number, taxRate: number): number {
  return Math.round(subtotalInCents * taxRate);
}

/**
 * Calculate tax amount in dollars from subtotal and tax rate
 * @param subtotalInDollars - Subtotal in dollars
 * @param taxRate - Tax rate as decimal (e.g., 0.0714 for 7.14%)
 * @returns Tax amount in dollars, rounded to 2 decimals
 */
export function calculateTaxInDollars(subtotalInDollars: number, taxRate: number): number {
  const taxInCents = calculateTaxInCents(dollarsToCents(subtotalInDollars), taxRate);
  return centsToDollars(taxInCents);
}

/**
 * Calculate total amount (subtotal + tax) in cents
 * @param subtotalInCents - Subtotal in cents
 * @param taxInCents - Tax in cents
 * @returns Total in cents
 */
export function calculateTotalInCents(subtotalInCents: number, taxInCents: number): number {
  return subtotalInCents + taxInCents;
}

/**
 * Pro-rate tax for partial refund
 * @param originalSubtotalInCents - Original subtotal before tax (in cents)
 * @param refundSubtotalInCents - Refund subtotal amount (in cents)
 * @param originalTaxInCents - Original tax paid (in cents)
 * @returns Prorated tax amount for refund (in cents)
 */
export function prorateTaxForRefund(
  originalSubtotalInCents: number,
  refundSubtotalInCents: number,
  originalTaxInCents: number
): number {
  if (originalSubtotalInCents === 0) return 0;
  const refundPercentage = refundSubtotalInCents / originalSubtotalInCents;
  return Math.round(originalTaxInCents * refundPercentage);
}

/**
 * Format currency for display
 * @param amount - Amount in dollars
 * @returns Formatted currency string (e.g., "$7.14")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format percentage for display
 * @param rate - Rate as decimal (e.g., 0.0714)
 * @returns Formatted percentage string (e.g., "7.14%")
 */
export function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}
