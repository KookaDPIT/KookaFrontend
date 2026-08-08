import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRecipe } from '../../services/recipes';
import { verifyCook } from '../../services/reviews';
import { refreshUser } from '../../user';
import Modal from '../../components/Modal';
import ImageUpload from '../../components/ImageUpload';
import { KookaAvatar, IconSparkle, IconSend, IconBack } from '../../components/Icons';
import './Cook.css';

/* ==========================================================================
   COOK — step-by-step cook-along for one recipe (dark "hands dirty" screen).
   The AI lives INLINE here: the mic button is replaced by an "Ask Kooka"
   sparkle button that opens the chat in the "Ask while you cook"
   panel — you talk to the AI without leaving to the full chat page.

   BACKEND SEAM: `cookAssistantReply` is a local mock. Replace with a call that
   also knows the current step/recipe context.
   ========================================================================== */

function cookAssistantReply(text) {
  const s = text.toLowerCase();
  if (/salt|salty/.test(s))
    return "Don't add any more salt — the guanciale and parmesan are already salty. Taste only at the end.";
  if (/curdl|split|grainy|broke/.test(s))
    return "It's saveable: take it off the heat, add hot pasta water a spoon at a time and stir vigorously. The emulsion comes back together.";
  if (/time|minute|timer|set/.test(s))
    return "I've started a timer. I'll tell you when it's ready — you keep an eye on the pan.";
  if (/repeat|step|again|didn't (get|understand)/.test(s))
    return 'I\'ll read the current step back to you and stay on it until you say "next".';
  return "I'm here while you cook. Tell me which step you're on or what went wrong and I'll guide you.";
}

let cid = 1;
const nextId = () => `c${cid++}`;

export default function Cook() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [recipe, setRecipe] = useState(undefined);

  const [stepIndex, setStepIndex] = useState(0);

  // "I cooked it" verification flow
  const [showFinish, setShowFinish] = useState(false);
  const [cookPhoto, setCookPhoto] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // {verified, reason}

  useEffect(() => {
    getRecipe(id).then(setRecipe).catch(() => setRecipe(null));
  }, [id]);

  const steps = recipe?.steps || [];
  const step = steps[stepIndex] || { text: '' };
  const isLast = steps.length === 0 || stepIndex === steps.length - 1;

  const runVerify = async () => {
    if (!cookPhoto) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await verifyCook(id, cookPhoto);
      setVerifyResult(res);
      if (res.verified) refreshUser();
    } catch {
      setVerifyResult({ verified: false, reason: t('common.error') });
    } finally {
      setVerifying(false);
    }
  };

  // inline AI panel
  const [messages, setMessages] = useState([
    { id: nextId(), role: 'user', text: 'It curdled a little, can I still save it?' },
    {
      id: nextId(),
      role: 'ai',
      text: 'Yes. Add 2–3 tablespoons of the hot pasta water and stir constantly, off the heat. The emulsion comes back together in about 20 s.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const chatRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const askKooka = () => {
    // open/focus the inline chat (scroll into view on stacked layouts)
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    inputRef.current?.focus();
  };

  const send = (e) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean || busy) return;
    const user = { id: nextId(), role: 'user', text: clean };
    const typing = { id: nextId(), role: 'ai', typing: true };
    setMessages((m) => [...m, user, typing]);
    setDraft('');
    setBusy(true);
    window.setTimeout(() => {
      setMessages((m) =>
        m.filter((x) => x.id !== typing.id).concat({ id: nextId(), role: 'ai', text: cookAssistantReply(clean) })
      );
      setBusy(false);
    }, 600);
  };

  const goBack = () => (stepIndex > 0 ? setStepIndex((i) => i - 1) : navigate(`/recipe/${id}`));
  const goNext = () => (isLast ? setShowFinish(true) : setStepIndex((i) => i + 1));

  if (recipe === undefined) return <div className="cook cook--state">{t('common.loading')}…</div>;
  if (recipe === null) return <div className="cook cook--state">{t('common.error')}</div>;

  return (
    <div className="cook">
      {/* ===== STAGE (left) ===== */}
      <div className="cook__stage">
        <div className="cook__topline">
          <button type="button" className="cook__exit" onClick={() => navigate(`/recipe/${recipe.id}`)}>
            <IconBack className="cook__exit-icon" /> {recipe.title}
          </button>
          <span className="cook__count">step {stepIndex + 1} of {steps.length}</span>
        </div>

        <div className="cook__progress">
          {steps.map((_, i) => (
            <span key={i} className={i <= stepIndex ? 'on' : ''} />
          ))}
        </div>

        <div className="cook__step-no">STEP {stepIndex + 1}</div>
        <p className="cook__step">{step.text}</p>

        <div className="cook__timerrow">
          {step.timer && (
            <div className="cook__timer">
              <b>{step.timer}</b>
              {step.label && <small>{step.label}</small>}
            </div>
          )}
          <div className="cook__voice">
            <button type="button" className="cook__vchip" onClick={askKooka}>Kooka, repeat the step</button>
            <button type="button" className="cook__vchip" onClick={askKooka}>How much longer?</button>
            <button type="button" className="cook__vchip" onClick={askKooka}>Something went wrong</button>
          </div>
        </div>
      </div>

      {/* ===== INLINE AI PANEL (right) ===== */}
      <aside className="cook__side" ref={panelRef}>
        <div className="cook__side-head">
          <KookaAvatar size="sm" />
          <div>
            <h4>Ask while you cook</h4>
            <span>Kooka answers here, without leaving the recipe</span>
          </div>
        </div>

        <div className="cook__timers">
          <ul>
            <li><span>Pasta al dente</span><span className="done">done</span></li>
            <li><span>Guanciale rendered</span><span className="run">1:12</span></li>
          </ul>
        </div>

        <div className="cook__chat" ref={chatRef}>
          {messages.map((m) =>
            m.role === 'user' ? (
              <div className="cook__msg cook__msg--user" key={m.id}>{m.text}</div>
            ) : m.typing ? (
              <div className="cook__msg cook__msg--ai cook__typing" key={m.id}>
                <span /><span /><span />
              </div>
            ) : (
              <div className="cook__msg cook__msg--ai" key={m.id}>{m.text}</div>
            )
          )}
        </div>

        <form className="cook__ask" onSubmit={send}>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask Kooka…"
            aria-label="Ask Kooka"
          />
          <button type="submit" className="cook__ask-send" aria-label="Send" disabled={!draft.trim() || busy}>
            <IconSend className="cook__ask-send-icon" />
          </button>
        </form>
      </aside>

      {/* ===== FOOTER ===== */}
      <div className="cook__foot">
        <button type="button" className="cook__btn cook__btn--dark" onClick={goBack}>Back</button>
        <button type="button" className="cook__btn cook__btn--primary" onClick={goNext}>
          {isLast ? `✓ ${t('cook.finished')}` : 'Next step'}
        </button>
        <button type="button" className="cook__ai" onClick={askKooka} aria-label="Ask Kooka">
          <IconSparkle className="cook__ai-icon" />
          <span>Ask Kooka</span>
        </button>
      </div>

      {/* ===== "I cooked it" verification ===== */}
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
            <ImageUpload value={cookPhoto} onChange={setCookPhoto} folder="/cooked" />
            {verifyResult && !verifyResult.verified && (
              <p className="cook__verify-err">⚠️ {t('cook.rejected')}</p>
            )}
            <button
              type="button"
              className="cook__btn cook__btn--primary cook__verify-btn"
              onClick={runVerify}
              disabled={!cookPhoto || verifying}
            >
              {verifying ? t('cook.verifying') : t('cook.verify')}
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}
