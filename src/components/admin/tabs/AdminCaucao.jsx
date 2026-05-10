import React, { useState } from 'react';
import { ShieldCheck, Clock, Landmark, Search, Check, FileCheck, X, Landmark as BankIcon, Receipt } from 'lucide-react';

const AdminCaucao = ({
  rentals = [],
  payCaucaoInstallment
}) => {
  const [search, setSearch] = useState('');
  const [selectedRental, setSelectedRental] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);

  const totalCustodia = rentals.reduce((acc, r) => acc + (parseFloat(String(r.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0), 0);
  const totalReceber = rentals.reduce((acc, r) => {
    const total = parseFloat(String(r.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0;
    const received = parseFloat(String(r.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0;
    return acc + (total - received);
  }, 0);
  const totalContratado = rentals.reduce((acc, r) => acc + (parseFloat(String(r.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0), 0);

  const filteredRentals = rentals.filter(r => 
    r.user?.toLowerCase().includes(search.toLowerCase()) || 
    r.plate?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenPayModal = (rental) => {
    setSelectedRental(rental);
    setShowPayModal(true);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-700">
      {/* Caução Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-4 flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" /> Caução em Custódia
          </p>
          <p className="text-4xl font-black text-neutral-900">
            R$ {totalCustodia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-neutral-300 font-bold mt-4 uppercase tracking-widest">Total recebido e disponível</p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-4 flex items-center gap-2">
            <Clock size={14} className="text-amber-500" /> Saldo a Receber (Parcelado)
          </p>
          <p className="text-4xl font-black text-neutral-900">
            R$ {totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-neutral-300 font-bold mt-4 uppercase tracking-widest">Expectativa de recebimento</p>
        </div>

        <div className="bg-neutral-950 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#C5A059]/10 rounded-full blur-3xl -z-10 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-4">Total Geral Contratado</p>
          <p className="text-4xl font-black text-[#C5A059]">
            R$ {totalContratado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-6 flex gap-2">
            <span className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-[9px] font-black uppercase tracking-widest text-[#C5A059]">Garantia Total da Frota</span>
          </div>
        </div>
      </div>

      {/* Deposits List */}
      <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-neutral-50 bg-neutral-50/30 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h4 className="text-xl font-black uppercase tracking-tighter">Detalhamento por Contrato</h4>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold mt-1">Acompanhamento individual de garantias</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por condutor ou placa..."
              className="w-full bg-white border border-neutral-100 py-3 pl-10 pr-4 rounded-xl text-[10px] outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50">
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black">Condutor / Veículo</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Dia Pagamento</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Caução Total</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Valor Recebido</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Saldo Restante</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Ação</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-right">Status Garantia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredRentals.length > 0 ? (
                filteredRentals.map((rental) => {
                  const total = parseFloat(String(rental.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0;
                  const received = parseFloat(String(rental.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0;
                  const remaining = total - received;

                  // Calculate Next Due Date
                  const paidCount = (rental.paidInstallments || []).length;
                  const startDate = rental.date ? new Date(rental.date + 'T12:00:00') : new Date();
                  const nextDueDate = new Date(startDate.getTime());
                  nextDueDate.setDate(startDate.getDate() + (paidCount * 7));
                  
                  const today = new Date();
                  today.setHours(12, 0, 0, 0);
                  const tomorrow = new Date(today);
                  tomorrow.setDate(today.getDate() + 1);

                  const isDueToday = nextDueDate.toDateString() === today.toDateString();
                  const isDueTomorrow = nextDueDate.toDateString() === tomorrow.toDateString();
                  const isOverdue = nextDueDate < today && remaining > 0;
                  
                  return (
                    <tr key={rental.id} className="hover:bg-neutral-50/50 transition-all group border-b border-neutral-50 last:border-0">
                      <td className="p-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-[#C5A059] font-black text-xs shadow-lg">
                            {rental.user ? rental.user.charAt(0) : '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-neutral-900">{rental.user || 'Desconhecido'}</p>
                              {isDueToday && (
                                <span className="flex items-center gap-1 bg-red-500 text-white text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full animate-pulse">
                                  <AlertTriangle size={8} /> Pagamento Hoje
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{rental.vehicle || 'S/ veículo'} • {rental.plate || 'S/ placa'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                            isOverdue || isDueToday ? 'bg-red-50 text-red-600 border-red-100' :
                            isDueTomorrow ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-neutral-100 text-neutral-900 border-neutral-200'
                          }`}>
                            {rental.paymentDay || '---'}
                          </span>
                          {remaining > 0 && (
                            <span className={`text-[8px] font-bold mt-2 uppercase tracking-tighter ${
                              isDueToday || isOverdue ? 'text-red-500' : 
                              isDueTomorrow ? 'text-amber-500' : 'text-neutral-400'
                            }`}>
                              Vence: {nextDueDate.toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-8 text-center font-bold text-neutral-900 text-sm">
                        R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-8 text-center font-bold text-emerald-600 text-sm">
                        R$ {received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-8 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-bold ${remaining > 0 ? 'text-amber-600' : 'text-neutral-400'}`}>
                            R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {rental.depositInstallments > 0 && remaining > 0 && (
                            <p className="text-[8px] uppercase font-black text-neutral-300 mt-1">
                              {(rental.paidInstallments || []).length} de {rental.depositInstallments} parcelas pagas
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        {remaining > 0 ? (
                          <button
                            onClick={() => handleOpenPayModal(rental)}
                            className="px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 mx-auto"
                          >
                            <Check size={12} /> Confirmar Pago
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-500 justify-center">
                            <FileCheck size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Tudo Pago</span>
                          </div>
                        )}
                      </td>
                      <td className="p-8 text-right">
                        <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${remaining <= 0
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                          {remaining <= 0 ? 'Liquidado' : 'Em Aberto'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-neutral-300">
                      <Landmark size={48} className="opacity-20" />
                      <p className="text-[10px] uppercase tracking-[0.3em] font-black">Nenhuma garantia registrada no momento</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Installment Modal */}
      {showPayModal && selectedRental && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm" onClick={() => setShowPayModal(false)} />
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Receipt size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tighter text-neutral-900">Marcar Parcela como Paga</h4>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-1">{selectedRental.user}</p>
                </div>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-neutral-300 hover:text-neutral-900 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100">
                <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-4">Selecione a parcela a liquidar:</p>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: selectedRental.depositInstallments || 1 }).map((_, i) => {
                    const installmentNum = i + 1;
                    const isPaid = (selectedRental.paidInstallments || []).includes(installmentNum);
                    const total = parseFloat(String(selectedRental.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0;
                    const valuePerInstallment = total / (selectedRental.depositInstallments || 1);

                    return (
                      <button
                        key={installmentNum}
                        disabled={isPaid}
                        onClick={() => {
                          payCaucaoInstallment(selectedRental.id, installmentNum, valuePerInstallment);
                          setShowPayModal(false);
                        }}
                        className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-2 group ${isPaid 
                          ? 'bg-emerald-50 border-emerald-100 opacity-50 cursor-not-allowed' 
                          : 'bg-white border-neutral-100 hover:border-[#C5A059] hover:shadow-xl'}`}
                      >
                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${isPaid ? 'text-emerald-600' : 'text-neutral-400 group-hover:text-[#C5A059]'}`}>
                          Parcela {installmentNum}
                        </span>
                        <span className={`text-sm font-black ${isPaid ? 'text-emerald-900' : 'text-neutral-900'}`}>
                          R$ {valuePerInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        {isPaid && <Check size={14} className="text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <ShieldCheck size={18} className="text-amber-500" />
                <p className="text-[9px] text-amber-700 font-bold uppercase tracking-tight leading-relaxed">
                  Ao confirmar, o valor será adicionado ao saldo recebido e registrado no histórico financeiro.
                </p>
              </div>
            </div>

            <div className="p-8 bg-neutral-50/50 flex justify-end">
              <button
                onClick={() => setShowPayModal(false)}
                className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-all"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCaucao;
