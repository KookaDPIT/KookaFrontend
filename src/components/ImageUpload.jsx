import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadImage } from '../services/upload';
import './ImageUpload.css';

/* Image picker that uploads through the backend to ImageKit.
   - single (default): value is a URL string, onChange(url)
   - multiple: value is an array of URLs, onChange(urls[])
   `folder` routes the file on ImageKit (/recipes, /reviews, /avatars, ...). */
export default function ImageUpload({
  value,
  onChange,
  folder = '/kooka',
  multiple = false,
  label,
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const urls = multiple ? (Array.isArray(value) ? value : []) : value ? [value] : [];

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setError('');
    setBusy(true);
    try {
      const picked = multiple ? Array.from(files) : [files[0]];
      const results = [];
      for (const file of picked) {
        const { url } = await uploadImage(file, folder);
        if (url) results.push(url);
      }
      if (multiple) onChange([...urls, ...results]);
      else onChange(results[0] || '');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : t('upload.failed'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (i) => {
    if (multiple) onChange(urls.filter((_, idx) => idx !== i));
    else onChange('');
  };

  return (
    <div className="imgup">
      {label && <span className="imgup__label">{label}</span>}

      <div className="imgup__grid">
        {urls.map((u, i) => (
          <div className="imgup__thumb" key={u + i}>
            <img src={u} alt="" />
            <button
              type="button"
              className="imgup__remove"
              onClick={() => removeAt(i)}
              aria-label={t('upload.remove')}
            >
              ×
            </button>
          </div>
        ))}

        {(multiple || urls.length === 0) && (
          <button
            type="button"
            className="imgup__add"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? t('upload.uploading') : t('upload.add')}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="imgup__error">{error}</p>}
    </div>
  );
}
