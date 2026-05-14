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


  // Robust Mapping System for Portuguese Database Schema (Audited from Supabase)
  const TABLE_MAPPINGS = {
    rentals: {
      id: 'id',
      vehicleId: 'vehicle_id',
      clientId: 'client_id',
      startDate: 'start_date',
      date: 'start_date', // Fallback para compatibilidade
      endDate: 'end_date',
      value: 'value',
      tireTax: 'tire_tax',
      status: 'status',
      createdAt: 'created_at',
      cnhRegisterNumber: 'registro_cnh',
      cnhNumber: 'cnh_number',
      cnh: 'cnh_number',
      birthDate: 'data_de_nascimento',
      userName: 'user_name',
      user: 'user_name',
      clientPhone: 'client_phone',
      phone: 'client_phone',
      email: 'e-mail',
      cnhValidity: 'cnh_validity',
      cnhSecurityCode: 'cnh_c\u00f3digo_de_seguran\u00e7a',
      vehicle: 'modelo',
      vehicleModel: 'modelo',
      plate: 'placa',
      vehiclePlate: 'placa',
      rentalType: 'tipo',
      durationWeeks: 'semanas',
      depositTotal: 'deposit_total',
      depositPaid: 'deposit_paid',
      depositInstallments: 'deposit_installments',
      lateFine: 'multa_tardia',
      dailyInterest: 'juros_di\u00e1rios',
      observations: 'observa\u00e7\u00f5es',
      docs: 'documentos',
      signedContract: 'contrato_assinado'
    },
    vehicles: {
      model: 'model',
      plate: 'plate',
      year: 'year',
      renavam: 'renavam',
      initialKm: 'initial_km',
      km: 'km',
      fipeValue: 'fipe_value',
      investorId: 'investor_id',
      adminTax: 'admin_tax',
      investorTax: 'investor_tax',
      hasProtection: 'has_protection',
      protectionCompany: 'protection_company',
      protectionValue: 'protection_value',
      franchiseInsurance: 'franchise_insurance',
      hasSpareKey: 'has_spare_key',
      lastBeltChangeKm: 'last_belt_change_km',
      beltChangeIntervalKm: 'belt_change_interval_km',
      image: 'image',
      weeklyRental: 'weekly_rental',
      investmentValue: 'investment_value',
      preventiveMaintenance: 'preventive_maintenance',
      entryDate: 'entry_date',
      isFavorite: 'is_favorite',
      status: 'status',
      dividend: 'dividend'
    },
    clients: {
      id: 'id',
      name: 'nome',
      email: 'e-mail',
      phone: 'telefone',
      cpf: 'cpf',
      address: 'endere\u00e7o',
      cnhNumber: 'cnh_number',
      cnh: 'cnh_number',
      cnhExpiration: 'cnh_validity',
      birthDate: 'data_de_nascimento',
      cnhRegisterNumber: 'registro_cnh',
      docs: 'documentos',
      status: 'status'
    },
    investors: {
      id: 'id',
      name: 'nome',
      email: 'e-mail',
      phone: 'telefone',
      cpf: 'cpf',
      address: 'endere\u00e7o',
      password: 'senha',
      status: 'status',
      bank: 'banco',
      pix: 'pix',
      adminTax: 'taxa_adm'
    },
    transactions: {
      type: 'tipo',
      val: 'valor',
      cat: 'categoria',
      desc: 'descri\u00e7\u00e3o',
      date: 'data',
      vehiclePlate: 'placa',
      responsible: 'respons\u00e1vel',
      status: 'status'
    }
  };

  const mapToCamel = (data, tableName) => {
    if (!data) return [];
    const mappings = TABLE_MAPPINGS[tableName] || {};
    // Create reverse mapping
    const reverseMap = {};
    Object.entries(mappings).forEach(([camel, snake]) => {
      reverseMap[snake] = camel;
    });

    return data.map(item => {
      const newItem = {};
      for (const key in item) {
        // First check explicit mapping
        if (reverseMap[key]) {
          newItem[reverseMap[key]] = item[key];
        } else {
          // Fallback to auto camelCase
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          newItem[camelKey] = item[key];
        }
      }

      // Specific join handlers
      if (item.investors?.nome) newItem.investor = item.investors.nome;
      
      return newItem;
    });
  };

  const mapToSnake = (obj, tableName) => {
    const mappings = TABLE_MAPPINGS[tableName] || {};
    const newObj = {};
    const skipKeys = ['imageFile', 'imagePreview', 'crlvFile', 'id', 'investor'];
    for (const key in obj) {
      if (skipKeys.includes(key)) continue;
      if (mappings[key]) {
        newObj[mappings[key]] = obj[key];
      } else {
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        newObj[snakeKey] = obj[key];
      }
    }
    return newObj;
  };

  // Load Data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        const tables = [
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

      for (const item of tables) {
        let query = supabase.from(item.table).select('*');
        if (item.table === 'vehicles') query = supabase.from('vehicles').select('*, investors(name)');
        if (item.table === 'rentals' || item.table === 'leads') query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        if (!error && data) {
          let mappedData = mapToCamel(data, item.table);
          
          if (item.table === 'rentals' && vehicles.length > 0) {
            mappedData = mappedData.map(rental => {
              const vehicle = vehicles.find(v => v.id === rental.vehicleId);
              return {
                ...rental,
                image: vehicle?.image || rental.image,
                vehicle: vehicle?.model || rental.vehicleModel || rental.vehicle,
                plate: vehicle?.plate || rental.vehiclePlate || rental.plate
              };
            });
            
            // Sincronização retroativa: Se houver locação ativa de cliente que não está na base, cadastra
            const currentClients = data.filter(d => d.table === 'clients').length > 0 ? mapToCamel(data.filter(d => d.table === 'clients')[0], 'clients') : clients;
            
            for (const rental of mappedData) {
              const clientExists = clients.some(c => (c.nome || c.name || '').toLowerCase() === (rental.userName || rental.user || '').toLowerCase());
              if (!clientExists && (rental.userName || rental.user)) {
                supabase.from('clients').insert([{
                  nome: rental.userName || rental.user,
                  telefone: rental.clientPhone || rental.phone,
                  cnh_number: rental.cnhNumber || rental.cnh,
                  cnh_expiration: rental.cnhValidity,
                  status: 'Ativo'
                }]).then(() => {
                   supabase.from('clients').select('*').then(({data: cData}) => {
                     if (cData) setClients(mapToCamel(cData, 'clients'));
                   });
                });
              }
            }
          }
          
          item.setter(mappedData);
        }
      }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    };

    loadData();
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
    try {
      // Map keys to Portuguese database schema
      const payload = mapToSnake(rental, 'rentals');
      
      // Limpeza de campos que são apenas para o frontend ou calculados
      delete payload.id;
      delete payload.image;
      delete payload.vehicle;
      delete payload.plate;
      delete payload.date;
      delete payload.period;

      // --- NOVO: Upload de Documentos ---
      const uploadedDocs = { ...(rental.docs || {}) };
      
      // Upload CNH
      if (rental.docs?.cnh instanceof File) {
        const url = await uploadFile(rental.docs.cnh, `condutores/${rental.user}`);
        if (url) uploadedDocs.cnh = url;
      }
      
      // Upload Comprovante de Residência
      if (rental.docs?.residence instanceof File) {
        const url = await uploadFile(rental.docs.residence, `condutores/${rental.user}`);
        if (url) uploadedDocs.residence = url;
      }
      
      // Upload Prints do App
      if (rental.docs?.appPrints && Array.isArray(rental.docs.appPrints)) {
        const printUrls = await Promise.all(rental.docs.appPrints.map(async (print) => {
          if (print instanceof File) {
            return await uploadFile(print, `condutores/${rental.user}/prints`);
          }
          return print;
        }));
        uploadedDocs.appPrints = printUrls.filter(u => u);
      }

      // Atualiza o payload com os caminhos/URLs dos documentos
      payload['documentos'] = uploadedDocs;

      const parseBRL = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
      };

      // Ensure specific fields are correctly formatted
      payload['value'] = parseBRL(rental.value);
      payload['imposto_de_pneus'] = parseBRL(rental.tireTax);
      payload['total do dep\u00f3sito'] = parseBRL(rental.depositTotal);
      payload['cau\u00e7\u00e3o_paga'] = parseBRL(rental.depositPaid);
      payload['multa_tardia'] = parseFloat(rental.lateFine) || 0;
      payload['juros_di\u00e1rios'] = parseFloat(rental.dailyInterest) || 0;
      
      payload['status'] = 'Ativo';
      payload['start_date'] = rental.startDate;

      const { data, error } = await supabase.from('rentals').insert([payload]).select();
      if (error) throw error;
      
      // Automação: Criar ou atualizar registro na tabela de Clientes (Baseado no condutor da locação)
      const clientPayload = {
        nome: rental.user,
        telefone: rental.clientPhone || rental.phone,
        'e-mail': rental.email,
        cnh_number: rental.cnhNumber || rental.cnh,
        cnh_validity: rental.cnhValidity,
        registro_cnh: rental.cnhRegisterNumber,
        data_de_nascimento: rental.birthDate,
        documentos: uploadedDocs,
        status: 'Ativo'
      };
      
      // Tenta inserir ou atualizar se já existir (usando nome como critério de busca se não houver ID)
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('cnh_number', clientPayload.cnh_number)
        .maybeSingle();

      if (existingClient) {
        await supabase.from('clients').update(clientPayload).eq('id', existingClient.id);
      } else {
        await supabase.from('clients').insert([clientPayload]);
      }
      
      // Recarregar dados de clientes para manter o estado do frontend atualizado
      const { data: updatedClients } = await supabase.from('clients').select('*');
      if (updatedClients) setClients(mapToCamel(updatedClients, 'clients'));

      if (data) {
        const newRental = mapToCamel(data, 'rentals')[0];
        const vehicle = vehicles.find(v => v.id === rental.vehicleId);
        const enrichedRental = {
          ...newRental,
          image: vehicle?.image || rental.image,
          vehicle: vehicle?.model || rental.vehicleModel || rental.vehicle,
          plate: vehicle?.plate || rental.vehiclePlate || rental.plate
        };
        setRentals(prev => [enrichedRental, ...prev]);
      }
      
      await handleUpdateVehicle({ id: rental.vehicleId, status: 'Alugado' });
      return { success: true };
    } catch (error) {
      console.error("Erro ao criar locação:", error);
      alert(`Erro no Banco de Dados: ${error.message}`);
      return { success: false, error };
    }
  };

  const handleDeleteRental = async (id) => {
    const rental = rentals.find(r => r.id === id);
    const { error } = await supabase.from('rentals').delete().eq('id', id);
    if (!error) {
      if (rental) await handleUpdateVehicle({ id: rental.vehicleId, status: 'Dispon\u00edvel' });
      setRentals(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleUpdateRental = async (updatedRental) => {
    try {
      let finalRental = { ...updatedRental };

      // Se houver um arquivo de contrato assinado (objeto File), faz o upload primeiro
      if (updatedRental.docs?.signedContract instanceof File) {
        const file = updatedRental.docs.signedContract;
        const fileUrl = await uploadFile(file, 'contratos');
        if (fileUrl) {
          finalRental.docs = { ...finalRental.docs, signedContract: fileUrl };
        }
      }

      // Map to database schema
      const payload = mapToSnake(finalRental, 'rentals');
      
      // Clean up for update (Supabase update doesn't like some fields if they are missing or different type)
      delete payload.id;
      delete payload.image;
      delete payload.vehicle;
      delete payload.plate;
      delete payload.date;
      delete payload.period;
      
      if (payload.value) payload.value = parseFloat(String(payload.value).replace(/\./g, '').replace(',', '.'));

      const { error } = await supabase.from('rentals').update(payload).eq('id', finalRental.id);
      if (error) throw error;

      setRentals(prev => prev.map(r => r.id === finalRental.id ? { ...finalRental } : r));
      alert('Contrato anexado com sucesso!');
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar loca\u00e7\u00e3o:", error);
      alert(`Erro ao salvar: ${error.message}`);
      return { success: false, error };
    }
  };

  const handleAddInvestor = async (investor) => {
    const { data, error } = await supabase.from('investors').insert([mapToSnake(investor, 'investors')]).select();
    if (!error && data) setInvestors(prev => [mapToCamel(data, 'investors')[0], ...prev]);
  };

  const handleUpdateInvestor = async (updatedInvestor) => {
    const { error } = await supabase.from('investors').update(mapToSnake(updatedInvestor, 'investors')).eq('id', updatedInvestor.id);
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

    const parseBRL = (val) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
    };

    // Busca o UUID do investidor pelo nome
    const investorObj = investors.find(inv => inv.name === vehicle.investor || inv.id === vehicle.investor);
    const investorId = investorObj ? investorObj.id : null;

    const dbVehicle = mapToSnake({
      ...vehicle,
      image: imageUrl,
      investorId,
      status: 'Disponível'
    }, 'vehicles');

    // Override with parsed numbers
    dbVehicle['km_inicial'] = parseFloat(vehicle.initialKm) || 0;
    dbVehicle['km'] = parseFloat(vehicle.initialKm) || 0;
    dbVehicle['valor_fipe'] = parseBRL(vehicle.fipeValue);
    dbVehicle['aluguel semanal'] = parseBRL(vehicle.weeklyRental);
    dbVehicle['valor_investimento'] = parseBRL(vehicle.investmentValue);
    dbVehicle['valor_de_prote\u00e7\u00e3o'] = parseBRL(vehicle.protectionValue);
    dbVehicle['investor_id'] = investorId;

    const { data, error } = await supabase.from('vehicles').insert([dbVehicle]).select();
    if (!error && data) setVehicles(prev => [mapToCamel(data, 'vehicles')[0], ...prev]);
    else if (error) {
      console.error("Erro ao adicionar ve\u00edculo:", error);
      alert(`Erro ao salvar ve\u00edculo: ${error.message}`);
    }
  };

  const handleUpdateVehicle = async (vehicle, imageFile) => {
    // Se for uma atualiza\u00e7\u00e3o simples de status (ex: vindo de loca\u00e7\u00e3o)
    if (Object.keys(vehicle).length <= 2 && vehicle.id && vehicle.status) {
      const { error } = await supabase.from('vehicles').update({ status: vehicle.status }).eq('id', vehicle.id);
      if (!error) {
        setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, status: vehicle.status } : v));
      }
      return;
    }

    let imageUrl = vehicle.image;
    if (vehicle.imageFile) {
      imageUrl = await uploadFile(vehicle.imageFile, 'veiculos');
    }

    const parseBRL = (val) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
    };

    // Busca o UUID do investidor pelo nome
    const investorObj = investors.find(inv => inv.name === vehicle.investor || inv.id === vehicle.investor || inv.id === vehicle.investorId);
    const investorId = investorObj ? investorObj.id : null;

    const vehicleData = { ...vehicle, image: imageUrl, investorId };
    const dbVehicle = mapToSnake(vehicleData, 'vehicles');
    
    // Manual overrides for parsed values
    dbVehicle['valor_fipe'] = parseBRL(vehicle.fipeValue);
    dbVehicle['aluguel semanal'] = parseBRL(vehicle.weeklyRental);
    dbVehicle['valor_investimento'] = parseBRL(vehicle.investmentValue);
    dbVehicle['valor_de_prote\u00e7\u00e3o'] = parseBRL(vehicle.protectionValue);
    dbVehicle['km'] = parseFloat(vehicle.km || vehicle.initialKm) || 0;
    dbVehicle['km_inicial'] = parseFloat(vehicle.initialKm) || 0;

    const { error } = await supabase.from('vehicles').update(dbVehicle).eq('id', vehicle.id);
    if (!error) {
      setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...vehicle, ...mapToCamel([dbVehicle], 'vehicles')[0] } : v));
    } else {
      console.error("Erro detalhado ao atualizar ve\u00edculo:", error);
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  const handleDeleteVehicle = async (id) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const handleAddTransaction = async (transaction) => {
    const { data, error } = await supabase.from('transactions').insert([mapToSnake(transaction, 'transactions')]).select();
    if (!error && data) setTransactions(prev => [mapToCamel(data, 'transactions')[0], ...prev]);
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
    handleInterestSubmit,
    seedData: () => console.log('Seed data is no longer available.')
  };
};
