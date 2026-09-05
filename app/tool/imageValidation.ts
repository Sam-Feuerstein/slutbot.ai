/** Shared image upload rules + friendly, actionable messages for the user. */

export const MAX_IMAGE_MB = 10;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

/** Formats the client can reliably re-encode to JPEG before upload. */
export const SUPPORTED_UPLOAD_HINT = 'JPG, PNG, or HEIC (iPhone) photos';

export type ImageCheck = { ok: true } | { ok: false; message: string };

/**
 * Fast, upfront check at the moment the user picks a file, so we can tell them
 * exactly what's wrong before they waste a Generate tap.
 */
export function checkSelectedImage(file: File): ImageCheck {
  if (!file) {
    return { ok: false, message: 'No image selected. Choose a photo to continue.' };
  }

  // Reject obvious non-images. Empty type is allowed — some phones send no MIME
  // and we still re-encode by decoding the bytes.
  if (file.type && !file.type.startsWith('image/')) {
    return {
      ok: false,
      message: `That’s not an image. Upload a ${SUPPORTED_UPLOAD_HINT}.`,
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      message: `That image is ${mb} MB. Please upload a photo under ${MAX_IMAGE_MB} MB.`,
    };
  }

  if (file.size === 0) {
    return {
      ok: false,
      message: 'That file looks empty. Pick a different photo and try again.',
    };
  }

  return { ok: true };
}

/** Friendly message when the browser can't decode/convert the chosen image. */
export const IMAGE_DECODE_FAILED_MESSAGE = `We couldn’t read that photo. Please upload a ${SUPPORTED_UPLOAD_HINT}, or take a screenshot of it and upload that.`;
