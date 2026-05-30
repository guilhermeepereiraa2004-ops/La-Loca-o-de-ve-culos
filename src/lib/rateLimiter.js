/**
 * rateLimiter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor central de Rate Limiting para o frontend (SPA).
 *
 * ESTRATÉGIA:
 *  - Armazena contadores no sessionStorage (limpos ao fechar o navegador)
 *  - Armazena bloqueios temporários no localStorage (resistem ao reload)
 *  - Não requer Redis, servidor ou dependências externas
 *  - Funciona em múltiplas abas (compartilha localStorage)
 *
 * IMPORTANTE: Este rate limiter é uma CAMADA DE DEFESA FRONTEND.
 * A proteção primária deve existir no backend (já configurada no Supabase).
 * A proteção no frontend evita flood acidental e melhora a UX com feedback.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── CONFIGURAÇÕES POR TIPO DE AÇÃO ──────────────────────────────────────────
// Cada entrada define:
//   maxAttempts  : Número máximo de tentativas permitidas na janela
//   windowMs     : Duração da janela de tempo em milissegundos
//   blockDurationMs : Duração do bloqueio após exceder o limite
//   friendlyName : Nome legível para mensagens de erro

const RATE_LIMIT_CONFIG = {
  // Login do Administrador (protege contra brute force na senha master)
  admin_login: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000,      // Janela de 5 minutos
    blockDurationMs: 15 * 60 * 1000, // Bloqueio de 15 minutos
    friendlyName: 'login de administrador',
  },

  // Login do Investidor (protege contra enumeração de contas)
  investor_login: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000,      // Janela de 5 minutos
    blockDurationMs: 15 * 60 * 1000, // Bloqueio de 15 minutos
    friendlyName: 'login de investidor',
  },

  // Formulário de interesse público (protege contra spam de leads)
  interest_form: {
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000,     // Janela de 10 minutos
    blockDurationMs: 30 * 60 * 1000, // Bloqueio de 30 minutos
    friendlyName: 'envio de formulário',
  },

  // Upload de arquivos (protege contra flood de uploads)
  upload_file: {
    maxAttempts: 50,
    windowMs: 5 * 60 * 1000,      // Janela de 5 minutos
    blockDurationMs: 5 * 60 * 1000,  // Bloqueio de 5 minutos
    friendlyName: 'upload de arquivo',
  },

  // Requisições genéricas à API (detecta flood automatizado)
  api_request: {
    maxAttempts: 60,
    windowMs: 60 * 1000,          // Janela de 1 minuto
    blockDurationMs: 2 * 60 * 1000,  // Bloqueio de 2 minutos
    friendlyName: 'requisição à API',
  },
};

// ─── CHAVES DE ARMAZENAMENTO ──────────────────────────────────────────────────
const STORAGE_PREFIX = 'la_rl_'; // Prefixo para identificar entradas no storage

/**
 * Gera a chave de armazenamento para um tipo de ação.
 * @param {string} actionType - Tipo da ação (ex: 'admin_login')
 * @returns {string}
 */
function getKey(actionType) {
  return `${STORAGE_PREFIX}${actionType}`;
}

/**
 * Gera a chave de bloqueio para um tipo de ação.
 * @param {string} actionType
 * @returns {string}
 */
function getBlockKey(actionType) {
  return `${STORAGE_PREFIX}block_${actionType}`;
}

// ─── LEITURA E ESCRITA SAFE NO STORAGE ───────────────────────────────────────

/**
 * Lê um objeto do localStorage de forma segura.
 * @param {string} key
 * @returns {object|null}
 */
function safeRead(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Escreve um objeto no localStorage de forma segura.
 * @param {string} key
 * @param {object} value
 */
function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Falha silenciosa se localStorage não estiver disponível
  }
}

/**
 * Remove uma entrada do localStorage de forma segura.
 * @param {string} key
 */
function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Falha silenciosa
  }
}

// ─── API PÚBLICA ──────────────────────────────────────────────────────────────

/**
 * Verifica se uma ação pode ser executada (não está bloqueada nem excedeu o limite).
 *
 * @param {string} actionType - Tipo da ação (deve estar em RATE_LIMIT_CONFIG)
 * @returns {{ allowed: boolean, reason: string|null, retryAfterMs: number|null, retryAfterSeconds: number|null }}
 */
