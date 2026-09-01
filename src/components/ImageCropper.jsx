import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ImageCropper.css';

/* ==========================================================================
   ImageCropper — the "position your photo" step that runs between picking a
   file and uploading it, the way Instagram/Facebook do it.

   The picked image is drawn into a fixed-aspect viewport, scaled to *cover* it.
   The user drags to reposition and zooms with the slider / wheel; the offsets
   are clamped so the frame is never left with an empty corner. On save we
   redraw just the visible rectangle into an off-screen canvas at output
   resolution and hand back a JPEG blob, so the file that reaches the server is
   already framed — no CSS object-position to keep in sync afterwards.

   Props:
     file      File picked by the user (a new one resets the framing)
     aspect    width / height of the crop frame (1 = square avatar, 3 = cover)
     shape     'round' | 'rect' — only changes the on-screen mask
     outWidth  pixel width of the exported image (height follows the aspect)
   ========================================================================== */

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const MAX_FRAME_W = 460; // css px; the frame's height follows from `aspect`

export default function ImageCropper({
  file,
  aspect = 1,
  shape = 'rect',
  outWidth = 1024,
  open,
  onCancel,
  onDone,
  busy = false,
  error = '',
}) {
  const { t } = useTranslation();
  const slotRef = useRef(null);
  const frameRef = useRef(null);
  const imgRef = useRef(null);
  const dragRef = useRef(null);

  const [natural, setNatural] = useState(null); // { w, h }
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // image top-left, in frame px

  /* The crop maths is expressed in frame pixels, so `frameW` has to be the
     width the frame *actually* renders at. Guessing it from the window and
     letting CSS shrink it with max-width would silently desynchronise the
     export from what the user framed, so we measure the slot it sits in. */
  const [frameW, setFrameW] = useState(0);
  const frameH = Math.round(frameW / aspect);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return undefined;
    const measure = () => setFrameW(Math.min(MAX_FRAME_W, Math.round(slot.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(slot);
    return () => ro.disconnect();
  }, [open]);

  /* The object URL is created and released in the same effect on purpose.
     Deriving it (useMemo) and revoking it in a cleanup looks tidier but breaks:
     StrictMode tears effects down and sets them up again without re-running
     render, so the cleanup revokes a URL that render never recreates and the
     image silently fails to load. Creating it here means every setup gets a
     live URL. This is the "subscribe to an external resource" case, which is
     why the setState-in-effect rule is waived below. */
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(url);
    return () => {
      setSrc('');
      URL.revokeObjectURL(url);
    };
  }, [file]);

  /* base scale = the smallest scale that still covers the frame */
  const baseScale = natural ? Math.max(frameW / natural.w, frameH / natural.h) : 1;
  const drawnW = natural ? natural.w * baseScale * zoom : 0;
  const drawnH = natural ? natural.h * baseScale * zoom : 0;

  /* keep the frame fully covered: the image's top-left can only travel between
     (frame size - drawn size) and 0 */
  const clamp = useCallback(
    (next, w = drawnW, h = drawnH) => ({
      x: Math.min(0, Math.max(frameW - w, next.x)),
      y: Math.min(0, Math.max(frameH - h, next.y)),
    }),
    [drawnW, drawnH, frameW, frameH],
  );

  /* The framing actually used for painting and for the export. Clamping here
     rather than in state means a window resize (which changes the frame, and so
     the cover scale) can never leave an empty corner. */
  const view = natural ? clamp(offset) : offset;

  const onImageLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setNatural({ w, h });
    const scale = Math.max(frameW / w, frameH / h);
    setOffset({ x: (frameW - w * scale) / 2, y: (frameH - h * scale) / 2 }); // centred
  };

  /* zoom around the middle of the frame, so the bit you were looking at stays
     put instead of drifting towards a corner */
  const applyZoom = (nextZoom) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    if (!natural) {
      setZoom(z);
      return;
    }
    const prevW = natural.w * baseScale * zoom;
    const prevH = natural.h * baseScale * zoom;
    const nextW = natural.w * baseScale * z;
    const nextH = natural.h * baseScale * z;
    const cx = (frameW / 2 - view.x) / prevW; // frame centre as a fraction
    const cy = (frameH / 2 - view.y) / prevH;
    setZoom(z);
    setOffset(clamp({ x: frameW / 2 - cx * nextW, y: frameH / 2 - cy * nextH }, nextW, nextH));
  };

  // ----- dragging (pointer events cover mouse, touch and pen) -----
  const onPointerDown = (e) => {
    if (!natural) return;
    // capture keeps the drag alive when the pointer leaves the frame, but it is
    // an optimisation — if the browser refuses, still start the drag
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch { /* not a capturable pointer */ }
    dragRef.current = { px: e.clientX, py: e.clientY, ox: view.x, oy: view.y };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset(clamp({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }));
  };

  const endDrag = () => { dragRef.current = null; };

  /* wheel-to-zoom — non-passive so the page behind does not scroll with it */
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !open) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      applyZoom(zoom - e.deltaY * 0.002);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  /* arrows nudge, +/- zoom — the frame is focusable so framing works without
     a pointer too */
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 20 : 5;
    const moves = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
    };
    if (moves[e.key]) {
      e.preventDefault();
      setOffset((o) => clamp({ x: o.x + moves[e.key].x, y: o.y + moves[e.key].y }));
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault(); applyZoom(zoom + 0.15);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault(); applyZoom(zoom - 0.15);
    }
  };

  const reset = () => {
    if (!natural) return;
    const scale = Math.max(frameW / natural.w, frameH / natural.h);
    setZoom(1);
    setOffset({ x: (frameW - natural.w * scale) / 2, y: (frameH - natural.h * scale) / 2 });
  };

  /* redraw just the visible rectangle at output resolution */
  const save = () => {
    const img = imgRef.current;
    if (!img || !natural) return;

    const outW = outWidth;
    const outH = Math.round(outWidth / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    // JPEG has no alpha — paint a white ground so transparent PNGs stay clean
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);

    const k = baseScale * zoom; // frame px -> natural px
    ctx.drawImage(img, -view.x / k, -view.y / k, frameW / k, frameH / k, 0, 0, outW, outH);

    canvas.toBlob((blob) => { if (blob) onDone(blob); }, 'image/jpeg', 0.9);
  };

  if (!open) return null;

  return (
    <div className="kcrop" role="dialog" aria-modal="true" aria-label={t('crop.title')}>
      <div className="kcrop__card">
        <div className="kcrop__head">
          <h2 className="kcrop__title">{t('crop.title')}</h2>
          <p className="kcrop__hint">{t('crop.hint')}</p>
        </div>

        <div className="kcrop__slot" ref={slotRef}>
        <div
          ref={frameRef}
          className={`kcrop__frame ${shape === 'round' ? 'is-round' : ''}`}
          style={{ width: frameW || undefined, height: frameH || undefined }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="application"
          aria-label={t('crop.frameLabel')}
        >
          {src && frameW > 0 && (
            <img
              ref={imgRef}
              className="kcrop__img"
              src={src}
              alt=""
              draggable={false}
              onLoad={onImageLoad}
              style={{
                width: drawnW || undefined,
                height: drawnH || undefined,
                transform: `translate(${view.x}px, ${view.y}px)`,
                visibility: natural ? 'visible' : 'hidden',
              }}
            />
          )}
          <span className="kcrop__grid" aria-hidden="true" />
        </div>
        </div>

        <div className="kcrop__zoom">
          <button
            type="button"
            className="kcrop__zoombtn"
            onClick={() => applyZoom(zoom - 0.2)}
            aria-label={t('crop.zoomOut')}
          >
            −
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            aria-label={t('crop.zoom')}
          />
          <button
            type="button"
            className="kcrop__zoombtn"
            onClick={() => applyZoom(zoom + 0.2)}
            aria-label={t('crop.zoomIn')}
          >
            +
          </button>
        </div>

        {/* the upload happens while this overlay is still up, so a failure has
            to be reported here — the picker's own message sits behind it */}
        {error && <p className="kcrop__error">{error}</p>}

        <div className="kcrop__foot">
          <button type="button" className="kbtn kbtn--ghost" onClick={reset}>
            {t('crop.reset')}
          </button>
          <span className="kcrop__spacer" />
          <button type="button" className="kbtn kbtn--ghost" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="kbtn kbtn--primary"
            onClick={save}
            disabled={busy || !natural}
          >
            {busy ? t('upload.uploading') : t('crop.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
