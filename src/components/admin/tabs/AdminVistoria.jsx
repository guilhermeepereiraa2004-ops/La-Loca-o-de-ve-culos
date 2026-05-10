import React, { useState } from 'react';
import { Camera, Plus, Search, ClipboardCheck, Trash2, Eye, Calendar, Fuel, Gauge, Car, Check, AlertTriangle } from 'lucide-react';

const AdminVistoria = ({ inspections = [], vehicles = [], onAddInspection, onDeleteInspection, onViewDetail }) => {
  const [showForm, setShowForm] = useState(false);
  const [inspectionSearch, setInspectionSearch] = useState('');
  const [inspectionForm, setInspectionForm] = useState({
    type: 'Entrega',
    vehiclePlate: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    km: '',
    fuelLevel: 'Cheio',
    tireCondition: 'Bom',
    photos: {}, // Object for named slots
    video: null,
    observations: '',
    deductions: [] // [{ category, description, value, isProportional }]
  });

  const filteredInspections = inspections.filter(ins => 
    ins.vehiclePlate.toLowerCase().includes(inspectionSearch.toLowerCase()) ||
    ins.type.toLowerCase().includes(inspectionSearch.toLowerCase())
  );

  const getOperationalAlerts = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    return vehicles
      .filter(v => v.status === 'Alugado')
      .map(v => {
        const recentPeriodicInspections = inspections.filter(ins => 
          ins.vehiclePlate === v.plate && 
          ins.type === 'Periódica' && 
          new Date(ins.date) >= thirtyDaysAgo
        );
        
        if (recentPeriodicInspections.length < 2) {
          return {
            plate: v.plate,
            model: v.model,
            count: recentPeriodicInspections.length
          };
        }
        return null;
      })
      .filter(alert => alert !== null);
  };

  const alerts = getOperationalAlerts();

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddInspection({
      ...inspectionForm,
      id: Date.now()
    });
    setShowForm(false);
    setInspectionForm({
      type: 'Entrega',
      vehiclePlate: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      km: '',
      fuelLevel: 'Cheio',
      tireCondition: 'Bom',
      photos: {},
      video: null,
      observations: '',
      deductions: []
    });
  };

  const handleAddDeduction = () => {
    setInspectionForm(prev => ({
      ...prev,
      deductions: [...prev.deductions, { category: 'Lavagem', description: '', value: '', isProportional: false }]
    }));
  };

  const handleUpdateDeduction = (index, field, value) => {
    const newDeductions = [...inspectionForm.deductions];
    newDeductions[index][field] = value;
    setInspectionForm(prev => ({ ...prev, deductions: newDeductions }));
  };

  const handleRemoveDeduction = (index) => {
    setInspectionForm(prev => ({
      ...prev,
      deductions: prev.deductions.filter((_, i) => i !== index)
    }));
  };

  const totalDeductions = inspectionForm.deductions.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {!showForm ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
              <h3 className="text-4xl font-black uppercase tracking-tighter">Vistorias Técnicas</h3>
              <p className="text-neutral-400 text-sm font-light mt-1">Checklist de entrada, saída e manutenções preventivas.</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-3 bg-neutral-900 text-white px-8 py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] font-black hover:bg-[#C5A059] transition-all shadow-xl shadow-neutral-900/10"
            >
              <Plus size={16} /> Nova Vistoria
            </button>
          </div>

          {/* Alerts Section */}
          {alerts.length > 0 && (
            <div className="mb-12 p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 flex flex-col md:flex-row items-start md:items-center gap-6 animate-in slide-in-from-top-4 duration-500">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                <AlertTriangle size={28} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black uppercase tracking-widest text-amber-900 mb-1">Alertas de Vistoria Periódica</h4>
                <p className="text-xs text-amber-700/70 font-medium">Os veículos abaixo estão alugados e possuem menos de 2 vistorias periódicas nos últimos 30 dias.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {alerts.map(alert => (
                    <div key={alert.plate} className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-amber-200 flex items-center gap-3">
                      <span className="text-[10px] font-black text-amber-900 uppercase">{alert.plate}</span>
                      <div className="w-px h-3 bg-amber-200" />
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tight">{alert.count === 0 ? 'Nenhuma' : 'Apenas 1'} Realizada</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-12 max-w-xl">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
            <input
              type="text"
              value={inspectionSearch}
              onChange={(e) => setInspectionSearch(e.target.value)}
              placeholder="Pesquisar por placa ou tipo..."
              className="w-full bg-white border border-neutral-100 p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredInspections.map((ins) => (
              <div key={ins.id} className="bg-white rounded-[2.5rem] border border-neutral-100 p-8 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    ins.type === 'Entrega' ? 'bg-emerald-50 text-emerald-600' :
                    ins.type === 'Devolução' ? 'bg-blue-50 text-blue-600' :
                    ins.type === 'Coleta' ? 'bg-amber-50 text-amber-600' : 'bg-neutral-50 text-neutral-600'
                  }`}>
                    {ins.type}
                  </div>
                  <button onClick={() => onDeleteInspection(ins.id)} className="text-neutral-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-neutral-950 rounded-2xl flex items-center justify-center text-[#C5A059] shadow-lg">
                    <Car size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-neutral-900 uppercase tracking-tighter">{ins.vehiclePlate}</h4>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{ins.date} às {ins.time}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-neutral-50 rounded-xl">
                    <p className="text-[8px] uppercase font-bold text-neutral-400 mb-1">Km Atual</p>
                    <p className="text-xs font-black text-neutral-900">{ins.km} KM</p>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl">
                    <p className="text-[8px] uppercase font-bold text-neutral-400 mb-1">Combustível</p>
                    <p className="text-xs font-black text-neutral-900">{ins.fuelLevel}</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  {Object.values(ins.photos || {}).map((photo, i) => (
                    <div key={i} className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-100 bg-neutral-100 shrink-0">
                      <img src={photo.preview} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {ins.video && (
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                      <Eye size={14} />
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => onViewDetail(ins)}
                  className="w-full py-4 bg-neutral-50 text-neutral-900 text-[9px] uppercase tracking-widest font-black rounded-xl hover:bg-neutral-900 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Eye size={14} /> Ver Dossiê Completo
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-[3rem] p-12 border border-neutral-100 shadow-xl max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#C5A059] rounded-2xl flex items-center justify-center text-neutral-950 shadow-lg">
                <ClipboardCheck size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter">Registrar Nova Vistoria</h3>
            </div>
            <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-900">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Tipo de Vistoria</label>
                <select
                  value={inspectionForm.type}
                  onChange={e => setInspectionForm({...inspectionForm, type: e.target.value})}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold"
                >
                  <option>Coleta</option>
                  <option>Entrega</option>
                  <option>Periódica</option>
                  <option>Devolução</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Veículo (Placa)</label>
                <select
                  value={inspectionForm.vehiclePlate}
                  onChange={e => setInspectionForm({...inspectionForm, vehiclePlate: e.target.value})}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold"
                  required
                >
                  <option value="">Selecione o Veículo</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.plate}>{v.model} - {v.plate}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Data</label>
                <input
                  type="date"
                  value={inspectionForm.date}
                  onChange={e => setInspectionForm({...inspectionForm, date: e.target.value})}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Km Atual</label>
                <div className="relative">
                  <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={18} />
                  <input
                    type="number"
                    value={inspectionForm.km}
                    onChange={e => setInspectionForm({...inspectionForm, km: e.target.value})}
                    placeholder="0"
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Nível de Combustível</label>
                <div className="relative">
                  <Fuel className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={18} />
                  <select
                    value={inspectionForm.fuelLevel}
                    onChange={e => setInspectionForm({...inspectionForm, fuelLevel: e.target.value})}
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold"
                  >
                    <option>Reserva</option>
                    <option>1/4</option>
                    <option>1/2</option>
                    <option>3/4</option>
                    <option>Cheio</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Estado dos Pneus</label>
                <select
                  value={inspectionForm.tireCondition}
                  onChange={e => setInspectionForm({...inspectionForm, tireCondition: e.target.value})}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold"
                >
                  <option>Novo</option>
                  <option>Bom</option>
                  <option>Regular</option>
                  <option>Troca Próxima</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Galeria Técnica (Fotos Obrigatórias)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {[
                  { id: 'front', label: 'Frente Completa' },
                  { id: 'rear', label: 'Traseira Completa' },
                  { id: 'sideRight', label: 'Lateral Direita' },
                  { id: 'sideLeft', label: 'Lateral Esquerda' },
                  { id: 'angleFront', label: 'Frente em Ângulo' },
                  { id: 'angleRear', label: 'Traseira em Ângulo' },
                  { id: 'plate', label: 'Placa do Veículo' },
                  { id: 'odometer', label: 'Hodômetro (KM)' },
                  { id: 'dashboard', label: 'Painel Ligado' },
                ].map((slot) => (
                  <div key={slot.id} className="space-y-2">
                    <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest text-center">{slot.label}</p>
                    <label className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden relative group ${inspectionForm.photos[slot.id] ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-100 hover:border-[#C5A059]/30 hover:bg-neutral-50'}`}>
                      {inspectionForm.photos[slot.id] ? (
                        <>
                          <img src={inspectionForm.photos[slot.id].preview} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-[8px] font-black uppercase tracking-widest">Trocar</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <Camera size={20} className="text-neutral-300 group-hover:text-[#C5A059]" />
                          <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">Anexar</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setInspectionForm(prev => ({
                              ...prev,
                              photos: {
                                ...prev.photos,
                                [slot.id]: { file, preview: URL.createObjectURL(file) }
                              }
                            }));
                          }
                        }} 
                      />
                    </label>
                  </div>
                ))}

                {/* Video Slot */}
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest text-center">Vídeo Adicional</p>
                  <label className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden relative group ${inspectionForm.video ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-100 hover:border-[#C5A059]/30 hover:bg-neutral-50'}`}>
                    {inspectionForm.video ? (
                      <div className="flex flex-col items-center gap-1 text-emerald-600">
                        <Check size={20} />
                        <span className="text-[7px] font-black uppercase tracking-widest">Vídeo OK</span>
                      </div>
                    ) : (
                      <>
                        <Plus size={20} className="text-neutral-300 group-hover:text-[#C5A059]" />
                        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">Anexar Vídeo</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setInspectionForm(prev => ({
                            ...prev,
                            video: { file, preview: URL.createObjectURL(file) }
                          }));
                        }
                      }} 
                    />
                  </label>
                </div>
              </div>
            </div>

            {inspectionForm.type === 'Devolução' && (
              <div className="space-y-8 p-10 bg-neutral-900 rounded-[3rem] border border-[#C5A059]/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/5 blur-3xl -mr-32 -mt-32" />
                
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#C5A059]/10 rounded-2xl flex items-center justify-center text-[#C5A059]">
                      <Trash2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white uppercase tracking-tighter">Itens a Descontar da Caução</h4>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Lançamento de avarias e manutenções de devolução</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDeduction}
                    className="bg-[#C5A059] text-neutral-900 px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black hover:bg-white transition-all flex items-center gap-2"
                  >
                    <Plus size={14} /> Adicionar Item
                  </button>
                </div>

                <div className="space-y-4 relative z-10">
                  {inspectionForm.deductions.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white/5 p-6 rounded-[2rem] border border-white/5 items-end group">
                      <div className="md:col-span-3 space-y-2">
                        <label className="text-[8px] uppercase tracking-widest text-neutral-500 font-black ml-1">Categoria</label>
                        <select
                          value={item.category}
                          onChange={e => handleUpdateDeduction(index, 'category', e.target.value)}
                          className="w-full bg-neutral-800 border-none p-4 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A059] transition-all font-bold text-white text-xs"
                        >
                          <option>Lavagem</option>
                          <option>Troca de óleo</option>
                          <option>Acessórios quebrados</option>
                          <option>Acessórios faltantes</option>
                          <option>Lâmpadas</option>
                          <option>Avarias</option>
                          <option>Pneus</option>
                          <option>Outros</option>
                        </select>
                      </div>
                      
                      <div className="md:col-span-4 space-y-2">
                        <label className="text-[8px] uppercase tracking-widest text-neutral-500 font-black ml-1">Descrição</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => handleUpdateDeduction(index, 'description', e.target.value)}
                          placeholder="Ex: Retrovisor direito"
                          className="w-full bg-neutral-800 border-none p-4 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A059] transition-all font-bold text-white text-xs"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[8px] uppercase tracking-widest text-neutral-500 font-black ml-1">Valor (R$)</label>
                        <input
                          type="number"
                          value={item.value}
                          onChange={e => handleUpdateDeduction(index, 'value', e.target.value)}
                          placeholder="0,00"
                          className="w-full bg-neutral-800 border-none p-4 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A059] transition-all font-bold text-white text-xs"
                        />
                      </div>

                      <div className="md:col-span-2 flex items-center gap-3 pb-3 px-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateDeduction(index, 'isProportional', !item.isProportional)}
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${item.isProportional ? 'bg-[#C5A059] border-[#C5A059] text-neutral-900' : 'bg-transparent border-white/10 text-neutral-500 hover:border-white/20'}`}
                        >
                          {item.isProportional ? <Check size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />}
                        </button>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-white uppercase">Proporcional</span>
                          <span className="text-[7px] font-bold text-neutral-500 uppercase tracking-tighter">Cálculo de vida útil</span>
                        </div>
                      </div>

                      <div className="md:col-span-1 flex justify-end pb-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveDeduction(index)}
                          className="text-red-500/50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {inspectionForm.deductions.length === 0 && (
                    <div className="py-12 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-neutral-500">
                      <ClipboardCheck size={32} strokeWidth={1} />
                      <p className="text-[10px] font-black uppercase tracking-widest">Nenhum desconto lançado</p>
                    </div>
                  )}
                </div>

                <div className="pt-8 border-t border-white/5 flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-[#C5A059]" />
                    <span className="text-[9px] text-neutral-500 font-bold uppercase italic">Valores serão debitados automaticamente do caução no fechamento.</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-1">Total de Descontos</p>
                    <h5 className="text-4xl font-black text-[#C5A059] tracking-tighter">
                      {totalDeductions.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h5>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Observações Técnicas</label>
              <textarea
                value={inspectionForm.observations}
                onChange={e => setInspectionForm({...inspectionForm, observations: e.target.value})}
                className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold min-h-[120px]"
                placeholder="Descreva aqui amassados, riscos ou observações mecânicas importantes..."
              />
            </div>

            <div className="flex justify-end gap-6 pt-8">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-10 py-5 text-[10px] uppercase tracking-[0.3em] font-black text-neutral-400 hover:text-neutral-900 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-12 py-5 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-[#C5A059] transition-all shadow-2xl shadow-neutral-900/10"
              >
                Salvar Vistoria
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const X = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

export default AdminVistoria;
