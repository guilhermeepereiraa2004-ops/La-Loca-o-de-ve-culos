import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentTextExtractor, OCR_LIMITS } from '../src/utils/documentOcr.js';

const png = Uint8Array.from([137,80,78,71,13,10,26,10]);
const pdfBytes = new TextEncoder().encode('%PDF-1.4\nfixture\n%%EOF');
const file = (bytes = pdfBytes, type = 'application/pdf', name = 'fixture.pdf') => ({ size: bytes.length, type, name, arrayBuffer: async () => bytes.buffer });
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function fixture({ scanned = false, pages = 1, fail = false, huge = false, workerDelay = 0 } = {}) {
  const calls = [];
  const canvas = { width: 0, height: 0, getContext: () => ({}) };
  const page = {
    getTextContent: async () => ({ items: [{ str: scanned ? '' : 'TESTE DOCUMENTO PRIVADO LOCAL 12345', hasEOL: true }] }),
    getViewport: ({ scale }) => ({ width: 10000 * scale, height: 20000 * scale }), cleanup() { calls.push('page-cleanup'); },
    render() { calls.push(['render', canvas.width * canvas.height]); return { promise: Promise.resolve() }; },
  };
  const extractor = createDocumentTextExtractor({
    loadPdf: async () => ({ getDocument(options) {
      assert.equal(options.isEvalSupported, false); assert.equal(options.stopAtErrors, true);
      return { promise: Promise.resolve({ numPages: pages, getPage: async () => page }), destroy: async () => calls.push('pdf-destroy') };
    } }),
    createWorker: async () => {
      calls.push('create-worker'); if (workerDelay) await wait(workerDelay);
      return { recognize: async () => { calls.push('recognize'); if (fail) throw new Error('private document content must not escape'); return { data: { text: 'TESTE OCR LOCAL 12345' } }; }, terminate: async () => calls.push('terminate') };
    },
    createCanvas: () => canvas,
    decodeImage: async () => ({ width: huge ? OCR_LIMITS.pixels + 1 : 100, height: 1, close: () => calls.push('bitmap-close') }),
  });
  return { extractor, calls, canvas };
}

test('native PDF text is extracted without OCR or exposed runtime details and PDF resources close', async () => {
  const f = fixture(); const text = await f.extractor(file());
  assert.match(text, /TESTE DOCUMENTO/);
  assert.equal(f.calls.includes('create-worker'), false); assert.ok(f.calls.includes('pdf-destroy'));
});

test('scanned PDF rendering is bounded and worker/canvas are released after OCR', async () => {
  const f = fixture({ scanned: true }); assert.match(await f.extractor(file()), /TESTE OCR/);
  assert.ok(f.calls.find(call => Array.isArray(call) && call[0] === 'render')[1] <= OCR_LIMITS.pixels);
  assert.equal(f.calls.filter(call => call === 'terminate').length, 1);
  assert.equal(f.canvas.width, 0); assert.equal(f.canvas.height, 0);
});

test('OCR rejects disguised HTML/SVG, oversized files, excessive PDF pages and huge images', async () => {
  const f = fixture();
  await assert.rejects(f.extractor(file(new TextEncoder().encode('<svg onload="alert(1)"/>'), 'image/png', 'image.png')));
  await assert.rejects(f.extractor({ ...file(), size: OCR_LIMITS.bytes + 1 }));
  const many = fixture({ pages: OCR_LIMITS.pages + 1 }); await assert.rejects(many.extractor(file()));
  assert.equal(many.calls.includes('create-worker'), false); assert.ok(many.calls.includes('pdf-destroy'));
  const huge = fixture({ huge: true }); await assert.rejects(huge.extractor(file(png, 'image/png', 'image.png')));
  assert.equal(huge.calls.includes('recognize'), false); assert.ok(huge.calls.includes('bitmap-close'));
});

test('recognition failure returns no invented data and always terminates the worker', async () => {
  const f = fixture({ fail: true });
  await assert.rejects(f.extractor(file(png, 'image/png', 'image.png')), error => !error.message.includes('private document content'));
  assert.equal(f.calls.filter(call => call === 'terminate').length, 1); assert.ok(f.calls.includes('bitmap-close'));
});

test('timeout and abort stop work; a worker initialized after cancellation is also terminated', async () => {
  let stopped = 0;
  const extractor = createDocumentTextExtractor({ timeoutMs: 5, decodeImage: async () => ({ width: 10, height: 10, close() {} }), createWorker: async () => { await wait(20); return { recognize: async () => { throw new Error('must not run'); }, terminate: async () => { stopped++; } }; } });
  await assert.rejects(extractor(file(png, 'image/png', 'image.png'))); await wait(25); assert.equal(stopped, 1);
  const abort = new AbortController(); abort.abort();
  await assert.rejects(extractor(file(png, 'image/png', 'image.png'), { signal: abort.signal }));
});
