import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import './Learn.css';

/* ==========================================================================
   LEARN — a hexagonal skill tree ("honeycomb"). Techniques, not just recipes.

   Unlocking is gated two ways: a skill's prerequisites must be mastered AND you
   must have reached its required level. Each lesson ends in a short quiz — pass
   every question to master the skill (awarding XP, which can level you up and
   unlock higher-level skills). Miss the quiz and the lesson goes on a 24h
   cooldown, persisted in localStorage so it survives a reload.

   Skill copy + quiz questions are illustrative mock content; the UI chrome is
   translated via i18n.
   ========================================================================== */

const PER_LEVEL = 500;
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h
const CD_KEY = 'kooka_quiz_cd';

/* ===== RANKS SYSTEM ================================================== */
const RANKS = [
  { id: 'copper', name: 'Copper', divisions: 3, fadedColor: '#d9a8a0', vibrantColor: '#d74d34' },
  { id: 'bronze', name: 'Bronze', divisions: 3, fadedColor: '#d4b5a0', vibrantColor: '#b8753d' },
  { id: 'silver', name: 'Silver', divisions: 3, fadedColor: '#d5d0c8', vibrantColor: '#8b8882' },
  { id: 'gold', name: 'Gold', divisions: 3, fadedColor: '#dcc793', vibrantColor: '#c9a632' },
  { id: 'platinum', name: 'Platinum', divisions: 3, fadedColor: '#d0e8f2', vibrantColor: '#4fa3c8' },
  { id: 'chef', name: 'Chef', divisions: 1, fadedColor: '#e6cde0', vibrantColor: '#d16ba8' },
];

/* ===== DAILY CHALLENGES ============================================== */
const DAILY_CHALLENGES = [
  {
    id: 'main-daily',
    title: 'Master the Sauce',
    desc: 'Perfect an emulsion or pan sauce technique.',
    xp: 150,
    type: 'hard',
  },
  {
    id: 'hard-daily',
    title: 'Bread Challenge',
    desc: 'Bake a loaf with a perfect crumb structure.',
    xp: 100,
    type: 'hard',
  },
  {
    id: 'easy-1',
    title: 'Knife Practice',
    desc: 'Practice knife skills with any vegetable.',
    xp: 50,
    type: 'easy',
  },
];

