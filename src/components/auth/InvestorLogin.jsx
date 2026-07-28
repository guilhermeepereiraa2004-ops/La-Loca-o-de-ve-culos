import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Clock } from 'lucide-react';
import { EditorialLabel } from '../ui/EditorialLabel';
import * as rateLimiter from '../../lib/rateLimiter';

const ACTION = 'investor_login';

const InvestorLogin = ({ onLoginSuccess, onBack, investors = [] }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  // Verifica bloqueio ao montar o componente
  useEffect(() => {
    const status = rateLimiter.getStatus(ACTION);
    if (status.isBlocked) {
      const remaining = Math.ceil((status.unblockAt - Date.now()) / 1000);
      setIsBlocked(true);
      setRetryAfterSeconds(remaining);
    }
  }, []);

  // Contador regressivo de desbloqueio
  useEffect(() => {
    if (!isBlocked || retryAfterSeconds <= 0) return;
    const timer = setInterval(() => {
      setRetryAfterSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsBlocked(false);
          setError('');
          rateLimiter.reset(ACTION);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isBlocked, retryAfterSeconds]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    // ── Rate Limit: verificar antes de processar ──────────────────────────────
    const limitCheck = rateLimiter.check(ACTION);
    if (!limitCheck.allowed) {
      setIsBlocked(true);
      setRetryAfterSeconds(limitCheck.retryAfterSeconds || 60);
      setError(limitCheck.reason);
      return;
    }

    // ── Tentativa de login ────────────────────────────────────────────────────
    const found = investors.find(i => {
      const emailMatch = i.email?.toLowerCase().trim() === email.toLowerCase().trim();
      let pwdMatch = false;
      if (i.password) {
        pwdMatch = i.password === password;
      } else {
        // Fallback for seed data where password might be null in DB
        if (i.email === 'ricardo@email.com') {
          pwdMatch = password === 'invest123';
        } else if (i.email === 'guilherme@email.com') {
          pwdMatch = password === 'invest456';
        } else {
          pwdMatch = !password;
        }
      }
      return emailMatch && pwdMatch;
    });

    if (found) {
      rateLimiter.reset(ACTION); // Reseta contador em caso de sucesso
      onLoginSuccess(found);
      return;
    }

    // ── Falha: registra tentativa ─────────────────────────────────────────────
    rateLimiter.record(ACTION);
    const statusAfter = rateLimiter.getStatus(ACTION);
    const remaining = statusAfter.maxAttempts - statusAfter.currentAttempts;

    // Mensagem genérica intencional — não revela se o e-mail existe (evita enumeração)
    if (remaining > 0) {
      setError(
        `Credenciais inválidas. Verifique seu e-mail e senha. ` +
        `(${remaining} tentativa${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''})`
      );
    } else {
      const nextCheck = rateLimiter.check(ACTION);
      setIsBlocked(true);
      setRetryAfterSeconds(nextCheck.retryAfterSeconds || 60);
      setError(nextCheck.reason);
    }
  };

  // Formata o tempo restante para exibição
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-24 bg-[#0a0a0a] order-2 md:order-1">
        <div className="w-full max-w-md space-y-12">
          <button onClick={onBack} className="text-[10px] uppercase tracking-widest font-black flex items-center gap-2 text-neutral-500 hover:text-white transition-colors">
            <X size={14} /> Voltar ao Início
          </button>

          <div className="space-y-4">
            <h1 className="text-5xl font-black uppercase tracking-tighter text-white">Acesso.</h1>
            <p className="text-neutral-500 font-light text-lg">Gerencie seus ativos e acompanhe seus rendimentos em tempo real.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mensagem de bloqueio */}
            {isBlocked && (
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-xl flex items-start gap-3">
                <ShieldAlert size={18} className="text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-orange-800 text-[10px] uppercase tracking-widest font-black mb-1">
                    Acesso temporariamente bloqueado
                  </p>
                  <p className="text-orange-600 text-xs font-light">
                    Muitas tentativas inválidas detectadas. Por segurança, o acesso foi bloqueado.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Clock size={12} className="text-orange-500" />
                    <span className="text-orange-700 text-[11px] font-bold">
                      Tente novamente em {formatTime(retryAfterSeconds)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mensagem de erro (sem bloqueio) */}
            {error && !isBlocked && (
              <div className="bg-red-50 border-l-2 border-red-500 p-4 text-red-600 text-[10px] uppercase tracking-widest font-bold">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 ml-1">E-mail de Acesso</label>
              <input
                type="email"
                placeholder="investidor@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-white p-6 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-light text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={isBlocked}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 ml-1">Sua Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-white p-6 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-light text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={isBlocked}
              />
            </div>
            <button
              type="submit"
              disabled={isBlocked}
              className="w-full bg-neutral-800 text-white py-6 border border-neutral-700 rounded-2xl text-xs uppercase tracking-[0.4em] font-black hover:bg-[#D4AF37] transition-all shadow-xl shadow-neutral-900/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-950"
            >
              {isBlocked ? `Bloqueado — ${formatTime(retryAfterSeconds)}` : 'Entrar no Portal'}
            </button>
          </form>

          <p className="text-center text-[10px] uppercase tracking-widest text-neutral-500 font-bold">
            Esqueceu sua senha? <span className="text-[#D4AF37] cursor-pointer hover:underline">Recuperar</span>
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
          <EditorialLabel className="text-[#D4AF37] mb-4">P a r t n e r</EditorialLabel>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">
            Portal do <br />
            <span className="text-[#D4AF37]">Investidor.</span>
          </h2>
        </div>
      </div>
    </div>
  );
};

export default InvestorLogin;
