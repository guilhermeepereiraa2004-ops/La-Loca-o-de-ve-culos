import { validateUploadBytes } from '../../supabase/functions/_shared/fileValidation.js';

export const OCR_LIMITS = Object.freeze({ bytes: 10 * 1024 * 1024, pages: 20, pixels: 8_000_000, characters: 250_000, milliseconds: 90_000 });
const invalid = () => new Error('Não foi possível ler o documento. Use PDF, JPEG, PNG ou WebP de até 10 MB e PDF com até 20 páginas.');

// Dependencies are injected for disposable integration fixtures; production
// loads the reviewed PDF/OCR runtimes only after a user selects a valid file.
export function createDocumentTextExtractor({ loadPdf, createWorker, createCanvas = () => document.createElement('canvas'), decodeImage = file => createImageBitmap(file), timeoutMs = OCR_LIMITS.milliseconds } = {}) {
  return async (file, { onStatus = () => {}, signal } = {}) => {
    if (!file || !Number.isFinite(file.size) || file.size <= 0 || file.size > OCR_LIMITS.bytes || signal?.aborted) throw invalid();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { contentType } = await validateUploadBytes(bytes, file.type, file.name);
    if (!['application/pdf','image/jpeg','image/png','image/webp'].includes(contentType)) throw invalid();
    let worker, loadingTask, pdf, canvas, bitmap, cancelled = false, timer, rejectCancelled;
    let workerCleaned = false, loadingDestroyed = false, bitmapClosed = false;
    const check = () => { if (cancelled || signal?.aborted) throw invalid(); };
    const clean = () => {
      if (bitmap && !bitmapClosed) { bitmapClosed = true; try { bitmap.close(); } catch { /* already closed */ } }
      if (canvas) { canvas.width = 0; canvas.height = 0; }
      if (worker && !workerCleaned) { workerCleaned = true; try { Promise.resolve(worker.terminate()).catch(() => {}); } catch { /* worker already stopped */ } }
      if (loadingTask && !loadingDestroyed) { loadingDestroyed = true; try { Promise.resolve(loadingTask.destroy()).catch(() => {}); } catch { /* task already stopped */ } }
    };
    const cancel = () => { cancelled = true; clean(); rejectCancelled?.(invalid()); };
    const limit = new Promise((_, reject) => { rejectCancelled = reject; timer = setTimeout(cancel, timeoutMs); });
    signal?.addEventListener('abort', cancel, { once: true });
    const recognize = async source => {
      check(); onStatus('Preparando leitura da imagem…');
      const created = await createWorker(onStatus);
      if (cancelled || signal?.aborted) { await created.terminate(); throw invalid(); }
      worker = created;
      const result = await worker.recognize(source);
      check(); return result?.data?.text || '';
    };
    try {
      return await Promise.race([(async () => {
        let text = '';
        if (contentType === 'application/pdf') {
          onStatus('Lendo arquivo PDF…');
          const runtime = await loadPdf(); check();
          loadingTask = runtime.getDocument({ data: bytes, isEvalSupported: false, stopAtErrors: true, maxImageSize: OCR_LIMITS.pixels, verbosity: 0 });
          pdf = await loadingTask.promise; check();
          if (!Number.isSafeInteger(pdf.numPages) || pdf.numPages < 1 || pdf.numPages > OCR_LIMITS.pages) throw invalid();
          for (let number = 1; number <= pdf.numPages; number++) {
            const page = await pdf.getPage(number); check();
            const content = await page.getTextContent(); check();
            text += content.items.map(item => typeof item.str === 'string' ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('') + '\n';
            page.cleanup?.();
            if (text.length > OCR_LIMITS.characters) throw invalid();
          }
          if (text.trim().length <= 20) {
            const page = await pdf.getPage(1); check();
            const original = page.getViewport({ scale: 1 });
            if (!(original.width > 0 && original.height > 0)) throw invalid();
            const scale = Math.min(2, Math.sqrt(OCR_LIMITS.pixels / (original.width * original.height)));
            const viewport = page.getViewport({ scale });
            canvas = createCanvas(); canvas.width = Math.max(1, Math.floor(viewport.width)); canvas.height = Math.max(1, Math.floor(viewport.height));
            const context = canvas.getContext('2d'); if (!context) throw invalid();
            await page.render({ canvasContext: context, viewport }).promise; check();
            text = await recognize(canvas);
          }
        } else {
          bitmap = await decodeImage(file);
          if (cancelled || signal?.aborted) { clean(); throw invalid(); }
          check();
          if (!(bitmap.width > 0 && bitmap.height > 0) || bitmap.width * bitmap.height > OCR_LIMITS.pixels) throw invalid();
          text = await recognize(file);
        }
        check();
        if (!text.trim() || text.length > OCR_LIMITS.characters) throw invalid();
        return text;
      })(), limit]);
    } catch { throw invalid(); }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); clean(); }
  };
}

export async function extractDocumentText(file, options) {
  const runtime = await import('./ocrRuntime.js');
  return createDocumentTextExtractor({ loadPdf: runtime.loadPdf, createWorker: runtime.createOcrWorker })(file, options);
}
