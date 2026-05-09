import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet, Plus, X } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';

const AdminFinanceiro = ({
  transactions,
  financeFilter,
  setFinanceFilter,
  showFinanceForm,
  setShowFinanceForm,
  financeForm,
  setFinanceForm,
  handleSaveTransaction,
  vehicles
}) => {
  const totalIn = transactions.filter(t => t.type === 'in').reduce((acc, t) => acc + t.val, 0);
  const totalOut = Math.abs(transactions.filter(t => t.type === 'out').reduce((acc, t) => acc + t.val, 0));
  const netBalance = transactions.reduce((acc, t) => acc + t.val, 0);

  const filteredTransactions = transactions.filter(t => 
    financeFilter === 'Todos' || 
    (financeFilter === 'Entradas' && t.type === 'in') || 
    (financeFilter === 'Saídas' && t.type === 'out')
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-700">
      {/* Financial Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-4 flex items-center gap-2">
            <ArrowDownLeft size={14} className="text-emerald-500" /> Total de Entradas
          </p>
          <p className="text-4xl font-black text-neutral-900">
            R$ {totalIn.toLocaleString('pt-BR')}
          </p>
          <p className="text-[10px] text-neutral-300 font-bold mt-4 uppercase tracking-widest">Baseado em lançamentos reais</p>
        </div>
        <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-4 flex items-center gap-2">
            <ArrowUpRight size={14} className="text-red-500" /> Total de Saídas
          </p>
          <p className="text-4xl font-black text-neutral-900">
            R$ {totalOut.toLocaleString('pt-BR')}
          </p>
          <p className="text-[10px] text-neutral-300 font-bold mt-4 uppercase tracking-widest">Fluxo de despesas atual</p>
        </div>
        <div className="bg-neutral-950 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-4">Saldo em Caixa (Net)</p>
            <p className="text-4xl font-black text-[#C5A059]">
              R$ {netBalance.toLocaleString('pt-BR')}
            </p>
            <div className="mt-6 flex gap-2">
              <span className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-[9px] font-black uppercase tracking-widest text-neutral-400">Ano Fiscal 2024</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Wallet size={80} />
          </div>
        </div>
      </div>

      {/* Transactions Header */}
      <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-2xl border border-neutral-100 flex gap-1">
            {['Todos', 'Entradas', 'Saídas'].map(f => (
              <button
                key={f}
                onClick={() => setFinanceFilter(f)}
                className={`px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${financeFilter === f ? 'bg-neutral-950 text-white' : 'text-neutral-400 hover:text-neutral-900'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowFinanceForm(true)}
          className="px-8 py-5 bg-[#C5A059] text-neutral-950 text-[10px] uppercase tracking-widest font-black rounded-2xl hover:bg-neutral-950 hover:text-white transition-all flex items-center gap-3"
        >
          <Plus size={16} /> Novo Lançamento
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Descrição / Data</th>
                <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Categoria</th>
                <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Método</th>
                <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400 text-right">Valor</th>
                <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-10 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-neutral-300">
                      <button
                        onClick={() => setShowFinanceForm(true)}
                        className="text-[9px] text-[#C5A059] font-black uppercase underline tracking-widest hover:text-neutral-900 transition-colors"
                      >
                        Iniciar Fluxo de Caixa
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t, i) => (
                  <tr key={i} className="group hover:bg-neutral-50/50 transition-colors">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                          {t.type === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-neutral-900">{t.desc}</p>
                          <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-50 px-3 py-1 rounded-full">{t.cat}</span>
                    </td>
                    <td className="px-10 py-8">
                      <p className="text-xs font-bold text-neutral-900">{t.vehiclePlate || 'N/A'}</p>
                      <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black">{t.responsible}</p>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <p className={`text-sm font-black ${t.type === 'in' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                        {t.type === 'in' ? '+' : '-'} R$ {Math.abs(t.val).toLocaleString('pt-BR')}
                      </p>
                    </td>
                    <td className="px-10 py-8">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${t.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Novo Lançamento Financeiro */}
      {showFinanceForm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-xl" onClick={() => setShowFinanceForm(false)} />
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col">
            <div className="p-10 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059] shadow-lg">
                  <Plus size={24} />
                </div>
                <div>
                  <EditorialLabel className="text-[#C5A059] mb-1">Fluxo de Caixa</EditorialLabel>
                  <h4 className="text-lg font-black uppercase tracking-tighter text-neutral-900">Novo Lançamento</h4>
                </div>
              </div>
              <button onClick={() => setShowFinanceForm(false)} className="w-12 h-12 bg-white flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all shadow-sm">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Data</label>
                  <input
                    type="date"
                    required
                    value={financeForm.date}
                    onChange={e => setFinanceForm({ ...financeForm, date: e.target.value })}
                    className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Tipo</label>
                  <select
                    value={financeForm.type}
                    onChange={e => setFinanceForm({ ...financeForm, type: e.target.value })}
                    className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 earance-none cursor-pointer"
                  >
                    <option value="in">Entrada (+)</option>
                    <option value="out">Saída (-)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor (R$)</label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={financeForm.val}
                    onChange={e => setFinanceForm({ ...financeForm, val: e.target.value })}
                    className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-[#C5A059] text-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Categoria</label>
                  <select
                    value={financeForm.cat}
                    onChange={e => setFinanceForm({ ...financeForm, cat: e.target.value })}
                    className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 earance-none cursor-pointer"
                  >
                    <option value="Aluguel">Aluguel</option>
                    <option value="manutenção">Manutenção</option>
                    <option value="taxa ADM">Taxa ADM</option>
                    <option value="proteção veicular">Proteção Veicular</option>
                    <option value="multa">Multa</option>
                    <option value="juros">Juros</option>
                    <option value="taxa de pneus">Taxa de Pneus</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Descrição Detalhada</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pagamento semanal André Matos"
                  value={financeForm.desc}
                  onChange={e => setFinanceForm({ ...financeForm, desc: e.target.value })}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Veículo (Opcional)</label>
                  <select
                    value={financeForm.vehiclePlate}
                    onChange={e => setFinanceForm({ ...financeForm, vehiclePlate: e.target.value })}
                    className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 earance-none cursor-pointer"
                  >
                    <option value="">Nenhum</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.plate}>{v.model} ({v.plate})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Responsável</label>
                  <select
                    value={financeForm.responsible}
                    onChange={e => setFinanceForm({ ...financeForm, responsible: e.target.value })}
                    className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 earance-none cursor-pointer"
                  >
                    <option value="Administradora">Administradora</option>
                    <option value="Investidor">Investidor</option>
                  </select>
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" className="w-full py-6 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.4em] font-black hover:bg-[#C5A059] transition-all rounded-2xl shadow-xl">
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinanceiro;
