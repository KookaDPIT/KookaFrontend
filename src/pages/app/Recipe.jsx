import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRecipe } from '../../services/recipes';
import { countryOf } from '../../data/countries';
import Reviews from '../../components/Reviews';
import { IconBack, IconClock } from '../../components/Icons';
import './Recipe.css';

/* ==========================================================================
   RECIPE — ingredients + method (two columns, like a printed recipe).
   The "Cook step by step" button takes you into the cook-along for this recipe.
   Data is mock (getRecipe by UUID) — no backend yet.
   ========================================================================== */

/* Car-dashboard speedometer for a nutrient. `pct` (0..1+) drives the needle;
   the arc has green / amber / red zones like a tachometer redline. */
function Gauge({ value, unit, label, pct }) {
  const p = Math.max(0, Math.min(1, pct));
  const needle = (p - 0.5) * 180; // deg: -90 (left) .. +90 (right)
  const zone = p < 0.55 ? '#3fae6f' : p < 0.8 ? '#ef9f3c' : '#e5533a';

  // tick marks around the arc (cx 50, cy 50, r 42)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const a = (1 - t) * Math.PI;
    const cos = Math.cos(a), sin = Math.sin(a);
    return {
      x1: 50 + 44 * cos, y1: 50 - 44 * sin,
      x2: 50 + 37 * cos, y2: 50 - 37 * sin,
    };
  });

  return (
    <div className="gauge">
      <svg viewBox="0 0 100 60" className="gauge__svg" aria-hidden="true">
        <path className="gauge__track" d="M8 50 A42 42 0 0 1 92 50" pathLength="100" />
        <path className="gauge__zone gauge__zone--green" d="M8 50 A42 42 0 0 1 92 50" pathLength="100" strokeDasharray="55 45" />
        <path className="gauge__zone gauge__zone--amber" d="M8 50 A42 42 0 0 1 92 50" pathLength="100" strokeDasharray="0 55 25 20" />
        <path className="gauge__zone gauge__zone--red" d="M8 50 A42 42 0 0 1 92 50" pathLength="100" strokeDasharray="0 80 20 0" />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className="gauge__tick" />
        ))}
        <g transform={`rotate(${needle} 50 50)`}>
          <line x1="50" y1="50" x2="50" y2="15" className="gauge__needle" />
        </g>
        <circle cx="50" cy="50" r="4.5" className="gauge__hub" />
      </svg>
      <div className="gauge__readout">
        <b style={{ color: zone }}>{value}</b>
        <small>{unit}</small>
      </div>
      <span className="gauge__label">{label}</span>
    </div>
  );
}

export default function Recipe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [recipe, setRecipe] = useState(undefined); // undefined = loading

  useEffect(() => {
    let alive = true;
    getRecipe(id)
      .then((r) => alive && setRecipe(r))
      .catch(() => alive && setRecipe(null));
    return () => {
      alive = false;
    };
  }, [id]);

  if (recipe === undefined) {
    return <div className="recipe recipe--state">{t('common.loading')}…</div>;
  }
  if (recipe === null) {
    return (
      <div className="recipe recipe--state">
        <p>{t('common.error')}</p>
        <button type="button" className="recipe__cook" onClick={() => navigate('/home')}>
          {t('common.back')}
        </button>
      </div>
    );
  }

  const country = recipe.origin ? countryOf(recipe.origin) : null;
  const method = (recipe.steps || []).map((s) => (typeof s === 'string' ? s : s.text));
  const allergens = recipe.allergens || { contains: [], free: [] };

  return (
    <div className="recipe">
      <header className="recipe__hero">
        <button type="button" className="recipe__back" onClick={() => navigate(-1)}>
          <IconBack className="recipe__back-icon" /> {t('common.back')}
        </button>

        <div className="recipe__hero-inner">
          <div className="recipe__hero-text">
            <span className="recipe__eyebrow">
              {country ? `${country.flag} ${country.name}` : 'Recipe'}
            </span>
            <h1 className="recipe__title">{recipe.title}</h1>
            {recipe.description && <p className="recipe__tagline">{recipe.description}</p>}

            <ul className="recipe__meta">
              {recipe.meta?.time && <li><IconClock className="recipe__meta-icon" /> {recipe.meta.time}</li>}
              {recipe.meta?.servings && <li>{recipe.meta.servings}</li>}
              {recipe.meta?.kcal && <li>{recipe.meta.kcal}</li>}
              {recipe.difficulty && <li>difficulty {recipe.difficulty}</li>}
            </ul>

            <button
              type="button"
              className="recipe__cook"
              onClick={() => navigate(`/recipe/${recipe.id}/cook`)}
            >
              Cook step by step
            </button>
          </div>

          <div
            className="recipe__photo ph"
            aria-hidden="true"
            style={recipe.image_url ? { backgroundImage: `url(${recipe.image_url})` } : undefined}
          >
            {!recipe.image_url && 'recipe photo'}
          </div>
        </div>
      </header>

      {recipe.nutrition?.length > 0 && (
        <section className="recipe__dash">
          <div className="recipe__dash-card recipe__nutri">
            <h2 className="recipe__panel-title">Nutrition <span>/ serving</span></h2>
            <div className="recipe__gauges">
              {recipe.nutrition.map((n) => (
                <Gauge key={n.key} value={n.value} unit={n.unit} label={n.label} pct={n.value / n.max} />
              ))}
            </div>
            <p className="recipe__dash-note">
              Estimated by AI. The needle shows how much of your reference daily intake one serving covers.
            </p>
          </div>

          <div className="recipe__dash-card recipe__allergens">
            <h2 className="recipe__panel-title">Allergens</h2>
            <p className="recipe__aller-label">Contains</p>
            <div className="recipe__aller-chips">
              {allergens.contains?.length ? allergens.contains.map((a) => (
                <span className="aller aller--in" key={a}>{a}</span>
              )) : <span className="aller aller--free">—</span>}
            </div>
            <p className="recipe__aller-label">Free from</p>
            <div className="recipe__aller-chips">
              {allergens.free?.map((a) => (
                <span className="aller aller--free" key={a}>{a}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="recipe__body">
        <section className="recipe__col recipe__col--ingredients">
          <h2 className="recipe__col-title">Ingredients</h2>
          <ul className="recipe__ingredients">
            {recipe.ingredients?.map((ing, i) => (
              <li key={i}>{ing}</li>
            ))}
          </ul>
        </section>

        <section className="recipe__col recipe__col--method">
          <h2 className="recipe__col-title">Method</h2>
          <ol className="recipe__method">
            {method.map((step, i) => (
              <li key={i}>
                <span className="recipe__step-no">{i + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>

          <button
            type="button"
            className="recipe__cook recipe__cook--wide"
            onClick={() => navigate(`/recipe/${recipe.id}/cook`)}
          >
            Cook step by step
          </button>
        </section>
      </div>

      <div className="recipe__reviews">
        <Reviews recipeId={recipe.id} />
      </div>
    </div>
  );
}
