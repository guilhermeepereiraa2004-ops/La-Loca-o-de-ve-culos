import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ClipboardList, X, Menu, LogOut, Wrench, Calculator, Package, DollarSign, Droplet } from 'lucide-react';

const OficinaSidebar = ({ 
  isSidebarOpen, setIsSidebarOpen, activeTab, setActiveTab, onLogout
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
    { id: 'agenda', label: 'Agenda', icon: CalendarIcon },
    { id: 'os', label: 'Ordens de Serviço', icon: ClipboardList },
    { id: 'orcamentos', label: 'Orçamentos', icon: Calculator },
    { id: 'estoque', label: 'Estoque', icon: Package },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'troca_oleo', label: 'Troca de Óleo', icon: Droplet },
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
        className={`bg-[#1a1a1a] text-white flex flex-col h-screen fixed z-50 transition-all duration-300 ease-in-out ${
          isSidebarOpen 
            ? 'translate-x-0 w-48' 
            : '-translate-x-full w-0 opacity-0 xl:translate-x-0 xl:opacity-100 xl:w-16'
        } ${
          isExpanded ? 'xl:w-64 xl:shadow-2xl xl:shadow-black/50' : 'xl:w-16'
        }`}
      >
        <div className="p-4 md:p-6 border-b border-neutral-800/50 transition-all duration-300 flex items-center justify-center">
          {isExpanded ? (
            <div className="flex items-center gap-3 w-full pl-2">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-[#C5A059] shadow-inner shrink-0">
                <Wrench size={18} />
              </div>
              <div className="text-left animate-in fade-in duration-300">
                <h1 className="text-lg font-black uppercase tracking-tighter text-white leading-none">L.A. Oficina</h1>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.2em] leading-none mt-1.5">Painel Técnico</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-black rounded-xl flex shrink-0 items-center justify-center text-[#C5A059] shadow-inner">
              <Wrench size={18} />
            </div>
          )}
        </div>

        <nav className={`flex-1 space-y-2 overflow-y-auto custom-scrollbar no-scrollbar transition-all duration-300 mt-4 ${
          isExpanded ? 'p-5' : 'p-3 xl:px-3'
        }`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {isExpanded && (
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-black mb-4 px-2 animate-in fade-in duration-300">
              Módulos
            </div>
          )}

          {menuItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1280) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center rounded-xl transition-all relative ${
                  isExpanded ? 'p-3 gap-3' : 'p-3 justify-center'
                } ${
                  isActive ? 'text-[#C5A059] bg-[#C5A059]/15 shadow-sm' : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
                title={item.label}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <item.icon size={16} />
                </div>

                {isExpanded && (
                  <span className="flex-1 text-left truncate animate-in fade-in slide-in-from-left-2 duration-300">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`border-t border-neutral-800/50 space-y-2 transition-all duration-300 ${
          isExpanded ? 'p-5' : 'p-3 xl:px-3'
        }`}>
          <button
            onClick={onLogout}
            className={`flex items-center text-sm font-medium transition-all w-full ${
              isExpanded ? 'p-3 gap-3' : 'p-3 justify-center'
            } group`}
            title="Sair"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-all shrink-0">
              <LogOut size={16} className="text-red-400" />
            </div>
            {isExpanded && (
              <span className="text-left text-red-400 animate-in fade-in slide-in-from-left-2 duration-300">Sair</span>
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

export default OficinaSidebar;
