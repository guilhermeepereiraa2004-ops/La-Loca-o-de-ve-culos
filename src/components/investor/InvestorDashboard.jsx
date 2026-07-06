import React, { useState, useEffect } from 'react';
import { 
  X, Menu, TrendingUp, Car, Wrench, Wallet, Calendar, 
  Search, FileText, ShieldCheck, CheckCircle2, Printer, Eye 
} from 'lucide-react';
import { EditorialLabel } from '../ui/EditorialLabel';
import { getPayoutsForInvestor } from '../../utils/investorPayouts.js';
import { parseCurrency } from '../../utils/currencyUtils';

const formatDate = (dateStr) => {
  if (!dateStr) return '---';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const getFifthBusinessDay = (dateOrYear = new Date(), monthOpt) => {
  let year, month;
  if (dateOrYear instanceof Date) {
    year = dateOrYear.getFullYear();
    month = dateOrYear.getMonth();
  } else if (typeof dateOrYear === 'number' && typeof monthOpt === 'number') {
    year = dateOrYear;
    month = monthOpt;
  } else {
    const d = new Date();
    year = d.getFullYear();
    month = d.getMonth();
  }
  let count = 0;
  let day = 1;
  while (count < 5) {
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    if (count < 5) day++;
  }
  return new Date(year, month, day);
};

const InvestorDashboard = ({ investor, transactions = [], vehicles = [], serviceOrders = [], rentals = [], onLogout, onGoHome }) => {
  const [viewingSO, setViewingSO] = useState(null);
  const [soListModal, setSoListModal] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('la_investor_active_tab');
    return savedTab || 'dashboard';
  });
  const [maintenanceFilter, setMaintenanceFilter] = useState('todos');
  const [realPayouts, setRealPayouts] = useState([]);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('la_investor_active_tab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (investor?.id) {
      getPayoutsForInvestor(investor.id).then(setRealPayouts);
    }
  }, [investor?.id]);

  // Filter vehicles belonging to this investor and enrich with dynamic yield calculations
  const rawVehicles = vehicles.filter(v => {
    if (!investor) return false;
    const invNameMatch = v.investor?.toLowerCase().trim() === investor.name?.toLowerCase().trim();
    const invIdMatch = v.investorId === investor.id;
    return invNameMatch || invIdMatch;
  });

  const myVehicles = rawVehicles.map(v => {
    // Calculate investment value safely
    const investValue = parseCurrency(v.investmentValue || v.investValue || 0) || 0;

    // Sum all transactions for this vehicle plate
    const vehicleTrans = transactions.filter(t => t.vehiclePlate === v.plate);
    let gross = 0;
    let adminTaxSum = 0;
    let maintenanceSum = 0;
    let protectionSum = 0;
    let insuranceSum = 0;

    vehicleTrans.forEach(t => {
      const cat = t.cat?.toLowerCase().trim() || '';
      const val = Math.abs(t.val || 0);

      const isSeguro = cat.includes('seguro') || cat.includes('franquia');
      const isProtecao = cat.includes('prote') || cat.includes('veicular');
      const isBeforeJune2026 = t.date && t.date < '2026-06-01';

      if (isSeguro) {
        if (!isBeforeJune2026) insuranceSum += val;
      } else if (isProtecao) {
        if (!isBeforeJune2026) protectionSum += val;
      } else if (t.type === 'in') {
        if (t.responsible === 'Administradora') return;
        if (cat === 'taxa adm') {
          adminTaxSum += val;
        } else {
          gross += val;
          const taxRate = parseFloat(v?.adminTax || 20) / 100;
          adminTaxSum += val * taxRate;
        }
      } else if (t.type === 'out') {
        if (t.responsible === 'Administradora') return;
        if (cat.includes('manuten')) {
          if (!isBeforeJune2026) maintenanceSum += val;
        }
      }
    });

    const currentYield = gross - adminTaxSum - (maintenanceSum + protectionSum + insuranceSum);
    const yieldPerc = investValue > 0 ? ((currentYield / investValue) * 100).toFixed(2) + '%' : '0.00%';

    return {
      ...v,
      investValue,
      currentYield,
      yieldPerc
    };
  });

  // Calcular valor total investido com base nos veículos
  const totalInvested = myVehicles.reduce((acc, v) => acc + (v.investValue || 0), 0);

  // Calcular ganhos e despesas reais do investidor a partir das transações
  const investorTransactions = transactions.filter(t => {
    const cat = t.cat?.toLowerCase().trim() || '';
    const isSpecialAutoTrans = cat.includes('seguro') || cat.includes('franquia') || cat.includes('prote') || cat.includes('veicular');
    
    if (isSpecialAutoTrans && t.vehiclePlate && myVehicles.some(v => v.plate === t.vehiclePlate)) {
      return true;
    }

    if (t.responsible === 'Administradora') return false;
    return myVehicles.some(v => v.plate === t.vehiclePlate) || 
      (t.responsible?.toLowerCase().startsWith('investidor:') && t.responsible.split(':')[1]?.trim().toLowerCase() === investor.name?.toLowerCase().trim()) ||
      (t.responsible?.toLowerCase().trim() === investor.name?.toLowerCase().trim());
  });

  const realInvestorRevenue = investorTransactions
    .filter(t => {
      const cat = t.cat?.toLowerCase().trim() || '';
      const isSpecialAutoTrans = cat.includes('seguro') || cat.includes('franquia') || cat.includes('prote') || cat.includes('veicular');
      return t.type === 'in' && !isSpecialAutoTrans;
    })
    .reduce((acc, t) => acc + Math.abs(t.val || 0), 0);

  const realInvestorExpenses = investorTransactions
    .filter(t => {
      const cat = t.cat?.toLowerCase().trim() || '';
      const isSpecialAutoTrans = cat.includes('seguro') || cat.includes('franquia') || cat.includes('prote') || cat.includes('veicular');
      const isBeforeJune2026 = t.date && t.date < '2026-06-01';
      if (isBeforeJune2026) return false;
      return t.type === 'out' || isSpecialAutoTrans;
    })
    .reduce((acc, t) => acc + Math.abs(t.val || 0), 0);

  // Maintenance history from transactions
  const maintenanceHistory = transactions
    .filter(t => (t.cat?.toLowerCase().includes('manuten') || t.desc?.toLowerCase().includes('manuten')) && myVehicles.some(v => v.plate === t.vehiclePlate))
    .filter(t => !(t.date && t.date < '2026-06-01'))
    .map(t => ({
      id: t.id,
      vehicle: vehicles.find(v => v.plate === t.vehiclePlate)?.model || 'Veículo',
      plate: t.vehiclePlate,
      type: t.desc,
      date: t.date,
      cost: `R$ ${t.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      status: t.status === 'pago' || t.status === 'Concluído' ? 'Concluído' : 'Em Aberto',
      icon: <Wrench size={16} />
    }));

  const totalProtectionDiscount = myVehicles
    .filter(v => v.hasProtection)
    .reduce((acc, v) => acc + (parseCurrency(v.protectionValue || 0) || 0), 0);

  // Dynamic grouping by month for the last 6 months
  const getMonthYearLabel = (date) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Pré-processamento cronológico de todas as transações para calcular dívidas herdadas
  const monthlyPerformance = {};
  
  investorTransactions.forEach(t => {
    if (!t.date) return;
    try {
      const tDate = new Date(t.date + 'T12:00:00');
      const monthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyPerformance[monthKey]) {
        monthlyPerformance[monthKey] = {
          gross: 0, adminTax: 0, maintenance: 0, protection: 0, insurance: 0, other: 0, net: 0
        };
      }
      
      const cat = t.cat?.toLowerCase().trim() || '';
      const val = Math.abs(t.val || 0);
      
      const isSeguroFranquia = cat.includes('seguro') || cat.includes('franquia');
      const isProtecaoVeicular = cat.includes('prote') || cat.includes('veicular');
      const isBeforeJune2026 = t.date && t.date < '2026-06-01';

      if (isSeguroFranquia) {
        if (!isBeforeJune2026) {
          monthlyPerformance[monthKey].insurance += val;
          monthlyPerformance[monthKey].net -= val;
        }
      } else if (isProtecaoVeicular) {
        if (!isBeforeJune2026) {
          monthlyPerformance[monthKey].protection += val;
          monthlyPerformance[monthKey].net -= val;
        }
      } else if (t.type === 'in') {
        if (cat === 'taxa adm') {
          monthlyPerformance[monthKey].adminTax += val;
          monthlyPerformance[monthKey].net -= val;
        } else {
          monthlyPerformance[monthKey].gross += val;
          const v = t.vehiclePlate ? myVehicles.find(veh => veh.plate === t.vehiclePlate) : null;
          const taxRate = v ? (parseFloat(v.adminTax || 20) / 100) : 0;
          const calculatedTax = val * taxRate;
          monthlyPerformance[monthKey].adminTax += calculatedTax;
          monthlyPerformance[monthKey].net += val;
          monthlyPerformance[monthKey].net -= calculatedTax;
        }
      } else if (t.type === 'out') {
        if (!isBeforeJune2026) {
          monthlyPerformance[monthKey].net -= val;
          if (cat.includes('manuten')) {
            monthlyPerformance[monthKey].maintenance += val;
          } else {
            monthlyPerformance[monthKey].other += val;
          }
        }
      }
    } catch (e) { /* ignore error */ }
  });

  const sortedMonthsKeys = Object.keys(monthlyPerformance).sort();
  let currentCarriedDebt = 0;
  
  for (const month of sortedMonthsKeys) {
    const perf = monthlyPerformance[month];
    perf.carriedDebtIn = currentCarriedDebt;
    
    const total = perf.net + currentCarriedDebt;
    if (total > 0) {
      perf.carriedDebtOut = 0;
      currentCarriedDebt = 0;
      perf.finalPayout = total;
    } else {
      perf.carriedDebtOut = total;
      currentCarriedDebt = total;
      perf.finalPayout = 0; // Negative balance, doesn't get paid, carries over
    }
  }

  // Gera o histórico dos últimos 6 meses para visualização
  const dividendHistory = [];
  const todayDate = new Date();

  for (let i = 0; i < 6; i++) {
    const targetDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
    const monthLabel = getMonthYearLabel(targetDate);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    const monthKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

    const perf = monthlyPerformance[monthKey];

    // Exibe o mês se houver transações ou se for o mês atual e ele tiver veículos
    if (perf || (i === 0 && myVehicles.length > 0)) {
      const gross = perf?.gross || 0;
      const adminTaxSum = perf?.adminTax || 0;
      const maintenanceSum = perf?.maintenance || 0;
      const protectionSum = perf?.protection || 0;
      const insuranceSum = perf?.insurance || 0;
      const otherSum = perf?.other || 0;
      const carriedDebtIn = perf?.carriedDebtIn || 0;
      const finalPayout = perf?.finalPayout || 0;

      const refMonthStr = monthKey;
      const realPayout = realPayouts.find(p => p.reference_month === refMonthStr);

      const nextMonthDate = getFifthBusinessDay(targetYear, targetMonth + 1);
      let paymentDateLabel = nextMonthDate.toLocaleDateString('pt-BR');
      let status = 'Em Aberto';

      if (realPayout) {
        status = 'Repasse Realizado';
        paymentDateLabel = new Date(realPayout.paid_at).toLocaleDateString('pt-BR');
      }

      dividendHistory.push({
        id: i + 1,
        period: monthLabel,
        refMonthStr,
        gross,
        adminTax: adminTaxSum,
        discounts: {
          maintenance: maintenanceSum,
          insurance: insuranceSum,
          protection: protectionSum,
          other: otherSum,
          carriedDebt: carriedDebtIn
        },
        netValue: finalPayout,
        status,
        date: paymentDateLabel,
        realPayout
      });
    }
  }

  const filteredMaintenances = maintenanceHistory.filter(m =>
    maintenanceFilter === 'todos' || m.vehicle === maintenanceFilter
  );

  const totalInsurance = 39.90 * myVehicles.filter(v => v.franchiseInsurance).length;

  const currentMonthDividends = dividendHistory[0] ? dividendHistory[0].netValue : 0;

  const yearDividends = dividendHistory.reduce((acc, d) => acc + d.netValue, 0);

  const avgYield = totalInvested > 0 ? ((currentMonthDividends / totalInvested) * 100).toFixed(2) + '%' : '0.00%';

  // Generate graph bars dynamically based on reverse chronological history
  const graphBars = [...dividendHistory].reverse().map(d => {
    const shortMonth = d.period.split(' ')[0].substring(0, 3);
    return {
      m: shortMonth,
      v: d.netValue
    };
  });

  const maxNet = Math.max(...graphBars.map(b => b.v), 1);
  const graphBarsWithPercentage = graphBars.map(b => ({
    m: b.m,
    v: b.v,
    percent: Math.max(5, Math.min(100, Math.round((b.v / maxNet) * 100)))
  }));



  const nextPaymentDate = getFifthBusinessDay(new Date(new Date().getFullYear(), new Date().getMonth() + 1));

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'alugado': 
      case 'alugado (reserva)':
        return <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-full">{status}</span>;
      case 'manutenção': 
        return <span className="px-3 py-1 bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-full">Manutenção</span>;
      case 'indisponível': 
        return <span className="px-3 py-1 bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-full">Indisponível</span>;
      case 'disponível': 
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full">Disponível</span>;
      default: 
        return status ? <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full">{status}</span> : null;
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-close sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex font-sans relative">
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-6 right-6 z-[60] xl:hidden bg-neutral-950 text-[#C5A059] p-4 rounded-full shadow-2xl border border-neutral-800"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`bg-neutral-950 text-white flex flex-col p-8 fixed h-full z-50 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-0 opacity-0 xl:w-20 xl:translate-x-0 xl:opacity-100'}`}>
        <div className={`mb-16 transition-all duration-300 ${!isSidebarOpen ? 'xl:opacity-0' : 'opacity-100'}`}>
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="h-6 w-auto object-contain" alt="L.A Locação de Veículos" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#C5A059] leading-tight">L.A VEÍCULOS</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Portal Investidor</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-4">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'minha-frota', label: 'Meus Veículos', icon: Car },
            { id: 'manutencao', label: 'Manutenções', icon: Wrench },
            { id: 'pagamentos', label: 'Dividendos', icon: Wallet },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1280) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-[#C5A059] text-neutral-950 font-black' : 'text-neutral-500 hover:text-white hover:bg-neutral-900'
                }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-neutral-950' : 'group-hover:text-[#C5A059]'} />
              <span className={`text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-neutral-900 pt-4 mt-auto space-y-2">
          <button
            onClick={onGoHome}
            className="flex items-center gap-4 p-4 text-neutral-500 hover:text-[#C5A059] transition-colors w-full"
          >
            <Eye size={20} />
            <span className={`text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>Página Inicial</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-4 p-4 text-neutral-500 hover:text-red-400 transition-colors w-full"
          >
            <X size={20} />
            <span className={`text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>Sair do Portal</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Overlay for mobile */}
      {isSidebarOpen && window.innerWidth < 1280 && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 xl:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-500 ${isSidebarOpen ? 'xl:ml-72' : 'xl:ml-20'} p-6 md:p-12 overflow-x-hidden`}>
        <div className="max-w-[1600px] mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
            <div>
              <EditorialLabel className="text-[#C5A059] mb-2">Bem-vindo de volta,</EditorialLabel>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-neutral-900">{investor?.name || 'Investidor'}</h2>
            </div>
            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Total de Ativos</p>
                <p className="text-xl md:text-2xl font-black text-neutral-900">{myVehicles.length} Veículos</p>
              </div>
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white border border-neutral-100 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-sm">
                <Car size={24} className="text-[#C5A059]" />
              </div>
            </div>
          </header>

          {activeTab === 'dashboard' && (
            <div className="space-y-12">
              {/* Payment Schedule Banner */}
              <div className="bg-neutral-900 rounded-[2.5rem] p-10 mb-10 relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-[#C5A059]/10 to-transparent" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-[#C5A059] rounded-3xl flex items-center justify-center text-neutral-950 shadow-2xl shadow-[#C5A059]/30 transform -rotate-3 group-hover:rotate-0 transition-transform">
                      <Calendar size={40} />
                    </div>
                    <div>
                      <EditorialLabel className="text-[#C5A059] mb-2">Cronograma de Repasse</EditorialLabel>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                        Próximo Pagamento: <span className="text-[#C5A059]">{nextPaymentDate.toLocaleDateString('pt-BR')}</span>
                      </h2>
                      <p className="text-neutral-400 text-xs mt-3 font-medium uppercase tracking-[0.2em]">
                        Regra: 5º Dia Útil de cada mês — Processamento Automático
                      </p>
                    </div>
                  </div>
                  <div className="hidden lg:block h-16 w-[1px] bg-white/10" />
                  <div className="text-center md:text-right">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Status do Ciclo</p>
                    <div className="flex items-center gap-2 justify-center md:justify-end">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm font-black text-white uppercase tracking-widest">Aguardando Fechamento</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Top Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm group hover:shadow-xl transition-all">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-4">Valor Total Investido</p>
                  <p className="text-2xl font-black text-neutral-900">R$ {totalInvested.toLocaleString('pt-BR')}</p>
                  <div className="mt-4 h-1 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C5A059] w-3/4" />
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm group hover:shadow-xl transition-all">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-4">Dividendos (Mês Atual)</p>
                  <p className="text-2xl font-black text-emerald-600">R$ {currentMonthDividends.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mt-2 flex items-center gap-1">
                    <TrendingUp size={10} /> +12% vs mês ant.
                  </p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm group hover:shadow-xl transition-all">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-4">Acumulado no Ano</p>
                  <p className="text-2xl font-black text-neutral-900">R$ {yearDividends.toLocaleString('pt-BR')}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#C5A059]" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Ano Fiscal 2026</span>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm group hover:shadow-xl transition-all">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-4">Rendimento Médio</p>
                  <p className="text-2xl font-black text-[#C5A059]">{avgYield}</p>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mt-2">Mensal (Real)</p>
                </div>
              </div>

              {/* Graphs Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="md:col-span-2 bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Dividendos Mês a Mês</h3>
                    <EditorialLabel className="text-neutral-300">Rendimentos em R$</EditorialLabel>
                  </div>
                  <div className="h-64 flex items-end justify-between gap-4 px-4">
                    {graphBarsWithPercentage.map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                        <div className="w-full relative flex items-end justify-center">
                          <div
                            style={{ height: `${bar.percent}%` }}
                            className={`w-full max-w-[40px] rounded-t-xl transition-all duration-1000 ${bar.v > 0 ? 'bg-neutral-900 group-hover:bg-[#C5A059]' : 'bg-neutral-50 h-2'}`}
                          />
                          {bar.v > 0 && (
                            <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black whitespace-nowrap">
                              R$ {Math.round(bar.v).toLocaleString('pt-BR')}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-black text-neutral-400">{bar.m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Yield per Vehicle Summary */}
                <div className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm">
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-10">Rendimento por Veículo</h3>
                  <div className="space-y-8">
                    {myVehicles.filter(v => v.currentYield > 0).map((v) => (
                      <div key={v.id} className="flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                          <img
                            src={v.image || '/logo-new.png'}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                            alt={v.model}
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo-new.png'; e.currentTarget.style.objectFit = 'contain'; e.currentTarget.style.padding = '2px'; e.currentTarget.style.background = '#000000'; }}
                            style={v.image === '/logo-new.png' ? { objectFit: 'contain', padding: '2px', background: '#000000' } : {}}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase tracking-tight text-neutral-900">{v.model}</p>
                          <div className="flex justify-between items-end">
                            <p className="text-sm font-bold text-[#C5A059]">R$ {v.currentYield.toLocaleString('pt-BR')}</p>
                            <p className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold">{v.yieldPerc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-10 py-4 border border-neutral-100 rounded-xl text-[9px] uppercase tracking-widest font-black text-neutral-400 hover:bg-neutral-950 hover:text-white hover:border-neutral-950 transition-all">
                    Ver Relatório Completo
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'minha-frota' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {myVehicles.map((v, idx) => (
                <div key={idx} className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row gap-10">
                    <div className="w-full md:w-48 h-48 rounded-3xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700 shadow-lg">
                      <img
                        src={v.image || '/logo-new.png'}
                        className="w-full h-full object-cover"
                        alt={v.model}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo-new.png'; e.currentTarget.style.objectFit = 'contain'; e.currentTarget.style.padding = '1.5rem'; e.currentTarget.style.background = '#000000'; }}
                        style={v.image === '/logo-new.png' ? { objectFit: 'contain', padding: '1.5rem', background: '#000000' } : {}}
                      />
                    </div>
                    <div className="flex-1 space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-2xl font-black uppercase tracking-tighter text-neutral-900">{v.model}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="px-2 py-0.5 bg-neutral-900 text-white text-[9px] font-black rounded uppercase">{v.plate}</span>
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{v.year}</span>
                          </div>
                        </div>
                        {getStatusBadge(v.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-y-6 gap-x-8 pt-4">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Valor Investido</p>
                          <p className="text-sm font-black text-neutral-900">R$ {v.investValue.toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Taxa de Investidor</p>
                          <p className="text-sm font-black text-[#C5A059]">
                            {v.investorTax || (100 - (parseFloat(v.adminTax) || 20))}%
                          </p>
                        </div>
                        <div className="col-span-2 p-4 bg-neutral-50 rounded-2xl flex justify-between items-center border border-neutral-100">
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Rendimento Mensal</p>
                            <p className="text-lg font-black text-[#C5A059]">R$ {v.currentYield.toLocaleString('pt-BR')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Performance</p>
                            <p className="text-sm font-black text-emerald-500">{v.yieldPerc}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons removed */}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'manutencao' && (
            <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-8 items-end justify-between bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Filtrar por Veículo</label>
                    <select
                      value={maintenanceFilter}
                      onChange={(e) => setMaintenanceFilter(e.target.value)}
                      className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 earance-none cursor-pointer"
                    >
                      <option value="todos">Todos os Veículos</option>
                      {myVehicles.map(v => (
                        <option key={v.id} value={v.model}>{v.model} ({v.plate})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Período</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="date" className="bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 text-xs" />
                      <input type="date" className="bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 text-xs" />
                    </div>
                  </div>
                </div>
                <button className="px-10 py-5 bg-neutral-950 text-white text-[10px] uppercase tracking-widest font-black rounded-2xl hover:bg-[#C5A059] transition-all flex items-center gap-3">
                  <Search size={14} /> Aplicar Filtros
                </button>
              </div>

              {/* List */}
              <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-100">
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Serviço / Data</th>
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Veículo</th>
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400 text-right">Custo</th>
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Status</th>
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {filteredMaintenances.map((m) => (
                        <tr key={m.id} className="group hover:bg-neutral-50/50 transition-colors">
                          <td className="px-10 py-8">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-neutral-950 text-[#C5A059] rounded-xl flex items-center justify-center shadow-lg">
                                {m.icon}
                              </div>
                              <div>
                                <p className="text-sm font-black text-neutral-900">{m.type}</p>
                                <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">{formatDate(m.date)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-8">
                            <p className="text-xs font-bold text-neutral-900">{m.vehicle}</p>
                            <p className="text-[9px] uppercase tracking-widest text-[#C5A059] font-black">{m.plate}</p>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <p className="text-sm font-black text-neutral-900">{m.cost}</p>
                          </td>
                          <td className="px-10 py-8">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${m.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="px-10 py-8">
                            <button className="text-[10px] uppercase tracking-widest font-black text-neutral-400 hover:text-neutral-900 transition-colors underline">Ver Comprovante</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pagamentos' && (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-700">
              <div className="grid grid-cols-1 gap-8">
                {dividendHistory.map((d) => {
                  const totalDiscounts = d.discounts.maintenance + d.discounts.insurance + d.discounts.protection + (d.discounts.other || 0);
                  const netValue = d.gross - d.adminTax - totalDiscounts;

                  // Utility to extract URL from notes if present
                  const extractUrl = (text) => {
                    if (!text) return null;
                    const match = text.match(/https?:\/\/[^\s)\],;]+/);
                    return match ? match[0] : null;
                  };

                  const invoiceUrl = d.realPayout?.invoice_url || d.realPayout?.nota_fiscal || d.realPayout?.nota_fiscal_url || (extractUrl(d.realPayout?.notes) && d.realPayout?.notes?.toLowerCase().includes('nota') ? extractUrl(d.realPayout?.notes) : null);

                  const receiptUrl = d.realPayout?.receipt_url || d.realPayout?.recibo || d.realPayout?.recibo_url || d.realPayout?.comprovante_url || (extractUrl(d.realPayout?.notes) && (d.realPayout?.notes?.toLowerCase().includes('recibo') || d.realPayout?.notes?.toLowerCase().includes('comprovante') || !d.realPayout?.notes?.toLowerCase().includes('nota')) ? extractUrl(d.realPayout?.notes) : null);

                  const myVehiclePlates = myVehicles.map(v => v.plate).filter(Boolean);
                  const myVehicleIds = myVehicles.map(v => v.id).filter(Boolean);

                  const monthServiceOrders = serviceOrders.filter(so => {
                    const plateMatch = so.plate && myVehiclePlates.includes(so.plate);
                    const idMatch = so.vehicleId && myVehicleIds.includes(so.vehicleId);
                    if (!plateMatch && !idMatch) return false;
                    if (!so.date) return false;
                    const soMonth = so.date.split('T')[0].substring(0, 7);
                    return soMonth === d.refMonthStr;
                  });

                  const monthRentalsWithDocs = rentals.filter(r => {
                    const plateMatch = r.plate && myVehiclePlates.includes(r.plate);
                    const idMatch = r.vehicleId && myVehicleIds.includes(r.vehicleId);
                    if (!plateMatch && !idMatch) return false;
                    const startMonth = r.startDate ? r.startDate.substring(0, 7) : null;
                    const endMonth = r.endDate ? r.endDate.substring(0, 7) : null;
                    const hasDoc = r.signedContract || r.contratoAssinado || r.docs?.signedContract || r.documentos?.signedContract;
                    if (!hasDoc) return false;
                    if (startMonth && startMonth <= d.refMonthStr) {
                      if (!endMonth || endMonth >= d.refMonthStr || r.status === 'Ativo') {
                        return true;
                      }
                    }
                    return false;
                  });

                  const docsList = [];
                  if (invoiceUrl) {
                    docsList.push({ type: 'invoice', label: 'Nota Fiscal', url: invoiceUrl });
                  }
                  if (receiptUrl) {
                    docsList.push({ type: 'receipt', label: 'Recibo Repasse', url: receiptUrl });
                  }
                  if (monthServiceOrders.length > 0) {
                    docsList.push({ type: 'service_order', label: 'Ordem Serviço', orders: monthServiceOrders });
                  }
                  if (monthRentalsWithDocs.length > 0) {
                    const urls = monthRentalsWithDocs.map(r => r.signedContract || r.contratoAssinado || r.docs?.signedContract || r.documentos?.signedContract).filter(Boolean);
                    if (urls.length > 0) {
                      docsList.push({ type: 'vehicle_doc', label: 'Docs Veículo', url: urls[0], urls: urls });
                    }
                  }

                  return (
                    <div key={d.id} className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
                      <div className="p-10 md:w-1/3 bg-neutral-50 border-r border-neutral-100 flex flex-col justify-between">
                        <div>
                          <EditorialLabel className="text-neutral-400 mb-2">Período de Referência</EditorialLabel>
                          <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">{d.period}</h3>
                          <div className="mt-4">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${d.status === 'pago' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {d.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-12 space-y-4">
                          <div className="flex justify-between items-end">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                              {d.realPayout ? 'Data do Repasse Realizado' : 'Data Prevista'}
                            </p>
                            <p className="text-sm font-black text-neutral-900">{d.date}</p>
                          </div>
                          <div className="h-[1px] bg-neutral-200" />
                          <div className="flex justify-between items-end">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Valor Líquido</p>
                            <p className="text-3xl font-black text-[#C5A059]">
                              R$ {(d.realPayout ? parseFloat(d.realPayout.amount) : d.netValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          {d.realPayout && (
                            <div className="p-3 mt-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[9px] uppercase tracking-widest text-emerald-700 font-black">Repasse Confirmado</p>
                                <p className="text-xs text-emerald-600 font-medium mt-0.5">
                                  Enviado via PIX: <strong>{d.realPayout.pix_key || 'Não informado'}</strong>
                                </p>
                                {d.realPayout.notes && (
                                  <p className="text-[10px] text-emerald-600/70 italic mt-1">"{d.realPayout.notes}"</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 p-10 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                          <div className="space-y-6">
                            <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-neutral-300 border-b pb-2">Composição de Receita</h4>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-neutral-500 font-medium">Valor Bruto (Aluguéis)</span>
                              <span className="font-black text-neutral-900">R$ {d.gross.toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-red-500">
                              <span className="font-medium">Taxa Adm. (Gestão)</span>
                              <span className="font-black">- R$ {d.adminTax.toLocaleString('pt-BR')}</span>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-neutral-300 border-b pb-2">Retenções e Descontos</h4>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-500">Manutenção Corretiva</span>
                                <span className="font-bold text-red-400">- R$ {d.discounts.maintenance.toLocaleString('pt-BR')}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-500">Seguro Franquia (Fixo)</span>
                                <span className="font-bold text-red-400">- R$ {d.discounts.insurance.toLocaleString('pt-BR')}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-500">Proteção Veicular</span>
                                <span className="font-bold text-red-400">- R$ {d.discounts.protection.toLocaleString('pt-BR')}</span>
                              </div>
                              {(d.discounts.other || 0) > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-neutral-500 font-bold">Outros Abatimentos</span>
                                  <span className="font-bold text-red-400">- R$ {d.discounts.other.toLocaleString('pt-BR')}</span>
                                </div>
                              )}
                              {(d.discounts.carriedDebt || 0) < 0 && (
                                <div className="flex justify-between items-center text-xs p-2 bg-amber-50 rounded-lg border border-amber-100">
                                  <span className="text-amber-700 font-bold flex items-center gap-1">Dívida Meses Anteriores</span>
                                  <span className="font-black text-amber-600">- R$ {Math.abs(d.discounts.carriedDebt).toLocaleString('pt-BR')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {docsList.length > 0 && (
                          <div className="bg-neutral-950 p-8 rounded-[2rem] text-white">
                            <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-[#C5A059] mb-6 flex items-center gap-2">
                              <FileText size={14} /> 📎 Documentos e Anexos Vinculados
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {docsList.map(doc => {
                                if (doc.type === 'service_order') {
                                  return (
                                    <button 
                                      key={doc.label} 
                                      onClick={() => setSoListModal({ monthLabel: d.period, orders: doc.orders })}
                                      className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-[#C5A059] transition-all text-left group cursor-pointer"
                                    >
                                      <p className="text-[9px] uppercase tracking-widest text-neutral-500 group-hover:text-[#C5A059] transition-colors">{doc.label}</p>
                                      <p className="text-[10px] font-bold mt-1 text-white flex items-center gap-1.5">
                                        <Eye size={12} className="text-[#C5A059]" /> Visualizar ({doc.orders.length})
                                      </p>
                                    </button>
                                  );
                                } else {
                                  return (
                                    <a 
                                      key={doc.label}
                                      href={doc.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-[#C5A059] transition-all text-left group block cursor-pointer"
                                    >
                                      <p className="text-[9px] uppercase tracking-widest text-neutral-500 group-hover:text-[#C5A059] transition-colors">{doc.label}</p>
                                      <p className="text-[10px] font-bold mt-1 text-white">Download PDF</p>
                                    </a>
                                  );
                                }
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal - Lista de Ordens de Serviço */}
      {soListModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm" onClick={() => setSoListModal(null)} />
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center shrink-0">
              <div>
                <h4 className="text-lg font-black uppercase tracking-tighter text-neutral-900">Ordens de Serviço</h4>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">{soListModal.monthLabel}</p>
              </div>
              <button onClick={() => setSoListModal(null)} className="text-neutral-300 hover:text-neutral-900"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {soListModal.orders.map(os => (
                <div key={os.id} className="p-5 border border-neutral-100 rounded-2xl hover:border-[#C5A059] transition-all flex justify-between items-center bg-neutral-50/50">
                  <div>
                    <h5 className="text-sm font-black text-neutral-950">{os.plate} — {os.model}</h5>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">{formatDate(os.date)}</p>
                    <p className="text-xs text-neutral-600 mt-2 line-clamp-1">{os.description}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setViewingSO(os);
                    }}
                    className="p-3 bg-neutral-900 text-[#C5A059] rounded-xl hover:bg-[#C5A059] hover:text-neutral-950 transition-all flex items-center justify-center shrink-0 active:scale-95 cursor-pointer"
                    title="Visualizar OS"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-neutral-50 bg-neutral-50/30 flex justify-end shrink-0">
              <button onClick={() => setSoListModal(null)} className="px-8 py-3 bg-neutral-950 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#C5A059] hover:text-neutral-950 transition-all shadow-xl cursor-pointer">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Detalhe de Ordem de Serviço (Modo Leitura e Impressão) */}
      {viewingSO && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm" onClick={() => setViewingSO(null)} />
          <div className="bg-white w-full max-w-3xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 border-b border-neutral-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059]">
                  <Wrench size={22} />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tighter">O.S. #{viewingSO.id?.toString().slice(-6)}</h4>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">{viewingSO.plate} — {viewingSO.model}</p>
                </div>
              </div>
              <button onClick={() => setViewingSO(null)} className="text-neutral-300 hover:text-neutral-900"><X size={24} /></button>
            </div>

            <div id="os-print-area" className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 md:space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[['Data', formatDate(viewingSO.date)], ['KM', `${viewingSO.km || '---'} km`], ['Responsável', viewingSO.responsible], ['Prestador', viewingSO.provider || '---']].map(([label, val]) => (
                  <div key={label} className="bg-neutral-50 p-4 rounded-2xl">
                    <p className="text-[8px] uppercase text-neutral-400 font-black">{label}</p>
                    <p className="text-sm font-black text-neutral-900 mt-1">{val}</p>
                  </div>
                ))}
              </div>
              
              <div className="bg-neutral-50 p-6 rounded-2xl">
                <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-2">Descrição do Serviço</p>
                <p className="text-sm text-neutral-700 leading-relaxed">{viewingSO.description}</p>
              </div>

              {viewingSO.parts?.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-3">Peças Utilizadas</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead>
                        <tr className="border-b border-neutral-100">
                          <th className="py-2 font-black text-neutral-400 uppercase text-[9px]">Peça</th>
                          <th className="py-2 font-black text-neutral-400 uppercase text-[9px] text-center">Qtd</th>
                          <th className="py-2 font-black text-neutral-400 uppercase text-[9px] text-right">Valor Unit.</th>
                          <th className="py-2 font-black text-neutral-400 uppercase text-[9px] text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {viewingSO.parts.map((p, i) => {
                          const unitVal = typeof p.unitValue === 'number' ? p.unitValue : parseCurrency(p.unitValue || 0) || 0;
                          return (
                            <tr key={i}>
                              <td className="py-3 font-bold">{p.name}</td>
                              <td className="py-3 text-center">{p.qty}</td>
                              <td className="py-3 text-right">R$ {unitVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 text-right font-black">R$ {(p.qty * unitVal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-neutral-900 p-8 rounded-[2rem] flex justify-between items-end">
                <div className="space-y-1">
                  {(() => {
                    const laborVal = typeof viewingSO.laborValue === 'number' ? viewingSO.laborValue : parseCurrency(viewingSO.laborValue || 0) || 0;
                    const partsSum = (viewingSO.parts || []).reduce((a, p) => {
                      const unitVal = typeof p.unitValue === 'number' ? p.unitValue : parseCurrency(p.unitValue || 0) || 0;
                      return a + ((p.qty || 0) * unitVal);
                    }, 0);
                    return (
                      <>
                        <p className="text-[9px] text-neutral-500 uppercase font-black">Mão de Obra: <span className="text-white">R$ {laborVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                        <p className="text-[9px] text-neutral-500 uppercase font-black">Peças: <span className="text-white">R$ {partsSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                      </>
                    );
                  })()}
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-neutral-400 uppercase font-black">Total da O.S.</p>
                  <p className="text-3xl font-black text-[#C5A059]">{(viewingSO.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-neutral-50 bg-neutral-50/30 flex justify-between items-center shrink-0">
              <button onClick={() => window.print()} className="px-6 py-3 border border-neutral-200 text-neutral-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-neutral-50 transition-all flex items-center gap-2 cursor-pointer">
                <Printer size={14} /> Imprimir / PDF
              </button>
              <button onClick={() => setViewingSO(null)} className="px-8 py-3 bg-neutral-950 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#C5A059] hover:text-neutral-950 transition-all shadow-xl cursor-pointer">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorDashboard;
