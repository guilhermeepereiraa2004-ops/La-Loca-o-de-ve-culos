import React, { useState } from 'react';
import { Search, Receipt, Calendar, ArrowRight, Car, AlertCircle, CheckCircle2, TrendingUp, Wallet, Coins, ArrowUpRight, Filter } from 'lucide-react';
import { getDayOfWeek } from '../../../utils/adminUtils.jsx';
import { EditorialLabel } from '../../ui/EditorialLabel';

const AdminFaturamento = ({ rentals = [], replacementContracts = [], vehicles = [], onConfirmPayment }) => {
  const [search, setSearch] = useState('');
  const [lateFees, setLateFees] = useState({}); // rentalId -> value

  const handleConfirm = (rentalId, calc) => {
    const lateFee = parseFloat(lateFees[rentalId] || 0);
    onConfirmPayment(rentalId, { ...calc, lateFee });
    alert('Pagamento confirmado e receita enviada ao financeiro!');
  };

  const calculateBoleto = (rental) => {
    const weeklyRate = parseFloat(String(rental.value || 0).replace(/\./g, '').replace(',', '.')) || 0;
    const dailyRate = weeklyRate / 7;
    
    const activeRC = Array.isArray(replacementContracts) 
      ? replacementContracts.find(rc => rc.mainVehiclePlate === (rental.plate || rental.vehiclePlate) && rc.status === 'Ativo')
      : null;
    
    const daysInMaintenance = activeRC ? 4 : 0; 
    const replacementDays = activeRC ? 4 : 0; 
    const replacementDailyRate = activeRC ? (activeRC.dailyRate || 80) : 0;
    
    const abatimento = dailyRate * daysInMaintenance;
    const replacementCharge = replacementDailyRate * replacementDays;
    const tireTax = parseFloat(String(rental.tireTax || 0).replace(/\./g, '').replace(',', '.')) || 0;
    
    const baseTotal = (weeklyRate - abatimento) + replacementCharge + tireTax;
    const lateFeeVal = parseFloat(lateFees[rental.id] || 0);
    const total = baseTotal + lateFeeVal;

    return {
      weeklyRate,
      dailyRate,
      daysInMaintenance,
      abatimento,
      replacementCharge,
      replacementDays,
      replacementDailyRate,
      tireTax,
      total,
      activeRC
    };
  };

  const safeRentals = Array.isArray(rentals) ? rentals : [];
  
  const filtered = safeRentals.filter(r => 
    r.status === 'Ativo' && 
    (
      (r.userName || r.user || '').toLowerCase().includes(search.toLowerCase()) || 
      (r.plate || r.vehiclePlate || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalPrevisao = filtered.reduce((acc, r) => acc + calculateBoleto(r).total, 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-neutral-900 rounded-full animate-pulse" />
            <EditorialLabel className="text-neutral-900 tracking-[0.3em]">Módulo de Receita e Cobrança</EditorialLabel>
          </div>
          <h3 className="text-5xl font-black uppercase tracking-tighter text-neutral-900 leading-none">Faturamento</h3>
          <p className="text-neutral-500 font-medium italic text-lg tracking-tight">Gestão individual de boletos baseada no ciclo de cada contrato.</p>
        </div>

        <div className="relative w-full md:w-96 group">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar condutor ou placa..."
            className="w-full bg-white border border-neutral-100 py-5 pl-14 pr-6 rounded-[2rem] text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] transition-all shadow-xl shadow-neutral-900/5"
          />
        </div>
      </div>

      {/* Minimalist Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-8 bg-neutral-900 rounded-[3rem] shadow-xl relative overflow-hidden">
          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-500 font-black mb-1">Previsão Semanal</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-[#C5A059] tracking-tighter">R$</span>
            <h4 className="text-4xl font-black text-white tracking-tighter">
              {totalPrevisao.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h4>
          </div>
        </div>

        <div className="p-8 bg-white rounded-[3rem] border border-neutral-100 shadow-sm">
          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-400 font-black mb-1">Taxa de Conversão</p>
          <h4 className="text-4xl font-black text-neutral-900 tracking-tighter">94%</h4>
          <p className="text-[8px] text-emerald-600 font-black uppercase tracking-widest mt-1">Saldos Positivos</p>
        </div>

        <div className="p-8 bg-white rounded-[3rem] border border-neutral-100 shadow-sm">
          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-400 font-black mb-1">Ciclo Ativo</p>
          <h4 className="text-4xl font-black text-neutral-900 tracking-tighter">{filtered.length}</h4>
          <p className="text-[8px] text-neutral-400 font-black uppercase tracking-widest mt-1">Condutores Ativos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {filtered.length > 0 ? (
          filtered.map(rental => {
            const calc = calculateBoleto(rental);
            return (
              <div key={rental.id} className="bg-white rounded-[3.5rem] border border-neutral-100 shadow-sm overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-neutral-900/5">
                <div className="flex flex-col xl:flex-row">
                  {/* Conductor Profile Section */}
                  <div className="xl:w-[350px] p-10 bg-neutral-50/20 border-r border-neutral-50">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059] font-black text-xl shadow-lg">
                        {(rental.userName || rental.user || '?').charAt(0)}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xl font-black text-neutral-900 uppercase tracking-tighter leading-none">{rental.userName || rental.user}</h4>
                        <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">
                          {getDayOfWeek(rental.startDate || rental.date)}s
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-neutral-100">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Ativo</span>
                        <span className="bg-neutral-50 px-2 py-1 rounded-md text-[8px] font-black border border-neutral-100 text-neutral-400">{rental.plate || rental.vehiclePlate}</span>
                      </div>
                      <p className="text-base font-black text-neutral-900 uppercase tracking-tighter mb-1">{rental.vehicleModel || rental.vehicle}</p>
                      <p className="text-[10px] font-bold text-neutral-400">R$ {calc.weeklyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / sem</p>
                    </div>
                  </div>

                  {/* Calculations Details */}
                  <div className="flex-1 p-10 space-y-8">
                    <div className="space-y-1 border-b border-neutral-50 pb-6">
                      <h5 className="text-[10px] uppercase tracking-[0.3em] text-neutral-900 font-black">Detalhamento Financeiro</h5>
                      <p className="text-[9px] text-neutral-400 font-medium uppercase tracking-widest">Compensações e débitos do ciclo</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Aluguel Base</span>
                          <span className="text-xs font-black text-neutral-900">R$ {calc.weeklyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>

                        {calc.daysInMaintenance > 0 && (
                          <div className="flex justify-between items-center text-neutral-900 border-l-2 border-neutral-900 pl-4">
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-black uppercase tracking-widest">Abatimento Oficina</p>
                              <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-tighter">{calc.daysInMaintenance} dias</p>
                            </div>
                            <span className="text-xs font-black">- R$ {calc.abatimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Taxa de Pneus</span>
                          <span className="text-xs font-black text-neutral-900">R$ {calc.tireTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="pt-5 border-t border-neutral-50">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-neutral-900 uppercase tracking-widest">Ajuste Manual</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-neutral-300">R$</span>
                              <input 
                                type="number" 
                                value={lateFees[rental.id] || ''} 
                                onChange={e => setLateFees({...lateFees, [rental.id]: e.target.value})}
                                placeholder="0,00"
                                className="w-24 bg-neutral-50 border border-neutral-100 rounded-xl p-2.5 text-right text-xs font-black outline-none focus:ring-2 focus:ring-neutral-200 transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={`p-6 rounded-[2rem] border transition-all ${calc.activeRC ? 'bg-neutral-950 text-white' : 'bg-neutral-50 border-neutral-50 opacity-40'}`}>
                        <div className="flex justify-between items-center mb-6">
                          <p className={`text-[9px] font-black uppercase tracking-widest ${calc.activeRC ? 'text-[#C5A059]' : 'text-neutral-400'}`}>Carro Reserva</p>
                          {calc.activeRC && <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-pulse" />}
                        </div>
                        
                        {calc.activeRC ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center text-[#C5A059]"><Car size={20} /></div>
                              <div>
                                <p className="text-sm font-black uppercase tracking-tighter">{calc.activeRC.replacementVehiclePlate}</p>
                                <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest">{calc.replacementDays} diárias</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-neutral-800">
                              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Adicional</span>
                              <span className="text-base font-black text-[#C5A059]">+ R$ {calc.replacementCharge.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-neutral-300 py-4">
                            <AlertCircle size={20} className="mb-2 opacity-20" />
                            <p className="text-[8px] font-black uppercase tracking-widest">Nenhum Registro</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary & Action */}
                  <div className="xl:w-[320px] p-10 flex flex-col justify-between bg-neutral-50/30">
                    <div className="p-8 bg-neutral-900 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                      <p className="text-[8px] uppercase tracking-[0.3em] text-neutral-500 font-black mb-3">Total do Boleto</p>
                      <p className="text-4xl font-black text-white tracking-tighter leading-none mb-1">
                        <span className="text-lg text-[#C5A059] mr-1">R$</span>
                        {calc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[8px] text-neutral-500 font-black uppercase tracking-widest">Base + Ajustes</p>
                    </div>
                    
                    <button 
                      onClick={() => handleConfirm(rental.id, calc)}
                      className="w-full mt-6 py-5 bg-[#C5A059] text-neutral-900 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-neutral-950 hover:text-white transition-all shadow-xl shadow-neutral-900/5 flex items-center justify-center gap-2 group"
                    >
                      Confirmar Pagamento <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-32 text-center bg-white border border-neutral-100 rounded-[3rem]">
            <Receipt size={40} className="mx-auto mb-6 text-neutral-100" />
            <h4 className="text-xl font-black text-neutral-900 uppercase tracking-tighter mb-1">Sem faturamento ativo</h4>
            <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">Nenhum contrato ativo encontrado para este ciclo</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFaturamento;
