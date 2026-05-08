import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ArrowDown, ArrowDownLeft, ArrowUpRight, Instagram, Facebook, MapPin, Phone, Mail, Menu, X, ShieldCheck, Car, Star, Wrench, TrendingUp, Wallet, AlertTriangle, Calendar, ClipboardList, Plus, Camera, Search, Tag, Key, FileText, User, Users, Landmark, CreditCard, Eye, Pencil, Trash2, Check, Download, FileCheck, Power, PowerOff, Clock } from 'lucide-react';

// Custom Hook para Fade-in-up suave usando Intersection Observer
const useScrollReveal = () => {
  const formatPhone = (value) => {
    if (!value) return value;
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const [revealed, setRevealed] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setRevealed(true);
        }
      });
    }, { threshold: 0.1 });

    const current = domRef.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  return [domRef, revealed];
};

// Componente de Seção com Fade-in-up
const RevealSection = ({ children, className = "" }) => {
  const [ref, revealed] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        } ${className}`}
    >
      {children}
    </div>
  );
};

// Componente de Rótulo Editorial (Small font, wide tracking)
const EditorialLabel = ({ children, className = "" }) => (
  <span className={`text-[10px] uppercase tracking-[0.5em] font-medium text-neutral-400 mb-8 block ${className}`}>
    {children}
  </span>
);

// Componente de Login Administrativo
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

const InvestorDashboard = ({ transactions = [], onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [maintenanceFilter, setMaintenanceFilter] = useState('todos');

  // Calcular despesas reais do investidor a partir das transações
  const realInvestorExpenses = transactions
    .filter(t => t.responsible === 'Investidor' && t.type === 'out')
    .reduce((acc, t) => acc + Math.abs(t.val), 0);

  // Dados simulados do Investidor (Ricardo Santana)
  const myVehicles = [
    {
      id: 1,
      model: 'Porsche 911 Carrera',
      plate: 'LA-9110',
      year: '2023/2023',
      investValue: 850000,
      adminTax: '15%',
      currentYield: 3500,
      totalYield: 24500,
      yieldPerc: '0.41%',
      status: 'alugado',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=200'
    },
    {
      id: 2,
      model: 'Audi RS6 Avant',
      plate: 'LA-0066',
      year: '2022/2023',
      investValue: 720000,
      adminTax: '12%',
      currentYield: 4200,
      totalYield: 29400,
      yieldPerc: '0.58%',
      status: 'manutenção',
      image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=200'
    },
    {
      id: 3,
      model: 'Mercedes-Benz C300',
      plate: 'LA-3030',
      year: '2024/2024',
      investValue: 350000,
      adminTax: '15%',
      currentYield: 0,
      totalYield: 0,
      yieldPerc: '0.00%',
      status: 'disponível',
      image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=200'
    },
  ];

  const maintenanceHistory = [
    { id: 1, vehicle: 'Porsche 911 Carrera', plate: 'LA-9110', type: 'Revisão Preventiva', date: '2024-04-12', cost: 'R$ 1.250,00', status: 'Concluído', icon: <ShieldCheck size={16} /> },
    { id: 2, vehicle: 'Audi RS6 Avant', plate: 'LA-0066', type: 'Troca de Pneus', date: '2024-05-01', cost: 'R$ 4.800,00', status: 'Em Aberto', icon: <Car size={16} /> },
    { id: 3, vehicle: 'Porsche 911 Carrera', plate: 'LA-9110', type: 'Troca de Óleo e Filtros', date: '2024-03-15', cost: 'R$ 850,00', status: 'Concluído', icon: <Wrench size={16} /> },
    { id: 4, vehicle: 'Mercedes-Benz C300', plate: 'LA-3030', type: 'Higienização Detalhada', date: '2024-05-04', cost: 'R$ 450,00', status: 'Concluído', icon: <Star size={16} /> },
  ];

  const dividendHistory = [
    {
      id: 1,
      period: 'Maio 2024',
      gross: 12500,
      adminTax: 1875,
      discounts: {
        maintenance: 450 + realInvestorExpenses, // Soma despesas reais aqui
        insurance: 39.90,
        protection: 120
      },
      status: 'pendente',
      date: '10/06/2024'
    },
    {
      id: 2,
      period: 'Abril 2024',
      gross: 11800,
      adminTax: 1770,
      discounts: {
        maintenance: 1250,
        insurance: 39.90,
        protection: 120
      },
      status: 'pago',
      date: '10/05/2024'
    }
  ];

  const filteredMaintenances = maintenanceHistory.filter(m =>
    maintenanceFilter === 'todos' || m.vehicle === maintenanceFilter
  );

  const totalInvested = myVehicles.reduce((acc, v) => acc + v.investValue, 0);
  const currentMonthDividends = myVehicles.reduce((acc, v) => acc + v.currentYield, 0);
  const yearDividends = myVehicles.reduce((acc, v) => acc + v.totalYield, 0);
  const avgYield = '0.52%';

  const getFifthBusinessDay = (date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    let count = 0;
    let day = 1;
    while (count < 5) {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
      if (count < 5) day++;
    }
    return new Date(year, month, day);
  };

  const nextPaymentDate = getFifthBusinessDay(new Date(new Date().getFullYear(), new Date().getMonth() + 1));

  const getStatusBadge = (status) => {
    switch (status) {
      case 'alugado': return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full">Alugado</span>;
      case 'manutenção': return <span className="px-3 py-1 bg-orange-50 text-orange-600 text-[9px] font-black uppercase tracking-widest rounded-full">Manutenção</span>;
      case 'disponível': return <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-full">Disponível</span>;
      default: return null;
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-close sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex font-sans relative">
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-6 left-6 z-[60] xl:hidden bg-neutral-950 text-white p-3 rounded-2xl shadow-2xl border border-neutral-800"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`bg-neutral-950 text-white flex flex-col p-8 fixed h-full z-50 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-0 opacity-0 xl:w-20 xl:translate-x-0 xl:opacity-100'}`}>
        <div className={`mb-16 transition-opacity duration-300 ${!isSidebarOpen ? 'xl:opacity-0' : 'opacity-100'}`}>
          <EditorialLabel className="text-[#C5A059] mb-2">I n v e s t o r</EditorialLabel>
          <p className="text-xl font-black uppercase tracking-tighter">Portal LA</p>
        </div>

        <nav className="flex-1 space-y-4">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'minha-frota', label: 'Meus Veículos', icon: Car },
            { id: 'manutencao', label: 'Manutenções', icon: Wrench },
            { id: 'pagamentos', label: 'Dividendos', icon: Wallet },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1280) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-[#C5A059] text-neutral-950 font-black' : 'text-neutral-500 hover:text-white hover:bg-neutral-900'
                }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-neutral-950' : 'group-hover:text-[#C5A059]'} />
              <span className={`text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={onLogout}
          className="flex items-center gap-4 p-4 text-neutral-500 hover:text-red-400 transition-colors mt-auto"
        >
          <X size={20} />
          <span className={`text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>Sair do Portal</span>
        </button>
      </aside>

      {/* Sidebar Overlay for mobile */}
      {isSidebarOpen && window.innerWidth < 1280 && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 xl:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-500 ${isSidebarOpen ? 'xl:ml-72' : 'xl:ml-20'} p-6 md:p-12 overflow-x-hidden`}>
        <div className="max-w-[1600px] mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
            <div>
              <EditorialLabel className="text-[#C5A059] mb-2">Bem-vindo de volta,</EditorialLabel>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-neutral-900">Ricardo Santana</h2>
            </div>
            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Total de Ativos</p>
                <p className="text-xl md:text-2xl font-black text-neutral-900">{myVehicles.length} Veículos</p>
              </div>
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white border border-neutral-100 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-sm">
                <Car size={24} className="text-[#C5A059]" />
              </div>
            </div>
          </header>

          {activeTab === 'dashboard' && (
            <div className="space-y-12">
              {/* Payment Schedule Banner */}
              <div className="bg-neutral-900 rounded-[2.5rem] p-10 mb-10 relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-[#C5A059]/10 to-transparent" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-[#C5A059] rounded-3xl flex items-center justify-center text-neutral-950 shadow-2xl shadow-[#C5A059]/30 transform -rotate-3 group-hover:rotate-0 transition-transform">
                      <Calendar size={40} />
                    </div>
                    <div>
                      <EditorialLabel className="text-[#C5A059] mb-2">Cronograma de Repasse</EditorialLabel>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                        Próximo Pagamento: <span className="text-[#C5A059]">{nextPaymentDate.toLocaleDateString('pt-BR')}</span>
                      </h2>
                      <p className="text-neutral-400 text-xs mt-3 font-medium uppercase tracking-[0.2em]">
                        Regra: 5º Dia Útil de cada mês — Processamento Automático
                      </p>
                    </div>
                  </div>
                  <div className="hidden lg:block h-16 w-[1px] bg-white/10" />
                  <div className="text-center md:text-right">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Status do Ciclo</p>
                    <div className="flex items-center gap-2 justify-center md:justify-end">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm font-black text-white uppercase tracking-widest">Aguardando Fechamento</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Top Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm group hover:shadow-xl transition-all">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-4">Valor Total Investido</p>
                  <p className="text-2xl font-black text-neutral-900">R$ {totalInvested.toLocaleString('pt-BR')}</p>
                  <div className="mt-4 h-1 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C5A059] w-3/4" />
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm group hover:shadow-xl transition-all">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-4">Dividendos (Mês Atual)</p>
                  <p className="text-2xl font-black text-emerald-600">R$ {currentMonthDividends.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mt-2 flex items-center gap-1">
                    <TrendingUp size={10} /> +12% vs mês ant.
                  </p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm group hover:shadow-xl transition-all">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-4">Acumulado no Ano</p>
                  <p className="text-2xl font-black text-neutral-900">R$ {yearDividends.toLocaleString('pt-BR')}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#C5A059]" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Ano Fiscal 2026</span>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm group hover:shadow-xl transition-all">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-4">Rendimento Médio</p>
                  <p className="text-2xl font-black text-[#C5A059]">{avgYield}</p>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mt-2">Mensal (Real)</p>
                </div>
              </div>

              {/* Graphs Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="md:col-span-2 bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Dividendos Mês a Mês</h3>
                    <EditorialLabel className="text-neutral-300">Rendimentos em R$</EditorialLabel>
                  </div>
                  <div className="h-64 flex items-end justify-between gap-4 px-4">
                    {[
                      { m: 'Jan', v: 45 }, { m: 'Fev', v: 52 }, { m: 'Mar', v: 48 },
                      { m: 'Abr', v: 61 }, { m: 'Mai', v: 75 }, { m: 'Jun', v: 0 }
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                        <div className="w-full relative flex items-end justify-center">
                          <div
                            style={{ height: `${bar.v}%` }}
                            className={`w-full max-w-[40px] rounded-t-xl transition-all duration-1000 ${bar.v > 0 ? 'bg-neutral-900 group-hover:bg-[#C5A059]' : 'bg-neutral-50 h-2'}`}
                          />
                          {bar.v > 0 && (
                            <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black">
                              {bar.v}%
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-black text-neutral-400">{bar.m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Yield per Vehicle Summary */}
                <div className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm">
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-10">Rendimento por Veículo</h3>
                  <div className="space-y-8">
                    {myVehicles.filter(v => v.currentYield > 0).map((v) => (
                      <div key={v.id} className="flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                          <img src={v.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt={v.model} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase tracking-tight text-neutral-900">{v.model}</p>
                          <div className="flex justify-between items-end">
                            <p className="text-sm font-bold text-[#C5A059]">R$ {v.currentYield.toLocaleString('pt-BR')}</p>
                            <p className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold">{v.yieldPerc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-10 py-4 border border-neutral-100 rounded-xl text-[9px] uppercase tracking-widest font-black text-neutral-400 hover:bg-neutral-950 hover:text-white hover:border-neutral-950 transition-all">
                    Ver Relatório Completo
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'minha-frota' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {myVehicles.map((v, idx) => (
                <div key={idx} className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row gap-10">
                    <div className="w-full md:w-48 h-48 rounded-3xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700 shadow-lg">
                      <img src={v.image} className="w-full h-full object-cover" alt={v.model} />
                    </div>
                    <div className="flex-1 space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-2xl font-black uppercase tracking-tighter text-neutral-900">{v.model}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="px-2 py-0.5 bg-neutral-900 text-white text-[9px] font-black rounded uppercase">{v.plate}</span>
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{v.year}</span>
                          </div>
                        </div>
                        {getStatusBadge(v.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-y-6 gap-x-8 pt-4">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Valor Investido</p>
                          <p className="text-sm font-black text-neutral-900">R$ {v.investValue.toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Taxa de Adm.</p>
                          <p className="text-sm font-black text-[#C5A059]">{v.adminTax}</p>
                        </div>
                        <div className="col-span-2 p-4 bg-neutral-50 rounded-2xl flex justify-between items-center border border-neutral-100">
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Rendimento Mensal</p>
                            <p className="text-lg font-black text-[#C5A059]">R$ {v.currentYield.toLocaleString('pt-BR')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Performance</p>
                            <p className="text-sm font-black text-emerald-500">{v.yieldPerc}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-neutral-50">
                    <button className="text-[9px] uppercase tracking-widest font-black text-neutral-400 hover:text-neutral-900 transition-colors">Histórico de Repasses</button>
                    <button className="px-6 py-3 bg-neutral-950 text-white text-[9px] uppercase tracking-widest font-black rounded-xl hover:bg-[#C5A059] transition-all">Ver Detalhes Técnicos</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'manutencao' && (
            <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-8 items-end justify-between bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Filtrar por Veículo</label>
                    <select
                      value={maintenanceFilter}
                      onChange={(e) => setMaintenanceFilter(e.target.value)}
                      className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 earance-none cursor-pointer"
                    >
                      <option value="todos">Todos os Veículos</option>
                      {myVehicles.map(v => (
                        <option key={v.id} value={v.model}>{v.model} ({v.plate})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Período</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="date" className="bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 text-xs" />
                      <input type="date" className="bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 text-xs" />
                    </div>
                  </div>
                </div>
                <button className="px-10 py-5 bg-neutral-950 text-white text-[10px] uppercase tracking-widest font-black rounded-2xl hover:bg-[#C5A059] transition-all flex items-center gap-3">
                  <Search size={14} /> Aplicar Filtros
                </button>
              </div>

              {/* List */}
              <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-100">
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Serviço / Data</th>
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Veículo</th>
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400 text-right">Custo</th>
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Status</th>
                        <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {filteredMaintenances.map((m) => (
                        <tr key={m.id} className="group hover:bg-neutral-50/50 transition-colors">
                          <td className="px-10 py-8">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-neutral-950 text-[#C5A059] rounded-xl flex items-center justify-center shadow-lg">
                                {m.icon}
                              </div>
                              <div>
                                <p className="text-sm font-black text-neutral-900">{m.type}</p>
                                <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">{new Date(m.date).toLocaleDateString('pt-BR')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-8">
                            <p className="text-xs font-bold text-neutral-900">{m.vehicle}</p>
                            <p className="text-[9px] uppercase tracking-widest text-[#C5A059] font-black">{m.plate}</p>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <p className="text-sm font-black text-neutral-900">{m.cost}</p>
                          </td>
                          <td className="px-10 py-8">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${m.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="px-10 py-8">
                            <button className="text-[10px] uppercase tracking-widest font-black text-neutral-400 hover:text-neutral-900 transition-colors underline">Ver Comprovante</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pagamentos' && (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-700">
              <div className="grid grid-cols-1 gap-8">
                {dividendHistory.map((d) => {
                  const totalDiscounts = d.discounts.maintenance + d.discounts.insurance + d.discounts.protection;
                  const netValue = d.gross - d.adminTax - totalDiscounts;

                  return (
                    <div key={d.id} className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
                      <div className="p-10 md:w-1/3 bg-neutral-50 border-r border-neutral-100 flex flex-col justify-between">
                        <div>
                          <EditorialLabel className="text-neutral-400 mb-2">Período de Referência</EditorialLabel>
                          <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">{d.period}</h3>
                          <div className="mt-4">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${d.status === 'pago' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {d.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-12 space-y-4">
                          <div className="flex justify-between items-end">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Data do Repasse</p>
                            <p className="text-sm font-black text-neutral-900">{d.date}</p>
                          </div>
                          <div className="h-[1px] bg-neutral-200" />
                          <div className="flex justify-between items-end">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Valor Líquido</p>
                            <p className="text-3xl font-black text-[#C5A059]">R$ {netValue.toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 p-10 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                          <div className="space-y-6">
                            <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-neutral-300 border-b pb-2">Composição de Receita</h4>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-neutral-500 font-medium">Valor Bruto (Aluguéis)</span>
                              <span className="font-black text-neutral-900">R$ {d.gross.toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-red-500">
                              <span className="font-medium">Taxa Adm. (Gestão)</span>
                              <span className="font-black">- R$ {d.adminTax.toLocaleString('pt-BR')}</span>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-neutral-300 border-b pb-2">Retenções e Descontos</h4>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-500">Manutenção Corretiva</span>
                                <span className="font-bold text-red-400">- R$ {d.discounts.maintenance.toLocaleString('pt-BR')}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-500">Seguro Franquia (Fixo)</span>
                                <span className="font-bold text-red-400">- R$ {d.discounts.insurance.toLocaleString('pt-BR')}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-500">Proteção Veicular</span>
                                <span className="font-bold text-red-400">- R$ {d.discounts.protection.toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-neutral-950 p-8 rounded-[2rem] text-white">
                          <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-[#C5A059] mb-6 flex items-center gap-2">
                            <FileText size={14} /> 📎 Documentos e Anexos Vinculados
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {['Nota Fiscal', 'Recibo Repasse', 'Ordem Serviço', 'Docs Veículo'].map(doc => (
                              <button key={doc} className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-[#C5A059] transition-all text-left group">
                                <p className="text-[9px] uppercase tracking-widest text-neutral-500 group-hover:text-[#C5A059] transition-colors">{doc}</p>
                                <p className="text-[10px] font-bold mt-1 text-white">Download PDF</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const AdminDashboard = ({
  leads, rentals, investors, vehicles, transactions, onAddTransaction,
  onUpdateStatus, onAddRental, onDeleteRental, onUpdateRental,

  onAddInvestor, onUpdateInvestor, onDeleteInvestor,
  onAddVehicle, onUpdateVehicle, onDeleteVehicle,
  onLogout, onGoHome, onViewVehicleDetail
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const fileInputRef = useRef(null);
  const crlvInputRef = useRef(null);
  const cnhInputRef = useRef(null);
  const addressProofInputRef = useRef(null);
  const ProfileInputRef = useRef(null);

  // Auto-close sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeTab, setActiveTab] = useState('bi');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [investorSearch, setInvestorSearch] = useState('');
  const [showInvestorDropdown, setShowInvestorDropdown] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showVehicleDetailModal, setShowVehicleDetailModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    model: '',
    plate: '',
    year: '',
    renavam: '',
    initialKm: '',
    fipeValue: '',
    investor: '',
    adminTax: '15',
    protectionPaidByAdmin: false,
    protectionValue: '',
    franchiseInsurance: false,
    hasSpareKey: false,
    lastBeltChangeKm: '',
    beltChangeIntervalKm: '',
    image: '',
    dividend: '',
    weeklyRental: '',
    investmentValue: '',
    preventiveMaintenance: false,
    crlvFile: null
    ,
    entryDate: new Date().toISOString().split('T')[0]
  });

  const resetVehicleForm = () => {
    setVehicleForm({
      model: '',
      plate: '',
      year: '',
      renavam: '',
      initialKm: '',
      fipeValue: '',
      investor: '',
      adminTax: '15',
      protectionPaidByAdmin: false,
      protectionValue: '',
      franchiseInsurance: false,
      hasSpareKey: false,
      lastBeltChangeKm: '',
      beltChangeIntervalKm: '',
      image: '',
      dividend: '',
      weeklyRental: '',
      investmentValue: '',
      preventiveMaintenance: false,
      crlvFile: null
    });
  };

  const handleSaveVehicle = (e) => {
    e.preventDefault();
    if (isEditing && selectedVehicle) {
      onUpdateVehicle({ ...selectedVehicle, ...vehicleForm });
    } else {
      onAddVehicle(vehicleForm);
    }
    setShowAddForm(false);
    resetVehicleForm();
    setIsEditing(false);
  };

  const [showDeleteAuthModal, setShowDeleteAuthModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'investor' | 'vehicle'
  const [masterPassword, setMasterPassword] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('todos');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('Todos');
  const [rentalFilter, setRentalFilter] = useState('ativas');
  const [financeFilter, setFinanceFilter] = useState('Todos');
  const [showFinanceForm, setShowFinanceForm] = useState(false);
  const [financeForm, setFinanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'in',
    val: '',
    desc: '',
    cat: 'Aluguel',
    vehiclePlate: '',
    responsible: 'Administradora'
  });

  const resetFinanceForm = () => {
    setFinanceForm({
      date: new Date().toISOString().split('T')[0],
      type: 'in',
      val: '',
      desc: '',
      cat: 'Aluguel',
      vehiclePlate: '',
      responsible: 'Administradora'
    });
  };

  const handleSaveTransaction = (e) => {
    e.preventDefault();
    onAddTransaction({
      ...financeForm,
      val: parseFloat(financeForm.val.replace(',', '.')) * (financeForm.type === 'out' ? -1 : 1),
      status: 'Concluído'
    });
    setShowFinanceForm(false);
    resetFinanceForm();
    setShowAdminSuccess({
      show: true,
      title: 'Lançamento Realizado',
      message: 'A transação foi registrada com sucesso no fluxo financeiro.'
    });
  };
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [maintenanceVehicleFilter, setMaintenanceVehicleFilter] = useState('Todos');
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [newMaintenance, setNewMaintenance] = useState({
    vehicle: '',
    plate: '',
    type: '',
    date: new Date().toISOString().split('T')[0],
    km: '',
    cost: '',
    workshop: '',
    observations: '',
    responsible: 'Administradora',
    status: 'Concluído'
  });

  const getFifthBusinessDay = (date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    let count = 0;
    let day = 1;
    while (count < 5) {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
      if (count < 5) day++;
    }
    return new Date(year, month, day);
  };

  const nextPaymentDate = getFifthBusinessDay(new Date(new Date().getFullYear(), new Date().getMonth() + 1));

  const [rentalStep, setRentalStep] = useState(1);
  const [rentalFormData, setRentalFormData] = useState({
    rentalType: 'weekly',
    vehicleId: '',
    vehicleModel: '',
    vehiclePlate: '',
    weeklyRate: 0,
    clientName: '',
    clientCpf: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    clientCnhNumber: '',
    clientCnhExpiry: '',
    clientCnhSecurityCode: '',
    clientCnhFile: null,
    clientAddressProofFile: null,
    clientProfileFiles: [],
    weeks: 1,
    tyreTax: '25,00',
    depositTotal: '0,00',
    depositReceived: '0,00',
    depositInstallments: 0,
    lateFeePerc: '10',
    dailyInterestPerc: '1',
    startDate: new Date().toISOString().split('T')[0],
    paymentDay: '',
    contractFile: null

  });

  const [showRentalDetailModal, setShowRentalDetailModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [isEditingRental, setIsEditingRental] = useState(false);
  const [showRentalSuccess, setShowRentalSuccess] = useState(false);
  const [showAlert, setShowAlert] = useState({ show: false, message: '' });
  const [showAdminSuccess, setShowAdminSuccess] = useState({ show: false, title: '', message: '' });

  const getDayOfWeek = (dateString) => {
    if (!dateString) return '---';
    // Adicionamos T12:00:00 para evitar problemas de fuso horário na conversão
    const date = new Date(dateString + 'T12:00:00');
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[date.getDay()];
  };

  const resetRentalForm = () => {
    setRentalStep(1);
    setRentalFormData({
      rentalType: 'weekly',
      vehicleId: '',
      vehicleModel: '',
      vehiclePlate: '',
      weeklyRate: 0,
      clientName: '',
      clientCpf: '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: '',
      clientCnhNumber: '',
      clientCnhExpiry: '',
      clientCnhSecurityCode: '',
      clientCnhFile: null,
      clientAddressProofFile: null,
      clientProfileFiles: [],
      weeks: 1,
      tyreTax: '25,00',
      depositTotal: '0,00',
      depositReceived: '0,00',
      depositInstallments: 0,
      lateFeePerc: '10',
      dailyInterestPerc: '1',
      startDate: new Date().toISOString().split('T')[0],
      contractFile: null
    });
  };

  const exportLeadsToExcel = () => {
    const headers = ["Data", "Tipo", "Nome", "Whats", "E-mail", "Veículo", "Placa", "Status", "Mensagem"];

    const csvContent = [
      headers.join(";"),
      ...leads.map(lead => [
        new Date(lead.date).toLocaleDateString('pt-BR'),
        lead.type === 'locacao' ? 'Locação' : 'Contato',
        lead.name,
        lead.contact,
        lead.email || 'N/A',
        lead.vehicleModel || 'N/A',
        lead.vehiclePlate || 'N/A',
        lead.status.toUpperCase(),
        `"${(lead.message || '').replace(/"/g, '""')}"`
      ].join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Leads_LA_Locacao_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.endChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportContractToWord = () => {
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Contrato de Locação</title></head>
      <body>
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 18pt; font-family: Arial, sans-serif; text-transform: uppercase;">Contrato de Locação de Veículo</h1>
          <p style="font-size: 10pt; font-family: Arial, sans-serif; color: #666;">LA Locação de Veículos — Aracaju/SE</p>
        </div>
        
        <p style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin-bottom: 20px;">
          <strong>Pelo presente instrumento particular, de um lado:</strong><br />
          <strong>LOCADORA:</strong> LA LOCAÇÃO DE VEÍCULOS, com sede em Aracaju - SE.<br />
          <strong>LOCATÁRIO:</strong> ${rentalFormData.clientName || '________________________________'}, CPF: ${rentalFormData.clientCpf || '__________________'}, residente e domiciliado conforme cadastro.
        </p>

        <p style="font-family: Arial, sans-serif; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Cláusula 1ª - Do Objeto</p>
        <p style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin-bottom: 20px;">
          O objeto deste contrato é a locação do veículo ${rentalFormData.vehicleModel || '________________'} de placa ${rentalFormData.vehiclePlate || '________'}, pelo período de ${rentalFormData.weeks} semanas.
        </p>

        <p style="font-family: Arial, sans-serif; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Cláusula 2ª - Do Pagamento</p>
        <p style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin-bottom: 20px;">
          O LOCATÁRIO pagará à LOCADORA o valor semanal de R$ ${rentalFormData.weeklyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, totalizando R$ ${(rentalFormData.weeklyRate * rentalFormData.weeks).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pelo período contratado, acrescido da taxa de pneus de R$ ${rentalFormData.tyreTax}.
        </p>

        <p style="font-family: Arial, sans-serif; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Cláusula 3ª - Do Caução</p>
        <p style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin-bottom: 20px;">
          No ato da entrega do veículo, o LOCATÁRIO depositará o valor de R$ ${rentalFormData.deposit} a título de caução, para garantia de eventuais danos ou multas.
        </p>

        <p style="font-family: Arial, sans-serif; font-size: 10pt; font-weight: bold; text-transform: uppercase;">Cláusula 4ª - Das Obrigações</p>
        <p style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin-bottom: 40px;">
          O LOCATÁRIO obriga-se a manter o veículo em perfeito estado de conservação, respeitando as leis de trânsito e realizando o pagamento das multas que ocorrerem durante o período da locação.
        </p>

        <div style="text-align: center; margin-top: 60px; font-family: Arial, sans-serif; font-size: 11pt;">
          <table style="width: 100%; text-align: center; border: none;">
            <tr>
              <td style="width: 50%; padding: 20px;">
                <p>____________________________________________________</p>
                <p style="text-transform: uppercase; font-weight: bold; color: #666; font-size: 10pt;">LA Locação de Veículos</p>
                <p style="font-size: 9pt; color: #999;">LOCADORA</p>
              </td>
              <td style="width: 50%; padding: 20px;">
                <p>____________________________________________________</p>
                <p style="text-transform: uppercase; font-weight: bold; color: #666; font-size: 10pt;">${rentalFormData.clientName || 'Locatário'}</p>
                <p style="font-size: 9pt; color: #999;">LOCATÁRIO(A) / CPF: ${rentalFormData.clientCpf || '___.___.___-__'}</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'lication/vnd.ms-word;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Contrato_Locacao_${(rentalFormData.clientName || 'Cliente').replace(/\s+/g, '_')}.doc`;
    document.body.endChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = (leads || []).filter(lead => {
    const name = lead.name || '';
    const matchesSearch = name.toLowerCase().includes((leadSearch || '').toLowerCase());
    const matchesStatus = leadStatusFilter === 'todos' || lead.status === leadStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: 'Veículos Ativos', value: '18', icon: <Car size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Em Manutenção', value: '06', icon: <Wrench size={20} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Faturamento Mensal', value: 'R$ 42.800', icon: <TrendingUp size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total de Caução', value: `R$ ${rentals.reduce((acc, r) => acc + (parseFloat(String(r.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <Landmark size={20} />, color: 'text-[#C5A059]', bg: 'bg-[#C5A059]/10' },
  ];

  const alerts = [
    { title: 'CNH próxima do vencimento', count: 3, type: 'warning', icon: <Calendar size={16} /> },
    { title: 'Vistorias pendentes', count: 5, type: 'critical', icon: <ClipboardList size={16} /> },
    { title: 'Manutenção preventiva', count: 2, type: 'info', icon: <Wrench size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex animate-in fade-in duration-500 relative">
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-6 right-6 z-[60] xl:hidden bg-neutral-900 text-[#C5A059] p-4 rounded-full shadow-2xl border border-neutral-800"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`bg-neutral-900 text-white flex flex-col fixed h-full z-50 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 opacity-0 xl:w-20 xl:translate-x-0 xl:opacity-100'}`}>
        <div className={`p-8 border-b border-neutral-800 transition-opacity duration-300 ${!isSidebarOpen ? 'xl:opacity-0' : 'opacity-100'}`}>
          <img src="/logo.png" alt="LA" className="h-10 brightness-0 invert" />
        </div>
        <nav className="flex-1 p-6 space-y-4">
          <div className={`text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-4 transition-opacity duration-300 ${!isSidebarOpen ? 'xl:opacity-0' : 'opacity-100'}`}>Gerenciamento</div>
          {[
            { id: 'bi', label: 'Business Inteligence', icon: TrendingUp },
            { id: 'frota', label: 'Frota', icon: Car },
            { id: 'leads', label: 'Leads', icon: Mail },
            { id: 'locacao', label: 'Locação', icon: Key },
            { id: 'investidores', label: 'Investidores', icon: Users },
            { id: 'financeiro', label: 'Financeiro', icon: Wallet },
            { id: 'caucao', label: 'Caução', icon: Landmark },
            { id: 'manutencaoAdmin', label: 'Manutenção', icon: Wrench },

          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === 'locacao') resetRentalForm();
                if (window.innerWidth < 1280) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 text-sm font-medium p-3 rounded-xl transition-all ${activeTab === item.id ? 'text-[#C5A059] bg-[#C5A059]/10 shadow-sm' : 'text-neutral-400 hover:text-white'}`}
              title={item.label}
            >
              <item.icon size={16} />
              <span className={`transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-neutral-800 space-y-2">
          <button
            onClick={onGoHome}
            className="flex items-center gap-3 text-sm font-medium text-neutral-400 hover:text-white transition-colors w-full p-3 group"
          >
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#C5A059]/20 group-hover:text-[#C5A059] transition-all">
              <Eye size={14} />
            </div>
            <span className={`transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>Página Inicial</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-3 text-sm font-medium text-red-400 hover:text-red-300 transition-colors w-full p-3 group"
          >
            <div className="w-8 h-8 rounded-full bg-red-400/10 flex items-center justify-center group-hover:bg-red-400/20 transition-all">
              <X size={14} />
            </div>
            <span className={`transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>Sair</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Overlay for mobile */}
      {isSidebarOpen && window.innerWidth < 1280 && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 xl:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-500 ${isSidebarOpen ? 'xl:ml-64' : 'xl:ml-20'}`}>
        <header className="h-20 bg-white border-b border-neutral-100 flex items-center justify-between px-6 md:px-12 shadow-sm relative z-10 shrink-0">
          <div className="flex items-center gap-4">
            {/* Logo on small screens when sidebar is closed */}
            {!isSidebarOpen && (
              <div className="xl:hidden">
                <img src="/logo.png" alt="LA" className="h-6" />
              </div>
            )}
            <h2 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-neutral-400 truncate max-w-[150px] md:max-w-none">
              {activeTab === 'bi' ? 'Business Inteligence' :
                activeTab === 'frota' ? 'Gestão de Frota' :
                  activeTab === 'leads' ? 'Leads de Contato' :
                    activeTab === 'locacao' ? 'Contratos de Locação' :
                      activeTab === 'investidores' ? 'Cadastro de Investidores' :
                        activeTab === 'financeiro' ? 'Controle Financeiro' :
                          activeTab === 'caucao' ? 'Gestão de Caução' :
                            activeTab === 'manutencaoAdmin' ? 'Histórico de Manutenções' : 'Painel LA'}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-900">Admin Principal</p>
              <p className="text-[10px] text-neutral-400 font-light">Laveiculos@gmail.com</p>
            </div>
            <div className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-[#C5A059]/30">
              LA
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12">
          <div className="max-w-[1600px] mx-auto">
            {activeTab === 'bi' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                  {stats.map((stat) => (
                    <div key={stat.label} className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm hover:border-[#C5A059]/30 transition-all group">
                      <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                        {stat.icon}
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold mb-2">{stat.label}</p>
                      <p className="text-3xl font-black text-neutral-900">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Alerts & Notifications */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-neutral-50 flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                        <AlertTriangle size={18} className="text-red-500" />
                        Alertas Prioritários
                      </h3>
                      <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                        {alerts.reduce((acc, curr) => acc + curr.count, 0)} Pendências
                      </span>
                    </div>
                    <div className="divide-y divide-neutral-50">
                      {alerts.map((alert) => (
                        <div key={alert.title} className="p-6 flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alert.type === 'critical' ? 'bg-red-50 text-red-500' :
                                alert.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                              }`}>
                              {alert.icon}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-neutral-800">{alert.title}</p>
                              <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-medium">Revisão necessária</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-sm font-black ${alert.type === 'critical' ? 'text-red-600' :
                                alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                              }`}>
                              {alert.count}
                            </span>
                            <ChevronRight size={16} className="text-neutral-200 group-hover:text-neutral-400 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions / Summary */}
                  <div className="bg-neutral-900 rounded-3xl p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-sm font-black uppercase tracking-widest mb-8 text-[#C5A059]">Resumo Operacional</h3>
                      <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                          <p className="text-neutral-400 text-xs uppercase tracking-widest">Utilização da Frota</p>
                          <p className="text-2xl font-black">75%</p>
                        </div>
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                          <p className="text-neutral-400 text-xs uppercase tracking-widest">Margem Líquida</p>
                          <p className="text-2xl font-black text-emerald-400">22%</p>
                        </div>
                      </div>
                      <button className="w-full mt-12 py-4 bg-[#C5A059] text-neutral-900 font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all">
                        Gerar Relatório Completo
                      </button>
                    </div>
                    <div className="absolute -bottom-10 -right-10 opacity-10 transform rotate-12">
                      <TrendingUp size={200} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'financeiro' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-700">
                {/* Financial Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-4 flex items-center gap-2">
                      <ArrowDownLeft size={14} className="text-emerald-500" /> Total de Entradas
                    </p>
                    <p className="text-4xl font-black text-neutral-900">
                      R$ {transactions.filter(t => t.type === 'in').reduce((acc, t) => acc + t.val, 0).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[10px] text-neutral-300 font-bold mt-4 uppercase tracking-widest">Baseado em lançamentos reais</p>
                  </div>
                  <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-4 flex items-center gap-2">
                      <ArrowUpRight size={14} className="text-red-500" /> Total de Saídas
                    </p>
                    <p className="text-4xl font-black text-neutral-900">
                      R$ {Math.abs(transactions.filter(t => t.type === 'out').reduce((acc, t) => acc + t.val, 0)).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[10px] text-neutral-300 font-bold mt-4 uppercase tracking-widest">Fluxo de despesas atual</p>
                  </div>
                  <div className="bg-neutral-950 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-4">Saldo em Caixa (Net)</p>
                      <p className="text-4xl font-black text-[#C5A059]">
                        R$ {transactions.reduce((acc, t) => acc + t.val, 0).toLocaleString('pt-BR')}
                      </p>
                      <div className="mt-6 flex gap-2">
                        <span className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-[9px] font-black uppercase tracking-widest text-neutral-400">Ano Fiscal 2024</span>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Wallet size={80} />
                    </div>
                  </div>
                </div>

                {/* Transactions Header */}
                <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-2xl border border-neutral-100 flex gap-1">
                      {['Todos', 'Entradas', 'Saídas'].map(f => (
                        <button
                          key={f}
                          onClick={() => setFinanceFilter(f)}
                          className={`px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${financeFilter === f ? 'bg-neutral-950 text-white' : 'text-neutral-400 hover:text-neutral-900'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFinanceForm(true)}
                    className="px-8 py-5 bg-[#C5A059] text-neutral-950 text-[10px] uppercase tracking-widest font-black rounded-2xl hover:bg-neutral-950 hover:text-white transition-all flex items-center gap-3"
                  >
                    <Plus size={16} /> Novo Lançamento
                  </button>
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-100">
                          <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Descrição / Data</th>
                          <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Categoria</th>
                          <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Método</th>
                          <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400 text-right">Valor</th>
                          <th className="px-10 py-8 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-10 py-20 text-center">
                              <div className="flex flex-col items-center gap-4 text-neutral-300">
                                <button
                                  onClick={() => setShowFinanceForm(true)}
                                  className="text-[9px] text-[#C5A059] font-black uppercase underline tracking-widest hover:text-neutral-900 transition-colors"
                                >
                                  Iniciar Fluxo de Caixa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          transactions
                            .filter(t => financeFilter === 'Todos' || (financeFilter === 'Entradas' && t.type === 'in') || (financeFilter === 'Saídas' && t.type === 'out'))
                            .map((t, i) => (
                              <tr key={i} className="group hover:bg-neutral-50/50 transition-colors">
                                <td className="px-10 py-8">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                      {t.type === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-neutral-900">{t.desc}</p>
                                      <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-10 py-8">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-50 px-3 py-1 rounded-full">{t.cat}</span>
                                </td>
                                <td className="px-10 py-8">
                                  <p className="text-xs font-bold text-neutral-900">{t.vehiclePlate || 'N/A'}</p>
                                  <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black">{t.responsible}</p>
                                </td>
                                <td className="px-10 py-8 text-right">
                                  <p className={`text-sm font-black ${t.type === 'in' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                                    {t.type === 'in' ? '+' : '-'} R$ {Math.abs(t.val).toLocaleString('pt-BR')}
                                  </p>
                                </td>
                                <td className="px-10 py-8">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${t.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {t.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modal de Novo Lançamento Financeiro */}
                {showFinanceForm && (
                  <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-xl" onClick={() => setShowFinanceForm(false)} />
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col">
                      <div className="p-10 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059] shadow-lg">
                            <Plus size={24} />
                          </div>
                          <div>
                            <EditorialLabel className="text-[#C5A059] mb-1">Fluxo de Caixa</EditorialLabel>
                            <h4 className="text-lg font-black uppercase tracking-tighter text-neutral-900">Novo Lançamento</h4>
                          </div>
                        </div>
                        <button onClick={() => setShowFinanceForm(false)} className="w-12 h-12 bg-white flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all shadow-sm">
                          <X size={20} />
                        </button>
                      </div>

                      <form onSubmit={handleSaveTransaction} className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Data</label>
                            <input
                              type="date"
                              required
                              value={financeForm.date}
                              onChange={e => setFinanceForm({ ...financeForm, date: e.target.value })}
                              className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Tipo</label>
                            <select
                              value={financeForm.type}
                              onChange={e => setFinanceForm({ ...financeForm, type: e.target.value })}
                              className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 earance-none cursor-pointer"
                            >
                              <option value="in">Entrada (+)</option>
                              <option value="out">Saída (-)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor (R$)</label>
                            <input
                              type="text"
                              required
                              placeholder="0,00"
                              value={financeForm.val}
                              onChange={e => setFinanceForm({ ...financeForm, val: e.target.value })}
                              className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-[#C5A059] text-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Categoria</label>
                            <select
                              value={financeForm.cat}
                              onChange={e => setFinanceForm({ ...financeForm, cat: e.target.value })}
                              className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 earance-none cursor-pointer"
                            >
                              <option value="Aluguel">Aluguel</option>
                              <option value="manutenção">Manutenção</option>
                              <option value="taxa ADM">Taxa ADM</option>
                              <option value="proteção veicular">Proteção Veicular</option>
                              <option value="multa">Multa</option>
                              <option value="juros">Juros</option>
                              <option value="taxa de pneus">Taxa de Pneus</option>
                              <option value="Outros">Outros</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Descrição Detalhada</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Pagamento semanal André Matos"
                            value={financeForm.desc}
                            onChange={e => setFinanceForm({ ...financeForm, desc: e.target.value })}
                            className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Veículo (Opcional)</label>
                            <select
                              value={financeForm.vehiclePlate}
                              onChange={e => setFinanceForm({ ...financeForm, vehiclePlate: e.target.value })}
                              className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 earance-none cursor-pointer"
                            >
                              <option value="">Nenhum</option>
                              {vehicles.map(v => (
                                <option key={v.id} value={v.plate}>{v.model} ({v.plate})</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Responsável</label>
                            <select
                              value={financeForm.responsible}
                              onChange={e => setFinanceForm({ ...financeForm, responsible: e.target.value })}
                              className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-neutral-900 earance-none cursor-pointer"
                            >
                              <option value="Administradora">Administradora</option>
                              <option value="Investidor">Investidor</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-6">
                          <button type="submit" className="w-full py-6 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.4em] font-black hover:bg-[#C5A059] transition-all rounded-2xl shadow-xl">
                            Confirmar Lançamento
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'caucao' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-700">
                {/* Caução Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-4 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-500" /> Caução em Custódia
                    </p>
                    <p className="text-4xl font-black text-neutral-900">
                      R$ {rentals.reduce((acc, r) => acc + (parseFloat(String(r.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-neutral-300 font-bold mt-4 uppercase tracking-widest">Total recebido e disponível</p>
                  </div>

                  <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-4 flex items-center gap-2">
                      <Clock size={14} className="text-amber-500" /> Saldo a Receber (Parcelado)
                    </p>
                    <p className="text-4xl font-black text-neutral-900">
                      R$ {rentals.reduce((acc, r) => {
                        const total = parseFloat(String(r.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0;
                        const received = parseFloat(String(r.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0;
                        return acc + (total - received);
                      }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-neutral-300 font-bold mt-4 uppercase tracking-widest">Expectativa de recebimento</p>
                  </div>

                  <div className="bg-neutral-950 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#C5A059]/10 rounded-full blur-3xl -z-10 group-hover:scale-110 transition-transform" />
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-4">Total Geral Contratado</p>
                    <p className="text-4xl font-black text-[#C5A059]">
                      R$ {rentals.reduce((acc, r) => acc + (parseFloat(String(r.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-6 flex gap-2">
                      <span className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-[9px] font-black uppercase tracking-widest text-[#C5A059]">Garantia Total da Frota</span>
                    </div>
                  </div>
                </div>

                {/* Deposits List */}
                <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden">
                  <div className="p-10 border-b border-neutral-50 bg-neutral-50/30 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                      <h4 className="text-xl font-black uppercase tracking-tighter">Detalhamento por Contrato</h4>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold mt-1">Acompanhamento individual de garantias</p>
                    </div>
                    <div className="relative w-full md:w-72">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                      <input
                        type="text"
                        placeholder="Buscar por condutor ou placa..."
                        className="w-full bg-white border border-neutral-100 py-3 pl-10 pr-4 rounded-xl text-[10px] outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-50/50">
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black">Condutor / Veículo</th>
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Dia Pagamento</th>
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Próxima Parcela</th>
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Caução Total</th>
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Valor Recebido</th>
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Saldo Restante</th>
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Ação</th>
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-right">Status Garantia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {(rentals || []).length > 0 ? (
                          rentals.map((rental) => {
                            const total = parseFloat(String(rental.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0;
                            const received = parseFloat(String(rental.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0;
                            const remaining = total - received;
                            const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                            const start = rental.date ? new Date(rental.date + 'T12:00:00') : null;
                            const payDay = rental.paymentDay || (start ? days[start.getDay()] : '---');
                            const now = new Date();
                            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
                            let currentDue = null;
                            if (start && remaining > 0) {
                              let check = new Date(start.getTime());
                              check.setDate(check.getDate() + 7);
                              while (check.getTime() + (6 * 24 * 60 * 60 * 1000) < today.getTime()) {
                                check.setDate(check.getDate() + 7);
                              }
                              currentDue = check;
                            }

                            const currentDueDateStr = currentDue ? currentDue.toISOString().split('T')[0] : null;
                            const isCurrentPaid = (rental.paidCaucaoDates || []).includes(currentDueDateStr);
                            const nextDueDisplay = currentDue ? currentDue.toLocaleDateString('pt-BR') : 'Liquidado';

                            return (
                              <tr key={rental.id} className="hover:bg-neutral-50/50 transition-all group border-b border-neutral-50 last:border-0">
                                <td className="p-8">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-[#C5A059] font-black text-xs shadow-lg">
                                      {rental.user ? rental.user.charAt(0) : '?'}
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-neutral-900">{rental.user || 'Desconhecido'}</p>
                                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{rental.vehicle || 'S/ veículo'} • {rental.plate || 'S/ placa'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-8 text-center">
                                  <span className="text-[9px] font-black text-neutral-900 uppercase tracking-widest px-3 py-1.5 bg-neutral-100 rounded-lg border border-neutral-200">
                                    {payDay}
                                  </span>
                                </td>
                                <td className="p-8 text-center">
                                  <div className="flex flex-col items-center">
                                    {isCurrentPaid ? (
                                      <div className="flex flex-col items-center">
                                        <p className="text-sm font-black text-neutral-900">{nextDueDisplay}</p>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 mt-1">Parcela Paga</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center">
                                        <p className="text-sm font-black text-neutral-900">{nextDueDisplay}</p>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 mt-1">Pendente</span>
                                      </div>
                                    )}
                                    {remaining > 0 && rental.depositInstallments > 0 && (
                                      <p className="text-[9px] font-bold text-[#C5A059] mt-1 animate-pulse">
                                        R$ {(remaining / rental.depositInstallments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="p-8 text-center font-bold text-neutral-900 text-sm">
                                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-8 text-center font-bold text-emerald-600 text-sm">
                                  R$ {received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-8 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className={`text-sm font-bold ${remaining > 0 ? 'text-amber-600' : 'text-neutral-400'}`}>
                                      R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    {rental.depositInstallments > 0 && remaining > 0 && (
                                      <p className="text-[8px] uppercase font-black text-neutral-300 mt-1">{rental.depositInstallments}x parcelas restantes</p>
                                    )}
                                  </div>
                                </td>
                                <td className="p-8 text-center">
                                  {remaining > 0 && !isCurrentPaid ? (
                                    <button
                                      onClick={() => payCaucaoInstallment(rental.id, currentDueDateStr)}
                                      className="px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 mx-auto"
                                    >
                                      <Check size={12} /> Confirmar Pago
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-2 text-emerald-500 justify-center">
                                      <FileCheck size={14} />
                                      <span className="text-[9px] font-black uppercase tracking-widest">Tudo Pago</span>
                                    </div>
                                  )}
                                </td>
                                <td className="p-8 text-right">
                                  <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${remaining <= 0
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                                    }`}>
                                    {remaining <= 0 ? 'Liquidado' : 'Em Aberto'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="5" className="p-20 text-center">
                              <div className="flex flex-col items-center gap-4 text-neutral-300">
                                <Landmark size={48} className="opacity-20" />
                                <p className="text-[10px] uppercase tracking-[0.3em] font-black">Nenhuma garantia registrada no momento</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}




            {activeTab === 'frota' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                  <div>
                    <h3 className="text-4xl font-black uppercase tracking-tighter">Frota de Ativos</h3>
                    <p className="text-neutral-400 text-sm font-light mt-1">Gerencie o cadastro técnico, financeiro e visual da sua frota.</p>
                  </div>
                  <button
                    onClick={() => {
                      resetVehicleForm();
                      setIsEditing(false);
                      setShowAddForm(true);
                    }}
                    className="flex items-center gap-3 bg-neutral-900 text-white px-8 py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] font-black hover:bg-[#C5A059] transition-all shadow-xl shadow-neutral-900/10"
                  >
                    <Plus size={16} /> Adicionar Novo Veículo
                  </button>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row gap-6 mb-12">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                    <input
                      type="text"
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                      placeholder="Pesquisar por modelo ou placa..."
                      className="w-full bg-white border border-neutral-100 p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light shadow-sm"
                    />
                  </div>
                  <div className="flex bg-white p-1 rounded-2xl border border-neutral-100 shadow-sm shrink-0">
                    {['Todos', 'Disponível', 'Alugado', 'Manutenção'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setVehicleStatusFilter(status)}
                        className={`px-6 py-4 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all ${vehicleStatusFilter === status
                            ? 'bg-neutral-900 text-white shadow-lg'
                            : 'text-neutral-400 hover:text-neutral-900'
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid of Vehicles */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {vehicles.filter(car => {
                    const searchLower = vehicleSearch.toLowerCase();
                    const matchesSearch = (car.model || '').toLowerCase().includes(searchLower) ||
                      (car.plate || '').toLowerCase().includes(searchLower);
                    const matchesStatus = vehicleStatusFilter === 'Todos' || car.status === vehicleStatusFilter;
                    return matchesSearch && matchesStatus;
                  }).length > 0 ? (
                    vehicles.filter(car => {
                      const searchLower = vehicleSearch.toLowerCase();
                      const matchesSearch = (car.model || '').toLowerCase().includes(searchLower) ||
                        (car.plate || '').toLowerCase().includes(searchLower);
                      const matchesStatus = vehicleStatusFilter === 'Todos' || car.status === vehicleStatusFilter;
                      return matchesSearch && matchesStatus;
                    }).map((car) => (
                      <div key={car.id} className="group bg-white rounded-[2.5rem] border border-neutral-100 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-[#C5A059]/10 transition-all duration-500 hover:-translate-y-2">
                        <div className="aspect-[16/9] relative overflow-hidden">
                          <img src={car.image} alt={car.model} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                            <div className="flex flex-col w-20 h-10 bg-white border-2 border-neutral-900 rounded-lg overflow-hidden shadow-2xl scale-90 origin-top-left">
                              <div className="h-2.5 bg-[#003399] flex items-center justify-center">
                                <span className="text-[5px] text-white font-black tracking-[0.2em]">BRASIL</span>
                              </div>
                              <div className="flex-1 flex items-center justify-center bg-white">
                                <span className="text-[10px] font-black tracking-tighter text-neutral-900">{(car.plate || '').replace('-', '') || 'S/ PLACA'}</span>
                              </div>
                            </div>
                            <div className={`px-3 py-1.5 rounded-lg border backdrop-blur-md flex items-center gap-2 shadow-lg w-fit ${car.status === 'Alugado'
                                ? 'bg-amber-500/90 border-amber-400 text-white'
                                : car.status === 'Indisponível'
                                  ? 'bg-red-500/90 border-red-400 text-white'
                                  : 'bg-emerald-500/90 border-emerald-400 text-white'
                              }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${car.status === 'Alugado' ? 'bg-white animate-pulse' : 'bg-white'}`} />
                              <span className="text-[8px] font-black uppercase tracking-widest">{car.status || 'Disponível'}</span>
                            </div>
                          </div>

                          <div className="absolute bottom-4 left-4 right-4 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 flex justify-between items-center">
                            <button
                              onClick={() => onViewVehicleDetail(car)}
                              className="px-6 py-2 bg-white text-neutral-900 text-[9px] uppercase tracking-widest font-black rounded-full shadow-xl hover:bg-[#C5A059] hover:text-white transition-all"
                            >
                              Ver Detalhes
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedVehicle(car);
                                  setVehicleForm({
                                    ...car,
                                    model: car.model || '',
                                    plate: car.plate || '',
                                    year: car.year || '',
                                    renavam: car.renavam || '',
                                    initialKm: car.initialKm || '',
                                    fipeValue: car.fipeValue || '',
                                    investor: car.investor || '',
                                    adminTax: car.adminTax || '15',
                                    protectionPaidByAdmin: car.protectionPaidByAdmin || false,
                                    protectionValue: car.protectionValue || '',
                                    franchiseInsurance: car.franchiseInsurance || false,
                                    hasSpareKey: car.hasSpareKey || false,
                                    lastBeltChangeKm: car.lastBeltChangeKm || '',
                                    beltChangeIntervalKm: car.beltChangeIntervalKm || '',
                                    image: car.image || '',
                                    investmentValue: car.investmentValue || '',
                                    preventiveMaintenance: car.preventiveMaintenance || false,
                                    crlvFile: car.crlvFile || null
                                  });
                                  setIsEditing(true);
                                  setShowAddForm(true);
                                }}
                                className="w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-[#C5A059] transition-all"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  const newStatus = car.status === 'Indisponível' ? 'Disponível' : 'Indisponível';
                                  onUpdateVehicle({ ...car, status: newStatus });
                                }}
                                className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center transition-all ${car.status === 'Indisponível'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'bg-white/20 text-white hover:bg-red-500 shadow-lg'
                                  }`}
                                title={car.status === 'Indisponível' ? 'Tornar Disponível' : 'Marcar Indisponível'}
                              >
                                {car.status === 'Indisponível' ? <Power size={14} /> : <PowerOff size={14} />}
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete(car);
                                  setDeleteType('vehicle');
                                  setShowDeleteAuthModal(true);
                                }}
                                className="w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-all"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-8">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black mb-1">{car.year}</p>
                              <h4 className="text-xl font-black text-neutral-900 tracking-tighter uppercase">{car.model || 'Sem Modelo'}</h4>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Valor FIPE</p>
                              <p className="text-sm font-black text-neutral-900">{car.fipeValue ? `R$ ${car.fipeValue}` : 'Sob Consulta'}</p>
                            </div>
                          </div>

                          {car.investmentValue && (
                            <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                              <p className="text-[9px] uppercase tracking-widest text-emerald-600 font-black">Investimento Motorista</p>
                              <p className="text-xs font-black text-emerald-700">R$ {car.investmentValue}</p>
                            </div>
                          )}

                          <div className="h-[1px] bg-neutral-50 mb-6" />

                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-4 bg-neutral-50 rounded-2xl">
                              <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Investidor</p>
                              <p className="text-xs font-black text-neutral-900 truncate">{car.investor || 'Nenhum'}</p>
                            </div>
                            <div className="p-4 bg-[#C5A059]/5 rounded-2xl border border-[#C5A059]/10">
                              <p className="text-[9px] uppercase tracking-widest text-[#C5A059] font-bold mb-1">Taxa Adm</p>
                              <p className="text-xs font-black text-[#C5A059]">{car.adminTax}%</p>
                            </div>
                          </div>

                          <div className="p-4 bg-neutral-900 text-white rounded-2xl flex items-center justify-between">
                            <div>
                              <p className="text-[8px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Troca Correia</p>
                              <p className="text-[10px] font-black">{car.lastBeltChangeKm || '0'} KM</p>
                            </div>
                            <div className="w-[1px] h-6 bg-neutral-800" />
                            <div className="text-right">
                              <p className="text-[8px] uppercase tracking-widest text-neutral-400 font-bold mb-1">Próxima em</p>
                              <p className="text-[10px] font-black text-[#C5A059]">{car.beltChangeIntervalKm || '0'} KM</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-neutral-200">
                      <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-300">
                        <Car size={32} />
                      </div>
                      <p className="text-neutral-400 uppercase tracking-[0.2em] text-[10px] font-black">Nenhum veículo encontrado para estes critérios</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'leads' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Leads de Contato</h3>
                    <p className="text-neutral-400 text-sm font-light mt-1">Interessados e solicitações vindas do site.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={exportLeadsToExcel}
                      className="flex items-center gap-3 bg-emerald-50 text-emerald-600 px-6 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black hover:bg-emerald-600 hover:text-white transition-all shadow-sm group"
                    >
                      <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                      Exportar Excel
                    </button>
                    <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl border border-neutral-100 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] uppercase tracking-widest font-black text-neutral-900">
                        {leads.filter(l => l.status === 'novo').length} Novos Leads
                      </span>
                    </div>
                  </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-6 mb-12">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                    <input
                      type="text"
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      placeholder="Pesquisar por nome..."
                      className="w-full bg-white border border-neutral-100 p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light shadow-sm"
                    />
                  </div>
                  <div className="flex bg-white p-1 rounded-2xl border border-neutral-100 shadow-sm shrink-0">
                    {['todos', 'novo', 'contatado', 'convertido', 'perdido'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setLeadStatusFilter(status)}
                        className={`px-6 py-4 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all ${leadStatusFilter === status
                            ? 'bg-neutral-900 text-white shadow-lg'
                            : 'text-neutral-400 hover:text-neutral-900'
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => (
                      <div key={lead.id} className="bg-white rounded-3xl border border-neutral-100 shadow-sm hover:border-[#C5A059]/30 transition-all group overflow-hidden">
                        <div className="flex flex-col lg:flex-row">
                          {/* Vehicle Image (if rental) */}
                          {lead.type === 'locacao' && lead.vehicleImage && (
                            <div className="lg:w-48 h-48 lg:h-auto relative shrink-0">
                              <img src={lead.vehicleImage} alt={lead.vehicleModel} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white hidden lg:block" />
                              <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent lg:hidden" />
                            </div>
                          )}

                          <div className="flex-1 p-8">
                            <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059] font-black text-xl shadow-xl">
                                  {lead.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <h4 className="text-xl font-black text-neutral-900 uppercase tracking-tight">{lead.name}</h4>
                                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{lead.date}</p>
                                </div>
                                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${lead.status === 'novo' ? 'bg-emerald-50 text-emerald-600' :
                                    lead.status === 'contatado' ? 'bg-blue-50 text-blue-600' :
                                      lead.status === 'convertido' ? 'bg-amber-50 text-amber-600' :
                                        'bg-neutral-100 text-neutral-500'
                                  }`}>
                                  {lead.status}
                                </span>
                              </div>

                              <div className="flex gap-2">
                                {['contatado', 'convertido', 'perdido'].map((s) => (
                                  lead.status !== s && (
                                    <button
                                      key={s}
                                      onClick={() => onUpdateStatus(lead.id, s)}
                                      className="px-4 py-2 border border-neutral-100 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-neutral-50 transition-all text-neutral-400 hover:text-neutral-900"
                                    >
                                      {s}
                                    </button>
                                  )
                                ))}
                                <a
                                  href={`https://wa.me/${lead.contact.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-6 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                >
                                  <Phone size={12} /> Whats
                                </a>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-1">Whats</p>
                                <p className="text-xs font-bold text-neutral-900">{lead.contact}</p>
                              </div>
                              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-black mb-1">E-mail</p>
                                <p className="text-xs font-bold text-neutral-900">{lead.email || 'Não informado'}</p>
                              </div>
                              {lead.type === 'locacao' && (
                                <>
                                  <div className="p-4 bg-neutral-900 rounded-2xl border border-neutral-800">
                                    <p className="text-[9px] uppercase tracking-widest text-[#C5A059] font-black mb-1">Veículo / Placa</p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-black text-white">{lead.vehicleModel}</p>
                                      <span className="text-[8px] font-black bg-white text-neutral-900 px-1.5 py-0.5 rounded leading-none">
                                        {lead.vehiclePlate || 'S/ PLACA'}
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}
                              {lead.type !== 'locacao' && (
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                    <Mail size={14} />
                                  </div>
                                  <div>
                                    <p className="text-[9px] uppercase tracking-widest text-blue-400 font-black">Tipo de Lead</p>
                                    <p className="text-xs font-black text-blue-600 uppercase">Contato Geral / Site</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100 relative">
                              <div className="absolute top-4 right-6 opacity-5">
                                <FileText size={40} />
                              </div>
                              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-2">Mensagem do Cliente</p>
                              <p className="text-sm text-neutral-600 leading-relaxed italic">
                                "{lead.message || 'Sem mensagem adicional.'}"
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-neutral-200">
                      <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-300">
                        <Search size={32} />
                      </div>
                      <p className="text-neutral-400 uppercase tracking-[0.2em] text-[10px] font-black">Nenhum lead encontrado para estes critérios</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'locacao' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div>
                    <EditorialLabel className="text-[#C5A059] mb-1">Operações de Frota</EditorialLabel>
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Gestão de Locações</h3>
                    <p className="text-neutral-400 text-sm font-light mt-1">Monitoramento em tempo real dos contratos ativos.</p>
                  </div>
                  <button
                    onClick={() => {
                      resetRentalForm();
                      setShowAddForm(true);
                    }}
                    className="flex items-center gap-3 bg-neutral-900 text-white px-8 py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black hover:bg-[#C5A059] transition-all shadow-2xl shadow-neutral-900/20 group"
                  >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Nova Locação
                  </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                        <ShieldCheck size={24} />
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Locações Ativas</p>
                    </div>
                    <h4 className="text-4xl font-black text-neutral-900">{rentals.length}</h4>
                    <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mt-2">Frota em Circulação</p>
                  </div>

                  <div className="bg-neutral-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-[#C5A059] rounded-2xl flex items-center justify-center text-neutral-900 shadow-lg shadow-[#C5A059]/20">
                        <TrendingUp size={24} />
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Faturamento Semanal</p>
                    </div>
                    <h4 className="text-4xl font-black text-white">
                      R$ {rentals.reduce((acc, r) => acc + (parseFloat(r.value.replace('R$ ', '').replace('.', '').replace(',', '.')) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h4>
                    <p className="text-[9px] text-[#C5A059] font-bold uppercase tracking-widest mt-2">Projeção de Receita</p>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Clock size={24} />
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Próximas Devoluções</p>
                    </div>
                    <h4 className="text-4xl font-black text-neutral-900">
                      {rentals.filter(r => {
                        const startDate = new Date(r.date + 'T12:00:00');
                        const periodValue = parseInt(r.period) || 1;
                        const isWeekly = (r.period || '').includes('sem');
                        const totalDays = isWeekly ? periodValue * 7 : periodValue;
                        const endDate = new Date(startDate.getTime());
                        endDate.setDate(startDate.getDate() + totalDays);
                        const now = new Date();
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                        const diffDays = Math.ceil((endSimple.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        return diffDays <= 3 && diffDays > 0;
                      }).length}
                    </h4>
                    <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-2">Nos Próximos 3 Dias</p>
                  </div>
                </div>

                {/* Rentals Table */}
                <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-neutral-50 bg-neutral-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h5 className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-black">Lista de Contratos Vigentes</h5>
                    <div className="flex bg-white p-1 rounded-2xl border border-neutral-100 shadow-sm shrink-0">
                      {[
                        { id: 'todas', label: 'Todas as Locações' },
                        { id: 'ativas', label: 'Somente Ativas' },
                        { id: 'passadas', label: 'Locações Passadas' }
                      ].map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => setRentalFilter(filter.id)}
                          className={`px-6 py-4 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all ${rentalFilter === filter.id
                              ? 'bg-neutral-900 text-white shadow-lg'
                              : 'text-neutral-400 hover:text-neutral-900'
                            }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative w-full md:w-64">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                      <input
                        type="text"
                        placeholder="Pesquisar contrato..."
                        className="w-full bg-white border border-neutral-200 py-3 pl-10 pr-4 rounded-xl text-[10px] outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-50/50">
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black">Veículo / Identificação</th>
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black">Condutor Responsável</th>
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black">Financeiro</th>
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-center">Cronograma</th>
                          <th className="p-8 text-[10px] uppercase tracking-widest text-neutral-400 font-black text-right">Gerenciamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50 font-light">
                        {rentals.filter(rental => {
                          const startDate = new Date(rental.date + 'T12:00:00');
                          const periodValue = parseInt(rental.period) || 1;
                          const isWeekly = (rental.period || '').includes('sem');
                          const totalDays = isWeekly ? periodValue * 7 : periodValue;
                          const endDate = new Date(startDate.getTime());
                          endDate.setDate(startDate.getDate() + totalDays);
                          const now = new Date();
                          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                          const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                          const diffDays = Math.ceil((endSimple.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          const isActive = diffDays > 0;

                          if (rentalFilter === 'todas') return true;
                          if (rentalFilter === 'ativas') return isActive;
                          if (rentalFilter === 'passadas') return !isActive;
                          return true;
                        }).map((rental) => (
                          <tr key={rental.id} className="hover:bg-neutral-50/50 transition-all group border-b border-neutral-100 last:border-0 relative">
                            <td className="p-6">
                              <div className="flex items-center gap-8 p-3 rounded-[2.5rem] group-hover:bg-white transition-colors duration-500 min-w-[300px]">
                                <div className="w-28 h-20 rounded-3xl overflow-hidden bg-neutral-100 shrink-0 shadow-xl border-4 border-white group-hover:shadow-[#C5A059]/20 transition-all duration-500">
                                  <img src={rental.image} alt={rental.vehicle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                </div>
                                <div className="space-y-3">
                                  <h6 className="text-lg font-black text-neutral-900 uppercase tracking-tighter leading-none group-hover:text-[#C5A059] transition-colors">{rental.vehicle}</h6>
                                  <div className="flex items-center gap-2">
                                    <div className="flex flex-col w-20 h-10 bg-white border-2 border-neutral-900 rounded-lg overflow-hidden shadow-md scale-110 origin-left">
                                      <div className="h-2.5 bg-[#003399] flex items-center justify-center">
                                        <span className="text-[5px] text-white font-black tracking-[0.2em]">BRASIL</span>
                                      </div>
                                      <div className="flex-1 flex items-center justify-center bg-white">
                                        <span className="text-[10px] font-black tracking-tight text-neutral-900">{(rental.plate || '').replace('-', '') || 'S/ PLACA'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-4 bg-neutral-50/50 p-3 rounded-[2rem] border border-neutral-100 group-hover:bg-white group-hover:border-[#C5A059]/20 transition-all duration-500">
                                <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059] shadow-xl group-hover:bg-[#C5A059] group-hover:text-white transition-colors">
                                  <User size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black text-neutral-900 truncate">{rental.user}</p>
                                  <div className="flex items-center gap-3">
                                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">Condutor</p>
                                    {rental.clientPhone && (
                                      <a
                                        href={`https://wa.me/${rental.clientPhone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                                      >
                                        <Phone size={10} /> Whats
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="pl-4 border-l-2 border-[#C5A059]/20">
                                <span className="text-sm font-black text-neutral-900 block">{rental.value}</span>
                                <span className="text-[9px] text-[#C5A059] font-black uppercase tracking-[0.2em] mt-1 block">{rental.period}</span>
                              </div>
                            </td>
                            <td className="p-6 text-center">
                              {(() => {
                                const startDate = new Date(rental.date + 'T12:00:00');
                                const periodValue = parseInt(rental.period) || 1;
                                const isWeekly = (rental.period || '').includes('sem');
                                const totalDays = isWeekly ? periodValue * 7 : periodValue;
                                const endDate = new Date(startDate.getTime());
                                endDate.setDate(startDate.getDate() + totalDays);
                                const now = new Date();
                                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                                const diffDays = Math.ceil((endSimple.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                                return (
                                  <div className="flex flex-col items-center gap-2">
                                    <div className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm border-2 transition-all ${diffDays <= 2 ? 'bg-red-50 text-red-600 border-red-100' :
                                        diffDays <= 5 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                          'bg-emerald-50 text-emerald-600 border-emerald-100'
                                      }`}>
                                      {diffDays > 0 ? `Faltam ${diffDays} dias` : 'Encerrado'}
                                    </div>
                                    <span className="text-[8px] text-neutral-400 font-black uppercase tracking-tighter">Devolução: {endDate.toLocaleDateString('pt-BR')}</span>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="p-6 text-right">
                              <div className="flex justify-end gap-3 pr-2">
                                <button
                                  onClick={() => {
                                    setSelectedRental(rental);
                                    setShowRentalDetailModal(true);
                                  }}
                                  className="w-12 h-12 bg-neutral-900 text-white rounded-2xl hover:bg-[#C5A059] transition-all flex items-center justify-center shadow-xl group/btn"
                                  title="Ver Detalhes"
                                >
                                  <ClipboardList size={20} />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRental(rental);
                                    setRentalFormData({
                                      vehicleId: rental.vehicleId,
                                      vehicleModel: rental.vehicle,
                                      vehiclePlate: rental.plate,
                                      weeklyRate: parseFloat(rental.value.replace('R$ ', '').replace('.', '').replace(',', '.')) || 0,
                                      clientName: rental.user,
                                      clientCpf: rental.clientCpf || '',
                                      clientPhone: rental.clientPhone || '',
                                      clientEmail: rental.clientEmail || '',
                                      weeks: parseInt(rental.period) || 1,
                                      tyreTax: rental.tyreTax || '0,00',
                                      depositTotal: rental.depositTotal || '0,00',
                                      depositReceived: rental.depositReceived || '0,00',
                                      depositInstallments: rental.depositInstallments || 0,
                                      lateFeePerc: rental.lateFeePerc || '10',
                                      dailyInterestPerc: rental.dailyInterestPerc || '1',
                                      startDate: rental.date || new Date().toISOString().split('T')[0],
                                      contractFile: null
                                    });
                                    setRentalStep(2); // Inicia nos dados do condutor para edição
                                    setIsEditingRental(true);
                                    setShowAddForm(true);
                                  }}
                                  className="w-12 h-12 bg-white border border-neutral-100 text-neutral-400 rounded-2xl hover:bg-neutral-900 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                  title="Editar"
                                >
                                  <Pencil size={20} />
                                </button>
                                <button
                                  onClick={() => {
                                    setItemToDelete(rental);
                                    setDeleteType('rental');
                                    setShowDeleteAuthModal(true);
                                  }}
                                  className="w-12 h-12 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                  title="Apagar"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'investidores' && (
              <form className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Nome Completo</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                      <input type="text" value={investorForm.name} onChange={e => setInvestorForm({ ...investorForm, name: e.target.value })} className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" placeholder="Nome do investidor" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">CPF</label>
                    <input type="text" value={investorForm.cpf} onChange={e => setInvestorForm({ ...investorForm, cpf: e.target.value })} className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" placeholder="000.000.000-00" />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">E-mail</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                      <input type="email" value={investorForm.email} onChange={e => setInvestorForm({ ...investorForm, email: e.target.value })} className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" placeholder="email@exemplo.com" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Telefone / Whats</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                      <input type="text" value={investorForm.phone} onChange={e => setInvestorForm({ ...investorForm, phone: e.target.value })} className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" placeholder="(00) 00000-0000" />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Endereço Residencial</label>
                    <div className="relative">
                      <Min size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                      <input type="text" value={investorForm.address} onChange={e => setInvestorForm({ ...investorForm, address: e.target.value })} className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" placeholder="Endereço completo" />
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-neutral-100" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Acesso ao Portal */}
                  <div className="space-y-8">
                    <h5 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                      <Key size={18} className="text-[#C5A059]" />
                      Acesso ao Portal
                    </h5>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Senha de Acesso</label>
                        <input type="text" value={investorForm.password} onChange={e => setInvestorForm({ ...investorForm, password: e.target.value })} className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold tracking-widest" placeholder="Senha segura" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Status da Conta</label>
                        <select value={investorForm.status} onChange={e => setInvestorForm({ ...investorForm, status: e.target.value })} className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold earance-none">
                          <option value="Ativo">Ativo</option>
                          <option value="Inativo">Inativo</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Dados Bancários */}
                  <div className="space-y-8">
                    <h5 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                      <Landmark size={18} className="text-[#C5A059]" />
                      Dados para Repasse
                    </h5>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Banco / Agência / Conta</label>
                        <input type="text" value={investorForm.bank} onChange={e => setInvestorForm({ ...investorForm, bank: e.target.value })} className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" placeholder="Ex: Nubank / 0001 / 12345-6" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Chave PIX</label>
                        <input type="text" value={investorForm.pix} onChange={e => setInvestorForm({ ...investorForm, pix: e.target.value })} className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-[#C5A059]" placeholder="E-mail, CPF, Telefone ou Chave" />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>

          {activeTab !== 'locacao' && (
            <div className="p-10 border-t border-neutral-100 flex justify-end gap-6 shrink-0 bg-neutral-50/50">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-8 py-4 text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={(e) => {
                  if (activeTab === 'frota') {
                    handleSaveVehicle(e);
                  } else if (activeTab === 'investidores') {
                    if (isEditing) {
                      onUpdateInvestor({
                        ...investorForm
                      });
                      setIsEditing(false);
                      setShowAdminSuccess({
                        show: true,
                        title: 'Investidor Atualizado',
                        message: 'Os dados do parceiro foram atualizados com sucesso no sistema.'
                      });
                    } else {
                      onAddInvestor({
                        ...investorForm
                      });
                      setShowAdminSuccess({
                        show: true,
                        title: 'Investidor Cadastrado',
                        message: 'O novo parceiro foi registrado com sucesso no sistema da LA Locação.'
                      });
                    }
                    setShowAddForm(false);
                  }
                }}
                className="px-12 py-5 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-[2rem] hover:bg-[#C5A059] transition-all shadow-xl"
              >
                {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const RentalDetailModal = ({ rental, onClose }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  const calculateDates = () => {
    if (!rental.startDate) return { start: '---', end: '---', remaining: 0, totalDays: 0 };
    const startDate = new Date(rental.startDate + 'T12:00:00');
    if (isNaN(startDate.getTime())) return { start: '---', end: '---', remaining: 0, totalDays: 0 };
    const totalDays = (parseInt(rental.weeks || rental.contractWeeks || 1)) * 7;
    const endDate = new Date(startDate.getTime());
    endDate.setDate(startDate.getDate() + totalDays);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endSimple = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffTime = endSimple.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      start: startDate.toLocaleDateString('pt-BR'),
      end: endDate.toLocaleDateString('pt-BR'),
      remaining: diffDays > 0 ? diffDays : 0,
      totalDays
    };
  };

  const dates = calculateDates();

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
                <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md" onClick={onClose} />
                <div className="bg-white w-full max-w-6xl rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-500">

                  {/* Modal de Preview de Imagem */}
                  {selectedImage && (
                    <div className="fixed inset-0 z-[600] flex items-center justify-center p-10 animate-in zoom-in duration-300">
                      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedImage(null)} />
                      <div className="relative z-10 max-w-full max-h-full">
                        <img src={selectedImage} className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl border border-white/10" alt="Preview" />
                        <button
                          onClick={() => setSelectedImage(null)}
                          className="absolute -top-12 right-0 text-white flex items-center gap-2 font-black uppercase text-[10px] tracking-widest hover:text-[#C5A059] transition-colors"
                        >
                          <X size={20} /> Fechar Preview
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Header */}
                  <div className="p-10 bg-neutral-950 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#C5A059]/10 to-transparent" />
                    <div className="flex items-center gap-8 relative z-10">
                      <div className="w-16 h-16 bg-[#C5A059] rounded-2xl flex items-center justify-center text-neutral-950 shadow-2xl shadow-[#C5A059]/20 transform -rotate-3">
                        <ClipboardList size={32} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <EditorialLabel className="text-[#C5A059]">Ficha Cadastral</EditorialLabel>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Locação Ativa</span>
                        </div>
                        <h4 className="text-2xl font-black uppercase tracking-tighter text-white">Detalhes da Locação</h4>
                      </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-white/5 flex items-center justify-center rounded-full hover:bg-white/10 transition-all text-white border border-white/5 relative z-10">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-12 bg-neutral-50/30">
                    {/* Top Banner: Countdown */}
                    <div className="bg-neutral-900 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl mb-10">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="w-20 h-20 bg-[#C5A059]/10 rounded-3xl flex items-center justify-center text-[#C5A059]">
                          <Clock size={40} className="animate-pulse" />
                        </div>
                        <div>
                          <p className="text-[#C5A059] text-[10px] uppercase tracking-[0.3em] font-black mb-1">Status do Contrato</p>
                          <h2 className="text-5xl font-black text-white tracking-tighter">Faltam {dates.remaining} dias</h2>
                        </div>
                      </div>
                      <div className="flex flex-col items-center md:items-end gap-2 relative z-10">
                        <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest">Devolução Prevista</p>
                        <p className="text-2xl font-black text-white">{dates.end}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      {/* Coluna Esquerda & Centro: Dados do Condutor e Anexos */}
                      <div className="lg:col-span-2 space-y-10">
                        {/* Dados do Condutor */}
                        <div className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm">
                          <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-8 flex items-center gap-2">
                            <User size={14} className="text-[#C5A059]" /> Perfil do Condutor
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase font-bold text-neutral-400">Nome Completo</p>
                                <p className="text-lg font-black text-neutral-900">{rental.user}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase font-bold text-neutral-400">CPF / Documento</p>
                                <p className="text-sm font-black text-neutral-900">{rental.clientCpf || '---'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase font-bold text-neutral-400">Telefone / Whats</p>
                                <p className="text-sm font-black text-neutral-900">{rental.clientPhone || '---'}</p>
                              </div>
                            </div>
                            <div className="space-y-6">
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase font-bold text-neutral-400">E-mail</p>
                                <p className="text-sm font-black text-neutral-900">{rental.clientEmail || '---'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase font-bold text-neutral-400">Endereço Residencial</p>
                                <p className="text-sm font-black text-neutral-900 leading-tight">{rental.clientAddress || 'Não cadastrado'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Dados da CNH */}
                        <div className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm">
                          <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-8 flex items-center gap-2">
                            <CreditCard size={14} className="text-[#C5A059]" /> Carteira de Habilitação (CNH)
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="space-y-1">
                              <p className="text-[9px] uppercase font-bold text-neutral-400">Número do Registro</p>
                              <p className="text-lg font-black text-neutral-900">{rental.clientCnhNumber || '---'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] uppercase font-bold text-neutral-400">Data de Validade</p>
                              <p className="text-lg font-black text-neutral-900">{rental.clientCnhExpiry || '---'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] uppercase font-bold text-neutral-400">Cód. Segurança</p>
                              <p className="text-lg font-black text-neutral-900">{rental.clientCnhSecurityCode || '---'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Galeria de Documentos */}
                        <div className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm">
                          <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-8 flex items-center gap-2">
                            <Camera size={14} className="text-[#C5A059]" /> Galeria de Documentos
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {rental.clientCnhFile && (
                              <div className="space-y-3">
                                <div className="group relative aspect-video bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
                                  <img src={rental.clientCnhFile} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="CNH" />
                                  <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                                    <div className="flex gap-2">
                                      <button onClick={() => setSelectedImage(rental.clientCnhFile)} className="px-3 py-2 bg-white text-neutral-900 text-[8px] font-black uppercase rounded-xl hover:bg-neutral-100 transition-colors">Visualizar</button>
                                      <a href={rental.clientCnhFile} download={`CNH_${rental.user.replace(/\s+/g, '_')}.png`} className="w-8 h-8 bg-[#C5A059] text-neutral-950 flex items-center justify-center rounded-xl shadow-lg hover:scale-110 transition-transform">
                                        <Download size={14} />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] text-center">Carteira CNH</p>
                              </div>
                            )}

                            {rental.clientAddressProofFile && (
                              <div className="space-y-3">
                                <div className="group relative aspect-video bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
                                  <img src={rental.clientAddressProofFile} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Residência" />
                                  <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                                    <div className="flex gap-2">
                                      <button onClick={() => setSelectedImage(rental.clientAddressProofFile)} className="px-3 py-2 bg-white text-neutral-900 text-[8px] font-black uppercase rounded-xl hover:bg-neutral-100 transition-colors">Visualizar</button>
                                      <a href={rental.clientAddressProofFile} download={`Residencia_${rental.user.replace(/\s+/g, '_')}.png`} className="w-8 h-8 bg-[#C5A059] text-neutral-950 flex items-center justify-center rounded-xl shadow-lg hover:scale-110 transition-transform">
                                        <Download size={14} />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] text-center">Residência</p>
                              </div>
                            )}

                            {(rental.clientProfileFiles || []).map((file, idx) => (
                              <div key={idx} className="space-y-3">
                                <div className="group relative aspect-video bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
                                  <img src={file} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={` Profile ${idx + 1}`} />
                                  <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                                    <div className="flex gap-2">
                                      <button onClick={() => setSelectedImage(file)} className="px-3 py-2 bg-white text-neutral-900 text-[8px] font-black uppercase rounded-xl hover:bg-neutral-100 transition-colors">Visualizar</button>
                                      <a href={file} download={`_Profile_${idx + 1}_${rental.user.replace(/\s+/g, '_')}.png`} className="w-8 h-8 bg-[#C5A059] text-neutral-950 flex items-center justify-center rounded-xl shadow-lg hover:scale-110 transition-transform">
                                        <Download size={14} />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] text-center">Perfil  {idx + 1}</p>
                              </div>
                            ))}

                            {!(rental.clientCnhFile || rental.clientAddressProofFile || (rental.clientProfileFiles && rental.clientProfileFiles.length > 0)) && (
                              <div className="col-span-full py-16 text-center bg-neutral-50 rounded-[2.5rem] border-2 border-dashed border-neutral-100">
                                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.3em]">Nenhum documento anexado ao perfil</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Coluna Direita: Resumo e Ações */}
                      <div className="space-y-10">
                        {/* Veículo Summary */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                          <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-6 flex items-center gap-2">
                            <Car size={14} className="text-[#C5A059]" /> Veículo Alugado
                          </h5>
                          <div className="space-y-6">
                            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-100">
                              <img src={rental.image} alt={rental.vehicle} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h6 className="text-xl font-black text-neutral-900 uppercase tracking-tighter leading-tight">{rental.vehicle}</h6>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-900 rounded-lg mt-3">
                                <span className="text-[10px] font-black text-white tracking-widest">{(rental.plate || '').toUpperCase()}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Timeline Resumo */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm mb-10">
                          <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-8 flex items-center gap-2">
                            <Calendar size={14} className="text-[#C5A059]" /> Timeline
                          </h5>
                          <div className="space-y-8 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-50">
                            <div className="relative pl-8">
                              <div className="absolute left-0 top-1.5 w-4 h-4 bg-[#C5A059] rounded-full border-4 border-white shadow-sm" />
                              <p className="text-[8px] uppercase font-bold text-neutral-400">Início da Locação</p>
                              <p className="text-xs font-black text-neutral-900">{dates.start}</p>
                            </div>
                            <div className="relative pl-8">
                              <div className="absolute left-0 top-1.5 w-4 h-4 bg-neutral-900 rounded-full border-4 border-white shadow-sm" />
                              <p className="text-[8px] uppercase font-bold text-neutral-400">Devolução Prevista</p>
                              <p className="text-xs font-black text-neutral-900">{dates.end}</p>
                            </div>
                          </div>
                        </div>

                        {/* Financeiro Summary */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                          <h5 className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-6 flex items-center gap-2">
                            <Landmark size={14} className="text-[#C5A059]" /> Termos Financeiros
                          </h5>
                          <div className="space-y-4">
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[8px] uppercase font-bold text-neutral-400">Caução Total</p>
                                <p className="text-sm font-black text-neutral-900">R$ {rental.depositTotal || rental.deposit || '0,00'}</p>
                              </div>
                              {rental.depositInstallments > 0 && (
                                <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-widest">{rental.depositInstallments}x parcelas</span>
                              )}
                            </div>
                            <div className="flex justify-between items-end pt-4 border-t border-neutral-50">
                              <div>
                                <p className="text-[8px] uppercase font-bold text-neutral-400">Multa / Juros</p>
                                <p className="text-sm font-black text-neutral-900">{rental.lateFeePerc || '10'}% + {rental.dailyInterestPerc || '1'}%/dia</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Ações */}

                        <div className="space-y-4">
                          {rental.contractFile ? (
                            <a
                              href={rental.contractFile}
                              download={rental.contractFileName || `Contrato_${rental.user.replace(/\s+/g, '_')}.pdf`}
                              className="w-full py-6 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-[2rem] hover:bg-[#C5A059] transition-all shadow-xl shadow-neutral-900/10 flex items-center justify-center gap-3 group"
                            >
                              <Download size={18} className="group-hover:-translate-y-1 transition-transform" /> Baixar Contrato
                            </a>
                          ) : (
                            <button className="w-full py-6 bg-neutral-100 text-neutral-400 text-[10px] uppercase tracking-[0.3em] font-black rounded-[2rem] flex items-center justify-center gap-3 cursor-not-allowed border border-neutral-200">
                              <AlertTriangle size={18} /> Contrato não Anexado
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              );
};

const RentalSuccessModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/98 backdrop-blur-xl" onClick={onClose} />
      <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden text-center">
        <div className="bg-neutral-900 p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#C5A059]/10" />
          <div className="w-24 h-24 bg-[#C5A059] rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-[#C5A059]/30 relative z-10 animate-bounce">
            <FileCheck size={48} className="text-neutral-950" />
          </div>
          <h3 className="text-3xl font-black text-white uppercase tracking-tighter relative z-10">Contrato Criado!</h3>
          <p className="text-neutral-400 text-[10px] uppercase tracking-[0.3em] font-bold mt-3 relative z-10">Locação Registrada com Sucesso</p>
        </div>
        <div className="p-10">
          <p className="text-neutral-500 font-light mb-10 leading-relaxed text-sm">O contrato de locação foi gerado e o veículo está marcado como alugado na frota.</p>
          <button onClick={onClose} className="w-full py-6 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-[2rem] hover:bg-[#C5A059] transition-all shadow-xl">
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [view, setView] = useState('home');
  const [leads, setLeads] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [investors, setInvestors] = useState([
    {
      id: 1,
      name: 'Ricardo Santana',
      email: 'ricardo@email.com',
      phone: '(79) 99999-0001',
      cpf: '123.456.789-00',
      address: 'Rua das Palmeiras, 123 - Jardins, Aracaju/SE',
      bank: 'Nubank / 0001 / 12345-6',
      pix: 'ricardo@email.com',
      password: 'invest123',
      adminTax: '15',
      status: 'Ativo'
    },
    {
      id: 2,
      name: 'Guilherme Pereira',
      email: 'guilherme@email.com',
      phone: '(79) 99999-0002',
      cpf: '987.654.321-00',
      address: 'Av. Beira Mar, 456 - Centro, Aracaju/SE',
      bank: 'Itaú / 0341 / 98765-4',
      pix: '987.654.321-00',
      password: 'invest456',
      adminTax: '12',
      status: 'Ativo'
    }
  ]);
  const [vehicles, setVehicles] = useState([
    {
      id: 1, model: 'Porsche 911 Carrera', plate: 'LA-9110', year: '2023/2023', renavam: '12345678901',
      initialKm: '5000', km: '15000', fipeValue: '850000', investor: 'Ricardo Santana', adminTax: '15',
      protectionPaidByAdmin: true, protectionValue: '120', franchiseInsurance: true, hasSpareKey: true,
      lastBeltChangeKm: '10000', beltChangeIntervalKm: '80000', image: '', dividend: '3500',
      weeklyRental: '2500', investmentValue: '850000', preventiveMaintenance: true, status: 'Alugado',
      entryDate: '2024-01-15', crlvFile: null
    },
    {
      id: 2, model: 'Audi RS6 Avant', plate: 'LA-0066', year: '2022/2023', renavam: '98765432100',
      initialKm: '12000', km: '28000', fipeValue: '720000', investor: 'Guilherme Pereira', adminTax: '12',
      protectionPaidByAdmin: false, protectionValue: '150', franchiseInsurance: true, hasSpareKey: false,
      lastBeltChangeKm: '20000', beltChangeIntervalKm: '60000', image: '', dividend: '4200',
      weeklyRental: '2000', investmentValue: '720000', preventiveMaintenance: false, status: 'Disponível',
      entryDate: '2024-03-10', crlvFile: null
    }
  ]);
  const [transactions, setTransactions] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleAddLead = (lead) => {
    setLeads(prev => [{ ...lead, id: Date.now(), status: 'novo', date: new Date().toLocaleDateString('pt-BR') }, ...prev]);
  };

  const handleUpdateLeadStatus = (id, status) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const handleAddRental = (rental) => {
    setRentals(prev => [{ ...rental, id: Date.now() }, ...prev]);
    setVehicles(prev => prev.map(v => v.id === rental.vehicleId ? { ...v, status: 'Alugado' } : v));
  };

  const handleDeleteRental = (id) => {
    const rental = rentals.find(r => r.id === id);
    if (rental) {
      setVehicles(prev => prev.map(v => v.id === rental.vehicleId ? { ...v, status: 'Disponível' } : v));
    }
    setRentals(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateRental = (updatedRental) => {
    setRentals(prev => prev.map(r => r.id === updatedRental.id ? updatedRental : r));
  };

  const handleAddInvestor = (investor) => {
    setInvestors(prev => [{ ...investor, id: Date.now() }, ...prev]);
  };

  const handleUpdateInvestor = (updatedInvestor) => {
    setInvestors(prev => prev.map(i => i.id === updatedInvestor.id ? updatedInvestor : i));
  };

  const handleDeleteInvestor = (id) => {
    setInvestors(prev => prev.filter(i => i.id !== id));
  };

  const handleAddVehicle = (vehicle) => {
    setVehicles(prev => [{ ...vehicle, id: Date.now(), status: 'Disponível', km: vehicle.initialKm || '0' }, ...prev]);
  };

  const handleUpdateVehicle = (updatedVehicle) => {
    setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
  };

  const handleDeleteVehicle = (id) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const handleAddTransaction = (transaction) => {
    setTransactions(prev => [{ ...transaction, id: Date.now() }, ...prev]);
  };

  if (view === 'admin') {
    return (
      <AdminDashboard
        leads={leads}
        rentals={rentals}
        investors={investors}
        vehicles={vehicles}
        transactions={transactions}
        onAddTransaction={handleAddTransaction}
        onUpdateStatus={handleUpdateLeadStatus}
        onAddRental={handleAddRental}
        onDeleteRental={handleDeleteRental}
        onUpdateRental={handleUpdateRental}
        onAddInvestor={handleAddInvestor}
        onUpdateInvestor={handleUpdateInvestor}
        onDeleteInvestor={handleDeleteInvestor}
        onAddVehicle={handleAddVehicle}
        onUpdateVehicle={handleUpdateVehicle}
        onDeleteVehicle={handleDeleteVehicle}
        onLogout={() => {
          localStorage.removeItem('la_admin_auth');
          setView('home');
        }}
        onGoHome={() => setView('home')}
        onViewVehicleDetail={(v) => setView('vehicle-' + v.id)}
      />
    );
  }

  if (view === 'investor') {
    return (
      <InvestorDashboard
        transactions={transactions}
        onLogout={() => setView('home')}
      />
    );
  }

  if (view === 'admin-login') {
    return (
      <AdminLogin
        onBack={() => setView('home')}
        onLoginSuccess={() => {
          localStorage.setItem('la_admin_auth', 'true');
          setView('admin');
        }}
      />
    );
  }

  if (view === 'investor-login') {
    return (
      <InvestorLogin
        onBack={() => setView('home')}
        onLoginSuccess={() => setView('investor')}
      />
    );
  }


  // Landing Page
  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      {selectedImage && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-w-full max-h-full object-contain rounded-2xl" alt="Visualização" />
          <button className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all" onClick={() => setSelectedImage(null)}>
            <X size={24} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <div>
            <span className="text-2xl font-black uppercase tracking-tighter text-neutral-900">LA</span>
            <span className="text-2xl font-black uppercase tracking-tighter text-[#C5A059] ml-1">Locação</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            {['Frota', 'Serviços', 'Investidores', 'Contato'].map(item => (
              <a key={item} href={"#" + item.toLowerCase()} className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-400 hover:text-neutral-900 transition-colors">{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setView('admin-login')} className="text-[10px] uppercase tracking-widest font-black text-neutral-400 hover:text-neutral-900 transition-colors hidden md:block">
              Admin
            </button>
            <button
              onClick={() => setView('investor-login')}
              className="px-6 py-3 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-[#C5A059] transition-all shadow-lg"
            >
              Portal Investidor
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen bg-neutral-950 relative overflow-hidden flex items-center pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-neutral-950" />
        <div className="absolute top-0 right-0 w-[60%] h-full bg-[url('https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-24">
          <EditorialLabel className="text-[#C5A059] mb-6">Locação Profissional de Veículos</EditorialLabel>
          <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter text-white leading-none mb-8">
            L A<br/><span className="text-[#C5A059]">Locação</span>
          </h1>
          <p className="text-neutral-400 font-light text-lg md:text-xl max-w-lg mb-12 leading-relaxed">
            Plataforma premium de gestão de frota e locação de veículos de luxo em Aracaju. Conduza seus sonhos com excelência.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="#contato" className="px-10 py-5 bg-[#C5A059] text-neutral-950 text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-white transition-all shadow-2xl shadow-[#C5A059]/20 text-center">
              Alugar Agora
            </a>
            <a href="#frota" className="px-10 py-5 bg-white/10 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-white/20 transition-all border border-white/10 text-center">
              Ver Frota
            </a>
          </div>
        </div>
      </section>

      {/* Frota */}
      <section id="frota" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="mb-20">
            <EditorialLabel className="text-[#C5A059] mb-4">Nossa Frota</EditorialLabel>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-neutral-900 mb-6">
              Veículos<br/>Exclusivos
            </h2>
            <p className="text-neutral-500 font-light max-w-xl text-lg">
              Conheça nossa seleção de veículos premium disponíveis para locação imediata.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {vehicles.filter(v => v.status === 'Disponível').map(car => (
              <div key={car.id} className="group relative bg-neutral-50 rounded-[3rem] overflow-hidden hover:shadow-2xl transition-all duration-500">
                <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                  <img 
                    src={car.image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80'} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt={car.model}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="p-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black mb-2">{car.year}</p>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-neutral-900">{car.model}</h3>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-neutral-200 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Valor Semanal</p>
                      <p className="text-xl font-black text-neutral-900">R$ {car.weeklyRental}</p>
                    </div>
                    <a href="#contato" className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:bg-[#C5A059] transition-colors">
                      <ArrowUpRight size={20} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {vehicles.filter(v => v.status === 'Disponível').length === 0 && (
              <div className="col-span-full py-20 text-center bg-neutral-50 rounded-[3rem] border border-neutral-100">
                <Car size={48} className="mx-auto text-neutral-300 mb-6" />
                <p className="text-neutral-500 text-[10px] uppercase tracking-[0.3em] font-bold">Nenhum veículo disponível no momento.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Investidores */}
      <section id="investidores" className="py-32 bg-neutral-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950/90 to-neutral-950" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1">
            <EditorialLabel className="text-[#C5A059] mb-4">Seja um Parceiro</EditorialLabel>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mb-8">
              Programa de<br/><span className="text-[#C5A059]">Investidores</span>
            </h2>
            <p className="text-neutral-400 font-light text-lg mb-10 leading-relaxed max-w-xl">
              Rentabilize seu patrimônio com segurança. Coloque seu veículo na nossa frota e receba dividendos semanais enquanto nós cuidamos de toda a gestão, manutenção e locação.
            </p>
            <ul className="space-y-6 mb-12">
              {[
                'Gestão 100% profissional e transparente',
                'Rendimentos pagos pontualmente toda semana',
                'Seguro total e rastreamento veicular',
                'Portal exclusivo para acompanhar resultados'
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-4 text-white font-bold text-sm">
                  <div className="w-8 h-8 rounded-full bg-[#C5A059]/20 flex items-center justify-center text-[#C5A059]">
                    <Check size={16} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#contato" className="inline-flex px-10 py-5 bg-[#C5A059] text-neutral-950 text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-white transition-all shadow-2xl shadow-[#C5A059]/20">
              Quero ser Investidor
            </a>
          </div>
          <div className="flex-1 w-full relative">
            <div className="aspect-[4/5] bg-neutral-900 rounded-[3rem] overflow-hidden relative border border-white/10 shadow-2xl">
               <img src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80" alt="Investimentos" className="w-full h-full object-cover opacity-80" />
               <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent" />
               <div className="absolute bottom-10 left-10 right-10 p-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20">
                 <p className="text-[#C5A059] text-[10px] uppercase tracking-[0.3em] font-black mb-2">Transparência Total</p>
                 <p className="text-white font-bold text-lg">Acompanhe seus rendimentos em tempo real através do Portal do Investidor.</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="py-32 bg-neutral-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center mb-20">
          <EditorialLabel className="text-[#C5A059] mb-4">O que oferecemos</EditorialLabel>
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-neutral-900 mb-6">
            Nossos Serviços
          </h2>
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <Car size={32}/>, title: "Locação Premium", desc: "Veículos de alto padrão revisados e higienizados para uma experiência impecável." },
            { icon: <ShieldCheck size={32}/>, title: "Proteção Total", desc: "Seguro completo e assistência 24h para você rodar com total tranquilidade." },
            { icon: <Wrench size={32}/>, title: "Manutenção em Dia", desc: "Oficinas especializadas cuidando de cada detalhe preventivo da nossa frota." }
          ].map((srv, i) => (
            <div key={i} className="bg-white p-12 rounded-[3rem] shadow-xl shadow-neutral-200/50 hover:-translate-y-2 transition-transform duration-500 border border-neutral-100">
              <div className="w-16 h-16 bg-[#C5A059]/10 rounded-2xl flex items-center justify-center text-[#C5A059] mb-8">
                {srv.icon}
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-neutral-900 mb-4">{srv.title}</h3>
              <p className="text-neutral-500 font-light leading-relaxed">{srv.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="py-32 bg-neutral-950">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <div className="w-24 h-24 bg-[#C5A059] rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-[#C5A059]/30">
            <Phone size={40} className="text-neutral-950" />
          </div>
          <EditorialLabel className="text-[#C5A059] mb-4">Entre em Contato</EditorialLabel>
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mb-6">Fale Conosco</h2>
          <p className="text-neutral-400 font-light mb-12 text-xl">Pronto para acelerar? Entre em contato e reserve seu veículo ou agende uma reunião para conhecer o modelo de investimento.</p>
          <a
            href="https://wa.me/5579999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-4 px-12 py-6 bg-[#C5A059] text-neutral-950 text-[12px] uppercase tracking-[0.4em] font-black rounded-full hover:bg-white transition-all shadow-2xl shadow-[#C5A059]/30"
          >
            <Phone size={20} /> Whatsapp LA Locação
          </a>
        </div>
      </section>

      <footer className="bg-neutral-950 border-t border-neutral-900 py-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <span className="text-2xl font-black uppercase tracking-tighter text-white">LA</span>
            <span className="text-2xl font-black uppercase tracking-tighter text-[#C5A059] ml-1">Locação</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">© 2026 LA Locação de Veículos. Aracaju, Sergipe.</p>
          <div className="flex gap-4">
            <a href="#" className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 hover:bg-[#C5A059] hover:text-neutral-950 transition-colors">
              <Instagram size={20} />
            </a>
            <a href="#" className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 hover:bg-[#C5A059] hover:text-neutral-950 transition-colors">
              <Facebook size={20} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
