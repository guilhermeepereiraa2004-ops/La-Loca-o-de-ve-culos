import React, { useState } from 'react';
import { ChevronLeft, Search, Car, X, Check } from 'lucide-react';
import { EditorialLabel } from '../ui/EditorialLabel';

const FleetPage = ({ vehicles = [], onBack, onInterest }) => {
  const [search, setSearch] = useState('');

  const filteredVehicles = vehicles
    .filter(v => (v.status || '').toLowerCase() === 'disponível')
    .filter(v => v.model.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-white font-sans pb-20">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-24 md:pt-28 pb-2">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] font-black text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <ChevronLeft size={16} className="text-[#C5A059]" /> Voltar para o Início
        </button>
      </div>

      {/* Filters & Search */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100 py-3 md:py-4">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-start items-center">
          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
            <input 
              type="text" 
              placeholder="Buscar veículo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-100 p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-medium text-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* Fleet Grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-32 bg-neutral-50 rounded-[3rem] border border-neutral-100">
            <Car size={48} className="mx-auto text-neutral-200 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">Nenhum veículo encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredVehicles.map(car => (
              <div key={car.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-neutral-100 hover:border-[#C5A059]/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all duration-500 flex flex-col">
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
                      disabled={['Alugado', 'Alugado (Reserva)'].includes(car.status)}
                      className={`px-6 py-3.5 text-[9px] uppercase tracking-[0.2em] font-black rounded-xl transition-all duration-300 active:scale-95 shadow-sm ${
                        ['Alugado', 'Alugado (Reserva)'].includes(car.status)
                        ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed' 
                        : 'bg-neutral-950 text-white hover:bg-[#C5A059] hover:text-neutral-950 hover:shadow-md'
                      }`}
                    >
                      {['Alugado', 'Alugado (Reserva)'].includes(car.status) ? 'Indisponível' : 'Alugar Agora'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetPage;
