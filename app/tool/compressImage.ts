import { IMAGE_DECODE_FAILED_MESSAGE } from './imageValidation';

const MAX_UPLOAD_EDGE = 1920;

const CANVAS_SAFE_TYPES = ['image/jpeg', 'image/png'];

/**
 * Always hand the server a JPEG or PNG. Phones upload HEIC/WEBP (and small
 * files used to skip compression entirely), which the model rejects. We
 * re-encode every image to JPEG via canvas; only a already-small JPEG/PNG is
 * passed through untouched.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  const alreadyOk = CANVAS_SAFE_TYPES.includes(file.type) && file.size <= 900 * 1024;
  if (alreadyOk) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no-2d-context');
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });
    bitmap.close();
    if (!blob) throw new Error('no-blob');
    return new File([blob], jpgName(file.name), { type: 'image/jpeg' });
  } catch {
    // createImageBitmap can fail on HEIC in some browsers. Fall back to the
    // <img> decode path, which the browser can usually handle.
    return decodeViaImgElement(file);
  }
}

function jpgName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'upload';
  return `${base}.jpg`;
}

async function decodeViaImgElement(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(IMAGE_DECODE_FAILED_MESSAGE));
      el.src = url;
    });
    const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no-2d-context');
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });
    if (!blob) throw new Error(IMAGE_DECODE_FAILED_MESSAGE);
    return new File([blob], jpgName(file.name), { type: 'image/jpeg' });
  } catch (err) {
    // Normalize every decode/convert failure into one clear, actionable message.
    throw err instanceof Error && err.message === IMAGE_DECODE_FAILED_MESSAGE
      ? err
      : new Error(IMAGE_DECODE_FAILED_MESSAGE);
  } finally {
    URL.revokeObjectURL(url);
  }
}
