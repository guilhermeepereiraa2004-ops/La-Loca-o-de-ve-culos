const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
const { createClient } = require('@supabase/supabase-js');
const s = createClient(url, key);

const docs = {
  "rg": "1234567 SSP/SE",
  "cep": "49000-000",
  "cnh": null,
  "address": "Rua Antônio, n° 42, Bairro Zona",
  "cidadeUf": "Aracaju/SE",
  "appPrints": [],
  "residence": null,
  "estadoCivil": "solteiro(a)",
  "payment_day": null,
  "nacionalidade": "brasileiro(a)",
  "signedContract": null,
  "isReplacement": true,
  "mainVehiclePlate": "EWF9G76"
};

s.from('rentals').update({ documentos: docs }).eq('id', '537472da-3cff-4ea8-9cd0-8570ca8d83ab')
  .then(() => console.log('Updated'));
