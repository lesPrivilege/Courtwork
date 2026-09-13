import { el } from './ui-controls.mjs';
import { semanticIcon } from './semantic-controls.mjs';

export function createLocalExtensionView(mount, { request, onRegistered, disabled = () => false }) {
  let expanded = false, directory = '', preview = null, trusted = false, pending = false, error = '', generation = 0;
  function render() {
    const focus = mount.contains(document.activeElement) ? document.activeElement?.getAttribute('data-local-field') : null;
    const selection = focus && typeof document.activeElement?.selectionStart === 'number' ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    mount.replaceChildren();
    const toggle = el('button', { className: 'quiet-button', text: expanded ? 'Close local Plugin editor' : 'Add local Plugin', attrs: { type: 'button', 'aria-expanded': String(expanded), 'data-local-field': 'toggle' } });
    toggle.disabled = pending || disabled();
    toggle.addEventListener('click', () => { expanded = !expanded; render(); });
    mount.append(toggle);
    if (!expanded) return;
    const input = el('input', { attrs: { 'aria-label': 'Local Plugin folder', placeholder: '/absolute/path/to/extension', 'data-local-field': 'path' } });
    input.value = directory; input.disabled = pending || disabled();
    input.addEventListener('input', () => { directory = input.value; preview = null; trusted = false; generation++; error = ''; render(); });
    mount.append(el('p', { className: 'form-help', text: 'CW Host Extension · user scope. Choose a local folder containing manifest.json and index.mjs. No dependencies are installed.' }),
      el('label', { className: 'runtime-intake-field' }, el('span', { text: 'Local Plugin folder' }), input));
    const review = el('button', { className: 'quiet-button', text: pending ? 'Reading…' : 'Inspect folder', attrs: { type: 'button', 'data-local-field': 'review' } });
    review.disabled = pending || disabled();
    review.addEventListener('click', async () => {
      if (pending || disabled()) return;
      const own = ++generation; pending = true; preview = null; trusted = false; error = ''; render();
      try { const result = await request('/extensions/preview-local', { method: 'POST', body: { path: directory } }); if (own === generation) preview = result; }
      catch (err) { if (own === generation) error = err.message; }
      finally { if (own === generation) { pending = false; render(); } }
    });
    mount.append(review);
    if (preview) {
      const manifest = preview.manifest;
      mount.append(el('div', { className: 'runtime-local-heading' }, semanticIcon('plugin.host-extension', { size: 20 }), el('strong', { text: manifest.title })),
        el('p', { className: 'form-help', text: `${manifest.id} · ${manifest.version} · ${preview.files.length} files · ${preview.bytes.toLocaleString()} bytes` }),
        el('p', { className: 'form-help', text: 'Host-trusted, in-process. Loading can access this host’s files and network with its user permissions. This is not a sandbox or a verified signature.' }));
      const details = el('details', {}, el('summary', { text: 'Manifest and reviewed files' }),
        el('pre', { className: 'runtime-local-manifest', text: JSON.stringify(manifest, null, 2) }),
        el('p', { className: 'form-help', text: preview.files.join(' · ') }),
        el('code', { text: preview.hash }));
      mount.append(details);
      const trust = el('input', { attrs: { type: 'checkbox', 'data-local-field': 'trust' } });
      trust.checked = trusted; trust.disabled = pending || disabled();
      trust.addEventListener('change', () => { trusted = trust.checked; render(); });
      mount.append(el('label', { className: 'runtime-local-trust' }, trust, el('span', { text: 'I trust this package to run in this host process.' })));
      const register = el('button', { className: 'primary-button', text: pending ? 'Registering…' : 'Register Plugin', attrs: { type: 'button', 'data-local-field': 'register' } });
      register.disabled = pending || !trusted || disabled();
      register.addEventListener('click', async () => {
        if (pending || !preview || !trusted || disabled()) return;
        const own = ++generation, reviewed = preview;
        pending = true; error = ''; render();
        try {
          await request('/extensions/register-local', { method: 'POST', body: { previewId: reviewed.previewId, hash: reviewed.hash, trust: 'host-trusted' } });
          if (own !== generation) return;
          preview = null; expanded = false; trusted = false; directory = '';
          await onRegistered?.();
        } catch (err) { if (own === generation) error = err.message; }
        finally { if (own === generation) { pending = false; render(); } }
      });
      mount.append(register, el('p', { className: 'form-help', text: 'Registers the reviewed byte snapshot without running it. Use Load on the registered Plugin to execute it.' }));
    }
    if (error) mount.append(el('p', { className: 'inline-error', text: error, attrs: { role: 'alert' } }));
    if (focus) {
      const target = mount.querySelector(`[data-local-field="${focus}"]`);
      target?.focus({ preventScroll: true });
      if (selection) target?.setSelectionRange?.(...selection);
    }
  }
  render();
  return { render };
}
