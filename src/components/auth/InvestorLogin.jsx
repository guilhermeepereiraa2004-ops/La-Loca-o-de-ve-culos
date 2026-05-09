import React from 'react';
import { X } from 'lucide-react';
import { EditorialLabel } from '../ui/EditorialLabel';

const InvestorLogin = ({ onLoginSuccess, onBack }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-24 bg-neutral-50 order-2 md:order-1">
        <div className="w-full max-w-md space-y-12">
          <button onClick={onBack} className="text-[10px] uppercase tracking-widest font-black flex items-center gap-2 text-neutral-400 hover:text-neutral-900 transition-colors">
            <X size={14} /> Voltar ao Início
          </button>

          <div className="space-y-4">
            <h1 className="text-5xl font-black uppercase tracking-tighter text-neutral-900">Acesso.</h1>
            <p className="text-neutral-500 font-light text-lg">Gerencie seus ativos e acompanhe seus rendimentos em tempo real.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 ml-1">E-mail de Acesso</label>
              <input type="email" placeholder="investidor@exemplo.com" className="w-full bg-white border border-neutral-200 p-6 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 ml-1">Sua Senha</label>
              <input type="password" placeholder="••••••••" className="w-full bg-white border border-neutral-200 p-6 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" />
            </div>
            <button
              onClick={onLoginSuccess}
              className="w-full bg-neutral-950 text-white py-6 rounded-2xl text-xs uppercase tracking-[0.4em] font-black hover:bg-[#C5A059] transition-all shadow-xl shadow-neutral-900/10"
            >
              Entrar no Portal
            </button>
          </div>

          <p className="text-center text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
            Esqueceu sua senha? <span className="text-[#C5A059] cursor-pointer hover:underline">Recuperar</span>
          </p>
        </div>
      </div>

      <div className="w-full md:w-2/5 bg-neutral-900 relative overflow-hidden h-[30vh] md:h-screen order-1 md:order-2">
        <img
          src="/investidor.jpg"
          alt="Portal do Investidor"
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent" />
        <div className="absolute bottom-12 left-12">
          <EditorialLabel className="text-[#C5A059] mb-4">P a r t n e r</EditorialLabel>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">
            Portal do <br />
            <span className="text-[#C5A059]">Investidor.</span>
          </h2>
        </div>
      </div>
    </div>
  );
};

export default InvestorLogin;
