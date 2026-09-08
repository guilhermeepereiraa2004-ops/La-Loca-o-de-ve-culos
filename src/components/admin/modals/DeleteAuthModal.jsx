import React, { useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Modal de autenticação para exclusão.
 * 
 * O estado `password` vive AQUI (não no AdminDashboard), 
 * para que cada keystroke NÃO cause re-render do dashboard inteiro.
 */
const DeleteAuthModal = React.memo(({ onConfirm, onClose }) => {
  const [password, setPassword] = useState('');

  const handleConfirm = useCallback(() => {
    onConfirm(password);
    setPassword('');
  }, [password, onConfirm]);

  return (
    <div className="fixed inset-0 flex items-center justify-center px-6" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-10 text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-black uppercase tracking-tight text-neutral-900 mb-2">Ação Restrita</h3>
        <p className="text-neutral-500 text-xs font-light mb-8">Esta operação requer a Senha Master para confirmar a exclusão permanente.</p>
        <input 
          type="password" 
          autoFocus
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
          className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-bold text-center mb-6"
          placeholder="••••••••"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 text-[10px] uppercase tracking-widest font-black text-neutral-400 hover:text-neutral-600 transition-colors">Cancelar</button>
          <button onClick={handleConfirm} className="flex-1 py-4 bg-red-500 text-white text-[10px] uppercase tracking-widest font-black rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">Confirmar</button>
        </div>
      </div>
    </div>
  );
});

DeleteAuthModal.displayName = 'DeleteAuthModal';

export default DeleteAuthModal;
