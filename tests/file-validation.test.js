import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { webcrypto } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { Document, Packer, Paragraph } from 'docx';
import { MAX_UPLOAD_BYTES, validateUploadBytes } from '../supabase/functions/_shared/fileValidation.js';
import { requireVerifiedMfa } from '../supabase/functions/_shared/requireMfa.js';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6K6kAAAAASUVORK5CYII=', 'base64'));
const JPEG = Uint8Array.from(Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAgP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCkAAB//9k=', 'base64'));
const PDF = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Build stored/deflated ZIP fixtures in memory, including data descriptors.
function zip(entries, { centralOnly = false, compressed = false, descriptor = false } = {}) {
  const locals = [], centrals = []; let localOffset = 0;
  for (const [name, text] of Object.entries(entries)) {
    const filename = Buffer.from(name), data = Buffer.from(text);
    const payload = compressed ? deflateRawSync(data) : data;
    const local = Buffer.alloc(30 + filename.length + payload.length + (descriptor ? 16 : 0));
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4);
    local.writeUInt16LE(descriptor ? 8 : 0, 6); local.writeUInt16LE(compressed ? 8 : 0, 8);
    if (!descriptor) { local.writeUInt32LE(crc32(data), 14); local.writeUInt32LE(payload.length, 18); local.writeUInt32LE(data.length, 22); }
    local.writeUInt16LE(filename.length, 26); filename.copy(local, 30); payload.copy(local, 30 + filename.length);
    if (descriptor) {
      const position = 30 + filename.length + payload.length;
      local.writeUInt32LE(0x08074b50, position); local.writeUInt32LE(crc32(data), position + 4);
      local.writeUInt32LE(payload.length, position + 8); local.writeUInt32LE(data.length, position + 12);
    }
    const central = Buffer.alloc(46 + filename.length);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(descriptor ? 8 : 0, 8); central.writeUInt16LE(compressed ? 8 : 0, 10);
    central.writeUInt32LE(crc32(data), 16); central.writeUInt32LE(payload.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(localOffset, 42); filename.copy(central, 46);
    locals.push(local); centrals.push(central); localOffset += local.length;
  }
  const directory = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(centrals.length, 8); end.writeUInt16LE(centrals.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(centralOnly ? 0 : localOffset, 16);
  return Uint8Array.from(Buffer.concat([...(centralOnly ? [] : locals), directory, end]));
}

const docxEntries = {
  '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  '_rels/.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/document.xml': '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Test document</w:t></w:r></w:p></w:body></w:document>',
};

test('aceita JPEG, PNG e PDF válidos com MIME correto', async () => {
  assert.deepEqual(await validateUploadBytes(JPEG, 'image/jpeg', 'foto.jpg'), { contentType: 'image/jpeg', extension: 'jpg' });
  assert.deepEqual(await validateUploadBytes(PNG, 'image/png', 'foto.png'), { contentType: 'image/png', extension: 'png' });
  assert.deepEqual(await validateUploadBytes(PDF, 'application/pdf', 'contrato.pdf'), { contentType: 'application/pdf', extension: 'pdf' });
});

test('normaliza MIME declarado com capitalização e parâmetros', async () => {
  assert.equal((await validateUploadBytes(PNG, ' IMAGE/PNG ; charset=binary', 'foto.png')).contentType, 'image/png');
});

test('rejeita arquivo vazio, maior que 50 MB e MIME ausente', async () => {
  await assert.rejects(() => validateUploadBytes(new Uint8Array(), 'image/png', 'vazio.png'));
  const oversized = new Uint8Array(MAX_UPLOAD_BYTES + 1); oversized.set(PNG);
  await assert.rejects(() => validateUploadBytes(oversized, 'image/png', 'enorme.png'));
  await assert.rejects(() => validateUploadBytes(PNG, '', 'foto.png'));
});

test('rejeita HTML e SVG disfarçados com MIME/extensão de imagem ou PDF', async () => {
  for (const text of ['<!doctype html><script>alert(1)</script>', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>']) {
    for (const [type, name] of [['image/jpeg', 'foto.jpg'], ['image/png', 'foto.png'], ['application/pdf', 'contrato.pdf']]) {
      await assert.rejects(() => validateUploadBytes(new TextEncoder().encode(text), type, name));
    }
  }
});

test('rejeita conteúdo e MIME incompatíveis e extensões executáveis', async () => {
  await assert.rejects(() => validateUploadBytes(PNG, 'image/jpeg', 'foto.jpg'));
  await assert.rejects(() => validateUploadBytes(PDF, 'image/png', 'foto.png'));
  for (const extension of ['html', 'htm', 'svg', 'xml', 'js', 'mjs', 'php', 'exe', 'docm']) {
    await assert.rejects(() => validateUploadBytes(PNG, 'image/png', 'foto.' + extension));
  }
});

test('aceita DOCX estrutural sem macro e rejeita ZIP sem estrutura Word', async () => {
  assert.equal((await validateUploadBytes(zip(docxEntries), DOCX, 'contrato.docx')).extension, 'docx');
  await assert.rejects(() => validateUploadBytes(zip({ 'hello.txt': 'hello', 'other.txt': 'other' }), DOCX, 'contrato.docx'));
  await assert.rejects(() => validateUploadBytes(Uint8Array.from([0x50, 0x4b, 0, 0]), DOCX, 'quebrado.docx'));
});

test('rejeita DOCX com macro canônica, traversal ou script incorporado', async () => {
  for (const name of ['word/vbaProject.bin', '../evil.xml', '/evil.xml', 'word/evil.js', 'word/evil.html']) {
    await assert.rejects(() => validateUploadBytes(zip({ ...docxEntries, [name]: 'payload' }), DOCX, 'contrato.docx'));
  }
});

test('regressão: rejeita DOCX forjado sem headers locais nem conteúdo das entradas', async () => {
  await assert.rejects(() => validateUploadBytes(zip(docxEntries, { centralOnly: true }), DOCX, 'falso.docx'));
});

test('regressão: rejeita macro declarada nos tipos/relationships com parte de nome alternativo', async () => {
  const macro = {
    ...docxEntries,
    '[Content_Types].xml': docxEntries['[Content_Types].xml'].replace('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml', 'application/vnd.ms-word.document.macroEnabled.main+xml').replace('</Types>', '<Override PartName="/word/payload.bin" ContentType="application/vnd.ms-office.vbaProject"/></Types>'),
    'word/_rels/document.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdMacro" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="payload.bin"/></Relationships>',
    'word/payload.bin': 'macro-payload',
  };
  await assert.rejects(() => validateUploadBytes(zip(macro), DOCX, 'macro.docx'));
});

test('aceita DOCX deflate, data descriptor e documento real gerado por docx', async () => {
  for (const options of [{ compressed: true }, { compressed: true, descriptor: true }]) {
    assert.equal((await validateUploadBytes(zip(docxEntries, options), DOCX, 'contrato.docx')).extension, 'docx');
  }
  const actual = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph('Contrato de locação para teste local.')] }] }));
  assert.equal((await validateUploadBytes(actual, DOCX, 'contrato.docx')).extension, 'docx');
});

