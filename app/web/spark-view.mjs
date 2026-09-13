/* WO-SP1-FE · Spark's read-only maintenance surface. The Host now serves
 * `/work-derivations` from the Core's versioned read projection. A 404 from
 * a runtime without this endpoint still enters the explicit `unimplemented`
 * fallback; it must not be interpreted as an empty live result.
 *
 * Construction follows `createUsageView` (`usage-view.mjs:4`): a single
 * `<dialog>` this module builds and owns, appended once, opened and closed
 * through the returned handle. Two tabs — Overview, Activity — read the same
 * loaded page; nothing here polls, and nothing here writes. `onOpenMatter`
 * hands a `matterId` back to the host, which owns Work-surface routing
 * (SP-6): this file does not open, create or resolve anything itself, and it
 * makes no request whose path contains "attention" — Spark does not create,
 * resolve or otherwise touch Attention items (SP-11).
 *
 * All shape knowledge lives in `spark-projection.mjs`. This file owns DOM and
 * fetching only: it renders whatever the projection module already validated
 * and treats an unrecognised payload exactly like a missing one.
 *
 * WO-SD-01 · sample data. Only in the `unimplemented` state, a text action
 * ("Show sample data") reads one of the five frozen fixtures from
 * `/web/samples/spark-derivations/*.json` (a plain `fetch`, not `request` —
 * it is not `/work-derivations` traffic) through the same
 * `validSparkDerivations` / render path used for live data; no second
 * renderer. Sample and live never mix and sample never survives a live
 * result: `load()` (below) discards sample state the moment any valid live
 * payload arrives (empty included) or any non-404 error occurs; only a 404
 * leaves sample state exactly as it was, because that is the one response
 * that means "still no source". Sample state is a plain closure variable —
 * it dies with a page refresh — and matter titles render as inert text
 * (`readOnly`), never calling `onOpenMatter`, since sample rows are not
 * navigable (SD-19).
 */
import { el, action } from './ui-controls.mjs';
import {
  CANDIDATE_STATUSES,
  activityRows,
  overviewBuckets,
  sameSnapshot,
  sourceSetChangeSummary,
  truncationNote,
  validSparkDerivations,
} from './spark-projection.mjs';

