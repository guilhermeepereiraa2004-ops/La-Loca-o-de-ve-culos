import React from 'react';

const AdminHeader = ({ activeTab, currentUser, isSidebarOpen, onSeed, hasData }) => {
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
    return titles[tab] || 'Painel LA';
  };

  return (
    <header className="h-20 bg-white border-b border-neutral-100 flex items-center justify-between px-6 md:px-12 shadow-sm relative z-10 shrink-0">
      <div className="flex items-center gap-4">
        {!isSidebarOpen && (
          <div className="xl:hidden">
            <span className="text-xl font-black text-neutral-900">LA</span>
          </div>
        )}
        <h2 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-neutral-400 truncate max-w-[150px] md:max-w-none">
          {getTabTitle(activeTab)}
        </h2>
      </div>
      <div className="flex items-center gap-6">
        {!hasData && (
          <button 
            onClick={onSeed}
            className="hidden md:flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all border border-amber-200"
          >
            Sincronizar Banco de Dados
          </button>
        )}
        <div className="text-right hidden md:block">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-900">
            {currentUser?.name || 'Admin Principal'}
          </p>
          <p className="text-[10px] text-neutral-400 font-light">
            {currentUser ? (currentUser.role === 'administrador' ? 'Administrador' : 'Funcionário') : 'Laveiculos@gmail.com'}
          </p>
        </div>
        <div className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-[#C5A059]/30">
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'LA'}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
