import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadImage } from '../services/upload';
import { cameraSupported } from '../lib/camera';
import CameraCapture from './CameraCapture';
import ImageCropper from './ImageCropper';
import './ImageUpload.css';

/* Image picker that uploads through the backend to ImageKit.
   - single (default): value is a URL string, onChange(url)
   - multiple: value is an array of URLs, onChange(urls[])
   `folder` routes the file on ImageKit (/recipes, /reviews, /avatars, ...).

   Pass `cropAspect` to insert a framing step (drag + zoom) between picking the
   file and uploading it — the file that reaches ImageKit is already cropped, so
   the avatar and cover always sit in their frame the way the user placed them.
   Without it the file uploads as picked, unchanged. */
export default function ImageUpload({
  value,
  onChange,
  folder = '/kooka',
  multiple = false,
  label,
  cropAspect,
  cropShape = 'rect',
  cropWidth = 1024,
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null); // File awaiting the crop step
  const [camOpen, setCamOpen] = useState(false);
  const hasCamera = cameraSupported();

  const urls = multiple ? (Array.isArray(value) ? value : []) : value ? [value] : [];
  const cropping = !!cropAspect && !multiple;

  const send = async (files) => {
    const picked = multiple ? Array.from(files) : [files[0]];
    const results = [];
    for (const file of picked) {
      const { url } = await uploadImage(file, folder);
      if (url) results.push(url);
    }
    if (multiple) onChange([...urls, ...results]);
    else onChange(results[0] || '');
  };

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setError('');

    // with a crop aspect we hand off to the cropper and upload after framing
    if (cropping) {
      setPending(files[0]);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setBusy(true);
    try {
      await send(files);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : t('upload.failed'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  /* Re-frame the photo that is already uploaded. Pulling it back through
     fetch() gives us a same-origin blob URL, which also keeps the canvas
     untainted — drawing a remote <img> directly would make toBlob() throw. */
  const repositionCurrent = async () => {
    const url = urls[0];
    if (!url) return;
    setError('');
    setBusy(true);
    /* A network error and a non-2xx response are the same outcome here: no
       bytes to re-frame. Throwing to a catch four lines below would say that
       too, but only by using an exception as a goto — so the failure is just
       "we never got there", checked once at the end. */
    let reframed = false;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        setPending(new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' }));
        reframed = true;
      }
    } catch { /* offline, CORS, a deleted file — handled below like any miss */ }

    if (!reframed) setError(t('upload.repositionFailed'));
    setBusy(false);
  };

  /* the cropper hands back a JPEG blob of the framed area */
  const handleCropped = async (blob) => {
    setBusy(true);
    setError('');
    try {
      const name = (pending?.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
      await send([new File([blob], name, { type: 'image/jpeg' })]);
      setPending(null);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : t('upload.failed'));
    } finally {
      setBusy(false);
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

        {/* Shoot it now rather than going to find it. Only when there is a
            camera to open — on a desktop without one this would be a button
            that can only fail, and the picker beside it already works. */}
        {hasCamera && (multiple || urls.length === 0) && (
          <button
            type="button"
            className="imgup__add imgup__add--cam"
            onClick={() => setCamOpen(true)}
            disabled={busy}
            title={t('camera.title')}
          >
            <span aria-hidden="true">📷</span>
            {t('camera.take')}
          </button>
        )}

        {/* Two different jobs, so two buttons: reposition re-frames the photo
            that is already there, replace picks a different file. Folding them
            into one control meant you had to re-upload just to nudge a crop. */}
        {cropping && urls.length > 0 && (
          <div className="imgup__ops">
            <button
              type="button"
              className="imgup__op"
              onClick={repositionCurrent}
              disabled={busy}
            >
              {t('upload.reposition')}
            </button>
            <button
              type="button"
              className="imgup__op"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? t('upload.uploading') : t('upload.replace')}
            </button>
          </div>
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

      {/* A captured photo walks the same path a picked one does — including
          the crop step, so an avatar shot here still gets framed. */}
      <CameraCapture
        open={camOpen}
        onClose={() => setCamOpen(false)}
        onCapture={(file) => handleFiles([file])}
        facing={cropShape === 'circle' ? 'user' : 'environment'}
        title={label || t('camera.title')}
      />

      {cropping && (
        <ImageCropper
          /* remount per picked file, so each one starts from a fresh framing */
          key={pending ? `${pending.name}:${pending.size}:${pending.lastModified}` : 'none'}
          open={!!pending}
          file={pending}
          aspect={cropAspect}
          shape={cropShape}
          outWidth={cropWidth}
          busy={busy}
          error={error}
          onCancel={() => { setPending(null); setBusy(false); setError(''); }}
          onDone={handleCropped}
        />
      )}
    </div>
  );
}
