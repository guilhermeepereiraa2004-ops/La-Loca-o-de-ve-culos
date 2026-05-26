import React, { useState, useEffect, useCallback } from 'react';
import { User, Mail, Phone, MapPin, Key, Landmark, Search, Pencil, Trash2, Plus, Users, Calendar, SendHorizonal, History, ChevronDown, ChevronUp, X } from 'lucide-react';
import { formatCPF } from '../../../utils/cpfFormatter';
import InvestorPayoutModal from '../modals/InvestorPayoutModal.jsx';
import { getPayoutsForInvestor, formatReferenceMonth } from '../../../utils/investorPayouts.js';
import { EditorialLabel } from '../../ui/EditorialLabel';

const AdminInvestidores = ({
  investors,
  investorForm,
  setInvestorForm,
  isEditing,
  setIsEditing,
  onAddInvestor,
  onUpdateInvestor,
  onDeleteInvestor,
  setShowAdminSuccess,
  vehicles = [],
  transactions = [],
  onAddTransaction
}) => {
  const calculateInvestorPayout = (inv) => {
    const invVehicles = (vehicles || []).filter(v => {
      const invNameMatch = v.investor?.toLowerCase().trim() === inv.name?.toLowerCase().trim();
      const invIdMatch = v.investorId === inv.id;
      return invNameMatch || invIdMatch;
    });

    if (invVehicles.length === 0) return { payout: 0, currentMonthNet: 0, carriedDebt: 0 };

    const investorTrans = (transactions || []).filter(t => 
      invVehicles.some(v => v.plate === t.vehiclePlate) ||
      (t.responsible?.toLowerCase().trim() === `investidor: ${inv.name?.toLowerCase().trim()}`)
    );

    // Agrupa o saldo de todos os veículos mês a mês
    const monthlyNet = {};
    investorTrans.forEach(t => {
      if (!t.date) return;
      try {
        const tDate = new Date(t.date + 'T12:00:00');
        const monthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyNet[monthKey]) monthlyNet[monthKey] = 0;
        
        const cat = t.cat?.toLowerCase().trim() || '';
        const val = Math.abs(t.val || 0);
        
        if (t.type === 'in') {
          if (cat === 'taxa adm') {
             monthlyNet[monthKey] -= val;
          } else if (cat === 'pagamento de dívida' || cat === 'pagamento dívida') {
             monthlyNet[monthKey] += val; // Valor integral quita a dívida sem cobrar taxa
          } else {
             const v = invVehicles.find(veh => veh.plate === t.vehiclePlate);
             const taxRate = parseFloat(v?.adminTax || 15) / 100;
             monthlyNet[monthKey] += val;
             monthlyNet[monthKey] -= (val * taxRate);
          }
        } else if (t.type === 'out') {
           const isRespInvestor = t.responsible?.toLowerCase().trim().startsWith('investidor');
           if (isRespInvestor) {
             monthlyNet[monthKey] -= val;
           }
         }
      } catch (e) {}
    });

    // Processa os meses cronologicamente para transportar o saldo negativo
    const sortedMonths = Object.keys(monthlyNet).sort();
    
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    let carriedBalance = 0;

    for (const month of sortedMonths) {
      if (month >= currentMonthKey) {
        // Para no mês atual, pois queremos saber o saldo herdado ATÉ o mês atual
        break;
      }
      
      const net = monthlyNet[month];
      const total = net + carriedBalance;
      
      if (total > 0) {
        // Mês positivo quitou as dívidas (e o investidor recebeu o lucro)
        carriedBalance = 0;
      } else {
        // Mês negativo acumula como dívida para o próximo
        carriedBalance = total;
      }
    }

    const currentMonthNet = monthlyNet[currentMonthKey] || 0;
    const currentPayout = currentMonthNet + carriedBalance;
    
    return {
      payout: currentPayout, // Pode ser negativo se a dívida continuar
      currentMonthNet,
      carriedDebt: carriedBalance
    };
  };
  const [showForm, setShowForm] = React.useState(false);
  const [payoutModal, setPayoutModal] = useState(null); // { investor, amount }
  const [debtPaymentModal, setDebtPaymentModal] = useState(null); // { investor, debtAmount }
  const [debtPaymentInput, setDebtPaymentInput] = useState('');
  const [payoutHistory, setPayoutHistory] = useState({}); // investorId → []
  const [expandedHistory, setExpandedHistory] = useState({}); // investorId → bool

  const loadPayoutHistory = useCallback(async (investorId) => {
    const records = await getPayoutsForInvestor(investorId);
    setPayoutHistory(prev => ({ ...prev, [investorId]: records }));
  }, []);

  useEffect(() => {
    if (!investors || investors.length === 0) return;
    investors.forEach(inv => loadPayoutHistory(inv.id));
  }, [investors, loadPayoutHistory]);

  // If we start editing from outside, we should show the form
  React.useEffect(() => {
    if (isEditing) {
      setShowForm(true);
    }
  }, [isEditing]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Modal de repasse */}
      {payoutModal && (
        <InvestorPayoutModal
          investor={payoutModal.investor}
          amount={payoutModal.amount}
          onClose={() => setPayoutModal(null)}
          onSuccess={() => {
            loadPayoutHistory(payoutModal.investor.id);
            setPayoutModal(null);
          }}
        />
      )}

      {/* Modal de Pagamento de Débito Manual */}
      {debtPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm relative shadow-2xl">
            <button onClick={() => setDebtPaymentModal(null)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-neutral-100 rounded-full hover:bg-neutral-200 transition-colors">
              <X size={16} />
            </button>
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6">
              <Landmark size={24} />
            </div>
            <h3 className="text-xl font-black mb-2 text-neutral-900 tracking-tight">Quitar Dívida</h3>
            <p className="text-sm text-neutral-500 mb-6 font-medium">Investidor: <span className="font-black text-neutral-900">{debtPaymentModal.investor.name}</span></p>
            
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl mb-6">
              <p className="text-[10px] font-black uppercase text-red-400 mb-1 tracking-widest">Saldo Devedor Atual</p>
              <p className="text-2xl font-black text-red-600">R$ {debtPaymentModal.debtAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Valor do Pagamento Recebido (R$)</label>
            <input 
               type="number" 
               value={debtPaymentInput}
               onChange={(e) => setDebtPaymentInput(e.target.value)}
               placeholder="Ex: 150.00"
               className="w-full bg-neutral-50 border border-neutral-150 p-5 text-lg rounded-2xl mt-2 mb-6 outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-black text-neutral-900 shadow-inner"
            />
            
            <button 
              onClick={async () => {
                 const val = parseFloat(debtPaymentInput);
                 if (val > 0) {
                   await onAddTransaction({
                     type: 'in',
                     val: val,
                     cat: 'Pagamento de Dívida',
                     desc: `Pagamento de débito manual - ${debtPaymentModal.investor.name}`,
                     date: new Date().toISOString().split('T')[0],
                     responsible: `Investidor: ${debtPaymentModal.investor.name}`,
                     status: 'Concluído'
                   });
                   setShowAdminSuccess({
                     show: true,
                     title: 'Dívida Quitada',
                     message: `O pagamento de R$ ${val.toLocaleString('pt-BR')} foi registrado com sucesso, reduzindo o saldo devedor do investidor.`
                   });
                   setDebtPaymentModal(null);
                 }
              }}
              className="w-full py-5 bg-neutral-950 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#C5A059] transition-all shadow-lg active:scale-95 duration-200"
            >
               Confirmar Pagamento
            </button>
          </div>
        </div>
      )}

      {!showForm ? (
        <>
          {/* Header */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8 xl:mb-12">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-pulse" />
                <EditorialLabel className="text-[#C5A059] tracking-[0.3em]">Gestão de Ativos e Cotas</EditorialLabel>
              </div>
              <h3 className="text-3xl xl:text-4xl 2xl:text-5xl font-black uppercase tracking-tighter text-neutral-900 leading-none">Investidores</h3>
              <p className="text-neutral-500 font-medium italic text-lg tracking-tight">Painel de parceiros proprietários de ativos e controle financeiro de repasses.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto shrink-0">
              {/* Próximo Pagamento Info */}
              <div className="flex bg-neutral-900 px-6 py-4 rounded-2xl border border-neutral-800 shadow-xl items-center gap-4">
                <div className="w-10 h-10 bg-[#C5A059]/10 text-[#C5A059] rounded-xl flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-widest text-[#C5A059] font-black mb-0.5">Próximo Repasse (5º Dia Útil)</p>
                  <p className="text-xs font-black text-white font-mono">
                    {(() => {
                      const getFifthBusinessDay = (date = new Date()) => {
                        const year = date.getFullYear();
                        const month = date.getMonth();
                        let count = 0;
                        let day = 1;
                        while (count < 5) {
                          const d = new Date(year, month, day);
                          const dayOfWeek = d.getDay();
                          if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
                          if (count < 5) day++;
                        }
                        return new Date(year, month, day);
                      };
                      const today = new Date();
                      const payoutDate = getFifthBusinessDay(new Date(today.getFullYear(), today.getMonth()));
                      if (today > payoutDate) {
                        return getFifthBusinessDay(new Date(today.getFullYear(), today.getMonth() + 1)).toLocaleDateString('pt-BR');
                      }
                      return payoutDate.toLocaleDateString('pt-BR');
                    })()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setInvestorForm({
                    name: '', email: '', phone: '', cpf: '', address: '',
                    password: '', status: 'Ativo', bank: '', pix: ''
                  });
                  setIsEditing(false);
                  setShowForm(true);
                }}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-neutral-950 text-[#C5A059] text-[10px] uppercase tracking-[0.2em] font-black rounded-2xl hover:bg-[#C5A059] hover:text-white transition-all shadow-xl shadow-neutral-950/10 group whitespace-nowrap"
              >
                <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                Novo Investidor
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
            {investors.map((investor) => {
              const { payout, currentMonthNet, carriedDebt } = calculateInvestorPayout(investor);
              const invVehs = (vehicles || []).filter(v => {
                const invNameMatch = v.investor?.toLowerCase().trim() === investor.name?.toLowerCase().trim();
                const invIdMatch = v.investorId === investor.id;
                return invNameMatch || invIdMatch;
              });

              return (
                <div key={investor.id} className="bg-white rounded-3xl border border-neutral-100 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-neutral-200/80 transition-all duration-300 relative overflow-hidden group">
                  {/* Background ambient light */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 blur-3xl -mr-16 -mt-16 animate-pulse" />
                  
                  <div>
                    {/* Card Top: Profile and quick actions */}
                    <div className="flex justify-between items-start mb-5 pb-4 border-b border-neutral-100/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 bg-neutral-950 text-[#C5A059] rounded-2xl flex items-center justify-center font-black text-lg shadow-md shrink-0 group-hover:scale-105 transition-transform duration-300 select-none">
                          {investor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-black text-neutral-900 uppercase tracking-tight truncate" title={investor.name}>
                            {investor.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${investor.status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">{investor.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setInvestorForm(investor);
                            setIsEditing(true);
                            setShowForm(true);
                          }}
                          className="w-8 h-8 bg-neutral-50 text-neutral-400 border border-neutral-200/50 rounded-lg flex items-center justify-center hover:border-[#C5A059] hover:text-[#C5A059] hover:bg-white transition-all shadow-sm active:scale-95"
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => onDeleteInvestor(investor.id)}
                          className="w-8 h-8 bg-red-50/50 text-red-400 border border-red-100/50 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Personal & Bank info block */}
                    <div className="bg-neutral-50/50 border border-neutral-100/70 p-4 rounded-2xl space-y-3.5 mb-5">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-neutral-400">
                          <span>Identificação</span>
                          <span>Contatos</span>
                        </div>
                        
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <p className="text-[8px] uppercase text-neutral-400 font-black">CPF</p>
                            <p className="text-xs font-mono font-bold text-neutral-800 truncate">{investor.cpf || 'Não Informado'}</p>
                          </div>
                          <div className="text-right min-w-0">
                            <p className="text-[8px] uppercase text-neutral-400 font-black">Telefone / E-mail</p>
                            <p className="text-[11px] font-bold text-neutral-800 truncate">{investor.phone}</p>
                            <p className="text-[9px] font-medium text-neutral-400 truncate" title={investor.email}>{investor.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-neutral-100/80 space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-black">Dados para Payout / PIX</span>
                        <p className="text-xs text-neutral-800 font-bold leading-tight truncate">
                          {investor.bank ? `${investor.bank}` : 'Banco N/I'}
                        </p>
                        <p className="text-[10px] font-semibold text-neutral-500 truncate">
                          Chave PIX: <span className="text-[#C5A059] font-bold">{investor.pix || 'Não Informada'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Financial details container */}
                    <div className="bg-[#C5A059]/5 border border-[#C5A059]/10 p-4 rounded-2xl space-y-4 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-[#C5A059] font-black">Saldo Repasse (Líquido)</span>
                          <h4 className="text-xl font-mono font-black text-neutral-900 leading-none mt-1">
                            R$ {Math.max(0, payout).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h4>
                          
                          {carriedDebt < 0 && (
                            <div className="mt-1.5 flex items-center gap-1">
                              <span className="bg-red-50 border border-red-100 text-red-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                Débito: - R$ {Math.abs(carriedDebt).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          
                          {payout < 0 && (
                            <p className="text-[8px] text-red-500 font-black uppercase tracking-wider mt-1.5">
                              Déficit acumulado para próximo ciclo: R$ {Math.abs(payout).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                        
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                          payout > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 
                          payout < 0 ? 'bg-red-50 text-red-600 border-red-100/50' : 
                          'bg-neutral-50 text-neutral-400 border-neutral-200/50'
                        }`}>
                          {payout > 0 ? 'A Repassar' : (payout < 0 ? 'Em Débito' : 'Sem Saldo')}
                        </span>
                      </div>

                      {/* Associated Vehicles & ADM Taxes */}
                      <div className="pt-3 border-t border-[#C5A059]/10 space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-[#C5A059]">
                          <span>Ativos Sob Gestão ({invVehs.length})</span>
                          <span>Taxa Adm</span>
                        </div>
                        
                        {invVehs.length > 0 ? (
                          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                            {invVehs.map(v => (
                              <div key={v.id} className="flex justify-between items-center text-[10px] text-neutral-700 font-bold bg-white/60 px-2.5 py-1 rounded-lg border border-neutral-100">
                                <span className="truncate max-w-[130px]">{v.model} <span className="font-mono text-[9px] text-neutral-400">({v.plate})</span></span>
                                <span className="font-black text-neutral-900">{v.adminTax || 15}%</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[9px] text-neutral-400 font-bold italic uppercase">Nenhum veículo associado</p>
                        )}
                        
                        <div className="flex justify-between items-center text-[9px] text-neutral-400 font-bold uppercase pt-1.5">
                          <span>Seguro Franquia Total (Fixo)</span>
                          <span className="font-mono text-neutral-800">
                            R$ {(39.90 * invVehs.length).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Payout status for current reference month */}
                      {(() => {
                        const now = new Date();
                        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                        const currentPayoutRecord = (payoutHistory[investor.id] || []).find(p => p.reference_month === currentMonthKey);
                        
                        const getFifthBusinessDay = (date = new Date()) => {
                          const year = date.getFullYear();
                          const month = date.getMonth();
                          let count = 0;
                          let day = 1;
                          while (count < 5) {
                            const d = new Date(year, month, day);
                            const dayOfWeek = d.getDay();
                            if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
                            if (count < 5) day++;
                          }
                          return new Date(year, month, day);
                        };
                        const forecastDate = getFifthBusinessDay(now).toLocaleDateString('pt-BR');

                        return (
                          <div className="pt-3 border-t border-[#C5A059]/10 flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            <span>Status Repasse:</span>
                            <div className="text-right">
                              <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${currentPayoutRecord ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                {currentPayoutRecord ? 'Pago' : 'Pendente'}
                              </span>
                              <p className="text-[7.5px] text-neutral-400 mt-1 font-bold">
                                {currentPayoutRecord 
                                  ? `Data: ${new Date(currentPayoutRecord.paid_at).toLocaleDateString('pt-BR')}`
                                  : `Previsão: ${forecastDate}`
                                }
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="space-y-4">
                    {payout > 0 ? (
                      <button
                        onClick={() => setPayoutModal({ investor, amount: payout })}
                        className="w-full py-3.5 bg-neutral-950 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[#C5A059] transition-all flex items-center justify-center gap-2 group shadow-sm active:scale-95 duration-200"
                      >
                        <SendHorizonal size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        Registrar Repasse
                      </button>
                    ) : payout < 0 ? (
                      <button
                        onClick={() => {
                          setDebtPaymentInput(Math.abs(payout).toString());
                          setDebtPaymentModal({ investor, debtAmount: Math.abs(payout) });
                        }}
                        className="w-full py-3.5 bg-amber-500 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 duration-200"
                      >
                        Pagar Débitos Pendentes
                      </button>
                    ) : null}

                    {/* Payout History Collapsible list */}
                    {(payoutHistory[investor.id] || []).length > 0 && (
                      <div className="border-t border-neutral-100/80 pt-3">
                        <button
                          onClick={() => setExpandedHistory(prev => ({ ...prev, [investor.id]: !prev[investor.id] }))}
                          className="w-full flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors py-1"
                        >
                          <span className="flex items-center gap-1.5"><History size={11} /> Histórico de Repasses</span>
                          {expandedHistory[investor.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {expandedHistory[investor.id] && (
                          <div className="space-y-2 mt-2 max-h-36 overflow-y-auto pr-1 animate-in fade-in slide-in-from-top-1 duration-300">
                            {(payoutHistory[investor.id] || []).map(p => (
                              <div key={p.id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                                <div className="min-w-0">
                                  <p className="text-[9px] font-black text-neutral-950 uppercase">{formatReferenceMonth(p.reference_month)}</p>
                                  <p className="text-[8px] text-neutral-400 font-bold uppercase truncate">
                                    {new Date(p.paid_at).toLocaleDateString('pt-BR')} — PIX: {p.pix_key || '—'}
                                  </p>
                                  {p.notes && <p className="text-[8px] text-neutral-400 italic mt-0.5">{p.notes}</p>}
                                </div>
                                <span className="text-[10px] font-black text-emerald-600 whitespace-nowrap ml-4">
                                  R$ {parseFloat(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {investors.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-400 space-y-4 bg-white rounded-[2.5rem] border border-dashed border-neutral-200">
                <Users size={36} className="text-neutral-200" />
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-300">Nenhum investidor cadastrado ainda.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Add/Edit Form */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 xl:mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-pulse" />
                <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-900 leading-none">
                  {isEditing ? 'Editar Investidor' : 'Cadastro de Investidor'}
                </h3>
              </div>
              <p className="text-neutral-500 font-medium italic text-lg tracking-tight">Preencha os dados abaixo para {isEditing ? 'atualizar' : 'cadastrar'} o parceiro no ecossistema.</p>
            </div>
            
            <button
              onClick={() => {
                setShowForm(false);
                setIsEditing(false);
              }}
              className="flex items-center gap-2 px-6 py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[10px] uppercase tracking-[0.2em] font-bold rounded-2xl transition-all"
            >
              <X size={14} /> Voltar para Listagem
            </button>
          </div>

          <div className="bg-white p-8 xl:p-12 rounded-[2rem] xl:rounded-[3rem] border border-neutral-100 shadow-2xl shadow-neutral-900/5">
            <form className="space-y-10" onSubmit={e => e.preventDefault()}>
              
              {/* Seção 1: Dados Cadastrais */}
              <div className="space-y-6">
                <h5 className="text-[11px] uppercase tracking-[0.4em] text-neutral-900 font-black flex items-center gap-2 pb-2 border-b border-neutral-100">
                  <User size={14} className="text-[#C5A059]" /> Informações Cadastrais
                </h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Nome Completo</label>
                    <div className="relative group">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
                      <input 
                        type="text" 
                        value={investorForm.name} 
                        onChange={e => setInvestorForm({ ...investorForm, name: e.target.value })} 
                        className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-12 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
                        placeholder="Nome do parceiro investidor" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">CPF</label>
                    <input 
                      type="text" 
                      value={investorForm.cpf} 
                      onChange={e => setInvestorForm({ ...investorForm, cpf: formatCPF(e.target.value) })} 
                      className="w-full bg-neutral-50 border border-neutral-100 py-4 px-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
                      placeholder="000.000.000-00" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">E-mail Comercial</label>
                    <div className="relative group">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
                      <input 
                        type="email" 
                        value={investorForm.email} 
                        onChange={e => setInvestorForm({ ...investorForm, email: e.target.value })} 
                        className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-12 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
                        placeholder="exemplo@laveiculos.com.br" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Contato Telefônico</label>
                    <div className="relative group">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
                      <input 
                        type="text" 
                        value={investorForm.phone} 
                        onChange={e => setInvestorForm({ ...investorForm, phone: e.target.value })} 
                        className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-12 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
                        placeholder="(00) 99999-9999" 
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Endereço Residencial Completo</label>
                    <div className="relative group">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
                      <input 
                        type="text" 
                        value={investorForm.address} 
                        onChange={e => setInvestorForm({ ...investorForm, address: e.target.value })} 
                        className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-12 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
                        placeholder="Rua, Número, Bairro, Cidade, Estado" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seções de Payout e Acesso lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 pt-4">
                
                {/* Seção 2: Acesso ao Portal */}
                <div className="space-y-6 bg-neutral-50/50 p-6 rounded-3xl border border-neutral-100">
                  <h5 className="text-[11px] uppercase tracking-[0.4em] text-neutral-900 font-black flex items-center gap-2 pb-2 border-b border-neutral-100">
                    <Key size={14} className="text-[#C5A059]" /> Acesso ao Portal
                  </h5>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Senha do Portal</label>
                      <input 
                        type="text" 
                        value={investorForm.password} 
                        onChange={e => setInvestorForm({ ...investorForm, password: e.target.value })} 
                        className="w-full bg-white border border-neutral-100 py-4 px-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner font-mono tracking-widest" 
                        placeholder="Senha segura de acesso" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Status da Conta</label>
                      <select 
                        value={investorForm.status} 
                        onChange={e => setInvestorForm({ ...investorForm, status: e.target.value })} 
                        className="w-full bg-white border border-neutral-100 py-4 px-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seção 3: Dados de Repasse */}
                <div className="space-y-6 bg-neutral-50/50 p-6 rounded-3xl border border-neutral-100">
                  <h5 className="text-[11px] uppercase tracking-[0.4em] text-neutral-900 font-black flex items-center gap-2 pb-2 border-b border-neutral-100">
                    <Landmark size={14} className="text-[#C5A059]" /> Dados para Repasse
                  </h5>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Dados Bancários Completos</label>
                      <input 
                        type="text" 
                        value={investorForm.bank} 
                        onChange={e => setInvestorForm({ ...investorForm, bank: e.target.value })} 
                        className="w-full bg-white border border-neutral-100 py-4 px-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner" 
                        placeholder="Banco, Agência e Conta Corrente" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Chave PIX Oficial</label>
                      <input 
                        type="text" 
                        value={investorForm.pix} 
                        onChange={e => setInvestorForm({ ...investorForm, pix: e.target.value })} 
                        className="w-full bg-white border border-neutral-100 py-4 px-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all shadow-inner text-[#C5A059]" 
                        placeholder="Celular, CPF/CNPJ, E-mail ou Chave Aleatória" 
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Botões do Formulário */}
              <div className="flex justify-end gap-6 pt-6 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setInvestorForm({
                      name: '', email: '', phone: '', cpf: '', address: '',
                      password: '', status: 'Ativo', bank: '', pix: ''
                    });
                    setShowForm(false);
                  }}
                  className="px-8 py-4 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (isEditing) {
                      const res = await onUpdateInvestor(investorForm);
                      if (res && !res.success) return;
                      setIsEditing(false);
                      setShowAdminSuccess({
                        show: true,
                        title: 'Investidor Atualizado',
                        message: 'Os dados do parceiro foram atualizados com sucesso no sistema.'
                      });
                    } else {
                      const res = await onAddInvestor(investorForm);
                      if (res && !res.success) return;
                      setShowAdminSuccess({
                        show: true,
                        title: 'Investidor Cadastrado',
                        message: 'O novo parceiro foi registrado com sucesso no sistema da LA Locação.'
                      });
                    }
                    setInvestorForm({
                      name: '', email: '', phone: '', cpf: '', address: '',
                      password: '', status: 'Ativo', bank: '', pix: ''
                    });
                    setShowForm(false);
                  }}
                  className="px-12 py-5 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-xl hover:bg-[#C5A059] transition-all shadow-xl active:scale-95 duration-200"
                >
                  {isEditing ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </div>

            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminInvestidores;
