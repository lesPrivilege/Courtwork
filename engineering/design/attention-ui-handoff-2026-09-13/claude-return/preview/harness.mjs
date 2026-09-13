/* WO-ATT-UI02 · synthetic preview harness.
 *
 * Mounts the product's own `createAttentionWorkspace` (from /web/, i.e. the
 * working tree or a pinned --ref) against the in-memory mock core, plus the
 * product's own Home Attention module renderer for the entry/return path. The
 * harness owns only what app.mjs owns in production: which frame is visible,
 * the Home module state, the return focus key and the assistant dialog opener. */
import { createAttentionWorkspace } from '/web/attention-view.mjs';
import { homeModules } from '/web/home-view.mjs';
import { toHomeAttention, toHomeAttentionDetail } from '/web/presentation-adapters.mjs';
import { createMockCore } from './mock-core.mjs';
import { FIXED_NOW, PROJECTS } from './fixtures.mjs';

/* Relative times are rendered against a pinned instant. */
const PINNED_NOW = FIXED_NOW + 30 * 60_000;
Date.now = () => PINNED_NOW;

const q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const log = $('pv-log');
const core = createMockCore({ latency: Number(q.get('latency') ?? 260), onLog: text => {
  log.prepend(Object.assign(document.createElement('li'), { textContent: text }));
} });
window.__attentionPreview = { core };
const request = (path, init) => core.request(path, init);
const projects = PROJECTS.map(({ id, name }) => ({ id, name }));

/* ── frames ─────────────────────────────────────────────────────────────── */
const shell = { view: 'home', returnFocusKey: null };
function show(view) {
  shell.view = view;
  $('preview-home-frame').hidden = view !== 'home';
  $('attention-workspace').hidden = view !== 'attention';
  $('preview-home').toggleAttribute('aria-current', view === 'home');
  $('preview-attention').toggleAttribute('aria-current', view === 'attention');
  if (view === 'home') $('preview-home').setAttribute('aria-current', 'page');
  if (view === 'attention') $('preview-attention').setAttribute('aria-current', 'page');
}

/* ── Home · Attention module (ported from app.mjs loadHomeAttention) ───── */
const home = { projectId: q.get('project') ?? projects[0].id, data: null, loading: false, error: null, loadedAt: null,
  selectedId: null, detail: null, detailLoading: false, detailError: null, preview: null, previewError: null, generation: 0, detailGeneration: 0 };
function renderHome() {
  const band = $('home-module-band');
  const focused = band.contains(document.activeElement) ? document.activeElement?.dataset.focusKey : null;
  const card = homeModules.find(module => module.id === 'attention').render({
    attention: home, projects,
    onAttentionProject: id => loadHome(id),
    onAttentionRetry: () => loadHome(home.projectId),
    onAttentionPage: offset => loadHome(home.projectId, offset),
    onAttentionOpen: id => openHomeItem(id),
    onAttentionBack: () => { home.selectedId = null; home.detail = null; renderHome(); },
    onOpenAttentionWorkspace: event => openWorkspace(home.projectId, home.selectedId, event.currentTarget),
  });
  band.replaceChildren(card);
  if (focused) band.querySelector(`[data-focus-key="${CSS.escape(focused)}"]`)?.focus();
}
async function loadHome(projectId = home.projectId, offset = 0) {
  const own = ++home.generation;
  Object.assign(home, { projectId, selectedId: null, detail: null, detailError: null, detailLoading: false, preview: null, previewError: null, loading: true, error: null });
  if (home.data?.offset !== offset) home.data = null;
  renderHome();
  try {
    const data = await request('/attention/query', { method: 'POST', body: { projectId, query: { schema_version: 1, kind: 'registry', limit: 2, offset } } });
    if (own !== home.generation) return;
    const page = toHomeAttention(data);
    if (!page) throw new Error('Unsupported attention records.');
    home.data = data; home.loadedAt = new Date(PINNED_NOW).toISOString();
    if (page.items[0]) {
      try {
        const first = await request(`/attention/${encodeURIComponent(page.items[0].id)}?${new URLSearchParams({ projectId })}`);
        if (own === home.generation && toHomeAttentionDetail(first) && first.revision === page.items[0].revision) home.preview = first;
      } catch (error) { if (own === home.generation) home.previewError = error.message; }
    }
  } catch (error) {
    if (own === home.generation) home.error = error.message;
  } finally {
    if (own === home.generation) { home.loading = false; renderHome(); }
  }
}
async function openHomeItem(id) {
  const own = ++home.detailGeneration;
  Object.assign(home, { selectedId: id, detail: null, detailError: null, detailLoading: true });
  renderHome();
  try {
    const data = await request(`/attention/${encodeURIComponent(id)}?${new URLSearchParams({ projectId: home.projectId })}`);
    if (own === home.detailGeneration) home.detail = data;
  } catch (error) { if (own === home.detailGeneration) home.detailError = error.message; }
  finally { if (own === home.detailGeneration) { home.detailLoading = false; renderHome(); } }
}

