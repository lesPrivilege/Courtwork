import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as protocol from './turn-protocol.js';

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));

function runtimeRelativeImports(filePath: string): string[] {
  const source = readFileSync(filePath, 'utf8');
  const imports = [...source.matchAll(/(?:import(?!\s+type)|export\s+(?:\*|\{(?!\s*type\b)))[\s\S]*?from\s+['"](\.[^'"]+)['"]/g)]
    .map((match) => match[1]!);
  return imports;
}

function collectRuntimeGraph(entryPath: string): string[] {
  const visited = new Set<string>();
  const visit = (filePath: string) => {
    if (visited.has(filePath)) return;
    visited.add(filePath);
    for (const specifier of runtimeRelativeImports(filePath)) {
      const target = resolve(dirname(filePath), specifier.replace(/\.js$/, '.ts'));
      visit(target);
    }
  };
  visit(entryPath);
  return [...visited];
}

describe('@courtwork/core/turn-protocol browser-safe boundary', () => {
  it('exports the protocol/store algorithm but not the Node file adapter', () => {
    expect(protocol).toMatchObject({
      runTurn: expect.any(Function),
      requestInteraction: expect.any(Function),
      createTurnStore: expect.any(Function),
      createMemoryTurnStore: expect.any(Function),
    });
    expect(protocol).not.toHaveProperty('createFileTurnStore');
  });

  it('has a package subpath and no node:* import in its core runtime graph', () => {
    const packageJson = JSON.parse(readFileSync(join(SOURCE_DIR, '../../package.json'), 'utf8')) as {
      exports: Record<string, unknown>;
    };
    expect(packageJson.exports).toHaveProperty('./turn-protocol');

    const graph = collectRuntimeGraph(join(SOURCE_DIR, 'turn-protocol.ts'));
    expect(graph.map((file) => file.replace(`${SOURCE_DIR}/`, ''))).not.toContain('turn-store-file.ts');
    for (const filePath of graph) {
      expect(readFileSync(filePath, 'utf8'), filePath).not.toMatch(/(?:from\s+|import\s*)['"]node:/);
    }
  });

  it('lets a browser adapter inject storage while retaining the shared validation algorithm', () => {
    const entries: protocol.TurnJournalEntry[] = [];
    const store = protocol.createTurnStore({
      read: () => structuredClone(entries),
      append(entry, expectedLength) {
        if (entries.length !== expectedLength) return false;
        entries.push(structuredClone(entry));
        return true;
      },
    }, () => '2026-07-14T00:00:00.000Z');
    store.appendInteractionRequested({
      type: 'interaction_requested',
      turnId: 'turn-browser',
      requestId: 'interaction-browser',
      packageId: 'pkg',
      templateId: 'pkg.review',
      kind: 'confirmation',
      question: '是否继续',
      options: [{ id: 'yes', label: '继续' }],
      skippable: false,
      anchorPolicy: 'none',
      uiTemplateId: 'question-card',
      sourceAnchors: [],
    });
    expect(store.replayTurn('turn-browser').state).toBe('pending_interaction');
  });
});
