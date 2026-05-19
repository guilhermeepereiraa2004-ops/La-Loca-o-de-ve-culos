/**
 * Formats a string to the Brazilian CPF mask (xxx.xxx.xxx-xx)
 * @param {string} value - The input value to format
 * @returns {string} The formatted CPF
 */
export const formatCPF = (value) => {
  if (!value) return '';
  
  // Remove non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Limit to 11 digits
  const limited = digits.slice(0, 11);
  
  // Apply formatting mask: xxx.xxx.xxx-xx
  if (limited.length > 9) {
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
  } else if (limited.length > 6) {
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
  } else if (limited.length > 3) {
    return `${limited.slice(0, 3)}.${limited.slice(3)}`;
  }
  return limited;
};
