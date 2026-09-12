import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../user';
import {
  ROLES, SUSPENSIONS, getModerationQueue, hideRecipe, restoreRecipe, deleteRecipe,
  getForumQueue, hideForumPost, restoreForumPost, deleteForumPost,
  listUsers, setUserRole, suspendUser, unsuspendUser,
  deactivateUser, activateUser, analyzeRecipe, runAnalyzeAll,
} from '../../services/admin';
import { getReportQueue, actOnReport } from '../../services/reports';
import RoleBadge from '../../components/RoleBadge';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import AdminLessons from './AdminLessons';
import AdminDashboard from './AdminDashboard';
import './Admin.css';

/* ==========================================================================
   MODERATION — the staff console behind /admin.

   Panes, matching what the backend exposes:
     · Dashboard — totals, the last week, the open queues (GET /admin/stats).
     · Recipes — the AI-flagged queue (GET /admin/recipes), hide or delete.
     · People  — search accounts, change roles, suspend, deactivate.

   Role changes are admin-only server-side (require_role("admin")); moderators
   see the control disabled rather than hidden, so it is obvious the tool exists
   and why they can't use it. The route guard below only spares a plain user the
   403 — the real check is on every endpoint.
   ========================================================================== */

const RECIPE_FILTERS = ['flagged', 'hidden', 'ok'];
const FORUM_FILTERS = ['ok', 'hidden'];

/* Prefer the backend's own message (it explains *why* an action was refused —
   "you can't suspend an account with an equal or higher role") over a generic
   one. */
