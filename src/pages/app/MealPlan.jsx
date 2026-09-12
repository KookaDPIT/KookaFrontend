import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  listShopping, addShoppingItem, updateShoppingItem, deleteShoppingItem,
  clearShopping, listMeals, addMeal, deleteMeal, mealToShopping, MEAL_SLOTS,
} from '../../services/planner';
import { search as searchAll } from '../../services/search';
import Toast from '../../components/Toast';
import './MealPlan.css';

/* ==========================================================================
   MEAL PLAN — the shopping list and the week's calendar.

   Both used to live in localStorage: the list you wrote on your phone was not
   there on the laptop, and clearing site data took the week with it. They are
   rows on the account now (`/planner/*`), which is also what lets the
   assistant in AI Chat write to them — "add what I need for Friday" ends up in
   exactly the same place as the buttons here.
   ========================================================================== */

/* Local date key. `toISOString()` converts to UTC first, so anyone east of
   Greenwich got yesterday's key for anything before 02:00 or 03:00 — meals
   landed on the wrong day. */
function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(12, 0, 0, 0);
  return result;
}

/* Units offered next to a quantity. Free text is still allowed — people write
   "a bunch" — but the common ones should be one tap. */
const UNITS = ['', 'g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'pcs'];

export default function MealPlan() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [shopping, setShopping] = useState(null);
  const [meals, setMeals] = useState([]);
  const [toast, setToast] = useState('');

  // add-to-list form
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [busy, setBusy] = useState(false);

  // the line being edited in place, and its working copy
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: '', quantity: '', unit: '' });
  const editNameRef = useRef(null);

  // calendar
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => dayKey(new Date()));
  const [slot, setSlot] = useState('dinner');
  const [recipeQuery, setRecipeQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [picked, setPicked] = useState(null); // a real recipe, when one was chosen

  const locale = i18n.language?.startsWith('ro') ? 'ro-RO' : 'en-US';

  const flash = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  }, []);

  const week = useMemo(() => {
    const first = startOfWeek(new Date());
    first.setDate(first.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(first);
      date.setDate(first.getDate() + index);
      return date;
    });
  }, [weekOffset]);

  const weekStart = dayKey(week[0]);
  const weekEnd = dayKey(week[6]);

  // ---- loads -------------------------------------------------------------
  const reloadShopping = useCallback(
    () => listShopping().then(setShopping).catch(() => setShopping([])),
    [],
  );

  useEffect(() => { reloadShopping(); }, [reloadShopping]);

  const [mealsFor, setMealsFor] = useState(null);
  useEffect(() => {
    const range = `${weekStart}:${weekEnd}`;
    let alive = true;
    listMeals({ start: weekStart, end: weekEnd })
      .then((data) => {
        if (!alive) return;
        setMeals(data.entries || []);
        setMealsFor(range);
      })
      .catch(() => {
        if (!alive) return;
        setMeals([]);
        setMealsFor(range);
      });
    return () => { alive = false; };
  }, [weekStart, weekEnd]);

  const reloadMeals = useCallback(
    () => listMeals({ start: weekStart, end: weekEnd })
      .then((data) => setMeals(data.entries || []))
      .catch(() => {}),
    [weekStart, weekEnd],
  );

  /* Look up real recipes as you type, so a planned meal can carry a link to
     the dish instead of being a bare string. Typing your own text still works
     — not everything you cook is in the app. */
  const query = recipeQuery.trim();
  // too short, or you already picked the thing in the box: nothing to look up
  const wantsSuggestions = query.length >= 2 && picked?.title !== query;

  useEffect(() => {
    if (!wantsSuggestions) return undefined;
    let alive = true;
    const id = window.setTimeout(() => {
      searchAll(query)
        .then((res) => alive && setMatches((res.recipes || []).slice(0, 6)))
        .catch(() => alive && setMatches([]));
    }, 300);
    return () => { alive = false; window.clearTimeout(id); };
  }, [query, wantsSuggestions]);

  // held results only count while we still want them
  const suggestions = wantsSuggestions ? matches : [];

  // ---- shopping list -----------------------------------------------------
  const submitItem = async (event) => {
    event.preventDefault();
    const clean = name.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      await addShoppingItem({ name: clean, quantity: quantity.trim(), unit });
      setName('');
      setQuantity('');
      setUnit('');
      await reloadShopping();
    } catch {
      flash(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditDraft({ name: item.name, quantity: item.quantity || '', unit: item.unit || '' });
    // focus after the inputs exist
    window.requestAnimationFrame(() => editNameRef.current?.focus());
  };

  const saveEdit = async (event) => {
    event?.preventDefault();
    const clean = editDraft.name.trim();
    if (!clean) return;
    const id = editingId;
    setEditingId(null);
    try {
      const saved = await updateShoppingItem(id, {
        name: clean,
        quantity: editDraft.quantity.trim(),
        unit: editDraft.unit,
      });
      setShopping((list) => list.map((i) => (i.id === id ? saved : i)));
    } catch {
      flash(t('common.error'));
      reloadShopping();
    }
  };

  /* Ticking is optimistic: in a shop you tap down a list quickly, and a
     round-trip per tap would make it feel broken. */
  const toggleChecked = async (item) => {
    const next = !item.checked;
    setShopping((list) => list.map((i) => (i.id === item.id ? { ...i, checked: next } : i)));
    try {
      await updateShoppingItem(item.id, { checked: next });
    } catch {
      setShopping((list) => list.map((i) => (i.id === item.id ? { ...i, checked: !next } : i)));
    }
  };

  const removeItem = async (item) => {
    const before = shopping;
    setShopping((list) => list.filter((i) => i.id !== item.id));
    try {
      await deleteShoppingItem(item.id);
    } catch {
      setShopping(before);
      flash(t('common.error'));
    }
  };

  const clearTicked = async () => {
    try {
      await clearShopping(true);
      await reloadShopping();
    } catch {
      flash(t('common.error'));
    }
  };

  // ---- calendar ----------------------------------------------------------
  const schedule = async (event) => {
    event.preventDefault();
    const title = recipeQuery.trim();
    if (!title && !picked) return;
    try {
      await addMeal({
        date: selectedDate,
        title: picked ? picked.title : title,
        recipeId: picked ? picked.id : null,
        slot,
      });
      setRecipeQuery('');
      setPicked(null);
      setMatches([]);
      await reloadMeals();
    } catch {
      flash(t('common.error'));
    }
  };

  const removeMeal = async (entry) => {
    const before = meals;
    setMeals((list) => list.filter((m) => m.id !== entry.id));
    try {
      await deleteMeal(entry.id);
    } catch {
      setMeals(before);
      flash(t('common.error'));
    }
  };

  const sendToShopping = async (entry) => {
    try {
      const res = await mealToShopping(entry.id);
      await reloadShopping();
      flash(t('mealPlan.ingredientsAdded', { count: res.added }));
    } catch {
      flash(t('mealPlan.noIngredients'));
    }
  };

  const byDay = useMemo(() => {
    const map = {};
    meals.forEach((entry) => {
      (map[entry.date] = map[entry.date] || []).push(entry);
    });
    return map;
  }, [meals]);

  const selectedMeals = byDay[selectedDate] || [];
  const openItems = (shopping || []).filter((i) => !i.checked);
  const doneItems = (shopping || []).filter((i) => i.checked);
  const todayKey = dayKey(new Date());

  /* The header used to read "Sep 8 – Sep 14" with no year, which is unreadable
     the moment you page a few weeks forward — or across New Year. */
  const rangeLabel = useMemo(() => {
    const sameYear = week[0].getFullYear() === week[6].getFullYear();
    const left = week[0].toLocaleDateString(locale, {
      month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }),
    });
    const right = week[6].toLocaleDateString(locale, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    return `${left} – ${right}`;
  }, [week, locale]);

  return (
    <div className="meal-plan">
      <header className="meal-plan__header">
        <p className="meal-plan__eyebrow">KOOKA</p>
        <h1>{t('mealPlan.title')}</h1>
        <p>{t('mealPlan.subtitle')}</p>
      </header>

      <div className="meal-plan__grid">
        {/* ===== SHOPPING LIST ============================================ */}
        <section className="meal-plan__card">
          <div className="meal-plan__card-heading">
            <div>
              <span className="meal-plan__icon" aria-hidden="true">🛒</span>
              <h2>{t('mealPlan.shoppingTitle')}</h2>
            </div>
            <span className="meal-plan__count">{openItems.length}</span>
          </div>
          <p className="meal-plan__hint">{t('mealPlan.shoppingHint')}</p>

          <form className="meal-plan__ingredient-form" onSubmit={submitItem}>
            <input
              className="meal-plan__name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('mealPlan.ingredientPlaceholder')}
              aria-label={t('mealPlan.ingredientPlaceholder')}
            />
            <div className="meal-plan__amount">
              <input
                className="meal-plan__qty-input"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder={t('mealPlan.quantity')}
                aria-label={t('mealPlan.quantity')}
                inputMode="decimal"
              />
              <select
                className="meal-plan__unit-input"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                aria-label={t('mealPlan.unit')}
              >
                {UNITS.map((u) => (
                  <option key={u || 'none'} value={u}>{u || '—'}</option>
                ))}
              </select>
              <button className="meal-plan__primary" type="submit" disabled={busy}>
                {t('mealPlan.add')}
              </button>
            </div>
          </form>

          {shopping === null ? (
            <p className="meal-plan__empty">{t('common.loading')}…</p>
          ) : shopping.length === 0 ? (
            <p className="meal-plan__empty">{t('mealPlan.emptyShopping')}</p>
          ) : (
            <ul className="meal-plan__shopping-list">
              {[...openItems, ...doneItems].map((item) => (
                <li key={item.id} className={item.checked ? 'is-done' : ''}>
                  {editingId === item.id ? (
                    /* Editing in place: in front of the shelf you correct the
                       amount, you do not delete the line and retype it. */
                    <form className="meal-plan__edit" onSubmit={saveEdit}>
                      <input
                        ref={editNameRef}
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                        aria-label={t('mealPlan.ingredientPlaceholder')}
                      />
                      <input
                        className="meal-plan__qty-input"
                        value={editDraft.quantity}
                        onChange={(e) => setEditDraft((d) => ({ ...d, quantity: e.target.value }))}
                        placeholder={t('mealPlan.quantity')}
                        aria-label={t('mealPlan.quantity')}
                        inputMode="decimal"
                      />
                      <select
                        className="meal-plan__unit-input"
                        value={editDraft.unit}
                        onChange={(e) => setEditDraft((d) => ({ ...d, unit: e.target.value }))}
                        aria-label={t('mealPlan.unit')}
                      >
                        {UNITS.map((u) => (
                          <option key={u || 'none'} value={u}>{u || '—'}</option>
                        ))}
                      </select>
                      <button type="submit" className="meal-plan__primary meal-plan__primary--sm">
                        {t('common.save')}
                      </button>
                      <button
                        type="button"
                        className="meal-plan__linkbtn"
                        onClick={() => setEditingId(null)}
                      >
                        {t('common.cancel')}
                      </button>
                    </form>
                  ) : (
                    <>
                      <label className="meal-plan__tick">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleChecked(item)}
                        />
                        <span className="meal-plan__item-text">
                          {(item.quantity || item.unit) && (
                            <b>{[item.quantity, item.unit].filter(Boolean).join(' ')} </b>
                          )}
                          {item.name}
                        </span>
                      </label>
                      <span className="meal-plan__item-actions">
                        <button
                          type="button"
                          className="meal-plan__linkbtn"
                          onClick={() => startEdit(item)}
                        >
                          {t('mealPlan.edit')}
                        </button>
                        <button
                          type="button"
                          className="meal-plan__linkbtn"
                          onClick={() => removeItem(item)}
                        >
                          {t('mealPlan.remove')}
                        </button>
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {doneItems.length > 0 && (
            <button type="button" className="meal-plan__linkbtn meal-plan__clear" onClick={clearTicked}>
              {t('mealPlan.clearTicked', { count: doneItems.length })}
            </button>
          )}
        </section>

        {/* ===== CALENDAR ================================================ */}
        <section className="meal-plan__card meal-plan__calendar-card">
          <div className="meal-plan__card-heading">
            <div>
              <span className="meal-plan__icon" aria-hidden="true">📅</span>
              <h2>{t('mealPlan.calendarTitle')}</h2>
            </div>
          </div>
          <p className="meal-plan__hint">{t('mealPlan.calendarHint')}</p>

          <form className="meal-plan__schedule-form" onSubmit={schedule}>
            <div className="meal-plan__search-wrap">
              <input
                className="meal-plan__recipe-input"
                type="text"
                value={recipeQuery}
                onChange={(event) => { setRecipeQuery(event.target.value); setPicked(null); }}
                placeholder={t('mealPlan.recipePlaceholder')}
                aria-label={t('mealPlan.recipePlaceholder')}
              />
              {suggestions.length > 0 && (
                <div className="meal-plan__suggestions">
                  {suggestions.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => { setPicked(r); setRecipeQuery(r.title); setMatches([]); }}
                    >
                      {r.title}
                      {r.meta?.time && <small> · {r.meta.time}</small>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="meal-plan__schedule-actions">
              <input
                className="meal-plan__date-input"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                aria-label={t('mealPlan.calendarTitle')}
              />
              <select
                className="meal-plan__slot-input"
                value={slot}
                onChange={(event) => setSlot(event.target.value)}
                aria-label={t('mealPlan.slot')}
              >
                {MEAL_SLOTS.map((s) => (
                  <option key={s} value={s}>{t(`mealPlan.slots.${s}`)}</option>
                ))}
              </select>
              <button className="meal-plan__primary" type="submit">{t('mealPlan.schedule')}</button>
            </div>
          </form>

          <div className="meal-plan__week-controls">
            <button type="button" onClick={() => setWeekOffset((v) => v - 1)}
              aria-label={t('mealPlan.prevWeek')}>‹</button>
            {/* the year matters the moment you page forward a few weeks */}
            <strong>{rangeLabel}</strong>
            <button type="button" onClick={() => setWeekOffset((v) => v + 1)}
              aria-label={t('mealPlan.nextWeek')}>›</button>
          </div>
          {weekOffset !== 0 && (
            <button type="button" className="meal-plan__linkbtn meal-plan__today"
              onClick={() => { setWeekOffset(0); setSelectedDate(todayKey); }}>
              {t('mealPlan.thisWeek')}
            </button>
          )}

          <div className="meal-plan__week">
            {week.map((date) => {
              const key = dayKey(date);
              const items = byDay[key] || [];
              return (
                <button
                  type="button"
                  className={`meal-plan__day${selectedDate === key ? ' is-selected' : ''}${key === todayKey ? ' is-today' : ''}`}
                  key={key}
                  onClick={() => setSelectedDate(key)}
                >
                  <span className="meal-plan__day-name">
                    {date.toLocaleDateString(locale, { weekday: 'short' })}
                  </span>
                  <b>{date.getDate()}</b>
                  <span className="meal-plan__day-month">
                    {date.toLocaleDateString(locale, { month: 'short' })}
                  </span>
                  {items.length > 0 ? (
                    /* The word is hidden on a phone, where the pill is only
                       62px wide — the count alone is the signal, and the day
                       panel underneath spells it out. */
                    <span className="meal-plan__day-count">
                      {items.length}
                      <span className="meal-plan__day-count-word"> {t('mealPlan.planned')}</span>
                    </span>
                  ) : <small>{t('mealPlan.emptyDay')}</small>}
                </button>
              );
            })}
          </div>

          <section className="meal-plan__selected-day">
            <div className="meal-plan__selected-heading">
              <h3>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(locale, {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}</h3>
              <span>{selectedMeals.length}</span>
            </div>
            {selectedMeals.length > 0 ? (
              <div className="meal-plan__selected-list">
                {selectedMeals.map((entry) => (
                  <div className="meal-plan__selected-meal" key={entry.id}>
                    <span className="meal-plan__meal-slot">{t(`mealPlan.slots.${entry.slot}`)}</span>
                    {entry.recipe ? (
                      <button
                        type="button"
                        className="meal-plan__recipe-link"
                        onClick={() => navigate(`/recipe/${entry.recipe.id}`)}
                      >
                        {entry.title}
                      </button>
                    ) : <strong>{entry.title}</strong>}
                    {entry.recipe && (
                      <button
                        type="button"
                        className="meal-plan__linkbtn"
                        onClick={() => sendToShopping(entry)}
                        title={t('mealPlan.toShopping')}
                      >
                        🛒
                      </button>
                    )}
                    <button
                      type="button"
                      className="meal-plan__linkbtn"
                      onClick={() => removeMeal(entry)}
                      aria-label={t('mealPlan.remove')}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="meal-plan__empty">
                {mealsFor ? t('mealPlan.emptyDay') : `${t('common.loading')}…`}
              </p>
            )}
          </section>
        </section>
      </div>

      <Toast message={toast} />
    </div>
  );
}
