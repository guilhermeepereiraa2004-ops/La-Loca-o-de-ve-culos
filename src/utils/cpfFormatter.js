/**
 * Formats a string to the Brazilian CPF mask (xxx.xxx.xxx-xx)
 * @param {string} value - The input value to format
 * @returns {string} The formatted CPF
 */
export const formatCPF = (value) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  const limited = digits.slice(0, 11);
  if (limited.length > 9) {
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
  } else if (limited.length > 6) {
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
  } else if (limited.length > 3) {
    return `${limited.slice(0, 3)}.${limited.slice(3)}`;
  }
  return limited;
};

/**
 * Formats a string to the Brazilian CPF or CNPJ mask based on length
 * @param {string} value - The input value to format
 * @returns {string} The formatted CPF/CNPJ
 */
export const formatCpfCnpj = (value) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 11) {
    const limited = digits;
    if (limited.length > 9) {
      return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
    } else if (limited.length > 6) {
      return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    } else if (limited.length > 3) {
      return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    }
    return limited;
  } else {
    const limited = digits.slice(0, 14);
    if (limited.length > 12) {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`;
    } else if (limited.length > 8) {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
    } else if (limited.length > 5) {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
    } else if (limited.length > 2) {
      return `${limited.slice(0, 2)}.${limited.slice(2)}`;
    }
    return limited;
  }
};
