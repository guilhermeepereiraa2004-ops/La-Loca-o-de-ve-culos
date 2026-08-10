import React, { useState, useEffect } from 'react';
import { 
  X, Menu, TrendingUp, Car, Wrench, Wallet, Calendar, 
  Search, FileText, ShieldCheck, CheckCircle2, Printer, Eye, PieChart, Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
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

const InvestorDashboard = ({ investor, transactions = [], vehicles = [], serviceOrders = [], rentals = [], maintenances = [], onLogout, onGoHome }) => {
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
    const isSpecialAutoTrans = cat.includes('seguro') || cat.includes('franquia') || cat.includes('proteç') || cat.includes('protec');
    
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
      const isSpecialAutoTrans = cat.includes('seguro') || cat.includes('franquia') || cat.includes('proteç') || cat.includes('protec');
      return t.type === 'in' && !isSpecialAutoTrans;
    })
    .reduce((acc, t) => acc + Math.abs(t.val || 0), 0);

  const realInvestorExpenses = investorTransactions
    .filter(t => {
      const cat = t.cat?.toLowerCase().trim() || '';
      const isSpecialAutoTrans = cat.includes('seguro') || cat.includes('franquia') || cat.includes('proteç') || cat.includes('protec');
      const isBeforeJune2026 = t.date && t.date < '2026-06-01';
      if (isBeforeJune2026) return false;
      return t.type === 'out' || isSpecialAutoTrans;
    })
    .reduce((acc, t) => acc + Math.abs(t.val || 0), 0);

  // Maintenance history from transactions
  const maintenanceHistory = transactions
    .filter(t => (t.cat?.toLowerCase().includes('manuten') || t.desc?.toLowerCase().includes('manuten')) && myVehicles.some(v => v.plate === t.vehiclePlate))
    .filter(t => !(t.date && t.date < '2026-06-01'))
    .map(t => {
      let osId = null;
      const match = t.desc?.match(/\[Manutenção #([^\]]+)\]/i);
      if (match && maintenances) {
        const mId = match[1];
        const maint = maintenances.find(m => String(m.id) === String(mId));
        if (maint && maint.observations) {
          const osMatch = maint.observations.match(/O\.S\. #([^\s]+)/i);
          if (osMatch) {
            osId = osMatch[1];
          }
        }
      }

      return {
        id: t.id,
        vehicle: vehicles.find(v => v.plate === t.vehiclePlate)?.model || 'Veículo',
        plate: t.vehiclePlate,
        type: t.desc,
        date: t.date,
        cost: `R$ -${Math.abs(t.val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        status: t.status === 'pago' || t.status === 'Concluído' ? 'Concluído' : 'Em Aberto',
        icon: <Wrench size={16} />,
        osId
      };
    });

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
          gross: 0, adminTax: 0, maintenance: 0, protection: 0, insurance: 0, other: 0, net: 0, vehicles: {}
        };
      }
      
      const cat = t.cat?.toLowerCase().trim() || '';
      const val = Math.abs(t.val || 0);
      const plate = t.vehiclePlate || 'GERAL';
      
      if (!monthlyPerformance[monthKey].vehicles[plate]) {
        const vRef = myVehicles.find(v => v.plate === plate);
        monthlyPerformance[monthKey].vehicles[plate] = {
          plate,
          model: vRef ? vRef.model : (plate === 'GERAL' ? 'Outros (Não vinculado)' : plate),
          gross: 0, adminTax: 0, maintenance: 0, protection: 0, insurance: 0, other: 0, net: 0
        };
      }
      
      const vPerf = monthlyPerformance[monthKey].vehicles[plate];
      const isSeguroFranquia = cat.includes('seguro') || cat.includes('franquia');
      const isProtecaoVeicular = cat.includes('proteç') || cat.includes('protec');
      const isBeforeJune2026 = t.date && t.date < '2026-06-01';

      if (isSeguroFranquia) {
        if (!isBeforeJune2026) {
          monthlyPerformance[monthKey].insurance += val;
          monthlyPerformance[monthKey].net -= val;
          vPerf.insurance += val;
          vPerf.net -= val;
        }
      } else if (isProtecaoVeicular) {
        if (!isBeforeJune2026) {
          monthlyPerformance[monthKey].protection += val;
          monthlyPerformance[monthKey].net -= val;
          vPerf.protection += val;
          vPerf.net -= val;
        }
      } else if (t.type === 'in') {
        if (cat === 'taxa adm') {
          monthlyPerformance[monthKey].adminTax += val;
          monthlyPerformance[monthKey].net -= val;
          vPerf.adminTax += val;
          vPerf.net -= val;
        } else {
          monthlyPerformance[monthKey].gross += val;
          vPerf.gross += val;
          const v = t.vehiclePlate ? myVehicles.find(veh => veh.plate === t.vehiclePlate) : null;
          const taxRate = v ? (parseFloat(v.adminTax || 20) / 100) : 0;
          const calculatedTax = val * taxRate;
          monthlyPerformance[monthKey].adminTax += calculatedTax;
          monthlyPerformance[monthKey].net += val;
          monthlyPerformance[monthKey].net -= calculatedTax;
          
          vPerf.adminTax += calculatedTax;
          vPerf.net += val;
          vPerf.net -= calculatedTax;
        }
      } else if (t.type === 'out') {
        if (!isBeforeJune2026) {
          monthlyPerformance[monthKey].net -= val;
          vPerf.net -= val;
          if (cat.includes('manuten')) {
            monthlyPerformance[monthKey].maintenance += val;
            vPerf.maintenance += val;
          } else {
            monthlyPerformance[monthKey].other += val;
            vPerf.other += val;
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
        realPayout,
        vehicles: perf?.vehicles || {}
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
        return <span className="px-3 py-1 bg-amber-950/50 border border-amber-900 text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-full">{status}</span>;
      case 'manutenção': 
        return <span className="px-3 py-1 bg-red-950/80 border border-red-500/30 shadow-[0_0_10px_rgba(248,113,113,0.15)] text-red-400 text-[9px] font-black uppercase tracking-widest rounded-full">Manutenção</span>;
      case 'indisponível': 
        return <span className="px-3 py-1 bg-red-950/80 border border-red-500/30 shadow-[0_0_10px_rgba(248,113,113,0.15)] text-red-400 text-[9px] font-black uppercase tracking-widest rounded-full">Indisponível</span>;
      case 'disponível': 
        return <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/30 shadow-[0_0_10px_rgba(0,230,118,0.15)] text-[#00E676] drop-shadow-sm text-[9px] font-black uppercase tracking-widest rounded-full">Disponível</span>;
      default: 
        return status ? <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/30 shadow-[0_0_10px_rgba(0,230,118,0.15)] text-[#00E676] drop-shadow-sm text-[9px] font-black uppercase tracking-widest rounded-full">{status}</span> : null;
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
    <div className="min-h-screen bg-[#0a0a0a] flex font-sans relative">
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-6 right-6 z-[60] xl:hidden bg-neutral-950 text-[#D4AF37] p-4 rounded-full shadow-2xl border border-neutral-800"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`bg-black border-r border-neutral-900 text-white flex flex-col p-8 fixed h-full z-50 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-0 opacity-0 xl:w-20 xl:translate-x-0 xl:opacity-100'}`}>
        <div className={`mb-16 transition-all duration-300 ${!isSidebarOpen ? 'xl:opacity-0' : 'opacity-100'}`}>
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="h-6 w-auto object-contain" alt="L.A Locação de Veículos" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37] leading-tight">L.A VEÍCULOS</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Portal Investidor</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-4">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: PieChart },
            { id: 'rendimentos', label: 'Rendimentos', icon: TrendingUp },
            { id: 'metricas', label: 'Métricas', icon: Activity },
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
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-[#D4AF37] text-neutral-950 font-black' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-neutral-950' : 'group-hover:text-[#D4AF37]'} />
              <span className={`text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-neutral-900 pt-4 mt-auto space-y-2">
          <button
            onClick={onGoHome}
            className="flex items-center gap-4 p-4 text-neutral-500 hover:text-[#D4AF37] transition-colors w-full"
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
          {activeTab === 'dashboard' && (
            <div className="space-y-12">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
                <div>
                  <EditorialLabel className="text-[#D4AF37] mb-2">Bem-vindo de volta,</EditorialLabel>
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">{investor?.name || 'Investidor'}</h2>
                </div>
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Total de Ativos</p>
                    <p className="text-xl md:text-2xl font-black text-white">{myVehicles.length} Veículos</p>
                  </div>
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-neutral-900 border border-neutral-800 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-sm">
                    <Car size={24} className="text-[#D4AF37]" />
                  </div>
                </div>
              </header>
              {/* Payment Schedule Banner */}
              <div className="bg-neutral-900 rounded-3xl p-8 mb-10 border border-[#D4AF37]/30 shadow-[0_0_25px_rgba(212,175,55,0.15)] hover:shadow-[0_0_35px_rgba(212,175,55,0.25)] transition-shadow relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.8)]" />
                <div className="flex items-center gap-6 z-10 pl-2">
                  <div className="w-12 h-12 rounded-xl bg-[#0a0a0a] flex items-center justify-center text-neutral-500 border border-neutral-800">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Cronograma de Repasse</p>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
                      Próximo Pagamento: <span className="text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]">{nextPaymentDate.toLocaleDateString('pt-BR')}</span>
                    </h2>
                    <p className="text-neutral-400 text-[10px] mt-2 font-bold uppercase tracking-widest">
                      Regra: 5º Dia Útil de cada mês — Processamento Automático
                    </p>
                  </div>
                </div>
                <div className="hidden lg:block h-12 w-[1px] bg-neutral-800" />
                <div className="text-center md:text-right z-10 pr-4">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-2">Status do Ciclo</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 shadow-[0_0_10px_rgba(0,230,118,0.15)] border border-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 shadow-[0_0_10px_rgba(0,230,118,0.15)]0 animate-pulse" />
                    <span className="text-[10px] font-bold text-[#00E676] drop-shadow-sm uppercase tracking-widest">Aguardando Fechamento</span>
                  </div>
                </div>
              </div>
              {/* Top Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-neutral-900 p-8 rounded-3xl border border-neutral-600/50 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-shadow group">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-4">Valor Total Investido</p>
                  <p className="text-2xl font-bold font-mono text-white drop-shadow-md">R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <div className="mt-4 h-1 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#D4AF37] w-3/4 shadow-[0_0_15px_rgba(212,175,55,0.8)]" />
                  </div>
                </div>
                <div className={`bg-neutral-900 p-8 rounded-3xl border transition-shadow group ${currentMonthDividends > 0 ? 'border-[#00E676]/30 shadow-[0_0_25px_rgba(0,230,118,0.3)] hover:shadow-[0_0_35px_rgba(0,230,118,0.5)]' : currentMonthDividends < 0 ? 'border-red-800/60 shadow-[0_0_25px_rgba(248,113,113,0.3)] hover:shadow-[0_0_35px_rgba(248,113,113,0.5)]' : 'border-neutral-600/50 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]'}`}>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-4">Dividendos (Mês Atual)</p>
                  <p className={`text-2xl font-bold font-mono ${currentMonthDividends > 0 ? 'text-[#00E676] drop-shadow-[0_0_10px_rgba(0,230,118,0.4)]' : currentMonthDividends < 0 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]' : 'text-white drop-shadow-md'}`}>
                    R$ {currentMonthDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mt-2 flex items-center gap-1">
                    <TrendingUp size={10} className={currentMonthDividends >= 0 ? "text-[#00E676]" : "text-red-500"} /> 
                    <span className={currentMonthDividends >= 0 ? "text-[#00E676]" : "text-red-500"}>
                      Ciclo Atual
                    </span>
                  </p>
                </div>
                <div className={`bg-neutral-900 p-8 rounded-3xl border transition-shadow group ${yearDividends > 0 ? 'border-[#00E676]/30 shadow-[0_0_25px_rgba(0,230,118,0.3)] hover:shadow-[0_0_35px_rgba(0,230,118,0.5)]' : yearDividends < 0 ? 'border-red-800/60 shadow-[0_0_25px_rgba(248,113,113,0.3)] hover:shadow-[0_0_35px_rgba(248,113,113,0.5)]' : 'border-neutral-600/50 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]'}`}>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-4">Acumulado no Ano</p>
                  <p className={`text-2xl font-bold font-mono ${yearDividends > 0 ? 'text-[#00E676] drop-shadow-[0_0_10px_rgba(0,230,118,0.4)]' : yearDividends < 0 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]' : 'text-white drop-shadow-md'}`}>
                    R$ {yearDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.8)]" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Ano Fiscal 2026</span>
                  </div>
                </div>
                <div className="bg-neutral-900 p-8 rounded-3xl border border-[#D4AF37]/50 shadow-[0_0_25px_rgba(212,175,55,0.3)] hover:shadow-[0_0_35px_rgba(212,175,55,0.5)] transition-shadow group">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-4">Rendimento Médio</p>
                  <p className="text-2xl font-bold font-mono text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]">{avgYield}</p>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mt-2">Mensal (Real)</p>
                </div>
              </div>

              {/* Graphs Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="md:col-span-3 bg-neutral-900 p-10 rounded-3xl border border-neutral-800 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold uppercase tracking-tight text-white">Dividendos Mês a Mês</h3>
                    <EditorialLabel className="text-neutral-400">Rendimentos em R$</EditorialLabel>
                  </div>
                  <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={graphBars} margin={{ top: 50, right: 30, left: 30, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#F5F5F5" />
                        <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a3a3a3', fontWeight: 700 }} dy={15} />
                        <YAxis hide={true} domain={['dataMin - (dataMin * 0.1)', 'dataMax + (dataMax * 0.1)']} />
                        <Tooltip 
                          cursor={{ stroke: '#404040', strokeWidth: 1, strokeDasharray: '3 3' }} 
                          contentStyle={{ backgroundColor: '#171717',  borderRadius: '12px', border: '1px solid #404040', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}
                          formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Dividendo Líquido']}
                          labelStyle={{ color: '#737373', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}
                        />
                        <Line type="monotone" dataKey="v" stroke="#D4AF37" strokeWidth={4} activeDot={{ r: 8, fill: '#ffffff', stroke: '#D4AF37', strokeWidth: 3 }} dot={{ r: 5, fill: '#D4AF37', strokeWidth: 0 }} animationDuration={1500}>
                          <LabelList 
                            dataKey="v" 
                            position="top" 
                            offset={15}
                            formatter={(val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            style={{ fontSize: '11px', fill: '#ffffff', fontWeight: 'bold', fontFamily: 'monospace' }} 
                          />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rendimentos' && (
            <div className="space-y-12">
              <div className="mb-10">
                <EditorialLabel className="text-[#D4AF37] mb-2">Relatório Consolidado</EditorialLabel>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-white">Rendimentos por Veículo</h2>
              </div>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto bg-neutral-900 rounded-3xl border border-neutral-800 shadow-sm">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-[#0a0a0a]/80 text-[10px] uppercase tracking-widest text-neutral-500">
                      <th className="p-6 font-bold">Ativo (Veículo)</th>
                      <th className="p-6 font-bold text-center">Rentabilidade (%)</th>
                      <th className="p-6 font-bold text-right">Valor Investido</th>
                      <th className="p-6 font-bold text-right">Rendimento Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {myVehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-[#0a0a0a] transition-colors group">
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-800 shrink-0">
                              <img
                                src={v.image || '/logo-new.png'}
                                className="w-full h-full object-cover opacity-100 transition-all"
                                alt={v.model}
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo-new.png'; e.currentTarget.style.objectFit = 'contain'; e.currentTarget.style.padding = '2px'; e.currentTarget.style.background = '#000000'; }}
                                style={v.image === '/logo-new.png' ? { objectFit: 'contain', padding: '2px', background: 'transparent' } : {}}
                              />
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-white">{v.model}</p>
                              <p className="text-[10px] font-mono font-medium text-neutral-500 mt-0.5">{v.plate}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          {v.currentYield > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-950/80 border border-emerald-500/30 shadow-[0_0_10px_rgba(0,230,118,0.15)] text-[#00E676] drop-shadow-sm">
                              {v.yieldPerc}
                            </span>
                          ) : v.currentYield < 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-950/80 border border-red-500/30 shadow-[0_0_10px_rgba(248,113,113,0.15)] text-red-400">
                              {v.yieldPerc}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-neutral-100 text-neutral-500">
                              0.00%
                            </span>
                          )}
                        </td>
                        <td className="p-6 text-right">
                          <p className="text-sm font-semibold font-mono text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                            R$ {Number(v.investValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </td>
                        <td className="p-6 text-right">
                          {v.currentYield > 0 ? (
                            <p className="text-sm font-bold font-mono text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                              R$ {v.currentYield.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          ) : v.currentYield < 0 ? (
                            <p className="text-sm font-bold font-mono text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]">
                              - R$ {Math.abs(v.currentYield).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          ) : (
                            <p className="text-sm font-medium font-mono text-neutral-500 drop-shadow-sm">R$ 0,00</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden flex flex-col gap-4">
                {myVehicles.map((v) => (
                  <div key={`mobile-${v.id}`} className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-sm">
                    <div className="p-5 flex items-center gap-4 bg-black/40 border-b border-neutral-800">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-800 shrink-0">
                        <img
                          src={v.image || '/logo-new.png'}
                          className="w-full h-full object-cover opacity-100 transition-all"
                          alt={v.model}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo-new.png'; e.currentTarget.style.objectFit = 'contain'; e.currentTarget.style.padding = '2px'; e.currentTarget.style.background = '#000000'; }}
                          style={v.image === '/logo-new.png' ? { objectFit: 'contain', padding: '2px', background: 'transparent' } : {}}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black uppercase text-white tracking-widest">{v.model}</p>
                        <p className="text-[10px] font-mono text-neutral-500 mt-0.5">{v.plate}</p>
                      </div>
                      <div>
                        {v.currentYield > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-950/80 border border-emerald-500/30 text-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.15)] drop-shadow-sm">
                            {v.yieldPerc}
                          </span>
                        ) : v.currentYield < 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-950/80 border border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.15)]">
                            {v.yieldPerc}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-neutral-100 text-neutral-500">
                            0.00%
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-5 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Investido</p>
                        <p className="text-sm font-semibold font-mono text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                          R$ {Number(v.investValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Rend. Líquido</p>
                        {v.currentYield > 0 ? (
                          <p className="text-sm font-bold font-mono text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                            R$ {v.currentYield.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        ) : v.currentYield < 0 ? (
                          <p className="text-sm font-bold font-mono text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]">
                            - R$ {Math.abs(v.currentYield).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        ) : (
                          <p className="text-sm font-medium font-mono text-neutral-500 drop-shadow-sm">R$ 0,00</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {myVehicles.length === 0 && (
                  <div className="p-12 text-center text-neutral-400 text-sm uppercase tracking-widest font-bold">
                    Nenhum veículo encontrado.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'metricas' && (
            <div className="space-y-12">
              <div className="mb-10">
                <EditorialLabel className="text-[#D4AF37] mb-2">Histórico Detalhado</EditorialLabel>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-white">Métricas Mês a Mês</h2>
              </div>
              
              <div className="space-y-8">
                {dividendHistory.map(month => {
                  const vehicles = Object.values(month.vehicles);
                  if (vehicles.length === 0) return null;
                  
                  return (
                    <div key={month.period} className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-sm">
                      <div className="p-6 bg-black border-b border-neutral-800 flex justify-between items-center">
                        <h3 className="text-lg font-black uppercase text-white tracking-widest">{month.period}</h3>
                        <span className="text-[10px] font-bold text-[#D4AF37] tracking-widest uppercase">
                          Líquido Mês: R$ {month.netValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-neutral-800 bg-[#0a0a0a]/50 text-[10px] uppercase tracking-widest text-neutral-500">
                              <th className="p-4 font-bold">Veículo</th>
                              <th className="p-4 font-bold text-right">Bruto</th>
                              <th className="p-4 font-bold text-right">Tx. Admin</th>
                              <th className="p-4 font-bold text-right">Manut.</th>
                              <th className="p-4 font-bold text-right">Proteção/Seg.</th>
                              <th className="p-4 font-bold text-right">Líquido</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-800">
                            {vehicles.map(v => (
                              <tr key={v.plate} className="hover:bg-[#0a0a0a] transition-colors">
                                <td className="p-4">
                                  <p className="text-[11px] font-bold uppercase text-white">{v.model}</p>
                                  <p className="text-[9px] font-mono text-neutral-500">{v.plate}</p>
                                </td>
                                <td className="p-4 text-right text-[11px] font-mono text-neutral-300">
                                  R$ {v.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-right text-[11px] font-mono text-amber-500/70">
                                  - R$ {v.adminTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-right text-[11px] font-mono text-red-400/70">
                                  - R$ {v.maintenance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-right text-[11px] font-mono text-amber-500/70">
                                  - R$ {(v.protection + v.insurance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-right text-[11px] font-mono font-bold text-[#00E676]">
                                  R$ {v.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden flex flex-col divide-y divide-neutral-800">
                        {vehicles.map(v => (
                          <div key={v.plate} className="p-5 flex flex-col gap-4 hover:bg-[#0a0a0a] transition-colors">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-black uppercase text-white tracking-widest">{v.model}</p>
                                <p className="text-[10px] font-mono text-neutral-500 mt-1">{v.plate}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Líquido</p>
                                <p className="text-sm font-mono font-black text-[#00E676]">
                                  R$ {v.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 bg-black/50 p-4 rounded-2xl border border-neutral-800/50">
                              <div>
                                <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Bruto</p>
                                <p className="text-[11px] font-mono text-neutral-300">R$ {v.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Tx. Admin</p>
                                <p className="text-[11px] font-mono text-amber-500/70">- R$ {v.adminTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Manutenção</p>
                                <p className="text-[11px] font-mono text-red-400/70">- R$ {v.maintenance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Proteção/Seg.</p>
                                <p className="text-[11px] font-mono text-amber-500/70">- R$ {(v.protection + v.insurance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {dividendHistory.length === 0 && (
                  <div className="p-12 text-center text-neutral-400 text-sm uppercase tracking-widest font-bold bg-neutral-900 rounded-3xl border border-neutral-800">
                    Nenhum histórico de rendimentos encontrado.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'minha-frota' && (
            <div className="space-y-12">
              <div className="mb-10">
                <EditorialLabel className="text-[#D4AF37] mb-2">Gestão de Patrimônio</EditorialLabel>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-white">Minha Frota</h2>
              </div>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto bg-neutral-900 rounded-3xl border border-neutral-800 shadow-sm">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-[#0a0a0a]/80 text-[10px] uppercase tracking-widest text-neutral-500">
                      <th className="p-6 font-bold">Ativo (Veículo)</th>
                      <th className="p-6 font-bold text-center">Status Operacional</th>
                      <th className="p-6 font-bold text-center">Ano</th>
                      <th className="p-6 font-bold text-right">Taxa Investidor</th>
                      <th className="p-6 font-bold text-right">Valor Aportado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {myVehicles.map((v, idx) => (
                      <tr key={idx} className="hover:bg-[#0a0a0a] transition-colors group">
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-800 shrink-0">
                              <img
                                src={v.image || '/logo-new.png'}
                                className="w-full h-full object-cover opacity-100 transition-all"
                                alt={v.model}
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo-new.png'; e.currentTarget.style.objectFit = 'contain'; e.currentTarget.style.padding = '2px'; e.currentTarget.style.background = '#000000'; }}
                                style={v.image === '/logo-new.png' ? { objectFit: 'contain', padding: '2px', background: 'transparent' } : {}}
                              />
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-white">{v.model}</p>
                              <p className="text-[10px] font-mono font-medium text-neutral-500 mt-0.5">{v.plate}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex justify-center">
                            {getStatusBadge(v.status)}
                          </div>
                        </td>
                        <td className="p-6 text-center text-sm font-semibold font-mono text-neutral-400">
                          {v.year}
                        </td>
                        <td className="p-6 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#FF6A00]/10 border border-[#FF6A00]/40 text-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.25)] drop-shadow-[0_0_5px_rgba(255,106,0,0.5)]">
                            {v.investorTax || (100 - (parseFloat(v.adminTax) || 20))}%
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <p className="text-sm font-semibold font-mono text-[#00D0FF] drop-shadow-[0_0_10px_rgba(0,208,255,0.5)]">
                            R$ {Number(v.investValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden flex flex-col gap-4">
                {myVehicles.map((v, idx) => (
                  <div key={`mobile-fleet-${idx}`} className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-sm">
                    <div className="p-5 flex items-center gap-4 bg-black/40 border-b border-neutral-800">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-800 shrink-0">
                        <img
                          src={v.image || '/logo-new.png'}
                          className="w-full h-full object-cover opacity-100 transition-all"
                          alt={v.model}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo-new.png'; e.currentTarget.style.objectFit = 'contain'; e.currentTarget.style.padding = '2px'; e.currentTarget.style.background = '#000000'; }}
                          style={v.image === '/logo-new.png' ? { objectFit: 'contain', padding: '2px', background: 'transparent' } : {}}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black uppercase text-white tracking-widest">{v.model}</p>
                        <p className="text-[10px] font-mono text-neutral-500 mt-0.5">{v.plate}</p>
                      </div>
                      <div>
                        {getStatusBadge(v.status)}
                      </div>
                    </div>
                    
                    <div className="p-5 grid grid-cols-3 gap-4 text-center items-center">
                      <div className="flex flex-col gap-1 items-center justify-center">
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Ano</p>
                        <p className="text-sm font-semibold font-mono text-neutral-400">{v.year}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-center justify-center">
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Taxa</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#FF6A00]/10 border border-[#FF6A00]/40 text-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.25)] drop-shadow-sm">
                          {v.investorTax || (100 - (parseFloat(v.adminTax) || 20))}%
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 items-center justify-center border-l border-neutral-800/50 pl-2">
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Aportado</p>
                        <p className="text-xs font-semibold font-mono text-[#00D0FF] drop-shadow-[0_0_10px_rgba(0,208,255,0.5)]">
                          R$ {Number(v.investValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {myVehicles.length === 0 && (
                  <div className="p-12 text-center text-neutral-400 text-sm uppercase tracking-widest font-bold bg-neutral-900 rounded-3xl border border-neutral-800">
                    Nenhum veículo encontrado na frota.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'manutencao' && (
            <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-8 items-end justify-between bg-black border border-neutral-800 p-8 rounded-[2rem] border border-neutral-800 shadow-sm">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Filtrar por Veículo</label>
                    <select
                      value={maintenanceFilter}
                      onChange={(e) => setMaintenanceFilter(e.target.value)}
                      className="w-full bg-[#0a0a0a] border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-white earance-none cursor-pointer"
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
                      <input type="date" className="bg-[#0a0a0a] border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-white text-xs" />
                      <input type="date" className="bg-[#0a0a0a] border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-white text-xs" />
                    </div>
                  </div>
                </div>
                <button className="px-10 py-5 bg-neutral-800 text-white border border-neutral-700 text-[10px] uppercase tracking-widest font-black rounded-2xl hover:bg-[#D4AF37] transition-all flex items-center gap-3">
                  <Search size={14} /> Aplicar Filtros
                </button>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block bg-neutral-900 rounded-[3rem] border border-neutral-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#0a0a0a] border-b border-neutral-800">
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Serviço / Data</th>
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Veículo</th>
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400 text-right">Custo</th>
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Status</th>
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {filteredMaintenances.map((m) => (
                        <tr key={m.id} className="group hover:bg-[#0a0a0a]/50 transition-colors">
                          <td className="px-10 py-8">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-neutral-950 text-[#D4AF37] rounded-xl flex items-center justify-center shadow-lg">
                                {m.icon}
                              </div>
                              <div>
                                <p className="text-sm font-black text-white">{m.type}</p>
                                <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">{formatDate(m.date)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-8">
                            <p className="text-xs font-bold text-white">{m.vehicle}</p>
                            <p className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-black">{m.plate}</p>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <p className="text-sm font-black text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]">{m.cost.includes('-') ? m.cost : '- ' + m.cost}</p>
                          </td>
                          <td className="px-10 py-8">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${m.status === 'Concluído' ? 'bg-emerald-950/80 border border-emerald-500/30 shadow-[0_0_10px_rgba(0,230,118,0.15)] text-[#00E676] drop-shadow-sm' : 'bg-orange-950/50 border border-orange-900 text-orange-400'}`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="px-10 py-8">
                            {m.osId ? (
                              <button 
                                onClick={() => {
                                  const os = serviceOrders.find(o => String(o.id) === String(m.osId));
                                  if (os) setViewingSO(os);
                                }}
                                className="text-[10px] uppercase tracking-widest font-black text-neutral-400 hover:text-white transition-colors underline"
                              >
                                Ver Comprovante
                              </button>
                            ) : (
                              <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-700">---</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden flex flex-col gap-4">
                {filteredMaintenances.map((m) => (
                  <div key={`mobile-m-${m.id}`} className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-sm">
                    <div className="p-5 flex items-start gap-4 bg-black/40 border-b border-neutral-800">
                      <div className="w-10 h-10 bg-neutral-950 text-[#D4AF37] rounded-xl flex items-center justify-center shadow-lg shrink-0 mt-1">
                        {m.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-white leading-tight">{m.type}</p>
                        <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mt-1">{formatDate(m.date)}</p>
                      </div>
                    </div>
                    
                    <div className="p-5 grid grid-cols-2 gap-4 items-center border-b border-neutral-800/50">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Veículo</p>
                        <p className="text-xs font-bold text-white">{m.vehicle}</p>
                        <p className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-black">{m.plate}</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Status</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${m.status === 'Concluído' ? 'bg-emerald-950/80 border border-emerald-500/30 shadow-[0_0_10px_rgba(0,230,118,0.15)] text-[#00E676] drop-shadow-sm' : 'bg-orange-950/50 border border-orange-900 text-orange-400'}`}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-5 flex justify-between items-center bg-black/20">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Custo</p>
                        <p className="text-sm font-black text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]">
                          {m.cost.includes('-') ? m.cost : '- ' + m.cost}
                        </p>
                      </div>
                      <div>
                        {m.osId ? (
                          <button 
                            onClick={() => {
                              const os = serviceOrders.find(o => String(o.id) === String(m.osId));
                              if (os) setViewingSO(os);
                            }}
                            className="text-[10px] uppercase tracking-widest font-black text-neutral-400 hover:text-white transition-colors underline"
                          >
                            Ver Comprovante
                          </button>
                        ) : (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-700">---</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredMaintenances.length === 0 && (
                  <div className="p-12 text-center text-neutral-400 text-sm uppercase tracking-widest font-bold bg-neutral-900 rounded-3xl border border-neutral-800">
                    Nenhuma manutenção encontrada.
                  </div>
                )}
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
                    <div key={d.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
                      <div className="p-8 md:w-1/3 bg-[#0a0a0a]/50 border-r border-neutral-800 flex flex-col justify-between">
                        <div>
                          <EditorialLabel className="text-neutral-400 mb-2">Período de Referência</EditorialLabel>
                          <h3 className="text-2xl font-bold uppercase tracking-tight text-white">{d.period}</h3>
                          <div className="mt-3">
                            <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${d.status === 'pago' ? 'bg-emerald-950/80 border border-emerald-500/30 shadow-[0_0_10px_rgba(0,230,118,0.15)] text-[#00E676] drop-shadow-sm border-emerald-100' : 'bg-amber-950/50 border border-amber-900 text-amber-400 border-amber-100'}`}>
                              {d.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-10 space-y-4">
                          <div className="flex justify-between items-end">
                            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                              {d.realPayout ? 'Data do Repasse' : 'Data Prevista'}
                            </p>
                            <p className="text-sm font-semibold text-neutral-200">{d.date}</p>
                          </div>
                          <div className="h-[1px] bg-neutral-200/60" />
                          <div className="flex justify-between items-end">
                            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Valor Líquido</p>
                            {(() => {
                              const val = d.realPayout ? parseFloat(d.realPayout.amount) : d.netValue;
                              let colorClass = "text-white drop-shadow-md";
                              if (val > 0) colorClass = "text-[#00E676] drop-shadow-[0_0_10px_rgba(0,230,118,0.4)]";
                              if (val < 0) colorClass = "text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]";
                              return (
                                <p className={`text-2xl font-bold font-mono ${colorClass}`}>
                                  {val < 0 ? 'R$ ' : 'R$ '}
                                  {val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              );
                            })()}
                          </div>
                          {d.realPayout && (
                            <div className="p-3 mt-4 bg-emerald-950/80 border border-emerald-500/30 shadow-[0_0_10px_rgba(0,230,118,0.15)] rounded-lg border border-emerald-100 flex items-start gap-2.5">
                              <CheckCircle2 size={16} className="text-[#00E676] drop-shadow-sm shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[9px] uppercase tracking-wider text-emerald-800 font-bold">Repasse Confirmado</p>
                                <p className="text-[11px] text-[#00E676] drop-shadow-sm font-medium mt-0.5">
                                  PIX: <strong>{d.realPayout.pix_key || 'Não informado'}</strong>
                                </p>
                                {d.realPayout.notes && (
                                  <p className="text-[10px] text-[#00E676] drop-shadow-sm/80 italic mt-1">"{d.realPayout.notes}"</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-4">
                            <h4 className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 border-b border-neutral-800 pb-2">Composição de Receita</h4>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-neutral-400 font-medium">Valor Bruto (Aluguéis)</span>
                              <span className="font-semibold font-mono text-white drop-shadow-md">R$ {d.gross.toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-neutral-200">
                              <span className="font-medium text-neutral-400">Taxa Adm. (Gestão)</span>
                              <span className="font-semibold font-mono text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]">- R$ {d.adminTax.toLocaleString('pt-BR')}</span>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 border-b border-neutral-800 pb-2">Retenções e Descontos</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-400">Manutenção Corretiva</span>
                                <span className="font-semibold font-mono text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]">- R$ {d.discounts.maintenance.toLocaleString('pt-BR')}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-400">Seguro Franquia (Fixo)</span>
                                <span className="font-semibold font-mono text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]">- R$ {d.discounts.insurance.toLocaleString('pt-BR')}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-400">Proteção Veicular</span>
                                <span className="font-semibold font-mono text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]">- R$ {d.discounts.protection.toLocaleString('pt-BR')}</span>
                              </div>
                              {(d.discounts.other || 0) > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-neutral-400 font-medium">Outros Abatimentos</span>
                                  <span className="font-semibold font-mono text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]">- R$ {d.discounts.other.toLocaleString('pt-BR')}</span>
                                </div>
                              )}
                              {(d.discounts.carriedDebt || 0) < 0 && (
                                <div className="flex justify-between items-center text-xs p-2 bg-rose-950/30 rounded-md border border-rose-900/50">
                                  <span className="text-rose-400 font-semibold flex items-center gap-1">Dívida Anterior</span>
                                  <span className="font-bold font-mono text-rose-400">- R$ {Math.abs(d.discounts.carriedDebt).toLocaleString('pt-BR')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {docsList.length > 0 && (
                          <div className="bg-[#0a0a0a] border border-neutral-800 p-6 rounded-xl mt-6">
                            <h4 className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 mb-4 flex items-center gap-2">
                              <FileText size={14} className="text-[#D4AF37]" /> Documentos e Anexos Vinculados
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {docsList.map(doc => {
                                if (doc.type === 'service_order') {
                                  return (
                                    <button 
                                      key={doc.label} 
                                      onClick={() => setSoListModal({ monthLabel: d.period, orders: doc.orders })}
                                      className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-[#D4AF37] hover:shadow-sm transition-all text-left group cursor-pointer"
                                    >
                                      <p className="text-[9px] uppercase tracking-wider text-neutral-500 group-hover:text-[#D4AF37] transition-colors">{doc.label}</p>
                                      <p className="text-[10px] font-semibold mt-1 text-neutral-200 flex items-center gap-1">
                                        <Eye size={12} className="text-[#D4AF37]" /> Visualizar ({doc.orders.length})
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
                                      className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-[#D4AF37] hover:shadow-sm transition-all text-left group block cursor-pointer"
                                    >
                                      <p className="text-[9px] uppercase tracking-wider text-neutral-500 group-hover:text-[#D4AF37] transition-colors">{doc.label}</p>
                                      <p className="text-[10px] font-semibold mt-1 text-neutral-200">Download PDF</p>
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
          <div className="bg-neutral-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center shrink-0">
              <div>
                <h4 className="text-lg font-black uppercase tracking-tighter text-white">Ordens de Serviço</h4>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">{soListModal.monthLabel}</p>
              </div>
              <button onClick={() => setSoListModal(null)} className="text-neutral-300 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {soListModal.orders.map(os => (
                <div key={os.id} className="p-5 border border-neutral-800 rounded-2xl hover:border-[#D4AF37] transition-all flex justify-between items-center bg-[#0a0a0a]/50">
                  <div>
                    <h5 className="text-sm font-black text-white">{os.plate} — {os.model}</h5>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">{formatDate(os.date)}</p>
                    <p className="text-xs text-neutral-400 mt-2 line-clamp-1">{os.description}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setViewingSO(os);
                    }}
                    className="p-3 bg-neutral-900 text-[#D4AF37] rounded-xl hover:bg-[#D4AF37] hover:text-neutral-950 transition-all flex items-center justify-center shrink-0 active:scale-95 cursor-pointer"
                    title="Visualizar OS"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-neutral-50 bg-[#0a0a0a]/30 flex justify-end shrink-0">
              <button onClick={() => setSoListModal(null)} className="px-8 py-3 bg-neutral-800 text-white border border-neutral-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] hover:text-neutral-950 transition-all shadow-xl cursor-pointer">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Detalhe de Ordem de Serviço (Modo Leitura e Impressão) */}
      {viewingSO && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300">
          <style type="text/css" media="print">
            {`
              @page { size: auto; margin: 0mm; }
              @media print {
                body { padding-top: 15mm; padding-bottom: 15mm; }
              }
            `}
          </style>
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm" onClick={() => setViewingSO(null)} />
          <div className="bg-neutral-900 w-full max-w-3xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 border-b border-neutral-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#D4AF37]">
                  <Wrench size={22} />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tighter">O.S. #{viewingSO.id?.toString().slice(-6)}</h4>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">{viewingSO.plate} — {viewingSO.model}</p>
                </div>
              </div>
              <button onClick={() => setViewingSO(null)} className="text-neutral-300 hover:text-white print:hidden"><X size={24} /></button>
            </div>

            <div id="os-print-area" className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 md:space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[['Data', formatDate(viewingSO.date)], ['KM', `${viewingSO.km || '---'} km`], ['Responsável', viewingSO.responsible], ['Prestador', viewingSO.provider || '---']].map(([label, val]) => (
                  <div key={label} className="bg-[#0a0a0a] p-4 rounded-2xl">
                    <p className="text-[8px] uppercase text-neutral-400 font-black">{label}</p>
                    <p className="text-sm font-black text-white mt-1">{val}</p>
                  </div>
                ))}
              </div>
              
              <div className="bg-[#0a0a0a] p-6 rounded-2xl">
                <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-2">Descrição do Serviço</p>
                <p className="text-sm text-neutral-300 leading-relaxed">{viewingSO.description}</p>
              </div>

              {viewingSO.parts?.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-3">Peças Utilizadas</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead>
                        <tr className="border-b border-neutral-800">
                          <th className="py-2 font-black text-neutral-400 uppercase text-[9px]">Peça</th>
                          <th className="py-2 font-black text-neutral-400 uppercase text-[9px] text-center">Qtd</th>
                          <th className="py-2 font-black text-neutral-400 uppercase text-[9px] text-right">Valor Unit.</th>
                          <th className="py-2 font-black text-neutral-400 uppercase text-[9px] text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800">
                        {viewingSO.parts.map((p, i) => {
                          const unitVal = typeof p.unitValue === 'number' ? p.unitValue : parseCurrency(p.unitValue || 0) || 0;
                          return (
                            <tr key={i} className="text-neutral-300">
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

              <div className="bg-black border border-neutral-800 p-8 rounded-[2rem] flex justify-between items-end">
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
                  <p className="text-3xl font-black text-[#D4AF37] drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]">{(viewingSO.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-neutral-50 bg-[#0a0a0a]/30 flex justify-between items-center shrink-0 print:hidden">
              <button onClick={() => window.print()} className="px-6 py-3 border border-neutral-800 text-neutral-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#0a0a0a] transition-all flex items-center gap-2 cursor-pointer">
                <Printer size={14} /> Imprimir / PDF
              </button>
              <button onClick={() => setViewingSO(null)} className="px-8 py-3 bg-neutral-800 text-white border border-neutral-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] hover:text-neutral-950 transition-all shadow-xl cursor-pointer">
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
