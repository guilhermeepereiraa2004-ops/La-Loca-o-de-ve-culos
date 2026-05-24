import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../utils/supabaseStorage';

// Robust Mapping System for Portuguese Database Schema (Audited from Supabase)
const TABLE_MAPPINGS = {
  rentals: {
    id: 'id',
    vehicleId: 'id_veiculo',
    clientId: 'id_cliente',
    startDate: 'start_date',
    date: 'start_date', // Fallback para compatibilidade
    endDate: 'end_date',
    value: 'value',
    tireTax: 'imposto_de_pneus',
    status: 'status',
    createdAt: 'created_at',
    cnhRegisterNumber: 'registro_cnh',
    cnh: 'cnh_number',
    cnhNumber: 'cnh_number',
    birthDate: 'data_de_nascimento',
    user: 'user_name',
    userName: 'user_name',
    phone: 'client_phone',
    clientPhone: 'client_phone',
    email: 'e-mail',
    cnhValidity: 'cnh_validity',
    cnhSecurityCode: 'cnh_c\u00f3digo_de_seguran\u00e7a',
    vehicle: 'modelo',
    vehicleModel: 'modelo',
    plate: 'placa',
    vehiclePlate: 'placa',
    rentalType: 'tipo',
    durationWeeks: 'semanas',
    depositTotal: 'total do dep\u00f3sito',
    depositPaid: 'cau\u00e7\u00e3o_paga',
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
    nome: 'nome',
    email: 'e-mail',
    phone: 'telefone',
    cpf: 'cpf',
    address: 'address',
    cnh: 'cnh_number',
    cnhNumber: 'cnh_number',
    cnhExpiration: 'cnh_validity',
    birthDate: 'data_de_nascimento',
    cnhRegisterNumber: 'registro_cnh',
    docs: 'documentos',
    status: 'status'
  },
  investors: {
    id: 'id',
    name: 'name',
    email: 'email',
    phone: 'phone',
    cpf: 'cpf',
    address: 'address',
    password: 'password',
    status: 'status',
    bank: 'bank',
    pix: 'pix'
  },
  transactions: {
    id: 'id',
    type: 'type',
    val: 'val',
    cat: 'cat',
    desc: 'desc',
    date: 'date',
    vehiclePlate: 'vehicle_plate',
    responsible: 'responsible',
    status: 'status'
  }
};

const mapToCamel = (data, tableName) => {
  if (!data) return [];
  const mappings = TABLE_MAPPINGS[tableName] || {};
  // Create reverse mapping where a snake_case key can map to multiple camelCase keys
  const reverseMap = {};
  Object.entries(mappings).forEach(([camel, snake]) => {
    if (!reverseMap[snake]) {
      reverseMap[snake] = [];
    }
    reverseMap[snake].push(camel);
  });

  return data.map(item => {
    const newItem = {};
    
    // Pass 1: explicit mappings take priority
    for (const key in item) {
      if (reverseMap[key]) {
        reverseMap[key].forEach(camelKey => {
          newItem[camelKey] = item[key];
        });
      }
    }
    
    // Pass 2: fallback to auto camelCase only if key is not already defined
    for (const key in item) {
      if (!reverseMap[key]) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        if (newItem[camelKey] === undefined) {
          newItem[camelKey] = item[key];
        }
      }
    }

    // Specific join handlers
    if (item.investors?.name) newItem.investor = item.investors.name;
    
    return newItem;
  });
};

