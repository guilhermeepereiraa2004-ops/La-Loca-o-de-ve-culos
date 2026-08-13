import React, { useState } from 'react';
import { Wrench, ArrowRight, Lock } from 'lucide-react';

const OficinaLogin = ({ onLoginSuccess, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'oficina123' || password === '123456') {
      onLoginSuccess();
    } else {
      setError('Senha incorreta.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-8 left-8">
        <button onClick={onBack} className="text-neutral-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          ← Voltar
        </button>
      </div>

      <div className="w-full max-w-md bg-neutral-900 rounded-[2.5rem] p-10 md:p-12 border border-neutral-800 shadow-2xl relative z-10">
        <div className="w-20 h-20 bg-neutral-950 border border-neutral-800 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
          <Wrench size={32} className="text-[#C5A059]" />
        </div>
        
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Oficina</h2>
        <p className="text-sm font-medium text-neutral-500 mb-10">Acesso exclusivo para mecânicos e equipe técnica.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="text-red-500 text-sm font-bold text-center bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</p>}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Senha de Acesso</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input 
                type="password" 
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••" 
                className="w-full bg-neutral-950 border border-neutral-800 text-white p-4 pl-12 rounded-2xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-bold text-sm transition-all"
              />
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-[#C5A059] text-neutral-950 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#b08d4b] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(197,160,89,0.2)]">
            Acessar Sistema <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default OficinaLogin;
