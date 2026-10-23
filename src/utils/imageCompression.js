import { MAX_UPLOAD_BYTES } from '../../supabase/functions/_shared/fileValidation.js';

// Re-encode supported camera images to JPEG. Server-side upload validation is
// still mandatory; this function only bounds browser work and frees resources.
export function compressImage(file, options = {}) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_UPLOAD_BYTES || !/^image\/(?:jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.type || '')) return Promise.reject(new Error('Selecione uma imagem válida de até 50 MB.'));
  const maxWidth = Math.max(1, Math.min(1024, Number(options.maxWidth) || 1024));
  const quality = Math.max(0.1, Math.min(0.95, Number.isFinite(options.quality) ? options.quality : 0.55));
  return new Promise((resolve, reject) => {
    let image, objectUrl, canvas, timer, settled = false;
    const finish = (error, result) => {
      if (settled) return; settled = true; clearTimeout(timer);
      if (image) { image.onload = null; image.onerror = null; image.src = ''; }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (canvas) { canvas.width = 0; canvas.height = 0; }
      error ? reject(new Error('Não foi possível preparar a imagem. Tente outra foto ou um arquivo menor.')) : resolve(result);
    };
    try {
      image = new Image(); objectUrl = URL.createObjectURL(file);
      timer = setTimeout(() => finish(true), 15000);
      image.onload = () => {
        try {
          const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
          if (!(width > 0 && height > 0) || width * height > 64_000_000) return finish(true);
          const scale = Math.min(1, maxWidth / Math.max(width, height));
          canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
          const context = canvas.getContext('2d'); if (!context) return finish(true);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => {
            if (!blob) return finish(true);
            finish(null, new File([blob], (file.name || 'photo').replace(/\.[^.]*$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', quality);
        } catch { finish(true); }
      };
      image.onerror = () => finish(true);
      image.src = objectUrl;
    } catch { finish(true); }
  });
}
