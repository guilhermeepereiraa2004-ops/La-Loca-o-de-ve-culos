export const INITIAL_LEADS = [
  {
    id: 1,
    name: 'João Silva',
    contact: '(79) 99999-0000',
    type: 'locacao',
    vehicleModel: 'Porsche 911 Carrera',
    vehiclePlate: 'LA-9110',
    vehicleImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80',
    status: 'novo',
    date: '09/05/2026',
    message: 'Tenho interesse em alugar para o próximo final de semana.'
  }
];

export const INITIAL_INVESTORS = [
  {
    id: 1,
    name: 'Ricardo Santana',
    email: 'ricardo@email.com',
    phone: '(79) 99999-0001',
    cpf: '123.456.789-00',
    address: 'Rua das Palmeiras, 123 - Jardins, Aracaju/SE',
    bank: 'Nubank / 0001 / 12345-6',
    pix: 'ricardo@email.com',
    password: 'invest123',
    adminTax: '15',
    status: 'Ativo'
  },
  {
    id: 2,
    name: 'Guilherme Pereira',
    email: 'guilherme@email.com',
    phone: '(79) 99999-0002',
    cpf: '987.654.321-00',
    address: 'Av. Beira Mar, 456 - Centro, Aracaju/SE',
    bank: 'Itaú / 0341 / 98765-4',
    pix: '987.654.321-00',
    password: 'invest456',
    adminTax: '12',
    status: 'Ativo'
  }
];

export const INITIAL_VEHICLES = [
  {
    id: 1, model: 'Porsche 911 Carrera', plate: 'LA-9110', year: '2023/2023', renavam: '12345678901',
    initialKm: '5000', km: '15000', fipeValue: '850000', investor: 'Ricardo Santana', adminTax: '15',
    protectionPaidByAdmin: true, protectionValue: '120', franchiseInsurance: true, hasSpareKey: true,
    lastBeltChangeKm: '10000', beltChangeIntervalKm: '80000', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80', dividend: '3500',
    weeklyRental: '2500', investmentValue: '850000', preventiveMaintenance: true, status: 'Disponível',
    hasProtection: true, protectionCompany: 'APVS Premium', protectionPaymentDate: '2024-01-15',
    entryDate: '2024-01-15', crlvFile: null, isFavorite: true
  },
  {
    id: 2, model: 'Audi RS6 Avant', plate: 'LA-0066', year: '2022/2023', renavam: '98765432100',
    initialKm: '12000', km: '28000', fipeValue: '720000', investor: 'Guilherme Pereira', adminTax: '12',
    protectionPaidByAdmin: false, protectionValue: '150', franchiseInsurance: true, hasSpareKey: false,
    lastBeltChangeKm: '20000', beltChangeIntervalKm: '60000', image: 'https://images.unsplash.com/photo-1600712242805-5f5666b0b4e9?auto=format&fit=crop&q=80', dividend: '4200',
    weeklyRental: '2000', investmentValue: '720000', preventiveMaintenance: false, status: 'Disponível',
    hasProtection: false, protectionCompany: '', protectionPaymentDate: '2024-03-10',
    entryDate: '2024-03-10', crlvFile: null, isFavorite: true
  }
];
