import React, { useState, useEffect } from 'react';
import { ChevronRight, Mail, Star } from 'lucide-react';
import { EditorialLabel } from '../ui/EditorialLabel';

const AdminLogin = ({ onBack, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email === 'Laveiculos@gmail.com' && password === '123456') {
      onLoginSuccess();
    } else {
      setError('Credenciais inválidas. Verifique seu e-mail e senha.');
    }
  };

  useEffect(() => {
    const savedAuth = localStorage.getItem('la_admin_auth');
    if (savedAuth === 'true') {
      onLoginSuccess();
    }
  }, [onLoginSuccess]);

  return (
    <div className="min-h-screen bg-white flex overflow-hidden">
      {/* Seção de Formulário */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-24 lg:px-32 py-12 relative bg-white">
        <button
          onClick={onBack}
          className="absolute top-10 left-10 text-[9px] uppercase tracking-[0.3em] font-bold text-neutral-400 hover:text-neutral-900 transition-all flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-full border border-neutral-100 flex items-center justify-center group-hover:border-neutral-900 transition-colors">
            <ChevronRight className="rotate-180" size={14} />
          </div>
          Voltar ao site
        </button>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-12">
            <EditorialLabel className="text-[#C5A059] mb-4">Acesso Restrito</EditorialLabel>
            <h2 className="text-5xl font-black uppercase tracking-tighter leading-none mb-4">Admin.</h2>
            <p className="text-neutral-400 font-light text-sm">Insira suas credenciais para gerenciar a plataforma.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 border-l-2 border-red-500 p-4 text-red-600 text-[10px] uppercase tracking-widest font-bold">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold ml-1 flex justify-between">
                Email
                <Mail size={12} className="text-neutral-300" />
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-50 border-b border-neutral-200 p-4 focus:border-[#C5A059] outline-none transition-all placeholder:text-neutral-300 font-light text-sm"
                placeholder="Laveiculos@gmail.com"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold ml-1 flex justify-between">
                Senha
                <Star size={12} className="text-neutral-300" />
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-50 border-b border-neutral-200 p-4 focus:border-[#C5A059] outline-none transition-all placeholder:text-neutral-300 font-light text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-6 bg-neutral-900 text-white font-black uppercase tracking-[0.5em] text-[10px] hover:bg-[#C5A059] transition-all shadow-2xl hover:shadow-[#C5A059]/20"
            >
              Entrar no Sistema
            </button>
          </form>

          <div className="mt-16 text-center">
            <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
              Tecnologia: <span className="text-neutral-900 font-bold">GRUPO SANTANA</span>
            </p>
          </div>
        </div>
      </div>

      {/* Seção de Imagem - Menos que a metade da largura (38%) */}
      <div className="hidden lg:block lg:w-[38%] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-bg-new.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-neutral-950/40 to-transparent" />
        <div className="absolute inset-0 bg-neutral-900/10 backdrop-grayscale-[0.2]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center p-16 text-center">
          <div className="mb-8">
            <img src="/logo.png" alt="LA" className="h-20 w-auto brightness-0 invert opacity-90 mx-auto" />
          </div>
          <div className="w-12 h-[1px] bg-[#C5A059] mb-8" />
          <p className="text-white/70 text-[9px] uppercase tracking-[0.5em] leading-relaxed">
            Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