function errorText(err, t) {
  const detail = err?.response?.data?.detail;
  return typeof detail === 'string' ? detail : t('common.error');
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

export default function Admin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [me] = useUser();

  const role = me?.role || 'user';
  const isStaff = role === 'admin' || role === 'moderator';
  const isAdmin = role === 'admin';

  // opens on the summary: what needs a moderator comes before who to search for
  const [pane, setPane] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState(null);

  /* Both lists remember which query they answer (`...For`). Deriving "loading"
     from that instead of a separate boolean means the spinner can never get out
     of step with the data — switching filters shows loading until the matching
     response lands, with no flag to reset. */

  // recipes pane
  const [recipeFilter, setRecipeFilter] = useState('flagged');
  const [recipes, setRecipes] = useState([]);
  const [recipesFor, setRecipesFor] = useState(null);
  const recipesLoading = recipesFor !== recipeFilter;

  // users pane
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [users, setUsers] = useState([]);
  const [usersFor, setUsersFor] = useState(null);
  const usersKey = JSON.stringify([query, roleFilter]);
  const usersLoading = usersFor !== usersKey;

  // forum pane
  const [forumFilter, setForumFilter] = useState('ok');
  const [forumQuery, setForumQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [postsFor, setPostsFor] = useState(null);
  const forumKey = JSON.stringify([forumFilter, forumQuery]);
  const postsLoading = postsFor !== forumKey;

  /* "Re-analyse everything" — a loop of small batches, so the operator can see
     it moving and stop it. `sweep` is null when idle. */
  const [sweep, setSweep] = useState(null); // { scope, updated, flagged, remaining, total }
  const sweepCancel = useRef(false);

  // reports pane
  const [reportFilter, setReportFilter] = useState('open');
  const [reports, setReports] = useState([]);
  const [reportsFor, setReportsFor] = useState(null);
  const reportsLoading = reportsFor !== reportFilter;

  // confirmation for the destructive actions
  const [confirm, setConfirm] = useState(null); // { kind, id, label }
  // who we are about to suspend, and for how long
  const [suspendFor, setSuspendFor] = useState(null); // { id, label }

  const flash = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  }, []);

  /* Stable identity, so the load effects below can list it as a dependency
     honestly instead of quietly omitting it. */
  const fail = useCallback((err) => flash(errorText(err, t)), [flash, t]);

  const startSweep = async (scope) => {
    if (sweep) return;
    sweepCancel.current = false;
    setSweep({ scope, updated: 0, flagged: 0, remaining: null, total: null });
    try {
      const res = await runAnalyzeAll({
        scope,
        onProgress: (p) => setSweep((s) => (s ? { ...s, ...p } : s)),
        shouldStop: () => sweepCancel.current,
      });
      if (res.stopped === 'unavailable') {
        flash(t('admin.analyzeAllStopped', { count: res.updated }));
      } else if (res.stopped === 'cancelled') {
        flash(t('admin.analyzeAllCancelled', { count: res.updated }));
      } else {
        flash(t('admin.analyzeAllDone', { count: res.updated, flagged: res.flagged }));
      }
      // the queue on screen is now out of date — refetch whichever filter is up
      setRecipesFor(null);
    } catch (err) {
      fail(err);
    } finally {
      setSweep(null);
    }
  };

  // a non-staff account has nothing to do here
  useEffect(() => {
    if (me && !isStaff) navigate('/profile', { replace: true });
  }, [me, isStaff, navigate]);

  useEffect(() => {
    if (!isStaff || pane !== 'recipes' || recipesFor === recipeFilter) return undefined;
    let alive = true;
    getModerationQueue(recipeFilter)
      .then((data) => {
        if (!alive) return;
        setRecipes(data || []);
        setRecipesFor(recipeFilter);
      })
      .catch((err) => { if (alive) fail(err); });
    return () => { alive = false; };
  }, [isStaff, pane, recipeFilter, recipesFor, fail]);

  useEffect(() => {
    if (!isStaff || pane !== 'reports' || reportsFor === reportFilter) return undefined;
    let alive = true;
    getReportQueue(reportFilter)
      .then((data) => {
        if (!alive) return;
        setReports(data || []);
        setReportsFor(reportFilter);
      })
      .catch((err) => { if (alive) fail(err); });
    return () => { alive = false; };
  }, [isStaff, pane, reportFilter, reportsFor, fail]);

  /* debounce the search so typing does not fire a request per keystroke */
  useEffect(() => {
    if (!isStaff || pane !== 'users' || usersFor === usersKey) return undefined;
    let alive = true;
    const id = window.setTimeout(() => {
      listUsers({ q: query, role: roleFilter })
        .then((data) => {
          if (!alive) return;
          setUsers(data || []);
          setUsersFor(usersKey);
        })
        .catch((err) => { if (alive) fail(err); });
    }, 300);
    return () => { alive = false; window.clearTimeout(id); };
  }, [isStaff, pane, query, roleFilter, usersKey, usersFor, fail]);

  useEffect(() => {
    if (!isStaff || pane !== 'forum' || postsFor === forumKey) return undefined;
    let alive = true;
    const id = window.setTimeout(() => {
      getForumQueue({ status: forumFilter, q: forumQuery })
        .then((data) => {
          if (!alive) return;
          setPosts(data || []);
          setPostsFor(forumKey);
        })
        .catch((err) => { if (alive) fail(err); });
    }, 250);
    return () => { alive = false; window.clearTimeout(id); };
  }, [isStaff, pane, forumFilter, forumQuery, forumKey, postsFor, fail]);

  /* run an action, then patch the affected row in place — reloading the whole
     list would lose the moderator's scroll position mid-triage */
  const act = async (id, fn, message) => {
    setBusyId(id);
    try {
      const updated = await fn();
      if (updated && updated.id) {
        setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
      }
      if (message) flash(message);
      return true;
    } catch (err) {
      fail(err);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (user, next) => {
    if (next === user.role) return;
    await act(user.id, () => setUserRole(user.id, next), t('admin.roleChanged', { role: t(`roles.${next}`) }));
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, id } = confirm;
    if (kind === 'deleteRecipe') {
      const ok = await act(id, () => deleteRecipe(id), t('admin.recipeDeleted'));
      if (ok) setRecipes((list) => list.filter((r) => r.id !== id));
    } else if (kind === 'deletePost') {
      const ok = await act(id, () => deleteForumPost(id), t('admin.postDeleted'));
      if (ok) setPosts((list) => list.filter((x) => x.id !== id));
    } else if (kind === 'deactivate') {
      const ok = await act(id, () => deactivateUser(id), t('admin.userDeactivated'));
      if (ok) setUsers((list) => list.map((u) => (u.id === id ? { ...u, is_active: false } : u)));
    }
    setConfirm(null);
  };

  if (!isStaff) return null;

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">{t('admin.title')}</h1>
          <p className="adm-sub">{t('admin.subtitle')}</p>
        </div>
        <RoleBadge role={role} />
      </header>

      <div className="adm-panes" role="tablist">
        {['dashboard', 'reports', 'users', 'recipes', 'forum', 'lessons'].map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={pane === k}
            className={`adm-pane ${pane === k ? 'is-active' : ''}`}
            onClick={() => setPane(k)}
          >
            {t(`admin.panes.${k}`)}
          </button>
        ))}
      </div>

      {/* ===================== PEOPLE ===================== */}
      {/* The queue cards link straight through to the pane that can act on
          them, so the summary is a way in rather than a dead end. */}
      {pane === 'dashboard' && <AdminDashboard onOpenPane={setPane} />}

      {pane === 'users' && (
        <section className="adm-section">
          <div className="adm-filters">
            <input
              className="adm-search"
              type="search"
              value={query}
              placeholder={t('admin.searchPh')}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('admin.searchPh')}
            />
            <select
              className="adm-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label={t('admin.filterRole')}
            >
              <option value="">{t('admin.allRoles')}</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{t(`roles.${r}`)}</option>
              ))}
            </select>
          </div>

          {!isAdmin && <p className="adm-note">{t('admin.modNote')}</p>}

          {usersLoading && <p className="adm-empty">{t('common.loading')}</p>}
          {!usersLoading && users.length === 0 && <p className="adm-empty">{t('admin.noUsers')}</p>}

          <ul className="adm-list">
            {users.map((u) => {
              const busy = busyId === u.id;
              const self = u.id === me?.id;
              return (
                <li key={u.id} className={`adm-row ${!u.is_active ? 'is-off' : ''}`}>
                  <button
                    type="button"
                    className="adm-who"
                    onClick={() => navigate(`/profile/${u.id}`)}
                  >
                    <span className="adm-av">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" />
                        : (u.full_name || u.username || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="adm-who__text">
                      <b>{u.full_name || u.username}</b>
                      <small>@{u.username} · {u.email}</small>
                    </span>
                  </button>

                  <div className="adm-flags">
                    <RoleBadge role={u.role} />
                    {!u.is_active && <span className="adm-chip adm-chip--off">{t('admin.deactivated')}</span>}
                    {u.suspended && (
                      <span className="adm-chip adm-chip--susp">
                        {t('admin.suspendedUntil', { date: fmtDate(u.suspended_until) })}
                      </span>
                    )}
                  </div>

                  <div className="adm-tools">
                    <select
                      className="adm-select adm-select--role"
                      value={u.role}
                      disabled={!isAdmin || busy || self}
                      title={isAdmin ? t('admin.changeRole') : t('admin.adminOnly')}
                      onChange={(e) => changeRole(u, e.target.value)}
                      aria-label={t('admin.changeRole')}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{t(`roles.${r}`)}</option>
                      ))}
                    </select>

                    {u.suspended ? (
                      <button
                        type="button"
                        className="adm-btn"
                        disabled={busy}
                        onClick={() => act(u.id, () => unsuspendUser(u.id), t('admin.unsuspended'))}
                      >
                        {t('admin.unsuspend')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="adm-btn"
                        disabled={busy || self}
                        onClick={() => setSuspendFor({ id: u.id, label: u.full_name || u.username })}
                      >
                        {t('admin.suspend')}
                      </button>
                    )}

                    {u.is_active ? (
                      <button
                        type="button"
                        className="adm-btn adm-btn--danger"
                        disabled={busy || self}
                        onClick={() => setConfirm({
                          kind: 'deactivate',
                          id: u.id,
                          label: u.full_name || u.username,
                        })}
                      >
                        {t('admin.deactivate')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="adm-btn"
                        disabled={busy}
                        onClick={async () => {
                          const ok = await act(u.id, () => activateUser(u.id), t('admin.userActivated'));
                          if (ok) setUsers((l) => l.map((x) => (x.id === u.id ? { ...x, is_active: true } : x)));
                        }}
                      >
                        {t('admin.activate')}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ===================== RECIPES ===================== */}
      {/* ===== REPORTS =====
          What people flagged, newest first. Every row carries enough of the
          reported thing to decide without leaving the page, and links through
          for when it is not enough. */}
      {pane === 'reports' && (
        <section className="adm-section">
          <div className="adm-filters">
            {['open', 'resolved', 'dismissed'].map((f) => (
              <button
                key={f}
                type="button"
                className={`adm-chipbtn ${reportFilter === f ? 'is-active' : ''}`}
                onClick={() => setReportFilter(f)}
              >
                {t(`admin.reportStatus.${f}`)}
              </button>
            ))}
          </div>

          {reportsLoading && <p className="adm-empty">{t('common.loading')}</p>}
          {!reportsLoading && reports.length === 0 && (
            <p className="adm-empty">{t('admin.reportsEmpty')}</p>
          )}

          <ul className="adm-list">
            {reports.map((rep) => (
              <li key={rep.id} className="adm-row adm-row--report">
                <div className="adm-report__head">
                  <span className="adm-report__reason">{t(`report.reasons.${rep.reason}`)}</span>
                  <span className="adm-report__meta">
                    {t('admin.reportedBy', { who: rep.reporter?.username || '—' })}
                    {rep.created_at ? ` · ${fmtDate(rep.created_at)}` : ''}
                  </span>
                </div>

                {rep.target ? (
                  <button
                    type="button"
                    className="adm-who"
                    onClick={() => navigate(
                      rep.target.kind === 'recipe'
                        ? `/recipe/${rep.target.id}`
                        : `/forum/${rep.target.post_id || rep.target.id}`,
                    )}
                  >
                    <span className="adm-thumb">
                      {rep.target.image_url
                        ? <img src={rep.target.image_url} alt="" />
                        : rep.target.kind === 'recipe' ? '🍲' : '💬'}
                    </span>
                    <span className="adm-who__text">
                      <b>{rep.target.title}</b>
                      <small>
                        {t(`admin.targetKind.${rep.target.kind}`)}
                        {rep.target.author?.username ? ` · @${rep.target.author.username}` : ''}
                        {rep.target.moderation_status === 'hidden'
                          ? ` · ${t('admin.status.hidden')}`
                          : ''}
                      </small>
                    </span>
                  </button>
                ) : (
                  /* the recipe or post was deleted between the report and now;
                     the row stays so the report can still be closed */
                  <p className="adm-reason">{t('admin.reportGone')}</p>
                )}

                {rep.target?.excerpt && <p className="adm-reason">{rep.target.excerpt}</p>}
                {rep.details && <p className="adm-report__details">“{rep.details}”</p>}

                {rep.status === 'open' && (
                  <div className="adm-tools">
                    <button
                      type="button"
                      className="adm-btn adm-btn--go"
                      disabled={busyId === `rep${rep.id}`}
                      onClick={async () => {
                        setBusyId(`rep${rep.id}`);
                        try {
                          await actOnReport(rep.id, 'resolve');
                          setReports((l) => l.filter((x) => x.id !== rep.id));
                          flash(t('admin.reportResolved'));
                        } catch (err) { fail(err); } finally { setBusyId(null); }
                      }}
                    >
                      {t('admin.reportResolve')}
                    </button>
                    <button
                      type="button"
                      className="adm-btn"
                      disabled={busyId === `rep${rep.id}`}
                      onClick={async () => {
                        setBusyId(`rep${rep.id}`);
                        try {
                          await actOnReport(rep.id, 'dismiss');
                          setReports((l) => l.filter((x) => x.id !== rep.id));
                          flash(t('admin.reportDismissed'));
                        } catch (err) { fail(err); } finally { setBusyId(null); }
                      }}
                    >
                      {t('admin.reportDismiss')}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {pane === 'recipes' && (
        <section className="adm-section">
          <div className="adm-filters">
            {RECIPE_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`adm-chipbtn ${recipeFilter === f ? 'is-active' : ''}`}
                onClick={() => setRecipeFilter(f)}
              >
                {t(`admin.status.${f}`)}
              </button>
            ))}
          </div>

          {/* The per-recipe button is on each row; this does the same pass over
              the whole catalogue. "Only the ones missing data" is the default
              because it is what you want after the analyser has been down, and
              it does not spend tokens re-doing recipes that are already fine. */}
          <div className="adm-sweep">
            {sweep ? (
              <>
                <span className="adm-sweep__status">
                  <span className="adm-sweep__spinner" aria-hidden="true" />
                  {/* Until the first batch answers there is no count to show —
                      "0 done, … to go" reads like a stuck progress bar. */}
                  {sweep.remaining === null
                    ? t('admin.analyzeAllStarting')
                    : t('admin.analyzeAllRunning', {
                      done: sweep.updated + sweep.flagged,
                      left: sweep.remaining,
                    })}
                </span>
                <button
                  type="button"
                  className="adm-btn"
                  onClick={() => { sweepCancel.current = true; }}
                >
                  {t('admin.analyzeAllStop')}
                </button>
              </>
            ) : (
              <>
                <span className="adm-sweep__label">{t('admin.analyzeAllLabel')}</span>
                <button type="button" className="adm-btn adm-btn--go" onClick={() => startSweep('missing')}>
                  {t('admin.analyzeAllMissing')}
                </button>
                <button type="button" className="adm-btn" onClick={() => startSweep('all')}>
                  {t('admin.analyzeAllEvery')}
                </button>
              </>
            )}
          </div>

          {recipesLoading && <p className="adm-empty">{t('common.loading')}</p>}
          {!recipesLoading && recipes.length === 0 && <p className="adm-empty">{t('admin.queueEmpty')}</p>}

          <ul className="adm-list">
            {recipes.map((r) => (
              <li key={r.id} className="adm-row adm-row--recipe">
                <button
                  type="button"
                  className="adm-who"
                  onClick={() => navigate(`/recipe/${r.id}`)}
                >
                  <span className="adm-thumb">
                    {r.image_url ? <img src={r.image_url} alt="" /> : '🍲'}
                  </span>
                  <span className="adm-who__text">
                    <b>{r.title}</b>
                    <small>
                      {r.author?.username ? `@${r.author.username}` : t('admin.noAuthor')}
                      {r.created_at ? ` · ${fmtDate(r.created_at)}` : ''}
                    </small>
                  </span>
                </button>

                {r.ai_notes && <p className="adm-reason">{r.ai_notes}</p>}

                <div className="adm-tools">
                  {r.moderation_status !== 'hidden' ? (
                    <button
                      type="button"
                      className="adm-btn"
                      disabled={busyId === r.id}
                      onClick={async () => {
                        const ok = await act(r.id, () => hideRecipe(r.id), t('admin.recipeHidden'));
                        if (ok) setRecipes((l) => l.filter((x) => x.id !== r.id));
                      }}
                    >
                      {t('admin.hide')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="adm-btn adm-btn--go"
                      disabled={busyId === r.id}
                      onClick={async () => {
                        const ok = await act(r.id, () => restoreRecipe(r.id), t('admin.recipeRestored'));
                        if (ok) setRecipes((l) => l.filter((x) => x.id !== r.id));
                      }}
                    >
                      {t('admin.restore')}
                    </button>
                  )}
                  {/* The AI pass that fills in nutrition and allergens runs
                      once, at publication. Anything older than those fields —
                      or saved while Groq was down — kept zeroes, and both the
                      allergen filter and the warning on the recipe page read
                      exactly those fields. */}
                  <button
                    type="button"
                    className="adm-btn"
                    disabled={busyId === r.id}
                    onClick={async () => {
                      setBusyId(r.id);
                      try {
                        const res = await analyzeRecipe(r.id);
                        setRecipes((list) => list.map((x) => (
                          x.id === r.id ? { ...x, ...res.recipe } : x
                        )));
                        flash(res.flagged
                          ? t('admin.analyzeFlagged')
                          : t('admin.analyzeDone', {
                            kcal: res.recipe?.calories ?? 0,
                            count: res.recipe?.allergen_contains?.length ?? 0,
                          }));
                      } catch (err) {
                        fail(err);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    title={t('admin.analyzeHint')}
                  >
                    {busyId === r.id ? t('admin.analyzing') : t('admin.analyze')}
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--danger"
                    disabled={busyId === r.id}
                    onClick={() => setConfirm({ kind: 'deleteRecipe', id: r.id, label: r.title })}
                  >
                    {t('admin.delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ===================== FORUM ===================== */}
      {pane === 'forum' && (
        <section className="adm-section">
          <div className="adm-filters">
            <input
              className="adm-search"
              type="search"
              value={forumQuery}
              placeholder={t('admin.forumSearchPh')}
              onChange={(e) => setForumQuery(e.target.value)}
              aria-label={t('admin.forumSearchPh')}
            />
            {FORUM_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`adm-chipbtn ${forumFilter === f ? 'is-active' : ''}`}
                onClick={() => setForumFilter(f)}
              >
                {t(`admin.postStatus.${f}`)}
              </button>
            ))}
          </div>

          {postsLoading && <p className="adm-empty">{t('common.loading')}</p>}
          {!postsLoading && posts.length === 0 && <p className="adm-empty">{t('admin.queueEmpty')}</p>}

          <ul className="adm-list">
            {posts.map((p) => (
              <li key={p.id} className="adm-row adm-row--recipe">
                <button
                  type="button"
                  className="adm-who"
                  onClick={() => navigate(`/forum/${p.id}`)}
                >
                  <span className="adm-thumb">{'\u{1F4AC}'}</span>
                  <span className="adm-who__text">
                    <b>{p.title}</b>
                    <small>
                      #{p.id} · {p.language?.toUpperCase()} · {t(`forum.tags.${p.tag}`)}
                      {p.author?.username ? ` · @${p.author.username}` : ''}
                    </small>
                  </span>
                </button>

                {p.excerpt && <p className="adm-reason">{p.excerpt}</p>}

                <div className="adm-tools">
                  {p.moderation_status !== 'hidden' ? (
                    <button
                      type="button"
                      className="adm-btn"
                      disabled={busyId === p.id}
                      onClick={async () => {
                        const ok = await act(p.id, () => hideForumPost(p.id), t('admin.postHidden'));
                        if (ok) setPosts((l) => l.filter((x) => x.id !== p.id));
                      }}
                    >
                      {t('admin.hide')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="adm-btn adm-btn--go"
                      disabled={busyId === p.id}
                      onClick={async () => {
                        const ok = await act(p.id, () => restoreForumPost(p.id), t('admin.postRestored'));
                        if (ok) setPosts((l) => l.filter((x) => x.id !== p.id));
                      }}
                    >
                      {t('admin.restore')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="adm-btn adm-btn--danger"
                    disabled={busyId === p.id}
                    onClick={() => setConfirm({ kind: 'deletePost', id: p.id, label: p.title })}
                  >
                    {t('admin.delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ===================== SUSPEND FOR HOW LONG ===================== */}
      <Modal
        open={!!suspendFor}
        onClose={() => setSuspendFor(null)}
        title={t('admin.suspendTitle', { name: suspendFor?.label })}
      >
        <p className="adm-confirm">{t('admin.suspendNote')}</p>
        <div className="adm-durations">
          {SUSPENSIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              className="adm-duration"
              onClick={async () => {
                const target = suspendFor;
                setSuspendFor(null);
                await act(
                  target.id,
                  () => suspendUser(target.id, d.hours),
                  t('admin.suspendedFor', { time: t(`admin.durations.${d.key}`) }),
                );
              }}
            >
              {t(`admin.durations.${d.key}`)}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={t('admin.confirmTitle')}
        footer={
          <>
            <button type="button" className="kbtn kbtn--ghost" onClick={() => setConfirm(null)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="kbtn kbtn--primary" onClick={runConfirm}>
              {t('admin.confirmYes')}
            </button>
          </>
        }
      >
        <p className="adm-confirm">
          {confirm?.kind === 'deleteRecipe'
            ? t('admin.confirmDeleteRecipe', { name: confirm?.label })
            : confirm?.kind === 'deletePost'
              ? t('admin.confirmDeletePost', { name: confirm?.label })
              : t('admin.confirmDeactivate', { name: confirm?.label })}
        </p>
      </Modal>

      {/* ===================== LESSONS ===================== */}
      {pane === 'lessons' && (
        <AdminLessons canEdit={isAdmin} onToast={setToast} />
      )}

      <Toast message={toast} />
    </div>
  );
}
