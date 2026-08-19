import React, { useState, useEffect } from 'react';
import { Plus, Search, Wrench, Car, X, Check, Printer, Package, User, ChevronDown, Eye, Clock, CheckCircle2, AlertTriangle, Trash2, Pencil } from 'lucide-react';
import { parseCurrency } from '../../../utils/currencyUtils';
import AdminSuccessModal from '../modals/AdminSuccessModal';

const parseBrValue = (val) => {
  return parseCurrency(val);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '---';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return formatDate(dateStr);
    return d.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return formatDate(dateStr);
  }
};

const EMPTY_FORM = {
  plate: '', model: '', km: '', date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
  description: '', parts: [{ name: '', qty: 1, unitValue: '' }],
  laborValue: '', responsible: 'Administradora', provider: '', observations: '', status: 'Aberta', vehicleId: ''
};

const AdminOficina = ({ 
  vehicles = [], 
  investors = [], 
  rentals = [],
  replacementContracts = [],
  onAddMaintenance, 
  onCloseServiceOrder, 
  onUpdateServiceOrder,
  onDeleteServiceOrder,
  onCloseReplacementContract,
  onOpenCarroReserva,
  setItemToDelete,
  setDeleteType,
  setShowDeleteAuthModal,
  serviceOrders = [] 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [viewingOS, setViewingOS] = useState(null);
  const [editingOS, setEditingOS] = useState(null);
  const [closingOS, setClosingOS] = useState(null);
  const [closingRC, setClosingRC] = useState(null);
  const [closeDate, setCloseDate] = useState(new Date().toISOString().split('T')[0]);

  const [plateSearch, setPlateSearch] = useState('');
  const [showPlateDropdown, setShowPlateDropdown] = useState(false);
  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    if (form.plate) {
      const v = vehicles.find(v => v.plate === form.plate);
      if (v) {
        setForm(prev => {
          if (editingOS) return prev;
          return { 
            ...prev, 
            model: v.model, 
            vehicleId: v.id, 
            responsible: prev.responsible || 'Administradora',
            km: prev.km || v.km || '',
            vehicleDescription: v.description
          };
        });
      }
      
    } else {
      setForm(prev => ({ ...prev, vehicleDescription: '' }));
    }
  }, [form.plate, vehicles, rentals, editingOS]);

  // Opções de responsável: somente investidor do veículo selecionado + Administradora
  const selectedVehicle = vehicles.find(v => v.plate === form.plate);
  const responsibleOptions = ['Administradora', ...(selectedVehicle?.investor ? [selectedVehicle.investor] : [])];

  const partsTotal = form.parts.reduce((acc, p) => acc + (parseBrValue(p.unitValue) * (parseInt(p.qty) || 0)), 0);
  const totalOS = partsTotal + parseBrValue(form.laborValue);

  const addPart = () => setForm(prev => ({ ...prev, parts: [...prev.parts, { name: '', qty: 1, unitValue: '' }] }));
  const removePart = (i) => setForm(prev => ({ ...prev, parts: prev.parts.filter((_, idx) => idx !== i) }));
  const updatePart = (i, field, val) => setForm(prev => {
    const parts = [...prev.parts];
    parts[i][field] = val;
    return { ...prev, parts };
  });

  const handleEditOS = (os) => {
    setEditingOS(os);
    setForm({
      ...os,
      parts: os.parts && os.parts.length > 0 ? os.parts : [{ name: '', qty: 1, unitValue: '' }]
    });
    setViewingOS(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingOS) {
      const os = { ...form, total: totalOS };
      const res = await onUpdateServiceOrder(os, null);
      setEditingOS(null);
      setShowForm(false);
      setForm(EMPTY_FORM);
      if (res && res.message) {
        setSuccessModal({ show: true, type: res.success ? 'success' : 'warning', title: res.success ? 'Sucesso' : 'Atenção', message: res.message });
      }
    } else {
      const os = { ...form, openedAt: new Date().toISOString(), total: totalOS };
      onCloseServiceOrder(os, 'open', null, null, form.date);
    }
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const handleCloseOS = (os, selectedDate) => {
    onCloseServiceOrder(os, 'close', null, selectedDate);
    setViewingOS(null);
  };

  const filtered = serviceOrders.filter(os => {
    if (!search) return true;
    const term = search.toLowerCase();
    const cleanTerm = term.replace(/[^a-z0-9]/g, '');
    const cleanPlate = (os.plate || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    return (
      cleanPlate.includes(cleanTerm) ||
      (os.model || '').toLowerCase().includes(term) ||
      (os.description || '').toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt || a.openedAt || a.date || 0);
    const dateB = new Date(b.createdAt || b.openedAt || b.date || 0);
    return dateB - dateA;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-4xl font-black uppercase tracking-tighter">Oficina</h3>
          <p className="text-neutral-400 text-sm font-light mt-1">Ordens de Serviço integradas à frota e ao portal do investidor.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-3 bg-neutral-900 text-white px-8 py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] font-black hover:bg-[#C5A059] transition-all shadow-xl">
          <Plus size={16} /> Abrir O.S.
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total de O.S.', value: serviceOrders.length, color: 'neutral' },
          { label: 'Em Aberto', value: serviceOrders.filter(o => o.status === 'Aberta').length, color: 'amber' },
          { label: 'Concluídas', value: serviceOrders.filter(o => o.status === 'Concluída').length, color: 'emerald' },
          { label: 'Custo Total', value: serviceOrders.reduce((a, o) => a + (o.total || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'gold' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm">
            <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-2">{card.label}</p>
            <p className={`text-2xl font-black ${card.color === 'amber' ? 'text-amber-600' : card.color === 'emerald' ? 'text-emerald-600' : card.color === 'gold' ? 'text-[#C5A059]' : 'text-neutral-900'}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-xl">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por placa, modelo ou serviço..." className="w-full bg-white border border-neutral-100 p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-light shadow-sm" />
      </div>

      <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/50">
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Nº</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Responsável / Cliente</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Veículo</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Status</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Valor</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Data</th>
                <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest text-neutral-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-20 bg-neutral-50">
                    <Wrench size={32} className="mx-auto text-neutral-200 mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">Nenhuma O.S. encontrada</p>
                  </td>
                </tr>
              ) : (
                filtered.map(os => {
                  const activeRental = rentals.find(r => r.plate === os.plate && r.status === 'Ativo');
                  const clientName = activeRental ? (activeRental.user || activeRental.nome) : os.responsible;

                  return (
                    <tr 
                      key={os.id} 
                      className="hover:bg-neutral-50 transition-colors group cursor-pointer"
                      onClick={() => setViewingOS(os)}
                    >
                      <td className="py-4 px-6 text-sm font-medium text-neutral-500">
                        #{String(os.id).slice(-5)}
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-neutral-800">
                        {clientName}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-neutral-600">
                        {os.plate} {os.model}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${os.status === 'Concluída' || os.status === 'Entregue' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {os.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-neutral-600">
                        {(os.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="mb-2">
                          <p className="text-[9px] uppercase tracking-widest font-black text-neutral-400 mb-0.5">Data da O.S.:</p>
                          <p className="text-sm font-bold text-neutral-700">{formatDate(os.date)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest font-black text-neutral-400 mb-0.5">Adicionado em:</p>
                          <p className="text-xs font-bold text-neutral-500">{formatDateTime(os.createdAt || os.openedAt || os.date)}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center items-center gap-3">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingOS(os);
                            }}
                            className="text-neutral-400 hover:text-neutral-900 transition-colors"
                            title="Ver Detalhes"
                          >
                            <Eye size={16} />
                          </button>
                          {os.status === 'Aberta' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditOS(os);
                              }}
                              className="text-neutral-400 hover:text-[#C5A059] transition-colors"
                              title="Editar O.S."
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (setItemToDelete && setDeleteType && setShowDeleteAuthModal) {
                                setItemToDelete(os);
                                setDeleteType('service_order');
                                setShowDeleteAuthModal(true);
                              } else {
                                if (window.confirm(`Deseja realmente excluir permanentemente a O.S. do veículo ${os.plate || 'desconhecido'}?`)) {
                                  onDeleteServiceOrder(os.id);
                                }
                              }
                            }} 
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Excluir O.S."
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingOS(null); setForm(EMPTY_FORM); }} />
          <div className="bg-white w-full max-w-3xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
            <div className="p-6 md:p-8 border-b border-neutral-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059]"><Wrench size={22} /></div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tighter">{editingOS ? 'Editar Ordem de Serviço' : 'Abrir Ordem de Serviço'}</h4>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Oficina integrada à frota</p>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); setEditingOS(null); setForm(EMPTY_FORM); }} className="text-neutral-300 hover:text-neutral-900 transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <form onSubmit={handleSubmit} id="os-form" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 relative">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Veículo (Placa) *</label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled={!!editingOS}
                        value={showPlateDropdown ? plateSearch : (form.plate || '')}
                        onChange={(e) => {
                          setPlateSearch(e.target.value.toUpperCase());
                          setForm({ ...form, plate: '' });
                          setShowPlateDropdown(true);
                        }}
                        onFocus={() => {
                          if (!editingOS) {
                            setPlateSearch(form.plate || '');
                            setShowPlateDropdown(true);
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowPlateDropdown(false), 200)}
                        placeholder="Digite a placa ou modelo..."
                        className="w-full bg-neutral-50 p-4 pr-10 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-bold text-sm disabled:opacity-50 relative z-0"
                      />
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300 pointer-events-none z-10" />
                      
                      {showPlateDropdown && !editingOS && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-100 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
                          {vehicles
                            .filter(v => (v.plate || '').toUpperCase().includes(plateSearch.toUpperCase()) || (v.model || '').toUpperCase().includes(plateSearch.toUpperCase()))
                            .map(v => (
                              <div
                                key={v.id}
                                className="p-4 hover:bg-neutral-50 cursor-pointer text-sm font-bold border-b border-neutral-50 last:border-0 transition-colors"
                                onClick={() => {
                                  setForm({ ...form, plate: v.plate });
                                  setPlateSearch('');
                                  setShowPlateDropdown(false);
                                }}
                              >
                                {v.plate} - <span className="font-medium text-neutral-500">{v.model}</span>
                              </div>
                          ))}
                          {vehicles.filter(v => (v.plate || '').toUpperCase().includes(plateSearch.toUpperCase()) || (v.model || '').toUpperCase().includes(plateSearch.toUpperCase())).length === 0 && (
                            <div className="p-4 text-sm text-neutral-400 text-center">Nenhum veículo encontrado</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Modelo (Auto)</label>
                    <input type="text" readOnly value={form.model} className="w-full bg-neutral-100 p-4 rounded-xl font-bold text-sm text-neutral-500" placeholder="Selecionado automaticamente" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">KM na Abertura</label>
                    <input type="number" value={form.km} onChange={e => setForm({ ...form, km: e.target.value })} placeholder="Ex: 35000" className="w-full bg-neutral-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-bold text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Data</label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-neutral-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-bold text-sm" />
                  </div>
                </div>

                {form.vehicleDescription && (
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-[#C5A059] font-black ml-1">Observações do Veículo</label>
                    <div className="w-full bg-[#C5A059]/10 text-neutral-700 border border-[#C5A059]/20 p-4 rounded-xl font-medium text-xs whitespace-pre-line leading-relaxed">
                      {form.vehicleDescription}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Descrição do Serviço</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descreva o serviço a ser realizado..." rows={3} className="w-full bg-neutral-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-medium text-sm" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Peças Utilizadas</label>
                    <button type="button" onClick={addPart} className="text-[8px] font-black uppercase text-[#C5A059] hover:underline flex items-center gap-1"><Plus size={10} /> Adicionar Peça</button>
                  </div>
                  <div className="space-y-3">
                    {form.parts.map((part, i) => (
                      <div key={i} className="grid grid-cols-12 gap-3 items-center bg-neutral-50 p-4 rounded-xl">
                        <input type="text" value={part.name} onChange={e => updatePart(i, 'name', e.target.value)} placeholder="Nome da peça" className="col-span-12 sm:col-span-6 bg-white p-3 rounded-lg outline-none text-xs font-bold border border-neutral-100" />
                        <input type="number" value={part.qty} onChange={e => updatePart(i, 'qty', e.target.value)} placeholder="Qtd" min={1} className="col-span-4 sm:col-span-2 bg-white p-3 rounded-lg outline-none text-xs font-bold border border-neutral-100 text-center" />
                        <input 
                          type="text" 
                          value={part.unitValue} 
                          onChange={e => {
                            let v = e.target.value.replace(/\D/g, '');
                            v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            updatePart(i, 'unitValue', v);
                          }} 
                          placeholder="Valor unit." 
                          className="col-span-6 sm:col-span-3 bg-white p-3 rounded-lg outline-none text-xs font-bold border border-neutral-100" 
                        />
                        <button type="button" onClick={() => removePart(i)} className="col-span-2 sm:col-span-1 text-neutral-300 hover:text-red-500 transition-colors flex justify-center items-center h-10 sm:h-auto"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Mão de Obra (R$)</label>
                    <input 
                      type="text" 
                      value={form.laborValue} 
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, '');
                        v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        setForm({ ...form, laborValue: v });
                      }} 
                      placeholder="0,00" 
                      className="w-full bg-neutral-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-bold text-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Prestador / Oficina</label>
                    <input type="text" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="Nome da oficina ou mecânico" className="w-full bg-neutral-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-bold text-sm" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Responsável pelo Pagamento</label>
                  {!form.plate && (
                    <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest pl-1">Selecione um veículo para ver as opções</p>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    {responsibleOptions.map(name => (
                      <button key={name} type="button" onClick={() => setForm({ ...form, responsible: name })}
                        className={`flex-1 min-w-[140px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${form.responsible === name ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-neutral-50 text-neutral-400 border-neutral-100 hover:border-neutral-200'}`}>
                        {name}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-neutral-400 font-medium leading-relaxed mt-2 pl-1">
                    * <strong>Administradora:</strong> O custo é pago pela locadora e não afeta o faturamento/repasse do investidor.<br />
                    * <strong>Investidor:</strong> O custo da manutenção é descontado do saldo e dos repasses do investidor (proprietário do veículo).
                  </p>
                </div>



                <div className="p-6 bg-neutral-900 rounded-2xl flex justify-between items-center">
                  <p className="text-[9px] font-black text-neutral-400 uppercase">Total estimado da O.S.</p>
                  <p className="text-2xl font-black text-[#C5A059]">{totalOS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </form>
            </div>

            <div className="p-6 md:p-8 border-t border-neutral-50 bg-neutral-50/30 flex justify-end gap-4 shrink-0">
              <button type="button" onClick={() => { setShowForm(false); setEditingOS(null); setForm(EMPTY_FORM); }} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-all">Cancelar</button>
              <button form="os-form" type="submit" className="px-12 py-4 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#C5A059] transition-all shadow-xl">
                {editingOS ? 'Salvar Alterações' : 'Abrir O.S.'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingOS && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm" onClick={() => setViewingOS(null)} />
          <div className="bg-white w-full max-w-3xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
            <div className="p-6 md:p-8 border-b border-neutral-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${viewingOS.status === 'Concluída' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {viewingOS.status === 'Concluída' ? <CheckCircle2 size={22} /> : <Clock size={22} />}
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tighter">O.S. #{viewingOS.id?.toString().slice(-6)}</h4>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">{viewingOS.plate} — {viewingOS.model}</p>
                </div>
              </div>
              <button onClick={() => setViewingOS(null)} className="text-neutral-300 hover:text-neutral-900 print:hidden"><X size={24} /></button>
            </div>

            <div id="os-print-area" className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 md:space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Data da O.S.', formatDate(viewingOS.date)],
                  ['Adicionado em', formatDateTime(viewingOS.createdAt || viewingOS.openedAt || viewingOS.date)], 
                  ['Conclusão', viewingOS.status === 'Concluída' && viewingOS.closedAt ? formatDate(viewingOS.closedAt) : (viewingOS.status === 'Concluída' ? formatDate(viewingOS.date) : '---')],
                  ['KM', `${viewingOS.km || '---'} km`], 
                  ['Responsável', viewingOS.responsible]
                ].map(([label, val]) => (
                  <div key={label} className="bg-neutral-50 p-4 rounded-2xl">
                    <p className="text-[8px] uppercase text-neutral-400 font-black">{label}</p>
                    <p className="text-sm font-black text-neutral-900 mt-1">{val}</p>
                  </div>
                ))}
              </div>
              <div className="bg-neutral-50 p-6 rounded-2xl">
                <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-2">Descrição do Serviço</p>
                <p className="text-sm text-neutral-700 leading-relaxed">{viewingOS.description}</p>
              </div>
              {viewingOS.parts?.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-3">Peças Utilizadas</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead><tr className="border-b border-neutral-100"><th className="py-2 font-black text-neutral-400 uppercase text-[9px]">Peça</th><th className="py-2 font-black text-neutral-400 uppercase text-[9px] text-center">Qtd</th><th className="py-2 font-black text-neutral-400 uppercase text-[9px] text-right">Valor Unit.</th><th className="py-2 font-black text-neutral-400 uppercase text-[9px] text-right">Subtotal</th></tr></thead>
                      <tbody className="divide-y divide-neutral-50">
                        {viewingOS.parts.map((p, i) => (
                          <tr key={i}><td className="py-3 font-bold">{p.name}</td><td className="py-3 text-center">{p.qty}</td><td className="py-3 text-right">R$ {parseBrValue(p.unitValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td className="py-3 text-right font-black">R$ {(p.qty * parseBrValue(p.unitValue || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="bg-neutral-900 p-8 rounded-[2rem] flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[9px] text-neutral-500 uppercase font-black">Mão de Obra: <span className="text-white">R$ {parseBrValue(viewingOS.laborValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                  <p className="text-[9px] text-neutral-500 uppercase font-black">Peças: <span className="text-white">R$ {(viewingOS.parts || []).reduce((a, p) => a + ((p.qty || 0) * parseBrValue(p.unitValue)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-neutral-400 uppercase font-black">Total da O.S.</p>
                  <p className="text-3xl font-black text-[#C5A059]">{(viewingOS.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-neutral-50 bg-neutral-50/30 flex justify-between items-center shrink-0 print:hidden">
              <div className="flex gap-3">
                <button onClick={() => window.print()} className="px-6 py-3 border border-neutral-200 text-neutral-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-neutral-50 transition-all flex items-center gap-2">
                  <Printer size={14} /> Imprimir / PDF
                </button>
                {replacementContracts?.find(rc => rc.mainVehiclePlate === viewingOS.plate && rc.status === 'Ativo') && (
                  <button onClick={() => { setClosingRC(replacementContracts.find(rc => rc.mainVehiclePlate === viewingOS.plate && rc.status === 'Ativo')); setCloseDate(new Date().toISOString().split('T')[0]); }} className="px-6 py-3 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-200 transition-all flex items-center gap-2">
                    <CheckCircle2 size={14} /> Finalizar Carro Reserva
                  </button>
                )}
              </div>
              {viewingOS.status === 'Aberta' && (
                <div className="flex gap-3">
                  <button onClick={() => { setViewingOS(null); onOpenCarroReserva?.(viewingOS); }} className="px-8 py-4 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-amber-700 transition-all flex items-center gap-2 shadow-xl active:scale-95">
                    <Car size={16} /> Carro Reserva
                  </button>
                  <button onClick={() => handleEditOS(viewingOS)} className="px-8 py-4 bg-[#C5A059] text-neutral-950 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#C5A059]/80 transition-all flex items-center gap-2 shadow-xl active:scale-95">
                    <Pencil size={14} /> Editar O.S.
                  </button>
                  <button onClick={() => { setClosingOS(viewingOS); setCloseDate(new Date().toISOString().split('T')[0]); }} className="px-8 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-xl active:scale-95">
                    <Check size={16} /> Fechar e Concluir O.S.
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {closingOS && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm" onClick={() => setClosingOS(null)} />
          <div className="bg-white p-8 rounded-3xl z-10 w-full max-w-md shadow-2xl relative animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-4 uppercase">Confirmar Finalização da O.S.</h3>
            <p className="text-sm text-neutral-500 mb-6">Qual foi a data exata em que o carro foi consertado?</p>
            <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} className="w-full bg-neutral-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-bold text-sm mb-6" />
            <div className="flex gap-4">
              <button onClick={() => setClosingOS(null)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:bg-neutral-50 rounded-xl transition-all">Cancelar</button>
              <button onClick={() => { handleCloseOS(closingOS, closeDate); setClosingOS(null); }} className="flex-1 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-xl">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {closingRC && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm" onClick={() => setClosingRC(null)} />
          <div className="bg-white p-8 rounded-3xl z-10 w-full max-w-md shadow-2xl relative animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-4 uppercase">Devolução do Carro Reserva</h3>
            <p className="text-sm text-neutral-500 mb-6">Qual foi a data exata em que o motorista devolveu o carro reserva <b>{closingRC.replacementVehiclePlate}</b>?</p>
            <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} className="w-full bg-neutral-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-bold text-sm mb-6" />
            <div className="flex gap-4">
              <button onClick={() => setClosingRC(null)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:bg-neutral-50 rounded-xl transition-all">Cancelar</button>
              <button onClick={async () => {
                await onCloseReplacementContract(closingRC.id, closeDate);
                setClosingRC(null);
                setSuccessModal({ show: true, title: 'Devolvido', message: 'Contrato de carro reserva finalizado com sucesso!' });
              }} className="flex-1 py-4 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all shadow-xl">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <AdminSuccessModal 
        data={successModal} 
        onClose={() => setSuccessModal({ ...successModal, show: false })} 
      />
    </div>
  );
};

export default AdminOficina;
