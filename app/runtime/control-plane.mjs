import { parseMcpConfig } from './mcp-manager.mjs';
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { parseFrontmatter } from '@earendil-works/pi-coding-agent';

export const RESOURCE_KINDS = Object.freeze(['tool', 'mcp_server', 'skill', 'plugin', 'instruction', 'prompt_template', 'memory_provider', 'reference', 'agent_profile', 'workflow', 'hook', 'provider', 'model', 'permission_policy', 'secret', 'sandbox', 'registry', 'session_context']);
export const SCOPES = Object.freeze(['org', 'user', 'workspace', 'agent', 'session', 'invocation']);
const IMPORT_KINDS = new Set(['instruction', 'skill', 'reference', 'prompt_template', 'agent_profile', 'mcp_server']);
const CONTENT_KINDS = new Set(['instruction', 'skill', 'reference', 'prompt_template']);
const TOOLS = ['ask_user', 'ws_list', 'ws_read', 'ws_write', 'ws_grep', 'repo_list', 'repo_read', 'repo_grep', 'candidate_list', 'candidate_read', 'candidate_grep', 'repo_write', 'repo_diff', 'check_run', 'runtime_load', 'runtime_propose', 'cw_present'];
const SOURCE_REPOSITORY_TOOLS = new Set(['repo_list', 'repo_read', 'repo_grep']);
const CANDIDATE_TOOLS = new Set(['candidate_list', 'candidate_read', 'candidate_grep', 'repo_write', 'repo_diff', 'check_run']);
const weights = { allow: 0, ask: 1, deny: 2 };
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const clone = value => structuredClone(value);
function check(ok, message) { if (!ok) { const error = new Error(message); error.status = 400; error.code = 'invalid_runtime_config'; throw error; } }
function keys(value, allowed) { check(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => allowed.includes(k)), 'Unsupported runtime fields'); }
function string(value, max = 200) { return typeof value === 'string' && value.length > 0 && value.length <= max; }
function scope(value) {
  keys(value, ['type', 'id']);
  check(['user', 'workspace', 'session'].includes(value.type) || (value.type === 'agent' && value.id === 'attention'), 'This host can configure user, workspace, Attention and session scopes');
  check(value.type === 'user' ? value.id === 'local' : string(value.id), 'Invalid scope identity');
}
function sameScope(a, b) { return a.type === b.type && a.id === b.id; }
function conflict(code, message) { const error = new Error(message); error.status = 409; error.code = code; return error; }
// A profile applies only inside its own scope, so it may be selected only at a
// scope its own scope contains. The caller supplies a catalog and a target that
// both belong to one Session's scope chain (user > workspace | Attention >
// session), so a workspace/Attention profile covers a session target here.
function profileCovers(owner, target) {
  if (owner.type === 'user' || sameScope(owner, target)) return true;
  return ['workspace', 'agent'].includes(owner.type) && target.type === 'session';
}
// A path rule applies to a file, not to one spelling of its path. Rule and
// request are compared alias-folded, where every spelling a Host volume may
// open as the same file is equal (APFS folds case and Unicode normalization;
// tests/path-alias-oracle.test.mjs asks the volume). The fold works one code
// point at a time, so it gives the same result beside a wildcard as inside a
// name; lower-casing a whole string does not (final sigma).
const PATH_ACTION = /^(ws|repo|candidate)_/;
const foldedCodePoints = new Map();
function foldCodePoint(codePoint) {
  let folded = foldedCodePoints.get(codePoint);
  if (folded !== undefined) return folded;
  folded = codePoint;
  for (let pass = 0; pass < 4; pass += 1) {
    const next = [...folded.normalize('NFD')].map(c => [...c.toUpperCase()].map(u => u.toLowerCase()).join('')).join('');
    if (next === folded) break;
    folded = next;
  }
  foldedCodePoints.set(codePoint, folded);
  return folded;
}
export function foldPathAliases(text) {
  return [...text.normalize('NFD')].map(foldCodePoint).join('').normalize('NFD');
}
const glob = pattern => new RegExp('^' + pattern.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
function matches(pattern, value) {
  // Deliberately small, documented glob: * matches any sequence, including /.
  return glob(pattern).test(value);
}
const matchesPath = (pattern, folded) => glob(pattern.split('*').map(foldPathAliases).join('*')).test(folded);

/** Whether one spelling of the folded path matches both patterns as written.
 * A later rule overrides an earlier one only then: if two rules meet on a file
 * through folding alone, which one applies would depend on how the request
 * spelled the path. Walks the folded path with both patterns at once; where
 * both name a character, they must name the same one. */
function shareSpelling(first, second, folded) {
  const a = [...first], b = [...second], text = [...folded];
  const seen = new Set();
  const stack = [[0, 0, 0]];
  while (stack.length) {
    const [i, j, k] = stack.pop();
    const key = i + ',' + j + ',' + k;
    if (seen.has(key)) continue;
    seen.add(key);
    if (i === text.length && j === a.length && k === b.length) return true;
    const starA = a[j] === '*', starB = b[k] === '*';
    if (starA) stack.push([i, j + 1, k]);
    if (starB) stack.push([i, j, k + 1]);
    if (starA && starB && i < text.length) stack.push([i + 1, j, k]);
    const covers = token => { const unit = [...foldPathAliases(token)]; return unit.every((c, n) => text[i + n] === c) ? unit.length : 0; };
    if (j < a.length && !starA && (starB || a[j] === b[k])) {
      const length = covers(a[j]);
      if (length) stack.push([i + length, j + 1, starB ? k : k + 1]);
    }
    if (k < b.length && !starB && starA) {
      const length = covers(b[k]);
      if (length) stack.push([i + length, j, k + 1]);
    }
  }
  return false;
}
export function hostToolCeiling(name, permissionMode) {
  if (name === 'spark_explore') return permissionMode === 'ask' ? 'ask' : 'allow';
  if (name === 'message_other_agent') return permissionMode === 'read_only' ? 'deny' : 'ask';
  if (name === 'ws_write' || name === 'repo_write') return permissionMode === 'read_only' ? 'deny' : permissionMode === 'ask' ? 'ask' : 'allow';
  // A check recipe spawns a real process with the Host user's rights; unlike
  // a candidate file write it always asks, even in draft mode.
  if (name === 'check_run') return permissionMode === 'read_only' ? 'deny' : 'ask';
  return 'allow';
}

export function evaluatePolicy(layers, action, resource, ceiling = 'allow', fallback = 'allow') {
  let effect = ceiling;
  const trace = [{ source: 'host-ceiling', effect: ceiling }];
  const path = PATH_ACTION.test(action);
  const folded = path ? foldPathAliases(resource) : resource;
  const selections = layers.map(layer => {
    const matching = layer.rules.filter(r => matches(r.action, action) && (path ? matchesPath(r.resource, folded) : matches(r.resource, resource)));
    // The last matching rule of a layer wins. For a path, an earlier stricter
    // rule still holds when no later rule shares a spelling with it.
    const held = path ? matching.filter((rule, index) => index < matching.length - 1 && weights[rule.effect] > weights[matching.at(-1).effect] &&
      !matching.slice(index + 1).some(later => shareSpelling(rule.resource, later.resource, folded))) : [];
    return { layer, rule: matching.at(-1), held };
  }).filter(item => item.rule);
  const host = selections.filter(item => item.layer.scope?.type !== 'agent');
  if (!host.length) {
    if (weights[fallback] > weights[effect]) effect = fallback;
    trace.push({ source: 'host-default', effect: fallback });
  }
  for (const { layer, rule, held } of [...host, ...selections.filter(item => item.layer.scope?.type === 'agent')]) {
    trace.push({ source: layer.scope, ...rule });
    if (weights[rule.effect] > weights[effect]) effect = rule.effect;
    for (const earlier of held) {
      trace.push({ source: layer.scope, ...earlier, held: 'alias-conflict' });
      if (weights[earlier.effect] > weights[effect]) effect = earlier.effect;
    }
  }
  return { effect, trace };
}

function validateResource(item) {
  keys(item, ['id', 'kind', 'title', 'scope', 'content']);
  check(/^local:[a-z0-9][a-z0-9._-]{0,79}$/.test(item.id), 'Resource id must be local:<name>');
  scope(item.scope);
  validateRuntimeSource({ kind: item.kind, title: item.title, content: item.content });
}

/** The same declarative source validation is used before import and by the
 * read-only resolver. It does not select a scope, persist or activate anything. */
export function validateRuntimeSource(item) {
  keys(item, ['kind', 'title', 'content']);
  check(IMPORT_KINDS.has(item.kind), 'This host imports context content and declarative agent profiles');
  check(string(item.title) && string(item.content, 100000), 'Title or content is invalid');
  if (item.kind === 'mcp_server') { try { return { mcp: parseMcpConfig(item.content) }; } catch (error) { check(false, error.message); } }
  if (item.kind === 'agent_profile') return { profile: parseProfile(item.content) };
  if (item.kind === 'skill') {
    check(/^---\r?\n/.test(item.content), 'Skill requires SKILL.md YAML frontmatter');
    let frontmatter;
    try { ({ frontmatter } = parseFrontmatter(item.content)); }
    catch { check(false, 'Skill frontmatter must be valid YAML'); }
    check(typeof frontmatter.name === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(frontmatter.name) && frontmatter.name.length <= 64 && string(frontmatter.description, 1024), 'Skill requires a valid name and description');
    // YAML aliases can form cycles. These two fields enter the JSON runtime
    // projection; reject unrepresentable metadata before it can be persisted.
    try { JSON.stringify({ compatibility: frontmatter.compatibility, requestedTools: frontmatter['allowed-tools'] }); }
    catch { check(false, 'Skill metadata must be JSON serializable'); }
    return { skill: frontmatter };
  }
  return {};
}
function parseProfile(content) {
  let profile;
  try { profile = JSON.parse(content); } catch { check(false, 'Profile content must be JSON'); }
  keys(profile, ['schemaVersion', 'version', 'resourceIds', 'rules', 'uiSlots', ...(profile?.schemaVersion === 2 ? ['kits'] : [])]);
  check([1, 2].includes(profile.schemaVersion) && string(profile.version, 80), 'Unsupported profile version');
  if (profile.schemaVersion === 2) {
    check(Array.isArray(profile.kits) && profile.kits.length <= 8, 'Profile kits must be a bounded explicit declaration array');
    for (const kit of profile.kits) {
      keys(kit, ['descriptor', 'descriptorSha256']);
      check(kit.descriptor && typeof kit.descriptor === 'object' && !Array.isArray(kit.descriptor)
        && Buffer.byteLength(JSON.stringify(kit.descriptor), 'utf8') <= 65536
        && typeof kit.descriptorSha256 === 'string' && /^[0-9a-f]{64}$/.test(kit.descriptorSha256), 'Invalid Kit declaration');
    }
    // The accepted K1 compiler validates complete descriptor semantics and
    // exact admitted source pins at Run admission, before any inference.
  }
  check(Array.isArray(profile.resourceIds) && profile.resourceIds.length <= 100 && profile.resourceIds.every(id => string(id)), 'Profile resourceIds must be an explicit allowlist');
  check(Array.isArray(profile.rules) && profile.rules.length <= 100, 'Profile rules must be an array');
  for (const rule of profile.rules) { keys(rule, ['action', 'resource', 'effect']); check(string(rule.action) && string(rule.resource, 4000) && Object.hasOwn(weights, rule.effect), 'Invalid profile policy'); }
  check(Array.isArray(profile.uiSlots) && profile.uiSlots.every(slot => ['runtime.inspector', 'work.surface'].includes(slot)), 'Unsupported UI slot; a profile cannot register renderer code');
  return profile;
}
function validateConfig(value) {
  keys(value, ['version', 'revision', 'resources', 'overrides', 'policies', 'audit', 'profileSelections']);
  check(value.version === 1 && Number.isSafeInteger(value.revision) && value.revision >= 0, 'Unsupported control configuration version');
  for (const key of ['resources', 'overrides', 'policies', 'audit', 'profileSelections']) check(Array.isArray(value[key]) && value[key].length <= 500, 'Invalid control collection');
  check(value.resources.reduce((size, item) => size + (typeof item?.content === 'string' ? item.content.length : 0), 0) <= 500000, 'Imported resource content exceeds the 500000 character limit');
  const ids = new Set();
  for (const item of value.resources) { validateResource(item); check(!ids.has(item.id), 'Duplicate resource id'); ids.add(item.id); }
  for (const item of value.overrides) { keys(item, ['id', 'scope', 'exposed']); scope(item.scope); check(string(item.id) && typeof item.exposed === 'boolean', 'Invalid exposure override'); }
  for (const item of value.policies) {
    keys(item, ['scope', 'rules']); scope(item.scope);
    check(Array.isArray(item.rules) && item.rules.length <= 100, 'Invalid policy rules');
    for (const rule of item.rules) { keys(rule, ['action', 'resource', 'effect']); check(string(rule.action) && string(rule.resource, 4000) && Object.hasOwn(weights, rule.effect), 'Invalid permission rule'); }
  }
  for (const selection of value.profileSelections) { keys(selection, ['scope', 'id']); scope(selection.scope); check(string(selection.id), 'Invalid profile selection'); }
  return value;
}

// The keys each operation accepts beside `revision` and `operation`.
const CHANGE_KEYS = { put: ['resource', 'exposed'], remove: ['id'], exposure: ['id', 'scope', 'exposed'], profile: ['id', 'scope'], policy: ['scope', 'rules'] };
/** The one target of a configuration change: the id and scope it is validated
 * against, stored under and audited as. A `put` targets its resource's own id
 * and scope; exposure, profile and policy target the top-level `scope` (and
 * `id`); a removal targets an id, whose owning scope is the one it already has
 * in the caller's catalog (`scope: null`). A body carrying any other key would
 * name a second target and is refused, as is a missing or malformed scope:
 * every target scope returned here is well-formed, so the service's check of
 * it against the selected Session's scope chain decides membership only. */
export function changeTarget(input) {
  check(typeof input?.operation === 'string' && Object.hasOwn(CHANGE_KEYS, input.operation), 'Unsupported runtime operation');
  keys(input, ['revision', 'operation', ...CHANGE_KEYS[input.operation]]);
  if (input.operation === 'remove') return { id: input.id, scope: null };
  if (input.operation === 'put') check(input.resource && typeof input.resource === 'object', 'Unsupported runtime fields');
  const target = input.operation === 'put' ? { id: input.resource.id, scope: input.resource.scope } : { id: input.operation === 'policy' ? null : input.id, scope: input.scope };
  scope(target.scope);
  return target;
}

/** Owns configuration only. Run, transport, credentials and domain state remain
 * with their services. Called under RuntimeService's configuration queue and
 * RuntimeStore's process lock; no second session or execution owner. */
export class RuntimeControlPlane {
  constructor({ dataDir }) { this.file = path.join(dataDir, 'runtime-control.json'); }
  async initialize() {
    const raw = await readFile(this.file, 'utf8').catch(e => { if (e.code === 'ENOENT') return null; throw e; });
    this.config = raw === null ? { version: 1, revision: 0, resources: [], overrides: [], policies: [], audit: [], profileSelections: [] } : validateConfig(JSON.parse(raw));
  }
  async change(input, catalog) {
    const knownIds = catalog.map(resource => resource.id);
    const target = changeTarget(input);
    if (input.revision !== this.config.revision) { const error = new Error('Runtime changed; refresh before saving'); error.status = 409; error.code = 'runtime_conflict'; throw error; }
    const next = clone(this.config);
    if (input.operation === 'put') {
      validateResource(input.resource);
      const prior = next.resources.find(r => r.id === target.id);
      check(!prior || (prior.kind === input.resource.kind && sameScope(prior.scope, target.scope)), 'Resource kind and owning scope are immutable');
      next.resources = next.resources.filter(r => r.id !== target.id).concat(clone(input.resource));
      // Intake may save a new resource without admitting it to the model.
      // Persist the owning-scope exposure choice in the same CAS transaction.
      if (input.exposed !== undefined) {
        check(typeof input.exposed === 'boolean' && input.resource.kind !== 'agent_profile', 'Invalid initial exposure');
        next.overrides = next.overrides.filter(o => !(o.id === target.id && sameScope(o.scope, target.scope)));
        next.overrides.push({ id: target.id, scope: clone(target.scope), exposed: input.exposed });
      }
    } else if (input.operation === 'profile') {
      const profile = next.resources.find(r => r.id === target.id && r.kind === 'agent_profile' && knownIds.includes(r.id));
      check(target.id === null || target.id === 'agent:general' || profile, 'Profile is unavailable in this scope');
      if (profile && !profileCovers(profile.scope, target.scope)) throw conflict('profile_scope_conflict', `Profile ${profile.id} belongs to ${profile.scope.type} scope and cannot be selected at ${target.scope.type} scope`);
      next.profileSelections = next.profileSelections.filter(p => !sameScope(p.scope, target.scope));
      if (target.id !== null) next.profileSelections.push({ scope: target.scope, id: target.id });
    } else if (input.operation === 'remove') {
      check(knownIds.includes(target.id) && next.resources.some(r => r.id === target.id), 'Only imported content can be removed here');
      next.resources = next.resources.filter(r => r.id !== target.id);
      next.overrides = next.overrides.filter(r => r.id !== target.id);
    } else if (input.operation === 'exposure') {
      check(catalog.some(r => r.id === target.id && r.configurable), 'Resource is unavailable or not exposure-configurable');
      check(input.exposed === null || typeof input.exposed === 'boolean', 'Exposure must be true, false or null to inherit');
      next.overrides = next.overrides.filter(r => !(r.id === target.id && sameScope(r.scope, target.scope)));
      if (input.exposed !== null) next.overrides.push({ id: target.id, scope: target.scope, exposed: input.exposed });
    } else {
      next.policies = next.policies.filter(r => !sameScope(r.scope, target.scope));
      next.policies.push({ scope: target.scope, rules: clone(input.rules) });
    }
    await this.#commit(next, { actor: 'local-user', operation: input.operation, ...target });
  }
  /** Remove every entry owned by the given Sessions' scopes: resources,
   * exposure overrides, policies and profile selections, plus overrides and
   * selections at any scope that name a removed resource. Returns the removed
   * resource ids. Writes nothing when no entry names those Sessions. */
  async removeSessionScopes(sessionIds) {
    const ids = new Set(sessionIds);
    const owned = item => item.scope.type === 'session' && ids.has(item.scope.id);
    const removed = this.config.resources.filter(owned).map(r => r.id);
    const gone = id => removed.includes(id);
    const next = clone(this.config);
    next.resources = next.resources.filter(r => !owned(r));
    next.overrides = next.overrides.filter(o => !owned(o) && !gone(o.id));
    next.policies = next.policies.filter(p => !owned(p));
    next.profileSelections = next.profileSelections.filter(p => !owned(p) && !gone(p.id));
    if (['resources', 'overrides', 'policies', 'profileSelections'].every(key => next[key].length === this.config[key].length)) return removed;
    await this.#commit(next, { actor: 'host', operation: 'session_removed', id: null, scope: ids.size === 1 ? { type: 'session', id: [...ids][0] } : null });
    return removed;
  }
  /** Session scopes named by any entry; used to prune Sessions that no longer exist. */
  sessionScopeIds() {
    const c = this.config;
    return [...new Set([...c.resources, ...c.overrides, ...c.policies, ...c.profileSelections].filter(item => item.scope.type === 'session').map(item => item.scope.id))];
  }
  async #commit(next, audit) {
    next.revision++;
    next.audit = next.audit.slice(-199).concat({ revision: next.revision, at: new Date().toISOString(), ...audit });
    validateConfig(next);
    const temp = this.file + '.' + randomUUID() + '.tmp';
    try { await writeFile(temp, JSON.stringify(next), { mode: 0o600 }); await rename(temp, this.file); }
    finally { await unlink(temp).catch(() => {}); }
    this.config = next;
  }
  /** Validate one unsaved replacement using the same source/config rules as
   * change('put'), but return an isolated config for read-only resolution. */
  previewProfileConfig(profileId, content) {
    const existing = this.config.resources.find(item => item.id === profileId && item.kind === 'agent_profile');
    check(existing, 'Selected imported profile is unavailable');
    const overlay = clone(this.config);
    overlay.resources = overlay.resources.map(item => item.id === profileId ? { ...item, content } : item);
    return validateConfig(overlay);
  }
  inspect({ session, extensions, provider, adapterId, activeRuns = 0, mcp, additionalTools = [], config = this.config }) {
    const scopes = [{ type: 'user', id: 'local' }, ...(session ? [...(session.scope === 'global' ? [{ type: 'agent', id: 'attention' }] : session.scope === 'project' ? [{ type: 'workspace', id: session.projectId }] : []), { type: 'session', id: session.id }] : [])];
    const applies = value => scopes.some(s => sameScope(s, value));
    const policies = scopes.flatMap(s => config.policies.filter(p => sameScope(s, p.scope)));
    const descriptor = (id, kind, title, extra = {}) => ({ id, kind, title, source: { type: 'builtin', version: adapterId }, scope: { type: 'user', id: 'local' }, activation: 'always', installed: true, running: null, exposed: true, health: 'healthy', configurable: false, ...extra });
    const repositoryBound = session?.repositoryBinding?.status === 'active';
    const candidateBound = session?.repositoryCandidate?.status === 'active';
    const resources = [...TOOLS, ...additionalTools].map(name => descriptor('tool:' + name, 'tool', name, {
      configurable: true, action: name,
      ...(SOURCE_REPOSITORY_TOOLS.has(name) ? { exposed: repositoryBound, running: repositoryBound, health: repositoryBound ? 'healthy' : 'unavailable' } : {}),
      ...(CANDIDATE_TOOLS.has(name) ? { exposed: candidateBound, running: candidateBound, health: candidateBound ? 'healthy' : 'unavailable' } : {}),
    }));
    for (const ext of extensions) {
      const bound = session?.extensionBinding?.extensionId === ext.id;
      resources.push(descriptor('plugin:' + ext.id, 'plugin', ext.title, { installed: true, running: ext.status === 'loaded', exposed: Boolean(bound && ext.status === 'loaded'), health: ext.status === 'invalidated' ? 'error' : 'healthy', source: ext.source ?? { type: 'builtin', version: ext.version }, format: 'cw-host-extension', trust: 'host-trusted', isolation: 'in-process', diagnostics: ext.diagnostics ?? [], capabilities: ext.tools.map(t => 'tool:' + t), generation: ext.generation }));
      for (const name of ext.tools) resources.push(descriptor('tool:' + name, 'tool', name, { configurable: true, action: name, exposed: Boolean(bound && ext.status === 'loaded'), parent: 'plugin:' + ext.id }));
    }
    for (const item of config.resources.filter(r => applies(r.scope))) {
      if (item.kind === 'mcp_server') {
        const connection = mcp.inspect(item.id, item.content);
        resources.push(descriptor(item.id, item.kind, item.title, { scope: clone(item.scope), source: { type: 'remote', uri: parseMcpConfig(item.content).url, hash: hash(item.content) }, server: connection.server ?? null, configurable: true, running: connection.connected, exposed: false, health: connection.health, protocol: connection.protocol, transport: 'streamable-http', authentication: 'unauthenticated-only', diagnostics: connection.diagnostic ? [connection.diagnostic] : [], capabilities: { tools: connection.tools.length, resources: connection.resources.length, prompts: connection.prompts.length }, catalog: { resources: connection.resources, prompts: connection.prompts } }));
        for (const tool of connection.tools) resources.push(descriptor('tool:' + tool.hostName, 'tool', tool.title ?? tool.name, { scope: clone(item.scope), source: { type: 'remote', uri: parseMcpConfig(item.content).url, hash: hash(item.content) }, action: 'mcp.' + item.id + '.' + tool.name, executionName: tool.hostName, configurable: true, exposed: connection.connected, parent: item.id, inputSchema: tool.inputSchema, description: tool.description, mcp: { serverId: item.id, name: tool.name, configHash: hash(item.content) } }));
        continue;
      }
      const skill = item.kind === 'skill' ? parseFrontmatter(item.content).frontmatter : null;
      resources.push(descriptor(item.id, item.kind, item.title, { scope: clone(item.scope), source: { type: 'local-config', hash: hash(item.content) }, configurable: item.kind !== 'agent_profile', exposed: item.kind !== 'agent_profile', activation: item.kind === 'instruction' ? 'always' : item.kind === 'prompt_template' ? 'user-invoked' : 'manual', ...(skill ? { description: skill.description, compatibility: skill.compatibility ?? null, requestedTools: skill['allowed-tools'] ?? null } : {}), characters: item.content.length }));
    }
    resources.push(descriptor('agent:general', 'agent_profile', session?.scope === 'global' ? 'Attention default' : 'General', { composition: session?.extensionBinding?.extensionId ?? null }));
    resources.push(descriptor('provider:current', 'provider', provider.config.provider));
    resources.push(descriptor('model:current', 'model', provider.config.model));
    resources.push(descriptor('secret:provider', 'secret', 'Provider credential', { installed: provider.credentialStatus === 'configured', exposed: false, credentialStatus: provider.credentialStatus }));
    resources.push(descriptor('sandbox:workspace', 'sandbox', 'Session filesystem boundary', { scope: session ? { type: 'session', id: session.id } : { type: 'user', id: 'local' }, exposed: Boolean(session), filesystem: session?.workspaceDir ?? null, shell: false, processIsolation: false }));
    resources.push(descriptor('policy:host', 'permission_policy', session?.permissionMode ?? 'No session selected'));
    resources.push(descriptor('context:session', 'session_context', 'Native session history', { exposed: Boolean(session), owner: 'Pi AgentSession' }));
    for (const resource of resources) {
      resource.defaultExposed = resource.exposed;
      resource.provenance = [{ scope: resource.scope, value: resource.exposed, reason: 'source default' }];
      for (const s of scopes) for (const override of config.overrides.filter(o => o.id === resource.id && sameScope(o.scope, s))) {
        resource.exposed = override.exposed;
        resource.provenance.push({ scope: s, value: override.exposed, reason: 'explicit override' });
      }
      const toolName = resource.id.startsWith('tool:') ? resource.id.slice(5) : null;
      if ((SOURCE_REPOSITORY_TOOLS.has(toolName) && !repositoryBound || CANDIDATE_TOOLS.has(toolName) && !candidateBound) && resource.exposed) {
        resource.exposed = false;
        resource.provenance.push({ scope: resource.scope, value: false, reason: SOURCE_REPOSITORY_TOOLS.has(toolName) ? 'repository binding unavailable' : 'repository candidate unavailable' });
      }
      // A scoped override cannot load or bind an extension.
      const parent = resources.find(r => r.id === resource.parent);
      if (resource.parent && (!parent?.exposed || parent.running === false)) {
        resource.exposed = false;
        resource.provenance.push({ scope: parent?.scope ?? resource.scope, value: false,
          reason: parent?.running === false ? 'parent not running' : 'parent not exposed', parentId: resource.parent });
      }
      if (resource.kind === 'tool') {
        const ceiling = hostToolCeiling(resource.action, session?.permissionMode);
        resource.permission = evaluatePolicy(policies, resource.action, '*', ceiling, resource.mcp ? 'ask' : 'allow');
        if (!resource.exposed) resource.permission = { effect: 'deny', trace: [{ source: 'exposure', effect: 'deny' }] };
        resource.permission.resourceSpecific = policies.some(p => p.rules.some(r => matches(r.action, resource.action) && r.resource !== '*'));
      }
    }

    const profileSelection = scopes.flatMap(s => config.profileSelections.filter(p => sameScope(s, p.scope))).at(-1);
    const profileId = profileSelection?.id ?? 'agent:general';
    const profileResource = config.resources.find(r => r.id === profileId && r.kind === 'agent_profile' && applies(r.scope));
    let composition = { id: profileId, version: 'builtin', status: 'compatible', resourceIds: null, uiSlots: ['runtime.inspector', 'work.surface'], missing: [] };
    if (profileId !== 'agent:general') {
      const profile = profileResource ? parseProfile(profileResource.content) : null;
      // Distinct unbound Extensions may declare the same native tool names.
      // They are not ordinary-Chat capabilities. A Kit binding omits those
      // unavailable declarations instead of inventing one ambiguous identity.
      if (profile?.schemaVersion === 2 && profile.kits.length) {
        for (let index = resources.length - 1; index >= 0; index--) {
          const resource = resources[index];
          if (resource.kind === 'tool' && resource.parent?.startsWith('plugin:') && !resource.exposed
            && resource.parent !== `plugin:${session?.extensionBinding?.extensionId}`) resources.splice(index, 1);
        }
      }
      composition = { id: profileId, version: profile?.version ?? null, hash: profileResource ? hash(profileResource.content) : null, status: profile ? 'compatible' : 'unavailable', resourceIds: profile?.resourceIds ?? [], uiSlots: profile?.uiSlots ?? [], missing: profile?.resourceIds.filter(id => !resources.some(r => r.id === id)) ?? [profileId] };
      if (profile?.schemaVersion === 2) Object.assign(composition, { schemaVersion: 2, kits: clone(profile.kits), selectionScope: clone(profileSelection.scope) });
      if (composition.missing.length) composition.status = 'incompatible';
      if (profile) policies.push({ scope: { type: 'agent', id: profileId }, rules: profile.rules });
      for (const resource of resources) {
        if ((resource.kind === 'tool' || CONTENT_KINDS.has(resource.kind)) && !composition.resourceIds.includes(resource.id)) { resource.exposed = false; resource.provenance.push({ scope: { type: 'agent', id: profileId }, value: false, reason: 'profile capability ceiling' }); }
        if (resource.kind === 'tool') {
          const ceiling = hostToolCeiling(resource.action, session?.permissionMode);
          resource.permission = resource.exposed ? evaluatePolicy(policies, resource.action, '*', ceiling, resource.mcp ? 'ask' : 'allow') : { effect: 'deny', trace: [{ source: 'exposure', effect: 'deny' }] };
          resource.permission.resourceSpecific = policies.some(p => p.rules.some(r => matches(r.action, resource.action) && r.resource !== '*'));
        }
      }
    }
    for (const resource of resources.filter(r => r.kind === 'agent_profile')) {
      resource.exposed = resource.id === profileId && composition.status === 'compatible';
      resource.provenance.push({ scope: { type: 'agent', id: profileId }, value: resource.exposed, reason: 'profile selection' });
    }
    if (!resources.some(r => r.id === 'tool:runtime_load' && r.exposed)) {
      for (const resource of resources.filter(r => ['skill', 'reference'].includes(r.kind))) {
        resource.exposed = false;
        resource.provenance.push({ scope: { type: 'agent', id: profileId }, value: false, reason: 'context loader is not exposed' });
      }
    }
    const content = config.resources.filter(r => CONTENT_KINDS.has(r.kind) && resources.some(e => e.id === r.id && e.exposed));
    const compiled = controlContextParts({ content, resources });
    const context = resources.filter(r => r.exposed && CONTENT_KINDS.has(r.kind)).map(r => ({
      id: r.id, kind: r.kind, source: r.source, scope: r.scope,
      admission: r.activation === 'always' ? 'instructions' : r.activation === 'user-invoked' ? 'user-invoked' : 'catalog-only',
      characters: r.activation === 'always' ? r.characters : (r.description ?? r.title).length,
      admittedCharacters: compiled.characters.get(r.id) ?? 0,
      deferredCharacters: r.activation === 'always' ? 0 : r.characters,
    }));
    const supported = new Set(resources.map(r => r.kind));
    IMPORT_KINDS.forEach(k => supported.add(k));
    return { protocolVersion: 1, revision: config.revision, sessionId: session?.id ?? null, sessionScope: session ? {kind:session.scope, projectId:session.projectId} : null, scopes, activeRuns, adapterId, resources, composition, profileSelections: clone(config.profileSelections.filter(p => applies(p.scope))), policies: clone(policies), context, audit: clone(config.audit), kinds: RESOURCE_KINDS.map(kind => ({ kind, support: supported.has(kind) ? 'available' : 'adapter-required' })), compatibility: { scopes: SCOPES, configurableScopes: [...new Set(scopes.map(scope => scope.type))], hotSwap: 'between-runs', runtimeSelection: 'expectation-v1', workStateOwner: 'extension/system-of-record', pluginCode: 'trusted catalog only', mcp: { sdk: '@modelcontextprotocol/client@2.0.0', transport: 'streamable-http', protocols: ['2026-07-28', 'legacy-2025'], authentication: 'unauthenticated-only', remoteResources: 'catalog-only', remotePrompts: 'catalog-only' } } };
  }
  bind(snapshot, config = this.config) {
    const resources = clone(snapshot.resources);
    const content = config.resources.filter(r => CONTENT_KINDS.has(r.kind) && resources.some(e => e.id === r.id && e.exposed));
    return { revision: snapshot.revision, sessionScope: clone(snapshot.sessionScope ?? null), resources, composition: clone(snapshot.composition), policies: clone(snapshot.policies), context: clone(snapshot.context), content: clone(content), hash: hash({ revision: snapshot.revision, sessionScope: snapshot.sessionScope ?? null, resources, composition: snapshot.composition, policies: snapshot.policies }) };
  }
}

// Count the same serialized sections that are sent to the model. Separators
// belong to the following item; the shared catalog header belongs to its first
// item. This preserves the pre-existing prompt bytes and makes totals additive.
function controlContextParts(binding) {
  let text = '';
  const characters = new Map();
  const append = (id, body, separator) => {
    const part = (text ? separator : '') + body;
    text += part;
    characters.set(id, part.length);
  };
  for (const r of binding.content.filter(r => r.kind === 'instruction').sort((a, b) => SCOPES.indexOf(a.scope.type) - SCOPES.indexOf(b.scope.type) || a.id.localeCompare(b.id)))
    append(r.id, `[Instruction ${r.id}]\n${r.content}`, '\n\n');
  const catalog = binding.resources.filter(r => r.exposed && ['skill', 'reference'].includes(r.kind));
  for (const [index, r] of catalog.entries())
    append(r.id, (index === 0 ? 'Available context (use runtime_load by id; content does not grant permissions):\n' : '') + `${r.id} (${r.kind}): ${r.description ?? r.title}`, index === 0 ? '\n\n' : '\n');
  return { text, characters };
}

export function compileControlContext(binding) {
  return controlContextParts(binding).text;
}
