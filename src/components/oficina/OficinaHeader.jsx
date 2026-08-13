import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, ChevronRight } from 'lucide-react';

const OficinaHeader = ({ activeTab, isSidebarOpen, pendingAppointments = [] }) => {
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);

  const getTabTitle = () => {
    switch(activeTab) {
      case 'agenda': return 'Agenda';
      case 'os': return 'Ordens de Serviço';
      case 'orcamentos': return 'Orçamentos';
      case 'estoque': return 'Estoque';
      case 'financeiro': return 'Financeiro';
      default: return 'Painel';
    }
  };

  const getTabSubtitle = () => {
    switch(activeTab) {
      case 'agenda': return 'Gerencie seus agendamentos e horários';
      case 'os': return 'Controle de serviços, peças e manutenções';
      case 'orcamentos': return 'Crie, salve e envie orçamentos. Converta em OS quando aprovados.';
      case 'estoque': return 'Gerencie produtos, peças e fluidos';
      case 'financeiro': return 'Controle de receitas e despesas da oficina';
      default: return 'Visão geral da oficina';
    }
  };

  // Fecha o painel ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPanel(false);
      }
    };
    if (showPanel) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPanel]);

  const totalCount = pendingAppointments.length;

  return (
    <header className="h-20 bg-white border-b border-neutral-100 flex items-center justify-between px-6 md:px-12 shadow-sm relative z-10 shrink-0 print:hidden">
      <div className="flex items-center gap-4">
        {!isSidebarOpen && (
          <div className="xl:hidden">
            <img 
              src="/logo.png" 
              className="h-8 w-auto object-contain" 
              alt="L.A Locação de Veículos" 
            />
          </div>
        )}
        <h2 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-neutral-400 truncate max-w-[150px] md:max-w-none">
          {getTabTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        {/* ── Notification Bell ── */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setShowPanel(prev => !prev)}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all border ${
              showPanel
                ? 'bg-[#C5A059]/10 border-[#C5A059]/30 text-[#C5A059]'
                : 'bg-neutral-50 border-neutral-100 text-neutral-500 hover:border-[#C5A059]/30 hover:text-[#C5A059] hover:bg-[#C5A059]/5'
            }`}
            title="Notificações"
          >
            <Bell size={16} />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm shadow-red-500/30 animate-pulse">
                {totalCount > 99 ? '99+' : totalCount}
              </span>
            )}
          </button>

          {/* Dropdown Panel */}
          {showPanel && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-900">Notificações</p>
                  <p className="text-[10px] text-neutral-400 font-light mt-0.5">
                    {totalCount === 0 ? 'Nenhum agendamento pendente' : `${totalCount} agendamento${totalCount > 1 ? 's' : ''} para hoje`}
                  </p>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Alert List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-neutral-50">
                {totalCount === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell size={20} className="text-emerald-500" />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest font-black text-neutral-400">Tudo em dia!</p>
                  </div>
                ) : (
                  pendingAppointments.map((app, index) => (
                    <div
                      key={app.id || index}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-all group text-left"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 bg-red-500 animate-pulse`} />

                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">
                          {app.time} - {app.type}
                        </p>
                        <p className="text-xs font-medium text-neutral-700 leading-snug truncate">
                          {app.clientName || 'Cliente cadastrado'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="text-right hidden md:block">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-900">
            Equipe Técnica
          </p>
          <p className="text-[10px] text-neutral-400 font-light">
            Oficina
          </p>
        </div>

        <div className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-[#C5A059]/30">
          O
        </div>
      </div>
    </header>
  );
};

export default OficinaHeader;
