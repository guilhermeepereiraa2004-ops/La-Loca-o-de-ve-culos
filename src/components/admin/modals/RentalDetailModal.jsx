import React, { useState } from 'react';
import { 
  X, ClipboardList, Clock, User, CreditCard, Camera, 
  Download, Car, Calendar, Landmark, AlertTriangle, 
  FileText, TrendingUp, Phone, Mail, Image as ImageIcon,
  FileDown
} from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';
import { generateRentalContract } from '../../../utils/contractGenerator';
import ImageViewer from '../../ui/ImageViewer';

const RentalDetailModal = ({ rental, inspections = [], onClose, onUpdate, setSelectedImage: setGlobalSelectedImage }) => {
  if (!rental) return null;
  const [localSelectedImage, setLocalSelectedImage] = useState(null);
  
  // Use global if available, fallback to local
  const setSelectedImage = setGlobalSelectedImage || setLocalSelectedImage;

  const getFileUrl = (file) => {
    if (!file) return null;
    if (typeof file === 'string') {
      if (file === '[object Object]') return null; // Prevenção de dados corrompidos
      if (file.startsWith('http') || file.startsWith('blob:') || file.startsWith('data:')) return file;
      // Se for apenas um caminho, assume que é do storage
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/La-locacao/${file}`;
    }
    try {
      return URL.createObjectURL(file);
    } catch (e) {
      return null;
    }
  };

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
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const date = new Date(dateStr + 'T12:00:00');
    return days[date.getDay()];
  };

  const calculateDates = () => {
    const startStr = rental.startDate || rental.date;
    if (!startStr) return { start: '---', end: '---', remaining: 0 };
    
    const startDate = new Date(startStr + 'T12:00:00');
    const weeks = parseInt(rental.durationWeeks || rental.period || 1);
    const totalDays = weeks * 7;
    
    const endDate = new Date(startDate.getTime());
    endDate.setDate(startDate.getDate() + totalDays);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffDays = Math.ceil((endSimple.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      start: startDate.toLocaleDateString('pt-BR'),
      end: endDate.toLocaleDateString('pt-BR'),
      remaining: diffDays > 0 ? diffDays : 0,
      weekday: getDayOfWeek(startStr)
    };
  };

  const dates = calculateDates();

  // Filter inspections for this rental
  const rentalInspections = inspections.filter(ins => 
    ins.vehiclePlate === rental.plate && 
    new Date(ins.date) >= new Date(rental.date) &&
    ins.type !== 'Coleta'
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-full max-w-7xl h-full max-h-[95vh] rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        
        {/* Header */}
        <div className="p-8 md:p-12 border-b border-neutral-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-neutral-900 rounded-[2rem] flex items-center justify-center text-[#C5A059] shadow-2xl shadow-[#C5A059]/20 transform -rotate-3">
              <ClipboardList size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <EditorialLabel className="text-[#C5A059]">Dossiê de Locação</EditorialLabel>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${rental.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-neutral-50 text-neutral-400 border-neutral-100'}`}>
                  Contrato {rental.status}
                </span>
              </div>
              <h4 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">Detalhes do Contrato</h4>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Botão de Anexar Contrato Assinado - MOVIDO PARA O TOPO */}
            <label className={`flex items-center gap-3 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl cursor-pointer group ${
              rental.docs?.signedContract 
                ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                : 'bg-neutral-100 text-neutral-900 hover:bg-[#C5A059] hover:text-white'
            }`}>
              <Download size={18} className={rental.docs?.signedContract ? '' : 'rotate-180 group-hover:animate-bounce'} />
              {rental.docs?.signedContract ? 'Contrato Anexado' : 'Anexar Assinado'}
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

            <button 
              onClick={() => generateRentalContract(rental)}
              className="flex items-center gap-3 px-6 py-3 bg-neutral-900 text-[#C5A059] text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#C5A059] hover:text-white transition-all shadow-xl"
            >
              <FileDown size={18} /> Gerar Contrato (.docx)
            </button>
            <button onClick={onClose} className="w-12 h-12 bg-neutral-50 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all text-neutral-400 hover:text-neutral-900">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12">
          
          {/* Gestão de Contratos - SEÇÃO DEDICADA */}
          <section className="bg-neutral-900 rounded-[2.5rem] p-10 border border-[#C5A059]/20 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#C5A059]/10 blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-[#C5A059]/20" />
            
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-[#C5A059] rounded-3xl flex items-center justify-center text-neutral-900 shadow-2xl shadow-[#C5A059]/20 transform -rotate-3 group-hover:rotate-0 transition-transform">
                  <FileText size={40} />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-white uppercase tracking-tight">Gestão de Contratos</h4>
                  <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mt-2">Gere e anexe o documento formal assinado</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-6">
                <button 
                  onClick={() => generateRentalContract(rental)}
                  className="flex items-center gap-4 px-10 py-5 bg-white text-neutral-900 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-[#C5A059] hover:text-white transition-all shadow-2xl transform hover:-translate-y-1"
                >
                  <FileDown size={20} /> Gerar Contrato (.docx)
                </button>

                <label className={`flex items-center gap-4 px-10 py-5 text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl cursor-pointer transform hover:-translate-y-1 ${
                  rental.docs?.signedContract 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                    : 'bg-[#C5A059] text-white hover:bg-white hover:text-[#C5A059]'
                }`}>
                  <Download size={20} className={rental.docs?.signedContract ? '' : 'rotate-180'} />
                  {rental.docs?.signedContract ? 'Contrato Anexado' : 'Anexar Contrato Assinado'}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file && onUpdate) {
                        onUpdate({ 
                          ...rental, 
                          docs: { ...rental.docs, signedContract: file } 
                        });
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Section 1: Top Status Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 bg-neutral-900 rounded-[2.5rem] p-10 flex items-center justify-between relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-[#C5A059]/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-[#C5A059]/20 rounded-3xl flex items-center justify-center text-[#C5A059]">
                  <Clock size={40} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-[#C5A059] text-[10px] uppercase tracking-[0.3em] font-black mb-1">Tempo Restante</p>
                  <h2 className="text-5xl font-black text-white tracking-tighter">{dates.remaining} dias</h2>
                </div>
              </div>
              <div className="text-right">
                <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest">Devolução em</p>
                <p className="text-2xl font-black text-white leading-none mt-1">{dates.end}</p>
              </div>
            </div>
            <div className="bg-[#C5A059] rounded-[2.5rem] p-10 flex flex-col justify-center text-neutral-900 shadow-xl shadow-[#C5A059]/20">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-60 mb-2">Cobrança Recorrente</p>
              <h3 className="text-3xl font-black uppercase tracking-tight">{dates.weekday}</h3>
              <p className="text-[9px] font-bold uppercase mt-2 opacity-80">Baseado na data de início ({dates.start})</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column (8 cols) */}
            <div className="lg:col-span-8 space-y-12">
              
              {/* Condutor Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <User size={18} className="text-[#C5A059]" />
                  <h5 className="text-sm font-black uppercase tracking-widest text-neutral-900">Dados do Condutor</h5>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-neutral-400 mb-1">Nome do Cliente</p>
                      <p className="text-lg font-black text-neutral-900 leading-tight">{rental.user}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center text-neutral-400"><Phone size={16} /></div>
                      <div>
                        <p className="text-[8px] uppercase font-bold text-neutral-400">WhatsApp</p>
                        <p className="text-sm font-black text-neutral-900">{rental.clientPhone || '---'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center text-neutral-400"><Mail size={16} /></div>
                      <div>
                        <p className="text-[8px] uppercase font-bold text-neutral-400">E-mail</p>
                        <p className="text-sm font-black text-neutral-900">{rental.email || '---'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6 bg-neutral-50/50 p-6 rounded-3xl border border-neutral-100">
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard size={16} className="text-[#C5A059]" />
                      <p className="text-[10px] uppercase font-black tracking-widest text-neutral-900">Habilitação (CNH)</p>
                    </div>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div>
                        <p className="text-[8px] uppercase font-bold text-neutral-400">Número CNH</p>
                        <p className="text-sm font-black text-neutral-900">{rental.cnhNumber || '---'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase font-bold text-neutral-400">Registro CNH</p>
                        <p className="text-sm font-black text-neutral-900">{rental.cnhRegisterNumber || '---'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase font-bold text-neutral-400">Nascimento</p>
                        <p className="text-sm font-black text-neutral-900">{rental.birthDate ? new Date(rental.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase font-bold text-neutral-400">Validade</p>
                        <p className="text-sm font-black text-neutral-900">{rental.cnhValidity ? new Date(rental.cnhValidity + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Vistorias Section - NEW */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <ClipboardList size={18} className="text-[#C5A059]" />
                  <h5 className="text-sm font-black uppercase tracking-widest text-neutral-900">Histórico de Vistorias neste Contrato</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {rentalInspections.length > 0 ? (
                    rentalInspections.map((ins) => (
                      <div key={ins.id} className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-widest ${
                              ins.type === 'Entrega' ? 'bg-blue-500 text-white' : 
                              ins.type === 'Devolução' ? 'bg-red-500 text-white' : 
                              'bg-[#C5A059] text-white'
                            }`}>
                              {ins.type}
                            </span>
                            <p className="text-xs font-black text-neutral-900 mt-2">{new Date(ins.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <p className="text-[9px] font-bold text-neutral-400 uppercase">{ins.km} KM</p>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {(ins.images || []).map((img, i) => (
                            <button key={i} onClick={() => setSelectedImage(img)} className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-neutral-200">
                              <img src={img} className="w-full h-full object-cover" alt="Vistoria" />
                            </button>
                          ))}
                        </div>
                        <p className="text-[8px] text-neutral-500 line-clamp-2 italic">"{ins.observations || 'Sem observações'}"</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 p-10 bg-neutral-50 rounded-[2.5rem] border border-dashed border-neutral-200 text-center">
                      <p className="text-[9px] font-black text-neutral-300 uppercase tracking-widest">Nenhuma vistoria realizada vinculada a este contrato</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Anexos Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <Camera size={18} className="text-[#C5A059]" />
                  <h5 className="text-sm font-black uppercase tracking-widest text-neutral-900">Documentação em Anexo</h5>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {/* CNH File */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest text-center">Foto CNH</p>
                    <div className="aspect-[4/3] bg-neutral-100 rounded-3xl overflow-hidden group relative border border-neutral-200">
                      {rental.docs?.cnh ? (
                        <>
                          <img src={getFileUrl(rental.docs.cnh)} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="CNH" />
                          <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                            <button onClick={() => handlePreview(getFileUrl(rental.docs.cnh))} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-neutral-900 shadow-xl hover:scale-110 transition-transform"><ImageIcon size={18} /></button>
                            <a href={getFileUrl(rental.docs.cnh)} download className="w-10 h-10 bg-[#C5A059] rounded-xl flex items-center justify-center text-neutral-950 shadow-xl hover:scale-110 transition-transform"><Download size={18} /></a>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-300">
                          <AlertTriangle size={20} />
                          <span className="text-[8px] font-black uppercase">Não Anexado</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Residence Proof */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest text-center">Residência</p>
                    <div className="aspect-[4/3] bg-neutral-100 rounded-3xl overflow-hidden group relative border border-neutral-200">
                      {rental.docs?.residence ? (
                        <>
                          <img src={getFileUrl(rental.docs.residence)} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Residência" />
                          <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                            <button onClick={() => handlePreview(getFileUrl(rental.docs.residence))} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-neutral-900 shadow-xl hover:scale-110 transition-transform"><ImageIcon size={18} /></button>
                            <a href={getFileUrl(rental.docs.residence)} download className="w-10 h-10 bg-[#C5A059] rounded-xl flex items-center justify-center text-neutral-950 shadow-xl hover:scale-110 transition-transform"><Download size={18} /></a>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-300">
                          <AlertTriangle size={20} />
                          <span className="text-[8px] font-black uppercase">Não Anexado</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* App Prints (Iterate if multiple) */}
                  {(rental.docs?.appPrints || []).slice(0, 2).map((print, idx) => (
                    <div key={idx} className="space-y-2">
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest text-center">Print App {idx + 1}</p>
                      <div className="aspect-[4/3] bg-neutral-100 rounded-3xl overflow-hidden group relative border border-neutral-200">
                        <img src={getFileUrl(print)} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={`Print ${idx + 1}`} />
                        <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                          <button onClick={() => handlePreview(getFileUrl(print))} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-neutral-900 shadow-xl hover:scale-110 transition-transform"><ImageIcon size={18} /></button>
                          <a href={getFileUrl(print)} download className="w-10 h-10 bg-[#C5A059] rounded-xl flex items-center justify-center text-neutral-950 shadow-xl hover:scale-110 transition-transform"><Download size={18} /></a>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!rental.docs?.appPrints || rental.docs.appPrints.length === 0) && (
                    <div className="col-span-2 aspect-[8/3] bg-neutral-50 border-2 border-dashed border-neutral-100 rounded-3xl flex items-center justify-center">
                      <p className="text-[9px] font-black text-neutral-300 uppercase tracking-widest">Sem Prints do App</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Contrato Assinado Section */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-[#C5A059]" />
                    <h5 className="text-sm font-black uppercase tracking-widest text-neutral-900">Contrato Formalizado</h5>
                  </div>
                </div>

                {rental.docs?.signedContract ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                        <FileText size={24} />
                      </div>
                      <div>
                        <p className="text-emerald-700 font-black uppercase tracking-tight">Contrato Assinado</p>
                        <p className="text-emerald-600/60 text-[10px] font-bold uppercase tracking-widest mt-1">Documento anexado com sucesso</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handlePreview(getFileUrl(rental.docs.signedContract))} className="px-6 py-4 bg-white text-neutral-900 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-900 hover:text-white transition-all shadow-sm">Visualizar</button>
                      <a href={getFileUrl(rental.docs.signedContract)} download className="px-8 py-4 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-neutral-900/10">Baixar</a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2.5rem] flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                        <AlertTriangle size={24} />
                      </div>
                      <div>
                        <p className="text-amber-700 font-black uppercase tracking-tight">Aguardando Contrato</p>
                        <p className="text-amber-600/60 text-[10px] font-bold uppercase tracking-widest mt-1">Clique no botão "Anexar Assinado" no topo para subir o arquivo</p>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right Column (4 cols) */}
            <div className="lg:col-span-4 space-y-12">
              {/* Veículo Card */}
              <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm relative overflow-hidden group">
                <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-6 flex items-center gap-2">
                  <Car size={14} className="text-[#C5A059]" /> Veículo Vinculado
                </h5>
                <div className="space-y-6">
                  <div className="aspect-video bg-neutral-100 rounded-2xl overflow-hidden">
                    <img src={rental.image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={rental.vehicle} />
                  </div>
                  <div>
                    <h6 className="text-2xl font-black text-neutral-900 uppercase tracking-tighter leading-none">{rental.vehicle}</h6>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-900 text-white rounded-lg mt-3">
                      <span className="text-[10px] font-black tracking-widest uppercase">{rental.plate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financeiro Card */}
              <div className="bg-neutral-50 p-8 rounded-[3rem] border border-neutral-100 space-y-8">
                <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#C5A059]" /> Resumo Financeiro
                </h5>
                <div className="space-y-6">
                  {(() => {
                    const formatCurrency = (val) => {
                      if (!val) return 'R$ 0,00';
                      const numeric = typeof val === 'string' ? parseFloat(val.replace(/\./g, '').replace(',', '.')) : val;
                      return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    };

                    return (
                      <>
                        <div className="flex justify-between items-end border-b border-neutral-200/50 pb-4">
                          <div>
                            <p className="text-[8px] uppercase font-bold text-neutral-400">Valor Semanal</p>
                            <p className="text-xl font-black text-neutral-900">{formatCurrency(rental.value)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] uppercase font-bold text-neutral-400">Pneus</p>
                            <p className="text-sm font-black text-neutral-900">{formatCurrency(rental.tireTax || '25')}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <p className="text-[8px] uppercase font-bold text-neutral-400">Caução Total</p>
                            <p className="text-sm font-black text-neutral-900">{formatCurrency(rental.depositTotal)}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-[8px] uppercase font-bold text-neutral-400">Pago no Ato</p>
                            <p className="text-sm font-black text-emerald-600">{formatCurrency(rental.depositPaid)}</p>
                          </div>
                          {rental.depositInstallments > 1 && (
                            <div className="p-3 bg-white rounded-xl border border-neutral-200">
                              <p className="text-[8px] uppercase font-bold text-neutral-400 mb-1">Parcelamento Caução</p>
                              <p className="text-xs font-black text-[#C5A059]">{rental.depositInstallments}x semanas</p>
                            </div>
                          )}
                        </div>
                        <div className="pt-6 border-t border-neutral-200">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] uppercase font-black text-neutral-900">Total do Contrato</p>
                            <p className="text-xl font-black text-[#C5A059]">
                              {formatCurrency(parseFloat(String(rental.value).replace(/\./g, '').replace(',', '.')) * parseInt(rental.durationWeeks || 1))}
                            </p>
                          </div>
                          <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest mt-1 text-right">Referente a {rental.durationWeeks} semanas</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {localSelectedImage && <ImageViewer image={localSelectedImage} onClose={() => setLocalSelectedImage(null)} />}
    </div>
  );
};

export default RentalDetailModal;
