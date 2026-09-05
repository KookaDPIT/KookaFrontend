import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import RankBadge, { RankPill } from '../../components/RankBadge';
import * as learnApi from '../../services/learn';
import './Learn.css';

/* ==========================================================================
   LEARN — rank ladder, daily challenges, and a 50-node hexagonal skill tree.

   Everything on this page is backend state. The honeycomb layout comes from
   axial coordinates the server computes at seed time, so the shape of the tree
   is decided in one place rather than by hand-placed pixels here.

   Quizzes are graded server-side: the options arrive without the correct
   answer, and only the chosen indices are sent back. Cooldowns after a failed
   quiz live in the database, so clearing browser storage does not reset them.
   ========================================================================== */

/* Hex geometry — pointy-top. `q`/`r` are axial coordinates from the API. */
const HEX_R = 46;                       // circumradius in px
const HEX_W = Math.sqrt(3) * HEX_R;     // face width AND horizontal spacing
const HEX_H = 2 * HEX_R;                // face height
const HEX_ROW = 1.5 * HEX_R;            // vertical spacing between rows
/* A hairline shrink so neighbours read as separate tiles instead of one blob.
   Any bigger and the honeycomb stops looking joined. */
const HEX_GAP = 1.5;
const PAD = 90;

/* Low enough that "Fit all" is never clamped before the whole board is in
   frame, whatever shape the honeycomb grows into. */
const ZOOM_MIN = 0.28;
const ZOOM_MAX = 1.8;
/* Fitting all 50 nodes shrinks them past the point where labels are readable,
   so the opening view is a comfortable zoom centred on where you left off —
   "Fit" is a button for when you want the whole board. */
const ZOOM_START = 0.9;

function hexToPixel(q, r) {
  return { x: HEX_W * (q + r / 2), y: HEX_ROW * r };
}

function fmtRemaining(untilIso) {
  if (!untilIso) return '';
  const ms = new Date(untilIso).getTime() - Date.now();
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* Read the API error shape used across the app (FastAPI `detail`). */
function errText(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail?.message) return detail.message;
  return fallback;
}

