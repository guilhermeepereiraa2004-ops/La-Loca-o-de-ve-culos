import React, { useState } from 'react';
import { Search, User, Phone, Mail, FileText, Calendar, ExternalLink, Eye } from 'lucide-react';
import ClientDetailModal from '../modals/ClientDetailModal';

const AdminClientes = ({ clients = [] }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedClient, setSelectedClient] = useState(null);

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(dateStr);
    return expDate < today;
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (c.cpf || '').includes(search) ||
                          (c.phone || '').includes(search);
    
    const expired = isExpired(c.cnhValidity);
    const matchesStatus = statusFilter === 'todos' || 
                          (statusFilter === 'vencidos' && expired) || 
                          (statusFilter === 'ativos' && !expired);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h3 className="text-4xl font-black uppercase tracking-tighter">Base de Clientes</h3>
          <p className="text-neutral-400 text-sm font-light mt-1">Gestão de condutores com histórico de locação.</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-6 mb-12">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Buscar por nome, CPF ou telefone..." 
            className="w-full bg-white border border-neutral-100 p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-light shadow-sm" 
          />
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-neutral-100 shadow-sm shrink-0">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'ativos', label: 'CNH Ativa' },
            { id: 'vencidos', label: 'CNH Vencida' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-6 py-4 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all ${statusFilter === item.id
                ? 'bg-neutral-900 text-white shadow-lg'
                : 'text-neutral-400 hover:text-neutral-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredClients.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-white rounded-[3rem] border border-dashed border-neutral-200">
            <User size={48} className="mx-auto text-neutral-200 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">Nenhum cliente encontrado</p>
          </div>
        ) : (
          filteredClients.map((client, index) => (
            <div key={index} className="bg-white rounded-[2.5rem] border border-neutral-100 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 blur-3xl -mr-16 -mt-16" />
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059] font-black text-xl">
                  {client.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xl font-black text-neutral-900 uppercase tracking-tighter">{client.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-[#C5A059] font-bold uppercase tracking-widest">Cliente Verificado</p>
                    {isExpired(client.cnhValidity) && (
                      <span className="bg-red-50 text-red-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border border-red-100">
                        CNH Vencida
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl">
                  <Phone size={14} className="text-neutral-400" />
                  <div>
                    <p className="text-[8px] uppercase text-neutral-400 font-black">WhatsApp / Contato</p>
                    <p className="text-xs font-bold text-neutral-900">{client.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl">
                  <Mail size={14} className="text-neutral-400" />
                  <div>
                    <p className="text-[8px] uppercase text-neutral-400 font-black">E-mail</p>
                    <p className="text-xs font-bold text-neutral-900 truncate max-w-[180px]">{client.email || 'Não informado'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-50 rounded-2xl">
                    <p className="text-[8px] uppercase text-neutral-400 font-black">CNH</p>
                    <p className="text-xs font-bold text-neutral-900">{client.cnh || '---'}</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isExpired(client.cnhValidity) ? 'bg-red-50 border-red-100' : 'bg-neutral-50 border-neutral-50'}`}>
                    <p className={`text-[8px] uppercase font-black ${isExpired(client.cnhValidity) ? 'text-red-400' : 'text-neutral-400'}`}>Validade</p>
                    <p className={`text-xs font-bold ${isExpired(client.cnhValidity) ? 'text-red-600' : 'text-neutral-900'}`}>
                      {client.cnhValidity ? new Date(client.cnhValidity).toLocaleDateString('pt-BR') : '---'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-50 flex justify-between items-center">
                <div>
                  <p className="text-[8px] uppercase text-neutral-400 font-black">Data de Cadastro</p>
                  <p className="text-[10px] font-black text-neutral-700">{client.registrationDate || 'Recentemente'}</p>
                </div>
                <button 
                  onClick={() => setSelectedClient(client)}
                  className="w-10 h-10 bg-neutral-900 text-white rounded-full flex items-center justify-center hover:bg-[#C5A059] transition-all"
                  title="Ver Dossiê do Cliente"
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedClient && (
        <ClientDetailModal 
          client={selectedClient} 
          onClose={() => setSelectedClient(null)} 
        />
      )}
    </div>
  );
};

export default AdminClientes;
