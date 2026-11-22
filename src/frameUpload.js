import {preparePhoto} from './gardenScenes.js';

export const originalImageTypes = Object.freeze([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'image/avif', 'image/heic', 'image/heif', 'image/bmp',
]);

export function validOriginalId(id) {
  return typeof id === 'string' && id.length === 36 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function fourCC(view, pos) {
  return String.fromCharCode(view.getUint8(pos), view.getUint8(pos + 1),
    view.getUint8(pos + 2), view.getUint8(pos + 3));
}

function heifType(view, size) {
  if (fourCC(view, 4) !== 'ftyp') return null;
  let end = view.getUint32(0), major = 8;
  if (end === 1) {
    // Large-size BMFF boxes have a second, eight-byte length.
    end = view.getUint32(8) * 2 ** 32 + view.getUint32(12);
    major = 16;
  }
  if (end < major + 8 || end > size || (end - major) % 4 || view.byteLength < major + 8) return null;
  const brands = new Set([fourCC(view, major)]);
  // Skip the minor version and only read compatible brands inside ftyp.
  for (let pos = major + 8; pos + 4 <= Math.min(end, view.byteLength); pos += 4) {
    brands.add(fourCC(view, pos));
  }
  if (brands.has('avif') || brands.has('avis')) return 'image/avif';
  if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'].some(b => brands.has(b))) return 'image/heic';
  if (['mif1', 'mif2', 'msf1'].some(b => brands.has(b))) return 'image/heif';
  return null;
}

// Pickers can return an empty MIME type or a catch-all type for a valid phone photo.
// Inspect just the header. Uploads also pass through the browser's image decoder.
export async function rasterType(blob) {
  if (!blob || typeof blob.slice !== 'function' || !Number.isSafeInteger(blob.size) || blob.size < 4) return null;
  const view = new DataView(await blob.slice(0, 4096).arrayBuffer());
  if (view.getUint16(0) === 0xffd8 && view.getUint8(2) === 0xff && blob.size > 4) return 'image/jpeg';
  if (view.byteLength < 16) return null;
  if (view.byteLength >= 33 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a &&
      view.getUint32(8) === 13 && fourCC(view, 12) === 'IHDR' && view.getUint32(16) && view.getUint32(20)) return 'image/png';
  const label = fourCC(view, 0);
  if (label === 'GIF8' && [0x3761, 0x3961].includes(view.getUint16(4)) &&
      view.getUint16(6, true) && view.getUint16(8, true)) return 'image/gif';
  if (label === 'RIFF' && fourCC(view, 8) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(fourCC(view, 12)) &&
      view.getUint32(4, true) >= 12 && view.getUint32(4, true) + 8 <= blob.size) return 'image/webp';
  if (view.byteLength >= 26 && view.getUint16(0) === 0x424d && view.getUint32(14, true) >= 12 &&
      view.getUint32(10, true) >= 26 && view.getUint32(10, true) < blob.size) return 'image/bmp';
  return heifType(view, blob.size);
}

export async function readFrameUpload(file) {
  const type = await rasterType(file);
  if (!type) throw new Error('Choose a photo or screenshot in a supported image format.');
  const blob = file.slice(0, file.size, type);
  // Canvas supplies the compatibility preview. The original keeps its exact pixels,
  // transparency, orientation metadata and any animation frames.
  const preview = await preparePhoto(blob, [400, 320, 240]);
  const id = crypto.randomUUID();
  return {photo:{...preview, originalId:id}, frameOriginal:{id, blob}};
}
