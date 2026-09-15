import { createHash } from 'node:crypto';
import { Type } from '@earendil-works/pi-ai';
import { evaluatePolicy, hostToolCeiling } from './control-plane.mjs';
import { resolveWorkspacePath } from './workspace-tools.mjs';

export function createRuntimeLoadTool(binding, onLoad) {
  return {
    name: 'runtime_load', label: 'Load runtime context',
    description: 'Load one catalogued skill or reference by id. Scripts are not executed and requested tools do not grant permissions.',
    parameters: Type.Object({ id: Type.String({ maxLength: 200 }) }),
    async execute(_callId, params) {
      const resource = binding.content.find(r => r.id === params.id && ['skill', 'reference'].includes(r.kind));
      if (!resource) throw new Error('Context resource is not exposed to this run');
      await onLoad({ id: resource.id, kind: resource.kind, source: binding.resources.find(r => r.id === resource.id).source, characters: resource.content.length });
      return { content: [{ type: 'text', text: resource.content }], details: { resourceId: resource.id, revision: binding.revision } };
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
      if (tool.name.startsWith('ws_') && typeof args.path === 'string' && args.path) resource = (await resolveWorkspacePath(workspaceDir, args.path)).relativePath;
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
