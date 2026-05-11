import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../utils/supabaseStorage';

export const useAppState = () => {
  const [view, setView] = useState('home');
  const [leads, setLeads] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [vehicles, setVehicles] = useState([]);
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

  const mapToCamel = (data) => {
    if (!data) return [];
    return data.map(item => {
      const newItem = {};
      for (const key in item) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newItem[camelKey] = item[key];
      }
      return newItem;
    });
  };

  const mapToSnake = (obj) => {
    const newObj = {};
    for (const key in obj) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = obj[key];
    }
    return newObj;
  };

  // Load Data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      const config = [
        { table: 'leads', setter: setLeads },
        { table: 'rentals', setter: setRentals },
        { table: 'investors', setter: setInvestors },
        { table: 'vehicles', setter: setVehicles },
        { table: 'transactions', setter: setTransactions },
        { table: 'maintenances', setter: setMaintenances },
        { table: 'inspections', setter: setInspections },
        { table: 'service_orders', setter: setServiceOrders },
        { table: 'system_users', setter: setSystemUsers },
        { table: 'clients', setter: setClients },
        { table: 'replacement_contracts', setter: setReplacementContracts }
      ];

      for (const item of config) {
        const { data, error } = await supabase.from(item.table).select('*').order('created_at', { ascending: false });
        if (!error && data) item.setter(mapToCamel(data));
      }
    };
    fetchData();
  }, []);

  const handleAddSystemUser = async (user) => {
    const { data, error } = await supabase.from('system_users').insert([mapToSnake(user)]).select();
    if (!error && data) setSystemUsers(prev => [...prev, mapToCamel(data)[0]]);
  };

  const handleUpdateSystemUser = async (updated) => {
    const { error } = await supabase.from('system_users').update(mapToSnake(updated)).eq('id', updated.id);
    if (!error) setSystemUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  };

  const handleDeleteSystemUser = async (id) => {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (!error) setSystemUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleAddLead = async (lead) => {
    const newLead = { 
      name: lead.name,
      contact: lead.contact,
      email: lead.email,
      type: lead.type,
      vehicleModel: lead.vehicleModel,
      vehiclePlate: lead.vehiclePlate,
      message: lead.message,
      status: 'Novo', 
      date: new Date().toLocaleDateString('pt-BR') 
    };
    const { data, error } = await supabase.from('leads').insert([mapToSnake(newLead)]).select();
    if (!error && data) setLeads(prev => [mapToCamel(data)[0], ...prev]);
  };

  const handleUpdateLeadStatus = async (id, status, updatedBy) => {
    const { error } = await supabase.from('leads').update({ status, updated_by: updatedBy }).eq('id', id);
    if (!error) setLeads(prev => prev.map(l => l.id === id ? { ...l, status, updatedBy } : l));
  };

  const handleAddRental = async (rental) => {
    const { data, error } = await supabase.from('rentals').insert([mapToSnake(rental)]).select();
    if (!error && data) {
      setRentals(prev => [mapToCamel(data)[0], ...prev]);
      await handleUpdateVehicle({ id: rental.vehicleId, status: 'Alugado' });
    }
  };

  const handleDeleteRental = async (id) => {
    const rental = rentals.find(r => r.id === id);
    const { error } = await supabase.from('rentals').delete().eq('id', id);
    if (!error) {
      if (rental) await handleUpdateVehicle({ id: rental.vehicleId, status: 'Disponível' });
      setRentals(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleUpdateRental = async (updatedRental) => {
    const { error } = await supabase.from('rentals').update(mapToSnake(updatedRental)).eq('id', updatedRental.id);
    if (!error) setRentals(prev => prev.map(r => r.id === updatedRental.id ? updatedRental : r));
  };

  const handleAddInvestor = async (investor) => {
    const { data, error } = await supabase.from('investors').insert([mapToSnake(investor)]).select();
    if (!error && data) setInvestors(prev => [mapToCamel(data)[0], ...prev]);
  };

  const handleUpdateInvestor = async (updatedInvestor) => {
    const { error } = await supabase.from('investors').update(mapToSnake(updatedInvestor)).eq('id', updatedInvestor.id);
    if (!error) setInvestors(prev => prev.map(i => i.id === updatedInvestor.id ? updatedInvestor : i));
  };

  const handleDeleteInvestor = async (id) => {
    const { error } = await supabase.from('investors').delete().eq('id', id);
    if (!error) setInvestors(prev => prev.filter(i => i.id !== id));
  };

  const handleAddVehicle = async (vehicle) => {
    let imageUrl = vehicle.image;
    
    // Se houver um arquivo real, faz o upload
    if (vehicle.imageFile) {
      imageUrl = await uploadFile(vehicle.imageFile, 'veiculos');
    }

    const dbVehicle = {
      model: vehicle.model,
      plate: vehicle.plate,
      year: vehicle.year,
      renavam: vehicle.renavam,
      initial_km: parseFloat(vehicle.initialKm) || 0,
      km: parseFloat(vehicle.initialKm) || 0,
      fipe_value: parseFloat(String(vehicle.fipeValue || 0).replace(/[^\d.]/g, '')) || 0,
      admin_tax: parseFloat(vehicle.adminTax) || 15,
      investor_tax: parseFloat(vehicle.investorTax) || 85,
      has_protection: vehicle.hasProtection || false,
      protection_company: vehicle.protectionCompany || '',
      protection_payment_day: parseInt(vehicle.protectionPaymentDay) || 10,
      protection_value: parseFloat(String(vehicle.protectionValue || 0).replace(/[^\d.]/g, '')) || 0,
      franchise_insurance: vehicle.franchiseInsurance || false,
      has_spare_key: vehicle.hasSpareKey || false,
      last_belt_change_km: parseFloat(vehicle.lastBeltChangeKm) || 0,
      belt_change_interval_km: parseFloat(vehicle.beltChangeIntervalKm) || 50000,
      image: imageUrl,
      weekly_rental: parseFloat(String(vehicle.weeklyRental || 0).replace(/[^\d.]/g, '')) || 0,
      investment_value: parseFloat(String(vehicle.investmentValue || 0).replace(/[^\d.]/g, '')) || 0,
      preventive_maintenance: vehicle.preventiveMaintenance || false,
      entry_date: vehicle.entryDate,
      is_favorite: vehicle.isFavorite || false,
      status: 'Disponível'
    };

    const { data, error } = await supabase.from('vehicles').insert([dbVehicle]).select();
    if (!error && data) setVehicles(prev => [mapToCamel(data)[0], ...prev]);
  };

  const handleUpdateVehicle = async (vehicle) => {
    let imageUrl = vehicle.image;
    if (vehicle.imageFile) {
      imageUrl = await uploadFile(vehicle.imageFile, 'veiculos');
    }

    const dbVehicle = {
      model: vehicle.model,
      plate: vehicle.plate,
      year: vehicle.year,
      renavam: vehicle.renavam,
      initial_km: parseFloat(vehicle.initialKm) || 0,
      km: parseFloat(vehicle.km || vehicle.initialKm) || 0,
      status: vehicle.status || 'Disponível',
      fipe_value: parseFloat(String(vehicle.fipeValue || 0).replace(/[^\d.]/g, '').replace(',', '.')) || 0,
      admin_tax: parseFloat(vehicle.adminTax) || 15,
      investor_tax: parseFloat(vehicle.investorTax) || 85,
      has_protection: vehicle.hasProtection,
      protection_company: vehicle.protectionCompany,
      protection_payment_day: parseInt(vehicle.protectionPaymentDay) || 10,
      protection_value: parseFloat(String(vehicle.protectionValue || 0).replace(/[^\d.]/g, '').replace(',', '.')) || 0,
      franchise_insurance: vehicle.franchiseInsurance,
      has_spare_key: vehicle.hasSpareKey,
      last_belt_change_km: parseFloat(vehicle.lastBeltChangeKm) || 0,
      belt_change_interval_km: parseFloat(vehicle.beltChangeIntervalKm) || 50000,
      image: imageUrl,
      weekly_rental: parseFloat(String(vehicle.weeklyRental || 0).replace(/[^\d.]/g, '').replace(',', '.')) || 0,
      investment_value: parseFloat(String(vehicle.investmentValue || 0).replace(/[^\d.]/g, '').replace(',', '.')) || 0,
      preventive_maintenance: vehicle.preventiveMaintenance,
      investor: vehicle.investor
    };

    const { error } = await supabase.from('vehicles').update(dbVehicle).eq('id', vehicle.id);
    if (!error) {
      setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...vehicle, image: imageUrl } : v));
    } else {
      console.error("Erro ao atualizar veículo:", error);
      alert("Erro ao salvar alterações no veículo.");
    }
  };

  const handleDeleteVehicle = async (id) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const handleAddTransaction = async (transaction) => {
    const { data, error } = await supabase.from('transactions').insert([mapToSnake(transaction)]).select();
    if (!error && data) setTransactions(prev => [mapToCamel(data)[0], ...prev]);
  };

  const handleAddMaintenance = async (maintenance) => {
    const { data, error } = await supabase.from('maintenances').insert([mapToSnake(maintenance)]).select();
    if (!error && data) setMaintenances(prev => [mapToCamel(data)[0], ...prev]);
  };

  const handleUpdateMaintenance = async (updatedMaintenance) => {
    const { error } = await supabase.from('maintenances').update(mapToSnake(updatedMaintenance)).eq('id', updatedMaintenance.id);
    if (!error) setMaintenances(prev => prev.map(m => m.id === updatedMaintenance.id ? updatedMaintenance : m));
  };

  const handleDeleteMaintenance = async (id) => {
    const { error } = await supabase.from('maintenances').delete().eq('id', id);
    if (!error) setMaintenances(prev => prev.filter(m => m.id !== id));
  };

  const handleCompleteClosure = async (rentalId, closureData) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return;

    const { error } = await supabase.from('rentals').update({ status: 'Encerrado', end_date: new Date().toISOString().split('T')[0] }).eq('id', rentalId);
    
    if (!error) {
      setRentals(prev => prev.map(r => r.id === rentalId ? { ...r, status: 'Encerrado' } : r));
      await handleUpdateVehicle({ id: rental.vehicleId, status: 'Disponível' });

      await handleAddTransaction({
        date: new Date().toISOString().split('T')[0],
        type: closureData.type === 'return' ? 'out' : 'in',
        val: closureData.balance,
        desc: `Liquidação Final - ${rental.user}`,
        cat: closureData.type === 'return' ? 'Caução' : 'Aluguel',
        vehiclePlate: rental.plate,
        status: 'Pendente',
        responsible: 'Administradora'
      });
    }
  };

  const handlePayCaucaoInstallment = async (rentalId, installmentNumber, value) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return;

    const paidInstallments = [...(rental.paidInstallments || []), installmentNumber];
    const { error } = await supabase.from('rentals').update({ paid_installments: paidInstallments }).eq('id', rentalId);
    if (!error) setRentals(prev => prev.map(r => r.id === rentalId ? { ...r, paidInstallments } : r));
  };

  const handleConfirmPayment = async (rentalId, billingData) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return;

    const vehicle = vehicles.find(v => v.id === rental.vehicleId);
    const adminTaxPercent = parseFloat(vehicle?.adminTax || 15) / 100;
    const adminRevenue = (billingData.weeklyRate || 0) * adminTaxPercent;
    
    const trans = [];
    if (adminRevenue > 0) trans.push({ date: new Date().toISOString().split('T')[0], type: 'in', val: adminRevenue, desc: `Taxa Adm - ${rental.user}`, cat: 'Taxa Adm', vehiclePlate: rental.plate, status: 'pago', responsible: 'Administradora' });
    if (billingData.lateFee > 0) trans.push({ date: new Date().toISOString().split('T')[0], type: 'in', val: billingData.lateFee, desc: `Multa - ${rental.user}`, cat: 'Multas', vehiclePlate: rental.plate, status: 'pago', responsible: 'Administradora' });

    if (trans.length > 0) {
      const { data, error } = await supabase.from('transactions').insert(trans.map(mapToSnake)).select();
      if (!error && data) setTransactions(prev => [...mapToCamel(data), ...prev]);
    }
  };

  const handleAddInspection = async (inspection) => {
    try {
      // 1. Upload Gallery Photos in Parallel
      const photoEntries = Object.entries(inspection.photos || {});
      const uploadedPhotos = { ...inspection.photos };
      
      await Promise.all(photoEntries.map(async ([slot, photoObj]) => {
        if (photoObj.file) {
          const url = await uploadFile(photoObj.file, `vistorias/${inspection.vehiclePlate}`);
          uploadedPhotos[slot] = { preview: url };
        }
      }));

      // 2. Upload Damage Photos in Parallel
      const validDamages = (inspection.damages || []).filter(d => d.photo || d.description);
      const uploadedDamages = await Promise.all(validDamages.map(async (dmg) => {
        if (dmg.photo && dmg.photo.file) {
          const url = await uploadFile(dmg.photo.file, `vistorias/${inspection.vehiclePlate}/avarias`);
          return { ...dmg, photo: { preview: url } };
        }
        return dmg;
      }));

      // 3. Upload Video if exists
      let videoUrl = inspection.video;
      if (inspection.video && inspection.video.file) {
        const url = await uploadFile(inspection.video.file, `vistorias/${inspection.vehiclePlate}/videos`);
        videoUrl = { preview: url };
      }

      const finalInspection = {
        ...inspection,
        photos: uploadedPhotos,
        damages: uploadedDamages,
        video: videoUrl
      };

      const { data, error } = await supabase.from('inspections').insert([mapToSnake(finalInspection)]).select();
      if (error) throw error;
      
      if (data) {
        setInspections(prev => [mapToCamel(data)[0], ...prev]);
      }
    } catch (err) {
      console.error('Erro ao salvar vistoria com arquivos:', err.message);
      alert(`Erro ao salvar vistoria: ${err.message}`);
    }
  };

  const handleDeleteInspection = async (id) => {
    const { error } = await supabase.from('inspections').delete().eq('id', id);
    if (!error) setInspections(prev => prev.filter(ins => ins.id !== id));
  };

  const handleCloseServiceOrder = async (os, mode, replacementCarPlate) => {
    if (mode === 'open') {
      const { data, error } = await supabase.from('service_orders').insert([mapToSnake({ ...os, status: 'Aberta' })]).select();
      if (!error && data) {
        setServiceOrders(prev => [mapToCamel(data)[0], ...prev]);
        await handleUpdateVehicle({ id: os.vehicleId, status: 'Manutenção' });

        if (replacementCarPlate) {
          const rental = rentals.find(r => r.vehicleId === os.vehicleId && r.status === 'Ativo');
          if (rental) {
            const rc = { mainVehiclePlate: os.plate, replacementVehiclePlate: replacementCarPlate, driverName: rental.user, startDate: new Date().toISOString().split('T')[0], dailyRate: 80, status: 'Ativo' };
            const { data: rcData, error: rcError } = await supabase.from('replacement_contracts').insert([mapToSnake(rc)]).select();
            if (!rcError && rcData) {
              setReplacementContracts(prev => [mapToCamel(rcData)[0], ...prev]);
              const repV = vehicles.find(v => v.plate === replacementCarPlate);
              if (repV) await handleUpdateVehicle({ id: repV.id, status: 'Alugado (Reserva)' });
            }
          }
        }
      }
      return;
    }

    const { error } = await supabase.from('service_orders').update({ status: 'Concluída', closed_at: new Date().toISOString() }).eq('id', os.id);
    if (!error) {
      setServiceOrders(prev => prev.map(o => o.id === os.id ? { ...o, status: 'Concluída' } : o));
      const wasRented = rentals.some(r => r.vehicleId === os.vehicleId && r.status === 'Ativo');
      await handleUpdateVehicle({ id: os.vehicleId, status: wasRented ? 'Alugado' : 'Disponível' });

      const activeRC = replacementContracts.find(rc => rc.mainVehiclePlate === os.plate && rc.status === 'Ativo');
      if (activeRC) {
        await supabase.from('replacement_contracts').update({ status: 'Encerrado', end_date: new Date().toISOString() }).eq('id', activeRC.id);
        const repV = vehicles.find(v => v.plate === activeRC.replacementVehiclePlate);
        if (repV) await handleUpdateVehicle({ id: repV.id, status: 'Disponível' });
      }

      await handleAddMaintenance({ vehiclePlate: os.plate, vehicleModel: os.model, date: os.date, serviceType: os.description, value: os.total, provider: os.provider, currentKm: os.km, responsible: os.responsible, observations: `O.S. #${os.id}` });
    }
  };

  const handleInterestSubmit = async (e) => {
    e.preventDefault();
    await handleAddLead({ name: interestForm.name, contact: interestForm.phone, email: interestForm.email, type: 'locacao', vehicleModel: selectedVehicleForInterest?.model, vehiclePlate: selectedVehicleForInterest?.plate, message: interestForm.observation });
    setShowInterestModal(false);
    setInterestForm({ name: '', phone: '', email: '', observation: '' });
    setShowSuccessPopup(true);
  };

  return {
    view, setView, leads, rentals, investors, vehicles, transactions, maintenances,
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
