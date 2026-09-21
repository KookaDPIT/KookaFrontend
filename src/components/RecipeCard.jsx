import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { countryOf } from '../data/countries';
import Flag from './Flag';
import { courseEmoji } from '../lib/courses';
import BookmarkButton from './BookmarkButton';
import Stars from './Stars';
import { RankPill } from './RankBadge';
import './RecipeCard.css';

/* Feed / search recipe card. Expects the backend recipe shape. */
export default function RecipeCard({ recipe }) {
  const { t } = useTranslation();
  if (!recipe) return null;
  const country = recipe.origin ? countryOf(recipe.origin) : null;

  return (
    <Link to={`/recipe/${recipe.id}`} className="rcard">
      <div
        className="rcard__photo"
        style={recipe.image_url ? { backgroundImage: `url(${recipe.image_url})` } : undefined}
      >
        {!recipe.image_url && <span className="rcard__placeholder">🍳</span>}
        {country && (
          <Flag code={country.c2} title={country.name} className="rcard__flag" />
        )}
        {/* Save for later, without leaving whatever list you are scrolling.
            The card is a <Link>, so the button stops the click itself. */}
        <BookmarkButton recipeId={recipe.id} className="rcard__bmk" />
        {recipe.rank && (
          /* `locked` used to mean the recipe would not open at all, and the
             card said so with a padlock and a grey veil over the photo. It no
             longer blocks anything — it only means the dish is rated above
             your rank — so the pill carries the whole message and the photo
             stays exactly as appetising as everyone else's. */
          <span className="rcard__rank">
            <RankPill rank={recipe.rank} label={recipe.rank_name} />
          </span>
        )}
      </div>

      <div className="rcard__body">
        {/* The course is now a filter, so it belongs on the card: after
            filtering by "dessert" you should be able to see, without opening
            anything, that the filter did what you asked. */}
        {recipe.course && (
          <span className="rcard__course">
            <span aria-hidden="true">{courseEmoji(recipe.course)}</span>
            {t(`courses.${recipe.course}`, recipe.course_name || recipe.course)}
          </span>
        )}
        <h3 className="rcard__title">{recipe.title}</h3>
        {recipe.description && <p className="rcard__desc">{recipe.description}</p>}

        <div className="rcard__foot">
          <span className="rcard__meta">
            {recipe.meta?.time || ''}
            {recipe.meta?.time && recipe.meta?.kcal ? ' · ' : ''}
            {recipe.meta?.kcal || ''}
          </span>
          {recipe.review_count > 0 ? (
            <span className="rcard__rating">
              <Stars value={Math.round(recipe.avg_rating)} size={14} />
              <span className="rcard__count">({recipe.review_count})</span>
            </span>
          ) : (
            <span className="rcard__new">new</span>
          )}
        </div>
      </div>
    </Link>
  );
}
