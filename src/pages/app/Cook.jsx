import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRecipe } from '../../services/recipes';
import { askWhileCooking } from '../../services/ai';
import { verifyCook } from '../../services/reviews';
import { reportCookEvent, startCookSession } from '../../services/cooking';
import { refreshUser } from '../../user';
import { armTimer, endCook, startCook, updateCook, useCookSession } from '../../cook';
import { RECIPE_RANKS } from '../../lib/ranks';
import { languageName } from '../../lib/languages';
import Modal from '../../components/Modal';
import CookTimer from '../../components/CookTimer';
import { KookaAvatar, IconSparkle, IconSend, IconHome, IconBack } from '../../components/Icons';
import { translateRecipe } from '../../services/recipes';
import { cameraSupported } from '../../lib/camera';
import CameraCapture from '../../components/CameraCapture';
import './Cook.css';

/* ==========================================================================
   COOK — step-by-step cook-along for one recipe.

   The inline "Ask Kooka" panel talks to POST /ai/cook/:id. The backend holds
   the recipe, so we only send the current step index and the last few turns —
   that is what makes "how long does this take?" answer about the step actually
   on screen instead of the recipe in general.

   `localCookReply` is the offline fallback: if the AI call fails we still say
   something useful from the recipe data we already have on the client.

   Where you are in the recipe — and the step timer — live in the shared cook
   session (src/cook.js), not in this component. That is what lets you leave
   for the forum mid-braise and come back to step 4 with the clock still
   honest, and what the corner dock reads while you are away.
   ========================================================================== */

function localCookReply(text, { step, stepNo, title }) {
  const s = text.toLowerCase();
  if (/repeat|step|again|read/.test(s)) return `Step ${stepNo}: ${step.text}`;
  if (/time|minute|timer|long|how much/.test(s)) {
    return step.timer
      ? `This step runs about ${step.timer}. Use the timer on the left — hit play and I'll keep it going.`
      : 'No fixed timer on this step — go by look and feel rather than the clock.';
  }
  if (/wrong|burn|salt|help|stuck|mistake/.test(s)) {
    return `Take the pan off the heat for a second and breathe. Tell me exactly what happened on step ${stepNo} and I'll walk you back on track.`;
  }
  return `I'm right here while you cook ${title}. Ask about the current step, timing, or a fix and I'll help.`;
}

let cid = 1;
const nextId = () => `c${cid++}`;

