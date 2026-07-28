import React, { useState } from 'react';
import { X, SendHorizonal, CheckCircle2, Copy, AlertTriangle, Loader2 } from 'lucide-react';
import {
  registerPayout,
  hasPayoutForMonth,
  getCurrentReferenceMonth,
  formatReferenceMonth,
} from '../../../utils/investorPayouts.js';

/**
 * Modal para registrar um repasse a um investidor.
 * Confirma o valor, a chave Pix e grava no histórico do Supabase.
 */
const InvestorPayoutModal = ({ investor, amount, referenceMonth, onClose, onSuccess }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);
  const [copied, setCopied] = useState(false);

  const refMonth = referenceMonth || getCurrentReferenceMonth();
  const pixKey = investor?.pix || '—';

  const handleCopyPix = () => {
    if (investor?.pix) {
      navigator.clipboard.writeText(investor.pix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Verifica duplicata antes de gravar
      if (!confirmedDuplicate) {
        const isDuplicate = await hasPayoutForMonth(investor.id, refMonth);
        if (isDuplicate) {
          setDuplicateWarning(true);
          setLoading(false);
          return;
        }
      }

      await registerPayout({
        investorId: investor.id,
        investorName: investor.name,
        amount,
        referenceMonth: refMonth,
        pixKey: investor.pix,
        notes,
      });

      setDone(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('[InvestorPayoutModal] Erro ao registrar repasse:', err);
      alert(`Erro ao registrar repasse: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-neutral-900 p-8 relative">
          <button onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
            <X size={15} className="text-white" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#C5A059] rounded-2xl flex items-center justify-center text-neutral-900 font-black text-2xl shadow-lg shadow-[#C5A059]/30">
              {investor?.name?.charAt(0) || 'I'}
            </div>
            <div>
              <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest">Registrar Repasse</p>
              <h4 className="text-xl font-black text-white tracking-tight leading-tight">{investor?.name}</h4>
              <p className="text-[9px] text-[#C5A059] font-black uppercase tracking-widest mt-0.5">
                Referência: {formatReferenceMonth(refMonth)}
              </p>
            </div>
          </div>
        </div>

        {done ? (
          /* Tela de sucesso */
          <div className="p-12 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h5 className="text-xl font-black text-neutral-900 tracking-tight">Repasse Registrado!</h5>
            <p className="text-sm text-neutral-400 font-medium">
              O repasse de <strong>R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> foi
              registrado no histórico de <strong>{investor?.name}</strong>.
            </p>
          </div>
        ) : (
          <div className="p-8 space-y-6">
            {/* Valor do repasse */}
            <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Valor do Repasse</p>
              <p className="text-3xl font-black text-neutral-900 tracking-tighter">
                <span className="text-lg text-[#C5A059] mr-1">R$</span>
                {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest mt-1">
                Calculado automaticamente pelo sistema
              </p>
            </div>

            {/* Chave Pix */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">Chave Pix</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-neutral-50 border border-neutral-100 rounded-2xl px-4 py-3">
                  <p className="text-sm font-black text-[#C5A059] break-all">{pixKey}</p>
                </div>
                {investor?.pix && (
                  <button onClick={handleCopyPix}
                    className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center hover:bg-[#C5A059] transition-colors shrink-0">
                    {copied
                      ? <CheckCircle2 size={15} className="text-white" />
                      : <Copy size={15} className="text-white" />}
                  </button>
                )}
              </div>
              <p className="text-[8px] text-neutral-400 font-bold mt-1 ml-1">
                Copie e faça o Pix manualmente no seu banco.
              </p>
            </div>

            {/* Observações */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                Observações <span className="text-neutral-300 normal-case font-normal">(opcional)</span>
              </p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Repasse via Pix Bradesco, comprovante enviado por email..."
                rows={3}
                className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#C5A059]/20 resize-none transition-all"
              />
            </div>

            {/* Alerta de duplicata */}
            {duplicateWarning && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Repasse já registrado!</p>
                  <p className="text-xs text-amber-600 font-medium mt-0.5">
                    Já existe um repasse para <strong>{formatReferenceMonth(refMonth)}</strong>.
                    Deseja registrar mesmo assim?
                  </p>
                  <button
                    onClick={() => { setConfirmedDuplicate(true); setDuplicateWarning(false); }}
                    className="mt-2 text-[9px] font-black text-amber-700 underline uppercase tracking-widest">
                    Sim, registrar mesmo assim
                  </button>
                </div>
              </div>
            )}

            {/* Botão confirmar */}
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full py-5 bg-[#C5A059] text-neutral-900 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-neutral-900 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Registrando...</>
                : <><SendHorizonal size={14} /> Confirmar Repasse Realizado</>}
            </button>

            <p className="text-[9px] text-neutral-400 text-center font-bold uppercase tracking-widest">
              O repasse em si é feito manualmente via Pix no seu banco.
              Este botão apenas registra no histórico do sistema.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestorPayoutModal;
