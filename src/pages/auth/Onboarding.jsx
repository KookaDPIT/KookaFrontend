import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllergenCatalog, updateProfile } from '../../services/users';
import { markAllergiesAnswered, refreshUser } from '../../user';
import { ALLERGENS } from '../../lib/allergens';
import kookaLogo from '../../assets/kooka-logo-clean.png';
import './Onboarding.css';

/* ==========================================================================
   ONBOARDING — the one question we ask before the app opens.

   It is asked here rather than buried in Settings because it changes what the
   very first feed looks like: "Free of my allergens" and the warning on a
   recipe page have nothing to work with until somebody answers it. One
   question, skippable, and repeated in Settings › Allergies & diet.

   The catalogue comes from the backend (it is the vocabulary recipe allergens
   are matched against); `ALLERGENS` is the local mirror so the page paints
   instantly and still works if that call fails.
   ========================================================================== */
export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState(ALLERGENS);
  const [picked, setPicked] = useState([]);
  /* "I have none" is a separate piece of state from an empty `picked`.
     They used to be the same thing, which is why the card looked selected
     before anyone had touched it — and why somebody who tapped "not now" was
     later nagged about having no allergies exactly like somebody who had
     answered "none". */
  const [noneChosen, setNoneChosen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getAllergenCatalog()
      .then((list) => {
        if (alive && list.length) setCatalog(list);
      })
      .catch(() => { /* the local mirror is already on screen */ });
    return () => { alive = false; };
  }, []);

  const toggle = (id) => {
    setNoneChosen(false);
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  };

  const chooseNone = () => {
    setNoneChosen(true);
    setPicked([]);
  };

  /* Both a list of allergens and an explicit "none" count as an answer; an
     untouched form does not, and the save button stays out of reach until one
     of the two happens. */
  const answered = noneChosen || picked.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ allergies: picked });
      await refreshUser();
    } catch {
      /* Not worth blocking the door over — Settings offers the same form. */
    } finally {
      // Local either way: the answer is what silences the reminders, and it
      // should not depend on the network call having gone through.
      markAllergiesAnswered();
      setSaving(false);
      navigate('/home', { replace: true });
    }
  };

  return (
    <div className="onb">
      <div className="onb__card">
        <img className="onb__logo" src={kookaLogo} alt="Kooka" />
        <h1 className="onb__title">{t('onboarding.title')}</h1>
        <p className="onb__sub">{t('onboarding.subtitle')}</p>

        <div className="onb__grid">
          {catalog.map((a) => {
            const on = picked.includes(a.id);
            return (
              <button
                type="button"
                key={a.id}
                className={`onb__chip ${on ? 'is-on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle(a.id)}
              >
                <span className="onb__chip-emoji" aria-hidden="true">{a.emoji}</span>
                <span className="onb__chip-label">{a.label}</span>
                <span className="onb__chip-tick" aria-hidden="true">✓</span>
              </button>
            );
          })}
        </div>

        {/* Saying "nothing" is an answer too, and it deserves to look like one
            rather than being the state you get by not choosing. It carries the
            same tick as the allergen chips so it reads as a choice, not as a
            second way out of the page. */}
        <button
          type="button"
          className={`onb__none ${noneChosen ? 'is-on' : ''}`}
          aria-pressed={noneChosen}
          onClick={chooseNone}
        >
          <span className="onb__none-text">
            <b>{t('onboarding.noneTitle')}</b>
            <small>{t('onboarding.noneHint')}</small>
          </span>
          <span className="onb__none-tick" aria-hidden="true">✓</span>
        </button>

        <div className="onb__actions">
          <button type="button" className="onb__save" onClick={save} disabled={saving || !answered}>
            {saving ? t('onboarding.saving') : t('onboarding.save')}
          </button>
        </div>

        {/* Leaving without answering is deliberately the quiet option: a plain
            text link under the actions, not a button beside the save. It is
            also the one that keeps the reminders coming. */}
        <button
          type="button"
          className="onb__skip"
          onClick={() => navigate('/home', { replace: true })}
        >
          {t('onboarding.skip')}
          <small>{t('onboarding.skipHint')}</small>
        </button>

        <p className="onb__later">{t('onboarding.later')}</p>
      </div>
    </div>
  );
}
