import { canOperateModule } from './modulePermissions.js';
import { parseCurrency } from '../utils/currencyUtils.js';

const positive = (value) => parseCurrency(value) > 0;
const hasDebt = (items, field) => Array.isArray(items) && items.some((item) => positive(item?.[field]));

function hasUnpaidFine(fines) {
  return Array.isArray(fines) && fines.some((fine) => {
    const total = parseCurrency(fine?.value);
    const installments = Number(fine?.installments);
    if (installments > 1 && Array.isArray(fine?.paidInstallments)) {
      const remaining = installments - fine.paidInstallments.length;
      const installmentValue = parseCurrency(fine.installmentValue) || total / installments;
      return remaining * installmentValue > 0;
    }
    return total > 0;
  });
}

function denied(message) {
  const error = new Error(message);
  error.code = '42501';
  throw error;
}

// Preflight for the legacy closure's separate writes; server and RLS checks remain mandatory.
export function assertClosurePermissions(profile, closureData, { hasActiveReplacement = false } = {}) {
  if (!canOperateModule(profile, 'locacao')) {
    denied('Você precisa de permissão no módulo Locação para encerrar este contrato.');
  }

  const data = closureData || {};
  const rentalDebt = hasDebt(data.unpaidCyclesList, 'debtValue');
  const manualRentalPayment = Boolean(data.unpaidRentalsMarkedAsPaid) && rentalDebt;
  const fineOffset = positive(data.caucaoAvailable) && hasUnpaidFine(data.unpaidFinesList);
  const depositOffset = positive(data.caucaoAvailable) && (
    rentalDebt || fineOffset || hasDebt(data.manualDebts, 'value') || hasDebt(data.inspectionDetails, 'value') ||
    (data.isEarlyTermination && positive(data.earlyTerminationPenalty))
  );

  if ((manualRentalPayment || depositOffset || hasActiveReplacement) &&
      !canOperateModule(profile, 'financeiro') && !canOperateModule(profile, 'faturamento')) {
    denied('Este encerramento gera lançamentos. Você precisa de permissão no módulo Financeiro ou Faturamento.');
  }
  if (fineOffset && !canOperateModule(profile, 'multas')) {
    denied('Para abater multas na caução, você também precisa de permissão no módulo Multas.');
  }
  return true;
}
