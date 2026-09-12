import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './MealPlan.css';

const SHOPPING_KEY = 'kooka_shopping_list';
const MEALS_KEY = 'kooka_meal_plan';
const INGREDIENTS = [
  'Eggs', 'Milk', 'Butter', 'Parmesan', 'Pecorino', 'Chicken breast',
  'Tomatoes', 'Onions', 'Garlic', 'Potatoes', 'Spinach', 'Mushrooms',
  'Rice', 'Pasta', 'Flour', 'Olive oil', 'Lemons', 'Carrots', 'Salt',
  'Black pepper', 'Fresh herbs',
];

function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The page remains usable when storage is unavailable.
  }
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(12, 0, 0, 0);
  return result;
}

export default function MealPlan() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [shopping, setShopping] = useState(() => read(SHOPPING_KEY, []));
  const [meals, setMeals] = useState(() => read(MEALS_KEY, {}));
  const [ingredient, setIngredient] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [recipe, setRecipe] = useState('');
  const [selectedDate, setSelectedDate] = useState(dayKey(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const selectedMeals = meals[selectedDate] || [];

  const suggestions = useMemo(() => {
    const query = ingredient.trim().toLowerCase();
    if (!query) return INGREDIENTS.slice(0, 8);
    return INGREDIENTS.filter((item) => item.toLowerCase().includes(query)).slice(0, 8);
  }, [ingredient]);

  const week = useMemo(() => {
    const first = startOfWeek(new Date());
    first.setDate(first.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(first);
      date.setDate(first.getDate() + index);
      return date;
    });
  }, [weekOffset]);

  const addIngredient = (event) => {
    event.preventDefault();
    const name = ingredient.trim();
    if (!name) return;
    const existing = shopping.find((item) => item.name.toLowerCase() === name.toLowerCase());
    const next = existing
      ? shopping.map((item) => item.name === existing.name
        ? { ...item, quantity: item.quantity + Number(quantity) } : item)
      : [...shopping, { id: `${name}-${Date.now()}`, name, quantity: Number(quantity) }];
    setShopping(next);
    save(SHOPPING_KEY, next);
    setIngredient('');
    setQuantity(1);
  };

  const removeIngredient = (id) => {
    const next = shopping.filter((item) => item.id !== id);
    setShopping(next);
    save(SHOPPING_KEY, next);
  };

  const scheduleMeal = (event) => {
    event.preventDefault();
    const name = recipe.trim();
    if (!name || !selectedDate) return;
    const next = {
      ...meals,
      [selectedDate]: [...(meals[selectedDate] || []), { title: name }],
    };
    setMeals(next);
    save(MEALS_KEY, next);
    setRecipe('');
  };

  const removeMeal = (date, index) => {
    const next = { ...meals, [date]: meals[date].filter((_, itemIndex) => itemIndex !== index) };
    if (!next[date].length) delete next[date];
    setMeals(next);
    save(MEALS_KEY, next);
  };

  const locale = i18n.language?.startsWith('ro') ? 'ro-RO' : 'en-US';

  return (
    <div className="meal-plan">
      <header className="meal-plan__header">
        <p className="meal-plan__eyebrow">KOOKA</p>
        <h1>{t('mealPlan.title')}</h1>
        <p>{t('mealPlan.subtitle')}</p>
      </header>

      <div className="meal-plan__grid">
        <section className="meal-plan__card">
          <div className="meal-plan__card-heading">
            <div>
              <span className="meal-plan__icon">🛒</span>
              <h2>{t('mealPlan.shoppingTitle')}</h2>
            </div>
            <span className="meal-plan__count">{shopping.length}</span>
          </div>
          <p className="meal-plan__hint">{t('mealPlan.shoppingHint')}</p>

          <form className="meal-plan__ingredient-form" onSubmit={addIngredient}>
            <div className="meal-plan__search-wrap">
              <input
                value={ingredient}
                onChange={(event) => setIngredient(event.target.value)}
                placeholder={t('mealPlan.ingredientPlaceholder')}
                aria-label={t('mealPlan.ingredientPlaceholder')}
              />
              {ingredient && suggestions.length > 0 && (
                <div className="meal-plan__suggestions">
                  {suggestions.map((item) => (
                    <button type="button" key={item} onClick={() => setIngredient(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="meal-plan__quantity">
              <span>{t('mealPlan.quantity')}</span>
              <input type="number" min="1" value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} />
            </label>
            <button className="meal-plan__primary" type="submit">{t('mealPlan.add')}</button>
          </form>

          <ul className="meal-plan__shopping-list">
            {shopping.map((item) => (
              <li key={item.id}>
                <span>{item.quantity != null && <b>{item.quantity}× </b>}{item.name}</span>
                <button type="button" onClick={() => removeIngredient(item.id)}>
                  {t('mealPlan.remove')}
                </button>
              </li>
            ))}
          </ul>
          {shopping.length === 0 && <p className="meal-plan__empty">{t('mealPlan.emptyShopping')}</p>}
        </section>

        <section className="meal-plan__card meal-plan__calendar-card">
          <div className="meal-plan__card-heading">
            <div>
              <span className="meal-plan__icon">📅</span>
              <h2>{t('mealPlan.calendarTitle')}</h2>
            </div>
          </div>
          <p className="meal-plan__hint">{t('mealPlan.calendarHint')}</p>
          <form className="meal-plan__schedule-form" onSubmit={scheduleMeal}>
            <input
              className="meal-plan__recipe-input"
              type="text"
              value={recipe}
              onChange={(event) => setRecipe(event.target.value)}
              placeholder={t('mealPlan.recipePlaceholder')}
              aria-label={t('mealPlan.recipePlaceholder')}
            />
            <div className="meal-plan__schedule-actions">
              <input
                className="meal-plan__date-input"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                aria-label={t('mealPlan.calendarTitle')}
              />
              <button className="meal-plan__primary" type="submit">{t('mealPlan.schedule')}</button>
            </div>
          </form>
          <div className="meal-plan__week-controls">
            <button type="button" onClick={() => setWeekOffset((value) => value - 1)}>‹</button>
            <strong>{week[0].toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – {week[6].toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</strong>
            <button type="button" onClick={() => setWeekOffset((value) => value + 1)}>›</button>
          </div>
          <div className="meal-plan__week">
            {week.map((date) => {
              const key = dayKey(date);
              const items = meals[key] || [];
              return (
                <button
                  type="button"
                  className={`meal-plan__day${selectedDate === key ? ' is-selected' : ''}`}
                  key={key}
                  onClick={() => setSelectedDate(key)}
                >
                  <span>{date.toLocaleDateString(locale, { weekday: 'short' })}</span>
                  <b>{date.getDate()}</b>
                  {items.length > 0
                    ? <span className="meal-plan__day-count">{items.length} {t('mealPlan.planned')}</span>
                    : <small>{t('mealPlan.emptyDay')}</small>}
                </button>
              );
            })}
          </div>
          <section className="meal-plan__selected-day">
            <div className="meal-plan__selected-heading">
              <h3>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(locale, {
                weekday: 'long', month: 'long', day: 'numeric',
              })}</h3>
              <span>{selectedMeals.length}</span>
            </div>
            {selectedMeals.length > 0 ? (
              <div className="meal-plan__selected-list">
                {selectedMeals.map((item, index) => (
                  <div className="meal-plan__selected-meal" key={`${typeof item === 'string' ? item : item.title}-${index}`}>
                    <span className="meal-plan__meal-dot" />
                    {typeof item === 'object' && item.id ? (
                      <button
                        type="button"
                        className="meal-plan__recipe-link"
                        onClick={() => navigate(`/recipe/${item.id}`)}
                      >
                        {item.title}
                      </button>
                    ) : <strong>{typeof item === 'string' ? item : item.title}</strong>}
                    <button type="button" onClick={() => removeMeal(selectedDate, index)} aria-label={t('mealPlan.remove')}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : <p className="meal-plan__empty">{t('mealPlan.emptyDay')}</p>}
          </section>
        </section>
      </div>
    </div>
  );
}
