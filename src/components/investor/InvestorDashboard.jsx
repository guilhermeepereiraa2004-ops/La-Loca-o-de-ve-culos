import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Menu, TrendingUp, TrendingDown, Car, Wrench, Wallet, Calendar, Clock, Gauge, KeyRound, Lock, Eye as EyeIcon, EyeOff,
  Search, FileText, ShieldCheck, CheckCircle2, Printer, Eye, PieChart, Activity,
  ChevronDown, Check, Filter, SlidersHorizontal, DollarSign, ArrowUpRight, ArrowDownRight, Bell, Youtube
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { EditorialLabel } from '../ui/EditorialLabel';
import { getPayoutsForInvestor } from '../../utils/investorPayouts.js';
import { parseCurrency } from '../../utils/currencyUtils';
import InvestorCalcModal from './InvestorCalcModal';
import InvestorAvisos from './InvestorAvisos';

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

const InvestorDashboard = ({ investor, transactions = [], vehicles = [], serviceOrders = [], rentals = [], maintenances = [], inspections = [], notices = [], onChangePassword, onMarkNoticeRead, onLogout, onGoHome }) => {
  const [viewingSO, setViewingSO] = useState(null);
  const [soListModal, setSoListModal] = useState(null);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwShowFields, setPwShowFields] = useState({ current: false, newPw: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [calcModalVehiclePlate, setCalcModalVehiclePlate] = useState('all');
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('la_investor_active_tab');
    return savedTab || 'dashboard';
  });
  const [maintenanceFilter, setMaintenanceFilter] = useState('todos');
  const [maintenanceStartDate, setMaintenanceStartDate] = useState('');
  const [maintenanceEndDate, setMaintenanceEndDate] = useState('');
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const vehicleDropdownRef = useRef(null);

  const [fleetStatusFilter, setFleetStatusFilter] = useState('Todos');
  const [rendimentosSortFilter, setRendimentosSortFilter] = useState('padrao');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef(null);
  const [realPayouts, setRealPayouts] = useState([]);

  const sortOptions = [
    { id: 'padrao', label: 'Ordem Padrão (Todos os Ativos)', icon: SlidersHorizontal },
    { id: 'maior_media_mensal', label: 'Maior Média Mensal (R$)', icon: ArrowUpRight, color: 'text-[#00E676]' },
    { id: 'maior_roi', label: 'Maior Rentabilidade (ROI %)', icon: TrendingUp, color: 'text-[#00E676]' },
    { id: 'menor_roi', label: 'Menor Rentabilidade (ROI %)', icon: TrendingDown, color: 'text-red-400' },
    { id: 'maior_investimento', label: 'Maior Valor Investido', icon: DollarSign, color: 'text-[#D4AF37]' },
    { id: 'maior_retorno', label: 'Maior Retorno Gerado (R$)', icon: ArrowUpRight, color: 'text-[#00E676]' },
    { id: 'menor_retorno', label: 'Menor Retorno Gerado (R$)', icon: ArrowDownRight, color: 'text-red-400' },
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(e.target)) {
        setIsVehicleDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    const distinctMonths = new Set();

    vehicleTrans.forEach(t => {
      if (t.date) distinctMonths.add(t.date.substring(0, 7));
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

    const activeMonthsCount = Math.max(1, distinctMonths.size);
    const monthlyAvgReturn = currentYield / activeMonthsCount;
    const monthlyAvgReturnPerc = investValue > 0 ? (monthlyAvgReturn / investValue) * 100 : 0;
    const paybackMonths = (investValue > 0 && monthlyAvgReturn > 0) ? `${(investValue / monthlyAvgReturn).toFixed(1)} meses` : '---';

    return {
      ...v,
      investValue,
      currentYield,
      yieldPerc,
      monthlyAvgReturn,
      monthlyAvgReturnPerc,
      paybackMonths
    };
  });

  const sortedRendimentosVehicles = useMemo(() => {
    const list = [...myVehicles];
    switch (rendimentosSortFilter) {
      case 'maior_media_mensal':
        return list.sort((a, b) => (b.monthlyAvgReturn || 0) - (a.monthlyAvgReturn || 0));
      case 'maior_roi':
        return list.sort((a, b) => (parseFloat(b.yieldPerc) || 0) - (parseFloat(a.yieldPerc) || 0));
      case 'menor_roi':
        return list.sort((a, b) => (parseFloat(a.yieldPerc) || 0) - (parseFloat(b.yieldPerc) || 0));
      case 'maior_investimento':
        return list.sort((a, b) => (b.investValue || 0) - (a.investValue || 0));
      case 'maior_retorno':
        return list.sort((a, b) => (b.currentYield || 0) - (a.currentYield || 0));
      case 'menor_retorno':
        return list.sort((a, b) => (a.currentYield || 0) - (b.currentYield || 0));
      default:
        return list;
    }
  }, [myVehicles, rendimentosSortFilter]);

  // Calcular valor total investido com base nos veículos
  const filteredMyVehicles = myVehicles.filter(v => {
    if (fleetStatusFilter === 'Todos') return true;
    if (fleetStatusFilter === 'Alugado') return v.status === 'Alugado' || v.status === 'Alugado (Reserva)';
    return v.status === fleetStatusFilter;
  });

  // Calcular o KM mais recente de cada veículo baseado nas vistorias (qualquer tipo)
  const latestKmByPlate = useMemo(() => {
    const km = {};
    inspections.forEach(ins => {
      const plate = (ins.vehiclePlate || '').toUpperCase().replace('-', '');
      if (!plate) return;
      const kmVal = parseInt((ins.km || '').toString().replace(/\D/g, ''), 10);
      if (isNaN(kmVal)) return;
      // Usar a data da vistoria para determinar a mais recente
      const insDate = ins.date || ins.createdAt || '';
      if (!km[plate] || insDate > km[plate].date) {
        km[plate] = { km: kmVal, date: insDate, type: ins.type };
      }
    });
    return km;
  }, [inspections]);

  // Helper para obter o KM mais recente de um veículo
  const getLatestKm = (vehiclePlate) => {
    const normalizedPlate = (vehiclePlate || '').toUpperCase().replace('-', '');
    return latestKmByPlate[normalizedPlate] || null;
  };

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
  const maintenanceHistoryTransactions = transactions
    .filter(t => (t.cat?.toLowerCase().includes('manuten') || t.desc?.toLowerCase().includes('manuten')) && myVehicles.some(v => v.plate === t.vehiclePlate))
    .filter(t => !(t.date && t.date < '2026-06-01'))
    .filter(t => {
      if (t.responsible === 'Administradora' || t.responsible === 'Empresa') return false;
      const match = t.desc?.match(/\[Manutenção #([^\]]+)\]/i);
      if (match && maintenances) {
        const mId = match[1];
        const maint = maintenances.find(m => String(m.id) === String(mId));
        if (maint && (maint.responsible === 'Administradora' || maint.responsible === 'Empresa')) {
          return false;
        }
      }
      return true;
    })
    .map(t => {
      let osId = null;
      let receiptUrl = null;
      const match = t.desc?.match(/\[Manutenção #([^\]]+)\]/i);
      if (match && maintenances) {
        const mId = match[1];
        const maint = maintenances.find(m => String(m.id) === String(mId));
        if (maint) {
          if (maint.observations) {
            const osMatch = maint.observations.match(/O\.S\. #([^\s]+)/i);
            if (osMatch) {
              osId = osMatch[1];
            }
          }
          if (maint.receiptUrl) {
            receiptUrl = maint.receiptUrl;
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
        osId,
        receiptUrl
      };
    });

  const maintenanceHistory = [
    ...maintenanceHistoryTransactions,
    ...serviceOrders
      .filter(so => so.status !== 'Concluída' && so.status !== 'Cancelada' && so.responsible !== 'Administradora' && so.responsible !== 'Empresa' && myVehicles.some(v => v.plate === so.plate))
      .map(so => ({
        id: `os-${so.id}`,
        vehicle: so.model || 'Veículo',
        plate: so.plate,
        type: `[O.S. #${String(so.id).split('-')[0]}] ${so.description || 'Serviço em andamento'}`,
        date: so.date || (so.created_at ? so.created_at.split('T')[0] : new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })),
        cost: `R$ -${Math.abs(so.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        status: 'Em Aberto',
        icon: <Wrench size={16} />,
        osId: so.id,
        receiptUrl: null
      }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

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

  const filteredMaintenances = maintenanceHistory.filter(m => {
    const matchVehicle = maintenanceFilter === 'todos' || m.plate === maintenanceFilter;
    let matchDate = true;
    if (maintenanceStartDate && m.date) matchDate = matchDate && m.date >= maintenanceStartDate;
    if (maintenanceEndDate && m.date) matchDate = matchDate && m.date <= maintenanceEndDate;
    return matchVehicle && matchDate;
  });

  const totalInsurance = 39.90 * myVehicles.filter(v => v.franchiseInsurance).length;

  const currentMonthDividends = dividendHistory[0] ? dividendHistory[0].netValue : 0;

  const yearDividends = dividendHistory.reduce((acc, d) => acc + d.netValue, 0);

  const avgYield = totalInvested > 0 ? ((currentMonthDividends / totalInvested) * 100).toFixed(2) + '%' : '0.00%';
  const totalRoiPerc = totalInvested > 0 ? ((yearDividends / totalInvested) * 100).toFixed(2) + '%' : '0.00%';

  // Generate graph bars dynamically based on reverse chronological history
  // Exclui o mês vigente do gráfico a menos que o pagamento/repasse já esteja registrado
  const currentMonthKey = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}`;
  const graphBars = [...dividendHistory]
    .filter(d => {
      const isCurrentMonth = d.refMonthStr === currentMonthKey;
      if (isCurrentMonth && !d.realPayout) {
        return false;
      }
      return true;
    })
    .reverse()
    .map(d => {
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
      case 'em preparação':
      case 'em preparacao':
      case 'preparação':
      case 'preparacao':
        return <span className="px-3 py-1 bg-blue-950/80 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)] text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-full">{status}</span>;
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
      <aside className={`bg-black border-r border-neutral-900 text-white flex flex-col p-8 fixed h-[100dvh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden z-50 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-0 opacity-0 xl:w-20 xl:translate-x-0 xl:opacity-100'}`}>
        <div className={`mb-16 transition-all duration-300 shrink-0 ${!isSidebarOpen ? 'xl:opacity-0' : 'opacity-100'}`}>
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
                        { id: 'minha-frota', label: 'Meus Veículos', icon: Car },
            { id: 'manutencao', label: 'Manutenções', icon: Wrench },
            { id: 'pagamentos', label: 'Dividendos', icon: Wallet },
            { id: 'avisos', label: 'Avisos', icon: Bell },
          ].map((item) => {
            const myNotices = notices.filter(n => n.targetType === 'all' || (n.targetIds && n.targetIds.includes(investor?.id)));
            const unreadCount = item.id === 'avisos' ? myNotices.filter(n => !(n.readBy || []).includes(investor?.id)).length : 0;
            return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1280) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-[#D4AF37] text-neutral-950 font-black' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                }`}
            >
              <item.icon size={17} className={activeTab === item.id ? 'text-neutral-950' : 'group-hover:text-[#D4AF37]'} />
              <span className={`text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>{item.label}</span>
              {item.id === 'avisos' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">{unreadCount}</span>
              )}
            </button>
            );
          })}
        </nav>

        <div className="border-t border-neutral-900 pt-4 mt-auto shrink-0 space-y-2 pb-4">
          <button
            onClick={onGoHome}
            className="flex items-center gap-3 p-2.5 text-neutral-500 hover:text-[#D4AF37] transition-colors w-full"
          >
            <Eye size={17} />
            <span className={`text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>Página Inicial</span>
          </button>
          <button
            onClick={() => {
              setPwForm({ current: '', newPw: '', confirm: '' });
              setPwError('');
              setPwSuccess(false);
              setShowChangePasswordModal(true);
            }}
            className="flex items-center gap-3 p-2.5 text-neutral-500 hover:text-[#D4AF37] transition-colors w-full"
          >
            <KeyRound size={17} />
            <span className={`text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>Alterar Senha</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 p-2.5 text-neutral-500 hover:text-red-400 transition-colors w-full"
          >
            <X size={17} />
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
              <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/95 to-neutral-950 rounded-3xl p-6 md:p-8 mb-10 border border-[#D4AF37]/30 shadow-[0_0_30px_rgba(212,175,55,0.12)] hover:shadow-[0_0_40px_rgba(212,175,55,0.22)] transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 group">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#D4AF37] via-[#00E676] to-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.8)]" />
                
                <div className="flex items-center gap-5 z-10 pl-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 via-[#D4AF37]/10 to-transparent border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.2)] shrink-0">
                    <Calendar size={26} className="drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={12} className="text-[#D4AF37]" />
                      <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-extrabold">Cronograma de Repasse</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Próximo Pagamento:</h2>
                      <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] font-mono font-bold text-lg md:text-xl shadow-[0_0_15px_rgba(212,175,55,0.25)]">
                        {nextPaymentDate.toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-[11px] mt-2 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                      Regra: 5º Dia Útil de cada mês
                    </p>
                  </div>
                </div>

                <div className="hidden lg:block h-14 w-[1px] bg-neutral-800" />

                <div className="text-center md:text-right z-10 pr-2 shrink-0">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-2">Status do Ciclo</p>
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-[#00E676] shadow-[0_0_20px_rgba(0,230,118,0.2)]">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#00E676] animate-pulse shadow-[0_0_10px_rgba(0,230,118,0.8)]" />
                    <span className="text-xs font-black uppercase tracking-wider">Aguardando Fechamento</span>
                  </div>
                </div>
              </div>
              {/* Top Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
                
                {/* Card 1: Valor Total Investido */}
                <div className="bg-neutral-900 p-5 xl:p-6 rounded-3xl border border-neutral-600/50 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-shadow group flex flex-col justify-between h-full">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-3 h-4 flex items-center">Valor Total Investido</p>
                    <p className="text-base sm:text-lg lg:text-base xl:text-xl 2xl:text-2xl font-bold font-mono text-white drop-shadow-md whitespace-nowrap">
                      R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mt-2 h-4 flex items-center">
                      <span>Patrimônio em Ativos</span>
                    </p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-neutral-800/60 flex items-center">
                    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-neutral-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)]" /> Frota Ativa
                    </span>
                  </div>
                </div>

                {/* Card 2: Dividendos (Mês Atual) */}
                <div className={`bg-neutral-900 p-5 xl:p-6 rounded-3xl border transition-shadow group flex flex-col justify-between h-full ${currentMonthDividends > 0 ? 'border-[#00E676]/30 shadow-[0_0_25px_rgba(0,230,118,0.3)] hover:shadow-[0_0_35px_rgba(0,230,118,0.5)]' : currentMonthDividends < 0 ? 'border-red-800/60 shadow-[0_0_25px_rgba(248,113,113,0.3)] hover:shadow-[0_0_35px_rgba(248,113,113,0.5)]' : 'border-neutral-600/50 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]'}`}>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-3 h-4 flex items-center">Dividendos (Mês Atual)</p>
                    <p className={`text-base sm:text-lg lg:text-base xl:text-xl 2xl:text-2xl font-bold font-mono whitespace-nowrap ${currentMonthDividends > 0 ? 'text-[#00E676] drop-shadow-[0_0_10px_rgba(0,230,118,0.4)]' : currentMonthDividends < 0 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]' : 'text-white drop-shadow-md'}`}>
                      R$ {currentMonthDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mt-2 h-4 flex items-center gap-1.5">
                      <span className="text-[#D4AF37] font-mono font-bold text-xs">{avgYield}</span>
                      <span>Rendimento Mensal</span>
                    </p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-neutral-800/60 flex items-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold ${currentMonthDividends >= 0 ? "text-[#00E676]" : "text-red-500"}`}>
                      <TrendingUp size={12} /> Ciclo Atual
                    </span>
                  </div>
                </div>

                {/* Card 3: Retorno Operacional Total */}
                <div className={`bg-neutral-900 p-5 xl:p-6 rounded-3xl border transition-shadow group flex flex-col justify-between h-full ${yearDividends > 0 ? 'border-[#00E676]/30 shadow-[0_0_25px_rgba(0,230,118,0.3)] hover:shadow-[0_0_35px_rgba(0,230,118,0.5)]' : yearDividends < 0 ? 'border-red-800/60 shadow-[0_0_25px_rgba(248,113,113,0.3)] hover:shadow-[0_0_35px_rgba(248,113,113,0.5)]' : 'border-neutral-600/50 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]'}`}>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-3 h-4 flex items-center">Retorno Operacional</p>
                    <p className={`text-base sm:text-lg lg:text-base xl:text-xl 2xl:text-2xl font-bold font-mono whitespace-nowrap ${yearDividends > 0 ? 'text-[#00E676] drop-shadow-[0_0_10px_rgba(0,230,118,0.4)]' : yearDividends < 0 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]' : 'text-white drop-shadow-md'}`}>
                      R$ {yearDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mt-2 h-4 flex items-center">
                      <span>Lucro Líquido Gerado</span>
                    </p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-neutral-800/60 flex items-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold ${yearDividends >= 0 ? "text-[#00E676]" : "text-red-500"}`}>
                      <TrendingUp size={12} /> Acumulado Frota
                    </span>
                  </div>
                </div>

                {/* Card 4: ROI Total (%) */}
                <div className={`bg-neutral-900 p-5 xl:p-6 rounded-3xl border transition-shadow group flex flex-col justify-between h-full ${parseFloat(totalRoiPerc) > 0 ? 'border-[#00E676]/30 shadow-[0_0_25px_rgba(0,230,118,0.3)] hover:shadow-[0_0_35px_rgba(0,230,118,0.5)]' : parseFloat(totalRoiPerc) < 0 ? 'border-red-800/60 shadow-[0_0_25px_rgba(248,113,113,0.3)] hover:shadow-[0_0_35px_rgba(248,113,113,0.5)]' : 'border-neutral-600/50 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]'}`}>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-3 h-4 flex items-center">ROI Total (%)</p>
                    <p className={`text-base sm:text-lg lg:text-base xl:text-xl 2xl:text-2xl font-black font-mono whitespace-nowrap ${parseFloat(totalRoiPerc) >= 0 ? 'text-[#00E676] drop-shadow-[0_0_10px_rgba(0,230,118,0.4)]' : 'text-red-500 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]'}`}>
                      {parseFloat(totalRoiPerc) >= 0 ? '+' : ''}{totalRoiPerc}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mt-2 h-4 flex items-center">
                      <span>Retorno Acumulado</span>
                    </p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-neutral-800/60 flex items-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold ${parseFloat(totalRoiPerc) >= 0 ? "text-[#00E676]" : "text-red-500"}`}>
                      <TrendingUp size={12} /> Retorno Global
                    </span>
                  </div>
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
              <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-neutral-900 border border-neutral-800 p-6 md:p-8 rounded-[2rem] shadow-sm">
                <div>
                  <EditorialLabel className="text-[#D4AF37] mb-2">Relatório Consolidado</EditorialLabel>
                  <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-white">Rendimentos por Veículo</h2>
                </div>

                <div className="relative" ref={sortDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="bg-[#0a0a0a] border border-neutral-800 px-5 py-3.5 rounded-2xl outline-none focus:border-[#D4AF37]/50 hover:border-neutral-700 transition-all flex items-center gap-3 text-white cursor-pointer shadow-sm group min-w-[270px] justify-between"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden text-left">
                      <Filter size={15} className="text-[#D4AF37] shrink-0" />
                      <span className="font-bold text-xs uppercase tracking-wider text-neutral-200 truncate">
                        {sortOptions.find(o => o.id === rendimentosSortFilter)?.label || 'Ordem Padrão'}
                      </span>
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={`text-neutral-400 group-hover:text-white transition-transform duration-300 shrink-0 ${isSortDropdownOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {isSortDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 z-[99] bg-neutral-950/95 backdrop-blur-xl border border-neutral-800 rounded-2xl p-2 shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-2 duration-200 min-w-[280px]">
                      {sortOptions.map((opt) => {
                        const IconComponent = opt.icon;
                        const isSelected = rendimentosSortFilter === opt.id;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setRendimentosSortFilter(opt.id);
                              setIsSortDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-white font-bold'
                                : 'text-neutral-300 hover:bg-neutral-900 hover:text-white font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden text-left">
                              <IconComponent size={15} className={opt.color || 'text-[#D4AF37]'} />
                              <span className="uppercase tracking-wider truncate">{opt.label}</span>
                            </div>
                            {isSelected && <Check size={16} className="text-[#D4AF37] shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* Desktop Table View */}
              <div className="hidden md:block w-full bg-neutral-900 rounded-3xl border border-neutral-800 shadow-sm overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-[#0a0a0a]/80 text-[9px] xl:text-[10px] uppercase tracking-wider text-neutral-500">
                        <th className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 font-bold">Ativo</th>
                        <th className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 font-bold text-right">Valor Investido</th>
                        <th className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 font-bold text-right">Retorno Total</th>
                        <th className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 font-bold text-right">Média Mensal</th>
                        <th className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 font-bold text-center">Payback</th>
                        <th className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 font-bold text-center">ROI Total</th>
                        <th className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 font-bold text-center">Detalhamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {sortedRendimentosVehicles.map((v) => (
                        <tr key={v.id} className="hover:bg-[#0a0a0a] transition-colors group">
                          <td className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5">
                            <div className="flex items-center gap-2 lg:gap-2.5 xl:gap-3">
                              <div className="w-8 h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-800 shrink-0">
                                <img
                                  src={v.image || '/logo-new.png'}
                                  className="w-full h-full object-cover opacity-100 transition-all"
                                  alt={v.model}
                                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo-new.png'; e.currentTarget.style.objectFit = 'contain'; e.currentTarget.style.padding = '2px'; e.currentTarget.style.background = '#000000'; }}
                                  style={v.image === '/logo-new.png' ? { objectFit: 'contain', padding: '2px', background: 'transparent' } : {}}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] lg:text-[11px] xl:text-xs font-bold uppercase tracking-wide text-white truncate">{v.model}</p>
                                <p className="text-[9px] font-mono font-medium text-neutral-500 mt-0.5">{v.plate}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 text-right whitespace-nowrap">
                            <p className="text-xs xl:text-sm font-semibold font-mono text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                              R$ {Number(v.investValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </td>
                          <td className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 text-right whitespace-nowrap">
                            {v.currentYield > 0 ? (
                              <p className="text-xs xl:text-sm font-bold font-mono text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                                R$ {v.currentYield.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            ) : v.currentYield < 0 ? (
                              <p className="text-xs xl:text-sm font-bold font-mono text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]">
                                - R$ {Math.abs(v.currentYield).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            ) : (
                              <p className="text-xs xl:text-sm font-medium font-mono text-neutral-500 drop-shadow-sm">R$ 0,00</p>
                            )}
                          </td>
                          <td className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 text-right whitespace-nowrap">
                            <p className={`text-xs xl:text-sm font-semibold font-mono ${v.monthlyAvgReturn >= 0 ? 'text-[#00E676] drop-shadow-[0_0_8px_rgba(0,230,118,0.3)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]'}`}>
                              {v.monthlyAvgReturn < 0 ? '- ' : ''}R$ {Math.abs(v.monthlyAvgReturn || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className={`text-[10px] font-mono font-bold mt-0.5 ${v.monthlyAvgReturn >= 0 ? 'text-[#00E676]/90' : 'text-red-400/90'}`}>
                              {v.monthlyAvgReturn < 0 ? '-' : '+'}{Math.abs(v.monthlyAvgReturnPerc || 0).toFixed(2)}% / mês
                            </p>
                          </td>
                          <td className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] xl:text-[11px] font-bold font-mono bg-neutral-800 border border-neutral-700 text-neutral-300">
                              {v.paybackMonths}
                            </span>
                          </td>
                          <td className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 text-center whitespace-nowrap">
                            {v.currentYield > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 xl:px-2.5 xl:py-1 rounded-full text-[10px] xl:text-[11px] font-bold font-mono bg-emerald-950/80 border border-emerald-500/30 shadow-[0_0_10px_rgba(0,230,118,0.15)] text-[#00E676] drop-shadow-sm">
                                {v.yieldPerc}
                              </span>
                            ) : v.currentYield < 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 xl:px-2.5 xl:py-1 rounded-full text-[10px] xl:text-[11px] font-bold font-mono bg-red-950/80 border border-red-500/30 shadow-[0_0_10px_rgba(248,113,113,0.15)] text-red-400">
                                {v.yieldPerc}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 xl:px-2.5 xl:py-1 rounded-full text-[10px] xl:text-[11px] font-bold font-mono bg-neutral-100 text-neutral-500">
                                0.00%
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3 lg:px-3 lg:py-4 xl:px-4 xl:py-5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setCalcModalVehiclePlate(v.plate);
                                setShowCalcModal(true);
                              }}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 lg:px-2.5 lg:py-1.5 xl:px-3 xl:py-2 bg-[#D4AF37]/15 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-neutral-950 font-bold text-[9px] lg:text-[9px] xl:text-[10px] uppercase tracking-wider rounded-xl transition-all border border-[#D4AF37]/30 shadow-sm cursor-pointer whitespace-nowrap"
                            >
                              <Activity size={12} className="shrink-0" />
                              <span>Ver Detalhes</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden flex flex-col gap-4">
                {sortedRendimentosVehicles.map((v) => (
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
                            ROI: {v.yieldPerc}
                          </span>
                        ) : v.currentYield < 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-950/80 border border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.15)]">
                            ROI: {v.yieldPerc}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-neutral-100 text-neutral-500">
                            ROI: 0.00%
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-b border-neutral-800/50">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Valor Investido</p>
                        <p className="text-xs font-semibold font-mono text-[#D4AF37]">
                          R$ {Number(v.investValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Retorno Op.</p>
                        {v.currentYield > 0 ? (
                          <p className="text-xs font-bold font-mono text-[#D4AF37]">
                            R$ {v.currentYield.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        ) : v.currentYield < 0 ? (
                          <p className="text-xs font-bold font-mono text-red-400">
                            - R$ {Math.abs(v.currentYield).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        ) : (
                          <p className="text-xs font-medium font-mono text-neutral-500">R$ 0</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Média Mensal</p>
                        <p className={`text-xs font-bold font-mono ${v.monthlyAvgReturn >= 0 ? 'text-[#00E676]' : 'text-red-400'}`}>
                          R$ {Math.abs(v.monthlyAvgReturn || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className={`text-[9px] font-mono font-bold mt-0.5 ${v.monthlyAvgReturn >= 0 ? 'text-[#00E676]/90' : 'text-red-400/90'}`}>
                          {v.monthlyAvgReturn < 0 ? '-' : '+'}{Math.abs(v.monthlyAvgReturnPerc || 0).toFixed(2)}% / mês
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Payback Est.</p>
                        <p className="text-xs font-bold font-mono text-neutral-300">
                          {v.paybackMonths}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-black/40 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setCalcModalVehiclePlate(v.plate);
                          setShowCalcModal(true);
                        }}
                        className="w-full py-2.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-neutral-950 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all border border-[#D4AF37]/30 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Activity size={14} />
                        <span>Ver Detalhamento de Contas</span>
                      </button>
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

          {activeTab === 'minha-frota' && (
            <div className="space-y-12">
              <div className="mb-10">
                <EditorialLabel className="text-[#D4AF37] mb-2">Gestão de Patrimônio</EditorialLabel>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-white">Minha Frota</h2>
              </div>
              
              {/* FILTER FOR FLEET STATUS */}
              <div className="flex bg-neutral-900 p-1 rounded-2xl border border-neutral-800 shadow-sm shrink-0 overflow-x-auto no-scrollbar mb-8">
                {['Todos', 'Disponível', 'Alugado', 'Manutenção', 'Em preparação', 'Indisponível'].map((status) => {
                  const count = status === 'Todos' 
                    ? myVehicles.length 
                    : myVehicles.filter(v => v.status === status || (status === 'Alugado' && v.status === 'Alugado (Reserva)')).length;
                  
                  let buttonStyle = 'text-neutral-500 hover:text-white';
                  if (fleetStatusFilter === status) {
                     buttonStyle = 'bg-neutral-800 text-white shadow-lg border border-neutral-700';
                  }

                  return (
                    <button
                      key={status}
                      onClick={() => setFleetStatusFilter(status)}
                      className={`px-6 py-4 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all whitespace-nowrap ${buttonStyle}`}
                    >
                      {status} ({count})
                    </button>
                  );
                })}
              </div>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto bg-neutral-900 rounded-3xl border border-neutral-800 shadow-sm">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-[#0a0a0a]/80 text-[10px] uppercase tracking-widest text-neutral-500">
                      <th className="p-6 font-bold">Ativo (Veículo)</th>
                      <th className="p-6 font-bold text-center">Status Operacional</th>
                      <th className="p-6 font-bold text-center">Ano</th>
                      <th className="p-6 font-bold text-center">KM Aproximado</th>
                      <th className="p-6 font-bold text-right">Taxa Investidor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {filteredMyVehicles.map((v, idx) => (
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
                        <td className="p-6 text-center">
                          {(() => {
                            const kmData = getLatestKm(v.plate);
                            if (!kmData) return <span className="text-neutral-600 text-xs font-mono">---</span>;
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-300 font-mono font-bold text-xs shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                                  <Gauge size={12} className="text-blue-400" />
                                  {kmData.km.toLocaleString('pt-BR')} km
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-6 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#FF6A00]/10 border border-[#FF6A00]/40 text-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.25)] drop-shadow-[0_0_5px_rgba(255,106,0,0.5)]">
                            {v.investorTax || (100 - (parseFloat(v.adminTax) || 20))}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden flex flex-col gap-4">
                {filteredMyVehicles.map((v, idx) => (
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
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">KM Aproximado</p>
                        {(() => {
                          const kmData = getLatestKm(v.plate);
                          if (!kmData) return <p className="text-xs font-mono text-neutral-600">---</p>;
                          return (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-300 font-mono font-bold text-[10px]">
                                <Gauge size={10} />
                                {kmData.km.toLocaleString('pt-BR')}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex flex-col gap-1 items-center justify-center">
                        <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Taxa</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#FF6A00]/10 border border-[#FF6A00]/40 text-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.25)] drop-shadow-sm">
                          {v.investorTax || (100 - (parseFloat(v.adminTax) || 20))}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredMyVehicles.length === 0 && (
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
                  <div className="space-y-2 relative" ref={vehicleDropdownRef}>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Filtrar por Veículo</label>
                    <button
                      type="button"
                      onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                      className="w-full bg-[#0a0a0a] border border-neutral-800 p-4 rounded-2xl outline-none focus:border-[#D4AF37]/50 hover:border-neutral-700 transition-all flex items-center justify-between text-white cursor-pointer shadow-sm group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Car size={18} className="text-[#D4AF37] shrink-0" />
                        {maintenanceFilter === 'todos' ? (
                          <span className="font-bold text-xs uppercase tracking-wider text-white truncate">
                            Todos os Veículos ({myVehicles.length})
                          </span>
                        ) : (() => {
                          const selectedVeh = myVehicles.find(v => v.plate === maintenanceFilter);
                          return selectedVeh ? (
                            <div className="flex items-center gap-2 overflow-hidden text-left">
                              <span className="font-bold text-xs uppercase tracking-wider text-white truncate">
                                {selectedVeh.model}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] font-mono text-[10px] font-bold shrink-0">
                                {selectedVeh.plate}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-xs uppercase tracking-wider text-white truncate">
                              {maintenanceFilter}
                            </span>
                          );
                        })()}
                      </div>
                      <ChevronDown 
                        size={18} 
                        className={`text-neutral-400 group-hover:text-white transition-transform duration-300 shrink-0 ml-2 ${isVehicleDropdownOpen ? 'rotate-180' : ''}`} 
                      />
                    </button>

                    {isVehicleDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-[99] bg-neutral-950/95 backdrop-blur-xl border border-neutral-800 rounded-2xl p-3 shadow-2xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Input de busca rápida */}
                        <div className="relative">
                          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                          <input
                            type="text"
                            placeholder="Buscar veículo ou placa..."
                            value={vehicleSearchTerm}
                            onChange={(e) => setVehicleSearchTerm(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold text-white placeholder-neutral-500 outline-none focus:border-[#D4AF37]/50 transition-all"
                          />
                          {vehicleSearchTerm && (
                            <button 
                              onClick={() => setVehicleSearchTerm('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {/* Lista de veículos ordenada */}
                        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          <button
                            type="button"
                            onClick={() => {
                              setMaintenanceFilter('todos');
                              setIsVehicleDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                              maintenanceFilter === 'todos'
                                ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37]'
                                : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                            }`}
                          >
                            <span className="uppercase tracking-wider font-bold">Todos os Veículos ({myVehicles.length})</span>
                            {maintenanceFilter === 'todos' && <Check size={16} className="text-[#D4AF37]" />}
                          </button>

                          <div className="h-[1px] bg-neutral-800 my-1" />

                          {[...myVehicles]
                            .sort((a, b) => (a.model || '').localeCompare(b.model || '') || (a.plate || '').localeCompare(b.plate || ''))
                            .filter(v => {
                              if (!vehicleSearchTerm.trim()) return true;
                              const term = vehicleSearchTerm.toLowerCase().trim();
                              return (v.model?.toLowerCase().includes(term) || v.plate?.toLowerCase().includes(term));
                            })
                            .map((v) => {
                              const isSelected = maintenanceFilter === v.plate;
                              return (
                                <button
                                  key={v.id || v.plate}
                                  type="button"
                                  onClick={() => {
                                    setMaintenanceFilter(v.plate);
                                    setIsVehicleDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs transition-all ${
                                    isSelected
                                      ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-white'
                                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 overflow-hidden text-left">
                                    <span className="font-bold uppercase tracking-wider truncate">{v.model}</span>
                                    <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[#D4AF37] font-mono text-[10px] font-bold shrink-0">
                                      {v.plate}
                                    </span>
                                  </div>
                                  {isSelected && <Check size={16} className="text-[#D4AF37] shrink-0 ml-2" />}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Período</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="date" 
                        value={maintenanceStartDate}
                        onChange={(e) => setMaintenanceStartDate(e.target.value)}
                        className="bg-[#0a0a0a] border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-white text-xs" 
                      />
                      <input 
                        type="date" 
                        value={maintenanceEndDate}
                        onChange={(e) => setMaintenanceEndDate(e.target.value)}
                        className="bg-[#0a0a0a] border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-white text-xs" 
                      />
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
                                Ver O.S.
                              </button>
                            ) : m.receiptUrl ? (
                              <div className="flex flex-col gap-1 items-start">
                                {m.receiptUrl.split(',').map((url, idx) => (
                                  <button 
                                    key={idx}
                                    onClick={() => window.open(url, '_blank')}
                                    className="text-[10px] uppercase tracking-widest font-black text-[#D4AF37] hover:text-white transition-colors underline whitespace-nowrap"
                                  >
                                    {m.receiptUrl.split(',').length > 1 ? `Anexo ${idx + 1}` : 'Ver Comprovante'}
                                  </button>
                                ))}
                              </div>
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
                            Ver O.S.
                          </button>
                        ) : m.receiptUrl ? (
                          <div className="flex flex-col gap-1 items-start">
                            {m.receiptUrl.split(',').map((url, idx) => (
                              <button 
                                key={idx}
                                onClick={() => window.open(url, '_blank')}
                                className="text-[10px] uppercase tracking-widest font-black text-[#D4AF37] hover:text-white transition-colors underline whitespace-nowrap"
                              >
                                {m.receiptUrl.split(',').length > 1 ? `Anexo ${idx + 1}` : 'Ver Comprovante'}
                              </button>
                            ))}
                          </div>
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <EditorialLabel className="text-[#D4AF37] mb-2">Demonstrativo Financeiro</EditorialLabel>
                  <h2 className="text-3xl font-bold uppercase tracking-tight text-white">Dividendos & Repasses</h2>
                </div>
                <button
                  onClick={() => {
                    setCalcModalVehiclePlate('all');
                    setShowCalcModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-3 bg-[#D4AF37] text-neutral-950 font-bold rounded-xl uppercase tracking-widest text-xs hover:bg-[#c4a02e] transition-colors border border-[#D4AF37] w-fit shrink-0 shadow-lg shadow-[#D4AF37]/10 cursor-pointer"
                >
                  <Activity size={16} className="text-neutral-950" />
                  Ver Cálculo Detalhado
                </button>
              </div>

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
                    if (so.responsible === 'Administradora' || so.responsible === 'Empresa') return false;
                    const soMonth = so.date.split('T')[0].substring(0, 7);
                    return soMonth === d.refMonthStr;
                  });

                  const monthMaintenances = maintenances.filter(m => {
                    const plateMatch = m.vehiclePlate && myVehiclePlates.includes(m.vehiclePlate);
                    if (!plateMatch) return false;
                    if (!m.date) return false;
                    if (m.responsible === 'Administradora' || m.responsible === 'Empresa') return false;
                    const mMonth = m.date.split('T')[0].substring(0, 7);
                    return mMonth === d.refMonthStr && m.receiptUrl;
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
                  if (monthMaintenances.length > 0) {
                    monthMaintenances.forEach(m => {
                      if (m.receiptUrl) {
                        m.receiptUrl.split(',').forEach((url, idx) => {
                          const total = m.receiptUrl.split(',').length;
                          docsList.push({ 
                            type: 'maintenance_receipt', 
                            label: `Manutenção ${m.vehiclePlate}${total > 1 ? ` (${idx + 1}/${total})` : ''}`, 
                            url 
                          });
                        });
                      }
                    });
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-10">
                          <div className="space-y-4">
                            <h4 className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 border-b border-neutral-800 pb-2">Composição de Receita</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-400 font-medium whitespace-nowrap">Valor Bruto (Aluguéis)</span>
                                <span className="font-semibold font-mono text-white drop-shadow-md shrink-0 whitespace-nowrap ml-2">R$ {d.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-neutral-200">
                                <span className="font-medium text-neutral-400 whitespace-nowrap">Taxa Adm. (Gestão)</span>
                                <span className="font-semibold font-mono text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)] shrink-0 whitespace-nowrap ml-2">- R$ {d.adminTax.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 border-b border-neutral-800 pb-2">Retenções e Descontos</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-400 whitespace-nowrap">Manutenção Corretiva/Preventiva</span>
                                <span className="font-semibold font-mono text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)] shrink-0 whitespace-nowrap ml-2">- R$ {d.discounts.maintenance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-400 whitespace-nowrap">Seguro Franquia (Fixo)</span>
                                <span className="font-semibold font-mono text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)] shrink-0 whitespace-nowrap ml-2">- R$ {d.discounts.insurance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-400 whitespace-nowrap">Proteção Veicular/Rastreador</span>
                                <span className="font-semibold font-mono text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)] shrink-0 whitespace-nowrap ml-2">- R$ {d.discounts.protection.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              {(d.discounts.other || 0) > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-neutral-400 font-medium whitespace-nowrap">Outros Abatimentos</span>
                                  <span className="font-semibold font-mono text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)] shrink-0 whitespace-nowrap ml-2">- R$ {d.discounts.other.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              )}
                              {(d.discounts.carriedDebt || 0) < 0 && (
                                <div className="flex justify-between items-center text-xs p-2 bg-rose-950/30 rounded-md border border-rose-900/50">
                                  <span className="text-rose-400 font-semibold flex items-center gap-1 whitespace-nowrap">Dívida Anterior</span>
                                  <span className="font-bold font-mono text-rose-400 shrink-0 whitespace-nowrap ml-2">- R$ {Math.abs(d.discounts.carriedDebt).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                                      key={`${doc.url}-${doc.label}`}
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

          {activeTab === 'avisos' && (
            <div className="animate-in slide-in-from-right-4 duration-700">
              <InvestorAvisos 
                investor={investor}
                notices={notices}
                onMarkNoticeRead={onMarkNoticeRead}
              />
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

      {showCalcModal && (
        <InvestorCalcModal
          investor={investor}
          vehicles={vehicles}
          transactions={transactions}
          rentals={rentals}
          realPayouts={realPayouts}
          initialPlateFilter={calcModalVehiclePlate}
          hideSummarySidebar={calcModalVehiclePlate !== 'all'}
          onClose={() => {
            setShowCalcModal(false);
            setCalcModalVehiclePlate('all');
          }}
        />
      )}

      {/* ===== MODAL ALTERAR SENHA ===== */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-neutral-800 rounded-3xl shadow-[0_0_60px_rgba(212,175,55,0.15)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-neutral-800 bg-black/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                  <KeyRound size={18} className="text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Segurança</p>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">Alterar Senha</h3>
                </div>
              </div>
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-8 py-6 space-y-5">
              {pwSuccess ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,230,118,0.2)]">
                    <CheckCircle2 size={32} className="text-[#00E676]" />
                  </div>
                  <p className="text-sm font-bold text-white uppercase tracking-widest">Senha alterada com sucesso!</p>
                  <p className="text-xs text-neutral-500">Use sua nova senha no próximo acesso.</p>
                  <button
                    onClick={() => setShowChangePasswordModal(false)}
                    className="mt-2 px-6 py-3 bg-[#D4AF37] text-neutral-950 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-[#f0c93a] transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  {/* Campo senha atual */}
                  {[
                    { key: 'current', label: 'Senha Atual' },
                    { key: 'newPw', label: 'Nova Senha' },
                    { key: 'confirm', label: 'Confirmar Nova Senha' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{label}</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none" />
                        <input
                          type={pwShowFields[key] ? 'text' : 'password'}
                          value={pwForm[key]}
                          onChange={e => setPwForm(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder="••••••••"
                          className="w-full bg-neutral-900 border border-neutral-700 text-white text-sm rounded-2xl pl-10 pr-12 py-3.5 outline-none focus:border-[#D4AF37]/60 focus:shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all placeholder-neutral-700 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setPwShowFields(prev => ({ ...prev, [key]: !prev[key] }))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors"
                        >
                          {pwShowFields[key] ? <EyeOff size={15} /> : <EyeIcon size={15} />}
                        </button>
                      </div>
                    </div>
                  ))}

                  {pwError && (
                    <div className="px-4 py-3 rounded-2xl bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-semibold">
                      {pwError}
                    </div>
                  )}

                  <button
                    disabled={pwLoading}
                    onClick={async () => {
                      setPwError('');
                      if (!pwForm.current) return setPwError('Informe a senha atual.');
                      if (!pwForm.newPw || pwForm.newPw.length < 4) return setPwError('A nova senha deve ter ao menos 4 caracteres.');
                      if (pwForm.newPw !== pwForm.confirm) return setPwError('Nova senha e confirmação não coincidem.');
                      // Verificar senha atual
                      if (pwForm.current !== (investor?.password || '')) return setPwError('Senha atual incorreta.');
                      setPwLoading(true);
                      const result = await onChangePassword?.(pwForm.newPw);
                      setPwLoading(false);
                      if (result?.success) {
                        setPwSuccess(true);
                      } else {
                        setPwError(result?.error || 'Erro ao salvar. Tente novamente.');
                      }
                    }}
                    className="w-full py-4 bg-[#D4AF37] text-neutral-950 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-[#f0c93a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] mt-2"
                  >
                    {pwLoading ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    ) : (
                      <KeyRound size={14} />
                    )}
                    {pwLoading ? 'Salvando...' : 'Salvar nova senha'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorDashboard;
