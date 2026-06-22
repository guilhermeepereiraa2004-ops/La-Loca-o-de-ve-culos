import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { parseDbError } from '../utils/errorHelper';
import { uploadFile } from '../utils/supabaseStorage';

// Limpar temporariamente o bloqueio antigo do rate limiter de uploads salvo no localStorage
try {
  localStorage.removeItem('la_rl_block_upload_file');
  localStorage.removeItem('la_rl_upload_file');
} catch (e) {}

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
    dividend: 'dividend',
    crlv: 'crlv',
    crv: 'crv',
    contractUrl: 'contract_url'
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
    status: 'status',
    createdAt: 'created_at'
  },
  fines: {
    id: 'id',
    vehiclePlate: 'vehicle_plate',
    infraction: 'infraction',
    date: 'date',
    value: 'value',
    location: 'location',
    code: 'code',
    driverName: 'driver_name',
    driverId: 'driver_id',
    rentalId: 'rental_id',
    status: 'status',
    installments: 'installments',
    paidInstallments: 'paid_installments',
    installmentValue: 'installment_value',
    billingSuspended: 'billing_suspended',
    createdAt: 'created_at'
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
  const skipKeys = ['imageFile', 'imagePreview', 'crlvFile', 'crvFile', 'contractUrlFile', 'id', 'investor', 'investors', 'adminTax', 'investorName'];
  const effectiveSkip = tableName === 'fines' ? skipKeys.filter(k => k !== 'id') : skipKeys;
  for (const key in obj) {
    if (effectiveSkip.includes(key)) continue;
    if (mappings[key]) {
      newObj[mappings[key]] = obj[key];
    } else {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = obj[key];
    }
  }
  return newObj;
};

let isGeneratingTransactions = false;

