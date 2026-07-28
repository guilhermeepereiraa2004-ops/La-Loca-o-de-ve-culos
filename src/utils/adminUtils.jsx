import React from 'react';
import { Car, Wrench, TrendingUp, Landmark, Calendar, ClipboardList } from 'lucide-react';
import { parseCurrency } from '../utils/currencyUtils';

const getCompanyShareForTransaction = (t, vehicles = [], rentals = []) => {
  if (!t) return 0;
  const val = parseFloat(t.val) || 0;
  if (t.type === 'out' || val < 0) {
    return val;
  }

  const category = (t.cat || '').toLowerCase().trim();
  if (category === 'taxa adm' || category === 'taxa de pneus') {
    return val;
  }

  if (category === 'aluguel') {
    const descLower = (t.desc || '').toLowerCase();
    const isAsaas = descLower.includes('recebimento') || descLower.includes('asaas');
    if (!isAsaas) {
      return 0;
    }

    const vehicle = vehicles.find(v => v.plate === t.vehiclePlate);
    const adminTaxPercent = parseFloat(vehicle?.adminTax || 20) / 100;
    
    const rental = rentals.find(r => r.plate === t.vehiclePlate || r.vehiclePlate === t.vehiclePlate);
    const tireTax = rental ? parseFloat(rental.tireTax || 25) : 25;

    if (val <= tireTax) {
      return val;
    }

    const rentValueWithoutTireTax = val - tireTax;
    const adminShare = rentValueWithoutTireTax * adminTaxPercent;
    return adminShare + tireTax;
  }

  return val;
};

