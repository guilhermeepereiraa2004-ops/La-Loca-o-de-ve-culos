import React, { useState } from 'react';
import { Package, Search, Plus, Printer, Trash2, Edit3, Image as ImageIcon, X, Minus } from 'lucide-react';
import { formatCurrency, parseCurrency } from '../../utils/currencyUtils';

const OficinaEstoque = ({ inventory = [], onAddInventoryItem, onUpdateInventoryItem, onDeleteInventoryItem, onDeleteAllInventoryItems }) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  const defaultForm = {
    id: null,
    imageUrl: '',
    name: '',
    code: '',
    brand: '',
    description: '',
    costPrice: '0,00',
    sellingPrice: '0,00',
    minStock: 0,
    quantity: 0,
    applications: [],
    similarParts: []
  };
  
  const [form, setForm] = useState(defaultForm);
  const [appInput, setAppInput] = useState('');
  const [simInput, setSimInput] = useState('');
  
  const handleAddApp = () => {
    if (appInput.trim()) {
      setForm({ ...form, applications: [...form.applications, appInput.trim()] });
      setAppInput('');
    }
  };
  
  const handleRemoveApp = (idx) => {
    setForm({ ...form, applications: form.applications.filter((_, i) => i !== idx) });
  };

  const handleAddSim = () => {
    if (simInput.trim()) {
      setForm({ ...form, similarParts: [...form.similarParts, simInput.trim()] });
      setSimInput('');
    }
  };
  
  const handleRemoveSim = (idx) => {
    setForm({ ...form, similarParts: form.similarParts.filter((_, i) => i !== idx) });
  };
  
  const handleSave = async () => {
    if (!form.name) return alert('O nome do produto é obrigatório.');
    
    const payload = {
      ...form,
      costPrice: parseCurrency(String(form.costPrice)),
      sellingPrice: parseCurrency(String(form.sellingPrice)),
      minStock: parseInt(form.minStock) || 0,
      quantity: parseInt(form.quantity) || 0
    };
    
    if (form.id) {
      await onUpdateInventoryItem(form.id, payload);
    } else {
      await onAddInventoryItem(payload);
    }
    
    setShowModal(false);
  };
  
  const handleEdit = (item) => {
    setForm({
      ...item,
      costPrice: (item.costPrice || 0).toFixed(2).replace('.', ','),
      sellingPrice: (item.sellingPrice || 0).toFixed(2).replace('.', ',')
    });
    setShowModal(true);
  };

  const handleAdjustQuantity = async (item, delta) => {
    const newQuantity = (item.quantity || 0) + delta;
    if (newQuantity < 0) return;
    await onUpdateInventoryItem(item.id, { quantity: newQuantity });
  };

  const filteredInventory = inventory.filter(i => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (i.name || '').toLowerCase().includes(s) || 
           (i.code || '').toLowerCase().includes(s) ||
           (i.applications || []).join(' ').toLowerCase().includes(s);
  });

  return (
    <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col relative h-full">
      {/* List Header */}
      <div className="p-6 border-b border-neutral-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full">
          <div className="flex items-center gap-2 mr-auto md:mr-4">
            <div className="bg-orange-50 text-[#f97316] p-2 rounded-xl">
              <Package size={20} />
            </div>
            <h3 className="font-black text-xl text-neutral-900">Estoque</h3>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text"
              placeholder="Buscar por nome, código, aplicação ou similar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm font-medium py-2 pl-9 pr-4 rounded-xl outline-none focus:border-[#f97316] transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <label className="bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer">
            <Package size={16} /> Importar
            <input type="file" className="hidden" accept=".csv, .xlsx" onChange={(e) => {
               if(e.target.files.length > 0) {
                 alert('A importação de planilhas será ativada na próxima atualização! Seu arquivo foi lido.');
               }
            }} />
          </label>
          <button onClick={async () => {
            if(window.confirm('Tem certeza que deseja excluir TODOS os produtos? Esta ação não pode ser desfeita.')) {
              if (onDeleteAllInventoryItems) {
                await onDeleteAllInventoryItems();
                alert('Todos os produtos foram excluídos com sucesso.');
              }
            }
          }} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl border border-red-100 text-sm font-bold flex items-center gap-2 transition-all shadow-sm">
            <Trash2 size={16} /> Excluir Todos
          </button>
          <button onClick={() => {setForm(defaultForm); setShowModal(true);}} className="bg-[#f97316] hover:bg-[#ea580c] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm">
            <Plus size={16} /> Novo Produto
          </button>
          <button onClick={() => window.print()} className="bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm print:hidden">
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-neutral-50/50 border-b border-neutral-100">
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">IMG</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Produto</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Código</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Aplicação</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-center">Qtd</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Custo</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Venda</th>
              <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm font-bold text-neutral-300">
                  Nenhum produto encontrado no estoque.
                </td>
              </tr>
            ) : (
              filteredInventory.map((i) => (
                <tr key={i.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400 border border-neutral-200 overflow-hidden">
                      {i.imageUrl ? (
                        <img src={i.imageUrl} alt={i.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={18} />
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-neutral-900 text-sm uppercase">{i.name}</p>
                    {i.brand && <p className="text-[10px] font-bold text-neutral-400 uppercase mt-0.5 tracking-widest">{i.brand}</p>}
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-bold text-neutral-600">{i.code || '-'}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {i.applications?.length > 0 ? (
                        <>
                          {i.applications.slice(0, 3).map((app, idx) => (
                            <span key={idx} className="bg-neutral-100 text-neutral-600 text-xs font-bold px-2 py-0.5 rounded-lg border border-neutral-200">
                              {app}
                            </span>
                          ))}
                          {i.applications.length > 3 && (
                            <span className="bg-neutral-100 text-neutral-600 text-xs font-bold px-2 py-0.5 rounded-lg border border-neutral-200">
                              +{i.applications.length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-neutral-400 font-medium">-</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center">
                       <span className={`text-sm font-black px-2 py-1 rounded-lg ${
                         i.quantity <= (i.minStock || 0) ? 'bg-red-50 text-red-600' : 'text-neutral-900'
                       }`}>
                         {i.quantity}
                       </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-medium text-neutral-600">{formatCurrency(i.costPrice)}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-black text-neutral-900">{formatCurrency(i.sellingPrice)}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex justify-center items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(i)} className="p-2 text-neutral-400 hover:text-[#f97316] hover:bg-orange-50 rounded-lg transition-colors" title="Editar">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleAdjustQuantity(i, -1)} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="-1 Estoque">
                        <Minus size={16} />
                      </button>
                      <button onClick={() => handleAdjustQuantity(i, 1)} className="p-2 text-neutral-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="+1 Estoque">
                        <Plus size={16} />
                      </button>
                      <button onClick={() => { if(window.confirm('Excluir produto?')) onDeleteInventoryItem(i.id); }} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Novo Produto */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] flex flex-col max-h-[95vh] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h3 className="text-xl font-black text-neutral-900">{form.id ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Image Upload Area */}
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-400 cursor-pointer transition-all">
                  <ImageIcon size={28} />
                </div>
                <div>
                  <p className="font-bold text-neutral-900 mb-1">Imagem do Produto</p>
                  <p className="text-sm font-medium text-neutral-400">Clique para selecionar (máx 5MB)</p>
                </div>
              </div>

              {/* Grid Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-black text-neutral-900 mb-2">Nome *</label>
                  <input 
                    type="text" 
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full bg-white border-2 border-[#f97316] focus:border-[#ea580c] text-neutral-900 text-sm rounded-xl px-4 py-3 outline-none transition-all font-bold shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-neutral-900 mb-2">Código</label>
                  <input 
                    type="text" 
                    value={form.code}
                    onChange={e => setForm({...form, code: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-neutral-900 mb-2">Marca</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Bosch, NGK, Mann..."
                    value={form.brand}
                    onChange={e => setForm({...form, brand: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-neutral-900 mb-2">Descrição</label>
                  <input 
                    type="text" 
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] transition-all font-bold"
                  />
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-black text-neutral-900 mb-2">Preço Custo</label>
                  <input 
                    type="text" 
                    value={form.costPrice}
                    onChange={e => setForm({...form, costPrice: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-neutral-900 mb-2">Preço Venda</label>
                  <input 
                    type="text" 
                    value={form.sellingPrice}
                    onChange={e => setForm({...form, sellingPrice: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-neutral-900 mb-2">Est. Mínimo</label>
                  <input 
                    type="number" 
                    value={form.minStock}
                    onChange={e => setForm({...form, minStock: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] transition-all font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-neutral-900 mb-2">Quantidade {form.id ? 'Atual' : 'Inicial'}</label>
                <input 
                  type="number" 
                  value={form.quantity}
                  onChange={e => setForm({...form, quantity: e.target.value})}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] transition-all font-bold"
                />
              </div>

              {/* Tags Area: Aplicações */}
              <div>
                <label className="block text-sm font-black text-neutral-900 mb-1">
                  🚗 Aplicação (veículos compatíveis)
                </label>
                <p className="text-[11px] font-medium text-neutral-400 mb-2 uppercase tracking-wide">Ex: Gol G5 1.0, Civic 2020, Corolla 1.8</p>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text"
                    placeholder="Adicionar veículo..."
                    value={appInput}
                    onChange={e => setAppInput(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddApp(); } }}
                    className="flex-1 bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C5A059] transition-all font-bold"
                  />
                  <button onClick={handleAddApp} type="button" className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 w-[42px] h-[42px] flex items-center justify-center rounded-xl transition-colors shadow-sm shrink-0">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.applications.map((app, idx) => (
                    <span key={idx} className="bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                      {app}
                      <button type="button" onClick={() => handleRemoveApp(idx)} className="text-neutral-400 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Tags Area: Similares */}
              <div>
                <label className="block text-sm font-black text-neutral-900 mb-1">
                  🔗 Peças Similares / Equivalentes
                </label>
                <p className="text-[11px] font-medium text-neutral-400 mb-2 uppercase tracking-wide">Ex: código ou nome de peça similar de outra marca</p>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text"
                    placeholder="Adicionar similar..."
                    value={simInput}
                    onChange={e => setSimInput(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddSim(); } }}
                    className="flex-1 bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C5A059] transition-all font-bold"
                  />
                  <button onClick={handleAddSim} type="button" className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 w-[42px] h-[42px] flex items-center justify-center rounded-xl transition-colors shadow-sm shrink-0">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.similarParts.map((sim, idx) => (
                    <span key={idx} className="bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                      {sim}
                      <button type="button" onClick={() => handleRemoveSim(idx)} className="text-neutral-400 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-neutral-100 flex items-center justify-end">
               <button onClick={handleSave} className="w-full md:w-auto bg-[#f97316] hover:bg-[#ea580c] text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-sm">
                 {form.id ? 'Salvar Alterações' : 'Cadastrar Produto'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OficinaEstoque;
