import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { defineTool, type ToolAdapter } from '@courtwork/tools';
import { createToolRegistry } from './tool-registry.js';

function fakeTool() {
  const adapter: ToolAdapter<{ x: string }, { y: string }> = {
    sourceId: 'fake',
    async run(input) {
      return { y: input.x };
    },
  };
  return defineTool(
    { id: 'fake-tool', inputSchema: z.object({ x: z.string() }), dataSchema: z.object({ y: z.string() }), timeoutMs: 1000 },
    adapter,
  );
}

describe('createToolRegistry', () => {
  it('registers and retrieves a tool binding by toolId', () => {
    const registry = createToolRegistry();
    const tool = fakeTool();
    registry.register('fake-tool', { tool, grade: 'B' });
    expect(registry.get('fake-tool')).toEqual({ tool, grade: 'B' });
  });

  it('returns undefined for an unregistered toolId', () => {
    const registry = createToolRegistry();
    expect(registry.get('never-registered')).toBeUndefined();
  });
});
