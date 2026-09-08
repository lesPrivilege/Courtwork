import { createHash } from 'node:crypto';
import { validateRuntimeSource } from './control-plane.mjs';

const LOCATORS = new Set(['url', 'repository', 'package', 'path', 'manifest']);
const digest = value => createHash('sha256').update(value, 'utf8').digest('hex');
function invalid(message) {
  const error = new Error(message);
  error.code = 'invalid_runtime_source';
  error.status = 400;
  throw error;
}
function object(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !allowed.includes(key))) invalid('Unsupported source fields');
}
function text(value, max) { return typeof value === 'string' && value.length > 0 && value.length <= max; }

/** Runtime R2, local declarative slice. Resolving is inspection, not import.
 * No filesystem, network, provider, configuration or execution API is called.
 * Locator acquisition and package/native adapters are deliberately unresolved.
 */
export function resolveRuntimeSource(input) {
  object(input, ['type', 'kind', 'title', 'content', 'origin', 'locator', 'value']);
  if (input.type === 'locator') {
    object(input, ['type', 'locator', 'value']);
    if (!LOCATORS.has(input.locator) || !text(input.value, 4000)) invalid('Invalid source locator');
    return {
      resolverVersion: 1,
      status: 'unsupported',
      disposition: 'inspect-only',
      source: structuredClone(input),
      reason: 'source_acquisition_not_implemented',
      diagnostics: ['Supply explicit declarative source content. No locator was fetched, read, cloned or installed.'],
    };
  }
  if (input.type !== 'inline') invalid('Choose inline content or an explicit locator');
  object(input, ['type', 'kind', 'title', 'content', 'origin']);
  if (input.origin !== undefined) {
    object(input.origin, ['uri', 'version']);
    if (!text(input.origin.uri, 4000) || (input.origin.version !== undefined && !text(input.origin.version, 200))) invalid('Invalid declared source origin');
  }
  const portable = { kind: input.kind, title: input.title, content: input.content };
  const metadata = validateRuntimeSource(portable);
  const declared = {};
  const requirements = [];
  const diagnostics = ['Resolution does not install, expose, permit, connect or execute this source.'];
  if (metadata.skill) {
    declared.name = metadata.skill.name;
    declared.description = metadata.skill.description;
    if (metadata.skill['allowed-tools'] !== undefined) declared.requestedTools = structuredClone(metadata.skill['allowed-tools']);
    if (metadata.skill.compatibility !== undefined) declared.compatibility = structuredClone(metadata.skill.compatibility);
    diagnostics.push('Skill scripts and bundled assets are not resolved; allowed-tools and compatibility are unverified metadata.');
  }
  if (metadata.profile) {
    declared.resourceIds = [...metadata.profile.resourceIds];
    declared.uiSlots = [...metadata.profile.uiSlots];
    requirements.push(...metadata.profile.resourceIds.map(id => ({ kind: 'resource', id, status: 'unchecked' })));
    diagnostics.push('Referenced resources are not looked up; profile requirements and permissions must be checked against the target runtime.');
  }
  if (metadata.mcp) {
    declared.transport = metadata.mcp.transport;
    declared.protocol = metadata.mcp.protocol;
    requirements.push({ kind: 'mcp-connection', status: 'unchecked' });
    diagnostics.push('Only MCP configuration syntax was checked. Endpoint identity, availability and remote capabilities are unverified.');
  }
  if (input.kind === 'prompt_template') diagnostics.push('Prompt templates remain human-invoked drafts.');
  return {
    resolverVersion: 1,
    status: 'resolved',
    disposition: 'inspect-only',
    identity: {
      kind: input.kind,
      contentSha256: digest(input.content),
      // The exact kind/title/content tuple, with fixed field order, binds the
      // portable envelope independently of caller object insertion order.
      artifactSha256: digest(JSON.stringify(portable)),
      bytes: Buffer.byteLength(input.content, 'utf8'),
      characters: input.content.length,
    },
    provenance: { type: 'supplied-inline', verified: false, ...(input.origin ? { declaredOrigin: structuredClone(input.origin) } : {}) },
    portable,
    native: [],
    capabilities: { declared, granted: [] },
    requirements,
    trust: 'unverified',
    adapters: [{ id: 'courtwork-declarative-source-v1', kind: input.kind, status: 'syntax-accepted' }],
    diagnostics,
  };
}
