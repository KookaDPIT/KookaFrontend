import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createRecipe } from '../../services/recipes';
import { refreshUser } from '../../user';
import CountryPicker from '../../components/CountryPicker';
import ImageUpload from '../../components/ImageUpload';
import Toast from '../../components/Toast';
import { IconBack } from '../../components/Icons';
import './CreateRecipe.css';

export default function CreateRecipe() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [origin, setOrigin] = useState('');
  const [servings, setServings] = useState(2);
  const [duration, setDuration] = useState(30);
  const [difficulty, setDifficulty] = useState('easy');
  const [images, setImages] = useState([]);
  const [ingredients, setIngredients] = useState(['']);
  const [steps, setSteps] = useState([{ text: '', timer: '' }]);

  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  // ---- ingredient rows ----
  const setIngredient = (i, v) => setIngredients((a) => a.map((x, idx) => (idx === i ? v : x)));
  const addIngredient = () => setIngredients((a) => [...a, '']);
  const removeIngredient = (i) => setIngredients((a) => (a.length > 1 ? a.filter((_, idx) => idx !== i) : a));

  // ---- step rows ----
  const setStep = (i, patch) => setSteps((a) => a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addStep = () => setSteps((a) => [...a, { text: '', timer: '' }]);
  const removeStep = (i) => setSteps((a) => (a.length > 1 ? a.filter((_, idx) => idx !== i) : a));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanIngredients = ingredients.map((s) => s.trim()).filter(Boolean);
    const cleanSteps = steps
      .map((s) => ({ text: s.text.trim(), ...(s.timer?.trim() ? { timer: s.timer.trim() } : {}) }))
      .filter((s) => s.text);

    if (!title.trim()) return setError(t('create.errTitle'));
    if (!cleanIngredients.length) return setError(t('create.errIngredients'));
    if (!cleanSteps.length) return setError(t('create.errSteps'));

    setBusy(true);
    try {
      const recipe = await createRecipe({
        title: title.trim(),
        description: description.trim(),
        origin,
        servings: Number(servings) || 1,
        duration_min: Number(duration) || 0,
        difficulty,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        image_url: images[0] || '',
        images,
      });
      refreshUser(); // XP changed
      setToast(t('create.successToast'));
      setTimeout(() => navigate(`/recipe/${recipe.id}`), 700);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : t('common.error'));
      setBusy(false);
    }
  };

  return (
    <div className="create">
      <div className="create__head">
        <button type="button" className="create__back" onClick={() => navigate(-1)}>
          <IconBack /> {t('common.back')}
        </button>
        <h1 className="create__title">{t('create.title')}</h1>
        <p className="create__sub">{t('create.subtitle')}</p>
      </div>

      <form className="create__form" onSubmit={handleSubmit}>
        {/* basics */}
        <label className="create__field">
          <span className="create__label">{t('create.recipeTitle')}</span>
          <input
            className="create__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('create.recipeTitlePh')}
            maxLength={120}
          />
        </label>

        <label className="create__field">
          <span className="create__label">{t('create.description')}</span>
          <textarea
            className="create__input create__textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('create.descriptionPh')}
            rows={2}
            maxLength={280}
          />
        </label>

        <div className="create__row">
          <label className="create__field">
            <span className="create__label">{t('create.origin')}</span>
            <CountryPicker value={origin} onChange={setOrigin} />
          </label>
          <label className="create__field create__field--sm">
            <span className="create__label">{t('create.servings')}</span>
            <input
              className="create__input"
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </label>
          <label className="create__field create__field--sm">
            <span className="create__label">{t('create.duration')}</span>
            <input
              className="create__input"
              type="number"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
          <label className="create__field create__field--sm">
            <span className="create__label">{t('create.difficulty')}</span>
            <select
              className="create__input"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">{t('create.easy')}</option>
              <option value="medium">{t('create.medium')}</option>
              <option value="hard">{t('create.hard')}</option>
            </select>
          </label>
        </div>

        {/* photos */}
        <div className="create__field">
          <span className="create__label">{t('create.photos')}</span>
          <ImageUpload value={images} onChange={setImages} folder="/recipes" multiple />
          <span className="create__hint">{t('create.photosHint')}</span>
        </div>

        {/* ingredients */}
        <div className="create__field">
          <span className="create__label">{t('create.ingredients')}</span>
          <div className="create__list">
            {ingredients.map((ing, i) => (
              <div className="create__listrow" key={i}>
                <input
                  className="create__input"
                  value={ing}
                  onChange={(e) => setIngredient(i, e.target.value)}
                  placeholder={t('create.ingredientPh')}
                />
                <button
                  type="button"
                  className="create__del"
                  onClick={() => removeIngredient(i)}
                  aria-label={t('common.delete')}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="create__addrow" onClick={addIngredient}>
            + {t('create.addIngredient')}
          </button>
        </div>

        {/* steps */}
        <div className="create__field">
          <span className="create__label">{t('create.steps')}</span>
          <div className="create__list">
            {steps.map((st, i) => (
              <div className="create__steprow" key={i}>
                <span className="create__stepno">{i + 1}</span>
                <div className="create__stepbody">
                  <textarea
                    className="create__input create__textarea"
                    value={st.text}
                    onChange={(e) => setStep(i, { text: e.target.value })}
                    placeholder={t('create.stepPh')}
                    rows={2}
                  />
                  <input
                    className="create__input create__timer"
                    value={st.timer || ''}
                    onChange={(e) => setStep(i, { timer: e.target.value })}
                    placeholder={t('create.stepTimerPh')}
                  />
                </div>
                <button
                  type="button"
                  className="create__del"
                  onClick={() => removeStep(i)}
                  aria-label={t('common.delete')}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="create__addrow" onClick={addStep}>
            + {t('create.addStep')}
          </button>
        </div>

        {error && <p className="create__error">{error}</p>}

        <button type="submit" className="create__submit" disabled={busy}>
          {busy ? t('create.publishing') : t('create.publish')}
        </button>
      </form>

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