test('rejeita ZIP com CRC adulterado, cabeçalho divergente ou diretório truncado', async () => {
  const corruptData = zip(docxEntries); corruptData[50] ^= 1;
  const corruptLocal = zip(docxEntries); corruptLocal[30] ^= 1;
  const truncated = zip(docxEntries).subarray(0, 60);
  for (const bytes of [corruptData, corruptLocal, truncated]) {
    await assert.rejects(() => validateUploadBytes(bytes, DOCX, 'contrato.docx'));
  }
});

test('rejeita macro com relação compactada e entidade numérica, DTD e XML excessivo', async () => {
  const encodedMacro = { ...docxEntries,
    'word/_rels/document.xml.rels': '<Relationships><Relationship Type="http://schemas.microsoft.com/office/2006/relationships/vbaPro&#x6a;ect" Target="payload.xml"/></Relationships>',
    'word/payload.xml': '<payload/>',
  };
  const entityXml = { ...docxEntries, 'word/document.xml': '<!DOCTYPE x [<!ENTITY x "boom">]><document>&x;</document>' };
  const hugeXml = { ...docxEntries, 'word/document.xml': 'a'.repeat(4 * 1024 * 1024 + 1) };
  for (const entries of [encodedMacro, entityXml, hugeXml]) {
    await assert.rejects(() => validateUploadBytes(zip(entries, { compressed: true }), DOCX, 'contrato.docx'));
  }
});

function edgeHarness(overrides = {}) {
  const writes = [], rateCalls = [], profileCalls = [], authCalls = [];
  const state = {
    user: { id: 'user-123' }, profile: { role: 'funcionario', modules: ['frota'] },
    authError: null, claimsError: null, claims: { sub: 'user-123', aal: 'aal1' }, profileError: null, rateError: null, allowed: true,
    ...overrides,
  };
  const client = {
    auth: {
      getUser: async token => { authCalls.push(['getUser', token]); return { data: { user: state.user }, error: state.authError }; },
      getClaims: async token => { authCalls.push(['getClaims', token]); return { data: { claims: state.claims }, error: state.claimsError }; },
    },
    from: name => { profileCalls.push(name); return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.profile, error: state.profileError }) }) }) }; },
    rpc: async (_name, args) => { rateCalls.push(args); return { data: state.allowed, error: state.rateError }; },
    storage: { from: bucket => ({ upload: async (path, bytes, options) => { writes.push({ bucket, path, bytes, options }); return { error: null }; } }) },
  };
  let handler;
  const source = fs.readFileSync(new URL('../supabase/functions/secure-upload/index.ts', import.meta.url), 'utf8').replace(/^import[^;]+;\s*/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    Deno: { serve(callback) { handler = callback; }, env: { get(name) { return name === 'SUPABASE_URL' ? 'https://test-project.invalid' : 'server-test-key'; } } },
    createClient: () => client, MAX_UPLOAD_BYTES, validateUploadBytes, requireVerifiedMfa,
    Request, Response, Headers, Uint8Array, Error, crypto: webcrypto,
  });
  const request = (headers = {}, body = PNG, method = 'POST') => handler(new Request('https://test-project.invalid/secure-upload', {
    method,
    headers: { authorization: 'Bearer test-access-token', 'content-type': 'image/png', 'x-upload-folder': 'veiculos', 'x-upload-name': 'foto.png', ...headers },
    ...(body === null || ['GET', 'HEAD', 'OPTIONS'].includes(method) ? {} : { body }),
  }));
  return { request, writes, rateCalls, profileCalls, authCalls };
}

