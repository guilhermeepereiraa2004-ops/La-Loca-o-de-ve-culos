import React, { useState, useMemo } from 'react';
import { 
  X, ClipboardList, Clock, User, CreditCard, Camera, 
  Download, Car, Calendar, Landmark, AlertTriangle, 
  FileText, TrendingUp, Phone, Mail, Image as ImageIcon,
  FileDown, ChevronRight, MapPin, Hash, ShieldCheck,
  CheckCircle2, ArrowUpRight, DollarSign, Receipt
} from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';
import { generateRentalContract } from '../../../utils/contractGenerator';
import ImageViewer from '../../ui/ImageViewer';
import { getPublicUrl } from '../../../utils/supabaseStorage';

const RentalDetailModal = ({ 
  rental, 
  inspections = [], 
  onClose, 
  onUpdate, 
  setSelectedImage: setGlobalSelectedImage, 
  onGoToVistorias, 
  onPayCaucao 
}) => {
  if (!rental) return null;
  const [localSelectedImage, setLocalSelectedImage] = useState(null);
  const setSelectedImage = setGlobalSelectedImage || setLocalSelectedImage;

  const getFileUrl = (file) => getPublicUrl(file);

  const handlePreview = (url) => {
    if (!url) return;
    const isDoc = url.toLowerCase().includes('.doc') || url.toLowerCase().includes('.docx');
    if (isDoc) {
      window.open(url, '_blank');
    } else {
      setSelectedImage(url);
    }
  };

  const getDayOfWeek = (dateStr) => {
    if (!dateStr) return '';
    try {
      const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const date = new Date(dateStr + 'T12:00:00');
      return days[date.getDay()];
    } catch (e) {
      return '';
    }
  };

  const dates = useMemo(() => {
    const startStr = rental.startDate || rental.date;
    if (!startStr) return { start: '---', end: '---', remaining: 0, progress: 0, totalDays: 0, weekday: '' };
    
    try {
      const startDate = new Date(startStr + 'T12:00:00');
      const weeks = parseInt(rental.durationWeeks || rental.period || 1);
      const totalDays = weeks * 7;
      const endDate = new Date(startDate.getTime());
      endDate.setDate(startDate.getDate() + totalDays);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const diffDays = Math.ceil((endSimple.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const elapsedDays = Math.max(0, Math.min(totalDays, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))));
      const progress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
      
      return {
        start: startDate.toLocaleDateString('pt-BR'),
        end: endDate.toLocaleDateString('pt-BR'),
        remaining: diffDays > 0 ? diffDays : 0,
        progress,
        totalDays,
        weekday: getDayOfWeek(startStr)
      };
    } catch (e) {
      return { start: '---', end: '---', remaining: 0, progress: 0, totalDays: 0, weekday: '' };
    }
  }, [rental]);

  const rentalInspections = useMemo(() => {
    if (!rental.plate && !rental.vehiclePlate) return [];
    return inspections.filter(ins => 
      (ins.vehiclePlate === rental.plate || ins.vehiclePlate === rental.vehiclePlate) && 
      new Date(ins.date) >= new Date(rental.startDate || rental.date) &&
      ins.type !== 'Coleta'
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [inspections, rental]);

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    try {
      const numeric = typeof val === 'number' ? val : parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
      return isNaN(numeric) ? 'R$ 0,00' : numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } catch (e) {
      return 'R$ 0,00';
    }
  };

  const safeSplit = (str, idx = 0) => {
    if (!str) return '---';
    return String(str).split(' ')[idx] || str;
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/98 backdrop-blur-2xl" onClick={onClose} />
      
      <div className="bg-[#f8f9fa] w-full max-w-[1400px] h-full md:h-auto md:max-h-[95vh] md:rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 border border-white/20">
        
        {/* Modern Glass Header */}
        <header className="px-8 md:px-12 py-8 bg-white/80 backdrop-blur-md border-b border-neutral-100 flex flex-col md:flex-row justify-between items-center gap-6 sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-neutral-900 rounded-3xl flex items-center justify-center text-[#C5A059] shadow-2xl shadow-[#C5A059]/20 transform -rotate-3 hover:rotate-0 transition-all duration-500">
              <ClipboardList size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <EditorialLabel className="text-[#C5A059] tracking-[0.2em] text-[10px]">Dossiê de Locação</EditorialLabel>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-colors ${
                  rental.status === 'Ativo' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-neutral-900 text-white border-neutral-800'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${rental.status === 'Ativo' ? 'bg-emerald-500 animate-pulse' : 'bg-white'}`} />
                  {rental.status || 'Pendente'}
                </div>
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">
                {safeSplit(rental.user || rental.userName)} <span className="text-neutral-400">/ {safeSplit(rental.vehicle || rental.vehicleModel)}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => generateRentalContract(rental)}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-neutral-900 text-[#C5A059] text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#C5A059] hover:text-white transition-all shadow-xl group"
            >
              <FileDown size={18} className="group-hover:-translate-y-0.5 transition-transform" /> Contrato .DOCX
            </button>
            <button onClick={onClose} className="w-14 h-14 bg-neutral-50 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all text-neutral-400 hover:text-neutral-900 border border-neutral-100">
              <X size={24} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-12">
          
          {/* Quick Stats Bar - PROGRESS TRACKER */}
          <section className="bg-white p-8 md:p-10 rounded-[3rem] border border-neutral-100 shadow-sm relative overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
              <div className="space-y-1 border-l-2 border-[#C5A059] pl-6">
                <p className="text-[9px] uppercase font-black text-neutral-400 tracking-[0.2em]">Início</p>
                <p className="text-lg font-black text-neutral-900 tracking-tight">{dates.start}</p>
                <p className="text-[9px] font-bold text-neutral-400 uppercase">{dates.weekday}</p>
              </div>
              <div className="space-y-1 border-l-2 border-neutral-100 pl-6">
                <p className="text-[9px] uppercase font-black text-neutral-400 tracking-[0.2em]">Término Previsto</p>
                <p className="text-lg font-black text-neutral-900 tracking-tight">{dates.end}</p>
                <p className="text-[9px] font-bold text-emerald-500 uppercase">Faltam {dates.remaining} dias</p>
              </div>
              <div className="space-y-1 border-l-2 border-neutral-100 pl-6">
                <p className="text-[9px] uppercase font-black text-neutral-400 tracking-[0.2em]">Duração</p>
                <p className="text-lg font-black text-neutral-900 tracking-tight">{rental.durationWeeks || rental.period || 0} Semanas</p>
                <p className="text-[9px] font-bold text-neutral-400 uppercase">{dates.totalDays} dias totais</p>
              </div>
              <div className="space-y-1 border-l-2 border-neutral-100 pl-6">
                <p className="text-[9px] uppercase font-black text-neutral-400 tracking-[0.2em]">Pagamento</p>
                <p className="text-lg font-black text-[#C5A059] tracking-tight">{formatCurrency(rental.value)}</p>
                <p className="text-[9px] font-bold text-neutral-400 uppercase">Ciclo Semanal</p>
              </div>
            </div>

            {/* Progress Visualizer */}
            <div className="mt-10">
              <div className="h-3 w-full bg-neutral-50 rounded-full overflow-hidden flex p-1 border border-neutral-100">
                <div 
                  className="h-full bg-gradient-to-r from-neutral-900 to-[#C5A059] rounded-full shadow-lg transition-all duration-1000"
                  style={{ width: `${dates.progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-3 text-[8px] font-black uppercase tracking-widest text-neutral-400 px-1">
                <span>Contrato Iniciado</span>
                <span>{Math.round(dates.progress)}% concluído</span>
                <span>Encerramento</span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Main Column (8 cols) */}
            <div className="lg:col-span-8 space-y-10">
              
              {/* TWO COLUMN BENTO: CONDUCTOR & VEHICLE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Conductor Bento */}
                <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm space-y-8 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-neutral-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-neutral-900/10">
                        <User size={20} />
                      </div>
                      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-900">Perfil do Condutor</h5>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <p className="text-[8px] uppercase font-black text-neutral-400 mb-1">Nome Completo</p>
                        <h4 className="text-xl font-black text-neutral-900 tracking-tighter leading-tight">{rental.user || rental.userName || '---'}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-neutral-50 p-4 rounded-2xl">
                          <p className="text-[7px] uppercase font-black text-neutral-400 mb-1">WhatsApp</p>
                          <div className="flex items-center gap-2 text-neutral-900 font-bold text-[11px]">
                            <Phone size={12} className="text-[#C5A059]" /> {rental.clientPhone || rental.phone || '---'}
                          </div>
                        </div>
                        <div className="bg-neutral-50 p-4 rounded-2xl">
                          <p className="text-[7px] uppercase font-black text-neutral-400 mb-1">E-mail</p>
                          <div className="flex items-center gap-2 text-neutral-900 font-bold text-[11px] truncate">
                            <Mail size={12} className="text-[#C5A059]" /> {rental.email || '---'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-neutral-100 grid grid-cols-2 gap-y-6 gap-x-4">
                    <div>
                      <p className="text-[7px] uppercase font-black text-neutral-400 mb-1">Número CNH</p>
                      <p className="text-sm font-black text-neutral-900">{rental.cnhNumber || rental.cnh || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[7px] uppercase font-black text-neutral-400 mb-1">Registro CNH</p>
                      <p className="text-sm font-black text-neutral-900">{rental.cnhRegisterNumber || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[7px] uppercase font-black text-neutral-400 mb-1">Cód. Segurança</p>
                      <p className="text-sm font-black text-[#C5A059]">{rental.cnhSecurityCode || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[7px] uppercase font-black text-neutral-400 mb-1">Validade</p>
                      <p className="text-sm font-black text-neutral-900">{rental.cnhValidity ? new Date(rental.cnhValidity + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle Bento */}
                <div className="bg-neutral-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-[#C5A059] text-neutral-900 rounded-2xl flex items-center justify-center shadow-lg shadow-[#C5A059]/20">
                          <Car size={20} />
                        </div>
                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C5A059]">Veículo Vinculado</h5>
                      </div>
                      <div className="aspect-video rounded-[2rem] overflow-hidden mb-6 border border-white/5 bg-neutral-800">
                        {rental.image ? (
                          <img src={getPublicUrl(rental.image)} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="Veículo" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-700">
                            <Car size={48} />
                          </div>
                        )}
                      </div>
                      <h4 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-4">{rental.vehicle || rental.vehicleModel || 'Veículo Indefinido'}</h4>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <Hash size={12} className="text-[#C5A059]" />
                        <span className="text-[11px] font-black text-white tracking-widest uppercase">{rental.plate || rental.vehiclePlate || '---'}</span>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Ativo na Frota
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Statement Section */}
              <section className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-[#C5A059] rounded-2xl flex items-center justify-center">
                      <Receipt size={20} />
                    </div>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-900">Extrato Financeiro do Contrato</h5>
                  </div>
                  {onPayCaucao && (
                    <button onClick={onPayCaucao} className="text-[10px] font-black uppercase tracking-widest text-[#C5A059] hover:text-neutral-900 transition-colors flex items-center gap-2 group">
                      Gerar Cobrança <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="p-6 bg-[#f8f9fa] rounded-3xl border border-neutral-100">
                    <p className="text-[8px] uppercase font-black text-neutral-400 mb-2">Aluguel Semanal</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-neutral-900">{formatCurrency(rental.value)}</span>
                      <span className="text-[8px] font-black text-neutral-400 uppercase">/ sem</span>
                    </div>
                  </div>
                  <div className="p-6 bg-[#f8f9fa] rounded-3xl border border-neutral-100">
                    <p className="text-[8px] uppercase font-black text-neutral-400 mb-2">Taxa de Pneus</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-neutral-900">{formatCurrency(rental.tireTax || 25)}</span>
                      <span className="text-[8px] font-black text-neutral-400 uppercase">/ sem</span>
                    </div>
                  </div>
                  <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                    <p className="text-[8px] uppercase font-black text-emerald-600 mb-2">Caução Integral</p>
                    <div className="flex items-baseline gap-1 text-emerald-900">
                      <span className="text-lg font-black">{formatCurrency(rental.depositTotal)}</span>
                      <span className="text-[8px] font-black uppercase opacity-60">Garantia</span>
                    </div>
                  </div>
                </div>

                {/* Sub-financial details */}
                <div className="space-y-4 pt-6 border-t border-neutral-50">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-neutral-400 font-bold uppercase tracking-widest">Valor Pago no Ato</span>
                    <span className="font-black text-neutral-900">{formatCurrency(rental.depositPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-neutral-400 font-bold uppercase tracking-widest">Saldo de Caução Pendente</span>
                    <span className="font-black text-amber-600">
                      {formatCurrency(Math.max(0, 
                        (typeof rental.depositTotal === 'number' ? rental.depositTotal : parseFloat(String(rental.depositTotal || 0).replace(/\./g, '').replace(',', '.'))) - 
                        (typeof rental.depositPaid === 'number' ? rental.depositPaid : parseFloat(String(rental.depositPaid || 0).replace(/\./g, '').replace(',', '.')))
                      ))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-4 border-t border-neutral-50">
                    <span className="text-neutral-900 font-black uppercase tracking-[0.2em]">Total Bruto do Contrato</span>
                    <span className="text-2xl font-black text-[#C5A059]">
                      {formatCurrency(
                        (typeof rental.value === 'number' ? rental.value : parseFloat(String(rental.value || 0).replace(/\./g, '').replace(',', '.'))) * 
                        parseInt(rental.durationWeeks || rental.period || 1)
                      )}
                    </span>
                  </div>
                </div>
              </section>

              {/* Inspections History Section */}
              <section className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-900">Certificados de Vistoria</h5>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {rentalInspections.length > 0 ? (
                    rentalInspections.map((ins) => (
                      <div key={ins.id} className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6 hover:border-[#C5A059]/30 transition-all group">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest ${
                              ins.type === 'Entrega' ? 'bg-blue-900 text-white' : 
                              ins.type === 'Devolução' ? 'bg-[#C5A059] text-white' : 
                              'bg-neutral-100 text-neutral-500'
                            }`}>
                              {ins.type}
                            </div>
                            <div>
                              <p className="text-xs font-black text-neutral-900">{new Date(ins.date).toLocaleDateString('pt-BR')}</p>
                              <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{(ins.km || 0).toLocaleString()} KM rodados</p>
                            </div>
                          </div>
                          <button onClick={() => {
                            const firstPhoto = Object.values(ins.photos || {})[0];
                            if (firstPhoto) setSelectedImage(getFileUrl(firstPhoto));
                          }} className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center text-neutral-400 hover:bg-neutral-900 hover:text-white transition-all">
                            <ImageIcon size={18} />
                          </button>
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                          {Object.values(ins.photos || {}).map((photo, i) => (
                            <div key={i} className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-neutral-100 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setSelectedImage(getFileUrl(photo))}>
                              <img src={getFileUrl(photo)} className="w-full h-full object-cover" alt="Vistoria" />
                            </div>
                          ))}
                        </div>
                        <div className="bg-neutral-50 p-4 rounded-2xl">
                          <p className="text-[9px] text-neutral-500 leading-relaxed font-medium italic">"{ins.observations || 'Nenhuma observação técnica registrada.'}"</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 p-16 bg-white border-2 border-dashed border-neutral-100 rounded-[3rem] text-center space-y-4">
                      <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto text-neutral-200">
                        <ClipboardList size={32} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-neutral-900 uppercase tracking-widest">Sem vistorias vinculadas</p>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase mt-1">Realize a primeira vistoria de entrega</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Actions & Documents (4 cols) */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* STATUS & ACTIONS CARD */}
              <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm space-y-8">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Ações do Administrador</h5>
                
                <div className="space-y-4">
                  {/* Upload Label */}
                  <label className={`w-full flex items-center gap-4 p-5 rounded-[2rem] transition-all cursor-pointer group border-2 border-dashed ${
                    rental.docs?.signedContract 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : 'bg-neutral-50 border-neutral-200 text-neutral-400 hover:border-[#C5A059] hover:bg-white'
                  }`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                      rental.docs?.signedContract ? 'bg-emerald-500 text-white' : 'bg-white text-neutral-400'
                    }`}>
                      <Download size={20} className={rental.docs?.signedContract ? '' : 'rotate-180 group-hover:animate-bounce'} />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-black uppercase tracking-widest block">{rental.docs?.signedContract ? 'Contrato OK' : 'Anexar Assinado'}</span>
                      <span className="text-[8px] font-bold uppercase opacity-60">PDF ou JPG assinado</span>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file && onUpdate) {
                          onUpdate({ 
                            ...rental, 
                            docs: { ...(rental.docs || {}), signedContract: file } 
                          });
                        }
                      }}
                    />
                  </label>

                  {/* Vistoria Button (Dynamic) */}
                  {onGoToVistorias && !inspections.some(ins => ins.vehiclePlate === (rental.vehiclePlate || rental.plate) && ins.type === 'Entrega') && (
                    <button 
                      onClick={() => onGoToVistorias({ vehiclePlate: rental.plate || rental.vehiclePlate, type: 'Entrega' })}
                      className="w-full flex items-center gap-4 p-5 bg-[#C5A059] text-white rounded-[2rem] hover:bg-neutral-900 transition-all shadow-xl shadow-[#C5A059]/20"
                    >
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <ShieldCheck size={20} />
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] font-black uppercase tracking-widest block">Liberar Entrega</span>
                        <span className="text-[8px] font-bold uppercase opacity-80">Realizar Vistoria Obrigatória</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Distrato e Encerramento Section (Conditional) */}
              {(rental.status === 'Encerrado' || rental.docs?.terminationTerm) && (
                <div className="bg-neutral-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group border border-[#C5A059]/20">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/10 rounded-full blur-3xl" />
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#C5A059] rounded-2xl flex items-center justify-center text-neutral-900 shadow-xl shadow-[#C5A059]/20">
                        <Gavel size={20} />
                      </div>
                      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C5A059]">Contrato Encerrado</h5>
                    </div>

                    {rental.docs?.closureSummary && (
                      <div className="space-y-4">
                        <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-neutral-400 font-bold uppercase">Total de Débitos</span>
                            <span className="text-red-400 font-black">{formatCurrency(rental.docs.closureSummary.totalDebts)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-neutral-400 font-bold uppercase">Caução Aplicada</span>
                            <span className="text-emerald-400 font-black">{formatCurrency(rental.docs.closureSummary.caucaoAvailable)}</span>
                          </div>
                          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-white tracking-widest">
                              {rental.docs.closureSummary.type === 'return' ? 'Saldo Devolvido' : 'Saldo Final'}
                            </span>
                            <span className={`text-xl font-black ${rental.docs.closureSummary.type === 'return' ? 'text-emerald-400' : 'text-amber-500'}`}>
                              {formatCurrency(rental.docs.closureSummary.balance)}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => rental.docs?.terminationTerm && handlePreview(getFileUrl(rental.docs.terminationTerm))} className="flex-1 py-4 bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/20 transition-all border border-white/10">Visualizar Termo</button>
                          <a href={rental.docs?.terminationTerm ? getFileUrl(rental.docs.terminationTerm) : '#'} target="_blank" rel="noopener noreferrer" download className="flex-1 py-4 bg-[#C5A059] text-white text-[9px] font-black uppercase tracking-widest rounded-2xl hover:bg-white hover:text-neutral-900 transition-all text-center shadow-xl">Baixar PDF</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents Card */}
              <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm space-y-8">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Anexos e Fotos</h5>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'CNH', file: rental.docs?.cnh, icon: <CreditCard size={14} /> },
                    { label: 'Residência', file: rental.docs?.residence, icon: <MapPin size={14} /> }
                  ].map((doc, i) => (
                    <div key={i} className={`p-4 rounded-2xl border-2 border-neutral-50 flex flex-col items-center gap-3 transition-all ${doc.file ? 'bg-neutral-50 hover:border-[#C5A059]/30 cursor-pointer' : 'opacity-40'}`} onClick={() => doc.file && handlePreview(getFileUrl(doc.file))}>
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#C5A059] shadow-sm">
                        {doc.icon}
                      </div>
                      <span className="text-[8px] font-black uppercase text-neutral-900 tracking-widest">{doc.label}</span>
                    </div>
                  ))}
                </div>
                
                {/* Scrollable Mini Gallery for App Prints */}
                {((rental.docs?.appPrints || rental.docs?.app_prints)?.length > 0) && (
                  <div className="space-y-4">
                    <p className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Prints do Aplicativo</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {(rental.docs.appPrints || rental.docs.app_prints).map((print, i) => (
                        <div key={i} className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-neutral-100 cursor-pointer hover:opacity-80" onClick={() => handlePreview(getFileUrl(print))}>
                          <img src={getFileUrl(print)} className="w-full h-full object-cover" alt="App Print" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
      {localSelectedImage && <ImageViewer image={localSelectedImage} onClose={() => setLocalSelectedImage(null)} />}
    </div>
  );
};

// Simple Gavel icon since it wasn't in the imports
const Gavel = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m14.5 12.5-8 8a2.11 2.11 0 1 1-3-3l8-8" />
    <path d="m16 16 2 2" />
    <path d="m2 2 16 16" />
    <path d="m14.5 6.5 3-3a2.11 2.11 0 1 1 3 3l-3 3" />
    <path d="m18.2 5.8 3.5 3.5" />
    <path d="m8.8 15.2-3.5-3.5" />
  </svg>
);

export default RentalDetailModal;