/* pixel centres on the 720×660 canvas — connectors read straight from these */
const SKILLS = {
  found: {
    name: 'Foundations', icon: '🍳', cx: 360, cy: 66, reqLevel: 1,
    lessons: 5, min: 40, xp: 250,
    desc: 'Salt, heat, acid, fat. The four dials every dish turns on — and how to taste your way between them.',
    unlocks: ['Knife Skills', 'Heat Control'],
    quiz: [
      { q: 'Which four elements does great cooking balance?', options: ['Salt, fat, acid, heat', 'Sugar, oil, water, ice', 'Flour, egg, milk, butter', 'Pepper, garlic, onion, wine'], correct: 0 },
      { q: 'The best way to check seasoning is to…', options: ['Trust the recipe exactly', 'Taste as you go', 'Salt only at the end', 'Never taste while cooking'], correct: 1 },
    ],
  },
  knife: {
    name: 'Knife Skills', icon: '🔪', cx: 214, cy: 196, reqLevel: 1,
    lessons: 6, min: 55, xp: 300,
    desc: 'Grip, claw and rock. Turn an onion into an even dice without donating a fingertip.',
    unlocks: ['Mise en Place', 'Eggs Mastery'],
    quiz: [
      { q: "The 'claw' grip mainly protects your…", options: ['Wrist', 'Fingertips', 'Thumb only', 'Palm'], correct: 1 },
      { q: 'A sharp knife is safer because it…', options: ['Needs less force and slips less', 'Cuts faster so you finish sooner', 'Looks more professional', 'Is heavier to hold'], correct: 0 },
    ],
  },
  heat: {
    name: 'Heat Control', icon: '🔥', cx: 506, cy: 196, reqLevel: 2,
    lessons: 4, min: 35, xp: 220,
    desc: 'Read the pan, not the timer. Smoke points, carryover and the difference between a sear and a stew.',
    unlocks: ['Eggs Mastery', 'Sear & Sauté'],
    quiz: [
      { q: 'Carryover cooking means food…', options: ['Stops the moment it leaves the heat', 'Keeps cooking after you remove the heat', 'Only cooks in the oven', 'Cooks twice as fast'], correct: 1 },
      { q: 'Add food to a pan when the oil is…', options: ['Cold', 'Shimmering and hot', 'Smoking heavily', 'Barely warm'], correct: 1 },
    ],
  },
  mise: {
    name: 'Mise en Place', icon: '🧺', cx: 120, cy: 326, reqLevel: 3,
    lessons: 3, min: 25, xp: 150,
    desc: 'Everything in its place before the pan gets hot. The habit that makes weeknight cooking calm.',
    unlocks: ['Emulsions'],
    quiz: [
      { q: "'Mise en place' translates roughly to…", options: ['Everything in its place', 'Cook it on high', 'Clean as you go', 'Plate it nicely'], correct: 0 },
      { q: 'When should you prep your ingredients?', options: ['While the pan heats mid-cook', 'Before the pan gets hot', 'After plating', 'Only when baking'], correct: 1 },
    ],
  },
  eggs: {
    name: 'Eggs Mastery', icon: '🥚', cx: 360, cy: 326, reqLevel: 3,
    lessons: 5, min: 45, xp: 260,
    desc: 'Soft scramble to glassy custard. Eggs are the exam every technique eventually sits.',
    unlocks: ['Emulsions'],
    quiz: [
      { q: 'For a silky scramble, use…', options: ['High heat, stir once', 'Low heat, stir constantly', 'Boiling water', 'No stirring at all'], correct: 1 },
      { q: 'A classic French omelette should be…', options: ['Browned and crisp', 'Pale and custardy', 'Rock hard', 'Deep fried'], correct: 1 },
    ],
  },
  sear: {
    name: 'Sear & Sauté', icon: '🍤', cx: 600, cy: 326, reqLevel: 4,
    lessons: 4, min: 40, xp: 240,
    desc: 'Dry the surface, trust the crust. Build fond and deglaze it into a pan sauce.',
    unlocks: ['Fermentation'],
    quiz: [
      { q: 'Before searing, the surface of the meat should be…', options: ['Wet', 'Patted dry', 'Frozen solid', 'Heavily oiled'], correct: 1 },
      { q: 'The browned bits stuck to the pan are called…', options: ['Fond', 'Roux', 'Slurry', 'Curd'], correct: 0 },
    ],
  },
  emul: {
    name: 'Emulsions', icon: '🥣', cx: 244, cy: 456, reqLevel: 5,
    lessons: 4, min: 50, xp: 320,
    desc: 'Mayonnaise, hollandaise, carbonara. Force oil and water to hold hands and stay together.',
    unlocks: ['Bread Craft'],
    quiz: [
      { q: 'An emulsion combines…', options: ['Two solids', 'Fat and water that normally separate', 'Sugar and salt', 'Air and flour'], correct: 1 },
      { q: 'If a carbonara sauce breaks, rescue it with…', options: ['More cheese over high heat', 'A splash of hot pasta water, off the heat', 'Cold cream', 'Butter and sugar'], correct: 1 },
    ],
  },
  ferment: {
    name: 'Fermentation', icon: '🫙', cx: 476, cy: 456, reqLevel: 6,
    lessons: 6, min: 70, xp: 380,
    desc: 'Let time and salt do the cooking. Krauts, hot sauces and the good kind of funk.',
    unlocks: ['Bread Craft'],
    quiz: [
      { q: 'Salt in a ferment mainly…', options: ['Adds sweetness', 'Favours good microbes and slows bad ones', 'Speeds up browning', 'Thickens the brine'], correct: 1 },
      { q: 'A healthy vegetable ferment should be kept…', options: ['Exposed to the air', 'Submerged under its brine', 'In the freezer', 'In direct sun'], correct: 1 },
    ],
  },
  bread: {
    name: 'Bread Craft', icon: '🍞', cx: 360, cy: 586, reqLevel: 8,
    lessons: 8, min: 120, xp: 500,
    desc: 'Hydration, gluten and a patient oven. The capstone: a loaf with an open, glossy crumb.',
    unlocks: [],
    quiz: [
      { q: 'Higher-hydration dough tends to give a…', options: ['Denser crumb', 'More open crumb', 'Sweeter loaf', 'Thicker crust only'], correct: 1 },
      { q: 'Kneading mainly develops…', options: ['Gluten', 'Sugar', 'Fat', 'Salt'], correct: 0 },
    ],
  },
};

