import { Plus, Search, Pencil, Power, PowerOff, Trash2, Car, Star, AlertTriangle } from 'lucide-react';

const AdminFrota = ({
  vehicles,
  inspections = [],
  vehicleSearch,
  setVehicleSearch,
  vehicleStatusFilter,
  setVehicleStatusFilter,
  onViewVehicleDetail,
  onUpdateVehicle,
  setIsEditing,
  setShowAddForm,
  setVehicleForm,
  setSelectedVehicle,
  setItemToDelete,
  setDeleteType,
  setShowDeleteAuthModal,
  resetVehicleForm,
  onGoToVistorias
}) => {
  const filteredVehicles = vehicles.filter(car => {
    const searchLower = (vehicleSearch || '').toLowerCase();
    const matchesSearch = (car.model || '').toLowerCase().includes(searchLower) ||
      (car.plate || '').toLowerCase().includes(searchLower);
    const matchesStatus = vehicleStatusFilter === 'Todos' || car.status === vehicleStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
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
        {filteredVehicles.length > 0 ? (
          filteredVehicles.map((car) => {
            const hasColeta = inspections.some(ins => ins.vehiclePlate === car.plate && ins.type === 'Coleta');

            return (
              <div key={car.id} className="group bg-white rounded-[2.5rem] border border-neutral-100 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-[#C5A059]/10 transition-all duration-500 hover:-translate-y-2 relative">
                
                {/* Coleta Alert */}
                {!hasColeta && (
                  <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 w-[90%]">
                    <button 
                      onClick={() => onGoToVistorias({ vehiclePlate: car.plate, type: 'Coleta' })}
                      className="w-full py-2 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center justify-center gap-2 animate-bounce border-2 border-white"
                    >
                      <AlertTriangle size={12} /> Realizar Vistoria de Coleta
                    </button>
                  </div>
                )}

                <div className="aspect-[16/9] relative overflow-hidden">
                  <img src={car.image} alt={car.model} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  
                  {/* Favorite Toggle */}
                  <button
                    onClick={() => {
                      const favoritesCount = vehicles.filter(v => v.isFavorite).length;
                      if (!car.isFavorite && favoritesCount >= 4) {
                        alert('Você só pode definir até 4 veículos como favoritos.');
                        return;
                      }
                      onUpdateVehicle({ ...car, isFavorite: !car.isFavorite });
                    }}
                    className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      car.isFavorite 
                        ? 'bg-[#C5A059] text-white shadow-lg' 
                        : 'bg-white/20 backdrop-blur-md text-white hover:bg-white/40'
                    }`}
                    title={car.isFavorite ? 'Remover dos Favoritos' : 'Definir como Favorito'}
                  >
                    <Star size={18} fill={car.isFavorite ? 'currentColor' : 'none'} />
                  </button>

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
                            investorTax: car.investorTax || (100 - (parseFloat(car.adminTax) || 15)).toString(),
                            hasProtection: car.hasProtection !== undefined ? car.hasProtection : (car.protectionValue ? true : false),
                            protectionCompany: car.protectionCompany || '',
                            protectionPaymentDate: car.protectionPaymentDate || new Date().toISOString().split('T')[0],
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
                      <p className="text-sm font-black text-neutral-900">
                        {car.fipeValue ? 
                          (typeof car.fipeValue === 'string' ? parseFloat(car.fipeValue.replace(/\./g, '').replace(',', '.')) : car.fipeValue)
                            .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                          : 'Sob Consulta'}
                      </p>
                    </div>
                  </div>

                  {car.investmentValue && (
                    <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                      <p className="text-[9px] uppercase tracking-widest text-emerald-600 font-black">Investimento Motorista</p>
                      <p className="text-xs font-black text-emerald-700">
                        {(typeof car.investmentValue === 'string' ? parseFloat(car.investmentValue.replace(/\./g, '').replace(',', '.')) : car.investmentValue)
                          .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
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
            );
          })
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
  );
};

export default AdminFrota;
