import React, { useState } from 'react';
import {
  Search, Receipt, ArrowRight, Car, AlertCircle, CheckCircle2,
  Clock, AlertTriangle, CalendarDays
} from 'lucide-react';
import { getDayOfWeek } from '../../../utils/adminUtils.jsx';
import { EditorialLabel } from '../../ui/EditorialLabel';
import { getNextDueDate } from '../../../utils/asaas.js';
import { parseCurrency } from '../../../utils/currencyUtils';

// ─── Formatter de data/hora do pagamento ──────────────────────────────────────────
const formatTransactionDateTime = (t) => {
  if (t.createdAt) {
    try {
      let dateStr = t.createdAt;
      const lastMinus = dateStr.lastIndexOf('-');
      const lastPlus = dateStr.lastIndexOf('+');
      if (lastMinus > 10) {
        dateStr = dateStr.substring(0, lastMinus) + 'Z';
      } else if (lastPlus > 10) {
        dateStr = dateStr.substring(0, lastPlus) + 'Z';
      } else if (!dateStr.endsWith('Z')) {
        dateStr = dateStr + 'Z';
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const datePart = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const timePart = d.toLocaleTimeString('pt-BR', { 
          timeZone: 'America/Sao_Paulo', 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        return `${datePart} às ${timePart}`;
      }
    } catch (err) {
      console.error("Erro ao formatar data/hora da transação:", err);
    }
  }
  
  if (t.date && t.date.includes('-')) {
    return t.date.substring(0, 10).split('-').reverse().join('/');
  }
  return t.date || '—';
};

// ─── Badge de status do pagamento local ─────────────────────────────────────────────
const PaymentStatusBadge = ({ status }) => {
  const map = {
    'Concluído': { label: 'Concluído', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={10} /> },
    'Pendente':  { label: 'Pendente',  cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: <Clock size={10} /> },
    'Atrasado':  { label: 'Atrasado',  cls: 'bg-red-50 text-red-700 border-red-200',             icon: <AlertTriangle size={10} /> },
  };
  const s = map[status] || { label: status || 'Concluído', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={10} /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
};


const PaymentSelectionModal = ({ rental, currentCalc, history, onClose, onConfirmPayment, calculateBoletoForCycle }) => {
  const [pastCycles, setPastCycles] = useState([]);
  const [editingCycle, setEditingCycle] = useState(null);
  const [customValue, setCustomValue] = useState('');
  
  React.useEffect(() => {
    const startStr = (rental.startDate || rental.date).substring(0, 10);
    const startObj = new Date(startStr + 'T12:00:00');
    
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    
    // Contagem de pagamentos legados (genéricos sem Ref)
    const safeHistory = Array.isArray(history) ? history : [];
    let legacyCount = safeHistory.filter(t => !(t.desc || '').includes('Ref:')).length;
    
    // Pagamentos específicos (com Ref)
    const specificPayments = safeHistory.filter(t => (t.desc || '').includes('Ref:'));
    
    const cycles = [];
    let iterDate = new Date(startObj);
    
    // NOTA: Como é pré-pago, o primeiro vencimento É a própria data de início do contrato.
    // Portanto, não somamos 7 dias antes de começar o loop.
    
    let weekNumber = 1;
    let safety = 300;
    
    // Gerar até a semana atual (inclusive)
    while (iterDate <= today && safety > 0) {
      const dueStr = iterDate.toISOString().split('T')[0];
      const calc = calculateBoletoForCycle(rental, dueStr, true);
      
      const labelRef = `Ref: ${calc.cycleStart.split('-').reverse().join('/')} a ${calc.cycleEnd.split('-').reverse().join('/')}`;
      
      let isPaid = false;
      
      // 1. Verifica se tem pagamento específico para esta semana
      const hasSpecific = specificPayments.some(t => t.desc.includes(labelRef));
      
      if (hasSpecific) {
        isPaid = true;
      } else if (legacyCount > 0) {
        // 2. Se não tem específico, consome um genérico da fila cronológica
        isPaid = true;
        legacyCount--;
      }
      
      cycles.push({
        weekNumber,
        dueDate: dueStr,
        calc,
        label: labelRef,
        isPaid
      });
      
      iterDate.setDate(iterDate.getDate() + 7);
      weekNumber++;
      safety--;
    }
    
    // A Semana Atual (currentCalc) geralmente é a próxima (iterDate que passou de today).
    // Vamos adicioná-la se já não estiver na lista
    if (cycles.length === 0 || cycles[cycles.length - 1].dueDate !== currentCalc.dueDate) {
      const labelRef = `Ref: ${currentCalc.cycleStart.split('-').reverse().join('/')} a ${currentCalc.cycleEnd.split('-').reverse().join('/')}`;
      cycles.push({
        weekNumber,
        dueDate: currentCalc.dueDate,
        calc: currentCalc,
        label: labelRef,
        isPaid: currentCalc.hasPaidToday // se já pagou hoje
      });
    }
    
    // Inverte para mostrar as semanas mais novas no topo e a Semana 1 no fim
    setPastCycles(cycles.reverse());
  }, [rental, currentCalc, calculateBoletoForCycle, history]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Histórico de Faturamento</h2>
            <p className="text-sm text-neutral-500 mt-1">Semanas de {rental.user || rental.userName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x text-neutral-500"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto bg-neutral-50 space-y-4">
          {pastCycles.map((cycle, idx) => (
            <div key={idx} className={`bg-white border ${cycle.isPaid ? 'border-emerald-200/60 opacity-70' : 'border-neutral-200'} rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden`}>
              {/* Barra lateral de status */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${cycle.isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              
              <div className="pl-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-black text-neutral-800 uppercase tracking-tight">Semana {cycle.weekNumber}</span>
                  {cycle.isPaid ? (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Pago</span>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pendente</span>
                  )}
                </div>
                <div className="text-[11px] font-bold text-neutral-500">{cycle.label}</div>
                <div className="text-[11px] text-neutral-500 mt-1">Vencimento: {cycle.dueDate.split('-').reverse().join('/')}</div>
              </div>
              
              <div className="flex items-center justify-end gap-4 w-full md:w-auto min-w-[200px]">
                {!cycle.isPaid && editingCycle === cycle.weekNumber ? (
                  <div className="flex flex-col items-end gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Ajustar:</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">R$</span>
                        <input 
                          type="number"
                          step="0.01"
                          value={customValue}
                          onChange={e => setCustomValue(e.target.value)}
                          className="w-32 bg-white border border-neutral-300 rounded-lg py-2 pl-9 pr-3 text-sm font-black text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-inner"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setEditingCycle(null); setCustomValue(''); }}
                        className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-bold rounded-md transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => {
                          const valNum = parseFloat(customValue);
                          if (isNaN(valNum) || valNum <= 0) return alert('Por favor, informe um valor numérico válido maior que zero.');
                          
                          // Cria uma cópia do cálculo original alterando apenas o valor total
                          const modifiedCalc = { ...cycle.calc, total: valNum, manualAdjustment: true };
                          const desc = `Pagamento Aluguel (${cycle.label}) - ${rental.user || rental.userName}`;
                          
                          onConfirmPayment(rental.id, modifiedCalc, desc);
                          setEditingCycle(null);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md transition-colors shadow-sm"
                      >
                        Confirmar Ajuste
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`text-lg font-black ${cycle.isPaid ? 'text-emerald-700' : 'text-[#C5A059]'}`}>
                      R$ {cycle.calc.total.toFixed(2).replace('.', ',')}
                    </div>
                    {!cycle.isPaid && (
                      <button 
                        onClick={() => {
                          setEditingCycle(cycle.weekNumber);
                          setCustomValue(cycle.calc.total.toFixed(2));
                        }}
                        className="flex-shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md transition-colors"
                      >
                        Ajustar / Pagar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminFaturamento = ({ rentals = [], replacementContracts = [], vehicles = [], clients = [], fines = [], transactions = [], onConfirmPayment }) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('recentes');
  const [lateFees, setLateFees] = useState({});
  const [openHistories, setOpenHistories] = useState({});
  const [paymentSelectionRental, setPaymentSelectionRental] = useState(null);

  const handleConfirm = (rentalId, calc) => {
    const lateFee = parseFloat(lateFees[rentalId] || 0);
    onConfirmPayment(rentalId, { ...calc, lateFee });
    alert('Pagamento confirmado e receita enviada ao financeiro!');
  };

  const calculateBoletoForCycle = (rental, targetDueDateStr, isPastCycle = false) => {
    const weeklyRate = parseCurrency(rental.value || 0) || 0;
    const dailyRate = weeklyRate / 7;

    let dueDateStr = targetDueDateStr;
    if (!dueDateStr) {
      return { weeklyRate, dailyRate, daysInMaintenance: 0, abatimento: 0, replacementCharge: 0, replacementDays: 0, replacementDailyRate: 0, tireTax: 0, total: weeklyRate, activeRC: null, rcsDetails: [], hasPaidToday: false, dueDate: '' };
    }

    const rentalPlate = rental.plate || rental.vehiclePlate;
    const rentalDriver = rental.user || rental.userName;

    const todayStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
    
    const matchedRCs = Array.isArray(replacementContracts)
      ? replacementContracts.filter(rc => {
          if (rc.mainVehiclePlate && rentalPlate) {
            return rc.mainVehiclePlate.toLowerCase() === rentalPlate.toLowerCase();
          }
          return rc.driverName && rentalDriver && rc.driverName.toLowerCase() === rentalDriver.toLowerCase();
        })
      : [];
    const activeRC = matchedRCs.find(rc => rc.status === 'Ativo') || null;
    const replacementPlate = activeRC?.replacementVehiclePlate?.trim().toLowerCase();

    let hasPaidToday = false;
    
    if (!isPastCycle) {
      hasPaidToday = (transactions || []).some(t => {
        const tPlate = (t.vehiclePlate || '').trim().toLowerCase();
        const isMatchingPlate = tPlate && (tPlate === rentalPlate?.toLowerCase() || (replacementPlate && tPlate === replacementPlate));
        if (!isMatchingPlate) return false;
        return t.type === 'in' && t.cat?.toLowerCase() === 'aluguel' && t.date === todayStr;
      });

      if (hasPaidToday) {
        try {
          const dObj = new Date(dueDateStr + 'T12:00:00');
          dObj.setDate(dObj.getDate() + 7);
          dueDateStr = dObj.toISOString().split('T')[0];
        } catch (e) {}
      }
    }

    const dueDateObj = new Date(dueDateStr + 'T12:00:00');
    
    // Pré-pago: o ciclo COMEÇA na data de vencimento e vai até 6 dias depois
    const cycleStartObj = new Date(dueDateObj.getTime());
    const cycleStartStr = cycleStartObj.toISOString().split('T')[0];

    const cycleEndObj = new Date(dueDateObj.getTime());
    cycleEndObj.setDate(dueDateObj.getDate() + 6);
    const cycleEndStr = cycleEndObj.toISOString().split('T')[0];

    const getDaysOverlap = (startAStr, endAStr, startBStr, endBStr) => {
      if (!startAStr || !startBStr || !endBStr) return 0;
      
      const dateAStart = new Date(startAStr.split('T')[0] + 'T00:00:00');
      const dateAEnd = endAStr 
        ? new Date(endAStr.split('T')[0] + 'T23:59:59') 
        : new Date('2099-12-31T23:59:59');
      
      const dateBStart = new Date(startBStr + 'T00:00:00');
      const dateBEnd = new Date(endBStr + 'T23:59:59');
      
      const overlapStart = new Date(Math.max(dateAStart.getTime(), dateBStart.getTime()));
      const overlapEnd = new Date(Math.min(dateAEnd.getTime(), dateBEnd.getTime()));
      
      if (overlapStart > overlapEnd) {
        return 0;
      }
      
      const diffTime = overlapEnd.getTime() - overlapStart.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    let totalDaysInMaintenance = 0;
    let totalReplacementCharge = 0;
    let rcsDetails = [];

    matchedRCs.forEach(rc => {
      const overlapDays = getDaysOverlap(rc.startDate, rc.endDate, cycleStartStr, cycleEndStr);
      if (overlapDays > 0) {
        totalDaysInMaintenance += overlapDays;
        const rate = parseFloat(rc.dailyRate) || 80;
        totalReplacementCharge += rate * overlapDays;
        
        rcsDetails.push({
          plate: rc.replacementVehiclePlate,
          days: overlapDays,
          rate,
          total: rate * overlapDays,
          status: rc.status
        });
      }
    });

    if (totalDaysInMaintenance > 7) {
      totalDaysInMaintenance = 7;
    }

    const abatimento = dailyRate * totalDaysInMaintenance;
    const tireTax = parseCurrency(rental.tireTax || 0) || 0;
    const lateFeeVal = parseFloat(lateFees[rental.id] || 0);

    // Find matching fines for this rental/driver
    const rentalDriverName = (rental.user || rental.userName || '').trim().toLowerCase();
    const rentalClientId = rental.clientId;

    const driverFines = (fines || []).filter(f => {
      const isSameDriver = (rentalClientId && f.driverId === rentalClientId) ||
        (rentalDriverName && (f.driverName || '').trim().toLowerCase() === rentalDriverName);
      return isSameDriver && (f.status === 'Pendente' || f.status === 'Em Cobrança') && f.billingSuspended !== true;
    });

    let finesTotal = 0;
    const finesDetails = [];

    driverFines.forEach(f => {
      const paidCount = Array.isArray(f.paidInstallments) ? f.paidInstallments.length : 0;
      if (paidCount < f.installments) {
        const currentInstNum = paidCount + 1;
        const instVal = f.installmentValue || 0;
        finesTotal += instVal;
        finesDetails.push({
          id: f.id,
          infraction: f.infraction,
          installment: `${currentInstNum}/${f.installments}`,
          value: instVal
        });
      }
    });

    const baseTotal = (weeklyRate - abatimento) + totalReplacementCharge + tireTax + finesTotal;
    const total = baseTotal + lateFeeVal;

    return { 
      weeklyRate, 
      dailyRate, 
      daysInMaintenance: totalDaysInMaintenance, 
      abatimento, 
      replacementCharge: totalReplacementCharge, 
      replacementDays: totalDaysInMaintenance, 
      replacementDailyRate: activeRC ? (activeRC.dailyRate || 80) : 0, 
      tireTax, 
      total, 
      activeRC,
      cycleStart: cycleStartStr,
      cycleEnd: cycleEndStr,
      dueDate: dueDateStr,
      hasPaidToday,
      rcsDetails,
      finesDetails
    };
  };

  const calculateBoleto = (rental) => {
    return calculateBoletoForCycle(rental, getNextDueDate(rental.startDate || rental.date), false);
  };

  const safeRentals = Array.isArray(rentals) ? rentals : [];
  let filtered = safeRentals.filter(r => {
    if (r.status !== 'Ativo') return false;
    const searchLower = search.toLowerCase();
    const cleanSearch = searchLower.replace(/[^a-z0-9]/g, '');
    const cleanPlate = (r.plate || r.vehiclePlate || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const matchesSearch = (r.userName || r.user || '').toLowerCase().includes(searchLower) || cleanPlate.includes(cleanSearch);
    if (!matchesSearch) return false;

    // Se o filtro for 'pendentes', precisamos checar se tem atraso
    if (filterMode === 'pendentes') {
      const startStr = (r.startDate || r.date).substring(0, 10);
      const startObj = new Date(startStr + 'T12:00:00');
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      let iterDate = new Date(startObj);
      iterDate.setDate(iterDate.getDate() + 7);
      let totalWeeks = 0;
      while (iterDate <= today && totalWeeks < 300) {
        totalWeeks++;
        iterDate.setDate(iterDate.getDate() + 7);
      }

      const rPlate = (r.plate || r.vehiclePlate || '').trim().toLowerCase();
      // O activeRC não é super necessário para essa contagem rápida, pois estamos só checando atrasos brutos 
      // e os pagamentos de RC caem no mesmo plate do carro titular ou são ignorados no count de "Aluguel" puros
      // Mas para sermos precisos:
      const matchedRCs = Array.isArray(replacementContracts) ? replacementContracts.filter(rc => rc.mainVehiclePlate?.toLowerCase() === rPlate) : [];
      const activeRC = matchedRCs.find(rc => rc.status === 'Ativo') || null;
      const repPlate = activeRC?.replacementVehiclePlate?.trim().toLowerCase();

      const rHistory = (transactions || []).filter(t => {
        const tPlate = (t.vehiclePlate || '').trim().toLowerCase();
        const isMatch = tPlate === rPlate || (repPlate && tPlate === repPlate);
        return isMatch && t.type === 'in' && (t.cat || '').toLowerCase() === 'aluguel';
      });

      const legacyCount = rHistory.filter(t => !(t.desc || '').includes('Ref:')).length;
      const specificCount = rHistory.filter(t => (t.desc || '').includes('Ref:')).length;

      // Se total de semanas de vida é maior que a soma de transações, tem pendência
      // OBS: Isso pode ser falso positivo para clientes que pagam em vários PIXes, 
      // mas é a melhor aproximação para a listagem rápida.
      if (totalWeeks <= legacyCount + specificCount) {
        return false;
      }
    }
    
    return true;
  });

  // Ordenação
  filtered.sort((a, b) => {
    const da = new Date(a.startDate || a.date);
    const db = new Date(b.startDate || b.date);
    if (filterMode === 'antigos') {
      return da - db;
    } else {
      // Recentes ou pendentes usam do mais novo para o mais velho (padrão)
      return db - da;
    }
  });

  const totalPrevisao = filtered.reduce((acc, r) => acc + calculateBoleto(r).total, 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-pulse" />
            <EditorialLabel className="text-neutral-900 tracking-[0.2em]">Módulo de Receita e Cobrança</EditorialLabel>
          </div>
          <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-neutral-900 leading-none">Faturamento</h3>
          <p className="text-neutral-500 font-medium italic text-sm tracking-tight">
            Gestão individual de faturamento baseada no ciclo de cada contrato.
          </p>
        </div>

        <div className="flex flex-col items-end gap-3 w-full lg:w-auto">
          <div className="relative w-full lg:w-80 group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#C5A059] transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar condutor ou placa..."
              className="w-full bg-white border border-neutral-200/80 py-3.5 pl-11 pr-4 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all shadow-sm"
            />
          </div>
          
          <div className="flex bg-neutral-100 p-1 rounded-lg w-full lg:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterMode('recentes')}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors whitespace-nowrap ${filterMode === 'recentes' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Início Mais Recente
            </button>
            <button
              onClick={() => setFilterMode('antigos')}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors whitespace-nowrap ${filterMode === 'antigos' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Início Mais Antigo
            </button>
            <button
              onClick={() => setFilterMode('pendentes')}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${filterMode === 'pendentes' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <AlertCircle size={10} /> Pendentes
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <div className="p-6 bg-neutral-900 rounded-2xl shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#C5A059]/5 blur-xl -mr-10 -mt-10" />
          <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-1">Previsão Semanal</p>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base font-black text-[#C5A059] tracking-tight">R$</span>
            <h4 className="text-3xl font-black text-white tracking-tighter">
              {totalPrevisao.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h4>
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-between">
          <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-1">Ciclo Ativo</p>
          <div>
            <h4 className="text-3xl font-black text-neutral-900 tracking-tight leading-none">{filtered.length}</h4>
            <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider mt-1">Condutores Ativos</p>
          </div>
        </div>
      </div>

      {/* Rental Cards */}
      <div className="space-y-8">
        {filtered.length > 0 ? (
          filtered.map(rental => {
            const calc = calculateBoleto(rental);

            // Filter transactions for this rental contract matching the plate of main vehicle or replacement vehicle
            const rentalPlate = (rental.plate || rental.vehiclePlate || '').trim().toLowerCase();
            const activeRC = calc.activeRC;
            const replacementPlate = activeRC?.replacementVehiclePlate?.trim().toLowerCase();

            const rawHistory = (transactions || [])
              .filter(t => {
                const tPlate = (t.vehiclePlate || '').trim().toLowerCase();
                const isMatchingPlate = tPlate && (tPlate === rentalPlate || (replacementPlate && tPlate === replacementPlate));
                if (!isMatchingPlate) return false;

                // Show rental, fine and tire tax payments from the client (type 'in' of category 'Aluguel', 'multa' or 'taxa de pneus')
                const category = (t.cat || '').toLowerCase();
                const isPaymentCategory = category === 'aluguel' || category === 'multa' || category === 'taxa de pneus';
                return t.type === 'in' && isPaymentCategory;
              });

            const hasPaidToday = calc.hasPaidToday;

            const grouped = [];
            const processedIds = new Set();

            for (let i = 0; i < rawHistory.length; i++) {
              const current = rawHistory[i];
              if (processedIds.has(current.id)) continue;

              const category = (current.cat || '').toLowerCase();
              if (category === 'aluguel') {
                // Find a matching 'taxa de pneus' transaction created around the same time/date
                const matchingTireTax = rawHistory.find(t => {
                  if (processedIds.has(t.id)) return false;
                  if ((t.cat || '').toLowerCase() !== 'taxa de pneus') return false;

                  if (current.createdAt && t.createdAt) {
                    const diff = Math.abs(new Date(current.createdAt) - new Date(t.createdAt));
                    return diff < 5000; // within 5 seconds
                  }
                  return current.date === t.date;
                });

                if (matchingTireTax) {
                  processedIds.add(current.id);
                  processedIds.add(matchingTireTax.id);
                  grouped.push({
                    ...current,
                    val: (parseFloat(current.val) || 0) + (parseFloat(matchingTireTax.val) || 0)
                  });
                } else {
                  processedIds.add(current.id);
                  grouped.push(current);
                }
              } else if (category === 'taxa de pneus') {
                // Ignore standalone tire tax transactions (they are grouped with Aluguel)
                processedIds.add(current.id);
              } else {
                // Keep other transactions (like multa) as is
                processedIds.add(current.id);
                grouped.push(current);
              }
            }

            const history = grouped.sort((a, b) => new Date(b.date) - new Date(a.date));
            const paidWeeksCount = history.filter(t => (t.cat || '').toLowerCase() === 'aluguel').length;

            return (
              <div key={rental.id} className="bg-white rounded-3xl border border-neutral-150 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-neutral-200">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  {/* Left Section: Details (Main Info) */}
                  <div className="lg:col-span-8 p-6 md:p-8 space-y-6">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-neutral-100/80">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-neutral-900 text-[#C5A059] rounded-xl flex items-center justify-center font-black text-lg shadow-sm">
                          {(rental.userName || rental.user || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-neutral-900 uppercase tracking-tight">{rental.userName || rental.user}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-block text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                              Cobrança: {getDayOfWeek(rental.startDate || rental.date)}s
                            </span>
                            <span className="inline-block text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100" title="Data de Início do Contrato">
                              Início: {(rental.startDate || rental.date || '').substring(0, 10).split('-').reverse().join('/')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex sm:flex-col items-start sm:items-end gap-2 sm:gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-neutral-900 uppercase tracking-tight">{rental.vehicleModel || rental.vehicle}</span>
                          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200/60 uppercase">{rental.plate || rental.vehiclePlate}</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-bold">Base: R$ {calc.weeklyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / sem</p>
                      </div>
                    </div>

                    {/* Details Sub-grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Módulo 1: Detalhamento Financeiro */}
                      <div className="p-5 rounded-2xl bg-neutral-50/50 border border-neutral-100/70 space-y-4">
                        <h6 className="text-[10px] uppercase font-black tracking-widest text-[#C5A059] border-b border-neutral-100 pb-2">Valores do Ciclo</h6>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs font-medium text-neutral-500">
                            <span>Aluguel Base</span>
                            <span className="font-bold text-neutral-800">R$ {calc.weeklyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs font-medium text-neutral-500">
                            <span>Taxa de Pneus</span>
                            <span className="font-bold text-neutral-800">R$ {calc.tireTax.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          {calc.daysInMaintenance > 0 && (
                            <div className="flex justify-between items-center text-xs p-2.5 bg-red-50/50 rounded-xl border border-red-100 text-red-700">
                              <div className="space-y-0.5">
                                <p className="font-black uppercase text-[8px] tracking-wider">Abatimento Oficina</p>
                                <p className="text-[8px] text-red-500 font-bold">{calc.daysInMaintenance} dias de oficina</p>
                              </div>
                              <span className="font-black">- R$ {calc.abatimento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}

                          {calc.finesDetails && calc.finesDetails.length > 0 && (
                            <div className="pt-2 border-t border-neutral-200/40 space-y-2">
                              <p className="text-[8px] font-black uppercase tracking-wider text-amber-600">Multas Inclusas</p>
                              {calc.finesDetails.map((fd, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[11px] text-neutral-600 border-l-2 border-amber-400 pl-3">
                                  <div>
                                    <p className="font-bold text-neutral-800 line-clamp-1">{fd.infraction}</p>
                                    <p className="text-[8px] text-neutral-400 uppercase tracking-tighter">Parcela {fd.installment}</p>
                                  </div>
                                  <span className="font-black text-neutral-900">R$ {fd.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="pt-3 border-t border-neutral-200/40 flex items-center justify-between">
                            <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest">Ajuste Manual</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-neutral-400">R$</span>
                              <input
                                type="number"
                                value={lateFees[rental.id] || ''}
                                onChange={e => setLateFees({ ...lateFees, [rental.id]: e.target.value })}
                                placeholder="0,00"
                                className="w-20 bg-white border border-neutral-200 rounded-lg p-1.5 text-right text-xs font-black outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Módulo 2: Carro Reserva */}
                      <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${calc.replacementCharge > 0 ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm' : 'bg-neutral-50/30 border-neutral-100/70 opacity-60'}`}>
                        <div className="w-full">
                          <h6 className={`text-[10px] uppercase font-black tracking-widest border-b pb-2 ${calc.replacementCharge > 0 ? 'text-[#C5A059] border-neutral-800' : 'text-neutral-800 border-neutral-100'}`}>Carro Reserva</h6>
                          {calc.replacementCharge > 0 ? (
                            <div className="space-y-4 pt-3">
                              {calc.rcsDetails.map((rc, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-neutral-800 rounded-lg flex items-center justify-center text-[#C5A059]"><Car size={13} /></div>
                                    <div>
                                      <p className="text-xs font-black uppercase tracking-tight">{rc.plate}</p>
                                      <p className="text-[7px] text-neutral-400 font-bold uppercase tracking-wider leading-none">
                                        {rc.days}d × R$ {rc.rate} {rc.status === 'Encerrado' && '(Finalizado)'}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-bold text-neutral-355">+ R$ {rc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center py-10 text-neutral-400">
                              <AlertCircle size={20} className="mb-2 text-neutral-300 opacity-60" />
                              <p className="text-[8px] font-black uppercase tracking-widest leading-none">Sem adicionais ativos</p>
                              <p className="text-[7px] text-neutral-400/80 font-bold uppercase mt-1">Sem carro reserva neste ciclo</p>
                            </div>
                          )}
                        </div>

                        {calc.replacementCharge > 0 && (
                          <div className="flex justify-between items-center pt-3 border-t border-neutral-800 mt-4">
                            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Total Adicional</span>
                            <span className="text-sm font-black text-[#C5A059]">+ R$ {calc.replacementCharge.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Módulo 3: Histórico de Pagamentos Confirmados */}
                    {history.length > 0 && (
                      <div className="pt-6 border-t border-neutral-100/80 space-y-4">
                        <div className="flex justify-between items-center">
                          <button
                            onClick={() => setOpenHistories(prev => ({ ...prev, [rental.id]: !prev[rental.id] }))}
                            className="text-[9px] font-black text-[#C5A059] hover:text-neutral-900 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                          >
                            {openHistories[rental.id] ? 'Ocultar Histórico de Pagamentos' : 'Ver Histórico de Pagamentos'}
                          </button>
                        </div>
                        
                        {openHistories[rental.id] && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            {history.map(p => (
                              <div key={p.id} className="flex items-center justify-between p-3 bg-neutral-50/50 border border-neutral-100 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-white border border-neutral-200/60 rounded-md flex items-center justify-center text-neutral-500 shrink-0">
                                    <Receipt size={11} />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-neutral-800 uppercase tracking-tight">
                                      R$ {parseFloat(p.val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[8px] text-neutral-600 font-bold leading-tight">
                                      {p.cat?.toLowerCase() === 'aluguel' 
                                        ? 'Aluguel + Taxa de Pneus' 
                                        : p.cat?.toLowerCase() === 'taxa de pneus' 
                                          ? 'Taxa de Pneus' 
                                          : (p.desc || p.cat || 'Pagamento')}
                                    </p>
                                    <p className="text-[7px] text-neutral-400 font-bold uppercase tracking-wider">
                                      Data: {formatTransactionDateTime(p)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <PaymentStatusBadge status={p.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Section: Actions & Checkout Panel */}
                  <div className="lg:col-span-4 p-6 md:p-8 bg-neutral-50/40 border-t lg:border-t-0 lg:border-l border-neutral-100 flex flex-col justify-between space-y-6">
                    {/* Invoice Summary Card */}
                    <div className="p-6 bg-neutral-900 rounded-2xl text-white shadow-md relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 blur-2xl -mr-10 -mt-10" />
                      
                      <div className="space-y-4 relative">
                        <div>
                          <p className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-1">Total do Ciclo</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-base text-[#C5A059] font-black">R$</span>
                            <span className="text-3xl font-black text-white tracking-tighter leading-none">
                              {calc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-[7px] text-neutral-500 font-bold uppercase tracking-wider mt-1">Aluguel + Ajustes + Reserva</p>
                        </div>
                        
                        <div className="pt-4 border-t border-neutral-800 flex items-center gap-2">
                          <CalendarDays size={12} className="text-[#C5A059] shrink-0" />
                          <div>
                            <p className="text-[7px] text-neutral-500 font-black uppercase tracking-widest">Próximo Vencimento</p>
                            <p className="text-xs font-black text-[#C5A059] uppercase tracking-tight">
                              {calc.dueDate ? new Date(calc.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                                weekday: 'short', day: '2-digit', month: '2-digit'
                              }) : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="space-y-3">
                      <button
                        onClick={() => !hasPaidToday && setPaymentSelectionRental({ rental, calc, history })}
                        disabled={hasPaidToday}
                        className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-md flex items-center justify-center gap-2 group ${
                          hasPaidToday 
                            ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300/40 shadow-none' 
                            : 'bg-[#C5A059] text-neutral-900 hover:bg-neutral-950 hover:text-white'
                        }`}
                      >
                        {hasPaidToday ? 'Pagamento Já Confirmado Hoje' : 'Confirmar Pagamento Manual'}
                        {!hasPaidToday && <ArrowRight size={11} className="transition-transform group-hover:translate-x-1" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-20 text-center bg-white border border-neutral-100 rounded-3xl shadow-sm">
            <Receipt size={32} className="mx-auto mb-4 text-neutral-200" />
            <h4 className="text-lg font-black text-neutral-900 uppercase tracking-tighter mb-1">Sem faturamento ativo</h4>
            <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">Nenhum contrato ativo encontrado para este ciclo</p>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Pagamento Unificado */}
      {paymentSelectionRental && (
        <PaymentSelectionModal
          rental={paymentSelectionRental.rental}
          currentCalc={paymentSelectionRental.calc}
          history={paymentSelectionRental.history}
          onClose={() => setPaymentSelectionRental(null)}
          onConfirmPayment={(rentalId, calc, customDesc) => {
            onConfirmPayment(rentalId, { ...calc, customDescription: customDesc, customRepDescription: customDesc.replace('Pagamento Aluguel', 'Pagamento Aluguel Reserva') });
            alert('Pagamento confirmado e receita enviada ao financeiro!');
            setPaymentSelectionRental(null);
          }}
          calculateBoletoForCycle={calculateBoletoForCycle}
        />
      )}
    </div>
  );
};

export default AdminFaturamento;
