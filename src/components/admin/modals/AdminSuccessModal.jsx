import React from 'react';
import { Check, X } from 'lucide-react';

const AdminSuccessModal = ({ data, onClose }) => {
  if (!data.show) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl animate-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <X size={20} />
        </button>
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8">
          <Check size={40} />
        </div>
        <h3 className="text-2xl font-black uppercase tracking-tighter text-neutral-900 mb-4">{data.title}</h3>
        <p className="text-neutral-500 font-light mb-10 leading-relaxed">
          {data.message}
        </p>
        <button 
          onClick={onClose}
          className="w-full py-4 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-[#C5A059] transition-all"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

export default AdminSuccessModal;
