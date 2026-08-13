import React, { useState, useMemo } from 'react';
import { Plus, Search, Bell, Moon, Filter, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, FileText } from 'lucide-react';
import OficinaAgendaModal from './OficinaAgendaModal';

const OficinaAgenda = ({ appointments, clients, vehicles, onAddAppointment, onUpdateAppointment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [viewMode, setViewMode] = useState('semana'); // 'semana' | 'dia'
  
  // Weekly view logic
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  };

  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekStartStr = weekDays[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
  const weekEndStr = weekDays[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');

  const goPrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  const displayedDays = viewMode === 'semana' ? weekDays : [currentDate];
  
  const viewStartStr = displayedDays[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
  const viewEndStr = viewMode === 'semana' ? displayedDays[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '') : displayedDays[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');

  // Calculate notifications
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingToday = appointments?.filter(a => a.date === todayStr && a.status === 'Agendado') || [];

  const handleSaveAppointment = async (form) => {
    await onAddAppointment(form);
    setIsModalOpen(false);
  };

  const getClientName = (app) => {
    if (app.clientId && clients) {
      const c = clients.find(c => c.id === app.clientId);
      return c ? (c.nome || c.name) : 'Desconhecido';
    }
    return app.clientName || 'Avulso';
  };

  const getVehicleInfo = (app) => {
    if (app.vehicleId && vehicles) {
      const v = vehicles.find(v => v.id === app.vehicleId);
      return v ? `${v.model} (${v.plate})` : '';
    }
    return app.vehicleModel || '';
  };

  return (
    <div className="bg-white min-h-[calc(100vh-5rem)]">
      {/* Topbar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center gap-2 text-neutral-800 font-black tracking-tight">
          <CalendarIcon size={20} className="text-[#C5A059]" /> Agendamento
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text"
              placeholder="Buscar cliente, placa, O.S..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm font-medium py-2 pl-9 pr-4 rounded-full outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] w-64 transition-all"
            />
          </div>

          <button onClick={() => setIsModalOpen(true)} className="bg-[#C5A059] hover:bg-[#b08d4b] text-neutral-950 font-black uppercase tracking-wider text-xs px-4 py-2 rounded-full flex items-center gap-1 transition-colors">
            <Plus size={14} /> Novo
          </button>

          <div className="flex items-center gap-2 border-l border-neutral-200 pl-4">
            <button className="relative text-neutral-500 hover:text-neutral-900 transition-colors p-2">
              <Bell size={20} />
              {pendingToday.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
            <button className="text-neutral-500 hover:text-neutral-900 transition-colors p-2">
              <Moon size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Agenda Header */}
      <div className="px-6 py-6 border-b border-neutral-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon size={24} className="text-[#C5A059]" />
            <h1 className="text-2xl font-black text-neutral-900 tracking-tighter">Agenda</h1>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm font-bold text-neutral-400">
            <span>Hoje: {appointments?.filter(a => a.date === todayStr).length || 0}</span>
            <span>Pendentes: {pendingToday.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm font-bold text-neutral-600">
            <Filter size={16} />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value="Todos">Todos</option>
              <option value="Agendado">Agendado</option>
              <option value="Concluído">Concluído</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex items-center bg-neutral-100 rounded-xl p-1">
            <button 
              onClick={() => setViewMode('semana')}
              className={`${viewMode === 'semana' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'} px-4 py-1.5 rounded-lg text-sm font-bold transition-all`}
            >
              Semana
            </button>
            <button 
              onClick={() => setViewMode('dia')}
              className={`${viewMode === 'dia' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'} px-4 py-1.5 rounded-lg text-sm font-bold transition-all`}
            >
              Dia
            </button>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="bg-neutral-900 hover:bg-black text-[#C5A059] font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-xl flex items-center gap-1 transition-colors">
            <Plus size={14} /> Agendar
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="px-6 py-4 flex items-center justify-between">
        <button onClick={goToday} className="px-4 py-2 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 hover:bg-neutral-50">
          Hoje
        </button>

        <div className="flex items-center gap-4 text-neutral-800 font-bold">
          <button onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() - (viewMode === 'semana' ? 7 : 1));
            setCurrentDate(newDate);
          }} className="p-1 hover:bg-neutral-100 rounded-lg"><ChevronLeft size={20}/></button>
          <span>{viewMode === 'semana' ? `${viewStartStr} — ${viewEndStr}` : viewEndStr}</span>
          <button onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + (viewMode === 'semana' ? 7 : 1));
            setCurrentDate(newDate);
          }} className="p-1 hover:bg-neutral-100 rounded-lg"><ChevronRight size={20}/></button>
        </div>
        
        <div className="w-16"></div> {/* Spacer for balance */}
      </div>

      {/* Week Grid */}
      <div className="px-6 pb-6 overflow-x-auto">
        <div className={`flex gap-4 min-w-max ${viewMode === 'dia' ? 'w-full' : ''}`}>
          {displayedDays.map((date, idx) => {
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const dayApps = appointments?.filter(a => a.date === dateStr)
              .filter(a => filterStatus === 'Todos' || a.status === filterStatus)
              .filter(a => {
                if (!search) return true;
                const s = search.toLowerCase();
                return getClientName(a).toLowerCase().includes(s) || getVehicleInfo(a).toLowerCase().includes(s);
              })
              .sort((a, b) => a.time.localeCompare(b.time)) || [];

            return (
              <div key={idx} className={`${viewMode === 'dia' ? 'flex-1 min-w-[500px]' : 'w-60'} flex-shrink-0 border rounded-2xl flex flex-col min-h-[300px] ${isToday ? 'border-[#C5A059] bg-[#C5A059]/5' : 'border-neutral-200 bg-white'}`}>
                {/* Day Header */}
                <div className={`p-4 flex items-center justify-between border-b ${isToday ? 'border-[#C5A059]/20' : 'border-neutral-100'}`}>
                  <h3 className={`font-black text-lg ${isToday ? 'text-[#C5A059]' : 'text-neutral-700'}`}>
                    {dayNames[date.getDay()]} {date.getDate()}
                  </h3>
                  <button onClick={() => {
                    // Could pre-fill date here if we modify the modal
                    setIsModalOpen(true);
                  }} className={`p-1 rounded-lg transition-colors ${isToday ? 'text-[#C5A059] hover:bg-[#C5A059]/20' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'}`}>
                    <Plus size={16} />
                  </button>
                </div>

                {/* Day Content */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {dayApps.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm font-bold text-neutral-300">
                      Sem agendamentos
                    </div>
                  ) : (
                    dayApps.map(app => (
                      <div key={app.id} className="bg-white border border-neutral-100 shadow-sm rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock size={10} /> {app.time}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${app.status === 'Concluído' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                            {app.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-neutral-800 line-clamp-1">{getClientName(app)}</h4>
                        <p className="text-xs font-medium text-neutral-500 mt-0.5 flex items-center gap-1"><User size={10}/> {getVehicleInfo(app)}</p>
                        
                        <div className="mt-3 pt-3 border-t border-neutral-50 flex items-center justify-between text-xs font-medium text-neutral-400">
                          <span className="flex items-center gap-1"><FileText size={10} /> {app.type}</span>
                          <span className="text-neutral-300">{app.duration}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <OficinaAgendaModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAppointment}
        clients={clients}
        vehicles={vehicles}
      />
    </div>
  );
};

export default OficinaAgenda;
