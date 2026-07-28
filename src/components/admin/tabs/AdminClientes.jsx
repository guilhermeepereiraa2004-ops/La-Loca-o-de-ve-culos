import React, { useState } from 'react';
import { Search, User, Phone, Mail, Calendar, Eye, Trash2, MapPin } from 'lucide-react';
import ClientDetailModal from '../modals/ClientDetailModal';
import AddClientModal from '../modals/AddClientModal';
import { EditorialLabel } from '../../ui/EditorialLabel';

const AdminClientes = ({ 
  clients = [], 
  rentals = [],
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

  const activeClientIds = new Set(
    rentals.filter(r => r.status === 'Ativo').map(r => String(r.clientId || r.client_id))
  );

  const filteredClients = clients.filter(c => {
    const normalizeString = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const searchNorm = normalizeString(search);
    const matchesSearch = normalizeString(c.nome || c.name).includes(searchNorm) ||
                          (c.cpf || '').includes(search) ||
                          (c.telefone || c.phone || '').includes(search);
    
    const expired = isExpired(c.cnhExpiration || c.cnhValidity);
    const hasActiveRental = activeClientIds.has(String(c.id));
    const matchesStatus = statusFilter === 'todos' || 
                          (statusFilter === 'vencidos' && expired) || 
                          (statusFilter === 'ativos' && !expired) ||
                          (statusFilter === 'com_locacao' && hasActiveRental);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6 xl:mb-8 2xl:mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse" />
            <EditorialLabel className="text-[#D4AF37] tracking-[0.3em]">Gestão de Condutores</EditorialLabel>
          </div>
          <h3 className="text-3xl xl:text-4xl 2xl:text-5xl font-black uppercase tracking-tighter text-white leading-none">Clientes</h3>
          <p className="text-neutral-500 font-medium italic text-lg tracking-tight">Base de condutores cadastrados e histórico de conformidade de documentos.</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-neutral-700">
              <User size={12} className="text-neutral-400" />
              {clients.length} {clients.length === 1 ? 'cliente total' : 'clientes totais'}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {activeClientIds.size} com locação ativa
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters & Add */}
      <div className="bg-[#0a0a0a] rounded-2xl xl:rounded-3xl p-6 border border-neutral-800 shadow-xl shadow-black/50 hover:border-neutral-700 transition-colors mb-8 xl:mb-12 flex flex-col lg:flex-row gap-6 justify-between items-center">
        <div className="relative flex-1 w-full group">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#D4AF37] transition-colors" />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Buscar por nome, CPF ou telefone..." 
            className="w-full bg-black text-white border border-neutral-800 py-4 pl-14 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] focus:bg-[#0a0a0a] transition-all shadow-inner" 
          />
        </div>
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="flex bg-black p-1.5 rounded-2xl border border-neutral-800 shadow-inner shrink-0 w-full lg:w-auto">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'ativos', label: 'CNH Ativa' },
              { id: 'vencidos', label: 'CNH Vencida' },
              { id: 'com_locacao', label: 'Com Locação' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setStatusFilter(item.id)}
                className={`flex-1 lg:flex-none px-6 py-3.5 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all duration-500 ${statusFilter === item.id
                  ? 'bg-neutral-900 text-white shadow-xl shadow-neutral-900/20 scale-105'
                  : 'text-neutral-400 hover:text-white hover:bg-[#0a0a0a]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowAddClientModal(true)}
            className="px-6 py-4 bg-neutral-900 hover:bg-[#D4AF37] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-neutral-900/20 whitespace-nowrap"
          >
            + Novo Cliente
          </button>
        </div>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
        {filteredClients.length === 0 ? (
          <div className="col-span-full p-20 text-center bg-[#0a0a0a] border border-neutral-800 rounded-3xl shadow-sm max-w-md mx-auto">
            <User size={36} className="mx-auto mb-4 text-neutral-200" />
            <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-1">Nenhum cliente encontrado</h4>
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
              <div key={index} className="bg-[#0a0a0a] rounded-3xl border border-neutral-800 shadow-xl shadow-black/40 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-[#D4AF37]/5 hover:border-neutral-700 group/card group">
                {/* Background ambient light */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl -mr-16 -mt-16 animate-pulse" />
                
                <div>
                  {/* Card Header: CNH status indicator & verify badge */}
                  <div className="flex justify-between items-center mb-5 pb-4 border-b border-neutral-800/60">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${expired ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        {expired ? 'CNH Vencida' : 'CNH Regular'}
                      </span>
                    </div>
                    <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[8px] font-black px-2 py-1 rounded-xl uppercase tracking-wider">
                      Verificado
                    </span>
                  </div>

                  {/* Main Profile Info: Avatar & Name & CPF */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 bg-neutral-950 text-[#D4AF37] rounded-2xl flex items-center justify-center font-black text-xl shadow-md shrink-0 select-none group-hover:scale-105 transition-transform duration-300">
                      {(client.nome || client.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="text-base font-black text-white uppercase tracking-tight truncate" title={client.nome || client.name}>
                        {client.nome || client.name}
                      </h4>
                      <div className="inline-flex items-center gap-1.5 font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-neutral-900 text-white border border-neutral-700 uppercase">
                        CPF: {client.cpf || 'S/CPF'}
                      </div>
                    </div>
                  </div>

                  {/* Contacts and details */}
                  <div className="bg-black/50 border border-neutral-800/70 p-4 rounded-2xl space-y-3.5 mb-6">
                    {/* Contacts info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        <span>Contatos</span>
                      </div>
                      
                      {/* Phone / Whatsapp */}
                      {(client.telefone || client.phone) && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-neutral-200">
                            <Phone size={12} className="text-neutral-400" />
                            <span>{client.telefone || client.phone}</span>
                          </div>
                          <a
                            href={`https://wa.me/${(client.telefone || client.phone).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                            title="WhatsApp"
                          >
                            <Phone size={12} />
                          </a>
                        </div>
                      )}

                      {/* Email */}
                      {(client.email) && (
                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-200 truncate" title={client.email}>
                          <Mail size={12} className="text-neutral-400 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}

                      {/* Address */}
                      {(client.address || client.docs?.address) && (
                        <div className="flex items-start gap-2 text-xs font-bold text-neutral-200 mt-1">
                          <MapPin size={12} className="text-neutral-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-tight">
                            {client.address || client.docs?.address}
                            {(client.docs?.cidadeUf) ? ` — ${client.docs.cidadeUf}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CNH Details */}
                    <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        <span>Carteira de Habilitação</span>
                      </div>
                      
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-black text-white">
                          {client.cnhNumber ? `Nº ${client.cnhNumber}` : 'S/ CNH Cadastrada'}
                        </span>
                        {hasCnh && (
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            expirationInfo.isExpired ? 'bg-red-500/10 text-red-600 border border-red-100/50' :
                            expirationInfo.days <= 30 ? 'bg-amber-500/10 text-amber-600 border border-amber-100/50' :
                            'bg-emerald-500/10 text-emerald-600 border border-emerald-100/50'
                          }`}>
                            {expirationInfo.isExpired ? 'Vencido' : `${expirationInfo.days} dias`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                        <Calendar size={11} className="text-[#D4AF37]" />
                        <span>{expirationInfo.label}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedClient(client)}
                    className="flex-1 py-3.5 bg-neutral-950 text-white text-[9px] uppercase tracking-[0.3em] font-black rounded-xl hover:bg-[#D4AF37] transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 duration-200"
                  >
                    <Eye size={13} /> Abrir Ficha do Cliente
                  </button>
                  <button
                    onClick={() => {
                      setItemToDelete(client);
                      setDeleteType('client');
                      setShowDeleteAuthModal(true);
                    }}
                    className="p-3.5 bg-[#0a0a0a] text-neutral-400 border border-neutral-700 rounded-xl hover:border-red-500 hover:text-red-500 transition-all flex items-center justify-center shadow-sm active:scale-95 duration-200"
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