export const calculateBIStats = (transactions, vehicles, rentals, investors, leads) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Exclude vehicle protection transactions before June 2026
  const filteredTx = (transactions || []).filter(t => {
    const isProtection = t.cat?.toLowerCase().includes('prote') || t.cat?.toLowerCase().includes('veicular');
    const isBeforeJune2026 = t.date && t.date < '2026-06-01';
    return !(isProtection && isBeforeJune2026);
  });

  const monthlyTransactions = filteredTx.filter(t => {
    const tDate = new Date(t.date);
    const isInvestor = t.responsible?.toLowerCase().trim().startsWith('investidor');
    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear && !isInvestor;
  });

  const monthlyRevenue = monthlyTransactions
    .filter(t => t.val > 0)
    .reduce((acc, t) => acc + getCompanyShareForTransaction(t, vehicles, rentals), 0);

  const monthlyExpenses = monthlyTransactions
    .filter(t => t.val < 0)
    .reduce((acc, t) => acc + Math.abs(getCompanyShareForTransaction(t, vehicles, rentals)), 0);

  const netProfit = monthlyRevenue - monthlyExpenses;
  
  const activeVehicles = vehicles.filter(v => v.status === 'Alugado' || v.status === 'Alugado (Reserva)').length;
  const availableVehicles = vehicles.filter(v => v.status === 'Disponível').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'Manutenção').length;
  const totalVehicles = vehicles.length || 1;
  const utilizationRate = Math.round((activeVehicles / totalVehicles) * 100);

  const totalCaucao = rentals.reduce((acc, r) => {
    const val = parseCurrency(r.depositReceived || r.depositPaid || 0) || 0;
    return acc + val;
  }, 0);

  const saldoAcumulado = filteredTx.reduce((acc, t) => {
    const isInvestor = t.responsible?.toLowerCase().trim().startsWith('investidor');
    return acc + (t.status === 'Concluído' && !isInvestor ? getCompanyShareForTransaction(t, vehicles, rentals) : 0);
  }, 0);
  
  const pendingCharges = filteredTx.filter(t => t.status === 'Pendente').length + 
    rentals.filter(r => r.status === 'Ativo' && r.paymentStatus === 'pendente').length;

  const chartData = [];
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const mYear = d.getFullYear();
    const mMonth = d.getMonth();
    
    const monthTx = filteredTx.filter(t => {
      if (!t.date) return false;
      const tDate = new Date(t.date);
      const isInvestor = t.responsible?.toLowerCase().trim().startsWith('investidor');
      return tDate.getMonth() === mMonth && tDate.getFullYear() === mYear && t.status === 'Concluído' && !isInvestor;
    });

    const mRev = monthTx
      .filter(t => t.val > 0)
      .reduce((acc, t) => acc + getCompanyShareForTransaction(t, vehicles, rentals), 0);
    const mExp = monthTx
      .filter(t => t.val < 0)
      .reduce((acc, t) => acc + Math.abs(getCompanyShareForTransaction(t, vehicles, rentals)), 0);
    
    chartData.push({
      name: `${monthNames[mMonth]}`,
      receitas: mRev,
      despesas: mExp,
      saldo: 0
    });
  }

  const date6MonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  let startingBalance = filteredTx.filter(t => {
    if (!t.date) return false;
    const isInvestor = t.responsible?.toLowerCase().trim().startsWith('investidor');
    return new Date(t.date) < date6MonthsAgo && t.status === 'Concluído' && !isInvestor;
  }).reduce((acc, t) => acc + getCompanyShareForTransaction(t, vehicles, rentals), 0);

  chartData.forEach(monthData => {
    startingBalance += (monthData.receitas - monthData.despesas);
    monthData.saldo = startingBalance;
  });

  return {
    mainStats: [
      { label: 'Veículos Ativos', value: activeVehicles, icon: <Car size={20} />, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
      { label: 'Disponíveis', value: availableVehicles, icon: <Car size={20} />, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
      { label: 'Em Manutenção', value: maintenanceVehicles, icon: <Wrench size={20} />, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
      { label: 'Receita (Mês)', value: `R$ ${monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <TrendingUp size={20} />, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
      { label: 'Despesa (Mês)', value: `R$ ${monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <TrendingUp size={20} className="transform rotate-180" />, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
      { label: 'Saldo Acumulado', value: `R$ ${saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <Landmark size={20} />, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
      { label: 'Inadimplências', value: pendingCharges, icon: <Calendar size={20} />, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
      { label: 'Total de Caução', value: `R$ ${totalCaucao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <ClipboardList size={20} />, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
    ],
    chartData,
    operationalSummary: {
      utilizationRate,
      netProfit: netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      netProfitRaw: netProfit,
      profitMargin: monthlyRevenue > 0 ? Math.round((netProfit / monthlyRevenue) * 100) : 0,
      investorsCount: investors.length,
      newLeads: leads.filter(l => (l.status || '').toLowerCase().trim() === 'novo').length
    }
  };
};

export const getDynamicAlerts = (vehicles, maintenances, inspections, clients) => {
  const today = new Date();
  let preventiveCount = 0;
  let beltCount = 0;
  let inspectionPendingCount = 0;
  let cnhAlertCount = 0;

  const todayForCnh = new Date();
  todayForCnh.setHours(0, 0, 0, 0);

  (clients || []).forEach(c => {
    const cnhDateStr = c.cnhExpiration || c.cnhValidity;
    if (!cnhDateStr) return;
    const expDate = new Date(cnhDateStr);
    
    const diffTime = expDate.getTime() - todayForCnh.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Conta CNHs vencidas ou vencendo nos próximos 30 dias (1 mês)
    if (diffDays <= 30) {
      cnhAlertCount++;
    }
  });

  (vehicles || []).forEach(v => {
    const hasPreventive = v.preventiveMaintenance !== false && 
                          v.preventiveMaintenance !== 'false' && 
                          v.preventive_maintenance !== false && 
                          v.preventive_maintenance !== 'false';

    if (hasPreventive) {
      if (v.entryDate) {
        const entryDate = new Date(v.entryDate);
        const monthsSinceEntry = (today.getFullYear() - entryDate.getFullYear()) * 12 + (today.getMonth() - entryDate.getMonth());
        
        if (monthsSinceEntry > 0 && monthsSinceEntry % 6 === 0 || (monthsSinceEntry + 1) % 6 === 0) {
          const recentPreventive = (maintenances || []).find(m => 
            m.vehiclePlate === v.plate && 
            (m.serviceType || '').toLowerCase().includes('preventiva') &&
            (today - new Date(m.date)) / (1000 * 60 * 60 * 24 * 30) < 2
          );
          if (!recentPreventive) preventiveCount++;
        }
      }

      const currentKm = parseInt(v.km || 0);
      const lastChange = parseInt(v.lastBeltChangeKm || 0);
      const interval = parseInt(v.beltChangeIntervalKm || 60000);
      if (currentKm >= (lastChange + interval - 5000)) {
        beltCount++;
      }
    }

    if (v.status === 'Alugado' || v.status === 'Alugado (Reserva)') {
      const normalizedPlate = (v.plate || '').replace(/-/g, '').toUpperCase();
      const lastMonthInspections = (inspections || []).filter(ins => 
        (ins.vehiclePlate || '').replace(/-/g, '').toUpperCase() === normalizedPlate && 
        ins.type === 'Periódica' &&
        (today - new Date(ins.date)) / (1000 * 60 * 60 * 24) <= 30
      ).length;
      if (lastMonthInspections < 2) {
        inspectionPendingCount++;
      }
    }
  });

  return [
    { title: 'Manutenção Preventiva', count: preventiveCount, type: preventiveCount > 0 ? 'critical' : 'info', icon: <Wrench size={16} /> },
    { title: 'Troca de Correia Dentada', count: beltCount, type: beltCount > 0 ? 'critical' : 'info', icon: <Wrench size={16} /> },
    { title: 'CNH próxima do vencimento', count: cnhAlertCount, type: cnhAlertCount > 0 ? 'warning' : 'info', icon: <Calendar size={16} /> },
    { title: 'Vistorias Periódicas Pendentes', count: inspectionPendingCount, type: inspectionPendingCount > 0 ? 'critical' : 'info', icon: <ClipboardList size={16} /> },
  ];
};

export const getDayOfWeek = (dateStr) => {
  if (!dateStr) return '';
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const date = new Date(dateStr + 'T00:00:00');
  return days[date.getDay()];
};
