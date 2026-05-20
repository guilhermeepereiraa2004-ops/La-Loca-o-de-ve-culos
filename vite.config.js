import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Chave da API do Asaas (Sandbox) — roda apenas em Node.js, nunca no browser.
// Deve estar aqui como string JS literal porque o "$" no início seria interpretado
// pelo dotenv como variável de ambiente, resultando em valor vazio.
const ASAAS_API_KEY = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjMxYWVmYjI5LTAxNzUtNDU1MC1iMTMwLTIzODkyYzdkMDdlMjo6JGFhY2hfMTVlNzZhYjYtZWZhNi00OWYxLTk0ZDMtYTI0NTNkYjc5ZTEw';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Em desenvolvimento: /api/asaas/* → https://sandbox.asaas.com/api/v3/*
      // Headers adicionados estaticamente pelo proxy — nunca expostos no browser
      '/api/asaas': {
        target: 'https://sandbox.asaas.com/api/v3',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/asaas/, ''),
        headers: {
          'access_token': ASAAS_API_KEY,
        },
      },
    },
  },
})
