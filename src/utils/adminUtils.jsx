import React from 'react';
import { Car, Wrench, TrendingUp, Landmark, Calendar, ClipboardList } from 'lucide-react';

export const calculateBIStats = (transactions, vehicles, rentals, investors, leads) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const monthlyTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
  });

  const monthlyRevenue = monthlyTransactions
    .filter(t => t.val > 0)
    .reduce((acc, t) => acc + t.val, 0);

  const monthlyExpenses = monthlyTransactions
    .filter(t => t.val < 0)
    .reduce((acc, t) => acc + Math.abs(t.val), 0);

  const netProfit = monthlyRevenue - monthlyExpenses;
  
  const activeVehicles = vehicles.filter(v => v.status === 'Alugado').length;
  const totalVehicles = vehicles.length || 1;
  const utilizationRate = Math.round((activeVehicles / totalVehicles) * 100);

  const totalCaucao = rentals.reduce((acc, r) => {
    const val = parseFloat(String(r.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0;
    return acc + val;
  }, 0);

  return {
    mainStats: [
      { label: 'Veículos Ativos', value: activeVehicles, icon: <Car size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Em Manutenção', value: vehicles.filter(v => v.status === 'Manutenção').length, icon: <Wrench size={20} />, color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'Receita (Mês)', value: `R$ ${monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <TrendingUp size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Total de Caução', value: `R$ ${totalCaucao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <Landmark size={20} />, color: 'text-[#C5A059]', bg: 'bg-[#C5A059]/10' },
    ],
    operationalSummary: {
      utilizationRate,
      netProfit: netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
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

    const currentKm = parseInt(v.km || 0);
    const lastChange = parseInt(v.lastBeltChangeKm || 0);
    const interval = parseInt(v.beltChangeIntervalKm || 60000);
    if (currentKm >= (lastChange + interval - 5000)) {
      beltCount++;
    }

    if (v.status === 'Alugado') {
      const lastMonthInspections = (inspections || []).filter(ins => 
        ins.vehiclePlate === v.plate && 
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
