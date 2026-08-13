import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Eye, FileText, Printer, MessageSquare, ChevronDown } from 'lucide-react';
import { parseCurrency, formatCurrency } from '../../utils/currencyUtils';

const OficinaOrcamentos = ({ quotes, clients, vehicles, onAddQuote, onUpdateQuote, onDeleteQuote }) => {
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [search, setSearch] = useState('');
  
  // Form State
  const [form, setForm] = useState({
    clientId: '',
    clientName: '',
    clientPhone: '',
    vehicleId: '',
    vehicleModel: '',
    vehiclePlate: '',
    vehicleKm: '',
    items: [],
    observations: '',
    validity: '7 dias'
  });

  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setForm({
      clientId: '', clientName: '', clientPhone: '', vehicleId: '',
      vehicleModel: '', vehiclePlate: '', vehicleKm: '', items: [],
      observations: '', validity: '7 dias'
    });
    setClientSearchTerm('');
  };

  const handleCreateNew = () => {
    resetForm();
    setView('form');
  };

  const handleClientSelect = (client) => {
    setForm(prev => ({
      ...prev,
      clientId: client.id,
      clientName: client.nome || client.name || '',
      clientPhone: client.telefone || client.phone || ''
    }));
    setClientSearchTerm(client.nome || client.name || '');
    setIsClientDropdownOpen(false);
  };

  const handleAddItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), name: '', quantity: 1, unitValue: '0', total: 0 }]
    }));
  };

  const handleUpdateItem = (id, field, value) => {
    setForm(prev => {
      const newItems = prev.items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitValue') {
            const qty = parseFloat(updated.quantity) || 0;
            const val = parseCurrency(updated.unitValue) || 0;
            updated.total = qty * val;
          }
          return updated;
        }
        return item;
      });
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveItem = (id) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== id)
    }));
  };

  const calculateTotal = () => {
    return form.items.reduce((acc, item) => acc + (item.total || 0), 0);
  };

  const handleSave = async () => {
    const total = calculateTotal();
    const payload = {
      ...form,
      total,
      status: 'Salvo'
    };
    
    await onAddQuote(payload);
    setView('list');
  };

  const handleSendWhatsApp = () => {
    if (!form.clientPhone) {
      alert('Por favor, adicione o telefone do cliente antes de enviar.');
      return;
    }
    const total = calculateTotal();
    const itemsText = form.items.map(i => `- ${i.quantity}x ${i.name} (${formatCurrency(i.total)})`).join('%0A');
    const message = `Olá, ${form.clientName || 'cliente'}!%0A%0ASegue o orçamento para o veículo ${form.vehicleModel} (${form.vehiclePlate}):%0A%0A${itemsText}%0A%0A*Total:* ${formatCurrency(total)}%0A%0A*Observações:* ${form.observations || 'Nenhuma'}%0A*Validade:* ${form.validity}%0A%0AQualquer dúvida, estamos à disposição! - Oficina L.A`;
    const phone = form.clientPhone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR');
  };

  const filteredDropdownClients = clients?.filter(c => {
    if (!clientSearchTerm) return true;
    const s = clientSearchTerm.toLowerCase();
    const name = (c.nome || c.name || '').toLowerCase();
    const cpf = (c.cpf || '').toLowerCase();
    return name.includes(s) || cpf.includes(s);
  })?.sort((a, b) => (a.nome || a.name || '').localeCompare(b.nome || b.name || '')) || [];

  if (view === 'form') {
    return (
      <div className="space-y-6 pb-20">
        {/* Breadcrumb / Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('list')}
            className="text-neutral-500 hover:text-neutral-900 font-bold text-sm bg-white px-4 py-2 rounded-xl shadow-sm border border-neutral-100 transition-colors"
          >
            ← Voltar
          </button>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tighter">Novo Orçamento</h2>
        </div>

        {/* Card 1: Dados do Cliente / Veículo */}
        <div className="bg-white rounded-3xl border border-neutral-200 p-6 xl:p-8 shadow-sm">
          <h3 className="text-lg font-black text-neutral-900 mb-1">Dados do Cliente / Veículo</h3>
          <p className="text-sm font-medium text-neutral-500 mb-6">Selecione um cliente cadastrado ou preencha manualmente</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Selecionar Cliente Cadastrado</label>
              <div className="relative" ref={dropdownRef}>
                <div 
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus-within:border-[#C5A059] focus-within:ring-1 focus-within:ring-[#C5A059] transition-all font-medium flex items-center justify-between cursor-pointer"
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                >
                  <input
                    type="text"
                    value={clientSearchTerm}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      setIsClientDropdownOpen(true);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    placeholder="Buscar cliente por nome ou CPF..."
                    className="w-full bg-transparent outline-none cursor-text"
                  />
                  <ChevronDown size={16} className={`text-neutral-400 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                
                {isClientDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                    {filteredDropdownClients.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-neutral-500 text-center font-medium">Nenhum cliente encontrado</div>
                    ) : (
                      filteredDropdownClients.map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => handleClientSelect(c)}
                          className="px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0 font-medium"
                        >
                          <div className="font-bold">{c.nome || c.name}</div>
                          <div className="text-xs text-neutral-400">{c.cpf ? `CPF: ${c.cpf}` : 'Sem CPF cadastrado'}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Nome do Cliente</label>
                <input 
                  type="text" 
                  value={form.clientName}
                  onChange={e => setForm({...form, clientName: e.target.value})}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] transition-all font-medium"
                  placeholder="Nome"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Telefone (WhatsApp)</label>
                <input 
                  type="text" 
                  value={form.clientPhone}
                  onChange={e => setForm({...form, clientPhone: e.target.value})}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] transition-all font-medium"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Veículo</label>
                <input 
                  type="text" 
                  value={form.vehicleModel}
                  onChange={e => setForm({...form, vehicleModel: e.target.value})}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] transition-all font-medium"
                  placeholder="Ex: Gol 2020"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Placa</label>
                <input 
                  type="text" 
                  value={form.vehiclePlate}
                  onChange={e => setForm({...form, vehiclePlate: e.target.value})}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] transition-all font-medium"
                  placeholder="ABC-1234"
                />
              </div>
            </div>

            <div className="w-full md:w-1/4">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">KM Atual</label>
              <input 
                type="text" 
                value={form.vehicleKm}
                onChange={e => setForm({...form, vehicleKm: e.target.value})}
                className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] transition-all font-medium"
                placeholder="Ex: 45.000"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Itens do Orçamento */}
        <div className="bg-white rounded-3xl border border-neutral-200 p-6 xl:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-neutral-900 mb-1">Itens do Orçamento</h3>
              <p className="text-sm font-medium text-neutral-500">Serviços e peças</p>
            </div>
            <button 
              onClick={handleAddItem}
              className="bg-[#f97316] hover:bg-[#ea580c] text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus size={16} /> Adicionar Item
            </button>
          </div>

          {form.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <FileText size={48} className="mb-4 opacity-20" />
              <p className="font-bold">Nenhum item adicionado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {form.items.map((item, idx) => (
                <div key={item.id} className="flex flex-col md:flex-row items-center gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                  <div className="w-full md:flex-1">
                    <input 
                      type="text" 
                      value={item.name}
                      onChange={e => handleUpdateItem(item.id, 'name', e.target.value)}
                      placeholder="Descrição (Ex: Troca de Óleo)" 
                      className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C5A059] font-medium"
                    />
                  </div>
                  <div className="w-full md:w-24">
                    <input 
                      type="number" 
                      value={item.quantity}
                      onChange={e => handleUpdateItem(item.id, 'quantity', e.target.value)}
                      placeholder="Qtd" 
                      className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C5A059] font-medium"
                    />
                  </div>
                  <div className="w-full md:w-32">
                    <input 
                      type="text" 
                      value={item.unitValue}
                      onChange={e => handleUpdateItem(item.id, 'unitValue', e.target.value)}
                      placeholder="R$ 0,00" 
                      className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C5A059] font-medium"
                    />
                  </div>
                  <div className="w-full md:w-32 font-bold text-neutral-700 bg-neutral-200/50 px-4 py-2 rounded-lg text-sm text-center">
                    {formatCurrency(item.total)}
                  </div>
                  <button onClick={() => handleRemoveItem(item.id)} className="w-full md:w-auto text-red-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors font-bold text-sm">
                    Remover
                  </button>
                </div>
              ))}
              
              <div className="flex justify-end pt-4 pr-4">
                <div className="text-right">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Total do Orçamento</p>
                  <p className="text-3xl font-black text-neutral-900">{formatCurrency(calculateTotal())}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Observações e Validade */}
        <div className="bg-white rounded-3xl border border-neutral-200 p-6 xl:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <label className="block text-sm font-black text-neutral-900 mb-2">Observações</label>
              <textarea 
                value={form.observations}
                onChange={e => setForm({...form, observations: e.target.value})}
                placeholder="Garantia, condições, prazo..."
                className="w-full h-32 bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl p-4 outline-none focus:border-[#C5A059] transition-all font-medium resize-none"
              ></textarea>
            </div>
            <div className="w-full md:w-64">
              <label className="block text-sm font-black text-neutral-900 mb-2">Validade</label>
              <div className="relative">
                <select 
                  value={form.validity}
                  onChange={e => setForm({...form, validity: e.target.value})}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 appearance-none outline-none focus:border-[#C5A059] transition-all font-medium"
                >
                  <option value="7 dias">7 dias</option>
                  <option value="15 dias">15 dias</option>
                  <option value="30 dias">30 dias</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Ações / Footer */}
        <div className="flex flex-wrap gap-4 items-center">
          <button onClick={handleSave} className="bg-[#f97316] hover:bg-[#ea580c] text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md print:hidden">
            <FileText size={18} /> Salvar Orçamento
          </button>
          
          <button onClick={handleSendWhatsApp} className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md print:hidden">
            <MessageSquare size={18} /> Enviar Orçamento via WhatsApp
          </button>
          
          <button onClick={handlePrint} className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-sm print:hidden">
            <Printer size={18} /> Imprimir
          </button>
        </div>

      </div>
    );
  }

  // LIST VIEW
  const filteredQuotes = quotes?.filter(q => {
    if (!search) return true;
    const s = search.toLowerCase();
    return q.clientName?.toLowerCase().includes(s) || q.vehiclePlate?.toLowerCase().includes(s) || q.vehicleModel?.toLowerCase().includes(s);
  }) || [];

  return (
    <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
      {/* List Header */}
      <div className="p-6 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl p-1 w-fit">
          <button className="bg-white text-neutral-900 shadow-sm px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
            <FileText size={14} /> Orçamentos Salvos
          </button>
          <button onClick={handleCreateNew} className="text-neutral-500 hover:text-neutral-700 px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors">
            <Plus size={14} /> Novo
          </button>
        </div>
        
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text"
            placeholder="Buscar cliente, placa, modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-72 bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm font-medium py-2 pl-9 pr-4 rounded-xl outline-none focus:border-[#C5A059] transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-neutral-50/50">
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">#</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Cliente</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Veículo</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Total</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Status</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Data</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredQuotes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm font-bold text-neutral-300">
                  Nenhum orçamento encontrado.
                </td>
              </tr>
            ) : (
              filteredQuotes.map((q) => (
                <tr key={q.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-4 px-6 text-sm font-bold text-neutral-400">
                    #{q.id.substring(0,5)}
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-neutral-900">{q.clientName || 'Não informado'}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-medium text-neutral-600">{q.vehicleModel} {q.vehiclePlate ? `(${q.vehiclePlate})` : ''}</p>
                  </td>
                  <td className="py-4 px-6 font-black text-neutral-900">
                    {formatCurrency(q.total)}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg ${
                      q.status === 'Convertido em OS' ? 'bg-blue-50 text-blue-500 border border-blue-100' :
                      q.status === 'Cancelado' ? 'bg-red-50 text-red-500 border border-red-100' :
                      'bg-neutral-100 text-neutral-600 border border-neutral-200'
                    }`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm font-medium text-neutral-400">
                    {formatDate(q.createdAt)}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex justify-center items-center gap-2">
                      <button className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OficinaOrcamentos;
