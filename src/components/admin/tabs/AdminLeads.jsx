import React from 'react';
import { Download, Search, Mail, Phone, X, Trash2 } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';

const AdminLeads = ({ 
  leads, 
  leadSearch, 
  setLeadSearch, 
  leadStatusFilter, 
  setLeadStatusFilter, 
  onUpdateStatus, 
  currentUser,
  setItemToDelete,
  setDeleteType,
  setShowDeleteAuthModal
}) => {
  const filteredLeads = leads.filter(lead => {
    const name = lead.name || '';
    const matchesSearch = name.toLowerCase().includes((leadSearch || '').toLowerCase());
    const matchesStatus = leadStatusFilter === 'todos' || 
      (lead.status || '').toLowerCase().trim() === leadStatusFilter.toLowerCase().trim();
    return matchesSearch && matchesStatus;
  });

  const exportLeadsToExcel = () => {
    if (!filteredLeads || filteredLeads.length === 0) {
      alert("Não há leads para exportar.");
      return;
    }

    const headers = [
      "ID",
      "Nome",
      "Contato/WhatsApp",
      "E-mail",
      "Mensagem",
      "Data de Cadastro",
      "Status",
      "Tipo de Lead",
      "Modelo do Veículo Interessado",
      "Placa do Veículo Interessado"
    ];
    
    const rows = filteredLeads.map(lead => [
      lead.id || '',
      lead.name || '',
      lead.contact || '',
      lead.email || '',
      (lead.message || '').replace(/\r?\n/g, ' '),
      lead.date || '',
      lead.status || '',
      lead.type || '',
      lead.vehicleModel || '',
      lead.vehiclePlate || ''
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h3 className="text-3xl font-black uppercase tracking-tighter">Leads de Contato</h3>
          <p className="text-neutral-400 text-sm font-light mt-1">Interessados e solicitações vindas do site.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={exportLeadsToExcel}
            className="flex items-center gap-3 bg-emerald-50 text-emerald-600 px-6 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black hover:bg-emerald-600 hover:text-white transition-all shadow-sm group"
          >
            <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
            Exportar Excel
          </button>
          <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl border border-neutral-100 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-black text-neutral-900">
              {leads.filter(l => (l.status || '').toLowerCase().trim() === 'novo').length} Novos Leads
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-6 mb-12">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
          <input
            type="text"
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            placeholder="Pesquisar por nome..."
            className="w-full bg-white border border-neutral-100 p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light shadow-sm"
          />
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-neutral-100 shadow-sm shrink-0">
          {['todos', 'novo', 'contatado', 'convertido', 'perdido'].map((status) => (
            <button
              key={status}
              onClick={() => setLeadStatusFilter(status)}
              className={`px-6 py-4 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all ${leadStatusFilter === status
                ? 'bg-neutral-900 text-white shadow-lg'
                : 'text-neutral-400 hover:text-neutral-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-3xl border border-neutral-100 shadow-sm hover:border-[#C5A059]/30 transition-all group overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                {/* Vehicle Image (if rental) */}
                {lead.type === 'locacao' && lead.vehicleImage && (
                  <div className="lg:w-48 h-48 lg:h-auto relative shrink-0 animate-in fade-in slide-in-from-left duration-700">
                    <img src={lead.vehicleImage} alt={lead.vehicleModel} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white hidden lg:block" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent lg:hidden" />
                  </div>
                )}

                <div className="flex-1 p-8">
                  <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059] font-black text-xl shadow-xl">
                        {lead.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-neutral-900 uppercase tracking-tight">{lead.name}</h4>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{lead.date}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full w-fit ${
                          (lead.status || '').toLowerCase().trim() === 'novo' ? 'bg-emerald-50 text-emerald-600' :
                          (lead.status || '').toLowerCase().trim() === 'contatado' ? 'bg-blue-50 text-blue-600' :
                          (lead.status || '').toLowerCase().trim() === 'convertido' ? 'bg-amber-50 text-amber-600' :
                            'bg-neutral-100 text-neutral-500'
                          }`}>
                          {lead.status}
                        </span>
                        {lead.updatedBy && (lead.status || '').toLowerCase().trim() !== 'novo' && (
                          <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest ml-1">
                            por: <span className="text-neutral-900">{lead.updatedBy}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {['contatado', 'convertido', 'perdido'].map((s) => (
                        (lead.status || '').toLowerCase().trim() !== s && (
                          <button
                            key={s}
                            onClick={() => onUpdateStatus(lead.id, s, currentUser?.name || 'Admin Principal')}
                            className="px-4 py-2 border border-neutral-100 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-neutral-50 transition-all text-neutral-400 hover:text-neutral-900"
                          >
                            {s}
                          </button>
                        )
                      ))}
                      <a
                        href={`https://wa.me/${lead.contact.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Phone size={12} /> Whats
                      </a>
                      <button
                        onClick={() => {
                          setItemToDelete(lead);
                          setDeleteType('lead');
                          setShowDeleteAuthModal(true);
                        }}
                        className="p-3 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center border border-red-100 hover:border-red-500 shadow-sm"
                        title="Excluir Lead"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-1">Whats</p>
                      <p className="text-xs font-bold text-neutral-900">{lead.contact}</p>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-1">E-mail</p>
                      <p className="text-xs font-bold text-neutral-900">{lead.email || 'Não informado'}</p>
                    </div>
                    {lead.type === 'locacao' && (
                      <div className="p-4 bg-neutral-900 rounded-2xl border border-neutral-800">
                        <p className="text-[9px] uppercase tracking-widest text-[#C5A059] font-black mb-1">Veículo / Placa</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-white">{lead.vehicleModel}</p>
                          <span className="text-[8px] font-black bg-white text-neutral-900 px-1.5 py-0.5 rounded leading-none">
                            {lead.vehiclePlate || 'S/ PLACA'}
                          </span>
                        </div>
                      </div>
                    )}
                    {lead.type !== 'locacao' && (
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                          <Mail size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-blue-400 font-black">Tipo de Lead</p>
                          <p className="text-xs font-black text-blue-600 uppercase">Contato Geral / Site</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {lead.message && (
                    <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-2">Mensagem do Cliente</p>
                      <p className="text-sm text-neutral-600 font-light italic">"{lead.message}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-neutral-200">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-300">
              <Mail size={32} />
            </div>
            <p className="text-neutral-400 uppercase tracking-[0.2em] text-[10px] font-black">Nenhum lead encontrado para os critérios de busca</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeads;
