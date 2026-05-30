import React, { useState } from 'react';
import { X, ClipboardCheck, Calendar, Car, Gauge, Fuel, Camera, Play, Eye, Download, AlertTriangle, FileText, Ban } from 'lucide-react';

const InspectionDetailModal = ({ inspection, onClose, onCloseContract, rentals = [] }) => {
  const [selectedMedia, setSelectedMedia] = useState(null);

  if (!inspection) return null;

  const hasActiveRental = rentals.some(r => {
    if (r.status !== 'Ativo') return false;
    const samePlate = (r.vehiclePlate || r.plate || '').toLowerCase() === (inspection.vehiclePlate || '').toLowerCase();
    if (!samePlate) return false;
    
    // Compara apenas a data (YYYY-MM-DD) para evitar problemas de fuso horário
    const getJustDateStr = (val) => {
      if (!val) return '';
      if (val instanceof Date) {
        return val.toISOString().split('T')[0];
      }
      const str = String(val);
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return str.substring(0, 10);
      }
      try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch (e) {}
      return str;
    };
    
    const insDate = getJustDateStr(inspection.date);
    const rentalStart = getJustDateStr(r.startDate || r.date);
    
    return insDate && rentalStart && insDate >= rentalStart;
  });

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md" onClick={onClose} />
      
      {/* Media Preview Overlay */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-10">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedMedia(null)} />
          <div className="relative z-10 max-w-full max-h-full">
            {selectedMedia.type === 'video' ? (
              <video src={selectedMedia.url} controls className="max-w-full max-h-[85vh] rounded-3xl shadow-2xl border border-white/10" autoPlay />
            ) : (
              <img src={selectedMedia.url} className="max-w-full max-h-[85vh] rounded-3xl shadow-2xl border border-white/10" alt="Preview" />
            )}
            <button onClick={() => setSelectedMedia(null)} className="absolute -top-12 right-0 text-white flex items-center gap-2 font-black uppercase text-[10px] tracking-widest hover:text-[#C5A059] transition-colors">
              <X size={20} /> Fechar Preview
            </button>
          </div>
        </div>
      )}

      <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="p-8 md:p-10 border-b border-neutral-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-neutral-900 rounded-[2rem] flex items-center justify-center text-[#C5A059] shadow-2xl shadow-[#C5A059]/20">
              <ClipboardCheck size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                  inspection.type === 'Entrega' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  inspection.type === 'Devolução' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  inspection.type === 'Coleta' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-neutral-50 text-neutral-400 border-neutral-100'
                }`}>
                  Vistoria de {inspection.type}
                </span>
              </div>
              <h4 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">Dossiê Técnico de Vistoria</h4>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-neutral-50 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all text-neutral-400 hover:text-neutral-900">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12">
          {/* Section 1: Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-neutral-900 p-6 rounded-3xl border border-[#C5A059]/20 flex flex-col justify-between">
              <p className="text-[8px] uppercase tracking-[0.2em] text-[#C5A059] font-black mb-4">Veículo</p>
              <h5 className="text-2xl font-black text-white uppercase tracking-tighter">{inspection.vehiclePlate}</h5>
              <div className="flex items-center gap-2 mt-4 text-neutral-500">
                <Calendar size={12} />
                <span className="text-[10px] font-bold uppercase">{inspection.date} às {inspection.time}</span>
              </div>
            </div>
            
            <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
              <p className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-4">Quilometragem</p>
              <div className="flex items-center gap-3">
                <Gauge size={20} className="text-neutral-900" />
                <h5 className="text-2xl font-black text-neutral-900">{inspection.km} <span className="text-xs">KM</span></h5>
              </div>
            </div>

            <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
              <p className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-4">Combustível</p>
              <div className="flex items-center gap-3">
                <Fuel size={20} className="text-neutral-900" />
                <h5 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">{inspection.fuelLevel}</h5>
              </div>
            </div>

            <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
              <p className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-4">Estado Pneus</p>
              <div className="flex items-center gap-3">
                <ClipboardCheck size={20} className="text-neutral-900" />
                <h5 className="text-2xl font-black text-neutral-900 uppercase tracking-tight">{inspection.tireCondition}</h5>
              </div>
            </div>
          </div>

          {/* Section 1.5: Cleanliness & Oil Control */}
          {(inspection.externalCleanliness || inspection.internalCleanliness || inspection.lastOilChangeKm || inspection.nextOilChangeKm) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-50 p-8 rounded-[2rem] border border-neutral-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Estado de Limpeza</h5>
                <div className="grid grid-cols-2 gap-4">
                  {inspection.externalCleanliness && (
                    <div className="bg-white p-4 rounded-2xl border border-neutral-100">
                      <p className="text-[7px] uppercase font-black text-neutral-400 mb-1">Limpeza Externa</p>
                      <p className={`text-xs font-black uppercase ${
                        inspection.externalCleanliness === 'Limpo' ? 'text-emerald-600' :
                        inspection.externalCleanliness === 'Aceitável' ? 'text-amber-600' : 'text-red-600'
                      }`}>{inspection.externalCleanliness}</p>
                    </div>
                  )}
                  {inspection.internalCleanliness && (
                    <div className="bg-white p-4 rounded-2xl border border-neutral-100">
                      <p className="text-[7px] uppercase font-black text-neutral-400 mb-1">Limpeza Interna</p>
                      <p className={`text-xs font-black uppercase ${
                        inspection.internalCleanliness === 'Limpo' ? 'text-emerald-600' :
                        inspection.internalCleanliness === 'Aceitável' ? 'text-amber-600' :
                        inspection.internalCleanliness === 'Sujo' ? 'text-red-600' : 'text-rose-600'
                      }`}>{inspection.internalCleanliness}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Controle de Óleo</h5>
                <div className="grid grid-cols-3 gap-4">
                  {inspection.lastOilChangeDate ? (
                    <div className="bg-white p-4 rounded-2xl border border-neutral-100">
                      <p className="text-[7px] uppercase font-black text-neutral-400 mb-1">Última Troca (Data)</p>
                      <p className="text-xs font-black text-neutral-900">{new Date(inspection.lastOilChangeDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                  ) : null}
                  {inspection.lastOilChangeKm ? (
                    <div className="bg-white p-4 rounded-2xl border border-neutral-100">
                      <p className="text-[7px] uppercase font-black text-neutral-400 mb-1">Última Troca (KM)</p>
                      <p className="text-xs font-black text-neutral-900">{(parseInt(inspection.lastOilChangeKm) || 0).toLocaleString()} KM</p>
                    </div>
                  ) : null}
                  {inspection.nextOilChangeKm ? (
                    <div className="bg-white p-4 rounded-2xl border border-neutral-100">
                      <p className="text-[7px] uppercase font-black text-neutral-400 mb-1">Próxima Troca (KM)</p>
                      <p className="text-xs font-black text-neutral-900">{(parseInt(inspection.nextOilChangeKm) || 0).toLocaleString()} KM</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Photos Gallery */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <Camera size={18} className="text-[#C5A059]" />
              <h5 className="text-sm font-black uppercase tracking-widest text-neutral-900">Evidências Fotográficas</h5>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {[
                { id: 'front', label: 'Frente Completa' },
                { id: 'rear', label: 'Traseira Completa' },
                { id: 'sideRightFront', label: 'Lat. Dir. Dianteira' },
                { id: 'sideLeftFront', label: 'Lat. Esq. Dianteira' },
                { id: 'sideRightRear', label: 'Lat. Dir. Traseira' },
                { id: 'sideLeftRear', label: 'Lat. Esq. Traseira' },
                { id: 'plate', label: 'Placa do Veículo' },
                { id: 'odometer', label: 'Hodômetro (KM)' },
                { id: 'dashboard', label: 'Painel Ligado' },
                { id: 'interior1', label: 'Interior 1' },
                { id: 'interior2', label: 'Interior 2' },
                { id: 'tools', label: 'Triang/Mac/Chave' },
              ].map((slot) => {
                const photo = inspection.photos[slot.id];
                return (
                  <div key={slot.id} className="space-y-3">
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest text-center">{slot.label}</p>
                    <div className="aspect-square bg-neutral-100 rounded-3xl overflow-hidden relative group border border-neutral-200 shadow-inner">
                      {photo ? (
                        <>
                          <img src={photo.preview} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={slot.label} />
                          <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                            <button 
                              onClick={() => setSelectedMedia({ type: 'image', url: photo.preview })}
                              className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-neutral-900 shadow-xl hover:scale-110 transition-transform"
                            >
                              <Eye size={18} />
                            </button>
                            <a href={photo.preview} download className="w-10 h-10 bg-[#C5A059] rounded-xl flex items-center justify-center text-neutral-950 shadow-xl hover:scale-110 transition-transform">
                              <Download size={18} />
                            </a>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-300">
                          <AlertTriangle size={20} />
                          <span className="text-[8px] font-black uppercase">Não Registrada</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Video Slot in Detail */}
              <div className="space-y-3">
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest text-center">Vídeo da Vistoria</p>
                <div className="aspect-square bg-neutral-100 rounded-3xl overflow-hidden relative group border border-neutral-200 shadow-inner">
                  {inspection.video ? (
                    <>
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-neutral-900">
                        <Play size={32} className="text-[#C5A059]" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-white">Assistir Registro</span>
                      </div>
                      <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setSelectedMedia({ type: 'video', url: inspection.video.preview })}
                          className="px-6 py-3 bg-[#C5A059] rounded-xl flex items-center justify-center text-neutral-950 shadow-xl hover:scale-105 transition-all text-[9px] font-black uppercase tracking-widest"
                        >
                          Reproduzir
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-300">
                      <AlertTriangle size={20} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Sem Vídeo</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 2.5: Additional Photos if they exist */}
          {inspection.photos?.additional && inspection.photos.additional.length > 0 && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-3 mb-8">
                <Camera size={18} className="text-[#C5A059]" />
                <h5 className="text-sm font-black uppercase tracking-widest text-neutral-900">Fotos Adicionais</h5>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {inspection.photos.additional.map((photo, index) => (
                  <div key={index} className="space-y-3">
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest text-center">Adicional {index + 1}</p>
                    <div className="aspect-square bg-neutral-100 rounded-3xl overflow-hidden relative group border border-neutral-200 shadow-inner">
                      <img src={photo.preview} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={`Foto Adicional ${index + 1}`} />
                      <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setSelectedMedia({ type: 'image', url: photo.preview })}
                          className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-neutral-900 shadow-xl hover:scale-110 transition-transform"
                        >
                          <Eye size={18} />
                        </button>
                        <a href={photo.preview} download className="w-10 h-10 bg-[#C5A059] rounded-xl flex items-center justify-center text-neutral-950 shadow-xl hover:scale-110 transition-transform">
                          <Download size={18} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: Damages */}
          {inspection.hasDamages && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="flex items-center gap-3 mb-8">
                  <AlertTriangle size={18} className="text-red-500" />
                  <h5 className="text-sm font-black uppercase tracking-widest text-neutral-900">Avarias Identificadas</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {inspection.damages?.filter(d => d.photo || d.description)?.map((dmg, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm flex flex-col gap-6">
                       <div className="aspect-video bg-neutral-100 rounded-2xl overflow-hidden relative group">
                          {dmg.photo ? (
                            <>
                              <img src={dmg.photo.preview} className="w-full h-full object-cover" alt={`Avaria ${idx + 1}`} />
                              <button 
                                onClick={() => setSelectedMedia({ type: 'image', url: dmg.photo.preview })}
                                className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white"
                              >
                                <Eye size={20} />
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300">
                               <AlertTriangle size={24} />
                            </div>
                          )}
                       </div>
                       <div className="space-y-2">
                          <span className="text-[8px] uppercase font-black text-neutral-400 tracking-widest">Descrição da Avaria</span>
                          <p className="text-xs text-neutral-700 font-bold leading-relaxed">{dmg.description || 'Sem descrição detalhada.'}</p>
                       </div>
                    </div>
                  ))}
               </div>            </div>
            </section>
          )}

          {/* Section 3: Deductions (Return Only) */}
          {inspection.deductions && inspection.deductions.length > 0 && (
            <section className="bg-neutral-900 p-10 rounded-[3rem] border border-[#C5A059]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/5 blur-3xl -mr-32 -mt-32" />
              
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <AlertTriangle size={18} className="text-[#C5A059]" />
                <h5 className="text-sm font-black uppercase tracking-widest text-white">Itens a Descontar da Caução</h5>
              </div>

              <div className="space-y-4 relative z-10">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="pb-4 text-[9px] uppercase tracking-widest text-neutral-500 font-black">Categoria</th>
                      <th className="pb-4 text-[9px] uppercase tracking-widest text-neutral-500 font-black">Descrição</th>
                      <th className="pb-4 text-[9px] uppercase tracking-widest text-neutral-500 font-black text-center">Proporcional</th>
                      <th className="pb-4 text-[9px] uppercase tracking-widest text-neutral-500 font-black text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {inspection.deductions.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-white/5 transition-colors">
                        <td className="py-4 text-[10px] font-black text-[#C5A059] uppercase">{item.category}</td>
                        <td className="py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-tight">{item.description || '-'}</td>
                        <td className="py-4 text-center">
                          {item.isProportional && <span className="bg-[#C5A059]/20 text-[#C5A059] px-2 py-1 rounded text-[7px] font-black uppercase">Sim</span>}
                        </td>
                        <td className="py-4 text-[11px] font-black text-white text-right">
                          {parseFloat(item.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest italic">* Valores autorizados via assinatura de vistoria</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest mb-1">Total de Descontos</p>
                    <h6 className="text-3xl font-black text-[#C5A059] tracking-tighter">
                      {inspection.deductions.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h6>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 4: Observations */}
          <section className="bg-neutral-50 p-10 rounded-[3rem] border border-neutral-100">
            <div className="flex items-center gap-3 mb-6">
              <FileText size={18} className="text-[#C5A059]" />
              <h5 className="text-sm font-black uppercase tracking-widest text-neutral-900">Observações e Notas Técnicas</h5>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-neutral-100 min-h-[150px]">
              <p className="text-sm text-neutral-600 leading-relaxed italic font-light">
                {inspection.observations || 'Nenhuma observação técnica registrada para este dossiê.'}
              </p>
            </div>
          </section>

        </div>

        {/* Footer */}
        {inspection.type === 'Devolução' && hasActiveRental && (
          <div className="p-8 border-t border-neutral-50 bg-neutral-50/30 flex justify-end shrink-0">
            <button 
              onClick={() => onCloseContract(inspection)}
              className="flex items-center gap-3 px-16 py-5 bg-neutral-900 text-[#C5A059] text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-[#C5A059] hover:text-white transition-all shadow-xl"
            >
              <Ban size={16} /> Encerrar Contrato
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const FileCheck = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="m9 15 2 2 4-4" />
  </svg>
);

export default InspectionDetailModal;
