/* WO-SP1-FE · Spark's read-only maintenance surface. BE-41 (the backend that
 * serves `/work-derivations`) is not implemented on this baseline: until it
 * is, every project reads as `unimplemented` (a 404, per be41-dto.md §路由)
 * and this view shows that no source is connected — never a number.
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

export function createSparkView({ request, onOpenMatter }) {
  const dialog = el('dialog', { className: 'spark-dialog', attrs: { 'aria-labelledby': 'spark-title' } });
  document.body.append(dialog);

  let visible = false, opener = null, generation = 0;
  let projects = [], projectId = '', projectsError = '';
  let tab = 'overview', activityMatter = 'all', activityStatus = 'all';
  let loading = false, error = '', unimplemented = false, rejected = '', data = null;

  dialog.addEventListener('close', () => {
    visible = false;
    generation++;
    if (opener?.isConnected) opener.focus();
  });

  function button(text, fn, attrs = {}, className) {
    const node = el('button', { text, className, attrs: { type: 'button', ...attrs } });
    node.addEventListener('click', fn);
    return node;
  }

  async function loadProjects(preferredId) {
    try {
      const result = await request('/projects');
      projects = Array.isArray(result?.projects) ? result.projects : [];
      projectsError = '';
    } catch (e) {
      projects = [];
      projectsError = e.message || 'Projects are unavailable.';
    }
    projectId = projects.some((p) => p.id === preferredId) ? preferredId : (projects[0]?.id ?? '');
  }

  async function load(offset = 0, { expectSnapshot = null } = {}) {
    const own = ++generation;
    if (!projectId) { data = null; loading = false; error = ''; unimplemented = false; rejected = ''; render(); return; }
    loading = true; error = ''; unimplemented = false; rejected = ''; render();
    try {
      const qs = new URLSearchParams({ projectId, limit: '25', offset: String(offset) });
      const raw = await request(`/work-derivations?${qs}`);
      if (own !== generation) return;
      const projected = validSparkDerivations(raw);
      if (!projected) throw new Error('Spark received a maintenance observation this surface does not recognise.');
      if (expectSnapshot && !sameSnapshot({ snapshotRef: expectSnapshot }, projected)) {
        rejected = REJECTED_SNAPSHOT;
        data = null;
      } else {
        data = projected;
      }
    } catch (e) {
      if (own !== generation) return;
      data = null;
      if (e.status === 404) unimplemented = true;
      else error = e.message || 'Spark could not read maintenance state.';
    } finally {
      if (own === generation) { loading = false; render(); }
    }
  }

  function matterRow(matter, { quiet = false, unavailable = false } = {}) {
    const open = button(matter.title, () => onOpenMatter(matter.matterId), { 'aria-label': `Open ${matter.title} in Work` }, 'spark-matter-open');
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

  function renderOverview(panel) {
    if (!data.matters.length) {
      panel.append(el('p', { className: 'form-help', text: 'No Matters in this project’s scope.' }));
      return;
    }
    const { active, quiet, unavailable } = overviewBuckets(data);
    if (active.length) {
      panel.append(el('h3', { className: 'spark-section-heading', text: 'Behind the current source set' }));
      for (const matter of active) panel.append(matterRow(matter));
    }
    if (unavailable.length) {
      panel.append(el('h3', { className: 'spark-section-heading', text: 'Unavailable' }));
      for (const matter of unavailable) panel.append(matterRow(matter, { unavailable: true }));
    }
    if (quiet.length) {
      // The quiet zone: fully current Matters. WO-SP1-FE requires it stay
      // separate from stale rows and generate no prompt of its own.
      panel.append(el('h3', { className: 'spark-section-heading is-quiet', text: 'Up to date' }));
      for (const matter of quiet) panel.append(matterRow(matter, { quiet: true }));
    }
    if (!active.length && !unavailable.length)
      panel.append(el('p', { className: 'form-help', text: 'Every Matter in scope is current with its source set. No prompt is generated for a quiet read.' }));
  }

  function renderActivity(panel) {
    const matterSelect = el('select', { attrs: { 'aria-label': 'Filter by Matter' } });
    matterSelect.append(el('option', { text: 'All Matters', attrs: { value: 'all' } }),
      ...data.matters.filter((m) => m.availability === 'observed').map((m) => el('option', { text: m.title, attrs: { value: m.matterId } })));
    matterSelect.value = activityMatter;
    matterSelect.addEventListener('change', () => { activityMatter = matterSelect.value; render(); });
    const statusSelect = el('select', { attrs: { 'aria-label': 'Filter by status' } });
    statusSelect.append(el('option', { text: 'All statuses', attrs: { value: 'all' } }),
      ...CANDIDATE_STATUSES.map((s) => el('option', { text: STATUS_LABELS[s], attrs: { value: s } })));
    statusSelect.value = activityStatus;
    statusSelect.addEventListener('change', () => { activityStatus = statusSelect.value; render(); });
    panel.append(el('div', { className: 'spark-controls' }, matterSelect, statusSelect));

    const matters = data.matters.filter((m) => m.availability === 'observed' && (activityMatter === 'all' || m.matterId === activityMatter));
    let any = false;
    for (const matter of matters) {
      const rows = activityRows(matter, activityStatus);
      if (!rows.length) continue;
      any = true;
      const section = el('section', { className: 'spark-activity-matter' });
      section.append(button(matter.title, () => onOpenMatter(matter.matterId), {}, 'spark-matter-open'));
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

  function render() {
    if (!visible) return;
    const header = el('header', { className: 'spark-header' },
      el('div', {},
        el('h2', { text: 'Spark', attrs: { id: 'spark-title' } }),
        el('p', { className: 'form-help', text: 'Maintenance state read from Core — which Matters have fallen behind their current source set.' })),
      action('x', 'Close Spark', () => dialog.close()));

    const controls = el('div', { className: 'spark-controls' });
    if (projects.length) {
      const select = el('select', { attrs: { 'aria-label': 'Spark project' } });
      select.append(...projects.map((p) => el('option', { text: p.name, attrs: { value: p.id } })));
      select.value = projectId;
      select.addEventListener('change', () => { projectId = select.value; void load(0); });
      controls.append(select);
    }
    const refresh = button('Refresh', () => load(data?.page.offset ?? 0), {}, 'text-button');
    refresh.disabled = loading || !projectId;
    controls.append(refresh);

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
    dialog.replaceChildren(header, controls, tabs, panel);

    if (!projects.length && projectsError) { panel.append(el('p', { text: projectsError, attrs: { role: 'alert' } })); return; }
    if (!projectId) { panel.append(el('p', { className: 'form-help', text: 'No project to read maintenance state for.' })); return; }
    if (loading) panel.append(el('p', { text: 'Loading maintenance state…', attrs: { role: 'status' } }));
    if (unimplemented) { panel.append(el('p', { text: 'No source yet. This runtime has no maintenance source connected here.', attrs: { role: 'status' } })); return; }
    if (rejected) panel.append(el('p', { text: rejected, attrs: { role: 'alert' } }), button('Refresh', () => load(0), {}, 'text-button'));
    if (error) { panel.append(el('p', { text: error, attrs: { role: 'alert' } }), button('Retry', () => load(data?.page.offset ?? 0), {}, 'text-button')); return; }
    if (!data) return;

    panel.append(el('p', { className: 'form-help', text: `As of ${data.asOf}${data.coverage.matters === 'partial' ? ` · scope partial: ${data.coverage.reason}` : ''}` }));
    if (tab === 'overview') renderOverview(panel); else renderActivity(panel);

    if (data.page.total > data.page.limit) {
      const pager = el('div', { className: 'spark-controls' });
      if (data.page.offset > 0) pager.append(button('Previous Matters', () => load(Math.max(0, data.page.offset - data.page.limit), { expectSnapshot: data.snapshotRef })));
      if (data.page.offset + data.matters.length < data.page.total) pager.append(button('More Matters', () => load(data.page.offset + data.page.limit, { expectSnapshot: data.snapshotRef })));
      pager.append(el('span', { className: 'form-help', text: `${data.page.offset + 1}–${data.page.offset + data.matters.length} of ${data.page.total} Matters` }));
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
        await loadProjects(preferredProjectId);
        await load(0);
      })();
    },
  };
}
