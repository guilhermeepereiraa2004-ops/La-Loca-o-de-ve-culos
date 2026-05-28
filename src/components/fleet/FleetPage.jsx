import React, { useState } from 'react';
import { ChevronLeft, Search, Car, X, Check } from 'lucide-react';
import { EditorialLabel } from '../ui/EditorialLabel';

const FleetPage = ({ vehicles = [], onBack, onInterest }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.model.toLowerCase().includes(search.toLowerCase()) || 
                          v.plate.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'todos' || v.status.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-white font-sans pb-20">
      {/* Header */}
      <header className="bg-neutral-950 text-white pt-28 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] font-black text-[#C5A059] hover:text-white transition-colors mb-8"
          >
            <ChevronLeft size={16} /> Voltar para o Início
          </button>
          <EditorialLabel className="text-[#C5A059] mb-4">Escolha seu Veículo</EditorialLabel>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6">Alugue <span className="text-[#C5A059]">Agora</span></h1>
          <p className="text-neutral-400 font-light max-w-xl text-lg">
            Encontre o carro ideal para seu trabalho ou lazer. Locação simplificada com o padrão LA Locação.
          </p>
        </div>
      </header>

      {/* Filters & Search */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100 py-6">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
            <input 
              type="text" 
              placeholder="Buscar modelo ou placa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-100 p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 font-medium text-sm transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {['todos', 'disponível', 'alugado'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-3 rounded-full text-[9px] uppercase tracking-[0.2em] font-black border transition-all whitespace-nowrap ${
                  filter === f 
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-lg' 
                    : 'bg-white text-neutral-400 border-neutral-100 hover:border-neutral-200'
                }`}
              >
                {f}
              </button>
            ))}
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
              <div key={car.id} className="group relative bg-neutral-50 rounded-[3rem] overflow-hidden hover:shadow-2xl transition-all duration-500">
                <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                  <img 
                    src={car.image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80'} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt={car.model}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                   <div className={`absolute top-6 right-6 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-white/20 ${
                    car.status === 'Disponível' 
                      ? 'bg-emerald-500/80' 
                      : (car.status === 'Alugado' || car.status === 'Alugado (Reserva)')
                        ? 'bg-amber-500/80'
                        : 'bg-red-500/80'
                  }`}>
                    {car.status}
                  </div>
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
                      disabled={['Alugado', 'Alugado (Reserva)'].includes(car.status)}
                      className={`w-full py-4 text-[10px] uppercase tracking-[0.2em] font-black rounded-2xl transition-all ${
                        ['Alugado', 'Alugado (Reserva)'].includes(car.status)
                        ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed' 
                        : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-900 hover:text-white'
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
