import React, { useState } from 'react';
import { 
  X, ClipboardList, Clock, User, CreditCard, Camera, 
  Download, Car, Calendar, Landmark, AlertTriangle 
} from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';

const RentalDetailModal = ({ rental, onClose }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  const calculateDates = () => {
    if (!rental.startDate) return { start: '---', end: '---', remaining: 0, totalDays: 0 };
    const startDate = new Date(rental.startDate + 'T12:00:00');
    if (isNaN(startDate.getTime())) return { start: '---', end: '---', remaining: 0, totalDays: 0 };
    const totalDays = (parseInt(rental.weeks || rental.contractWeeks || 1)) * 7;
    const endDate = new Date(startDate.getTime());
    endDate.setDate(startDate.getDate() + totalDays);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffTime = endSimple.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      start: startDate.toLocaleDateString('pt-BR'),
      end: endDate.toLocaleDateString('pt-BR'),
      remaining: diffDays > 0 ? diffDays : 0,
      totalDays
    };
  };

  const dates = calculateDates();

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-full max-w-6xl rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-500">

        {/* Modal de Preview de Imagem */}
        {selectedImage && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-10 animate-in zoom-in duration-300">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedImage(null)} />
            <div className="relative z-10 max-w-full max-h-full">
              <img src={selectedImage} className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl border border-white/10" alt="Preview" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-white flex items-center gap-2 font-black uppercase text-[10px] tracking-widest hover:text-[#C5A059] transition-colors"
              >
                <X size={20} /> Fechar Preview
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-10 bg-neutral-950 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#C5A059]/10 to-transparent" />
          <div className="flex items-center gap-8 relative z-10">
            <div className="w-16 h-16 bg-[#C5A059] rounded-2xl flex items-center justify-center text-neutral-950 shadow-2xl shadow-[#C5A059]/20 transform -rotate-3">
              <ClipboardList size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <EditorialLabel className="text-[#C5A059]">Ficha Cadastral</EditorialLabel>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Locação Ativa</span>
              </div>
              <h4 className="text-2xl font-black uppercase tracking-tighter text-white">Detalhes da Locação</h4>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white/5 flex items-center justify-center rounded-full hover:bg-white/10 transition-all text-white border border-white/5 relative z-10">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-12 bg-neutral-50/30">
          {/* Top Banner: Countdown */}
          <div className="bg-neutral-900 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl mb-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-20 h-20 bg-[#C5A059]/10 rounded-3xl flex items-center justify-center text-[#C5A059]">
                <Clock size={40} className="animate-pulse" />
              </div>
              <div>
                <p className="text-[#C5A059] text-[10px] uppercase tracking-[0.3em] font-black mb-1">Status do Contrato</p>
                <h2 className="text-5xl font-black text-white tracking-tighter">Faltam {dates.remaining} dias</h2>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2 relative z-10">
              <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest">Devolução Prevista</p>
              <p className="text-2xl font-black text-white">{dates.end}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Coluna Esquerda & Centro: Dados do Condutor e Anexos */}
            <div className="lg:col-span-2 space-y-10">
              {/* Dados do Condutor */}
              <div className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm">
                <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-8 flex items-center gap-2">
                  <User size={14} className="text-[#C5A059]" /> Perfil do Condutor
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-neutral-400">Nome Completo</p>
                      <p className="text-lg font-black text-neutral-900">{rental.user}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-neutral-400">CPF / Documento</p>
                      <p className="text-sm font-black text-neutral-900">{rental.clientCpf || '---'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-neutral-400">Telefone / Whats</p>
                      <p className="text-sm font-black text-neutral-900">{rental.clientPhone || '---'}</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-neutral-400">E-mail</p>
                      <p className="text-sm font-black text-neutral-900">{rental.clientEmail || '---'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-neutral-400">Endereço Residencial</p>
                      <p className="text-sm font-black text-neutral-900 leading-tight">{rental.clientAddress || 'Não cadastrado'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dados da CNH */}
              <div className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm">
                <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-8 flex items-center gap-2">
                  <CreditCard size={14} className="text-[#C5A059]" /> Carteira de Habilitação (CNH)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold text-neutral-400">Número do Registro</p>
                    <p className="text-lg font-black text-neutral-900">{rental.clientCnhNumber || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold text-neutral-400">Data de Validade</p>
                    <p className="text-lg font-black text-neutral-900">{rental.clientCnhExpiry || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold text-neutral-400">Cód. Segurança</p>
                    <p className="text-lg font-black text-neutral-900">{rental.clientCnhSecurityCode || '---'}</p>
                  </div>
                </div>
              </div>

              {/* Galeria de Documentos */}
              <div className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm">
                <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-8 flex items-center gap-2">
                  <Camera size={14} className="text-[#C5A059]" /> Galeria de Documentos
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {rental.clientCnhFile && (
                    <div className="space-y-3">
                      <div className="group relative aspect-video bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
                        <img src={rental.clientCnhFile} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="CNH" />
                        <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                          <div className="flex gap-2">
                            <button onClick={() => setSelectedImage(rental.clientCnhFile)} className="px-3 py-2 bg-white text-neutral-900 text-[8px] font-black uppercase rounded-xl hover:bg-neutral-100 transition-colors">Visualizar</button>
                            <a href={rental.clientCnhFile} download={`CNH_${rental.user.replace(/\s+/g, '_')}.png`} className="w-8 h-8 bg-[#C5A059] text-neutral-950 flex items-center justify-center rounded-xl shadow-lg hover:scale-110 transition-transform">
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] text-center">Carteira CNH</p>
                    </div>
                  )}

                  {rental.clientAddressProofFile && (
                    <div className="space-y-3">
                      <div className="group relative aspect-video bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
                        <img src={rental.clientAddressProofFile} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Residência" />
                        <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                          <div className="flex gap-2">
                            <button onClick={() => setSelectedImage(rental.clientAddressProofFile)} className="px-3 py-2 bg-white text-neutral-900 text-[8px] font-black uppercase rounded-xl hover:bg-neutral-100 transition-colors">Visualizar</button>
                            <a href={rental.clientAddressProofFile} download={`Residencia_${rental.user.replace(/\s+/g, '_')}.png`} className="w-8 h-8 bg-[#C5A059] text-neutral-950 flex items-center justify-center rounded-xl shadow-lg hover:scale-110 transition-transform">
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] text-center">Residência</p>
                    </div>
                  )}

                  {(rental.clientProfileFiles || []).map((file, idx) => (
                    <div key={idx} className="space-y-3">
                      <div className="group relative aspect-video bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
                        <img src={file} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={` Profile ${idx + 1}`} />
                        <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                          <div className="flex gap-2">
                            <button onClick={() => setSelectedImage(file)} className="px-3 py-2 bg-white text-neutral-900 text-[8px] font-black uppercase rounded-xl hover:bg-neutral-100 transition-colors">Visualizar</button>
                            <a href={file} download={`_Profile_${idx + 1}_${rental.user.replace(/\s+/g, '_')}.png`} className="w-8 h-8 bg-[#C5A059] text-neutral-950 flex items-center justify-center rounded-xl shadow-lg hover:scale-110 transition-transform">
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] text-center">Perfil {idx + 1}</p>
                    </div>
                  ))}

                  {!(rental.clientCnhFile || rental.clientAddressProofFile || (rental.clientProfileFiles && rental.clientProfileFiles.length > 0)) && (
                    <div className="col-span-full py-16 text-center bg-neutral-50 rounded-[2.5rem] border-2 border-dashed border-neutral-100">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.3em]">Nenhum documento anexado ao perfil</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Resumo e Ações */}
            <div className="space-y-10">
              {/* Veículo Summary */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-6 flex items-center gap-2">
                  <Car size={14} className="text-[#C5A059]" /> Veículo Alugado
                </h5>
                <div className="space-y-6">
                  <div className="w-full aspect-video rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-100">
                    <img src={rental.image} alt={rental.vehicle} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h6 className="text-xl font-black text-neutral-900 uppercase tracking-tighter leading-tight">{rental.vehicle}</h6>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-900 rounded-lg mt-3">
                      <span className="text-[10px] font-black text-white tracking-widest">{(rental.plate || '').toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Resumo */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm mb-10">
                <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-8 flex items-center gap-2">
                  <Calendar size={14} className="text-[#C5A059]" /> Timeline
                </h5>
                <div className="space-y-8 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-50">
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1.5 w-4 h-4 bg-[#C5A059] rounded-full border-4 border-white shadow-sm" />
                    <p className="text-[8px] uppercase font-bold text-neutral-400">Início da Locação</p>
                    <p className="text-xs font-black text-neutral-900">{dates.start}</p>
                  </div>
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1.5 w-4 h-4 bg-neutral-900 rounded-full border-4 border-white shadow-sm" />
                    <p className="text-[8px] uppercase font-bold text-neutral-400">Devolução Prevista</p>
                    <p className="text-xs font-black text-neutral-900">{dates.end}</p>
                  </div>
                </div>
              </div>

              {/* Financeiro Summary */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-6 flex items-center gap-2">
                  <Landmark size={14} className="text-[#C5A059]" /> Termos Financeiros
                </h5>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[8px] uppercase font-bold text-neutral-400">Caução Total</p>
                      <p className="text-sm font-black text-neutral-900">R$ {rental.depositTotal || rental.deposit || '0,00'}</p>
                    </div>
                    {rental.depositInstallments > 0 && (
                      <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-widest">{rental.depositInstallments}x parcelas</span>
                    )}
                  </div>
                  <div className="flex justify-between items-end pt-4 border-t border-neutral-50">
                    <div>
                      <p className="text-[8px] uppercase font-bold text-neutral-400">Multa / Juros</p>
                      <p className="text-sm font-black text-neutral-900">{rental.lateFeePerc || '10'}% + {rental.dailyInterestPerc || '1'}%/dia</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="space-y-4">
                {rental.contractFile ? (
                  <a
                    href={rental.contractFile}
                    download={rental.contractFileName || `Contrato_${rental.user.replace(/\s+/g, '_')}.pdf`}
                    className="w-full py-6 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-[2rem] hover:bg-[#C5A059] transition-all shadow-xl shadow-neutral-900/10 flex items-center justify-center gap-3 group"
                  >
                    <Download size={18} className="group-hover:-translate-y-1 transition-transform" /> Baixar Contrato
                  </a>
                ) : (
                  <button className="w-full py-6 bg-neutral-100 text-neutral-400 text-[10px] uppercase tracking-[0.3em] font-black rounded-[2rem] flex items-center justify-center gap-3 cursor-not-allowed border border-neutral-200">
                    <AlertTriangle size={18} /> Contrato não Anexado
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalDetailModal;