const LINKS = [
  ['found', 'knife'], ['found', 'heat'],
  ['knife', 'mise'], ['knife', 'eggs'],
  ['heat', 'eggs'], ['heat', 'sear'],
  ['mise', 'emul'], ['eggs', 'emul'],
  ['sear', 'ferment'],
  ['emul', 'bread'], ['ferment', 'bread'],
];

const ORDER = Object.keys(SKILLS);

/* prerequisites: for each child, the parents that must be mastered to unlock it */
const PREREQ = LINKS.reduce((acc, [from, to]) => {
  (acc[to] = acc[to] || []).push(from);
  return acc;
}, {});

/* derive a skill's state from what's completed + the current level */
function computeState(completed, level, id) {
  if (completed.has(id)) return 'done';
  const prereqsDone = (PREREQ[id] || []).every((p) => completed.has(p));
  const levelOk = level >= SKILLS[id].reqLevel;
  return prereqsDone && levelOk ? 'active' : 'locked';
}

function loadCooldowns() {
  try {
    return JSON.parse(localStorage.getItem(CD_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function fmtRemaining(ms) {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function Learn() {
  const { t } = useTranslation();
  const [completed, setCompleted] = useState(() => new Set(['found', 'knife', 'heat']));
  const [selected, setSelected] = useState('eggs');
  const [xp, setXp] = useState(200);
  const [level, setLevel] = useState(3);
  const [cooldowns, setCooldowns] = useState(loadCooldowns);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState('');
  const [globalProgress, setGlobalProgress] = useState(-1);

  // lesson modal
  const [lessonOpen, setLessonOpen] = useState(false);
  const [phase, setPhase] = useState('intro'); // intro | quiz | result
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);

  const handleDivisionClick = (rankIndex, divIndex) => {
    const globalIndex = RANKS.slice(0, rankIndex).reduce((sum, r) => sum + r.divisions, 0) + divIndex;
    if (globalIndex === globalProgress) {
      setGlobalProgress(-1);
    } else {
      setGlobalProgress(globalIndex);
    }
  };

  const skill = SKILLS[selected];
  const selState = computeState(completed, level, selected);
  const lockReason = (PREREQ[selected] || []).every((p) => completed.has(p)) ? 'level' : 'prereq';
  const cdUntil = cooldowns[selected] && cooldowns[selected] > now ? cooldowns[selected] : 0;

  const stateLabel = { done: t('learn.done'), active: t('learn.inProgress'), locked: t('learn.locked') };

  // tick the clock once a minute while a cooldown could be showing
  useEffect(() => {
    if (!lessonOpen) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [lessonOpen]);

  const flash = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3200);
  };

  const links = LINKS.map(([a, b]) => {
    const sa = computeState(completed, level, a);
    const sb = computeState(completed, level, b);
    const live = sa === 'done' || (sa === 'active' && sb !== 'locked');
    return { a, b, x1: SKILLS[a].cx, y1: SKILLS[a].cy, x2: SKILLS[b].cx, y2: SKILLS[b].cy, live };
  });

  const openLesson = () => {
    setPhase('intro');
    setAnswers([]);
    setResult(null);
    setNow(Date.now());
    setLessonOpen(true);
  };

  const startQuiz = () => {
    setAnswers(Array(skill.quiz.length).fill(null));
    setPhase('quiz');
  };

  const complete = () => {
    const nextCompleted = new Set(completed);
    nextCompleted.add(selected);

    let nx = xp + skill.xp;
    let nl = level;
    while (nx >= PER_LEVEL) {
      nx -= PER_LEVEL;
      nl += 1;
    }

    // which skills become available thanks to this completion / level-up?
    const before = ORDER.filter((id) => computeState(completed, level, id) === 'active');
    const after = ORDER.filter((id) => computeState(nextCompleted, nl, id) === 'active');
    const freed = after.filter((id) => !before.includes(id)).map((id) => SKILLS[id].name);

    setCompleted(nextCompleted);
    setXp(nx);
    setLevel(nl);
    setLessonOpen(false);

    const parts = [t('learn.masteredToast', { name: skill.name, xp: skill.xp })];
    if (nl > level) parts.push(t('learn.levelUpToast', { level: nl }));
    if (freed.length) parts.push(t('learn.unlockedToast', { names: freed.join(', ') }));
    flash(parts.join(' · '));
  };

  const submitQuiz = () => {
    const total = skill.quiz.length;
    const score = skill.quiz.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
    if (score === total) {
      complete();
      return;
    }
    // miss → 24h cooldown, persisted
    const until = Date.now() + COOLDOWN_MS;
    const nextCd = { ...cooldowns, [selected]: until };
    setCooldowns(nextCd);
    try {
      localStorage.setItem(CD_KEY, JSON.stringify(nextCd));
    } catch {
      /* ignore storage errors */
    }
    setResult({ score, total });
    setPhase('result');
  };

  const pct = Math.round((xp / PER_LEVEL) * 100);
  const answered = answers.length > 0 && answers.every((a) => a !== null);

  // ---- modal title + footer depend on the phase ----
  let modalTitle = skill.name;
  if (phase === 'quiz') modalTitle = t('learn.quizTitle');
  else if (phase === 'result') modalTitle = t('learn.failedTitle');

  let modalFooter = null;
  if (phase === 'intro') {
    if (selState === 'done') {
      modalFooter = (
          <>
            <button type="button" className="kbtn kbtn--ghost" onClick={() => setLessonOpen(false)}>{t('common.close')}</button>
            <button type="button" className="kbtn kbtn--primary" onClick={() => setLessonOpen(false)}>{t('learn.practiceAgain')}</button>
          </>
      );
    } else if (cdUntil) {
      modalFooter = (
          <button type="button" className="kbtn kbtn--primary" onClick={() => setLessonOpen(false)}>{t('common.close')}</button>
      );
    } else {
      modalFooter = (
          <>
            <button type="button" className="kbtn kbtn--ghost" onClick={() => setLessonOpen(false)}>{t('common.cancel')}</button>
            <button type="button" className="kbtn kbtn--primary" onClick={startQuiz}>{t('learn.takeQuiz')}</button>
          </>
      );
    }
  } else if (phase === 'quiz') {
    modalFooter = (
        <>
          <button type="button" className="kbtn kbtn--ghost" onClick={() => setPhase('intro')}>{t('common.back')}</button>
          <button type="button" className="kbtn kbtn--primary" onClick={submitQuiz} disabled={!answered}>{t('learn.submitQuiz')}</button>
        </>
    );
  } else if (phase === 'result') {
    modalFooter = (
        <button type="button" className="kbtn kbtn--primary" onClick={() => setLessonOpen(false)}>{t('common.close')}</button>
    );
  }

  return (
      <div className="lb">
        {/* ===== HEADER WITH TITLE ===================================== */}
        <div className="lb-header">
          <h1 className="lb-header__title">{t('learn.title')}</h1>
        </div>

        {/* ===== RANKS DISPLAY ========================================= */}
        <div className="lb-ranks">
          <span className="lb-ranks__label">{t('learn.yourRank') || 'Your Progress'}</span>
          <div className="lb-ranks__tree">
            {RANKS.map((rank, rankIndex) => {
              const rankStartIndex = RANKS.slice(0, rankIndex).reduce((sum, r) => sum + r.divisions, 0);
              return (
                  <div key={rank.id} className="lb-rank">
                    <div className="lb-rank__photo" aria-hidden="true" />
                    <span className="lb-rank__name">{rank.name}</span>
                    <div className="lb-rank__divisions">
                      {Array.from({ length: rank.divisions }).map((_, divIndex) => {
                        const globalIndex = rankStartIndex + divIndex;
                        const isFilled = globalIndex <= globalProgress;
                        const color = isFilled ? rank.vibrantColor : rank.fadedColor;
                        return (
                            <button
                                key={divIndex}
                                type="button"
                                className="lb-rank__div"
                                style={{ backgroundColor: color }}
                                onClick={() => handleDivisionClick(rankIndex, divIndex)}
                                aria-label={`${rank.name} Division ${divIndex + 1}`}
                            />
                        );
                      })}
                    </div>
                  </div>
              );
            })}
          </div>
        </div>

        {/* ===== DAILY CHALLENGES ===================================== */}
        <div className="lb-challenges">
          <span className="lb-challenges__label">{t('learn.dailyChallenges') || 'Daily Challenges'}</span>
          <div className="lb-challenges__grid">
            {DAILY_CHALLENGES.map((challenge) => {
              const isHard = challenge.type === 'hard';
              return (
                  <div key={challenge.id} className="lb-challenge">
                    <div className="lb-challenge__icon" aria-hidden="true" />
                    <div className="lb-challenge__content">
                      <div className="lb-challenge__head">
                        <h3 className="lb-challenge__title">{challenge.title}</h3>
                        <span className={`lb-challenge__tag ${isHard ? 'lb-challenge__tag--hard' : 'lb-challenge__tag--easy'}`}>
                      {isHard ? 'Hard' : 'Easy'}
                    </span>
                      </div>
                      <p className="lb-challenge__desc">{challenge.desc}</p>
                      <div className="lb-challenge__reward">
                        <span className="lb-challenge__reward-val">+{challenge.xp}</span>
                        <span className="lb-challenge__reward-label">XP</span>
                      </div>
                    </div>
                    <button type="button" className="lb-challenge__btn">{t('common.start') || 'Start'}</button>
                  </div>
              );
            })}
          </div>
        </div>

        {/* ===== MASTERY SECTION (ORIGINAL) ============================= */}
        <div className="lb-grid">
          {/* ===== DETAIL PANEL (left, sticky) ===== */}
          <aside className="lb-side">
            <header className="lb-side__head">
              <p className="lb-sub">{t('learn.subtitle')}</p>
            </header>

            {/* level / XP */}
            <div className="lb-level">
              <div className="lb-level__top">
                <span className="lb-level__badge">{level}</span>
                <div>
                  <span className="lb-level__label">{t('learn.levelLabel')}</span>
                  <b className="lb-level__val">{xp.toLocaleString()} {t('learn.xp')}</b>
                </div>
              </div>
              <div className="lb-level__bar"><i style={{ width: `${pct}%` }} /></div>
              <span className="lb-level__hint">
              {(PER_LEVEL - xp).toLocaleString()} {t('learn.xp')} {t('learn.toNext')}
            </span>
            </div>

            {/* selected-skill detail — reacts to the honeycomb */}
            <div className={`lb-detail lb-detail--${selState}`}>
              <div className="lb-detail__icon" aria-hidden="true">{skill.icon}</div>
              <span className={`lb-state lb-state--${selState}`}>{stateLabel[selState]}</span>

              <div className="lb-detail__namerow">
                <h2 className="lb-detail__name">{skill.name}</h2>
                <span className="lb-detail__lvl">{t('learn.levelBadge', { level: skill.reqLevel })}</span>
              </div>
              <p className="lb-detail__desc">{skill.desc}</p>

              <ul className="lb-detail__facts">
                <li><b>{skill.lessons}</b><span>{t('learn.lessons')}</span></li>
                <li><b>{skill.min}</b><span>{t('learn.est')}</span></li>
                <li><b>+{skill.xp}</b><span>{t('learn.xp')}</span></li>
              </ul>

              {skill.unlocks.length > 0 && (
                  <div className="lb-detail__unlocks">
                    <span className="lb-detail__unlocks-label">{t('learn.unlocks')}</span>
                    <div className="lb-detail__unlocks-list">
                      {skill.unlocks.map((u) => <span key={u} className="lb-unlock">{u}</span>)}
                    </div>
                  </div>
              )}

              {selState === 'locked' ? (
                  <p className="lb-detail__locked">
                    {lockReason === 'level'
                        ? t('learn.reqLevelHint', { level: skill.reqLevel })
                        : t('learn.lockedHint')}
                  </p>
              ) : selState === 'active' && cdUntil ? (
                  <>
                    <p className="lb-detail__cooldown">{t('learn.cooldownBanner', { time: fmtRemaining(cdUntil - now) })}</p>
                    <button type="button" className="lb-start" onClick={openLesson}>{t('learn.start')}</button>
                  </>
              ) : (
                  <button type="button" className="lb-start" onClick={openLesson}>
                    {selState === 'done' ? t('learn.review') : t('learn.start')}
                  </button>
              )}
            </div>

            <div className="lb-legend">
              <span><i className="lb-legend__dot lb-legend__dot--done" />{t('learn.legend.done')}</span>
              <span><i className="lb-legend__dot lb-legend__dot--active" />{t('learn.legend.active')}</span>
              <span><i className="lb-legend__dot lb-legend__dot--locked" />{t('learn.legend.locked')}</span>
            </div>
          </aside>

          {/* ===== HONEYCOMB CANVAS (right) ===== */}
          <div className="lb-canvas-wrap">
            <div className="lb-canvas">
              <svg className="lb-links" viewBox="0 0 720 660" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                {links.map((l) => (
                    <line key={`${l.a}-${l.b}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                          className={`lb-link ${l.live ? 'is-live' : ''}`} />
                ))}
              </svg>

              {ORDER.map((id) => {
                const st = computeState(completed, level, id);
                const s = SKILLS[id];
                return (
                    <button
                        key={id}
                        type="button"
                        className={`lb-hex lb-hex--${st} ${selected === id ? 'is-selected' : ''}`}
                        style={{ left: `${(s.cx / 720) * 100}%`, top: `${(s.cy / 660) * 100}%` }}
                        onClick={() => setSelected(id)}
                        aria-pressed={selected === id}
                    >
                      <span className="lb-hex__ring" aria-hidden="true" />
                      <span className="lb-hex__face">
                    <span className="lb-hex__icon">{s.icon}</span>
                        {st === 'done' && <span className="lb-hex__check" aria-hidden="true">✓</span>}
                        {st === 'locked' && <span className="lb-hex__lock" aria-hidden="true">🔒</span>}
                  </span>
                      <span className="lb-hex__label">{s.name}</span>
                    </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===== LESSON / QUIZ MODAL ===== */}
        <Modal open={lessonOpen} onClose={() => setLessonOpen(false)} title={modalTitle} footer={modalFooter}>
          {phase === 'intro' && (
              <div className="lb-lesson">
                <div className="lb-lesson__hero" aria-hidden="true">{skill.icon}</div>
                <p className="lb-lesson__desc">{skill.desc}</p>

                {selState === 'active' && cdUntil ? (
                    <div className="lb-cooldown">
                      <span className="lb-cooldown__icon" aria-hidden="true">⏳</span>
                      <p>{t('learn.retryIn', { time: fmtRemaining(cdUntil - now) })}</p>
                    </div>
                ) : (
                    <>
                      <span className="lb-lesson__label">{t('learn.whatYouLearn')}</span>
                      <ol className="lb-lesson__steps">
                        {t('learn.steps', { returnObjects: true }).map((step, i) => (
                            <li key={i}><span>{i + 1}</span>{step}</li>
                        ))}
                      </ol>
                    </>
                )}
              </div>
          )}

          {phase === 'quiz' && (
              <div className="lb-quiz">
                <p className="lb-quiz__intro">{t('learn.quizIntro')}</p>
                {skill.quiz.map((q, qi) => (
                    <fieldset className="lb-quiz__q" key={qi}>
                      <legend>{q.q}</legend>
                      <div className="lb-quiz__opts">
                        {q.options.map((opt, oi) => (
                            <label key={oi} className={`lb-opt ${answers[qi] === oi ? 'is-picked' : ''}`}>
                              <input
                                  type="radio"
                                  name={`q${qi}`}
                                  checked={answers[qi] === oi}
                                  onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                              />
                              <span>{opt}</span>
                            </label>
                        ))}
                      </div>
                    </fieldset>
                ))}
              </div>
          )}

          {phase === 'result' && result && (
              <div className="lb-result">
                <div className="lb-result__icon" aria-hidden="true">😕</div>
                <p className="lb-result__score">{t('learn.scoreLine', { score: result.score, total: result.total })}</p>
                <p className="lb-result__retry">{t('learn.retryIn', { time: fmtRemaining(COOLDOWN_MS) })}</p>
              </div>
          )}
        </Modal>

        <Toast message={toast} />
      </div>
  );
}