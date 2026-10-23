import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.endsWith('/lib/supabase.js')) return { shortCircuit: true, url: 'data:text/javascript,export const supabase = {};' };
    return next(specifier, context);
  },
});
const { getPublicUrl, openSafeUrl } = await import('../src/utils/storageSecurity.js');
test('links de documentos rejeitam execução, HTML inline e protocolos locais', () => {
  for (const url of ['javascript:alert(1)', ' JAVASCRIPT:alert(1)', 'vbscript:payload', 'file:///C:/private', '//evil.invalid', 'data:text/html,<script>payload</script>']) {
    assert.equal(getPublicUrl(url), null);
  }
});
test('abrir documento nunca concede window.opener e não abre URLs perigosas', () => {
  const calls = [];
  globalThis.window = { open: (...args) => calls.push(args) };
  openSafeUrl('javascript:alert(1)');
  assert.equal(calls.length, 0);
  openSafeUrl('https://example.invalid/document.pdf');
  assert.deepEqual(calls, [['https://example.invalid/document.pdf', '_blank', 'noopener,noreferrer']]);
  delete globalThis.window;
});
