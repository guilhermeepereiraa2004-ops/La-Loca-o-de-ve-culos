import React, { useState } from 'react';
import { ShieldCheck, Clock, Landmark, Search, Check, FileCheck, X, Landmark as BankIcon, Receipt, AlertTriangle } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';

const AdminCaucao = ({
  rentals = [],
  payCaucaoInstallment
}) => {
  const [search, setSearch] = useState('');
  const [selectedRental, setSelectedRental] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [pendingInstallment, setPendingInstallment] = useState(null);

  const safeRentals = Array.isArray(rentals) ? rentals : [];

  const totalCustodia = safeRentals.reduce((acc, r) => acc + (parseFloat(String(r.depositReceived || r.depositPaid || 0).replace(/\./g, '').replace(',', '.')) || 0), 0);
  const totalReceber = safeRentals.reduce((acc, r) => {
    const total = parseFloat(String(r.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0;
    const received = parseFloat(String(r.depositReceived || r.depositPaid || 0).replace(/\./g, '').replace(',', '.')) || 0;
    return acc + (total - received);
  }, 0);
  const totalContratado = safeRentals.reduce((acc, r) => acc + (parseFloat(String(r.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0), 0);

  const filteredRentals = safeRentals.filter(r =>
    (r.userName || r.user || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.plate || r.vehiclePlate || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenPayModal = (rental) => {
    setSelectedRental(rental);
    setShowPayModal(true);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6 xl:mb-8 2xl:mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-50 rounded-full animate-pulse" />
            <EditorialLabel className="text-emerald-600 tracking-[0.3em]">Gestão de Ativos em Custódia</EditorialLabel>
          </div>
          <h3 className="text-3xl xl:text-4xl 2xl:text-5xl font-black uppercase tracking-tighter text-neutral-900 leading-none">Caução</h3>
          <p className="text-neutral-500 font-medium italic text-lg tracking-tight">Monitoramento de garantias contratuais e fluxos de recebimento.</p>
        </div>
      </div>

      {/* Editorial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6 2xl:gap-8 mb-8 xl:mb-10 2xl:mb-16">
        <div className="p-6 xl:p-8 2xl:p-10 bg-white rounded-[2rem] xl:rounded-[2.5rem] 2xl:rounded-[3.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group hover:shadow-2xl hover:shadow-neutral-900/5 transition-all duration-700">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full transition-transform duration-1000 group-hover:scale-150" />
          <div className="flex items-center gap-4 mb-6 xl:mb-8 2xl:mb-10 relative">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-neutral-900 text-emerald-500 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Em Custódia</p>
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">Disponível</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl xl:text-2xl 2xl:text-3xl font-black text-emerald-600 tracking-tighter">R$</span>
            <h4 className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-neutral-900 tracking-tighter leading-none">
              {totalCustodia.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h4>
          </div>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Saldo Recebido</p>
        </div>

        <div className="p-6 xl:p-8 2xl:p-10 bg-white rounded-[2rem] xl:rounded-[2.5rem] 2xl:rounded-[3.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group hover:shadow-2xl hover:shadow-neutral-900/5 transition-all duration-700">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full transition-transform duration-1000 group-hover:scale-150" />
          <div className="flex items-center gap-4 mb-6 xl:mb-8 2xl:mb-10 relative">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-neutral-900 text-amber-500 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:-rotate-12 transition-transform">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Expectativa</p>
              <p className="text-[9px] text-amber-600 font-bold uppercase tracking-widest mt-0.5">Saldo a Receber</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl xl:text-2xl 2xl:text-3xl font-black text-amber-600 tracking-tighter">R$</span>
            <h4 className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-neutral-900 tracking-tighter leading-none">
              {totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h4>
          </div>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Parcelas Pendentes</p>
        </div>

        <div className="p-6 xl:p-8 2xl:p-10 bg-neutral-900 rounded-[2rem] xl:rounded-[2.5rem] 2xl:rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A059]/10 blur-[100px] -mr-24 -mt-24" />
          <div className="flex items-center gap-4 mb-6 xl:mb-8 2xl:mb-10 relative">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-[#C5A059] text-neutral-900 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Landmark size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Garantia Total</p>
              <p className="text-[9px] text-[#C5A059] font-bold uppercase tracking-widest mt-0.5">Frota Ativa</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl xl:text-2xl 2xl:text-3xl font-black text-[#C5A059] tracking-tighter">R$</span>
            <h4 className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-white tracking-tighter leading-none">
              {totalContratado.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h4>
          </div>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Volume Contratual</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[2rem] xl:rounded-[3rem] 2xl:rounded-[4rem] border border-neutral-50 shadow-2xl shadow-neutral-900/5 overflow-hidden">
        <div className="px-6 py-5 xl:px-8 xl:py-6 2xl:px-12 2xl:py-10 border-b border-neutral-50 bg-white flex flex-col lg:flex-row justify-between items-center gap-6 xl:gap-8">
          <div className="space-y-1">
            <h5 className="text-[11px] uppercase tracking-[0.4em] text-neutral-900 font-black">Detalhamento Financeiro</h5>
            <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest">Controle individual de garantias contratuais</p>
          </div>

          <div className="relative w-full lg:w-96 group">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por condutor ou placa..."
              className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-14 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left border-separate border-spacing-y-2 xl:border-spacing-y-3 2xl:border-spacing-y-4 px-4 pb-4 xl:px-6 xl:pb-6 2xl:px-8 2xl:pb-8 min-w-[1000px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.3em] text-neutral-400 font-black">
                <th className="px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-6">Condutor & Veículo</th>
                <th className="px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-6 text-center">Vencimento</th>
                <th className="px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-6 text-center">Total Contratado</th>
                <th className="px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-6 text-center">Saldo Recebido</th>
                <th className="px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-6 text-center">Restante</th>
                <th className="px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-6 text-center">Ações</th>
                <th className="px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="font-light">
              {filteredRentals.length > 0 ? (
                filteredRentals.map((rental) => {
                  const total = parseFloat(String(rental.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0;
                  const received = parseFloat(String(rental.depositReceived || rental.depositPaid || 0).replace(/\./g, '').replace(',', '.')) || 0;
                  const remaining = total - received;

                  // Calculate Next Due Date
                  const paidCount = (rental.paidInstallments || []).length;
                  const startDate = rental.date || rental.startDate ? new Date((rental.date || rental.startDate) + 'T12:00:00') : new Date();
                  const nextDueDate = new Date(startDate.getTime());
                  nextDueDate.setDate(startDate.getDate() + (paidCount * 7));

                  const today = new Date();
                  today.setHours(12, 0, 0, 0);
                  const isDueToday = nextDueDate.toDateString() === today.toDateString();
                  const isOverdue = nextDueDate < today && remaining > 0;

                  return (
                    <tr key={rental.id} className="group transition-all duration-500">
                      {/* Conductor Column */}
                      <td className="px-2 py-2 xl:py-3 2xl:py-4 bg-white border border-neutral-100 rounded-l-[1.5rem] xl:rounded-l-[2rem] 2xl:rounded-l-[3rem] group-hover:border-[#C5A059]/30 transition-all shadow-sm group-hover:shadow-xl group-hover:shadow-neutral-900/5">
                        <div className="flex items-center gap-4 xl:gap-6 pl-4 xl:pl-6 min-w-[240px] xl:min-w-[280px]">
                          <div className="w-8 h-8 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 bg-neutral-900 rounded-xl xl:rounded-2xl flex items-center justify-center text-[#C5A059] font-black text-xs xl:text-sm shadow-xl group-hover:rotate-6 transition-transform shrink-0">
                            {(rental.userName || rental.user || '?').charAt(0)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm xl:text-base font-black text-neutral-900 tracking-tight">{rental.userName || rental.user || 'Desconhecido'}</p>
                              {isDueToday && (
                                <span className="bg-red-500 text-white text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                                  <AlertTriangle size={8} /> Hoje
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{rental.vehicleModel || rental.vehicle || 'S/ veículo'} • {rental.vehiclePlate || rental.plate || 'S/ placa'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Due Date Column */}
                      <td className="px-4 py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 bg-white border-y border-neutral-100 transition-all group-hover:border-[#C5A059]/30 shadow-sm group-hover:shadow-xl group-hover:shadow-neutral-900/5 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`text-[9px] xl:text-[10px] font-black uppercase tracking-widest px-3 py-1.5 xl:px-4 xl:py-2 rounded-2xl border transition-all ${isOverdue || isDueToday ? 'bg-red-50 text-red-600 border-red-100 shadow-sm shadow-red-500/10' :
                              'bg-neutral-50 text-neutral-900 border-neutral-100'
                            }`}>
                            {rental.paymentDay || '---'}
                          </span>
                          {remaining > 0 && (
                            <span className={`text-[8px] font-black uppercase tracking-tighter ${isDueToday || isOverdue ? 'text-red-500' : 'text-neutral-400'
                              }`}>
                              {nextDueDate.toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Column */}
                      <td className="px-4 py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 bg-white border-y border-neutral-100 transition-all group-hover:border-[#C5A059]/30 shadow-sm group-hover:shadow-xl group-hover:shadow-neutral-900/5 text-center">
                        <span className="text-sm xl:text-base font-black text-neutral-900 tracking-tight">
                          R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Received Column */}
                      <td className="px-4 py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 bg-white border-y border-neutral-100 transition-all group-hover:border-[#C5A059]/30 shadow-sm group-hover:shadow-xl group-hover:shadow-neutral-900/5 text-center">
                        <div className="bg-emerald-50 px-3 py-1.5 xl:px-4 xl:py-2 rounded-2xl border border-emerald-100 inline-block">
                          <span className="text-sm xl:text-base font-black text-emerald-600 tracking-tight">
                            R$ {received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </td>

                      {/* Remaining Column */}
                      <td className="px-4 py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 bg-white border-y border-neutral-100 transition-all group-hover:border-[#C5A059]/30 shadow-sm group-hover:shadow-xl group-hover:shadow-neutral-900/5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm xl:text-base font-black tracking-tight ${remaining > 0 ? 'text-amber-600' : 'text-neutral-300'}`}>
                            R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {rental.depositInstallments > 1 && remaining > 0 && (
                            <p className="text-[8px] uppercase font-black text-neutral-400">
                              {(rental.paidInstallments || []).length}/{rental.depositInstallments} parcelas
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="px-4 py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 bg-white border-y border-neutral-100 transition-all group-hover:border-[#C5A059]/30 shadow-sm group-hover:shadow-xl group-hover:shadow-neutral-900/5 text-center">
                        {remaining > 0 ? (
                          <button
                            onClick={() => handleOpenPayModal(rental)}
                            className="px-4 py-2.5 xl:px-6 xl:py-3 bg-neutral-900 text-[#C5A059] text-[9px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#C5A059] hover:text-white transition-all flex items-center gap-2 shadow-xl shadow-neutral-900/10 mx-auto group/btn"
                          >
                            <Receipt size={14} className="group-hover/btn:scale-110 transition-transform" /> Marcar como Pago
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-500 justify-center bg-emerald-50 px-3 py-1.5 xl:px-4 xl:py-2 rounded-2xl border border-emerald-100">
                            <FileCheck size={16} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Liquidado</span>
                          </div>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="px-4 py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 bg-white border border-neutral-100 rounded-r-[1.5rem] xl:rounded-r-[2rem] 2xl:rounded-r-[3rem] group-hover:border-[#C5A059]/30 transition-all shadow-sm group-hover:shadow-xl group-hover:shadow-neutral-900/5 text-right pr-4 xl:pr-8 2xl:pr-12">
                        <span className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 transition-all duration-700 ${remaining <= 0
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-500/10'
                          : 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm shadow-amber-500/10 group-hover:scale-105'
                          }`}>
                          {remaining <= 0 ? 'Garantido' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="p-32 text-center bg-white border border-neutral-100 rounded-[3rem]">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-24 h-24 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center text-neutral-200">
                        <Landmark size={48} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-black uppercase tracking-tighter text-neutral-900">Nenhum Ativo Encontrado</p>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] font-bold">Refine sua busca ou aguarde novos contratos</p>
                      </div>
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
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm" onClick={() => { setShowPayModal(false); setPendingInstallment(null); }} />
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Receipt size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tighter text-neutral-900">
                    {pendingInstallment ? 'Confirmar Recebimento' : 'Marcar como Pago'}
                  </h4>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-1">{selectedRental.userName || selectedRental.user}</p>
                </div>
              </div>
              <button onClick={() => { setShowPayModal(false); setPendingInstallment(null); }} className="text-neutral-300 hover:text-neutral-900 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8">
              {!pendingInstallment ? (
                <div className="space-y-6">
                  <div className="bg-neutral-50 p-8 rounded-[2rem] border border-neutral-100 shadow-inner">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-6 text-center">Selecione a parcela para liquidar</p>
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: selectedRental.depositInstallments || 1 }).map((_, i) => {
                        const installmentNum = i + 1;
                        const isPaid = (selectedRental.paidInstallments || []).includes(installmentNum);
                        const total = parseFloat(String(selectedRental.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0;
                        const received = parseFloat(String(selectedRental.depositReceived || selectedRental.depositPaid || 0).replace(/\./g, '').replace(',', '.')) || 0;
                        const paidCount = (selectedRental.paidInstallments || []).length;
                        const totalInstallments = parseInt(selectedRental.depositInstallments) || 1;
                        const remainingInstallments = Math.max(1, totalInstallments - paidCount);
                        const valuePerInstallment = Math.max(0, total - received) / remainingInstallments;

                        return (
                          <button
                            key={installmentNum}
                            disabled={isPaid}
                            onClick={() => {
                              setPendingInstallment({
                                number: installmentNum,
                                value: valuePerInstallment
                              });
                            }}
                            className={`p-6 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-2 group ${isPaid
                              ? 'bg-emerald-50 border-emerald-100 opacity-50 cursor-not-allowed'
                              : 'bg-white border-neutral-100 hover:border-[#C5A059] hover:shadow-2xl hover:scale-105 active:scale-95'}`}
                          >
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isPaid ? 'text-emerald-600' : 'text-neutral-400 group-hover:text-[#C5A059]'}`}>
                              Parcela {installmentNum}
                            </span>
                            <span className={`text-lg font-black ${isPaid ? 'text-emerald-900' : 'text-neutral-900'}`}>
                              R$ {valuePerInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            {isPaid && <Check size={18} className="text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="bg-emerald-50 p-10 rounded-[3rem] border-2 border-emerald-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-bl-full -mr-16 -mt-16" />
                    <ShieldCheck size={48} className="text-emerald-500 mx-auto mb-6" />
                    <h5 className="text-2xl font-black text-emerald-900 tracking-tighter mb-2">Confirma o pagamento?</h5>
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-8">Dossiê de Liquidação Parcial</p>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 mb-6">
                      <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-1">Valor da Parcela {pendingInstallment.number}</p>
                      <p className="text-3xl font-black text-neutral-900">R$ {pendingInstallment.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="flex justify-center gap-4">
                      <div className="text-center px-4">
                        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Faltarão</p>
                        <p className="text-sm font-black text-emerald-900">{(selectedRental.depositInstallments || 1) - (selectedRental.paidInstallments || []).length - 1} parcelas</p>
                      </div>
                      <div className="w-px h-8 bg-emerald-100 self-center" />
                      <div className="text-center px-4">
                        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Saldo Final</p>
                        <p className="text-sm font-black text-emerald-900">
                          R$ {(
                            (parseFloat(String(selectedRental.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0) -
                            (parseFloat(String(selectedRental.depositReceived || selectedRental.depositPaid || 0).replace(/\./g, '').replace(',', '.')) || 0) -
                            pendingInstallment.value
                          ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        payCaucaoInstallment(selectedRental.id, pendingInstallment.number, pendingInstallment.value);
                        setShowPayModal(false);
                        setPendingInstallment(null);
                      }}
                      className="w-full py-6 bg-emerald-500 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Confirmar Pagamento
                    </button>
                    <button
                      onClick={() => setPendingInstallment(null)}
                      className="w-full py-4 text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-all"
                    >
                      Voltar para seleção
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-neutral-50/50 flex justify-center border-t border-neutral-100">
              <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-[0.2em]">Liquidando garantia contratual de {selectedRental.userName || selectedRental.user}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCaucao;
