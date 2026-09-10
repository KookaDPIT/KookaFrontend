import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRecipe } from '../../services/recipes';
import { askWhileCooking } from '../../services/ai';
import { verifyCook } from '../../services/reviews';
import { refreshUser } from '../../user';
import { armTimer, endCook, startCook, updateCook, useCookSession } from '../../cook';
import Modal from '../../components/Modal';
import CookTimer from '../../components/CookTimer';
import { KookaAvatar, IconSparkle, IconSend, IconHome, IconBack } from '../../components/Icons';
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
  const { t } = useTranslation();
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
  const fileRef = useRef(null);

  useEffect(() => {
    getRecipe(id)
      .then((r) => {
        setRecipe(r);
        startCook(r);
      })
      .catch(() => setRecipe(null));
  }, [id]);

  const steps = recipe?.steps || [];
  const step = steps[stepIndex] || { text: '' };
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
      const res = await verifyCook(id, cookFile);
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
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isAssistantOpen]);

  const askKooka = async (clean) => {
    if (!clean || busy) return;
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

        <div className="cook__step-no">{t('cook.stepLabel', { n: stepIndex + 1 })}</div>
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

            {cookPreview ? (
              <button type="button" className="cook__photo-preview" onClick={() => fileRef.current?.click()}>
                <img src={cookPreview} alt="" />
                <span>{t('cook.changePhoto')}</span>
              </button>
            ) : (
              <button type="button" className="cook__photo-pick" onClick={() => fileRef.current?.click()}>
                📷 {t('cook.selectPhoto')}
              </button>
            )}

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
