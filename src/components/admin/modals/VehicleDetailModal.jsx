import React from 'react';
import { X, Car, Calendar, Gauge, Users, TrendingUp, ShieldCheck, ClipboardCheck, Wrench, AlertTriangle, ChevronRight, Eye } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';

const VehicleDetailModal = ({ vehicle, inspections = [], maintenances = [], rentals = [], onClose, onGoToVistorias }) => {
  if (!vehicle) return null;

  const isExempt = !vehicle.createdAt || new Date(vehicle.createdAt) < new Date('2026-05-30T00:00:00Z');

  const vehicleInspections = inspections.filter(ins => 
    (ins.vehiclePlate || '').replace('-', '').toUpperCase() === (vehicle.plate || '').replace('-', '').toUpperCase() &&
    (!isExempt || ins.type !== 'Coleta')
  );
  const vehicleMaintenances = maintenances.filter(m => 
    (m.plate || '').replace('-', '').toUpperCase() === (vehicle.plate || '').replace('-', '').toUpperCase()
  );

  const activeRental = rentals.find(r => 
    (r.plate || '').replace('-', '').toUpperCase() === (vehicle.plate || '').replace('-', '').toUpperCase() && 
    r.status === 'Ativo'
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-10 md:p-12 border-b border-neutral-50 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-neutral-900 rounded-[2rem] flex items-center justify-center text-[#C5A059] shadow-xl">
              <Car size={32} />
            </div>
            <div>
              <EditorialLabel className="text-[#C5A059] mb-1">Dossiê do Ativo</EditorialLabel>
              <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">
                {vehicle.model}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-4">             <div className={`px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] ${
                (vehicle.status === 'Alugado' || vehicle.status === 'Alugado (Reserva)') ? 'bg-amber-50 border-amber-200 text-amber-600' :
                (vehicle.status === 'Manutenção' || vehicle.status === 'Indisponível') ? 'bg-red-50 border-red-200 text-red-600' :
                'bg-emerald-50 border-emerald-200 text-emerald-600'
              }`}>
                {vehicle.status || 'Disponível'}
              </div>
            <button onClick={onClose} className="w-12 h-12 bg-neutral-50 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all text-neutral-400">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 md:p-12 space-y-12">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
              <p className="text-[8px] uppercase tracking-widest text-neutral-400 font-black mb-3">Placa (ID)</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-6 bg-white border border-neutral-900 rounded flex flex-col overflow-hidden">
                    <div className="h-1.5 bg-[#003399]" />
                    <div className="flex-1 flex items-center justify-center text-[10px] font-black">{(vehicle.plate || '').replace('-', '')}</div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
              <p className="text-[8px] uppercase tracking-widest text-neutral-400 font-black mb-3">Ano / Modelo</p>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-neutral-400" />
                <span className="text-sm font-black text-neutral-900">{vehicle.year}</span>
              </div>
            </div>
            <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
              <p className="text-[8px] uppercase tracking-widest text-neutral-400 font-black mb-3">Quilometragem</p>
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-neutral-400" />
                <span className="text-sm font-black text-neutral-900">{vehicle.currentKm || vehicle.initialKm || 0} KM</span>
              </div>
            </div>
            <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
              <p className="text-[8px] uppercase tracking-widest text-neutral-400 font-black mb-3">Sócio Investidor</p>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-neutral-400" />
                <span className="text-sm font-black text-neutral-900">{vehicle.investor || 'Interno'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column: Financial & Technical */}
            <div className="lg:col-span-1 space-y-10">
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <TrendingUp size={18} className="text-[#C5A059]" />
                        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Operacional Financeiro</h4>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-neutral-900 rounded-2xl">
                            <span className="text-[9px] uppercase font-black text-neutral-400">Aluguel Semanal</span>
                            <span className="text-white font-black">R$ {vehicle.weeklyRental || '0,00'}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 border border-neutral-100 rounded-2xl">
                            <span className="text-[9px] uppercase font-black text-neutral-400">Taxa Admin</span>
                            <span className="text-neutral-900 font-black">{vehicle.adminTax || '15'}%</span>
                        </div>
                        <div className="flex justify-between items-center p-4 border border-neutral-100 rounded-2xl">
                            <span className="text-[9px] uppercase font-black text-neutral-400">Taxa Investidor</span>
                            <span className="text-neutral-900 font-black">{vehicle.investorTax || '85'}%</span>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={18} className="text-[#C5A059]" />
                        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Proteção e Custos</h4>
                    </div>
                    <div className="space-y-4">
                         <div className="p-4 bg-neutral-50 rounded-2xl flex justify-between items-center">
                            <span className="text-[9px] uppercase font-black text-neutral-400">Proteção Mensal</span>
                            <span className="text-neutral-900 font-black">R$ {vehicle.protectionValue || '0,00'}</span>
                        </div>
                        <div className="p-4 bg-neutral-50 rounded-2xl flex justify-between items-center">
                            <span className="text-[9px] uppercase font-black text-neutral-400">Valor Investimento</span>
                            <span className="text-neutral-900 font-black">R$ {vehicle.investmentValue || '0,00'}</span>
                        </div>
                        <div className="p-4 bg-neutral-50 rounded-2xl flex justify-between items-center">
                            <span className="text-[9px] uppercase font-black text-neutral-400">Valor FIPE</span>
                            <span className="text-neutral-900 font-black">R$ {vehicle.fipeValue || '0,00'}</span>
                        </div>
                    </div>
                </section>

                {activeRental && (
                  <section className="space-y-6 animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-3">
                        <Users size={18} className="text-emerald-500" />
                        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Locação Ativa</h4>
                    </div>
                    <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 space-y-6 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[8px] uppercase font-bold text-emerald-600/60 mb-1">Condutor Responsável</p>
                            <p className="text-xl font-black text-neutral-900 leading-tight">{activeRental.user}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-200 bg-white text-emerald-600`}>
                            {activeRental.period || activeRental.rentalType}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-100">
                          <div>
                            <p className="text-[8px] uppercase font-bold text-emerald-600/60 mb-1">Faturamento</p>
                            <p className="text-sm font-black text-neutral-900">{activeRental.value} / sem</p>
                          </div>
                          <div>
                            <p className="text-[8px] uppercase font-bold text-emerald-600/60 mb-1">Início</p>
                            <p className="text-sm font-black text-neutral-900">{new Date(activeRental.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                    </div>
                  </section>
                )}
            </div>

            {/* Right Column: History */}
            <div className="lg:col-span-2 space-y-12">
                {/* Inspections History */}
                <section>
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <ClipboardCheck size={18} className="text-[#C5A059]" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Histórico de Vistorias</h4>
                        </div>
                        {!['Alugado', 'Alugado (Reserva)'].includes(vehicle.status) && (
                            <button 
                                onClick={() => onGoToVistorias({ vehiclePlate: vehicle.plate, type: isExempt ? 'Entrega' : 'Coleta' })}
                                className="text-[9px] font-black uppercase tracking-widest text-[#C5A059] hover:text-neutral-900 transition-colors"
                            >
                                Realizar Nova Vistoria
                            </button>
                        )}
                    </div>
                    <div className="space-y-4">
                        {vehicleInspections.length > 0 ? (
                            vehicleInspections.sort((a, b) => new Date(b.date) - new Date(a.date)).map((ins, idx) => (
                                <div key={idx} className="flex items-center gap-6 p-6 bg-white border border-neutral-100 rounded-[2rem] hover:shadow-lg transition-all group">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                        ins.type === 'Entrega' ? 'bg-emerald-50 text-emerald-500' :
                                        ins.type === 'Devolução' ? 'bg-red-50 text-red-500' :
                                        ins.type === 'Coleta' ? 'bg-amber-50 text-amber-500' : 'bg-neutral-50 text-neutral-400'
                                    }`}>
                                        <ClipboardCheck size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-black uppercase text-neutral-900">{ins.type}</span>
                                            <span className="text-[10px] font-bold text-neutral-400">{ins.date}</span>
                                        </div>
                                        <p className="text-[10px] text-neutral-500 font-medium">Hodômetro: {ins.km} KM • Combustível: {ins.fuelLevel}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                         {Object.values(ins.photos || {}).slice(0, 3).map((photo, pIdx) => (
                                            <div key={pIdx} className="w-8 h-8 rounded-lg overflow-hidden border border-neutral-100">
                                                <img src={photo.preview} className="w-full h-full object-cover" />
                                            </div>
                                         ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 border-2 border-dashed border-neutral-50 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-neutral-300">
                                <AlertTriangle size={32} strokeWidth={1} />
                                <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma vistoria registrada</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Maintenance History */}
                <section>
                    <div className="flex items-center gap-3 mb-8">
                        <Wrench size={18} className="text-[#C5A059]" />
                        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Histórico de Manutenções</h4>
                    </div>
                    <div className="space-y-4">
                        {vehicleMaintenances.length > 0 ? (
                            vehicleMaintenances.sort((a, b) => new Date(b.date) - new Date(a.date)).map((m, idx) => (
                                <div key={idx} className="flex items-center gap-6 p-6 bg-neutral-50 rounded-[2rem] hover:bg-white border border-transparent hover:border-neutral-100 transition-all">
                                    <div className="w-12 h-12 bg-neutral-200 rounded-2xl flex items-center justify-center shrink-0 text-neutral-500">
                                        <Wrench size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-black uppercase text-neutral-900">{m.type || 'Manutenção'}</span>
                                            <span className="text-[10px] font-bold text-neutral-400">{m.date}</span>
                                        </div>
                                        <p className="text-[10px] text-neutral-500 font-medium line-clamp-1">{m.description || m.observations}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-neutral-900">R$ {m.total || m.value || '0,00'}</p>
                                        <p className="text-[8px] uppercase font-bold text-neutral-400">{m.responsible}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 border-2 border-dashed border-neutral-50 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-neutral-300">
                                <Wrench size={32} strokeWidth={1} />
                                <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma manutenção registrada</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-10 md:p-12 border-t border-neutral-50 bg-neutral-50/30 flex justify-end gap-6 shrink-0">
          <button onClick={onClose} className="px-10 py-4 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-[#C5A059] transition-all">
            Fechar Dossiê
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailModal;
