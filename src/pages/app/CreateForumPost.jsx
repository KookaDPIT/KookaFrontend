import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getForumMeta, createPost, getPost, updatePost } from '../../services/forum';
import { languageName, languageEndonym, hasDistinctEndonym } from '../../lib/languages';
import LanguagePicker from '../../components/LanguagePicker';
import Modal from '../../components/Modal';
import './CreateForumPost.css';

/* ==========================================================================
   NEW / EDIT FORUM POST.

   Two required choices before the text: the subforum (the language you are
   writing in) and the tag (what it is about). Both come from the backend's
   fixed vocabularies via /forum/meta, so the options can never drift out of
   sync with what the API will accept.
   ========================================================================== */

export default function CreateForumPost() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = !!id;

  const [meta, setMeta] = useState({ languages: [], all_languages: [], tags: [] });
  const [langPicker, setLangPicker] = useState(false);
  const [form, setForm] = useState({
    // default to the language the interface is in — most people write in it
    language: i18n.language?.startsWith('ro') ? 'ro' : 'en',
    tag: 'question',
    title: '',
    body: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getForumMeta()
      .then((m) => { if (alive) setMeta(m); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!editing) return undefined;
    let alive = true;
    getPost(id)
      .then((p) => {
        if (!alive) return;
        setForm({
          language: p.language, tag: p.tag, title: p.title, body: p.body || '',
        });
      })
      .catch(() => { if (alive) setError(t('forum.notFoundTitle')); });
    return () => { alive = false; };
  }, [editing, id, t]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  /* One tap for the likely answers: the interface language, English, and the
     busiest existing subforums — everything else goes through the picker. */
  const quickPicks = (() => {
    const ui = i18n.language?.slice(0, 2) || 'en';
    const seen = new Set();
    const out = [];
    for (const code of [ui, 'en', ...meta.languages.map((l) => l.code)]) {
      if (code && !seen.has(code)) { seen.add(code); out.push(code); }
      if (out.length === 5) break;
    }
    return out;
  })();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.title.trim().length < 5) {
      setError(t('forum.errTitleShort'));
      return;
    }
    setSaving(true);
    try {
      const saved = editing
        ? await updatePost(id, form)
        : await createPost({ ...form, title: form.title.trim(), body: form.body.trim() });
      navigate(`/forum/${saved.id}`, { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : t('common.error'));
      setSaving(false);
    }
  };

  return (
    <div className="cfp">
      <form className="cfp-card" onSubmit={submit}>
        <header className="cfp-head">
          <h1 className="cfp-title">
            {editing ? t('forum.editTitle') : t('forum.newPost')}
          </h1>
          <p className="cfp-sub">{t('forum.newSub')}</p>
        </header>

        {/* ---- subforum ----
            Every ISO 639-1 language is allowed, so this is a chosen value plus
            a searchable picker rather than a row of buttons. The quick picks
            cover the overwhelmingly common cases in one tap. */}
        <fieldset className="cfp-field">
          <legend>{t('forum.pickLanguage')}</legend>
          <p className="cfp-hint">{t('forum.pickLanguageHint')}</p>

          <div className="cfp-langrow">
            <span className="cfp-chosen">
              <span className="cfp-chosen__code" aria-hidden="true">
                {form.language.toUpperCase()}
              </span>
              <span className="cfp-chosen__text">
                <b>{languageName(form.language, i18n.language)}</b>
                {hasDistinctEndonym(form.language, i18n.language) && (
                  <small>{languageEndonym(form.language)}</small>
                )}
              </span>
            </span>
            <button
              type="button"
              className="cfp-change"
              onClick={() => setLangPicker(true)}
            >
              {t('forum.changeLanguage')}
            </button>
          </div>

          <div className="cfp-opts cfp-opts--quick">
            {quickPicks.map((code) => (
              <button
                key={code}
                type="button"
                className={`cfp-opt cfp-opt--sm ${form.language === code ? 'is-active' : ''}`}
                aria-pressed={form.language === code}
                onClick={() => set('language', code)}
              >
                <span className="cfp-opt__code" aria-hidden="true">{code.toUpperCase()}</span>
                {languageName(code, i18n.language)}
              </button>
            ))}
          </div>
        </fieldset>

        {/* ---- tag ---- */}
        <fieldset className="cfp-field">
          <legend>{t('forum.pickTag')}</legend>
          <p className="cfp-hint">{t('forum.pickTagHint')}</p>
          <div className="cfp-opts">
            {meta.tags.map((x) => (
              <button
                key={x.code}
                type="button"
                className={`cfp-opt cfp-opt--${x.code} ${form.tag === x.code ? 'is-active' : ''}`}
                aria-pressed={form.tag === x.code}
                onClick={() => set('tag', x.code)}
              >
                <span className="cfp-opt__icon" aria-hidden="true">{x.emoji}</span>
                {t(`forum.tags.${x.code}`)}
              </button>
            ))}
          </div>
        </fieldset>

        {/* ---- text ---- */}
        <div className="cfp-field">
          <label htmlFor="cfp-title">{t('forum.titleLabel')}</label>
          <input
            id="cfp-title"
            className="cfp-input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder={t('forum.titlePh')}
            maxLength={140}
          />
          <span className="cfp-count">{form.title.length}/140</span>
        </div>

        <div className="cfp-field">
          <label htmlFor="cfp-body">{t('forum.bodyLabel')}</label>
          <textarea
            id="cfp-body"
            className="cfp-textarea"
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
            placeholder={t('forum.bodyPh')}
            rows={8}
          />
        </div>

        {error && <p className="cfp-error">{error}</p>}

        <div className="cfp-foot">
          <button type="button" className="kbtn kbtn--ghost" onClick={() => navigate('/forum')}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="kbtn kbtn--primary" disabled={saving}>
            {saving ? t('common.saving') : editing ? t('common.save') : t('common.post')}
          </button>
        </div>
      </form>

      <Modal
        open={langPicker}
        onClose={() => setLangPicker(false)}
        title={t('forum.pickLanguage')}
      >
        <LanguagePicker
          all={meta.all_languages}
          active={meta.languages}
          value={form.language}
          autoFocus
          onPick={(code) => { set('language', code); setLangPicker(false); }}
        />
      </Modal>
    </div>
  );
}
