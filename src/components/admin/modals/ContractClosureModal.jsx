import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Check, AlertTriangle, ArrowRight, Wallet, Landmark, FileText, Landmark as BankIcon, Receipt, Ban } from 'lucide-react';
import { parseCurrency } from '../../../utils/currencyUtils';

const ContractClosureModal = ({ inspection, rental, rentals = [], transactions = [], onClose, onConfirm }) => {
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
    scheduledEndDate: ''
  });

  useEffect(() => {
    if (inspection && rental) {
      // 1. Debts from inspection
      const inspectionDebts = (inspection.deductions || []).reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);

      // 2. Unpaid fines (From transactions)
      const unpaidFines = transactions
        .filter(t => t.vehiclePlate === rental.plate && (t.cat === 'Multa' || t.desc.toLowerCase().includes('multa')) && t.status === 'pendente')
        .reduce((acc, curr) => acc + (parseFloat(curr.val) || 0), 0);

      // 3. Unpaid rentals (From transactions)
      const unpaidRentals = transactions
        .filter(t => t.vehiclePlate === rental.plate && (t.cat === 'Aluguel' || t.cat === 'Cobrança') && t.status === 'pendente')
        .reduce((acc, curr) => acc + (parseFloat(curr.val) || 0), 0);

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
      
      // Se não há data final real (pois ainda está ativo), calcula a data final planejada
      let scheduledEndStr = getJustDateStr(rental.endDate);
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

      const isEarlyTermination = scheduledEndStr && todayStr < scheduledEndStr;
      const earlyTerminationPenalty = isEarlyTermination ? paidCaucao : 0;

      const totalDebts = inspectionDebts + unpaidFines + unpaidRentals + earlyTerminationPenalty;
      const caucaoAvailable = paidCaucao;
      const balance = caucaoAvailable - totalDebts;

      setClosureData({
        inspectionDebts,
        unpaidFines,
        unpaidRentals,
        unpaidCaucao,
        totalDebts,
        caucaoAvailable,
        balance: Math.abs(balance),
        type: balance >= 0 ? 'return' : 'debt',
        earlyTerminationPenalty,
        scheduledEndDate: scheduledEndStr
      });
    }
  }, [inspection, rental, transactions]);

  if (!inspection || !rental) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/98 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-[#0a0a0a] w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="p-10 border-b border-neutral-800 flex justify-between items-center bg-[#0a0a0a] shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-2xl">
              <Ban size={28} />
            </div>
            <div>
              <EditorialLabel className="text-[#D4AF37] mb-1">Passo Final Operacional</EditorialLabel>
              <h4 className="text-3xl font-black uppercase tracking-tighter text-white">Encerramento de Contrato</h4>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-black flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all text-neutral-400">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
          {closureData.earlyTerminationPenalty > 0 && (
            <div className="p-6 bg-amber-500/10 border border-amber-200 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h5 className="text-sm font-black uppercase text-amber-900 mb-1">Rescisão Antecipada Detectada</h5>
                <p className="text-xs text-amber-700/80 leading-relaxed font-bold">
                  O contrato está sendo encerrado antes do término planejado ({closureData.scheduledEndDate ? new Date(closureData.scheduledEndDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não Informado'}). 
                  Como consequência, o condutor perde integralmente o valor de sua caução (R$ {closureData.earlyTerminationPenalty.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}), retida como multa de rescisão.
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Consolidation */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-neutral-900 rounded-lg flex items-center justify-center text-white text-[10px] font-black">1</div>
              <h5 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white">Consolidação de Débitos Pendentes</h5>
            </div>

            <div className="bg-black rounded-2xl md:rounded-3xl border border-neutral-800 overflow-hidden">
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
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-white uppercase">Itens de Vistoria</td>
                      <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Vistoria de Devolução</td>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-red-500 text-right">R$ {closureData.inspectionDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-white uppercase">Multas Pendentes</td>
                      <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Aba Multas</td>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-red-500 text-right">R$ {closureData.unpaidFines.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-white uppercase">Aluguéis Vencidos</td>
                      <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Aba Cobranças</td>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-red-500 text-right">R$ {closureData.unpaidRentals.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    {closureData.earlyTerminationPenalty > 0 && (
                      <tr className="bg-amber-500/10/50">
                        <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-amber-950 uppercase">Multa Rescisão Antecipada</td>
                        <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-amber-700 uppercase tracking-tight">Perda Integral da Caução</td>
                        <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-amber-600 text-right">R$ {closureData.earlyTerminationPenalty.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    )}

                    <tr className="bg-neutral-900">
                      <td colSpan={2} className="px-6 md:px-8 py-5 text-[9px] md:text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">Total de Débitos Consolidados</td>
                      <td className="px-6 md:px-8 py-5 text-base md:text-lg font-black text-white text-right">R$ {closureData.totalDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
              <h5 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white">Confronto com Caução Disponível</h5>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="bg-black p-6 md:p-8 rounded-2xl md:rounded-2xl border border-neutral-800 flex flex-col justify-between">
                <div>
                  <p className="text-[8px] md:text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-1">Caução Líquida Disponível</p>
                  <h6 className="text-2xl md:text-3xl font-black text-emerald-600 tracking-tighter">R$ {closureData.caucaoAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h6>
                </div>
                <p className="text-[7px] md:text-[8px] text-neutral-400 font-bold uppercase mt-4 italic">Valor já pago pelo motorista e retido pela locadora.</p>
              </div>

              <div className={`p-6 md:p-8 rounded-2xl md:rounded-2xl border flex flex-col justify-between ${closureData.type === 'return' ? 'bg-emerald-500/10 border-emerald-100' : 'bg-amber-500/10 border-amber-100'}`}>
                <div>
                  <p className={`text-[8px] md:text-[9px] uppercase tracking-widest font-black mb-1 ${closureData.type === 'return' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {closureData.type === 'return' ? 'Saldo a Devolver' : 'Saldo Devedor Final'}
                  </p>
                  <h6 className={`text-2xl md:text-3xl font-black tracking-tighter ${closureData.type === 'return' ? 'text-emerald-900' : 'text-amber-900'}`}>
                    R$ {closureData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h6>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  {closureData.type === 'return' ? (
                    <Check size={12} className="text-emerald-600" />
                  ) : (
                    <AlertTriangle size={12} className="text-amber-600" />
                  )}
                  <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${closureData.type === 'return' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {closureData.type === 'return' ? 'Gerar ordem de reembolso' : 'Gerar boleto de cobrança avulso'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-10 border-t border-neutral-50 bg-black/30 flex justify-end gap-6 shrink-0">
          <button 
            onClick={onClose}
            className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 hover:text-white transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(closureData)}
            className="px-16 py-5 bg-neutral-900 text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-[#D4AF37] hover:text-white transition-all shadow-2xl"
          >
            Gerar Termo de Rescisão
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
