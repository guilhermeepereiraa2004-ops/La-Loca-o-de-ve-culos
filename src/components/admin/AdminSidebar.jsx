import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Car, Mail, Key, Users, User, Wallet, Landmark, Wrench, Eye, X, Menu, 
  ClipboardList, Receipt, ShieldAlert, Bell
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

  const menuGroups = [
    {
      groupLabel: 'Visão Geral & BI',
      items: [
        { id: 'bi', label: 'Business Intelligence', icon: TrendingUp },
      ]
    },
    {
      groupLabel: 'Operacional & Frota',
      items: [
        { id: 'frota', label: 'Frota', icon: Car },
        { id: 'manutencaoAdmin', label: 'Manutenção', icon: Wrench },
        { id: 'oficina', label: 'Oficina', icon: Wrench },
        { id: 'vistoria', label: 'Vistoria', icon: ClipboardList },
        { id: 'multas', label: 'Multas', icon: ShieldAlert },
      ]
    },
    {
      groupLabel: 'Comercial & Relacionamento',
      items: [
        { id: 'locacao', label: 'Locação', icon: Key },
        { id: 'clientes', label: 'Clientes', icon: User },
        { id: 'leads', label: 'Leads', icon: Mail },
        { id: 'avisos', label: 'Avisos', icon: Bell },
      ]
    },
    {
      groupLabel: 'Financeiro & Receitas',
      items: [
        { id: 'faturamento', label: 'Faturamento', icon: Receipt },
        { id: 'financeiro', label: 'Financeiro', icon: Wallet },
        { id: 'caucao', label: 'Caução', icon: Landmark },
        { id: 'investidores', label: 'Investidores', icon: Users },
      ]
    },
    {
      groupLabel: 'Configurações & Sistema',
      items: [
        ...(isAdmin ? [{ id: 'usuarios', label: 'Usuários', icon: Users }] : []),
        { id: 'logs', label: 'Logs do Sistema', icon: ClipboardList },
      ]
    }
  ];

  return (
    <>
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-6 right-6 z-[60] xl:hidden bg-neutral-900 text-[#C5A059] p-4 rounded-full shadow-2xl border border-neutral-800"
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
          {menuGroups.map((group, groupIdx) => {
            const accessibleItems = group.items.filter(item => canAccess(item.id) || item.id === 'usuarios');
            if (accessibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="mb-4 last:mb-0">
                {isExpanded && (
                  <div className="text-[9px] uppercase tracking-widest text-[#C5A059] font-black mb-1.5 px-1 animate-in fade-in duration-300">
                    {group.groupLabel}
                  </div>
                )}
                
                <div className="space-y-0.5">
                  {accessibleItems.map((item) => {
                    const badgeCount = badges[item.id] || 0;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          if (window.innerWidth < 1280) setIsSidebarOpen(false);
                        }}
                        className={`w-full flex items-center rounded-xl transition-all relative text-[13px] ${
                          isExpanded ? 'py-1.5 px-2 gap-2.5' : 'py-1.5 px-2 justify-center mb-0.5'
                        } ${
                          isActive ? 'text-[#C5A059] bg-[#C5A059]/10 shadow-sm font-semibold' : 'text-neutral-400 hover:text-white hover:bg-white/5 font-medium'
                        }`}
                        title={item.label}
                      >
                        <div className="relative shrink-0 flex items-center justify-center">
                          <item.icon size={15} />
                          {badgeCount > 0 && !isExpanded && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
                          )}
                        </div>

                        {isExpanded && (
                          <span className="flex-1 text-left truncate animate-in fade-in slide-in-from-left-2 duration-300">
                            {item.label}
                          </span>
                        )}

                        {badgeCount > 0 && isExpanded && (
                          <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#C5A059] text-neutral-950 text-[9px] font-black leading-none shadow-sm animate-in scale-in duration-300">
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
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
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#C5A059]/20 group-hover:text-[#C5A059] transition-all shrink-0">
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

