import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Check, AlertTriangle, ArrowRight, Wallet, Landmark, FileText, Landmark as BankIcon, Receipt, Ban } from 'lucide-react';

const ContractClosureModal = ({ inspection, rental, rentals = [], transactions = [], onClose, onConfirm }) => {
  const [closureData, setClosureData] = useState({
    inspectionDebts: 0,
    unpaidFines: 0,
    unpaidRentals: 0,
    unpaidCaucao: 0,
    totalDebts: 0,
    caucaoAvailable: 0,
    balance: 0,
    type: 'return' // 'return' or 'debt'
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
      const totalCaucao = parseFloat(String(rental.depositTotal).replace(/\./g, '').replace(',', '.')) || 0;
      const paidCaucao = parseFloat(String(rental.depositPaid || rental.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0;
      const unpaidCaucao = totalCaucao - paidCaucao;

      const totalDebts = inspectionDebts + unpaidFines + unpaidRentals + unpaidCaucao;
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
        type: balance >= 0 ? 'return' : 'debt'
      });
    }
  }, [inspection, rental, transactions]);

  if (!inspection || !rental) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/98 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="p-10 border-b border-neutral-100 flex justify-between items-center bg-white">
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
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-red-500 text-right">R$ {closureData.inspectionDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-neutral-900 uppercase">Multas Pendentes</td>
                      <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Aba Multas</td>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-red-500 text-right">R$ {closureData.unpaidFines.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-neutral-900 uppercase">Aluguéis Vencidos</td>
                      <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Aba Cobranças</td>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-red-500 text-right">R$ {closureData.unpaidRentals.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-neutral-900 uppercase">Caução em Aberto</td>
                      <td className="px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Saldo Parcelado</td>
                      <td className="px-6 md:px-8 py-4 text-[10px] md:text-[11px] font-black text-red-500 text-right">R$ {closureData.unpaidCaucao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-neutral-900">
                      <td colSpan={2} className="px-6 md:px-8 py-5 text-[9px] md:text-[10px] font-black text-[#C5A059] uppercase tracking-widest">Total de Débitos Consolidados</td>
                      <td className="px-6 md:px-8 py-5 text-base md:text-lg font-black text-white text-right">R$ {closureData.totalDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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
                  <h6 className="text-2xl md:text-3xl font-black text-emerald-600 tracking-tighter">R$ {closureData.caucaoAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h6>
                </div>
                <p className="text-[7px] md:text-[8px] text-neutral-400 font-bold uppercase mt-4 italic">Valor já pago pelo motorista e retido pela locadora.</p>
              </div>

              <div className={`p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border flex flex-col justify-between ${closureData.type === 'return' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                <div>
                  <p className={`text-[8px] md:text-[9px] uppercase tracking-widest font-black mb-1 ${closureData.type === 'return' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {closureData.type === 'return' ? 'Saldo a Devolver' : 'Saldo Devedor Final'}
                  </p>
                  <h6 className={`text-2xl md:text-3xl font-black tracking-tighter ${closureData.type === 'return' ? 'text-emerald-900' : 'text-amber-900'}`}>
                    R$ {closureData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
        <div className="p-10 border-t border-neutral-50 bg-neutral-50/30 flex justify-end gap-6 shrink-0">
          <button 
            onClick={onClose}
            className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 hover:text-neutral-900 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(closureData)}
            className="px-16 py-5 bg-neutral-900 text-[#C5A059] text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-[#C5A059] hover:text-white transition-all shadow-2xl"
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
