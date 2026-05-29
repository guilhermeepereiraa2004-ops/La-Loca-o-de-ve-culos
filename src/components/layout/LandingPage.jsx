import React, { useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Car, ShieldCheck, Wrench, TrendingUp, Phone, Instagram, Check, ArrowRight, MapPin } from 'lucide-react';
import '../../styles/landing-animations.css';

/* ── Scroll-reveal hook ─────────────────────────────────────── */
const useReveal = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('visible'); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
};

const Reveal = ({ children, className = '', delay = '' }) => {
  const ref = useReveal();
  return <div ref={ref} className={`reveal ${delay} ${className}`}>{children}</div>;
};

/* ── Section Label ──────────────────────────────────────────── */
const Label = ({ children, light }) => (
  <div className={`flex items-center gap-3 mb-6 ${light ? 'text-white/40' : 'text-neutral-300'}`}>
    <div className={`w-8 h-px ${light ? 'bg-white/20' : 'bg-[#C5A059]'}`} />
    <span className="text-[10px] uppercase tracking-[0.35em] font-semibold">{children}</span>
  </div>
);

/* ══════════════════════════════════════════════════════════════ */
const LandingPage = ({ vehicles, onSetView, onInterest }) => {
  return (
    <>
      {/* ═══ HERO ═══════════════════════════════════════════════ */}
      <section className="min-h-screen relative overflow-hidden flex items-end pb-20 md:pb-28 pt-32">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110" style={{ backgroundImage: "url('/hero-bg-new.png')" }} />
        <div className="absolute inset-0 bg-neutral-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-neutral-950/80 to-transparent" />

        <div className="relative z-20 w-full max-w-7xl mx-auto px-6 md:px-12">
          <div className="max-w-3xl">
            <Reveal>
              <img src="/logo.png" className="h-16 md:h-24 w-auto object-contain mb-8" alt="LA Locação de Veículos" />
            </Reveal>
            <Reveal delay="reveal-delay-1">
              <Label light>Locação Premium em Aracaju</Label>
            </Reveal>
            <Reveal delay="reveal-delay-2">
              <h1 className="font-black uppercase tracking-[-0.04em] leading-[0.88] text-white mb-8">
                <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem]">Dirija o</span>
                <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] text-shine mt-1">Futuro Hoje</span>
              </h1>
            </Reveal>
            <Reveal delay="reveal-delay-3">
              <p className="text-white/50 font-light text-lg md:text-xl leading-relaxed max-w-lg mb-12">
                Veículos de alto padrão, gestão transparente e rendimentos para investidores. Tudo em uma só plataforma.
              </p>
            </Reveal>
            <Reveal delay="reveal-delay-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => { onSetView('fleet'); window.scrollTo(0, 0); }}
                  className="group px-10 py-4 bg-[#C5A059] text-neutral-950 text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:shadow-[0_0_40px_rgba(197,160,89,0.3)] transition-all duration-500 flex items-center justify-center gap-3"
                >
                  Ver Frota
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => document.getElementById('investidores')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-10 py-4 text-white/60 text-[10px] uppercase tracking-[0.3em] font-semibold rounded-full border border-white/10 hover:border-white/30 hover:text-white transition-all duration-500"
                >
                  Seja Investidor
                </button>
              </div>
            </Reveal>
          </div>

          {/* Scroll hint */}
          <div className="absolute bottom-8 right-12 hidden md:flex flex-col items-center float-down">
            <ChevronDown size={18} className="text-white/30" />
          </div>
        </div>
      </section>

      {/* ═══ SOBRE NÓS ═════════════════════════════════════════ */}
      <section id="sobre" className="py-24 md:py-36 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-28">
            <Reveal className="flex-1 w-full relative">
              <div className="relative z-10 aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                <img src="/la-inauguracao-14.jpg" alt="Inauguração LA Locação" className="w-full h-full object-cover transition-transform duration-[2500ms] hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/30 to-transparent" />
              </div>
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-[#C5A059]/8 rounded-3xl hidden lg:block" />
            </Reveal>

            <div className="flex-1 space-y-8">
              <Reveal>
                <Label>A Empresa</Label>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-[-0.03em] text-neutral-900 leading-[0.95]">
                  Excelência na <span className="text-[#C5A059]">Gestão de Frotas</span>
                </h2>
              </Reveal>
              <Reveal delay="reveal-delay-1">
                <div className="w-16 h-px bg-[#C5A059]" />
              </Reveal>
              <Reveal delay="reveal-delay-2">
                <p className="text-neutral-400 font-light text-base leading-[1.8]">
                  A <span className="font-semibold text-neutral-700">LA Locação de Veículos</span> nasceu para elevar o patamar da mobilidade em Aracaju. Unimos transparência absoluta, veículos de alto padrão e um modelo de negócio que beneficia motoristas e investidores.
                </p>
              </Reveal>
              <Reveal delay="reveal-delay-3">
                <div className="grid grid-cols-2 gap-6 pt-4">
                  {[
                    { icon: <ShieldCheck size={18} />, title: 'Garantia LA', desc: 'Segurança jurídica em todos os contratos.' },
                    { icon: <Wrench size={18} />, title: 'Manutenção', desc: 'Cuidado preventivo contínuo da frota.' }
                  ].map((item, i) => (
                    <div key={i} className="space-y-3">
                      <div className="w-10 h-10 bg-neutral-950 rounded-xl flex items-center justify-center text-[#C5A059]">{item.icon}</div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-900">{item.title}</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MOTORISTAS ═════════════════════════════════════════ */}
      <section id="oportunidade-motoristas" className="py-24 md:py-36 bg-neutral-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(197,160,89,0.06),transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            <div className="flex-1 order-2 lg:order-1">
              <Reveal>
                <Label light>Uber & 99</Label>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-[-0.03em] text-white leading-[0.95] mb-6">
                  Oportunidade para <span className="text-[#C5A059]">Motoristas</span>
                </h2>
              </Reveal>
              <Reveal delay="reveal-delay-1">
                <p className="text-white/40 font-light text-base leading-[1.8] mb-10 max-w-lg">
                  Maximize seus lucros com carro premium e custo zero de manutenção. Assistência completa e aprovação facilitada.
                </p>
              </Reveal>
              <div className="space-y-6 mb-10">
                {[
                  { icon: <TrendingUp size={18} />, title: 'Lucratividade Superior', desc: 'Sem gastos com manutenção, sobra mais no bolso.' },
                  { icon: <ShieldCheck size={18} />, title: 'Suporte 24h', desc: 'Seguro total e assistência completa inclusa.' },
                  { icon: <Check size={18} />, title: 'Aprovação Rápida', desc: 'Processo simples para começar a faturar.' }
                ].map((item, i) => (
                  <Reveal key={i} delay={`reveal-delay-${i + 2}`}>
                    <div className="flex gap-5 items-start group">
                      <div className="shrink-0 w-11 h-11 bg-[#C5A059]/10 rounded-xl flex items-center justify-center text-[#C5A059] group-hover:bg-[#C5A059]/20 transition-colors">{item.icon}</div>
                      <div>
                        <h4 className="text-sm font-bold text-white mb-0.5">{item.title}</h4>
                        <p className="text-xs text-white/35 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
              <Reveal delay="reveal-delay-5">
                <button
                  onClick={() => { onSetView('fleet'); window.scrollTo(0, 0); }}
                  className="inline-flex items-center gap-3 px-10 py-4 bg-[#C5A059] text-neutral-950 text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:shadow-[0_0_40px_rgba(197,160,89,0.3)] transition-all duration-500"
                >
                  Alugue agora <ArrowRight size={14} />
                </button>
              </Reveal>
            </div>

            <Reveal className="flex-1 w-full order-1 lg:order-2">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                <img src="/uber-99.png" alt="Uber e 99" className="w-full h-full object-cover transition-transform duration-[2500ms] hover:scale-105" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ FROTA ══════════════════════════════════════════════ */}
      <section id="frota" className="py-24 md:py-36 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <Reveal>
            <Label>Alugue Agora</Label>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-[-0.03em] text-neutral-900 mb-4">
              Escolha seu Veículo
            </h2>
            <p className="text-neutral-400 font-light max-w-lg text-base mb-16">
              Veículos revisados e prontos para rodar. Selecione o que mais combina com seu perfil.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vehicles.filter(v => v.isFavorite).length === 0 && (
              <div className="col-span-3 text-center py-20 bg-neutral-50 rounded-2xl border border-neutral-100">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-300">Nenhum veículo em destaque</p>
              </div>
            )}
            {vehicles.filter(v => v.isFavorite).map((car, i) => {
              const isRented = car.status === 'Alugado' || car.status === 'Alugado (Reserva)';
              return (
                <Reveal key={car.id} delay={`reveal-delay-${Math.min(i + 1, 3)}`}>
                  <div className="group bg-white rounded-[2.5rem] overflow-hidden border border-neutral-100 hover:border-[#C5A059]/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all duration-500 flex flex-col">
                    <div className="aspect-[4/3] bg-neutral-50 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={car.image || '/logo.png'}
                        className={`transition-transform duration-1000 group-hover:scale-105 ${
                          !car.image 
                            ? 'h-24 w-auto object-contain p-4' 
                            : 'w-full h-full object-cover'
                        }`}
                        alt={car.model}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      {isRented && (
                        <div className="absolute top-5 right-5 backdrop-blur-md bg-neutral-900/80 text-white text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-white/20 shadow-sm">
                          Locado
                        </div>
                      )}
                    </div>
                    <div className="p-8 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.25em] text-[#C5A059] font-black mb-1.5">{car.year}</p>
                        <h3 className="text-xl font-black uppercase tracking-tight text-neutral-900 group-hover:text-[#C5A059] transition-colors duration-300">{car.model}</h3>
                      </div>
                      <div className="pt-6 border-t border-neutral-100 mt-6 flex items-center justify-between">
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-neutral-400 font-bold">Valor Semanal</p>
                          <p className="text-lg font-black text-neutral-900">R$ {car.weeklyRental || '550'}</p>
                        </div>
                        <button
                          onClick={() => onInterest(car)}
                          disabled={isRented}
                          className={`px-6 py-3.5 text-[9px] uppercase tracking-[0.2em] font-black rounded-xl transition-all duration-300 active:scale-95 shadow-sm ${
                            isRented
                              ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                              : 'bg-neutral-950 text-white hover:bg-[#C5A059] hover:text-neutral-950 hover:shadow-md'
                          }`}
                        >
                          {isRented ? 'Indisponível' : 'Interesse'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal className="mt-16 flex justify-center">
            <button
              onClick={() => { onSetView('fleet'); window.scrollTo(0, 0); }}
              className="group px-10 py-4 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-bold rounded-full hover:bg-[#C5A059] hover:text-neutral-950 transition-all duration-500 flex items-center gap-3"
            >
              Ver toda a frota <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Reveal>
        </div>
      </section>

      {/* ═══ INVESTIDORES ═══════════════════════════════════════ */}
      <section id="investidores" className="py-24 md:py-36 bg-neutral-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(197,160,89,0.05),transparent_60%)]" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1">
            <Reveal>
              <Label light>Seja um Parceiro</Label>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-[-0.03em] text-white mb-8 leading-[0.95]">
                Programa de <span className="text-[#C5A059]">Investidores</span>
              </h2>
            </Reveal>
            <Reveal delay="reveal-delay-1">
              <p className="text-white/40 font-light text-base leading-[1.8] mb-10 max-w-xl">
                Rentabilize seu patrimônio com segurança. Coloque seu veículo na nossa frota e receba dividendos semanais.
              </p>
            </Reveal>
            <div className="space-y-4 mb-10">
              {['Gestão 100% profissional e transparente', 'Rendimentos pagos toda semana', 'Seguro total e rastreamento', 'Portal exclusivo de acompanhamento'].map((item, i) => (
                <Reveal key={i} delay={`reveal-delay-${i + 2}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-7 h-7 rounded-full bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059]"><Check size={14} /></div>
                    <span className="text-sm text-white/70 font-medium">{item}</span>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay="reveal-delay-5">
              <button onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })} className="px-10 py-4 bg-[#C5A059] text-neutral-950 text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:shadow-[0_0_40px_rgba(197,160,89,0.3)] transition-all duration-500">
                Quero Investir
              </button>
            </Reveal>
          </div>
          <Reveal className="flex-1 w-full">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden relative border border-white/5 shadow-2xl">
              <img src="/investidor.jpg" alt="Investimentos" className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-950/10 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
                <p className="text-[#C5A059] text-[9px] uppercase tracking-[0.3em] font-bold mb-2">Transparência Total</p>
                <p className="text-white/80 font-medium text-sm leading-snug">Acompanhe rendimentos em tempo real pelo Portal do Investidor.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ SERVIÇOS ═══════════════════════════════════════════ */}
      <section id="servicos" className="py-24 md:py-36 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <Reveal className="text-center mb-16">
            <Label>O que oferecemos</Label>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-[-0.03em] text-neutral-900">Nossos Serviços</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Car size={28} />, title: 'Locação Premium', desc: 'Veículos revisados e higienizados para uma experiência impecável.' },
              { icon: <ShieldCheck size={28} />, title: 'Proteção Total', desc: 'Seguro completo e assistência 24h para total tranquilidade.' },
              { icon: <Wrench size={28} />, title: 'Manutenção', desc: 'Oficinas especializadas cuidando de cada detalhe da frota.' }
            ].map((srv, i) => (
              <Reveal key={i} delay={`reveal-delay-${i + 1}`}>
                <div className="bg-white p-10 rounded-2xl border border-neutral-100 hover:border-[#C5A059]/20 hover:shadow-lg transition-all duration-500 group">
                  <div className="w-14 h-14 bg-neutral-950 rounded-2xl flex items-center justify-center text-[#C5A059] mb-7 group-hover:scale-105 transition-transform">{srv.icon}</div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-neutral-900 mb-3">{srv.title}</h3>
                  <p className="text-neutral-400 font-light text-sm leading-relaxed">{srv.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═════════════════════════════════════════════ */}
      <footer className="bg-neutral-950 border-t border-white/5 pt-16 pb-8 text-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-12 border-b border-white/5">
            {/* Column 1: Brand & Slogan */}
            <div className="space-y-4 md:col-span-2 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="text-xl font-black uppercase tracking-[-0.03em] text-white">LA</span>
                <span className="text-xl font-black uppercase tracking-[-0.03em] text-[#C5A059]">Locação</span>
              </div>
              <p className="text-xs text-white/40 font-light leading-relaxed max-w-sm mx-auto md:mx-0">
                Referência em locação de veículos premium e gestão profissional de frotas em Aracaju/SE. Transparência para motoristas e alta rentabilidade para investidores.
              </p>
            </div>

            {/* Column 2: Navigation Links */}
            <div className="space-y-4 flex flex-col items-center md:items-start text-center md:text-left">
              <h4 className="text-[10px] uppercase tracking-[0.25em] font-black text-white">Links Rápidos</h4>
              <ul className="space-y-2.5 text-xs text-white/40 font-medium flex flex-col items-center md:items-start">
                <li>
                  <button 
                    onClick={() => { onSetView('fleet'); window.scrollTo(0, 0); }}
                    className="hover:text-[#C5A059] transition-colors"
                  >
                    Nossa Frota
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' })}
                    className="hover:text-[#C5A059] transition-colors"
                  >
                    Nossos Serviços
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => document.getElementById('investidores')?.scrollIntoView({ behavior: 'smooth' })}
                    className="hover:text-[#C5A059] transition-colors"
                  >
                    Seja Investidor
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Contact & Location */}
            <div className="space-y-4 flex flex-col items-center md:items-start text-center md:text-left">
              <h4 className="text-[10px] uppercase tracking-[0.25em] font-black text-white">Contato</h4>
              <ul className="space-y-3 text-xs text-white/40 font-light flex flex-col items-center md:items-start">
                <li className="flex items-start gap-2.5 justify-center md:justify-start">
                  <MapPin size={14} className="text-[#C5A059] shrink-0 mt-0.5" />
                  <span>Aracaju, Sergipe</span>
                </li>
                <li className="flex items-center gap-2.5 justify-center md:justify-start">
                  <Phone size={14} className="text-[#C5A059] shrink-0" />
                  <a href="https://wa.me/5579999094631" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    (79) 99990-94631
                  </a>
                </li>
                <li className="pt-2 flex justify-center md:justify-start">
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-[#C5A059] text-white/40 hover:text-neutral-950 transition-all duration-300 flex items-center justify-center border border-white/5">
                    <Instagram size={15} />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Tier */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-white/30 font-medium">
            <p>© 2026 LA Locação. Todos os direitos reservados.</p>
            <p className="flex items-center gap-1">
              Desenvolvido por 
              <a 
                href="https://www.grpsantana.com.br/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#C5A059] hover:underline font-black uppercase tracking-wider"
              >
                Grupo Santana
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
