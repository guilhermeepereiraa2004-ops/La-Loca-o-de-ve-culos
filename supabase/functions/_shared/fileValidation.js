// Shared by the upload server and the browser. The server repeats every check.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ascii = (b, start, length) => String.fromCharCode(...b.subarray(start, start + length));

const MAX_EXPANDED_BYTES = 100 * 1024 * 1024;
const MAX_XML_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_XML_BYTES = 16 * 1024 * 1024;
const crcTable = Uint32Array.from({ length: 256 }, (_, initial) => {
  let value = initial;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
const crcPart = (previous, bytes) => {
  let crc = previous;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return crc >>> 0;
};

// Check archive records before expanding any bytes. ZIP64, encryption, embedded
// OLE/ActiveX/macros and archives with unreferenced local entries are rejected.
async function isDocx(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  const minimum = Math.max(0, bytes.length - 65557);
  for (; end >= minimum; end--) {
    if (view.getUint32(end, true) === 0x06054b50 && end + 22 + view.getUint16(end + 20, true) === bytes.length) break;
  }
  if (end < minimum || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) return false;
  const count = view.getUint16(end + 10, true);
  const centralStart = view.getUint32(end + 16, true), centralSize = view.getUint32(end + 12, true);
  if (count < 2 || count > 2000 || view.getUint16(end + 8, true) !== count || centralStart + centralSize !== end) return false;
  let offset = centralStart, expanded = 0;
  const names = new Set(), entries = [], intervals = [];
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) return false;
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true), compressed = view.getUint32(offset + 20, true), size = view.getUint32(offset + 24, true);
    const length = view.getUint16(offset + 28, true), extra = view.getUint16(offset + 30, true), comment = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    expanded += size;
    if ((flags & ~0x080e) || ![0, 8].includes(method) || view.getUint16(offset + 34, true) || !length || offset + 46 + length + extra + comment > end || expanded > MAX_EXPANDED_BYTES) return false;
    let name;
    try { name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset + 46, offset + 46 + length)); } catch { return false; }
    if (name.includes('..') || name.startsWith('/') || /[\\:\x00-\x1f]/.test(name) || /vbaProject|activeX|oleObject|\.(?:exe|dll|bin|m?js|html?|svg)$/i.test(name) || names.has(name.toLowerCase())) return false;
    names.add(name.toLowerCase());
    if (local + 30 > centralStart || view.getUint32(local, true) !== 0x04034b50 || view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method) return false;
    const localNameLength = view.getUint16(local + 26, true), localExtraLength = view.getUint16(local + 28, true);
    const dataStart = local + 30 + localNameLength + localExtraLength, dataEnd = dataStart + compressed;
    if (localNameLength !== length || dataStart > centralStart || dataEnd > centralStart) return false;
    for (let byte = 0; byte < length; byte++) if (bytes[local + 30 + byte] !== bytes[offset + 46 + byte]) return false;
    let localEnd = dataEnd;
    if (flags & 8) {
      if (localEnd + 12 > centralStart) return false;
      if (view.getUint32(localEnd, true) === 0x08074b50) localEnd += 4;
      if (localEnd + 12 > centralStart || view.getUint32(localEnd, true) !== crc || view.getUint32(localEnd + 4, true) !== compressed || view.getUint32(localEnd + 8, true) !== size) return false;
      localEnd += 12;
    } else if (view.getUint32(local + 14, true) !== crc || view.getUint32(local + 18, true) !== compressed || view.getUint32(local + 22, true) !== size) return false;
    if (method === 0 && compressed !== size) return false;
    intervals.push([local, localEnd]);
    entries.push({ name, method, crc, size, dataStart, dataEnd });
    offset += 46 + length + extra + comment;
  }
  if (offset !== end || !names.has('[content_types].xml') || !names.has('word/document.xml') || !names.has('_rels/.rels')) return false;
  let previousEnd = 0;
  for (const [start, finish] of intervals.sort((a, b) => a[0] - b[0])) {
    if (start !== previousEnd) return false;
    previousEnd = finish;
  }
  if (previousEnd !== centralStart) return false;

  // Expand one entry at a time with limits on actual output, rather than trusting
  // the ZIP size fields. Inspect compressed XML too, including numeric entities.
  let xmlTotal = 0, validContentTypes = false;
  try {
    for (const entry of entries) {
      const isXml = /\.(?:xml|rels)$/i.test(entry.name);
      if (isXml && (entry.size > MAX_XML_BYTES || (xmlTotal += entry.size) > MAX_TOTAL_XML_BYTES)) return false;
      const payload = bytes.subarray(entry.dataStart, entry.dataEnd);
      const stream = new Blob([payload]).stream();
      const reader = (entry.method === 8 ? stream.pipeThrough(new DecompressionStream('deflate-raw')) : stream).getReader();
      const chunks = []; let length = 0, checksum = 0xffffffff;
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        length += value.length;
        if (length > entry.size || (isXml && length > MAX_XML_BYTES)) { await reader.cancel(); return false; }
        checksum = crcPart(checksum, value);
        if (isXml) chunks.push(value);
      }
      if (length !== entry.size || ((checksum ^ 0xffffffff) >>> 0) !== entry.crc) return false;
      if (!isXml) continue;
      const xmlBytes = new Uint8Array(length); let position = 0;
      for (const chunk of chunks) { xmlBytes.set(chunk, position); position += chunk.length; }
      // DTD/entities and XML encodings other than UTF-8 are rejected, avoiding
      // alternate encodings that could hide an active-content relationship.
      let xml = new TextDecoder('utf-8', { fatal: true }).decode(xmlBytes);
      if (xml.includes('\0') || /<!DOCTYPE|<!ENTITY/i.test(xml) || /encoding\s*=\s*["'](?!utf-8["']|utf8["'])/i.test(xml)) return false;
      xml = xml.replace(/&#(?:x([a-f\d]+)|(\d+));/gi, (_, hex, dec) => {
        const point = Number.parseInt(hex || dec, hex ? 16 : 10);
        return point <= 0x10ffff ? String.fromCodePoint(point) : '\0';
      });
      if (/vbaProject|macroEnabled|activeX|oleObject/i.test(xml)) return false;
      if (entry.name === '[Content_Types].xml') validContentTypes = xml.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml');
    }
  } catch { return false; }
  return validContentTypes;
}

