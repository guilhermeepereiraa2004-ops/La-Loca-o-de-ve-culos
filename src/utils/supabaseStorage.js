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
    const { data, error } = await supabase.storage
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
