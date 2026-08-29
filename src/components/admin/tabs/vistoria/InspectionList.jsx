import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Eye, Calendar, Car, AlertTriangle, X, ShieldCheck, Camera, Activity, UserCheck } from 'lucide-react';

const ITEMS_PER_PAGE = 12;

const InspectionList = ({ inspections = [], vehicles = [], rentals = [], onDeleteInspection, onViewDetail, onNewInspection }) => {
  const [inspectionSearch, setInspectionSearch] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [filterInspector, setFilterInspector] = useState('Todos');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const getDriverForInspection = (ins) => {
    if (ins.driverName) return ins.driverName;

    const insDateStr = ins.date;
    if (insDateStr) {
      const matchingRental = rentals.find(r => {
        const plate = r.vehiclePlate || r.plate;
        if ((plate || '').replace('-', '').toUpperCase() !== (ins.vehiclePlate || '').replace('-', '').toUpperCase()) return false;
        
        const start = r.startDate;
        const end = r.endDate;
        
        const afterStart = start ? (insDateStr >= start) : true;
        const beforeEnd = end ? (insDateStr <= end) : true;
        
        return afterStart && beforeEnd;
      });
      if (matchingRental) {
        return matchingRental.userName || matchingRental.user;
      }
    }

    return 'Condutor N/I';
  };

  const totalPhotos = useMemo(() => {
    let count = 0;
    inspections.forEach(ins => {
      if (ins.photos) {
        Object.entries(ins.photos).forEach(([key, val]) => {
          if (key === 'additional' && Array.isArray(val)) {
            count += val.length;
          } else if (key !== 'additional' && val) {
            count += 1;
          }
        });
      }
    });
    return count;
  }, [inspections]);

  const inspectorNames = useMemo(() => {
    const names = new Set();
    inspections.forEach(ins => {
      if (ins.inspectorName && ins.inspectorName !== 'Sistema') {
        names.add(ins.inspectorName);
      }
    });
    return ['Todos', ...Array.from(names).sort()];
  }, [inspections]);

  const filteredInspections = useMemo(() => {
    return inspections.filter(ins => {
      // Exclude Coleta inspections for exempt vehicles (current fleet)
      if (ins.type === 'Coleta') {
        const vehicle = vehicles.find(v => (v.plate || '').replace('-', '').toUpperCase() === (ins.vehiclePlate || '').replace('-', '').toUpperCase());
        const isExempt = vehicle 
          ? (!vehicle.createdAt || new Date(vehicle.createdAt) < new Date('2026-05-30T00:00:00Z'))
          : true;
        if (isExempt) return false;
      }

      const conductorName = (getDriverForInspection(ins) || '').toLowerCase();
      
      const searchLower = inspectionSearch.toLowerCase();
      const cleanSearch = searchLower.replace(/[^a-z0-9]/g, '');
      const cleanPlate = (ins.vehiclePlate || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
      
      const matchesSearch = cleanPlate.includes(cleanSearch) ||
                           ins.type.toLowerCase().includes(searchLower) ||
                           conductorName.includes(searchLower);
                           
      const matchesType = filterType === 'Todos' || ins.type === filterType;
      const matchesInspector = filterInspector === 'Todos' || (ins.inspectorName || 'Sistema') === filterInspector;
      
      let matchesDate = true;
      if (dateStart || dateEnd) {
        const insDate = new Date(ins.date);
        if (dateStart) {
          const start = new Date(dateStart);
          if (insDate < start) matchesDate = false;
        }
        if (dateEnd) {
          const end = new Date(dateEnd);
          if (insDate > end) matchesDate = false;
        }
      }
      
      return matchesSearch && matchesType && matchesDate && matchesInspector;
    });
  }, [inspections, inspectionSearch, filterType, filterInspector, dateStart, dateEnd, vehicles, rentals]);

  const sortedInspections = useMemo(() => {
    return [...filteredInspections].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      const timeA = a.time || '';
      const timeB = b.time || '';
      if (timeA !== timeB) {
        return timeB.localeCompare(timeA);
      }
      const createdA = a.createdAt || a.id || '';
      const createdB = b.createdAt || b.id || '';
      return createdB.localeCompare(createdA);
    });
  }, [filteredInspections]);

  const alerts = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    return vehicles
      .filter(v => v.status === 'Alugado' || v.status === 'Alugado (Reserva)')
      .map(v => {
        const normalizedPlate = (v.plate || '').replace(/-/g, '').toUpperCase();
        const recentPeriodicInspections = inspections.filter(ins => 
          (ins.vehiclePlate || '').replace(/-/g, '').toUpperCase() === normalizedPlate && 
          ins.type === 'Periódica' && 
          new Date(ins.date) >= thirtyDaysAgo
        );
        
        if (recentPeriodicInspections.length < 2) {
          return {
            plate: v.plate,
            model: v.model,
            count: recentPeriodicInspections.length
          };
        }
        return null;
      })
      .filter(alert => alert !== null);
  }, [vehicles, inspections]);

  // Paginated view
  const visibleInspections = sortedInspections.slice(0, visibleCount);
  const hasMore = visibleCount < sortedInspections.length;

  const handleConfirmDelete = () => {
    if (passwordInput === 'Lareferencia') {
      onDeleteInspection(targetDeleteId);
      setShowPasswordModal(false);
      setPasswordInput('');
      setTargetDeleteId(null);
    } else {
      alert('Senha incorreta!');
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-12">
        <div className="flex-1">
          <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter">Vistorias Técnicas</h3>
          <p className="text-neutral-400 text-sm font-light mt-1">Checklist de entrada, saída e manutenções preventivas.</p>
          
          <div className="mt-8 bg-neutral-50/80 border border-neutral-200/60 rounded-2xl p-6 inline-block shadow-sm">
            <h4 className="text-[10px] font-black text-[#C5A059] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Activity size={14} /> Visão Geral da Base
            </h4>
            <div className="flex gap-10">
              <div>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={10} /> Vistorias Realizadas</p>
                <p className="text-2xl font-black text-neutral-900 mt-1">
                  {inspections.length}
                </p>
              </div>
              <div className="w-px bg-neutral-200"></div>
              <div>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5"><Camera size={10} /> Total de Fotos Acervo</p>
                <p className="text-2xl font-black text-blue-600 mt-1">
                  {totalPhotos}
                </p>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onNewInspection}
          className="w-full sm:w-auto flex items-center justify-center gap-3 bg-neutral-900 text-white px-8 py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] font-black hover:bg-[#C5A059] transition-all shadow-xl shadow-neutral-900/10"
        >
          <Plus size={16} /> Nova Vistoria
        </button>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-8 md:mb-12 p-6 md:p-8 bg-amber-50 rounded-[1.5rem] md:rounded-[2.5rem] border border-amber-100 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 animate-in slide-in-from-top-4 duration-500">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 shrink-0">
            <AlertTriangle size={28} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black uppercase tracking-widest text-amber-900 mb-1">Alertas de Vistoria Periódica</h4>
            <p className="text-xs text-amber-700/70 font-medium">Os veículos abaixo estão alugados e possuem menos de 2 vistorias periódicas nos últimos 30 dias.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {alerts.map(alert => (
                <div key={alert.plate} className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-amber-200 flex items-center gap-3">
                  <span className="text-[10px] font-black text-amber-900 uppercase">{alert.plate}</span>
                  <div className="w-px h-3 bg-amber-200" />
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tight">{alert.count === 0 ? 'Nenhuma' : 'Apenas 1'} Realizada</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col lg:flex-row items-center gap-4 mb-8">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por placa ou tipo..."
            value={inspectionSearch}
            onChange={(e) => { setInspectionSearch(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
            className="w-full bg-white border border-neutral-100 pl-12 pr-4 py-3 rounded-2xl text-sm focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-medium"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <select 
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
            className="w-full sm:w-auto bg-white border border-neutral-100 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#C5A059]/20 outline-none"
          >
            <option value="Todos">Todos os Tipos</option>
            <option value="Entrega">Entrega</option>
            <option value="Coleta">Coleta</option>
            <option value="Periódica">Periódica</option>
            <option value="Devolução">Devolução</option>
          </select>

          <select 
            value={filterInspector}
            onChange={(e) => { setFilterInspector(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
            className="w-full sm:w-auto bg-white border border-neutral-100 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#C5A059]/20 outline-none"
          >
            {inspectorNames.map(name => (
              <option key={name} value={name}>{name === 'Todos' ? 'Todos Vistoriadores' : name}</option>
            ))}
          </select>

          <div className="flex items-center justify-between sm:justify-start gap-2 bg-white border border-neutral-100 px-3 py-2 rounded-2xl w-full sm:w-auto overflow-x-auto">
            <Calendar size={14} className="text-neutral-400 shrink-0" />
            <input 
              type="date" 
              value={dateStart}
              onChange={(e) => { setDateStart(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
              className="bg-transparent border-none text-[9px] font-bold outline-none uppercase min-w-[90px]"
            />
            <span className="text-neutral-300 text-[10px] shrink-0">até</span>
            <input 
              type="date" 
              value={dateEnd}
              onChange={(e) => { setDateEnd(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
              className="bg-transparent border-none text-[9px] font-bold outline-none uppercase min-w-[90px]"
            />
          </div>

          {(filterType !== 'Todos' || filterInspector !== 'Todos' || dateStart || dateEnd) && (
            <button 
              onClick={() => { setFilterType('Todos'); setFilterInspector('Todos'); setDateStart(''); setDateEnd(''); setVisibleCount(ITEMS_PER_PAGE); }}
              className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center self-end sm:self-auto"
              title="Limpar Filtros"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {visibleInspections.map((ins) => (
          <div key={ins.id} className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-neutral-100 p-6 md:p-8 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                ins.type === 'Entrega' ? 'bg-emerald-50 text-emerald-600' :
                ins.type === 'Devolução' ? 'bg-blue-50 text-blue-600' :
                ins.type === 'Coleta' ? 'bg-amber-50 text-amber-600' : 'bg-neutral-50 text-neutral-600'
              }`}>
                {ins.type}
              </div>
              {onDeleteInspection && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setTargetDeleteId(ins.id);
                    setShowPasswordModal(true);
                  }} 
                  className="text-neutral-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-neutral-950 rounded-2xl flex items-center justify-center text-[#C5A059] shadow-lg">
                <Car size={24} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-xl font-black text-neutral-900 uppercase tracking-tighter">{ins.vehiclePlate}</h4>
                  {ins.type === 'Entrega' || ins.type === 'Devolução' ? (
                    <span className="px-2 py-0.5 bg-neutral-900 text-white text-[7px] font-black uppercase tracking-widest rounded">
                      {getDriverForInspection(ins)}
                    </span>
                  ) : null}
                </div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{ins.date} às {ins.time}</p>
                {ins.inspectorName && (
                  <p className="text-[9px] text-[#C5A059] font-black uppercase tracking-widest mt-0.5">Vistoriador: {ins.inspectorName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-neutral-50 rounded-xl">
                <p className="text-[8px] uppercase font-bold text-neutral-400 mb-1">Km Atual</p>
                <p className="text-xs font-black text-neutral-900">{ins.km} KM</p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl">
                <p className="text-[8px] uppercase font-bold text-neutral-400 mb-1">Combustível</p>
                <p className="text-xs font-black text-neutral-900">{ins.fuelLevel}</p>
              </div>
              {ins.externalCleanliness && (
                <div className="p-3 bg-neutral-50 rounded-xl">
                  <p className="text-[8px] uppercase font-bold text-neutral-400 mb-1">Limpeza Ext.</p>
                  <p className={`text-xs font-black ${ins.externalCleanliness === 'Limpo' ? 'text-emerald-600' : ins.externalCleanliness === 'Aceitável' ? 'text-amber-600' : 'text-red-600'}`}>{ins.externalCleanliness}</p>
                </div>
              )}
              {ins.internalCleanliness && (
                <div className="p-3 bg-neutral-50 rounded-xl">
                  <p className="text-[8px] uppercase font-bold text-neutral-400 mb-1">Limpeza Int.</p>
                  <p className={`text-xs font-black ${ins.internalCleanliness === 'Limpo' ? 'text-emerald-600' : ins.internalCleanliness === 'Aceitável' ? 'text-amber-600' : 'text-red-600'}`}>{ins.internalCleanliness}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {Object.entries(ins.photos || {})
                .filter(([key]) => key !== 'additional')
                .map(([key, photo], i) => (
                  <div key={i} className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-100 bg-neutral-100 shrink-0">
                    <img src={photo.preview} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                ))}
              {ins.photos?.additional && ins.photos.additional.map((photo, i) => (
                <div key={`add-${i}`} className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-100 bg-neutral-100 shrink-0 relative">
                  <img src={photo.preview} loading="lazy" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 right-0 bg-[#C5A059] text-[6px] font-black text-neutral-900 px-0.5 rounded-tl">+</span>
                </div>
              ))}
              {ins.video && (
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <Eye size={14} />
                </div>
              )}
            </div>

            <button 
              onClick={() => onViewDetail(ins)}
              className="w-full py-4 bg-neutral-50 text-neutral-900 text-[9px] uppercase tracking-widest font-black rounded-xl hover:bg-neutral-900 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Eye size={14} /> Ver Dossiê Completo
            </button>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-10">
          <button
            onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
            className="px-10 py-4 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.2em] font-black rounded-xl hover:bg-[#C5A059] transition-all shadow-xl shadow-neutral-900/10"
          >
            Carregar mais ({sortedInspections.length - visibleCount} restantes)
          </button>
        </div>
      )}

      {/* Results count */}
      {sortedInspections.length > 0 && (
        <p className="text-center text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-6">
          Exibindo {Math.min(visibleCount, sortedInspections.length)} de {sortedInspections.length} vistorias
        </p>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center gap-4 mb-8">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-neutral-900 uppercase tracking-tight">Segurança Exigida</h3>
                <p className="text-xs text-neutral-400 font-bold uppercase mt-1">Insira a senha mestre para excluir esta vistoria</p>
              </div>
            </div>

            <div className="space-y-4">
              <input 
                type="password"
                placeholder="Senha Mestre"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-black text-center tracking-widest"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmDelete()}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                  }}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="flex-1 py-4 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InspectionList;
