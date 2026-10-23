import test from 'node:test';
import assert from 'node:assert/strict';
import { compressImage } from '../src/utils/imageCompression.js';

function environment({ mode = 'success' } = {}) {
  const originals = { Image: globalThis.Image, document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  const revoked = [], dimensions = [];
  globalThis.Image = class {
    naturalWidth = 4000; naturalHeight = 2000;
    set src(value) { if (value) queueMicrotask(() => mode === 'decode-error' ? this.onerror?.() : this.onload?.()); }
  };
  globalThis.document = { createElement() {
    const canvas = { width: 0, height: 0,
      getContext: () => mode === 'missing-context' ? null : { drawImage() { dimensions.push([canvas.width, canvas.height]); } },
      toBlob(callback, type) { callback(mode === 'empty-blob' ? null : new Blob(['encoded JPEG fixture'], { type })); },
    };
    return canvas;
  } };
  URL.createObjectURL = () => 'blob:disposable-fixture'; URL.revokeObjectURL = value => revoked.push(value);
  return { revoked, dimensions, restore() { globalThis.Image = originals.Image; globalThis.document = originals.document; URL.createObjectURL = originals.create; URL.revokeObjectURL = originals.revoke; } };
}

test('compression bounds dimensions and consistently names/labels JPEG output, freeing object URL', async () => {
  const f = environment();
  try {
    const result = await compressImage(new File(['fixture'], 'photo.png', { type: 'image/png' }), { maxWidth: 2500, quality: 0.8 });
    assert.deepEqual(f.dimensions, [[1024, 512]]); assert.equal(result.type, 'image/jpeg'); assert.equal(result.name, 'photo.jpg');
    assert.deepEqual(f.revoked, ['blob:disposable-fixture']);
  } finally { f.restore(); }
});

test('decode failure, unavailable canvas and empty encoding reject without hanging or leaking URLs', async () => {
  for (const mode of ['decode-error','missing-context','empty-blob']) {
    const f = environment({ mode });
    try { await assert.rejects(compressImage(new File(['fixture'], 'photo.png', { type: 'image/png' }))); assert.equal(f.revoked.length, 1); }
    finally { f.restore(); }
  }
});

test('HTML/SVG and oversized uploads never start an image decoder', async () => {
  const f = environment();
  try {
    await assert.rejects(compressImage(new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' })));
    await assert.rejects(compressImage({ size: 51 * 1024 * 1024, type: 'image/jpeg' }));
    assert.deepEqual(f.revoked, []);
  } finally { f.restore(); }
});
