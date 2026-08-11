import React, { useState } from 'react';
import { X, Landmark, Car, Calendar, Filter, History, AlertCircle, Info, Wallet, Trash2 } from 'lucide-react';

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

  const calculateInvestorPayout = (inv, vehicles, transactions, rentals, payoutHistory) => {
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
    const invPayoutHistory = Array.isArray(payoutHistory) ? payoutHistory.filter(p => p.investor_id === inv.id) : (payoutHistory[inv.id] || []);
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

    // ── PASSO 3: Construir detalhes de transações por mês ──────
    const transactionsByMonth = {};
    const transactionsDetails = [];
    const previewDetails = [];
    investorTrans.forEach(t => {
      if (!t.date) return;
      try {
        const tDate = new Date(t.date + 'T12:00:00');
        const monthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        const detail = getInvestorShareForTransaction(t, invVehicles, rentals);
        
        const detailObj = {
          id: t.id || Math.random().toString(),
          date: t.date, desc: t.desc, cat: t.cat, val: t.val,
          type: t.type, share: detail.share, explanation: detail.explanation,
          vehiclePlate: t.vehiclePlate
        };

        if (!transactionsByMonth[monthKey]) {
          transactionsByMonth[monthKey] = [];
        }
        transactionsByMonth[monthKey].push(detailObj);

        if (monthKey === competenciaKey) {
          transactionsDetails.push(detailObj);
        }
        if (previewKey && monthKey === previewKey) {
          previewDetails.push(detailObj);
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
        month: `${monthLabels[parseInt(mo) - 1]}/${yr}`, monthKey: month,
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
      transactionsByMonth,
      previewNet,
      monthlySummaries
    };
  };


const InvestorCalcModal = ({ investor, vehicles = [], transactions = [], rentals = [], realPayouts = [], onClose }) => {
  const [selectedMonthForCalc, setSelectedMonthForCalc] = useState(null);
  const [selectedPlateFilter, setSelectedPlateFilter] = useState('all');

        if (!investor) return null;

          const { payout, currentMonthNet, competenciaKey, prevMonthKey, currentMonthKey, prevMonthPaid, autoAdvance, carriedDebt, transactionsDetails, previewDetails, previewNet, monthlySummaries, vehicles: invVehs, transactionsByMonth } = calculateInvestorPayout(investor, vehicles, transactions, rentals, realPayouts);
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
        const formatCurrency = (val) => (parseFloat(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        const activeMonth = selectedMonthForCalc || competenciaKey;
        const activeTransactions = (transactionsByMonth && transactionsByMonth[activeMonth] ? transactionsByMonth[activeMonth] : []).sort((a, b) => b.date.localeCompare(a.date));
        let activeNet = 0;
        let activeCarriedDebt = 0;
        let activePayout = 0;
        let activeIsPaid = false;
        
        if (activeMonth === competenciaKey) {
            activeNet = currentMonthNet;
            activeCarriedDebt = carriedDebt;
            activePayout = payout;
            activeIsPaid = prevMonthPaid;
            const invPayoutHistory = Array.isArray(realPayouts) ? realPayouts.filter(p => p.investor_id === investor.id) : [];
            activeIsPaid = invPayoutHistory.some(r => r.reference_month === activeMonth);
        } else {
            const summary = monthlySummaries.find(s => s.monthKey === activeMonth);
            if (summary) {
                activeNet = summary.net;
                activeCarriedDebt = summary.carriedBefore;
                activePayout = summary.totalAfter;
            } else {
                activeNet = (transactionsByMonth[activeMonth] || []).reduce((acc, t) => acc + t.share, 0);
                activePayout = activeNet;
            }
            const invPayoutHistory = Array.isArray(realPayouts) ? realPayouts.filter(p => p.investor_id === investor.id) : [];
            activeIsPaid = invPayoutHistory.some(r => r.reference_month === activeMonth);
        }

        const filteredTransactions = activeTransactions.filter(td => {
          if (td.share === 0) return false;
          if (selectedPlateFilter === 'all') return true;
          if (selectedPlateFilter === 'none') return !td.vehiclePlate;
          return td.vehiclePlate === selectedPlateFilter;
        });
        
        
        const filteredTotalNet = filteredTransactions.reduce((acc, td) => acc + td.share, 0);
        const totalEntradas = filteredTransactions.reduce((acc, td) => td.share > 0 ? acc + td.share : acc, 0);
        const totalSaidas = filteredTransactions.reduce((acc, td) => td.share < 0 ? acc + Math.abs(td.share) : acc, 0);
        

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

        const modalContent = (
<div className="fixed inset-0 z-[160] flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm p-0 sm:p-4 font-sans animate-in fade-in duration-300">
            <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-6xl overflow-hidden shadow-2xl relative flex flex-col sm:rounded-2xl rounded-none border border-neutral-200">
              
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b border-neutral-100 flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-neutral-900 text-white rounded-lg flex items-center justify-center font-bold text-lg select-none shrink-0">
                    {(investor.name || 'I').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-widest font-semibold text-neutral-400">Extrato Consolidado</span>
                    <h4 className="text-base md:text-lg font-bold text-neutral-900 leading-tight flex flex-wrap items-center gap-2 min-w-0">
                      <span className="truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">{investor.name || 'Investidor'}</span>
                      <span className="bg-neutral-100 text-neutral-600 text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded border border-neutral-200 whitespace-nowrap">
                        Painel do Investidor
                      </span>
                    </h4>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-900 shrink-0">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto bg-neutral-50 p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Coluna Esquerda: Resumo Consolidado */}
                  <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-0">

                    {/* Filtro Mobile de Mês */}
                    <div className="block lg:hidden bg-white p-3 rounded-xl border border-neutral-200 shadow-sm">
                       <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 block">Mês de Referência (Competência)</label>
                       <select
                         value={activeMonth}
                         onChange={(e) => setSelectedMonthForCalc(e.target.value)}
                         className="w-full bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm rounded-lg px-3 py-2 outline-none font-bold cursor-pointer"
                       >
                         {Array.from(new Set([...Object.keys(transactionsByMonth), competenciaKey].filter(Boolean))).sort().reverse().map(m => {
                           const [yr, mo] = m.split('-');
                           const label = `${monthLabelsLong[parseInt(mo) - 1]}/${yr}`;
                           return <option key={m} value={m}>{label} {m === competenciaKey ? '(Vigente)' : ''}</option>
                         })}
                       </select>
                    </div>
                    
                    <div>
                      <h5 className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-3 flex items-center gap-1.5">
                        <Landmark size={14} className="text-neutral-400" /> Resumo de Saldo
                      </h5>
                      <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                        {/* Competência Vigente Card */}
                        <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-xl border border-neutral-200 flex flex-col justify-between relative overflow-hidden">
                          <div className="space-y-1 z-10">
                            <p className="text-[10px] uppercase text-neutral-500 font-medium tracking-wide">Receita Bruta {activeMonth === competenciaKey ? "Vigente" : ""}</p>
                            <p className="text-xl font-medium text-neutral-900 font-mono tracking-tight">{formatCurrency(activeNet)}</p>
                          </div>
                          <div className="mt-3 z-10 flex">
                            {!activeIsPaid ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                                Aguardando pagamento
                              </span>
                            ) : activePayout <= 0 ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
                                Nada a pagar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                                Em andamento
                              </span>
                            )}
                          </div>
                        </div>

                        
                        {/* Entradas e Saidas Card */}
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex flex-col justify-center shadow-sm">
                           <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-0.5">Entradas</span>
                           <span className="text-sm lg:text-base font-black font-mono text-emerald-800 tracking-tight">+ {formatCurrency(totalEntradas)}</span>
                        </div>
                        <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex flex-col justify-center shadow-sm">
                           <span className="text-[9px] font-bold uppercase tracking-widest text-rose-600 mb-0.5">Saídas</span>
                           <span className="text-sm lg:text-base font-black font-mono text-rose-800 tracking-tight">- {formatCurrency(totalSaidas)}</span>
                        </div>

                        {/* Dívidas Anteriores Card */}
                        <div className={`col-span-2 lg:col-span-1 p-4 rounded-xl border flex flex-col justify-between relative overflow-hidden ${
                          carriedDebt < 0 
                            ? 'bg-rose-50/30 border-rose-200 text-rose-800' 
                            : 'bg-white border-neutral-200 text-neutral-800'
                        }`}>
                          <div className="space-y-1">
                            <p className={`text-[10px] uppercase font-medium tracking-wide ${carriedDebt < 0 ? 'text-rose-600' : 'text-neutral-500'}`}>Despesas / Saldo Negativo</p>
                            <p className="text-xl font-medium font-mono tracking-tight">{formatCurrency(carriedDebt)}</p>
                          </div>
                        </div>

                        {/* Líquido a Repassar Card */}
                        <div className="col-span-2 lg:col-span-1 p-4 rounded-xl border border-neutral-900 bg-neutral-900 flex flex-col justify-between text-white relative overflow-hidden shadow-sm">
                          <div className="space-y-1 z-10">
                            <p className="text-[10px] uppercase text-neutral-400 font-medium tracking-wide">Liquidação Final</p>
                            <p className={`text-2xl font-semibold font-mono tracking-tight ${activePayout >= 0 ? 'text-white' : 'text-rose-400'}`}>
                              {formatCurrency(activePayout)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    

                  </div>

                  {/* Coluna Direita: Detalhes das Transações e Dívidas (2/3) */}
                  <div className="lg:col-span-9 space-y-8">
                    
                    {/* Seção de Transações */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-2 border-b border-neutral-200">
                        <div>
                          <h5 className="text-sm font-bold text-neutral-800 uppercase tracking-tight flex items-center gap-2">
                            Transações
                            <select
                              value={activeMonth}
                              onChange={(e) => setSelectedMonthForCalc(e.target.value)}
                              className="hidden lg:block ml-2 bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs rounded-md px-2 py-1 outline-none font-semibold cursor-pointer hover:bg-neutral-200 transition-colors"
                            >
                              {Array.from(new Set([...Object.keys(transactionsByMonth), competenciaKey].filter(Boolean))).sort().reverse().map(m => {
                                const [yr, mo] = m.split('-');
                                const label = `${monthLabelsLong[parseInt(mo) - 1]}/${yr}`;
                                return <option key={m} value={m}>{label} {m === competenciaKey ? '(Vigente)' : ''}</option>
                              })}
                            </select>
                          </h5>
                          <p className="text-[10px] text-neutral-500 font-medium mt-1">
                            {activeMonth === competenciaKey ? (
                              !prevMonthPaid
                                ? <>Competência fechada: <span className="font-semibold text-neutral-700">{competenciaLabel}</span>. Receitas do mês corrente estarão disponíveis após o pagamento ser registrado.</>
                                : payout <= 0
                                ? <>Nada a pagar em <span className="font-semibold text-neutral-700">{competenciaLabel}</span>. Competência avançada automaticamente após o 5º dia útil.</>
                                : <>Competência em andamento: <span className="font-semibold text-neutral-700">{competenciaLabel}</span>. Será pago no 5º dia útil do próximo mês.</>
                            ) : (
                               <>Cálculos do mês de <span className="font-semibold text-neutral-700">{
                                 (() => { const [yr, mo] = activeMonth.split('-'); return `${monthLabelsLong[parseInt(mo) - 1]}/${yr}`; })()
                               }</span>.</>
                            )}
                          </p>
                        </div>
                        
                        {invVehs.length > 0 && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2 bg-white border border-neutral-200 px-3 py-1.5 rounded-lg w-full sm:w-auto justify-between sm:justify-start hover:border-neutral-300 transition-colors">
                              <div className="flex items-center gap-2 w-full">
                                <Filter size={12} className="text-neutral-400 shrink-0" />
                                <select
                                  value={selectedPlateFilter}
                                  onChange={(e) => setSelectedPlateFilter(e.target.value)}
                                  className="bg-transparent text-xs font-semibold text-neutral-600 outline-none border-none cursor-pointer pr-4 focus:ring-0 w-full"
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
                              <div className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg border flex items-center justify-center sm:justify-start gap-1.5 w-full sm:w-auto shrink-0 ${
                                filteredTotalNet >= 0 
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                                  : 'bg-rose-50 border-rose-100 text-rose-800'
                              }`}>
                                Líquido no Filtro: {formatCurrency(filteredTotalNet)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Tabela de Transações (Desktop) */}
                      <div className="hidden md:block border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-neutral-50 border-b border-neutral-200">
                                <th className="px-4 py-3 font-semibold text-neutral-500 uppercase text-[9px] tracking-wider">Data / Descrição</th>
                                <th className="px-4 py-3 font-semibold text-neutral-500 uppercase text-[9px] tracking-wider">Veículo</th>
                                <th className="px-4 py-3 font-semibold text-neutral-500 uppercase text-[9px] tracking-wider text-right">Valor Bruto</th>
                                <th className="px-4 py-3 font-semibold text-neutral-500 uppercase text-[9px] tracking-wider">Memória de Cálculo (Fórmula)</th>
                                <th className="px-4 py-3 font-semibold text-neutral-500 uppercase text-[9px] tracking-wider text-right">Efeito Líquido</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 font-medium text-neutral-600">
                              {filteredTransactions.length === 0 ? (
                                <tr>
                                  <td colSpan="5" className="px-4 py-8 text-center text-neutral-400 italic text-xs">
                                    Nenhuma transação financeira registrada neste período.
                                  </td>
                                </tr>
                              ) : (
                                filteredTransactions.map(td => {
                                  const vehicle = invVehs.find(v => v.plate === td.vehiclePlate);
                                  return (
                                    <tr key={td.id} className="hover:bg-neutral-50/70 transition-colors group">
                                      <td className="px-4 py-3">
                                        <div className="space-y-1">
                                          <p className="font-semibold text-neutral-800">{td.desc}</p>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-neutral-400 font-medium">{new Date(td.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                            {getCategoryBadge(td.cat)}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        {vehicle ? (
                                          <div className="flex flex-col">
                                            <span className="font-semibold text-neutral-700 text-[10px] leading-tight">{vehicle.model}</span>
                                            <span className="font-mono text-[9px] text-neutral-400 mt-0.5">{vehicle.plate}</span>
                                          </div>
                                        ) : (
                                          <span className="text-neutral-400 font-medium italic text-[10px]">Geral</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono font-medium text-neutral-700">
                                        <div className="flex flex-col items-end">
                                          <span className={td.type === 'in' ? 'text-neutral-700' : 'text-rose-600'}>
                                            {td.type === 'in' ? '+' : '-'} {formatCurrency(td.val)}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-[9.5px] text-neutral-500 leading-relaxed max-w-xs">
                                        {td.explanation}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                          <span className={`font-mono font-semibold text-[11px] ${
                                            td.share > 0 
                                              ? 'text-emerald-700' 
                                              : td.share < 0 
                                                ? 'text-rose-600' 
                                                : 'text-neutral-400'
                                          }`}>
                                            {td.share > 0 ? '+' : ''}{formatCurrency(td.share)}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              /* disabled in investor dashboard */
                                            }}
                                            className="hidden"
                                            title="Apagar transação"
                                          >
                                            {/* <Trash2 size={13} /> */}
                                          </button>
                                        </div>
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
                                  <div className="text-right flex items-center justify-end gap-3">
                                    <div>
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
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        /* disabled in investor dashboard */
                                      }}
                                      className="hidden"
                                      title="Apagar transação"
                                    >
                                      {/* <Trash2 size={14} /> */}
                                    </button>
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
                      <div className="bg-white border border-neutral-200 p-4 sm:p-6 rounded-xl">
                        <h5 className="text-sm font-bold text-neutral-800 uppercase tracking-tight mb-4 flex items-center gap-2 border-b border-neutral-100 pb-3">
                          <History size={16} className="text-neutral-500" /> Histórico de Repasses
                        </h5>
                        <div className="relative border-l-2 border-neutral-100 ml-2 pl-5 space-y-4 pt-2">
                          {monthlySummaries.map((s, idx) => (
                            <div key={idx} className="relative">
                              {/* Timeline indicator node */}
                              <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white bg-neutral-300">
                              </div>
                              <div className="bg-neutral-50/50 p-3 sm:p-4 border border-neutral-200/60 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:border-neutral-300 transition-colors">
                                <div>
                                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold block">Mês Referência</span>
                                  <span className="text-sm font-semibold text-neutral-800">{s.month}</span>
                                </div>
                                <div className="space-y-1.5 font-mono text-xs w-full sm:w-auto">
                                  <div className="flex justify-between sm:justify-end gap-x-6">
                                    <span className="text-neutral-500 font-medium">Saldo do Mês:</span>
                                    <span className={`font-semibold ${s.net < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                      {formatCurrency(s.net)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between sm:justify-end gap-x-6 pt-1 border-t border-neutral-200/50">
                                    <span className="text-neutral-500 font-medium">Saldo Acumulado:</span>
                                    <span className={`font-bold ${s.totalAfter < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
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
                  onClick={onClose}
                  className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-neutral-950 text-white text-[10px] uppercase tracking-widest font-black hover:bg-[#C5A059] transition-all rounded-xl shadow-md flex items-center justify-center"
                >
                  Fechar Detalhes
                </button>
              </div>

            </div>
          </div>
        );
      
  return modalContent;
};

export default InvestorCalcModal;