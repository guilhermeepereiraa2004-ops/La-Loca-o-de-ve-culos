import { parseCurrency } from './currencyUtils.js';

export const calculateDepositSettlement = (depositAvailable, totalDebts) => {
  const deposit = Math.max(0, parseCurrency(depositAvailable));
  const debts = Math.max(0, parseCurrency(totalDebts));
  const balanceRaw = deposit - debts;

  return {
    amountChargedFromDeposit: Math.min(deposit, debts),
    balance: Math.abs(balanceRaw),
    type: balanceRaw >= 0 ? 'return' : 'debt'
  };
};
