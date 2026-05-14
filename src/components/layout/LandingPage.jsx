import React from 'react';
import { ChevronDown, ChevronRight, Car, ShieldCheck, Wrench, TrendingUp, Phone, Instagram, Facebook, Check } from 'lucide-react';
import { EditorialLabel } from '../ui/EditorialLabel';

const LandingPage = ({ vehicles, onSetView, onInterest }) => {
  return (
    <>
      {/* Hero */}
      <section className="min-h-screen relative overflow-hidden flex items-center justify-center pt-20">
        {/* Background Layer */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{ backgroundImage: "url('/hero-bg-new.png')" }}
        />
        <div className="absolute inset-0 bg-neutral-950/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/50 via-transparent to-neutral-950" />
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-neutral-950 to-transparent z-10" />
        
        <div className="relative z-20 w-full max-w-6xl mx-auto px-6 md:px-12 py-20 flex flex-col items-center text-center">
          {/* Main Heading */}
          <div className="max-w-4xl mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            <h1 className="font-black uppercase tracking-tighter leading-[0.85] text-white">
              <span className="block text-5xl md:text-7xl lg:text-8xl mb-2">LA</span>
              <span className="block text-6xl md:text-8xl lg:text-9xl text-[#C5A059]" style={{ textShadow: '0 0 60px rgba(197,160,89,0.2)' }}>
                LOCAÇÃO
              </span>
            </h1>
          </div>

          {/* Separator */}
          <div className="w-16 h-[1px] bg-[#C5A059]/40 mb-10" />

          {/* Description */}
          <div className="max-w-xl mb-14 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-400">
            <p className="text-neutral-300 font-light text-base md:text-xl leading-relaxed">
              Gestão de frota inteligente e locação premium em Aracaju. 
              <span className="block mt-2 text-[#C5A059]/80 font-medium italic">Sua jornada começa com o melhor padrão de qualidade.</span>
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-6 items-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-600">
            <button
              onClick={() => {
                onSetView('fleet');
                window.scrollTo(0, 0);
              }}
              className="group relative px-12 py-5 bg-[#C5A059] text-neutral-950 text-[10px] uppercase tracking-[0.3em] font-black rounded-full overflow-hidden transition-all shadow-2xl shadow-[#C5A059]/30 hover:scale-105 active:scale-95"
            >
              <span className="relative z-10">Alugar Agora</span>
              <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </button>
            
            <button
              onClick={() => {
                onSetView('fleet');
                window.scrollTo(0, 0);
              }}
              className="px-12 py-5 bg-white/5 backdrop-blur-md text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-white/10 transition-all border border-white/20 hover:border-white/40 shadow-xl"
            >
              Conhecer Frota
            </button>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-1000 opacity-40">
            <div className="w-[1px] h-12 bg-gradient-to-b from-[#C5A059] to-transparent" />
          </div>
        </div>
      </section>

      {/* Sobre Nós */}
      <section id="sobre" className="py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            {/* Image Side */}
            <div className="flex-1 w-full relative">
              <div className="relative z-10 aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl">
                <img 
                  src="/la-inauguracao-14.jpg" 
                  alt="Inauguração LA Locação" 
                  className="w-full h-full object-cover transition-transform duration-[2000ms] hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/40 to-transparent" />
              </div>
              
              {/* Decorative background box */}
              <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-[#C5A059]/10 rounded-[3rem] -z-0 hidden lg:block" />
              
            </div>

            {/* Text Side */}
            <div className="flex-1 space-y-10">
              <div>
                <EditorialLabel className="text-[#C5A059] mb-4">A Empresa</EditorialLabel>
                <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-neutral-900 leading-[0.95] mb-8">
                  Excelência e Confiança na <span className="text-[#C5A059]">Gestão de Frotas</span>
                </h2>
                <div className="w-24 h-[2px] bg-[#C5A059]" />
              </div>

              <div className="space-y-6 text-neutral-500 font-light text-lg leading-relaxed">
                <p>
                  A <span className="font-bold text-neutral-900">LA Locação de Veículos</span> nasceu com um propósito claro: elevar o patamar da mobilidade em Aracaju através de um serviço que une transparência absoluta e veículos de alto padrão.
                </p>
                <p>
                  Operamos com um modelo de negócio inovador que beneficia tanto quem precisa de um veículo para rodar quanto quem deseja investir no mercado de frotas. Nossa curadoria rigorosa garante que cada veículo em nossa base seja um ativo de valor e segurança.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                <div className="space-y-4">
                  <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-[#C5A059]">
                    <ShieldCheck size={20} />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Garantia LA</h4>
                  <p className="text-[13px] text-neutral-400 font-medium leading-relaxed">Processos auditados e segurança jurídica em todos os contratos firmados.</p>
                </div>
                <div className="space-y-4">
                  <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-[#C5A059]">
                    <Wrench size={20} />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Manutenção Ativa</h4>
                  <p className="text-[13px] text-neutral-400 font-medium leading-relaxed">Cuidado preventivo contínuo, assegurando o valor e a performance da frota.</p>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={() => {
                    const el = document.getElementById('frota');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-6 text-neutral-900 font-black text-[10px] uppercase tracking-[0.4em] group"
                >
                  Conheça nossa frota
                  <div className="w-12 h-12 rounded-full border border-neutral-200 flex items-center justify-center group-hover:bg-neutral-900 group-hover:border-neutral-900 group-hover:text-[#C5A059] transition-all duration-500 shadow-lg group-hover:shadow-[#C5A059]/20">
                    <ChevronRight size={18} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Oportunidade Motoristas - Golden/Yellow Layout */}
      <section id="oportunidade-motoristas" className="py-32 bg-[#C5A059] relative overflow-hidden">
        {/* Decorative background elements for a premium feel */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent)]" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-black/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            
            {/* Image Side */}
            <div className="flex-[1.3] w-full order-2 lg:order-2">
              <div className="relative group">
                <div className="relative z-10 aspect-[4/3] rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/20">
                  <img 
                    src="/uber-99.png" 
                    alt="Uber e 99" 
                    className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/30 to-transparent" />
                </div>
                {/* Decorative background circle */}
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/20 rounded-full -z-0 blur-xl" />
                <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-black/10 rounded-full -z-0 blur-xl" />
              </div>
            </div>

            {/* Text Side */}
            <div className="flex-1 space-y-10 order-1 lg:order-1">
              <div className="space-y-4">
                <div className="space-y-2">
                  <EditorialLabel className="text-neutral-900/40">Uber e 99</EditorialLabel>
                  <div className="inline-flex items-center gap-3">
                    <div className="w-10 h-[2px] bg-neutral-900" />
                    <span className="text-neutral-900 text-[10px] uppercase tracking-[0.4em] font-black">Ganhe Mais Todos os Dias</span>
                  </div>
                </div>
                <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-neutral-950 leading-[0.95]">
                  A Melhor Oportunidade para <br /><span className="text-white drop-shadow-sm">Motoristas de Aplicativo</span>
                </h2>
                <p className="text-neutral-900/80 font-medium text-xl leading-relaxed">
                  Maximize seus lucros na Uber e 99 com um parceiro que entende o seu negócio. Na LA Locação, você tem carro premium e custo zero de manutenção.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {[
                  { icon: <TrendingUp />, title: "Lucratividade Superior", desc: "Sem gastos com manutenção e seguro, sobra muito mais dinheiro no seu bolso ao final da semana." },
                  { icon: <ShieldCheck />, title: "Suporte e Segurança 24h", desc: "Assistência completa e seguro total incluso. Você nunca fica na mão durante o trabalho." },
                  { icon: <Check />, title: "Aprovação Facilitada", desc: "Processo rápido e sem burocracia excessiva para você começar a faturar o quanto antes." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-6 items-start group/item">
                    <div className="shrink-0 w-12 h-12 bg-neutral-950 rounded-2xl flex items-center justify-center text-[#C5A059] shadow-xl group-hover/item:scale-110 transition-transform">
                      {React.cloneElement(item.icon, { size: 22 })}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-black uppercase tracking-tight text-neutral-950">{item.title}</h4>
                      <p className="text-neutral-900/70 font-medium text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6">
                <a 
                  href="https://wa.me/5579999999999" 
                  target="_blank" 
                  className="inline-flex items-center gap-6 px-12 py-5 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-white hover:text-neutral-950 transition-all shadow-2xl shadow-black/20 group"
                >
                  Consultar Condições
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Frota */}
      <section id="frota" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="mb-20">
            <EditorialLabel className="text-[#C5A059] mb-4">Alugue Agora</EditorialLabel>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-neutral-900 mb-6">
              Escolha seu <br/>Próximo Veículo
            </h2>
            <p className="text-neutral-500 font-light max-w-xl text-lg">
              Veículos premium revisados e prontos para você rodar hoje mesmo. Selecione o que mais combina com seu perfil.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {vehicles.filter(v => v.isFavorite).length === 0 && (
              <div className="col-span-3 text-center py-24 bg-neutral-50 rounded-[3rem] border border-neutral-100">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">Nenhum veículo em destaque no momento</p>
              </div>
            )}
            {vehicles.filter(v => v.isFavorite).map(car => (
              <div key={car.id} className="group relative bg-neutral-50 rounded-[3rem] overflow-hidden hover:shadow-2xl transition-all duration-500">
                <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                  <img 
                    src={car.image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80'} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt={car.model}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {car.status === 'Alugado' && (
                    <div className="absolute top-6 right-6 bg-neutral-900/80 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-white/20">
                      Locado
                    </div>
                  )}
                </div>
                <div className="p-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black mb-2">{car.year}</p>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-neutral-900">{car.model}</h3>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-neutral-200 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Valor Semanal</p>
                        <p className="text-xl font-black text-neutral-900">R$ {car.weeklyRental || '550,00'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onInterest(car)}
                      disabled={car.status === 'Alugado'}
                      className={`w-full py-4 text-[10px] uppercase tracking-[0.2em] font-black rounded-2xl transition-all ${
                        car.status === 'Alugado' 
                        ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed' 
                        : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-900 hover:text-white'
                      }`}
                    >
                      {car.status === 'Alugado' ? 'Indisponível' : 'Tenho Interesse'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 flex justify-center">
            <button 
              onClick={() => {
                onSetView('fleet');
                window.scrollTo(0, 0);
              }}
              className="group relative px-12 py-5 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.4em] font-black rounded-full hover:bg-[#C5A059] transition-all shadow-2xl flex items-center gap-4"
            >
              Ver toda a frota
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-black/20 transition-all">
                <ChevronRight size={14} />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Investidores - Golden/Yellow Layout */}
      <section id="investidores" className="py-32 bg-[#C5A059] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.3),transparent)]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1">
            <EditorialLabel className="text-neutral-900/40 mb-4">Seja um Parceiro</EditorialLabel>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-neutral-950 mb-8 leading-[0.9]">
              Programa de<br/><span className="text-white drop-shadow-sm">Investidores</span>
            </h2>
            <p className="text-neutral-900/80 font-medium text-lg mb-10 leading-relaxed max-w-xl">
              Rentabilize seu patrimônio com segurança. Coloque seu veículo na nossa frota e receba dividendos semanais enquanto nós cuidamos de toda a gestão, manutenção e locação.
            </p>
            <ul className="space-y-6 mb-12">
              {[
                'Gestão 100% profissional e transparente',
                'Rendimentos pagos pontualmente toda semana',
                'Seguro total e rastreamento veicular',
                'Portal exclusivo para acompanhar resultados'
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-4 text-neutral-950 font-bold text-sm">
                  <div className="w-8 h-8 rounded-full bg-neutral-950 flex items-center justify-center text-[#C5A059]">
                    <Check size={16} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#contato" className="inline-flex px-12 py-5 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-white hover:text-neutral-950 transition-all shadow-2xl shadow-black/20">
              Quero ser Investidor
            </a>
          </div>
          <div className="flex-1 w-full relative">
            <div className="aspect-[4/5] bg-neutral-900 rounded-[3rem] overflow-hidden relative border border-white/20 shadow-2xl">
               <img src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80" alt="Investimentos" className="w-full h-full object-cover opacity-80" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
               <div className="absolute bottom-10 left-10 right-10 p-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl">
                 <p className="text-[#C5A059] text-[10px] uppercase tracking-[0.3em] font-black mb-2">Transparência Total</p>
                 <p className="text-white font-bold text-lg leading-snug">Acompanhe seus rendimentos em tempo real através do Portal do Investidor.</p>
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

      {/* Contact Section - Golden/Yellow Layout */}
      <section id="contato" className="py-32 bg-[#C5A059] relative overflow-hidden">
        {/* Decorative blurs */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-black/5 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center relative z-10">
          <div className="w-24 h-24 bg-neutral-950 rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-black/20">
            <Phone size={40} className="text-[#C5A059]" />
          </div>
          <EditorialLabel className="text-neutral-900/40 mb-4">Entre em Contato</EditorialLabel>
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-neutral-950 mb-6 leading-none">Fale Conosco</h2>
          <p className="text-neutral-900/80 font-medium mb-12 text-xl leading-relaxed">Pronto para acelerar? Entre em contato e reserve seu veículo ou agende uma reunião para conhecer o modelo de investimento.</p>
          <a
            href="https://wa.me/5579999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-4 px-12 py-6 bg-neutral-950 text-white text-[12px] uppercase tracking-[0.4em] font-black rounded-full hover:bg-white hover:text-neutral-950 transition-all shadow-2xl shadow-black/20 group"
          >
            <Phone size={20} className="group-hover:scale-110 transition-transform" /> Whatsapp LA Locação
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
    </>
  );
};

export default LandingPage;
