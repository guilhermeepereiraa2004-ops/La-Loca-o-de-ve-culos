import React from 'react';
import { Check, AlertTriangle, Info, XCircle } from 'lucide-react';

const GlobalAlertModal = ({ isOpen, title, message, type = 'success', onClose }) => {
  if (!isOpen) return null;

  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <Check size={40} />,
          bg: 'bg-emerald-50',
          color: 'text-emerald-500',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700',
        };
      case 'error':
        return {
          icon: <XCircle size={40} />,
          bg: 'bg-red-50',
          color: 'text-red-500',
          btnBg: 'bg-red-600 hover:bg-red-700',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={40} />,
          bg: 'bg-amber-50',
          color: 'text-amber-500',
          btnBg: 'bg-amber-600 hover:bg-amber-700',
        };
      default:
        return {
          icon: <Info size={40} />,
          bg: 'bg-blue-50',
          color: 'text-blue-500',
          btnBg: 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  const config = getConfig();

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className={`w-20 h-20 ${config.bg} ${config.color} rounded-full flex items-center justify-center mx-auto mb-6`}>
          {config.icon}
        </div>
        <h3 className="text-xl font-black uppercase tracking-tighter text-neutral-900 mb-3">{title || 'Aviso'}</h3>
        <p className="text-sm text-neutral-600 font-medium mb-8 leading-relaxed">
          {message}
        </p>
        <button 
          onClick={onClose}
          className={`w-full py-3.5 text-white text-[10px] uppercase tracking-[0.2em] font-black rounded-xl transition-all shadow-sm ${config.btnBg}`}
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

export default GlobalAlertModal;
