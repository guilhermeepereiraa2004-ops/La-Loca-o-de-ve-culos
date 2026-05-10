import React from 'react';
import { X, Wallet } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';

const FinanceFormModal = ({ 
  isOpen, onClose, financeForm, setFinanceForm, vehicles, onSubmit 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[3rem] p-10 md:p-12 shadow-2xl animate-in zoom-in duration-300">
        <button onClick={onClose} className="absolute top-8 right-8 text-neutral-400 hover:text-neutral-900 transition-colors">
          <X size={24} />
        </button>
        <EditorialLabel className="text-[#C5A059] mb-4">Lançamento Avulso</EditorialLabel>
        <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-900 mb-8">Nova Transação</h3>
        
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Data</label>
              <input type="date" required value={financeForm.date} onChange={e => setFinanceForm({...financeForm, date: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Tipo</label>
              <select value={financeForm.type} onChange={e => setFinanceForm({...financeForm, type: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm">
                <option value="in">Entrada (+)</option>
                <option value="out">Saída (-)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor (R$)</label>
            <input 
              type="text" 
              required 
              value={financeForm.val} 
              onChange={e => {
                let v = e.target.value.replace(/\D/g, '');
                v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                setFinanceForm({...financeForm, val: v});
              }} 
              className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-xl text-neutral-900" 
              placeholder="0,00" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Descrição</label>
            <input type="text" required value={financeForm.desc} onChange={e => setFinanceForm({...financeForm, desc: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="Ex: Lavagem completa Porsche" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Categoria</label>
              <select value={financeForm.cat} onChange={e => setFinanceForm({...financeForm, cat: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm">
                <option value="Aluguel">Aluguel</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Multas">Multas</option>
                <option value="Seguro">Seguro</option>
                <option value="Taxa Pneus">Taxa Pneus</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Placa (Opcional)</label>
              <select value={financeForm.vehiclePlate} onChange={e => setFinanceForm({...financeForm, vehiclePlate: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm">
                <option value="">Nenhuma</option>
                {vehicles.map(v => <option key={v.id} value={v.plate}>{v.plate} ({v.model})</option>)}
              </select>
            </div>
          </div>

          <button type="submit" className="w-full py-5 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-[#C5A059] transition-all shadow-xl mt-4">
            Registrar Lançamento
          </button>
        </form>
      </div>
    </div>
  );
};

export default FinanceFormModal;
