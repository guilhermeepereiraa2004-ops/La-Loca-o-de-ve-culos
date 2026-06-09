import React, { useState } from 'react';
import { Search, User, Phone, Mail, Calendar, Eye, Trash2, MapPin } from 'lucide-react';
import ClientDetailModal from '../modals/ClientDetailModal';
import AddClientModal from '../modals/AddClientModal';
import { EditorialLabel } from '../../ui/EditorialLabel';

const AdminClientes = ({ 
  clients = [], 
  onUpdateClient, 
  onAddClient,
  setItemToDelete, 
  setDeleteType, 
  setShowDeleteAuthModal 
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(dateStr);
    return expDate < today;
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = (c.nome || c.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (c.cpf || '').includes(search) ||
                          (c.telefone || c.phone || '').includes(search);
    
    const expired = isExpired(c.cnhExpiration || c.cnhValidity);
    const matchesStatus = statusFilter === 'todos' || 
                          (statusFilter === 'vencidos' && expired) || 
                          (statusFilter === 'ativos' && !expired);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6 xl:mb-8 2xl:mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-pulse" />
            <EditorialLabel className="text-[#C5A059] tracking-[0.3em]">Gestão de Condutores</EditorialLabel>
          </div>
          <h3 className="text-3xl xl:text-4xl 2xl:text-5xl font-black uppercase tracking-tighter text-neutral-900 leading-none">Clientes</h3>
          <p className="text-neutral-500 font-medium italic text-lg tracking-tight">Base de condutores cadastrados e histórico de conformidade de documentos.</p>
        </div>
      </div>

      {/* Search & Filters & Add */}
      <div className="bg-white rounded-[2rem] xl:rounded-[3rem] p-6 border border-neutral-100 shadow-sm mb-8 xl:mb-12 flex flex-col lg:flex-row gap-6 justify-between items-center">
        <div className="relative flex-1 w-full group">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Buscar por nome, CPF ou telefone..." 
            className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-14 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
          />
        </div>
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="flex bg-neutral-50 p-1.5 rounded-[2rem] border border-neutral-100 shadow-inner shrink-0 w-full lg:w-auto">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'ativos', label: 'CNH Ativa' },
              { id: 'vencidos', label: 'CNH Vencida' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setStatusFilter(item.id)}
                className={`flex-1 lg:flex-none px-6 py-3.5 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all duration-500 ${statusFilter === item.id
                  ? 'bg-neutral-900 text-white shadow-xl shadow-neutral-900/20 scale-105'
                  : 'text-neutral-400 hover:text-neutral-900 hover:bg-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowAddClientModal(true)}
            className="px-6 py-4 bg-neutral-900 hover:bg-[#C5A059] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-neutral-900/20 whitespace-nowrap"
          >
            + Novo Cliente
          </button>
        </div>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
        {filteredClients.length === 0 ? (
          <div className="col-span-full p-20 text-center bg-white border border-neutral-100 rounded-3xl shadow-sm max-w-md mx-auto">
            <User size={36} className="mx-auto mb-4 text-neutral-200" />
            <h4 className="text-lg font-black text-neutral-900 uppercase tracking-tighter mb-1">Nenhum cliente encontrado</h4>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-none">Não encontramos registros para os filtros selecionados</p>
          </div>
        ) : (
          filteredClients.map((client, index) => {
            const hasCnh = !!(client.cnhNumber);
            const expired = isExpired(client.cnhExpiration || client.cnhValidity);
            
            // Format days remaining
            const expirationInfo = (() => {
              const dateVal = client.cnhExpiration || client.cnhValidity;
              if (!dateVal) return { label: 'Não informado', days: 0, isExpired: false };
              const diff = new Date(dateVal).getTime() - new Date().getTime();
              const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
              const formattedDate = dateVal && dateVal.includes('-') ? dateVal.substring(0, 10).split('-').reverse().join('/') : dateVal || '—';
              return {
                label: `Validade: ${formattedDate}`,
                days: days,
                isExpired: days <= 0
              };
            })();

            return (
              <div key={index} className="bg-white rounded-3xl border border-neutral-100 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-neutral-200/80 transition-all duration-300 relative overflow-hidden group">
                {/* Background ambient light */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 blur-3xl -mr-16 -mt-16 animate-pulse" />
                
                <div>
                  {/* Card Header: CNH status indicator & verify badge */}
                  <div className="flex justify-between items-center mb-5 pb-4 border-b border-neutral-100/60">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${expired ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        {expired ? 'CNH Vencida' : 'CNH Regular'}
                      </span>
                    </div>
                    <span className="bg-[#C5A059]/10 text-[#C5A059] text-[8px] font-black px-2 py-1 rounded-xl uppercase tracking-wider">
                      Verificado
                    </span>
                  </div>

                  {/* Main Profile Info: Avatar & Name & CPF */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 bg-neutral-950 text-[#C5A059] rounded-2xl flex items-center justify-center font-black text-xl shadow-md shrink-0 select-none group-hover:scale-105 transition-transform duration-300">
                      {(client.nome || client.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="text-base font-black text-neutral-900 uppercase tracking-tight truncate" title={client.nome || client.name}>
                        {client.nome || client.name}
                      </h4>
                      <div className="inline-flex items-center gap-1.5 font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-neutral-50 text-neutral-600 border border-neutral-200/60 uppercase">
                        CPF: {client.cpf || 'S/CPF'}
                      </div>
                    </div>
                  </div>

                  {/* Contacts and details */}
                  <div className="bg-neutral-50/50 border border-neutral-100/70 p-4 rounded-2xl space-y-3.5 mb-6">
                    {/* Contacts info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        <span>Contatos</span>
                      </div>
                      
                      {/* Phone / Whatsapp */}
                      {(client.telefone || client.phone) && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
                            <Phone size={12} className="text-neutral-400" />
                            <span>{client.telefone || client.phone}</span>
                          </div>
                          <a
                            href={`https://wa.me/${(client.telefone || client.phone).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                            title="WhatsApp"
                          >
                            <Phone size={12} />
                          </a>
                        </div>
                      )}

                      {/* Email */}
                      {(client.email) && (
                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 truncate" title={client.email}>
                          <Mail size={12} className="text-neutral-400 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}

                      {/* Address */}
                      {(client.address || client.docs?.address) && (
                        <div className="flex items-start gap-2 text-xs font-bold text-neutral-800 mt-1">
                          <MapPin size={12} className="text-neutral-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-tight">
                            {client.address || client.docs?.address}
                            {(client.docs?.cidadeUf) ? ` — ${client.docs.cidadeUf}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CNH Details */}
                    <div className="pt-3 border-t border-neutral-100/80 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        <span>Carteira de Habilitação</span>
                      </div>
                      
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-black text-neutral-900">
                          {client.cnhNumber ? `Nº ${client.cnhNumber}` : 'S/ CNH Cadastrada'}
                        </span>
                        {hasCnh && (
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            expirationInfo.isExpired ? 'bg-red-50 text-red-600 border border-red-100/50' :
                            expirationInfo.days <= 30 ? 'bg-amber-50 text-amber-600 border border-amber-100/50' :
                            'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                          }`}>
                            {expirationInfo.isExpired ? 'Vencido' : `${expirationInfo.days} dias`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                        <Calendar size={11} className="text-[#C5A059]" />
                        <span>{expirationInfo.label}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedClient(client)}
                    className="flex-1 py-3.5 bg-neutral-950 text-white text-[9px] uppercase tracking-[0.3em] font-black rounded-xl hover:bg-[#C5A059] transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 duration-200"
                  >
                    <Eye size={13} /> Abrir Ficha do Cliente
                  </button>
                  <button
                    onClick={() => {
                      setItemToDelete(client);
                      setDeleteType('client');
                      setShowDeleteAuthModal(true);
                    }}
                    className="p-3.5 bg-white text-neutral-400 border border-neutral-200 rounded-xl hover:border-red-500 hover:text-red-500 transition-all flex items-center justify-center shadow-sm active:scale-95 duration-200"
                    title="Excluir Cliente"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedClient && (
        <ClientDetailModal 
          client={selectedClient} 
          isOpen={!!selectedClient} 
          onClose={() => setSelectedClient(null)} 
          onUpdate={async (updatedData) => {
            if (onUpdateClient) {
              const res = await onUpdateClient(updatedData);
              if (res && res.success) {
                setSelectedClient(updatedData);
              }
              return res;
            }
          }}
        />
      )}

      {showAddClientModal && (
        <AddClientModal
          isOpen={showAddClientModal}
          onClose={() => setShowAddClientModal(false)}
          onAddClient={onAddClient}
        />
      )}
    </div>
  );
};

export default AdminClientes;
