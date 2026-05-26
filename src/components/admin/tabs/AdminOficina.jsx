import React, { useState, useEffect } from 'react';
import { Plus, Search, Wrench, Car, X, Check, Printer, Package, User, ChevronDown, Eye, Clock, CheckCircle2, AlertTriangle, Trash2, Pencil } from 'lucide-react';

const parseBrValue = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleanVal = String(val).replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanVal) || 0;
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
  serviceOrders = [] 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [viewingOS, setViewingOS] = useState(null);
  const [editingOS, setEditingOS] = useState(null);
  const [replacementCarPlate, setReplacementCarPlate] = useState('');
  const [isRented, setIsRented] = useState(false);

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
            km: prev.km || v.km || '' 
          };
        });
      }
      
      const rental = rentals.find(r => r.plate === form.plate && r.status === 'Ativo');
      setIsRented(!!rental);
    } else {
      setIsRented(false);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingOS) {
      const os = { ...form, total: totalOS };
      onUpdateServiceOrder(os);
      setEditingOS(null);
    } else {
      const os = { ...form, id: Date.now(), openedAt: new Date().toISOString(), total: totalOS };
      onCloseServiceOrder(os, 'open', replacementCarPlate);
    }
    setShowForm(false);
    setForm(EMPTY_FORM);
    setReplacementCarPlate('');
  };

  const handleCloseOS = (os) => {
    onCloseServiceOrder(os, 'close');
    setViewingOS(null);
  };

  const filtered = serviceOrders.filter(os => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (os.plate || '').toLowerCase().includes(term) ||
      (os.model || '').toLowerCase().includes(term) ||
      (os.description || '').toLowerCase().includes(term)
    );
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-20 bg-neutral-50 rounded-[3rem] border border-neutral-100">
            <Wrench size={48} className="mx-auto text-neutral-200 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">Nenhuma O.S. encontrada</p>
          </div>
        )}
        {filtered.map(os => (
          <div key={os.id} className="bg-white rounded-[2.5rem] border border-neutral-100 p-8 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${os.status === 'Concluída' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                {os.status}
              </span>
              <span className="text-[9px] font-bold text-neutral-300 uppercase">{formatDate(os.date)}</span>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059]"><Car size={22} /></div>
              <div>
                <h4 className="text-xl font-black text-neutral-900 uppercase tracking-tighter">{os.plate}</h4>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{os.model}</p>
              </div>
            </div>
            <p className="text-xs font-medium text-neutral-600 mb-4 line-clamp-2">{os.description}</p>
            <div className="flex justify-between items-center pt-4 border-t border-neutral-50">
              <div>
                <p className="text-[8px] uppercase text-neutral-400 font-black">Responsável</p>
                <p className="text-[10px] font-black text-neutral-700">{os.responsible}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] uppercase text-neutral-400 font-black">Total</p>
                <p className="text-sm font-black text-neutral-900">{(os.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setViewingOS(os)} className="flex-1 py-3 bg-neutral-50 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-neutral-900 hover:text-white transition-all flex items-center justify-center gap-2">
                <Eye size={14} /> Ver Detalhes
              </button>
              {os.status === 'Aberta' && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditOS(os);
                  }}
                  className="px-4 py-3 bg-[#C5A059]/10 text-[#C5A059] hover:bg-[#C5A059] hover:text-neutral-950 rounded-xl transition-all flex items-center justify-center active:scale-95 animate-in fade-in"
                  title="Editar O.S."
                >
                  <Pencil size={14} />
                </button>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Deseja realmente excluir permanentemente a O.S. do veículo ${os.plate || 'desconhecido'}?`)) {
                    onDeleteServiceOrder(os.id);
                  }
                }} 
                className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center active:scale-95"
                title="Excluir O.S."
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
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
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Veículo (Placa) *</label>
                    <select disabled={!!editingOS} value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} required className="w-full bg-neutral-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-bold text-sm disabled:opacity-50">
                      <option value="">Selecione</option>
                      {vehicles.map(v => <option key={v.id} value={v.plate}>{v.plate} — {v.model}</option>)}
                    </select>
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

                {isRented && (
                  <div className="p-6 bg-blue-50 border border-blue-100 rounded-[2rem] space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg"><Car size={20} /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Fluxo de Carro Reserva</p>
                        <p className="text-xs font-bold text-blue-900">Este veículo possui um contrato ativo. Deseja vincular um carro reserva?</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-blue-400 font-black ml-1">Selecionar Carro Reserva (Opcional)</label>
                      <select 
                        value={replacementCarPlate} 
                        onChange={e => setReplacementCarPlate(e.target.value)} 
                        className="w-full bg-white border border-blue-100 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-sm"
                      >
                        <option value="">Nenhum carro reserva</option>
                        {vehicles.filter(v => v.status === 'Disponível').map(v => (
                          <option key={v.id} value={v.plate}>{v.plate} — {v.model}</option>
                        ))}
                      </select>
                      <p className="text-[8px] text-blue-400 font-medium uppercase tracking-widest pl-1 italic">
                        * Ao selecionar, o contrato temporário (R$ 80/dia) será iniciado automaticamente.
                      </p>
                    </div>
                  </div>
                )}

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
              <button onClick={() => setViewingOS(null)} className="text-neutral-300 hover:text-neutral-900"><X size={24} /></button>
            </div>

            <div id="os-print-area" className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 md:space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[['Data', formatDate(viewingOS.date)], ['KM', `${viewingOS.km} km`], ['Responsável', viewingOS.responsible], ['Prestador', viewingOS.provider || '---']].map(([label, val]) => (
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
                          <tr key={i}><td className="py-3 font-bold">{p.name}</td><td className="py-3 text-center">{p.qty}</td><td className="py-3 text-right">R$ {parseBrValue(p.unitValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td className="py-3 text-right font-black">R$ {(p.qty * parseBrValue(p.unitValue || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="bg-neutral-900 p-8 rounded-[2rem] flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[9px] text-neutral-500 uppercase font-black">Mão de Obra: <span className="text-white">R$ {parseBrValue(viewingOS.laborValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                  <p className="text-[9px] text-neutral-500 uppercase font-black">Peças: <span className="text-white">R$ {(viewingOS.parts || []).reduce((a, p) => a + ((p.qty || 0) * parseBrValue(p.unitValue)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-neutral-400 uppercase font-black">Total da O.S.</p>
                  <p className="text-3xl font-black text-[#C5A059]">{(viewingOS.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-neutral-50 bg-neutral-50/30 flex justify-between items-center shrink-0">
              <button onClick={() => window.print()} className="px-6 py-3 border border-neutral-200 text-neutral-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-neutral-50 transition-all flex items-center gap-2">
                <Printer size={14} /> Imprimir / PDF
              </button>
              {viewingOS.status === 'Aberta' && (
                <div className="flex gap-3">
                  <button onClick={() => handleEditOS(viewingOS)} className="px-8 py-4 bg-[#C5A059] text-neutral-950 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#C5A059]/80 transition-all flex items-center gap-2 shadow-xl active:scale-95">
                    <Pencil size={14} /> Editar O.S.
                  </button>
                  <button onClick={() => handleCloseOS(viewingOS)} className="px-8 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-xl active:scale-95">
                    <Check size={16} /> Fechar e Concluir O.S.
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOficina;
