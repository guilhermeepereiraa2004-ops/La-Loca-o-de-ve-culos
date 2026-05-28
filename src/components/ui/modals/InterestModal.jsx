import React, { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { EditorialLabel } from '../EditorialLabel';
import * as rateLimiter from '../../../lib/rateLimiter';

const ACTION = 'interest_form';

const InterestModal = ({ isOpen, onClose, selectedVehicle, interestForm, setInterestForm, onSubmit }) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  // Verifica bloqueio ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    const status = rateLimiter.getStatus(ACTION);
    if (status.isBlocked) {
      const remaining = Math.ceil((status.unblockAt - Date.now()) / 1000);
      setIsBlocked(true);
      setRetryAfterSeconds(remaining);
    }
  }, [isOpen]);

  // Contador regressivo de desbloqueio
  useEffect(() => {
    if (!isBlocked || retryAfterSeconds <= 0) return;
    const timer = setInterval(() => {
      setRetryAfterSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsBlocked(false);
          rateLimiter.reset(ACTION);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isBlocked, retryAfterSeconds]);

  // Formata o tempo restante para exibição
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // ── Rate Limit: verificar antes de enviar ─────────────────────────────────
    const limitCheck = rateLimiter.check(ACTION);
    if (!limitCheck.allowed) {
      setIsBlocked(true);
      setRetryAfterSeconds(limitCheck.retryAfterSeconds || 60);
      return;
    }

    // ── Registra a tentativa e delega ao handler pai ──────────────────────────
    rateLimiter.record(ACTION);
    onSubmit(e);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[3rem] p-10 md:p-12 shadow-2xl animate-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <X size={24} />
        </button>

        <EditorialLabel className="text-[#C5A059] mb-4">Tenho Interesse</EditorialLabel>
        <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-900 mb-2">
          {selectedVehicle?.model}
        </h3>

        {/* Mensagem de bloqueio por spam */}
        {isBlocked ? (
          <div className="mt-6 bg-orange-50 border border-orange-200 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
            <Clock size={32} className="text-orange-400" />
            <div>
              <p className="text-orange-800 font-black text-sm uppercase tracking-widest mb-1">
                Muitos envios recentes
              </p>
              <p className="text-orange-600 text-sm font-light">
                Para evitar spam, aguarde um momento antes de enviar outro formulário.
              </p>
              <p className="text-orange-700 font-bold text-lg mt-3">
                {formatTime(retryAfterSeconds)}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-neutral-500 font-light mb-10">
              Preencha seus dados abaixo e nossa equipe entrará em contato em breve.
            </p>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Seu Nome</label>
                <input
                  type="text"
                  required
                  value={interestForm.name}
                  onChange={e => setInterestForm({...interestForm, name: e.target.value})}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm"
                  placeholder="Nome completo"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Seu Telefone / WhatsApp</label>
                <input
                  type="text"
                  required
                  value={interestForm.phone}
                  onChange={e => setInterestForm({...interestForm, phone: e.target.value})}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm"
                  placeholder="(79) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Seu E-mail</label>
                <input
                  type="email"
                  required
                  value={interestForm.email}
                  onChange={e => setInterestForm({...interestForm, email: e.target.value})}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm"
                  placeholder="exemplo@email.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Observação (Opcional)</label>
                <textarea
                  value={interestForm.observation}
                  onChange={e => setInterestForm({...interestForm, observation: e.target.value})}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light text-sm resize-none"
                  rows="3"
                  placeholder="Alguma dúvida ou horário de preferência?"
                />
              </div>

              <button
                type="submit"
                className="w-full py-5 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-[#C5A059] transition-all shadow-xl mt-4"
              >
                Enviar Interesse
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default InterestModal;
