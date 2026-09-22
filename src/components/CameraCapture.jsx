import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './CameraCapture.css';

/* ==========================================================================
   The camera, inside the app.

   Every photo in Kooka used to go through `<input type="file">`: on a phone
   that hands you off to the system camera app, and on a laptop it opens a
   file browser and asks you to go find a picture you have not taken yet.
   Either way you leave, and the app has no idea what you are pointing at —
   which matters most exactly where the picture has a job to do. Framing an
   expiry date or a finished dish is a thing you want to see happening.

   So: a live preview, a shutter, and a look at the shot before you keep it.

   Three things the browser makes us handle:
   - `getUserMedia` only exists on https (or localhost). On an insecure origin
     there is no camera at all, and pretending otherwise would give a button
     that can only fail.
   - permission is a prompt the person can refuse, and refusing is not an
     error to shout about — it just means the file picker is the way through.
   - the stream keeps the camera light on until it is stopped, so every exit
     from this component has to go through `stop()`.
   ========================================================================== */

/* A picture element needs a real file: the same shape the upload path and the
   OCR endpoint already take, so nothing downstream has to know where it came
   from. JPEG at 0.9 — a 4 MB PNG of a yoghurt lid helps nobody. */
function canvasToFile(canvas, name) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('capture failed'));
          return;
        }
        resolve(new File([blob], name, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  });
}

export default function CameraCapture({
  open,
  onClose,
  onCapture,
  /* 'environment' (the back camera — labels, dishes) or 'user' (selfies). */
  facing = 'environment',
  title = '',
  hint = '',
}) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [side, setSide] = useState(facing);
  const [status, setStatus] = useState('idle'); // idle | starting | live | denied | unsupported
  const [error, setError] = useState('');
  const [shot, setShot] = useState(null); // { file, url } awaiting keep/retake
  const [canFlip, setCanFlip] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /* One effect owns the stream for the whole time the sheet is open: it starts
     on open and on a camera flip, and stops on close and on unmount. Starting
     it from the click handler instead would leave the camera running whenever
     a re-render happened to unmount the video. */
  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        return;
      }
      setStatus('starting');
      setError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // `ideal`, not `exact`: a laptop has one camera and it is the front
          // one — asking exactly for the back camera there fails outright
          // instead of giving you the only camera in the room.
          video: { facingMode: { ideal: side }, width: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // iOS will not start a stream that has not been asked to play
          await videoRef.current.play().catch(() => {});
        }
        setStatus('live');

        // Offer the flip button only when there really is a second camera.
        navigator.mediaDevices.enumerateDevices?.()
          .then((devices) => {
            if (!cancelled) {
              setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1);
            }
          })
          .catch(() => {});
      } catch (err) {
        if (cancelled) return;
        // NotAllowedError is a person saying no, not a fault. Everything else
        // (no camera, device busy, driver error) gets the generic line.
        setStatus(err?.name === 'NotAllowedError' ? 'denied' : 'unsupported');
        setError(err?.name === 'NotReadableError' ? t('camera.busy') : '');
      }
    };

    start();

    /* Closing releases the camera and throws away the pending shot, so the
       next open starts from a live preview rather than from last week's
       photo. Done here, in the teardown, rather than in a second effect
       watching `open` — that one would be a synchronous setState in an effect
       body, which is the render-cascade the lint rule is about. */
    return () => {
      cancelled = true;
      stop();
      setShot((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return null;
      });
      setStatus('idle');
      setError('');
    };
  }, [open, side, stop, t]);

  // Escape closes, the way every other overlay in the app does.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    /* The preview is mirrored for the front camera because that is how people
       expect to see themselves — but a mirrored photo of a label is unreadable
       and one of a dish is simply wrong, so the capture is never flipped. */
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const file = await canvasToFile(canvas, `kooka-${Date.now()}.jpg`);
      setShot({ file, url: URL.createObjectURL(file) });
      // Freeze the light while the shot is on screen; the retake restarts it.
      stop();
    } catch {
      setError(t('camera.failed'));
    }
  };

  /* The stream was stopped when the shot was taken, and the effect above will
     not re-run on its own — neither `open` nor `side` changed — so the retake
     asks for the camera again itself. */
  const retake = async () => {
    setShot((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
    setStatus('starting');
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: side }, width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus('live');
    } catch {
      setStatus('denied');
    }
  };

  const keep = () => {
    if (!shot) return;
    onCapture(shot.file);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="cam" role="dialog" aria-modal="true" aria-label={title || t('camera.title')}>
      <div className="cam__scrim" onClick={onClose} aria-hidden="true" />

      <div className="cam__sheet">
        <header className="cam__head">
          <h2>{title || t('camera.title')}</h2>
          <button type="button" className="cam__x" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>

        <div className="cam__stage">
          {shot ? (
            <img className="cam__shot" src={shot.url} alt="" />
          ) : (
            <video
              ref={videoRef}
              className={`cam__video ${side === 'user' ? 'is-mirrored' : ''}`}
              playsInline
              muted
            />
          )}

          {status === 'starting' && !shot && (
            <p className="cam__state">{t('camera.starting')}…</p>
          )}

          {(status === 'denied' || status === 'unsupported') && !shot && (
            <div className="cam__state cam__state--block">
              <p>{status === 'denied' ? t('camera.denied') : (error || t('camera.unsupported'))}</p>
              <p className="cam__state-sub">{t('camera.fallbackHint')}</p>
            </div>
          )}

          {/* Framing help, where the shot has a right answer. */}
          {hint && status === 'live' && !shot && <p className="cam__hint">{hint}</p>}
        </div>

        <div className="cam__bar">
          {shot ? (
            <>
              <button type="button" className="cam__ghost" onClick={retake}>
                {t('camera.retake')}
              </button>
              <button type="button" className="cam__use" onClick={keep}>
                {t('camera.use')}
              </button>
            </>
          ) : (
            <>
              <span className="cam__slot">
                {canFlip && status === 'live' && (
                  <button
                    type="button"
                    className="cam__flip"
                    onClick={() => setSide((s) => (s === 'user' ? 'environment' : 'user'))}
                    aria-label={t('camera.flip')}
                    title={t('camera.flip')}
                  >
                    ⟲
                  </button>
                )}
              </span>

              <button
                type="button"
                className="cam__shutter"
                onClick={shoot}
                disabled={status !== 'live'}
                aria-label={t('camera.shoot')}
              >
                <span />
              </button>

              <span className="cam__slot" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
