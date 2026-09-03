import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Eye, Calendar, Car, AlertTriangle, X, ShieldCheck, Camera, Activity, UserCheck, Download, FileText } from 'lucide-react';

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
  const [showAlertsModal, setShowAlertsModal] = useState(false);

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
      const createdB = a.createdAt || a.id || '';
      return createdB.localeCompare(createdA);
    });
  }, [filteredInspections]);

  const alerts = useMemo(() => {
    const now = new Date();
    // Normalizar "hoje" para meia-noite UTC
    const todayStr = now.toISOString().split('T')[0];
    const todayTime = new Date(`${todayStr}T00:00:00Z`).getTime();
    
    return rentals
      .filter(r => r.status === 'Ativo')
      .map(r => {
        const startDateStr = (r.startDate || r.createdAt || todayStr).split('T')[0];
        const startDateTime = new Date(`${startDateStr}T00:00:00Z`).getTime();
        const daysSinceStart = (todayTime - startDateTime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceStart < 15) return null;
        
        const plate = (r.vehiclePlate || r.plate || '').replace(/-/g, '').toUpperCase();
        
        const driverInspections = inspections.filter(ins => {
           const insPlate = (ins.vehiclePlate || '').replace(/-/g, '').toUpperCase();
           const insDateStr = (ins.date || '').split('T')[0];
           const insDateTime = new Date(`${insDateStr}T00:00:00Z`).getTime();
           return insPlate === plate && ins.type === 'Periódica' && insDateTime >= startDateTime;
        });
        
        if (driverInspections.length === 0) {
           return {
              plate: r.vehiclePlate || r.plate,
              driver: r.user || r.userName || 'Condutor N/I',
              daysPending: Math.floor(daysSinceStart),
              count: 0
           };
        }
        
        driverInspections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastInsDateStr = (driverInspections[driverInspections.length - 1].date || '').split('T')[0];
        const lastInsDateTime = new Date(`${lastInsDateStr}T00:00:00Z`).getTime();
        const daysSinceLastIns = (todayTime - lastInsDateTime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastIns >= 15) {
           return {
              plate: r.vehiclePlate || r.plate,
              driver: r.user || r.userName || 'Condutor N/I',
              daysPending: Math.floor(daysSinceLastIns),
              count: driverInspections.length
           };
        }
        
        return null;
      })
      .filter(alert => alert !== null);
  }, [rentals, inspections]);

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

  const handleDownloadAlerts = () => {
    let csv = 'CONDUTOR;PLACA;DIAS ATRASO;STATUS\n';
    alerts.forEach(a => {
      csv += `${a.driver};${a.plate};${a.daysPending} dias;${a.count === 0 ? 'NENHUMA NO CONTRATO' : 'ATRASADA'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alertas_vistoria_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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

      {alerts.length > 0 && (
        <div className="mb-8 md:mb-12 p-6 md:p-8 bg-amber-50 rounded-[1.5rem] md:rounded-[2.5rem] border border-amber-100 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 animate-in slide-in-from-top-4 duration-500">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 shrink-0">
            <AlertTriangle size={28} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black uppercase tracking-widest text-amber-900 mb-1">Alertas de Vistoria Periódica</h4>
            <p className="text-xs text-amber-700/70 font-medium">Os condutores abaixo estão com contratos ativos há mais de 15 dias e estão com a vistoria periódica atrasada.</p>
            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => setShowAlertsModal(true)}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
              >
                <FileText size={14} /> Ver Pendentes ({alerts.length})
              </button>
              <button 
                onClick={handleDownloadAlerts}
                className="flex items-center gap-2 bg-white hover:bg-amber-100 text-amber-700 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-200 transition-all shadow-sm"
              >
                <Download size={14} /> Baixar Relatório
              </button>
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
            onChange={(e) => { setInspectionSearch(e.target.value); setVisibleCount(10); }}
            className="w-full bg-white border border-neutral-100 pl-12 pr-4 py-3 rounded-2xl text-sm focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-medium"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <select 
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setVisibleCount(10); }}
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
            onChange={(e) => { setFilterInspector(e.target.value); setVisibleCount(10); }}
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
              onChange={(e) => { setDateStart(e.target.value); setVisibleCount(10); }}
              className="bg-transparent border-none text-[9px] font-bold outline-none uppercase min-w-[90px]"
            />
            <span className="text-neutral-300 text-[10px] shrink-0">até</span>
            <input 
              type="date" 
              value={dateEnd}
              onChange={(e) => { setDateEnd(e.target.value); setVisibleCount(10); }}
              className="bg-transparent border-none text-[9px] font-bold outline-none uppercase min-w-[90px]"
            />
          </div>

          {(filterType !== 'Todos' || filterInspector !== 'Todos' || dateStart || dateEnd) && (
            <button 
              onClick={() => { setFilterType('Todos'); setFilterInspector('Todos'); setDateStart(''); setDateEnd(''); setVisibleCount(10); }}
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

      {hasMore && (
        <div className="flex justify-center mt-10">
          <button
            onClick={() => setVisibleCount(prev => prev + 10)}
            className="px-10 py-4 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.2em] font-black rounded-xl hover:bg-[#C5A059] transition-all shadow-xl shadow-neutral-900/10"
          >
            Carregar mais ({sortedInspections.length - visibleCount} restantes)
          </button>
        </div>
      )}

      {sortedInspections.length > 0 && (
        <p className="text-center text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-6">
          Exibindo {Math.min(visibleCount, sortedInspections.length)} de {sortedInspections.length} vistorias
        </p>
      )}

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

      {/* Alerts Modal */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm" onClick={() => setShowAlertsModal(false)} />
          <div className="bg-white w-full max-w-4xl h-[80vh] flex flex-col rounded-3xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-amber-50 rounded-t-3xl shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex justify-center items-center">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-amber-900 uppercase tracking-tighter">Vistorias Pendentes</h3>
                  <p className="text-[10px] text-amber-700 uppercase font-bold tracking-widest">{alerts.length} condutores necessitam de vistoria</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleDownloadAlerts} className="flex items-center gap-2 bg-white text-amber-700 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-200 hover:bg-amber-100 transition-all">
                  <Download size={14} /> Baixar Relatório (CSV)
                </button>
                <button onClick={() => setShowAlertsModal(false)} className="text-amber-900/50 hover:text-amber-900 transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/50">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm flex flex-col items-center justify-center gap-2 text-center">
                    <span className="text-[11px] font-black text-amber-900 uppercase line-clamp-1" title={alert.driver}>{alert.driver}</span>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{alert.plate}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${alert.count === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      {alert.count === 0 ? 'NENHUMA VISTORIA' : `ATRASADA (${alert.daysPending} DIAS)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InspectionList;
