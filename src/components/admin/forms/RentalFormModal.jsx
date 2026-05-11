import React from 'react';
import { X, Check, Car, TrendingUp, Calendar, Wallet, Landmark, AlertTriangle, Plus, FileText, Camera, FileDown } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';
import { getDayOfWeek } from '../../../utils/adminUtils.jsx';
import { generateRentalContract } from '../../../utils/contractGenerator';

const RentalFormModal = ({ 
  isOpen, onClose, currentRentalStep, setCurrentRentalStep, totalRentalSteps, 
  rentalForm, setRentalForm, vehicles, onSubmit 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 py-4">
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-7xl h-full max-h-[95vh] rounded-[3rem] shadow-2xl animate-in zoom-in duration-300 flex flex-col overflow-hidden">
        {/* Header / Steps Indicator */}
        <div className="p-10 md:p-12 pb-6 border-b border-neutral-50 shrink-0">
          <div className="flex justify-between items-center mb-8">
            <div>
              <EditorialLabel className="text-[#C5A059] mb-1">Passo {currentRentalStep} de {totalRentalSteps}</EditorialLabel>
              <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">
                {currentRentalStep === 1 ? 'Seleção do Veículo' : 
                 currentRentalStep === 2 ? 'Dados do Condutor' : 
                 currentRentalStep === 3 ? 'Termos Financeiros' : 'Gestão de Contrato'}
              </h3>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {['Veículo', 'Condutor', 'Financeiro', 'Contrato'].map((step, idx) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${currentRentalStep === idx + 1 ? 'bg-[#C5A059] text-white' : currentRentalStep > idx + 1 ? 'bg-emerald-500 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                  {currentRentalStep > idx + 1 ? <Check size={14} /> : idx + 1}
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-black ${currentRentalStep === idx + 1 ? 'text-neutral-900' : 'text-neutral-400'}`}>{step}</span>
                {idx < 3 && <div className="w-8 h-px bg-neutral-100 mx-2" />}
              </div>
            ))}
          </div>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-10 md:p-12 pt-8">
          {currentRentalStep === 1 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <p className="text-neutral-500 font-light mb-8 italic">Selecione na frota o veículo que será vinculado a este novo contrato.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicles.filter(v => v.status === 'Disponível').map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setRentalForm({
                      ...rentalForm, 
                      plate: v.plate, 
                      vehicle: v.model,
                      vehicleId: v.id,
                      value: v.weeklyRental || ''
                    })}
                    className={`p-6 rounded-[2rem] border-2 text-left transition-all group ${rentalForm.plate === v.plate ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-100 hover:border-[#C5A059]/30'}`}
                  >
                    <div className="h-32 rounded-2xl overflow-hidden mb-4 bg-neutral-200">
                      <img src={v.image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80'} alt={v.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <h4 className="font-black text-neutral-900 uppercase tracking-tight">{v.model}</h4>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">{v.plate}</p>
                      <span className="text-[10px] font-black text-[#C5A059]">
                        {(v.weeklyRental ? 
                          (typeof v.weeklyRental === 'string' ? parseFloat(v.weeklyRental.replace(/\./g, '').replace(',', '.')) : v.weeklyRental)
                            .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                          : 'Sob Consulta')} /sem
                      </span>
                    </div>
                    {rentalForm.plate === v.plate && (
                      <div className="mt-4 flex items-center gap-2 text-emerald-600">
                        <Check size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Selecionado</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentRentalStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Nome Completo</label>
                  <input type="text" required value={rentalForm.user} onChange={e => setRentalForm({...rentalForm, user: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="Ex: João Silva" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">WhatsApp</label>
                  <input type="text" required value={rentalForm.clientPhone} onChange={e => setRentalForm({...rentalForm, clientPhone: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="(79) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">E-mail</label>
                  <input type="email" required value={rentalForm.email} onChange={e => setRentalForm({...rentalForm, email: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="exemplo@email.com" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Número CNH</label>
                    <input type="text" required value={rentalForm.cnhNumber} onChange={e => setRentalForm({...rentalForm, cnhNumber: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="Ex: 123456789" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Número de Registro</label>
                    <input type="text" required value={rentalForm.cnhRegisterNumber} onChange={e => setRentalForm({...rentalForm, cnhRegisterNumber: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="Ex: 987654321" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Data de Nascimento</label>
                    <input type="date" required value={rentalForm.birthDate} onChange={e => setRentalForm({...rentalForm, birthDate: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Validade CNH</label>
                    <input type="date" required value={rentalForm.cnhValidity} onChange={e => setRentalForm({...rentalForm, cnhValidity: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-50">
                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-6">Documentação para Anexo</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className={`p-6 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group ${rentalForm.docs.cnh ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-100 hover:border-[#C5A059]/30 hover:bg-neutral-50'}`}>
                    {rentalForm.docs.cnh ? <Check size={24} className="text-emerald-500" /> : <Camera size={24} className="text-neutral-300 group-hover:text-[#C5A059]" />}
                    <div className="text-center">
                      <span className={`text-[9px] font-black uppercase tracking-widest block ${rentalForm.docs.cnh ? 'text-emerald-600' : 'text-neutral-400'}`}>Foto CNH</span>
                      {rentalForm.docs.cnh && <span className="text-[8px] text-emerald-400 font-bold truncate max-w-[100px] block">{rentalForm.docs.cnh.name}</span>}
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => setRentalForm({
                        ...rentalForm, 
                        docs: { ...rentalForm.docs, cnh: e.target.files[0] }
                      })} 
                    />
                  </label>

                  <label className={`p-6 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group ${rentalForm.docs.residence ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-100 hover:border-[#C5A059]/30 hover:bg-neutral-50'}`}>
                    {rentalForm.docs.residence ? <Check size={24} className="text-emerald-500" /> : <FileText size={24} className="text-neutral-300 group-hover:text-[#C5A059]" />}
                    <div className="text-center">
                      <span className={`text-[9px] font-black uppercase tracking-widest block ${rentalForm.docs.residence ? 'text-emerald-600' : 'text-neutral-400'}`}>Residência</span>
                      {rentalForm.docs.residence ? (
                        <span className="text-[8px] text-emerald-400 font-bold truncate max-w-[100px] block">{rentalForm.docs.residence.name}</span>
                      ) : (
                        <span className="text-[8px] text-neutral-300 uppercase font-bold">(Opcional)</span>
                      )}
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => setRentalForm({
                        ...rentalForm, 
                        docs: { ...rentalForm.docs, residence: e.target.files[0] }
                      })} 
                    />
                  </label>

                  <label className={`p-6 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group ${rentalForm.docs.appPrints.length > 0 ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-100 hover:border-[#C5A059]/30 hover:bg-neutral-50'}`}>
                    {rentalForm.docs.appPrints.length > 0 ? <Check size={24} className="text-emerald-500" /> : <Plus size={24} className="text-neutral-300 group-hover:text-[#C5A059]" />}
                    <div className="text-center">
                      <span className={`text-[9px] font-black uppercase tracking-widest block ${rentalForm.docs.appPrints.length > 0 ? 'text-emerald-600' : 'text-neutral-400'}`}>Prints App</span>
                      {rentalForm.docs.appPrints.length > 0 ? (
                        <span className="text-[8px] text-emerald-400 font-bold block">{rentalForm.docs.appPrints.length} arquivos</span>
                      ) : (
                        <span className="text-[8px] text-neutral-300 uppercase font-bold">(Opcional)</span>
                      )}
                    </div>
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => setRentalForm({
                        ...rentalForm, 
                        docs: { 
                          ...rentalForm.docs, 
                          appPrints: [...rentalForm.docs.appPrints, ...Array.from(e.target.files)] 
                        }
                      })} 
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentRentalStep === 3 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Financial Summary */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="p-8 bg-neutral-900 rounded-[2.5rem] border border-[#C5A059]/20 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 blur-3xl -mr-16 -mt-16" />
                    
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-[#C5A059]/10 rounded-full flex items-center justify-center">
                        <TrendingUp size={18} className="text-[#C5A059]" />
                      </div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#C5A059] font-black">Resumo do Financeiro</p>
                    </div>

                    <div className="space-y-4">
                      {(() => {
                        const total = parseFloat(String(rentalForm.depositTotal).replace(/\./g, '').replace(',', '.')) || 0;
                        const paid = parseFloat(String(rentalForm.depositPaid).replace(/\./g, '').replace(',', '.')) || 0;
                        const balance = total - paid;
                        const installments = parseInt(rentalForm.depositInstallments) || 1;
                        const installmentVal = balance > 0 ? balance / installments : 0;
                        
                        const baseVal = parseFloat(String(rentalForm.value).replace(/\./g, '').replace(',', '.')) || 0;
                        const tireVal = parseFloat(rentalForm.tireTax) || 0;
                        const duration = parseInt(rentalForm.durationWeeks) || 1;
                        const totalRentalContract = baseVal * duration;
                        const weeklyTotal = baseVal + tireVal + installmentVal;

                        return (
                          <>
                            <div className="flex justify-between items-center bg-[#C5A059] p-4 rounded-2xl shadow-lg shadow-[#C5A059]/20 mb-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                  <Calendar size={14} className="text-white" />
                                </div>
                                <span className="text-white text-[10px] uppercase tracking-widest font-black">Cobrança Recorrente</span>
                              </div>
                              <span className="text-white text-sm font-black uppercase">{getDayOfWeek(rentalForm.startDate)}</span>
                            </div>

                            <div className="space-y-3">
                              <div className="flex justify-between items-center group">
                                <span className="text-neutral-400 text-xs font-medium group-hover:text-neutral-300 transition-colors">Aluguel Semanal</span>
                                <span className="text-white text-sm font-black">R$ {baseVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center group">
                                <span className="text-neutral-400 text-xs font-medium group-hover:text-neutral-300 transition-colors">Taxa de Pneus</span>
                                <span className="text-white text-sm font-black">R$ {tireVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                                <span className="text-neutral-300 text-[10px] uppercase tracking-widest font-bold">Total do Contrato ({duration} sem)</span>
                                <span className="text-[#C5A059] text-sm font-black">R$ {totalRentalContract.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>

                            <div className="pt-6 border-t border-neutral-800 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold">Caução Total</span>
                                <span className="text-neutral-300 text-sm font-black">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold">Pago no Ato</span>
                                <span className="text-emerald-500 text-sm font-black">R$ {paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              {balance > 0 && (
                                <div className="flex justify-between items-center p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                                  <div className="flex flex-col">
                                    <span className="text-amber-500 text-[9px] uppercase tracking-widest font-black">Parcela Caução</span>
                                    <span className="text-neutral-500 text-[8px] font-medium">{installments}x semanas</span>
                                  </div>
                                  <span className="text-amber-500 text-sm font-black">+ R$ {installmentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-8 border-t border-neutral-800">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-black">Total a pagar semanalmente</span>
                                <div className="flex items-center gap-1">
                                  <TrendingUp size={10} className="text-emerald-500" />
                                  <span className="text-emerald-500 text-[8px] font-black uppercase">Calculado</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-end">
                                <p className="text-[10px] text-neutral-400 font-light leading-tight max-w-[150px]">Aluguel + Pneus + Parcela Caução</p>
                                <div className="text-right">
                                  <span className="text-[#C5A059] text-3xl font-black tracking-tighter block leading-none">
                                    R$ {weeklyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">/ por semana</span>
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Form Controls */}
                <div className="lg:col-span-7 space-y-8">
                  <div className="flex bg-neutral-100 p-1 rounded-2xl w-fit">
                    <button type="button" onClick={() => setRentalForm({...rentalForm, rentalType: 'daily'})} className={`px-8 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${rentalForm.rentalType === 'daily' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}>Diária</button>
                    <button type="button" onClick={() => setRentalForm({...rentalForm, rentalType: 'weekly'})} className={`px-8 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${rentalForm.rentalType === 'weekly' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}>Semanal</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet size={14} className="text-[#C5A059]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Valores de Locação</span>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor Aluguel / {rentalForm.rentalType === 'weekly' ? 'Semana' : 'Dia'}</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">R$</span>
                            <input 
                              type="text" 
                              required 
                              value={rentalForm.value} 
                              onChange={e => {
                                let v = e.target.value.replace(/\D/g, '');
                                v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                setRentalForm({...rentalForm, value: v});
                              }} 
                              className="w-full bg-white border border-neutral-200 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm" 
                              placeholder="0,00" 
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Taxa de Pneus</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">R$</span>
                            <input 
                              type="text" 
                              value={rentalForm.tireTax} 
                              onChange={e => {
                                let v = e.target.value.replace(/\D/g, '');
                                v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                setRentalForm({...rentalForm, tireTax: v});
                              }} 
                              className="w-full bg-white border border-neutral-200 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm" 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar size={14} className="text-[#C5A059]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Período de Contrato</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Data Início</label>
                            <input type="date" required value={rentalForm.startDate} onChange={e => setRentalForm({...rentalForm, startDate: e.target.value})} className="w-full bg-white border border-neutral-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-xs" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Duração (Semanas)</label>
                            <div className="flex items-center bg-white rounded-2xl p-1 h-[52px] border border-neutral-200">
                              <button type="button" onClick={() => setRentalForm({...rentalForm, durationWeeks: Math.max(1, (parseInt(rentalForm.durationWeeks) || 1) - 1).toString()})} className="w-10 h-10 flex items-center justify-center bg-neutral-50 rounded-xl text-neutral-600 hover:text-neutral-900 transition-all">-</button>
                              <input type="text" value={rentalForm.durationWeeks} onChange={e => setRentalForm({...rentalForm, durationWeeks: e.target.value.replace(/\D/g, '')})} className="flex-1 bg-transparent border-none text-center outline-none font-black text-sm text-neutral-900" />
                              <button type="button" onClick={() => setRentalForm({...rentalForm, durationWeeks: ((parseInt(rentalForm.durationWeeks) || 1) + 1).toString()})} className="w-10 h-10 flex items-center justify-center bg-neutral-50 rounded-xl text-neutral-600 hover:text-neutral-900 transition-all"><Plus size={14} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Landmark size={14} className="text-[#C5A059]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Gestão de Caução</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Caução Total</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">R$</span>
                              <input 
                                type="text" 
                                required 
                                value={rentalForm.depositTotal} 
                                onChange={e => {
                                  let v = e.target.value.replace(/\D/g, '');
                                  v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                  setRentalForm({...rentalForm, depositTotal: v});
                                }} 
                                className="w-full bg-white border border-neutral-200 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm" 
                                placeholder="0,00" 
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Pago no Ato</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">R$</span>
                              <input 
                                type="text" 
                                required 
                                value={rentalForm.depositPaid} 
                                onChange={e => {
                                  let v = e.target.value.replace(/\D/g, '');
                                  v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                  setRentalForm({...rentalForm, depositPaid: v});
                                }} 
                                className="w-full bg-white border border-neutral-200 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm text-emerald-600" 
                                placeholder="0,00" 
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Parcelamento do Saldo</label>
                          <select value={rentalForm.depositInstallments} onChange={e => setRentalForm({...rentalForm, depositInstallments: e.target.value})} className="w-full bg-white border border-neutral-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}x semanas</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={14} className="text-[#C5A059]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Atrasos e Multas</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Multa por Atraso (%)</label>
                            <input type="number" value={rentalForm.lateFine} onChange={e => setRentalForm({...rentalForm, lateFine: e.target.value})} className="w-full bg-white border border-neutral-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-xs" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Juros Diários (%)</label>
                            <input type="number" value={rentalForm.dailyInterest} onChange={e => setRentalForm({...rentalForm, dailyInterest: e.target.value})} className="w-full bg-white border border-neutral-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-xs" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentRentalStep === 4 && (
            <div className="animate-in fade-in slide-in-from-right duration-500 h-full">
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-8">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-100/50">
                  <Check size={48} />
                </div>
                <div>
                  <h4 className="text-3xl font-black uppercase tracking-tighter text-neutral-900 mb-2">Tudo Pronto!</h4>
                  <p className="text-neutral-500 font-light max-w-md mx-auto">Os dados foram validados. Agora você pode gerar o contrato e finalizar o registro da locação.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                  <button 
                    type="button" 
                    onClick={() => generateRentalContract(rentalForm)}
                    className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 flex flex-col items-center gap-4 group hover:bg-white transition-all hover:shadow-xl w-full"
                  >
                    <FileDown size={32} className="text-[#C5A059]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Gerar Contrato Digital</span>
                    <span className="text-[8px] font-bold text-neutral-400 hover:text-neutral-600 transition-colors">BAIXAR .DOCX</span>
                  </button>
                  <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 flex flex-col items-center gap-4 group hover:bg-white transition-all hover:shadow-xl">
                    <Check size={32} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Vistoria de Saída</span>
                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">OBRIGATÓRIO</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-10 md:p-12 border-t border-neutral-50 bg-neutral-50/30 flex justify-between shrink-0">
          <button 
            type="button"
            onClick={() => setCurrentRentalStep(Math.max(1, currentRentalStep - 1))}
            disabled={currentRentalStep === 1}
            className={`px-10 py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black transition-all ${currentRentalStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-white text-neutral-400 hover:text-neutral-900 hover:shadow-lg'}`}
          >
            Voltar
          </button>
          
          <div className="flex gap-4">
            {currentRentalStep < totalRentalSteps ? (
              <button 
                type="button"
                onClick={() => setCurrentRentalStep(currentRentalStep + 1)}
                disabled={currentRentalStep === 1 && !rentalForm.plate}
                className={`bg-neutral-900 text-[#C5A059] px-16 py-5 rounded-2xl text-[10px] uppercase tracking-[0.3em] font-black hover:bg-[#C5A059] hover:text-white transition-all shadow-xl shadow-[#C5A059]/10 ${currentRentalStep === 1 && !rentalForm.plate ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Próximo Passo
              </button>
            ) : (
              <button 
                type="button"
                onClick={onSubmit}
                className="bg-neutral-900 text-[#C5A059] px-16 py-5 rounded-2xl text-[10px] uppercase tracking-[0.3em] font-black hover:bg-[#C5A059] hover:text-white transition-all shadow-xl shadow-[#C5A059]/10"
              >
                Finalizar e Ativar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalFormModal;
