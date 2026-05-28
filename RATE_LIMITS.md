# Rate Limits — LA Locação de Veículos

Documentação completa de todas as proteções de rate limiting implementadas no sistema.

---

## Visão Geral

O sistema possui **4 camadas de proteção** independentes:

| Camada | Tecnologia | Estratégia |
|---|---|---|
| Frontend | React + localStorage | Rastreia tentativas por tipo de ação |
| API Proxy (Vercel) | Node.js Serverless | Rate limit por IP em memória |
| Webhook (Supabase Edge) | Deno | Rate limit por IP + validação de origem |
| Supabase Auth | GoTrue (nativo) | Configurado no `supabase/config.toml` |

---

## Limites Configurados

### Frontend (`src/lib/rateLimiter.js`)

| Tipo de Ação | Chave | Max Tentativas | Janela | Duração do Bloqueio |
|---|---|---|---|---|
| Login Admin | `admin_login` | 5 | 5 minutos | 15 minutos |
| Login Investidor | `investor_login` | 5 | 5 minutos | 15 minutos |
| Formulário de Interesse | `interest_form` | 3 | 10 minutos | 30 minutos |
| Upload de Arquivo | `upload_file` | 10 | 5 minutos | 5 minutos |
| Requisição API | `api_request` | 60 | 1 minuto | 2 minutos |

### API Proxy Asaas (`api/asaas-proxy.js`)

| Limite | Valor |
|---|---|
| Máximo de requisições | 30 por minuto |
| Duração do bloqueio | 2 minutos |
| Escopo | Por IP |
| Resposta ao exceder | HTTP 429 com `Retry-After` |

### Webhook Asaas (`supabase/functions/asaas-webhook/index.ts`)

| Limite | Valor |
|---|---|
| Máximo de requisições | 100 por 5 minutos |
| Duração do bloqueio | 10 minutos |
| Escopo | Por IP |
| Validação adicional | Content-Type: application/json obrigatório |

### Supabase Auth (nativo — `supabase/config.toml`)

| Evento | Limite Atual |
|---|---|
| Emails enviados | 2 por hora |
| Sign-in / Sign-up | 30 por 5 minutos por IP |
| Verificações OTP | 30 por 5 minutos por IP |
| Refresh de token | 150 por 5 minutos por IP |

---

## Arquivos Modificados / Criados

| Arquivo | Tipo | Proteção Adicionada |
|---|---|---|
| `src/lib/rateLimiter.js` | **[NOVO]** | Motor central de rate limiting |
| `src/components/auth/AdminLogin.jsx` | Modificado | Brute force no login admin |
| `src/components/auth/InvestorLogin.jsx` | Modificado | Brute force no login investidor |
| `src/components/ui/modals/InterestModal.jsx` | Modificado | Anti-spam no formulário público |
| `api/asaas-proxy.js` | Modificado | Rate limit + validação de origem |
| `supabase/functions/asaas-webhook/index.ts` | Modificado | Rate limit + validação de Content-Type |
| `src/utils/supabaseStorage.js` | Modificado | Throttle de uploads |

---

## Como Ajustar os Limites

### Frontend
Edite o objeto `RATE_LIMIT_CONFIG` em `src/lib/rateLimiter.js`:

```js
const RATE_LIMIT_CONFIG = {
  admin_login: {
    maxAttempts: 5,           // Quantidade de tentativas permitidas
    windowMs: 5 * 60 * 1000, // Janela de tempo em ms (5 minutos)
    blockDurationMs: 15 * 60 * 1000, // Duração do bloqueio em ms (15 min)
    friendlyName: 'login de administrador',
  },
  // ...
};
```

### API Proxy (Vercel)
Edite o objeto `RATE_LIMIT` em `api/asaas-proxy.js`:

```js
const RATE_LIMIT = {
  maxRequests: 30,             // Máximo por janela
  windowMs: 60 * 1000,        // Janela (1 minuto)
  blockDurationMs: 2 * 60 * 1000, // Bloqueio (2 minutos)
};
```

### Domínios Autorizados no Proxy
Adicione/remova domínios no array `ALLOWED_ORIGINS` em `api/asaas-proxy.js`:

```js
const ALLOWED_ORIGINS = [
  'https://la-loca-o-de-ve-culos.vercel.app',
  'https://laveiculos.com.br',
  // Adicione outros domínios aqui
];
```

---

## Como Testar

### Teste 1 — Brute Force no Login Admin
1. Acesse a tela de login admin
2. Insira credenciais erradas 5 vezes consecutivas
3. **Esperado:** Bloqueio por 15 minutos, timer visível, formulário desabilitado

### Teste 2 — Anti-spam no Formulário de Interesse
1. Acesse a landing page e clique em "Tenho Interesse"
2. Submeta o formulário 3 vezes seguidas
3. **Esperado:** Na 4ª tentativa, exibe tela de bloqueio com timer de 30 minutos

### Teste 3 — Rate Limit no Proxy Asaas
```bash
# Executar via terminal (requer curl)
for i in $(seq 1 35); do
  echo "Tentativa $i:"
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Origin: https://laveiculos.com.br" \
    https://seu-site.vercel.app/api/asaas/customers
done
# As primeiras 30 devem retornar 200, após isso 429
```

### Teste 4 — Verificar Headers de Rate Limit
```bash
curl -I -H "Origin: https://laveiculos.com.br" \
  https://seu-site.vercel.app/api/asaas/customers
# Procure pelos headers:
# X-RateLimit-Limit: 30
# X-RateLimit-Remaining: 29
# X-RateLimit-Reset: 60
```

### Teste 5 — Reset Manual (para desenvolvedores)
Abra o DevTools do navegador e no console:
```js
// Limpa TODOS os dados de rate limit
import('/src/lib/rateLimiter.js').then(rl => rl.clearAll());

// Ou manualmente via localStorage
Object.keys(localStorage)
  .filter(k => k.startsWith('la_rl_'))
  .forEach(k => localStorage.removeItem(k));
```

---

## Pontos Vulneráveis Restantes

| Risco | Nível | Mitigation Futura |
|---|---|---|
| Rate limit frontend bypassável limpando localStorage | 🟡 Baixo | Implementar rate limit via Supabase Edge Function para todas as rotas |
| Proxy Asaas sem autenticação de usuário logado | 🟡 Médio | Adicionar verificação de sessão Supabase no proxy |
| Senha master hardcoded no código (`123456`) | 🔴 Alto | Migrar para variável de ambiente ou Supabase Auth |
| Logs de abuso armazenados apenas no console | 🟡 Médio | Persistir em tabela `system_logs` no Supabase |
| Rate limit do proxy não persiste entre cold starts | 🟢 Baixo | Para alta escala, migrar para Redis/Upstash |

---

## Comportamento por Ambiente

| Ambiente | Validação de Origem | Rate Limit |
|---|---|---|
| `development` (local) | Desabilitado (permite tudo) | Ativo (localStorage) |
| `production` (Vercel) | Ativo (ALLOWED_ORIGINS) | Ativo (memória) |

---

## Respostas de Erro Padronizadas

### HTTP 429 (Too Many Requests)
```json
{
  "error": "Muitas requisições. Aguarde antes de tentar novamente.",
  "code": "TOO_MANY_REQUESTS",
  "retryAfterSeconds": 120
}
```

### HTTP 403 (Forbidden — Origem inválida)
```json
{
  "error": "Acesso não autorizado.",
  "code": "FORBIDDEN_ORIGIN"
}
```

### HTTP 400 (Bad Request — Payload inválido)
```json
{
  "error": "Requisição inválida",
  "code": "INVALID_REQUEST"
}
```