export const useAppState = () => {
  const [view, setView] = useState(() => {
    const savedView = localStorage.getItem('la_current_view');
    const savedAdmin = localStorage.getItem('la_admin_auth');
    const savedInvestor = localStorage.getItem('la_investor_auth');
    
    if (savedView) {
      if (savedView === 'admin' && savedAdmin === 'true') return 'admin';
      if (savedView === 'investor' && savedInvestor) return 'investor';
      if (savedView !== 'admin' && savedView !== 'investor') return savedView;
    }

    if (savedAdmin === 'true') return 'admin';
    if (savedInvestor) return 'investor';
    return 'home';
  });

  useEffect(() => {
    if (view) {
      localStorage.setItem('la_current_view', view);
    }
  }, [view]);
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
    const savedView = localStorage.getItem('la_current_view');
    const savedAdmin = localStorage.getItem('la_admin_auth');
    const savedInvestor = localStorage.getItem('la_investor_auth');

    // Differentiate user type based on current view to prevent cross-session contamination
    const isViewAdmin = savedView === 'admin' || (!savedView && savedAdmin === 'true');
    const isViewInvestor = savedView === 'investor' || (!savedView && !savedAdmin && savedInvestor);

    if (isViewInvestor) {
      if (savedInvestor) {
        try {
          return JSON.parse(savedInvestor);
        } catch (e) {
          return null;
        }
      }
    } else if (isViewAdmin) {
      if (savedAdmin === 'true') {
        const savedUser = localStorage.getItem('la_admin_user');
        if (savedUser) {
          try {
            return JSON.parse(savedUser);
          } catch (e) {
            // fallback
          }
        }
        return { role: 'administrador', name: 'Admin Master', email: 'Laveiculos@gmail.com', modules: null };
      }
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

  const [fines, setFines] = useState([]);
  const [isFinesDbConnected, setIsFinesDbConnected] = useState(false);

  const loadFines = async () => {
    try {
      const { data, error } = await supabase
        .from('system_fines')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const camelData = mapToCamel(data, 'fines');
        setFines(camelData);
        setIsFinesDbConnected(true);
        try {
          localStorage.setItem('la_system_fines', JSON.stringify(camelData));
        } catch (e) {
          console.warn("Could not sync loaded system_fines to localStorage:", e);
        }
        return;
      }
      if (error) {
        console.warn("Supabase system_fines query returned error, falling back to localStorage:", error);
      }
    } catch (e) {
      console.warn("Supabase system_fines table not found, falling back to localStorage", e);
    }
    
    setIsFinesDbConnected(false);
    try {
      const localFines = localStorage.getItem('la_system_fines');
      if (localFines) {
        setFines(JSON.parse(localFines));
      }
    } catch (e) {
      console.error("Error loading local fines:", e);
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
        
        // Differentiate investor login from admin/employee login
        const isInvestor = localStorage.getItem('la_investor_auth') !== null || (currentUser && !currentUser.role && currentUser.email !== 'Laveiculos@gmail.com');
        const logMsg = isInvestor
          ? `Login realizado com sucesso no portal do investidor`
          : `Login realizado com sucesso no painel administrativo`;
          
        logActivity('Login', 'Auth', null, logMsg);
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
                let client = currentClients.find(c => 
                   (rental.clientId && c.id === rental.clientId) || 
                   (rental.idCliente && c.id === rental.idCliente)
                 );
                 if (!client && rental.cpf) {
                   client = currentClients.find(c => c.cpf && rental.cpf.replace(/\D/g, '') === c.cpf.replace(/\D/g, ''));
                 }
                 if (!client) {
                   client = currentClients.find(c => (c.nome || c.name || '').toLowerCase() === (rental.user || '').toLowerCase());
                 }

                const rentalDocs = rental.docs || {};
                const clientDocs = client?.docs || {};

                return {
                  ...rental,
                  image: vehicle?.image || rental.image,
                  vehicle: vehicle?.model || rental.vehicleModel || rental.vehicle || rental.modelo,
                  plate: vehicle?.plate || rental.vehiclePlate || rental.plate || rental.placa,
                  vehicleYear: vehicle?.year || rental.vehicleYear || '',
                  vehicleRenavam: vehicle?.renavam || rental.vehicleRenavam || '',
                  cpf: client?.cpf || rental.cpf,
                  address: client?.address || rental.address || rentalDocs.address || clientDocs.address || '',
                  rg: rentalDocs.rg || clientDocs.rg || rental.rg || '',
                  nacionalidade: rentalDocs.nacionalidade || clientDocs.nacionalidade || rental.nacionalidade || 'brasileiro(a)',
                  estadoCivil: rentalDocs.estadoCivil || clientDocs.estadoCivil || rental.estadoCivil || 'solteiro(a)',
                  cep: rentalDocs.cep || clientDocs.cep || rental.cep || '',
                  cidadeUf: rentalDocs.cidadeUf || clientDocs.cidadeUf || rental.cidadeUf || 'Aracaju/SE',
                  cnh: client?.cnh || rental.cnh || rental.cnhNumber
                };
              });
              
              for (const rental of mappedData) {
                const clientExists = currentClients.some(c => {
                  if (rental.cpf && c.cpf && rental.cpf.replace(/\D/g, '') === c.cpf.replace(/\D/g, '')) return true;
                  return (c.nome || c.name || '').toLowerCase() === (rental.user || '').toLowerCase();
                });
                if (!clientExists && rental.user) {
                  supabase.from('clients').insert([{
                    nome: rental.user,
                    telefone: rental.clientPhone || rental.phone,
                    cnh_number: rental.cnhNumber || rental.cnh,
                    cnh_validity: rental.cnhValidity,
                    documentos: rental.docs,
                    cpf: rental.cpf || null,
                    status: 'Ativo'
                  }]).then(() => {
                     supabase.from('clients').select('*').then(({data: cDataRefresh}) => {
                       if (cDataRefresh) setClients(mapToCamel(cDataRefresh, 'clients'));
                     });
                  });
                }
              }
            }
            
            if (item.table === 'inspections') {
              mappedData = mappedData.map(ins => {
                const items = ins.items || {};
                return {
                  ...ins,
                  externalCleanliness: items.externalCleanliness || ins.externalCleanliness,
                  internalCleanliness: items.internalCleanliness || ins.internalCleanliness,
                  lastOilChangeDate: items.lastOilChangeDate || ins.lastOilChangeDate,
                  lastOilChangeKm: items.lastOilChangeKm || ins.lastOilChangeKm,
                  nextOilChangeKm: items.nextOilChangeKm || ins.nextOilChangeKm,
                };
              });
            }
            
            item.setter(mappedData);
          }
        }

        // --- AUTO-GERAÇÃO DE COBRANÇAS (PROTEÇÃO E SEGURO FRANQUIA) ---
        try {
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth(); // 0-indexed (4 = Maio, 5 = Junho)
          const currentDay = now.getDate();
          
          // Regra de negócio: Contabilizar apenas a partir de Junho de 2026 em diante (mês que vem)
          const startAccounting = currentYear > 2026 || (currentYear === 2026 && currentMonth >= 5); // >= 5 é Junho em diante
          
          let newTransactionsToInsert = [];
          
          if (startAccounting && !isGeneratingTransactions) {
            isGeneratingTransactions = true;
            
            for (const v of allVehicles) {
              if (!v.plate) continue;

              // 1. Proteção Veicular (Vence todo dia 10, entra como receita da empresa)
              const hasProt = v.hasProtection === true || String(v.hasProtection) === 'true';
              const protVal = parseFloat(String(v.protectionValue || 0).replace(/\./g, '').replace(',', '.')) || 0;
              
              if (hasProt && protVal > 0) {
                const paymentDayProt = 10; // Padrão dia 10 de cada mês
                if (currentDay >= paymentDayProt) {
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
                    const isInternal = !v.investor || v.investor.toLowerCase().trim() === 'interno' || v.investor.toLowerCase().trim() === 'nenhum';
                    const respStr = isInternal ? 'Administradora' : `Investidor: ${v.investor}`;
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-10`;
                    newTransactionsToInsert.push({
                      type: 'in', // Receita para a empresa
                      val: protVal, // Valor positivo para entrada
                      cat: 'Proteção Veicular',
                      desc: `Proteção Veicular - ${v.model} (${v.plate})`,
                      date: dateStr,
                      vehicle_plate: v.plate,
                      responsible: respStr,
                      status: 'Concluído' // Já entra como pago por padrão
                    });
                  }
                }
              }

              // 2. Seguro Franquia (Vence todo dia 10, entra como receita da empresa)
              const hasFranchise = v.franchiseInsurance === true || String(v.franchiseInsurance) === 'true';
              const franchiseVal = 39.90; // Padrão R$ 39,90/mês
              
              if (hasFranchise) {
                const paymentDayFranchise = 10; // Padrão dia 10 de cada mês
                if (currentDay >= paymentDayFranchise) {
                  const alreadyExists = loadedTransactions.some(t => {
                    if (t.vehiclePlate !== v.plate) return false;
                    const isInsurance = t.cat?.toLowerCase().includes('seguro') || t.cat?.toLowerCase().includes('franquia');
                    if (!isInsurance) return false;
                    
                    try {
                      const tDate = new Date(t.date + 'T12:00:00');
                      return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
                    } catch (e) {
                      return false;
                    }
                  });
                  
                  if (!alreadyExists) {
                    const isInternal = !v.investor || v.investor.toLowerCase().trim() === 'interno' || v.investor.toLowerCase().trim() === 'nenhum';
                    const respStr = isInternal ? 'Administradora' : `Investidor: ${v.investor}`;
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-10`;
                    newTransactionsToInsert.push({
                      type: 'in', // Receita para a empresa
                      val: franchiseVal, // Valor positivo
                      cat: 'Seguro Franquia',
                      desc: `Seguro Franquia - ${v.model} (${v.plate})`,
                      date: dateStr,
                      vehicle_plate: v.plate,
                      responsible: respStr,
                      status: 'Concluído' // Já entra como pago por padrão
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
                console.error("Erro ao inserir transações automáticas:", insertError);
              }
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
      
      // Carregar as multas do sistema
      await loadFines();
    };

    loadData();
  }, []);

  const handleAddSystemUser = async (user) => {
    const { data, error } = await supabase.from('system_users').insert([mapToSnake(user)]).select();
    if (!error && data) {
      setSystemUsers(prev => [...prev, mapToCamel(data)[0]]);
      logActivity('Criar', 'Usuário', data[0].id, `Criou o usuário ${user.name} (${user.email})`);
    } else if (error) {
      console.error("Erro ao criar usuário:", error);
      if (error.message?.includes('modules') || error.code === 'PGRST204') {
        alert(`ERRO NO BANCO DE DADOS: A coluna 'modules' está faltando na tabela 'system_users'.\n\nPor favor, execute o script abaixo no SQL Editor do Supabase para corrigir:\n\nALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS modules text[] DEFAULT '{}'::text[];`);
      } else {
        alert(`Erro ao criar usuário: ${parseDbError(error)}`);
      }
    }
  };

  const handleUpdateSystemUser = async (updated) => {
    const { error } = await supabase.from('system_users').update(mapToSnake(updated)).eq('id', updated.id);
    if (!error) {
      setSystemUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      logActivity('Atualizar', 'Usuário', updated.id, `Atualizou o usuário ${updated.name}`);
    } else if (error) {
      console.error("Erro ao atualizar usuário:", error);
      if (error.message?.includes('modules') || error.code === 'PGRST204') {
        alert(`ERRO NO BANCO DE DADOS: A coluna 'modules' está faltando na tabela 'system_users'.\n\nPor favor, execute o script abaixo no SQL Editor do Supabase para corrigir:\n\nALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS modules text[] DEFAULT '{}'::text[];`);
      } else {
        alert(`Erro ao atualizar usuário: ${parseDbError(error)}`);
      }
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
    } else if (error) {
      console.error("Erro ao criar lead:", error);
      alert(`Erro ao criar lead: ${parseDbError(error)}`);
    }
  };

  const handleUpdateLeadStatus = async (id, status, updatedBy) => {
    let { error } = await supabase.from('leads').update({ status, updated_by: updatedBy }).eq('id', id);
    
    // Se a coluna updated_by não existir no banco (erro PGRST204 ou mensagem relacionada), atualiza apenas o status
    if (error && (error.code === 'PGRST204' || error.message?.includes('updated_by') || error.message?.includes('column'))) {
      console.warn("Coluna 'updated_by' não encontrada na tabela 'leads'. Atualizando apenas o status.");
      const retry = await supabase.from('leads').update({ status }).eq('id', id);
      error = retry.error;
    }

    if (!error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status, updatedBy } : l));
      logActivity('Atualizar', 'Lead', id, `Atualizou status do lead ID ${id} para ${status}`);
    } else {
      console.error("Erro ao atualizar status do lead:", error);
      alert(`Erro ao atualizar status do lead: ${parseDbError(error)}`);
    }
  };

  const handleDeleteLead = async (id) => {
    try {
      const lead = leads.find(l => l.id === id);
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      setLeads(prev => prev.filter(l => l.id !== id));
      logActivity('Apagar', 'Lead', id, `Excluiu o lead ${lead?.name || 'ID: ' + id}`);
      return true;
    } catch (err) {
      console.error("Erro ao apagar lead:", err);
      alert(`Erro ao apagar lead: ${err.message || err.details || 'Erro desconhecido'}`);
      return false;
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
      delete payload.rg;
      delete payload.nacionalidade;
      delete payload.estado_civil;
      delete payload.cep;
      delete payload.cidade_uf;
      delete payload.vehicle_year;
      delete payload.vehicle_renavam;

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
      payload['documentos'] = {
        ...uploadedDocs,
        rg: rental.rg || null,
        nacionalidade: rental.nacionalidade || null,
        estadoCivil: rental.estadoCivil || null,
        cep: rental.cep || null,
        cidadeUf: rental.cidadeUf || null,
        address: rental.address || null
      };

      if (uploadedDocs.signedContract) {
        payload['contrato_assinado'] = uploadedDocs.signedContract;
      }

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
      
      // Sanitização de campos inteiros: string vazia causa "invalid input syntax for type integer"
      payload['deposit_installments'] = parseInt(payload['deposit_installments']) || null;
      payload['semanas'] = payload['semanas'] && String(payload['semanas']).trim() !== '' ? String(parseInt(payload['semanas']) || 4) : '4';
      if (payload['id_veiculo'] === '' || payload['id_veiculo'] === undefined) payload['id_veiculo'] = null;
      if (payload['id_cliente'] === '' || payload['id_cliente'] === undefined) payload['id_cliente'] = null;

      payload['status'] = 'Ativo';
      payload['start_date'] = rental.startDate || null;
      if (payload['cnh_validity'] === '') payload['cnh_validity'] = null;
      if (payload['data_de_nascimento'] === '') payload['data_de_nascimento'] = null;
      if (payload['end_date'] === '') payload['end_date'] = null;

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
          address: rental.address || null,
          documentos: { 
            ...uploadedDocs,
            rg: rental.rg || null,
            nacionalidade: rental.nacionalidade || null,
            estadoCivil: rental.estadoCivil || null,
            cep: rental.cep || null,
            cidadeUf: rental.cidadeUf || null,
            address: rental.address || null
          },
          status: 'Ativo'
        };

        const queryField = clientPayload.cpf ? 'cpf' : (clientPayload.cnh_number ? 'cnh_number' : null);
        const queryVal = clientPayload.cpf || clientPayload.cnh_number;

        if (queryVal) {
          const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq(queryField, queryVal)
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
            const exists = prev.find(c => 
              (updatedClientObj.cpf && c.cpf === updatedClientObj.cpf) || 
              (updatedClientObj.cnhNumber && c.cnhNumber === updatedClientObj.cnhNumber)
            );
            if (exists) {
              return prev.map(c => 
                ((updatedClientObj.cpf && c.cpf === updatedClientObj.cpf) || 
                 (updatedClientObj.cnhNumber && c.cnhNumber === updatedClientObj.cnhNumber)) 
                  ? { ...c, ...updatedClientObj } 
                  : c
              );
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
        const rentalDocs = newRental.docs || {};
        const enrichedRental = {
          ...newRental,
          image: vehicle?.image || rental.image,
          vehicle: vehicle?.model || rental.vehicleModel || rental.vehicle,
          plate: vehicle?.plate || rental.vehiclePlate || rental.plate,
          cpf: rental.cpf || '',
          address: rental.address || rentalDocs.address || '',
          rg: rentalDocs.rg || rental.rg || '',
          nacionalidade: rentalDocs.nacionalidade || rental.nacionalidade || 'brasileiro(a)',
          estadoCivil: rentalDocs.estadoCivil || rental.estadoCivil || 'solteiro(a)',
          cep: rentalDocs.cep || rental.cep || '',
          cidadeUf: rentalDocs.cidadeUf || rental.cidadeUf || 'Aracaju/SE',
          cnh: rental.cnh || rental.cnhNumber
        };
        setRentals(prev => [enrichedRental, ...prev]);
        logActivity('Criar', 'Locação', newRental.id, `Criou locação para ${rental.userName || rental.user} - Veículo: ${rental.plate || rental.vehiclePlate || enrichedRental.plate}`);

        // --- Geração Automática das Transações de Primeiro Pagamento ---
        try {
          const weeklyRate = parseFloat(newRental.value) || 0;
          const tireTax = parseFloat(newRental.tireTax) || 0;
          const vehiclePlate = enrichedRental.plate || '';
          
          const adminTaxPercent = parseFloat(vehicle?.adminTax || 20) / 100;
          const adminPart = weeklyRate * adminTaxPercent;
          
          const transDate = newRental.startDate || new Date().toISOString().split('T')[0];
          const autoTransactions = [];
          
          // 1. Aluguel Bruto (Entrada - base para divisão do investidor)
          if (weeklyRate > 0) {
            autoTransactions.push({
              date: transDate,
              type: 'in',
              val: weeklyRate,
              desc: `Primeiro Aluguel (Automático) - ${newRental.userName || newRental.user}`,
              cat: 'Aluguel',
              vehiclePlate: vehiclePlate,
              status: 'Concluído',
              responsible: ''
            });
          }
          
          // 2. Taxa Adm (Entrada - 100% da Administradora)
          if (adminPart > 0) {
            autoTransactions.push({
              date: transDate,
              type: 'in',
              val: adminPart,
              desc: `Taxa Adm Primeiro Aluguel - ${newRental.userName || newRental.user}`,
              cat: 'Taxa Adm',
              vehiclePlate: vehiclePlate,
              status: 'Concluído',
              responsible: 'Administradora'
            });
          }
          
          // 3. Taxa de Pneus (Entrada - 100% da Administradora)
          if (tireTax > 0) {
            autoTransactions.push({
              date: transDate,
              type: 'in',
              val: tireTax,
              desc: `Taxa de Pneus Primeiro Aluguel - ${newRental.userName || newRental.user}`,
              cat: 'taxa de pneus',
              vehiclePlate: vehiclePlate,
              status: 'Concluído',
              responsible: 'Administradora'
            });
          }
          
          if (autoTransactions.length > 0) {
            const { data: transData, error: transError } = await supabase
              .from('transactions')
              .insert(autoTransactions.map(t => mapToSnake(t, 'transactions')))
              .select();
              
            if (!transError && transData) {
              setTransactions(prev => [...mapToCamel(transData, 'transactions'), ...prev]);
            } else if (transError) {
              console.error("Erro ao inserir transações automáticas de primeiro pagamento:", transError);
            }
          }
        } catch (transErr) {
          console.error("Erro no processo de geração de transações automáticas de primeiro pagamento:", transErr);
        }
      }
      
      await handleUpdateVehicle({ id: rental.vehicleId, status: 'Alugado' });
      return { success: true };
    } catch (error) {
      console.error("Erro detalhado ao criar locação:", error);
      const errorMsg = error.details || error.message || 'Erro desconhecido';
      if (errorMsg.includes('invalid input syntax for type date') || errorMsg.includes('type date: ""')) {
        alert("Atenção: A locação não pôde ser criada porque a Data de Nascimento ou a Validade da CNH estão vazias ou incorretas no formulário. Por favor, verifique-as nos dados do condutor.");
      } else {
        const hint = error.hint ? `\n\nDica: ${error.hint}` : '';
        alert(`ERRO NO BANCO DE DADOS:\n${errorMsg}${hint}\n\nVerifique se as colunas na tabela do Supabase batem com os nomes no código.`);
      }
      return { success: false, error };
    }
  };

  const handleDeleteRental = async (id) => {
    try {
      const rental = rentals.find(r => r.id === id);
      const { error } = await supabase.from('rentals').delete().eq('id', id);
      if (error) throw error;

      // Ao excluir a locação, remove também as transações automáticas geradas no momento da criação.
      // Critério: mesma placa, data igual ao início da locação, categorias automáticas e status Concluído.
      if (rental) {
        const plate = rental.plate || rental.vehiclePlate || rental.placa;
        const startDate = rental.startDate || rental.date;

        if (plate && startDate) {
          const startDateStr = String(startDate).substring(0, 10); // "YYYY-MM-DD"
          const autoCategories = ['Aluguel', 'Taxa Adm', 'taxa de pneus'];

          const { data: txToDelete, error: fetchErr } = await supabase
            .from('transactions')
            .select('id, cat, val, date')
            .eq('vehicle_plate', plate)
            .eq('status', 'Concluído')
            .in('cat', autoCategories);

          if (!fetchErr && txToDelete && txToDelete.length > 0) {
            // Filtra só as que têm data igual ao início da locação
            const idsToDelete = txToDelete
              .filter(t => t.date && String(t.date).substring(0, 10) === startDateStr)
              .map(t => t.id);

            if (idsToDelete.length > 0) {
              const { error: delTxErr } = await supabase
                .from('transactions')
                .delete()
                .in('id', idsToDelete);

              if (!delTxErr) {
                setTransactions(prev => prev.filter(t => !idsToDelete.includes(t.id)));
                console.log(`✅ ${idsToDelete.length} transação(ões) automática(s) removida(s) junto com a locação excluída.`);
              } else {
                console.warn('Aviso: Não foi possível remover transações automáticas da locação:', delTxErr.message);
              }
            }
          }
        }

        await handleUpdateVehicle({ id: rental.vehicleId, status: 'Disponível' });
      }

      setRentals(prev => prev.filter(r => r.id !== id));
      logActivity('Apagar', 'Locação', id, `Excluiu a locação de ${rental?.userName || rental?.user || 'desconhecido'} (Veículo ID: ${rental?.vehicleId})`);
      return true;
    } catch (err) {
      console.error("Erro ao apagar locação:", err);
      alert(`Erro ao apagar locação: ${err.message || err.details || 'Erro desconhecido'}`);
      return false;
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

  const handleDeleteClient = async (id) => {
    try {
      const client = clients.find(c => c.id === id);
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
      logActivity('Apagar', 'Cliente', id, `Excluiu o cliente ${client?.nome || client?.name || 'ID: ' + id}`);
      return true;
    } catch (err) {
      console.error("Erro ao apagar cliente:", err);
      alert(`Erro ao apagar cliente: ${err.message || err.details || 'Erro desconhecido'}`);
      return false;
    }
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

      const finalDocs = {
        ...uploadedDocs,
        rg: finalRental.rg || null,
        nacionalidade: finalRental.nacionalidade || null,
        estadoCivil: finalRental.estadoCivil || null,
        cep: finalRental.cep || null,
        cidadeUf: finalRental.cidadeUf || null,
        address: finalRental.address || null
      };

      finalRental.docs = finalDocs;

      // Sincroniza a propriedade da raiz com o valor dentro dos documentos para atualizar contrato_assinado no banco
      if (finalDocs.signedContract) {
        finalRental.signedContract = finalDocs.signedContract;
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
      delete payload.cpf;
      delete payload.address;
      delete payload.rg;
      delete payload.nacionalidade;
      delete payload.estado_civil;
      delete payload.cep;
      delete payload.cidade_uf;
      delete payload.vehicle_year;
      delete payload.vehicle_renavam;
      
      if (payload.value) payload.value = parseFloat(String(payload.value).replace(/\./g, '').replace(',', '.'));
      if (payload['cnh_validity'] === '') payload['cnh_validity'] = null;
      if (payload['data_de_nascimento'] === '') payload['data_de_nascimento'] = null;
      if (payload['start_date'] === '') payload['start_date'] = null;
      if (payload['end_date'] === '') payload['end_date'] = null;

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
          documentos: finalDocs,
          address: finalRental.address || null,
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
        
        // 2. Se não deu certo por ID, tenta pelo CPF (novo ou antigo)
        const cpf = finalRental.cpf;
        const oldCpf = oldRental?.cpf;
        if (!clientUpdated && (cpf || oldCpf)) {
          const { error } = await supabase.from('clients').update(clientPayload).or(`cpf.eq.${cpf},cpf.eq.${oldCpf}`);
          if (!error) clientUpdated = true;
        }

        // 3. Se não deu certo por CPF/ID, tenta pela CNH (nova ou antiga) como fallback
        if (!clientUpdated && (cnh || oldCnh)) {
          const { error } = await supabase.from('clients').update(clientPayload).or(`cnh_number.eq.${cnh},cnh_number.eq.${oldCnh}`);
          if (!error) clientUpdated = true;
        }
        
        // Atualiza estado local de clientes para refletir a mudança imediatamente
        setClients(prev => prev.map(c => {
          const isMatch = (clientId && c.id === clientId) || 
                          (cpf && c.cpf === cpf) || 
                          (oldCpf && c.cpf === oldCpf) ||
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
      return { success: true, data: finalRental };
    } catch (error) {
      console.error("Erro ao atualizar loca\u00e7\u00e3o:", error);
      const errorMsg = error.message || 'Erro desconhecido';
      if (errorMsg.includes('invalid input syntax for type date') || errorMsg.includes('type date: ""')) {
        alert("Atenção: A locação não pôde ser salva porque a Data de Nascimento ou a Validade da CNH estão vazias ou incorretas no formulário. Por favor, verifique-as nos dados do condutor.");
      } else {
        alert(`Erro ao salvar: ${errorMsg}`);
      }
      return { success: false, error };
    }
  };

  const handleRenewRental = async (rentalId, additionalWeeks) => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
      if (!rental) throw new Error('Locação não encontrada');

      const currentWeeks = parseInt(rental.durationWeeks || rental.period || 0) || 4;
      const newWeeks = currentWeeks + additionalWeeks;

      const { error } = await supabase
        .from('rentals')
        .update({ semanas: String(newWeeks) })
        .eq('id', rentalId);

      if (error) throw error;

      setRentals(prev => prev.map(r => r.id === rentalId ? { ...r, durationWeeks: String(newWeeks) } : r));
      logActivity('Renovação', 'Locação', rentalId, `Renovou o contrato do veículo ${rental.plate || rental.vehiclePlate} de ${rental.user || rental.userName} por mais ${additionalWeeks} semanas (Total: ${newWeeks} semanas)`);
      return { success: true };
    } catch (error) {
      console.error("Erro ao renovar locação:", error);
      alert(`Erro ao renovar: ${parseDbError(error)}`);
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
      alert(`Erro ao cadastrar investidor: ${parseDbError(err)}`);
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
      alert(`Erro ao atualizar investidor: ${parseDbError(err)}`);
      return { success: false, error: err };
    }
  };

  const handleDeleteInvestor = async (id) => {
    try {
      const investor = investors.find(i => i.id === id);
      const { error } = await supabase.from('investors').delete().eq('id', id);
      if (error) throw error;
      setInvestors(prev => prev.filter(i => i.id !== id));
      logActivity('Apagar', 'Investidor', id, `Excluiu o investidor ${investor?.name || 'ID: ' + id}`);
      return true;
    } catch (err) {
      console.error("Erro ao apagar investidor:", err);
      alert(`Erro ao apagar investidor: ${err.message || err.details || 'Erro desconhecido'}`);
      return false;
    }
  };

  const handleAddVehicle = async (vehicle) => {
    let imageUrl = vehicle.image;
    
    // Se houver um arquivo real, faz o upload
    if (vehicle.imageFile) {
      imageUrl = await uploadFile(vehicle.imageFile, 'veiculos');
    }

    let crlvUrl = vehicle.crlv;
    if (vehicle.crlvFile) {
      crlvUrl = await uploadFile(vehicle.crlvFile, 'veiculos');
    }

    let crvUrl = vehicle.crv;
    if (vehicle.crvFile) {
      crvUrl = await uploadFile(vehicle.crvFile, 'veiculos');
    }

    let contractUrl = vehicle.contractUrl;
    if (vehicle.contractUrlFile) {
      contractUrl = await uploadFile(vehicle.contractUrlFile, 'veiculos');
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
      crlv: crlvUrl,
      crv: crvUrl,
      contractUrl,
      investorId,
      status: 'Disponível'
    }, 'vehicles');

    // Override with parsed numbers
    dbVehicle['year'] = vehicle.year ? String(vehicle.year).trim() : null;
    dbVehicle['initial_km'] = parseFloat(vehicle.initialKm) || 0;
    dbVehicle['km'] = parseFloat(vehicle.initialKm) || 0;
    dbVehicle['fipe_value'] = parseBRL(vehicle.fipeValue);
    dbVehicle['weekly_rental'] = parseBRL(vehicle.weeklyRental);
    dbVehicle['investment_value'] = parseBRL(vehicle.investmentValue);
    dbVehicle['protection_value'] = parseBRL(vehicle.protectionValue);
    dbVehicle['admin_tax'] = parseFloat(vehicle.adminTax) || 0;
    dbVehicle['investor_tax'] = parseFloat(vehicle.investorTax) || 0;
    dbVehicle['franchise_insurance'] = vehicle.franchiseInsurance === true || String(vehicle.franchiseInsurance) === 'true';
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
      alert(`Erro ao salvar veículo: ${parseDbError(error)}`);
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

    let crlvUrl = vehicle.crlv;
    if (vehicle.crlvFile) {
      crlvUrl = await uploadFile(vehicle.crlvFile, 'veiculos');
    }

    let crvUrl = vehicle.crv;
    if (vehicle.crvFile) {
      crvUrl = await uploadFile(vehicle.crvFile, 'veiculos');
    }

    let contractUrl = vehicle.contractUrl;
    if (vehicle.contractUrlFile) {
      contractUrl = await uploadFile(vehicle.contractUrlFile, 'veiculos');
    }

    const parseBRL = (val) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
    };

    // Busca o UUID do investidor pelo nome
    const investorObj = investors.find(inv => inv.name === vehicle.investor || inv.id === vehicle.investor || inv.id === vehicle.investorId);
    const investorId = investorObj ? investorObj.id : null;

    const vehicleData = { ...vehicle, image: imageUrl, crlv: crlvUrl, crv: crvUrl, contractUrl, investorId };
    const dbVehicle = mapToSnake(vehicleData, 'vehicles');
    
    // Manual overrides for parsed values
    dbVehicle['year'] = vehicle.year ? String(vehicle.year).trim() : null;
    dbVehicle['fipe_value'] = parseBRL(vehicle.fipeValue);
    dbVehicle['weekly_rental'] = parseBRL(vehicle.weeklyRental);
    dbVehicle['investment_value'] = parseBRL(vehicle.investmentValue);
    dbVehicle['protection_value'] = parseBRL(vehicle.protectionValue);
    dbVehicle['km'] = parseFloat(vehicle.km || vehicle.initialKm) || 0;
    dbVehicle['initial_km'] = parseFloat(vehicle.initialKm) || 0;
    dbVehicle['admin_tax'] = parseFloat(vehicle.adminTax) || 0;
    dbVehicle['investor_tax'] = parseFloat(vehicle.investorTax) || 0;
    dbVehicle['franchise_insurance'] = vehicle.franchiseInsurance === true || String(vehicle.franchiseInsurance) === 'true';
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
      alert(`Erro ao salvar: ${parseDbError(error)}`);
    }
  };

  const handleDeleteVehicle = async (id) => {
    try {
      const vehicle = vehicles.find(v => v.id === id);
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
      setVehicles(prev => prev.filter(v => v.id !== id));
      logActivity('Apagar', 'Veículo', id, `Excluiu o veículo ${vehicle?.model || 'ID: ' + id} (${vehicle?.plate || ''})`);
      return true;
    } catch (err) {
      console.error("Erro ao apagar veículo:", err);
      alert(`Erro ao apagar veículo: ${err.message || err.details || 'Erro desconhecido'}`);
      return false;
    }
  };

  const handleAddTransaction = async (transaction) => {
    try {
      const payload = mapToSnake(transaction, 'transactions');
      const { data, error } = await supabase.from('transactions').insert([payload]).select();
      if (error) throw error;
      if (data && data.length > 0) {
        const newTx = mapToCamel(data, 'transactions')[0];
        setTransactions(prev => [newTx, ...prev]);
        logActivity('Criar', 'Financeiro', newTx.id, `Lançou transação de ${newTx.type === 'in' ? 'Recebimento' : 'Pagamento'}: R$ ${newTx.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Desc: ${newTx.desc}`);
        return { success: true, data: newTx };
      }
      return { success: false, error: new Error('Nenhum dado retornado do banco de dados') };
    } catch (err) {
      console.error("Erro ao cadastrar transação:", err);
      alert(`Erro ao salvar lançamento financeiro: ${parseDbError(err)}`);
      return { success: false, error: err };
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      const transaction = transactions.find(t => t.id === id);
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
      logActivity('Apagar', 'Financeiro', id, `Excluiu transação de ${transaction?.type === 'in' ? 'Recebimento' : 'Pagamento'}: R$ ${transaction?.val?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Desc: ${transaction?.desc}`);
      return true;
    } catch (err) {
      console.error("Erro ao apagar transação:", err);
      alert(`Erro ao apagar transação: ${parseDbError(err)}`);
      return false;
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
      alert(`Erro ao encerrar contrato: ${parseDbError(error)}`);
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
      alert(`Erro ao processar pagamento: ${parseDbError(err)}`);
    }
  };

  const handleAddFine = async (fine) => {
    // Auto driver matching logic
    let matchedDriverName = 'Não Identificado';
    let matchedDriverId = null;
    let matchedRentalId = null;

    if (fine.vehiclePlate && fine.date) {
      const fineDate = new Date(fine.date);
      const matchedRental = rentals.find(r => {
        const matchesPlate = (r.plate || r.vehiclePlate || '').replace('-', '').toLowerCase() === fine.vehiclePlate.replace('-', '').toLowerCase();
        if (!matchesPlate) return false;
        
        const start = new Date(r.startDate || r.date);
        start.setHours(0, 0, 0, 0);
        
        const end = r.endDate ? new Date(r.endDate) : new Date('2099-12-31');
        end.setHours(23, 59, 59, 999);
        
        return fineDate >= start && fineDate <= end;
      });

      if (matchedRental) {
        matchedDriverName = matchedRental.userName || matchedRental.user || 'Não Identificado';
        matchedDriverId = matchedRental.clientId || null;
        matchedRentalId = matchedRental.id || null;
      }
    }

    const val = typeof fine.value === 'number' 
      ? fine.value 
      : parseFloat(String(fine.value || '0').replace(/\./g, '').replace(',', '.')) || 0;
    let installments = 1;
    if (val <= 150) {
      installments = 2;
    } else if (val <= 200) {
      installments = 3;
    } else {
      installments = 4;
    }
    const installmentValue = parseFloat((val / installments).toFixed(2));

    const generatedId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
      ? crypto.randomUUID() 
      : 'f_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);

    const newFine = {
      ...fine,
      id: generatedId,
      value: val,
      installments,
      paidInstallments: [],
      installmentValue,
      driverName: fine.driverName !== undefined ? fine.driverName : matchedDriverName,
      driverId: fine.driverId !== undefined ? fine.driverId : matchedDriverId,
      rentalId: fine.rentalId !== undefined ? fine.rentalId : matchedRentalId,
      status: 'Pendente',
      billingSuspended: false,
      createdAt: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('system_fines')
        .insert([mapToSnake(newFine, 'fines')])
        .select();

      if (!error && data) {
        const camelData = mapToCamel(data, 'fines')[0];
        setFines(prev => [camelData, ...prev]);
        setIsFinesDbConnected(true);
        try {
          const localFinesStr = localStorage.getItem('la_system_fines') || '[]';
          const localFines = JSON.parse(localFinesStr);
          localStorage.setItem('la_system_fines', JSON.stringify([camelData, ...localFines]));
        } catch (e) {
          console.warn("Could not sync added fine to localStorage:", e);
        }
        logActivity('Criar', 'Multas', camelData.id, `Registrou multa: ${camelData.infraction} - Placa: ${camelData.vehiclePlate} - Condutor: ${camelData.driverName}`);
        return { success: true, data: camelData };
      }
      if (error) {
        console.warn("Supabase system_fines insert error, falling back to local storage:", error);
      }
    } catch (e) {
      console.warn("Could not insert to Supabase system_fines:", e);
    }

    const localFinesStr = localStorage.getItem('la_system_fines') || '[]';
    const localFines = JSON.parse(localFinesStr);
    const localEntry = { ...newFine, id: Date.now() };
    const updatedFines = [localEntry, ...localFines];
    localStorage.setItem('la_system_fines', JSON.stringify(updatedFines));
    setFines(updatedFines);
    logActivity('Criar', 'Multas', localEntry.id, `Registrou multa (Local): ${localEntry.infraction} - Placa: ${localEntry.vehiclePlate} - Condutor: ${localEntry.driverName}`);
    return { success: true, data: localEntry };
  };

  const handleUpdateFine = async (updatedFine) => {
    try {
      const localFinesStr = localStorage.getItem('la_system_fines') || '[]';
      const localFines = JSON.parse(localFinesStr);
      const updatedLocal = localFines.map(f => f.id === updatedFine.id ? updatedFine : f);
      localStorage.setItem('la_system_fines', JSON.stringify(updatedLocal));
    } catch (e) {
      console.warn("Could not sync update to localStorage:", e);
    }

    try {
      const payload = mapToSnake(updatedFine, 'fines');
      delete payload.id;
      const { error } = await supabase
        .from('system_fines')
        .update(payload)
        .eq('id', updatedFine.id);

      if (!error) {
        setFines(prev => prev.map(f => f.id === updatedFine.id ? updatedFine : f));
        setIsFinesDbConnected(true);
        logActivity('Atualizar', 'Multas', updatedFine.id, `Atualizou status da multa ID ${updatedFine.id} para: ${updatedFine.status}`);
        return { success: true };
      }
    } catch (e) {
      console.warn("Supabase system_fines update failed:", e);
    }

    setFines(prev => prev.map(f => f.id === updatedFine.id ? updatedFine : f));
    logActivity('Atualizar', 'Multas', updatedFine.id, `Atualizou status da multa ID ${updatedFine.id} (Local) para: ${updatedFine.status}`);
    return { success: true };
  };

  const handleDeleteFine = async (id) => {
    try {
      const localFinesStr = localStorage.getItem('la_system_fines') || '[]';
      const localFines = JSON.parse(localFinesStr);
      const updatedLocal = localFines.filter(f => f.id !== id);
      localStorage.setItem('la_system_fines', JSON.stringify(updatedLocal));
    } catch (e) {
      console.warn("Could not sync delete to localStorage:", e);
    }

    try {
      const { error } = await supabase
        .from('system_fines')
        .delete()
        .eq('id', id);

      if (!error) {
        setFines(prev => prev.filter(f => f.id !== id));
        setIsFinesDbConnected(true);
        logActivity('Apagar', 'Multas', id, `Excluiu multa ID ${id}`);
        return { success: true };
      }
    } catch (e) {
      console.warn("Supabase system_fines delete failed:", e);
    }

    setFines(prev => prev.filter(f => f.id !== id));
    logActivity('Apagar', 'Multas', id, `Excluiu multa ID ${id} (Local)`);
    return { success: true };
  };

  const handleConfirmPayment = async (rentalId, billingData) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return;

    const vehicle = vehicles.find(v => v.id === rental.vehicleId);
    const mainAdminTaxPercent = parseFloat(vehicle?.adminTax || 20) / 100;
    
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
      const repAdminTaxPercent = parseFloat(repVehicle?.adminTax || 20) / 100;
      repAdminRevenue = repRent * repAdminTaxPercent;
    }

    // A taxa do Asaas agora é lançada automaticamente via Webhook apenas quando o boleto/pix for pago.

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
        status: 'Concluído',
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
        status: 'Concluído',
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
        status: 'Concluído',
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
        status: 'Concluído',
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
        status: 'Concluído',
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
        status: 'Concluído',
        responsible: 'Administradora'
      });
    }

    // A taxa do gateway agora é lançada no webhook quando paga.

    if (trans.length > 0) {
      const { data, error } = await supabase.from('transactions').insert(trans.map(t => mapToSnake(t, 'transactions'))).select();
      if (!error && data) setTransactions(prev => [...mapToCamel(data, 'transactions'), ...prev]);
    }

    // 6. Atualizar as multas do motorista incluídas neste pagamento
    if (billingData.finesDetails && Array.isArray(billingData.finesDetails)) {
      for (const fd of billingData.finesDetails) {
        const fine = fines.find(f => f.id === fd.id);
        if (fine) {
          const nextInstNum = parseInt(fd.installment.split('/')[0]);
          const paidInstallments = [...(fine.paidInstallments || []), nextInstNum];
          const isPaid = paidInstallments.length >= fine.installments;
          const updatedFine = {
            ...fine,
            paidInstallments,
            status: isPaid ? 'Paga' : 'Em Cobrança'
          };
          await handleUpdateFine(updatedFine);

          // Lançar transação de pagamento no financeiro (entrada para a empresa dedicada à multa)
          const newFineTrans = {
            date: todayStr,
            type: 'in',
            val: fd.value,
            desc: `Cobrança Multa (${fine.infraction} - parc. ${fd.installment}) - ${rental.user}`,
            cat: 'multa',
            vehiclePlate: rental.plate,
            status: 'Concluído',
            responsible: 'Administradora'
          };
          const { data: tfData, error: tfError } = await supabase.from('transactions').insert([mapToSnake(newFineTrans, 'transactions')]).select();
          if (!tfError && tfData) {
            setTransactions(prev => [mapToCamel(tfData, 'transactions')[0], ...prev]);
          }
        }
      }
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

      // 2. Upload Additional Photos in Parallel
      const additionalPhotos = inspection.additionalPhotos || [];
      const uploadedAdditional = await Promise.all(additionalPhotos.map(async (photoObj) => {
        if (photoObj.file) {
          const url = await uploadFile(photoObj.file, `vistorias/${inspection.vehiclePlate}/adicionais`);
          return { preview: url };
        }
        return photoObj;
      }));

      // Store additional photos under 'additional' key of photos object
      if (uploadedAdditional.length > 0) {
        uploadedPhotos.additional = uploadedAdditional;
      }

      // 3. Upload Damage Photos in Parallel
      const validDamages = (inspection.damages || []).filter(d => d.photo || d.description);
      const uploadedDamages = await Promise.all(validDamages.map(async (dmg) => {
        if (dmg.photo && dmg.photo.file) {
          const url = await uploadFile(dmg.photo.file, `vistorias/${inspection.vehiclePlate}/avarias`);
          return { ...dmg, photo: { preview: url } };
        }
        return dmg;
      }));

      // 4. Upload Video if exists
      let videoUrl = inspection.video;
      if (inspection.video && inspection.video.file) {
        const url = await uploadFile(inspection.video.file, `vistorias/${inspection.vehiclePlate}/videos`);
        videoUrl = { preview: url };
      }

      // Find driver at the time of inspection
      let driverName = inspection.driverName;
      if (!driverName && inspection.vehiclePlate) {
        const insDateStr = inspection.date;
        const matchingRental = rentals.find(r => {
          const plate = r.vehiclePlate || r.plate;
          if ((plate || '').replace('-', '').toUpperCase() !== (inspection.vehiclePlate || '').replace('-', '').toUpperCase()) return false;
          
          const start = r.startDate;
          const end = r.endDate;
          
          const afterStart = start ? (insDateStr >= start) : true;
          const beforeEnd = end ? (insDateStr <= end) : true;
          
          return afterStart && beforeEnd;
        });
        if (matchingRental) {
          driverName = matchingRental.userName || matchingRental.user;
        } else {
          const activeRental = rentals.find(r => 
            (r.vehiclePlate || r.plate || '').replace('-', '').toUpperCase() === (inspection.vehiclePlate || '').replace('-', '').toUpperCase() &&
            r.status === 'Ativo'
          );
          driverName = activeRental?.userName || activeRental?.user || null;
        }
      }

      const finalInspection = {
        ...inspection,
        driverName,
        photos: uploadedPhotos,
        damages: uploadedDamages,
        video: videoUrl,
        items: {
          externalCleanliness: inspection.externalCleanliness,
          internalCleanliness: inspection.internalCleanliness,
          lastOilChangeDate: inspection.lastOilChangeDate,
          lastOilChangeKm: inspection.lastOilChangeKm,
          nextOilChangeKm: inspection.nextOilChangeKm,
        }
      };
      delete finalInspection.additionalPhotos;
      delete finalInspection.externalCleanliness;
      delete finalInspection.internalCleanliness;
      delete finalInspection.lastOilChangeDate;
      delete finalInspection.lastOilChangeKm;
      delete finalInspection.nextOilChangeKm;

      const { data, error } = await supabase.from('inspections').insert([mapToSnake(finalInspection)]).select();
      if (error) throw error;
      
      if (data) {
        const newInsp = mapToCamel(data)[0];
        const unpackedInsp = {
          ...newInsp,
          externalCleanliness: newInsp.items?.externalCleanliness || newInsp.externalCleanliness,
          internalCleanliness: newInsp.items?.internalCleanliness || newInsp.internalCleanliness,
          lastOilChangeDate: newInsp.items?.lastOilChangeDate || newInsp.lastOilChangeDate,
          lastOilChangeKm: newInsp.items?.lastOilChangeKm || newInsp.lastOilChangeKm,
          nextOilChangeKm: newInsp.items?.nextOilChangeKm || newInsp.nextOilChangeKm,
        };
        setInspections(prev => [unpackedInsp, ...prev]);
        logActivity('Criar', 'Vistoria', unpackedInsp.id, `Realizou vistoria de ${unpackedInsp.type} para o veículo ${unpackedInsp.vehiclePlate}`);
      }
    } catch (err) {
      console.error('Erro ao salvar vistoria com arquivos:', err.message);
      alert(`Erro ao salvar vistoria: ${parseDbError(err)}`);
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
      const cleanOs = { ...os };
      if (cleanOs.km === '' || cleanOs.km === undefined || cleanOs.km === null) {
        cleanOs.km = null;
      } else {
        cleanOs.km = Number(cleanOs.km);
      }
      const { data, error } = await supabase.from('service_orders').insert([mapToSnake({ ...cleanOs, status: 'Aberta' })]).select();
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
        setReplacementContracts(prev => prev.map(rc => 
          rc.id === activeRC.id 
            ? { ...rc, status: 'Encerrado', endDate: new Date().toISOString().split('T')[0] } 
            : rc
        ));
        const repV = vehicles.find(v => v.plate === activeRC.replacementVehiclePlate);
        if (repV) await handleUpdateVehicle({ id: repV.id, status: 'Disponível' });
      }

      await handleAddMaintenance({ vehiclePlate: os.plate, vehicleModel: os.model, date: os.date, serviceType: os.description, value: os.total, provider: os.provider, currentKm: os.km, responsible: os.responsible, observations: `O.S. #${os.id}` });
      logActivity('Encerrar OS', 'Manutenção', os.id, `Concluiu a ordem de serviço #${os.id} para o veículo ${os.plate} - Valor: R$ ${os.total}`);
    }
  };

  const handleUpdateServiceOrder = async (updatedOs) => {
    try {
      const cleanOs = { ...updatedOs };
      if (cleanOs.km === '' || cleanOs.km === undefined || cleanOs.km === null) {
        cleanOs.km = null;
      } else {
        cleanOs.km = Number(cleanOs.km);
      }

      const payload = mapToSnake(cleanOs);
      delete payload.id;
      delete payload.total;
      
      const { error } = await supabase.from('service_orders').update(payload).eq('id', cleanOs.id);
      if (error) throw error;

      setServiceOrders(prev => prev.map(o => o.id === cleanOs.id ? cleanOs : o));
      logActivity('Atualizar', 'Ordem Serviço', cleanOs.id, `Atualizou O.S. #${cleanOs.id} para veículo ${cleanOs.plate}`);
      return { success: true };
    } catch (err) {
      console.error("Erro ao atualizar ordem de serviço:", err);
      alert(`Erro ao atualizar ordem de serviço: ${parseDbError(err)}`);
      return { success: false, error: err };
    }
  };

  const handleDeleteServiceOrder = async (id) => {
    const os = serviceOrders.find(o => o.id === id);
    if (!os) return;
    
    const { error } = await supabase.from('service_orders').delete().eq('id', id);
    if (!error) {
      setServiceOrders(prev => prev.filter(o => o.id !== id));
      
      // Se a OS estava aberta, restaura o status do veículo
      if (os.status === 'Aberta' && os.vehicleId) {
        const wasRented = rentals.some(r => r.vehicleId === os.vehicleId && r.status === 'Ativo');
        await handleUpdateVehicle({ id: os.vehicleId, status: wasRented ? 'Alugado' : 'Disponível' });
      }
      
      // Se havia um carro reserva ativo para esta OS, encerra o contrato e libera o carro reserva
      const activeRC = replacementContracts.find(rc => rc.mainVehiclePlate === os.plate && rc.status === 'Ativo');
      if (activeRC) {
        await supabase.from('replacement_contracts').update({ status: 'Encerrado', end_date: new Date().toISOString() }).eq('id', activeRC.id);
        setReplacementContracts(prev => prev.map(rc => 
          rc.id === activeRC.id 
            ? { ...rc, status: 'Encerrado', endDate: new Date().toISOString().split('T')[0] } 
            : rc
        ));
        const repV = vehicles.find(v => v.plate === activeRC.replacementVehiclePlate);
        if (repV) await handleUpdateVehicle({ id: repV.id, status: 'Disponível' });
      }

      logActivity('Apagar', 'Ordem Serviço', id, `Excluiu a ordem de serviço #${id} para o veículo ${os.plate || 'desconhecido'}`);
    } else {
      console.error("Erro ao apagar ordem de serviço:", error);
      alert(`Erro ao apagar ordem de serviço: ${parseDbError(error)}`);
    }
  };

  const handleAddClient = async (clientData) => {
    try {
      const userName = clientData.nome || clientData.name || 'cliente';

      // Upload de documentos
      const uploadedDocs = { ...(clientData.docs || {}) };

      if (uploadedDocs.cnh instanceof File) {
        const url = await uploadFile(uploadedDocs.cnh, `condutores/${userName}`);
        if (url) uploadedDocs.cnh = url;
      }
      if (uploadedDocs.residence instanceof File) {
        const url = await uploadFile(uploadedDocs.residence, `condutores/${userName}`);
        if (url) uploadedDocs.residence = url;
      }
      if (uploadedDocs.appPrints && Array.isArray(uploadedDocs.appPrints)) {
        const printUrls = await Promise.all(uploadedDocs.appPrints.map(async (print) => {
          if (print instanceof File) return await uploadFile(print, `condutores/${userName}/prints`);
          return print;
        }));
        uploadedDocs.appPrints = printUrls.filter(u => u);
      }

      // Limpeza: garante que nenhum File permaneça
      Object.keys(uploadedDocs).forEach(key => {
        if (uploadedDocs[key] instanceof File) delete uploadedDocs[key];
      });

      const cleanDate = (d) => (d && String(d).trim() !== '') ? d : null;

      const payload = {
        nome: clientData.nome || clientData.name,
        telefone: clientData.telefone || clientData.phone || null,
        'e-mail': clientData.email || null,
        cpf: clientData.cpf || null,
        cnh_number: clientData.cnhNumber || null,
        cnh_validity: cleanDate(clientData.cnhValidity),
        registro_cnh: clientData.cnhRegisterNumber || null,
        data_de_nascimento: cleanDate(clientData.birthDate),
        address: clientData.address || null,
        documentos: {
          ...uploadedDocs,
          rg: clientData.rg || null,
          nacionalidade: clientData.nacionalidade || null,
          estadoCivil: clientData.estadoCivil || null,
          cep: clientData.cep || null,
          cidadeUf: clientData.cidadeUf || null,
          address: clientData.address || null
        },
        status: 'Ativo'
      };

      // Verifica duplicidade por CPF ou CNH
      const queryField = payload.cpf ? 'cpf' : (payload.cnh_number ? 'cnh_number' : null);
      const queryVal = payload.cpf || payload.cnh_number;

      if (queryVal) {
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq(queryField, queryVal)
          .maybeSingle();

        if (existing) {
          alert('Já existe um cliente cadastrado com este CPF ou CNH.');
          return { success: false, error: { message: 'Cliente duplicado' } };
        }
      }

      const { data, error } = await supabase.from('clients').insert([payload]).select();
      if (error) throw error;

      if (data && data[0]) {
        const newClient = mapToCamel(data, 'clients')[0];
        setClients(prev => [newClient, ...prev]);
        logActivity('Criar', 'Cliente', data[0].id, `Cadastrou o cliente ${payload.nome}`);
      }

      return { success: true };
    } catch (err) {
      console.error('Erro ao cadastrar cliente:', err);
      const errorMsg = err.message || 'Erro desconhecido';
      alert(`Erro ao cadastrar cliente: ${errorMsg}`);
      return { success: false, error: err };
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
    fines, isFinesDbConnected,
    currentUser, setCurrentUser, selectedImage, setSelectedImage, logs, isLogsDbConnected,
    showInterestModal, setShowInterestModal, showSuccessPopup, setShowSuccessPopup,
    selectedVehicleForInterest, setSelectedVehicleForInterest,
    interestForm, setInterestForm,
    handleAddSystemUser, handleUpdateSystemUser, handleDeleteSystemUser,
    handleAddLead, handleUpdateLeadStatus, handleDeleteLead, handleAddRental, handleDeleteRental,
    handleUpdateRental, handleRenewRental, handleAddInvestor, handleUpdateInvestor, handleDeleteInvestor,
    handleAddVehicle, handleUpdateVehicle, handleDeleteVehicle, handleUpdateClient, handleDeleteClient, handleAddClient, handleAddTransaction,
    handleUpdateTransactionStatus,
    handleDeleteTransaction,
    handleAddMaintenance, handleUpdateMaintenance, handleDeleteMaintenance,
    handleCompleteClosure, handlePayCaucaoInstallment, handleConfirmPayment,
    handleAddInspection, handleDeleteInspection, handleCloseServiceOrder, handleUpdateServiceOrder, handleDeleteServiceOrder,
    handleInterestSubmit,
    handleAddFine, handleUpdateFine, handleDeleteFine,
    seedData: () => console.log('Seed data is no longer available.')
  };
};
