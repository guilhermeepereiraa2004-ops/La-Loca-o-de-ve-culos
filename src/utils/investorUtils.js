/**
 * Utility functions for investor financial calculations.
 */

export const getInvestorShareForTransaction = (t, invVehicles = [], rentals = []) => {
  if (!t || (t.status || '').toLowerCase() !== 'concluído') return { share: 0, explanation: 'Ignorado (Não concluído)' };
  
  const val = parseFloat(t.val) || 0;
  const absVal = Math.abs(val);
  const category = (t.cat || '').toLowerCase().trim();

  if (t.type === 'out' || val < 0) {
    const isImported = (t.desc || '').toLowerCase().includes('importado de planilha');
    const isRespInvestor = isImported || (t.responsible || '').toLowerCase().trim().startsWith('investidor');
    const isBeforeJune2026 = t.date && t.date < '2026-06-01';
    if (isImported || (isRespInvestor && !isBeforeJune2026)) {
      return {
        share: -absVal,
        explanation: `Despesa cobrada do investidor: - R$ ${absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      };
    }
    return {
      share: 0,
      explanation: `Ignorado (Despesa da administradora ou anterior a Junho/2026)`
    };
  }

  if (category === 'taxa adm') {
    return {
      share: 0,
      explanation: `Ignorado (Taxa adm de R$ ${absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pertence 100% à empresa)`
    };
  }
  if (category === 'taxa de pneus') {
    return {
      share: 0,
      explanation: `Ignorado (Taxa de pneus de R$ ${absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pertence 100% à empresa)`
    };
  }

  if (category.includes('proteç') || category.includes('protec')) {
    return {
      share: -absVal,
      explanation: `Despesa de proteção veicular: - R$ ${absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    };
  }
  if (category.includes('franquia') || category.includes('seguro')) {
    return {
      share: -absVal,
      explanation: `Despesa de seguro franquia: - R$ ${absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    };
  }

  if (category === 'pagamento de dívida' || category === 'pagamento dívida') {
    return {
      share: absVal,
      explanation: `Pagamento de dívida recebido: + R$ ${absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    };
  }

  if (category === 'aluguel') {
    const descLower = (t.desc || '').toLowerCase();
    const isAsaas = descLower.includes('recebimento') || descLower.includes('asaas');
    const isRetido = descLower.includes('[retido');

    if (isRetido) {
      return {
        share: 0,
        explanation: 'Valor integral retido pela administradora (Adiantamento prévio)'
      };
    }

    const normPlate = (p) => (p || '').replace(/[-\s]/g, '').toUpperCase();
    const vehicle = invVehicles.find(v => normPlate(v.plate) === normPlate(t.vehiclePlate));
    const adminTaxPercent = parseFloat(vehicle?.adminTax || 20);
    const investorSharePercent = 100 - adminTaxPercent;

    if (!isAsaas) {
      const investorPart = absVal * (investorSharePercent / 100);
      return {
        share: investorPart,
        explanation: `Aluguel manual: R$ ${absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} bruto - ${adminTaxPercent}% (Taxa Adm) = + R$ ${investorPart.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      };
    } else {
      const rental = rentals.find(r => normPlate(r.plate) === normPlate(t.vehiclePlate) || normPlate(r.vehiclePlate) === normPlate(t.vehiclePlate));
      const tireTax = rental ? parseFloat(rental.tireTax || 25) : 25;

      const rentValue = Math.max(0, absVal - tireTax);
      const investorPart = rentValue * (investorSharePercent / 100);
      return {
        share: investorPart,
        explanation: `Aluguel Asaas: R$ ${absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} bruto (deduz R$ ${tireTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de taxa de pneus, restando R$ ${rentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de aluguel) - ${adminTaxPercent}% (Taxa Adm) = + R$ ${investorPart.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      };
    }
  }

  return {
    share: 0,
    explanation: `Ignorado (${t.cat || 'Outros'} de R$ ${absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pertence 100% à empresa)`
  };
};
