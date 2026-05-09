import React from 'react';
import { FileCheck } from 'lucide-react';

const RentalSuccessModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/98 backdrop-blur-xl" onClick={onClose} />
      <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden text-center">
        <div className="bg-neutral-900 p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#C5A059]/10" />
          <div className="w-24 h-24 bg-[#C5A059] rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-[#C5A059]/30 relative z-10 animate-bounce">
            <FileCheck size={48} className="text-neutral-950" />
          </div>
          <h3 className="text-3xl font-black text-white uppercase tracking-tighter relative z-10">Contrato Criado!</h3>
          <p className="text-neutral-400 text-[10px] uppercase tracking-[0.3em] font-bold mt-3 relative z-10">Locação Registrada com Sucesso</p>
        </div>
        <div className="p-10">
          <p className="text-neutral-500 font-light mb-10 leading-relaxed text-sm">O contrato de locação foi gerado e o veículo está marcado como alugado na frota.</p>
          <button onClick={onClose} className="w-full py-6 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-[2rem] hover:bg-[#C5A059] transition-all shadow-xl">
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default RentalSuccessModal;
