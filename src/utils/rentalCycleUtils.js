/**
 * Utilitarios compartilhados de ciclos de locacao.
 * Usado por: AdminFaturamento, ContractClosureModal, calculatePendingCycles.
 */

export const getRentalPaymentDay = (r) => {
  const parseDay = (val) => {
    if (val === undefined || val === null || val === '') return -1;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 6) return -1;
    return parsed;
  };

  let day = parseDay(r.paymentDay);
  if (day !== -1) return day;

  day = parseDay(r.documentos?.payment_day);
  if (day !== -1) return day;

  return parseDay(r.docs?.payment_day);
};

export const getRentalClosureDate = (rental) => {
  const closureSummary = rental.docs?.closureSummary || rental.documentos?.closureSummary;
  const closureDate = closureSummary?.actualClosureDate || rental.endDate;
  return closureDate ? closureDate.substring(0, 10) : null;
};

export const getRecordedCyclePayment = (transactions, rental, cycleStart, cycleEnd) => {
  const normalize = (value) => (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  const driver = normalize(rental.user || rental.userName);
  const plate = normalize(rental.plate || rental.vehiclePlate).replace(/[^a-z0-9]/g, '');
  if (!driver || !plate || !cycleStart || !cycleEnd) return null;

  const closureDate = getRentalClosureDate(rental);
  const matchingPayments = (transactions || []).filter((transaction) => {
    if (transaction.type !== 'in' && transaction.type !== 'Receita') return false;

    const transactionPlate = normalize(transaction.vehiclePlate || transaction.vehicle_plate).replace(/[^a-z0-9]/g, '');
    if (transactionPlate !== plate) return false;

    const transactionDate = (transaction.date || '').substring(0, 10);
    if (!transactionDate || transactionDate < cycleStart || transactionDate > cycleEnd) return false;
    if (closureDate && transactionDate >= closureDate) return false;

    const description = normalize(transaction.desc || transaction.description);
    if (!description.includes(driver)) return false;

    const category = normalize(transaction.cat || transaction.category);
    return category === 'aluguel' || category === 'taxa de pneus';
  });

  const rentalAmount = matchingPayments
    .filter(transaction => normalize(transaction.cat || transaction.category) === 'aluguel')
    .reduce((sum, transaction) => sum + parseFloat(transaction.val || transaction.income_val || transaction.value || 0), 0);
  if (rentalAmount <= 0) return null;

  const tireAmount = matchingPayments
    .filter(transaction => normalize(transaction.cat || transaction.category) === 'taxa de pneus')
    .reduce((sum, transaction) => sum + parseFloat(transaction.val || transaction.income_val || transaction.value || 0), 0);

  return {
    rentalAmount,
    tireAmount,
    total: rentalAmount + tireAmount
  };
};

export const getRentalCycles = (rental, targetEndLimit = new Date(), forceProportionalClosure = false) => {
  const startStr = (rental.startDate || rental.date || new Date().toISOString()).substring(0, 10);
  const startObj = new Date(startStr + 'T12:00:00');
  const pDay = rental.rentalType === 'daily' ? -1 : getRentalPaymentDay(rental);

  const isPersistedClosed = rental.status === 'Encerrado' || rental.status === 'Finalizado';
  const isClosed = forceProportionalClosure || isPersistedClosed;
  let endLimit;
  const closureDate = getRentalClosureDate(rental);
  if (forceProportionalClosure && !isPersistedClosed) {
    // Durante o encerramento o endDate ainda é a data prevista do contrato.
    // O limite informado pelo modal é a data real da devolução.
    endLimit = new Date(targetEndLimit.getTime());
    if (endLimit > startObj) {
      endLimit.setDate(endLimit.getDate() - 1);
    }
  } else if (isClosed && closureDate) {
    endLimit = new Date(closureDate + 'T12:00:00');
    if (endLimit > startObj) {
      endLimit.setDate(endLimit.getDate() - 1);
    }
  } else {
    endLimit = new Date(targetEndLimit.getTime());
  }
  endLimit.setHours(12, 0, 0, 0);

  const cycles = [];
  let iterDateObj = new Date(startObj.getTime());
  let weekNumber = 1;
  let safety = 300;

  while (iterDateObj <= endLimit && safety > 0) {
    let cycleStartObj = new Date(iterDateObj.getTime());
    let cycleEndObj = new Date(iterDateObj.getTime());

    if (weekNumber === 1 && pDay !== -1) {
      const startDay = cycleStartObj.getDay();
      if (startDay !== pDay) {
        let proRataDays = pDay - startDay;
        if (proRataDays <= 0) proRataDays += 7;
        cycleEndObj.setDate(cycleEndObj.getDate() + proRataDays - 1);
      } else {
        cycleEndObj.setDate(cycleEndObj.getDate() + 6);
      }
    } else {
      cycleEndObj.setDate(cycleEndObj.getDate() + 6);
    }

    if (isClosed && cycleEndObj > endLimit) {
      cycleEndObj = new Date(endLimit.getTime());
    }

    const cStartStr = cycleStartObj.toISOString().split('T')[0];
    const cEndStr = cycleEndObj.toISOString().split('T')[0];

    cycles.push({
      weekNumber,
      startStr: cStartStr,
      endStr: cEndStr,
      dueStr: cStartStr
    });

    iterDateObj = new Date(cycleEndObj.getTime());
    iterDateObj.setDate(iterDateObj.getDate() + 1);
    weekNumber++;
    safety--;
  }

  return cycles;
};
