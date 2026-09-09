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

/** All model-callable executors pass this boundary, including trusted domain
 * tools. Catalog filtering is presentation; this wrapper enforces admission. */
export function governTools(tools, { binding, permissionMode, workspaceDir, requestPermission, isOpen }) {
  return tools.filter(tool => binding.resources.some(r => r.id === 'tool:' + tool.name && r.exposed))
    .filter(tool => !(['ws_write','message_other_agent'].includes(tool.name) && permissionMode === 'read_only'))
    .map(tool => ({ ...tool, async execute(callId, params, signal, onUpdate) {
      if (signal?.aborted || !isOpen()) throw new Error('Run admission is closed');
      // Own a copy of the exact arguments across a pending human response.
      const args = structuredClone(params);
      let resource = tool.name === 'runtime_load' ? args.id : '*';
      if (tool.name.startsWith('ws_') && typeof args.path === 'string' && args.path) resource = (await resolveWorkspacePath(workspaceDir, args.path)).relativePath;
      const descriptor = binding.resources.find(r => r.id === 'tool:' + tool.name);
      const ceiling = hostToolCeiling(tool.name, permissionMode);
      const decision = evaluatePolicy(binding.policies, descriptor?.action ?? tool.name, resource, ceiling, descriptor?.mcp ? 'ask' : 'allow');
      if (decision.effect === 'deny') throw new Error('Runtime policy denied ' + tool.name);
      if (decision.effect === 'ask') {
        const content = tool.name === 'ws_write' ? args.text : JSON.stringify(args);
        const answer = await requestPermission({ toolCallId: callId, tool: tool.name, path: resource, bytes: Buffer.byteLength(content), contentSha256: createHash('sha256').update(content).digest('hex'), preview: content.slice(0, 400), signal });
        if (answer !== 'allow') throw new Error('Runtime action was denied by the user');
      }
      if (signal?.aborted || !isOpen()) throw new Error('Run admission is closed');
      return tool.execute(callId, args, signal, onUpdate);
    } }));
}
