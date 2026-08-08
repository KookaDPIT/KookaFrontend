import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listReviews, addReview, editReview, deleteReview } from '../services/reviews';
import { refreshUser } from '../user';
import Stars from './Stars';
import ImageUpload from './ImageUpload';
import './Reviews.css';

/* Google-Maps-style review block for a recipe.
   Adding is gated: the backend only allows it after cooked_verified. */
export default function Reviews({ recipeId }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);

  // form state (shared by add + edit)
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => listReviews(recipeId).then(setData).catch(() => setData(null));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  const startEdit = () => {
    if (!data?.my_review) return;
    setRating(data.my_review.rating);
    setComment(data.my_review.comment || '');
    setPhoto(data.my_review.photo_url || '');
    setEditing(true);
  };

  const submitNew = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await addReview(recipeId, { rating, comment, photo_url: photo });
      setComment('');
      setPhoto('');
      setRating(5);
      refreshUser();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await editReview(data.my_review.id, { rating, comment, photo_url: photo });
      setEditing(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!data?.my_review) return;
    if (!window.confirm(t('reviews.deleteConfirm'))) return;
    await deleteReview(data.my_review.id);
    await load();
  };

  if (!data) return null;

  const others = data.items.filter((r) => !r.is_mine);

  return (
    <section className="reviews">
      <div className="reviews__head">
        <h2 className="reviews__title">{t('reviews.title')}</h2>
        {data.count > 0 && (
          <div className="reviews__avg">
            <Stars value={Math.round(data.avg_rating)} size={18} />
            <span>{t('reviews.avg', { avg: data.avg_rating, count: data.count })}</span>
          </div>
        )}
      </div>

      {/* ---- add / edit / locked ---- */}
      {data.my_review && !editing ? (
        <div className="reviews__mine">
          <div className="reviews__mine-head">
            <span className="reviews__mine-label">{t('reviews.mine')}</span>
            <div className="reviews__mine-actions">
              <button type="button" onClick={startEdit}>{t('reviews.edit')}</button>
              <button type="button" className="is-danger" onClick={remove}>{t('reviews.delete')}</button>
            </div>
          </div>
          <Stars value={data.my_review.rating} size={16} />
          {data.my_review.comment && <p>{data.my_review.comment}</p>}
          {data.my_review.photo_url && <img className="reviews__photo" src={data.my_review.photo_url} alt="" />}
        </div>
      ) : editing ? (
        <form className="reviews__form" onSubmit={submitEdit}>
          <span className="reviews__form-title">{t('reviews.editing')}</span>
          <Stars value={rating} onChange={setRating} size={26} />
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('reviews.commentPh')} rows={3} />
          <ImageUpload value={photo} onChange={setPhoto} folder="/reviews" />
          <div className="reviews__form-actions">
            <button type="button" className="reviews__ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
            <button type="submit" className="reviews__submit" disabled={busy}>{t('reviews.save')}</button>
          </div>
        </form>
      ) : data.can_review ? (
        <form className="reviews__form" onSubmit={submitNew}>
          <span className="reviews__form-title">{t('reviews.addTitle')}</span>
          <span className="reviews__form-label">{t('reviews.yourRating')}</span>
          <Stars value={rating} onChange={setRating} size={28} />
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('reviews.commentPh')} rows={3} />
          <span className="reviews__form-label">{t('reviews.photo')}</span>
          <ImageUpload value={photo} onChange={setPhoto} folder="/reviews" />
          <button type="submit" className="reviews__submit" disabled={busy}>{t('reviews.submit')}</button>
        </form>
      ) : (
        <div className="reviews__locked">
          <strong>🔒 {t('reviews.locked')}</strong>
          <p>{t('reviews.lockedHint')}</p>
        </div>
      )}

      {/* ---- list ---- */}
      {others.length === 0 ? (
        <p className="reviews__empty">{t('reviews.none')}</p>
      ) : (
        <ul className="reviews__list">
          {others.map((r) => (
            <li className="reviews__item" key={r.id}>
              <div className="reviews__item-avatar">
                {(r.user?.full_name || r.user?.username || '?')[0].toUpperCase()}
              </div>
              <div className="reviews__item-body">
                <div className="reviews__item-head">
                  <span className="reviews__item-name">{r.user?.full_name || r.user?.username}</span>
                  <Stars value={r.rating} size={14} />
                </div>
                {r.comment && <p className="reviews__item-text">{r.comment}</p>}
                {r.photo_url && <img className="reviews__photo" src={r.photo_url} alt="" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
