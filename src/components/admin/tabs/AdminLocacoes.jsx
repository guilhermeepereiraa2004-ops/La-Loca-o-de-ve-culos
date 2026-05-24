import React from 'react';
import { Plus, Search, ShieldCheck, TrendingUp, Clock, ClipboardList, User, Phone, Pencil, Trash2, Calendar } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';
import { getPublicUrl } from '../../../utils/supabaseStorage';

const AdminLocacoes = ({
  rentals,
  inspections = [],
  rentalFilter,
  setRentalFilter,
  setShowAddForm,
  resetRentalForm,
  setSelectedRental,
  setShowRentalDetailModal,
  setIsEditingRental,
  setItemToDelete,
  setDeleteType,
  setShowDeleteAuthModal,
  onGoToVistorias,
  setRentalForm
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [dateStart, setDateStart] = React.useState('');
  const [dateEnd, setDateEnd] = React.useState('');

  const safeRentals = Array.isArray(rentals) ? rentals : [];

  const filteredRentals = safeRentals.filter(rental => {
    try {
      const rawDate = rental.startDate || rental.date;

      // 1. Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const condutor = (rental.userName || rental.user || '').toLowerCase();
        const placa = (rental.vehiclePlate || rental.plate || '').toLowerCase();
        const modelo = (rental.vehicleModel || rental.vehicle || '').toLowerCase();
        if (!condutor.includes(term) && !placa.includes(term) && !modelo.includes(term)) {
          return false;
        }
      }

      // 2. Date range filter - shows all matching regardless of status
      if (dateStart || dateEnd) {
        if (!rawDate) return false;
        if (dateStart && rawDate < dateStart) return false;
        if (dateEnd && rawDate > dateEnd) return false;
        return true;
      }

      // 3. Status filter (applied only if no date filter is active)
      if (!rawDate) return true;
      const startDate = new Date(rawDate + 'T12:00:00');
      if (isNaN(startDate.getTime())) return true;

      const periodValue = parseInt(rental.durationWeeks || rental.period) || 1;
      const isWeekly = String(rental.rentalType || rental.period || '').includes('sem') || String(rental.rentalType || rental.period || '').includes('weekly');
      const totalDays = isWeekly ? periodValue * 7 : periodValue;
      
      const endDate = new Date(startDate.getTime());
      endDate.setDate(startDate.getDate() + totalDays);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const diffDays = Math.ceil((endSimple.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isActive = diffDays >= 0;

      if (rentalFilter === 'todas') return true;
      if (rentalFilter === 'ativas') return rental.status === 'Ativo';
      if (rentalFilter === 'encerradas') return rental.status === 'Encerrado';
      if (rentalFilter === 'passadas') return rental.status === 'Encerrado' || !isActive;
      return true;
    } catch (e) {
      return true;
    }
  });

  const totalFaturamento = safeRentals.reduce((acc, r) => {
    try {
      const val = typeof r.value === 'string' 
        ? parseFloat(r.value.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) 
        : (parseFloat(r.value) || 0);
      return acc + val;
    } catch (e) { return acc; }
  }, 0);

  const proximasDevolucoes = safeRentals.filter(r => {
    try {
      const rawDate = r.startDate || r.date || new Date().toISOString().split('T')[0];
      const startDate = new Date(rawDate + 'T12:00:00');
      if (isNaN(startDate.getTime())) return false;

      const periodValue = parseInt(r.durationWeeks || r.period) || 1;
      const isWeekly = String(r.rentalType || r.period || '').includes('sem') || String(r.rentalType || r.period || '').includes('weekly');
      const totalDays = isWeekly ? periodValue * 7 : periodValue;
      
      const endDate = new Date(startDate.getTime());
      endDate.setDate(startDate.getDate() + totalDays);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const diffDays = Math.ceil((endSimple.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 3 && diffDays >= 0 && r.status === 'Ativo';
    } catch (e) { return false; }
  }).length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6 xl:mb-8 2xl:mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-pulse" />
            <EditorialLabel className="text-[#C5A059] tracking-[0.3em]">Gestão de Contratos Ativos</EditorialLabel>
          </div>
          <h3 className="text-3xl xl:text-4xl 2xl:text-5xl font-black uppercase tracking-tighter text-neutral-900 leading-none">Locações</h3>
          <p className="text-neutral-500 font-medium italic text-lg tracking-tight">Dossiê completo de operações e faturamento da frota.</p>
        </div>
        <button
          onClick={() => {
            resetRentalForm();
            setShowAddForm(true);
          }}
          className="flex items-center gap-4 bg-neutral-900 text-[#C5A059] px-10 py-6 rounded-[2rem] text-[10px] uppercase tracking-[0.3em] font-black hover:bg-[#C5A059] hover:text-white transition-all shadow-2xl shadow-neutral-900/20 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" /> Nova Locação
        </button>
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
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Operacional</p>
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">Frota em Circulação</p>
            </div>
          </div>
          <h4 className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-neutral-900 tracking-tighter leading-none mb-2">
            {rentals.filter(r => r.status === 'Ativo').length}
          </h4>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Veículos Alugados</p>
        </div>

        <div className="p-6 xl:p-8 2xl:p-10 bg-neutral-900 rounded-[2rem] xl:rounded-[2.5rem] 2xl:rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A059]/10 blur-[100px] -mr-24 -mt-24" />
          <div className="flex items-center gap-4 mb-6 xl:mb-8 2xl:mb-10 relative">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-[#C5A059] text-neutral-900 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:-rotate-12 transition-transform">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Faturamento</p>
              <p className="text-[9px] text-[#C5A059] font-bold uppercase tracking-widest mt-0.5">Projeção Semanal</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl xl:text-2xl 2xl:text-3xl font-black text-[#C5A059] tracking-tighter">R$</span>
            <h4 className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-white tracking-tighter leading-none">
              {totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h4>
          </div>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Volume sob Gestão</p>
        </div>

        <div className="p-6 xl:p-8 2xl:p-10 bg-white rounded-[2rem] xl:rounded-[2.5rem] 2xl:rounded-[3.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group hover:shadow-2xl hover:shadow-neutral-900/5 transition-all duration-700">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full transition-transform duration-1000 group-hover:scale-150" />
          <div className="flex items-center gap-4 mb-6 xl:mb-8 2xl:mb-10 relative">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-neutral-900 text-blue-500 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Cronograma</p>
              <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">Próximos 3 Dias</p>
            </div>
          </div>
          <h4 className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-neutral-900 tracking-tighter leading-none mb-2">
            {proximasDevolucoes}
          </h4>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Devoluções Agendadas</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[2rem] xl:rounded-[3rem] 2xl:rounded-[4rem] border border-neutral-50 shadow-2xl shadow-neutral-900/5 overflow-hidden">
        <div className="px-6 py-5 xl:px-8 xl:py-6 2xl:px-12 2xl:py-10 border-b border-neutral-50 bg-white flex flex-col lg:flex-row justify-between items-center gap-6 xl:gap-8">
          <div className="space-y-1">
            <h5 className="text-[11px] uppercase tracking-[0.4em] text-neutral-900 font-black">Dossiê de Atividades</h5>
            <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest">Filtragem avançada de contratos</p>
          </div>
          
          <div className="flex bg-neutral-50 p-1.5 rounded-[2rem] border border-neutral-100 shadow-inner shrink-0">
            {[
              { id: 'todas', label: 'Todas' },
              { id: 'ativas', label: 'Ativas' },
              { id: 'encerradas', label: 'Encerradas' },
              { id: 'passadas', label: 'Passadas' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setRentalFilter(filter.id)}
                className={`px-8 py-3.5 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all duration-500 ${rentalFilter === filter.id
                  ? 'bg-neutral-900 text-white shadow-xl shadow-neutral-900/20 scale-105'
                  : 'text-neutral-400 hover:text-neutral-900 hover:bg-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80 group">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por condutor ou placa..."
              className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-14 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Date Range Filter Bar */}
        <div className="px-6 py-4 xl:px-8 xl:py-5 2xl:px-12 2xl:py-6 bg-neutral-50/50 border-b border-neutral-50 flex flex-col sm:flex-row items-center gap-4 xl:gap-6">
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-[#C5A059]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Filtrar por Período (Início):</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-neutral-200/80 shadow-sm">
              <span className="text-[9px] font-black uppercase text-neutral-400">De</span>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="text-xs font-bold text-neutral-800 outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-neutral-200/80 shadow-sm">
              <span className="text-[9px] font-black uppercase text-neutral-400">Até</span>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="text-xs font-bold text-neutral-800 outline-none bg-transparent"
              />
            </div>
            {(dateStart || dateEnd) && (
              <button
                onClick={() => {
                  setDateStart('');
                  setDateEnd('');
                }}
                className="px-4 py-2.5 bg-neutral-900 text-white hover:bg-red-500 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors shadow-sm"
              >
                Limpar Período
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left border-separate border-spacing-y-2 xl:border-spacing-y-3 2xl:border-spacing-y-4 px-4 pb-4 xl:px-6 xl:pb-6 2xl:px-8 2xl:pb-8 min-w-[1100px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.3em] text-neutral-400 font-black">
                <th className="px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-6">Veículo & Identificação</th>
                <th className="px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-6">Perfil do Condutor</th>
                <th className="px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-6">Acordo Financeiro</th>
                <th className="px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-6 text-center">Cronograma</th>
                <th className="px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="font-light">
              {filteredRentals.map((rental) => {
                try {
                  const hasEntrega = inspections.some(ins => 
                    ins.vehiclePlate === (rental.vehiclePlate || rental.plate) && 
                    ins.type === 'Entrega' && 
                    new Date(ins.date) >= new Date(rental.startDate || rental.date)
                  );
                  
                  const dates = (() => {
                    try {
                      const rawDate = rental.startDate || rental.date || new Date().toISOString().split('T')[0];
                      const startDate = new Date(rawDate + 'T12:00:00');
                      if (isNaN(startDate.getTime())) throw new Error('Invalid Start');
                      
                      const periodValue = parseInt(rental.durationWeeks || rental.period) || 1;
                      const isWeekly = String(rental.rentalType || rental.period || '').includes('sem') || String(rental.rentalType || rental.period || '').includes('weekly');
                      const totalDays = isWeekly ? periodValue * 7 : periodValue;
                      
                      const endDate = new Date(startDate.getTime());
                      endDate.setDate(startDate.getDate() + totalDays);
                      
                      const isClosed = rental.status === 'Encerrado';
                      if (isClosed) {
                        const closedDate = rental.endDate ? new Date(rental.endDate + 'T12:00:00') : endDate;
                        return { start: startDate, end: closedDate, remaining: 0, isClosed: true };
                      }
                      
                      const now = new Date();
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                      const diffDays = Math.ceil((endSimple.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      return { start: startDate, end: endDate, remaining: diffDays, isClosed: false };
                    } catch (e) {
                      return { start: new Date(), end: new Date(), remaining: 0, isClosed: false };
                    }
                  })();

                  const hasDevolucao = inspections.some(ins => ins.vehiclePlate === (rental.vehiclePlate || rental.plate) && ins.type === 'Devolução' && new Date(ins.date) >= new Date(rental.startDate || rental.date));

                return (
                  <tr key={rental.id} className="group transition-all duration-500">
                    {/* Vehicle Column */}
                    <td className="px-2 py-2 xl:py-3 2xl:py-4 bg-white border border-neutral-100 rounded-l-[1.5rem] xl:rounded-l-[2rem] 2xl:rounded-l-[3rem] group-hover:border-[#C5A059]/30 transition-all shadow-sm group-hover:shadow-xl group-hover:shadow-neutral-900/5">
                      <div className="flex items-center gap-4 xl:gap-6 2xl:gap-8 pl-4 xl:pl-6 min-w-[280px] xl:min-w-[320px]">
                        <div className="w-24 h-16 xl:w-28 xl:h-20 2xl:w-32 2xl:h-24 rounded-[1.2rem] xl:rounded-[1.5rem] 2xl:rounded-[2rem] overflow-hidden bg-neutral-100 shrink-0 shadow-xl border-2 xl:border-4 border-white group-hover:scale-105 transition-all duration-700">
                          <img 
                            src={getPublicUrl(rental.image) || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80'} 
                            alt={rental.vehicle} 
                            className="w-full h-full object-cover group-hover:rotate-2 transition-transform duration-700" 
                          />
                        </div>
                        <div className="space-y-2 xl:space-y-4">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-[#C5A059] mb-1">Modelo Selecionado</p>
                            <h6 className="text-sm xl:text-base 2xl:text-xl font-black text-neutral-900 uppercase tracking-tighter leading-none group-hover:text-[#C5A059] transition-colors">
                              {rental.vehicleModel || rental.vehicle || 'Veículo Indefinido'}
                            </h6>
                          </div>
                          <div className="flex flex-col w-20 h-9 xl:w-22 xl:h-10 2xl:w-24 2xl:h-11 bg-white border-2 border-neutral-900 rounded-xl overflow-hidden shadow-lg transform group-hover:rotate-1 transition-all">
                            <div className="h-3 bg-[#003399] flex items-center justify-center">
                              <span className="text-[6px] text-white font-black tracking-[0.3em]">BRASIL</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center bg-white">
                              <span className="text-[10px] xl:text-[11px] 2xl:text-xs font-black tracking-tight text-neutral-900">
                                {(rental.vehiclePlate || rental.plate || '').replace('-', '') || 'S/ PLACA'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Conductor Column */}
                    <td className="px-4 py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 bg-white border-y border-neutral-100 transition-all group-hover:border-[#C5A059]/30 shadow-sm group-hover:shadow-xl group-hover:shadow-neutral-900/5">
                      <div className="flex flex-col gap-2 xl:gap-3 min-w-[200px] xl:min-w-[240px]">
                        <div className="flex items-center gap-3 xl:gap-4 bg-neutral-50/50 p-2.5 xl:p-3 2xl:p-4 rounded-[1.5rem] xl:rounded-[2rem] 2xl:rounded-[2.5rem] border border-neutral-100 group-hover:bg-white group-hover:border-[#C5A059]/20 transition-all duration-500">
                          <div className="w-8 h-8 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 bg-neutral-900 rounded-xl xl:rounded-2xl flex items-center justify-center text-[#C5A059] shadow-xl group-hover:bg-[#C5A059] group-hover:text-white transition-colors shrink-0">
                            <User size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-black text-neutral-900 tracking-tight truncate leading-none mb-1">{rental.userName || rental.user}</p>
                            <div className="flex items-center gap-2">
                              {(rental.clientPhone || rental.phone) && (
                                <a
                                  href={`https://wa.me/${(rental.clientPhone || rental.phone).replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600 transition-colors bg-emerald-50 px-3 py-1 rounded-full"
                                >
                                  <Phone size={10} /> WhatsApp
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {rental.status === 'Ativo' && dates.remaining <= 3 && !hasDevolucao && (
                          <button 
                            onClick={() => onGoToVistorias({ vehiclePlate: rental.plate || rental.vehiclePlate, type: 'Devolução' })} 
                            className="w-full py-2 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg animate-pulse border-2 border-white flex items-center justify-center gap-2"
                          >
                            <Clock size={12} /> Vistoria Devolução
                          </button>
                        )}
                        
                        {rental.status === 'Ativo' && !hasEntrega && (
                           <button 
                            onClick={() => onGoToVistorias({ vehiclePlate: rental.plate || rental.vehiclePlate, type: 'Entrega' })} 
                            className="w-full py-2 bg-[#C5A059] text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center justify-center gap-2 border-2 border-white transition-transform hover:scale-105"
                           >
                             <ShieldCheck size={12} /> Realizar Entrega
                           </button>
                        )}
                      </div>
                    </td>

                    {/* Financial Column */}
                    <td className="px-4 py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 bg-white border-y border-neutral-100 transition-all group-hover:border-[#C5A059]/30 shadow-sm group-hover:shadow-xl group-hover:shadow-neutral-900/5">
                      <div className="pl-4 xl:pl-6 border-l-2 xl:border-l-4 border-[#C5A059]/20 space-y-1">
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Semanal</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg xl:text-xl 2xl:text-2xl font-black text-neutral-900 tracking-tighter">
                            {typeof rental.value === 'number' ? `R$ ${rental.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : (rental.value || 'R$ 0,00')}
                          </span>
                        </div>
                        <p className="text-[9px] text-[#C5A059] font-black uppercase tracking-[0.2em]">
                          Ciclo de {rental.durationWeeks ? `${rental.durationWeeks} semanas` : (rental.period || 'Curto Prazo')}
                        </p>
                      </div>
                    </td>

                    {/* Schedule Column */}
                    <td className="px-4 py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 bg-white border-y border-neutral-100 transition-all group-hover:border-[#C5A059]/30 shadow-sm group-hover:shadow-xl group-hover:shadow-neutral-900/5">
                      <div className="flex flex-col items-center gap-2 xl:gap-3">
                        <div className={`px-4 py-2 xl:px-6 xl:py-3 rounded-2xl text-[9px] xl:text-[10px] font-black uppercase tracking-widest shadow-xl border-2 transition-all duration-700 group-hover:scale-110 ${
                            dates.isClosed ? 'bg-neutral-100 text-neutral-500 border-neutral-200 shadow-neutral-500/5' :
                            dates.remaining <= 2 ? 'bg-red-50 text-red-600 border-red-100 shadow-red-500/10' :
                            dates.remaining <= 5 ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-500/10' :
                            'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/10'
                          }`}>
                          {dates.isClosed ? 'Encerrado' : dates.remaining > 0 ? `Restam ${dates.remaining} dias` : 'Encerrado'}
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] text-neutral-400 font-black uppercase tracking-[0.2em] mb-1">
                            {dates.isClosed ? 'Encerrado em' : 'Término em'}
                          </span>
                          <span className="text-[9px] xl:text-[10px] text-neutral-900 font-black tracking-tight bg-neutral-50 px-2.5 py-0.5 xl:px-3 xl:py-1 rounded-lg border border-neutral-100">
                            {dates.end.toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="px-4 py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 bg-white border border-neutral-100 rounded-r-[1.5rem] xl:rounded-r-[2rem] 2xl:rounded-r-[3rem] group-hover:border-[#C5A059]/30 transition-all shadow-sm group-hover:shadow-xl group-hover:shadow-neutral-900/5 text-right">
                      <div className="flex justify-end gap-2 xl:gap-3 pr-2">
                        <button
                          onClick={() => {
                            setSelectedRental(rental);
                            setShowRentalDetailModal(true);
                          }}
                          className="w-10 h-10 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 bg-neutral-900 text-white rounded-xl xl:rounded-2xl hover:bg-[#C5A059] transition-all flex items-center justify-center shadow-xl hover:shadow-[#C5A059]/30 group/btn active:scale-95"
                          title="Dossiê Completo"
                        >
                          <ClipboardList size={18} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRental(rental);
                            setRentalForm({
                              ...rental,
                              user: rental.user || rental.userName || '',
                              durationWeeks: rental.durationWeeks || (rental.period ? parseInt(rental.period) : '4'),
                              startDate: rental.startDate || rental.date,
                              docs: rental.docs || { cnh: null, residence: null, appPrints: [], signedContract: null }
                            });
                            setIsEditingRental(true);
                            setShowAddForm(true);
                          }}
                          className="w-10 h-10 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 bg-white text-neutral-400 border border-neutral-100 rounded-xl xl:rounded-2xl hover:border-[#C5A059] hover:text-[#C5A059] transition-all flex items-center justify-center shadow-sm hover:shadow-lg active:scale-95"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setItemToDelete(rental);
                            setDeleteType('rental');
                            setShowDeleteAuthModal(true);
                          }}
                          className="w-10 h-10 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 bg-white text-neutral-400 border border-neutral-100 rounded-xl xl:rounded-2xl hover:border-red-500 hover:text-red-500 transition-all flex items-center justify-center shadow-sm hover:shadow-lg active:scale-95"
                          title="Encerrar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                } catch (e) {
                  console.error('Error rendering rental row:', e);
                  return null;
                }
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminLocacoes;
