import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listConversations, getConversation, deleteConversation,
  sendChatMessage, fileToDataUrl,
} from '../../services/ai';
import {
  KookaAvatar, IconSend, IconCamera, IconPlus, IconSidebar,
  IconPot, IconSwap, IconCalendar, IconScale,
} from '../../components/Icons';
import './Chat.css';

/* ==========================================================================
   AI CHAT — a real conversation with the assistant, written for people who
   have never used a chatbot. Kooka is still the one answering; the screen is
   named for what it is, so it is findable by someone who has not met Kooka
   yet.

   Deliberately NOT a bare prompt box: the five things Kooka is good at are
   named in plain language as cards on the welcome screen and as chips above
   the composer, so nobody has to guess what to type. Typing freely still
   works for everyone who prefers it.

   Everything here is live:
     - POST /ai/chat          one turn; creates the thread on the first message
     - GET  /ai/chat          the sidebar
     - GET  /ai/chat/:id      reopen a thread
     - DELETE /ai/chat/:id
   Recipe cards in a reply are REAL recipes from our database — the backend
   only lets the model pick ids the user is actually allowed to open, so every
   card navigates to a page that exists.

   Photos are read into a data URL and sent inline. The server passes them to
   the vision model once and never stores them, which is why a reopened thread
   shows "Photo sent" rather than the picture.
   ========================================================================== */

/* The five jobs Kooka does. Each is named after the thing the person wants
   ("I'm out of something"), not after the feature that does it. `prompt` is
   the message actually sent, so one click produces a complete answer. */
const TASKS = [
  {
    key: 'cook',
    icon: IconPot,
    title: 'What can I cook?',
    blurb: "Tell me what's in the fridge — I'll find recipes that fit.",
    chip: 'What can I cook?',
    prompt: "Here's what I have in the fridge: ",
    needsMore: true,
  },
  {
    key: 'subs',
    icon: IconSwap,
    title: "I'm out of something",
    blurb: 'Find what you can use instead, and what it changes.',
    chip: 'Find a substitute',
    prompt: "I'm out of ",
    needsMore: true,
  },
  {
    key: 'menu',
    icon: IconCalendar,
    title: 'Plan my week',
    blurb: 'A week of meals, built around what you like and what it costs.',
    chip: 'Plan my week',
    prompt: 'Plan a week of dinners for me. Keep it simple and cheap, and tell me what to buy.',
  },
  {
    key: 'kcal',
    icon: IconScale,
    title: 'How much did I eat?',
    blurb: 'Describe a meal in your own words and get the calories.',
    chip: 'Count a meal',
    prompt: 'I ate ',
    needsMore: true,
  },
  {
    key: 'photo',
    icon: IconCamera,
    title: 'Show me a photo',
    blurb: 'Snap your fridge or your plate — I read what is in it.',
    chip: 'Send a photo',
    photo: true,
  },
];

/* ======================================================================== */
/* TEXT RENDERING                                                            */
/* ======================================================================== */

/* Kooka writes prose with the occasional short list and a **bold** word. This
   renders exactly that much — a markdown library would be 40 KB to support
   syntax the prompt tells the model not to use. */
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

function AiText({ text }) {
  if (!text) return null;
  const blocks = [];
  let list = null;

  const flush = () => {
    if (list) { blocks.push(list); list = null; }
  };

  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { flush(); return; }

    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push({ key: i, text: (bullet || numbered)[1] });
      return;
    }
    flush();
    blocks.push({ paragraph: line, key: i });
  });
  flush();

  return (
    <div className="m-ai__text">
      {blocks.map((b, i) =>
        b.items
          ? (b.ordered
            ? <ol className="m-ai__list" key={i}>{b.items.map((it) => <li key={it.key}>{inline(it.text)}</li>)}</ol>
            : <ul className="m-ai__list" key={i}>{b.items.map((it) => <li key={it.key}>{inline(it.text)}</li>)}</ul>)
          : <p key={i}>{inline(b.paragraph)}</p>
      )}
    </div>
  );
}

