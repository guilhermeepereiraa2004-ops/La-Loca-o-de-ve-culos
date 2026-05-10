import React from 'react';
import { ChevronDown, ChevronRight, Car, ShieldCheck, Wrench, Phone, Instagram, Facebook, Check } from 'lucide-react';
import { EditorialLabel } from '../ui/EditorialLabel';

const LandingPage = ({ vehicles, onSetView, onInterest }) => {
  return (
    <>
      {/* Hero */}
      <section className="min-h-screen relative overflow-hidden flex items-center justify-center pt-20">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg-new.png')" }}
        />
        <div className="absolute inset-0 bg-neutral-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-neutral-950/50" />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12 py-28 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-8 h-[1px] bg-[#C5A059]" />
            <span className="text-[#C5A059] text-[10px] uppercase tracking-[0.4em] font-black">Locação Profissional de Veículos</span>
            <div className="w-8 h-[1px] bg-[#C5A059]" />
          </div>

          <h1 className="font-black uppercase tracking-tighter leading-none mb-6">
            <span className="block text-7xl md:text-[9rem] lg:text-[11rem] text-white drop-shadow-2xl">LA</span>
            <span className="block text-7xl md:text-[9rem] lg:text-[11rem] text-[#C5A059] drop-shadow-2xl" style={{ textShadow: '0 0 80px rgba(197,160,89,0.3)' }}>LOCAÇÃO</span>
          </h1>

          <div className="w-24 h-[2px] bg-[#C5A059]/40 mb-8" />

          <p className="text-neutral-300 font-light text-base md:text-lg max-w-xl mb-12 leading-relaxed">
            Plataforma premium de gestão de frota e locação de veículos em Aracaju.
            <span className="text-[#C5A059] font-semibold"> Conduza seus sonhos com excelência.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <a
              href="#contato"
              className="px-10 py-5 bg-[#C5A059] text-neutral-950 text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-white transition-all shadow-2xl shadow-[#C5A059]/30 min-w-[180px] text-center"
            >
              Alugar Agora
            </a>
            <button
              onClick={() => {
                onSetView('fleet');
                window.scrollTo(0, 0);
              }}
              className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-white/20 transition-all border border-white/20 min-w-[180px] text-center"
            >
              Ver Frota
            </button>
          </div>

          <div className="mt-20 flex flex-col items-center gap-2 animate-bounce opacity-50">
            <span className="text-[8px] uppercase tracking-[0.3em] text-white font-bold">Explorar</span>
            <ChevronDown size={16} className="text-[#C5A059]" />
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
              Conheça nossa seleção de veículos premium em destaque na nossa frota.
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
    </>
  );
};

export default LandingPage;
