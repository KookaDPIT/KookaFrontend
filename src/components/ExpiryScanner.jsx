import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { scanExpiry } from '../services/ocr';
import Modal from './Modal';
import './ExpiryScanner.css';

/* ==========================================================================
   Point the camera at the little printed date and let the app type it in.

   The date on a yoghurt lid is four characters of low-contrast inkjet on a
   curved, shiny surface — the worst case for OCR, and the reason nothing here
   pretends to be certain. What comes back is put in an editable field with the
   line it was read from shown underneath, so the answer is always "does this
   look right?" rather than "trust me". A read that finds nothing is not an
   error either: the field is simply empty and you can type the date yourself,
   which is still faster than closing the app to go find a pen.

   `capture="environment"` makes a phone open the back camera directly. On a
   laptop the same input is an ordinary file picker, which is what you want.
   ========================================================================== */
export default function ExpiryScanner({ open, onClose, onPick, initial = '' }) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [date, setDate] = useState(initial);
  const [read, setRead] = useState(null); // { matched, confidence } from the scan

  const reset = () => {
    setBusy(false);
    setError('');
    setRead(null);
    setDate(initial);
    if (fileRef.current) fileRef.current.value = '';
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (files) => {
    const file = files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const result = await scanExpiry(file);
      setRead(result);
      if (result.date) setDate(result.date);
    } catch (err) {
      const detail = err.response?.data?.detail;
      // 503 is the honest one: the container has no Tesseract, so no photo
      // will ever work here. Anything else is worth another shot.
      setError(typeof detail === 'string' ? detail : t('ocr.failed'));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confirm = () => {
    onPick(date);
    close();
  };

  return (
    <Modal open={open} onClose={close} title={t('ocr.title')}>
      <p className="ocr__sub">{t('ocr.sub')}</p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="ocr__file"
        onChange={(e) => handleFile(e.target.files)}
      />

      <button
        type="button"
        className="ocr__shoot"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
      >
        <span aria-hidden="true">📷</span>
        {busy ? `${t('ocr.reading')}…` : t('ocr.takePhoto')}
      </button>

      {error && <p className="ocr__error">{error}</p>}

      {/* Shown after a scan even when it found nothing — "we looked and there
          was no date here" is information, and it keeps the manual field from
          appearing out of nowhere. */}
      {read && !read.date && !error && <p className="ocr__miss">{t('ocr.noDate')}</p>}

      <label className="ocr__label" htmlFor="ocr-date">{t('ocr.dateLabel')}</label>
      <input
        id="ocr-date"
        type="date"
        className="ocr__date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {read?.matched && (
        <p className={`ocr__read ocr__read--${read.confidence}`}>
          {t('ocr.readAs', { text: read.matched })}
          {read.confidence === 'low' && ` · ${t('ocr.lowConfidence')}`}
        </p>
      )}

      <div className="ocr__foot">
        <button type="button" className="kbtn kbtn--ghost" onClick={close}>
          {t('common.cancel')}
        </button>
        <button type="button" className="kbtn kbtn--primary" onClick={confirm} disabled={!date}>
          {t('common.save')}
        </button>
      </div>
    </Modal>
  );
}
