import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, ClipboardCheck, Trash2, Fuel, Gauge, Check, AlertTriangle, X, Loader2, ShieldCheck } from 'lucide-react';
import { compressImage } from '../../../../utils/imageCompression';
import { uploadFile } from '../../../../utils/supabaseStorage';
import { saveDraft, getDraft, clearDraft } from '../../../../utils/indexedDbHelper';

const INITIAL_FORM = {
  type: 'Entrega',
  vehiclePlate: '',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  km: '',
  fuelLevel: 'Cheio',
  tireCondition: 'Bom',
  externalCleanliness: 'Limpo',
  internalCleanliness: 'Limpo',
  lastOilChangeDate: '',
  lastOilChangeKm: '',
  nextOilChangeKm: '',
  photos: {},
  additionalPhotos: [],
  video: null,
  observations: '',
  hasDamages: false,
  damages: [],
  deductions: []
};

const InspectionForm = ({ vehicles = [], rentals = [], onAddInspection, onClose, pendingInspection, onClearPendingInspection }) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadingSlots, setUploadingSlots] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [savedDraft, setSavedDraft] = useState(null);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  const [inspectionForm, setInspectionForm] = useState({ ...INITIAL_FORM });

  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Autosave ref to debounce properly without re-renders
  const autosaveTimer = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (inspectionForm.vehiclePlate) {
      const v = vehicles.find(veh => veh.plate === inspectionForm.vehiclePlate);
      if (v) {
        const activeRental = rentals.find(r => (r.vehiclePlate || r.plate) === v.plate && r.status === 'Ativo');
        setVehicleSearchQuery(`${v.model} - ${v.plate}${activeRental ? ` (${activeRental.userName || activeRental.user})` : ''}`);
      } else {
        setVehicleSearchQuery(inspectionForm.vehiclePlate);
      }
    } else {
      setVehicleSearchQuery('');
    }
  }, [inspectionForm.vehiclePlate, vehicles, rentals]);

  useEffect(() => {
    if (pendingInspection) {
      setInspectionForm(prev => ({
        ...prev,
        ...pendingInspection,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }));
      onClearPendingInspection();
    }
  }, [pendingInspection, onClearPendingInspection]);

  // Check for saved draft on mount
  useEffect(() => {
    const checkDraft = async () => {
      try {
        const draft = await getDraft();
        if (draft) {
          setSavedDraft(draft);
          setShowDraftPrompt(true);
        }
      } catch (err) {
        console.error("Erro ao verificar rascunho:", err);
      }
    };
    checkDraft();
  }, []);

  // Autosave draft on form changes — 3s debounce via ref (no re-renders)
  useEffect(() => {
    if (!showDraftPrompt) {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(async () => {
        try {
          await saveDraft(inspectionForm);
        } catch (err) {
          console.error("Erro ao salvar rascunho:", err);
        }
      }, 3000);
      return () => {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      };
    }
  }, [inspectionForm, showDraftPrompt]);

  const handleRestoreDraft = () => {
    if (savedDraft) {
      setInspectionForm(savedDraft);
      setShowDraftPrompt(false);
      setSavedDraft(null);
    }
  };

  const handleDiscardDraft = async () => {
    try {
      await clearDraft();
    } catch (err) {
      console.error("Erro ao limpar rascunho:", err);
    }
    setShowDraftPrompt(false);
    setSavedDraft(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!inspectionForm.vehiclePlate) {
      alert('Por favor, selecione um veículo na lista para prosseguir.');
      return;
    }

    try {
      setIsSaving(true);
      const result = await onAddInspection({
        ...inspectionForm
      });
      
      if (result && result.success === false) {
        return;
      }
      
      try {
        await clearDraft();
      } catch (clearErr) {
        console.error("Erro ao limpar rascunho após envio:", clearErr);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
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

  const handleAddDamage = () => {
    setInspectionForm(prev => ({
      ...prev,
      damages: [...prev.damages, { id: Date.now(), photo: null, description: '' }]
    }));
  };

  const handleUpdateDamage = (id, field, value) => {
    setInspectionForm(prev => ({
      ...prev,
      damages: prev.damages.map(d => d.id === id ? { ...d, [field]: value } : d)
    }));
  };

  const handleRemoveDamage = (id) => {
    setInspectionForm(prev => {
      const dmg = prev.damages.find(d => d.id === id);
      if (dmg?.photo?.preview) URL.revokeObjectURL(dmg.photo.preview);
      return {
        ...prev,
        damages: prev.damages.filter(d => d.id !== id)
      };
    });
  };

  const handleAddAdditionalPhoto = async (file) => {
    if (!file) return;
    const tempId = `additional-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setInspectionForm(prev => ({
      ...prev,
      additionalPhotos: [...(prev.additionalPhotos || []), { id: tempId, preview: null, file: null, uploading: true }]
    }));
    setUploadingSlots(prev => ({ ...prev, [tempId]: true }));
    try {
      const compressed = await compressImage(file);
      const plate = inspectionForm.vehiclePlate || 'temp';
      const url = await uploadFile(compressed, `vistorias/${plate}/adicionais`);
      setInspectionForm(prev => ({
        ...prev,
        additionalPhotos: (prev.additionalPhotos || []).map(p =>
          p.id === tempId ? { id: tempId, preview: url, file: null, uploading: false } : p
        )
      }));
    } catch (err) {
      console.error("Upload failed for additional photo:", err);
      try {
        const compressed = await compressImage(file);
        const blobUrl = URL.createObjectURL(compressed);
        setInspectionForm(prev => ({
          ...prev,
          additionalPhotos: (prev.additionalPhotos || []).map(p =>
            p.id === tempId ? { id: tempId, preview: blobUrl, file: compressed, uploading: false } : p
          )
        }));
      } catch {
        setInspectionForm(prev => ({
          ...prev,
          additionalPhotos: (prev.additionalPhotos || []).filter(p => p.id !== tempId)
        }));
      }
    } finally {
      setUploadingSlots(prev => ({ ...prev, [tempId]: false }));
    }
  };

  const handleRemoveAdditionalPhoto = (id) => {
    setInspectionForm(prev => {
      const photo = (prev.additionalPhotos || []).find(p => p.id === id);
      if (photo?.preview) URL.revokeObjectURL(photo.preview);
      return {
        ...prev,
        additionalPhotos: (prev.additionalPhotos || []).filter(p => p.id !== id)
      };
    });
  };

  const totalDeductions = inspectionForm.deductions.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);

  return (
    <>
      <div className="bg-[#0a0a0a] rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-12 border border-neutral-800 shadow-xl max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6 md:mb-12">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 bg-[#D4AF37] rounded-2xl flex items-center justify-center text-neutral-950 shadow-lg shrink-0">
              <ClipboardCheck size={24} />
            </div>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-[#D4AF37]">Registrar Nova Vistoria</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-2">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Tipo de Vistoria</label>
              <select
                value={inspectionForm.type}
                onChange={e => setInspectionForm({...inspectionForm, type: e.target.value})}
                className="w-full bg-black border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-white"
              >
                <option>Coleta</option>
                <option>Entrega</option>
                <option>Periódica</option>
                <option>Devolução</option>
              </select>
            </div>

            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Veículo (Placa)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Digite para buscar veículo ou placa..."
                  value={vehicleSearchQuery}
                  onChange={e => {
                    setVehicleSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                    if (!e.target.value) {
                      setInspectionForm(prev => ({ ...prev, vehiclePlate: '' }));
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full bg-black border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm text-white"
                />
                <input type="hidden" name="vehiclePlate" value={inspectionForm.vehiclePlate} required />
                {inspectionForm.vehiclePlate && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectionForm(prev => ({ ...prev, vehiclePlate: '' }));
                      setVehicleSearchQuery('');
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {isDropdownOpen && (
                <div className="absolute z-[200] left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-[#0a0a0a] border border-neutral-800 rounded-2xl shadow-2xl p-2 space-y-1">
                  {(() => {
                    const query = vehicleSearchQuery.toLowerCase().trim();
                    const selectedLabel = (() => {
                      const selectedV = vehicles.find(veh => veh.plate === inspectionForm.vehiclePlate);
                      if (!selectedV) return '';
                      const activeRental = rentals.find(r => (r.vehiclePlate || r.plate) === selectedV.plate && r.status === 'Ativo');
                      return `${selectedV.model} - ${selectedV.plate}${activeRental ? ` (${activeRental.userName || activeRental.user})` : ''}`.toLowerCase();
                    })();

                    const filtered = vehicles.filter(v => {
                      if (!query || query === selectedLabel) return true;
                      const activeRental = rentals.find(r => (r.vehiclePlate || r.plate) === v.plate && r.status === 'Ativo');
                      const conductorName = activeRental ? (activeRental.userName || activeRental.user || '') : '';
                      const cleanSearch = query.toLowerCase().replace(/[^a-z0-9]/g, '');
                      const cleanPlate = (v.plate || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
                      const searchStr = `${v.model} ${conductorName}`.toLowerCase();
                      return searchStr.includes(query.toLowerCase()) || cleanPlate.includes(cleanSearch);
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-4 text-center text-xs text-neutral-400 font-bold uppercase">
                          Nenhum veículo encontrado
                        </div>
                      );
                    }

                    return filtered.map(v => {
                      const activeRental = rentals.find(r => (r.vehiclePlate || r.plate) === v.plate && r.status === 'Ativo');
                      const isSelected = inspectionForm.vehiclePlate === v.plate;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setInspectionForm(prev => ({ ...prev, vehiclePlate: v.plate }));
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex flex-col items-start p-3 rounded-xl transition-all text-left ${isSelected ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'hover:bg-black text-neutral-200'}`}
                        >
                          <span className="text-xs font-black uppercase">{v.model} - {v.plate}</span>
                          {activeRental && (
                            <span className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">Locador: {activeRental.userName || activeRental.user}</span>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Data</label>
              <input
                type="date"
                value={inspectionForm.date}
                onChange={e => setInspectionForm({...inspectionForm, date: e.target.value})}
                className="w-full bg-black border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-white"
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
                  className="w-full bg-black border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-white"
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
                  className="w-full bg-black border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-white"
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
                className="w-full bg-black border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-white"
              >
                <option>Novo</option>
                <option>Bom</option>
                <option>Regular</option>
                <option>Troca Próxima</option>
              </select>
            </div>
          </div>

          {/* Seção de Limpeza e Óleo */}
          <div className="space-y-6 p-4 sm:p-6 md:p-10 bg-[#111111] rounded-2xl md:rounded-3xl border border-neutral-800">
            <div className="flex items-center gap-3 md:gap-4 mb-2">
              <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-[#D4AF37] shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-lg font-black text-white uppercase tracking-tighter">Limpeza & Manutenção</h4>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">Estado de limpeza e controle de troca de óleo</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Limpeza Externa</label>
                <div className="grid grid-cols-3 md:flex gap-2">
                  {['Limpo', 'Aceitável', 'Sujo'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setInspectionForm(prev => ({ ...prev, externalCleanliness: opt }))}
                      className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        inspectionForm.externalCleanliness === opt
                          ? opt === 'Limpo' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200'
                            : opt === 'Aceitável' ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200'
                            : 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200'
                          : 'bg-[#0a0a0a] text-neutral-400 border-neutral-800 hover:border-neutral-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Limpeza Interna</label>
                <div className="grid grid-cols-2 md:flex gap-2">
                  {['Limpo', 'Aceitável', 'Sujo', 'Necessita Higienização'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setInspectionForm(prev => ({ ...prev, internalCleanliness: opt }))}
                      className={`flex-1 py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                        inspectionForm.internalCleanliness === opt
                          ? opt === 'Limpo' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200'
                            : opt === 'Aceitável' ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200'
                            : opt === 'Sujo' ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200'
                            : 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-200'
                          : 'bg-[#0a0a0a] text-neutral-400 border-neutral-800 hover:border-neutral-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-800 pt-6">
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1 mb-4">Controle de Troca de Óleo</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Última Troca (Data)</label>
                  <input
                    type="date"
                    value={inspectionForm.lastOilChangeDate}
                    onChange={e => setInspectionForm(prev => ({ ...prev, lastOilChangeDate: e.target.value }))}
                    className="w-full bg-[#0a0a0a] text-white border border-neutral-800 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Última Troca (KM)</label>
                  <div className="relative">
                    <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300" size={16} />
                    <input
                      type="number"
                      value={inspectionForm.lastOilChangeKm}
                      onChange={e => setInspectionForm(prev => ({ ...prev, lastOilChangeKm: e.target.value }))}
                      placeholder="Ex: 45.000"
                      className="w-full bg-[#0a0a0a] text-white border border-neutral-800 p-4 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Próxima Troca (KM Previsto)</label>
                  <div className="relative">
                    <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300" size={16} />
                    <input
                      type="number"
                      value={inspectionForm.nextOilChangeKm}
                      onChange={e => setInspectionForm(prev => ({ ...prev, nextOilChangeKm: e.target.value }))}
                      placeholder="Ex: 50.000"
                      className="w-full bg-[#0a0a0a] text-white border border-neutral-800 p-4 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm"
                    />
                  </div>
                  {inspectionForm.nextOilChangeKm && inspectionForm.km && parseInt(inspectionForm.km) >= parseInt(inspectionForm.nextOilChangeKm) && (
                    <div className="flex items-center gap-2 mt-1 text-red-500">
                      <AlertTriangle size={12} />
                      <span className="text-[9px] font-black uppercase">KM atual já atingiu ou ultrapassou a próxima troca!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Galeria Técnica (Fotos Obrigatórias)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {[
                { id: 'front', label: 'Frente Completa' },
                { id: 'rear', label: 'Traseira Completa' },
                { id: 'sideRightFront', label: 'Lat. Dir. Dianteira' },
                { id: 'sideLeftFront', label: 'Lat. Esq. Dianteira' },
                { id: 'sideRightRear', label: 'Lat. Dir. Traseira' },
                { id: 'sideLeftRear', label: 'Lat. Esq. Traseira' },
                { id: 'plate', label: 'Placa do Veículo' },
                { id: 'odometer', label: 'Hodômetro (KM)' },
                { id: 'dashboard', label: 'Painel Ligado' },
                { id: 'interior1', label: 'Interior 1' },
                { id: 'interior2', label: 'Interior 2' },
                { id: 'tools', label: 'Triang/Mac/Chave' },
              ].map((slot) => (
                <div key={slot.id} className="space-y-2">
                  <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest text-center">{slot.label}</p>
                  <label className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden relative group ${
                      uploadingSlots[slot.id] ? 'border-[#D4AF37]/50 bg-amber-500/10 cursor-not-allowed' :
                      inspectionForm.photos[slot.id] ? 'border-emerald-500 bg-emerald-500/10' : 
                      'border-neutral-800 hover:border-[#D4AF37]/30 hover:bg-black'
                    }`}>
                    {uploadingSlots[slot.id] ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={20} className="text-[#D4AF37] animate-spin" />
                        <span className="text-[6px] font-black uppercase tracking-widest text-[#D4AF37]">Enviando...</span>
                      </div>
                    ) : inspectionForm.photos[slot.id] ? (
                      <>
                        <img src={inspectionForm.photos[slot.id].preview} loading="lazy" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-[8px] font-black uppercase tracking-widest">Trocar</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Camera size={20} className="text-neutral-300 group-hover:text-[#D4AF37]" />
                        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">Anexar</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden text-white"
                      disabled={!!uploadingSlots[slot.id]} 
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setUploadingSlots(prev => ({ ...prev, [slot.id]: true }));
                        const oldPreview = inspectionForm.photos[slot.id]?.preview;
                        if (oldPreview && oldPreview.startsWith('blob:')) {
                          URL.revokeObjectURL(oldPreview);
                        }
                        try {
                          const compressed = await compressImage(file);
                          const plate = inspectionForm.vehiclePlate || 'temp';
                          const url = await uploadFile(compressed, `vistorias/${plate}`);
                          setInspectionForm(prev => ({
                            ...prev,
                            photos: {
                              ...prev.photos,
                              [slot.id]: { file: null, preview: url }
                            }
                          }));
                        } catch (err) {
                          console.error("Upload failed for slot", slot.id, err);
                          try {
                            const compressed = await compressImage(file);
                            setInspectionForm(prev => ({
                              ...prev,
                              photos: {
                                ...prev.photos,
                                [slot.id]: { file: compressed, preview: URL.createObjectURL(compressed) }
                              }
                            }));
                          } catch {
                            setInspectionForm(prev => ({
                              ...prev,
                              photos: {
                                ...prev.photos,
                                [slot.id]: { file, preview: URL.createObjectURL(file) }
                              }
                            }));
                          }
                        } finally {
                          setUploadingSlots(prev => ({ ...prev, [slot.id]: false }));
                        }
                      }} 
                    />
                    {uploadingSlots[slot.id] && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10 rounded-2xl">
                        <Loader2 size={16} className="text-[#D4AF37] animate-spin" />
                        <span className="text-[6px] font-black uppercase tracking-widest text-[#D4AF37]">Enviando...</span>
                      </div>
                    )}
                  </label>
                </div>
              ))}

              {/* Video Slot */}
              <div className="space-y-2">
                <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest text-center">Vídeo Adicional</p>
                <label className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden relative group ${inspectionForm.video ? 'border-emerald-500 bg-emerald-500/10' : 'border-neutral-800 hover:border-[#D4AF37]/30 hover:bg-black'}`}>
                  {inspectionForm.video ? (
                    <div className="flex flex-col items-center gap-1 text-emerald-600">
                      <Check size={20} />
                      <span className="text-[7px] font-black uppercase tracking-widest">Vídeo OK</span>
                    </div>
                  ) : (
                    <>
                      <Plus size={20} className="text-neutral-300 group-hover:text-[#D4AF37]" />
                      <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">Anexar Vídeo</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="video/*" 
                    capture="environment"
                    className="hidden text-white" 
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

          {/* Fotos Adicionais Section */}
          <div className="space-y-6">
            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Fotos Adicionais (Opcional)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {(inspectionForm.additionalPhotos || []).map((photoObj) => (
                <div key={photoObj.id} className="space-y-2 relative group">
                  <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest text-center">Adicional</p>
                  <div className="aspect-square rounded-2xl border border-neutral-800 overflow-hidden relative bg-black shadow-inner flex items-center justify-center">
                    {photoObj.uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={20} className="text-[#D4AF37] animate-spin" />
                        <span className="text-[7px] font-black uppercase tracking-widest text-[#D4AF37]">Enviando...</span>
                      </div>
                    ) : (
                      <>
                        <img src={photoObj.preview} loading="lazy" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveAdditionalPhoto(photoObj.id)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div className="space-y-2">
                <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest text-center">Adicionar Foto</p>
                <label className="aspect-square rounded-2xl border-2 border-dashed border-neutral-800 hover:border-[#D4AF37]/30 hover:bg-black flex flex-col items-center justify-center gap-2 cursor-pointer transition-all relative">
                  {isCompressing ? (
                    <>
                      <Loader2 size={20} className="text-[#D4AF37] animate-spin" />
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#D4AF37]">Processando...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={20} className="text-neutral-300 hover:text-[#D4AF37]" />
                      <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">Anexar</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden text-white"
                    disabled={isCompressing}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleAddAdditionalPhoto(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {inspectionForm.type === 'Devolução' && (
            <div className="space-y-6 md:space-y-8 p-4 sm:p-6 md:p-10 bg-neutral-900 rounded-2xl md:rounded-3xl border border-[#D4AF37]/20 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 blur-3xl -mr-32 -mt-32" />
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] shrink-0">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white uppercase tracking-tighter">Itens a pagar</h4>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Lançamento de avarias e manutenções de devolução</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddDeduction}
                  className="w-full sm:w-auto bg-[#D4AF37] text-white px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black hover:bg-[#0a0a0a] transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Adicionar Item
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                {inspectionForm.deductions.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-2xl border border-white/5 items-end group">
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[8px] uppercase tracking-widest text-neutral-500 font-black ml-1">Categoria</label>
                      <select
                        value={item.category}
                        onChange={e => handleUpdateDeduction(index, 'category', e.target.value)}
                        className="w-full bg-neutral-800 border-none p-4 rounded-xl outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all font-bold text-white text-xs"
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
                        className="w-full bg-neutral-800 border-none p-4 rounded-xl outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all font-bold text-white text-xs"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[8px] uppercase tracking-widest text-neutral-500 font-black ml-1">Valor (R$)</label>
                      <input
                        type="number"
                        value={item.value}
                        onChange={e => handleUpdateDeduction(index, 'value', e.target.value)}
                        placeholder="0,00"
                        className="w-full bg-neutral-800 border-none p-4 rounded-xl outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all font-bold text-white text-xs"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-3 md:pb-3 px-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateDeduction(index, 'isProportional', !item.isProportional)}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${item.isProportional ? 'bg-[#D4AF37] border-[#D4AF37] text-white' : 'bg-transparent border-white/10 text-neutral-500 hover:border-white/20'}`}
                      >
                        {item.isProportional ? <Check size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />}
                      </button>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-white uppercase">Proporcional</span>
                        <span className="text-[7px] font-bold text-neutral-500 uppercase tracking-tighter">Cálculo de vida útil</span>
                      </div>
                    </div>

                    <div className="md:col-span-1 flex justify-end md:pb-3">
                      <button 
                        type="button"
                        onClick={() => handleRemoveDeduction(index)}
                        className="text-red-500/50 hover:text-red-500 transition-colors p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                {inspectionForm.deductions.length === 0 && (
                  <div className="py-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-4 text-neutral-500">
                    <ClipboardCheck size={32} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum desconto lançado</p>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-white/5 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-6 relative z-10">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <AlertTriangle size={14} className="text-[#D4AF37] shrink-0" />
                  <span className="text-[9px] text-neutral-500 font-bold uppercase italic">Valores serão debitados automaticamente do caução no fechamento.</span>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mb-1">Total de Descontos</p>
                  <h5 className="text-3xl sm:text-4xl font-black text-[#D4AF37] tracking-tighter">
                    {totalDeductions.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </h5>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6 md:space-y-8 p-4 sm:p-6 md:p-10 bg-black rounded-2xl md:rounded-3xl border border-neutral-800">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div className="flex items-center gap-3 md:gap-4">
                 <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#D4AF37] shrink-0">
                   <AlertTriangle size={24} />
                 </div>
                 <div>
                   <h4 className="text-xl font-black text-white uppercase tracking-tighter">Existem Avarias?</h4>
                   <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Registre danos específicos no veículo</p>
                 </div>
               </div>
               <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-neutral-800 w-full sm:w-auto justify-between sm:justify-start">
                 <button type="button" onClick={() => setInspectionForm({...inspectionForm, hasDamages: true})} className={`flex-1 sm:flex-initial px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${inspectionForm.hasDamages ? 'bg-red-500 text-white shadow-lg' : 'text-neutral-400'}`}>Sim</button>
                 <button type="button" onClick={() => setInspectionForm({...inspectionForm, hasDamages: false, damages: []})} className={`flex-1 sm:flex-initial px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${!inspectionForm.hasDamages ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400'}`}>Não</button>
               </div>
             </div>

             {inspectionForm.hasDamages && (
               <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {inspectionForm.damages.map((dmg) => (
                      <div key={dmg.id} className="bg-[#0a0a0a] p-4 md:p-6 rounded-2xl md:rounded-2xl border border-neutral-800 shadow-sm space-y-4">
                         <div className="flex justify-between items-start">
                            <label className={`w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden relative ${dmg.photo ? 'border-emerald-500 bg-emerald-500/10' : 'border-neutral-800 hover:border-[#D4AF37]/30'}`}>
                              {dmg.photo ? (
                                <img src={dmg.photo.preview} loading="lazy" className="w-full h-full object-cover" />
                              ) : (
                                <Camera size={20} className="text-neutral-300" />
                              )}
                              <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment"
                                className="hidden text-white" 
                                onChange={async (e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  const slotKey = `damage-${dmg.id}`;
                                  setUploadingSlots(prev => ({ ...prev, [slotKey]: true }));
                                  if (dmg.photo?.preview && dmg.photo.preview.startsWith('blob:')) {
                                    URL.revokeObjectURL(dmg.photo.preview);
                                  }
                                  try {
                                    const compressed = await compressImage(file);
                                    const plate = inspectionForm.vehiclePlate || 'temp';
                                    const url = await uploadFile(compressed, `vistorias/${plate}/avarias`);
                                    handleUpdateDamage(dmg.id, 'photo', { file: null, preview: url });
                                  } catch (err) {
                                    console.error("Upload failed for damage photo:", err);
                                    try {
                                      const compressed = await compressImage(file);
                                      handleUpdateDamage(dmg.id, 'photo', { file: compressed, preview: URL.createObjectURL(compressed) });
                                    } catch {
                                      handleUpdateDamage(dmg.id, 'photo', { file, preview: URL.createObjectURL(file) });
                                    }
                                  } finally {
                                    setUploadingSlots(prev => ({ ...prev, [slotKey]: false }));
                                  }
                                }} 
                              />
                            </label>
                            <button type="button" onClick={() => handleRemoveDamage(dmg.id)} className="text-neutral-300 hover:text-red-500 transition-colors">
                              <X size={18} />
                            </button>
                         </div>
                         <textarea 
                           placeholder="Descreva a avaria..."
                           value={dmg.description}
                           onChange={(e) => handleUpdateDamage(dmg.id, 'description', e.target.value)}
                           className="w-full bg-black border-none p-4 rounded-xl outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all font-bold text-xs min-h-[80px] text-white"
                         />
                      </div>
                    ))}
                    <button 
                      type="button" 
                      onClick={handleAddDamage}
                      className="border-2 border-dashed border-neutral-700 rounded-2xl md:rounded-2xl flex flex-col items-center justify-center gap-3 text-neutral-400 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all p-6 md:p-8"
                    >
                      <Plus size={24} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Foto de Avaria</span>
                    </button>
                  </div>
               </div>
             )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Observações Técnicas</label>
            <textarea
              value={inspectionForm.observations}
              onChange={e => setInspectionForm({...inspectionForm, observations: e.target.value})}
              className="w-full bg-black border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold min-h-[120px] text-white"
              placeholder="Descreva aqui amassados, riscos ou observações mecânicas importantes..."
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-10 py-4 text-[10px] uppercase tracking-[0.3em] font-black text-neutral-400 hover:text-white transition-all flex items-center justify-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`w-full sm:w-auto px-12 py-4 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl transition-all shadow-2xl shadow-neutral-900/10 flex items-center justify-center gap-3 ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#D4AF37]'}`}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando Dossiê...
                </>
              ) : (
                'Salvar Vistoria'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Draft Recovery Modal */}
      {showDraftPrompt && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center gap-4 mb-8">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Rascunho Encontrado</h3>
                <p className="text-xs text-neutral-400 font-bold uppercase mt-1">
                  Você tem um rascunho de vistoria pendente. Deseja restaurar as fotos e informações?
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleRestoreDraft}
                className="w-full py-4 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#D4AF37] transition-all shadow-lg flex items-center justify-center gap-2 font-bold"
              >
                Restaurar Rascunho
              </button>
              <button 
                onClick={handleDiscardDraft}
                className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-xl transition-colors font-bold"
              >
                Descartar Rascunho
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InspectionForm;
