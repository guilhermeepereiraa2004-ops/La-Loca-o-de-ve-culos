import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { sourcemap: false },
  server: {
    host: '127.0.0.1',
    fs: {
      strict: true,
      deny: ['.env', '.env.*', '*.{crt,pem,key}', '**/.git/**', '**/security-audit/**', '**/scratch/**', '**/supabase/.temp/**', '**/supabase/migrations/**', '**/supabase/config.toml', '**/supabase/functions/secure-*/**', '**/supabase/functions/asaas-*/**', '**/*dump*', '**/*.{sql,xls,xlsx,doc,docx,pdf,bak,zip}'],
    },
  },
  preview: { host: '127.0.0.1' },
})
