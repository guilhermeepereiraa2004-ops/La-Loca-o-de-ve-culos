import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet, Plus, X, Search, Trash2 } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';

const formatTransactionDateTime = (t) => {
  if (t.createdAt) {
    try {
      let dateStr = t.createdAt;
      const lastMinus = dateStr.lastIndexOf('-');
      const lastPlus = dateStr.lastIndexOf('+');
      if (lastMinus > 10) {
        dateStr = dateStr.substring(0, lastMinus) + 'Z';
      } else if (lastPlus > 10) {
        dateStr = dateStr.substring(0, lastPlus) + 'Z';
      } else if (!dateStr.endsWith('Z')) {
        dateStr = dateStr + 'Z';
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const datePart = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const timePart = d.toLocaleTimeString('pt-BR', { 
          timeZone: 'America/Sao_Paulo', 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        return `${datePart} às ${timePart}`;
      }
    } catch (err) {
      console.error("Erro ao formatar data/hora da transação:", err);
    }
  }
  
  if (t.date && t.date.includes('-')) {
    return t.date.substring(0, 10).split('-').reverse().join('/');
  }
  return t.date || '—';
};

const formatManualDate = (t) => {
  if (t.date && t.date.includes('-')) {
    return t.date.substring(0, 10).split('-').reverse().join('/');
  }
  return t.date || null;
};

const getCompanyShareForTransaction = (t, vehicles = [], rentals = []) => {
  if (!t) return 0;
  const val = parseFloat(t.val) || 0;
  if (t.type === 'out' || val < 0) {
    return val;
  }

  const category = (t.cat || '').toLowerCase().trim();
  if (category === 'taxa adm' || category === 'taxa de pneus') {
    return val;
  }

  if (category === 'aluguel') {
    const descLower = (t.desc || '').toLowerCase();
    const isAsaas = descLower.includes('recebimento') || descLower.includes('asaas');
    if (!isAsaas) {
      return 0;
    }

    const vehicle = vehicles.find(v => v.plate === t.vehiclePlate);
    const adminTaxPercent = parseFloat(vehicle?.adminTax || 20) / 100;
    
    const rental = rentals.find(r => r.plate === t.vehiclePlate || r.vehiclePlate === t.vehiclePlate);
    const tireTax = rental ? parseFloat(rental.tireTax || 25) : 25;

    if (val <= tireTax) {
      return val;
    }

    const rentValueWithoutTireTax = val - tireTax;
    const adminShare = rentValueWithoutTireTax * adminTaxPercent;
    return adminShare + tireTax;
  }

  return val;
};

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
  investors = [],
  rentals = [],
  setItemToDelete,
  setDeleteType,
  setShowDeleteAuthModal
}) => {
  const [selectedMonth, setSelectedMonth] = useState('Todos'); // 'Todos' or 'YYYY-MM'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Extract available categories dynamically from transactions list
  const getAvailableCategories = () => {
    const categoriesSet = new Set();
    filteredRawTransactions.forEach(t => {
      if (t.cat) {
        categoriesSet.add(t.cat.trim());
      }
    });
    return Array.from(categoriesSet).sort();
  };

  // Exclude vehicle protection transactions before June 2026
  const filteredRawTransactions = (transactions || []).filter(t => {
    const isProtection = t.cat?.toLowerCase().includes('prote') || t.cat?.toLowerCase().includes('veicular');
    const isBeforeJune2026 = t.date && t.date < '2026-06-01';
    return !(isProtection && isBeforeJune2026);
  });

  // Extract available months from transaction dates
  const getAvailableMonths = () => {
    const monthsSet = new Set();
    filteredRawTransactions.forEach(t => {
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
  const displayedTransactionsForTotals = filteredRawTransactions.filter(t => {
    const matchesMonth = selectedMonth === 'Todos' || (t.date && t.date.substring(0, 7) === selectedMonth);
    const isInvestor = t.responsible?.toLowerCase().trim().startsWith('investidor');
    const isProtection = t.cat?.toLowerCase().includes('prote') || t.cat?.toLowerCase().includes('veicular');
    const isInsurance = t.cat?.toLowerCase().includes('seguro') || t.cat?.toLowerCase().includes('franquia');
    
    // Hide manual rent transactions (gross rent) from the company cash flow totals
    const isManualRent = t.type === 'in' && (t.cat || '').toLowerCase().trim() === 'aluguel' && 
      !((t.desc || '').toLowerCase().includes('recebimento') || (t.desc || '').toLowerCase().includes('asaas'));

    return matchesMonth && (!isInvestor || isProtection || isInsurance) && !isManualRent;
  });

  const totalIn = displayedTransactionsForTotals
    .filter(t => t.type === 'in')
    .reduce((acc, t) => acc + getCompanyShareForTransaction(t, vehicles, rentals), 0);
  const totalOut = Math.abs(
    displayedTransactionsForTotals
      .filter(t => t.type === 'out')
      .reduce((acc, t) => acc + getCompanyShareForTransaction(t, vehicles, rentals), 0)
  );
  const netBalance = totalIn - totalOut;

  // Filter transaction list based on type, month, category, and search term
  const filteredTransactions = filteredRawTransactions.filter(t => {
    const matchesType = 
      financeFilter === 'Todos' || 
      (financeFilter === 'Entradas' && t.type === 'in') || 
      (financeFilter === 'Saídas' && t.type === 'out');
      
    const matchesMonth = 
      selectedMonth === 'Todos' || 
      (t.date && t.date.substring(0, 7) === selectedMonth);
      
    const matchesCategory = 
      selectedCategory === 'Todos' || 
      (t.cat && t.cat.toLowerCase().trim() === selectedCategory.toLowerCase().trim());
      
    const matchesSearch = 
      !searchTerm || 
      (t.desc && t.desc.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (t.responsible && t.responsible.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.vehiclePlate && t.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()));

    // Hide manual rent transactions (gross rent) from the company transactions list
    const isManualRent = t.type === 'in' && (t.cat || '').toLowerCase().trim() === 'aluguel' && 
      !((t.desc || '').toLowerCase().includes('recebimento') || (t.desc || '').toLowerCase().includes('asaas'));

    return matchesType && matchesMonth && matchesCategory && matchesSearch && !isManualRent;
  }).sort((a, b) => {
    const getMs = (t) => {
      if (t.createdAt) {
        const d = new Date(t.createdAt);
        if (!isNaN(d.getTime())) return d.getTime();
      }
      if (t.date) {
        const d = new Date(t.date.includes('T') ? t.date : `${t.date}T00:00:00`);
        if (!isNaN(d.getTime())) return d.getTime();
      }
      return 0;
    };
    const diff = getMs(b) - getMs(a);
    if (diff !== 0) return diff;
    return (b.id || 0) - (a.id || 0);
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

        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Entradas/Saídas Toggle */}
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-neutral-100 w-fit shadow-sm">
            {['Todos', 'Entradas', 'Saídas'].map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFinanceFilter(f)}
                className={`px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${financeFilter === f ? 'bg-neutral-950 text-white shadow-md' : 'text-neutral-400 hover:text-neutral-900'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative group min-w-[260px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#C5A059] transition-colors" size={16} />
              <input
                type="text"
                placeholder="Pesquisar por nome ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-neutral-100 pl-11 pr-10 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] transition-all font-bold text-[10px] text-neutral-900 uppercase tracking-widest"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-neutral-100 shadow-sm">
              <span className="text-[9px] uppercase tracking-widest font-black text-neutral-400 ml-2">Categoria:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-neutral-50 border-none px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black text-neutral-900 outline-none cursor-pointer focus:ring-2 focus:ring-[#C5A059]/20"
              >
                <option value="Todos">Todas</option>
                {getAvailableCategories().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Filter Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-neutral-50 p-6 rounded-[2rem] border border-neutral-100/80 shadow-sm">
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-center">
            <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-1">Registros Filtrados</p>
            <p className="text-xl font-black text-neutral-900">{filteredTransactions.length === 1 ? '1 item' : `${filteredTransactions.length} itens`}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-center">
            <p className="text-[9px] uppercase tracking-widest text-emerald-600 font-black mb-1">Entradas no Filtro</p>
            <p className="text-xl font-black text-emerald-600">
              R$ {filteredTransactions.filter(t => t.type === 'in').reduce((acc, t) => acc + getCompanyShareForTransaction(t, vehicles, rentals), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-center">
            <p className="text-[9px] uppercase tracking-widest text-red-500 font-black mb-1">Saídas no Filtro</p>
            <p className="text-xl font-black text-red-500">
              R$ {Math.abs(filteredTransactions.filter(t => t.type === 'out').reduce((acc, t) => acc + getCompanyShareForTransaction(t, vehicles, rentals), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-center">
            <p className="text-[9px] uppercase tracking-widest text-[#C5A059] font-black mb-1">Saldo Líquido (Filtro)</p>
            <p className={`text-xl font-black ${
              (filteredTransactions.filter(t => t.type === 'in').reduce((acc, t) => acc + getCompanyShareForTransaction(t, vehicles, rentals), 0) - 
               Math.abs(filteredTransactions.filter(t => t.type === 'out').reduce((acc, t) => acc + getCompanyShareForTransaction(t, vehicles, rentals), 0))) >= 0 
                ? 'text-[#C5A059]' 
                : 'text-red-600'
            }`}>
              R$ {(
                filteredTransactions.filter(t => t.type === 'in').reduce((acc, t) => acc + getCompanyShareForTransaction(t, vehicles, rentals), 0) - 
                Math.abs(filteredTransactions.filter(t => t.type === 'out').reduce((acc, t) => acc + getCompanyShareForTransaction(t, vehicles, rentals), 0))
              ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
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
                  filteredTransactions.map((t, i) => {
                    const veh = t.vehiclePlate ? (vehicles || []).find(v => v.plate === t.vehiclePlate) : null;
                    return (
                      <tr key={i} className="group hover:bg-neutral-50/50 transition-colors">
                        <td className="px-4 py-3 xl:px-6 xl:py-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                              {t.type === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                            </div>
                            <div>
                              <p className="text-sm font-black text-neutral-900">{t.desc}</p>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {formatManualDate(t) && (
                                  <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black">Ref: {formatManualDate(t)}</p>
                                )}
                                <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Gerado: {formatTransactionDateTime(t)}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 xl:px-6 xl:py-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-50 px-3 py-1 rounded-full">{t.cat}</span>
                        </td>
                        <td className="px-4 py-3 xl:px-6 xl:py-4">
                          <p className="text-xs font-bold text-neutral-900">{t.vehiclePlate || 'N/A'}</p>
                          <div className="flex flex-col">
                            <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black">{t.responsible}</p>
                            {veh?.investor && (
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Inv: {veh.investor}</p>
                            )}
                          </div>
                        </td>
                      <td className="px-4 py-3 xl:px-6 xl:py-4 text-right">
                        <p className={`text-sm font-black ${t.type === 'in' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                          {t.type === 'in' ? '+' : '-'} R$ {Math.abs(getCompanyShareForTransaction(t, vehicles, rentals)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="px-4 py-3 xl:px-6 xl:py-4">
                        <div className="flex items-center justify-between gap-3">
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
                          <button
                            onClick={() => {
                              setItemToDelete(t);
                              setDeleteType('transaction');
                              setShowDeleteAuthModal(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition-all active:scale-95"
                            title="Excluir Transação"
                          >
                            <Trash2 size={14} />
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
              filteredTransactions.map((t, i) => {
                const veh = t.vehiclePlate ? (vehicles || []).find(v => v.plate === t.vehiclePlate) : null;
                return (
                  <div key={i} className="p-5 flex flex-col gap-4 hover:bg-neutral-50/50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                          {t.type === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-neutral-900 leading-tight truncate">{t.desc}</p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            {formatManualDate(t) && (
                              <p className="text-[9px] uppercase tracking-widest text-[#C5A059] font-black">Ref: {formatManualDate(t)}</p>
                            )}
                            <p className="text-[8px] uppercase tracking-widest text-neutral-400 font-bold">Gerado: {formatTransactionDateTime(t)}</p>
                          </div>
                        </div>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-50 px-2.5 py-1 rounded-full shrink-0 border border-neutral-100">{t.cat}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-2 border-t border-b border-neutral-50 text-xs">
                      <div>
                        <p className="text-[8px] uppercase text-neutral-400 font-black">Origem / Placa</p>
                        <p className="font-bold text-neutral-800 truncate">{t.vehiclePlate || 'N/A'}</p>
                        <p className="text-[8px] uppercase tracking-widest text-[#C5A059] font-black truncate">
                          {t.responsible} {veh?.investor ? `| Inv: ${veh.investor}` : ''}
                        </p>
                      </div>
                    <div className="text-right">
                      <p className="text-[8px] uppercase text-neutral-400 font-black">Valor</p>
                      <p className={`text-sm font-black ${t.type === 'in' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                        {t.type === 'in' ? '+' : '-'} R$ {Math.abs(getCompanyShareForTransaction(t, vehicles, rentals)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
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
                    <button
                      onClick={() => {
                        setItemToDelete(t);
                        setDeleteType('transaction');
                        setShowDeleteAuthModal(true);
                      }}
                      className="p-2 text-neutral-400 hover:text-red-500 rounded-lg bg-neutral-50 hover:bg-red-50 transition-all active:scale-95 border border-neutral-100"
                      title="Excluir Transação"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>


    </div>
  );
};

export default AdminFinanceiro;
