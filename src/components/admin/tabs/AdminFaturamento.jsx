import React, { useState } from 'react';
import { Search, Receipt, Calendar, ArrowRight, Car, AlertCircle, CheckCircle2, TrendingUp, Wallet } from 'lucide-react';
import { getDayOfWeek } from '../../../utils/adminUtils.jsx';

const AdminFaturamento = ({ rentals = [], replacementContracts = [], vehicles = [], onConfirmPayment }) => {
  const [search, setSearch] = useState('');
  const [lateFees, setLateFees] = useState({}); // rentalId -> value

  const handleConfirm = (rentalId, calc) => {
    const lateFee = parseFloat(lateFees[rentalId] || 0);
    onConfirmPayment(rentalId, { ...calc, lateFee });
    // Optional: show success feedback
    alert('Pagamento confirmado e receita enviada ao financeiro!');
  };

  const calculateBoleto = (rental) => {
    const weeklyRate = parseFloat(String(rental.value || 0).replace(/\./g, '').replace(',', '.')) || 0;
    const dailyRate = weeklyRate / 7;
    
    // Find active replacement contract for this driver/vehicle
    const activeRC = replacementContracts.find(rc => rc.mainVehiclePlate === rental.plate && rc.status === 'Ativo');
    
    const daysInMaintenance = activeRC ? 4 : 0; // Mock for example
    const replacementDays = activeRC ? 4 : 0; // Mock for example
    const replacementDailyRate = activeRC ? (activeRC.dailyRate || 80) : 0;
    
    const abatimento = dailyRate * daysInMaintenance;
    const replacementCharge = replacementDailyRate * replacementDays;
    const tireTax = parseFloat(rental.tireTax) || 0;
    
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

  const filtered = rentals.filter(r => 
    r.status === 'Ativo' && 
    (r.user.toLowerCase().includes(search.toLowerCase()) || r.plate.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-4xl font-black uppercase tracking-tighter">Faturamento Individual</h3>
          <p className="text-neutral-400 text-sm font-light mt-1">Gestão de cobranças baseada no ciclo individual de cada contrato.</p>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
        <input 
          type="text" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Buscar condutor ou placa..." 
          className="w-full bg-white border border-neutral-100 p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 shadow-sm" 
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filtered.map(rental => {
          const calc = calculateBoleto(rental);
          return (
            <div key={rental.id} className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all">
              <div className="p-10 flex flex-col lg:flex-row gap-10">
                {/* Driver & Main Car */}
                <div className="lg:w-1/3 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059] font-black text-xl">
                      {rental.user.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-neutral-900 uppercase tracking-tighter">{rental.user}</h4>
                      <div className="flex items-center gap-2">
                        <Calendar size={10} className="text-[#C5A059]" />
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                          Ciclo: <span className="text-neutral-900">{getDayOfWeek(rental.startDate)}s</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Veículo Principal</p>
                      <span className="bg-white px-3 py-1 rounded-full text-[9px] font-black border border-neutral-200">{rental.plate}</span>
                    </div>
                    <p className="text-lg font-black text-neutral-900 uppercase tracking-tighter">{rental.vehicle}</p>
                    <p className="text-sm font-bold text-[#C5A059] mt-1">R$ {calc.weeklyRate.toLocaleString('pt-BR')} / semana</p>
                  </div>
                </div>

                {/* Billing Logic */}
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-[#C5A059]" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Detalhamento do Ciclo Atual</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-500 italic">Aluguel Base (7 dias)</span>
                        <span className="text-sm font-black text-neutral-900">R$ {calc.weeklyRate.toLocaleString('pt-BR')}</span>
                      </div>
                      
                      {calc.daysInMaintenance > 0 && (
                        <div className="flex justify-between items-center text-red-500">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold italic">Abatimento Oficina ({calc.daysInMaintenance} dias)</span>
                            <span className="text-[9px] uppercase font-black tracking-widest">-{calc.daysInMaintenance} x R$ {calc.dailyRate.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
                          </div>
                          <span className="text-sm font-black">- R$ {calc.abatimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-neutral-400">
                        <span className="text-xs font-bold italic">Taxa de Pneus</span>
                        <span className="text-sm font-black">R$ {calc.tireTax.toLocaleString('pt-BR')}</span>
                      </div>

                      <div className="pt-4 border-t border-neutral-200 flex justify-between items-center">
                        <span className="text-xs font-black text-red-600 uppercase">Multa por Atraso</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-neutral-400">R$</span>
                          <input 
                            type="number" 
                            value={lateFees[rental.id] || ''} 
                            onChange={e => setLateFees({...lateFees, [rental.id]: e.target.value})}
                            placeholder="0,00"
                            className="w-20 bg-white border border-neutral-200 rounded-lg p-2 text-right text-xs font-black outline-none focus:ring-2 focus:ring-red-500/20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className={`p-6 rounded-3xl border transition-all ${calc.activeRC ? 'bg-blue-50 border-blue-100' : 'bg-neutral-50 border-neutral-50 opacity-40'}`}>
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Carro Reserva</p>
                        {calc.activeRC && <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">Ativo</span>}
                      </div>
                      
                      {calc.activeRC ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm"><Car size={20} /></div>
                            <div>
                              <p className="text-xs font-black text-blue-900 uppercase tracking-tight">{calc.activeRC.replacementVehiclePlate}</p>
                              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">Reserva Temporário</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-blue-100">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-blue-900 italic">Diárias Acumuladas ({calc.replacementDays})</span>
                              <span className="text-[9px] uppercase font-black tracking-widest text-blue-400">{calc.replacementDays} x R$ {calc.replacementDailyRate.toLocaleString('pt-BR')}</span>
                            </div>
                            <span className="text-sm font-black text-blue-600">+ R$ {calc.replacementCharge.toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-300 py-4">
                          <AlertCircle size={24} className="mb-2" />
                          <p className="text-[9px] font-black uppercase tracking-widest">Sem reserva ativo</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Total & Action */}
                <div className="lg:w-1/4 flex flex-col justify-between">
                  <div className="p-8 bg-neutral-950 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-black mb-2">Total do Boleto</p>
                      <p className="text-4xl font-black text-[#C5A059] tracking-tighter">
                        R$ {calc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <Wallet size={60} className="absolute -bottom-4 -right-4 text-white opacity-5" />
                  </div>
                  
                  <button 
                    onClick={() => handleConfirm(rental.id, calc)}
                    className="w-full mt-4 py-5 bg-[#C5A059] text-neutral-950 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-neutral-900 hover:text-white transition-all shadow-xl flex items-center justify-center gap-3"
                  >
                    Confirmar Pagamento <CheckCircle2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminFaturamento;
