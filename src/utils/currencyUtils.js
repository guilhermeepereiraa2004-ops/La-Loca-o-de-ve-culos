/**
 * Parses a currency string or number safely.
 * Solves the bug where standard JS floats (e.g. "983.33") would have their
 * decimal points incorrectly stripped by `.replace(/\./g, '')`.
 * 
 * Rules:
 * - If it's already a number, returns the number.
 * - If it's empty/falsy, returns 0.
 * - If the string contains a comma (`,`), it assumes it's a Brazilian formatted
 *   string (e.g., "1.400,00"), so it removes dots and replaces comma with dot.
 * - If it does NOT contain a comma, it assumes it's a standard JS float string 
 *   (e.g., "1400.50"), so it parses it directly without stripping the dot.
 *
 * @param {string|number} val The value to parse
 * @returns {number} The parsed float number
 */
export const parseCurrency = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  const strVal = String(val).trim();
  const stripped = strVal.replace(/[R$\s]/g, '');
  
  if (stripped.includes(',')) {
    // Brazilian format: 1.400,00 -> 1400.00
    return parseFloat(stripped.replace(/\./g, '').replace(',', '.')) || 0;
  } else {
    // Standard JS float format: 1400.50 -> 1400.50
    return parseFloat(stripped) || 0;
  }
};
