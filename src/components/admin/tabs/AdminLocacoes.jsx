import React from 'react';
import { Plus, Search, ShieldCheck, TrendingUp, Clock, ClipboardList, User, Phone, Pencil, Trash2, Calendar, X, RefreshCw } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';
import { getPublicUrl } from '../../../utils/supabaseStorage';
import { parseCurrency } from '../../../utils/currencyUtils';

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
  setRentalForm,
  onRenewContract
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [dateStart, setDateStart] = React.useState('');
  const [dateEnd, setDateEnd] = React.useState('');
  const [displayLimit, setDisplayLimit] = React.useState(15);

  const safeRentals = Array.isArray(rentals) ? rentals : [];

  const filteredRentals = safeRentals.filter(rental => {
    try {
      const rawDate = rental.startDate || rental.date;

      // 1. Search term filter
      if (searchTerm) {
        const normalizeString = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const term = normalizeString(searchTerm).replace(/-/g, '');
        const condutor = normalizeString(rental.userName || rental.user);
        const placa = normalizeString(rental.vehiclePlate || rental.plate).replace(/-/g, '');
        const modelo = normalizeString(rental.vehicleModel || rental.vehicle);
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
      return true;
    } catch (e) {
      return true;
    }
  });

  const totalFaturamento = safeRentals.reduce((acc, r) => {
    try {
      const val = typeof r.value === 'string' 
        ? parseCurrency(r.value) 
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
            <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse" />
            <EditorialLabel className="text-[#D4AF37] tracking-[0.3em]">Gestão de Contratos Ativos</EditorialLabel>
          </div>
          <h3 className="text-3xl xl:text-4xl 2xl:text-5xl font-black uppercase tracking-tighter text-white leading-none">Locações</h3>
          <p className="text-neutral-500 font-medium italic text-lg tracking-tight">Dossiê completo de operações e faturamento da frota.</p>
        </div>
        <button
          onClick={() => {
            resetRentalForm();
            setShowAddForm(true);
          }}
          className="flex items-center gap-4 bg-neutral-900 text-[#D4AF37] px-10 py-6 rounded-2xl text-[10px] uppercase tracking-[0.3em] font-black hover:bg-[#D4AF37] hover:text-white transition-all shadow-2xl shadow-neutral-900/20 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" /> Nova Locação
        </button>
      </div>

      {/* Editorial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6 2xl:gap-8 mb-8 xl:mb-10 2xl:mb-16">
        <div className="p-6 xl:p-8 2xl:p-10 bg-[#0a0a0a] rounded-2xl xl:rounded-3xl 2xl:rounded-[3.5rem] border border-neutral-800 shadow-xl shadow-black/50 hover:border-neutral-700 transition-colors relative overflow-hidden group hover:shadow-2xl hover:shadow-neutral-900/5 transition-all duration-700">
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
          <h4 className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-white tracking-tighter leading-none mb-2">
            {rentals.filter(r => r.status === 'Ativo').length}
          </h4>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Veículos Alugados</p>
        </div>

        <div className="p-6 xl:p-8 2xl:p-10 bg-neutral-900 rounded-2xl xl:rounded-3xl 2xl:rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/10 blur-[100px] -mr-24 -mt-24" />
          <div className="flex items-center gap-4 mb-6 xl:mb-8 2xl:mb-10 relative">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-[#D4AF37] text-white rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:-rotate-12 transition-transform">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Faturamento</p>
              <p className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-widest mt-0.5">Projeção Semanal</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl xl:text-2xl 2xl:text-3xl font-black text-[#D4AF37] tracking-tighter">R$</span>
            <h4 className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-white tracking-tighter leading-none">
              {totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h4>
          </div>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Volume sob Gestão</p>
        </div>

        <div className="p-6 xl:p-8 2xl:p-10 bg-[#0a0a0a] rounded-2xl xl:rounded-3xl 2xl:rounded-[3.5rem] border border-neutral-800 shadow-xl shadow-black/50 hover:border-neutral-700 transition-colors relative overflow-hidden group hover:shadow-2xl hover:shadow-neutral-900/5 transition-all duration-700">
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
          <h4 className="text-4xl xl:text-5xl 2xl:text-6xl font-black text-white tracking-tighter leading-none mb-2">
            {proximasDevolucoes}
          </h4>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Devoluções Agendadas</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#0a0a0a] rounded-2xl xl:rounded-3xl 2xl:rounded-3xl border border-neutral-50 shadow-2xl shadow-neutral-900/5 overflow-hidden">
        <div className="px-6 py-5 xl:px-8 xl:py-6 2xl:px-12 2xl:py-10 border-b border-neutral-50 bg-[#0a0a0a] flex flex-col lg:flex-row justify-between items-center gap-6 xl:gap-8">
          <div className="space-y-1">
            <h5 className="text-[11px] uppercase tracking-[0.4em] text-white font-black">Dossiê de Atividades</h5>
            <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest">Filtragem avançada de contratos</p>
          </div>
          
          <div className="flex bg-black p-1.5 rounded-2xl border border-neutral-800 shadow-inner shrink-0">
            {[
              { id: 'todas', label: 'Todas' },
              { id: 'ativas', label: 'Ativas' },
              { id: 'encerradas', label: 'Encerradas' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setRentalFilter(filter.id)}
                className={`px-8 py-3.5 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all duration-500 ${rentalFilter === filter.id
                  ? 'bg-neutral-900 text-white shadow-xl shadow-neutral-900/20 scale-105'
                  : 'text-neutral-400 hover:text-white hover:bg-[#0a0a0a]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80 group">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#D4AF37] transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por condutor ou placa..."
              className="w-full bg-black text-white border border-neutral-800 py-4 pl-14 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] focus:bg-[#0a0a0a] transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Date Range Filter Bar */}
        <div className="px-6 py-4 xl:px-8 xl:py-5 2xl:px-12 2xl:py-6 bg-black/50 border-b border-neutral-50 flex flex-col sm:flex-row items-center gap-4 xl:gap-6">
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Filtrar por Período (Início):</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-[#0a0a0a] px-4 py-2 rounded-xl border border-neutral-700/80 shadow-sm">
              <span className="text-[9px] font-black uppercase text-neutral-400">De</span>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="text-xs font-bold text-neutral-200 outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 bg-[#0a0a0a] px-4 py-2 rounded-xl border border-neutral-700/80 shadow-sm">
              <span className="text-[9px] font-black uppercase text-neutral-400">Até</span>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="text-xs font-bold text-neutral-200 outline-none bg-transparent"
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

        <div className="p-6 md:p-8 xl:p-10 bg-black/30">
          {filteredRentals.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
                {filteredRentals.slice(0, displayLimit).map((rental) => {
                  try {
                    const normPlate = (p) => (p || '').replace(/-/g, '').toUpperCase();
                    const rentalPlateNorm = normPlate(rental.vehiclePlate || rental.plate);
                    const hasEntrega = inspections.some(ins => 
                      normPlate(ins.vehiclePlate) === rentalPlateNorm && 
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

                    const hasDevolucao = inspections.some(ins => normPlate(ins.vehiclePlate) === rentalPlateNorm && ins.type === 'Devolução' && new Date(ins.date) >= new Date(rental.startDate || rental.date));
                    const isClosed = dates.isClosed;

                    return (
                      <div key={rental.id} className="bg-[#0a0a0a] p-5 md:p-6 rounded-3xl border border-neutral-800 shadow-xl shadow-black/50 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-[#D4AF37]/10 hover:border-[#D4AF37]/30 group/card relative flex flex-col justify-between">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/[0.03] to-transparent opacity-0 group-hover/card:opacity-100 pointer-events-none transition-opacity duration-700" />
                        {/* Card Top: Status & Remaining Days */}
                        <div className="flex justify-between items-center mb-5 pb-4 border-b border-neutral-800/60 relative z-10">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isClosed ? 'bg-neutral-300' : 'bg-emerald-500 animate-pulse'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                              {isClosed ? 'Encerrado' : 'Ativo'}
                            </span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider ${
                            isClosed ? 'bg-neutral-100 text-neutral-500' :
                            dates.remaining <= 2 ? 'bg-red-500/10 text-red-600 border border-red-100/50' :
                            dates.remaining <= 5 ? 'bg-amber-500/10 text-amber-600 border border-amber-100/50' :
                            'bg-emerald-500/10 text-emerald-600 border border-emerald-100/50'
                          }`}>
                            {isClosed ? 'Finalizado' : dates.remaining > 0 ? `Restam ${dates.remaining} dias` : 'Vencido'}
                          </span>
                        </div>

                        {/* Main Info: Vehicle details & Conductor name */}
                        <div className="flex items-start gap-4 mb-6 relative z-10">
                          <div className="w-20 h-14 rounded-xl overflow-hidden bg-[#111111] border border-neutral-800 shadow-inner shrink-0 p-0.5">
                            <img 
                              src={getPublicUrl(rental.image) || '/logo-new.png'} 
                              alt={rental.vehicle} 
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" 
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo-new.png'; e.currentTarget.style.objectFit = 'contain'; e.currentTarget.style.padding = '0.5rem'; e.currentTarget.style.background = '#000000'; }}
                              style={rental.image === '/logo-new.png' || !rental.image ? { objectFit: 'contain', padding: '0.5rem', background: '#000000' } : {}}
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-white uppercase tracking-tight truncate max-w-[130px]" title={rental.vehicleModel || rental.vehicle}>
                                {rental.vehicleModel || rental.vehicle || 'Veículo N/I'}
                              </h4>
                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-black text-neutral-600 border border-neutral-700/60 uppercase">
                                {(rental.vehiclePlate || rental.plate || '').replace('-', '') || 'S/PLACA'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 pt-0.5">
                              <span className="text-xs font-bold text-neutral-500 truncate" title={rental.userName || rental.user}>
                                {rental.userName || rental.user}
                              </span>
                              {(rental.clientPhone || rental.phone) && (
                                <a
                                  href={`https://wa.me/${(rental.clientPhone || rental.phone).replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-500 hover:text-emerald-600 transition-colors shrink-0"
                                  title="WhatsApp"
                                >
                                  <Phone size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Financials & Dates */}
                        <div className="bg-[#111111] border border-neutral-800 shadow-inner p-4 rounded-2xl space-y-3 mb-6 relative z-10">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            <span>Acordo Financeiro</span>
                            <span>Período</span>
                          </div>
                          
                          <div className="flex justify-between items-baseline">
                            <span className="text-lg font-black text-white leading-none">
                              {typeof rental.value === 'number' ? `R$ ${rental.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (rental.value || 'R$ 0,00')}
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">/ sem</span>
                            </span>
                            <span className="text-xs font-black text-[#D4AF37] uppercase tracking-wide">
                              {rental.durationWeeks ? `${rental.durationWeeks} sem` : (rental.period || 'Curto Prazo')}
                            </span>
                          </div>

                          <div className="pt-2.5 border-t border-neutral-800 flex justify-between text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            <span>Início: {dates.start.toLocaleDateString('pt-BR')}</span>
                            <span>Fim: {dates.end.toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>

                        {/* Operational Alerts / Pending Inspections */}
                        {!isClosed && (!hasEntrega || (dates.remaining <= 3 && !hasDevolucao)) && (
                          <div className="flex gap-2.5 mb-5 relative z-10">
                            {rental.status === 'Ativo' && !hasEntrega && (
                              <button 
                                onClick={() => onGoToVistorias({ vehiclePlate: rental.plate || rental.vehiclePlate, type: 'Entrega' })} 
                                className="flex-1 py-2 bg-[#D4AF37] text-white text-[8px] font-black uppercase tracking-widest rounded-xl shadow-sm flex items-center justify-center gap-1 border border-white/10 hover:bg-[#D4AF37]/95 transition-all"
                              >
                                <ShieldCheck size={11} /> Realizar Entrega
                              </button>
                            )}
                            
                            {rental.status === 'Ativo' && dates.remaining <= 3 && !hasDevolucao && (
                              <button 
                                onClick={() => onGoToVistorias({ vehiclePlate: rental.plate || rental.vehiclePlate, type: 'Devolução' })} 
                                className="flex-1 py-2 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest rounded-xl shadow-sm animate-pulse border border-white/10 hover:bg-red-700 transition-all flex items-center justify-center gap-1"
                              >
                                <Clock size={11} /> Vistoria Devolução
                              </button>
                            )}
                          </div>
                        )}

                        {/* Card Footer: Main Actions */}
                        <div className="flex items-center gap-2 pt-4 mt-auto border-t border-neutral-800/50 relative z-10">
                          {/* Terminate button */}
                          {rental.status === 'Ativo' && (
                            <>
                              <button
                                onClick={() => onGoToVistorias({ vehiclePlate: rental.plate || rental.vehiclePlate, type: 'Devolução' })}
                                className="flex-1 py-2.5 bg-red-500/10 text-red-600 hover:bg-red-100 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1"
                                title="Encerrar Contrato"
                              >
                                <X size={12} /> Encerrar
                              </button>
                              
                              <button
                                onClick={() => onRenewContract(rental)}
                                className="flex-1 py-2.5 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1"
                                title="Renovar Contrato"
                              >
                                <RefreshCw size={11} /> Renovar
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => {
                              setSelectedRental(rental);
                              setShowRentalDetailModal(true);
                            }}
                            className="px-4 py-2.5 bg-neutral-800 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] border border-neutral-700 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                            title="Dossiê Completo"
                          >
                            <ClipboardList size={13} /> Ficha
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
                            className="p-2.5 bg-[#0a0a0a] text-neutral-400 border border-neutral-700 rounded-xl hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all flex items-center justify-center shadow-sm active:scale-95"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          
                          <button
                            onClick={() => {
                              setItemToDelete(rental);
                              setDeleteType('rental');
                              setShowDeleteAuthModal(true);
                            }}
                            className="p-2.5 bg-[#0a0a0a] text-neutral-400 border border-neutral-700 rounded-xl hover:border-red-500 hover:text-red-500 transition-all flex items-center justify-center shadow-sm active:scale-95"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  } catch (e) {
                    console.error('Error rendering rental card:', e);
                    return null;
                  }
                })}
              </div>
              {displayLimit < filteredRentals.length && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 15)}
                    className="px-6 py-3 bg-[#0a0a0a] border border-neutral-700 text-neutral-600 hover:bg-black hover:text-white hover:border-[#D4AF37] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} className="animate-spin-slow" style={{ animationDuration: '3s' }} />
                    Carregar Mais
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-20 text-center bg-[#0a0a0a] border border-neutral-800 rounded-3xl shadow-sm max-w-md mx-auto">
              <ClipboardList size={36} className="mx-auto mb-4 text-neutral-200" />
              <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-1">Nenhuma locação encontrada</h4>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-none">Não encontramos registros para os filtros selecionados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLocacoes;