export async function validateUploadBytes(input, declaredType, originalName = '') {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!b.length || b.length > MAX_UPLOAD_BYTES) throw new Error('Arquivo vazio ou maior que 50 MB.');
  const type = (declaredType || '').split(';')[0].trim().toLowerCase();
  let detected;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) detected = ['image/jpeg', 'jpg'];
  else if (b.length >= 8 && [137,80,78,71,13,10,26,10].every((v, i) => b[i] === v)) detected = ['image/png', 'png'];
  else if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') detected = ['image/webp', 'webp'];
  else if (ascii(b, 0, 5) === '%PDF-') detected = ['application/pdf', 'pdf'];
  else if (ascii(b, 4, 4) === 'ftyp' && /^(isom|iso[2-9]|mp4[12]|avc1|M4V |qt  |MSNV)$/.test(ascii(b, 8, 4))) detected = ['video/mp4', 'mp4'];
  else if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 && ascii(b, 0, Math.min(4096, b.length)).includes('webm')) detected = ['video/webm', 'webm'];
  else if (b[0] === 0x50 && b[1] === 0x4b && b.length >= 22 && await isDocx(b)) detected = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'];
  if (!detected || type !== detected[0]) throw new Error('Formato ou conteúdo inválido. Use JPEG, PNG, WebP, PDF, DOCX, MP4 ou WebM.');
  if (/\.(html?|svg|xml|js|mjs|php|exe|docm)$/i.test(originalName)) throw new Error('Tipo de arquivo bloqueado.');
  return { contentType: detected[0], extension: detected[1] };
}
