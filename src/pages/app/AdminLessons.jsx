import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminListLessons, adminUpdateLesson, adminResetLesson } from '../../services/learn';
import './AdminLessons.css';

/* ==========================================================================
   ADMIN — lesson editor for the Learn honeycomb.

   Lessons ship from a seed file that is re-applied on every backend start. The
   moment one is edited here the backend marks it `custom` and stops
   overwriting it; "Restore" clears that flag and pulls the seed back.

   Quiz answers are visible and editable here on purpose — that is the job of
   this screen. Everywhere else they never leave the server.
   ========================================================================== */

function QuestionEditor({ question, onChange, onRemove }) {
  return (
    <div className="admL-q">
      <input
        className="admL-input"
        value={question.q}
        onChange={(e) => onChange({ ...question, q: e.target.value })}
        placeholder="Question"
      />
      <div className="admL-opts">
        {question.options.map((opt, i) => (
          <label key={i} className={`admL-opt ${question.correct === i ? 'is-correct' : ''}`}>
            <input
              type="radio"
              checked={question.correct === i}
              onChange={() => onChange({ ...question, correct: i })}
              title="Correct answer"
            />
            <input
              className="admL-input admL-input--sm"
              value={opt}
              onChange={(e) =>
                onChange({
                  ...question,
                  options: question.options.map((o, oi) => (oi === i ? e.target.value : o)),
                })
              }
            />
          </label>
        ))}
      </div>
      <button type="button" className="admL-link admL-link--danger" onClick={onRemove}>
        Remove question
      </button>
    </div>
  );
}

