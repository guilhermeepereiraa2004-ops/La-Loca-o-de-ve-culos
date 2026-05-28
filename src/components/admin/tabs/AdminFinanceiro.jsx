import React, { useState } from 'react';
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
  vehicles,
  onUpdateTransactionStatus,
  investors = []
}) => {
  const [selectedMonth, setSelectedMonth] = useState('Todos'); // 'Todos' or 'YYYY-MM'

  // Extract available months from transaction dates
  const getAvailableMonths = () => {
    const monthsSet = new Set();
    transactions.forEach(t => {
      if (t.date) {
        monthsSet.add(t.date.substring(0, 7)); // 'YYYY-MM'
      }
    });
    return Array.from(monthsSet).sort().reverse();
  };

  const formatMonthYear = (monthStr) => {
    if (!monthStr || monthStr === 'Todos') return 'Todos os Meses';
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[parseInt(month) - 1]} / ${year}`;
  };

  // Filter transactions for totals display based on selectedMonth (only company transactions)
  const displayedTransactionsForTotals = transactions.filter(t => {
    const matchesMonth = selectedMonth === 'Todos' || (t.date && t.date.substring(0, 7) === selectedMonth);
    const isInvestor = t.responsible?.toLowerCase().trim().startsWith('investidor');
    return matchesMonth && !isInvestor;
  });

  const totalIn = displayedTransactionsForTotals.filter(t => t.type === 'in').reduce((acc, t) => acc + t.val, 0);
  const totalOut = Math.abs(displayedTransactionsForTotals.filter(t => t.type === 'out').reduce((acc, t) => acc + t.val, 0));
  const netBalance = totalIn - totalOut;

  // Filter transaction list based on both type filter and month filter
  const filteredTransactions = transactions.filter(t => {
    const matchesType = 
      financeFilter === 'Todos' || 
      (financeFilter === 'Entradas' && t.type === 'in') || 
      (financeFilter === 'Saídas' && t.type === 'out');
      
    const matchesMonth = 
      selectedMonth === 'Todos' || 
      (t.date && t.date.substring(0, 7) === selectedMonth);
      
    return matchesType && matchesMonth;
  });

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-right-4 duration-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl xl:text-3xl 2xl:text-4xl font-black uppercase tracking-tighter">Controle Financeiro</h3>
          <p className="text-neutral-400 text-sm font-light mt-1">Gestão de fluxo de caixa, conciliação e histórico de lançamentos.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Month Selector */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-neutral-100 shadow-sm shrink-0">
            <span className="text-[9px] uppercase tracking-widest font-black text-neutral-400 ml-2">Filtrar por Mês:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-neutral-50 border-none px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black text-neutral-900 outline-none cursor-pointer focus:ring-2 focus:ring-[#C5A059]/20"
            >
              <option value="Todos">Todos os Meses</option>
              {getAvailableMonths().map(m => (
                <option key={m} value={m}>{formatMonthYear(m)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 1: Resumo do Caixa */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-[#C5A059] rounded-full" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
            Resumo de Caixa {selectedMonth !== 'Todos' && `(${formatMonthYear(selectedMonth)})`}
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6 2xl:gap-8">
          <div className="bg-white p-6 xl:p-8 2xl:p-10 rounded-[1.5rem] xl:rounded-[2rem] 2xl:rounded-[2.5rem] border border-neutral-100 shadow-sm hover:shadow-md transition-all">
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-4 flex items-center gap-2">
              <ArrowDownLeft size={14} className="text-emerald-500" /> Total de Entradas
            </p>
            <p className="text-2xl xl:text-3xl 2xl:text-4xl font-black text-neutral-900">
              R$ {totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-neutral-300 font-bold mt-4 uppercase tracking-widest">Baseado em lançamentos reais</p>
          </div>
          <div className="bg-white p-6 xl:p-8 2xl:p-10 rounded-[1.5rem] xl:rounded-[2rem] 2xl:rounded-[2.5rem] border border-neutral-100 shadow-sm hover:shadow-md transition-all">
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-4 flex items-center gap-2">
              <ArrowUpRight size={14} className="text-red-500" /> Total de Saídas
            </p>
            <p className="text-2xl xl:text-3xl 2xl:text-4xl font-black text-neutral-900">
              R$ {totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-neutral-300 font-bold mt-4 uppercase tracking-widest">Fluxo de despesas atual</p>
          </div>
          <div className="bg-neutral-950 p-6 xl:p-8 2xl:p-10 rounded-[1.5rem] xl:rounded-[2rem] 2xl:rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-4">Saldo em Caixa (Net)</p>
              <p className="text-2xl xl:text-3xl 2xl:text-4xl font-black text-[#C5A059]">
                R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="mt-6 flex gap-2">
                <span className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-[9px] font-black uppercase tracking-widest text-neutral-400">
                  {selectedMonth === 'Todos' ? 'Histórico Consolidado' : formatMonthYear(selectedMonth)}
                </span>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Wallet size={80} />
            </div>
          </div>
        </div>
      </div>

      <hr className="border-neutral-100" />

      {/* Section 2: Histórico de Lançamentos */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-[#C5A059] rounded-full" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Histórico de Transações</h4>
          </div>

          <button
            onClick={() => setShowFinanceForm(true)}
            className="px-8 py-5 bg-[#C5A059] text-neutral-950 text-[10px] uppercase tracking-widest font-black rounded-2xl hover:bg-neutral-950 hover:text-white transition-all flex items-center gap-3 shadow-lg shadow-[#C5A059]/10"
          >
            <Plus size={16} /> Novo Lançamento
          </button>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-neutral-100 w-fit shadow-sm">
          {['Todos', 'Entradas', 'Saídas'].map(f => (
            <button
              key={f}
              onClick={() => setFinanceFilter(f)}
              className={`px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${financeFilter === f ? 'bg-neutral-950 text-white shadow-md' : 'text-neutral-400 hover:text-neutral-900'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden">
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left min-w-full">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-100">
                  <th className="px-4 py-3 xl:px-6 xl:py-4 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Descrição / Data</th>
                  <th className="px-4 py-3 xl:px-6 xl:py-4 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Categoria</th>
                  <th className="px-4 py-3 xl:px-6 xl:py-4 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Origem / Responsável</th>
                  <th className="px-4 py-3 xl:px-6 xl:py-4 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400 text-right">Valor</th>
                  <th className="px-4 py-3 xl:px-6 xl:py-4 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Status</th>
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
                      <td className="px-4 py-3 xl:px-6 xl:py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            {t.type === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-neutral-900">{t.desc}</p>
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">{t.date && t.date.includes('-') ? t.date.substring(0, 10).split('-').reverse().join('/') : t.date || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 xl:px-6 xl:py-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-50 px-3 py-1 rounded-full">{t.cat}</span>
                      </td>
                      <td className="px-4 py-3 xl:px-6 xl:py-4">
                        <p className="text-xs font-bold text-neutral-900">{t.vehiclePlate || 'N/A'}</p>
                        <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black">{t.responsible}</p>
                      </td>
                      <td className="px-4 py-3 xl:px-6 xl:py-4 text-right">
                        <p className={`text-sm font-black ${t.type === 'in' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                          {t.type === 'in' ? '+' : '-'} R$ {Math.abs(t.val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="px-4 py-3 xl:px-6 xl:py-4">
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${t.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {t.status}
                          </span>
                          {t.status !== 'Concluído' && onUpdateTransactionStatus && (
                            <button
                              onClick={() => {
                                onUpdateTransactionStatus(t.id, 'Concluído');
                                alert('Transação marcada como Concluída / Paga com sucesso!');
                              }}
                              className="px-3 py-1 bg-neutral-900 text-white hover:bg-[#C5A059] text-[8px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95"
                            >
                              Pagar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden divide-y divide-neutral-100">
            {filteredTransactions.length === 0 ? (
              <div className="p-10 text-center text-neutral-300">
                <button
                  onClick={() => setShowFinanceForm(true)}
                  className="text-[9px] text-[#C5A059] font-black uppercase underline tracking-widest hover:text-neutral-900 transition-colors"
                >
                  Iniciar Fluxo de Caixa
                </button>
              </div>
            ) : (
              filteredTransactions.map((t, i) => (
                <div key={i} className="p-5 flex flex-col gap-4 hover:bg-neutral-50/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {t.type === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-neutral-900 leading-tight truncate">{t.desc}</p>
                        <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mt-0.5">{t.date && t.date.includes('-') ? t.date.substring(0, 10).split('-').reverse().join('/') : t.date || '—'}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-50 px-2.5 py-1 rounded-full shrink-0 border border-neutral-100">{t.cat}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-t border-b border-neutral-50 text-xs">
                    <div>
                      <p className="text-[8px] uppercase text-neutral-400 font-black">Origem / Placa</p>
                      <p className="font-bold text-neutral-800 truncate">{t.vehiclePlate || 'N/A'}</p>
                      <p className="text-[8px] uppercase tracking-widest text-[#C5A059] font-black truncate">{t.responsible}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] uppercase text-neutral-400 font-black">Valor</p>
                      <p className={`text-sm font-black ${t.type === 'in' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                        {t.type === 'in' ? '+' : '-'} R$ {Math.abs(t.val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${t.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                      {t.status}
                    </span>
                    {t.status !== 'Concluído' && onUpdateTransactionStatus && (
                      <button
                        onClick={() => {
                          onUpdateTransactionStatus(t.id, 'Concluído');
                          alert('Transação marcada como Concluída / Paga com sucesso!');
                        }}
                        className="px-4 py-2 bg-neutral-900 text-white hover:bg-[#C5A059] text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 shrink-0"
                      >
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Novo Lançamento Financeiro */}
      {showFinanceForm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-xl" onClick={() => setShowFinanceForm(false)} />
          <div className="bg-white w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col">
            <div className="p-6 md:p-10 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50 shrink-0">
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

            <form onSubmit={handleSaveTransaction} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 appearance-none cursor-pointer"
                    >
                      <option value="in">Entrada (+)</option>
                      <option value="out">Saída (-)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 appearance-none cursor-pointer"
                    >
                      <option value="Aluguel">Aluguel</option>
                      <option value="manutenção">Manutenção</option>
                      <option value="taxa ADM">Taxa ADM</option>
                      <option value="proteção veicular">Proteção Veicular</option>
                      <option value="multa">Multa</option>
                      <option value="juros">Juros</option>
                      <option value="taxa de pneus">Taxa de Pneus</option>
                      <option value="Taxa Gateway / Asaas">Taxa Gateway / Asaas</option>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Veículo (Opcional)</label>
                    <select
                      value={financeForm.vehiclePlate}
                      onChange={e => setFinanceForm({ ...financeForm, vehiclePlate: e.target.value })}
                      className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 appearance-none cursor-pointer"
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
                      value={financeForm.responsible.startsWith('Investidor') ? 'Investidor' : 'Administradora'}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'Investidor') {
                          setFinanceForm({ ...financeForm, responsible: 'Investidor', investorName: '' });
                        } else {
                          setFinanceForm({ ...financeForm, responsible: 'Administradora', investorName: '' });
                        }
                      }}
                      className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 appearance-none cursor-pointer"
                    >
                      <option value="Administradora">Administradora</option>
                      <option value="Investidor">Investidor</option>
                    </select>
                  </div>
                </div>

                {financeForm.responsible.startsWith('Investidor') && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Investidor Responsável</label>
                    <select
                      required
                      value={financeForm.investorName || ''}
                      onChange={e => {
                        const selectedInvName = e.target.value;
                        setFinanceForm({ 
                          ...financeForm, 
                          investorName: selectedInvName,
                          responsible: selectedInvName ? `Investidor: ${selectedInvName}` : 'Investidor'
                        });
                      }}
                      className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 appearance-none cursor-pointer"
                    >
                      <option value="">Selecione um Investidor...</option>
                      {investors.map(inv => (
                        <option key={inv.id} value={inv.name}>{inv.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 border-t border-neutral-50 bg-neutral-50/30 flex justify-end shrink-0">
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
