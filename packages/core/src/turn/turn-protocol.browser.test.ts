import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as protocol from './turn-protocol.js';

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const CORE_DIR = resolve(SOURCE_DIR, '../..');
const REPO_ROOT = resolve(CORE_DIR, '../..');

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

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

describe('@courtwork/core/turn-protocol browser-safe boundary', () => {
  it('exports the protocol/store algorithm but not the Node file adapter', () => {
    expect(protocol).toMatchObject({
      runTurn: expect.any(Function),
      requestInteraction: expect.any(Function),
      createTurnStore: expect.any(Function),
      createMemoryTurnStore: expect.any(Function),
      createTurnHarnessRuntime: expect.any(Function),
    });
    expect(protocol).not.toHaveProperty('createFileTurnStore');
  });

  it('has a package subpath and no node:* import in its core runtime graph', () => {
    const packageJson = JSON.parse(readFileSync(join(SOURCE_DIR, '../../package.json'), 'utf8')) as {
      exports: Record<string, unknown>;
    };
    expect(packageJson.exports).toHaveProperty('./turn-protocol');

    const graph = collectRuntimeGraph(join(SOURCE_DIR, 'turn-protocol.ts'));
    const relativeGraph = graph.map((file) => file.replace(`${SOURCE_DIR}/`, ''));
    expect(relativeGraph).toContain('turn-harness-runtime.ts');
    expect(relativeGraph).not.toContain('turn-store-file.ts');
    for (const filePath of graph) {
      const source = readFileSync(filePath, 'utf8');
      expect(source, filePath).not.toMatch(/(?:from\s+|import\s*)['"]node:/);
      expect(source, `${filePath} must not add weak identity randomness`).not.toMatch(/\bMath\.random\s*\(/);
    }
  });

  it('does not wire the full facade into Chat, Work UI, or ScenarioExecutorDeps', () => {
    const facadePattern = /\b(?:createTurnHarnessRuntime|TurnHarnessRuntime|InteractionRuntimePort)\b/;
    const desktopSourceRoot = join(REPO_ROOT, 'apps/desktop/src');
    const desktopViolations = listFiles(desktopSourceRoot)
      .filter((file) => /\.(?:ts|tsx)$/.test(file) && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'))
      .filter((file) => facadePattern.test(readFileSync(file, 'utf8')))
      .map((file) => file.replace(`${REPO_ROOT}/`, ''));
    expect(desktopViolations).toEqual([]);

    const executorPath = join(REPO_ROOT, 'packages/core/src/scenario-executor/executor.ts');
    const executorSource = readFileSync(executorPath, 'utf8');
    expect(executorSource).not.toMatch(facadePattern);
    expect(executorSource).toContain('turnRunner: TurnRunnerPort;');
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

  it('bundles the harness facade through the real package subpath without browser externals', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'courtwork-turn-protocol-vite-'));
    try {
      const output = execFileSync(
        'pnpm',
        [
          '--dir', join(REPO_ROOT, 'apps/desktop'),
          'exec', 'vite', 'build',
          '--config', join(CORE_DIR, 'vite.turn-protocol.config.mjs'),
        ],
        {
          cwd: REPO_ROOT,
          encoding: 'utf-8',
          env: { ...process.env, COURTWORK_TURN_PROTOCOL_OUT_DIR: outDir },
        },
      );
      expect(output).toContain('built in');
      expect(existsSync(join(outDir, 'index.html'))).toBe(true);
      const bundledJavaScript = listFiles(outDir)
        .filter((file) => file.endsWith('.js'))
        .map((file) => readFileSync(file, 'utf-8'))
        .join('\n');
      expect(bundledJavaScript).not.toMatch(/__vite-browser-external|node:(?:crypto|fs|path)/);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  }, 30_000);
});
