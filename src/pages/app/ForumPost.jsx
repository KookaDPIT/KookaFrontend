import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getPost, votePost, addComment, deleteComment, deletePost,
} from '../../services/forum';
import { useUser } from '../../user';
import { languageName } from '../../lib/languages';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import './ForumPost.css';

/* ==========================================================================
   FORUM POST — one thread.

   The post ID is shown prominently and is copyable: it is the handle people
   quote elsewhere and the exact-match key the forum search accepts.
   ========================================================================== */

const TAG_EMOJI = {
  question: '❓', recipe: '📖', tip: '💡', help: '🆘',
  win: '🏆', showcase: '✨', gear: '🔪', offtopic: '💬',
};

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

export default function ForumPost() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [me] = useUser();

  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState('');

  const flash = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  const fail = (err) => {
    const detail = err?.response?.data?.detail;
    flash(typeof detail === 'string' ? detail : t('common.error'));
  };

  useEffect(() => {
    let alive = true;
    getPost(id)
      .then((p) => { if (alive) { setPost(p); setError(''); } })
      .catch((err) => {
        if (!alive) return;
        const detail = err?.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : t('common.error'));
      });
    return () => { alive = false; };
  }, [id, t]);

  const vote = async (value) => {
    if (!post) return;
    try {
      const res = await votePost(post.id, value);
      setPost((p) => ({ ...p, votes: res.votes, my_vote: res.my_vote }));
    } catch (err) {
      fail(err);
    }
  };

  const copyId = () => {
    const text = `#${post.id}`;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
    flash(t('forum.idCopied', { id: post.id }));
  };

  const share = () => {
    const url = `${window.location.origin}/forum/${post.id}`;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).catch(() => {});
    flash(t('common.linkCopied'));
  };

  const submitComment = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const c = await addComment(post.id, body);
      setPost((p) => ({
        ...p,
        comments: [...p.comments, c],
        comment_count: p.comment_count + 1,
      }));
      setDraft('');
    } catch (err) {
      fail(err);
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setPost((p) => ({
        ...p,
        comments: p.comments.filter((c) => c.id !== commentId),
        comment_count: Math.max(0, p.comment_count - 1),
      }));
    } catch (err) {
      fail(err);
    }
  };

  const removePost = async () => {
    try {
      await deletePost(post.id);
      navigate('/forum', { replace: true });
    } catch (err) {
      fail(err);
      setConfirmDelete(false);
    }
  };

  if (error) {
    return (
      <div className="fp">
        <div className="fp-missing">
          <h1>{t('forum.notFoundTitle')}</h1>
          <p>{error}</p>
          <button type="button" className="fp-back" onClick={() => navigate('/forum')}>
            {t('forum.backToForum')}
          </button>
        </div>
      </div>
    );
  }

  if (!post) return <div className="fp"><p className="fp-loading">{t('common.loading')}</p></div>;

  const isStaff = me?.role === 'admin' || me?.role === 'moderator';

  return (
    <div className="fp">
      <div className="fp-wrap">
        <button type="button" className="fp-back" onClick={() => navigate('/forum')}>
          ← {t('forum.backToForum')}
        </button>

        <article className={`fp-card fp-card--${post.tag}`}>
          <div className="fp-meta">
            <span className="fp-tag">
              <i aria-hidden="true">{TAG_EMOJI[post.tag] || '💬'}</i>
              {t(`forum.tags.${post.tag}`)}
            </span>
            <span className="fp-lang">{languageName(post.language, i18n.language)}</span>
            <button
              type="button"
              className="fp-id"
              onClick={copyId}
              title={t('forum.copyId')}
            >
              #{post.id}
            </button>
          </div>

          <h1 className="fp-title">{post.title}</h1>

          <p className="fp-byline">
            @{post.author?.username || '—'} · {when(post.created_at)} · {post.views} {t('forum.views')}
          </p>

          {post.body && <div className="fp-body">{post.body}</div>}

          <div className="fp-actions">
            <div className="fp-vote">
              <button
                type="button"
                className={`fp-arrow ${post.my_vote === 1 ? 'is-on' : ''}`}
                aria-label={t('forum.upvote')}
                aria-pressed={post.my_vote === 1}
                onClick={() => vote(1)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 8h-4v6h-6v-6H5z" /></svg>
              </button>
              <b>{post.votes}</b>
              <button
                type="button"
                className={`fp-arrow ${post.my_vote === -1 ? 'is-down' : ''}`}
                aria-label={t('forum.downvote')}
                aria-pressed={post.my_vote === -1}
                onClick={() => vote(-1)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19l-7-8h4V5h6v6h4z" /></svg>
              </button>
            </div>

            <button type="button" className="fp-chip" onClick={share}>
              {t('forum.share')}
            </button>

            {post.can_edit && (
              <button
                type="button"
                className="fp-chip"
                onClick={() => navigate(`/forum/${post.id}/edit`)}
              >
                {t('common.edit')}
              </button>
            )}

            {post.can_delete && (
              <button
                type="button"
                className="fp-chip fp-chip--danger"
                onClick={() => setConfirmDelete(true)}
              >
                {t('common.delete')}
              </button>
            )}
          </div>
        </article>

        {/* ===== COMMENTS ===== */}
        <section className="fp-comments">
          <h2 className="fp-comments__title">
            {post.comment_count} {t('forum.commentsLabel')}
          </h2>

          <form className="fp-composer" onSubmit={submitComment}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('forum.commentPh')}
              rows={3}
              aria-label={t('forum.commentPh')}
            />
            <button type="submit" className="fp-send" disabled={sending || !draft.trim()}>
              {sending ? t('common.saving') : t('common.post')}
            </button>
          </form>

          {post.comments.length === 0 ? (
            <p className="fp-nocomments">{t('forum.noComments')}</p>
          ) : (
            <ul className="fp-list">
              {post.comments.map((c) => (
                <li key={c.id} className="fp-comment">
                  <div className="fp-comment__head">
                    <b>@{c.author?.username || '—'}</b>
                    <span>{when(c.created_at)}</span>
                    {(c.is_mine || isStaff) && (
                      <button
                        type="button"
                        className="fp-comment__del"
                        onClick={() => removeComment(c.id)}
                      >
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                  <p className="fp-comment__body">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('forum.deleteTitle')}
        footer={
          <>
            <button type="button" className="kbtn kbtn--ghost" onClick={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="kbtn kbtn--primary" onClick={removePost}>
              {t('common.delete')}
            </button>
          </>
        }
      >
        <p>{t('forum.deleteNote')}</p>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}
