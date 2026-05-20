import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Navbar = ({ onSetView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 md:py-5 flex items-center justify-between">
        <div className="cursor-pointer" onClick={() => onSetView('home')}>
          <span className="text-xl md:text-2xl font-black uppercase tracking-tighter text-neutral-900">LA</span>
          <span className="text-xl md:text-2xl font-black uppercase tracking-tighter text-[#C5A059] ml-1">Locação</span>
        </div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-10">
          {['Frota', 'Serviços', 'Investidores', 'Contato'].map(item => (
            <button 
              key={item} 
              onClick={() => handleNavClick(item)}
              className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <button onClick={() => onSetView('admin-login')} className="text-[10px] uppercase tracking-widest font-black text-neutral-400 hover:text-neutral-900 transition-colors">
            Admin
          </button>
          <button
            onClick={() => onSetView('investor-login')}
            className="px-6 py-3 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-[#C5A059] transition-all shadow-lg"
          >
            Portal Investidor
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-neutral-900"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-100 px-6 py-8 flex flex-col gap-6 shadow-xl animate-in slide-in-from-top-4 duration-300">
          {['Frota', 'Serviços', 'Investidores', 'Contato'].map(item => (
            <button 
              key={item} 
              onClick={() => handleNavClick(item)}
              className="text-sm uppercase tracking-[0.3em] font-black text-neutral-900 text-left py-2"
            >
              {item}
            </button>
          ))}
          <div className="h-[1px] bg-neutral-100 w-full my-2" />
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => { setIsMobileMenuOpen(false); onSetView('investor-login'); }}
              className="w-full py-4 bg-[#C5A059] text-white text-[11px] uppercase tracking-[0.3em] font-black rounded-xl text-center"
            >
              Portal Investidor
            </button>
            <button 
              onClick={() => { setIsMobileMenuOpen(false); onSetView('admin-login'); }} 
              className="w-full py-4 bg-neutral-100 text-neutral-500 text-[11px] uppercase tracking-[0.3em] font-black rounded-xl text-center"
            >
              Área Restrita (Admin)
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
