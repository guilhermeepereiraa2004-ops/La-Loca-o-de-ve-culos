import { supabase } from '../lib/supabase';
import * as rateLimiter from '../lib/rateLimiter';

const UPLOAD_ACTION = 'upload_file';

const sanitizePathSegment = (segment) => {
  if (!segment) return '';
  return segment
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9-_]/g, "_"); // Substitui qualquer caracter não permitido por _
};

/**
 * Sanitiza um caminho de pastas completo, tratando cada segmento individualmente.
 *
 * @param {string} folderPath Caminho completo (ex: 'condutores/Sérgio Murilo/prints')
 * @returns {string} Caminho sanitizado
 */
const sanitizeFolder = (folderPath) => {
  if (!folderPath) return '';
  return folderPath
    .split('/')
    .map(sanitizePathSegment)
    .join('/');
};

/**
 * Faz upload de um arquivo para o Supabase Storage e retorna a URL pública.
 * Inclui proteção de rate limit para evitar flood de uploads.
 *
 * @param {File} file O arquivo a ser enviado
 * @param {string} folder Pasta dentro do bucket (ex: 'veiculos' ou 'vistorias')
 * @returns {Promise<string>} A URL pública do arquivo
 * @throws {Error} Se o rate limit for excedido ou o upload falhar
 */
export const uploadFile = async (file, folder) => {
  if (!file) return null;

  // ── Rate Limit: verificar antes de iniciar o upload ─────────────────────────
  const limitCheck = rateLimiter.check(UPLOAD_ACTION);
  if (!limitCheck.allowed) {
    throw new Error(
      `Upload bloqueado temporariamente. ${limitCheck.reason || 'Aguarde antes de tentar novamente.'}`
    );
  }

  try {
    // Registra a tentativa de upload
    rateLimiter.record(UPLOAD_ACTION);

    // Sanitiza o caminho da pasta
    const sanitizedFolder = sanitizeFolder(folder);

    // Gerar um nome único para o arquivo
    const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${sanitizedFolder}/${fileName}`;

    // 1. Fazer o upload
    const { error } = await supabase.storage
      .from('La-locacao')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // 2. Pegar a URL Pública
    const { data: { publicUrl } } = supabase.storage
      .from('La-locacao')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Erro no upload para o Storage:', error.message);
    throw error;
  }
};


/**
 * Retorna a URL pública de um caminho no Storage ou a própria string se já for uma URL
 * @param {string} path Caminho do arquivo ou URL
 * @returns {string} URL pública
 */
export const getPublicUrl = (path) => {
  if (!path || path === '') return null;

  // Handle object format (like {preview: 'url'})
  if (typeof path === 'object') {
    if (path.preview) return path.preview;
    if (path.url) return path.url;
    return null;
  }

  if (typeof path !== 'string') return null;
  if (path === '[object Object]') return null;
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('/')) return path;

  const { data: { publicUrl } } = supabase.storage
    .from('La-locacao')
    .getPublicUrl(path);

  return publicUrl;
};
