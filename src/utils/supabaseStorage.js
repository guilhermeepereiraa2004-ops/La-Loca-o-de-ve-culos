import { supabase } from '../lib/supabase';

/**
 * Faz upload de um arquivo para o Supabase Storage e retorna a URL pública
 * @param {File} file O arquivo a ser enviado
 * @param {string} folder Pasta dentro do bucket (ex: 'veiculos' ou 'vistorias')
 * @returns {Promise<string>} A URL pública do arquivo
 */
export const uploadFile = async (file, folder) => {
  if (!file) return null;

  try {
    // Gerar um nome único para o arquivo
    const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

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
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
  
  const { data: { publicUrl } } = supabase.storage
    .from('La-locacao')
    .getPublicUrl(path);
    
  return publicUrl;
};

