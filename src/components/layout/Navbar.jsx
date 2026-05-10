import React from 'react';

const Navbar = ({ onSetView }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
        <div className="cursor-pointer" onClick={() => onSetView('home')}>
          <span className="text-2xl font-black uppercase tracking-tighter text-neutral-900">LA</span>
          <span className="text-2xl font-black uppercase tracking-tighter text-[#C5A059] ml-1">Locação</span>
        </div>
        <div className="hidden md:flex items-center gap-10">
          {['Frota', 'Serviços', 'Investidores', 'Contato'].map(item => (
            <button 
              key={item} 
              onClick={() => {
                if (item === 'Frota') {
                  onSetView('fleet');
                  window.scrollTo(0, 0);
                } else {
                  onSetView('home');
                  setTimeout(() => {
                    document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
              className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 md:gap-6">
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
      </div>
    </nav>
  );
};

export default Navbar;
