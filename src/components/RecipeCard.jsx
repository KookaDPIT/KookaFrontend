import { Link } from 'react-router-dom';
import { countryOf } from '../data/countries';
import Stars from './Stars';
import './RecipeCard.css';

/* Feed / search recipe card. Expects the backend recipe shape. */
export default function RecipeCard({ recipe }) {
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
          <span className="rcard__flag" title={country.name}>
            {country.flag}
          </span>
        )}
      </div>

      <div className="rcard__body">
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