/* ── Attention workspace (as app.mjs mounts it) ─────────────────────────── */
const dialog = $('attention-agent-dialog');
let assistantOpener = null;
const workspace = createAttentionWorkspace($('attention-workspace'), {
  request,
  onOpenAssistant: () => { assistantOpener = document.activeElement; dialog.showModal(); $('preview-assistant-close').focus(); },
  onBack: () => {
    workspace.deactivate();
    show('home');
    void loadHome(home.projectId).then(() => {
      const key = shell.returnFocusKey; shell.returnFocusKey = null;
      (key && $('home-module-band').querySelector(`[data-focus-key="${CSS.escape(key)}"]`) || $('preview-attention')).focus();
    });
  },
});
function openWorkspace(projectId, attentionId = null, trigger = null) {
  shell.returnFocusKey = shell.view === 'home' ? trigger?.dataset?.focusKey ?? null : null;
  show('attention');
  void workspace.open({ projects, projectId, attentionId });
  $('attention-workspace').querySelector('[data-attention-focus="project"]')?.focus();
}
const closeAssistant = () => { dialog.close(); };
$('preview-assistant-close').addEventListener('click', closeAssistant);
dialog.addEventListener('close', () => { assistantOpener?.focus?.(); assistantOpener = null; });

$('preview-home').addEventListener('click', () => { workspace.deactivate(); show('home'); void loadHome(home.projectId); });
$('preview-attention').addEventListener('click', event => openWorkspace(home.projectId, null, event.currentTarget));

/* ── scenario panel ─────────────────────────────────────────────────────── */
const root = document.documentElement;
$('pv-theme').value = root.getAttribute('data-theme') ?? '';
$('pv-motion').value = root.getAttribute('data-motion') ?? '';
$('pv-latency').value = String(core.latency);
$('pv-theme').addEventListener('change', e => e.target.value ? root.setAttribute('data-theme', e.target.value) : root.removeAttribute('data-theme'));
$('pv-motion').addEventListener('change', e => e.target.value ? root.setAttribute('data-motion', e.target.value) : root.removeAttribute('data-motion'));
$('pv-latency').addEventListener('change', e => { core.latency = Number(e.target.value); });
$('pv-action').addEventListener('change', e => { core.faults.action = e.target.value || null; });
$('pv-recovery').addEventListener('change', e => { core.faults.recovery = e.target.value || null; });
$('pv-list-down').addEventListener('click', () => { core.faults.list = 'unavailable'; });
$('pv-detail-down').addEventListener('click', () => { core.faults.detail = 'unavailable'; });
$('pv-reset').addEventListener('click', () => { core.reset(); log.replaceChildren(); });
/* One-shot faults clear their select once consumed. */
setInterval(() => {
  if (!core.faults.action) $('pv-action').value = '';
  if (!core.faults.recovery) $('pv-recovery').value = '';
}, 250);
if (q.get('panel') === 'collapsed') $('preview-panel-details').open = false;

/* ── entry ──────────────────────────────────────────────────────────────── */
if (q.get('view') === 'home') { show('home'); void loadHome(home.projectId); }
else { show('attention'); void workspace.open({ projects, projectId: q.get('project') ?? projects[0].id, attentionId: q.get('select') }); }
