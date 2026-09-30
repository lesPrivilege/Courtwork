import { el } from './ui-controls.mjs';
import { activeRunFreezeNotice, isActiveRunRefusal, projectProviderConfig } from './provider-config.mjs';
import {
  connectionLabel,
  connectionPathOfKind,
  verifyDetailLine,
  verifyFailureLine,
  verifySuccessLine,
} from './settings-view.mjs';

/* PV-59/63 · a model ID the catalogue does not list, added to one connection.
 * UX-11 (S2) moved this from the composer's model dialog to Settings › Models:
 * adding an ID configures what the system has; choosing among configured models
 * is the composer's model popover. One action saves the ID on the connection,
 * selects it for next runs and (primary action) asks it once; the person fills
 * only what no one else knows: the ID, the connection and, optionally, the
 * reasoning values that connection declares for it.
 *
 * Order (PV-59): `PUT /provider-connections/:id` (models ∪ new id, the rest
 * unchanged) → `PUT /provider-config` (through `projectProviderConfig`) →
 * (primary) `POST …/verify`. A failed step stops there; saved steps are not
 * rolled back, and the status line says how far it got. */
export function createModelIdEntry({ request, onSaved }) {
  const input = el('input', { attrs: { type: 'text', 'aria-label': 'Model ID', autocomplete: 'off' } });
  const connectionSelect = el('select', { attrs: { 'aria-label': 'Connection' } });
  const reasoning = el('input', { attrs: { type: 'text', 'aria-label': 'Supported reasoning efforts', placeholder: 'off, low, medium, high' } });
  const status = el('p', { className: 'connection-probe-result', attrs: { role: 'status', hidden: true } });
  const detail = el('p', { className: 'form-help', attrs: { hidden: true } });
  const useAsk = el('button', { className: 'primary-button', attrs: { type: 'button' }, text: 'Use and ask once' });
  const useOnly = el('button', { className: 'text-button', attrs: { type: 'button' }, text: 'Use without asking' });
  const body = el('div', { className: 'model-id-entry-body' },
    el('label', {}, el('span', { text: 'Model ID' }), input),
    el('label', {}, el('span', { text: 'Connection' }), connectionSelect),
    el('label', {}, el('span', { text: 'Supported reasoning efforts (optional)' }), reasoning),
    status,
    detail,
    useAsk,
    el('p', { className: 'form-help', text: 'Saves the ID on that connection, uses it for next runs in all chats, and sends one short prompt to the model (one request).' }),
    useOnly,
  );
  const entry = el('details', { className: 'model-id-entry' }, el('summary', { text: 'Use a model ID that is not listed' }), body);

  let current = null, eligible = [], busy = false, epoch = 0;

  /* Only connections with a saved key, or the local one that needs none: the ID
   * is used for the next run, and a connection without a key cannot run. */
  async function load() {
    const own = ++epoch;
    try {
      const [config, connections] = await Promise.all([
        request('/provider-config'),
        request('/provider-connections').then((r) => r.connections || []),
      ]);
      if (own !== epoch) return;
      current = config;
      eligible = connections.filter((c) => c.credentialStatus === 'configured' || connectionPathOfKind(c) === 'local');
      const keep = connectionSelect.value;
      connectionSelect.replaceChildren(...eligible.map((c) => el('option', { attrs: { value: c.id }, text: connectionLabel(c) })));
      const inForce = eligible.find((c) => c.providerIdentity === current.config?.provider);
      connectionSelect.value = eligible.some((c) => c.id === keep) ? keep : inForce?.id || eligible[0]?.id || '';
      useAsk.disabled = useOnly.disabled = !eligible.length;
      if (!eligible.length) say('No connection has a saved key yet. Add a key above first.', true);
    } catch (error) {
      if (own === epoch) say(`Could not read the connections. ${error.message || ''}`.trim(), true);
    }
  }
  entry.addEventListener('toggle', () => { if (entry.open) void load(); });
  /* The form above may have saved a key or changed the model since this panel
     opened: coming back to it reads the connections again. */
  entry.addEventListener('focusin', (event) => { if (entry.open && !busy && !body.contains(event.relatedTarget ?? null)) void load(); });

  function say(text, failed = false) {
    status.hidden = false;
    status.classList.toggle('is-failed', failed);
    status.textContent = text;
  }
  function settle(text, failed) {
    busy = false;
    useAsk.disabled = useOnly.disabled = false;
    say(text, failed);
  }
  const reason = (error, fallback) => (isActiveRunRefusal(error) ? activeRunFreezeNotice(undefined) : error?.message || fallback);

  async function submit(askOnce) {
    const id = input.value.trim();
    if (!id || busy) return;
    const connection = eligible.find((c) => c.id === connectionSelect.value);
    if (!connection) { settle('Choose a connection first.', true); return; }
    let declaredEfforts;
    const values = reasoning.value.split(',').map((value) => value.trim()).filter(Boolean);
    const allowed = new Set(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']);
    if (values.some((value) => !allowed.has(value)) || new Set(values).size !== values.length) {
      settle('Use unique exact effort values separated by commas.', true);
      return;
    }
    declaredEfforts = values.length ? values : null;
    busy = true;
    useAsk.disabled = useOnly.disabled = true;
    detail.hidden = true;
    say('Saving the model ID…');
    // What "changed elsewhere" is measured against: the settings as this save begins.
    try { current = await request('/provider-config'); }
    catch (error) { settle(reason(error, 'Could not read the model settings.'), true); return; }
    const carry = (m) => ({
      id: m.id,
      ...(Number.isSafeInteger(m.contextWindow) ? { contextWindow: m.contextWindow } : {}),
      ...(m.reasoning !== null && m.reasoning !== undefined ? { reasoning: m.reasoning } : {}),
      ...(Array.isArray(m.reasoningEfforts) ? { reasoningEfforts: m.reasoningEfforts } : {}),
    });
    const already = connection.models.some((m) => m.id === id);
    const models = already
      ? connection.models.map((m) => (m.id === id ? { ...carry(m), reasoningEfforts: declaredEfforts } : carry(m)))
      : [...connection.models.map(carry), { id, reasoningEfforts: declaredEfforts }];
    const connectionBody = connection.kind === 'catalog'
      ? { models }
      : { api: connection.api, baseUrl: connection.baseUrl, models };
    let saved;
    try {
      saved = (await request(`/provider-connections/${encodeURIComponent(connection.id)}`, { method: 'PUT', body: connectionBody })).connection;
    } catch (error) {
      settle(reason(error, 'Could not save this model ID on the connection.'), true);
      return;
    }
    say('Selecting it for next runs…');
    try {
      const [config, catalog] = await Promise.all([request('/provider-config'), request('/provider-models')]);
      if (!Number.isSafeInteger(config.version) || config.version !== catalog.version)
        throw new Error('Provider settings changed while saving the connection. Review them before selecting the model.');
      const same = ['provider', 'model', 'api', 'baseUrl', 'reasoningEffort'].every((key) => (current.config?.[key] ?? null) === (config.config?.[key] ?? null));
      if (!same) {
        current = config;
        throw new Error('The connection was saved, but model settings changed elsewhere. Review the current selection before saving again.');
      }
      const result = await request('/provider-config', {
        method: 'PUT',
        body: { ...projectProviderConfig(config.config, { provider: saved.providerIdentity, model: id, api: saved.api }, catalog), expectedVersion: config.version },
      });
      current = result;
    } catch (error) {
      settle(`Saved on the connection, but could not select it for next runs. ${reason(error, '')}`.trim(), true);
      return;
    }
    try { await onSaved?.(current); }
    catch (error) { settle(`Saved and selected, but Settings could not refresh. ${error.message || ''}`.trim(), true); return; }
    if (!askOnce) { settle('Saved and selected. It will be used for the next run.', false); return; }
    say('Asking the model…');
    try {
      const receipt = await request(`/provider-connections/${encodeURIComponent(saved.id)}/verify`, { method: 'POST', body: { model: id } });
      if (receipt.status === 'ok') {
        settle(verifySuccessLine(receipt), false);
        detail.hidden = false;
        detail.textContent = verifyDetailLine(receipt, connectionLabel(saved));
      } else settle(verifyFailureLine(receipt), true);
    } catch (error) {
      settle(`Saved and selected, but the check could not run. ${error.message || ''}`.trim(), true);
    }
  }
  useAsk.addEventListener('click', () => void submit(true));
  useOnly.addEventListener('click', () => void submit(false));

  return { element: entry, refresh: () => (entry.open ? load() : undefined) };
}
