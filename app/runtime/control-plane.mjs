import { parseMcpConfig } from './mcp-manager.mjs';
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { parseFrontmatter } from '@earendil-works/pi-coding-agent';

export const RESOURCE_KINDS = Object.freeze(['tool', 'mcp_server', 'skill', 'plugin', 'instruction', 'prompt_template', 'memory_provider', 'reference', 'agent_profile', 'workflow', 'hook', 'provider', 'model', 'permission_policy', 'secret', 'sandbox', 'registry', 'session_context']);
export const SCOPES = Object.freeze(['org', 'user', 'workspace', 'agent', 'session', 'invocation']);
const IMPORT_KINDS = new Set(['instruction', 'skill', 'reference', 'prompt_template', 'agent_profile', 'mcp_server']);
const CONTENT_KINDS = new Set(['instruction', 'skill', 'reference', 'prompt_template']);
const TOOLS = ['ask_user', 'ws_list', 'ws_read', 'ws_write', 'ws_grep', 'runtime_load'];
const weights = { allow: 0, ask: 1, deny: 2 };
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const clone = value => structuredClone(value);
function check(ok, message) { if (!ok) { const error = new Error(message); error.status = 400; error.code = 'invalid_runtime_config'; throw error; } }
function keys(value, allowed) { check(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => allowed.includes(k)), 'Unsupported runtime fields'); }
function string(value, max = 200) { return typeof value === 'string' && value.length > 0 && value.length <= max; }
function scope(value) {
  keys(value, ['type', 'id']);
  check(['user', 'workspace', 'session'].includes(value.type), 'This host can configure user, workspace and session scopes');
  check(value.type === 'user' ? value.id === 'local' : string(value.id), 'Invalid scope identity');
}
function sameScope(a, b) { return a.type === b.type && a.id === b.id; }
function matches(pattern, value) {
  // Deliberately small, documented glob: * matches any sequence, including /.
  return new RegExp('^' + pattern.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(value);
}
export function evaluatePolicy(layers, action, resource, ceiling = 'allow', fallback = 'allow') {
  let effect = ceiling;
  const trace = [{ source: 'host-ceiling', effect: ceiling }];
  const selections = layers.map(layer => ({ layer, rule: layer.rules.filter(r => matches(r.action, action) && matches(r.resource, resource)).at(-1) })).filter(item => item.rule);
  const host = selections.filter(item => item.layer.scope?.type !== 'agent');
  if (!host.length) {
    if (weights[fallback] > weights[effect]) effect = fallback;
    trace.push({ source: 'host-default', effect: fallback });
  }
  for (const { layer, rule } of [...host, ...selections.filter(item => item.layer.scope?.type === 'agent')]) {
    trace.push({ source: layer.scope, ...rule });
    if (weights[rule.effect] > weights[effect]) effect = rule.effect;
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
    check(item.content.startsWith('---\n'), 'Skill requires SKILL.md YAML frontmatter');
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
  keys(profile, ['schemaVersion', 'version', 'resourceIds', 'rules', 'uiSlots']);
  check(profile.schemaVersion === 1 && string(profile.version, 80), 'Unsupported profile version');
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
    keys(input, ['revision', 'operation', 'resource', 'id', 'scope', 'exposed', 'rules']);
    if (input.revision !== this.config.revision) { const error = new Error('Runtime changed; refresh before saving'); error.status = 409; error.code = 'runtime_conflict'; throw error; }
    const next = clone(this.config);
    if (input.operation === 'put') {
      validateResource(input.resource);
      const prior = next.resources.find(r => r.id === input.resource.id);
      check(!prior || (prior.kind === input.resource.kind && sameScope(prior.scope, input.resource.scope)), 'Resource kind and owning scope are immutable');
      next.resources = next.resources.filter(r => r.id !== input.resource.id).concat(clone(input.resource));
    } else if (input.operation === 'profile') {
      scope(input.scope);
      check(input.id === null || input.id === 'agent:general' || next.resources.some(r => r.id === input.id && r.kind === 'agent_profile' && knownIds.includes(r.id)), 'Profile is unavailable in this scope');
      next.profileSelections = next.profileSelections.filter(p => !sameScope(p.scope, input.scope));
      if (input.id !== null) next.profileSelections.push({ scope: input.scope, id: input.id });
    } else if (input.operation === 'remove') {
      check(knownIds.includes(input.id) && next.resources.some(r => r.id === input.id), 'Only imported content can be removed here');
      next.resources = next.resources.filter(r => r.id !== input.id);
      next.overrides = next.overrides.filter(r => r.id !== input.id);
    } else if (input.operation === 'exposure') {
      scope(input.scope); check(catalog.some(r => r.id === input.id && r.configurable), 'Resource is unavailable or not exposure-configurable');
      check(input.exposed === null || typeof input.exposed === 'boolean', 'Exposure must be true, false or null to inherit');
      next.overrides = next.overrides.filter(r => !(r.id === input.id && sameScope(r.scope, input.scope)));
      if (input.exposed !== null) next.overrides.push({ id: input.id, scope: input.scope, exposed: input.exposed });
    } else if (input.operation === 'policy') {
      scope(input.scope);
      next.policies = next.policies.filter(r => !sameScope(r.scope, input.scope));
      next.policies.push({ scope: input.scope, rules: clone(input.rules) });
    } else check(false, 'Unsupported runtime operation');
    next.revision++;
    next.audit = next.audit.slice(-199).concat({ revision: next.revision, at: new Date().toISOString(), actor: 'local-user', operation: input.operation, id: input.id ?? input.resource?.id ?? null, scope: input.scope ?? input.resource?.scope ?? null });
    validateConfig(next);
    const temp = this.file + '.' + randomUUID() + '.tmp';
    try { await writeFile(temp, JSON.stringify(next), { mode: 0o600 }); await rename(temp, this.file); }
    finally { await unlink(temp).catch(() => {}); }
    this.config = next;
  }
  inspect({ session, extensions, provider, adapterId, activeRuns = 0, mcp, additionalTools = [] }) {
    const scopes = [{ type: 'user', id: 'local' }, ...(session ? [{ type: 'workspace', id: session.projectId }, { type: 'session', id: session.id }] : [])];
    const applies = value => scopes.some(s => sameScope(s, value));
    const policies = scopes.flatMap(s => this.config.policies.filter(p => sameScope(s, p.scope)));
    const descriptor = (id, kind, title, extra = {}) => ({ id, kind, title, source: { type: 'builtin', version: adapterId }, scope: { type: 'user', id: 'local' }, activation: 'always', installed: true, running: null, exposed: true, health: 'healthy', configurable: false, ...extra });
    const resources = [...TOOLS, ...additionalTools].map(name => descriptor('tool:' + name, 'tool', name, { configurable: true, action: name }));
    for (const ext of extensions) {
      const bound = session?.extensionBinding?.extensionId === ext.id;
      resources.push(descriptor('plugin:' + ext.id, 'plugin', ext.title, { installed: true, running: ext.status === 'loaded', exposed: Boolean(bound && ext.status === 'loaded'), health: ext.status === 'invalidated' ? 'error' : 'healthy', source: { type: 'builtin', version: ext.version }, trust: 'host-trusted', isolation: 'in-process', capabilities: ext.tools.map(t => 'tool:' + t), generation: ext.generation }));
      for (const name of ext.tools) resources.push(descriptor('tool:' + name, 'tool', name, { configurable: true, action: name, exposed: Boolean(bound && ext.status === 'loaded'), parent: 'plugin:' + ext.id }));
    }
    for (const item of this.config.resources.filter(r => applies(r.scope))) {
      if (item.kind === 'mcp_server') {
        const connection = mcp.inspect(item.id, item.content);
        resources.push(descriptor(item.id, item.kind, item.title, { scope: clone(item.scope), source: { type: 'remote', uri: parseMcpConfig(item.content).url, hash: hash(item.content) }, server: connection.server ?? null, configurable: true, running: connection.connected, exposed: false, health: connection.health, protocol: connection.protocol, transport: 'streamable-http', authentication: 'unauthenticated-only', diagnostics: connection.diagnostic ? [connection.diagnostic] : [], capabilities: { tools: connection.tools.length, resources: connection.resources.length, prompts: connection.prompts.length }, catalog: { resources: connection.resources, prompts: connection.prompts } }));
        for (const tool of connection.tools) resources.push(descriptor('tool:' + tool.hostName, 'tool', tool.title ?? tool.name, { scope: clone(item.scope), source: { type: 'remote', uri: parseMcpConfig(item.content).url, hash: hash(item.content) }, action: 'mcp.' + item.id + '.' + tool.name, executionName: tool.hostName, configurable: true, exposed: connection.connected, parent: item.id, inputSchema: tool.inputSchema, description: tool.description, mcp: { serverId: item.id, name: tool.name, configHash: hash(item.content) } }));
        continue;
      }
      const skill = item.kind === 'skill' ? parseFrontmatter(item.content).frontmatter : null;
      resources.push(descriptor(item.id, item.kind, item.title, { scope: clone(item.scope), source: { type: 'local-config', hash: hash(item.content) }, configurable: item.kind !== 'agent_profile', exposed: item.kind !== 'agent_profile', activation: item.kind === 'instruction' ? 'always' : item.kind === 'prompt_template' ? 'user-invoked' : 'manual', ...(skill ? { description: skill.description, compatibility: skill.compatibility ?? null, requestedTools: skill['allowed-tools'] ?? null } : {}), characters: item.content.length }));
    }
    resources.push(descriptor('agent:general', 'agent_profile', 'General', { composition: session?.extensionBinding?.extensionId ?? null }));
    resources.push(descriptor('provider:current', 'provider', provider.config.provider));
    resources.push(descriptor('model:current', 'model', provider.config.model));
    resources.push(descriptor('secret:provider', 'secret', 'Provider credential', { installed: provider.credentialStatus === 'configured', exposed: false, credentialStatus: provider.credentialStatus }));
    resources.push(descriptor('sandbox:workspace', 'sandbox', 'Session filesystem boundary', { scope: session ? { type: 'session', id: session.id } : { type: 'user', id: 'local' }, exposed: Boolean(session), filesystem: session?.workspaceDir ?? null, shell: false, processIsolation: false }));
    resources.push(descriptor('policy:host', 'permission_policy', session?.permissionMode ?? 'No session selected'));
    resources.push(descriptor('context:session', 'session_context', 'Native session history', { exposed: Boolean(session), owner: 'Pi AgentSession' }));
    for (const resource of resources) {
      resource.defaultExposed = resource.exposed;
      resource.provenance = [{ scope: resource.scope, value: resource.exposed, reason: 'source default' }];
      for (const s of scopes) for (const override of this.config.overrides.filter(o => o.id === resource.id && sameScope(o.scope, s))) {
        resource.exposed = override.exposed;
        resource.provenance.push({ scope: s, value: override.exposed, reason: 'explicit override' });
      }
      // A scoped override cannot load or bind an extension.
      const parent = resources.find(r => r.id === resource.parent);
      if (resource.parent && (!parent?.exposed || parent.running === false)) {
        resource.exposed = false;
        resource.provenance.push({ scope: parent?.scope ?? resource.scope, value: false,
          reason: parent?.running === false ? 'parent not running' : 'parent not exposed', parentId: resource.parent });
      }
      if (resource.kind === 'tool') {
        const ceiling = resource.id === 'tool:ws_write' ? session?.permissionMode === 'read_only' ? 'deny' : session?.permissionMode === 'ask' ? 'ask' : 'allow' : 'allow';
        resource.permission = evaluatePolicy(policies, resource.action, '*', ceiling, resource.mcp ? 'ask' : 'allow');
        if (!resource.exposed) resource.permission = { effect: 'deny', trace: [{ source: 'exposure', effect: 'deny' }] };
        resource.permission.resourceSpecific = policies.some(p => p.rules.some(r => matches(r.action, resource.action) && r.resource !== '*'));
      }
    }

    const profileId = scopes.flatMap(s => this.config.profileSelections.filter(p => sameScope(s, p.scope))).at(-1)?.id ?? 'agent:general';
    const profileResource = this.config.resources.find(r => r.id === profileId && r.kind === 'agent_profile' && applies(r.scope));
    let composition = { id: profileId, version: 'builtin', status: 'compatible', resourceIds: null, uiSlots: ['runtime.inspector', 'work.surface'], missing: [] };
    if (profileId !== 'agent:general') {
      const profile = profileResource ? parseProfile(profileResource.content) : null;
      composition = { id: profileId, version: profile?.version ?? null, hash: profileResource ? hash(profileResource.content) : null, status: profile ? 'compatible' : 'unavailable', resourceIds: profile?.resourceIds ?? [], uiSlots: profile?.uiSlots ?? [], missing: profile?.resourceIds.filter(id => !resources.some(r => r.id === id)) ?? [profileId] };
      if (composition.missing.length) composition.status = 'incompatible';
      if (profile) policies.push({ scope: { type: 'agent', id: profileId }, rules: profile.rules });
      for (const resource of resources) {
        if ((resource.kind === 'tool' || CONTENT_KINDS.has(resource.kind)) && !composition.resourceIds.includes(resource.id)) { resource.exposed = false; resource.provenance.push({ scope: { type: 'agent', id: profileId }, value: false, reason: 'profile capability ceiling' }); }
        if (resource.kind === 'tool') {
          const ceiling = resource.id === 'tool:ws_write' ? session?.permissionMode === 'read_only' ? 'deny' : session?.permissionMode === 'ask' ? 'ask' : 'allow' : 'allow';
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
    const content = this.config.resources.filter(r => CONTENT_KINDS.has(r.kind) && resources.some(e => e.id === r.id && e.exposed));
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
    return { protocolVersion: 1, revision: this.config.revision, sessionId: session?.id ?? null, scopes, activeRuns, adapterId, resources, composition, profileSelections: clone(this.config.profileSelections.filter(p => applies(p.scope))), policies: clone(policies), context, audit: clone(this.config.audit), kinds: RESOURCE_KINDS.map(kind => ({ kind, support: supported.has(kind) ? 'available' : 'adapter-required' })), compatibility: { scopes: SCOPES, configurableScopes: ['user', 'workspace', 'session'], hotSwap: 'between-runs', workStateOwner: 'extension/system-of-record', pluginCode: 'trusted catalog only', mcp: { sdk: '@modelcontextprotocol/client@2.0.0', transport: 'streamable-http', protocols: ['2026-07-28', 'legacy-2025'], authentication: 'unauthenticated-only', remoteResources: 'catalog-only', remotePrompts: 'catalog-only' } } };
  }
  bind(snapshot) {
    const resources = clone(snapshot.resources);
    const content = this.config.resources.filter(r => CONTENT_KINDS.has(r.kind) && resources.some(e => e.id === r.id && e.exposed));
    return { revision: snapshot.revision, resources, composition: clone(snapshot.composition), policies: clone(snapshot.policies), context: clone(snapshot.context), content: clone(content), hash: hash({ revision: snapshot.revision, resources, composition: snapshot.composition, policies: snapshot.policies }) };
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
