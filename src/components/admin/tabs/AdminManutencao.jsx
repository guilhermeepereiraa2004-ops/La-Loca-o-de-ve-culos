import React, { useState, useEffect } from 'react';
import { 
  Wrench, Calendar, Car, DollarSign, User, Info, 
  Plus, Search, Pencil, Trash2, AlertTriangle, CheckCircle2,
  Clock, MapPin, ClipboardList, ChevronDown, Tag
} from 'lucide-react';

const AdminManutencao = ({
  vehicles = [],
  maintenances = [],
  onAddMaintenance = () => {},
  onUpdateMaintenance = () => {},
  onDeleteMaintenance = () => {},
  setShowAdminSuccess = () => {}
}) => {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [maintenanceForm, setMaintenanceForm] = useState({
    vehiclePlate: '',
    vehicleModel: '',
    date: new Date().toISOString().split('T')[0],
    serviceType: '',
    value: '',
    provider: '',
    currentKm: '',
    responsible: 'Administradora',
    observations: ''
  });

  // Auto-fill model when plate is selected
  useEffect(() => {
    if (maintenanceForm.vehiclePlate) {
      const vehicle = vehicles.find(v => v.plate === maintenanceForm.vehiclePlate);
      if (vehicle) {
        setMaintenanceForm(prev => ({ ...prev, vehicleModel: vehicle.model }));
      }
    }
  }, [maintenanceForm.vehiclePlate, vehicles]);

  const filteredMaintenances = (maintenances || []).filter(m => {
    const term = searchTerm.toLowerCase();
    const cleanTerm = term.replace(/[^a-z0-9]/g, '');
    const cleanPlate = (m.vehiclePlate || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    return (
      cleanPlate.includes(cleanTerm) ||
      (m.serviceType || '').toLowerCase().includes(term) ||
      (m.provider || '').toLowerCase().includes(term)
    );
  });

  const calculateAlerts = () => {
    const alerts = [];
    const today = new Date();

    vehicles.forEach(v => {
      // 6-month preventive maintenance alert
      if (!v.entryDate) return;
      const entryDate = new Date(v.entryDate);
      const monthsSinceEntry = (today.getFullYear() - entryDate.getFullYear()) * 12 + (today.getMonth() - entryDate.getMonth());
      
      // If it's near a multiple of 6 months (e.g., 5, 6, 11, 12...)
      if (monthsSinceEntry > 0 && monthsSinceEntry % 6 === 0 || (monthsSinceEntry + 1) % 6 === 0) {
        // Check if there was a preventive maintenance in the last 2 months
        const recentPreventive = (maintenances || []).find(m => 
          m.vehiclePlate === v.plate && 
          (m.serviceType || '').toLowerCase().includes('preventiva') &&
          (today - new Date(m.date)) / (1000 * 60 * 60 * 24 * 30) < 2
        );

        if (!recentPreventive) {
          alerts.push({
            type: 'preventiva',
            vehicle: v.model,
            plate: v.plate,
            message: `Manutenção preventiva de 6 meses recomendada.`
          });
        }
      }

      // Timing belt alert
      const currentKm = parseInt(v.km || 0);
      const lastChange = parseInt(v.lastBeltChangeKm || 0);
      const interval = parseInt(v.beltChangeIntervalKm || 60000);

      if (currentKm >= (lastChange + interval - 5000)) {
        alerts.push({
          type: 'correia',
          vehicle: v.model,
          plate: v.plate,
          message: `Troca de correia dentada próxima (${currentKm}km / ${lastChange + interval}km).`
        });
      }
    });

    return alerts;
  };

  const activeAlerts = calculateAlerts();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">Gestão de Manutenção</h3>
          <p className="text-neutral-400 text-sm font-light mt-1">Controle total preventivo e corretivo da frota.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setMaintenanceForm({
                vehiclePlate: '',
                vehicleModel: '',
                date: new Date().toISOString().split('T')[0],
                serviceType: '',
                value: '',
                provider: '',
                currentKm: '',
                responsible: 'Administradora',
                observations: ''
              });
              setIsEditing(false);
              setShowForm(true);
            }}
            className="flex items-center gap-3 px-8 py-4 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-[#C5A059] transition-all shadow-xl group"
          >
            <Plus size={16} className="text-[#C5A059] group-hover:text-white transition-colors" />
            Nova Manutenção
          </button>
        )}
      </div>

      {/* Alerts Section */}
      {activeAlerts.length > 0 && !showForm && (
        <div className="mb-10 space-y-4">
          <div className="flex items-center gap-2 mb-4 px-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-neutral-400">Alertas de Atenção</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAlerts.map((alert, idx) => (
              <div key={idx} className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex gap-4 items-start shadow-sm animate-in zoom-in duration-500">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                  <Wrench size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-900 uppercase tracking-tight">{alert.vehicle}</p>
                  <p className="text-[10px] text-amber-700/70 font-bold mb-2">{alert.plate}</p>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm ? (
        <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex justify-between items-center mb-10 pb-6 border-b border-neutral-50">
            <h4 className="text-xl font-black uppercase tracking-tight text-neutral-900">
              {isEditing ? 'Editar Registro' : 'Lançar Manutenção'}
            </h4>
            <button 
              onClick={() => setShowForm(false)}
              className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              Cancelar
            </button>
          </div>

          <form className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Veículo (Placa)</label>
                <div className="relative">
                  <Car size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                  <select
                    value={maintenanceForm.vehiclePlate}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, vehiclePlate: e.target.value })}
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm appearance-none"
                  >
                    <option value="">Selecione o veículo</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.plate}>{v.plate} - {v.model}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Marca / Modelo</label>
                <div className="relative">
                  <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                  <input 
                    type="text" 
                    readOnly
                    value={maintenanceForm.vehicleModel}
                    className="w-full bg-neutral-100 border-none p-5 pl-12 rounded-2xl outline-none font-bold text-sm text-neutral-500" 
                    placeholder="Auto-preenchido" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Data do Serviço</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                  <input 
                    type="date" 
                    value={maintenanceForm.date}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })}
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Tipo de Serviço</label>
                <div className="relative">
                  <Wrench size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                  <input 
                    type="text" 
                    value={maintenanceForm.serviceType}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, serviceType: e.target.value })}
                    placeholder="Ex: Troca de óleo, Freios..."
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Valor (R$)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                  <input 
                    type="text" 
                    value={maintenanceForm.value}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, value: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">KM Atual</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                  <input 
                    type="text" 
                    value={maintenanceForm.currentKm}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, currentKm: e.target.value })}
                    placeholder="000.000"
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Oficina / Fornecedor</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                  <input 
                    type="text" 
                    value={maintenanceForm.provider}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, provider: e.target.value })}
                    placeholder="Nome da oficina"
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Responsável pelo Pagamento</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                  <select
                    value={maintenanceForm.responsible}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, responsible: e.target.value })}
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm appearance-none"
                  >
                    <option value="Administradora">Administradora</option>
                    <option value="Investidor">Investidor</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Observações Adicionais</label>
              <div className="relative">
                <ClipboardList size={16} className="absolute left-4 top-5 text-neutral-300" />
                <textarea 
                  value={maintenanceForm.observations}
                  onChange={e => setMaintenanceForm({ ...maintenanceForm, observations: e.target.value })}
                  rows="4"
                  className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light text-sm resize-none"
                  placeholder="Descreva detalhes do serviço, peças trocadas, etc."
                />
              </div>
            </div>

            <div className="flex justify-end gap-6 pt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-8 py-4 text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (isEditing) {
                    onUpdateMaintenance(maintenanceForm);
                    setShowAdminSuccess({
                      show: true,
                      title: 'Registro Atualizado',
                      message: 'Os dados da manutenção foram atualizados com sucesso.'
                    });
                  } else {
                    onAddMaintenance(maintenanceForm);
                    setShowAdminSuccess({
                      show: true,
                      title: 'Manutenção Registrada',
                      message: 'O novo serviço foi lançado com sucesso no histórico do veículo.'
                    });
                  }
                  setShowForm(false);
                }}
                className="px-12 py-5 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-[2rem] hover:bg-[#C5A059] transition-all shadow-xl"
              >
                {isEditing ? 'Salvar Alterações' : 'Lançar Registro'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Filters */}
          <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 flex flex-col md:flex-row gap-6 items-center shadow-sm">
            <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-300" />
              <input 
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por placa, serviço ou oficina..."
                className="w-full bg-neutral-50 border-none p-4 pl-14 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/10 transition-all font-light text-sm"
              />
            </div>
            <div className="flex items-center gap-4 text-neutral-400 bg-neutral-50 px-6 py-4 rounded-2xl border border-neutral-100/50">
              <ClipboardList size={16} />
              <span className="text-[10px] uppercase tracking-widest font-bold">Total: {filteredMaintenances.length} registros</span>
            </div>
          </div>

          {/* List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredMaintenances.map((m) => (
              <div key={m.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm hover:shadow-md hover:border-[#C5A059]/30 transition-all group flex flex-col md:flex-row justify-between gap-8">
                <div className="flex flex-col md:flex-row gap-8 flex-1">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex flex-col items-center justify-center text-white shrink-0 shadow-lg group-hover:bg-[#C5A059] transition-colors">
                      <Wrench size={20} className="text-[#C5A059] group-hover:text-white mb-1" />
                      <span className="text-[8px] font-black uppercase tracking-tighter">MNT</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-black text-neutral-900 uppercase tracking-tighter">{m.vehiclePlate}</span>
                        <span className="px-3 py-1 bg-neutral-100 text-neutral-400 text-[9px] font-black uppercase tracking-widest rounded-lg">{m.vehicleModel}</span>
                      </div>
                      <p className="text-sm font-bold text-neutral-600 mb-4">{m.serviceType}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                        <div className="space-y-1">
                          <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Data</p>
                          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
                            <Calendar size={12} className="text-[#C5A059]" /> {m.date && m.date.includes('-') ? m.date.substring(0, 10).split('-').reverse().join('/') : m.date || '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Valor</p>
                          <p className="text-xs font-bold text-[#C5A059]">R$ {m.value}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Quilometragem</p>
                          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
                            <Clock size={12} className="text-neutral-300" /> {m.currentKm} KM
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Responsável</p>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${m.responsible === 'Administradora' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                            {m.responsible}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:items-end justify-between gap-6 border-t md:border-t-0 md:border-l border-neutral-50 pt-6 md:pt-0 md:pl-8">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setMaintenanceForm(m);
                        setIsEditing(true);
                        setShowForm(true);
                      }}
                      className="w-10 h-10 bg-neutral-50 text-neutral-400 rounded-xl flex items-center justify-center hover:bg-neutral-900 hover:text-white transition-all shadow-sm"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteMaintenance(m.id)}
                      className="w-10 h-10 bg-red-50 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Oficina</p>
                    <p className="text-xs font-bold text-neutral-900">{m.provider}</p>
                  </div>
                </div>
              </div>
            ))}

            {filteredMaintenances.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-neutral-400 space-y-4 bg-white rounded-[2.5rem] border border-dashed border-neutral-200">
                <Wrench size={48} className="text-neutral-100" />
                <p className="font-light tracking-wide text-sm">Nenhum registro encontrado.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManutencao;
