import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RECIPE_IDS } from '../../data/recipes';
import {
  KookaAvatar, IconSend, IconMic, IconCamera, IconPlus, IconSidebar,
} from '../../components/Icons';
import './Chat.css';

/* ==========================================================================
   CHAT AI — Claude/ChatGPT-style conversation.
   Collapsible history sidebar, one clean thread, centered composer. The rich
   layouts (recipes, substitutions, weekly menu, calorie estimate, photo scan)
   are AI RESPONSE TYPES. The cook-along is NOT here anymore — it lives in the
   recipe cook flow (/recipe/:id/cook).

   BACKEND SEAM: `fetchAssistantReply()` is a local MOCK. Replace its body with
   a real call (see api.js) returning { kind, intro?, text? }.
   ========================================================================== */

function Ph({ label = 'recipe photo', className = '', style }) {
  return <span className={`ph ${className}`} style={style} aria-hidden="true">{label}</span>;
}

/* conversation starters — shown as suggestions in the empty state */
const STARTERS = [
  {
    key: 'chat',
    label: 'Recipe ideas',
    hint: "with what's in my fridge",
    userText: 'I have chicken, rice and a bell pepper. Something quick, under 30 minutes, not too spicy.',
    reply: { kind: 'recipes', intro: "Perfect — with what you've got, here are three options. All done in a pan, no oven:" },
  },
  {
    key: 'subs',
    label: 'Substitutions',
    hint: "I'm missing an ingredient",
    userText: "I don't have cooking cream. What can I use instead?",
    reply: { kind: 'subs', intro: "You've got three good options. For carbonara I'd go with the first — it stays creamy and won't split." },
  },
  {
    key: 'menu',
    label: 'Weekly menu',
    hint: 'plan my meals',
    userText: 'Make me a weekly menu for 2 people, budget around $60, as little meat as possible, packed lunches.',
    reply: { kind: 'menu', intro: "I've built the week with 4 vegetarian recipes and 2 with fish. Tuesday's and Thursday's dinners become the next day's packed lunch." },
  },
  {
    key: 'calorii',
    label: 'Calorie estimate',
    hint: 'describe what you ate',
    userText: 'I ate two slices of pepperoni pizza and a small beer.',
    reply: { kind: 'calorii', intro: 'Here is my estimate based on your description:' },
  },
  {
    key: 'scan',
    label: 'Scan with a photo',
    hint: "what's in the fridge",
    userText: 'the shelf in my fridge',
    userPhoto: true,
    reply: { kind: 'scan', intro: "I analyzed the photo — here's what I found:" },
  },
];

/* mock recent conversations for the history sidebar */
const HISTORY = [
  'Quick chicken and pepper dinner',
  'What to use instead of cream',
  'Menu for 2, small budget',
  'Calories — pizza and beer',
  'Ingredients from a photo · fridge',
];

const PANTRY = ['chicken 500 g', 'rice', 'bell pepper', 'yogurt · exp. tomorrow'];

