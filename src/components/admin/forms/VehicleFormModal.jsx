import React from 'react';
import { X, Car, Users, TrendingUp, Wrench, Camera, Check, FileText } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';
import ImageEditorModal from '../modals/ImageEditorModal';
import { generateManagementContract } from '../../../utils/contractGenerator';

const VehicleFormModal = ({ 
  isOpen, onClose, isEditing, vehicleForm, setVehicleForm, investors, onSubmit 
}) => {
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [tempImageSrc, setTempImageSrc] = React.useState('');

  const handleEditorSave = (editedFile, editedDataUrl) => {
    setVehicleForm({
      ...vehicleForm,
      imageFile: editedFile,
      imagePreview: editedDataUrl,
      image: editedDataUrl
    });
    setIsEditorOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] w-full max-w-6xl h-full md:h-auto md:max-h-[95vh] rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
        {/* Header */}
        <div className="p-6 md:p-12 pb-6 border-b border-neutral-50 shrink-0 flex justify-between items-center">
          <div>
            <EditorialLabel className="text-[#D4AF37] mb-1">{isEditing ? 'Gestão de Ativo' : 'Novo Ativo de Frota'}</EditorialLabel>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white leading-none">
              {isEditing ? 'Editar Veículo' : 'Cadastrar Veículo'}
            </h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 bg-black flex items-center justify-center rounded-xl md:rounded-full hover:bg-neutral-100 transition-all text-neutral-400">
            <X size={24} />
          </button>
        </div>
        
        {/* Body */}
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 md:p-12 pt-6 md:pt-8 space-y-8 md:space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Column 1: Basic & Technical */}
            <div className="space-y-10">
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#D4AF37]"><Car size={16} /></div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white">Identificação Técnica</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Marca / Modelo</label>
                    <input type="text" required value={vehicleForm.model ?? ''} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} className="w-full bg-black text-white border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm" placeholder="Ex: Chevrolet Onix 1.0 Turbo" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Descrição do Veículo</label>
                    <textarea 
                      value={vehicleForm.description ?? ''} 
                      onChange={e => setVehicleForm({...vehicleForm, description: e.target.value})} 
                      className="w-full bg-black text-white border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm min-h-[80px]" 
                      placeholder="Informações complementares sobre o veículo..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Placa (ID Único)</label>
                      <input 
                        type="text" 
                        required 
                        value={vehicleForm.plate ?? ''} 
                        onChange={e => {
                          let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                          if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3, 7);
                          setVehicleForm({...vehicleForm, plate: v});
                        }} 
                        maxLength={8}
                        className="w-full bg-black text-white border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm uppercase" 
                        placeholder="ABC-1234" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Ano Fab. / Modelo</label>
                      <input 
                        type="text" 
                        required 
                        value={vehicleForm.year ?? ''} 
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '');
                          if (v.length > 4) v = v.slice(0, 4) + '/' + v.slice(4, 8);
                          setVehicleForm({...vehicleForm, year: v});
                        }} 
                        maxLength={9}
                        className="w-full bg-black text-white border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm" 
                        placeholder="2023/2024" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">RENAVAM</label>
                      <input type="text" required value={vehicleForm.renavam ?? ''} onChange={e => setVehicleForm({...vehicleForm, renavam: e.target.value})} className="w-full bg-black text-white border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm" placeholder="00000000000" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Status Atual</label>
                        {isEditing && (vehicleForm.status === 'Alugado' || vehicleForm.status === 'Alugado (Reserva)') && (
                          <span className="text-[8px] text-amber-500 font-bold uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md">Trava de Locação</span>
                        )}
                      </div>
                      <select 
                        value={vehicleForm.status ?? 'Disponível'} 
                        onChange={e => setVehicleForm({...vehicleForm, status: e.target.value})} 
                        disabled={isEditing && (vehicleForm.status === 'Alugado' || vehicleForm.status === 'Alugado (Reserva)')}
                        className={`w-full bg-black border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm ${
                          isEditing && (vehicleForm.status === 'Alugado' || vehicleForm.status === 'Alugado (Reserva)') ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="Disponível">Disponível</option>
                        <option value="Alugado">Alugado</option>
                        <option value="Manutenção">Manutenção</option>
                        <option value="Em preparação">Em preparação</option>
                        <option value="Indisponível">Indisponível</option>
                      </select>
                      {isEditing && (vehicleForm.status === 'Alugado' || vehicleForm.status === 'Alugado (Reserva)') && (
                        <p className="text-[10px] text-neutral-400 font-medium ml-1 leading-tight">Status bloqueado. Encerre o contrato para liberar o veículo.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">KM Inicial</label>
                    <input type="number" required value={vehicleForm.initialKm ?? ''} onChange={e => setVehicleForm({...vehicleForm, initialKm: e.target.value})} className="w-full bg-black text-white border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm" placeholder="0" />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#D4AF37]"><Users size={16} /></div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white">Vínculo e Investimento</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Investidor Dono</label>
                      <select required value={vehicleForm.investorId ?? ''} onChange={e => {
                        const inv = investors.find(i => i.id.toString() === e.target.value);
                        setVehicleForm({...vehicleForm, investorId: e.target.value, investor: inv ? inv.name : ''});
                      }} className="w-full bg-black text-white border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm">
                        <option value="">Selecione...</option>
                        {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Divisão de Receita (%)</label>
                      <div className="grid grid-cols-2 gap-3 bg-neutral-100/50 p-2 rounded-2xl border border-neutral-800">
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-bold text-neutral-400 ml-2">Admin</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              value={vehicleForm.adminTax ?? ''} 
                              onChange={e => {
                                const val = e.target.value;
                                const invVal = 100 - (parseFloat(val) || 0);
                                setVehicleForm({...vehicleForm, adminTax: val, investorTax: invVal.toString()});
                              }} 
                              className="w-full bg-[#0a0a0a] text-white border border-neutral-800 p-3 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-black text-xs pr-7" 
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] font-black">%</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-bold text-neutral-400 ml-2">Investidor</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              value={vehicleForm.investorTax ?? ''} 
                              onChange={e => {
                                const val = e.target.value;
                                const admVal = 100 - (parseFloat(val) || 0);
                                setVehicleForm({...vehicleForm, investorTax: val, adminTax: admVal.toString()});
                              }} 
                              className="w-full bg-[#0a0a0a] text-white border border-neutral-800 p-3 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-black text-xs pr-7" 
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] font-black">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor do Investimento</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] font-black">R$</span>
                      <input 
                        type="text" 
                        value={vehicleForm.investmentValue ?? ''} 
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '');
                          v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                          setVehicleForm({...vehicleForm, investmentValue: v});
                        }} 
                        className="w-full bg-black text-white border border-neutral-800 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm" 
                        placeholder="0,00" 
                      />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor FIPE</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] font-black">R$</span>
                      <input 
                        type="text" 
                        value={vehicleForm.fipeValue ?? ''} 
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '');
                          v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                          setVehicleForm({...vehicleForm, fipeValue: v});
                        }} 
                        className="w-full bg-black text-white border border-neutral-800 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm" 
                        placeholder="0,00" 
                      />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Column 2: Protection & Maintenance */}
            <div className="space-y-10">
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#D4AF37]"><TrendingUp size={16} /></div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white">Custos e Operação</h4>
                </div>
                
                <div className="space-y-6">
                  {/* Valor Aluguel Semanal */}
                  <div className="p-6 bg-neutral-900 rounded-3xl border border-[#D4AF37]/20 shadow-xl">
                    <label className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-black block mb-3">Valor Aluguel Semanal</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37] text-[10px] font-black">R$</span>
                      <input 
                        type="text" 
                        required 
                        value={vehicleForm.weeklyRental ?? ''} 
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '');
                          v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                          setVehicleForm({...vehicleForm, weeklyRental: v});
                        }} 
                        className="w-full bg-neutral-800 border-none pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all font-black text-white text-lg" 
                        placeholder="600,00" 
                      />
                    </div>
                    <p className="text-[8px] text-neutral-500 uppercase font-bold mt-3 italic">* Este valor será sugerido automaticamente na nova locação</p>
                  </div>

                  {/* Proteção Veicular */}
                  <div className="p-6 bg-black rounded-3xl border border-neutral-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase tracking-widest text-white font-black">Proteção Veicular</label>
                      <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-neutral-800">
                        <button type="button" onClick={() => setVehicleForm({...vehicleForm, hasProtection: true})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${vehicleForm.hasProtection ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Sim</button>
                        <button type="button" onClick={() => setVehicleForm({...vehicleForm, hasProtection: false, protectionValue: ''})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!vehicleForm.hasProtection ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Não</button>
                      </div>
                    </div>
                    
                    {vehicleForm.hasProtection ? (
                      <div className="animate-in slide-in-from-top-2 duration-300 pt-4 border-t border-neutral-700/50 space-y-4">
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Empresa da Proteção</label>
                          <input 
                            type="text" 
                            value={vehicleForm.protectionCompany ?? ''} 
                            onChange={e => setVehicleForm({...vehicleForm, protectionCompany: e.target.value})} 
                            className="w-full bg-[#0a0a0a] text-white border border-neutral-800 p-3 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-xs" 
                            placeholder="Ex: APVS, Gol Plus, etc."
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Dia de Vencimento</label>
                            <input 
                              type="number" 
                              min="1"
                              max="31"
                              value={vehicleForm.protectionPaymentDay ?? ''} 
                              onChange={e => setVehicleForm({...vehicleForm, protectionPaymentDay: e.target.value})} 
                              className="w-full bg-[#0a0a0a] text-white border border-neutral-800 p-3 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-xs" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor Mensal</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] font-black">R$</span>
                              <input 
                                type="text" 
                                value={vehicleForm.protectionValue ?? ''} 
                                onChange={e => {
                                  let v = e.target.value.replace(/\D/g, '');
                                  v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                  setVehicleForm({...vehicleForm, protectionValue: v});
                                }} 
                                className="w-full bg-[#0a0a0a] text-white border border-neutral-800 pl-8 p-3 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-xs" 
                                placeholder="0,00" 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-in slide-in-from-top-2 duration-300 pt-4 border-t border-neutral-700/50 space-y-4">
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Empresa da Proteção (Paga por Fora)</label>
                          <input 
                            type="text" 
                            value={vehicleForm.protectionCompany ?? ''} 
                            onChange={e => setVehicleForm({...vehicleForm, protectionCompany: e.target.value})} 
                            className="w-full bg-[#0a0a0a] text-white border border-neutral-800 p-3 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-xs" 
                            placeholder="Ex: APVS, Gol Plus, etc."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Seguro Franquia */}
                  <div className="p-6 bg-black rounded-3xl border border-neutral-800 flex items-center justify-between">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white font-black block">Seguro Franquia</label>
                      <p className="text-[9px] text-neutral-400 font-bold uppercase mt-1">Débito de R$ 39,90/mês</p>
                    </div>
                    <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-neutral-800">
                      <button type="button" onClick={() => setVehicleForm({...vehicleForm, franchiseInsurance: true})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${vehicleForm.franchiseInsurance ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Sim</button>
                      <button type="button" onClick={() => setVehicleForm({...vehicleForm, franchiseInsurance: false})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!vehicleForm.franchiseInsurance ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Não</button>
                    </div>
                  </div>

                  {/* Chave Reserva */}
                  <div className="p-6 bg-black rounded-3xl border border-neutral-800 flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-widest text-white font-black">Chave Reserva</label>
                    <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-neutral-800">
                      <button type="button" onClick={() => setVehicleForm({...vehicleForm, hasSpareKey: true})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${vehicleForm.hasSpareKey ? 'bg-emerald-500 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Sim</button>
                      <button type="button" onClick={() => setVehicleForm({...vehicleForm, hasSpareKey: false})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!vehicleForm.hasSpareKey ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Não</button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#D4AF37]"><Wrench size={16} /></div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white">Manutenção Preventiva</h4>
                </div>
                
                <div className="space-y-6">
                  <div className="p-6 bg-black rounded-3xl border border-neutral-800 flex items-center justify-between">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white font-black block">Possui Correia Dentada?</label>
                      <p className="text-[8px] text-neutral-400 font-bold uppercase mt-1">Habilita controle de troca</p>
                    </div>
                    <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-neutral-800">
                      <button type="button" onClick={() => setVehicleForm({...vehicleForm, preventiveMaintenance: true})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${vehicleForm.preventiveMaintenance ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Sim</button>
                      <button type="button" onClick={() => setVehicleForm({...vehicleForm, preventiveMaintenance: false})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!vehicleForm.preventiveMaintenance ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Não</button>
                    </div>
                  </div>

                  {vehicleForm.preventiveMaintenance && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <p className="text-[8px] text-neutral-400 uppercase font-black ml-1 tracking-widest border-l-2 border-[#D4AF37] pl-3">Parâmetros de Troca</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">KM Última Troca</label>
                          <input type="number" value={vehicleForm.lastBeltChangeKm ?? ''} onChange={e => setVehicleForm({...vehicleForm, lastBeltChangeKm: e.target.value})} className="w-full bg-black text-white border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm" placeholder="0" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Intervalo (KM)</label>
                          <input type="number" value={vehicleForm.beltChangeIntervalKm ?? ''} onChange={e => setVehicleForm({...vehicleForm, beltChangeIntervalKm: e.target.value})} className="w-full bg-black text-white border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-sm" placeholder="50000" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Foto do Veículo */}
          <div className="pt-6 border-t border-neutral-800">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#D4AF37]"><Camera size={16} /></div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Apresentação do Ativo</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase leading-relaxed">Insira uma foto de alta qualidade do veículo. Esta imagem será exibida no dashboard administrativo e no portal do investidor.</p>
                  
                  <label className={`relative group cursor-pointer flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed rounded-3xl transition-all overflow-hidden ${vehicleForm.imageFile ? 'border-emerald-500 bg-emerald-500/10/30' : 'border-neutral-700 hover:border-[#D4AF37] hover:bg-black'}`}>
                    {vehicleForm.imageFile ? (
                      <>
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-200/50">
                          <Check size={32} />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-black uppercase tracking-widest text-emerald-600 block mb-1">Foto Carregada</span>
                          <span className="text-[10px] text-emerald-400 font-bold truncate max-w-[200px] block">{vehicleForm.imageFile.name}</span>
                        </div>
                        <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <span className="text-white text-[10px] font-black uppercase tracking-widest bg-neutral-900/80 px-6 py-3 rounded-full">Trocar Foto</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-300 group-hover:text-[#D4AF37] group-hover:bg-[#D4AF37]/10 transition-all">
                          <Camera size={32} />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-black uppercase tracking-widest text-white block mb-1">Selecionar Foto</span>
                          <span className="text-[10px] text-neutral-400 font-bold uppercase">Clique ou arraste o arquivo</span>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden text-white" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setTempImageSrc(reader.result);
                            setIsEditorOpen(true);
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }
                      }} 
                    />
                  </label>
                </div>

                <div className="relative rounded-3xl overflow-hidden bg-neutral-100 border border-neutral-700 aspect-video flex items-center justify-center group shadow-inner">
                  {vehicleForm.imagePreview || vehicleForm.image ? (
                    <>
                      <img 
                        src={vehicleForm.imagePreview || vehicleForm.image} 
                        alt="Preview" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                      <div className="absolute inset-0 bg-neutral-955/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setTempImageSrc(vehicleForm.imagePreview || vehicleForm.image);
                            setIsEditorOpen(true);
                          }}
                          className="bg-[#D4AF37] text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-[#0a0a0a] transition-all shadow-xl"
                        >
                          Ajustar Foto
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-neutral-300">
                      <Car size={48} strokeWidth={1} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Pré-visualização</span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="bg-neutral-900/80 backdrop-blur-md text-[#D4AF37] text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-[#D4AF37]/30">Preview Ativo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CRLV do Veículo */}
          <div className="pt-6 border-t border-neutral-800">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#D4AF37]"><FileText size={16} /></div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Documento do Veículo (CRLV)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase leading-relaxed">Insira o documento CRLV em formato PDF ou imagem. Isso permitirá a visualização direta e download no dossiê do veículo.</p>
                  
                  <label className={`relative group cursor-pointer flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-3xl transition-all overflow-hidden ${vehicleForm.crlvFile || vehicleForm.crlv ? 'border-emerald-500 bg-emerald-500/10/30' : 'border-neutral-700 hover:border-[#D4AF37] hover:bg-black'}`}>
                    {vehicleForm.crlvFile || vehicleForm.crlv ? (
                      <>
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-200/50">
                          <Check size={24} />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-black uppercase tracking-widest text-emerald-600 block mb-1">CRLV Vinculado</span>
                          <span className="text-[10px] text-emerald-400 font-bold truncate max-w-[250px] block">
                            {vehicleForm.crlvFile ? vehicleForm.crlvFile.name : 'Arquivo CRLV Atual'}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <span className="text-white text-[10px] font-black uppercase tracking-widest bg-neutral-900/80 px-6 py-3 rounded-full">Substituir Documento</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-300 group-hover:text-[#D4AF37] group-hover:bg-[#D4AF37]/10 transition-all">
                          <FileText size={24} />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-black uppercase tracking-widest text-white block mb-1">Selecionar CRLV</span>
                          <span className="text-[10px] text-neutral-400 font-bold uppercase">PDF, PNG ou JPG</span>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept=".pdf,image/*"
                      className="hidden text-white" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setVehicleForm({
                            ...vehicleForm,
                            crlvFile: file,
                            crlv: ''
                          });
                        }
                      }} 
                    />
                  </label>
                </div>

                <div className="flex flex-col justify-center items-center p-6 bg-black rounded-3xl border border-neutral-800 text-center font-bold">
                  {vehicleForm.crlv || vehicleForm.crlvFile ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center mx-auto text-[#D4AF37]">
                        <FileText size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-200 block">Documento Pronto</span>
                        {vehicleForm.crlv && (
                          <a href={vehicleForm.crlv} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#D4AF37] font-black uppercase tracking-wider hover:underline mt-2 inline-block">
                            Visualizar Documento Atual
                          </a>
                        )}
                      </div>
                      {(vehicleForm.crlv || vehicleForm.crlvFile) && (
                        <button 
                          type="button" 
                          onClick={() => setVehicleForm({...vehicleForm, crlv: '', crlvFile: null})} 
                          className="text-[9px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest cursor-pointer"
                        >
                          Remover Documento
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-neutral-300">
                      <FileText size={48} strokeWidth={1} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Nenhum CRLV Anexado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CRV do Veículo */}
          <div className="pt-6 border-t border-neutral-800">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#D4AF37]"><FileText size={16} /></div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Documento do Veículo (CRV)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase leading-relaxed">Insira o documento CRV em formato PDF ou imagem. Isso permitirá a visualização direta e download no dossiê do veículo.</p>
                  
                  <label className={`relative group cursor-pointer flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-3xl transition-all overflow-hidden ${vehicleForm.crvFile || vehicleForm.crv ? 'border-emerald-500 bg-emerald-500/10/30' : 'border-neutral-700 hover:border-[#D4AF37] hover:bg-black'}`}>
                    {vehicleForm.crvFile || vehicleForm.crv ? (
                      <>
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-200/50">
                          <Check size={24} />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-black uppercase tracking-widest text-emerald-600 block mb-1">CRV Vinculado</span>
                          <span className="text-[10px] text-emerald-400 font-bold truncate max-w-[250px] block">
                            {vehicleForm.crvFile ? vehicleForm.crvFile.name : 'Arquivo CRV Atual'}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <span className="text-white text-[10px] font-black uppercase tracking-widest bg-neutral-900/80 px-6 py-3 rounded-full">Substituir Documento</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-300 group-hover:text-[#D4AF37] group-hover:bg-[#D4AF37]/10 transition-all">
                          <FileText size={24} />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-black uppercase tracking-widest text-white block mb-1">Selecionar CRV</span>
                          <span className="text-[10px] text-neutral-400 font-bold uppercase">PDF, PNG ou JPG</span>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept=".pdf,image/*"
                      className="hidden text-white" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setVehicleForm({
                            ...vehicleForm,
                            crvFile: file,
                            crv: ''
                          });
                        }
                      }} 
                    />
                  </label>
                </div>

                <div className="flex flex-col justify-center items-center p-6 bg-black rounded-3xl border border-neutral-800 text-center font-bold">
                  {vehicleForm.crv || vehicleForm.crvFile ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center mx-auto text-[#D4AF37]">
                        <FileText size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-200 block">Documento Pronto</span>
                        {vehicleForm.crv && (
                          <a href={vehicleForm.crv} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#D4AF37] font-black uppercase tracking-wider hover:underline mt-2 inline-block">
                            Visualizar Documento Atual
                          </a>
                        )}
                      </div>
                      {(vehicleForm.crv || vehicleForm.crvFile) && (
                        <button 
                          type="button" 
                          onClick={() => setVehicleForm({...vehicleForm, crv: '', crvFile: null})} 
                          className="text-[9px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest cursor-pointer"
                        >
                          Remover Documento
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-neutral-300">
                      <FileText size={48} strokeWidth={1} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Nenhum CRV Anexado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contrato de Gestão do Veículo */}
          <div className="pt-6 border-t border-neutral-800">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#D4AF37]"><FileText size={16} /></div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Contrato de Gestão</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase leading-relaxed">
                    Gere o contrato de gestão pré-preenchido com os dados do veículo e do investidor, ou anexe o contrato assinado pelo investidor.
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      disabled={!vehicleForm.investorId}
                      onClick={async () => {
                        const selectedInvestor = investors.find(i => i.id.toString() === vehicleForm.investorId?.toString());
                        await generateManagementContract(vehicleForm, selectedInvestor);
                      }}
                      className={`w-full py-4 px-6 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 shadow-lg border ${
                        vehicleForm.investorId
                          ? 'bg-[#0a0a0a] text-white border-neutral-700 hover:bg-black hover:border-[#D4AF37]/50 shadow-neutral-100/55'
                          : 'bg-black text-neutral-300 border-neutral-800 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <FileText size={16} />
                      Gerar Contrato (DOCX)
                    </button>
                    {!vehicleForm.investorId && (
                      <span className="text-[8px] text-amber-600 uppercase font-black tracking-widest ml-1 animate-pulse">
                        * Selecione um investidor acima para liberar a geração do contrato
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className={`relative group cursor-pointer flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-3xl transition-all overflow-hidden ${vehicleForm.contractUrlFile || vehicleForm.contractUrl ? 'border-emerald-500 bg-emerald-500/10/30' : 'border-neutral-700 hover:border-[#D4AF37] hover:bg-black'}`}>
                    {vehicleForm.contractUrlFile || vehicleForm.contractUrl ? (
                      <>
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-200/50">
                          <Check size={24} />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-black uppercase tracking-widest text-emerald-600 block mb-1">Contrato Anexado</span>
                          <span className="text-[10px] text-emerald-400 font-bold truncate max-w-[250px] block">
                            {vehicleForm.contractUrlFile ? vehicleForm.contractUrlFile.name : 'Contrato Salvo'}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <span className="text-white text-[10px] font-black uppercase tracking-widest bg-neutral-900/80 px-6 py-3 rounded-full">Substituir Contrato</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-300 group-hover:text-[#D4AF37] group-hover:bg-[#D4AF37]/10 transition-all">
                          <FileText size={24} />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-black uppercase tracking-widest text-white block mb-1">Anexar Contrato Assinado</span>
                          <span className="text-[10px] text-neutral-400 font-bold uppercase">PDF, Imagem ou DOCX</span>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept=".pdf,.docx,image/*"
                      className="hidden text-white" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setVehicleForm({
                            ...vehicleForm,
                            contractUrlFile: file,
                            contractUrl: ''
                          });
                        }
                      }} 
                    />
                  </label>
                  
                  {(vehicleForm.contractUrl || vehicleForm.contractUrlFile) && (
                    <div className="flex justify-between items-center px-4">
                      {vehicleForm.contractUrl && (
                        <a href={vehicleForm.contractUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[#D4AF37] font-black uppercase tracking-wider hover:underline">
                          Visualizar Contrato Atual
                        </a>
                      )}
                      <button 
                        type="button" 
                        onClick={() => setVehicleForm({...vehicleForm, contractUrl: '', contractUrlFile: null})} 
                        className="text-[9px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest cursor-pointer ml-auto"
                      >
                        Remover Contrato
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>

        <ImageEditorModal
          isOpen={isEditorOpen}
          imageSrc={tempImageSrc}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleEditorSave}
        />
        
        {/* Footer */}
        <div className="p-6 md:p-12 border-t border-neutral-50 bg-black/30 flex justify-end shrink-0">
          <button 
            type="submit"
            onClick={onSubmit}
            className="bg-neutral-900 text-[#D4AF37] px-16 py-5 rounded-2xl text-[10px] uppercase tracking-[0.3em] font-black hover:bg-[#D4AF37] hover:text-white transition-all shadow-xl shadow-[#D4AF37]/10"
          >
            {isEditing ? 'Salvar Alterações' : 'Cadastrar Veículo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleFormModal;
