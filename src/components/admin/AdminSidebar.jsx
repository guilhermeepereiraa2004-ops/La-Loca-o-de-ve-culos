import React from 'react';
import { 
  TrendingUp, Car, Mail, Key, Users, User, Wallet, Landmark, Wrench, Eye, X, Menu, 
  ClipboardList, Receipt
} from 'lucide-react';

const AdminSidebar = ({ 
  isSidebarOpen, setIsSidebarOpen, activeTab, setActiveTab, isAdmin, canAccess, onGoHome, onLogout 
}) => {
  const menuItems = [
    { id: 'bi',             label: 'Business Inteligence', icon: TrendingUp },
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
    { id: 'oficina',       label: 'Oficina', icon: Wrench },
    ...(isAdmin ? [{ id: 'usuarios', label: 'Usuários', icon: Users }] : []),
  ];

  return (
    <>
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-6 right-6 z-[60] xl:hidden bg-neutral-900 text-[#C5A059] p-4 rounded-full shadow-2xl border border-neutral-800"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`bg-neutral-900 text-white flex flex-col fixed h-full z-50 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 opacity-0 xl:w-20 xl:translate-x-0 xl:opacity-100'}`}>
        <div className={`p-6 md:p-7 2xl:p-8 border-b border-neutral-800 transition-opacity duration-300 ${!isSidebarOpen ? 'xl:opacity-0' : 'opacity-100'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white">LA</span>
            <span className="text-xl font-black text-[#C5A059]">LOCAÇÃO</span>
          </div>
        </div>
        <nav className="flex-1 p-5 md:p-6 space-y-2 md:space-y-3 overflow-y-auto custom-scrollbar no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className={`text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-4 transition-opacity duration-300 ${!isSidebarOpen ? 'xl:opacity-0' : 'opacity-100'}`}>Gerenciamento</div>
          {menuItems.filter(item => canAccess(item.id) || item.id === 'usuarios').map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1280) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 text-sm font-medium p-3 rounded-xl transition-all ${activeTab === item.id ? 'text-[#C5A059] bg-[#C5A059]/10 shadow-sm' : 'text-neutral-400 hover:text-white'}`}
              title={item.label}
            >
              <item.icon size={16} />
              <span className={`transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-5 md:p-6 border-t border-neutral-800 space-y-3">
          <button
            onClick={onGoHome}
            className="flex items-center gap-3 text-sm font-medium text-neutral-400 hover:text-white transition-colors w-full p-3 group"
          >
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#C5A059]/20 group-hover:text-[#C5A059] transition-all">
              <Eye size={14} />
            </div>
            <span className={`transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>Página Inicial</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 text-sm font-medium text-red-400 hover:text-red-300 transition-colors w-full p-3 group"
          >
            <div className="w-8 h-8 rounded-full bg-red-400/10 flex items-center justify-center group-hover:bg-red-400/20 transition-all">
              <X size={14} />
            </div>
            <span className={`transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>Sair</span>
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
