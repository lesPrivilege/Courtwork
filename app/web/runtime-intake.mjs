import { el } from './ui-controls.mjs';

const titles = { mcp_server: 'MCP server', skill: 'Skill', instruction: 'Instruction', reference: 'Reference', prompt_template: 'Prompt template' };
const contextKinds = ['skill', 'instruction', 'reference', 'prompt_template'];
const scopeKey = scope => scope ? `${scope.type}:${scope.id}` : '';

/** Local drafts only. Validation and every saved value come from the Host.
 * The parent retains the configuration queue, CAS and session boundary. */
export function createRuntimeIntake({ request, getContext, submit, render, onSaved }) {
  const drafts = new Map();
  let epoch = 0, contextKind = "skill";
  const contextKey = kind => {
    const { sessionId, scope } = getContext();
    return `${sessionId || ''}/${scopeKey(scope)}/${kind}`;
  };
  function draftFor(kind) {
    const key = contextKey(kind);
    if (!drafts.has(key)) drafts.set(key, {
      key, kind, open: false, id: `local:${kind === 'mcp_server' ? 'mcp' : kind.replaceAll('_', '-')}-${crypto.randomUUID().slice(0, 8)}`,
      title: '', url: '', protocol: '2026-07-28', content: '', preview: null,
      error: '', pending: false, message: '', editing: false, token: 0, supportingFiles: [], folderName: null,
    });
    return drafts.get(key);
  }
  function portable(draft) {
    return { kind: draft.kind, title: draft.title.trim(), content: draft.kind === 'mcp_server'
      ? JSON.stringify({ transport: 'streamable-http', url: draft.url.trim(), protocol: draft.protocol })
      : draft.content };
  }
  function changed(draft) {
    draft.token++;
    draft.preview = null;
    draft.error = '';
    draft.message = '';
  }
  async function review(draft) {
    if (draft.pending) return;
    const token = ++draft.token, ownEpoch = epoch;
    const source = portable(draft);
    draft.pending = true;
    draft.error = '';
    draft.preview = null;
    render();
    try {
      if (!/^local:[a-z0-9][a-z0-9._-]{0,79}$/.test(draft.id)) throw new Error('Use a local: ID with letters, numbers, dots, underscores or hyphens.');
      const result = await request('/runtime-sources/resolve', { method: 'POST', body: { type: 'inline', ...source } });
      if (ownEpoch !== epoch || token !== draft.token) return;
      if (result.status !== 'resolved' || result.disposition !== 'inspect-only') throw new Error('This source could not be validated.');
      if (draft.folderName && result.capabilities?.declared?.name !== draft.folderName) throw new Error('The skill name must match its directory name.');
      draft.preview = { result, source, id: draft.id };
    } catch (error) {
      if (ownEpoch === epoch && token === draft.token) draft.error = error.message;
    } finally {
      if (ownEpoch === epoch) { draft.pending = false; render(); }
    }
  }
  async function save(draft) {
    const context = getContext(), preview = draft.preview;
    if (!preview || draft.pending || context.disabled || contextKey(draft.kind) !== draft.key) return;
    if (JSON.stringify(portable(draft)) !== JSON.stringify(preview.source) || draft.id !== preview.id) {
      draft.preview = null;
      draft.error = 'The source changed. Review it again before saving.';
      render(); return;
    }
    if (!draft.editing && context.resources.some(resource => resource.id === draft.id)) {
      draft.error = 'This ID already exists. Edit that resource or choose another ID.';
      render(); return;
    }
    const ownEpoch = epoch;
    const resource = { id: draft.id, ...preview.source, scope: { ...context.scope } };
    draft.pending = true;
    render();
    const done = await submit({ operation: 'put', resource, ...(!draft.editing ? { exposed: false } : {}) },
      { key: `intake:${draft.key}`, label: `${resource.title} · ${resource.scope.type}` });
    if (ownEpoch !== epoch) return;
    draft.pending = false;
    if (done) {
      draft.open = false;
      draft.preview = null;
      draft.message = draft.kind === 'mcp_server' ? 'Saved. Connect to discover this server’s capabilities.' : 'Saved. Exposure remains a separate setting.';
      drafts.delete(draft.key);
      onSaved?.(resource);
    } else draft.error = 'Not saved. Your draft is kept here. Review the error and retry explicitly.';
    render();
  }
  async function readFile(draft, input, directory = false) {
    const files = [...(input.files || [])];
    if (!files.length) return;
    changed(draft);
    let file = files[0];
    draft.supportingFiles = []; draft.folderName = null;
    if (directory) {
      const main = files.filter(item => /^[^/]+\/SKILL\.md$/.test(item.webkitRelativePath || ''));
      if (main.length !== 1 || files.length > 200) { draft.error = 'Choose one skill directory with SKILL.md at its root and at most 200 files.'; render(); return; }
      file = main[0]; draft.folderName = file.webkitRelativePath.split('/')[0];
      draft.supportingFiles = files.filter(item => item !== file).map(item => item.webkitRelativePath.split('/').slice(1).join('/'));
    }
    const token = draft.token, ownEpoch = epoch;
    try {
      if (file.size > 400000) throw new Error('Choose a SKILL.md file smaller than 400 KB.');
      const content = await file.text();
      if (ownEpoch !== epoch || token !== draft.token) return;
      draft.content = content;
      if (!draft.title.trim()) draft.title = draft.folderName || (file.name === 'SKILL.md' ? 'Imported skill' : file.name.replace(/\.md$/i, ''));
    } catch (error) { if (ownEpoch === epoch && token === draft.token) draft.error = error.message; }
    if (ownEpoch === epoch) render();
  }
  function field(draft, key, label, { multiline = false, options } = {}) {
    const input = el(options ? 'select' : multiline ? 'textarea' : 'input', { attrs: {
      'aria-label': label, 'data-focus-key': `intake:${draft.kind}:${key}`,
      ...(multiline ? { rows: 10, maxlength: 100000, spellcheck: 'false' } : { maxlength: key === 'title' ? 200 : 4000 }),
    } });
    if (options) for (const [value, text] of options) input.append(el('option', { text, attrs: { value } }));
    input.value = draft[key];
    input.disabled = getContext().disabled || draft.pending || (draft.editing && key === 'id');
    input.addEventListener(options ? 'change' : 'input', () => { draft[key] = input.value; changed(draft); });
    return el('label', { className: 'runtime-intake-field' }, el('span', { text: label }), input);
  }
  function view(kind, { contextPicker = false } = {}) {
    const draft = draftFor(kind), { scope, disabled } = getContext();
    const label = titles[kind];
    const box = el('section', { className: 'runtime-intake', attrs: { 'data-intake': kind } });
    const toggle = el('button', { className: 'text-button', text: contextPicker ? (draft.open ? "Close resource editor" : "Add resource") : draft.open ? `Close ${label} editor` : `Add ${label}`, attrs: {
      type: 'button', 'aria-expanded': String(draft.open), 'data-focus-key': `intake:${kind}:toggle`,
    } });
    toggle.disabled = !scope || disabled || draft.pending;
    toggle.addEventListener('click', () => { draft.open = !draft.open; render(); });
    box.append(toggle);
    if (!draft.open) return box;
    if (contextPicker) {
      const type = el('select', { attrs: { 'aria-label': 'Resource type', 'data-focus-key': 'intake:context:type' } });
      for (const candidate of contextKinds) type.append(el('option', { text: titles[candidate], attrs: { value: candidate } }));
      type.value = kind;
      type.disabled = disabled || draft.pending || draft.editing;
      type.addEventListener('change', () => {
        if (!contextKinds.includes(type.value)) return;
        const container = box.parentNode;
        draft.open = false;
        contextKind = type.value;
        draftFor(contextKind).open = true;
        render();
        container?.querySelector('[data-focus-key="intake:context:type"]')?.focus({ preventScroll: true });
      });
      box.append(el('label', { className: 'runtime-intake-field' }, el('span', { text: 'Resource type' }), type));
    }
    box.append(el('p', { className: 'form-help', text: `${draft.editing ? 'Editing' : 'Saving in'} the ${scope.type} scope.${draft.editing ? ' Its ID and owning scope stay fixed.' : ' The resource is saved with exposure off.'}` }),
      field(draft, 'title', `${label} name`));
    if (kind === 'mcp_server') {
      box.append(field(draft, 'url', 'MCP endpoint URL'), field(draft, 'protocol', 'MCP protocol', { options: [
        ['2026-07-28', '2026-07-28'], ['legacy-2025', 'Legacy 2025'],
      ] }), el('p', { className: 'form-help', text: 'Streamable HTTP, without authentication. Remote endpoints require HTTPS; HTTP is allowed for loopback. Saving does not connect or call tools.' }));
    } else if (kind === 'skill') {
      const file = el('input', { attrs: { type: 'file', accept: '.md,text/markdown,text/plain', 'aria-label': 'Choose SKILL.md', 'data-focus-key': 'intake:skill:file' } });
      file.disabled = disabled || draft.pending;
      file.addEventListener('change', () => void readFile(draft, file));
      const folder = el('input', { attrs: { type: 'file', webkitdirectory: '', multiple: '', 'aria-label': 'Choose skill folder', 'data-focus-key': 'intake:skill:folder' } });
      folder.disabled = disabled || draft.pending;
      folder.addEventListener('change', () => void readFile(draft, folder, true));
      box.append(el('label', { className: 'runtime-intake-field' }, el('span', { text: 'Choose SKILL.md' }), file),
        el('label', { className: 'runtime-intake-field' }, el('span', { text: 'Or choose a skill folder' }), folder),
        field(draft, 'content', 'SKILL.md content', { multiline: true }),
        el('p', { className: 'form-help', text: 'Imports the instruction file. Scripts and supporting files are not imported or executed. Requested tools remain subject to host policy.' }));
    }
    if (contextKinds.includes(kind) && kind !== 'skill') box.append(field(draft, 'content', `${label} content`, { multiline: true }));
    if (draft.supportingFiles.length) box.append(el('p', { className: 'form-help', text: `Supporting files found, not imported: ${draft.supportingFiles.join(' · ')}` }));
    box.append(el('details', { className: 'runtime-intake-advanced', attrs: { 'data-runtime-disclosure': `intake-identity:${draft.key}` } }, el('summary', { text: 'Resource identity' }), field(draft, 'id', `${label} ID`)));
    const actions = el('div', { className: 'runtime-row-actions' });
    const check = el('button', { className: 'quiet-button', text: draft.pending ? 'Reading…' : 'Review configuration', attrs: { type: 'button', 'data-focus-key': `intake:${kind}:review` } });
    check.disabled = disabled || draft.pending;
    check.addEventListener('click', () => void review(draft));
    actions.append(check);
    if (draft.preview) {
      const result = draft.preview.result;
      const dl = el('dl', { className: 'data-list' });
      const declared = result.capabilities?.declared || {};
      for (const [key, value] of Object.entries(declared)) dl.append(el('dt', { text: key }), el('dd', {}, el('span', { text: typeof value === 'string' ? value : JSON.stringify(value) })));
      box.append(el('div', { className: 'runtime-intake-preview' }, el('h5', { text: 'Configuration checked' }), dl,
        el('p', { className: 'form-help', text: kind === 'mcp_server' ? 'Syntax is valid. Server identity and capabilities are checked only when you connect.' : kind === 'skill' ? 'Metadata is valid. This does not grant the skill any tool permissions.' : 'Source is valid. Saving does not enable it for the model.' })));
      const button = el('button', { className: 'primary-button', text: draft.editing ? 'Save changes' : `Save ${label}`, attrs: { type: 'button', 'data-focus-key': `intake:${kind}:save` } });
      button.disabled = disabled || draft.pending;
      button.addEventListener('click', () => void save(draft));
      actions.append(button);
    }
    box.append(actions);
    if (draft.error) box.append(el('p', { className: 'inline-error', text: draft.error, attrs: { role: 'alert' } }));
    return box;
  }
  return { view, viewContext() { return view(contextKind, { contextPicker: true }); }, reset() { epoch++; drafts.clear(); contextKind = "skill"; },
    async edit(resource) {
      const context = getContext();
      if (!sameScope(resource.scope, context.scope) || context.disabled) return;
      if (contextKinds.includes(resource.kind)) contextKind = resource.kind;
      const draft = draftFor(resource.kind), ownEpoch = epoch;
      draft.open = true; draft.pending = true; draft.error = ''; render();
      try {
        const result = await request(`/runtime-resources/${encodeURIComponent(resource.id)}${context.sessionId ? `?sessionId=${encodeURIComponent(context.sessionId)}` : ''}`);
        if (ownEpoch !== epoch) return;
        draft.id = resource.id; draft.title = resource.title; draft.editing = true; draft.preview = null;
        if (resource.kind === 'mcp_server') { const source = JSON.parse(result.content); draft.url = source.url; draft.protocol = source.protocol; }
        else draft.content = result.content;
      } catch (error) { if (ownEpoch === epoch) draft.error = error.message; }
      finally { if (ownEpoch === epoch) { draft.pending = false; render(); } }
    },
  };
}
function sameScope(a, b) { return a && b && a.type === b.type && a.id === b.id; }
