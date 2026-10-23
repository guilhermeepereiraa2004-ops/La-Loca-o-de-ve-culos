import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import ocrWorkerUrl from 'tesseract.js/dist/worker.min.js?url';
import ocrCoreUrl from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url';

export async function loadPdf() {
  const pdf = await import('pdfjs-dist');
  pdf.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  return pdf;
}

export async function createOcrWorker(onStatus) {
  const { createWorker } = await import('tesseract.js');
  return createWorker('por', 1, {
    workerPath: ocrWorkerUrl,
    workerBlobURL: false,
    corePath: ocrCoreUrl,
    langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/por/4.0.0_best_int',
    logger: message => onStatus(message.status === 'recognizing text'
      ? `Lendo documento: ${Math.round(message.progress * 100)}%`
      : 'Preparando a leitura do documento…'),
  });
}
