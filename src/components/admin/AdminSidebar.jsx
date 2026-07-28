import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Car, Mail, Key, Users, User, Wallet, Landmark, Wrench, Eye, X, Menu, 
  ClipboardList, Receipt, ShieldAlert
} from 'lucide-react';

const AdminSidebar = ({ 
  isSidebarOpen, setIsSidebarOpen, activeTab, setActiveTab, isAdmin, canAccess, onGoHome, onLogout,
  badges = {}
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1280);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1280);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isExpanded = isDesktop ? isHovered : isSidebarOpen;

  const menuItems = [
    { id: 'bi',             label: 'Business Intelligence', icon: TrendingUp },
    { id: 'faturamento',   label: 'Faturamento', icon: Receipt },
    { id: 'frota',         label: 'Frota', icon: Car },
    { id: 'leads',         label: 'Leads', icon: Mail },
    { id: 'locacao',       label: 'Locação', icon: Key },
    { id: 'clientes',      label: 'Clientes', icon: User },
    { id: 'investidores',  label: 'Investidores', icon: Users },
    { id: 'financeiro',    label: 'Financeiro', icon: Wallet },
    { id: 'caucao',        label: 'Caução', icon: Landmark },
    { id: 'manutencaoAdmin', label: 'Manutenção', icon: Wrench },
    { id: 'vistoria',      label: 'Vistoria', icon: ClipboardList },
    { id: 'multas',        label: 'Multas', icon: ShieldAlert },
    { id: 'oficina',       label: 'Oficina', icon: Wrench },
    { id: 'logs',          label: 'Logs do Sistema',  icon: ClipboardList },
    ...(isAdmin ? [
      { id: 'usuarios', label: 'Usuários', icon: Users }
    ] : []),
  ];

  return (
    <>
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-6 right-6 z-[60] xl:hidden bg-neutral-900 text-[#D4AF37] p-4 rounded-full shadow-2xl border border-neutral-800"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`bg-neutral-900 text-white flex flex-col fixed h-full z-50 transition-all duration-300 ease-in-out ${
          isSidebarOpen 
            ? 'translate-x-0 w-48' 
            : '-translate-x-full w-0 opacity-0 xl:translate-x-0 xl:opacity-100'
        } ${
          isExpanded ? 'xl:w-64 xl:shadow-2xl xl:shadow-black/50' : 'xl:w-16'
        }`}
      >
        <div className="p-4 md:p-5 border-b border-neutral-800 transition-all duration-300 flex items-center justify-center">
          {isExpanded ? (
            <img 
              src="/logo.png" 
              className="h-10 w-auto object-contain animate-in fade-in duration-300 mx-auto" 
              alt="L.A Locação de Veículos" 
            />
          ) : (
            <span className="text-xl font-black text-white shrink-0">L.A</span>
          )}
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto custom-scrollbar no-scrollbar transition-all duration-300 ${
          isExpanded ? 'p-4' : 'p-3 xl:px-2'
        }`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {isExpanded && (
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-3 px-1 animate-in fade-in duration-300">
              Gerenciamento
            </div>
          )}

          {menuItems.filter(item => canAccess(item.id) || item.id === 'usuarios').map((item) => {
            const badgeCount = badges[item.id] || 0;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1280) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center rounded-xl transition-all relative ${
                  isExpanded ? 'p-2.5 gap-2.5' : 'p-2.5 justify-center'
                } ${
                  isActive ? 'text-[#D4AF37] bg-[#D4AF37]/10 shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
                title={item.label}
              >
                {/* Icon with collapsed-mode dot indicator */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <item.icon size={16} />
                  {/* Dot shown only when sidebar is collapsed and there's a badge */}
                  {badgeCount > 0 && !isExpanded && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                  )}
                </div>

                {/* Label */}
                {isExpanded && (
                  <span className="flex-1 text-left truncate animate-in fade-in slide-in-from-left-2 duration-300">
                    {item.label}
                  </span>
                )}

                {/* Badge pill — shown only when sidebar is expanded */}
                {badgeCount > 0 && isExpanded && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#D4AF37] text-neutral-950 text-[9px] font-black leading-none shadow-sm animate-in scale-in duration-300">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`border-t border-neutral-800 space-y-2 transition-all duration-300 ${
          isExpanded ? 'p-4' : 'p-3 xl:px-2'
        }`}>
          <button
            onClick={onGoHome}
            className={`flex items-center text-[13px] font-medium text-neutral-400 hover:text-white transition-all w-full ${
              isExpanded ? 'p-2.5 gap-2.5' : 'p-2.5 justify-center'
            } group`}
            title="Página Inicial"
          >
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#D4AF37]/20 group-hover:text-[#D4AF37] transition-all shrink-0">
              <Eye size={14} />
            </div>
            {isExpanded && (
              <span className="text-left animate-in fade-in slide-in-from-left-2 duration-300">Página Inicial</span>
            )}
          </button>
          <button
            onClick={onLogout}
            className={`flex items-center text-[13px] font-medium text-red-400 hover:text-red-300 transition-all w-full ${
              isExpanded ? 'p-2.5 gap-2.5' : 'p-2.5 justify-center'
            } group`}
            title="Sair"
          >
            <div className="w-8 h-8 rounded-full bg-red-400/10 flex items-center justify-center group-hover:bg-red-400/20 transition-all shrink-0">
              <X size={14} />
            </div>
            {isExpanded && (
              <span className="text-left animate-in fade-in slide-in-from-left-2 duration-300">Sair</span>
            )}
          </button>
        </div>
      </aside>

      {isSidebarOpen && window.innerWidth < 1280 && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 xl:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default AdminSidebar;

