import React, { useState, useEffect } from 'react';
import { 
  X, ShieldAlert, Check, AlertTriangle, ArrowRight, Wallet, Landmark, 
  FileText, Landmark as BankIcon, Receipt, Ban, Sliders, RotateCcw, 
  Plus, Minus, ChevronDown, ChevronUp, Sparkles, Calculator
} from 'lucide-react';
import { parseCurrency } from '../../../utils/currencyUtils';
import { getRentalCycles } from '../../../utils/rentalCycleUtils';

const ContractClosureModal = ({ inspection, rental, rentals = [], transactions = [], fines = [], serviceOrders = [], replacementContracts = [], onClose, onConfirm }) => {
  const [selectedClosureType, setSelectedClosureType] = useState(null); // 'normal' | 'early'
  const [manualDebts, setManualDebts] = useState([]);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [newManualName, setNewManualName] = useState('');
  const [newManualValue, setNewManualValue] = useState('');
  const [isRentalsPaid, setIsRentalsPaid] = useState(false);
  const [showRentalsPaidConfirm, setShowRentalsPaidConfirm] = useState(false);

  // Estados para controle e autonomia do Admin sobre Aluguéis Vencidos
  const [showRentalDetails, setShowRentalDetails] = useState(true);
  const [isCustomizingRentals, setIsCustomizingRentals] = useState(false);
  const [customWeeks, setCustomWeeks] = useState(0);
  const [customDays, setCustomDays] = useState(0);
  const [customTireTaxCycles, setCustomTireTaxCycles] = useState(0);
  const [includeTireTax, setIncludeTireTax] = useState(true);
  const [customAdjustmentVal, setCustomAdjustmentVal] = useState('');
  
  // Estado para armazenar o detalhamento do cálculo automático
  const [autoBreakdown, setAutoBreakdown] = useState({
    fullWeeks: 0,
    extraDays: 0,
    tireTaxCycles: 0,
    baseWeeklyRate: 0,
    dailyRate: 0,
    tireTaxVal: 25,
    autoTotal: 0,
    unpaidCyclesList: []
  });

  const [closureData, setClosureData] = useState({
    inspectionDebts: 0,
    unpaidFines: 0,
    unpaidRentals: 0,
    unpaidCaucao: 0,
    totalDebts: 0,
    caucaoAvailable: 0,
    balance: 0,
    type: 'return',
    earlyTerminationPenalty: 0,
    penaltyAmount: 0,
    scheduledEndDate: '',
    baseDebts: 0,
    isEarlyTermination: false,
    unpaidFinesList: [],
    unpaidCyclesList: [],
    inspectionDetails: []
  });

  const addManualDebt = () => {
    if (newManualName && newManualValue) {
      setManualDebts(prev => [...prev, {
        id: Date.now().toString(),
        description: newManualName,
        value: parseFloat(newManualValue)
      }]);
      setNewManualName('');
      setNewManualValue('');
      setIsAddingManual(false);
    }
  };

  const removeManualDebt = (id) => {
    setManualDebts(prev => prev.filter(d => d.id !== id));
  };

  useEffect(() => {
    if (inspection && rental) {
      // 1. Debts from inspection
      const inspectionDebts = (inspection.deductions || []).reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);

      // Helper for safe plate comparison
      const matchPlate = (p1, p2) => (p1 || '').replace('-', '').toUpperCase() === (p2 || '').replace('-', '').toUpperCase();

      const driverName = (rental.userName || rental.user || '').toLowerCase().trim();
      const matchDriverTrans = (t) => {
        if (!driverName) return true; // fallback
        const resp = (t.responsible || '').toLowerCase();
        const desc = (t.desc || '').toLowerCase();
        return resp.includes(driverName) || desc.includes(driverName);
      };

      // 2. Unpaid fines (From fines array)
      const unpaidFinesList = (fines || []).filter(f => {
        const isSamePlate = matchPlate(f.vehiclePlate, rental.plate);
        const isSameDriver = (f.driverName || '').toLowerCase().trim() === driverName;
        const isSameRental = f.rentalId && f.rentalId === rental.id;
        return isSamePlate && (isSameDriver || isSameRental) && ['pendente', 'em cobrança'].includes((f.status || '').toLowerCase());
      });

      const unpaidFines = unpaidFinesList.reduce((acc, curr) => {
        const totalValue = parseFloat(curr.value) || 0;
        if (curr.installments > 1 && curr.paidInstallments) {
          const paidCount = curr.paidInstallments.length;
          const remainingCount = curr.installments - paidCount;
          return acc + (remainingCount * (parseFloat(curr.installmentValue) || (totalValue / curr.installments)));
        }
        return acc + totalValue;
      }, 0);

      let unpaidRentals = 0;
      let hasProratedAdjust = false;
      let proratedDaysUsed = 0;
      let unpaidCyclesList = [];

      if (rental.rentalType === 'daily') {
        const startStr = (rental.startDate || rental.date || new Date().toISOString()).substring(0, 10);
        const startDate = new Date(startStr + 'T12:00:00');
        const todayStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
        const todayObj = new Date(todayStr + 'T12:00:00');
        const diffTime = todayObj.getTime() - startDate.getTime();
        const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
        const dailyValue = typeof rental.value === 'string' ? parseCurrency(rental.value) : (parseFloat(rental.value) || 0);
        unpaidRentals = diffDays * dailyValue;
        unpaidCyclesList.push({ labelRef: 'Locação Diária', debtValue: unpaidRentals });
        
        setAutoBreakdown({
          fullWeeks: 0,
          extraDays: diffDays,
          tireTaxCycles: 0,
          baseWeeklyRate: 0,
          dailyRate: dailyValue,
          tireTaxVal: 0,
          autoTotal: unpaidRentals,
          unpaidCyclesList
        });

        if (!isCustomizingRentals) {
          setCustomWeeks(0);
          setCustomDays(diffDays);
          setCustomTireTaxCycles(0);
          setIncludeTireTax(false);
        }
      } else {
        // --- Replica EXATAMENTE a logica do AdminFaturamento/calculatePendingCycles ---
        const baseValue = parseCurrency(rental.value || 0) || 0;
        const dailyRate = baseValue / 7;

        const closureDateStr = (inspection?.date || inspection?.createdAt || rental.endDate || new Date().toISOString()).substring(0, 10);
        const endLimit = new Date(closureDateStr + 'T12:00:00');

        const rentalCycles = getRentalCycles(rental, endLimit, true);

        const rentalPlate = (rental.plate || rental.vehiclePlate || '').trim().toLowerCase();
        const safeHistory = Array.isArray(transactions) ? transactions : [];

        const matchedRCsForTx = Array.isArray(replacementContracts) ? replacementContracts.filter(rc => rc.mainVehiclePlate?.toLowerCase() === rentalPlate) : [];
        const allRepPlates = matchedRCsForTx.map(rc => rc.replacementVehiclePlate?.trim().toLowerCase()).filter(Boolean);

        const rentalAluguelTxs = safeHistory.filter(t => {
          if (!t) return false;
          const tPlate = (t.vehiclePlate || '').trim().toLowerCase();
          const isMatch = tPlate === rentalPlate || allRepPlates.includes(tPlate);
          if (!isMatch) return false;
          const catLow = (t.cat || '').toLowerCase();
          const isAluguelCat = catLow === 'aluguel' || catLow === 'cobranca' || catLow === 'cobrança' || catLow === 'taxa de pneus' || catLow === 'taxa adm';
          return isAluguelCat && t.type === 'in';
        });

        const specificPayments = rentalAluguelTxs.filter(t => (t.desc || '').includes('Ref:'));
        let legacyPayments = rentalAluguelTxs.filter(t => {
          const descLow = (t.desc || '').toLowerCase();
          if (descLow.includes('ref:')) return false;
          const catLow = (t.cat || '').toLowerCase();
          return descLow.includes('semana') || descLow.includes('pagamento aluguel') || descLow.includes('primeiro aluguel') || descLow === 'aluguel' || catLow === 'aluguel' || catLow === 'taxa de pneus' || catLow === 'taxa adm';
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        let autoFullWeeks = 0;
        let autoExtraDays = 0;
        let autoTireTaxCycles = 0;

        rentalCycles.forEach(cycleInfo => {
          const cycleDays = Math.round((new Date(cycleInfo.endStr + 'T12:00:00') - new Date(cycleInfo.startStr + 'T12:00:00')) / 86400000) + 1;
          const cycleBaseRate = dailyRate * cycleDays;

          // Abatimento: dias em oficina (checar serviceOrders)
          let totalDaysInMaintenance = 0;
          const matchedOSs = Array.isArray(serviceOrders) ? serviceOrders.filter(os => os.plate && rentalPlate && os.plate.toLowerCase() === rentalPlate) : [];

          const todayStrFmt = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
          const isDateInPeriod = (targetStr, sStr, eStr) => {
            const s = sStr ? sStr.split('T')[0] : '';
            const e = eStr ? eStr.split('T')[0] : todayStrFmt;
            if (!s) return false;
            return targetStr >= s && targetStr <= e;
          };

          let cycleDateIter = new Date(cycleInfo.startStr + 'T12:00:00');
          for (let i = 0; i < cycleDays; i++) {
            const currentDayStr = cycleDateIter.toISOString().split('T')[0];
            let covered = false;
            for (const os of matchedOSs) {
              if (isDateInPeriod(currentDayStr, os.date, os.status === 'Concluida' || os.status === 'Concluída' ? os.closedAt : '')) {
                covered = true;
                break;
              }
            }
            if (!covered) {
              for (const rc of matchedRCsForTx) {
                if (isDateInPeriod(currentDayStr, rc.startDate, rc.endDate || '')) {
                  covered = true;
                  break;
                }
              }
            }
            if (covered) totalDaysInMaintenance++;
            cycleDateIter.setDate(cycleDateIter.getDate() + 1);
          }

          // Carga de reserva (replacementContracts)
          let totalReplacementCharge = 0;
          matchedRCsForTx.forEach(rc => {
            let rcOverlap = 0;
            let rcIter = new Date(cycleInfo.startStr + 'T12:00:00');
            for (let i = 0; i < cycleDays; i++) {
              const currentDayStr = rcIter.toISOString().split('T')[0];
              if (isDateInPeriod(currentDayStr, rc.startDate, rc.endDate || '')) {
                rcOverlap++;
              }
              rcIter.setDate(rcIter.getDate() + 1);
            }
            if (rcOverlap > 0) {
              totalReplacementCharge += (parseFloat(rc.dailyRate) || 80) * rcOverlap;
            }
          });

          const abatimento = dailyRate * totalDaysInMaintenance;
          const cycleTireVal = 25; // taxa de pneus sempre cobrada
          const cycleValue = (cycleBaseRate - abatimento) + totalReplacementCharge + cycleTireVal;

          const labelRef = `Ref: ${cycleInfo.startStr.split('-').reverse().join('/')} a ${cycleInfo.endStr.split('-').reverse().join('/')}`;

          let cyclePaidVal = 0;

          // 1. Pagamento especifico (com "Ref:" na descricao)
          const specificMatches = specificPayments.filter(t => (t.desc || '').includes(labelRef));
          if (specificMatches.length > 0) {
            specificMatches.forEach(t => {
              cyclePaidVal += parseCurrency(t.val || t.value) || 0;
            });
          } else {
            // 2. Pagamento legado dentro da janela do ciclo (+/- 7 dias) - soma todos os pagamentos correspondentes
            const startMinus7Obj = new Date(cycleInfo.startStr + 'T12:00:00');
            startMinus7Obj.setDate(startMinus7Obj.getDate() - 7);
            const startMinus7 = startMinus7Obj.toISOString().split('T')[0];

            const endPlus7Obj = new Date(cycleInfo.endStr + 'T12:00:00');
            endPlus7Obj.setDate(endPlus7Obj.getDate() + 7);
            const endPlus7 = endPlus7Obj.toISOString().split('T')[0];

            const matchingIndices = [];
            legacyPayments.forEach((t, idx) => {
              if (!t || !t.date) return;
              const tDate = t.date.substring(0, 10);
              if (tDate >= startMinus7 && tDate <= endPlus7) {
                matchingIndices.push(idx);
                cyclePaidVal += parseCurrency(t.val || t.value) || 0;
              }
            });

            // Remove em ordem reversa para nao alterar indices
            for (let i = matchingIndices.length - 1; i >= 0; i--) {
              legacyPayments.splice(matchingIndices[i], 1);
            }
          }

          const pendingVal = cycleValue - cyclePaidVal;

          if (pendingVal > 0.50) { // tolerância de 50 centavos
            if (cycleDays >= 7) {
              autoFullWeeks++;
            } else {
              hasProratedAdjust = true;
              proratedDaysUsed = cycleDays;
              autoExtraDays += cycleDays;
            }
            autoTireTaxCycles++;
            unpaidRentals += pendingVal;
            unpaidCyclesList.push({
              labelRef: `Semana ${cycleInfo.weekNumber} (${labelRef})`,
              debtValue: pendingVal
            });
          }
        });

        setAutoBreakdown({
          fullWeeks: autoFullWeeks,
          extraDays: autoExtraDays,
          tireTaxCycles: autoTireTaxCycles,
          baseWeeklyRate: baseValue,
          dailyRate: dailyRate,
          tireTaxVal: 25,
          autoTotal: unpaidRentals,
          unpaidCyclesList
        });

        if (!isCustomizingRentals) {
          setCustomWeeks(autoFullWeeks);
          setCustomDays(autoExtraDays);
          setCustomTireTaxCycles(autoTireTaxCycles);
          setIncludeTireTax(autoTireTaxCycles > 0);
        }
      }

      // 4. Unpaid Caucao (Balance remaining)
      const totalCaucao = parseCurrency(rental.depositTotal) || 0;
      const paidCaucao = parseCurrency(rental.depositPaid || rental.depositReceived || 0) || 0;
      const unpaidCaucao = totalCaucao - paidCaucao;

      // Comparação de datas YYYY-MM-DD para verificar se é rescisão antecipada
      const getJustDateStr = (val) => {
        if (!val) return '';
        if (val instanceof Date) {
          return val.toISOString().split('T')[0];
        }
        const str = String(val);
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
          return str.substring(0, 10);
        }
        try {
          const d = new Date(str);
          if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
          }
        } catch (e) {}
        return str;
      };

      const todayStr = getJustDateStr(new Date());
      
      let scheduledEndStr = getJustDateStr(rental.endDate);
      let isEarlyTermination = false;
      
      if (rental.rentalType !== 'daily') {
        if (!scheduledEndStr) {
          const startStr = rental.startDate || rental.date;
          if (startStr) {
            try {
              const startDate = new Date(startStr + 'T12:00:00');
              const weeks = parseInt(rental.durationWeeks || rental.period || 1);
              const totalDays = weeks * 7;
              const expectedEndDate = new Date(startDate.getTime());
              expectedEndDate.setDate(startDate.getDate() + totalDays);
              scheduledEndStr = expectedEndDate.toISOString().split('T')[0];
            } catch (e) {
              console.error("Erro ao calcular data prevista de término:", e);
            }
          }
        }
        isEarlyTermination = scheduledEndStr && todayStr < scheduledEndStr;
      }
      
      const manualDebtsTotal = manualDebts.reduce((sum, d) => sum + d.value, 0);
      const baseDebts = inspectionDebts + unpaidFines + unpaidRentals + manualDebtsTotal;
      const penaltyAmount = Math.max(0, paidCaucao - baseDebts);

      const totalDebts = baseDebts; // Will be updated on confirm if early termination is chosen
      const caucaoAvailable = paidCaucao;
      const balance = caucaoAvailable - totalDebts;

      setClosureData({
        inspectionDebts,
        unpaidFines,
        unpaidRentals,
        hasProratedAdjust,
        proratedDaysUsed,
        unpaidCaucao,
        baseDebts,
        totalDebts,
        caucaoAvailable,
        balance: Math.abs(balance),
        type: balance >= 0 ? 'return' : 'debt',
        earlyTerminationPenalty: 0,
        penaltyAmount,
        scheduledEndDate: scheduledEndStr,
        isEarlyTermination: false,
        unpaidFinesList,
        unpaidCyclesList,
        inspectionDetails: inspection.deductions || [],
        manualDebts
      });
    }
  }, [inspection, rental, transactions, manualDebts]);

  const effectiveCustomUnpaidRentals = React.useMemo(() => {
    if (rental.rentalType === 'daily') {
      const days = parseInt(customDays, 10) || 0;
      const dailyVal = typeof rental.value === 'string' ? parseCurrency(rental.value) : (parseFloat(rental.value) || 0);
      const adj = parseFloat(customAdjustmentVal) || 0;
      return Math.max(0, (days * dailyVal) + adj);
    }
    const weeks = parseInt(customWeeks, 10) || 0;
    const days = parseInt(customDays, 10) || 0;
    const baseWVal = autoBreakdown.baseWeeklyRate || (parseCurrency(rental.value || 0) || 0);
    const dVal = autoBreakdown.dailyRate || (baseWVal / 7);
    const tireCycles = includeTireTax ? (parseInt(customTireTaxCycles, 10) || (weeks + (days > 0 ? 1 : 0))) : 0;
    const tireTotal = tireCycles * (autoBreakdown.tireTaxVal || 25);
    const adj = parseFloat(customAdjustmentVal) || 0;
    return Math.max(0, (weeks * baseWVal) + (days * dVal) + tireTotal + adj);
  }, [customWeeks, customDays, customTireTaxCycles, includeTireTax, customAdjustmentVal, autoBreakdown, rental]);

  const activeUnpaidRentals = isRentalsPaid ? 0 : (isCustomizingRentals ? effectiveCustomUnpaidRentals : closureData.unpaidRentals);

  const displayBaseDebts = (closureData.inspectionDebts || 0) + (closureData.unpaidFines || 0) + activeUnpaidRentals + (closureData.manualDebts || []).reduce((sum, d) => sum + d.value, 0);
  const penaltyAmount = Math.max(0, (closureData.caucaoAvailable || 0) - displayBaseDebts);
  const displayEarlyPenalty = selectedClosureType === 'early' ? penaltyAmount : 0;
  const displayTotalDebts = displayBaseDebts + displayEarlyPenalty;
  const displayBalanceRaw = (closureData.caucaoAvailable || 0) - displayTotalDebts;
  const displayBalance = Math.abs(displayBalanceRaw);
  const displayType = displayBalanceRaw >= 0 ? 'return' : 'debt';

  const handleConfirm = () => {
    if (!selectedClosureType) return;
    
    const finalUnpaidRentals = activeUnpaidRentals;
    const isEarly = selectedClosureType === 'early';
    const finalEarlyPenalty = isEarly ? penaltyAmount : 0;
    const finalTotalDebts = displayTotalDebts;
    const finalBalanceRaw = displayBalanceRaw;

    let effectiveCyclesList = autoBreakdown.unpaidCyclesList || [];
    if (isCustomizingRentals) {
      const list = [];
      if (rental.rentalType === 'daily') {
        const dCount = parseInt(customDays, 10) || 0;
        const dVal = autoBreakdown.dailyRate;
        const adj = parseFloat(customAdjustmentVal) || 0;
        list.push({
          labelRef: `Locação Diária (${dCount} dias)`,
          debtValue: (dCount * dVal) + adj,
          isManualAddition: true
        });
      } else {
        const baseWVal = autoBreakdown.baseWeeklyRate || (parseCurrency(rental.value || 0) || 0);
        const dVal = autoBreakdown.dailyRate || (baseWVal / 7);
        const wCount = parseInt(customWeeks, 10) || 0;
        const dCount = parseInt(customDays, 10) || 0;
        const autoCycles = autoBreakdown.unpaidCyclesList || [];
        let weekIdx = 0;
  
        for (let i = 0; i < wCount; i++) {
          const isExtraManualWeek = i >= (autoBreakdown.weeks || 0);
          if (autoCycles[weekIdx] && !isExtraManualWeek) {
            list.push({
              labelRef: autoCycles[weekIdx].labelRef,
              debtValue: baseWVal + (includeTireTax ? 25 : 0),
              isManualAddition: false
            });
          } else {
            list.push({
              labelRef: `Semana ${weekIdx + 1} (Ref: Adicional Manual no Encerramento)`,
              debtValue: baseWVal + (includeTireTax ? 25 : 0),
              isManualAddition: true
            });
          }
          weekIdx++;
        }
  
        if (dCount > 0) {
          const partialCycle = autoCycles[weekIdx];
          const isExtraManualDays = (autoBreakdown.days || 0) === 0;
          const labelText = partialCycle && !isExtraManualDays ? partialCycle.labelRef : `Semana ${weekIdx + 1} (Ref: Proporcional de ${dCount} dias${isExtraManualDays ? ' - Adicional Manual' : ''})`;
          list.push({
            labelRef: labelText,
            debtValue: (dCount * dVal) + (includeTireTax ? 25 : 0),
            isManualAddition: isExtraManualDays
          });
        }
      }
      effectiveCyclesList = list;
    }

    onConfirm({
      ...closureData,
      unpaidRentals: finalUnpaidRentals,
      unpaidCyclesList: effectiveCyclesList,
      isEarlyTermination: isEarly,
      earlyTerminationPenalty: finalEarlyPenalty,
      penaltyAmount: penaltyAmount,
      baseDebts: displayBaseDebts,
      totalDebts: finalTotalDebts,
      balance: Math.abs(finalBalanceRaw),
      type: finalBalanceRaw >= 0 ? 'return' : 'debt',
      unpaidRentalsMarkedAsPaid: isRentalsPaid,
      rentalCalculationBreakdown: {
        isCustomized: isCustomizingRentals,
        weeks: isCustomizingRentals ? customWeeks : autoBreakdown.fullWeeks,
        days: isCustomizingRentals ? customDays : autoBreakdown.extraDays,
        tireTaxCycles: isCustomizingRentals ? customTireTaxCycles : autoBreakdown.tireTaxCycles,
        includeTireTax,
        baseWeeklyRate: autoBreakdown.baseWeeklyRate,
        dailyRate: autoBreakdown.dailyRate,
        total: finalUnpaidRentals
      }
    });
  };

  if (!inspection || !rental) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/98 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="p-10 border-b border-neutral-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-neutral-900 rounded-[2rem] flex items-center justify-center text-[#C5A059] shadow-2xl">
              <Ban size={28} />
            </div>
            <div>
              <EditorialLabel className="text-[#C5A059] mb-1">Passo Final Operacional</EditorialLabel>
              <h4 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">Encerramento de Contrato</h4>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-neutral-50 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all text-neutral-400">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
          <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
            <h5 className="text-sm font-black uppercase text-neutral-900 mb-1 flex items-center gap-2">
              <ShieldAlert size={18} className="text-[#C5A059]" /> 
              Selecione o Tipo de Encerramento
            </h5>
            <p className="text-xs text-neutral-500 font-bold mb-4">
              Ao selecionar uma das opções abaixo, o resumo financeiro será atualizado para refletir a sua escolha.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedClosureType('normal')}
                className={`p-6 rounded-2xl border-2 flex flex-col gap-2 text-left transition-all ${
                  selectedClosureType === 'normal' 
                    ? 'border-emerald-500 bg-emerald-50 shadow-md ring-4 ring-emerald-500/10' 
                    : 'border-neutral-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Check size={20} className={selectedClosureType === 'normal' ? 'text-emerald-600' : 'text-neutral-400'} />
                  <span className={`text-sm font-black uppercase tracking-wider ${selectedClosureType === 'normal' ? 'text-emerald-700' : 'text-neutral-700'}`}>
                    Encerramento Padrão
                  </span>
                </div>
                <p className="text-[10px] font-bold text-neutral-500 leading-relaxed mt-1">
                  O contrato foi finalizado conforme o combinado. Nenhuma multa rescisória será aplicada.
                </p>
              </button>

              <button
                onClick={() => setSelectedClosureType('early')}
                className={`p-6 rounded-2xl border-2 flex flex-col gap-2 text-left transition-all ${
                  selectedClosureType === 'early' 
                    ? 'border-amber-500 bg-amber-50 shadow-md ring-4 ring-amber-500/10' 
                    : 'border-neutral-200 bg-white hover:border-amber-200 hover:bg-amber-50/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={20} className={selectedClosureType === 'early' ? 'text-amber-600' : 'text-neutral-400'} />
                  <span className={`text-sm font-black uppercase tracking-wider ${selectedClosureType === 'early' ? 'text-amber-700' : 'text-neutral-700'}`}>
                    Fora do Combinado
                  </span>
                </div>
                <p className="text-[10px] font-bold text-neutral-500 leading-relaxed mt-1">
                  Quebra de contrato ou devolução antecipada. A multa rescisória estimada de <strong className="text-amber-700">R$ {closureData.penaltyAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> será aplicada e retida da caução.
                </p>
              </button>
            </div>
          </div>

          {/* Step 1: Consolidation */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-neutral-900 rounded-lg flex items-center justify-center text-white text-[10px] font-black">1</div>
              <h5 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-neutral-900">Consolidação de Débitos Pendentes</h5>
            </div>

            <div className="bg-neutral-50 rounded-[2rem] md:rounded-[2.5rem] border border-neutral-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[500px] md:min-w-0">
                  <thead>
                    <tr className="bg-neutral-100/50">
                      <th className="px-6 md:px-8 py-4 text-[9px] uppercase tracking-widest text-neutral-400 font-black">Tipo de Débito</th>
                      <th className="px-6 md:px-8 py-4 text-[9px] uppercase tracking-widest text-neutral-400 font-black">Fonte de Origem</th>
                      <th className="px-6 md:px-8 py-4 text-[9px] uppercase tracking-widest text-neutral-400 font-black text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    <tr>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-neutral-900 uppercase">Itens de Vistoria</td>
                      <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Vistoria de Devolução</td>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-red-500 text-right">R$ {closureData.inspectionDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-neutral-900 uppercase">Multas Pendentes</td>
                      <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Aba Multas</td>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-red-500 text-right">R$ {closureData.unpaidFines.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    {/* Linha Principal de Aluguéis Vencidos */}
                    <tr className={isCustomizingRentals ? "bg-amber-50/50" : ""}>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-neutral-900 uppercase">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>Aluguéis Vencidos</span>
                            {isCustomizingRentals ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[8px] font-black tracking-wider flex items-center gap-1 border border-amber-300">
                                ✏️ Ajustado ({customWeeks} sem. e {customDays} dias)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[8px] font-bold tracking-wider">
                                {autoBreakdown.fullWeeks > 0 ? `${autoBreakdown.fullWeeks} sem.` : ''}
                                {autoBreakdown.fullWeeks > 0 && autoBreakdown.extraDays > 0 ? ' e ' : ''}
                                {autoBreakdown.extraDays > 0 ? `${autoBreakdown.extraDays} dias` : ''}
                                {autoBreakdown.fullWeeks === 0 && autoBreakdown.extraDays === 0 ? '0 dias' : ''}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowRentalDetails(!showRentalDetails)}
                            className="text-[9px] font-bold text-[#C5A059] hover:text-neutral-900 transition-colors flex items-center gap-1 text-left w-fit"
                          >
                            {showRentalDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {showRentalDetails ? 'Ocultar Detalhamento / Ajuste' : 'Ver Detalhamento / Ajustar Dias e Semanas'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-tight">
                        Aba Cobranças
                      </td>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-red-500 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {isRentalsPaid ? (
                            <span className="text-emerald-500 flex items-center gap-1 opacity-70 line-through">
                              R$ {activeUnpaidRentals.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className={isCustomizingRentals ? "text-amber-600 font-black text-xs" : ""}>
                              R$ {activeUnpaidRentals.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          
                          {activeUnpaidRentals > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isRentalsPaid) {
                                  setIsRentalsPaid(false);
                                } else {
                                  setShowRentalsPaidConfirm(true);
                                }
                              }}
                              className={`px-2 py-1 text-[9px] uppercase tracking-widest font-black rounded border transition-colors ${
                                isRentalsPaid 
                                  ? 'border-neutral-200 text-neutral-400 hover:text-neutral-900' 
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300'
                              }`}
                            >
                              {isRentalsPaid ? 'Desfazer' : 'Marcar Pago'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Painel Expansível de Detalhamento e Ajuste do Admin */}
                    {showRentalDetails && (
                      <tr>
                        <td colSpan={3} className="p-0 bg-neutral-900 border-t border-neutral-800 text-white">
                          <div className="p-5 md:p-7 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                            
                            {/* Header do Box */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-neutral-800">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center">
                                  <Calculator size={16} />
                                </div>
                                <div>
                                  <h6 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                                    Detalhamento de Aluguéis Vencidos
                                    {isCustomizingRentals ? (
                                      <span className="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-black">
                                        ✏️ Modo Personalizado
                                      </span>
                                    ) : (
                                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black">
                                        🤖 Cálculo Automático
                                      </span>
                                    )}
                                  </h6>
                                  <p className="text-[9px] text-neutral-400 font-bold">
                                    {isCustomizingRentals 
                                      ? 'Você tem total liberdade para editar a quantidade de semanas, dias e taxas abaixo.'
                                      : 'Cálculo gerado automaticamente com base nos ciclos do contrato e data de devolução.'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isCustomizingRentals ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsCustomizingRentals(false);
                                      setCustomWeeks(autoBreakdown.fullWeeks);
                                      setCustomDays(autoBreakdown.extraDays);
                                      setCustomTireTaxCycles(autoBreakdown.tireTaxCycles);
                                      setIncludeTireTax(autoBreakdown.tireTaxCycles > 0);
                                      setCustomAdjustmentVal('');
                                    }}
                                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 border border-neutral-700"
                                  >
                                    <RotateCcw size={12} />
                                    Restaurar Cálculo Automático
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setIsCustomizingRentals(true)}
                                    className="px-3 py-1.5 bg-[#C5A059] hover:bg-[#b08d4b] text-neutral-950 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
                                  >
                                    <Sliders size={12} />
                                    Personalizar Dias / Semanas
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Detalhamento dos Valores Base */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80">
                              <div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 block">Aluguel Semanal</span>
                                <span className="text-xs font-black text-white font-mono">
                                  R$ {autoBreakdown.baseWeeklyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 block">Diária Proporcional</span>
                                <span className="text-xs font-black text-[#C5A059] font-mono">
                                  R$ {autoBreakdown.dailyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / dia
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 block">Taxa de Pneus</span>
                                <span className="text-xs font-black text-neutral-200 font-mono">
                                  R$ {autoBreakdown.tireTaxVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ciclo
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 block">Cálculo Automático</span>
                                <span className="text-xs font-black text-emerald-400 font-mono">
                                  R$ {autoBreakdown.autoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            {/* Controles Interativos de Ajuste do Admin */}
                            {isCustomizingRentals && (
                              <div className="space-y-4 pt-1">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  
                                  {/* Semanas Completas */}
                                  {rental.rentalType !== 'daily' && (
                                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 flex flex-col justify-between">
                                    <div>
                                      <span className="text-[9px] font-black uppercase tracking-widest text-[#C5A059] block mb-1">
                                        Semanas Completas
                                      </span>
                                      <p className="text-[8px] text-neutral-400 font-bold mb-3">
                                        {customWeeks} semana(s) cheia(s) de 7 dias
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setCustomWeeks(prev => Math.max(0, parseInt(prev, 10) - 1))}
                                        className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center transition-colors"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        value={customWeeks}
                                        onChange={e => setCustomWeeks(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                        className="w-16 bg-neutral-900 border border-neutral-700 rounded-lg py-1 text-center text-xs font-black text-white outline-none focus:border-[#C5A059]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setCustomWeeks(prev => parseInt(prev, 10) + 1)}
                                        className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center transition-colors"
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                    <span className="text-[9px] font-mono font-bold text-neutral-400 mt-2 block text-right">
                                      = R$ {((parseInt(customWeeks, 10) || 0) * autoBreakdown.baseWeeklyRate).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  )}

                                  {/* Dias Proporcionais */}
                                  <div className={`bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 flex flex-col justify-between ${rental.rentalType === 'daily' ? 'sm:col-span-3' : ''}`}>
                                    <div>
                                      <span className="text-[9px] font-black uppercase tracking-widest text-[#C5A059] block mb-1">
                                        {rental.rentalType === 'daily' ? 'Dias Locados' : 'Dias Proporcionais'}
                                      </span>
                                      <p className="text-[8px] text-neutral-400 font-bold mb-3">
                                        {customDays} dia(s) {rental.rentalType === 'daily' ? '' : 'avulso(s) adicionais'}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setCustomDays(prev => Math.max(0, parseInt(prev, 10) - 1))}
                                        className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center transition-colors"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        value={customDays}
                                        onChange={e => setCustomDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                        className="w-16 bg-neutral-900 border border-neutral-700 rounded-lg py-1 text-center text-xs font-black text-white outline-none focus:border-[#C5A059]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setCustomDays(prev => parseInt(prev, 10) + 1)}
                                        className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center transition-colors"
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                    <span className="text-[9px] font-mono font-bold text-neutral-400 mt-2 block text-right">
                                      = R$ {((parseInt(customDays, 10) || 0) * autoBreakdown.dailyRate).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>

                                  {/* Taxa de Pneus */}
                                  {rental.rentalType !== 'daily' && (
                                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 flex flex-col justify-between">
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#C5A059]">
                                          Taxa de Pneus
                                        </span>
                                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={includeTireTax}
                                            onChange={e => setIncludeTireTax(e.target.checked)}
                                            className="w-3.5 h-3.5 text-[#C5A059] rounded focus:ring-0"
                                          />
                                          <span className="text-[8px] font-bold text-neutral-400 uppercase">Cobrar</span>
                                        </label>
                                      </div>
                                      <p className="text-[8px] text-neutral-400 font-bold mb-3">
                                        {includeTireTax ? `${customTireTaxCycles} ciclo(s) de taxa de pneus` : 'Isento de taxa de pneus'}
                                      </p>
                                    </div>
                                    {includeTireTax ? (
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setCustomTireTaxCycles(prev => Math.max(0, parseInt(prev, 10) - 1))}
                                          className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center transition-colors"
                                        >
                                          <Minus size={14} />
                                        </button>
                                        <input
                                          type="number"
                                          min="0"
                                          value={customTireTaxCycles}
                                          onChange={e => setCustomTireTaxCycles(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                          className="w-16 bg-neutral-900 border border-neutral-700 rounded-lg py-1 text-center text-xs font-black text-white outline-none focus:border-[#C5A059]"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setCustomTireTaxCycles(prev => parseInt(prev, 10) + 1)}
                                          className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center transition-colors"
                                        >
                                          <Plus size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="py-2 text-[10px] font-bold text-neutral-500 italic">Taxa de pneus desativada</div>
                                    )}
                                    <span className="text-[9px] font-mono font-bold text-neutral-400 mt-2 block text-right">
                                      = R$ {(includeTireTax ? (parseInt(customTireTaxCycles, 10) || 0) * 25 : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  )}

                                </div>
                              </div>
                            )}

                            {/* Resumo da Fórmula Matemática em Tempo Real */}
                            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div className="space-y-1">
                                <span className="text-[8px] font-black uppercase tracking-widest text-[#C5A059] flex items-center gap-1.5">
                                  <Sparkles size={11} /> Fórmula do Cálculo Aplicado
                                </span>
                                <p className="text-[10px] font-mono font-bold text-neutral-300 leading-relaxed">
                                  {isCustomizingRentals ? (
                                    <>
                                      ({customWeeks} sem. × R$ {autoBreakdown.baseWeeklyRate.toFixed(2).replace('.', ',')}) + 
                                      ({customDays} dias × R$ {autoBreakdown.dailyRate.toFixed(2).replace('.', ',')}) + 
                                      ({includeTireTax ? customTireTaxCycles : 0} pneus × R$ 25,00)
                                      {parseFloat(customAdjustmentVal) ? ` ${parseFloat(customAdjustmentVal) >= 0 ? '+' : '-'} R$ ${Math.abs(parseFloat(customAdjustmentVal)).toFixed(2).replace('.', ',')}` : ''}
                                    </>
                                  ) : (
                                    <>
                                      ({autoBreakdown.fullWeeks} sem. × R$ {autoBreakdown.baseWeeklyRate.toFixed(2).replace('.', ',')}) + 
                                      ({autoBreakdown.extraDays} dias × R$ {autoBreakdown.dailyRate.toFixed(2).replace('.', ',')}) + 
                                      ({autoBreakdown.tireTaxCycles} pneus × R$ 25,00)
                                    </>
                                  )}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 block">Total de Aluguel</span>
                                <span className={`text-base font-black font-mono ${isCustomizingRentals ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  R$ {activeUnpaidRentals.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}

                    {manualDebts.map(debt => (
                      <tr key={debt.id} className="bg-red-50/30">
                        <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-neutral-900 uppercase">{debt.description}</td>
                        <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Débito Manual</td>
                        <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-red-500 text-right">
                          <div className="flex items-center justify-end gap-2 group">
                            <span>R$ {debt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <button onClick={() => removeManualDebt(debt.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {selectedClosureType === 'early' && closureData.penaltyAmount > 0 && (
                      <tr className="bg-amber-50/50 animate-in fade-in">
                        <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-amber-950 uppercase">Multa Rescisão Antecipada</td>
                        <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-amber-700 uppercase tracking-tight">Retenção de Saldo Remanescente da Caução</td>
                        <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-amber-600 text-right">R$ {closureData.penaltyAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    )}

                    <tr className="bg-neutral-900">
                      <td colSpan={2} className="px-6 md:px-8 py-5 text-[9px] md:text-[10px] font-black text-[#C5A059] uppercase tracking-widest">Total de Débitos Consolidados</td>
                      <td className="px-6 md:px-8 py-5 text-base md:text-lg font-black text-white text-right transition-all">R$ {displayTotalDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-end">
              {!isAddingManual ? (
                <button 
                  onClick={() => setIsAddingManual(true)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                   Adicionar Débito Manual
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-neutral-50 p-2 rounded-xl border border-neutral-200 animate-in fade-in">
                  <input 
                    type="text" 
                    placeholder="Descrição do débito" 
                    value={newManualName}
                    onChange={e => setNewManualName(e.target.value)}
                    className="w-48 px-3 py-1.5 text-[11px] font-bold border border-neutral-200 rounded text-neutral-900 outline-none focus:border-emerald-500"
                  />
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-neutral-400 font-bold text-[11px]">R$</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={newManualValue}
                      onChange={e => setNewManualValue(e.target.value)}
                      className="w-24 pl-7 pr-2 py-1.5 text-right text-[11px] font-black border border-neutral-200 rounded text-neutral-900 outline-none focus:border-emerald-500"
                      onKeyDown={e => { if(e.key === 'Enter') addManualDebt(); }}
                    />
                  </div>
                  <button onClick={addManualDebt} className="w-7 h-7 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200"><Check size={14}/></button>
                  <button onClick={() => setIsAddingManual(false)} className="w-7 h-7 flex items-center justify-center bg-neutral-100 text-neutral-500 rounded hover:bg-neutral-200"><X size={14}/></button>
                </div>
              )}
            </div>
          </section>

          {/* Step 2: Comparison (Hide for Daily Rentals since they have no caucao) */}
          {rental.rentalType !== 'daily' && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-neutral-900 rounded-lg flex items-center justify-center text-white text-[10px] font-black">2</div>
                <h5 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-neutral-900">Confronto com Caução Disponível</h5>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="bg-neutral-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-neutral-100 flex flex-col justify-between">
                <div>
                  <p className="text-[8px] md:text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-1">Caução Líquida Disponível</p>
                  <h6 className="text-2xl md:text-3xl font-black text-emerald-600 tracking-tighter">R$ {closureData.caucaoAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h6>
                </div>
                <p className="text-[7px] md:text-[8px] text-neutral-400 font-bold uppercase mt-4 italic">Valor já pago pelo motorista e retido pela locadora.</p>
              </div>

              <div className={`p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border flex flex-col justify-between transition-all ${displayType === 'return' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                <div>
                  <p className={`text-[8px] md:text-[9px] uppercase tracking-widest font-black mb-1 ${displayType === 'return' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {displayType === 'return' ? 'Saldo a Devolver' : 'Saldo Devedor Final'}
                  </p>
                  <h6 className={`text-2xl md:text-3xl font-black tracking-tighter transition-all ${displayType === 'return' ? 'text-emerald-900' : 'text-amber-900'}`}>
                    R$ {displayBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h6>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  {displayType === 'return' ? (
                    <Check size={12} className="text-emerald-600" />
                  ) : (
                    <AlertTriangle size={12} className="text-amber-600" />
                  )}
                  <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${displayType === 'return' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {displayType === 'return' ? 'Gerar ordem de reembolso' : 'Gerar boleto de cobrança avulso'}
                  </span>
                </div>
              </div>
            </div>
          </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 md:p-10 border-t border-neutral-50 bg-neutral-50/30 flex flex-col md:flex-row justify-end gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 hover:text-neutral-900 transition-all flex items-center justify-center"
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!selectedClosureType}
            className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl ${
              selectedClosureType
                ? 'bg-neutral-900 text-[#C5A059] hover:bg-neutral-800'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
            }`}
          >
            Avançar para Assinatura <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Modal de Confirmação: Marcar Aluguéis como Pagos */}
      {showRentalsPaidConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-neutral-100 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-5 mx-auto shadow-sm">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-lg md:text-xl font-black text-neutral-900 text-center tracking-tight">
              Confirmar Baixa de Aluguéis?
            </h3>

            <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-center">
              <p className="text-xs font-bold text-amber-950 leading-relaxed">
                Você está marcando <span className="font-black text-amber-900 font-mono text-sm">R$ {activeUnpaidRentals.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> em aluguéis pendentes como <span className="font-black underline text-emerald-800">PAGOS NA ENTREGA</span>.
              </p>
              <div className="mt-3 pt-3 border-t border-amber-200 flex items-center justify-center gap-1.5 text-[10px] font-black text-amber-800 uppercase tracking-wider">
                <ShieldAlert size={14} className="text-amber-600 shrink-0" />
                Esta ação é irreversível no encerramento
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 text-center mt-4 leading-relaxed font-medium">
              Ao confirmar, o sistema dará baixa definitiva nesses aluguéis, gerará as transações no Financeiro e não cobrará esse valor do saldo devedor nem abaterá da caução.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowRentalsPaidConfirm(false)}
                className="py-3.5 px-4 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-black text-xs uppercase tracking-wider transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRentalsPaid(true);
                  setShowRentalsPaidConfirm(false);
                }}
                className="py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <Check size={16} /> Sim, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EditorialLabel = ({ children, className }) => (
  <span className={`text-[10px] font-black uppercase tracking-[0.3em] block ${className}`}>
    {children}
  </span>
);

export default ContractClosureModal;
