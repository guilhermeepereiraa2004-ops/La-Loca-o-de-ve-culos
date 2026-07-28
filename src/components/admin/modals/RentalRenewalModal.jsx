import React, { useState, useMemo } from 'react';
import { X, Calendar, RefreshCw, ArrowRight, User, Car, Clock, ShieldCheck } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';

const RentalRenewalModal = ({ rental, onClose, onConfirm }) => {
  const [additionalWeeks, setAdditionalWeeks] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dates = useMemo(() => {
    if (!rental) return { currentEnd: '---', newEnd: '---', currentWeeks: 0, newWeeks: 0 };
    const startStr = rental.startDate || rental.date;
    if (!startStr) return { currentEnd: '---', newEnd: '---', currentWeeks: 0, newWeeks: 0 };

    try {
      const startDate = new Date(startStr + 'T12:00:00');
      const currentWeeks = parseInt(rental.durationWeeks || rental.period || 4);
      
      const currentEnd = new Date(startDate.getTime());
      currentEnd.setDate(startDate.getDate() + currentWeeks * 7);

      const totalWeeks = currentWeeks + parseInt(additionalWeeks || 0);
      const newEnd = new Date(startDate.getTime());
      newEnd.setDate(startDate.getDate() + totalWeeks * 7);

      return {
        currentEnd: currentEnd.toLocaleDateString('pt-BR'),
        newEnd: newEnd.toLocaleDateString('pt-BR'),
        currentWeeks,
        newWeeks: totalWeeks
      };
    } catch (e) {
      return { currentEnd: '---', newEnd: '---', currentWeeks: 0, newWeeks: 0 };
    }
  }, [rental, additionalWeeks]);

  if (!rental) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(rental.id, additionalWeeks);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/98 backdrop-blur-md" onClick={onClose} />

      <div className="bg-[#0a0a0a] w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="p-10 border-b border-neutral-800 flex justify-between items-center bg-[#0a0a0a] shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[#D4AF37] rounded-2xl flex items-center justify-center text-neutral-950 shadow-2xl shadow-[#D4AF37]/30 transform -rotate-3">
              <RefreshCw size={28} />
            </div>
            <div>
              <EditorialLabel className="text-[#D4AF37] mb-1">Ajuste de Vigência</EditorialLabel>
              <h4 className="text-3xl font-black uppercase tracking-tighter text-white">Renovar Contrato</h4>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-black flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all text-neutral-400">
            <X size={24} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-10">
          {/* Card Resumo */}
          <div className="bg-neutral-900 p-8 rounded-2xl text-white border border-neutral-800 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl" />
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User size={16} className="text-[#D4AF37]" />
                  <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Condutor</span>
                </div>
                <h5 className="text-xl font-black uppercase tracking-tight">{rental.user || rental.userName}</h5>
              </div>
              <div className="space-y-4 text-right">
                <div className="flex items-center gap-3 justify-end">
                  <Car size={16} className="text-[#D4AF37]" />
                  <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Veículo</span>
                </div>
                <h5 className="text-xl font-black uppercase tracking-tight">{rental.vehicle || rental.vehicleModel}</h5>
                <span className="inline-block px-3 py-1 bg-white/10 text-white rounded text-[10px] font-black uppercase tracking-widest mt-1">
                  {rental.plate || rental.vehiclePlate}
                </span>
              </div>
            </div>
          </div>

          {/* Seletor de Semanas */}
          <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1 block">Renovar por mais:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <select
                value={additionalWeeks}
                onChange={(e) => setAdditionalWeeks(parseInt(e.target.value))}
                className="w-full bg-black border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-bold text-white cursor-pointer text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 24].map((w) => (
                  <option key={w} value={w}>
                    {w} {w === 1 ? 'Semana' : 'Semanas'} ({w * 7} dias)
                  </option>
                ))}
              </select>
              <div className="text-neutral-400 text-xs font-medium uppercase tracking-wider pl-2 flex items-center gap-2">
                <Clock size={16} className="text-[#D4AF37]" />
                O fluxo financeiro e as cobranças continuarão normalmente.
              </div>
            </div>
          </div>

          {/* Comparativo de Datas */}
          <div className="bg-black rounded-3xl border border-neutral-800 p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-center sm:text-left">
            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black">Data de Término Atual</p>
              <h6 className="text-lg font-black text-neutral-300">{dates.currentEnd}</h6>
              <span className="inline-block text-[9px] font-bold text-neutral-400 uppercase">{dates.currentWeeks} semanas totais</span>
            </div>

            <div className="flex justify-center text-[#D4AF37] shrink-0">
              <ArrowRight size={24} className="transform rotate-90 sm:rotate-0" />
            </div>

            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black">Nova Data de Término</p>
              <h6 className="text-2xl font-black text-emerald-600">{dates.newEnd}</h6>
              <span className="inline-block text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase">
                {dates.newWeeks} semanas totais
              </span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-10 border-t border-neutral-50 bg-black/30 flex justify-end gap-6 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 hover:text-white transition-all"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-16 py-5 bg-neutral-900 text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-[#D4AF37] hover:text-white transition-all shadow-2xl flex items-center gap-3 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : 'Confirmar Renovação'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RentalRenewalModal;