test('Edge: MFA confirmado exige AAL2 assinado antes de perfil, contador e armazenamento', async () => {
  const verifiedUser = { id: 'user-123', factors: [{ id: 'factor-test', status: 'verified' }] };
  for (const [overrides, expectedStatus] of [
    [{ user: verifiedUser }, 403],
    [{ user: verifiedUser, claims: { sub: 'another-user', aal: 'aal2' } }, 401],
    [{ user: verifiedUser, claimsError: new Error('invalid signature') }, 401],
    [{ user: { id: 'user-123', is_anonymous: true } }, 401],
  ]) {
    const harness = edgeHarness(overrides);
    const response = await harness.request({ 'x-mfa-aal': 'aal2' });
    assert.equal(response.status, expectedStatus);
    assert.equal(harness.profileCalls.length, 0);
    assert.equal(harness.rateCalls.length, 0);
    assert.equal(harness.writes.length, 0);
  }
  for (const overrides of [
    { user: verifiedUser, claims: { sub: 'user-123', aal: 'aal2' } },
    { user: { id: 'user-123', factors: [{ status: 'unverified' }] } },
  ]) {
    const harness = edgeHarness(overrides);
    assert.equal((await harness.request()).status, 201);
    assert.equal(harness.writes.length, 1);
    assert.deepEqual(harness.authCalls, [['getUser', 'test-access-token'], ['getClaims', 'test-access-token']]);
  }
});

test('Edge: nega visitante, sessão inválida e usuário sem módulo', async () => {
  for (const [overrides, headers, status] of [
    [{}, { authorization: '' }, 401],
    [{ user: null }, {}, 401],
    [{ profile: null }, {}, 403],
    [{ profile: { role: 'funcionario', modules: ['clientes'] } }, {}, 403],
  ]) {
    const harness = edgeHarness(overrides);
    assert.equal((await harness.request(headers)).status, status);
    assert.equal(harness.writes.length, 0);
  }
});

test('Edge: nega origem/pasta inválida, upload vazio e tipo trocado sem gravar', async () => {
  for (const [headers, body, status] of [
    [{ origin: 'https://attacker.invalid' }, PNG, 403],
    [{ 'x-upload-folder': '../contratos' }, PNG, 400],
    [{ 'x-upload-folder': 'desconhecida' }, PNG, 403],
    [{}, null, 400],
    [{ 'content-type': 'application/pdf' }, PNG, 400],
    [{ 'content-length': String(MAX_UPLOAD_BYTES + 1) }, PNG, 413],
  ]) {
    const harness = edgeHarness();
    assert.equal((await harness.request(headers, body)).status, status);
    assert.equal(harness.writes.length, 0);
  }
});

test('Edge: rate limit e falha do contador fecham o upload', async () => {
  for (const [state, status] of [[{ allowed: false }, 429], [{ rateError: new Error('counter unavailable') }, 503]]) {
    const harness = edgeHarness(state);
    assert.equal((await harness.request()).status, status);
    assert.equal(harness.writes.length, 0);
  }
});

test('Edge: upload privado/público usa bucket fixo e nome aleatório sem upsert', async () => {
  for (const [isPublic, bucket] of [[false, 'La-locacao'], [true, 'vehicle-public-images']]) {
    const harness = edgeHarness();
    const response = await harness.request({ 'x-upload-public': String(isPublic) });
    assert.equal(response.status, 201);
    const data = await response.json();
    assert.equal(data.bucket, bucket);
    assert.match(data.path, /^veiculos\/[a-f0-9-]{36}\.png$/);
    assert.equal(harness.writes[0].options.contentType, 'image/png');
    assert.equal(harness.writes[0].options.upsert, false);
  }
});

test('Edge: PDF nunca é gravado como imagem pública', async () => {
  const harness = edgeHarness();
  assert.equal((await harness.request({ 'x-upload-public': 'true', 'content-type': 'application/pdf', 'x-upload-name': 'contrato.pdf' }, PDF)).status, 400);
  assert.equal(harness.writes.length, 0);
});

test('regressão Edge: flag pública não publica arquivos em pastas privadas', async () => {
  const harness = edgeHarness();
  const response = await harness.request({ 'x-upload-public': 'true', 'x-upload-folder': 'condutores' });
  assert.equal(response.status, 400);
  assert.equal(harness.writes.length, 0);
});

test('Edge: imagem pública maior que 5 MB não chega ao storage', async () => {
  const harness = edgeHarness();
  const response = await harness.request({ 'x-upload-public': 'true', 'content-length': String(5 * 1024 * 1024 + 1) });
  assert.equal(response.status, 413);
  assert.equal(harness.writes.length, 0);
});