/* ======================================================================== */
/* ATTACHMENTS — real data, not mock layouts                                 */
/* ======================================================================== */

function RecipeCards({ recipes }) {
  const navigate = useNavigate();
  if (!recipes?.length) return null;
  return (
    <div className={`rec-cards ${recipes.length < 3 ? 'rec-cards--few' : ''}`}>
      {recipes.map((r) => (
        <article className="rec-card" key={r.id}>
          {r.image_url
            ? <img className="rec-card__img" src={r.image_url} alt="" loading="lazy" />
            : <span className="ph rec-card__photo" aria-hidden="true">no photo</span>}
          <div className="rec-card__body">
            <h3 className="rec-card__name">{r.title}</h3>
            <span className="rec-card__meta">
              {[r.meta?.time, r.meta?.kcal, r.meta?.servings].filter(Boolean).join(' · ')}
            </span>
            <button
              type="button" className="btn btn--sm btn--primary"
              onClick={() => navigate(`/recipe/${r.id}`)}
            >
              Open recipe
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

const MACRO_ROWS = [
  ['Carbs', 'carbs_g', 'c1', 300],
  ['Fat', 'fat_g', 'c2', 80],
  ['Protein', 'protein_g', 'c3', 120],
];

function NutritionCard({ nutrition }) {
  if (!nutrition || !nutrition.total_kcal) return null;
  const macros = nutrition.macros || {};
  const items = nutrition.items || [];
  return (
    <div className="card est-card">
      <div className="est__kcal">
        <b>{nutrition.total_kcal}</b>
        <span>kcal, roughly</span>
        {nutrition.confidence && (
          <span className="est__conf">{nutrition.confidence} confidence</span>
        )}
      </div>

      {MACRO_ROWS.map(([label, key, tone, scale]) => (
        macros[key] == null ? null : (
          <div className="macro" key={key}>
            <span>{label}</span>
            <span className="macro__bar">
              <i className={tone} style={{ width: `${Math.min(100, (macros[key] / scale) * 100)}%` }} />
            </span>
            <span className="macro__val">{macros[key]} g</span>
          </div>
        )
      ))}

      {items.length > 0 && (
        <div className="est__break">
          <h4>How I got there — tell me if I guessed wrong</h4>
          {items.map((it, i) => (
            <div className="est__row" key={i}>
              <span>{it.name}</span>
              {it.detail && <span className="est__pill">{it.detail}</span>}
              {it.kcal != null && <span className="est__kc">{it.kcal} kcal</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ======================================================================== */
/* MESSAGE                                                                   */
/* ======================================================================== */
function Message({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="m-row m-row--user">
        <div className="m-user">
          {msg.photo
            ? <img className="m-user__img" src={msg.photo} alt="" />
            : msg.has_photo && <span className="m-user__sent">Photo sent</span>}
          {msg.text}
        </div>
      </div>
    );
  }
  if (msg.typing) {
    return (
      <div className="m-row m-row--ai">
        <KookaAvatar size="sm" />
        <div className="m-typing"><span /><span /><span /></div>
      </div>
    );
  }
  return (
    <div className="m-row m-row--ai">
      <KookaAvatar size="sm" />
      <div className="m-ai">
        {/* Naming the speaker reads as a person answering, not as output */}
        <span className="m-ai__who">Kooka</span>
        <AiText text={msg.text} />
        {msg.error && <p className="m-ai__error">{msg.error}</p>}
        {(msg.recipes?.length > 0 || msg.nutrition) && (
          <div className="m-ai__rich">
            <RecipeCards recipes={msg.recipes} />
            <NutritionCard nutrition={msg.nutrition} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ======================================================================== */
/* PAGE                                                                      */
/* ======================================================================== */
let localSeq = 1;
const localId = () => `local-${localSeq++}`;

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [convos, setConvos] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState(null);        // { dataUrl, name }
  const [busy, setBusy] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  /* Closed on arrival. The history panel is for going back to something you
     asked before — a minority of visits — and opening on top of the welcome
     screen every time buried the thing people actually came for. The toggle
     is one tap away, in the same place either way. */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const isEmpty = messages.length === 0;

  const refreshConvos = useCallback(() => {
    listConversations().then(setConvos).catch(() => { /* sidebar is optional */ });
  }, []);

  useEffect(() => { refreshConvos(); }, [refreshConvos]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const openConversation = async (id) => {
    if (id === activeId || busy) return;
    setLoadingThread(true);
    try {
      const convo = await getConversation(id);
      setActiveId(convo.id);
      setMessages(convo.messages.map((m) => ({ ...m, key: `s${m.id}` })));
    } catch {
      setActiveId(null);
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  };

  const removeConversation = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
    } catch { /* already gone is fine — the refresh below settles it */ }
    if (id === activeId) { setActiveId(null); setMessages([]); }
    refreshConvos();
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    setDraft('');
    setPhoto(null);
    inputRef.current?.focus();
  };

  const send = async (text, attached = null) => {
    const clean = (text || '').trim();
    if ((!clean && !attached) || busy) return;

    const userMsg = { key: localId(), role: 'user', text: clean, photo: attached?.dataUrl };
    const typing = { key: localId(), role: 'ai', typing: true };
    setMessages((m) => [...m, userMsg, typing]);
    setDraft('');
    setPhoto(null);
    setBusy(true);

    try {
      const res = await sendChatMessage({
        message: clean,
        conversationId: activeId,
        image: attached?.dataUrl || '',
      });
      setActiveId(res.conversation.id);
      setMessages((m) => m
        .filter((x) => x.key !== typing.key)
        .concat({ ...res.message, key: `s${res.message.id}` }));
      refreshConvos();
    } catch (err) {
      const status = err?.response?.status;
      setMessages((m) => m.filter((x) => x.key !== typing.key).concat({
        key: localId(),
        role: 'ai',
        text: '',
        error: status === 400
          ? "I couldn't read that — try a smaller photo, under 8 MB."
          : "I couldn't get through just now. Check your connection and ask me again.",
      }));
    } finally {
      setBusy(false);
    }
  };

  /* A task either fires a complete question or, when it needs your details,
     drops the opening words into the box and lets you finish the sentence. */
  const runTask = (task) => {
    if (task.photo) { fileRef.current?.click(); return; }
    if (task.needsMore) {
      setDraft(task.prompt);
      inputRef.current?.focus();
      return;
    }
    send(task.prompt);
  };

  const pickPhoto = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setPhoto({ dataUrl, name: file.name });
      inputRef.current?.focus();
    } catch { /* unreadable file — the picker simply stays empty */ }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send(draft, photo);
  };

  return (
    <div className={`chat ${sidebarOpen ? '' : 'chat--collapsed'}`}>
      {/* ===== HISTORY SIDEBAR ===== */}
      <aside className="chat-sb">
        <div className="chat-sb__head">
          <button
            type="button" className="chat-sb__icon" onClick={() => setSidebarOpen(false)}
            aria-label="Hide past questions"
          >
            <IconSidebar className="chat-sb__icon-svg" />
          </button>
          <button type="button" className="chat-sb__new" onClick={newChat}>
            <IconPlus className="chat-sb__new-icon" /> Ask something new
          </button>
        </div>

        <div className="chat-sb__scroll">
          <p className="chat-sb__label">Things you asked before</p>
          {convos.length === 0 ? (
            <p className="chat-sb__empty">Nothing yet. Your conversations show up here.</p>
          ) : (
            <ul className="chat-sb__list">
              {convos.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`chat-sb__item ${c.id === activeId ? 'is-active' : ''}`}
                    onClick={() => openConversation(c.id)}
                  >
                    <span className="chat-sb__item-title">{c.title}</span>
                    <span className="chat-sb__item-when">{whenLabel(c.updated_at)}</span>
                  </button>
                  <button
                    type="button" className="chat-sb__del"
                    onClick={(e) => removeConversation(e, c.id)}
                    aria-label={`Delete "${c.title}"`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="chat-sb__foot">
          <KookaAvatar size="sm" />
          <span>Kooka · your kitchen helper</span>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="chat-main">
        <div className="chat-top">
          {!sidebarOpen && (
            <button
              type="button" className="chat-top__icon" onClick={() => setSidebarOpen(true)}
              aria-label="Show past questions"
            >
              <IconSidebar className="chat-sb__icon-svg" />
            </button>
          )}
          <span className="chat-top__title">AI Chat</span>
          <span className="chat-top__sub">Cooking questions, answered while you stand in the kitchen</span>
          {!isEmpty && (
            <button type="button" className="chat-top__new" onClick={newChat}>Start over</button>
          )}
        </div>

        <div className="chat-scroll" ref={scrollRef}>
          {loadingThread ? (
            <p className="chat-thread__state">Opening…</p>
          ) : isEmpty ? (
            <div className="chat-welcome">
              <KookaAvatar size="lg" />
              <h1 className="chat-welcome__title">Hi! What are we cooking?</h1>
              <p className="chat-welcome__sub">
                Pick one of these, or just write to me the way you'd ask a friend.
                There is no wrong way to say it.
              </p>

              <div className="chat-welcome__tasks">
                {TASKS.map((task) => {
                  const Icon = task.icon;
                  return (
                    <button
                      type="button" key={task.key} className="chat-task"
                      onClick={() => runTask(task)} disabled={busy}
                    >
                      <span className="chat-task__icon"><Icon className="chat-task__icon-svg" /></span>
                      <span className="chat-task__text">
                        <span className="chat-task__title">{task.title}</span>
                        <span className="chat-task__blurb">{task.blurb}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="chat-thread">
              {messages.map((m) => <Message key={m.key} msg={m} />)}
            </div>
          )}
        </div>

        <div className="chat-composer">
          {/* Once the thread has started the welcome cards are scrolled away,
              so the same five jobs stay reachable here as one-tap chips. */}
          {!isEmpty && (
            <div className="chat-quick">
              <span className="chat-quick__label">Ask for:</span>
              {TASKS.map((task) => (
                <button
                  type="button" key={task.key} className="chat-quick__chip"
                  onClick={() => runTask(task)} disabled={busy}
                >
                  {task.chip}
                </button>
              ))}
            </div>
          )}

          {photo && (
            <div className="chat-attach">
              <img src={photo.dataUrl} alt="" />
              <span className="chat-attach__name">{photo.name}</span>
              <button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo">×</button>
            </div>
          )}

          <form onSubmit={onSubmit}>
            <input
              ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }}
            />
            <button
              type="button" className="chat-composer__icon" aria-label="Add a photo"
              onClick={() => fileRef.current?.click()}
            >
              <IconCamera className="chat-composer__icon-svg" />
            </button>
            <input
              ref={inputRef} type="text" value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends. A lone text input in a form submits implicitly,
                // but that breaks the moment anyone adds a second field — and
                // "my Enter did nothing" is fatal in a chat box.
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft, photo); }
              }}
              placeholder="Write it however you'd say it out loud…"
              aria-label="Write your question"
            />
            <button
              type="submit" className="chat-composer__send" aria-label="Send"
              disabled={busy || (!draft.trim() && !photo)}
            >
              <IconSend className="chat-composer__send-svg" />
            </button>
          </form>
          <p className="chat-composer__hint">
            Kooka is a good cook, not a perfect one — check times and temperatures for meat and fish.
          </p>
        </div>
      </div>
    </div>
  );
}

/* "Today" / "Yesterday" / a date — how you recognise the thread you mean. */
function whenLabel(iso) {
  if (!iso) return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(then)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return then.toLocaleDateString(undefined, { weekday: 'long' });
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
