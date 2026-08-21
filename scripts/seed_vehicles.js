import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const carModels = ['Fiat Mobi', 'Renault Kwid', 'VW Gol', 'Chevrolet Onix', 'Hyundai HB20', 'Toyota Etios', 'Ford Ka', 'Hyundai Creta', 'Jeep Renegade', 'VW Polo'];

const generatePlate = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  let plate = '';
  for (let i = 0; i < 3; i++) plate += letters.charAt(Math.floor(Math.random() * letters.length));
  plate += numbers.charAt(Math.floor(Math.random() * numbers.length));
  plate += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 2; i++) plate += numbers.charAt(Math.floor(Math.random() * numbers.length));
  return plate;
};

async function seed() {
  const vehicles = [];
  for (let i = 0; i < 20; i++) {
    vehicles.push({
      model: carModels[Math.floor(Math.random() * carModels.length)],
      plate: generatePlate(),
      year: '2023',
      status: 'Disponível',
      renavam: Math.floor(Math.random() * 100000000000).toString(),
      initial_km: Math.floor(Math.random() * 50000),
      km: Math.floor(Math.random() * 50000) + 100,
      fipe_value: 50000,
      weekly_rental: 500,
      investment_value: 0,
      protection_value: 0,
      admin_tax: 0,
      investor_tax: 0,
      franchise_insurance: false,
      entry_date: new Date().toISOString()
    });
  }

  console.log('Inserindo 20 veículos no banco de dados local...');
  const { data, error } = await supabase.from('vehicles').insert(vehicles);
  
  if (error) {
    console.error('Erro ao inserir veículos:', error);
  } else {
    console.log('Sucesso! 20 veículos inseridos como disponíveis.');
  }
}

seed();
