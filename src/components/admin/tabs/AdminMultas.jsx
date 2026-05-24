import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Plus, 
  Check, 
  X, 
  Loader2, 
  UploadCloud, 
  AlertTriangle, 
  Calendar, 
  User, 
  Car, 
  FileText, 
  DollarSign, 
  Printer, 
  Eye, 
  Trash2, 
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
  TrendingDown,
  RefreshCw,
  EyeOff,
  Clock
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { EditorialLabel } from '../../ui/EditorialLabel';

const AdminMultas = ({
  fines = [],
  isDbConnected = false,
  onAddFine,
  onUpdateFine,
  onDeleteFine,
  rentals = [],
  vehicles = [],
  clients = []
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [driverFilter, setDriverFilter] = useState('Todos');
  const [vehicleFilter, setVehicleFilter] = useState('Todos');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [showFormSubmitted, setShowFormSubmitted] = useState(false);

  // Form State
  const [fineForm, setFineForm] = useState({
    vehiclePlate: '',
    infraction: '',
    date: '',
    time: '',
    value: '',
    location: '',
    code: '',
  });

  // Print/Indication Modal State
  const [indicationFine, setIndicationFine] = useState(null);

  // Manual Driver Assignment State
  const [manualDriverId, setManualDriverId] = useState('');
  const [assigningFine, setAssigningFine] = useState(null);
  const [selectedAssignDriverId, setSelectedAssignDriverId] = useState('');

  // Calculation summaries
  const stats = useMemo(() => {
    const activeFines = fines.filter(f => f.status !== 'Paga');
    
    // Total remaining value of all unpaid/partially paid fines
    const pendingTotal = activeFines.reduce((acc, f) => {
      const totalVal = parseFloat(f.value) || 0;
      const installmentsCount = parseInt(f.installments) || 1;
      const paidInstallmentsCount = Array.isArray(f.paidInstallments) ? f.paidInstallments.length : 0;
      const remainingInstallmentsCount = installmentsCount - paidInstallmentsCount;
      const remainingVal = remainingInstallmentsCount * (parseFloat(f.installmentValue) || (totalVal / installmentsCount));
      return acc + remainingVal;
    }, 0);

    // Count of fines in weekly billing installments
    const inBillingCount = fines.filter(f => f.status === 'Em Cobrança').length;

    // Fines paid in the current calendar month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const paidThisMonthVal = fines
      .filter(f => {
        if (f.status !== 'Paga') return false;
        // Verify created_at or paid date if available, otherwise fallback
        const dateToCheck = f.createdAt || f.date;
        if (!dateToCheck) return false;
        const d = new Date(dateToCheck);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, f) => acc + (parseFloat(f.value) || 0), 0);

    return {
      pendingTotal,
      inBillingCount,
      paidThisMonthVal
    };
  }, [fines]);

  // Unique lists for filtering
  const filterOptions = useMemo(() => {
    const drivers = Array.from(new Set(fines.map(f => f.driverName).filter(Boolean)));
    const plates = Array.from(new Set(fines.map(f => f.vehiclePlate).filter(Boolean)));
    return { drivers, plates };
  }, [fines]);

  // Driver auto-matching helper
  const matchDriver = (plate, dateStr, timeStr) => {
    if (!plate || !dateStr) return { driverName: 'Não Identificado', driverId: null, rentalId: null };
    
    // Sanitize plate
    const cleanPlate = plate.replace('-', '').trim().toLowerCase();
    const fineDate = new Date(`${dateStr}T${timeStr || '12:00'}:00`);

    const matchedRental = rentals.find(r => {
      const rentalPlate = (r.plate || r.vehiclePlate || '').replace('-', '').trim().toLowerCase();
      if (rentalPlate !== cleanPlate) return false;

      const start = new Date(r.startDate || r.date);
      start.setHours(0, 0, 0, 0);

      const end = r.endDate ? new Date(r.endDate) : new Date('2099-12-31');
      end.setHours(23, 59, 59, 999);

      return fineDate >= start && fineDate <= end;
    });

    if (matchedRental) {
      return {
        driverName: matchedRental.userName || matchedRental.user || 'Não Identificado',
        driverId: matchedRental.clientId || null,
        rentalId: matchedRental.id || null
      };
    }

    return { driverName: 'Não Identificado', driverId: null, rentalId: null };
  };

  // Matched driver for currently typed form fields
  const currentMatchedDriver = useMemo(() => {
    return matchDriver(fineForm.vehiclePlate, fineForm.date, fineForm.time);
  }, [fineForm.vehiclePlate, fineForm.date, fineForm.time, rentals]);

  // Filtered fines
  const filteredFines = useMemo(() => {
    return fines.filter(f => {
      const matchesSearch = 
        (f.infraction || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.vehiclePlate || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.driverName || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.location || '').toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'Todos' || f.status === statusFilter;
      const matchesDriver = driverFilter === 'Todos' || f.driverName === driverFilter;
      const matchesVehicle = vehicleFilter === 'Todos' || f.vehiclePlate === vehicleFilter;

      return matchesSearch && matchesStatus && matchesDriver && matchesVehicle;
    });
  }, [fines, search, statusFilter, driverFilter, vehicleFilter]);

  // Simulate OCR upload
  const handleOcrUpload = (e) => {
    e.preventDefault();
    setOcrLoading(true);

    // Simulate 1 second analysis
    setTimeout(() => {
      // Find an active rental if possible to make the simulation show driver identification
      const activeRental = rentals.find(r => r.status === 'Ativo');
      const plate = activeRental ? (activeRental.plate || activeRental.vehiclePlate) : 'QNE-8A90';
      
      let targetDate = new Date();
      if (activeRental && activeRental.startDate) {
        // Pick a date 1 day after rental start date
        const rentalStart = new Date(activeRental.startDate);
        rentalStart.setDate(rentalStart.getDate() + 1);
        targetDate = rentalStart;
      } else {
        targetDate.setDate(targetDate.getDate() - 3);
      }

      const dateStr = targetDate.toISOString().split('T')[0];

      setFineForm({
        vehiclePlate: plate,
        infraction: 'Transitar em velocidade superior à máxima permitida em até 20%',
        date: dateStr,
        time: '14:45',
        value: '130,16',
        location: 'Av. das Nações Unidas, Km 22.5 - São Paulo/SP',
        code: '745-50'
      });
      setOcrLoading(false);
    }, 1200);
  };

  // API Sync Simulation
  const handleApiSync = () => {
    setSyncLoading(true);
    setTimeout(() => {
      // Pick a random plate from the fleet
      if (vehicles.length === 0) {
        alert('Nenhum veículo cadastrado na frota para simular a varredura de multas.');
        setSyncLoading(false);
        return;
      }
      
      const randomVehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      const plate = randomVehicle.plate;

      // Find if there is an active rental for this vehicle
      const matchedRental = rentals.find(r => 
        r.status === 'Ativo' && 
        (r.plate || r.vehiclePlate || '').replace('-', '').toLowerCase() === plate.replace('-', '').toLowerCase()
      );

      let targetDate = new Date();
      if (matchedRental && matchedRental.startDate) {
        const rentalStart = new Date(matchedRental.startDate);
        rentalStart.setDate(rentalStart.getDate() + 1);
        targetDate = rentalStart;
      } else {
        targetDate.setDate(targetDate.getDate() - 5);
      }

      const dateStr = targetDate.toISOString().split('T')[0];

      const simulatedFines = [
        { infraction: 'Avançar o sinal vermelho do semáforo, exceto onde houver sinalização de livre conversão à direita', value: 293.47, code: '605-01', location: 'Av. Paulista, 1000 - São Paulo/SP' },
        { infraction: 'Transitar em velocidade superior à máxima permitida em mais de 20% até 50%', value: 195.23, code: '746-30', location: 'Av. Brigadeiro Luís Antônio, 2500 - São Paulo/SP' },
        { infraction: 'Dirigir o veículo manuseando telefone celular', value: 293.47, code: '763-32', location: 'Rua da Consolação, 150 - São Paulo/SP' }
      ];

      const selectedSim = simulatedFines[Math.floor(Math.random() * simulatedFines.length)];

      const newSimulatedFine = {
        vehiclePlate: plate,
        infraction: selectedSim.infraction,
        date: dateStr,
        value: selectedSim.value,
        location: selectedSim.location,
        code: selectedSim.code
      };

      onAddFine(newSimulatedFine).then((res) => {
        setSyncLoading(false);
        if (res && res.success) {
          alert(`Sincronização Concluída!\n\nUma nova multa foi detectada para o veículo ${plate} em ${new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}.\n\nMotorista Vinculado: ${res.data.driverName}`);
        }
      });

    }, 1800);
  };

  // Submit manual addition
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fineForm.vehiclePlate || !fineForm.infraction || !fineForm.value || !fineForm.date) {
      alert('Por favor, preencha os campos obrigatórios (Placa, Infração, Valor e Data).');
      return;
    }

    const valueNum = parseFloat(String(fineForm.value).replace(/\./g, '').replace(',', '.')) || 0;
    
    const selectedClient = manualDriverId && manualDriverId !== 'Administradora' 
      ? clients.find(c => String(c.id) === String(manualDriverId)) 
      : null;

    const finePayload = {
      vehiclePlate: fineForm.vehiclePlate.toUpperCase(),
      infraction: fineForm.infraction,
      date: fineForm.date + (fineForm.time ? `T${fineForm.time}:00` : ''),
      value: valueNum,
      location: fineForm.location,
      code: fineForm.code,
      ...(manualDriverId === 'Administradora' ? {
        driverName: 'Administradora',
        driverId: null,
        rentalId: null
      } : selectedClient ? {
        driverName: selectedClient.nome || selectedClient.name,
        driverId: selectedClient.id
      } : {})
    };

    onAddFine(finePayload).then((res) => {
      if (res && res.success) {
        setShowAddModal(false);
        setFineForm({
          vehiclePlate: '',
          infraction: '',
          date: '',
          time: '',
          value: '',
          location: '',
          code: ''
        });
        setManualDriverId('');
        alert('Multa registrada com sucesso!');
      }
    });
  };

  // Manual payment quittance (quitar multa total)
  const handleQuitFine = async (fine) => {
    if (window.confirm(`Tem certeza que deseja registrar a quitação integral manual da multa no valor total de R$ ${fine.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`)) {
      // Mark all installments as paid
      const allInstallments = [];
      for (let i = 1; i <= fine.installments; i++) {
        allInstallments.push(i);
      }
      const updatedFine = {
        ...fine,
        paidInstallments: allInstallments,
        status: 'Paga'
      };
      await onUpdateFine(updatedFine);
      alert('Multa quitada integralmente!');
    }
  };

  // Contest fine (contestar)
  const handleContestFine = async (fine) => {
    const newStatus = fine.status === 'Contestada' ? 'Pendente' : 'Contestada';
    const msg = fine.status === 'Contestada' 
      ? 'Deseja remover a contestação desta multa?' 
      : 'Deseja marcar esta multa como Contestada? O processo suspende temporariamente a cobrança.';
    
    if (window.confirm(msg)) {
      await onUpdateFine({
        ...fine,
        status: newStatus
      });
      alert(`Status da multa atualizado para: ${newStatus}`);
    }
  };

  // Suspend billing (suspender/reativar cobrança)
  const handleToggleSuspendBilling = async (fine) => {
    const updated = {
      ...fine,
      billingSuspended: !fine.billingSuspended
    };
    await onUpdateFine(updated);
    alert(updated.billingSuspended ? 'Cobrança da multa suspensa temporariamente do faturamento semanal!' : 'Cobrança da multa reativada para o faturamento semanal!');
  };

  // Driver Indication Form (Abertura do layout de impressão)
  const handlePrintIndication = (fine) => {
    setIndicationFine(fine);
  };

  const handlePrintTrigger = () => {
    window.print();
  };

  const handleOpenDriverSelector = (fine) => {
    setAssigningFine(fine);
    if (fine.driverId) {
      setSelectedAssignDriverId(String(fine.driverId));
    } else if (fine.driverName === 'Administradora') {
      setSelectedAssignDriverId('Administradora');
    } else {
      setSelectedAssignDriverId('');
    }
  };

  const handleSaveManualDriver = async () => {
    if (!assigningFine) return;
    
    let updatedFine = { ...assigningFine };

    if (selectedAssignDriverId === 'Administradora') {
      updatedFine.driverName = 'Administradora';
      updatedFine.driverId = null;
      updatedFine.rentalId = null;
    } else if (selectedAssignDriverId) {
      const selectedClient = clients.find(c => String(c.id) === String(selectedAssignDriverId));
      if (selectedClient) {
        updatedFine.driverName = selectedClient.nome || selectedClient.name;
        updatedFine.driverId = selectedClient.id;
        
        // Tenta achar contrato ativo para este cliente e data da multa
        const fineDate = new Date(assigningFine.date);
        const matchedRental = rentals.find(r => {
          const isSameClient = r.clientId === selectedClient.id;
          if (!isSameClient) return false;
          
          const start = new Date(r.startDate || r.date);
          start.setHours(0, 0, 0, 0);
          
          const end = r.endDate ? new Date(r.endDate) : new Date('2099-12-31');
          end.setHours(23, 59, 59, 999);
          
          return fineDate >= start && fineDate <= end;
        });

        if (matchedRental) {
          updatedFine.rentalId = matchedRental.id;
        } else {
          updatedFine.rentalId = null;
        }
      }
    } else {
      alert('Por favor, selecione um condutor ou marque como Administradora.');
      return;
    }

    await onUpdateFine(updatedFine);
    setAssigningFine(null);
    setSelectedAssignDriverId('');
    alert('Condutor vinculado com sucesso!');
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <EditorialLabel className="text-red-600 tracking-[0.3em]">Módulo de Controle e Infrações</EditorialLabel>
          </div>
          <h3 className="text-5xl font-black uppercase tracking-tighter text-neutral-900 leading-none">Multas de Trânsito</h3>
          <p className="text-neutral-500 font-medium italic text-lg tracking-tight">
            Gestão inteligente de infrações, identificação automática do condutor e conciliação financeira.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 w-full xl:w-auto">
          <button
            onClick={handleApiSync}
            disabled={syncLoading}
            className="flex-1 xl:flex-none py-5 px-8 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 border border-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncLoading ? (
              <>
                <Loader2 size={14} className="animate-spin text-[#C5A059]" />
                Sincronizando API...
              </>
            ) : (
              <>
                <RefreshCw size={14} className="text-[#C5A059]" />
                Sincronizar API
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 xl:flex-none py-5 px-8 bg-[#C5A059] text-neutral-900 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#b08d4b] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/10"
          >
            <Plus size={14} />
            Cadastrar Multa
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8">
        
        {/* Card 1: Pending */}
        <div className="p-8 bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group hover:shadow-2xl hover:shadow-neutral-900/5 transition-all duration-700">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full transition-transform duration-1000 group-hover:scale-150" />
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-neutral-900 text-red-500 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-12 duration-500">
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Débito Restante</p>
              <p className="text-[9px] text-red-600 font-black uppercase tracking-widest mt-0.5">Em Aberto</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-black text-red-600 tracking-tighter">R$</span>
            <h4 className="text-4xl xl:text-5xl font-black text-neutral-900 tracking-tighter leading-none">
              {stats.pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Saldo Restante das Multas</p>
        </div>

        {/* Card 2: Installments Billing */}
        <div className="p-8 bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm relative overflow-hidden group hover:shadow-2xl hover:shadow-neutral-900/5 transition-all duration-700">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full transition-transform duration-1000 group-hover:scale-150" />
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-neutral-900 text-amber-500 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:-rotate-12 duration-500">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Em Parcelamento</p>
              <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest mt-0.5">Boleto Semanal</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h4 className="text-4xl xl:text-5xl font-black text-neutral-900 tracking-tighter leading-none">
              {stats.inBillingCount}
            </h4>
            <span className="text-xs font-bold text-neutral-400">multas</span>
          </div>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Ativas no Faturamento</p>
        </div>

        {/* Card 3: Paid this month */}
        <div className="p-8 bg-neutral-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A059]/10 blur-[100px] -mr-24 -mt-24" />
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[#C5A059] text-neutral-900 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-500">
              <CheckCircle size={22} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Liquidadas</p>
              <p className="text-[9px] text-[#C5A059] font-black uppercase tracking-widest mt-0.5">Este Mês</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-black text-[#C5A059] tracking-tighter">R$</span>
            <h4 className="text-4xl xl:text-5xl font-black text-white tracking-tighter leading-none">
              {stats.paidThisMonthVal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h4>
          </div>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Total Pago no Mês Atual</p>
        </div>

      </div>

      {/* Filter and Search Section */}
      <div className="bg-white rounded-[2.5rem] border border-neutral-100 p-8 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-6 justify-between">
          
          <div className="relative flex-1 group">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por placa, infração, motorista ou local..."
              className="w-full bg-neutral-50 border border-neutral-100 py-4.5 pl-14 pr-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Filter 1: Status */}
            <div className="space-y-1.5">
              <label className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 font-black ml-1">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-xl text-[10px] font-black uppercase tracking-wider text-neutral-900 outline-none focus:ring-2 focus:ring-[#C5A059]/20"
              >
                <option value="Todos">Todos os Status</option>
                <option value="Pendente">Pendente</option>
                <option value="Em Cobrança">Em Cobrança</option>
                <option value="Paga">Paga</option>
                <option value="Contestada">Contestada</option>
              </select>
            </div>

            {/* Filter 2: Driver */}
            <div className="space-y-1.5">
              <label className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 font-black ml-1">Motorista</label>
              <select
                value={driverFilter}
                onChange={e => setDriverFilter(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-xl text-[10px] font-black uppercase tracking-wider text-neutral-900 outline-none focus:ring-2 focus:ring-[#C5A059]/20"
              >
                <option value="Todos">Todos os Motoristas</option>
                {filterOptions.drivers.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Filter 3: Vehicle */}
            <div className="space-y-1.5">
              <label className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 font-black ml-1">Veículo Placa</label>
              <select
                value={vehicleFilter}
                onChange={e => setVehicleFilter(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-xl text-[10px] font-black uppercase tracking-wider text-neutral-900 outline-none focus:ring-2 focus:ring-[#C5A059]/20"
              >
                <option value="Todos">Todas as Placas</option>
                {filterOptions.plates.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Responsive List / Cards of Fines */}
      <div className="space-y-6">
        {filteredFines.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {filteredFines.map(fine => {
              const totalVal = parseFloat(fine.value) || 0;
              const installmentsCount = parseInt(fine.installments) || 1;
              const paidInstallmentsCount = Array.isArray(fine.paidInstallments) ? fine.paidInstallments.length : 0;
              const remainingInstallmentsCount = installmentsCount - paidInstallmentsCount;
              const remainingVal = remainingInstallmentsCount * (parseFloat(fine.installmentValue) || (totalVal / installmentsCount));

              return (
                <div 
                  key={fine.id} 
                  className={`bg-white border rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col xl:flex-row ${fine.status === 'Contestada' ? 'border-amber-200' : 'border-neutral-100'}`}
                >
                  
                  {/* Left Side: General Info */}
                  <div className="p-8 xl:w-96 flex flex-col justify-between border-b xl:border-b-0 xl:border-r border-neutral-50 bg-neutral-50/20">
                    <div className="space-y-4">
                      
                      <div className="flex justify-between items-center">
                        <span className="bg-neutral-900 text-white font-black px-3.5 py-1.5 rounded-xl text-[10px] uppercase tracking-wider border border-neutral-800 shadow-md">
                          {fine.vehiclePlate}
                        </span>
                        
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${
                          fine.status === 'Paga' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          fine.status === 'Em Cobrança' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          fine.status === 'Contestada' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            fine.status === 'Paga' ? 'bg-emerald-500' :
                            fine.status === 'Em Cobrança' ? 'bg-amber-500' :
                            fine.status === 'Contestada' ? 'bg-indigo-500' :
                            'bg-red-500 animate-pulse'
                          }`} />
                          {fine.status}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-black">Condutor Responsável</p>
                        {fine.driverName && fine.driverName !== 'Não Identificado' ? (
                          <div className="space-y-1">
                            <h5 className="text-lg font-black text-neutral-900 uppercase tracking-tighter leading-none">
                              {fine.driverName}
                            </h5>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">
                                {fine.rentalId ? 'Identificado via contrato' : 'Vinculado manualmente'}
                              </span>
                              <button 
                                type="button"
                                onClick={() => handleOpenDriverSelector(fine)}
                                className="text-[8px] text-[#C5A059] hover:underline uppercase font-bold tracking-widest ml-2"
                              >
                                Alterar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <h5 className="text-lg font-black text-red-500 uppercase tracking-tighter leading-none">
                              Não Identificado
                            </h5>
                            <button
                              type="button"
                              onClick={() => handleOpenDriverSelector(fine)}
                              className="py-2 px-4 bg-amber-500 hover:bg-[#C5A059] hover:text-white text-neutral-950 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1 inline-flex shadow-sm"
                            >
                              Vincular Condutor
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-neutral-100 space-y-2">
                        <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-bold">
                          <Calendar size={14} className="text-neutral-400 shrink-0" />
                          <span>{fine.date ? new Date(fine.date).toLocaleDateString('pt-BR') : '—'}</span>
                          {fine.date && fine.date.includes('T') && (
                            <span className="bg-neutral-100 px-2 py-0.5 rounded text-[8px] font-bold">{fine.date.split('T')[1].substring(0, 5)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-bold">
                          <Car size={14} className="text-neutral-400 shrink-0" />
                          <span className="truncate">{fine.location || 'Local não cadastrado'}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Middle Side: Infraction Details */}
                  <div className="p-8 flex-1 space-y-6 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-red-500 shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-600">Descrição da Infração</span>
                        {fine.code && (
                          <span className="bg-red-50 text-red-700 text-[8px] font-black px-2 py-0.5 rounded border border-red-100 font-mono">
                            Cód. {fine.code}
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-800 text-sm font-bold uppercase tracking-tight leading-snug">
                        {fine.infraction}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-neutral-50">
                      
                      <div className="space-y-0.5">
                        <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-black">Valor Total</span>
                        <p className="text-base font-black text-neutral-900">
                          R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-black">Parcelamento</span>
                        <p className="text-sm font-bold text-neutral-700">
                          {fine.installments}x de R$ {fine.installmentValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '—'}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-black">Parcelas Pagas</span>
                        <p className="text-sm font-bold text-emerald-600">
                          {paidInstallmentsCount} / {fine.installments}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-black">A Receber</span>
                        <p className="text-sm font-bold text-red-600">
                          R$ {remainingVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Right Side: Actions Buttons */}
                  <div className="p-8 xl:w-72 flex flex-col justify-center gap-3 bg-neutral-50/10 border-t xl:border-t-0 xl:border-l border-neutral-50">
                    
                    {fine.status !== 'Paga' && (
                      <button
                        onClick={() => handleQuitFine(fine)}
                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Check size={12} />
                        Quitar Multa
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleContestFine(fine)}
                        className={`py-3 px-2 border text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 ${
                          fine.status === 'Contestada'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        {fine.status === 'Contestada' ? 'Reativar' : 'Contestar'}
                      </button>

                      <button
                        onClick={() => handleToggleSuspendBilling(fine)}
                        className={`py-3 px-2 border text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 ${
                          fine.billingSuspended
                            ? 'bg-amber-100 border-amber-300 text-amber-800'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        {fine.billingSuspended ? 'Retomar' : 'Susp. Parc.'}
                      </button>
                    </div>

                    <button
                      onClick={() => handlePrintIndication(fine)}
                      className="w-full py-3.5 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <Printer size={12} />
                      Indicar Condutor
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm('Tem certeza de que deseja excluir esta multa do sistema?')) {
                          onDeleteFine(fine.id);
                        }
                      }}
                      className="w-full py-3.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 border border-red-100"
                    >
                      <Trash2 size={12} />
                      Excluir Registro
                    </button>

                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-32 text-center bg-white border border-neutral-100 rounded-[3rem]">
            <ShieldAlert size={48} className="mx-auto mb-6 text-neutral-100" />
            <h4 className="text-2xl font-black text-neutral-900 uppercase tracking-tighter mb-2">Nenhuma multa registrada</h4>
            <p className="text-xs text-neutral-400 font-black uppercase tracking-widest">Todas as infrações de trânsito estão regularizadas ou os filtros não retornaram resultados.</p>
          </div>
        )}
      </div>

      {/* ADD FINE MODAL */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-4xl h-full md:max-h-[90vh] rounded-none md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="p-8 md:p-12 pb-6 border-b border-neutral-50 shrink-0 bg-neutral-50/50 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-pulse" />
                  <EditorialLabel className="text-[#C5A059]">Novo Registro de Infração</EditorialLabel>
                </div>
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-neutral-900 leading-none">
                  Cadastrar Multa de Trânsito
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setManualDriverId('');
                }} 
                className="w-10 h-10 bg-white border border-neutral-100 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:border-neutral-900 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10">
              
              {/* OCR IA Drop Area */}
              <div 
                onClick={handleOcrUpload}
                className={`p-10 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-500 group relative ${
                  ocrLoading ? 'border-[#C5A059] bg-[#C5A059]/5' : 'border-neutral-200 bg-neutral-50 hover:border-[#C5A059]/50 hover:bg-white hover:shadow-xl'
                }`}
              >
                {ocrLoading ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <Loader2 size={36} className="animate-spin text-[#C5A059]" />
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-wider text-neutral-900">Analisando documento via OCR/IA...</p>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Extraindo placa, valor, código de infração e local...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-white text-neutral-400 rounded-2xl flex items-center justify-center shadow-lg group-hover:text-[#C5A059] group-hover:scale-110 transition-transform">
                      <UploadCloud size={32} />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-black uppercase tracking-widest block mb-1 text-neutral-900">Cadastrar com OCR inteligente (Recomendado)</span>
                      <span className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">Arraste ou clique para fazer upload da foto/PDF da Notificação</span>
                    </div>
                  </>
                )}
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleSubmit} className="space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">Placa do Veículo *</label>
                    <div className="relative group">
                      <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" size={18} />
                      <input 
                        type="text" 
                        required 
                        value={fineForm.vehiclePlate} 
                        onChange={e => setFineForm({...fineForm, vehiclePlate: e.target.value})} 
                        className="w-full bg-neutral-50 border border-neutral-100 pl-12 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm" 
                        placeholder="Ex: ABC-1234" 
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">Valor da Infração (R$) *</label>
                    <div className="relative group">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" size={18} />
                      <input 
                        type="text" 
                        required 
                        value={fineForm.value} 
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '');
                          v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                          setFineForm({...fineForm, value: v});
                        }} 
                        className="w-full bg-neutral-50 border border-neutral-100 pl-12 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm" 
                        placeholder="0,00" 
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">Código de Infração</label>
                    <div className="relative group">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" size={18} />
                      <input 
                        type="text" 
                        value={fineForm.code} 
                        onChange={e => setFineForm({...fineForm, code: e.target.value})} 
                        className="w-full bg-neutral-50 border border-neutral-100 pl-12 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm" 
                        placeholder="Ex: 745-50" 
                      />
                    </div>
                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">Data da Infração *</label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" size={18} />
                      <input 
                        type="date" 
                        required 
                        value={fineForm.date} 
                        onChange={e => setFineForm({...fineForm, date: e.target.value})} 
                        className="w-full bg-neutral-50 border border-neutral-100 pl-12 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">Horário da Infração</label>
                    <div className="relative group">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" size={18} />
                      <input 
                        type="time" 
                        value={fineForm.time} 
                        onChange={e => setFineForm({...fineForm, time: e.target.value})} 
                        className="w-full bg-neutral-50 border border-neutral-100 pl-12 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm" 
                      />
                    </div>
                  </div>

                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">Local da Infração</label>
                  <input 
                    type="text" 
                    value={fineForm.location} 
                    onChange={e => setFineForm({...fineForm, location: e.target.value})} 
                    className="w-full bg-neutral-50 border border-neutral-100 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm" 
                    placeholder="Ex: Avenida Paulista, 1000 - São Paulo/SP" 
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">Descrição da Infração *</label>
                  <textarea 
                    required 
                    rows={2}
                    value={fineForm.infraction} 
                    onChange={e => setFineForm({...fineForm, infraction: e.target.value})} 
                    className="w-full bg-neutral-50 border border-neutral-100 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm resize-none" 
                    placeholder="Descreva detalhadamente a infração cometida" 
                  />
                </div>

                {/* Driver auto matching feedback area */}
                {fineForm.vehiclePlate && fineForm.date && (
                  <div className={`p-6 rounded-[2rem] border animate-in fade-in duration-500 flex items-center gap-4 ${
                    currentMatchedDriver.driverName !== 'Não Identificado'
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
                      : 'bg-amber-50 border-amber-100 text-amber-900'
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                      currentMatchedDriver.driverName !== 'Não Identificado' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      <User size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] font-black opacity-60">Motorista Responsável Identificado</p>
                      <h6 className="text-sm font-black uppercase mt-0.5">
                        {currentMatchedDriver.driverName}
                      </h6>
                      <p className="text-[8px] font-bold opacity-60 mt-0.5">
                        {currentMatchedDriver.driverName !== 'Não Identificado' 
                          ? 'O sistema cruzou a placa e data com um contrato ativo na data correspondente.'
                          : 'Nenhum contrato ativo para esta placa e data. A multa será vinculada à Administradora.'
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Manual driver select override */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">Vincular Condutor Manualmente (Opcional)</label>
                  <select
                    value={manualDriverId}
                    onChange={e => setManualDriverId(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-100 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm text-neutral-900"
                  >
                    <option value="">-- Usar identificação automática do sistema --</option>
                    <option value="Administradora">LA Locadora (Administradora / Sem Condutor)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nome || c.name} (CPF: {c.cpf || '—'})</option>
                    ))}
                  </select>
                  <p className="text-[8px] text-neutral-400 font-bold uppercase ml-1">
                    Selecione um condutor acima caso o sistema não tenha identificado automaticamente ou se deseja alterar o responsável.
                  </p>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex justify-end gap-4 pt-6 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setManualDriverId('');
                    }}
                    className="py-4.5 px-8 text-neutral-400 hover:text-neutral-600 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-4.5 px-12 bg-neutral-900 text-[#C5A059] hover:bg-[#C5A059] hover:text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-[#C5A059]/10"
                  >
                    Salvar Registro
                  </button>
                </div>

              </form>

            </div>

          </div>
        </div>,
        document.body
      )}

      {/* PRINT MOCK POP-UP MODAL (INDIÇÃO DO CONDUTOR) */}
      {indicationFine && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-500 print:relative print:p-0 print:z-0">
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md print:hidden" onClick={() => setIndicationFine(null)} />
          <div className="relative bg-white w-full max-w-3xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden print:shadow-none print:rounded-none print:h-auto print:max-h-none print:overflow-visible">
            
            {/* Modal Header */}
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-[#C5A059]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Formulário de Indicação do Condutor</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintTrigger}
                  className="py-3 px-6 bg-neutral-900 text-white hover:bg-neutral-800 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Printer size={12} />
                  Imprimir Form.
                </button>
                <button
                  onClick={() => setIndicationFine(null)}
                  className="w-10 h-10 bg-white border border-neutral-100 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-all shadow-sm"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Print Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 font-sans print:p-0 print:overflow-visible text-neutral-900">
              
              {/* Document Header */}
              <div className="text-center space-y-2 border-b-2 border-neutral-900 pb-6">
                <h4 className="text-lg font-black uppercase tracking-widest">LA Locação de Veículos</h4>
                <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Formulário Oficial de Indicação de Condutor Infrator</p>
                <p className="text-[9px] text-neutral-400">Em conformidade com a Resolução CONTRAN e Art. 257 do CTB</p>
              </div>

              {/* Vehicle & Infraction Data */}
              <div className="space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-widest border-b border-neutral-200 pb-2">1. Dados do Veículo e da Infração</h5>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[8px] font-black text-neutral-400 uppercase block">Placa do Veículo</span>
                    <span className="font-bold text-sm uppercase">{indicationFine.vehiclePlate}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-neutral-400 uppercase block">Auto de Infração (AIT)</span>
                    <span className="font-mono font-bold">AIT-{Math.floor(Math.random() * 90000000) + 10000000}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-neutral-400 uppercase block">Data / Hora</span>
                    <span className="font-bold">
                      {indicationFine.date ? new Date(indicationFine.date).toLocaleDateString('pt-BR') : '—'} 
                      {indicationFine.date && indicationFine.date.includes('T') ? ` às ${indicationFine.date.split('T')[1].substring(0, 5)}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-neutral-400 uppercase block">Código da Infração</span>
                    <span className="font-bold font-mono">{indicationFine.code || '745-50'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[8px] font-black text-neutral-400 uppercase block">Infração Cometida</span>
                    <span className="font-bold text-neutral-800 uppercase tracking-tight">{indicationFine.infraction}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[8px] font-black text-neutral-400 uppercase block">Local da Ocorrência</span>
                    <span className="font-bold text-neutral-800">{indicationFine.location || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              {/* Driver Data */}
              <div className="space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-widest border-b border-neutral-200 pb-2">2. Identificação do Condutor Infrator</h5>
                {(() => {
                  const clientObj = clients.find(c => 
                    (c.nome || c.name || '').toLowerCase() === (indicationFine.driverName || '').toLowerCase()
                  );
                  return (
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="col-span-2">
                        <span className="text-[8px] font-black text-neutral-400 uppercase block">Nome Completo do Condutor</span>
                        <span className="font-bold text-neutral-800 uppercase">{indicationFine.driverName || 'Não Identificado'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-neutral-400 uppercase block">Documento de Identidade (CPF)</span>
                        <span className="font-bold">{clientObj?.cpf || '_______________________'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-neutral-400 uppercase block">Carteira Nacional de Habilitação (CNH)</span>
                        <span className="font-bold">{clientObj?.cnhNumber || '_______________________'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-neutral-400 uppercase block">Telefone de Contato</span>
                        <span className="font-bold">{clientObj?.phone || clientObj?.telefone || '_______________________'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-neutral-400 uppercase block">E-mail</span>
                        <span className="font-bold lowercase">{clientObj?.email || '_______________________'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Terms and Signatures */}
              <div className="space-y-10 pt-4">
                <p className="text-[9px] text-neutral-500 leading-relaxed text-justify">
                  Declaro que as informações acima são verdadeiras e assumo inteira responsabilidade pela pontuação decorrente da infração acima detalhada, nos termos da legislação de trânsito vigente. Autorizo a LA Locação de Veículos a encaminhar esta indicação ao órgão de trânsito autuador competente.
                </p>

                <div className="grid grid-cols-2 gap-10 pt-12">
                  <div className="text-center space-y-1">
                    <div className="border-t border-neutral-950 w-full mx-auto" />
                    <span className="text-[9px] font-black uppercase text-neutral-400">Assinatura do Proprietário (LA Locadora)</span>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="border-t border-neutral-950 w-full mx-auto" />
                    <span className="text-[9px] font-black uppercase text-neutral-400">Assinatura do Condutor Infrator</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>,
        document.body
      )}

      {/* MANUAL DRIVER ASSIGNMENT MODAL */}
      {assigningFine && createPortal(
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={() => setAssigningFine(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase tracking-[0.2em] font-black text-[#C5A059]">Gerenciamento de Infrações</span>
                <h4 className="text-xl font-black uppercase text-neutral-900 mt-1 tracking-tight">Vincular Condutor</h4>
              </div>
              <button 
                onClick={() => setAssigningFine(null)}
                className="w-8 h-8 rounded-xl border border-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-neutral-500 font-light leading-relaxed">
              Selecione o condutor responsável pela multa do veículo <span className="font-bold text-neutral-900">{assigningFine.vehiclePlate}</span> ocorrida em <span className="font-bold text-neutral-900">{assigningFine.date ? new Date(assigningFine.date).toLocaleDateString('pt-BR') : '—'}</span>.
            </p>

            <div className="space-y-2">
              <label className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 font-black ml-1">Selecione o Condutor *</label>
              <select
                value={selectedAssignDriverId}
                onChange={e => setSelectedAssignDriverId(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-xs text-neutral-900"
              >
                <option value="">-- Selecione o Motorista --</option>
                <option value="Administradora">LA Locadora (Administradora / Sem Condutor)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nome || c.name} (CPF: {c.cpf || '—'})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
              <button 
                onClick={() => setAssigningFine(null)} 
                className="py-3 px-6 text-[9px] uppercase tracking-widest font-black text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveManualDriver}
                className="py-3.5 px-8 bg-neutral-900 text-[#C5A059] text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#C5A059] hover:text-white transition-all shadow-md"
              >
                Confirmar Vínculo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default AdminMultas;
