import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Check, AlertTriangle, ArrowRight, Wallet, Landmark, FileText, Landmark as BankIcon, Receipt, Ban } from 'lucide-react';
import { parseCurrency } from '../../../utils/currencyUtils';

const ContractClosureModal = ({ inspection, rental, rentals = [], transactions = [], fines = [], onClose, onConfirm }) => {
  const [selectedClosureType, setSelectedClosureType] = useState(null); // 'normal' | 'early'
  const [closureData, setClosureData] = useState({
    inspectionDebts: 0,
    unpaidFines: 0,
    unpaidRentals: 0,
    unpaidCaucao: 0,
    totalDebts: 0,
    caucaoAvailable: 0,
    balance: 0,
    type: 'return', // 'return' or 'debt'
    earlyTerminationPenalty: 0,
    penaltyAmount: 0,
    scheduledEndDate: '',
    baseDebts: 0,
    isEarlyTermination: false
  });

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
      const unpaidFines = (fines || [])
        .filter(f => {
          const isSamePlate = matchPlate(f.vehiclePlate, rental.plate);
          const isSameDriver = (f.driverName || '').toLowerCase().trim() === driverName;
          const isSameRental = f.rentalId && f.rentalId === rental.id;
          return isSamePlate && (isSameDriver || isSameRental) && ['pendente', 'em cobrança'].includes((f.status || '').toLowerCase());
        })
        .reduce((acc, curr) => {
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

      if (rental.rentalType === 'daily') {
        const startStr = (rental.startDate || rental.date || new Date().toISOString()).substring(0, 10);
        const startDate = new Date(startStr + 'T12:00:00');
        const todayStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
        const todayObj = new Date(todayStr + 'T12:00:00');
        const diffTime = todayObj.getTime() - startDate.getTime();
        const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
        const dailyValue = typeof rental.value === 'string' ? parseCurrency(rental.value) : (parseFloat(rental.value) || 0);
        unpaidRentals = diffDays * dailyValue;
      } else {
        const unpaidRentalTransactions = transactions
          .filter(t => matchPlate(t.vehiclePlate, rental.plate) && matchDriverTrans(t) && (t.cat === 'Aluguel' || t.cat === 'Cobrança') && (t.status || '').toLowerCase() === 'pendente');

        unpaidRentalTransactions.forEach(t => {
          let val = parseFloat(t.val) || 0;
          
          if (t.date) {
             const tDate = new Date(t.date + 'T12:00:00');
             const todayStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
             const todayObj = new Date(todayStr + 'T12:00:00');
             const diffTime = todayObj.getTime() - tDate.getTime();
             const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
             
             if (diffDays >= 1 && diffDays < 7) {
                const daysToCharge = diffDays;
                val = (val / 7) * daysToCharge;
                hasProratedAdjust = true;
                proratedDaysUsed = daysToCharge;
             }
          }
          
          unpaidRentals += val;
        });
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
      
      const baseDebts = inspectionDebts + unpaidFines + unpaidRentals;
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
        isEarlyTermination: false
      });
    }
  }, [inspection, rental, transactions]);

  const handleConfirm = () => {
    if (!selectedClosureType) return;
    
    let finalEarlyPenalty = 0;
    let finalTotalDebts = closureData.baseDebts;
    const isEarly = selectedClosureType === 'early';
    
    if (isEarly) {
      finalEarlyPenalty = closureData.penaltyAmount;
      finalTotalDebts += finalEarlyPenalty;
    }

    const finalBalanceRaw = closureData.caucaoAvailable - finalTotalDebts;
    
    onConfirm({
      ...closureData,
      isEarlyTermination: isEarly,
      earlyTerminationPenalty: finalEarlyPenalty,
      totalDebts: finalTotalDebts,
      balance: Math.abs(finalBalanceRaw),
      type: finalBalanceRaw >= 0 ? 'return' : 'debt'
    });
  };

  if (!inspection || !rental) return null;

  const displayEarlyPenalty = selectedClosureType === 'early' ? closureData.penaltyAmount : 0;
  const displayTotalDebts = closureData.baseDebts + displayEarlyPenalty;
  const displayBalanceRaw = closureData.caucaoAvailable - displayTotalDebts;
  const displayBalance = Math.abs(displayBalanceRaw);
  const displayType = displayBalanceRaw >= 0 ? 'return' : 'debt';

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
                    <tr>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-neutral-900 uppercase">
                        Aluguéis Vencidos {closureData.hasProratedAdjust ? `(Proporcional de ${closureData.proratedDaysUsed} dias)` : ''}
                      </td>
                      <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Aba Cobranças</td>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-red-500 text-right">R$ {closureData.unpaidRentals.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>

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
          </section>

          {/* Step 2: Comparison */}
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
    </div>
  );
};

const EditorialLabel = ({ children, className }) => (
  <span className={`text-[10px] font-black uppercase tracking-[0.3em] block ${className}`}>
    {children}
  </span>
);

export default ContractClosureModal;