/* ---- BACKEND SEAM ---------------------------------------------------- */
async function fetchAssistantReply(text /*, history */) {
  const t = text.toLowerCase();
  const kind =
    (/substitut|instead of|don't have|replace/.test(t) && 'subs') ||
    (/menu|week|plan/.test(t) && 'menu') ||
    (/calor|kcal|i ate|i had/.test(t) && 'calorii') ||
    (/photo|scan|fridge/.test(t) && 'recipes') ||
    'recipes';
  const intro = {
    subs: "Here's what you can use instead — sorted by how well they match:",
    menu: "I've built a balanced week for you. You can swap any meal with a click.",
    calorii: 'Here is my estimate based on your description:',
    recipes: "With what you have on hand, here are a few options:",
  }[kind];
  return { kind, intro };
}

/* ======================================================================== */
/* RICH RESPONSE CONTENT                                                     */
/* ======================================================================== */
function RecipesContent() {
  const navigate = useNavigate();
  const recipes = [
    { name: 'Chicken with rice and peppers', meta: '25 min · 480 kcal', id: RECIPE_IDS[0], primary: true },
    { name: 'Chicken wok, roasted pepper', meta: '18 min · 420 kcal', id: RECIPE_IDS[1] },
    { name: 'Creamy pepper soup', meta: '30 min · 260 kcal', id: RECIPE_IDS[0] },
  ];
  return (
    <>
      <div className="rec-cards">
        {recipes.map((r, i) => (
          <article className="rec-card" key={i}>
            <Ph className="rec-card__photo" />
            <div className="rec-card__body">
              <h3 className="rec-card__name">{r.name}</h3>
              <span className="rec-card__meta">{r.meta}</span>
              <button
                type="button"
                className={`btn btn--sm ${r.primary ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => navigate(`/recipe/${r.id}`)}
              >
                {r.primary ? 'Cook with me' : 'View recipe'}
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="chat-suggest">
        {['Make it lighter', 'For 4 servings', 'Dairy-free', 'What can I use instead of pepper?'].map((s) => (
          <button type="button" key={s}>{s}</button>
        ))}
      </div>
    </>
  );
}

function SubsContent() {
  const rows = [
    ['10% Greek yogurt + 1 yolk', '200 ml → 200 g', 'Slightly more tangy, add off the heat', '90', '90%'],
    ['Milk + butter', '180 ml + 20 g', 'Thinner — bind it with pasta water', '80', '80%'],
    ['Cashew cream', '200 ml', 'Dairy-free option, slightly sweet taste', '65', '65%'],
  ];
  return (
    <>
      <div className="card">
        <table className="subs-table">
          <thead>
            <tr><th>Substitute</th><th>Amount</th><th>What changes</th><th>Match</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                <td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td>
                <td><span className={`fit fit--${r[3]}`}>{r[4]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="subs-notes">
          <div className="note">
            <h4>Keep in mind</h4>
            <p>Yogurt splits when it boils. Mix it with the yolk, then pour it over the pasta once it's off the heat.</p>
          </div>
          <div className="note">
            <h4>Nutrition impact</h4>
            <ul><li>Calories −120 kcal / serving</li><li>Fat −11 g</li><li>Protein +4 g</li></ul>
          </div>
        </div>
      </div>
      <div className="chat-actions">
        <button type="button" className="btn btn--primary">Apply to recipe</button>
        <button type="button" className="btn btn--ghost">Without parmesan too?</button>
        <button type="button" className="btn btn--ghost">Recalculate calories</button>
      </div>
    </>
  );
}

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MEALS = [
  { label: 'Breakfast', cells: [
    { n: 'Oats with pears', k: '380 kcal' }, { n: 'Yogurt, nuts', k: '320 kcal' },
    { n: 'Spinach omelette', k: '410 kcal' }, { n: 'Oats with pears', k: '380 kcal' },
    { n: 'Avocado toast', k: '440 kcal' }, { n: 'Cheese pancakes', k: '520 kcal' },
    { n: 'Fried eggs, tomatoes', k: '300 kcal' },
  ] },
  { label: 'Lunch', cells: [
    { n: 'Chickpea salad', k: '560 kcal' }, { n: 'Dinner leftovers', pack: true },
    { n: 'Lentil soup', k: '480 kcal' }, { n: 'Dinner leftovers', pack: true },
    { n: 'Hummus wrap', k: '520 kcal' }, { n: 'Pasta with pesto', k: '640 kcal' },
    { n: 'Vegetable soup', k: '330 kcal' },
  ] },
  { label: 'Dinner', cells: [
    { n: 'Bean stew', k: '610 kcal' }, { n: 'Rice with vegetables', k: '580 kcal' },
    { n: 'Baked salmon', sel: true, note: 'selecting…' }, { n: 'Zucchini fritters', k: '520 kcal' },
    { n: 'Homemade pizza', k: '720 kcal' }, { n: 'Cod with potatoes', k: '540 kcal' }, { liber: true },
  ] },
];

function MenuContent() {
  return (
    <div className="menu">
      <aside className="menu__aside">
        <div className="menu__summary">
          <h4>Summary</h4>
          <ul>
            <li><span>Meals · ingredients</span><span>14 · 21</span></li>
            <li><span>Estimated cost</span><span>$57</span></li>
            <li><span>Average / day</span><span>1 940 kcal</span></li>
            <li><span>Total cook time</span><span>3 h 40 min</span></li>
          </ul>
        </div>
        <div className="chat-actions">
          <button type="button" className="btn btn--primary" style={{ width: '100%' }}>Generate shopping list</button>
          <button type="button" className="btn btn--ghost">Swap meals</button>
          <button type="button" className="btn btn--ghost">Cheaper</button>
        </div>
      </aside>
      <section className="menu__cal">
        <div className="menu__cal-head">
          <h4>August 3 – 9</h4>
          <button type="button" className="btn btn--ghost btn--sm">Last week</button>
          <button type="button" className="btn btn--ghost btn--sm">Next</button>
        </div>
        <div className="menu__grid">
          <span />
          {DOW.map((d) => <span className="menu__dow" key={d}>{d}</span>)}
          {MEALS.map((meal) => <MenuRow key={meal.label} meal={meal} />)}
        </div>
      </section>
    </div>
  );
}

function MenuRow({ meal }) {
  return (
    <>
      <span className="menu__rowlabel">{meal.label}</span>
      {meal.cells.map((c, i) => (
        <div className={`menu__cell ${c.pack ? 'is-pack' : ''} ${c.sel ? 'is-sel' : ''}`} key={i}>
          {c.liber ? <span style={{ margin: 'auto' }}>free</span> : (
            <>
              <b>{c.n}</b>
              {c.note ? <em>{c.note}</em> : <span>{c.pack ? 'packed' : c.k}</span>}
            </>
          )}
        </div>
      ))}
    </>
  );
}

function CaloriiContent() {
  const macros = [['Carbs', 96, 'c1', '90%'], ['Fat', 34, 'c2', '55%'], ['Protein', 31, 'c3', '48%']];
  const breakdown = [
    ['Pepperoni pizza, 2 slices', '~130 g / slice', '660 kcal'],
    ['Lager beer', '330 ml', '140 kcal'],
    ['Extra oil / cheese (assumed)', 'estimated', '90 kcal'],
  ];
  return (
    <>
      <div className="est">
        <div className="card">
          <div className="est__kcal">
            <b>890</b><span>kcal estimate</span>
            <span className="est__conf">±120 kcal · medium confidence</span>
          </div>
          {macros.map(([name, g, c, w]) => (
            <div className="macro" key={name}>
              <span>{name}</span>
              <span className="macro__bar"><i className={c} style={{ width: w }} /></span>
              <span className="macro__val">{g} g</span>
            </div>
          ))}
          <div className="est__break">
            <h4>How I calculated it — adjust if I got it wrong</h4>
            {breakdown.map(([name, pill, kc]) => (
              <div className="est__row" key={name}>
                <span>{name}</span><span className="est__pill">{pill}</span><span className="est__kc">{kc}</span>
              </div>
            ))}
          </div>
        </div>
        <aside className="est__aside">
          <div className="card est__today">
            <h4>Today</h4>
            <div><b>2 130</b> <span>/ 2 200 kcal</span></div>
            <div className="est__prog"><i style={{ width: '96%' }} /></div>
            <p>You have 70 kcal left. I'd suggest a plain Greek yogurt.</p>
          </div>
          <div className="card est__added">
            <h4>Added today</h4>
            <ul>
              <li><span>Oats with pears</span><b>380</b></li>
              <li><span>Chickpea salad</span><b>560</b></li>
              <li><span>Coffee with milk</span><b>90</b></li>
              <li><span>Pizza + beer</span><b>890</b></li>
            </ul>
          </div>
        </aside>
      </div>
      <div className="chat-actions">
        <button type="button" className="btn btn--primary">Add to journal</button>
        <button type="button" className="btn btn--ghost">They were big slices</button>
        <button type="button" className="btn btn--ghost">What should I eat for dinner to close out the day?</button>
      </div>
    </>
  );
}

function ScanContent() {
  const navigate = useNavigate();
  const found = [
    { text: 'yogurt 400 g · expires tomorrow', warn: true }, { text: 'spinach · 2 days' },
    { text: 'zucchini · 6 days' }, { text: 'eggs ×6' }, { text: 'feta 200 g' },
    { text: 'tomatoes ×3' }, { text: 'apple' },
  ];
  return (
    <div className="scan">
      <div className="scan__tabs">
        <button type="button" className="btn btn--primary btn--sm">Ingredients</button>
        <button type="button" className="btn btn--ghost btn--sm">Plate → calories</button>
        <button type="button" className="btn btn--ghost btn--sm">Label → expiry</button>
      </div>
      <div className="scan__grid">
        <div>
          <div className="scan__photo ph">
            <span style={{ color: '#b3a380', fontSize: 12 }}>user's photo · fridge shelf</span>
            <span className="scan__box" style={{ top: '14%', left: '8%', width: '38%', height: '30%' }}>
              <span className="scan__tag">yogurt · 97%</span>
            </span>
            <span className="scan__box" style={{ top: '46%', left: '52%', width: '34%', height: '32%' }}>
              <span className="scan__tag">zucchini · 91%</span>
            </span>
            <span className="scan__box g" style={{ top: '54%', left: '14%', width: '28%', height: '22%' }}>
              <span className="scan__tag">spinach · wilted</span>
            </span>
          </div>
          <div className="chat-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn--ghost btn--sm">Take another photo</button>
            <button type="button" className="btn btn--ghost btn--sm">Add manually</button>
          </div>
          <div className="note" style={{ marginTop: 14 }}>
            <h4>From the label</h4>
            <p>I read "exp. 04.08.2026" on the yogurt. That's tomorrow — I put it first in the recipe.</p>
          </div>
        </div>
        <div>
          <strong style={{ fontFamily: 'var(--font-important), sans-serif', fontSize: 15 }}>I found 7 ingredients</strong>
          <div className="scan__found">
            {found.map((f) => (
              <span className={`chat__pchip ${f.warn ? 'is-warn' : ''}`} key={f.text}>{f.text}</span>
            ))}
          </div>
          <article className="card scan__reco">
            <span className="scan__reco-kicker">Use the yogurt and spinach first</span>
            <h3>Zucchini bake with spinach and feta</h3>
            <span className="rec-card__meta">40 min · 4 servings · you have 7 of 8 ingredients</span>
            <div className="scan__nutri">
              <div><b>310</b><span>kcal / serving</span></div>
              <div><b>21 g</b><span>protein</span></div>
              <div><b>9 g</b><span>carbs</span></div>
            </div>
            <Ph className="scan__reco-photo" label="recipe photo" />
            <p>You're only missing flour — you can use 3 tablespoons of semolina. The rest of the yogurt goes on breakfast tomorrow.</p>
            <div className="chat-actions">
              <button type="button" className="btn btn--primary" onClick={() => navigate(`/recipe/${RECIPE_IDS[0]}`)}>Cook with me</button>
              <button type="button" className="btn btn--ghost">Another recipe</button>
              <button type="button" className="btn btn--ghost">Save the ingredients</button>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

const RICH = { recipes: RecipesContent, subs: SubsContent, menu: MenuContent, calorii: CaloriiContent, scan: ScanContent };

/* ======================================================================== */
/* MESSAGE                                                                   */
/* ======================================================================== */
function Message({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="m-row m-row--user">
        <div className="m-user">
          {msg.photo && <Ph className="m-user__photo" label="photo sent" />}
          {msg.text}
        </div>
      </div>
    );
  }
  if (msg.kind === 'typing') {
    return (
      <div className="m-row m-row--ai">
        <KookaAvatar size="sm" />
        <div className="m-typing"><span /><span /><span /></div>
      </div>
    );
  }
  const Rich = RICH[msg.kind];
  return (
    <div className="m-row m-row--ai">
      <KookaAvatar size="sm" />
      <div className="m-ai">
        {(msg.intro || msg.text) && <p className="m-ai__text">{msg.intro || msg.text}</p>}
        {Rich && <div className="m-ai__rich"><Rich /></div>}
      </div>
    </div>
  );
}

/* ======================================================================== */
/* PAGE                                                                      */
/* ======================================================================== */
let idSeq = 1;
const nextId = () => `m${idSeq++}`;

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef(null);
  const isEmpty = messages.length === 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = (text, { photo = false, preset = null } = {}) => {
    const clean = text.trim();
    if (!clean || busy) return;
    const userMsg = { id: nextId(), role: 'user', text: clean, photo };
    const typingMsg = { id: nextId(), role: 'ai', kind: 'typing' };
    setMessages((m) => [...m, userMsg, typingMsg]);
    setDraft('');
    setBusy(true);
    const settle = (reply) => {
      setMessages((m) => m.filter((x) => x.id !== typingMsg.id).concat({ id: nextId(), role: 'ai', ...reply }));
      setBusy(false);
    };
    if (preset) window.setTimeout(() => settle(preset), 650);
    else fetchAssistantReply(clean).then((reply) => window.setTimeout(() => settle(reply), 650));
  };

  const runStarter = (s) => send(s.userText, { photo: !!s.userPhoto, preset: s.reply });
  const onSubmit = (e) => { e.preventDefault(); send(draft); };
  const newChat = () => { setMessages([]); setDraft(''); };

  return (
    <div className={`chat ${sidebarOpen ? '' : 'chat--collapsed'}`}>
      {/* ===== HISTORY SIDEBAR ===== */}
      <aside className="chat-sb">
        <div className="chat-sb__head">
          <button type="button" className="chat-sb__icon" onClick={() => setSidebarOpen(false)} aria-label="Hide history">
            <IconSidebar className="chat-sb__icon-svg" />
          </button>
          <button type="button" className="chat-sb__new" onClick={newChat}>
            <IconPlus className="chat-sb__new-icon" /> New chat
          </button>
        </div>

        <div className="chat-sb__scroll">
          <p className="chat-sb__label">Recent</p>
          <ul className="chat-sb__list">
            {HISTORY.map((h, i) => (
              <li key={h}>
                <button type="button" className={`chat-sb__item ${i === 0 ? 'is-active' : ''}`}>{h}</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="chat-sb__foot">
          <KookaAvatar size="sm" />
          <span>Kooka · your chef</span>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="chat-main">
        <div className="chat-top">
          {!sidebarOpen && (
            <button type="button" className="chat-top__icon" onClick={() => setSidebarOpen(true)} aria-label="Show history">
              <IconSidebar className="chat-sb__icon-svg" />
            </button>
          )}
          <span className="chat-top__title">Chat AI</span>
        </div>

        <div className="chat-scroll" ref={scrollRef}>
          {isEmpty ? (
            <div className="chat-welcome">
              <KookaAvatar size="lg" />
              <h1 className="chat-welcome__title">How can I help today?</h1>
              <p className="chat-welcome__sub">
                Tell me what's in your fridge, what you're craving or what you ate — or start here:
              </p>
              <div className="chat-welcome__starters">
                {STARTERS.map((s) => (
                  <button type="button" key={s.key} className="chat-starter" onClick={() => runStarter(s)} disabled={busy}>
                    <span className="chat-starter__label">{s.label}</span>
                    <span className="chat-starter__hint">{s.hint}</span>
                  </button>
                ))}
              </div>
              <div className="chat-welcome__pantry">
                <span className="chat-welcome__pantry-label">In the fridge:</span>
                {PANTRY.map((p) => <span className="chat__pchip" key={p}>{p}</span>)}
              </div>
            </div>
          ) : (
            <div className="chat-thread">
              {messages.map((m) => <Message key={m.id} msg={m} />)}
            </div>
          )}
        </div>

        <div className="chat-composer">
          <form onSubmit={onSubmit}>
            <button
              type="button" className="chat-composer__icon" aria-label="Send a photo"
              onClick={() => runStarter(STARTERS.find((s) => s.key === 'scan'))}
            >
              <IconCamera className="chat-composer__icon-svg" />
            </button>
            <input
              type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
              placeholder="Type what's in your fridge or what you're craving…" aria-label="Type a message"
            />
            <button type="button" className="chat-composer__icon" aria-label="Voice command">
              <IconMic className="chat-composer__icon-svg" />
            </button>
            <button type="submit" className="chat-composer__send" aria-label="Send" disabled={!draft.trim() || busy}>
              <IconSend className="chat-composer__send-svg" />
            </button>
          </form>
          <p className="chat-composer__hint">Kooka can make mistakes. Check cooking times and temperatures for meat.</p>
        </div>
      </div>
    </div>
  );
}