const mapToSnake = (obj, tableName) => {
  const mappings = TABLE_MAPPINGS[tableName] || {};
  const newObj = {};
  const skipKeys = ['imageFile', 'imagePreview', 'crlvFile', 'id', 'investor', 'investors', 'adminTax'];
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

export const useAppState = () => {
  const [view, setView] = useState(() => {
    const savedAdmin = localStorage.getItem('la_admin_auth');
    const savedInvestor = localStorage.getItem('la_investor_auth');
    if (savedAdmin === 'true') return 'admin';
    if (savedInvestor) return 'investor';
    return 'home';
  });
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
  const [currentUser, setCurrentUser] = useState(() => {
    const savedInvestor = localStorage.getItem('la_investor_auth');
    if (savedInvestor) {
      try {
        return JSON.parse(savedInvestor);
      } catch (e) {
        return null;
      }
    }
    const savedAdmin = localStorage.getItem('la_admin_auth');
    if (savedAdmin === 'true') {
      return { role: 'administrador', name: 'Admin Master', email: 'Laveiculos@gmail.com', modules: null };
    }
    return null;
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [selectedVehicleForInterest, setSelectedVehicleForInterest] = useState(null);
  const [interestForm, setInterestForm] = useState({ name: '', phone: '', email: '', observation: '' });

  const [logs, setLogs] = useState([]);
  const [isLogsDbConnected, setIsLogsDbConnected] = useState(false);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setLogs(mapToCamel(data, 'system_logs'));
        setIsLogsDbConnected(true);
        return;
      }
      if (error) {
        console.warn("Supabase system_logs query returned error, falling back to localStorage:", error);
      }
    } catch (e) {
      console.warn("Supabase system_logs table not found, falling back to localStorage", e);
    }
    
    setIsLogsDbConnected(false);
    try {
      const localLogs = localStorage.getItem('la_system_logs');
      if (localLogs) {
        setLogs(JSON.parse(localLogs));
      }
    } catch (e) {
      console.error("Error loading local logs:", e);
    }
  };

  const logActivity = async (action, targetType, targetId, description, details = null) => {
    const today = new Date().toISOString();
    const uName = currentUser?.name || currentUser?.nome || (currentUser?.role === 'administrador' ? 'Admin Master' : 'Sistema');
    const uEmail = currentUser?.email || (currentUser?.role === 'administrador' ? 'Laveiculos@gmail.com' : 'system@la.com');

    const logEntry = {
      createdAt: today,
      userName: uName,
      userEmail: uEmail,
      action,
      targetType,
      targetId: String(targetId || ''),
      description,
      details
    };

    try {
      const snakePayload = mapToSnake(logEntry, 'system_logs');
      snakePayload['created_at'] = today;
      const { data, error } = await supabase.from('system_logs').insert([snakePayload]).select();
      if (!error && data) {
        const camelData = mapToCamel(data, 'system_logs')[0];
        setLogs(prev => [camelData, ...prev]);
        setIsLogsDbConnected(true);
        return;
      }
      if (error) {
        console.warn("Supabase system_logs insert returned error, falling back to localStorage:", error);
      }
    } catch (e) {
      console.warn("Could not log to Supabase system_logs:", e);
    }

    try {
      const localLogsStr = localStorage.getItem('la_system_logs') || '[]';
      const localLogs = JSON.parse(localLogsStr);
      const localEntry = { ...logEntry, id: Date.now() };
      const updatedLogs = [localEntry, ...localLogs].slice(0, 1000);
      localStorage.setItem('la_system_logs', JSON.stringify(updatedLogs));
      setLogs(updatedLogs);
    } catch (e) {
      console.error("Failed to write local log:", e);
    }
  };

  // Track logins
  useEffect(() => {
    if (currentUser) {
      const hasLoggedKey = `la_logged_${currentUser.email || 'master'}_${new Date().toDateString()}`;
      if (!sessionStorage.getItem(hasLoggedKey)) {
        sessionStorage.setItem(hasLoggedKey, 'true');
        logActivity('Login', 'Auth', null, `Login realizado com sucesso no painel administrativo`);
      }
    }
  }, [currentUser]);




  // Load Data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        // Primeiro carregamos os veículos para estarem disponíveis para enriquecer as locações
        const { data: vData, error: vError } = await supabase.from('vehicles').select('*, investors(name)');
        let allVehicles = [];
        if (!vError && vData) {
          allVehicles = mapToCamel(vData, 'vehicles');
          setVehicles(allVehicles);
        }

        const tables = [
          { table: 'leads', setter: setLeads },
          { table: 'rentals', setter: setRentals },
          { table: 'investors', setter: setInvestors },
          { table: 'transactions', setter: setTransactions },
          { table: 'maintenances', setter: setMaintenances },
          { table: 'inspections', setter: setInspections },
          { table: 'service_orders', setter: setServiceOrders },
          { table: 'system_users', setter: setSystemUsers },
          { table: 'clients', setter: setClients },
          { table: 'replacement_contracts', setter: setReplacementContracts }
        ];

        let loadedTransactions = [];

        for (const item of tables) {
          // Pulamos veículos pois já carregamos acima
          if (item.table === 'vehicles') continue;

          let query = supabase.from(item.table).select('*');
          if (item.table === 'rentals' || item.table === 'leads') query = query.order('created_at', { ascending: false });
          
          const { data, error } = await query;
          if (!error && data) {
            let mappedData = mapToCamel(data, item.table);
            
            if (item.table === 'transactions') {
              loadedTransactions = mappedData;
            }
            
            if (item.table === 'rentals') {
              const { data: cData } = await supabase.from('clients').select('*');
              const currentClients = cData ? mapToCamel(cData, 'clients') : [];
              if (cData) setClients(currentClients);

              mappedData = mappedData.map(rental => {
                const vehicle = allVehicles.find(v => v.id === rental.vehicleId);
                const client = currentClients.find(c => (c.nome || c.name || '').toLowerCase() === (rental.user || '').toLowerCase());
                return {
                  ...rental,
                  image: vehicle?.image || rental.image,
                  vehicle: vehicle?.model || rental.vehicleModel || rental.vehicle || rental.modelo,
                  plate: vehicle?.plate || rental.vehiclePlate || rental.plate || rental.placa,
                  cpf: client?.cpf || rental.cpf,
                  address: client?.address || rental.address,
                  cnh: client?.cnh || rental.cnh || rental.cnhNumber
                };
              });
              
              for (const rental of mappedData) {
                const clientExists = currentClients.some(c => (c.nome || c.name || '').toLowerCase() === (rental.user || '').toLowerCase());
                if (!clientExists && rental.user) {
                  supabase.from('clients').insert([{
                    nome: rental.user,
                    telefone: rental.clientPhone || rental.phone,
                    cnh_number: rental.cnhNumber || rental.cnh,
                    cnh_validity: rental.cnhValidity,
                    documentos: rental.docs,
                    status: 'Ativo'
                  }]).then(() => {
                     supabase.from('clients').select('*').then(({data: cDataRefresh}) => {
                       if (cDataRefresh) setClients(mapToCamel(cDataRefresh, 'clients'));
                     });
                  });
                }
              }
            }
            
            item.setter(mappedData);
          }
        }

        // --- AUTO-GERAÇÃO DE PROTEÇÃO VEICULAR ---
        try {
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth();
          const currentDay = now.getDate();
          
          let newTransactionsToInsert = [];
          
          for (const v of allVehicles) {
            const hasProt = v.hasProtection === true || String(v.hasProtection) === 'true';
            const protVal = parseFloat(String(v.protectionValue || 0).replace(/\./g, '').replace(',', '.')) || 0;
            const paymentDay = parseInt(v.protectionPaymentDay) || 10;
            
            if (hasProt && protVal > 0 && v.plate) {
              // Se hoje já chegou ou passou o dia do vencimento da proteção
              if (currentDay >= paymentDay) {
                // Verifica se já existe transação de proteção para esse veículo no mês/ano atual
                const alreadyExists = loadedTransactions.some(t => {
                  if (t.vehiclePlate !== v.plate) return false;
                  const isProtection = t.cat?.toLowerCase().includes('prote') || t.cat?.toLowerCase().includes('veicular');
                  if (!isProtection) return false;
                  
                  try {
                    const tDate = new Date(t.date + 'T12:00:00');
                    return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
                  } catch (e) {
                    return false;
                  }
                });
                
                if (!alreadyExists) {
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
                  newTransactionsToInsert.push({
                    type: 'out',
                    val: -protVal,
                    cat: 'Proteção Veicular',
                    desc: `Proteção Veicular - ${v.model} (${v.plate})`,
                    date: dateStr,
                    vehicle_plate: v.plate,
                    responsible: 'Administradora',
                    status: 'Pendente'
                  });
                }
              }
            }
          }
          
          if (newTransactionsToInsert.length > 0) {
            const { data: insertedData, error: insertError } = await supabase
              .from('transactions')
              .insert(newTransactionsToInsert)
              .select();
              
            if (!insertError && insertedData) {
              const mappedInserted = mapToCamel(insertedData, 'transactions');
              const finalTransactions = [...mappedInserted, ...loadedTransactions];
              setTransactions(finalTransactions);
            } else if (insertError) {
              console.error("Erro ao inserir transações de proteção automática:", insertError);
            }
          }
        } catch (autoErr) {
          console.error("Erro no processo de auto-geração de transações:", autoErr);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
      
      // Carregar os logs do sistema
      await loadLogs();
    };

    loadData();
  }, []);

  const handleAddSystemUser = async (user) => {
    const { data, error } = await supabase.from('system_users').insert([mapToSnake(user)]).select();
    if (!error && data) {
      setSystemUsers(prev => [...prev, mapToCamel(data)[0]]);
      logActivity('Criar', 'Usuário', data[0].id, `Criou o usuário ${user.name} (${user.email})`);
    }
  };

  const handleUpdateSystemUser = async (updated) => {
    const { error } = await supabase.from('system_users').update(mapToSnake(updated)).eq('id', updated.id);
    if (!error) {
      setSystemUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      logActivity('Atualizar', 'Usuário', updated.id, `Atualizou o usuário ${updated.name}`);
    }
  };

  const handleDeleteSystemUser = async (id) => {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (!error) {
      setSystemUsers(prev => prev.filter(u => u.id !== id));
      logActivity('Apagar', 'Usuário', id, `Excluiu o usuário ID ${id}`);
    }
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
    if (!error && data) {
      setLeads(prev => [mapToCamel(data)[0], ...prev]);
      logActivity('Criar', 'Lead', data[0].id, `Criou novo lead: ${newLead.name} para o modelo ${newLead.vehicleModel || 'não especificado'}`);
    }
  };

  const handleUpdateLeadStatus = async (id, status, updatedBy) => {
    const { error } = await supabase.from('leads').update({ status, updated_by: updatedBy }).eq('id', id);
    if (!error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status, updatedBy } : l));
      logActivity('Atualizar', 'Lead', id, `Atualizou status do lead ID ${id} para ${status}`);
    }
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
      delete payload.cpf;
      delete payload.address;

      // --- NOVO: Upload de Documentos ---
      const uploadedDocs = { ...(rental.docs || {}) };
      const userName = rental.user || 'usuario';
      
      // Upload CNH
      if (rental.docs?.cnh instanceof File) {
        const url = await uploadFile(rental.docs.cnh, `condutores/${userName}`);
        if (url) uploadedDocs.cnh = url;
      }
      
      // Upload Comprovante de Residência
      if (rental.docs?.residence instanceof File) {
        const url = await uploadFile(rental.docs.residence, `condutores/${userName}`);
        if (url) uploadedDocs.residence = url;
      }
      
      // Upload Prints do App
      if (rental.docs?.appPrints && Array.isArray(rental.docs.appPrints)) {
        const printUrls = await Promise.all(rental.docs.appPrints.map(async (print) => {
          if (print instanceof File) {
            return await uploadFile(print, `condutores/${userName}/prints`);
          }
          return print;
        }));
        uploadedDocs.appPrints = printUrls.filter(u => u);
      }

      // Upload Contrato Assinado (caso já venha no form de nova locação)
      if (rental.docs?.signedContract instanceof File) {
        const url = await uploadFile(rental.docs.signedContract, `condutores/${userName}/contratos`);
        if (url) uploadedDocs.signedContract = url;
      }

      // Limpeza de segurança: Garante que nenhum objeto File permaneça no JSON
      Object.keys(uploadedDocs).forEach(key => {
        if (uploadedDocs[key] instanceof File) delete uploadedDocs[key];
      });


      // Atualiza o payload com os caminhos/URLs dos documentos
      payload['documentos'] = uploadedDocs;

      const parseBRL = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
      };

      // Ensure specific fields are correctly formatted via mapping or direct assignment
      // The mapToSnake already handles most, but we ensure BRL parsing here
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
      
      // Automação: Criar ou atualizar registro na tabela de Clientes
      try {
        const cleanDate = (d) => (d && String(d).trim() !== '') ? d : null;
        
        const clientPayload = {
          nome: rental.user,
          telefone: rental.clientPhone || rental.phone || null,
          'e-mail': rental.email || null,
          cpf: rental.cpf || null,
          cnh_number: rental.cnhNumber || rental.cnh || null,
          cnh_validity: cleanDate(rental.cnhValidity),
          registro_cnh: rental.cnhRegisterNumber || null,
          data_de_nascimento: cleanDate(rental.birthDate),
          documentos: { ...(uploadedDocs || {}) },
          status: 'Ativo'
        };

        if (clientPayload.cnh_number) {
          const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('cnh_number', clientPayload.cnh_number)
            .maybeSingle();

          if (existingClient) {
            const { error: updateError } = await supabase.from('clients').update(clientPayload).eq('id', existingClient.id);
            if (updateError) throw updateError;
            // Vincula o ID do cliente ao payload da locação (localmente)
            payload['id_cliente'] = existingClient.id;
          } else {
            const { data: newClient, error: insertError } = await supabase.from('clients').insert([clientPayload]).select();
            if (insertError) throw insertError;
            if (newClient && newClient[0]) {
              payload['id_cliente'] = newClient[0].id;
            }
          }
          
          // Se o ID do cliente foi obtido, atualiza a locação no banco
          if (payload['id_cliente'] && data && data[0]) {
            await supabase.from('rentals').update({ id_cliente: payload['id_cliente'] }).eq('id', data[0].id);
          }
          
          // Refresh clients list immediately
          const updatedClientObj = {
            id: payload['id_cliente'],
            name: clientPayload.nome,
            phone: clientPayload.telefone,
            email: clientPayload['e-mail'],
            cpf: clientPayload.cpf,
            cnhNumber: clientPayload.cnh_number,
            cnhValidity: clientPayload.cnh_validity,
            cnhRegisterNumber: clientPayload.registro_cnh,
            birthDate: clientPayload.data_de_nascimento,
            docs: clientPayload.documentos,
            status: 'Ativo'
          };

          setClients(prev => {
            const exists = prev.find(c => c.cnhNumber === updatedClientObj.cnhNumber);
            if (exists) {
              return prev.map(c => c.cnhNumber === updatedClientObj.cnhNumber ? { ...c, ...updatedClientObj } : c);
            }
            return [updatedClientObj, ...prev];
          });
          const { data: updatedClients, error: selectError } = await supabase.from('clients').select('*');
          if (selectError) throw selectError;
          if (updatedClients) setClients(mapToCamel(updatedClients, 'clients'));
        }
      } catch (clientErr) {
        console.error("Erro na sincronização de cliente:", clientErr);
        const errorMsg = clientErr.details || clientErr.message || 'Erro desconhecido';
        alert(`Atenção: A locação foi salva, mas houve um erro ao cadastrar o cliente na Base de Clientes.\n\nDetalhes: ${errorMsg}`);
      }

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
        logActivity('Criar', 'Locação', newRental.id, `Criou locação para ${rental.userName || rental.user} - Veículo: ${rental.plate || rental.vehiclePlate || enrichedRental.plate}`);
      }
      
      await handleUpdateVehicle({ id: rental.vehicleId, status: 'Alugado' });
      return { success: true };
    } catch (error) {
      console.error("Erro detalhado ao criar locação:", error);
      // Exibe o erro completo para diagnóstico
      const errorMsg = error.details || error.message || 'Erro desconhecido';
      const hint = error.hint ? `\n\nDica: ${error.hint}` : '';
      alert(`ERRO NO BANCO DE DADOS:\n${errorMsg}${hint}\n\nVerifique se as colunas na tabela do Supabase batem com os nomes no código.`);
      return { success: false, error };
    }
  };

  const handleDeleteRental = async (id) => {
    const rental = rentals.find(r => r.id === id);
    const { error } = await supabase.from('rentals').delete().eq('id', id);
    if (!error) {
      if (rental) await handleUpdateVehicle({ id: rental.vehicleId, status: 'Disponível' });
      setRentals(prev => prev.filter(r => r.id !== id));
      logActivity('Apagar', 'Locação', id, `Excluiu a locação de ${rental?.userName || rental?.user || 'desconhecido'} (Veículo ID: ${rental?.vehicleId})`);
    }
  };

  const handleUpdateClient = async (updatedClient) => {
    const payload = mapToSnake(updatedClient, 'clients');
    delete payload.id;
    const { error } = await supabase.from('clients').update(payload).eq('id', updatedClient.id);
    if (!error) {
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      logActivity('Atualizar', 'Cliente', updatedClient.id, `Atualizou dados do cliente ${updatedClient.nome || updatedClient.name}`);
    }
    return { success: !error, error };
  };

  const handleUpdateRental = async (updatedRental) => {
    try {
      let finalRental = { ...updatedRental };
      const userName = finalRental.user || finalRental.userName || 'usuario';

      // Sincroniza upload de todos os possíveis documentos na edição
      const uploadedDocs = { ...(finalRental.docs || {}) };
      
      if (uploadedDocs.cnh instanceof File) {
        const url = await uploadFile(uploadedDocs.cnh, `condutores/${userName}`);
        if (url) uploadedDocs.cnh = url;
      }
      if (uploadedDocs.residence instanceof File) {
        const url = await uploadFile(uploadedDocs.residence, `condutores/${userName}`);
        if (url) uploadedDocs.residence = url;
      }
      if (uploadedDocs.signedContract instanceof File) {
        const url = await uploadFile(uploadedDocs.signedContract, `condutores/${userName}/contratos`);
        if (url) uploadedDocs.signedContract = url;
      }
      if (uploadedDocs.appPrints && Array.isArray(uploadedDocs.appPrints)) {
        const printUrls = await Promise.all(uploadedDocs.appPrints.map(async (print) => {
          if (print instanceof File) return await uploadFile(print, `condutores/${userName}/prints`);
          return print;
        }));
        uploadedDocs.appPrints = printUrls.filter(u => u);
      }

      // Limpeza de segurança
      Object.keys(uploadedDocs).forEach(key => {
        if (uploadedDocs[key] instanceof File) delete uploadedDocs[key];
      });

      finalRental.docs = uploadedDocs;

      // Map to database schema
      const payload = mapToSnake(finalRental, 'rentals');
      
      // Clean up for update (Supabase update doesn't like some fields if they are missing or different type)
      delete payload.id;
      delete payload.image;
      delete payload.vehicle;
      delete payload.plate;
      delete payload.date;
      delete payload.period;
      delete payload.cpf;
      delete payload.address;
      
      if (payload.value) payload.value = parseFloat(String(payload.value).replace(/\./g, '').replace(',', '.'));

      const { error } = await supabase.from('rentals').update(payload).eq('id', finalRental.id);
      if (error) throw error;

      // Sincroniza com a tabela de clientes
      const oldRental = rentals.find(r => r.id === finalRental.id);
      if (finalRental.user || finalRental.userName) {
        const cnh = finalRental.cnhNumber || finalRental.cnh;
        const oldCnh = oldRental?.cnhNumber || oldRental?.cnh;
        const clientId = finalRental.clientId || oldRental?.clientId;

        const clientPayload = {
          nome: finalRental.userName || finalRental.user,
          telefone: finalRental.clientPhone || finalRental.phone,
          'e-mail': finalRental.email,
          cpf: finalRental.cpf || null,
          cnh_number: cnh,
          cnh_validity: finalRental.cnhValidity,
          registro_cnh: finalRental.cnhRegisterNumber,
          data_de_nascimento: finalRental.birthDate,
          documentos: finalRental.docs,
          status: 'Ativo'
        };

        // Remove campos undefined
        Object.keys(clientPayload).forEach(key => clientPayload[key] === undefined && delete clientPayload[key]);
        
        let clientUpdated = false;
        // 1. Tenta por ID
        if (clientId) {
          const { error } = await supabase.from('clients').update(clientPayload).eq('id', clientId);
          if (!error) clientUpdated = true;
        } 
        
        // 2. Se não deu certo por ID, tenta pela CNH (nova ou antiga)
        if (!clientUpdated && (cnh || oldCnh)) {
          const { error } = await supabase.from('clients').update(clientPayload).or(`cnh_number.eq.${cnh},cnh_number.eq.${oldCnh}`);
          if (!error) clientUpdated = true;
        }
        
        // Atualiza estado local de clientes para refletir a mudança imediatamente
        setClients(prev => prev.map(c => {
          const isMatch = (clientId && c.id === clientId) || 
                          (cnh && c.cnhNumber === cnh) || 
                          (oldCnh && c.cnhNumber === oldCnh);
          if (isMatch) {
            return { 
              ...c, 
              ...clientPayload, 
              name: clientPayload.nome, 
              nome: clientPayload.nome, 
              phone: clientPayload.telefone, 
              email: clientPayload['e-mail'],
              docs: clientPayload.documentos, // Garante que docs seja atualizado
              cnhNumber: clientPayload.cnh_number,
              cnhValidity: clientPayload.cnh_validity,
              cnhRegisterNumber: clientPayload.registro_cnh,
              birthDate: clientPayload.data_de_nascimento,
              cpf: clientPayload.cpf
            };
          }
          return c;
        }));
      }
      setRentals(prev => prev.map(r => r.id === finalRental.id ? { ...finalRental } : r));
      logActivity('Atualizar', 'Locação', finalRental.id, `Atualizou a locação de ${finalRental.userName || finalRental.user}`);
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar loca\u00e7\u00e3o:", error);
      alert(`Erro ao salvar: ${error.message}`);
      return { success: false, error };
    }
  };

  const handleAddInvestor = async (investor) => {
    try {
      const payload = mapToSnake(investor, 'investors');
      const { data, error } = await supabase.from('investors').insert([payload]).select();
      if (error) throw error;
      if (data && data.length > 0) {
        const camelData = mapToCamel(data, 'investors')[0];
        setInvestors(prev => [camelData, ...prev]);
        logActivity('Criar', 'Investidor', camelData.id, `Cadastrou o investidor ${camelData.name}`);
        return { success: true, data: camelData };
      }
      return { success: false, error: new Error('Nenhum dado retornado do servidor') };
    } catch (err) {
      console.error("Erro ao cadastrar investidor:", err);
      alert(`Erro ao cadastrar investidor: ${err.message}`);
      return { success: false, error: err };
    }
  };

  const handleUpdateInvestor = async (updatedInvestor) => {
    try {
      const payload = mapToSnake(updatedInvestor, 'investors');
      const { error } = await supabase.from('investors').update(payload).eq('id', updatedInvestor.id);
      if (error) throw error;
      setInvestors(prev => prev.map(i => i.id === updatedInvestor.id ? updatedInvestor : i));
      logActivity('Atualizar', 'Investidor', updatedInvestor.id, `Atualizou os dados do investidor ${updatedInvestor.name}`);
      return { success: true };
    } catch (err) {
      console.error("Erro ao atualizar investidor:", err);
      alert(`Erro ao atualizar investidor: ${err.message}`);
      return { success: false, error: err };
    }
  };

  const handleDeleteInvestor = async (id) => {
    const investor = investors.find(i => i.id === id);
    const { error } = await supabase.from('investors').delete().eq('id', id);
    if (!error) {
      setInvestors(prev => prev.filter(i => i.id !== id));
      logActivity('Apagar', 'Investidor', id, `Excluiu o investidor ${investor?.name || 'ID: ' + id}`);
    }
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
    dbVehicle['year'] = parseInt(vehicle.year) || null;
    dbVehicle['initial_km'] = parseFloat(vehicle.initialKm) || 0;
    dbVehicle['km'] = parseFloat(vehicle.initialKm) || 0;
    dbVehicle['fipe_value'] = parseBRL(vehicle.fipeValue);
    dbVehicle['weekly_rental'] = parseBRL(vehicle.weeklyRental);
    dbVehicle['investment_value'] = parseBRL(vehicle.investmentValue);
    dbVehicle['protection_value'] = parseBRL(vehicle.protectionValue);
    dbVehicle['admin_tax'] = parseFloat(vehicle.adminTax) || 0;
    dbVehicle['investor_tax'] = parseFloat(vehicle.investorTax) || 0;
    dbVehicle['franchise_insurance'] = parseBRL(vehicle.franchiseInsurance);
    dbVehicle['last_belt_change_km'] = parseFloat(vehicle.lastBeltChangeKm) || null;
    dbVehicle['belt_change_interval_km'] = parseFloat(vehicle.beltChangeIntervalKm) || null;
    dbVehicle['dividend'] = parseBRL(vehicle.dividend);
    dbVehicle['investor_id'] = investorId;

    const { data, error } = await supabase.from('vehicles').insert([dbVehicle]).select();
    if (!error && data) {
      const newV = mapToCamel(data, 'vehicles')[0];
      setVehicles(prev => [newV, ...prev]);
      logActivity('Criar', 'Veículo', newV.id, `Cadastrou o veículo ${newV.model} (${newV.plate})`);
    } else if (error) {
      console.error("Erro ao adicionar veículo:", error);
      alert(`Erro ao salvar veículo: ${error.message}`);
    }
  };

  const handleUpdateVehicle = async (vehicle, imageFile) => {
    // Se for uma atualização simples de status (ex: vindo de locação)
    if (Object.keys(vehicle).length <= 2 && vehicle.id && vehicle.status) {
      const { error } = await supabase.from('vehicles').update({ status: vehicle.status }).eq('id', vehicle.id);
      if (!error) {
        setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, status: vehicle.status } : v));
        const v = vehicles.find(x => x.id === vehicle.id);
        logActivity('Atualizar', 'Veículo', vehicle.id, `Atualizou status do veículo ${v?.model || 'ID: ' + vehicle.id} (${v?.plate || ''}) para: ${vehicle.status}`);
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
    dbVehicle['year'] = parseInt(vehicle.year) || null;
    dbVehicle['fipe_value'] = parseBRL(vehicle.fipeValue);
    dbVehicle['weekly_rental'] = parseBRL(vehicle.weeklyRental);
    dbVehicle['investment_value'] = parseBRL(vehicle.investmentValue);
    dbVehicle['protection_value'] = parseBRL(vehicle.protectionValue);
    dbVehicle['km'] = parseFloat(vehicle.km || vehicle.initialKm) || 0;
    dbVehicle['initial_km'] = parseFloat(vehicle.initialKm) || 0;
    dbVehicle['admin_tax'] = parseFloat(vehicle.adminTax) || 0;
    dbVehicle['investor_tax'] = parseFloat(vehicle.investorTax) || 0;
    dbVehicle['franchise_insurance'] = parseBRL(vehicle.franchiseInsurance);
    dbVehicle['last_belt_change_km'] = parseFloat(vehicle.lastBeltChangeKm) || null;
    dbVehicle['belt_change_interval_km'] = parseFloat(vehicle.beltChangeIntervalKm) || null;
    dbVehicle['dividend'] = parseBRL(vehicle.dividend);

    const { error } = await supabase.from('vehicles').update(dbVehicle).eq('id', vehicle.id);
    if (!error) {
      const updatedCamel = { ...vehicle, ...mapToCamel([dbVehicle], 'vehicles')[0] };
      setVehicles(prev => prev.map(v => v.id === vehicle.id ? updatedCamel : v));
      logActivity('Atualizar', 'Veículo', vehicle.id, `Atualizou os dados do veículo ${updatedCamel.model} (${updatedCamel.plate})`);
    } else {
      console.error("Erro detalhado ao atualizar veículo:", error);
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  const handleDeleteVehicle = async (id) => {
    const vehicle = vehicles.find(v => v.id === id);
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) {
      setVehicles(prev => prev.filter(v => v.id !== id));
      logActivity('Apagar', 'Veículo', id, `Excluiu o veículo ${vehicle?.model || 'ID: ' + id} (${vehicle?.plate || ''})`);
    }
  };

  const handleAddTransaction = async (transaction) => {
    const { data, error } = await supabase.from('transactions').insert([mapToSnake(transaction, 'transactions')]).select();
    if (!error && data) {
      const newTx = mapToCamel(data, 'transactions')[0];
      setTransactions(prev => [newTx, ...prev]);
      logActivity('Criar', 'Financeiro', newTx.id, `Lançou transação de ${newTx.type === 'in' ? 'Recebimento' : 'Pagamento'}: R$ ${newTx.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Desc: ${newTx.desc}`);
    }
  };

  const handleUpdateTransactionStatus = async (id, status) => {
    const tx = transactions.find(t => t.id === id);
    const { error } = await supabase.from('transactions').update({ status }).eq('id', id);
    if (!error) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      logActivity('Atualizar', 'Financeiro', id, `Atualizou status da transação de R$ ${tx?.val} (${tx?.desc}) para: ${status}`);
    } else {
      console.error("Erro ao atualizar status da transação:", error);
      alert("Erro ao atualizar o status da transação.");
    }
  };

  const handleAddMaintenance = async (maintenance) => {
    const { data, error } = await supabase.from('maintenances').insert([mapToSnake(maintenance)]).select();
    if (!error && data && data.length > 0) {
      const inserted = mapToCamel(data)[0];
      setMaintenances(prev => [inserted, ...prev]);
      logActivity('Criar', 'Manutenção', inserted.id, `Lançou manutenção para o veículo ${maintenance.vehiclePlate} - Tipo: ${maintenance.serviceType} - R$ ${maintenance.value}`);

      // Sincronizar com o financeiro (lançamento automático)
      try {
        const vehicle = vehicles.find(v => v.plate === maintenance.vehiclePlate);
        const investorName = vehicle?.investor;
        const responsibleStr = maintenance.responsible === 'Investidor' 
          ? (investorName ? `Investidor: ${investorName}` : 'Investidor') 
          : 'Administradora';
        const rawVal = parseFloat(String(maintenance.value).replace(/\./g, '').replace(',', '.')) || 0;

        const newTrans = {
          type: 'out',
          val: -Math.abs(rawVal),
          cat: 'Manutenção',
          desc: `[Manutenção #${inserted.id}] ${maintenance.serviceType}`,
          date: maintenance.date || new Date().toISOString().split('T')[0],
          vehiclePlate: maintenance.vehiclePlate,
          responsible: responsibleStr,
          status: 'Concluído'
        };

        const { data: tData, error: tError } = await supabase.from('transactions').insert([mapToSnake(newTrans, 'transactions')]).select();
        if (!tError && tData) {
          setTransactions(prev => [mapToCamel(tData, 'transactions')[0], ...prev]);
        }
      } catch (txErr) {
        console.error("Erro ao sincronizar transação de manutenção:", txErr);
      }
    }
  };

  const handleUpdateMaintenance = async (updatedMaintenance) => {
    const { error } = await supabase.from('maintenances').update(mapToSnake(updatedMaintenance)).eq('id', updatedMaintenance.id);
    if (!error) {
      setMaintenances(prev => prev.map(m => m.id === updatedMaintenance.id ? updatedMaintenance : m));
      logActivity('Atualizar', 'Manutenção', updatedMaintenance.id, `Atualizou dados de manutenção do veículo ${updatedMaintenance.vehiclePlate} - Tipo: ${updatedMaintenance.serviceType}`);

      // Sincronizar transação existente ou criar uma nova se não existir
      try {
        const descSearch = `[Manutenção #${updatedMaintenance.id}]`;
        const existingTx = transactions.find(t => t.desc && t.desc.startsWith(descSearch));

        const vehicle = vehicles.find(v => v.plate === updatedMaintenance.vehiclePlate);
        const investorName = vehicle?.investor;
        const responsibleStr = updatedMaintenance.responsible === 'Investidor' 
          ? (investorName ? `Investidor: ${investorName}` : 'Investidor') 
          : 'Administradora';
        const rawVal = parseFloat(String(updatedMaintenance.value).replace(/\./g, '').replace(',', '.')) || 0;

        const txData = {
          type: 'out',
          val: -Math.abs(rawVal),
          cat: 'Manutenção',
          desc: `${descSearch} ${updatedMaintenance.serviceType}`,
          date: updatedMaintenance.date || new Date().toISOString().split('T')[0],
          vehiclePlate: updatedMaintenance.vehiclePlate,
          responsible: responsibleStr,
          status: 'Concluído'
        };

        if (existingTx) {
          const { error: tError } = await supabase.from('transactions').update(mapToSnake(txData, 'transactions')).eq('id', existingTx.id);
          if (!tError) {
            setTransactions(prev => prev.map(t => t.id === existingTx.id ? { ...t, ...txData } : t));
          }
        } else {
          const { data: tData, error: tError } = await supabase.from('transactions').insert([mapToSnake(txData, 'transactions')]).select();
          if (!tError && tData) {
            setTransactions(prev => [mapToCamel(tData, 'transactions')[0], ...prev]);
          }
        }
      } catch (txErr) {
        console.error("Erro ao atualizar transação de manutenção:", txErr);
      }
    }
  };

  const handleDeleteMaintenance = async (id) => {
    const { error } = await supabase.from('maintenances').delete().eq('id', id);
    if (!error) {
      setMaintenances(prev => prev.filter(m => m.id !== id));
      logActivity('Apagar', 'Manutenção', id, `Excluiu a manutenção ID ${id}`);

      // Deletar transação correspondente no financeiro
      try {
        const descSearch = `[Manutenção #${id}]`;
        const existingTx = transactions.find(t => t.desc && t.desc.startsWith(descSearch));
        if (existingTx) {
          const { error: tError } = await supabase.from('transactions').delete().eq('id', existingTx.id);
          if (!tError) {
            setTransactions(prev => prev.filter(t => t.id !== existingTx.id));
          }
        }
      } catch (txErr) {
        console.error("Erro ao deletar transação de manutenção:", txErr);
      }
    }
  };

  const handleCompleteClosure = async (rentalId, closureData, attachedFile) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return { success: false, error: 'Rental not found' };

    try {
      let terminationTermUrl = null;
      if (attachedFile) {
        terminationTermUrl = await uploadFile(attachedFile, 'contratos');
      }

      const updatedDocs = {
        ...(rental.docs || {}),
        terminationTerm: terminationTermUrl || (rental.docs?.terminationTerm),
        closureSummary: closureData
      };

      const todayStr = new Date().toISOString().split('T')[0];
      
      const { error: updateError } = await supabase.from('rentals').update({ 
        status: 'Encerrado', 
        end_date: todayStr,
        documentos: updatedDocs
      }).eq('id', rentalId);
      
      if (updateError) throw updateError;

      // Atualização Local
      setRentals(prev => prev.map(r => r.id === rentalId ? { 
        ...r, 
        status: 'Encerrado', 
        endDate: todayStr,
        docs: updatedDocs 
      } : r));

      await handleUpdateVehicle({ id: rental.vehicleId, status: 'Disponível' });

      const transactionsToAdd = [];
      const today = todayStr;

      // 1. Registro de descontos da caução (se houver débitos)
      if (closureData.totalDebts > 0) {
        transactionsToAdd.push({
          date: today,
          type: 'out',
          val: Math.min(closureData.totalDebts, closureData.caucaoAvailable),
          desc: `Dedução de Caução (Rescisão) - ${rental.userName || rental.user || 'Condutor'}`,
          cat: 'Caução',
          vehiclePlate: rental.plate,
          status: 'Pago',
          responsible: 'Administradora'
        });
      }

      // 2. Registro do saldo final
      if (closureData.type === 'return' && closureData.balance > 0) {
        // Caução a devolver (Pendente)
        transactionsToAdd.push({
          date: today,
          type: 'out',
          val: closureData.balance,
          desc: `Caução a Devolver (Rescisão) - ${rental.userName || rental.user || 'Condutor'}`,
          cat: 'Caução',
          vehiclePlate: rental.plate,
          status: 'Pendente',
          responsible: 'Administradora'
        });
      } else if (closureData.type === 'debt' && closureData.balance > 0) {
        // Saldo devedor final (Cobrança avulsa)
        transactionsToAdd.push({
          date: today,
          type: 'in',
          val: closureData.balance,
          desc: `Cobrança Final (Rescisão) - ${rental.userName || rental.user || 'Condutor'}`,
          cat: 'Aluguel',
          vehiclePlate: rental.plate,
          status: 'Pendente',
          responsible: 'Administradora'
        });
      }

      if (transactionsToAdd.length > 0) {
        for (const trans of transactionsToAdd) {
          await handleAddTransaction(trans);
        }
      }
      logActivity('Encerrar Contrato', 'Locação', rentalId, `Encerrou o contrato de locação de ${rental.userName || rental.user} - Veículo: ${rental.plate || rental.vehiclePlate}`);
      return { success: true };
    } catch (error) {
      console.error("Erro ao encerrar contrato:", error);
      alert(`Erro ao encerrar contrato: ${error.message}`);
      return { success: false, error };
    }
  };

  const handlePayCaucaoInstallment = async (rentalId, installmentNumber, value) => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
      if (!rental) return;

      const paidInstallments = [...(rental.paidInstallments || []), installmentNumber];
      const currentReceived = parseFloat(String(rental.depositReceived || rental.depositPaid || 0).replace(/\./g, '').replace(',', '.')) || 0;
      const newReceived = currentReceived + value;

      // Usando nomes de colunas do mapeamento para garantir compatibilidade
      const updatePayload = {
        'paid_installments': paidInstallments,
        'cau\u00e7\u00e3o_paga': newReceived
      };

      const { error } = await supabase.from('rentals').update(updatePayload).eq('id', rentalId);
      
      if (error) {
        console.error("Erro ao atualizar caução:", error);
        // Tenta um fallback se a coluna paid_installments não existir (pode estar dentro de documentos)
        if (error.code === 'PGRST204' || error.message.includes('column "paid_installments" does not exist')) {
          const updatedDocs = { ...(rental.docs || {}), paidInstallments };
          await supabase.from('rentals').update({ 
            'documentos': updatedDocs,
            'cau\u00e7\u00e3o_paga': newReceived 
          }).eq('id', rentalId);
        } else {
          throw error;
        }
      }

      setRentals(prev => prev.map(r => r.id === rentalId ? { 
        ...r, 
        paidInstallments, 
        depositReceived: newReceived,
        depositPaid: newReceived 
      } : r));
      
      alert(`Parcela ${installmentNumber} marcada como paga com sucesso!`);
    } catch (err) {
      console.error("Erro fatal no pagamento de caução:", err);
      alert(`Erro ao processar pagamento: ${err.message}`);
    }
  };

  const handleConfirmPayment = async (rentalId, billingData) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return;

    const vehicle = vehicles.find(v => v.id === rental.vehicleId);
    const mainAdminTaxPercent = parseFloat(vehicle?.adminTax || 15) / 100;
    
    // Identificar a placa do carro reserva vinculado neste ciclo
    const activeRC = replacementContracts.find(rc => rc.mainVehiclePlate === rental.plate && rc.status === 'Ativo');
    const replacementPlate = activeRC?.replacementVehiclePlate || 
      replacementContracts.find(rc => rc.mainVehiclePlate === rental.plate)?.replacementVehiclePlate;

    const mainRent = (billingData.weeklyRate || 0) - (billingData.abatimento || 0);
    const repRent = billingData.replacementCharge || 0;
    
    const mainAdminRevenue = mainRent > 0 ? mainRent * mainAdminTaxPercent : 0;
    
    let repAdminRevenue = 0;
    if (repRent > 0 && replacementPlate) {
      const repVehicle = vehicles.find(v => v.plate === replacementPlate);
      const repAdminTaxPercent = parseFloat(repVehicle?.adminTax || 15) / 100;
      repAdminRevenue = repRent * repAdminTaxPercent;
    }

    // Busca a taxa do gateway (Pix ou Boleto) na tabela asaas_payments
    let fee = 0;
    let methodLabel = '';
    try {
      const { data: payData } = await supabase
        .from('asaas_payments')
        .select('billing_type')
        .eq('rental_id', String(rentalId))
        .order('created_at', { ascending: false })
        .limit(1);

      if (payData && payData.length > 0) {
        const bType = payData[0].billing_type?.toUpperCase();
        if (bType === 'PIX') {
          fee = 0.99;
          methodLabel = 'PIX';
        } else if (bType === 'BOLETO') {
          fee = 1.99;
          methodLabel = 'Boleto';
        }
      } else {
        fee = 0.99;
        methodLabel = 'PIX';
      }
    } catch (e) {
      console.warn("Erro ao ler asaas_payments:", e);
      fee = 0.99;
      methodLabel = 'PIX';
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const trans = [];

    // 1a. Pagamento de Aluguel Carro Principal (Entrada - base do investidor principal)
    if (mainRent > 0) {
      trans.push({
        date: todayStr,
        type: 'in',
        val: mainRent,
        desc: `Pagamento Aluguel - ${rental.user}`,
        cat: 'Aluguel',
        vehiclePlate: rental.plate,
        status: 'pago',
        responsible: ''
      });
    }

    // 1b. Pagamento de Aluguel Carro Reserva (Entrada - base do investidor reserva)
    if (repRent > 0 && replacementPlate) {
      trans.push({
        date: todayStr,
        type: 'in',
        val: repRent,
        desc: `Pagamento Aluguel Reserva (${replacementPlate}) - ${rental.user}`,
        cat: 'Aluguel',
        vehiclePlate: replacementPlate,
        status: 'pago',
        responsible: ''
      });
    }

    // 2a. Taxa de Administração - Carro Principal (Entrada - Empresa)
    if (mainAdminRevenue > 0) {
      trans.push({
        date: todayStr,
        type: 'in',
        val: mainAdminRevenue,
        desc: `Taxa Adm - ${rental.user}`,
        cat: 'Taxa Adm',
        vehiclePlate: rental.plate,
        status: 'pago',
        responsible: 'Administradora'
      });
    }

    // 2b. Taxa de Administração - Carro Reserva (Entrada - Empresa)
    if (repAdminRevenue > 0 && replacementPlate) {
      trans.push({
        date: todayStr,
        type: 'in',
        val: repAdminRevenue,
        desc: `Taxa Adm Reserva - ${rental.user}`,
        cat: 'Taxa Adm',
        vehiclePlate: replacementPlate,
        status: 'pago',
        responsible: 'Administradora'
      });
    }

    // 3. Taxa de Pneus (Entrada - Empresa)
    if (billingData.tireTax > 0) {
      trans.push({
        date: todayStr,
        type: 'in',
        val: billingData.tireTax,
        desc: `Taxa de Pneus - ${rental.user}`,
        cat: 'taxa de pneus',
        vehiclePlate: rental.plate,
        status: 'pago',
        responsible: 'Administradora'
      });
    }

    // 4. Multas / Juros (Entrada - Empresa)
    if (billingData.lateFee > 0) {
      trans.push({
        date: todayStr,
        type: 'in',
        val: billingData.lateFee,
        desc: `Multa por atraso - ${rental.user}`,
        cat: 'multa',
        vehiclePlate: rental.plate,
        status: 'pago',
        responsible: 'Administradora'
      });
    }

    // 5. Custo da Taxa do Gateway (Saída - Custo Administradora)
    if (fee > 0) {
      trans.push({
        date: todayStr,
        type: 'out',
        val: -fee,
        desc: `Taxa Asaas - ${methodLabel} ${rental.user}`,
        cat: 'Taxa Gateway / Asaas',
        vehiclePlate: rental.plate,
        status: 'pago',
        responsible: 'Administradora'
      });
    }

    if (trans.length > 0) {
      const { data, error } = await supabase.from('transactions').insert(trans.map(t => mapToSnake(t, 'transactions'))).select();
      if (!error && data) setTransactions(prev => [...mapToCamel(data, 'transactions'), ...prev]);
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
        const newInsp = mapToCamel(data)[0];
        setInspections(prev => [newInsp, ...prev]);
        logActivity('Criar', 'Vistoria', newInsp.id, `Realizou vistoria de ${newInsp.type} para o veículo ${newInsp.vehiclePlate}`);
      }
    } catch (err) {
      console.error('Erro ao salvar vistoria com arquivos:', err.message);
      alert(`Erro ao salvar vistoria: ${err.message}`);
    }
  };

  const handleDeleteInspection = async (id) => {
    const inspection = inspections.find(ins => ins.id === id);
    const { error } = await supabase.from('inspections').delete().eq('id', id);
    if (!error) {
      setInspections(prev => prev.filter(ins => ins.id !== id));
      logActivity('Apagar', 'Vistoria', id, `Excluiu a vistoria de ${inspection?.type || 'ID: ' + id} do veículo ${inspection?.vehiclePlate || ''}`);
    }
  };

  const handleCloseServiceOrder = async (os, mode, replacementCarPlate) => {
    if (mode === 'open') {
      const { data, error } = await supabase.from('service_orders').insert([mapToSnake({ ...os, status: 'Aberta' })]).select();
      if (!error && data) {
        const newOs = mapToCamel(data)[0];
        setServiceOrders(prev => [newOs, ...prev]);
        await handleUpdateVehicle({ id: os.vehicleId, status: 'Manutenção' });
        logActivity('Criar', 'Ordem Serviço', newOs.id, `Abriu O.S. #${newOs.id} para veículo ${os.plate} - Resp: ${os.responsible}`);

        if (replacementCarPlate) {
          const rental = rentals.find(r => r.vehicleId === os.vehicleId && r.status === 'Ativo');
          if (rental) {
            const rc = { mainVehiclePlate: os.plate, replacementVehiclePlate: replacementCarPlate, driverName: rental.userName || rental.user || 'Condutor', startDate: new Date().toISOString().split('T')[0], dailyRate: 80, status: 'Ativo' };
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
      logActivity('Encerrar OS', 'Manutenção', os.id, `Concluiu a ordem de serviço #${os.id} para o veículo ${os.plate} - Valor: R$ ${os.total}`);
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
    currentUser, setCurrentUser, selectedImage, setSelectedImage, logs, isLogsDbConnected,
    showInterestModal, setShowInterestModal, showSuccessPopup, setShowSuccessPopup,
    selectedVehicleForInterest, setSelectedVehicleForInterest,
    interestForm, setInterestForm,
    handleAddSystemUser, handleUpdateSystemUser, handleDeleteSystemUser,
    handleAddLead, handleUpdateLeadStatus, handleAddRental, handleDeleteRental,
    handleUpdateRental, handleAddInvestor, handleUpdateInvestor, handleDeleteInvestor,
    handleAddVehicle, handleUpdateVehicle, handleDeleteVehicle, handleUpdateClient, handleAddTransaction,
    handleUpdateTransactionStatus,
    handleAddMaintenance, handleUpdateMaintenance, handleDeleteMaintenance,
    handleCompleteClosure, handlePayCaucaoInstallment, handleConfirmPayment,
    handleAddInspection, handleDeleteInspection, handleCloseServiceOrder,
    handleInterestSubmit,
    seedData: () => console.log('Seed data is no longer available.')
  };
};
