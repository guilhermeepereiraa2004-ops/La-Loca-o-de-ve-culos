import React from 'react';
import { Plus, Search, ShieldCheck, TrendingUp, Clock, ClipboardList, User, Phone, Pencil, Trash2 } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';

const AdminLocacoes = ({
  rentals,
  rentalFilter,
  setRentalFilter,
  setShowAddForm,
  resetRentalForm,
  setSelectedRental,
  setShowRentalDetailModal,
  setIsEditingRental,
  setItemToDelete,
  setDeleteType,
  setShowDeleteAuthModal
}) => {
  const filteredRentals = rentals.filter(rental => {
    const startDate = new Date(rental.date + 'T12:00:00');
    const periodValue = parseInt(rental.period) || 1;
    const isWeekly = (rental.period || '').includes('sem');
    const totalDays = isWeekly ? periodValue * 7 : periodValue;
    const endDate = new Date(startDate.getTime());
    endDate.setDate(startDate.getDate() + totalDays);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffDays = Math.ceil((endSimple.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isActive = diffDays > 0;

    if (rentalFilter === 'todas') return true;
    if (rentalFilter === 'ativas') return isActive;
    if (rentalFilter === 'passadas') return !isActive;
    return true;
  });

  const totalFaturamento = rentals.reduce((acc, r) => acc + (parseFloat(r.value.replace('R$ ', '').replace('.', '').replace(',', '.')) || 0), 0);

  const proximasDevolucoes = rentals.filter(r => {
    const startDate = new Date(r.date + 'T12:00:00');
    const periodValue = parseInt(r.period) || 1;
    const isWeekly = (r.period || '').includes('sem');
    const totalDays = isWeekly ? periodValue * 7 : periodValue;
    const endDate = new Date(startDate.getTime());
    endDate.setDate(startDate.getDate() + totalDays);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffDays = Math.ceil((endSimple.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays > 0;
  }).length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <EditorialLabel className="text-[#C5A059] mb-1">Operações de Frota</EditorialLabel>
          <h3 className="text-3xl font-black uppercase tracking-tighter">Gestão de Locações</h3>
          <p className="text-neutral-400 text-sm font-light mt-1">Monitoramento em tempo real dos contratos ativos.</p>
        </div>
        <button
          onClick={() => {
            resetRentalForm();
            setShowAddForm(true);
          }}
          className="flex items-center gap-3 bg-neutral-900 text-white px-8 py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black hover:bg-[#C5A059] transition-all shadow-2xl shadow-neutral-900/20 group"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Nova Locação
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={24} />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Locações Ativas</p>
          </div>
          <h4 className="text-4xl font-black text-neutral-900">{rentals.length}</h4>
          <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mt-2">Frota em Circulação</p>
        </div>

        <div className="bg-neutral-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#C5A059] rounded-2xl flex items-center justify-center text-neutral-900 shadow-lg shadow-[#C5A059]/20">
              <TrendingUp size={24} />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Faturamento Semanal</p>
          </div>
          <h4 className="text-4xl font-black text-white">
            R$ {totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h4>
          <p className="text-[9px] text-[#C5A059] font-bold uppercase tracking-widest mt-2">Projeção de Receita</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Clock size={24} />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Próximas Devoluções</p>
          </div>
          <h4 className="text-4xl font-black text-neutral-900">
            {proximasDevolucoes}
          </h4>
          <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-2">Nos Próximos 3 Dias</p>
        </div>
      </div>

      {/* Rentals Table */}
      <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-neutral-50 bg-neutral-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <h5 className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-black">Lista de Contratos Vigentes</h5>
          <div className="flex bg-white p-1 rounded-2xl border border-neutral-100 shadow-sm shrink-0">
            {[
              { id: 'todas', label: 'Todas as Locações' },
              { id: 'ativas', label: 'Somente Ativas' },
              { id: 'passadas', label: 'Locações Passadas' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setRentalFilter(filter.id)}
                className={`px-6 py-4 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all ${rentalFilter === filter.id
                  ? 'bg-neutral-900 text-white shadow-lg'
                  : 'text-neutral-400 hover:text-neutral-900'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
            <input
              type="text"
              placeholder="Pesquisar contrato..."
              className="w-full bg-white border border-neutral-200 py-3 pl-10 pr-4 rounded-xl text-[10px] outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50">
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black">Veículo / Identificação</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black">Condutor Responsável</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black">Financeiro</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Cronograma</th>
                <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-right">Gerenciamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 font-light">
              {filteredRentals.map((rental) => (
                <tr key={rental.id} className="hover:bg-neutral-50/50 transition-all group border-b border-neutral-100 last:border-0 relative">
                  <td className="p-6">
                    <div className="flex items-center gap-8 p-3 rounded-[2.5rem] group-hover:bg-white transition-colors duration-500 min-w-[300px]">
                      <div className="w-28 h-20 rounded-3xl overflow-hidden bg-neutral-100 shrink-0 shadow-xl border-4 border-white group-hover:shadow-[#C5A059]/20 transition-all duration-500">
                        <img src={rental.image} alt={rental.vehicle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      </div>
                      <div className="space-y-3">
                        <h6 className="text-lg font-black text-neutral-900 uppercase tracking-tighter leading-none group-hover:text-[#C5A059] transition-colors">{rental.vehicle}</h6>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col w-20 h-10 bg-white border-2 border-neutral-900 rounded-lg overflow-hidden shadow-md scale-110 origin-left">
                            <div className="h-2.5 bg-[#003399] flex items-center justify-center">
                              <span className="text-[5px] text-white font-black tracking-[0.2em]">BRASIL</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center bg-white">
                              <span className="text-[10px] font-black tracking-tight text-neutral-900">{(rental.plate || '').replace('-', '') || 'S/ PLACA'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-4 bg-neutral-50/50 p-3 rounded-[2rem] border border-neutral-100 group-hover:bg-white group-hover:border-[#C5A059]/20 transition-all duration-500">
                      <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059] shadow-xl group-hover:bg-[#C5A059] group-hover:text-white transition-colors">
                        <User size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-neutral-900 truncate">{rental.user}</p>
                        <div className="flex items-center gap-3">
                          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">Condutor</p>
                          {rental.clientPhone && (
                            <a
                              href={`https://wa.me/${rental.clientPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                            >
                              <Phone size={10} /> Whats
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="pl-4 border-l-2 border-[#C5A059]/20">
                      <span className="text-sm font-black text-neutral-900 block">{rental.value}</span>
                      <span className="text-[9px] text-[#C5A059] font-black uppercase tracking-[0.2em] mt-1 block">{rental.period}</span>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    {(() => {
                      const startDate = new Date(rental.date + 'T12:00:00');
                      const periodValue = parseInt(rental.period) || 1;
                      const isWeekly = (rental.period || '').includes('sem');
                      const totalDays = isWeekly ? periodValue * 7 : periodValue;
                      const endDate = new Date(startDate.getTime());
                      endDate.setDate(startDate.getDate() + totalDays);
                      const now = new Date();
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                      const diffDays = Math.ceil((endSimple.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                      return (
                        <div className="flex flex-col items-center gap-2">
                          <div className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm border-2 transition-all ${diffDays <= 2 ? 'bg-red-50 text-red-600 border-red-100' :
                              diffDays <= 5 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                            {diffDays > 0 ? `Faltam ${diffDays} dias` : 'Encerrado'}
                          </div>
                          <span className="text-[8px] text-neutral-400 font-black uppercase tracking-tighter">Devolução: {endDate.toLocaleDateString('pt-BR')}</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-3 pr-2">
                      <button
                        onClick={() => {
                          setSelectedRental(rental);
                          setShowRentalDetailModal(true);
                        }}
                        className="w-12 h-12 bg-neutral-900 text-white rounded-2xl hover:bg-[#C5A059] transition-all flex items-center justify-center shadow-xl group/btn"
                        title="Ver Detalhes"
                      >
                        <ClipboardList size={20} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRental(rental);
                          // Logic for editing rental should be here
                        }}
                        className="w-12 h-12 bg-white text-neutral-400 border border-neutral-100 rounded-2xl hover:border-[#C5A059] hover:text-[#C5A059] transition-all flex items-center justify-center shadow-sm"
                        title="Editar Contrato"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setItemToDelete(rental);
                          setDeleteType('rental');
                          setShowDeleteAuthModal(true);
                        }}
                        className="w-12 h-12 bg-white text-neutral-400 border border-neutral-100 rounded-2xl hover:border-red-500 hover:text-red-500 transition-all flex items-center justify-center shadow-sm"
                        title="Encerrar Contrato"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminLocacoes;
