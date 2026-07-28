import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, ChevronRight } from 'lucide-react';
import { getAlertColorClasses } from '../../utils/notifications';

const AdminHeader = ({ activeTab, currentUser, isSidebarOpen, onSeed, hasData, alerts = [], totalCount = 0, onNavigate }) => {
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);

  const getTabTitle = (tab) => {
    const titles = {
      bi: 'Business Inteligence',
      frota: 'Gestão de Frota',
      leads: 'Leads de Contato',
      locacao: 'Contratos de Locação',
      investidores: 'Cadastro de Investidores',
      financeiro: 'Controle Financeiro',
      caucao: 'Gestão de Caução',
      vistoria: 'Vistorias Técnicas',
      clientes: 'Base de Clientes',
      faturamento: 'Faturamento Automatizado',
      manutencaoAdmin: 'Histórico de Manutenções',
      usuarios: 'Usuários do Sistema',
      oficina: 'Oficina / O.S.'
    };
    return titles[tab] || 'Painel L.A';
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

  return (
    <header className="h-20 bg-white border-b border-neutral-100 flex items-center justify-between px-6 md:px-12 shadow-sm relative z-10 shrink-0">
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
          {getTabTitle(activeTab)}
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
                    {alerts.length === 0 ? 'Nenhum alerta ativo' : `${alerts.length} módulo${alerts.length > 1 ? 's' : ''} com atenção necessária`}
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
                {alerts.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell size={20} className="text-emerald-500" />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest font-black text-neutral-400">Tudo em dia!</p>
                    <p className="text-[10px] text-neutral-300 font-light mt-1">Nenhuma notificação pendente.</p>
                  </div>
                ) : (
                  alerts.map((alert, index) => {
                    const colors = getAlertColorClasses(alert.color);
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          onNavigate && onNavigate(alert.module);
                          setShowPanel(false);
                        }}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-all group text-left"
                      >
                        {/* Color dot */}
                        <div className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />

                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">
                            {alert.label}
                          </p>
                          <p className="text-xs font-medium text-neutral-700 leading-snug truncate">
                            {alert.message}
                          </p>
                        </div>

                        {/* Count badge */}
                        <span className={`shrink-0 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-white text-[9px] font-black ${colors.badge}`}>
                          {alert.count > 99 ? '99+' : alert.count}
                        </span>

                        <ChevronRight size={12} className="shrink-0 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {alerts.length > 0 && (
                <div className="px-5 py-3 border-t border-neutral-50 bg-neutral-50/50">
                  <p className="text-[9px] uppercase tracking-widest font-black text-neutral-400 text-center">
                    Clique em um item para navegar até o módulo
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="text-right hidden md:block">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-900">
            {currentUser?.name || 'Admin Principal'}
          </p>
          <p className="text-[10px] text-neutral-400 font-light">
            {currentUser ? (currentUser.role === 'administrador' ? 'Administrador' : 'Funcionário') : 'Laveiculos@gmail.com'}
          </p>
        </div>

        <div className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-[#C5A059]/30">
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'L.A'}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;

