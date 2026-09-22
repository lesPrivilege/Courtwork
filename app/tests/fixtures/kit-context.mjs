import { createHash } from 'node:crypto';
import { RuntimeControlPlane } from '../../runtime/control-plane.mjs';
import { resolveRuntimeSource } from '../../runtime/source-resolver.mjs';

// Test-only source oracles: intentionally independent of the Kit implementation.
export const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export const seal = descriptor => ({ descriptor, descriptorSha256: sha256(canonical(descriptor)) });
export const pin = ({ descriptor, descriptorSha256 }) => ({ id: descriptor.id, version: descriptor.version, descriptorSha256 });
export const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const GENERAL = 'Distinguish facts, assumptions, and verified results. Cite exact sources. 😀\r\n';
export const CODING = 'Return an exact diff and retained Host check receipts.';
export const PRAXIS = 'Record audience, expectation, requested decision, stage, evidence posture, and tension.';
export const AMBIENT = "Preserve the user's current task.";
export const NOTE_BODY = 'DEFERRED_PRAXIS_SENTINEL: protected SME time and approved data access.';
export const SKILL_BODY = '---\nname: exact-check\ndescription: Check recorded source versions\nallowed-tools: check_run\ncompatibility: unverified-native-host\n---\nDEFERRED_CODING_SENTINEL: run only admitted recipes.';

// Literal expected context, not assembled by either compiler or planner.
export const EXPECTED = `[Instruction local:ambient]
Preserve the user's current task.

[Instruction local:general]
Distinguish facts, assumptions, and verified results. Cite exact sources. 😀\r


[Instruction local:coding]
Return an exact diff and retained Host check receipts.

[Instruction local:praxis]
Record audience, expectation, requested decision, stage, evidence posture, and tension.

Available context (use runtime_load by id; content does not grant permissions):
local:notes (reference): Organization notes
local:coding-skill (skill): Check recorded source versions`;

export function fixture(mode = 'combined') {
  const user = { type: 'user', id: 'local' };
  const workspace = { type: 'workspace', id: 'synthetic-project' };
  const sessionScope = { type: 'session', id: 'synthetic-session' };
  const source = (id, kind, title, content, scope = user) => ({ id, kind, title, content, scope });
  const allowed = {
    general: ['local:ambient', 'local:general', 'local:notes', 'local:template'],
    coding: ['local:ambient', 'local:general', 'local:coding', 'local:coding-skill', 'local:template'],
    praxis: ['local:ambient', 'local:general', 'local:praxis', 'local:notes', 'local:template'],
  }[mode];
  const content = [
    source('local:praxis', 'instruction', 'Praxis', PRAXIS, sessionScope),
    source('local:coding', 'instruction', 'Coding', CODING, workspace),
    source('local:general', 'instruction', 'General', GENERAL),
    source('local:ambient', 'instruction', 'Ambient', AMBIENT),
    source('local:notes', 'reference', 'Organization notes', NOTE_BODY),
    source('local:coding-skill', 'skill', 'Coding Skill', SKILL_BODY),
    source('local:template', 'prompt_template', 'Draft only', 'TEMPLATE_SENTINEL'),
  ].filter(r => !allowed || allowed.includes(r.id));
  const resourceIds = [...content.map(r => r.id), 'tool:runtime_load', 'tool:check_run', 'tool:repo_read'];
  const profile = source('local:kit-profile', 'agent_profile', 'Synthetic profile', JSON.stringify({
    schemaVersion: 1, version: 'synthetic-v1', resourceIds,
    rules: [{ action: 'check_run', resource: '*', effect: 'ask' }], uiSlots: [],
  }));
  for (const item of [...content, profile]) resolveRuntimeSource({ type: 'inline', kind: item.kind, title: item.title, content: item.content });
  // Deliberately in-memory: actual owner inspect/bind over validated sources,
  // not a configuration import/save or a production profile/Kit registry.
  const control = new RuntimeControlPlane({ dataDir: '/synthetic-never-read' });
  control.config = { version: 1, revision: 7, resources: [...content, profile], overrides: [], policies: [], audit: [], profileSelections: [{ scope: user, id: profile.id }] };
  const snapshot = control.inspect({
    session: { id: sessionScope.id, scope: 'project', projectId: workspace.id, permissionMode: 'ask', repositoryBinding: { status: 'active' }, repositoryCandidate: { status: 'active' } },
    extensions: [], provider: { config: { provider: 'local-fake', model: 'synthetic-only' }, credentialStatus: 'unconfigured' },
    adapterId: 'synthetic-context-adapter', mcp: null,
  });
  const binding = control.bind(snapshot);
  const ref = resourceId => {
    const r = binding.content.find(item => item.id === resourceId);
    return { resourceId, contentSha256: sha256(r.content), artifactSha256: sha256(JSON.stringify({ kind: r.kind, title: r.title, content: r.content })) };
  };
  const descriptor = (id, core, deferred = [], requirements = []) => seal({ schemaVersion: 1, id, version: '1', core: core.map(ref), deferred: deferred.map(resourceId => ({ ...ref(resourceId), required: true })), requirements, conflicts: [] });
  const general = descriptor('kit:general', ['local:general'], mode === 'general' ? ['local:notes'] : []);
  const coding = ['combined', 'coding'].includes(mode) ? descriptor('kit:coding', ['local:coding'], ['local:coding-skill'], [{ resourceId: 'tool:check_run', required: true }]) : null;
  const praxis = ['combined', 'praxis'].includes(mode) ? descriptor('kit:praxis', ['local:general', 'local:praxis'], ['local:notes']) : null;
  const kits = [praxis, general, coding].filter(Boolean);
  const runtime = { adapterId: 'synthetic-context-adapter', revision: 'fixture-v1', bindingHash: binding.hash };
  const budget = { maxCoreBytes: 100000, maxContextBytes: 200000, maxContextCharacters: 100000 };
  return { binding, kits, runtime, compatibilityEvidence: [], budget };
}

export function evidence(input, kit = input.kits[0], result = 'supported', suffix = '') {
  return { kit: pin(kit), bindingHash: input.binding.hash, runtime: { adapterId: input.runtime.adapterId, revision: input.runtime.revision }, result,
    evidence: { ref: 'synthetic:kit-context-fixture' + suffix, sha256: sha256('Synthetic source evidence only: ' + result + suffix) } };
}

export function reseal(input) { input.kits = input.kits.map(({ descriptor }) => seal(descriptor)); return input; }
export function repinResource(input, id) {
  const body = input.binding.content.find(r => r.id === id);
  const resource = input.binding.resources.find(r => r.id === id);
  resource.source.hash = sha256(body.content);
  resource.title = body.title;
  for (const { descriptor } of input.kits) for (const ref of [...descriptor.core, ...descriptor.deferred]) if (ref.resourceId === id) {
    ref.contentSha256 = sha256(body.content);
    ref.artifactSha256 = sha256(JSON.stringify({ kind: body.kind, title: body.title, content: body.content }));
  }
  // Synthetic new owner binding identity for this changed source snapshot.
  input.binding.hash = sha256(canonical({ revision: input.binding.revision, resources: input.binding.resources, composition: input.binding.composition, policies: input.binding.policies }));
  if (input.runtime) input.runtime.bindingHash = input.binding.hash;
  return reseal(input);
}
