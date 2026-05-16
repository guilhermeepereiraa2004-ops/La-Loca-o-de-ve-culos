import React, { useState } from 'react';
import { X, Printer, CheckCircle, FileText, Upload, Loader2, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { compressImage } from '../../../utils/imageCompression';

/* VERSION V04 - CLEANED AND VERIFIED */

const TerminationTermModal = ({ inspection, rental, closureData, onClose, onFinalize }) => {
  const [attachment, setAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState(1);

  if (!inspection || !rental || !closureData) return null;

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setIsUploading(true);
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file);
          setAttachment({ file: compressed, preview: URL.createObjectURL(compressed) });
        } else {
          setAttachment({ file, preview: URL.createObjectURL(file), isPdf: true });
        }
        setStep(3);
      } catch (err) {
        console.error("Erro ao processar arquivo:", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
    setStep(2);
  };

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-0 md:p-8 bg-neutral-950/98 backdrop-blur-2xl">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="bg-white w-full max-w-6xl h-full md:h-auto md:max-h-[95vh] md:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-neutral-900 p-6 md:p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#C5A059] rounded-2xl flex items-center justify-center text-neutral-900 shadow-lg shadow-[#C5A059]/20">
              <FileText size={24} />
            </div>
            <div>
              <h4 className="text-lg font-black uppercase tracking-tighter text-white">Distrato de Contrato</h4>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Encerramento Formal</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${step === 1 ? 'bg-[#C5A059] text-neutral-900' : 'text-neutral-500'}`}>
              <span className="text-[10px] font-black">01</span>
              <span className="hidden md:block text-[9px] font-black uppercase tracking-widest">Imprimir</span>
            </div>
            <div className="w-4 h-px bg-white/10" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${step === 2 ? 'bg-[#C5A059] text-neutral-900' : 'text-neutral-500'}`}>
              <span className="text-[10px] font-black">02</span>
              <span className="hidden md:block text-[9px] font-black uppercase tracking-widest">Anexar</span>
            </div>
            <div className="w-4 h-px bg-white/10" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${step === 3 ? 'bg-[#C5A059] text-neutral-900' : 'text-neutral-500'}`}>
              <span className="text-[10px] font-black">03</span>
              <span className="hidden md:block text-[9px] font-black uppercase tracking-widest">Encerrar</span>
            </div>
          </div>

          <button onClick={onClose} className="absolute top-6 right-6 md:static w-10 h-10 bg-white/5 flex items-center justify-center rounded-full hover:bg-white/10 transition-all text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Action Sidebar */}
          <div className="w-full md:w-80 bg-neutral-50 p-6 md:p-8 border-r border-neutral-100 flex flex-col gap-6 overflow-y-auto">
            <div className="p-5 bg-white rounded-3xl border border-neutral-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3 text-neutral-900">
                <AlertCircle size={16} className="text-[#C5A059]" />
                <p className="text-[10px] font-black uppercase tracking-widest">Obrigatório</p>
              </div>
              <p className="text-[10px] text-neutral-500 font-bold leading-relaxed">
                Gere o PDF, colha a assinatura e anexe a foto para encerrar.
              </p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handlePrint}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${step === 1 ? 'bg-neutral-900 text-white shadow-xl' : 'bg-white text-neutral-400'}`}
              >
                <div className="flex items-center gap-3">
                  <Printer size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">1. Gerar PDF</span>
                </div>
                {step > 1 && <CheckCircle size={16} className="text-emerald-500" />}
              </button>

              <div className={`p-5 rounded-3xl border transition-all ${step === 2 ? 'bg-white border-[#C5A059] shadow-lg' : 'bg-neutral-100/50'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${step >= 2 ? 'bg-[#C5A059] text-neutral-900' : 'bg-neutral-200 text-neutral-400'}`}>
                    {attachment ? <Check size={16} /> : <Upload size={16} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">2. Anexar</span>
                </div>

                {!attachment ? (
                  <label className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${step >= 1 ? 'border-neutral-200 hover:border-[#C5A059] hover:bg-[#C5A059]/5' : 'border-neutral-100 opacity-50'}`}>
                    <Upload size={24} className="text-neutral-300 mb-2" />
                    <span className="text-[8px] font-black uppercase text-neutral-400">Selecionar</span>
                    <input type="file" className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" disabled={step < 1} />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="aspect-video bg-neutral-900 rounded-xl overflow-hidden relative">
                      {attachment.isPdf ? (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                          <FileText size={24} className="text-[#C5A059]" />
                        </div>
                      ) : (
                        <img src={attachment.preview} className="w-full h-full object-cover opacity-60" alt="Preview" />
                      )}
                    </div>
                    <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                      <Check size={10} /> Pronto
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => onFinalize(attachment.file)}
                disabled={!attachment}
                className={`w-full flex items-center justify-center gap-3 p-5 rounded-3xl transition-all shadow-2xl ${attachment ? 'bg-neutral-900 text-[#C5A059] hover:bg-neutral-800' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">3. Encerrar</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-neutral-200/30 p-4 md:p-12 overflow-y-auto">
            <div id="print-term" className="bg-white shadow-2xl mx-auto w-full max-w-[800px] p-8 md:p-16 min-h-[1000px] print:p-0 print:shadow-none">
              <div className="border-b-2 border-neutral-900 pb-10 mb-10 flex justify-between items-end">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">LA Locação</h1>
                <div className="text-right">
                  <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">Termo de Rescisão</h2>
                </div>
              </div>

              <div className="space-y-10 text-neutral-800 text-xs">
                <section className="space-y-4">
                  <p className="font-bold uppercase tracking-widest text-[9px] text-[#C5A059]">I. PARTES</p>
                  <p><strong>Locatário:</strong> {rental.user}</p>
                  <p><strong>Veículo:</strong> {rental.vehicle} ({rental.plate})</p>
                </section>

                <section className="space-y-4">
                  <p className="font-bold uppercase tracking-widest text-[9px] text-[#C5A059]">II. VALORES</p>
                  <div className="bg-neutral-900 text-white p-6 rounded-2xl space-y-2">
                    <div className="flex justify-between"><span>Débitos:</span> <span>R$ {closureData.totalDebts?.toLocaleString('pt-BR')}</span></div>
                    <div className="flex justify-between"><span>Caução:</span> <span>R$ {closureData.caucaoAvailable?.toLocaleString('pt-BR')}</span></div>
                    <div className="flex justify-between font-black text-[#C5A059]"><span>Saldo:</span> <span>R$ {closureData.balance?.toLocaleString('pt-BR')}</span></div>
                  </div>
                </section>

                <p className="pt-20 text-center font-bold">________________________________________________<br/>{rental.user}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #print-term, #print-term * { visibility: visible; }
          #print-term { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
        }
      `}} />
    </div>
  );
};

export default TerminationTermModal;