export default function AdminLessons({ canEdit, onToast }) {
  const { t } = useTranslation();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState('');
  const [openSlug, setOpenSlug] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    adminListLessons()
      .then((rows) => alive && setLessons(rows))
      .catch(() => alive && onToast(t('common.error')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // Loaded once when the pane opens; edits update the list in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const branches = useMemo(
    () => [...new Set(lessons.map((l) => l.branch))].sort(),
    [lessons],
  );
  const shown = branch ? lessons.filter((l) => l.branch === branch) : lessons;

  const open = (lesson) => {
    if (openSlug === lesson.slug) {
      setOpenSlug(null);
      setDraft(null);
      return;
    }
    setOpenSlug(lesson.slug);
    setDraft({
      title: lesson.title,
      summary: lesson.summary,
      intro: lesson.intro,
      icon: lesson.icon,
      video_url: lesson.video_url,
      est_min: lesson.est_min,
      req_tier: lesson.req_tier,
      steps: [...lesson.steps],
      tips: [...lesson.tips],
      quiz: lesson.quiz.map((q) => ({ ...q, options: [...q.options] })),
      mastery_quiz: lesson.mastery_quiz.map((q) => ({ ...q, options: [...q.options] })),
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await adminUpdateLesson(openSlug, draft);
      setLessons((all) => all.map((l) => (l.slug === openSlug ? updated : l)));
      onToast(t('admin.lessons.saved', { name: updated.title }));
      setOpenSlug(null);
      setDraft(null);
    } catch (err) {
      const detail = err.response?.data?.detail;
      onToast(typeof detail === 'string' ? detail : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const reset = async (slug) => {
    try {
      const restored = await adminResetLesson(slug);
      setLessons((all) => all.map((l) => (l.slug === slug ? restored : l)));
      onToast(t('admin.lessons.restored', { name: restored.title }));
      setOpenSlug(null);
      setDraft(null);
    } catch {
      onToast(t('common.error'));
    }
  };

  const setList = (field, i, value) =>
    setDraft((d) => ({ ...d, [field]: d[field].map((x, xi) => (xi === i ? value : x)) }));
  const addToList = (field, value) =>
    setDraft((d) => ({ ...d, [field]: [...d[field], value] }));
  const removeFromList = (field, i) =>
    setDraft((d) => ({ ...d, [field]: d[field].filter((_, xi) => xi !== i) }));

  if (loading) return <p className="admL-empty">{t('common.loading')}…</p>;

  return (
    <section className="adm-section">
      <div className="adm-filters">
        <button
          type="button"
          className={`adm-chipbtn ${branch === '' ? 'is-active' : ''}`}
          onClick={() => setBranch('')}
        >
          {t('admin.lessons.all')} ({lessons.length})
        </button>
        {branches.map((b) => (
          <button
            key={b}
            type="button"
            className={`adm-chipbtn ${branch === b ? 'is-active' : ''}`}
            onClick={() => setBranch(b)}
          >
            {b}
          </button>
        ))}
      </div>

      <ul className="admL-list">
        {shown.map((lesson) => (
          <li key={lesson.slug} className="admL-item">
            <button type="button" className="admL-row" onClick={() => open(lesson)}>
              <span className="admL-icon" aria-hidden="true">{lesson.icon}</span>
              <span className="admL-name">
                <b>{lesson.title}</b>
                <small>
                  {lesson.branch} · {lesson.req_tier_label} · +{lesson.xp} XP
                  {lesson.custom && <em className="admL-custom"> · {t('admin.lessons.edited')}</em>}
                </small>
              </span>
              <span className="admL-stats">
                {t('admin.lessons.stats', {
                  completed: lesson.stats.completed,
                  mastered: lesson.stats.mastered,
                })}
              </span>
            </button>

            {openSlug === lesson.slug && draft && (
              <div className="admL-editor">
                {!canEdit && (
                  <p className="admL-warn">{t('admin.lessons.adminOnly')}</p>
                )}

                <div className="admL-grid">
                  <label className="admL-field">
                    <span>{t('admin.lessons.fTitle')}</span>
                    <input className="admL-input" value={draft.title}
                           onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                  </label>
                  <label className="admL-field admL-field--sm">
                    <span>{t('admin.lessons.fIcon')}</span>
                    <input className="admL-input" value={draft.icon} maxLength={4}
                           onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
                  </label>
                  <label className="admL-field admL-field--sm">
                    <span>{t('admin.lessons.fMinutes')}</span>
                    <input className="admL-input" type="number" min={1} value={draft.est_min}
                           onChange={(e) => setDraft({ ...draft, est_min: Number(e.target.value) })} />
                  </label>
                  <label className="admL-field admL-field--sm">
                    <span>{t('admin.lessons.fTier')}</span>
                    <input className="admL-input" type="number" min={0} max={15} value={draft.req_tier}
                           onChange={(e) => setDraft({ ...draft, req_tier: Number(e.target.value) })} />
                  </label>
                </div>

                <label className="admL-field">
                  <span>{t('admin.lessons.fVideo')}</span>
                  <input className="admL-input" value={draft.video_url}
                         placeholder="https://www.youtube.com/embed/…"
                         onChange={(e) => setDraft({ ...draft, video_url: e.target.value })} />
                </label>

                <label className="admL-field">
                  <span>{t('admin.lessons.fSummary')}</span>
                  <textarea className="admL-input" rows={2} value={draft.summary}
                            onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
                </label>

                <label className="admL-field">
                  <span>{t('admin.lessons.fIntro')}</span>
                  <textarea className="admL-input" rows={4} value={draft.intro}
                            onChange={(e) => setDraft({ ...draft, intro: e.target.value })} />
                </label>

                {['steps', 'tips'].map((field) => (
                  <div className="admL-field" key={field}>
                    <span>{t(`admin.lessons.f${field === 'steps' ? 'Steps' : 'Tips'}`)}</span>
                    {draft[field].map((value, i) => (
                      <div className="admL-listrow" key={i}>
                        <textarea className="admL-input" rows={2} value={value}
                                  onChange={(e) => setList(field, i, e.target.value)} />
                        <button type="button" className="admL-x"
                                onClick={() => removeFromList(field, i)}>×</button>
                      </div>
                    ))}
                    <button type="button" className="admL-link"
                            onClick={() => addToList(field, '')}>
                      + {t('admin.lessons.addLine')}
                    </button>
                  </div>
                ))}

                {['quiz', 'mastery_quiz'].map((field) => (
                  <div className="admL-field" key={field}>
                    <span>
                      {field === 'quiz'
                        ? t('admin.lessons.fQuiz')
                        : t('admin.lessons.fMasteryQuiz')}
                    </span>
                    {draft[field].map((question, i) => (
                      <QuestionEditor
                        key={i}
                        question={question}
                        onChange={(q) => setList(field, i, q)}
                        onRemove={() => removeFromList(field, i)}
                      />
                    ))}
                    <button
                      type="button"
                      className="admL-link"
                      onClick={() =>
                        addToList(field, { q: '', options: ['', '', '', ''], correct: 0 })
                      }
                    >
                      + {t('admin.lessons.addQuestion')}
                    </button>
                  </div>
                ))}

                <div className="admL-actions">
                  <button type="button" className="adm-btn adm-btn--primary"
                          onClick={save} disabled={!canEdit || saving}>
                    {saving ? t('common.saving') : t('common.save')}
                  </button>
                  {lesson.custom && (
                    <button type="button" className="adm-btn"
                            onClick={() => reset(lesson.slug)} disabled={!canEdit}>
                      {t('admin.lessons.restore')}
                    </button>
                  )}
                  <button type="button" className="adm-btn"
                          onClick={() => { setOpenSlug(null); setDraft(null); }}>
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
