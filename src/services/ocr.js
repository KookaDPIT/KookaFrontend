import api from '../api';

/* ==========================================================================
   OCR — reading the expiry date off a label.

   The backend runs Tesseract over the photo and pulls out a date; the image
   is processed and dropped, never stored. It is a best-effort read of print
   on a curved, shiny, half-crumpled surface, so nothing here is trusted
   blindly: the caller shows what was found and lets the person fix it.
   ========================================================================== */

/* Whether Tesseract is actually installed where the API runs. It lives in the
   Docker image, so this is true in production and usually false on a laptop
   running uvicorn directly — worth asking before offering the button. */
export async function ocrAvailable() {
  try {
    const { data } = await api.get('/ocr/health');
    return !!data?.available;
  } catch {
    return false;
  }
}

/**
 * Read an expiry date from a photo.
 *
 * @param {File} file
 * @returns {Promise<{date: string|null, matched: string|null, raw_text: string,
 *                    confidence: 'high'|'low'|'none'}>}
 *   `date` is ISO (YYYY-MM-DD) or null when nothing date-shaped was found.
 *   `confidence` is "high" only when the date sat next to an EXP/VALABIL-type
 *   word — on a package that also prints its production date, that is the
 *   difference between the right number and the wrong one.
 */
export async function scanExpiry(file) {
  const body = new FormData();
  body.append('file', file);
  // The shared instance defaults to application/json; without this the body
  // goes up with the wrong content type and FastAPI never sees the file.
  const { data } = await api.post('/ocr/expiry', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
