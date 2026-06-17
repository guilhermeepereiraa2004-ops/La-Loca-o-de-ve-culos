import React, { useState, useEffect, useCallback } from 'react';
import { User, Mail, Phone, MapPin, Key, Landmark, Search, Pencil, Trash2, Plus, Users, Calendar, SendHorizonal, History, ChevronDown, ChevronUp, X, Coins, Wallet, AlertCircle, Filter, ArrowUpRight, ArrowDownRight, Car } from 'lucide-react';
import { formatCPF } from '../../../utils/cpfFormatter';
import InvestorPayoutModal from '../modals/InvestorPayoutModal.jsx';
import { getPayoutsForInvestor, formatReferenceMonth } from '../../../utils/investorPayouts.js';
import { EditorialLabel } from '../../ui/EditorialLabel';

const AdminInvestidores = ({
  investors,
  investorForm,
  setInvestorForm,
  isEditing,
  setIsEditing,
  onAddInvestor,
  onUpdateInvestor,
  setItemToDelete,
  setDeleteType,
  setShowDeleteAuthModal,
  setShowAdminSuccess,
  vehicles = [],
  transactions = [],
  onAddTransaction,
  rentals = []
}) => {
  const getInvestorShareForTransaction = (t, invVehicles = [], rentals = []) => {
    if (!t || t.status !== 'Concluído') return { share: 0, explanation: 'Ignorado (Não concluído)' };
    
    const val = parseFloat(t.val) || 0;
    const absVal = Math.abs(val);
    const category = (t.cat || '').toLowerCase().trim();

    if (t.type === 'out' || val < 0) {
      const isRespInvestor = t.responsible?.toLowerCase().trim().startsWith('investidor');
      const isBeforeJune2026 = t.date && t.date < '2026-06-01';
      if (isRespInvestor && !isBeforeJune2026) {
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

    if (category.includes('prote') || category.includes('veicular')) {
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
      
      const vehicle = invVehicles.find(v => v.plate === t.vehiclePlate);
      const adminTaxPercent = parseFloat(vehicle?.adminTax || 20);
      const investorSharePercent = 100 - adminTaxPercent;
      
      if (!isAsaas) {
        const investorPart = absVal * (investorSharePercent / 100);
        return {
          share: investorPart,
          explanation: `Aluguel manual: R$ ${absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} bruto - ${adminTaxPercent}% (Taxa Adm) = + R$ ${investorPart.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        };
      } else {
        const rental = rentals.find(r => r.plate === t.vehiclePlate || r.vehiclePlate === t.vehiclePlate);
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

  const calculateInvestorPayout = (inv) => {
    const invVehicles = (vehicles || []).filter(v => {
      const invNameMatch = v.investor?.toLowerCase().trim() === inv.name?.toLowerCase().trim();
      const invIdMatch = v.investorId === inv.id;
      return invNameMatch || invIdMatch;
    });

    if (invVehicles.length === 0) return { payout: 0, currentMonthNet: 0, prevMonthKey: null, currentMonthKey: null, carriedDebt: 0, vehicles: [], transactionsDetails: [], previewDetails: [], previewNet: 0, monthlySummaries: [] };

    const investorTrans = (transactions || []).filter(t => 
      invVehicles.some(v => v.plate === t.vehiclePlate) ||
      (t.responsible?.toLowerCase().trim() === `investidor: ${inv.name?.toLowerCase().trim()}`)
    );

    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    // ── PASSO 1: Calcular o saldo líquido de TODOS os meses ───────────────────
    const monthlyNet = {};
    investorTrans.forEach(t => {
      if (!t.date) return;
      try {
        const tDate = new Date(t.date + 'T12:00:00');
        const monthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyNet[monthKey]) monthlyNet[monthKey] = 0;
        const detail = getInvestorShareForTransaction(t, invVehicles, rentals);
        monthlyNet[monthKey] += detail.share;
      } catch (e) { console.error(e); }
    });

    // ── PASSO 2: Determinar a competência vigente ─────────────────────────────
    // Calcula o saldo acumulado até (sem incluir) o mês anterior,
    // para saber o saldo real que seria pago no mês anterior
    const sortedMonths = Object.keys(monthlyNet).sort();
    let preCarried = 0;
    for (const month of sortedMonths) {
      if (month >= prevMonthKey) break;
      const total = (monthlyNet[month] || 0) + preCarried;
      preCarried = total > 0 ? 0 : total;
    }
    const prevMonthNetValue = monthlyNet[prevMonthKey] || 0;
    const tentativePayout = prevMonthNetValue + preCarried;

    // Verifica se houve pagamento explícito registrado no histórico
    const invPayoutHistory = payoutHistory[inv.id] || [];
    const wasExplicitlyPaid = invPayoutHistory.some(r => r.reference_month === prevMonthKey);

    // Calcula o 5º dia útil do mês atual (apenas seg-sex, sem feriados)
    const getFifthBusinessDay = (year, month) => {
      let count = 0, day = 1;
      while (count < 5) {
        const dow = new Date(year, month - 1, day).getDay();
        if (dow >= 1 && dow <= 5) count++;
        if (count < 5) day++;
      }
      return new Date(year, month - 1, day);
    };
    const [cy, cm] = currentMonthKey.split('-').map(Number);
    const fifthBD = getFifthBusinessDay(cy, cm);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isPastFifthBD = todayStart > fifthBD; // aciona APÓS o 5º dia útil, não no próprio dia

    // Avanço automático: após o 5º dia útil E não há nada a pagar ao investidor
    // (saldo nulo ou negativo — o investidor pode ter despesas sem receita)
    const autoAdvance = isPastFifthBD && tentativePayout <= 0;
    const prevMonthPaid = wasExplicitlyPaid || autoAdvance;

    // Competência vigente e chave de previsão
    const competenciaKey = prevMonthPaid ? currentMonthKey : prevMonthKey;
    const previewKey = prevMonthPaid ? null : currentMonthKey;

    // ── PASSO 3: Construir detalhes de transações da competência vigente ──────
    const transactionsDetails = [];
    const previewDetails = [];
    investorTrans.forEach(t => {
      if (!t.date) return;
      try {
        const tDate = new Date(t.date + 'T12:00:00');
        const monthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        const detail = getInvestorShareForTransaction(t, invVehicles, rentals);
        if (monthKey === competenciaKey) {
          transactionsDetails.push({
            id: t.id || Math.random().toString(),
            date: t.date, desc: t.desc, cat: t.cat, val: t.val,
            type: t.type, share: detail.share, explanation: detail.explanation,
            vehiclePlate: t.vehiclePlate
          });
        }
        if (previewKey && monthKey === previewKey) {
          previewDetails.push({
            id: t.id || Math.random().toString(),
            date: t.date, desc: t.desc, cat: t.cat, val: t.val,
            type: t.type, share: detail.share, explanation: detail.explanation,
            vehiclePlate: t.vehiclePlate
          });
        }
      } catch (e) { console.error(e); }
    });

    // ── PASSO 4: Construir sumário histórico e saldo final ────────────────────
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let carriedBalance = 0;
    const monthlySummaries = [];
    for (const month of sortedMonths) {
      if (month >= competenciaKey) break;
      const net = monthlyNet[month] || 0;
      const total = net + carriedBalance;
      const [yr, mo] = month.split('-');
      monthlySummaries.push({
        month: `${monthLabels[parseInt(mo) - 1]}/${yr}`,
        net, carriedBefore: carriedBalance, totalAfter: total
      });
      carriedBalance = total > 0 ? 0 : total;
    }

    const competenciaNet = monthlyNet[competenciaKey] || 0;
    const currentPayout = competenciaNet + carriedBalance;
    const previewNet = previewKey ? (monthlyNet[previewKey] || 0) : 0;

    return {
      payout: currentPayout,
      currentMonthNet: competenciaNet,
      prevMonthKey,
      currentMonthKey,
      competenciaKey,
      prevMonthPaid,
      autoAdvance,      // true quando avançou automaticamente por não ter nada a pagar
      tentativePayout,  // saldo que seria pago no mês anterior (para exibição no badge)
      carriedDebt: carriedBalance,
      vehicles: invVehicles,
      transactionsDetails: transactionsDetails.sort((a, b) => b.date.localeCompare(a.date)),
      previewDetails: previewDetails.sort((a, b) => b.date.localeCompare(a.date)),
      previewNet,
      monthlySummaries
    };
  };

  const [showForm, setShowForm] = React.useState(false);
  const [payoutModal, setPayoutModal] = useState(null); // { investor, amount }
  const [debtPaymentModal, setDebtPaymentModal] = useState(null); // { investor, debtAmount }
  const [debtPaymentInput, setDebtPaymentInput] = useState('');
  const [payoutHistory, setPayoutHistory] = useState({}); // investorId → []
  const [expandedHistory, setExpandedHistory] = useState({}); // investorId → bool
  const [selectedInvForCalc, setSelectedInvForCalc] = useState(null); // For memory modal
  const [selectedPlateFilter, setSelectedPlateFilter] = useState('all');
  const [investorSearch, setInvestorSearch] = useState('');

  const loadPayoutHistory = useCallback(async (investorId) => {
    const records = await getPayoutsForInvestor(investorId);
    setPayoutHistory(prev => ({ ...prev, [investorId]: records }));
  }, []);

  useEffect(() => {
    if (!investors || investors.length === 0) return;
    investors.forEach(inv => loadPayoutHistory(inv.id));
  }, [investors, loadPayoutHistory]);

  // If we start editing from outside, we should show the form
  React.useEffect(() => {
    if (isEditing) {
      setShowForm(true);
    }
  }, [isEditing]);

  // Pending investors list (unpaid previous month payout)
  const pendingInvestorsList = React.useMemo(() => {
    return (investors || []).filter(inv => {
      const { payout, prevMonthPaid } = calculateInvestorPayout(inv);
      return !prevMonthPaid && payout > 0;
    });
  }, [investors, vehicles, transactions, rentals, payoutHistory]);

  // Filter and sort investors: pending first, then positive payouts, then others
  const filteredAndSortedInvestors = [...(investors || [])]
    .filter(inv => (inv.name || '').toLowerCase().includes(investorSearch.toLowerCase()))
    .sort((a, b) => {
      const isPendingA = (() => {
        const { payout, prevMonthPaid } = calculateInvestorPayout(a);
        return !prevMonthPaid && payout > 0;
      })();
      const isPendingB = (() => {
        const { payout, prevMonthPaid } = calculateInvestorPayout(b);
        return !prevMonthPaid && payout > 0;
      })();

      if (isPendingA && !isPendingB) return -1;
      if (!isPendingA && isPendingB) return 1;

      const payoutA = calculateInvestorPayout(a).payout;
      const payoutB = calculateInvestorPayout(b).payout;
      
      if (payoutA > 0 && payoutB <= 0) return -1;
      if (payoutB > 0 && payoutA <= 0) return 1;
      return payoutB - payoutA;
    });

  // Overall statistics for all investors (ignoring search text)
  const stats = React.useMemo(() => {
    let totalToPay = 0;
    let totalDeficit = 0;
    let countGeneratingRevenue = 0;
    let totalManagedVehicles = 0;

    (investors || []).forEach(inv => {
      const { payout } = calculateInvestorPayout(inv);
      if (payout > 0) {
        totalToPay += payout;
        countGeneratingRevenue += 1;
      } else if (payout < 0) {
        totalDeficit += Math.abs(payout);
      }

      const invVehs = (vehicles || []).filter(v => {
        const invNameMatch = v.investor?.toLowerCase().trim() === inv.name?.toLowerCase().trim();
        const invIdMatch = v.investorId === inv.id;
        return invNameMatch || invIdMatch;
      });
      totalManagedVehicles += invVehs.length;
    });

    return {
      totalToPay,
      totalDeficit,
      countGeneratingRevenue,
      totalManagedVehicles
    };
  }, [investors, vehicles, transactions, rentals, payoutHistory]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Modal de repasse */}
      {payoutModal && (
        <InvestorPayoutModal
          investor={payoutModal.investor}
          amount={payoutModal.amount}
          referenceMonth={payoutModal.referenceMonth}
          onClose={() => setPayoutModal(null)}
          onSuccess={() => {
            loadPayoutHistory(payoutModal.investor.id);
            setPayoutModal(null);
          }}
        />
      )}

      {/* Modal de Memória de Cálculo */}
      {selectedInvForCalc && (() => {
        const { payout, currentMonthNet, competenciaKey, prevMonthKey, currentMonthKey, prevMonthPaid, autoAdvance, carriedDebt, transactionsDetails, previewDetails, previewNet, monthlySummaries, vehicles: invVehs } = calculateInvestorPayout(selectedInvForCalc);
        const monthLabelsLong = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        // Label da competência vigente (mês que serve de base para o próximo pagamento)
        const competenciaLabel = competenciaKey
          ? (() => { const [yr, mo] = competenciaKey.split('-'); return `${monthLabelsLong[parseInt(mo) - 1]}/${yr}`; })()
          : '';
        // Label do mês da previsão (só existe quando competência é o mês anterior)
        const previewMonthLabel = (!prevMonthPaid && currentMonthKey)
          ? (() => { const [yr, mo] = currentMonthKey.split('-'); return `${monthLabelsLong[parseInt(mo) - 1]}/${yr}`; })()
          : '';
        // Próximo mês (para o aviso do rodapé da previsão)
        const nextMonthLabel = currentMonthKey
          ? (() => { const d = new Date(parseInt(currentMonthKey.split('-')[0]), parseInt(currentMonthKey.split('-')[1]), 1); return monthLabelsLong[d.getMonth()]; })()
          : '';
        // Filtra apenas as que têm efeito financeiro para previsão
        const previewFiltered = previewDetails.filter(td => td.share !== 0);
        const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        const filteredTransactions = transactionsDetails.filter(td => {
          if (td.share === 0) return false;
          if (selectedPlateFilter === 'all') return true;
          if (selectedPlateFilter === 'none') return !td.vehiclePlate;
          return td.vehiclePlate === selectedPlateFilter;
        });
        
        const filteredTotalNet = filteredTransactions.reduce((acc, td) => acc + td.share, 0);

        // Função para obter o estilo de badge de categoria da transação
        const getCategoryBadge = (catName) => {
          const cat = (catName || '').toLowerCase().trim();
          if (cat.includes('aluguel')) {
            return <span className="px-2 py-0.5 rounded text-[8.5px] uppercase font-black bg-emerald-50 text-emerald-600 border border-emerald-100">Aluguel</span>;
          }
          if (cat.includes('taxa adm') || cat.includes('adm')) {
            return <span className="px-2 py-0.5 rounded text-[8.5px] uppercase font-black bg-neutral-100 text-neutral-600 border border-neutral-200">Taxa Adm</span>;
          }
          if (cat.includes('seguro') || cat.includes('franquia')) {
            return <span className="px-2 py-0.5 rounded text-[8.5px] uppercase font-black bg-amber-50 text-amber-600 border border-amber-100">Seguro</span>;
          }
          if (cat.includes('prote') || cat.includes('veicular')) {
            return <span className="px-2 py-0.5 rounded text-[8.5px] uppercase font-black bg-indigo-50 text-indigo-600 border border-indigo-100">Proteção</span>;
          }
          if (cat.includes('dívida') || cat.includes('divida')) {
            return <span className="px-2 py-0.5 rounded text-[8.5px] uppercase font-black bg-sky-50 text-sky-600 border border-sky-100">Quitação</span>;
          }
          return <span className="px-2 py-0.5 rounded text-[8.5px] uppercase font-black bg-neutral-50 text-neutral-500 border border-neutral-150">{catName || 'Outros'}</span>;
        };

        return (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-neutral-950/80 backdrop-blur-md p-0 sm:p-4 font-sans animate-in fade-in duration-300">
            <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-6xl overflow-hidden shadow-2xl relative flex flex-col sm:rounded-[2.5rem] rounded-none">
              
              {/* Modal Header */}
              <div className="p-4 sm:p-6 md:p-8 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-950 text-[#C5A059] rounded-xl sm:rounded-2xl flex items-center justify-center font-black select-none shadow-md shrink-0">
                    {selectedInvForCalc.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[8px] uppercase tracking-[0.2em] font-black text-[#C5A059]">Relatório Financeiro</span>
                    <h4 className="text-sm sm:text-base md:text-xl font-black uppercase tracking-tight text-neutral-900 leading-tight flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">{selectedInvForCalc.name}</span>
                      <span className="bg-emerald-50 text-emerald-700 text-[8px] md:text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap">
                        Memória de Cálculo
                      </span>
                    </h4>
                  </div>
                </div>
                <button onClick={() => setSelectedInvForCalc(null)} className="w-8 h-8 sm:w-10 sm:h-10 bg-white flex items-center justify-center rounded-full hover:bg-neutral-150 transition-all shadow-sm border border-neutral-100 active:scale-95 duration-200 shrink-0">
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
                  
                  {/* Coluna Esquerda: Resumo Consolidado (1/3) */}
                  <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-0">
                    
                    <div>
                      <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-3 flex items-center gap-1.5">
                        <Landmark size={12} className="text-[#C5A059]" /> Resumo de Saldo
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-4">
                        {/* Competência Vigente Card */}
                        <div className="bg-neutral-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-neutral-200 flex items-center justify-between shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-[#C5A059]/5 blur-xl -mr-8 -mt-8 rounded-full pointer-events-none" />
                          <div className="space-y-1.5">
                            <p className="text-[8px] uppercase text-neutral-400 font-black tracking-wider">Competência: {competenciaLabel}</p>
                            <p className="text-lg sm:text-xl font-mono font-black text-neutral-800">{formatCurrency(currentMonthNet)}</p>
                            {!prevMonthPaid ? (
                              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span> Aguardando pagamento
                              </span>
                            ) : payout <= 0 ? (
                              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span> Nada a pagar — Em andamento
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Em andamento
                              </span>
                            )}
                          </div>
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-neutral-200/50 rounded-lg sm:rounded-xl flex items-center justify-center text-neutral-700 shrink-0">
                            <Coins size={16} />
                          </div>
                        </div>

                        {/* Dívidas Anteriores Card */}
                        <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border flex items-center justify-between shadow-sm relative overflow-hidden ${
                          carriedDebt < 0 
                            ? 'bg-red-50/50 border-red-200 text-red-700' 
                            : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                        }`}>
                          <div className="space-y-1">
                            <p className="text-[8px] uppercase text-neutral-400 font-black tracking-wider">Dívidas Acumuladas</p>
                            <p className="text-lg sm:text-xl font-mono font-black">{formatCurrency(carriedDebt)}</p>
                          </div>
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                            carriedDebt < 0 ? 'bg-red-100/50 text-red-600' : 'bg-neutral-200/50 text-neutral-500'
                          }`}>
                            <AlertCircle size={16} />
                          </div>
                        </div>

                        {/* Líquido a Repassar Card */}
                        <div className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border flex items-center justify-between text-white shadow-md relative overflow-hidden ${
                          payout >= 0 
                            ? 'bg-neutral-900 border-neutral-800' 
                            : 'bg-red-600 border-red-500'
                        }`}>
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase text-[#C5A059] font-black tracking-widest">Saldo a Liquidar</p>
                            <p className="text-xl sm:text-2xl font-mono font-black">{formatCurrency(payout)}</p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-lg sm:rounded-xl flex items-center justify-center text-[#C5A059] shadow-inner shrink-0">
                            <Wallet size={18} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Associated Vehicles List */}
                    <div>
                      <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-3 flex items-center gap-1.5">
                        <Car size={12} className="text-[#C5A059]" /> Ativos Vinculados ({invVehs.length})
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                        {invVehs.map(v => (
                          <div key={v.id} className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl flex justify-between items-center hover:bg-neutral-100/70 transition-colors shadow-sm">
                            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                              <div className="w-8 h-8 bg-white border border-neutral-200/50 rounded-lg flex items-center justify-center text-neutral-500 shrink-0">
                                <Car size={14} className="text-[#C5A059]" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-neutral-800 truncate leading-snug">{v.model}</p>
                                <p className="text-[9px] font-mono text-neutral-400">{v.plate}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider block">Taxa Adm</span>
                              <span className="text-xs font-black text-neutral-800">{v.adminTax || 20}%</span>
                            </div>
                          </div>
                        ))}
                        {invVehs.length === 0 && (
                          <div className="col-span-full p-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 text-neutral-400 text-xs italic">
                            Nenhum veículo vinculado
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Coluna Direita: Detalhes das Transações e Dívidas (2/3) */}
                  <div className="lg:col-span-2 space-y-8">
                    
                    {/* Seção de Transações */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-2 border-b border-neutral-200">
                        <div>
                          <h5 className="text-sm font-black text-neutral-900 uppercase tracking-tight">Transações do Período</h5>
                          <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                            {!prevMonthPaid
                              ? <>Competência fechada: <span className="font-bold text-neutral-600">{competenciaLabel}</span>. Receitas do mês corrente estarão disponíveis após o pagamento ser registrado.</>
                              : payout <= 0
                              ? <>Nada a pagar em <span className="font-bold text-neutral-600">{competenciaLabel}</span>. Competência avançada automaticamente após o 5º dia útil.</>
                              : <>Competência em andamento: <span className="font-bold text-neutral-600">{competenciaLabel}</span>. Será pago no 5º dia útil do próximo mês.</>
                            }
                          </p>
                        </div>
                        
                        {invVehs.length > 0 && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-xl shadow-inner w-full sm:w-auto justify-between sm:justify-start">
                              <div className="flex items-center gap-2 w-full">
                                <Filter size={12} className="text-neutral-400 shrink-0" />
                                <select
                                  value={selectedPlateFilter}
                                  onChange={(e) => setSelectedPlateFilter(e.target.value)}
                                  className="bg-transparent text-xs font-bold text-neutral-700 outline-none border-none cursor-pointer pr-4 focus:ring-0 w-full"
                                >
                                  <option value="all">Todos os Ativos</option>
                                  <option value="none">Geral (Sem veículo)</option>
                                  {invVehs.map(v => (
                                    <option key={v.id} value={v.plate}>{v.model} ({v.plate})</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {selectedPlateFilter !== 'all' && (
                              <div className={`text-[10px] font-black px-3.5 py-2 rounded-xl border flex items-center justify-center sm:justify-start gap-1.5 shadow-sm w-full sm:w-auto shrink-0 ${
                                filteredTotalNet >= 0 
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                                  : 'bg-red-50 border-red-100 text-red-800'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                Líquido no Filtro: {formatCurrency(filteredTotalNet)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Tabela de Transações (Desktop) */}
                      <div className="hidden md:block border border-neutral-200 rounded-[1.5rem] overflow-hidden bg-white shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-neutral-50/80 border-b border-neutral-200">
                                <th className="px-4 py-3.5 font-black text-neutral-400 uppercase text-[9px] tracking-wider">Data / Descrição</th>
                                <th className="px-4 py-3.5 font-black text-neutral-400 uppercase text-[9px] tracking-wider">Veículo</th>
                                <th className="px-4 py-3.5 font-black text-neutral-400 uppercase text-[9px] tracking-wider text-right">Valor Bruto</th>
                                <th className="px-4 py-3.5 font-black text-neutral-400 uppercase text-[9px] tracking-wider">Memória de Cálculo (Fórmula)</th>
                                <th className="px-4 py-3.5 font-black text-neutral-400 uppercase text-[9px] tracking-wider text-right">Efeito Líquido</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 font-medium text-neutral-700">
                              {filteredTransactions.length === 0 ? (
                                <tr>
                                  <td colSpan="5" className="px-4 py-10 text-center text-neutral-400 italic">
                                    Nenhuma transação financeira registrada neste período.
                                  </td>
                                </tr>
                              ) : (
                                filteredTransactions.map(td => {
                                  const vehicle = invVehs.find(v => v.plate === td.vehiclePlate);
                                  return (
                                    <tr key={td.id} className="hover:bg-neutral-50/40 transition-colors">
                                      <td className="px-4 py-3.5">
                                        <div className="space-y-1">
                                          <p className="font-bold text-neutral-900">{td.desc}</p>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-neutral-400 font-bold">{new Date(td.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                            {getCategoryBadge(td.cat)}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3.5">
                                        {vehicle ? (
                                          <div className="inline-flex flex-col bg-neutral-50 border border-neutral-200/50 px-2.5 py-1.5 rounded-lg">
                                            <span className="font-bold text-neutral-800 leading-tight">{vehicle.model}</span>
                                            <span className="font-mono text-[9px] text-[#C5A059] font-black mt-0.5">{vehicle.plate}</span>
                                          </div>
                                        ) : (
                                          <span className="text-neutral-400 font-bold italic text-[10px]">Geral</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3.5 text-right font-mono font-bold text-neutral-800">
                                        <div className="flex flex-col items-end">
                                          <span className={td.type === 'in' ? 'text-neutral-800' : 'text-red-500'}>
                                            {td.type === 'in' ? '+' : '-'} {formatCurrency(td.val)}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3.5 text-[9.5px] text-neutral-500 leading-relaxed max-w-xs">
                                        {td.explanation}
                                      </td>
                                      <td className="px-4 py-3.5 text-right">
                                        <span className={`inline-block px-2.5 py-1 text-[11px] font-mono font-black rounded-lg border ${
                                          td.share > 0 
                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                            : td.share < 0 
                                              ? 'bg-red-50 border-red-100 text-red-700' 
                                              : 'bg-neutral-50 border-neutral-200 text-neutral-400'
                                        }`}>
                                          {td.share > 0 ? '+' : ''}{formatCurrency(td.share)}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Lista de Transações (Mobile) */}
                      <div className="block md:hidden space-y-4">
                        {filteredTransactions.length === 0 ? (
                          <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200 text-neutral-400 text-xs italic">
                            {selectedPlateFilter === 'all' 
                              ? 'Nenhuma transação financeira registrada neste período.' 
                              : 'Nenhuma transação correspondente ao ativo filtrado.'}
                          </div>
                        ) : (
                          filteredTransactions.map(td => {
                            const vehicle = invVehs.find(v => v.plate === td.vehiclePlate);
                            return (
                              <div key={td.id} className="p-4 sm:p-5 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl shadow-sm space-y-3 sm:space-y-3.5 animate-in fade-in duration-200">
                                <div className="flex justify-between items-start">
                                  <span className="text-[10px] text-neutral-400 font-bold">{new Date(td.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                  {getCategoryBadge(td.cat)}
                                </div>
                                
                                <div>
                                  <h6 className="text-xs sm:text-sm font-black text-neutral-950 leading-snug">{td.desc}</h6>
                                  {vehicle ? (
                                    <div className="mt-2 inline-flex flex-wrap items-center gap-1.5 bg-neutral-50 border border-neutral-200/50 px-2.5 py-1.5 rounded-lg">
                                      <Car size={10} className="text-[#C5A059] shrink-0" />
                                      <span className="text-[10px] font-bold text-neutral-700 leading-none">{vehicle.model}</span>
                                      <span className="text-[9px] font-mono text-neutral-400">({vehicle.plate})</span>
                                    </div>
                                  ) : (
                                    <span className="mt-2 inline-block text-[9.5px] text-neutral-400 font-bold bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100">Geral</span>
                                  )}
                                </div>

                                <div className="text-[10px] sm:text-[10.5px] text-neutral-600 bg-neutral-50 p-2.5 sm:p-3 rounded-xl border border-neutral-100/80 leading-relaxed font-medium">
                                  <span className="text-[8px] sm:text-[8.5px] uppercase font-black tracking-wider text-neutral-400 block mb-1">Memória de Cálculo (Fórmula)</span>
                                  {td.explanation}
                                </div>

                                <div className="flex justify-between items-center pt-3 sm:pt-3.5 border-t border-neutral-100">
                                  <div>
                                    <span className="text-[9px] uppercase font-black text-neutral-400 block tracking-wider">Bruto</span>
                                    <span className={`text-xs font-bold ${td.type === 'in' ? 'text-neutral-800' : 'text-red-500'}`}>
                                      {td.type === 'in' ? '+' : '-'} {formatCurrency(td.val)}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[9px] uppercase font-black text-neutral-400 block tracking-wider">Efeito Líquido</span>
                                    <span className={`inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-mono font-black rounded-lg border ${
                                      td.share > 0 
                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                        : td.share < 0 
                                          ? 'bg-red-50 border-red-100 text-red-700' 
                                          : 'bg-neutral-50 border-neutral-200 text-neutral-400'
                                    }`}>
                                      {td.share > 0 ? '+' : ''}{formatCurrency(td.share)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Evolução de Dívidas (Saldo de Meses Passados) */}
                    {monthlySummaries.length > 0 && (
                      <div className="bg-amber-50/30 border border-amber-200 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem]">
                        <h5 className="text-sm font-black text-amber-800 uppercase tracking-tight mb-4 flex items-center gap-1.5">
                          <History size={16} /> Evolução de Competências Anteriores
                        </h5>
                        <div className="relative border-l border-amber-200/80 ml-3.5 pl-6 space-y-5">
                          {monthlySummaries.map((s, idx) => (
                            <div key={idx} className="relative">
                              {/* Timeline indicator node */}
                              <div className="absolute -left-[31px] top-1.5 w-[18px] h-[18px] rounded-full border border-amber-300 bg-white flex items-center justify-center text-[7px] text-amber-600 font-bold">
                                {idx + 1}
                              </div>
                              <div className="bg-white/80 p-4 border border-amber-200/50 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shadow-sm hover:border-amber-400 transition-colors">
                                <div>
                                  <span className="text-[8px] uppercase tracking-wider text-amber-500 font-black block">Mês Referência</span>
                                  <span className="text-sm font-black text-neutral-800">{s.month}</span>
                                </div>
                                <div className="space-y-1 font-mono text-[11px] leading-tight w-full sm:w-auto">
                                  <div className="flex justify-between sm:justify-end gap-x-4">
                                    <span className="text-neutral-500 font-semibold">Saldo do Mês:</span>
                                    <span className={`font-bold ${s.net < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                      {formatCurrency(s.net)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between sm:justify-end gap-x-4">
                                    <span className="text-neutral-500 font-semibold">Saldo Acumulado:</span>
                                    <span className={`font-black ${s.totalAfter < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                      {formatCurrency(s.totalAfter)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Previsão do Próximo Repasse (Mês Atual em Aberto) */}
                    {previewFiltered.length > 0 && (
                      <div className="border-2 border-dashed border-neutral-200 rounded-2xl sm:rounded-[2rem] overflow-hidden">
                        {/* Header da seção */}
                        <div className="bg-neutral-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-neutral-200 rounded-lg flex items-center justify-center">
                              <Calendar size={13} className="text-neutral-500" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-neutral-800 uppercase tracking-tight">Previsão do Próximo Repasse</p>
                              <p className="text-[9px] text-neutral-400 font-medium">Competência em aberto: <span className="font-bold text-neutral-600">{previewMonthLabel}</span></p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[8px] uppercase font-black tracking-widest text-neutral-400 bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-full">Em aberto · Não computado</span>
                            <span className={`text-[11px] font-mono font-black px-3 py-1.5 rounded-xl border ${
                              previewNet >= 0 
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                : 'bg-red-50 border-red-100 text-red-700'
                            }`}>
                              {previewNet >= 0 ? '+' : ''}{formatCurrency(previewNet)}
                            </span>
                          </div>
                        </div>

                        {/* Tabela desktop */}
                        <div className="hidden md:block">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-neutral-100">
                                <th className="px-4 py-3 font-black text-neutral-400 uppercase text-[9px] tracking-wider">Data / Descrição</th>
                                <th className="px-4 py-3 font-black text-neutral-400 uppercase text-[9px] tracking-wider">Veículo</th>
                                <th className="px-4 py-3 font-black text-neutral-400 uppercase text-[9px] tracking-wider text-right">Valor Bruto</th>
                                <th className="px-4 py-3 font-black text-neutral-400 uppercase text-[9px] tracking-wider">Fórmula</th>
                                <th className="px-4 py-3 font-black text-neutral-400 uppercase text-[9px] tracking-wider text-right">Efeito Líquido</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 text-neutral-600">
                              {previewFiltered.map(td => {
                                const vehicle = invVehs.find(v => v.plate === td.vehiclePlate);
                                return (
                                  <tr key={td.id} className="hover:bg-neutral-50/60 transition-colors opacity-80">
                                    <td className="px-4 py-3">
                                      <div className="space-y-1">
                                        <p className="font-bold text-neutral-700">{td.desc}</p>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] text-neutral-400 font-bold">{new Date(td.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                          {getCategoryBadge(td.cat)}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      {vehicle ? (
                                        <div className="inline-flex flex-col bg-neutral-50 border border-neutral-200/50 px-2 py-1 rounded-lg">
                                          <span className="font-bold text-neutral-700 leading-tight text-[10px]">{vehicle.model}</span>
                                          <span className="font-mono text-[9px] text-[#C5A059] font-black mt-0.5">{vehicle.plate}</span>
                                        </div>
                                      ) : (
                                        <span className="text-neutral-400 italic text-[10px]">Geral</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-neutral-600">
                                      <span className={td.type === 'in' ? 'text-neutral-700' : 'text-red-400'}>
                                        {td.type === 'in' ? '+' : '-'} {formatCurrency(td.val)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-[9px] text-neutral-400 leading-relaxed max-w-xs">{td.explanation}</td>
                                    <td className="px-4 py-3 text-right">
                                      <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-black rounded-lg border ${
                                        td.share > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'
                                      }`}>
                                        {td.share > 0 ? '+' : ''}{formatCurrency(td.share)}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Cards mobile */}
                        <div className="block md:hidden p-4 space-y-3">
                          {previewFiltered.map(td => {
                            const vehicle = invVehs.find(v => v.plate === td.vehiclePlate);
                            return (
                              <div key={td.id} className="p-4 bg-white border border-neutral-100 rounded-xl shadow-sm space-y-3 opacity-90">
                                <div className="flex justify-between items-start">
                                  <span className="text-[10px] text-neutral-400 font-bold">{new Date(td.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                  {getCategoryBadge(td.cat)}
                                </div>
                                <div>
                                  <h6 className="text-xs font-black text-neutral-800 leading-snug">{td.desc}</h6>
                                  {vehicle ? (
                                    <div className="mt-1.5 inline-flex items-center gap-1.5 bg-neutral-50 border border-neutral-100 px-2 py-1 rounded-lg">
                                      <Car size={9} className="text-[#C5A059] shrink-0" />
                                      <span className="text-[9px] font-bold text-neutral-600">{vehicle.model}</span>
                                      <span className="text-[8px] font-mono text-neutral-400">({vehicle.plate})</span>
                                    </div>
                                  ) : (
                                    <span className="mt-1.5 inline-block text-[9px] text-neutral-400 font-bold bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-100">Geral</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-neutral-500 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 leading-relaxed">
                                  <span className="text-[8px] uppercase font-black tracking-wider text-neutral-400 block mb-0.5">Fórmula</span>
                                  {td.explanation}
                                </div>
                                <div className="flex justify-between items-center pt-2.5 border-t border-neutral-100">
                                  <div>
                                    <span className="text-[9px] uppercase font-black text-neutral-400 block tracking-wider">Bruto</span>
                                    <span className={`text-xs font-bold ${td.type === 'in' ? 'text-neutral-700' : 'text-red-400'}`}>
                                      {td.type === 'in' ? '+' : '-'} {formatCurrency(td.val)}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[9px] uppercase font-black text-neutral-400 block tracking-wider">Efeito Líquido</span>
                                    <span className={`inline-block px-2.5 py-0.5 text-xs font-mono font-black rounded-lg border ${
                                      td.share > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'
                                    }`}>
                                      {td.share > 0 ? '+' : ''}{formatCurrency(td.share)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Rodapé com aviso */}
                        <div className="px-4 sm:px-6 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center gap-2">
                          <AlertCircle size={11} className="text-neutral-400 shrink-0" />
                          <p className="text-[9px] text-neutral-400 font-medium">
                            Estas receitas ainda estão <strong>em aberto</strong> e serão incluídas no repasse do 5º dia útil de <strong>{nextMonthLabel}.</strong>
                          </p>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 border-t border-neutral-100 bg-neutral-50/30 flex justify-end shrink-0">
                <button 
                  onClick={() => setSelectedInvForCalc(null)}
                  className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-neutral-950 text-white text-[10px] uppercase tracking-widest font-black hover:bg-[#C5A059] transition-all rounded-xl shadow-md flex items-center justify-center"
                >
                  Fechar Detalhes
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal de Pagamento de Débito Manual */}
      {debtPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm relative shadow-2xl">
            <button onClick={() => setDebtPaymentModal(null)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-neutral-100 rounded-full hover:bg-neutral-200 transition-colors">
              <X size={16} />
            </button>
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6">
              <Landmark size={24} />
            </div>
            <h3 className="text-xl font-black mb-2 text-neutral-900 tracking-tight">Quitar Dívida</h3>
            <p className="text-sm text-neutral-500 mb-6 font-medium">Investidor: <span className="font-black text-neutral-900">{debtPaymentModal.investor.name}</span></p>
            
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl mb-6">
              <p className="text-[10px] font-black uppercase text-red-400 mb-1 tracking-widest">Saldo Devedor Atual</p>
              <p className="text-2xl font-black text-red-600">R$ {debtPaymentModal.debtAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Valor do Pagamento Recebido (R$)</label>
            <input 
               type="number" 
               value={debtPaymentInput}
               onChange={(e) => setDebtPaymentInput(e.target.value)}
               placeholder="Ex: 150.00"
               className="w-full bg-neutral-50 border border-neutral-150 p-5 text-lg rounded-2xl mt-2 mb-6 outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-black text-neutral-900 shadow-inner"
            />
            
            <button 
              onClick={async () => {
                 const val = parseFloat(debtPaymentInput);
                 if (val > 0) {
                   const result = await onAddTransaction({
                     type: 'in',
                     val: val,
                     cat: 'Pagamento de Dívida',
                     desc: `Pagamento de débito manual - ${debtPaymentModal.investor.name}`,
                     date: new Date().toISOString().split('T')[0],
                     responsible: `Investidor: ${debtPaymentModal.investor.name}`,
                     status: 'Concluído'
                   });
                   if (result && result.success) {
                     setShowAdminSuccess({
                       show: true,
                       title: 'Dívida Quitada',
                       message: `O pagamento de R$ ${val.toLocaleString('pt-BR')} foi registrado com sucesso, reduzindo o saldo devedor do investidor.`
                     });
                     setDebtPaymentModal(null);
                   }
                 }
              }}
              className="w-full py-5 bg-neutral-950 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#C5A059] transition-all shadow-lg active:scale-95 duration-200"
            >
               Confirmar Pagamento
            </button>
          </div>
        </div>
      )}

      {!showForm ? (
        <>
          {/* Header */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8 xl:mb-12">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-pulse" />
                <EditorialLabel className="text-[#C5A059] tracking-[0.3em]">Gestão de Ativos e Cotas</EditorialLabel>
              </div>
              <h3 className="text-3xl xl:text-4xl 2xl:text-5xl font-black uppercase tracking-tighter text-neutral-900 leading-none">Investidores</h3>
              <p className="text-neutral-500 font-medium italic text-lg tracking-tight">Painel de parceiros proprietários de ativos e controle financeiro de repasses.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto shrink-0">
              {/* Próximo Pagamento Info */}
              <div className="flex bg-neutral-900 px-6 py-4 rounded-2xl border border-neutral-800 shadow-xl items-center gap-4">
                <div className="w-10 h-10 bg-[#C5A059]/10 text-[#C5A059] rounded-xl flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-widest text-[#C5A059] font-black mb-0.5">Próximo Repasse (5º Dia Útil)</p>
                  <p className="text-xs font-black text-white font-mono">
                    {(() => {
                      const getFifthBusinessDay = (date = new Date()) => {
                        const year = date.getFullYear();
                        const month = date.getMonth();
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
                      const today = new Date();
                      const payoutDate = getFifthBusinessDay(new Date(today.getFullYear(), today.getMonth()));
                      if (today > payoutDate) {
                        return getFifthBusinessDay(new Date(today.getFullYear(), today.getMonth() + 1)).toLocaleDateString('pt-BR');
                      }
                      return payoutDate.toLocaleDateString('pt-BR');
                    })()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setInvestorForm({
                    name: '', email: '', phone: '', cpf: '', address: '',
                    password: '', status: 'Ativo', bank: '', pix: ''
                  });
                  setIsEditing(false);
                  setShowForm(true);
                }}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-neutral-950 text-[#C5A059] text-[10px] uppercase tracking-[0.2em] font-black rounded-2xl hover:bg-[#C5A059] hover:text-white transition-all shadow-xl shadow-neutral-950/10 group whitespace-nowrap"
              >
                <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                Novo Investidor
              </button>
            </div>
          </div>

          {/* Painel de Estatísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 xl:mb-12">
            {[
              { 
                label: 'Total a Repassar', 
                value: stats.totalToPay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 
                color: 'gold' 
              },
              { 
                label: 'Geraram Receita', 
                value: `${stats.countGeneratingRevenue} ${stats.countGeneratingRevenue === 1 ? 'investidor' : 'investidores'}`, 
                color: 'emerald' 
              },
              { 
                label: 'Déficits Acumulados', 
                value: stats.totalDeficit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 
                color: 'red' 
              },
              { 
                label: 'Veículos sob Gestão', 
                value: `${stats.totalManagedVehicles} ${stats.totalManagedVehicles === 1 ? 'veículo' : 'veículos'}`, 
                color: 'neutral' 
              }
            ].map((card, i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-neutral-50 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
                <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-2">{card.label}</p>
                <p className={`text-xl sm:text-2xl font-black font-sans leading-none ${
                  card.color === 'red' ? 'text-red-500' : 
                  card.color === 'emerald' ? 'text-emerald-600' : 
                  card.color === 'gold' ? 'text-[#C5A059]' : 
                  'text-neutral-900'
                }`}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Alerta de Repasses Pendentes */}
          {pendingInvestorsList.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] mb-8 xl:mb-12 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4 duration-500">
              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                <AlertCircle size={22} className="animate-pulse" />
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <h4 className="text-sm font-black text-amber-800 uppercase tracking-tight">Atenção: Repasses Pendentes</h4>
                <p className="text-xs text-amber-700 font-medium leading-relaxed">
                  Há <span className="font-black">{pendingInvestorsList.length}</span> {pendingInvestorsList.length === 1 ? 'investidor' : 'investidores'} com repasse do mês anterior pendente de pagamento: 
                  <span className="font-bold"> {pendingInvestorsList.map(i => i.name).join(', ')}</span>.
                </p>
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                  Por favor, registre os pagamentos para que o sistema avance para a competência atual.
                </p>
              </div>
            </div>
          )}

          {/* Barra de Pesquisa */}
          <div className="bg-white rounded-[2rem] xl:rounded-[3rem] p-6 border border-neutral-100 shadow-sm mb-8 xl:mb-12 flex flex-col lg:flex-row gap-6 justify-between items-center">
            <div className="relative flex-1 w-full group">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
              <input 
                type="text" 
                value={investorSearch} 
                onChange={e => setInvestorSearch(e.target.value)} 
                placeholder="Pesquisar por nome do investidor..." 
                className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-14 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner text-neutral-800" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
            {filteredAndSortedInvestors.map((investor) => {
              const { payout, currentMonthNet, carriedDebt, competenciaKey } = calculateInvestorPayout(investor);
              const invVehs = (vehicles || []).filter(v => {
                const invNameMatch = v.investor?.toLowerCase().trim() === investor.name?.toLowerCase().trim();
                const invIdMatch = v.investorId === investor.id;
                return invNameMatch || invIdMatch;
              });

              return (
                <div key={investor.id} className="bg-white rounded-3xl border border-neutral-100 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-neutral-200/80 transition-all duration-300 relative overflow-hidden group">
                  {/* Background ambient light */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 blur-3xl -mr-16 -mt-16 animate-pulse pointer-events-none" />
                  
                  <div>
                    {/* Card Top: Profile and quick actions */}
                    <div className="flex justify-between items-start mb-5 pb-4 border-b border-neutral-100/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 bg-neutral-950 text-[#C5A059] rounded-2xl flex items-center justify-center font-black text-lg shadow-md shrink-0 group-hover:scale-105 transition-transform duration-300 select-none">
                          {investor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-black text-neutral-900 uppercase tracking-tight truncate" title={investor.name}>
                            {investor.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${investor.status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">{investor.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setInvestorForm(investor);
                            setIsEditing(true);
                            setShowForm(true);
                          }}
                          className="w-8 h-8 bg-neutral-50 text-neutral-400 border border-neutral-200/50 rounded-lg flex items-center justify-center hover:border-[#C5A059] hover:text-[#C5A059] hover:bg-white transition-all shadow-sm active:scale-95"
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => {
                            console.log("ADMIN_INVESTIDORES: Clique no botão de excluir investidor:", investor);
                            setItemToDelete(investor);
                            setDeleteType('investor');
                            setShowDeleteAuthModal(true);
                          }}
                          className="w-8 h-8 bg-red-50/50 text-red-400 border border-red-100/50 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Personal & Bank info block */}
                    <div className="bg-neutral-50/50 border border-neutral-100/70 p-4 rounded-2xl space-y-3.5 mb-5">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-neutral-400">
                          <span>Identificação</span>
                          <span>Contatos</span>
                        </div>
                        
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <p className="text-[8px] uppercase text-neutral-400 font-black">CPF</p>
                            <p className="text-xs font-mono font-bold text-neutral-800 truncate">{investor.cpf || 'Não Informado'}</p>
                          </div>
                          <div className="text-right min-w-0">
                            <p className="text-[8px] uppercase text-neutral-400 font-black">Telefone / E-mail</p>
                            <p className="text-[11px] font-bold text-neutral-800 truncate">{investor.phone}</p>
                            <p className="text-[9px] font-medium text-neutral-400 truncate" title={investor.email}>{investor.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-neutral-100/80 space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-black">Dados para Payout / PIX</span>
                        <p className="text-xs text-neutral-800 font-bold leading-tight truncate">
                          {investor.bank ? `${investor.bank}` : 'Banco N/I'}
                        </p>
                        <p className="text-[10px] font-semibold text-neutral-500 truncate">
                          Chave PIX: <span className="text-[#C5A059] font-bold">{investor.pix || 'Não Informada'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Financial details container */}
                    <div className="bg-[#C5A059]/5 border border-[#C5A059]/10 p-4 rounded-2xl space-y-4 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-[#C5A059] font-black">Saldo Repasse (Líquido)</span>
                          <h4 className="text-xl font-mono font-black text-neutral-900 leading-none mt-1">
                            R$ {Math.max(0, payout).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h4>
                          
                          <button
                            onClick={() => {
                              setSelectedPlateFilter('all');
                              setSelectedInvForCalc(investor);
                            }}
                            className="mt-2 text-[9.5px] text-[#C5A059] font-black uppercase tracking-widest underline flex items-center gap-1 hover:text-neutral-950 transition-colors"
                          >
                            Ver Memória de Cálculo
                          </button>
                          
                          {carriedDebt < 0 && (
                            <div className="mt-1.5 flex items-center gap-1">
                              <span className="bg-red-50 border border-red-100 text-red-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                Débito: - R$ {Math.abs(carriedDebt).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          
                          {payout < 0 && (
                            <p className="text-[8px] text-red-500 font-black uppercase tracking-wider mt-1.5">
                              Déficit acumulado para próximo ciclo: R$ {Math.abs(payout).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                        
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                          payout > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 
                          payout < 0 ? 'bg-red-50 text-red-600 border-red-100/50' : 
                          'bg-neutral-50 text-neutral-400 border-neutral-200/50'
                        }`}>
                          {payout > 0 ? 'A Repassar' : (payout < 0 ? 'Em Débito' : 'Sem Saldo')}
                        </span>
                      </div>

                      {/* Associated Vehicles & ADM Taxes */}
                      <div className="pt-3 border-t border-[#C5A059]/10 space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-[#C5A059]">
                          <span>Ativos Sob Gestão ({invVehs.length})</span>
                          <span>Taxa Adm</span>
                        </div>
                        
                        {invVehs.length > 0 ? (
                          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                            {invVehs.map(v => (
                              <div key={v.id} className="flex justify-between items-center text-[10px] text-neutral-700 font-bold bg-white/60 px-2.5 py-1 rounded-lg border border-neutral-100">
                                <span className="truncate max-w-[130px]">{v.model} <span className="font-mono text-[9px] text-neutral-400">({v.plate})</span></span>
                                <span className="font-black text-neutral-900">{v.adminTax || 20}%</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[9px] text-neutral-400 font-bold italic uppercase">Nenhum veículo associado</p>
                        )}
                        
                        <div className="flex justify-between items-center text-[9px] text-neutral-400 font-bold uppercase pt-1.5">
                          <span>Seguro Franquia Total (Fixo)</span>
                          <span className="font-mono text-neutral-800">
                            R$ {(39.90 * invVehs.length).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Payout status for current reference month */}
                      {(() => {
                        const now = new Date();
                        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                        const currentPayoutRecord = (payoutHistory[investor.id] || []).find(p => p.reference_month === currentMonthKey);
                        
                        const getFifthBusinessDay = (date = new Date()) => {
                          const year = date.getFullYear();
                          const month = date.getMonth();
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
                        const forecastDate = getFifthBusinessDay(now).toLocaleDateString('pt-BR');

                        return (
                          <div className="pt-3 border-t border-[#C5A059]/10 flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            <span>Status Repasse:</span>
                            <div className="text-right">
                              <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${currentPayoutRecord ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                {currentPayoutRecord ? 'Pago' : 'Pendente'}
                              </span>
                              <p className="text-[7.5px] text-neutral-400 mt-1 font-bold">
                                {currentPayoutRecord 
                                  ? `Data: ${new Date(currentPayoutRecord.paid_at).toLocaleDateString('pt-BR')}`
                                  : `Previsão: ${forecastDate}`
                                }
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="space-y-4">
                    {payout > 0 ? (
                      <button
                        onClick={() => setPayoutModal({ investor, amount: payout, referenceMonth: competenciaKey })}
                        className="w-full py-3.5 bg-neutral-950 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[#C5A059] transition-all flex items-center justify-center gap-2 group shadow-sm active:scale-95 duration-200"
                      >
                        <SendHorizonal size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        Registrar Repasse
                      </button>
                    ) : payout < 0 ? (
                      <button
                        onClick={() => {
                          setDebtPaymentInput(Math.abs(payout).toString());
                          setDebtPaymentModal({ investor, debtAmount: Math.abs(payout) });
                        }}
                        className="w-full py-3.5 bg-amber-500 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 duration-200"
                      >
                        Pagar Débitos Pendentes
                      </button>
                    ) : null}

                    {/* Payout History Collapsible list */}
                    {(payoutHistory[investor.id] || []).length > 0 && (
                      <div className="border-t border-neutral-100/80 pt-3">
                        <button
                          onClick={() => setExpandedHistory(prev => ({ ...prev, [investor.id]: !prev[investor.id] }))}
                          className="w-full flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors py-1"
                        >
                          <span className="flex items-center gap-1.5"><History size={11} /> Histórico de Repasses</span>
                          {expandedHistory[investor.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {expandedHistory[investor.id] && (
                          <div className="space-y-2 mt-2 max-h-36 overflow-y-auto pr-1 animate-in fade-in slide-in-from-top-1 duration-300">
                            {(payoutHistory[investor.id] || []).map(p => (
                              <div key={p.id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                                <div className="min-w-0">
                                  <p className="text-[9px] font-black text-neutral-950 uppercase">{formatReferenceMonth(p.reference_month)}</p>
                                  <p className="text-[8px] text-neutral-400 font-bold uppercase truncate">
                                    {new Date(p.paid_at).toLocaleDateString('pt-BR')} — PIX: {p.pix_key || '—'}
                                  </p>
                                  {p.notes && <p className="text-[8px] text-neutral-400 italic mt-0.5">{p.notes}</p>}
                                </div>
                                <span className="text-[10px] font-black text-emerald-600 whitespace-nowrap ml-4">
                                  R$ {parseFloat(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredAndSortedInvestors.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-400 space-y-4 bg-white rounded-[2.5rem] border border-dashed border-neutral-200">
                <Users size={36} className="text-neutral-200" />
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-300">
                  {investorSearch ? 'Nenhum investidor correspondente encontrado.' : 'Nenhum investidor cadastrado ainda.'}
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Add/Edit Form */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 xl:mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-pulse" />
                <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-900 leading-none">
                  {isEditing ? 'Editar Investidor' : 'Cadastro de Investidor'}
                </h3>
              </div>
              <p className="text-neutral-500 font-medium italic text-lg tracking-tight">Preencha os dados abaixo para {isEditing ? 'atualizar' : 'cadastrar'} o parceiro no ecossistema.</p>
            </div>
            
            <button
              onClick={() => {
                setShowForm(false);
                setIsEditing(false);
              }}
              className="flex items-center gap-2 px-6 py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[10px] uppercase tracking-[0.2em] font-bold rounded-2xl transition-all"
            >
              <X size={14} /> Voltar para Listagem
            </button>
          </div>

          <div className="bg-white p-8 xl:p-12 rounded-[2rem] xl:rounded-[3rem] border border-neutral-100 shadow-2xl shadow-neutral-900/5">
            <form className="space-y-10" onSubmit={e => e.preventDefault()}>
              
              {/* Seção 1: Dados Cadastrais */}
              <div className="space-y-6">
                <h5 className="text-[11px] uppercase tracking-[0.4em] text-neutral-900 font-black flex items-center gap-2 pb-2 border-b border-neutral-100">
                  <User size={14} className="text-[#C5A059]" /> Informações Cadastrais
                </h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Nome Completo</label>
                    <div className="relative group">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
                      <input 
                        type="text" 
                        value={investorForm.name || ''} 
                        onChange={e => setInvestorForm({ ...investorForm, name: e.target.value })} 
                        className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-12 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
                        placeholder="Nome do parceiro investidor" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">CPF</label>
                    <input 
                      type="text" 
                      value={investorForm.cpf || ''} 
                      onChange={e => setInvestorForm({ ...investorForm, cpf: formatCPF(e.target.value) })} 
                      className="w-full bg-neutral-50 border border-neutral-100 py-4 px-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
                      placeholder="000.000.000-00" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">E-mail Comercial</label>
                    <div className="relative group">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
                      <input 
                        type="email" 
                        value={investorForm.email || ''} 
                        onChange={e => setInvestorForm({ ...investorForm, email: e.target.value })} 
                        className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-12 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
                        placeholder="exemplo@laveiculos.com.br" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Contato Telefônico</label>
                    <div className="relative group">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
                      <input 
                        type="text" 
                        value={investorForm.phone || ''} 
                        onChange={e => setInvestorForm({ ...investorForm, phone: e.target.value })} 
                        className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-12 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
                        placeholder="(00) 99999-9999" 
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Endereço Residencial Completo</label>
                    <div className="relative group">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
                      <input 
                        type="text" 
                        value={investorForm.address || ''} 
                        onChange={e => setInvestorForm({ ...investorForm, address: e.target.value })} 
                        className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-12 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
                        placeholder="Rua, Número, Bairro, Cidade, Estado" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seções de Payout e Acesso lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 pt-4">
                
                {/* Seção 2: Acesso ao Portal */}
                <div className="space-y-6 bg-neutral-50/50 p-6 rounded-3xl border border-neutral-100">
                  <h5 className="text-[11px] uppercase tracking-[0.4em] text-neutral-900 font-black flex items-center gap-2 pb-2 border-b border-neutral-100">
                    <Key size={14} className="text-[#C5A059]" /> Acesso ao Portal
                  </h5>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Senha do Portal</label>
                      <input 
                        type="text" 
                        value={investorForm.password || ''} 
                        onChange={e => setInvestorForm({ ...investorForm, password: e.target.value })} 
                        className="w-full bg-white border border-neutral-100 py-4 px-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner font-mono tracking-widest" 
                        placeholder="Senha segura de acesso" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Status da Conta</label>
                      <select 
                        value={investorForm.status || 'Ativo'} 
                        onChange={e => setInvestorForm({ ...investorForm, status: e.target.value })} 
                        className="w-full bg-white border border-neutral-100 py-4 px-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seção 3: Dados de Repasse */}
                <div className="space-y-6 bg-neutral-50/50 p-6 rounded-3xl border border-neutral-100">
                  <h5 className="text-[11px] uppercase tracking-[0.4em] text-neutral-900 font-black flex items-center gap-2 pb-2 border-b border-neutral-100">
                    <Landmark size={14} className="text-[#C5A059]" /> Dados para Repasse
                  </h5>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Dados Bancários Completos</label>
                      <input 
                        type="text" 
                        value={investorForm.bank || ''} 
                        onChange={e => setInvestorForm({ ...investorForm, bank: e.target.value })} 
                        className="w-full bg-white border border-neutral-100 py-4 px-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
                        placeholder="Banco, Agência e Conta Corrente" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Chave PIX Oficial</label>
                      <input 
                        type="text" 
                        value={investorForm.pix || ''} 
                        onChange={e => setInvestorForm({ ...investorForm, pix: e.target.value })} 
                        className="w-full bg-white border border-neutral-100 py-4 px-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner text-[#C5A059]" 
                        placeholder="Celular, CPF/CNPJ, E-mail ou Chave Aleatória" 
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Botões do Formulário */}
              <div className="flex justify-end gap-6 pt-6 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setInvestorForm({
                      name: '', email: '', phone: '', cpf: '', address: '',
                      password: '', status: 'Ativo', bank: '', pix: ''
                    });
                    setShowForm(false);
                  }}
                  className="px-8 py-4 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (isEditing) {
                      const res = await onUpdateInvestor(investorForm);
                      if (res && !res.success) return;
                      setIsEditing(false);
                      setShowAdminSuccess({
                        show: true,
                        title: 'Investidor Atualizado',
                        message: 'Os dados do parceiro foram atualizados com sucesso no sistema.'
                      });
                    } else {
                      const res = await onAddInvestor(investorForm);
                      if (res && !res.success) return;
                      setShowAdminSuccess({
                        show: true,
                        title: 'Investidor Cadastrado',
                        message: 'O novo parceiro foi registrado com sucesso no sistema da L.A Locação.'
                      });
                    }
                    setInvestorForm({
                      name: '', email: '', phone: '', cpf: '', address: '',
                      password: '', status: 'Ativo', bank: '', pix: ''
                    });
                    setShowForm(false);
                  }}
                  className="px-12 py-5 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-xl hover:bg-[#C5A059] transition-all shadow-xl active:scale-95 duration-200"
                >
                  {isEditing ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </div>

            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminInvestidores;
