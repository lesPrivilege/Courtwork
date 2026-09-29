import { createHash } from 'node:crypto';
import { Type } from '@earendil-works/pi-ai';
import { evaluatePolicy, hostToolCeiling } from './control-plane.mjs';
import { workspaceResourcePath } from './workspace-tools.mjs';

// RL-1 (RD-009): a missing runtime_load ID stays a model-visible recoverable
// tool error (Pi maps a thrown Error to isError). The hint may name only
// skills/references the Run's frozen binding already admits, and never a
// resource body, source URI, title or the caller's own input.
const MISSING_CONTEXT_SENTENCE = 'Context resource is not exposed to this run';
const LOADABLE_KINDS = ['skill', 'reference'];
const RECOVERY_HINT_MAX_IDS = 8;
const RECOVERY_HINT_MAX_UNITS = 1200;
const RECOVERY_HINT_BOUNDARY = ' This tool loads one admitted skill or reference by its exact ID; it cannot list resources or discover check recipes.';

/** The loadable IDs of one frozen binding: a skill/reference content entry
 * whose descriptor is exposed with the same kind. Pure, deduplicated and
 * sorted deterministically; it never reads anything outside `binding`. */
function loadableContextIds(binding) {
  const exposed = new Set((binding?.resources ?? [])
    .filter(r => r && r.exposed === true && LOADABLE_KINDS.includes(r.kind))
    .map(r => r.id + '\u0000' + r.kind));
  const ids = new Set();
  for (const entry of binding?.content ?? []) {
    if (!entry || !LOADABLE_KINDS.includes(entry.kind)) continue;
    if (exposed.has(entry.id + '\u0000' + entry.kind)) ids.add(entry.id);
  }
  return [...ids].sort();
}

/** The existing missing-ID sentence, then bounded hints from this Run only.
 * IDs stay whole (JSON-quoted) and the complete message never exceeds the
 * code-unit limit, so the text is safe to surface to the model unchanged. */
function missingContextMessage(binding) {
  const ids = loadableContextIds(binding);
  if (!ids.length) return MISSING_CONTEXT_SENTENCE + ' No admitted skill or reference is loadable in this Run.' + RECOVERY_HINT_BOUNDARY;
  const quoted = ids.map(id => JSON.stringify(id));
  for (let count = Math.min(RECOVERY_HINT_MAX_IDS, quoted.length); count >= 1; count--) {
    const omitted = ids.length - count;
    const message = MISSING_CONTEXT_SENTENCE + ' Admitted IDs in this Run: ' + quoted.slice(0, count).join(', ') + '.'
      + (omitted ? ' ' + omitted + ' more admitted ID' + (omitted === 1 ? '' : 's') + ' omitted.' : '')
      + RECOVERY_HINT_BOUNDARY;
    if (message.length <= RECOVERY_HINT_MAX_UNITS) return message;
  }
  return MISSING_CONTEXT_SENTENCE + ' ' + ids.length + ' admitted ID' + (ids.length === 1 ? '' : 's')
    + ' omitted because the complete list exceeds this tool\'s ' + RECOVERY_HINT_MAX_UNITS + '-code-unit recovery hint.' + RECOVERY_HINT_BOUNDARY;
}

export function createRuntimeLoadTool(binding, onLoad) {
  return {
    name: 'runtime_load', label: 'Load runtime context',
    description: 'Load exactly one admitted skill or reference by its exact ID and return its body. The ID must be a skill or reference already admitted to this Run; this is not a catalog, list or check-recipe command and cannot discover IDs or recipes. Scripts are not executed and requested tools do not grant permissions.',
    parameters: Type.Object({ id: Type.String({ maxLength: 200, description: 'Exact admitted skill or reference ID; not a catalog or check-recipe name.' }) }),
    async execute(_callId, params) {
      const resource = (binding?.content ?? []).find(r => r.id === params.id && LOADABLE_KINDS.includes(r.kind));
      if (!resource) throw new Error(missingContextMessage(binding));
      await onLoad({ id: resource.id, kind: resource.kind, source: binding.resources.find(r => r.id === resource.id).source, characters: resource.content.length });
      return { content: [{ type: 'text', text: resource.content }], details: { resourceId: resource.id, revision: binding.revision } };
    },
  };
}

/** BE-6 first slice · the model may propose a declarative Skill. The call is a
 * ledger write only: nothing is installed, exposed, loaded or permitted, and
 * the author is the real Run, not a parameter. A person reviews it in
 * Settings › Developer › Runtime and applies it under the configuration CAS. */
