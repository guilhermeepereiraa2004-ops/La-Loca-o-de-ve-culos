import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const Navbar = ({ onSetView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (item) => {
    setIsMobileMenuOpen(false);
    if (item === 'Frota') {
      onSetView('fleet');
      window.scrollTo(0, 0);
    } else {
      onSetView('home');
      setTimeout(() => {
        document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
      scrolled
        ? 'bg-white/90 backdrop-blur-2xl border-b border-neutral-100 shadow-sm'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 md:py-6 flex items-center justify-between">
        {/* Logo */}
        <div className="cursor-pointer flex items-center gap-2" onClick={() => { onSetView('home'); window.scrollTo(0, 0); }}>
          <span className={`text-xl md:text-2xl font-black uppercase tracking-[-0.05em] transition-colors duration-700 ${scrolled ? 'text-neutral-900' : 'text-white'}`}>LA</span>
          <span className={`text-xl md:text-2xl font-black uppercase tracking-[-0.05em] transition-colors duration-700 text-[#C5A059]`}>Locação</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-12">
          {['Frota', 'Serviços', 'Investidores', 'Contato'].map(item => (
            <button
              key={item}
              onClick={() => handleNavClick(item)}
              className={`relative text-[10px] uppercase tracking-[0.25em] font-semibold transition-colors duration-500 group ${
                scrolled ? 'text-neutral-400 hover:text-neutral-900' : 'text-white/50 hover:text-white'
              }`}
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#C5A059] group-hover:w-full transition-all duration-500" />
            </button>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-5">
          <button
            onClick={() => onSetView('admin-login')}
            className={`text-[10px] uppercase tracking-[0.2em] font-semibold transition-colors duration-500 ${
              scrolled ? 'text-neutral-300 hover:text-neutral-900' : 'text-white/30 hover:text-white/70'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => onSetView('investor-login')}
            className={`px-6 py-2.5 text-[10px] uppercase tracking-[0.25em] font-bold rounded-full transition-all duration-500 ${
              scrolled
                ? 'bg-neutral-900 text-white hover:bg-[#C5A059]'
                : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-md'
            }`}
          >
            Investidor
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          className={`md:hidden p-2 transition-colors duration-500 ${scrolled ? 'text-neutral-900' : 'text-white'}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${
        isMobileMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="bg-white/95 backdrop-blur-2xl px-6 py-8 flex flex-col gap-5 border-b border-neutral-100 shadow-lg">
          {['Frota', 'Serviços', 'Investidores', 'Contato'].map(item => (
            <button
              key={item}
              onClick={() => handleNavClick(item)}
              className="text-left text-sm uppercase tracking-[0.2em] font-bold text-neutral-800 py-2 hover:text-[#C5A059] transition-colors"
            >
              {item}
            </button>
          ))}
          <div className="h-px bg-neutral-100 my-1" />
          <button
            onClick={() => { setIsMobileMenuOpen(false); onSetView('investor-login'); }}
            className="w-full py-4 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-xl"
          >
            Portal Investidor
          </button>
          <button
            onClick={() => { setIsMobileMenuOpen(false); onSetView('admin-login'); }}
            className="w-full py-3 text-neutral-400 text-[10px] uppercase tracking-[0.3em] font-bold"
          >
            Área Restrita
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
