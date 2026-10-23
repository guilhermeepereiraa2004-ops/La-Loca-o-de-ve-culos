import { request as httpsRequest } from 'node:https';

const DEFAULT_ORIGINS = Object.freeze(['https://ucfzkzpmvjekgotexriq.supabase.co', 'https://challenges.cloudflare.com']);
const MAX_BYTES = 2 * 1024 * 1024;
const RESPONSE_HEADERS = new Set(['content-type', 'content-range', 'range-unit', 'preference-applied', 'retry-after', 'www-authenticate', 'cache-control', 'etag', 'last-modified', 'location', 'x-supabase-api-version', 'x-supabase-request-id']);
const failure = code => Object.assign(new TypeError('Não foi possível concluir a comunicação segura com o serviço.'), { code });

function approvedUrl(input, origins) {
  const raw = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
  if (typeof raw !== 'string' || raw.length > 16384 || /[^\x21-\x7e]/.test(raw)) throw failure('UNSAFE_URL');
  const authority = raw.match(/^https:\/\/([^/?#]+)(?:[/?#]|$)/)?.[1];
  // Inspect the original authority too: URL normalizes an explicit :443 away.
  if (!authority || !/^[a-z0-9.-]+$/i.test(authority)) throw failure('UNSAFE_URL');
  let url;
  try { url = new URL(raw); } catch { throw failure('UNSAFE_URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || !origins.has(url.origin)) throw failure('UNSAFE_URL');
  return url;
}

async function requestBytes(request, signal, maximum) {
  if (!request.body) return undefined;
  const reader = request.body.getReader(), chunks = [];
  let size = 0, abort;
  const interrupted = new Promise((_, reject) => {
    abort = () => { reader.cancel().catch(() => {}); reject(failure('ABORTED')); };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), interrupted]);
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { reader.cancel().catch(() => {}); throw failure('REQUEST_TOO_LARGE'); }
      chunks.push(Buffer.from(value));
    }
    if (signal.aborted) throw failure('ABORTED');
    return Buffer.concat(chunks, size);
  } finally { signal.removeEventListener('abort', abort); reader.releaseLock(); }
}

// Temporary defense while the managed Node patch rolls out. node:https never
// decompresses response bodies; no compressed response enters a decoder here.
// This is server-only. Origins are fixed in the exported production instance.
export function createSafeFetch({ request = httpsRequest, allowedOrigins = DEFAULT_ORIGINS, timeoutMs = 10000, maxResponseBytes = MAX_BYTES } = {}) {
  const origins = new Set(allowedOrigins);
  const maximum = Math.max(1, Math.min(MAX_BYTES, maxResponseBytes));
  const deadline = Math.max(1, Math.min(15000, timeoutMs));
  return async function safeFetchRequest(input, init) {
    const url = approvedUrl(input, origins);
    const webRequest = new Request(input, init);
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), deadline);
    const signal = AbortSignal.any([webRequest.signal, timeout.signal]);
    try {
      if (signal.aborted) throw failure('ABORTED');
      const body = await requestBytes(webRequest, signal, maximum);
      if (signal.aborted) throw failure('ABORTED');
      const headers = Object.fromEntries(webRequest.headers);
      for (const name of ['host', 'connection', 'transfer-encoding', 'content-length', 'accept-encoding', 'proxy-authorization']) delete headers[name];
      headers['accept-encoding'] = 'identity';
      headers.connection = 'close';
      if (body) headers['content-length'] = String(body.byteLength);
      return await new Promise((resolve, reject) => {
        let outgoing, incoming, settled = false;
        const finish = (error, response) => {
          if (settled) return; settled = true;
          signal.removeEventListener('abort', abort);
          if (error) { incoming?.destroy(); outgoing?.destroy(); reject(error); }
          else resolve(response);
        };
        const abort = () => finish(failure('ABORTED'));
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) { abort(); return; }
        try {
          outgoing = request(url, { method: webRequest.method, headers, agent: false, maxHeaderSize: 16384 }, response => {
            incoming = response;
            // Never attach body readers or resume a compressed stream.
            const encoding = response.headers['content-encoding'];
            if (encoding !== undefined && (typeof encoding !== 'string' || encoding.trim().toLowerCase() !== 'identity')) { finish(failure('COMPRESSED_RESPONSE')); return; }
            const declared = response.headers['content-length'];
            if (declared !== undefined && (!/^\d+$/.test(String(declared)) || Number(declared) > maximum)) { finish(failure('RESPONSE_TOO_LARGE')); return; }
            const status = response.statusCode;
            if (!Number.isInteger(status) || status < 200 || status > 599) { finish(failure('INVALID_RESPONSE')); return; }
            const chunks = []; let length = 0;
            response.on('data', chunk => {
              if (settled) return;
              length += chunk.byteLength;
              if (length > maximum) { finish(failure('RESPONSE_TOO_LARGE')); return; }
              chunks.push(Buffer.from(chunk));
            });
            response.once('aborted', () => finish(failure('INCOMPLETE_RESPONSE')));
            response.once('error', () => finish(failure('NETWORK_ERROR')));
            response.once('end', () => {
              if (settled) return;
              if (!response.complete) { finish(failure('INCOMPLETE_RESPONSE')); return; }
              const safeHeaders = new Headers();
              for (const [name, value] of Object.entries(response.headers)) if (RESPONSE_HEADERS.has(name.toLowerCase()) && typeof value === 'string') safeHeaders.set(name, value);
              try { finish(null, new Response(webRequest.method === 'HEAD' || [204, 205, 304].includes(status) ? null : Buffer.concat(chunks, length), { status, headers: safeHeaders })); }
              catch { finish(failure('INVALID_RESPONSE')); }
            });
          });
          outgoing.once('error', () => finish(failure('NETWORK_ERROR')));
          outgoing.end(body);
        } catch { finish(failure('NETWORK_ERROR')); }
      });
    } finally { clearTimeout(timer); }
  };
}

export const safeFetch = createSafeFetch();
