/**
 * api/asaas-proxy.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Proxy Vercel Serverless para a API do Asaas.
 *
 * SEGURANÇA:
 *  - Rate limit por IP: 30 requisições/minuto (bloqueio de 2 minutos)
 *  - Validação de origem: apenas requisições do domínio autorizado são aceitas
 *  - Headers de segurança na resposta
 *  - Logs de abuso para auditoria
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── CONFIGURAÇÕES DE RATE LIMIT ───────────────────────────────────────────────
const RATE_LIMIT = {
  maxRequests: 30,        // Máximo de requisições por janela
  windowMs: 60 * 1000,   // Janela de 1 minuto (em ms)
  blockDurationMs: 2 * 60 * 1000, // Bloqueio de 2 minutos após exceder
};

// ── DOMÍNIOS AUTORIZADOS ──────────────────────────────────────────────────────
// Adicione aqui todos os domínios que podem chamar este proxy
const ALLOWED_ORIGINS = [
  'https://la-loca-o-de-ve-culos.vercel.app',
  'https://laveiculos.com.br',
  'https://www.laveiculos.com.br',
  'http://localhost:5173',   // Desenvolvimento local (Vite)
  'http://127.0.0.1:5173',   // Desenvolvimento local (alternativo)
];

// ── ARMAZENAMENTO EM MEMÓRIA DO RATE LIMIT ────────────────────────────────────
// NOTA: Este Map vive na memória da instância serverless.
// Cada cold start zera os contadores (comportamento esperado e aceitável).
// Para rate limiting distribuído com múltiplas instâncias, use Redis/Upstash.
const ipCounters = new Map();

/**
 * Verifica e registra uma requisição para um IP.
 * @param {string} ip - Endereço IP do cliente
 * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const record = ipCounters.get(ip);

  // IP bloqueado
  if (record?.blockedUntil && record.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: record.blockedUntil - now,
    };
  }

  // IP novo ou janela expirada
  if (!record || now - record.windowStart > RATE_LIMIT.windowMs) {
    ipCounters.set(ip, { count: 1, windowStart: now, blockedUntil: null });
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1, resetMs: RATE_LIMIT.windowMs };
  }

  // Dentro da janela
  if (record.count < RATE_LIMIT.maxRequests) {
    record.count++;
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - record.count, resetMs: RATE_LIMIT.windowMs - (now - record.windowStart) };
  }

  // Limite excedido — aplica bloqueio
  const blockedUntil = now + RATE_LIMIT.blockDurationMs;
  ipCounters.set(ip, { ...record, blockedUntil });

  console.warn(`[asaas-proxy] 🚫 Rate limit excedido para IP: ${ip}. Bloqueado até ${new Date(blockedUntil).toISOString()}`);

  return {
    allowed: false,
    remaining: 0,
    resetMs: RATE_LIMIT.blockDurationMs,
  };
}

/**
 * Extrai o IP real do cliente, respeitando headers de proxy.
 * @param {object} req - Objeto de requisição do Vercel
 * @returns {string}
 */
function getClientIP(req) {
  return (
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Verifica se a origem da requisição é permitida.
 * @param {object} req
 * @returns {{ allowed: boolean, origin: string }}
 */
function checkOrigin(req) {
  const origin = req.headers['origin'] || req.headers['referer'] || '';

  // Em ambiente de produção, valida a origem
  if (process.env.NODE_ENV === 'production') {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
    return { allowed: isAllowed, origin };
  }

  // Em desenvolvimento, permite todas as origens
  return { allowed: true, origin };
}

// ── HANDLER PRINCIPAL ─────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const clientIP = getClientIP(req);

  // ── 1. Headers de segurança ────────────────────────────────────────────────
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // ── 2. Verificação de origem ───────────────────────────────────────────────
  const originCheck = checkOrigin(req);
  if (!originCheck.allowed) {
    console.warn(`[asaas-proxy] 🚫 Origem não autorizada: "${originCheck.origin}" | IP: ${clientIP}`);
    return res.status(403).json({
      error: 'Acesso não autorizado.',
      code: 'FORBIDDEN_ORIGIN',
    });
  }

  // ── 3. Rate Limit por IP ───────────────────────────────────────────────────
  const limitResult = checkRateLimit(clientIP);

  // Adiciona headers de rate limit na resposta (padrão de mercado)
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT.maxRequests);
  res.setHeader('X-RateLimit-Remaining', limitResult.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(limitResult.resetMs / 1000));

  if (!limitResult.allowed) {
    res.setHeader('Retry-After', Math.ceil(limitResult.resetMs / 1000));
    return res.status(429).json({
      error: 'Muitas requisições. Aguarde antes de tentar novamente.',
      code: 'TOO_MANY_REQUESTS',
      retryAfterSeconds: Math.ceil(limitResult.resetMs / 1000),
    });
  }

  // ── 4. Processar a requisição ao Asaas ────────────────────────────────────
  // O Vercel reescreve a rota, mas a URL original permanece acessível
  let endpoint = req.url.replace('/api/asaas', '');

  // Se o replace não pegou por algum motivo de roteamento, tentamos garantir
  if (endpoint.startsWith('/api/asaas-proxy')) {
    endpoint = endpoint.replace('/api/asaas-proxy', '');
  }

  if (!endpoint || endpoint === '/') {
    return res.status(400).json({ error: 'Endpoint não especificado' });
  }

  // Chave Asaas Sandbox. Na Vercel, o ideal é adicionar ASAAS_API_KEY nas Environment Variables
  const fallbackKey = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjMxYWVmYjI5LTAxNzUtNDU1MC1iMTMwLTIzODkyYzdkMDdlMjo6JGFhY2hfMTVlNzZhYjYtZWZhNi00OWYxLTk0ZDMtYTI0NTNkYjc5ZTEw';
  const apiKey = process.env.ASAAS_API_KEY || fallbackKey;

  const targetUrl = `https://sandbox.asaas.com/api/v3${endpoint}`;

  const options = {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    }
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    options.body = JSON.stringify(req.body);
  }

  try {
    const response = await fetch(targetUrl, options);

    // O Asaas pode retornar 204 No Content
    if (response.status === 204) {
      return res.status(204).end();
    }

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[asaas-proxy] Erro na Vercel Proxy:', error);
    res.status(500).json({ error: 'Erro interno no Proxy Asaas' });
  }
}
