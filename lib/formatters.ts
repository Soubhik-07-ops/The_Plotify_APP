/**
 * Currency and number formatting utilities
 * Formats prices in Indian Rupee (INR) with Indian numbering system
 */

/**
 * Formats a number as Indian Rupee with Indian numbering system
 * Examples:
 * - 1500000 => ₹15,00,000
 * - 70000000 => ₹7,00,00,000
 * - 50000 => ₹50,000
 * 
 * @param amount - The amount to format (can be number or string)
 * @param showDecimals - Whether to show decimal places (default: false)
 * @returns Formatted string with ₹ symbol and Indian numbering
 */
export const formatPriceINR = (amount: number | string | undefined | null, showDecimals: boolean = false): string => {
  // Handle null, undefined, or empty values
  if (amount === null || amount === undefined || amount === '') {
    return 'Price on request';
  }

  // Convert to number
  const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;

  // Handle invalid numbers
  if (isNaN(numAmount) || numAmount < 0) {
    return 'Price on request';
  }

  // Format with Indian numbering system
  // Indian system: groups of 2 digits after first 3 digits
  // e.g., 1234567 => 12,34,567
  const parts = numAmount.toFixed(showDecimals ? 2 : 0).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Apply Indian numbering system
  let formatted = '';
  const length = integerPart.length;
  
  // First group: last 3 digits
  if (length > 3) {
    formatted = integerPart.slice(-3);
    // Remaining digits: groups of 2
    for (let i = length - 3; i > 0; i -= 2) {
      const start = Math.max(0, i - 2);
      formatted = integerPart.slice(start, i) + ',' + formatted;
    }
  } else {
    formatted = integerPart;
  }

  // Add decimal part if needed
  if (showDecimals && decimalPart) {
    formatted += '.' + decimalPart;
  }

  return `₹${formatted}`;
};

/**
 * Formats a number as Indian Rupee for display in calculators
 * Similar to formatPriceINR but optimized for calculator displays
 */
export const formatCurrencyINR = (amount: number): string => {
  return formatPriceINR(amount, false);
};

/**
 * Parses a price string (with or without currency symbols) to a number
 * Useful for input fields where users might enter formatted prices
 */
export const parsePrice = (priceString: string): number => {
  if (!priceString) return 0;
  // Remove all non-digit characters except decimal point
  const cleaned = priceString.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