export function createRuntimeProposeTool(onPropose) {
  return {
    name: 'runtime_propose', label: 'Propose a skill',
    description: 'Propose a declarative Skill (SKILL.md text with YAML frontmatter name and description) for a person to review. The proposal is recorded only; it is not installed, exposed or loaded, and allowed-tools grants nothing.',
    parameters: Type.Object({ title: Type.String({ maxLength: 200 }), content: Type.String({ maxLength: 65536 }) }),
    async execute(_callId, params) {
      const proposal = await onPropose({ title: params.title, content: params.content });
      return {
        content: [{ type: 'text', text: `Proposal ${proposal.id} revision ${proposal.revision} recorded for ${proposal.target.resourceId} (sha256 ${proposal.identity.contentSha256}). A person reviews it in Settings › Developer › Runtime; it is not loaded and grants nothing until applied.` }],
        details: { proposalId: proposal.id, revision: proposal.revision, resourceId: proposal.target.resourceId, contentSha256: proposal.identity.contentSha256, status: proposal.status },
      };
    },
  };
}

/** 08 · the model's one presentation entry. The spec is validated and recorded
 * by the Host; the receipt is short and claims only that. */
export function createPresentTool(onPresent) {
  return {
    name: 'cw_present', label: 'Present a structured reading',
    description: 'Show the person a small structured reading. First slice: { kind: "facts", version: 1, title, items: [{ label, value }] } (at most 40 items, 16 KiB). Values are shown as model-derived; recording proves nothing about the world and grants nothing.',
    parameters: Type.Object({ spec: Type.Any() }),
    async execute(callId, params) {
      const instance = await onPresent({ callId, spec: params.spec });
      return {
        content: [{ type: 'text', text: `Presentation ${instance.instanceId} recorded (${instance.kind} v${instance.version}, ${instance.items} item${instance.items === 1 ? '' : 's'}). It is shown to the person as model-derived; nothing else is claimed.` }],
        details: { instanceId: instance.instanceId, revision: instance.revision, kind: instance.kind, version: instance.version, specSha256: instance.specSha256 },
      };
    },
  };
}

/** Computes the same per-tool policy effect governTools uses for its entry
 * decision, but for an arbitrary resource string (typically a relative path)
 * instead of the tool's own call-site resource. This is the single place
 * that knows how a (tool name, resource) pair resolves to an effect, so
 * aggregate tools (repo_grep, candidate_grep, repo_diff) can apply the same
 * per-file admission governTools applies per call. */
export function createPathAdmission({ binding, permissionMode }) {
  return function admitPath(toolName, resource) {
    const descriptor = binding.resources.find(r => r.id === 'tool:' + toolName);
    const ceiling = hostToolCeiling(toolName, permissionMode);
    return evaluatePolicy(binding.policies, descriptor?.action ?? toolName, resource, ceiling, descriptor?.mcp ? 'ask' : 'allow').effect;
  };
}

/** All model-callable executors pass this boundary, including trusted domain
 * tools. Catalog filtering is presentation; this wrapper enforces admission. */
export function governTools(tools, { binding, permissionMode, workspaceDir, requestPermission, isOpen }) {
  const admitPath = createPathAdmission({ binding, permissionMode });
  return tools.filter(tool => binding.resources.some(r => r.id === 'tool:' + tool.name && r.exposed))
    .filter(tool => !(['ws_write','repo_write','message_other_agent'].includes(tool.name) && permissionMode === 'read_only'))
    .map(tool => {
      const { permissionContext, ...runtimeTool } = tool;
      return { ...runtimeTool, async execute(callId, params, signal, onUpdate) {
      if (signal?.aborted || !isOpen()) throw new Error('Run admission is closed');
      // Own a copy of the exact arguments across a pending human response.
      const args = structuredClone(params);
      let resource = tool.name === 'runtime_load' ? args.id : '*';
      if (tool.name.startsWith('ws_') && typeof args.path === 'string' && args.path) resource = await workspaceResourcePath(workspaceDir, args.path);
      if ((tool.name.startsWith('repo_') || tool.name.startsWith('candidate_')) && typeof args.path === 'string' && args.path) resource = args.path;
      const effect = admitPath(tool.name, resource);
      if (effect === 'deny') throw new Error('Runtime policy denied ' + tool.name);
      let approvedContext = null;
      if (effect === 'ask') {
        const content = ['ws_write', 'repo_write'].includes(tool.name) && typeof args.text === 'string' ? args.text : JSON.stringify(args);
        const context = typeof permissionContext === 'function' ? permissionContext(args) : {};
        approvedContext = context;
        const answer = await requestPermission({ toolCallId: callId, tool: tool.name, path: resource,
          bytes: Buffer.byteLength(content), contentSha256: createHash('sha256').update(content).digest('hex'),
          preview: content.slice(0, 400), ...context, signal });
        if (answer !== 'allow') throw new Error('Runtime action was denied by the user');
      }
      if (signal?.aborted || !isOpen()) throw new Error('Run admission is closed');
      return tool.execute(callId, args, signal, onUpdate, approvedContext);
      } };
    });
}
