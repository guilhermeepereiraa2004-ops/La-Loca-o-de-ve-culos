import { useState } from 'react';
import { INITIAL_LEADS, INITIAL_INVESTORS, INITIAL_VEHICLES } from '../constants/initialData';

export const useAppState = () => {
  const [view, setView] = useState('home');
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [rentals, setRentals] = useState([]);
  const [investors, setInvestors] = useState(INITIAL_INVESTORS);
  const [vehicles, setVehicles] = useState(INITIAL_VEHICLES);
  const [transactions, setTransactions] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [replacementContracts, setReplacementContracts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [selectedVehicleForInterest, setSelectedVehicleForInterest] = useState(null);
  const [interestForm, setInterestForm] = useState({ name: '', phone: '', email: '', observation: '' });

  const handleAddSystemUser = (user) => setSystemUsers(prev => [...prev, user]);
  const handleUpdateSystemUser = (updated) => setSystemUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  const handleDeleteSystemUser = (id) => setSystemUsers(prev => prev.filter(u => u.id !== id));

  const handleAddLead = (lead) => {
    setLeads(prev => [{ ...lead, id: Date.now(), status: 'novo', date: new Date().toLocaleDateString('pt-BR') }, ...prev]);
  };

  const handleUpdateLeadStatus = (id, status, updatedBy) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status, updatedBy } : l));
  };

  const handleAddRental = (rental) => {
    setRentals(prev => [{ ...rental, id: Date.now() }, ...prev]);
    setVehicles(prev => prev.map(v => v.id === rental.vehicleId ? { ...v, status: 'Alugado' } : v));
    
    setClients(prev => {
      const exists = prev.find(c => c.phone === rental.clientPhone || (c.cnh && c.cnh === rental.cnh));
      if (exists) return prev;
      return [...prev, {
        name: rental.user,
        phone: rental.clientPhone,
        email: rental.email,
        cnh: rental.cnh,
        cnhValidity: rental.cnhValidity,
        registrationDate: new Date().toLocaleDateString('pt-BR'),
        docs: rental.docs,
        address: rental.address
      }];
    });
  };

  const handleDeleteRental = (id) => {
    const rental = rentals.find(r => r.id === id);
    if (rental) {
      setVehicles(prev => prev.map(v => v.id === rental.vehicleId ? { ...v, status: 'Disponível' } : v));
    }
    setRentals(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateRental = (updatedRental) => {
    setRentals(prev => prev.map(r => r.id === updatedRental.id ? updatedRental : r));
  };

  const handleAddInvestor = (investor) => {
    setInvestors(prev => [{ ...investor, id: Date.now() }, ...prev]);
  };

  const handleUpdateInvestor = (updatedInvestor) => {
    setInvestors(prev => prev.map(i => i.id === updatedInvestor.id ? updatedInvestor : i));
  };

  const handleDeleteInvestor = (id) => {
    setInvestors(prev => prev.filter(i => i.id !== id));
  };

  const handleAddVehicle = (vehicle) => {
    setVehicles(prev => [{ ...vehicle, id: Date.now(), status: 'Disponível', km: vehicle.initialKm || '0' }, ...prev]);
  };

  const handleUpdateVehicle = (updatedVehicle) => {
    setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
  };

  const handleDeleteVehicle = (id) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const handleAddTransaction = (transaction) => {
    setTransactions(prev => [{ ...transaction, id: Date.now() }, ...prev]);
  };

  const handleAddMaintenance = (maintenance) => {
    setMaintenances(prev => [{ ...maintenance, id: Date.now() }, ...prev]);
  };

  const handleUpdateMaintenance = (updatedMaintenance) => {
    setMaintenances(prev => prev.map(m => m.id === updatedMaintenance.id ? updatedMaintenance : m));
  };

  const handleDeleteMaintenance = (id) => {
    setMaintenances(prev => prev.filter(m => m.id !== id));
  };

  const handleCompleteClosure = (rentalId, closureData) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return;

    setRentals(prev => prev.map(r => r.id === rentalId ? { 
      ...r, 
      status: 'Encerrado', 
      endDate: new Date().toLocaleDateString('pt-BR'),
      depositPaid: closureData.caucaoAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      closureNote: closureData.type === 'return' ? 'Saldo a devolver' : 'Saldo devedor liquidado'
    } : r));
    
    setVehicles(prev => prev.map(v => v.plate === rental.plate ? { ...v, status: 'Disponível' } : v));

    handleAddTransaction({
      date: new Date().toISOString().split('T')[0],
      type: closureData.type === 'return' ? 'out' : 'in',
      val: closureData.balance,
      desc: `Liquidação Final - Contrato ${rental.plate} - ${rental.user} (${closureData.type === 'return' ? 'Devolução de Saldo' : 'Cobrança de Resíduo'})`,
      cat: closureData.type === 'return' ? 'Caução a devolver' : 'Aluguel',
      vehiclePlate: rental.plate,
      status: 'pendente',
      responsible: 'Administradora'
    });
  };

  const handlePayCaucaoInstallment = (rentalId, installmentNumber, value) => {
    setRentals(prev => prev.map(r => {
      if (r.id === rentalId) {
        const paidInstallments = [...(r.paidInstallments || []), installmentNumber];
        const depositReceived = (parseFloat(String(r.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0) + value;
        
        return { 
          ...r, 
          paidInstallments, 
          depositReceived: depositReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        };
      }
      return r;
    }));
  };

  const handleConfirmPayment = (rentalId, billingData) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return;

    const vehicle = vehicles.find(v => v.plate === rental.plate);
    const adminTaxPercent = parseFloat(vehicle?.adminTax || 15) / 100;
    
    const baseValue = billingData.weeklyRate || 0;
    const adminRevenue = baseValue * adminTaxPercent;
    
    if (adminRevenue > 0) {
      handleAddTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'in',
        val: adminRevenue,
        desc: `Taxa Adm (${vehicle?.adminTax || 15}%) - ${rental.user}`,
        cat: 'Taxa Adm',
        vehiclePlate: rental.plate,
        status: 'pago',
        responsible: 'Administradora'
      });
    }

    if (billingData.lateFee > 0) {
      handleAddTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'in',
        val: billingData.lateFee,
        desc: `Multa por Atraso - ${rental.user}`,
        cat: 'Multas',
        vehiclePlate: rental.plate,
        status: 'pago',
        responsible: 'Administradora'
      });
    }

    if (billingData.tireTax > 0) {
      handleAddTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'in',
        val: billingData.tireTax,
        desc: `Taxa de Pneus - ${rental.user}`,
        cat: 'Taxa Pneus',
        vehiclePlate: rental.plate,
        status: 'pago',
        responsible: 'Administradora'
      });
    }

    if (billingData.replacementCharge > 0) {
      handleAddTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'in',
        val: billingData.replacementCharge,
        desc: `Carro Reserva (${billingData.replacementDays}d) - ${rental.user}`,
        cat: 'Carro Reserva',
        vehiclePlate: rental.plate,
        status: 'pago',
        responsible: 'Administradora'
      });
    }
  };

  const handleAddInspection = (inspection) => {
    setInspections(prev => [{ ...inspection, id: Date.now() }, ...prev]);
  };

  const handleDeleteInspection = (id) => {
    setInspections(prev => prev.filter(ins => ins.id !== id));
  };

  const handleCloseServiceOrder = (os, mode, replacementCarPlate) => {
    if (mode === 'open') {
      setServiceOrders(prev => [{ ...os, status: 'Aberta' }, ...prev]);
      setVehicles(prev => prev.map(v => v.plate === os.plate ? { ...v, status: 'Manutenção' } : v));

      if (replacementCarPlate) {
        const rental = rentals.find(r => r.plate === os.plate && r.status === 'Ativo');
        if (rental) {
          setReplacementContracts(prev => [...prev, {
            id: Date.now(),
            mainVehiclePlate: os.plate,
            replacementVehiclePlate: replacementCarPlate,
            driverName: rental.user,
            startDate: new Date().toISOString(),
            dailyRate: 80,
            status: 'Ativo'
          }]);
          setVehicles(prev => prev.map(v => v.plate === replacementCarPlate ? { ...v, status: 'Alugado (Reserva)' } : v));
        }
      }
      return;
    }
    setServiceOrders(prev => prev.map(o => o.id === os.id ? { ...o, status: 'Concluída', closedAt: new Date().toISOString() } : o));
    
    const wasRented = rentals.some(r => r.plate === os.plate && r.status === 'Ativo');
    setVehicles(prev => prev.map(v => v.plate === os.plate ? { ...v, status: wasRented ? 'Alugado' : 'Disponível' } : v));

    setReplacementContracts(prev => prev.map(rc => {
      if (rc.mainVehiclePlate === os.plate && rc.status === 'Ativo') {
        const endDate = new Date().toISOString();
        return { ...rc, status: 'Encerrado', endDate };
      }
      return rc;
    }));

    const activeReplacement = replacementContracts.find(rc => rc.mainVehiclePlate === os.plate && rc.status === 'Ativo');
    if (activeReplacement) {
      setVehicles(prev => prev.map(v => v.plate === activeReplacement.replacementVehiclePlate ? { ...v, status: 'Disponível' } : v));
    }

    handleAddMaintenance({
      vehiclePlate: os.plate,
      vehicleModel: os.model,
      date: os.date,
      serviceType: os.description,
      value: os.total,
      provider: os.provider,
      currentKm: os.km,
      responsible: os.responsible,
      observations: `O.S. #${os.id?.toString().slice(-6)} — Fechada via Oficina`,
    });
    handleAddTransaction({
      date: new Date().toISOString().split('T')[0],
      type: 'out',
      val: os.total,
      desc: `O.S. Oficina — ${os.model} (${os.plate}) — ${os.description.slice(0, 40)}`,
      cat: 'Manutenção',
      vehiclePlate: os.plate,
      responsible: os.responsible,
      sourceOS: os.id,
    });
  };

  const handleInterestSubmit = (e) => {
    e.preventDefault();
    handleAddLead({
      name: interestForm.name,
      contact: interestForm.phone,
      email: interestForm.email,
      type: 'locacao',
      vehicleModel: selectedVehicleForInterest?.model,
      vehiclePlate: selectedVehicleForInterest?.plate,
      vehicleImage: selectedVehicleForInterest?.image,
      message: `Obs: ${interestForm.observation || 'Sem observações'}`
    });
    setShowInterestModal(false);
    setInterestForm({ name: '', phone: '', email: '', observation: '' });
    setShowSuccessPopup(true);
  };

  return {
    view, setView,
    leads, rentals, investors, vehicles, transactions, maintenances,
    inspections, serviceOrders, systemUsers, clients, replacementContracts,
    currentUser, setCurrentUser, selectedImage, setSelectedImage,
    showInterestModal, setShowInterestModal, showSuccessPopup, setShowSuccessPopup,
    selectedVehicleForInterest, setSelectedVehicleForInterest,
    interestForm, setInterestForm,
    handleAddSystemUser, handleUpdateSystemUser, handleDeleteSystemUser,
    handleAddLead, handleUpdateLeadStatus, handleAddRental, handleDeleteRental,
    handleUpdateRental, handleAddInvestor, handleUpdateInvestor, handleDeleteInvestor,
    handleAddVehicle, handleUpdateVehicle, handleDeleteVehicle, handleAddTransaction,
    handleAddMaintenance, handleUpdateMaintenance, handleDeleteMaintenance,
    handleCompleteClosure, handlePayCaucaoInstallment, handleConfirmPayment,
    handleAddInspection, handleDeleteInspection, handleCloseServiceOrder,
    handleInterestSubmit
  };
};
