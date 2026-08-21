import React, { useState } from 'react';
import { Search, Plus, Printer, Edit3, Trash2, ArrowUpRight, ArrowDownRight, DollarSign, AlertTriangle, X } from 'lucide-react';
import { formatCurrency, parseCurrency } from '../../utils/currencyUtils';

const OficinaFinanceiro = ({ workshopFinancials = [], onAddWorkshopFinancial, onUpdateWorkshopFinancial, onDeleteWorkshopFinancial }) => {
  const [activeTab, setActiveTab] = useState('lancamentos'); // 'lancamentos' (pagos) ou 'pagamentos' (pendentes)
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const defaultForm = {
    id: null,
    date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
    description: '',
    type: 'Receita', // Receita ou Despesa
    category: 'servicos',
    value: '0,00',
    status: activeTab === 'lancamentos' ? 'Pago' : 'Pendente'
  };

  const [form, setForm] = useState(defaultForm);

  // Calcula resumos
  const receitasPagas = workshopFinancials.filter(f => f.type === 'Receita' && f.status === 'Pago').reduce((acc, curr) => acc + (curr.value || 0), 0);
  const despesasPagas = workshopFinancials.filter(f => f.type === 'Despesa' && f.status === 'Pago').reduce((acc, curr) => acc + (curr.value || 0), 0);
  const saldo = receitasPagas - despesasPagas;
  const aReceber = workshopFinancials.filter(f => f.type === 'Receita' && f.status === 'Pendente').reduce((acc, curr) => acc + (curr.value || 0), 0);
  const aPagar = workshopFinancials.filter(f => f.type === 'Despesa' && f.status === 'Pendente').reduce((acc, curr) => acc + (curr.value || 0), 0);

  // Filtra itens para a tabela
  const filteredItems = workshopFinancials.filter(item => {
    // Filtro por tab (status)
    if (activeTab === 'lancamentos' && item.status !== 'Pago') return false;
    if (activeTab === 'pagamentos' && item.status !== 'Pendente') return false;

    // Filtro de busca
    if (search) {
      const s = search.toLowerCase();
      return (item.description || '').toLowerCase().includes(s) || (item.category || '').toLowerCase().includes(s);
    }
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleSave = async () => {
    if (!form.description) return alert('Descrição obrigatória.');
    if (!form.date) return alert('Data obrigatória.');

    const payload = {
      ...form,
      value: parseCurrency(String(form.value))
    };

    if (form.id) {
      await onUpdateWorkshopFinancial(form.id, payload);
    } else {
      await onAddWorkshopFinancial(payload);
    }
    
    setShowModal(false);
  };

  const handleEdit = (item) => {
    setForm({
      ...item,
      value: (item.value || 0).toFixed(2).replace('.', ',')
    });
    setShowModal(true);
  };

  const categories = [
    'servicos', 'pecas', 'material', 'revenda', 'impostos', 'marketing', 'folha', 'outros'
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Receitas */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-center items-center">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Receitas recebidas</p>
          <div className="flex items-center gap-2 text-green-500">
            <ArrowUpRight size={20} />
            <h3 className="text-xl lg:text-2xl font-black">{formatCurrency(receitasPagas)}</h3>
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-center items-center">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Despesas pagas</p>
          <div className="flex items-center gap-2 text-red-500">
            <ArrowDownRight size={20} />
            <h3 className="text-xl lg:text-2xl font-black">{formatCurrency(despesasPagas)}</h3>
          </div>
        </div>

        {/* Saldo */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Saldo</p>
          <div className={`flex items-center gap-2 ${saldo >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            <DollarSign size={20} />
            <h3 className="text-xl lg:text-2xl font-black">{formatCurrency(saldo)}</h3>
          </div>
        </div>

        {/* A Receber */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-center items-center">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">A Receber</p>
          <div className="flex items-center gap-2 text-orange-400">
            <AlertTriangle size={20} />
            <h3 className="text-xl lg:text-2xl font-black">{formatCurrency(aReceber)}</h3>
          </div>
        </div>

        {/* A Pagar */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-center items-center">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">A Pagar</p>
          <div className="flex items-center gap-2 text-orange-600">
            <AlertTriangle size={20} />
            <h3 className="text-xl lg:text-2xl font-black">{formatCurrency(aPagar)}</h3>
          </div>
        </div>
      </div>

      {/* Tabela Section */}
      <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden flex flex-col flex-1 relative min-h-[400px]">
        {/* Table Toolbar */}
        <div className="p-4 md:p-6 border-b border-neutral-100 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('lancamentos')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'lancamentos' ? 'bg-[#f97316] text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Lançamentos
            </button>
            <button 
              onClick={() => setActiveTab('pagamentos')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'pagamentos' ? 'bg-[#f97316] text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Pagamentos
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text"
                placeholder="Buscar lançamento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm font-medium py-2.5 pl-9 pr-4 rounded-xl outline-none focus:border-[#f97316] transition-all"
              />
            </div>
            
            <button onClick={() => window.print()} className="bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm print:hidden shrink-0">
              <Printer size={16} /> Imprimir
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Data</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Descrição</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Tipo</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Categoria</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Valor</th>
                <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm font-bold text-neutral-300">
                    Nenhum lançamento encontrado nesta aba.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <p className="text-sm font-medium text-neutral-600">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-neutral-800">{item.description}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                        item.type === 'Receita' ? 'bg-[#f97316] text-white' : 'bg-red-600 text-white'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-medium text-neutral-500">{item.category}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className={`text-sm font-bold ${item.type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(item.value)}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(item)} className="p-2 text-neutral-400 hover:text-[#f97316] hover:bg-orange-50 rounded-lg transition-colors" title="Editar">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => { if(window.confirm('Excluir lançamento?')) onDeleteWorkshopFinancial(item.id); }} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
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
      </div>

      {/* Floating Action Button for New */}
      <div className="fixed bottom-6 right-6 z-50 xl:absolute xl:bottom-auto xl:right-6 xl:top-[128px] print:hidden">
         <button onClick={() => {setForm({...defaultForm, status: activeTab === 'lancamentos' ? 'Pago' : 'Pendente'}); setShowModal(true);}} className="bg-[#f97316] hover:bg-[#ea580c] text-white px-5 py-3.5 rounded-full xl:rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-xl xl:shadow-sm">
           <Plus size={18} /> <span className="hidden xl:inline">Novo Lançamento</span>
         </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2rem] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h3 className="text-xl font-black text-neutral-900">{form.id ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-neutral-900 mb-2">Tipo</label>
                  <select 
                    value={form.type} 
                    onChange={e => setForm({...form, type: e.target.value})}
                    className={`w-full border-2 text-sm rounded-xl px-4 py-3 outline-none font-bold transition-colors appearance-none ${
                      form.type === 'Receita' ? 'bg-orange-50 border-[#f97316] text-[#f97316]' : 'bg-red-50 border-red-500 text-red-600'
                    }`}
                  >
                    <option value="Receita">Receita</option>
                    <option value="Despesa">Despesa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black text-neutral-900 mb-2">Status</label>
                  <select 
                    value={form.status} 
                    onChange={e => setForm({...form, status: e.target.value})}
                    className={`w-full border-2 text-sm rounded-xl px-4 py-3 outline-none font-bold transition-colors appearance-none ${
                      form.status === 'Pago' ? 'bg-green-50 border-green-500 text-green-600' : 'bg-orange-50 border-orange-400 text-orange-500'
                    }`}
                  >
                    <option value="Pago">Pago</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-neutral-900 mb-2">Data</label>
                <input 
                  type="date" 
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] font-bold"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-neutral-900 mb-2">Descrição *</label>
                <input 
                  type="text" 
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Ex: Pagamento OS #1234, Compra de peças..."
                  className="w-full bg-white border-2 border-[#f97316] focus:border-[#ea580c] text-neutral-900 text-sm rounded-xl px-4 py-3 outline-none font-bold shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-neutral-900 mb-2">Categoria</label>
                  <select 
                    value={form.category} 
                    onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C5A059] font-bold"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black text-neutral-900 mb-2">Valor *</label>
                  <input 
                    type="text" 
                    value={form.value}
                    onChange={e => setForm({...form, value: e.target.value})}
                    className="w-full bg-white border-2 border-[#f97316] focus:border-[#ea580c] text-neutral-900 text-sm rounded-xl px-4 py-3 outline-none font-bold shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-100">
               <button onClick={handleSave} className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-sm">
                 Salvar Lançamento
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OficinaFinanceiro;
