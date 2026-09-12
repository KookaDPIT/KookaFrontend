import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRecipe, moderateRecipe } from '../../services/recipes';
import ModerationBar from '../../components/ModerationBar';
import Modal from '../../components/Modal';
import { countryOf } from '../../data/countries';
import { allergiesHaveBeenAnswered, useUser } from '../../user';
import Reviews from '../../components/Reviews';
import ReportDialog from '../../components/ReportDialog';
import Toast from '../../components/Toast';
import { IconBack, IconClock } from '../../components/Icons';
import { RankPill } from '../../components/RankBadge';
import './Recipe.css';

/* ==========================================================================
   RECIPE — ingredients + method (two columns, like a printed recipe).
   The "Cook step by step" button takes you into the cook-along for this recipe.
   Data is mock (getRecipe by UUID) — no backend yet.
   ========================================================================== */

/* Car-dashboard speedometer for a nutrient. `pct` (0..1) drives the needle over
   a 180° arc with green / amber / red zones (like a tachometer redline).
   Geometry is computed with polar math so needle, zones and ticks line up. */
const G = { cx: 50, cy: 50, r: 40 };

/* point on the arc for fraction f (0 = left, 1 = right), at radius rr */
function gaugePoint(f, rr = G.r) {
  const a = Math.PI - f * Math.PI; // PI (left) -> 0 (right), over the top
  return [G.cx + rr * Math.cos(a), G.cy - rr * Math.sin(a)];
}

