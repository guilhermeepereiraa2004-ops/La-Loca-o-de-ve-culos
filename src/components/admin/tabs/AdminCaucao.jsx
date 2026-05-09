import React from 'react';
import { ShieldCheck, Clock, Landmark, Search, Check, FileCheck } from 'lucide-react';

const AdminCaucao = ({
  rentals,
  payCaucaoInstallment
}) => {
  const totalCustodia = rentals.reduce((acc, r) => acc + (parseFloat(String(r.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0), 0);
  const totalReceber = rentals.reduce((acc, r) => {
    const total = parseFloat(String(r.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0;
    const received = parseFloat(String(r.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0;
    return acc + (total - received);
  }, 0);
  const totalContratado = rentals.reduce((acc, r) => acc + (parseFloat(String(r.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0), 0);

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
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Próxima Parcela</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Caução Total</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Valor Recebido</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Saldo Restante</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Ação</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-right">Status Garantia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {rentals.length > 0 ? (
                rentals.map((rental) => {
                  const total = parseFloat(String(rental.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0;
                  const received = parseFloat(String(rental.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0;
                  const remaining = total - received;
                  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                  const start = rental.date ? new Date(rental.date + 'T12:00:00') : null;
                  const payDay = rental.paymentDay || (start ? days[start.getDay()] : '---');
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
                  let currentDue = null;
                  if (start && remaining > 0) {
                    let check = new Date(start.getTime());
                    check.setDate(check.getDate() + 7);
                    while (check.getTime() + (6 * 24 * 60 * 60 * 1000) < today.getTime()) {
                      check.setDate(check.getDate() + 7);
                    }
                    currentDue = check;
                  }

                  const currentDueDateStr = currentDue ? currentDue.toISOString().split('T')[0] : null;
                  const isCurrentPaid = (rental.paidCaucaoDates || []).includes(currentDueDateStr);
                  const nextDueDisplay = currentDue ? currentDue.toLocaleDateString('pt-BR') : 'Liquidado';

                  return (
                    <tr key={rental.id} className="hover:bg-neutral-50/50 transition-all group border-b border-neutral-50 last:border-0">
                      <td className="p-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-[#C5A059] font-black text-xs shadow-lg">
                            {rental.user ? rental.user.charAt(0) : '?'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-neutral-900">{rental.user || 'Desconhecido'}</p>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{rental.vehicle || 'S/ veículo'} • {rental.plate || 'S/ placa'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        <span className="text-[9px] font-black text-neutral-900 uppercase tracking-widest px-3 py-1.5 bg-neutral-100 rounded-lg border border-neutral-200">
                          {payDay}
                        </span>
                      </td>
                      <td className="p-8 text-center">
                        <div className="flex flex-col items-center">
                          {isCurrentPaid ? (
                            <div className="flex flex-col items-center">
                              <p className="text-sm font-black text-neutral-900">{nextDueDisplay}</p>
                              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 mt-1">Parcela Paga</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <p className="text-sm font-black text-neutral-900">{nextDueDisplay}</p>
                              <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 mt-1">Pendente</span>
                            </div>
                          )}
                          {remaining > 0 && rental.depositInstallments > 0 && (
                            <p className="text-[9px] font-bold text-[#C5A059] mt-1 animate-pulse">
                              R$ {(remaining / rental.depositInstallments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
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
                            <p className="text-[8px] uppercase font-black text-neutral-300 mt-1">{rental.depositInstallments}x parcelas restantes</p>
                          )}
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        {remaining > 0 && !isCurrentPaid ? (
                          <button
                            onClick={() => payCaucaoInstallment(rental.id, currentDueDateStr)}
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
                  <td colSpan="8" className="p-20 text-center">
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
    </div>
  );
};

export default AdminCaucao;