export default function Learn() {
  const { t } = useTranslation();

  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState('');

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  // modal: intro -> quiz -> result, plus the mastery track
  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState('intro');
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // canvas pan/zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const viewportRef = useRef(null);

  const flash = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 4200);
  }, []);

  /* ---- load the tree ---- */
  useEffect(() => {
    let alive = true;
    learnApi
      .getTree()
      .then((data) => {
        if (!alive) return;
        setTree(data);
        // Land on something actionable rather than an arbitrary first node.
        const focus =
          data.lessons.find((l) => l.state === 'available') ||
          data.lessons.find((l) => l.state === 'completed') ||
          data.lessons[0];
        setSelected(focus ? focus.slug : null);
      })
      .catch((err) => alive && setLoadError(errText(err, t('learn.loadFailed'))))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [t]);

  /* ---- load the selected lesson's detail ---- */
  useEffect(() => {
    if (!selected) return undefined;
    let alive = true;
    learnApi
      .getLesson(selected)
      .then((data) => alive && setDetail(data))
      .catch(() => alive && setDetail(null));
    return () => {
      alive = false;
    };
  }, [selected]);

  // Derived rather than a second state: the panel is loading exactly while the
  // detail we hold is not the one that is selected.
  const detailLoading = Boolean(selected) && detail?.slug !== selected;

  const lessons = useMemo(() => tree?.lessons || [], [tree]);
  const branchColor = useMemo(
    () => Object.fromEntries((tree?.branches || []).map((b) => [b.id, b.color])),
    [tree],
  );

  /* ---- canvas geometry: derived from the nodes, never hard-coded ---- */
  const layout = useMemo(() => {
    if (!lessons.length) return null;
    const pts = lessons.map((l) => ({ ...l, ...hexToPixel(l.q, l.r) }));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs) - PAD;
    const minY = Math.min(...ys) - PAD;
    const width = Math.max(...xs) - minX + PAD;
    const height = Math.max(...ys) - minY + PAD;
    const placed = pts.map((p) => ({ ...p, x: p.x - minX, y: p.y - minY }));
    const pos = Object.fromEntries(placed.map((p) => [p.slug, p]));

    // One line per prerequisite edge. A link reads as "live" once the parent is
    // done, which makes the unlocked frontier visible at a glance.
    const links = [];
    placed.forEach((node) => {
      (node.prereqs || []).forEach((parentSlug) => {
        const parent = pos[parentSlug];
        if (!parent) return;
        /* In a packed honeycomb, two tiles that touch already show they are
           connected, so those links stay hidden underneath. Everything else —
           a cross-branch requirement, or a branch head that could not fit
           against the centre — is drawn as a faint dashed "also needs" line.
           Giving those the full solid treatment turned them into bright
           streaks cutting across the board. */
        const span = Math.hypot(node.x - parent.x, node.y - parent.y);
        const reaches = span > HEX_W * 1.1;
        links.push({
          key: `${parentSlug}-${node.slug}`,
          x1: parent.x,
          y1: parent.y,
          x2: node.x,
          y2: node.y,
          live: ['completed', 'mastered'].includes(parent.state),
          reaches,
          color: branchColor[node.branch] || '#c9b18a',
        });
      });
    });
    return { placed, links, width, height };
  }, [lessons, branchColor]);

  /* Centre the board on the selected node once, when the layout first exists.
     `centred` keeps later re-renders (a completed lesson, a new rank) from
     yanking the view back while you are panning around. */
  const centred = useRef(false);
  useEffect(() => {
    if (!layout || !viewportRef.current || centred.current) return;
    const node = layout.placed.find((n) => n.slug === selected) || layout.placed[0];
    const { clientWidth, clientHeight } = viewportRef.current;
    setZoom(ZOOM_START);
    setPan({
      x: clientWidth / 2 - node.x * ZOOM_START,
      y: clientHeight / 2 - node.y * ZOOM_START,
    });
    centred.current = true;
  }, [layout, selected]);

  /* Wheel zooms only with a modifier held. Plain wheel must keep scrolling the
     page: the tree sits mid-page, and hijacking the wheel traps you on it.

     Attached by hand rather than via onWheel because React registers wheel
     listeners as passive, where preventDefault is ignored — with the JSX prop
     the browser zoomed the page as well as the board. */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * (e.deltaY > 0 ? 0.9 : 1.1))));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const onPointerDown = (e) => {
    // Only start a drag on the canvas background, never on a hexagon.
    if (e.target.closest('.lb-hex')) return;
    dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  /* "Fit" shows the whole honeycomb at once — the overview, not the reading view. */
  const resetView = () => {
    if (!layout || !viewportRef.current) return;
    const { clientWidth, clientHeight } = viewportRef.current;
    const fit = Math.min(clientWidth / layout.width, clientHeight / layout.height, 1);
    const next = Math.max(ZOOM_MIN, fit);
    setZoom(next);
    setPan({
      x: (clientWidth - layout.width * next) / 2,
      y: (clientHeight - layout.height * next) / 2,
    });
  };

  /* Bring a node into view when it is picked from outside the canvas. */
  const centreOn = (slug) => {
    const node = layout?.placed.find((n) => n.slug === slug);
    if (!node || !viewportRef.current) return;
    const { clientWidth, clientHeight } = viewportRef.current;
    setPan({ x: clientWidth / 2 - node.x * zoom, y: clientHeight / 2 - node.y * zoom });
  };

  /* ---- lesson / quiz flow ---- */
  const openLesson = () => {
    setPhase('intro');
    setAnswers([]);
    setResult(null);
    setModalOpen(true);
  };

  const startQuiz = (mastery = false) => {
    const questions = mastery ? detail.mastery.quiz : detail.quiz;
    setAnswers(Array(questions.length).fill(null));
    setPhase(mastery ? 'mastery-quiz' : 'quiz');
  };

  const applyTree = (next) => {
    if (!next) return;
    setTree((prev) => ({ ...next, challenges: next.challenges ?? prev?.challenges ?? [] }));
  };

  const refreshDetail = () => {
    if (!selected) return;
    learnApi.getLesson(selected).then(setDetail).catch(() => {});
  };

  const submit = async (mastery) => {
    setSubmitting(true);
    try {
      const res = mastery
        ? await learnApi.submitMastery(selected, answers)
        : await learnApi.submitQuiz(selected, answers);

      applyTree(res.tree);
      setResult(res);

      if (!res.passed) {
        setPhase(mastery ? 'mastery-result' : 'result');
        refreshDetail();
        return;
      }

      setModalOpen(false);
      refreshDetail();

      const parts = [];
      if (mastery && res.mastered) {
        parts.push(t('learn.masteredToast', { name: detail.title, xp: res.xp_gained }));
      } else if (mastery) {
        parts.push(t('learn.masteryQuizPassed'));
      } else {
        parts.push(t('learn.completedToast', { name: detail.title, xp: res.xp_gained }));
      }
      if (res.rank_up) parts.push(t('learn.rankUpToast', { rank: res.rank.tier_label }));
      if (res.unlocked?.length) {
        parts.push(t('learn.unlockedToast', { names: res.unlocked.join(', ') }));
      }
      flash(parts.join(' · '));
    } catch (err) {
      flash(errText(err, t('learn.submitFailed')));
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- render ---- */
  if (loading) {
    return (
      <div className="lb">
        <div className="lb-header">
          <h1 className="lb-header__title">{t('learn.title')}</h1>
        </div>
        <p className="lb-empty">{t('common.loading')}</p>
      </div>
    );
  }

  if (loadError || !tree) {
    return (
      <div className="lb">
        <div className="lb-header">
          <h1 className="lb-header__title">{t('learn.title')}</h1>
        </div>
        <p className="lb-empty">{loadError || t('learn.loadFailed')}</p>
      </div>
    );
  }

  const rank = tree.rank;
  const answered = answers.length > 0 && answers.every((a) => a !== null);
  const isMasteryPhase = phase.startsWith('mastery');
  const activeQuiz = isMasteryPhase ? detail?.mastery?.quiz : detail?.quiz;

  /* modal chrome depends on the phase */
  let modalTitle = detail?.title || '';
  if (phase === 'quiz') modalTitle = t('learn.quizTitle');
  else if (phase === 'mastery-quiz') modalTitle = t('learn.masteryQuizTitle');
  else if (phase === 'result' || phase === 'mastery-result') modalTitle = t('learn.failedTitle');

  let modalFooter = null;
  if (phase === 'intro' && detail) {
    const cd = detail.cooldown_until;
    if (detail.state === 'locked') {
      modalFooter = (
        <button type="button" className="kbtn kbtn--primary" onClick={() => setModalOpen(false)}>
          {t('common.close')}
        </button>
      );
    } else if (cd) {
      modalFooter = (
        <button type="button" className="kbtn kbtn--primary" onClick={() => setModalOpen(false)}>
          {t('common.close')}
        </button>
      );
    } else if (detail.state === 'available') {
      modalFooter = (
        <>
          <button type="button" className="kbtn kbtn--ghost" onClick={() => setModalOpen(false)}>
            {t('common.cancel')}
          </button>
          <button type="button" className="kbtn kbtn--primary" onClick={() => startQuiz(false)}>
            {t('learn.takeQuiz')}
          </button>
        </>
      );
    } else {
      // completed / mastered — the mastery track lives in the body
      modalFooter = (
        <button type="button" className="kbtn kbtn--primary" onClick={() => setModalOpen(false)}>
          {t('common.close')}
        </button>
      );
    }
  } else if (phase === 'quiz' || phase === 'mastery-quiz') {
    modalFooter = (
      <>
        <button type="button" className="kbtn kbtn--ghost" onClick={() => setPhase('intro')}>
          {t('common.back')}
        </button>
        <button
          type="button"
          className="kbtn kbtn--primary"
          onClick={() => submit(isMasteryPhase)}
          disabled={!answered || submitting}
        >
          {submitting ? t('learn.submitting') : t('learn.submitQuiz')}
        </button>
      </>
    );
  } else if (phase === 'result' || phase === 'mastery-result') {
    modalFooter = (
      <button type="button" className="kbtn kbtn--primary" onClick={() => setModalOpen(false)}>
        {t('common.close')}
      </button>
    );
  }

  return (
    <div className="lb">
      <div className="lb-header">
        <h1 className="lb-header__title">{t('learn.title')}</h1>
        <p className="lb-sub">{t('learn.subtitle')}</p>
      </div>

      {/* ===== RANK LADDER ========================================== */}
      <section className="lb-ranks">
        <div className="lb-ranks__head">
          <span className="lb-ranks__label">{t('learn.yourRank')}</span>
          <div className="lb-ranks__current">
            <b>{rank.tier_label}</b>
            <span>
              {rank.xp_total.toLocaleString()} {t('learn.xp')}
              {rank.is_max
                ? ` · ${t('learn.maxRank')}`
                : ` · ${rank.xp_to_next.toLocaleString()} ${t('learn.toNextRank')}`}
            </span>
          </div>
        </div>

        <div className="lb-ranks__tree">
          {(tree.ranks || []).reduce((groups, tier) => {
            // The tier table is flat; group it back into the six rank families.
            const last = groups[groups.length - 1];
            if (last && last.rank === tier.rank) last.tiers.push(tier);
            else groups.push({ rank: tier.rank, name: tier.rank_name, tiers: [tier] });
            return groups;
          }, []).map((group) => {
            const reached = group.tiers.some((x) => x.tier <= rank.tier);
            const isCurrent = group.rank === rank.rank;
            return (
              <div
                key={group.rank}
                className={`lb-rank ${isCurrent ? 'is-current' : ''} ${reached ? 'is-reached' : ''}`}
              >
                <RankBadge
                  rank={group.rank}
                  division={isCurrent ? rank.division : 0}
                  size={78}
                  muted={!reached}
                  title={group.name}
                />
                <span className="lb-rank__name">{group.name}</span>
                <div className="lb-rank__divisions">
                  {group.tiers.map((tier) => (
                    <span
                      key={tier.tier}
                      className="lb-rank__div"
                      style={{
                        backgroundColor: tier.tier <= rank.tier ? tier.vibrant : tier.faded,
                      }}
                      title={`${tier.label} — ${tier.xp.toLocaleString()} XP`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="lb-xpbar">
          <i style={{ width: `${rank.percent}%` }} />
        </div>
      </section>

      {/* ===== DAILY CHALLENGES ===================================== */}
      <section className="lb-challenges">
        <span className="lb-challenges__label">{t('learn.dailyChallenges')}</span>
        {tree.challenges?.length ? (
          <div className="lb-challenges__grid">
            {tree.challenges.map((ch) => (
              <article
                key={ch.id}
                className={`lb-challenge ${ch.done ? 'is-done' : ''} ${ch.locked ? 'is-locked' : ''}`}
              >
                <div
                  className="lb-challenge__photo"
                  style={
                    ch.recipe.image_url
                      ? { backgroundImage: `url(${ch.recipe.image_url})` }
                      : undefined
                  }
                >
                  {!ch.recipe.image_url && <span aria-hidden="true">🍳</span>}
                </div>
                <div className="lb-challenge__content">
                  <div className="lb-challenge__head">
                    <h3 className="lb-challenge__title">{ch.recipe.title}</h3>
                    <RankPill rank={ch.rank} label={ch.rank_name} locked={ch.locked} />
                  </div>
                  <p className="lb-challenge__desc">
                    {ch.locked
                      ? t('learn.challengeLocked', { rank: ch.rank_name })
                      : t('learn.challengeHint')}
                  </p>
                  <div className="lb-challenge__foot">
                    <span className="lb-challenge__reward">+{ch.xp} {t('learn.xp')}</span>
                    {ch.done ? (
                      <span className="lb-challenge__done">✓ {t('learn.challengeDone')}</span>
                    ) : ch.locked ? (
                      <span className="lb-challenge__blocked">🔒</span>
                    ) : (
                      <Link to={`/recipe/${ch.recipe.id}`} className="lb-challenge__btn">
                        {t('common.start')}
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="lb-empty lb-empty--inline">{t('learn.noChallenges')}</p>
        )}
      </section>

      {/* ===== SKILL TREE ========================================== */}
      <section className="lb-grid">
        {/* ---- detail panel ---- */}
        <aside className="lb-side">
          {detail && !detailLoading ? (
            <div className={`lb-detail lb-detail--${detail.state}`}>
              <div className="lb-detail__icon" aria-hidden="true">{detail.icon}</div>
              <span className={`lb-state lb-state--${detail.state}`}>
                {t(`learn.state.${detail.state}`)}
              </span>

              <div className="lb-detail__namerow">
                <h2 className="lb-detail__name">{detail.title}</h2>
                <RankPill rank={rankIdFor(detail.req_tier, tree.ranks)} label={detail.req_tier_label} />
              </div>
              <p className="lb-detail__desc">{detail.summary}</p>

              <ul className="lb-detail__facts">
                <li><b>{detail.steps.length}</b><span>{t('learn.stepsLabel')}</span></li>
                <li><b>{detail.est_min}</b><span>{t('learn.est')}</span></li>
                <li><b>+{detail.xp}</b><span>{t('learn.xp')}</span></li>
              </ul>

              {detail.unlocks?.length > 0 && (
                <div className="lb-detail__unlocks">
                  <span className="lb-detail__unlocks-label">{t('learn.unlocks')}</span>
                  <div className="lb-detail__unlocks-list">
                    {detail.unlocks.map((u) => (
                      <span key={u} className="lb-unlock">{u}</span>
                    ))}
                  </div>
                </div>
              )}

              {detail.state === 'locked' ? (
                <p className="lb-detail__locked">
                  {detail.lock_reason === 'rank'
                    ? t('learn.reqRankHint', { rank: detail.req_tier_label })
                    : t('learn.lockedHint')}
                </p>
              ) : (
                <>
                  {detail.cooldown_until && (
                    <p className="lb-detail__cooldown">
                      {t('learn.cooldownBanner', { time: fmtRemaining(detail.cooldown_until) })}
                    </p>
                  )}
                  <button type="button" className="lb-start" onClick={openLesson}>
                    {detail.state === 'available' ? t('learn.start') : t('learn.review')}
                  </button>
                </>
              )}

              {/* mastery track */}
              {['completed', 'mastered'].includes(detail.state) && (
                <div className={`lb-mastery ${detail.mastery.mastered ? 'is-done' : ''}`}>
                  <span className="lb-mastery__label">{t('learn.mastery')}</span>
                  <ul className="lb-mastery__checks">
                    <li className={detail.mastery.quiz_passed ? 'is-ok' : ''}>
                      {detail.mastery.quiz_passed ? '✓' : '○'} {t('learn.masteryQuizStep')}
                    </li>
                    <li className={detail.mastery.cook_done ? 'is-ok' : ''}>
                      {detail.mastery.cook_done ? '✓' : '○'} {t('learn.masteryCookStep')}
                    </li>
                  </ul>
                  {!detail.mastery.mastered && (
                    <p className="lb-mastery__hint">
                      {!detail.mastery.rank_ok
                        ? t('learn.masteryRankHint', { rank: detail.mastery.req_tier_label })
                        : !detail.mastery.quiz_passed
                          ? t('learn.masteryTakeHint', { xp: detail.mastery.xp })
                          : t('learn.masteryCookHint')}
                    </p>
                  )}
                  {detail.mastery.mastered && (
                    <p className="lb-mastery__hint">{t('learn.masteryComplete')}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="lb-empty lb-empty--inline">
              {detailLoading ? t('common.loading') : t('learn.selectPrompt')}
            </p>
          )}

          <div className="lb-legend">
            <span><i className="lb-legend__dot lb-legend__dot--mastered" />{t('learn.state.mastered')}</span>
            <span><i className="lb-legend__dot lb-legend__dot--completed" />{t('learn.state.completed')}</span>
            <span><i className="lb-legend__dot lb-legend__dot--available" />{t('learn.state.available')}</span>
            <span><i className="lb-legend__dot lb-legend__dot--locked" />{t('learn.state.locked')}</span>
          </div>
        </aside>

        {/* ---- honeycomb ---- */}
        <div className="lb-canvas-wrap">
          <div className="lb-canvas-bar">
            <span className="lb-canvas-bar__stats">
              {t('learn.treeProgress', {
                done: tree.stats.completed,
                total: tree.stats.total,
                mastered: tree.stats.mastered,
              })}
              <em className="lb-canvas-bar__hint">{t('learn.panHint')}</em>
            </span>
            <div className="lb-canvas-bar__zoom">
              <button type="button" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z * 0.85))}
                      aria-label={t('learn.zoomOut')}>−</button>
              <button type="button" onClick={resetView}>{t('learn.fitView')}</button>
              <button type="button" onClick={() => centreOn(selected)} disabled={!selected}>
                {t('learn.locate')}
              </button>
              <button type="button" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z * 1.15))}
                      aria-label={t('learn.zoomIn')}>+</button>
            </div>
          </div>

          <div
            className="lb-viewport"
            ref={viewportRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {layout && (
              <div
                className="lb-canvas"
                style={{
                  width: layout.width,
                  height: layout.height,
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                }}
              >
                <svg className="lb-links" width={layout.width} height={layout.height} aria-hidden="true">
                  {layout.links.map((l) => (
                    <line
                      key={l.key}
                      x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                      className={`lb-link ${l.live ? 'is-live' : ''} ${l.reaches ? 'is-reach' : ''}`}
                      style={l.live ? { stroke: l.color } : undefined}
                    />
                  ))}
                </svg>

                {layout.placed.map((node) => (
                  <button
                    key={node.slug}
                    type="button"
                    className={`lb-hex lb-hex--${node.state} ${selected === node.slug ? 'is-selected' : ''}`}
                    style={{
                      left: node.x,
                      top: node.y,
                      width: HEX_W,
                      '--hex-color': branchColor[node.branch] || '#c9a632',
                    }}
                    onClick={() => setSelected(node.slug)}
                    aria-pressed={selected === node.slug}
                    title={`${node.title} — ${node.req_tier_label}`}
                  >
                    <span
                      className="lb-hex__face"
                      style={{ width: HEX_W - HEX_GAP, height: HEX_H - HEX_GAP }}
                    >
                      <span className="lb-hex__icon">{node.icon}</span>
                      {node.state === 'mastered' && <span className="lb-hex__crown" aria-hidden="true">★</span>}
                      {node.state === 'completed' && <span className="lb-hex__check" aria-hidden="true">✓</span>}
                      {node.state === 'locked' && <span className="lb-hex__lock" aria-hidden="true">🔒</span>}
                    </span>
                    <span className="lb-hex__label">{node.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== LESSON MODAL ===== */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} footer={modalFooter}>
        {phase === 'intro' && detail && (
          <div className="lb-lesson">
            {detail.video_url ? (
              <div className="lb-lesson__video">
                <iframe
                  src={detail.video_url}
                  title={detail.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="lb-lesson__hero" aria-hidden="true">{detail.icon}</div>
            )}

            <p className="lb-lesson__intro">{detail.intro}</p>

            {detail.cooldown_until ? (
              <div className="lb-cooldown">
                <span className="lb-cooldown__icon" aria-hidden="true">⏳</span>
                <p>{t('learn.retryIn', { time: fmtRemaining(detail.cooldown_until) })}</p>
              </div>
            ) : (
              <>
                <span className="lb-lesson__label">{t('learn.whatYouLearn')}</span>
                <ol className="lb-lesson__steps">
                  {detail.steps.map((step, i) => (
                    <li key={i}><span>{i + 1}</span>{step}</li>
                  ))}
                </ol>
                {detail.tips?.length > 0 && (
                  <>
                    <span className="lb-lesson__label">{t('learn.tips')}</span>
                    <ul className="lb-lesson__tips">
                      {detail.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                    </ul>
                  </>
                )}
              </>
            )}

            {/* mastery quiz entry point, once the lesson itself is done */}
            {['completed', 'mastered'].includes(detail.state) && !detail.mastery.mastered && (
              <div className="lb-lesson__mastery">
                <span className="lb-lesson__label">{t('learn.mastery')}</span>
                {!detail.mastery.rank_ok ? (
                  <p className="lb-lesson__masteryHint">
                    {t('learn.masteryRankHint', { rank: detail.mastery.req_tier_label })}
                  </p>
                ) : detail.mastery.quiz_passed ? (
                  <p className="lb-lesson__masteryHint">{t('learn.masteryCookHint')}</p>
                ) : detail.mastery.cooldown_until ? (
                  <p className="lb-lesson__masteryHint">
                    {t('learn.retryIn', { time: fmtRemaining(detail.mastery.cooldown_until) })}
                  </p>
                ) : (
                  <button type="button" className="lb-start lb-start--ghost" onClick={() => startQuiz(true)}>
                    {t('learn.takeMasteryQuiz', { xp: detail.mastery.xp })}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {(phase === 'quiz' || phase === 'mastery-quiz') && activeQuiz && (
          <div className="lb-quiz">
            <p className="lb-quiz__intro">
              {isMasteryPhase ? t('learn.masteryQuizIntro') : t('learn.quizIntro')}
            </p>
            {activeQuiz.map((q, qi) => (
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

        {(phase === 'result' || phase === 'mastery-result') && result && (
          <div className="lb-result">
            <div className="lb-result__icon" aria-hidden="true">😕</div>
            <p className="lb-result__score">
              {t('learn.scoreLine', { score: result.score, total: result.total })}
            </p>
            <p className="lb-result__retry">
              {t('learn.retryIn', { time: fmtRemaining(result.cooldown_until) })}
            </p>
          </div>
        )}
      </Modal>

      <Toast message={toast} />
    </div>
  );
}

/* Map a tier index back to its rank family, for the pill next to a lesson. */
function rankIdFor(tier, tiers) {
  const row = (tiers || []).find((x) => x.tier === tier);
  return row ? row.rank : 'copper';
}
