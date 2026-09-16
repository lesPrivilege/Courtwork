import { createHash } from 'node:crypto';

/* CMD-01 · Host command discovery. The slash is only an input entry: what a
 * typed command does is decided here, per session, from the Host's own facts,
 * and re-decided at dispatch. One descriptor is one behaviour — `/model` opens
 * the picker (client_ui) and `/effort <value>` saves a setting; they are not
 * one ambiguous kind. Nothing here sends a model request. */

export const COMMAND_SOURCE = Object.freeze({ type: 'host-builtin', version: 'courtwork-commands-1' });
export const COMMAND_KINDS = Object.freeze(['read', 'client_ui', 'setting', 'control', 'passthrough']);
const NAME = /^[a-z][a-z0-9_-]*$/;

/**
 * How a composer message beginning with `/` is read. Fixed rules, no guessing:
 *  - `//…`               → literal text `/…` (the explicit escape);
 *  - `/name` or `/name args` (lowercase name, then whitespace or end) → command;
 *  - anything else (`/Users/x`, `/tmp/x`, ` /x`, `/`, code) → ordinary text.
 */
export function parseSlash(text) {
  if (typeof text !== 'string') return { kind: 'text', text: '' };
  if (text.startsWith('//')) return { kind: 'literal', text: text.slice(1) };
  const match = /^\/([a-z][a-z0-9_-]*)(?:\s+([\s\S]*))?$/.exec(text);
  if (!match) return { kind: 'text', text };
  return { kind: 'command', name: match[1], args: (match[2] ?? '').trim(), raw: text };
}

const available = { available: true, reason: null };
const unavailable = reason => ({ available: false, reason });

/**
 * The session's command catalog from Host facts. `facts` is assembled by the
 * service: nothing in it is a guess and nothing is advertised without a target.
 */
export function discoverCommands(facts) {
  const efforts = Array.isArray(facts.effortValues) ? facts.effortValues : [];
  const busy = facts.activeRun ? unavailable('Available after this run ends.') : facts.activeOperation ? unavailable('A compaction is in progress.') : null;
  const commands = [
    { name: 'status', aliases: [], kind: 'read', title: 'Status',
      description: 'This chat\'s model, effort, file access, workspace and runtime facts. No model request.',
      args: null, availability: available, sideEffects: 'none', interactive: false, target: null },
    { name: 'tools', aliases: [], kind: 'read', title: 'Tools',
      description: 'Tools the next run may call, with their admission. No model request.',
      args: null, availability: available, sideEffects: 'none', interactive: false, target: null },
    { name: 'model', aliases: [], kind: 'client_ui', title: 'Model',
      description: 'Open the model picker. Choosing there saves for all chats, future runs.',
      args: null, availability: available, sideEffects: 'none until saved in the picker', interactive: true, target: 'model-picker' },
    { name: 'effort', aliases: [], kind: 'setting', title: 'Reasoning effort',
      description: efforts.length ? `Save the reasoning effort for all chats, future runs: ${['default', ...efforts].join(', ')}.` : 'Reasoning effort is not selectable on the configured model.',
      args: { value: { type: 'enum', values: ['default', ...efforts], required: true } },
      availability: efforts.length ? (busy ?? available) : unavailable('Reasoning effort is not selectable on the configured model.'),
      sideEffects: 'Saves the Host provider configuration (all chats, future runs).', interactive: false, target: null },
    { name: 'compact', aliases: [], kind: 'control', title: 'Compact',
      description: 'Summarize this chat\'s recorded conversation with the configured model, once, and continue from the summary.',
      args: { focus: { type: 'text', maxLength: 4000, required: false } },
      availability: busy ?? (facts.compaction?.available ? available : unavailable(facts.compaction?.reason ?? 'Compaction is unavailable.')),
      sideEffects: 'One summary request to the configured model; this chat\'s journal gains a compaction entry.', interactive: false, target: null },
    { name: 'fixture', aliases: [], kind: 'passthrough', title: 'Fixture',
      description: 'Sent as ordinary text; the Local test provider reads it as a script.',
      args: { script: { type: 'text', required: false } },
      availability: facts.fakeProvider ? available : unavailable('Only the Local test provider reads fixture scripts.'),
      sideEffects: 'Starts an ordinary run.', interactive: false, target: 'run' },
  ].map(command => ({ ...command, source: COMMAND_SOURCE, scope: { type: 'session', id: facts.sessionId }, version: 1 }));
  const revision = createHash('sha256').update(JSON.stringify({
    sessionId: facts.sessionId, runtimeRevision: facts.runtimeRevision, providerConfigVersion: facts.providerConfigVersion,
    permissionMode: facts.permissionMode, activeRun: facts.activeRun, activeOperation: facts.activeOperation,
    fakeProvider: facts.fakeProvider, efforts, compaction: facts.compaction ?? null,
  })).digest('hex');
  return { protocolVersion: 1, revision, source: COMMAND_SOURCE, commands };
}

export function findCommand(catalog, name) {
  if (typeof name !== 'string' || !NAME.test(name)) return null;
  return catalog.commands.find(c => c.name === name || c.aliases.includes(name)) ?? null;
}

/** Arguments for a descriptor from the typed remainder. Exact, never lenient. */
export function parseArguments(command, args) {
  const raw = typeof args === 'string' ? args.trim() : '';
  if (!command.args) {
    if (raw) return { error: `${command.name} takes no arguments` };
    return { value: {} };
  }
  const [key, spec] = Object.entries(command.args)[0];
  if (spec.type === 'enum') {
    if (!raw) return { error: `${command.name} needs one of: ${spec.values.join(', ')}` };
    if (!spec.values.includes(raw)) return { error: `${raw} is not one of: ${spec.values.join(', ')}` };
    return { value: { [key]: raw } };
  }
  if (spec.required && !raw) return { error: `${command.name} needs ${key}` };
  if (spec.maxLength && raw.length > spec.maxLength) return { error: `${key} is longer than ${spec.maxLength} characters` };
  return { value: raw ? { [key]: raw } : {} };
}