const STATUS_LABELS = { pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected', needs_evidence: 'Needs evidence' };
const REJECTED_SNAPSHOT = 'This runtime’s maintenance state moved on since the last page. Refresh to read it again; the two pages are not shown together.';
/* WO-SD-01 · the five frozen fixtures, now product assets (SD-18), served
 * from the static allowlist at /web/samples/spark-derivations/<name>.json. */
const SAMPLE_SCENARIOS = ['stale', 'quiet', 'empty', 'partial', 'truncated'];

export function createSparkView({ request, getProjects, onOpenMatter }) {
  const dialog = el('dialog', { className: 'spark-dialog', attrs: { 'aria-labelledby': 'spark-title' } });
  document.body.append(dialog);

  let visible = false, opener = null, generation = 0;
  let projects = [], projectId = '';
  let tab = 'overview', activityMatter = 'all', activityStatus = 'all';
  let loading = false, error = '', unimplemented = false, rejected = '', data = null;
  let lastQuery = { offset: 0, expectSnapshot: null };
  // WO-SD-01: sample is a plain closure variable — session-scoped, never
  // persisted. Invariant maintained throughout this module: sample can only
  // be true while unimplemented is true (entry is gated on it; load()'s
  // catch keeps them in lock-step — see the 404 branch below).
  let sample = false, sampleScenario = 'stale', sampleData = null, sampleGeneration = 0;

  dialog.addEventListener('close', () => {
    visible = false;
    generation++;
    sampleGeneration++;
    if (opener?.isConnected) opener.focus();
  });

  function button(text, fn, attrs = {}, className) {
    const node = el('button', { text, className, attrs: { type: 'button', 'data-spark-focus': attrs.id || attrs['aria-label'] || text, ...attrs } });
    node.addEventListener('click', fn);
    return node;
  }

  /* The host already holds the project list; Spark reads it rather than
   * re-fetching /projects, so the scope selector can never disagree with the
   * shell's own list. Same seam as createUsageView's getProjects. */
  function loadProjects(preferredId) {
    const known = getProjects();
    projects = Array.isArray(known) ? known : [];
    projectId = projects.some((p) => p.id === preferredId) ? preferredId : (projects[0]?.id ?? '');
  }

  async function load(offset = 0, { expectSnapshot = null } = {}) {
    const own = ++generation;
    sampleGeneration++;
    if (!projectId) { data = null; loading = false; error = ''; unimplemented = false; rejected = ''; sample = false; sampleData = null; render(); return; }
    lastQuery = { offset, expectSnapshot };
    data = null;
    loading = true; error = ''; unimplemented = false; rejected = ''; render();
    try {
      const qs = new URLSearchParams({ projectId, limit: '25', offset: String(offset) });
      if (expectSnapshot) qs.set('snapshotRef', expectSnapshot);
      const raw = await request(`/work-derivations?${qs}`);
      if (own !== generation) return;
      const projected = validSparkDerivations(raw);
      if (projected && projected.scopeRef !== `project:${projectId}`) throw new Error('Spark received an observation for a different project. Refresh to read this scope.');
      if (!projected) throw new Error('Spark received a maintenance observation this surface does not recognise.');
      sample = false; sampleData = null;
      if (expectSnapshot && !sameSnapshot({ snapshotRef: expectSnapshot }, projected)) {
        rejected = REJECTED_SNAPSHOT;
        data = null;
      } else {
        data = projected;
        // SD-2 / SD-4: any valid live payload — empty matters included —
        // wins outright and discards sample state in the same atomic switch.
        sample = false; sampleData = null;
      }
    } catch (e) {
      if (own !== generation) return;
      data = null;
      if (e.status === 409 && e.body?.error?.code === 'derivations_snapshot_changed') {
        rejected = REJECTED_SNAPSHOT;
        sample = false; sampleData = null;
      } else if (e.status === 404) {
        // SD-19: 404 is the one outcome that leaves an active sample state
        // exactly as it was — this is still "no source", not a change.
        unimplemented = true;
      } else {
        error = e.message || 'Spark could not read maintenance state.';
        // An error is not sample's entry (only 404/unimplemented is), so a
        // live probe that fails for any other reason also drops sample.
        sample = false; sampleData = null;
      }
    } finally {
      if (own === generation) { loading = false; render(); }
    }
  }

  /* WO-SD-01 · entry ("Show sample data") and scenario switch both call this.
   * A plain static-file fetch — never `request()`, never `/work-derivations`
   * — through the same `validSparkDerivations` gate live data passes. A
   * fetch failure (missing/unrecognised file) falls back to the existing
   * error state and its existing copy; it does not invent a second one. */
  async function loadSample(scenario) {
    // Static sample reads cannot supersede a live probe. Both the response
    // headers and body may arrive after a scope change, hide, or close.
    if (!visible || !unimplemented || loading) return;
    const own = ++sampleGeneration, liveGeneration = generation;
    const current = () => own === sampleGeneration && liveGeneration === generation
      && visible && unimplemented && !loading;
    sampleScenario = scenario;
    try {
      const res = await fetch(`/web/samples/spark-derivations/${scenario}.json`, { headers: { Accept: 'application/json' } });
      if (!current()) return;
      if (!res.ok) throw new Error('Spark could not read the sample scenario.');
      const projected = validSparkDerivations(await res.json());
      if (!current()) return;
      if (!projected) throw new Error('Spark received a sample it does not recognise.');
      sample = true;
      sampleData = projected;
    } catch (e) {
      if (!current()) return;
      sample = false;
      sampleData = null;
      unimplemented = false; // route rendering to the existing error branch, not back to "No source yet".
      error = e.message || 'Spark could not read maintenance state.';
    } finally {
      if (own === sampleGeneration && liveGeneration === generation) render();
    }
  }

  function matterRow(matter, { quiet = false, unavailable = false, readOnly = false } = {}) {
    // WO-SD-01 / SD-19: a sample Matter is not navigable — its title renders
    // as inert text and onOpenMatter is never called for it.
    const open = readOnly
      ? el('span', { className: 'spark-matter-open', text: matter.title })
      : button(matter.title, () => { dialog.close(); onOpenMatter(matter.matterId, projectId); }, { 'aria-label': `Open ${matter.title} in Work` }, 'spark-matter-open');
    const meta = el('div', { className: 'spark-matter-meta' });
    if (unavailable) {
      meta.append(el('span', { className: 'spark-unavailable', text: `Unavailable · ${matter.reason}` }));
    } else {
      meta.append(el('span', { text: `Source revision ${matter.sourceVersion}` }));
      meta.append(el('span', { text: quiet ? `${matter.derivations.total} current, none stale` : `${matter.derivations.stale} stale of ${matter.derivations.total}` }));
    }
    const row = el('div', { className: `spark-matter-row${quiet ? ' is-quiet' : ''}${unavailable ? ' is-unavailable' : ''}` }, open, meta);
    if (!unavailable && matter.derivations.byStatus.length) {
      const chips = el('div', { className: 'spark-chip-row' });
      for (const entry of matter.derivations.byStatus) {
        if (!entry.stale && quiet) continue;
        chips.append(el('span', { className: 'spark-chip', text: `${STATUS_LABELS[entry.status] || entry.status} · ${entry.stale} stale / ${entry.current} current` }));
      }
      if (chips.children.length) row.append(chips);
    }
    if (!unavailable) {
      const summary = sourceSetChangeSummary(matter.sourceSetChange);
      row.append(el('p', { className: 'form-help spark-source-change', text: summary ?? 'No prior source revision recorded.' }));
    }
    return row;
  }

  function renderOverview(panel, activeData, { readOnly = false } = {}) {
    if (!activeData.matters.length) {
      panel.append(el('p', { className: 'form-help', text: 'No Matters in this project’s scope.' }));
      return;
    }
    const { active, quiet, unavailable } = overviewBuckets(activeData);
    if (active.length) {
      panel.append(el('h3', { className: 'spark-section-heading', text: 'Behind the current source set' }));
      for (const matter of active) panel.append(matterRow(matter, { readOnly }));
    }
    if (unavailable.length) {
      panel.append(el('h3', { className: 'spark-section-heading', text: 'Unavailable' }));
      for (const matter of unavailable) panel.append(matterRow(matter, { unavailable: true, readOnly }));
    }
    if (quiet.length) {
      // The quiet zone: fully current Matters. WO-SP1-FE requires it stay
      // separate from stale rows and generate no prompt of its own.
      panel.append(el('h3', { className: 'spark-section-heading is-quiet', text: 'Up to date' }));
      for (const matter of quiet) panel.append(matterRow(matter, { quiet: true, readOnly }));
    }
    if (!active.length && !unavailable.length)
      panel.append(el('p', { className: 'form-help', text: 'Every Matter in scope is current with its source set. No prompt is generated for a quiet read.' }));
  }

  function renderActivity(panel, activeData, { readOnly = false } = {}) {
    const matterSelect = el('select', { attrs: { 'aria-label': 'Filter by Matter' } });
    matterSelect.append(el('option', { text: 'All Matters', attrs: { value: 'all' } }),
      ...activeData.matters.filter((m) => m.availability === 'observed').map((m) => el('option', { text: m.title, attrs: { value: m.matterId } })));
    matterSelect.value = activityMatter;
    matterSelect.addEventListener('change', () => { activityMatter = matterSelect.value; render(); });
    const statusSelect = el('select', { attrs: { 'aria-label': 'Filter by status' } });
    statusSelect.append(el('option', { text: 'All statuses', attrs: { value: 'all' } }),
      ...CANDIDATE_STATUSES.map((s) => el('option', { text: STATUS_LABELS[s], attrs: { value: s } })));
    statusSelect.value = activityStatus;
    statusSelect.addEventListener('change', () => { activityStatus = statusSelect.value; render(); });
    panel.append(el('div', { className: 'spark-controls' }, matterSelect, statusSelect));

    const matters = activeData.matters.filter((m) => m.availability === 'observed' && (activityMatter === 'all' || m.matterId === activityMatter));
    let any = false;
    for (const matter of matters) {
      const rows = activityRows(matter, activityStatus);
      if (!rows.length) continue;
      any = true;
      const section = el('section', { className: 'spark-activity-matter' });
      // WO-SD-01 / SD-19: same read-only rule as matterRow — no navigation out of sample state.
      section.append(readOnly
        ? el('span', { className: 'spark-matter-open', text: matter.title })
        : button(matter.title, () => { dialog.close(); onOpenMatter(matter.matterId, projectId); }, {}, 'spark-matter-open'));
      const table = el('table', { className: 'spark-table' });
      const head = el('tr');
      for (const title of ['Candidate', 'Status', 'Candidate revision', 'Behind by', 'Supersedes'])
        head.append(el('th', { text: title, attrs: { scope: 'col' } }));
      table.append(el('thead', {}, head));
      const body = el('tbody');
      for (const ref of rows) {
        body.append(el('tr', {},
          el('th', { text: ref.candidateId, attrs: { scope: 'row' } }),
          el('td', { text: STATUS_LABELS[ref.status] || ref.status }),
          el('td', { text: `${ref.candidateSourceVersion} of ${ref.matterSourceVersion}` }),
          el('td', { text: `${ref.behind}` }),
          el('td', { text: ref.supersedes ?? '—' })));
      }
      table.append(body);
      section.append(el('div', { className: 'spark-table-scroll' }, table));
      const note = truncationNote(matter);
      if (note) section.append(el('p', { className: 'form-help', text: `${note}. The remaining stale candidates for this Matter are not loaded on this page.` }));
      panel.append(section);
    }
    if (!any) panel.append(el('p', { className: 'form-help', text: 'No stale derivations match this filter.' }));
  }

  /* WO-SD-01 / SD-17: the sample state's one-line header — grey text label,
   * no colour, no icon — plus the scenario select and the two exits. Laid
   * out with the same `.spark-controls` row `.form-help` help text already
   * uses elsewhere in this dialog; nothing new. */
  function sampleBar() {
    const bar = el('div', { className: 'spark-controls' },
      el('span', { className: 'spark-sample-label', text: 'Sample data' }));
    const select = el('select', { attrs: { 'aria-label': 'Sample scenario' } });
    select.append(...SAMPLE_SCENARIOS.map((name) => el('option', { text: name[0].toUpperCase() + name.slice(1), attrs: { value: name } })));
    select.value = sampleScenario;
    select.disabled = loading;
    select.addEventListener('change', () => void loadSample(select.value));
    bar.append(select);
    const check = button('Check for a source again', () => void load(0), {}, 'text-button');
    check.disabled = loading;
    bar.append(check);
    bar.append(button('Hide sample data', () => { sampleGeneration++; sample = false; sampleData = null; render(); }, {}, 'text-button'));
    return bar;
  }

  function render() {
    if (!visible) return;
    const focused = document.activeElement;
    const scrollTop = dialog.querySelector('.observation-dialog-body')?.scrollTop ?? 0;
    const focusKey = dialog.contains(focused) ? (focused.id || focused.getAttribute('aria-label') || focused.getAttribute('data-spark-focus')) : null;
    try { renderContents();
    } finally {
      const body = dialog.querySelector('.observation-dialog-body');
      if (body) body.scrollTop = scrollTop;
      if (focusKey) {
        const target = [...dialog.querySelectorAll('button, select')].find((node) => (node.id || node.getAttribute('aria-label') || node.getAttribute('data-spark-focus')) === focusKey && !node.disabled);
        (target || dialog.querySelector('[aria-label="Close Spark"]'))?.focus();
      }
    }
  }

  function renderContents() {
    const header = el('header', { className: 'spark-header' },
      el('div', {},
        el('h2', { text: 'Spark', attrs: { id: 'spark-title' } }),
        el('p', { className: 'form-help', text: 'See which Matters need updating after their sources change.' })),
      action('x', 'Close Spark', () => dialog.close()));

    const controls = el('div', { className: 'spark-controls' });
    if (projects.length) {
      const select = el('select', { attrs: { 'aria-label': 'Spark project' } });
      select.append(...projects.map((p) => el('option', { text: p.name, attrs: { value: p.id } })));
      select.value = projectId;
      select.addEventListener('change', () => {
        projectId = select.value; activityMatter = 'all'; activityStatus = 'all';
        // SD-19: switching projects always returns to the live determination — sample never follows a project switch.
        sample = false; sampleData = null;
        void load(0);
      });
      controls.append(select);
    }
    if (!sample) {
      const refresh = button('Refresh', () => load(data?.page.offset ?? 0), {}, 'text-button');
      refresh.disabled = loading || !projectId;
      controls.append(refresh);
    }

    const tabs = el('div', { className: 'spark-tabs', attrs: { role: 'tablist', 'aria-label': 'Spark view' } });
    for (const key of ['overview', 'activity']) {
      const t = button(key === 'overview' ? 'Overview' : 'Activity', () => { tab = key; render(); },
        { role: 'tab', 'aria-selected': String(tab === key), tabindex: tab === key ? '0' : '-1', id: `spark-tab-${key}`, 'aria-controls': 'spark-panel' });
      t.addEventListener('keydown', (event) => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          tab = event.key === 'Home' ? 'overview' : event.key === 'End' ? 'activity' : (tab === 'overview' ? 'activity' : 'overview');
          render();
          dialog.querySelector(`#spark-tab-${tab}`).focus();
        }
      });
      tabs.append(t);
    }

    const panel = el('section', { attrs: { id: 'spark-panel', role: 'tabpanel', 'aria-labelledby': `spark-tab-${tab}` } });
    dialog.replaceChildren(header, el('div', { className: 'observation-dialog-body' }, controls, tabs, panel));

    if (!projectId) { panel.append(el('p', { className: 'form-help', text: 'No project to read maintenance state for.' })); return; }

    // WO-SD-01 · sample state renders through the exact same overview/activity
    // functions live data uses, read-only, with no pager (SD-19: pagination
    // is not covered by any of the five fixtures and does not participate
    // here). It is checked before every other state, including `loading`:
    // a "Check for a source again" probe in flight keeps showing the sample
    // content, with the check action itself disabled, until that probe
    // resolves one of the outcomes `load()` defines above.
    if (sample && sampleData) {
      panel.append(sampleBar());
      panel.append(el('p', { className: 'form-help', text: `As of ${sampleData.asOf}${sampleData.coverage.matters === 'partial' ? ` · scope partial: ${sampleData.coverage.reason}` : ''}` }));
      if (tab === 'overview') renderOverview(panel, sampleData, { readOnly: true }); else renderActivity(panel, sampleData, { readOnly: true });
      return;
    }

    if (loading) panel.append(el('p', { text: 'Loading maintenance state…', attrs: { role: 'status' } }));
    if (unimplemented) {
      panel.append(el('p', { text: 'No source yet. This runtime has no maintenance source connected here.', attrs: { role: 'status' } }));
      // WO-SD-01 / SD-14: the entry lives inside this surface's own unimplemented
      // sentence — a text action, no icon, appearing in no other state.
      panel.append(button('Show sample data', () => void loadSample('stale'), {}, 'text-button'));
      return;
    }
    if (rejected) panel.append(el('p', { text: rejected, attrs: { role: 'alert' } }), button('Refresh', () => load(0), {}, 'text-button'));
    if (error) { panel.append(el('p', { text: error, attrs: { role: 'alert' } }), button('Retry', () => load(lastQuery.offset, { expectSnapshot: lastQuery.expectSnapshot }), {}, 'text-button')); return; }
    if (!data) return;

    panel.append(el('p', { className: 'form-help', text: `As of ${data.asOf}${data.coverage.matters === 'partial' ? ` · scope partial: ${data.coverage.reason}` : ''}` }));
    if (tab === 'overview') renderOverview(panel, data); else renderActivity(panel, data);

    if (data.page.total > data.page.limit) {
      const pager = el('div', { className: 'spark-controls' });
      if (data.page.offset > 0) pager.append(button('Previous Matters', () => load(Math.max(0, data.page.offset - data.page.limit), { expectSnapshot: data.snapshotRef })));
      if (data.page.offset + data.matters.length < data.page.total) pager.append(button('More Matters', () => load(data.page.offset + data.page.limit, { expectSnapshot: data.snapshotRef })));
      pager.append(el('span', { className: 'form-help', text: data.matters.length ? `${data.page.offset + 1}–${data.page.offset + data.matters.length} of ${data.page.total} Matters` : `No Matters on this page · ${data.page.total} total` }));
      panel.append(pager);
    }
  }

  return {
    open(preferredProjectId = null) {
      if (visible) return;
      opener = document.activeElement;
      visible = true;
      tab = 'overview'; activityMatter = 'all'; activityStatus = 'all';
      dialog.showModal();
      render();
      void (async () => {
        loadProjects(preferredProjectId);
        await load(0);
      })();
    },
  };
}