/* arc path between two fractions (each sub-arc is < 180°, so large-arc = 0) */
function gaugeArc(f0, f1, rr = G.r) {
  const [x0, y0] = gaugePoint(f0, rr);
  const [x1, y1] = gaugePoint(f1, rr);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${rr} ${rr} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/* The dial is ONE stroke, coloured by a gradient with hard stops, not three
   arcs laid end to end. Three arcs each had a rounded cap, so every zone
   boundary showed up as a pair of little dividing lines across the band.

   The stops are at 0.25 and 0.75 rather than a third and two thirds because a
   linearGradient runs along x while the band runs around an arc: the point at
   angle f sits at x = cx - r·cos(f·π), so f = 1/3 lands a quarter of the way
   across the box. Same boundaries as before, no seams. */
function Gauge({ value, unit, label, pct, gradientId }) {
  const p = Math.max(0, Math.min(1, pct));
  const zone = p < 1 / 3 ? '#3fae6f' : p < 2 / 3 ? '#efb341' : '#e5533a';
  const [nx, ny] = gaugePoint(p, G.r - 7);

  return (
    <div className="gauge">
      <svg viewBox="0 0 100 58" className="gauge__svg" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3fae6f" />
            <stop offset="25%" stopColor="#3fae6f" />
            <stop offset="25%" stopColor="#efb341" />
            <stop offset="75%" stopColor="#efb341" />
            <stop offset="75%" stopColor="#e5533a" />
            <stop offset="100%" stopColor="#e5533a" />
          </linearGradient>
        </defs>
        <path className="gauge__band" d={gaugeArc(0, 1)} stroke={`url(#${gradientId})`} />
        <line x1={G.cx} y1={G.cy} x2={nx.toFixed(2)} y2={ny.toFixed(2)} className="gauge__needle" />
      </svg>
      <div className="gauge__readout">
        <b style={{ color: zone }}>{value}</b>
        <small>{unit}</small>
      </div>
      <span className="gauge__label">{label}</span>
    </div>
  );
}

function normalized(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default function Recipe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user] = useUser();
  /* One state object rather than two: a load ends as loading / ok / error, and
     keeping them together means the effect never has to reset anything
     synchronously.

     A recipe above your rank is no longer a wall. It opens and it cooks; the
     payload just carries `above_rank`, and pressing Cook asks you first. */
  const [view, setView] = useState({ status: 'loading' });
  const [ingredientsAdded, setIngredientsAdded] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().slice(0, 10));
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [cookWarning, setCookWarning] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let alive = true;
    getRecipe(id)
      .then((r) => alive && setView({ status: 'ok', recipe: r }))
      .catch(() => alive && setView({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [id]);

  const recipe = view.status === 'ok' ? view.recipe : null;

  if (view.status === 'loading') {
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
  const author = recipe.author;
  const isAuthor = user && author && user.id === author.id;
  const containedAllergens = allergens.contains || [];
  const userAllergies = user?.allergies || [];
  const allergyConflicts = recipe.allergen_conflicts?.length
    ? recipe.allergen_conflicts
    : containedAllergens.filter((allergen) => userAllergies.some((allergy) => {
      const mealValue = normalized(allergen);
      const userValue = normalized(allergy);
      return mealValue === userValue || mealValue.includes(userValue) || userValue.includes(mealValue);
    }));
  const hasAllergens = containedAllergens.length > 0 || recipe.allergen_conflicts?.length > 0;

  /* Three things can give you pause before you start, in order of how badly
     they can go: an allergen you told us to avoid, a dish we have no allergen
     answer for, and a recipe above your rank. None of them stops you — each
     one asks once, and "cook anyway" is always there. */
  const startCooking = () => {
    if (allergyConflicts.length > 0) {
      setCookWarning({ type: 'conflict', allergens: allergyConflicts });
      return;
    }
    if (hasAllergens && userAllergies.length === 0 && !allergiesHaveBeenAnswered()) {
      setCookWarning({ type: 'setup' });
      return;
    }
    if (recipe.above_rank) {
      setCookWarning({ type: 'rank' });
      return;
    }
    navigate(`/recipe/${recipe.id}/cook`);
  };

  const goCook = () => {
    setCookWarning(null);
    navigate(`/recipe/${recipe.id}/cook`);
  };

  const flash = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2600);
  };

  const addIngredientsToShoppingList = () => {
    let shopping = [];
    try {
      shopping = JSON.parse(localStorage.getItem('kooka_shopping_list')) || [];
    } catch { /* unavailable storage leaves the in-memory list empty */ }
    const next = [...shopping];
    (recipe.ingredients || []).forEach((ingredient) => {
      const name = ingredient.trim();
      const existing = next.find((item) => item.name.toLowerCase() === name.toLowerCase() && item.quantity == null);
      if (!existing) next.push({ id: `${name}-${Date.now()}-${next.length}`, name, quantity: null });
    });
    localStorage.setItem('kooka_shopping_list', JSON.stringify(next));
    setIngredientsAdded(true);
  };

  const addRecipeToCalendar = () => {
    if (!calendarDate) return;
    let meals = {};
    try {
      meals = JSON.parse(localStorage.getItem('kooka_meal_plan')) || {};
    } catch { /* unavailable storage leaves the calendar in memory only */ }
    const next = {
      ...meals,
      [calendarDate]: [...(meals[calendarDate] || []), { id: recipe.id, title: recipe.title }],
    };
    localStorage.setItem('kooka_meal_plan', JSON.stringify(next));
    setCalendarAdded(true);
    setCalendarOpen(false);
  };

  /* A moderator who lands on a recipe should be able to act on it here rather
     than memorising the id and walking over to the console. */
  const moderate = async (action) => {
    const res = await moderateRecipe(recipe.id, action);
    setView((v) => ({
      ...v,
      recipe: { ...v.recipe, is_hidden: res.moderation_status === 'hidden' },
    }));
  };

  return (
    <div className="recipe">
      {recipe.can_moderate && (
        <ModerationBar
          hidden={recipe.is_hidden}
          onHide={() => moderate('hide')}
          onRestore={() => moderate('restore')}
          hiddenNote={t('moderation.recipeHiddenNote')}
        />
      )}

      <header className="recipe__hero">
        {/* Home, not history. Recipes are reached from the feed and left
            through the cook-along, so `navigate(-1)` kept sending people back
            into the steps they had just walked out of. */}
        <button type="button" className="recipe__back" onClick={() => navigate('/home')}>
          <IconBack className="recipe__back-icon" /> {t('recipe.backHome')}
        </button>

        <div className="recipe__hero-inner">
          <div className="recipe__hero-text">
            <span className="recipe__eyebrow">
              {country ? `${country.flag} ${country.name}` : 'Recipe'}
            </span>
            <h1 className="recipe__title">{recipe.title}</h1>
            {recipe.description && <p className="recipe__tagline">{recipe.description}</p>}

            {/* The site is English-only, so a recipe written in another language
                is stored translated. Say so, rather than pretending it was
                written this way. */}
            {recipe.source_language && recipe.source_language !== 'en' && (
              <p className="recipe__translated">
                {t('recipe.translatedFrom', {
                  lang: recipe.source_language_name || recipe.source_language.toUpperCase(),
                })}
              </p>
            )}

            <ul className="recipe__meta">
              {recipe.meta?.time && <li><IconClock className="recipe__meta-icon" /> {recipe.meta.time}</li>}
              {recipe.meta?.servings && <li>{recipe.meta.servings}</li>}
              {recipe.meta?.kcal && <li>{recipe.meta.kcal}</li>}
              {recipe.rank && (
                <li className="recipe__meta-rank">
                  <RankPill rank={recipe.rank} label={recipe.rank_name} />
                </li>
              )}
            </ul>

            {author && (
              /* Tapping the name or the picture is how people expect to reach
                 a profile — it was the one place in the app where that did
                 nothing. */
              <Link
                className="recipe__author"
                to={`/profile/${author.id}`}
                title={t('recipe.viewProfile', { name: author.full_name || author.username })}
              >
                <span className="recipe__author-avatar"
                  style={author.avatar_url ? { backgroundImage: `url(${author.avatar_url})` } : undefined}>
                  {!author.avatar_url && (author.full_name || author.username || '?')[0].toUpperCase()}
                </span>
                <span className="recipe__author-text">
                  {t('recipe.by')} <b>{author.full_name || author.username}</b>
                </span>
              </Link>
            )}

            {/* A stretch, not a wall: the recipe opens and cooks either way,
                but say so where the difficulty is stated. */}
            {recipe.above_rank && recipe.rank_warning && (
              <p className="recipe__rank-note">
                <RankPill
                  rank={recipe.rank_warning.required_rank}
                  label={recipe.rank_warning.required_rank_name}
                />
                <span>
                  {t('recipe.aboveYourRank', {
                    rank: recipe.rank_warning.your_rank?.tier_label,
                  })}
                </span>
              </p>
            )}

            {/* You told us to avoid these. Better here, before the shopping
                list, than three steps into the method. */}
            {recipe.allergen_conflicts?.length > 0 && (
              <p className="recipe__allergy-warn">
                <span className="recipe__allergy-warn-icon" aria-hidden="true">⚠️</span>
                <span>{t('recipe.allergyWarning', { list: recipe.allergen_conflicts.join(', ') })}</span>
              </p>
            )}

            <div className="recipe__cta">
              <button
                type="button"
                className="recipe__cook recipe__cook--full"
                onClick={startCooking}
              >
                {t('recipe.cook')}
              </button>
              {isAuthor && (
                <button
                  type="button"
                  className="recipe__edit"
                  onClick={() => navigate(`/recipe/${recipe.id}/edit`)}
                >
                  ✎ {t('recipe.edit')}
                </button>
              )}
              <button
                type="button"
                className="recipe__shopping recipe__calendar-button"
                onClick={() => setCalendarOpen((open) => !open)}
              >
                {calendarAdded ? `✓ ${t('recipe.calendarAdded')}` : `📅 ${t('recipe.addToCalendar')}`}
              </button>
              {calendarOpen && (
                <div className="recipe__calendar-popover">
                  <label htmlFor="recipe-calendar-date">{t('recipe.addToCalendar')}</label>
                  <input
                    id="recipe-calendar-date"
                    type="date"
                    value={calendarDate}
                    onChange={(event) => setCalendarDate(event.target.value)}
                  />
                  <button type="button" className="recipe__calendar-confirm" onClick={addRecipeToCalendar}>
                    {t('mealPlan.schedule')}
                  </button>
                </div>
              )}
            </div>
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
            <h2 className="recipe__panel-title">{t('recipe.nutrition')} <span>{t('recipe.perServing')}</span></h2>
            <div className="recipe__gauges">
              {recipe.nutrition.map((n) => (
                /* the gradient id has to be unique per dial — SVG defs are
                   document-global, so a shared id makes every gauge use the
                   first one's gradient */
                <Gauge
                  key={n.key}
                  value={n.value}
                  unit={n.unit}
                  label={n.label}
                  pct={n.value / n.max}
                  gradientId={`gauge-${recipe.id}-${n.key}`}
                />
              ))}
            </div>
            <p className="recipe__dash-note">{t('recipe.aiNote')}</p>
          </div>

          <div className="recipe__dash-card recipe__allergens">
            <h2 className="recipe__panel-title">{t('recipe.allergens')}</h2>
            <p className="recipe__aller-label">{t('recipe.contains')}</p>
            <div className="recipe__aller-chips">
              {allergens.contains?.length ? allergens.contains.map((a) => (
                <span className="aller aller--in" key={a}>{a}</span>
              )) : <span className="aller aller--free">—</span>}
            </div>
            <p className="recipe__aller-label">{t('recipe.freeFrom')}</p>
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
          <h2 className="recipe__col-title">{t('recipe.ingredients')}</h2>
          <ul className="recipe__ingredients">
            {recipe.ingredients?.map((ing, i) => (
              <li key={i}>{ing}</li>
            ))}
          </ul>
          <button
            type="button"
            className="recipe__shopping recipe__shopping--body"
            onClick={addIngredientsToShoppingList}
          >
            {ingredientsAdded ? `✓ ${t('recipe.ingredientsAdded')}` : `🛒 ${t('recipe.addIngredients')}`}
          </button>
        </section>

        <section className="recipe__col recipe__col--method">
          <h2 className="recipe__col-title">{t('recipe.method')}</h2>
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
            onClick={startCooking}
          >
            {t('recipe.cook')}
          </button>
        </section>
      </div>

      <div className="recipe__reviews">
        <Reviews recipeId={recipe.id} />
      </div>

      {/* Reporting belongs at the foot of the page: you reach for it after
          reading, and it should never compete with "cook this". */}
      {!isAuthor && (
        <div className="recipe__report-row">
          <button
            type="button"
            className="recipe__report"
            onClick={() => !reported && setReportOpen(true)}
            disabled={reported}
          >
            ⚑ {reported ? t('report.done') : t('report.action')}
          </button>
        </div>
      )}

      <Modal
        open={Boolean(cookWarning)}
        onClose={() => setCookWarning(null)}
        className="recipe__allergy-modal"
        title={
          cookWarning?.type === 'rank' ? t('recipe.rankWarnTitle')
            : cookWarning?.type === 'setup' ? t('recipe.allergySetupTitle')
              : t('recipe.allergyConflictTitle')
        }
        footer={(
          <>
            <button type="button" className="kbtn kbtn--ghost" onClick={() => setCookWarning(null)}>
              {t('recipe.allergyCancel')}
            </button>
            {cookWarning?.type === 'setup' ? (
              <>
                <button type="button" className="kbtn kbtn--ghost" onClick={() => navigate('/settings?section=allergies')}>
                  {t('recipe.goToAllergySettings')}
                </button>
                <button type="button" className="kbtn kbtn--primary" onClick={goCook}>
                  {t('recipe.cookAnyway')}
                </button>
              </>
            ) : cookWarning?.type === 'rank' ? (
              <>
                <button type="button" className="kbtn kbtn--ghost" onClick={() => navigate('/learn')}>
                  {t('recipe.goEarnXp')}
                </button>
                {/* primary, not danger: cooking above your rank is ambitious,
                    not unsafe — the tone should match */}
                <button type="button" className="kbtn kbtn--primary" onClick={goCook}>
                  {t('recipe.cookAnyway')}
                </button>
              </>
            ) : (
              <button type="button" className="kbtn kbtn--danger" onClick={goCook}>
                {t('recipe.cookAnyway')}
              </button>
            )}
          </>
        )}
      >
        {cookWarning?.type === 'rank' ? (
          <p className="recipe__allergy-dialog">
            <span className="recipe__allergy-warning-icon" aria-hidden="true">🎯</span>
            {t('recipe.rankWarnMessage', {
              rank: recipe.rank_warning?.required_rank_name,
              yours: recipe.rank_warning?.your_rank?.tier_label,
            })}
          </p>
        ) : cookWarning?.type === 'setup' ? (
          <p className="recipe__allergy-dialog">
            <span className="recipe__allergy-warning-icon" aria-hidden="true">⚠️</span>
            {t('recipe.allergySetupMessage', { list: containedAllergens.join(', ') })}
          </p>
        ) : (
          <p className="recipe__allergy-dialog recipe__allergy-dialog--danger">
            <span className="recipe__allergy-warning-icon" aria-hidden="true">⚠️</span>
            {t('recipe.allergyConflictMessage', { list: allergyConflicts.join(', ') })}
          </p>
        )}
      </Modal>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="recipe"
        targetId={recipe.id}
        onDone={(msg) => { setReported(true); flash(msg); }}
      />

      <Toast message={toast} />
    </div>
  );
}
