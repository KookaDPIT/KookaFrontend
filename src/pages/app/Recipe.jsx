import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRecipe, moderateRecipe } from '../../services/recipes';
import ModerationBar from '../../components/ModerationBar';
import { countryOf } from '../../data/countries';
import { useUser } from '../../user';
import Reviews from '../../components/Reviews';
import { IconBack, IconClock } from '../../components/Icons';
import RankBadge, { RankPill } from '../../components/RankBadge';
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

function Gauge({ value, unit, label, pct }) {
  const p = Math.max(0, Math.min(1, pct));
  const zone = p < 0.55 ? '#3fae6f' : p < 0.8 ? '#ef9f3c' : '#e5533a';
  const [nx, ny] = gaugePoint(p, G.r - 7);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="gauge">
      <svg viewBox="0 0 100 58" className="gauge__svg" aria-hidden="true">
        <path className="gauge__track" d={gaugeArc(0, 1)} />
        <path className="gauge__zone gauge__zone--green" d={gaugeArc(0, 0.55)} />
        <path className="gauge__zone gauge__zone--amber" d={gaugeArc(0.55, 0.8)} />
        <path className="gauge__zone gauge__zone--red" d={gaugeArc(0.8, 1)} />
        {ticks.map((f) => {
          const [x1, y1] = gaugePoint(f, G.r);
          const [x2, y2] = gaugePoint(f, G.r - 5);
          return <line key={f} x1={x1} y1={y1} x2={x2} y2={y2} className="gauge__tick" />;
        })}
        <line x1={G.cx} y1={G.cy} x2={nx.toFixed(2)} y2={ny.toFixed(2)} className="gauge__needle" />
        <circle cx={G.cx} cy={G.cy} r="4" className="gauge__hub" />
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
  const [user] = useUser();
  /* One state object rather than three: the outcome of a load is exactly one
     of loading / ok / rank-locked / error, and keeping them together means the
     effect never has to reset anything synchronously.

     Recipes above your rank come back as a 403 carrying what you'd need to
     reach, which we render as its own screen rather than a generic error. */
  const [view, setView] = useState({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    getRecipe(id)
      .then((r) => alive && setView({ status: 'ok', recipe: r }))
      .catch((err) => {
        if (!alive) return;
        const detail = err?.response?.data?.detail;
        if (err?.response?.status === 403 && detail?.required_rank) {
          setView({ status: 'locked', lock: detail });
        } else {
          setView({ status: 'error' });
        }
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const recipe = view.status === 'ok' ? view.recipe : null;
  const rankLock = view.status === 'locked' ? view.lock : null;

  if (view.status === 'loading') {
    return <div className="recipe recipe--state">{t('common.loading')}…</div>;
  }
  if (rankLock) {
    return (
      <div className="recipe recipe--state recipe--locked">
        <RankBadge rank={rankLock.required_rank} size={104}
                   title={rankLock.required_rank_name} />
        <h1 className="recipe__lockTitle">{rankLock.recipe?.title}</h1>
        <p className="recipe__lockMsg">
          {t('recipe.rankLocked', { rank: rankLock.required_rank_name })}
        </p>
        <p className="recipe__lockRank">
          {t('recipe.yourRankIs', { rank: rankLock.your_rank?.tier_label })}
          {rankLock.your_rank && !rankLock.your_rank.is_max && (
            <> · {t('recipe.xpToGo', {
              xp: rankLock.your_rank.xp_to_next?.toLocaleString(),
            })}</>
          )}
        </p>
        <div className="recipe__lockActions">
          <button type="button" className="recipe__cook" onClick={() => navigate('/learn')}>
            {t('recipe.goEarnXp')}
          </button>
          <button type="button" className="recipe__lockBack" onClick={() => navigate('/home')}>
            {t('common.back')}
          </button>
        </div>
      </div>
    );
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

            {/* You told us to avoid these. Better here, before the shopping
                list, than three steps into the method. */}
            {recipe.allergen_conflicts?.length > 0 && (
              <p className="recipe__allergy-warn">
                ⚠️ {t('recipe.allergyWarning', { list: recipe.allergen_conflicts.join(', ') })}
              </p>
            )}

            <div className="recipe__cta">
              <button
                type="button"
                className="recipe__cook recipe__cook--full"
                onClick={() => navigate(`/recipe/${recipe.id}/cook`)}
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
                <Gauge key={n.key} value={n.value} unit={n.unit} label={n.label} pct={n.value / n.max} />
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
            onClick={() => navigate(`/recipe/${recipe.id}/cook`)}
          >
            {t('recipe.cook')}
          </button>
        </section>
      </div>

      <div className="recipe__reviews">
        <Reviews recipeId={recipe.id} />
      </div>
    </div>
  );
}