export default function Cook() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [recipe, setRecipe] = useState(undefined);

  const session = useCookSession();
  const recipeId = Number(id);
  /* The session is the source of truth for the step, so leaving and coming
     back lands where you were. Until it exists (first paint, or a session for
     a different recipe) we show step 1. */
  const stepIndex =
    session && session.recipeId === recipeId ? session.stepIndex : 0;
  const setStepIndex = (next) =>
    updateCook({
      stepIndex: typeof next === 'function' ? next(stepIndex) : next,
    });

  // "I cooked it" verification flow — the photo is sent straight to the AI and
  // never stored (no ImageKit upload).
  const [showFinish, setShowFinish] = useState(false);
  // giving up: the photo check is never reached, so the recipe's XP is not won
  const [forfeitOpen, setForfeitOpen] = useState(false);
  const [cookFile, setCookFile] = useState(null);
  const [cookPreview, setCookPreview] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [camOpen, setCamOpen] = useState(false);
  const hasCamera = cameraSupported();
  // Off by default — the translation is opt-in, same as on the recipe page.
  const [englishOverride, setEnglishOverride] = useState(false);
  /* The steps in the reader's own language, fetched on request. Same endpoint
     and same cache as the recipe page — ask for it there and it is already
     waiting here. */
  const [translation, setTranslation] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [transErr, setTransErr] = useState(false);
  const fileRef = useRef(null);

  /* The attempt being recorded on the backend. Every trophy that asks HOW a
     dish went — how fast, how much help, timers skipped, gave up and came back
     — reads that row; none of it survives in the finished state. Held in a ref
     because nothing on screen depends on it and a re-render per event would be
     pure waste. `askedSteps` keeps `ai_steps` counting distinct steps rather
     than questions, which is what "Yes Chef" actually asks. */
  const sessionRef = useRef(null);
  const askedSteps = useRef(new Set());
  const leftAppRef = useRef(false);

  useEffect(() => {
    getRecipe(id)
      .then((r) => {
        setRecipe(r);
        startCook(r);
        const list = r?.steps || [];
        startCookSession(r.id, {
          stepsTotal: list.length,
          timersAvailable: list.filter((step) => step?.timer).length,
        }).then((sessionId) => { sessionRef.current = sessionId; });
      })
      .catch(() => setRecipe(null));
  }, [id]);

  /* "Locked In Cookin'" is the one trophy you lose by leaving, so leaving has
     to be observed. `visibilitychange` covers switching tab, switching app and
     locking the phone; it is reported once per session, because the trophy is
     about whether you left at all, not how often. */
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== 'hidden' || leftAppRef.current) return;
      leftAppRef.current = true;
      reportCookEvent(sessionRef.current, { left_app: true });
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  /* Cook in the language the recipe was written in; English on request.

     Only the TEXT comes from the original — timers, labels and the step count
     stay on the canonical steps, which is also what the AI assistant reads
     (it is given the step index, not the words). The backend guarantees the
     two lists line up: a translation whose length does not match is rejected
     outright (services/ai.translate_recipe). */
  const original = recipe?.original;
  const englishSteps = recipe?.steps || [];

  /* Swap only the words of each step, keeping the canonical list's timers,
     labels and order. Any source whose length does not match is ignored
     rather than zipped into the wrong steps. */
  const withText = (source) => (
    source?.length === englishSteps.length
      ? englishSteps.map((s, i) => ({
        ...s,
        text: (typeof source[i] === 'string' ? source[i] : source[i]?.text) || s.text,
      }))
      : englishSteps
  );

  const steps = showTranslation && translation
    ? withText(translation.steps)
    : !englishOverride
      ? withText(original?.steps)
      : englishSteps;
  const step = steps[stepIndex] || { text: '' };

  /* Which language the steps are actually in right now, and whether there is
     a better one to offer. `content_language` is the backend's answer to "is
     the stored text really English?" — when the publish-time translation
     could not run, it is not. */
  const uiLang = (i18n.language || 'en').slice(0, 2);
  const storedLang = (
    recipe?.content_language || (original ? 'en' : recipe?.source_language) || 'en'
  ).slice(0, 2);
  const readingLang = showTranslation && translation
    ? translation.language
    : englishOverride || !original ? storedLang : (original.language || storedLang);
  const canTranslate = !!recipe && readingLang !== uiLang;
  const uiLangName = languageName(uiLang, i18n.language);

  const translateForMe = async () => {
    if (translation && translation.language === uiLang) {
      setShowTranslation(true);
      setEnglishOverride(false);
      return;
    }
    setTranslating(true);
    setTransErr(false);
    try {
      const data = await translateRecipe(recipe.id, uiLang);
      setTranslation(data);
      setShowTranslation(true);
      setEnglishOverride(false);
    } catch {
      /* 503 when the model is unreachable. Mid-cook there is nothing to do
         but leave the step as it was — and say so, because a button that
         silently does nothing reads as a broken button. */
      setTransErr(true);
    } finally {
      setTranslating(false);
    }
  };
  const isLast = steps.length === 0 || stepIndex === steps.length - 1;
  const timedSteps = steps
    .map((s, i) => ({ ...s, no: i + 1 }))
    .filter((s) => s.timer);

  /* Hand the current step's timer to the session. `armTimer` is a no-op when
     the same spec is already loaded, so a re-render never resets a countdown
     that is mid-boil. */
  useEffect(() => {
    armTimer(step.timer, step.label, stepIndex);
  }, [step.timer, step.label, stepIndex]);

  /* Which steps' timers actually got started.

     Observed off the session rather than wired through CookTimer: the timer
     button lives in that component, and it is also reachable from the floating
     dock while you are on another page, so a callback there would miss half
     the presses. Counted once per step — "Chaotic Neutral" asks whether you
     used the timers a recipe offered, not how often you paused them. */
  const timerSteps = useRef(new Set());
  const timer = session?.timer;
  const timerRunning = Boolean(timer?.running);
  const timerStep = timer?.stepIndex ?? stepIndex;
  useEffect(() => {
    if (!timerRunning) return;
    if (timerSteps.current.has(timerStep)) return;
    timerSteps.current.add(timerStep);
    reportCookEvent(sessionRef.current, { timer_started: true });
  }, [timerRunning, timerStep]);

  const openPhotoPicker = () => (hasCamera ? setCamOpen(true) : fileRef.current?.click());

  const pickFile = (f) => {
    if (!f) return;
    if (cookPreview) URL.revokeObjectURL(cookPreview);
    setCookFile(f);
    setCookPreview(URL.createObjectURL(f));
    setVerifyResult(null);
  };

  const runVerify = async () => {
    if (!cookFile) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await verifyCook(id, cookFile, sessionRef.current);
      setVerifyResult(res);
      if (res.verified) {
        // the pan is off the stove — clear the session so the dock goes away
        endCook();
        refreshUser();
      }
    } catch {
      setVerifyResult({ verified: false, reason: t('common.error') });
    } finally {
      setVerifying(false);
    }
  };

  // inline AI panel — starts empty; a contextual greeting shows until you ask.
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const openAssistant = (seed) => {
    setIsAssistantOpen(true);
    if (seed) {
      setDraft('');
      askKooka(seed);
    }
  };
  const closeAssistant = () => setIsAssistantOpen(false);
  const toggleAssistant = () => setIsAssistantOpen((open) => !open);

  useEffect(() => {
    if (!isAssistantOpen) return undefined;
    // On a phone the soft keyboard would cover the sheet's answer area the
    // moment it opens — let the user tap the field instead. Desktop keeps
    // the autofocus (the check is false there).
    if (window.matchMedia('(max-width: 640px)').matches) return undefined;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isAssistantOpen]);

  const askKooka = async (clean) => {
    if (!clean || busy) return;
    // Asking for help is half a dozen trophies, in both directions: some want
    // you to ask a lot, "No Hand-Holding" and "One and Done" want you never to.
    const firstOnThisStep = !askedSteps.current.has(stepIndex);
    askedSteps.current.add(stepIndex);
    reportCookEvent(sessionRef.current, {
      ai_asks: 1,
      ai_step: firstOnThisStep ? stepIndex : null,
    });
    const user = { id: nextId(), role: 'user', text: clean };
    const typing = { id: nextId(), role: 'ai', typing: true };
    // The history sent along is the thread as it stands *before* this question;
    // the question itself travels as `message`.
    const history = messagesRef.current.filter((m) => !m.typing);
    setMessages((m) => [...m, user, typing]);
    setBusy(true);

    let text;
    try {
      const res = await askWhileCooking(id, { stepIndex, message: clean, history });
      text = res.text;
    } catch {
      text = localCookReply(clean, { step, stepNo: stepIndex + 1, title: recipe?.title || '' });
    }
    setMessages((m) => m.filter((x) => x.id !== typing.id).concat({ id: nextId(), role: 'ai', text }));
    setBusy(false);
  };

  const send = (e) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean) return;
    setDraft('');
    askKooka(clean);
  };

  const goBack = () => (stepIndex > 0 ? setStepIndex((i) => i - 1) : navigate(`/recipe/${id}`));
  const goNext = () => (isLast ? setShowFinish(true) : setStepIndex((i) => i + 1));

  if (recipe === undefined) return <div className="cook cook--state">{t('common.loading')}…</div>;
  if (recipe === null) return <div className="cook cook--state">{t('common.error')}</div>;

  return (
    <div className={`cook${isAssistantOpen ? ' cook--assistant-open' : ''}`}>
      {/* ===== STAGE (left) ===== */}
      <div className="cook__stage">
        <div className="cook__topline">
          <button type="button" className="cook__exit" onClick={() => navigate(`/recipe/${recipe.id}`)}>
            <IconBack className="cook__exit-icon" /> {recipe.title}
          </button>
          <span className="cook__count">{t('cook.stepOf', { n: stepIndex + 1, total: steps.length })}</span>
          {/* Leaving does not throw the cook away: the session keeps the step
              and the timer, and the corner dock brings you back. */}
          <button type="button" className="cook__home" onClick={() => navigate('/home')}>
            <IconHome className="cook__home-icon" /> {t('cook.goHome')}
          </button>
        </div>

        <div className="cook__progress">
          {steps.map((_, i) => (
            <span key={i} className={i <= stepIndex ? 'on' : ''} />
          ))}
        </div>

        <div className="cook__step-no">
          {t('cook.stepLabel', { n: stepIndex + 1 })}

          {/* The author's words vs. the stored English — only when we kept
              both. */}
          {original && (
            <button
              type="button"
              className="cook__translate-btn"
              onClick={() => {
                setShowTranslation(false);
                setEnglishOverride((on) => !on);
              }}
            >
              {englishOverride
                ? t('recipe.showOriginal', { lang: languageName(original.language, i18n.language, original.language_name) })
                : t('recipe.showEnglish')}
            </button>
          )}

          {/* …and your own language. Hands are busy and the pan is on: a step
              you cannot read is worse here than anywhere else in the app. */}
          {showTranslation && translation ? (
            <button
              type="button"
              className="cook__translate-btn"
              onClick={() => setShowTranslation(false)}
            >
              {t('recipe.stopTranslation')}
            </button>
          ) : canTranslate && (
            <button
              type="button"
              className="cook__translate-btn"
              onClick={translateForMe}
              disabled={translating}
            >
              {translating
                ? `${t('recipe.translating')}…`
                : t('recipe.translateTo', { lang: uiLangName })}
            </button>
          )}

          {transErr && <span className="cook__translate-err">{t('recipe.translateFailed')}</span>}
        </div>
        <p className="cook__step">{step.text}</p>

        <div className="cook__timerrow">
          {step.timer && <CookTimer />}
          <div className="cook__voice">
            <button type="button" className="cook__vchip" onClick={() => openAssistant(t('cook.chipRepeat'))}>
              {t('cook.chipRepeat')}
            </button>
            <button type="button" className="cook__vchip" onClick={() => openAssistant(t('cook.chipTime'))}>
              {t('cook.chipTime')}
            </button>
            <button type="button" className="cook__vchip" onClick={() => openAssistant(t('cook.chipWrong'))}>
              {t('cook.chipWrong')}
            </button>
          </div>
        </div>
      </div>

      {/* ===== INLINE AI PANEL (right) ===== */}
      <aside className="cook__side">
        <div className="cook__side-head">
          <KookaAvatar size="sm" />
          <div>
            <h4>{t('cook.askTitle')}</h4>
            <span>{t('cook.askSub')}</span>
          </div>
          <button type="button" className="cook__side-close" onClick={closeAssistant} aria-label={t('common.close')}>
            ×
          </button>
        </div>

        <div className="cook__timers">
          <span className="cook__timers-title">{t('cook.timersTitle')}</span>
          {timedSteps.length === 0 ? (
            <p className="cook__timers-empty">{t('cook.noTimers')}</p>
          ) : (
            <ul>
              {timedSteps.map((s) => (
                <li key={s.no} className={s.no === stepIndex + 1 ? 'is-current' : ''}>
                  <span>{t('cook.stepShort', { n: s.no })}{s.label ? ` · ${s.label}` : ''}</span>
                  <span className="cook__timers-val">{s.timer}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cook__chat" ref={chatRef}>
          {messages.length === 0 ? (
            <div className="cook__msg cook__msg--ai">
              {t('cook.greeting', { title: recipe.title })}
            </div>
          ) : (
            messages.map((m) =>
              m.role === 'user' ? (
                <div className="cook__msg cook__msg--user" key={m.id}>{m.text}</div>
              ) : m.typing ? (
                <div className="cook__msg cook__msg--ai cook__typing" key={m.id}>
                  <span /><span /><span />
                </div>
              ) : (
                <div className="cook__msg cook__msg--ai" key={m.id}>{m.text}</div>
              )
            )
          )}
        </div>

        <form className="cook__ask" onSubmit={send}>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('cook.askPh')}
            aria-label={t('cook.askTitle')}
          />
          <button type="submit" className="cook__ask-send" aria-label={t('common.post')} disabled={!draft.trim() || busy}>
            <IconSend className="cook__ask-send-icon" />
          </button>
        </form>
      </aside>

      {/* ===== FOOTER ===== */}
      <div className="cook__foot">
        <button type="button" className="cook__btn cook__btn--dark" onClick={goBack}>{t('cook.back')}</button>
        <button type="button" className="cook__btn cook__btn--primary" onClick={goNext}>
          {isLast ? `✓ ${t('cook.finished')}` : t('cook.next')}
        </button>
        <button
          type="button"
          className="cook__giveup"
          onClick={() => setForfeitOpen(true)}
        >
          {t('cook.forfeit')}
        </button>
        <button
          type="button"
          className="cook__ai"
          onClick={toggleAssistant}
          aria-label={t('cook.askTitle')}
          aria-expanded={isAssistantOpen}
        >
          <IconSparkle className="cook__ai-icon" />
          <span>{t('cook.askShort')}</span>
        </button>
      </div>

      {/* ===== GIVE UP ===== */}
      <Modal
        open={forfeitOpen}
        onClose={() => setForfeitOpen(false)}
        title={t('cook.forfeitTitle')}
        footer={
          <>
            <button type="button" className="kbtn kbtn--ghost" onClick={() => setForfeitOpen(false)}>
              {t('cook.keepCooking')}
            </button>
            <button
              type="button"
              className="kbtn kbtn--danger"
              onClick={() => {
                reportCookEvent(sessionRef.current, { gave_up: true });
                endCook();
                setForfeitOpen(false);
                navigate('/home');
              }}
            >
              {t('cook.forfeitConfirm')}
            </button>
          </>
        }
      >
        <p className="cook__forfeit-note">
          {t('cook.forfeitNote', { title: recipe.title })}
        </p>
      </Modal>

      {/* ===== "I cooked it" verification (photo NOT stored) ===== */}
      <Modal open={showFinish} onClose={() => setShowFinish(false)} title={t('cook.verifyTitle')}>
        {verifyResult?.verified ? (
          <div className="cook__verified">
            <p className="cook__verified-msg">✅ {t('cook.verified')}</p>

            {/* What the dish was actually worth. It used to be a flat 20 XP
                that nobody saw; now it follows the recipe's rank, so the
                breakdown is the only way to know why a Chef dish paid more
                than the omelette — and why a repeat paid less. */}
            {verifyResult.xp_gained > 0 && (
              <div className="cook__reward">
                <b className="cook__reward-total">+{verifyResult.xp_gained} XP</b>
                <ul className="cook__reward-lines">
                  <li>
                    {t(
                      verifyResult.times_cooked > 1 ? 'cook.rewardRepeat' : 'cook.rewardCook',
                      {
                        xp: verifyResult.cook_xp,
                        rank: RECIPE_RANKS.find((r) => r.id === verifyResult.cook_rank)?.name
                          || verifyResult.cook_rank,
                      },
                    )}
                  </li>
                  {verifyResult.challenge_completed && (
                    <li>{t('cook.rewardChallenge', { xp: verifyResult.challenge_completed.xp })}</li>
                  )}
                  {verifyResult.mastered?.length > 0 && (
                    <li>{t('cook.rewardMastery', { list: verifyResult.mastered.join(', ') })}</li>
                  )}
                </ul>
                {verifyResult.rank_up && (
                  <p className="cook__reward-rankup">
                    {t('cook.rankUp', { rank: verifyResult.rank?.tier_label })}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              className="cook__btn cook__btn--primary"
              onClick={() => navigate(`/recipe/${id}`)}
            >
              {t('cook.writeReview')}
            </button>
          </div>
        ) : (
          <>
            <p className="cook__verify-hint">{t('cook.verifyHint')}</p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pickFile(e.target.files?.[0])}
            />

            {/* The dish is in front of you and the phone is already on the
                counter — shooting it here beats leaving for the camera app and
                coming back with a file to find. */}
            {cookPreview ? (
              <button type="button" className="cook__photo-preview" onClick={openPhotoPicker}>
                <img src={cookPreview} alt="" />
                <span>{t('cook.changePhoto')}</span>
              </button>
            ) : (
              <button type="button" className="cook__photo-pick" onClick={openPhotoPicker}>
                📷 {t('cook.selectPhoto')}
              </button>
            )}

            {hasCamera && (
              <button type="button" className="cook__photo-alt" onClick={() => fileRef.current?.click()}>
                {t('camera.chooseFile')}
              </button>
            )}

            <CameraCapture
              open={camOpen}
              onClose={() => setCamOpen(false)}
              onCapture={pickFile}
              facing="environment"
              title={t('cook.selectPhoto')}
            />

            {verifyResult && !verifyResult.verified && (
              <p className="cook__verify-err">⚠️ {t('cook.rejected')}</p>
            )}
            <button
              type="button"
              className="cook__btn cook__btn--primary cook__verify-btn"
              onClick={runVerify}
              disabled={!cookFile || verifying}
            >
              {verifying ? t('cook.verifying') : t('cook.verify')}
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}
