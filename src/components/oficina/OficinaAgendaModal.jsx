import React, { useState, useEffect } from 'react';
import { X, User, Zap, Calendar, Clock } from 'lucide-react';

const OficinaAgendaModal = ({ isOpen, onClose, onSave, clients, vehicles }) => {
  const [tab, setTab] = useState('cadastrado'); // 'cadastrado' or 'avulso'
  
  const initialForm = {
    clientId: '',
    vehicleId: '',
    clientName: '',
    clientPhone: '',
    vehiclePlate: '',
    vehicleModel: '',
    date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
    time: '09:00',
    duration: '1h',
    type: 'Serviço',
    description: '',
    observations: ''
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setTab('cadastrado');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  // Filter vehicles for selected client
  const clientVehicles = vehicles?.filter(v => {
    // Ideally we would filter vehicles by client if the DB supports it,
    // but in this system rentals bind clients to vehicles. 
    // Let's just show all vehicles for now or let them pick.
    return true; 
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-neutral-100 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-black text-neutral-900 uppercase tracking-tighter">Novo Agendamento</h2>
            <p className="text-xs font-bold text-neutral-400">Preencha as informações do agendamento</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tabs */}
          <div className="flex bg-neutral-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setTab('cadastrado')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${tab === 'cadastrado' ? 'bg-neutral-900 text-[#C5A059] shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <User size={16} /> Cliente cadastrado
            </button>
            <button
              type="button"
              onClick={() => setTab('avulso')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${tab === 'avulso' ? 'bg-neutral-900 text-[#C5A059] shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <Zap size={16} /> Avulso (rápido)
            </button>
          </div>

          {/* Form Content */}
          <div className="space-y-4">
            
            {tab === 'cadastrado' ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 ml-1">Cliente *</label>
                  <select 
                    required 
                    value={form.clientId}
                    onChange={e => setForm({...form, clientId: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 p-3 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-medium text-sm transition-all"
                  >
                    <option value="">Selecione o cliente</option>
                    {clients?.map(c => (
                      <option key={c.id} value={c.id}>{c.nome || c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 ml-1">Veículo *</label>
                  <select 
                    required 
                    value={form.vehicleId}
                    onChange={e => setForm({...form, vehicleId: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 p-3 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-medium text-sm transition-all disabled:opacity-50"
                    disabled={!form.clientId}
                  >
                    <option value="">{form.clientId ? 'Selecione o veículo' : 'Selecione um cliente primeiro'}</option>
                    {clientVehicles?.map(v => (
                      <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 ml-1">Nome do cliente *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    value={form.clientName}
                    onChange={e => setForm({...form, clientName: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 p-3 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-medium text-sm transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 ml-1">Telefone</label>
                    <input 
                      type="text"
                      placeholder="(opcional)"
                      value={form.clientPhone}
                      onChange={e => setForm({...form, clientPhone: e.target.value})}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 p-3 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-medium text-sm transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 ml-1">Veículo</label>
                    <input 
                      type="text"
                      placeholder="Ex: Ideia ABC1D23"
                      value={form.vehicleModel}
                      onChange={e => setForm({...form, vehicleModel: e.target.value})}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 p-3 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-medium text-sm transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-neutral-500 ml-1">Data *</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input 
                    type="date"
                    required
                    value={form.date}
                    onChange={e => setForm({...form, date: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 p-3 pl-10 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-medium text-sm transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-neutral-500 ml-1">Horário *</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input 
                    type="time"
                    required
                    value={form.time}
                    onChange={e => setForm({...form, time: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 p-3 pl-10 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-medium text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 ml-1">Duração</label>
                <input 
                  type="text"
                  placeholder="Ex: 1h, 30min"
                  value={form.duration}
                  onChange={e => setForm({...form, duration: e.target.value})}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 p-3 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-medium text-sm transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 ml-1">Tipo</label>
                <select 
                  value={form.type}
                  onChange={e => setForm({...form, type: e.target.value})}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 p-3 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-medium text-sm transition-all"
                >
                  <option value="Serviço">Serviço</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Revisão">Revisão</option>
                  <option value="Orçamento">Orçamento</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 ml-1">Descrição do serviço</label>
              <input 
                type="text"
                placeholder="Ex: Troca de óleo e filtros"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 p-3 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-medium text-sm transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 ml-1">Observações</label>
              <textarea 
                placeholder="Notas internas..."
                rows={3}
                value={form.observations}
                onChange={e => setForm({...form, observations: e.target.value})}
                className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 p-3 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-medium text-sm transition-all resize-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-sm font-bold text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-8 py-3 bg-[#C5A059] text-neutral-950 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-[#b08d4b] transition-colors shadow-lg shadow-[#C5A059]/20"
            >
              Agendar
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default OficinaAgendaModal;