export function check(actionType) {
  const config = RATE_LIMIT_CONFIG[actionType];

  if (!config) {
    // Tipo de ação não configurado: permite por padrão (fail-open)
    console.warn(`[RateLimiter] Tipo de ação desconhecido: "${actionType}". Permitindo por padrão.`);
    return { allowed: true, reason: null, retryAfterMs: null, retryAfterSeconds: null };
  }

  const now = Date.now();
  const blockKey = getBlockKey(actionType);

  // ── 1. Verificar se está bloqueado ──────────────────────────────────────────
  const blockData = safeRead(blockKey);
  if (blockData && blockData.unblockAt > now) {
    const retryAfterMs = blockData.unblockAt - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    const minutes = Math.floor(retryAfterSeconds / 60);
    const seconds = retryAfterSeconds % 60;
    const timeStr = minutes > 0
      ? `${minutes}m ${seconds}s`
      : `${seconds}s`;

    return {
      allowed: false,
      reason: `Muitas tentativas de ${config.friendlyName}. Aguarde ${timeStr} para tentar novamente.`,
      retryAfterMs,
      retryAfterSeconds,
    };
  }

  // Se o bloqueio expirou, limpa o registro
  if (blockData && blockData.unblockAt <= now) {
    safeRemove(blockKey);
    safeRemove(getKey(actionType));
  }

  // ── 2. Verificar o contador de tentativas na janela ──────────────────────────
  const counterKey = getKey(actionType);
  const counterData = safeRead(counterKey) || { attempts: 0, windowStart: now };

  // Se a janela de tempo expirou, reinicia o contador
  if (now - counterData.windowStart > config.windowMs) {
    safeRemove(counterKey);
    return { allowed: true, reason: null, retryAfterMs: null, retryAfterSeconds: null };
  }

  // Dentro da janela e abaixo do limite
  if (counterData.attempts < config.maxAttempts) {
    return { allowed: true, reason: null, retryAfterMs: null, retryAfterSeconds: null };
  }

  // Limite excedido: aplica bloqueio
  const unblockAt = now + config.blockDurationMs;
  safeWrite(blockKey, { unblockAt });
  safeRemove(counterKey);

  const retryAfterMs = config.blockDurationMs;
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
  const minutes = Math.floor(retryAfterSeconds / 60);

  // Log de segurança no console
  console.warn(
    `[RateLimiter] 🚫 Bloqueio aplicado para "${actionType}". ` +
    `Muitas tentativas (${config.maxAttempts}/${config.windowMs / 1000}s). ` +
    `Desbloqueio em ${minutes} minutos.`
  );

  return {
    allowed: false,
    reason: `Muitas tentativas de ${config.friendlyName}. Aguarde ${minutes} minuto${minutes !== 1 ? 's' : ''} para tentar novamente.`,
    retryAfterMs,
    retryAfterSeconds,
  };
}

/**
 * Registra uma tentativa (bem-sucedida ou falha) para um tipo de ação.
 * Deve ser chamado APÓS check() retornar { allowed: true }.
 *
 * @param {string} actionType - Tipo da ação
 */
export function record(actionType) {
  const config = RATE_LIMIT_CONFIG[actionType];
  if (!config) return;

  const now = Date.now();
  const counterKey = getKey(actionType);
  const counterData = safeRead(counterKey) || { attempts: 0, windowStart: now };

  // Se a janela expirou, reinicia
  if (now - counterData.windowStart > config.windowMs) {
    safeWrite(counterKey, { attempts: 1, windowStart: now });
    return;
  }

  safeWrite(counterKey, {
    attempts: counterData.attempts + 1,
    windowStart: counterData.windowStart,
  });
}

/**
 * Reseta completamente o contador e o bloqueio para um tipo de ação.
 * Usar após um login bem-sucedido, por exemplo.
 *
 * @param {string} actionType
 */
export function reset(actionType) {
  safeRemove(getKey(actionType));
  safeRemove(getBlockKey(actionType));
}

/**
 * Retorna informações de diagnóstico sobre o estado atual de um tipo de ação.
 * Útil para debug e monitoramento.
 *
 * @param {string} actionType
 * @returns {object}
 */
export function getStatus(actionType) {
  const config = RATE_LIMIT_CONFIG[actionType];
  if (!config) return { configured: false };

  const now = Date.now();
  const blockData = safeRead(getBlockKey(actionType));
  const counterData = safeRead(getKey(actionType));

  return {
    configured: true,
    actionType,
    isBlocked: blockData && blockData.unblockAt > now,
    unblockAt: blockData?.unblockAt || null,
    currentAttempts: counterData?.attempts || 0,
    maxAttempts: config.maxAttempts,
    windowMs: config.windowMs,
    blockDurationMs: config.blockDurationMs,
  };
}

/**
 * Limpa TODOS os dados de rate limiting armazenados.
 * Usar apenas para fins de teste ou suporte técnico.
 */
export function clearAll() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
    console.info(`[RateLimiter] Todos os dados limpos (${keys.length} entradas removidas).`);
  } catch {
    // Falha silenciosa
  }
}

// Exporta config para referência externa (readonly)
export const config = RATE_LIMIT_CONFIG;
