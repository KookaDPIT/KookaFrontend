import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { getReportReasons, sendReport } from '../services/reports';
import './ReportDialog.css';

/* ==========================================================================
   REPORT DIALOG — one form, used by recipes, forum posts and comments.

   The Report button used to open nothing. This asks the one question a
   moderator actually needs ("what is wrong with it?") and nothing else: a long
   form is how you end up with no reports at all.

   The reason list comes from the backend, because those ids are what the
   moderation queue filters by. `FALLBACK_REASONS` mirrors it so the dialog
   still works if that call fails — it is the shape, not a second source.
   ========================================================================== */

const FALLBACK_REASONS = [
  { id: 'spam', needs_details: false },
  { id: 'offensive', needs_details: false },
  { id: 'dangerous', needs_details: false },
  { id: 'not_a_recipe', needs_details: false },
  { id: 'stolen', needs_details: false },
  { id: 'other', needs_details: true },
];

const WHAT = {
  recipe: 'report.whatRecipe',
  forum_post: 'report.whatPost',
  forum_comment: 'report.whatComment',
};

export default function ReportDialog({ open, onClose, targetType, targetId, onDone }) {
  const { t } = useTranslation();
  const [reasons, setReasons] = useState(FALLBACK_REASONS);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    getReportReasons(targetType)
      .then((list) => {
        if (!alive || !list.length) return;
        setReasons(list);
        setReason(list[0].id);
      })
      .catch(() => { /* the fallback shape is already on screen */ });
    return () => { alive = false; };
  }, [open, targetType]);

  /* A fresh dialog every time it opens, not last time's half-written report.
     Adjusting during render rather than in an effect: the reset has to be
     visible on the first paint of the open dialog, and React re-runs the
     render immediately when state changes this way. */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDetails('');
      setError('');
    }
  }

  const needsDetails = reasons.find((r) => r.id === reason)?.needs_details;

  const submit = async () => {
    if (needsDetails && !details.trim()) {
      setError(t('report.needDetails'));
      return;
    }
    setSending(true);
    try {
      const res = await sendReport({ targetType, targetId, reason, details: details.trim() });
      onDone?.(res.already_reported ? t('report.already') : t('report.sent'));
      onClose();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : t('common.error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('report.title', { what: t(WHAT[targetType] || 'report.whatPost') })}
      footer={(
        <>
          <button type="button" className="kbtn kbtn--ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="kbtn kbtn--danger" onClick={submit} disabled={sending}>
            {sending ? t('report.sending') : t('report.submit')}
          </button>
        </>
      )}
    >
      <p className="rep__intro">{t('report.intro')}</p>

      <div className="rep__reasons" role="radiogroup">
        {reasons.map((r) => (
          <label className={`rep__reason ${reason === r.id ? 'is-on' : ''}`} key={r.id}>
            <input
              type="radio"
              name="report-reason"
              value={r.id}
              checked={reason === r.id}
              onChange={() => { setReason(r.id); setError(''); }}
            />
            <span>{t(`report.reasons.${r.id}`)}</span>
          </label>
        ))}
      </div>

      <label className="rep__details">
        <span>{t('report.detailsLabel')}</span>
        <textarea
          rows={3}
          value={details}
          onChange={(e) => { setDetails(e.target.value); setError(''); }}
          placeholder={t('report.detailsPlaceholder')}
          maxLength={1000}
        />
      </label>

      {error && <p className="rep__error">{error}</p>}
    </Modal>
  );
}
