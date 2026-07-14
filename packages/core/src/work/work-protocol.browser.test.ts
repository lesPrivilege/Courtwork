import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CORE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REPO_ROOT = resolve(CORE_DIR, '../..');
const ENTRY = join(CORE_DIR, 'src/work/work-protocol.ts');

const STATIC_SPECIFIER = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
const DYNAMIC_SPECIFIER = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

function runtimeSpecifiers(source: string): string[] {
  const found: string[] = [];
  for (const pattern of [STATIC_SPECIFIER, DYNAMIC_SPECIFIER]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) found.push(match[1]!);
  }
  return found;
}

function resolveLocalImport(importer: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  const unresolved = resolve(dirname(importer), specifier);
  const candidates = extname(unresolved) === '.js'
    ? [unresolved.slice(0, -3) + '.ts', unresolved]
    : [unresolved, `${unresolved}.ts`, join(unresolved, 'index.ts')];
  return candidates.find((candidate) => existsSync(candidate));
}

function inspectRuntimeGraph(entry: string): { files: string[]; forbidden: string[] } {
  const files: string[] = [];
  const forbidden: string[] = [];
  const pending = [entry];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const file = pending.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    files.push(file);
    const source = readFileSync(file, 'utf-8');
    for (const specifier of runtimeSpecifiers(source)) {
      if (specifier.startsWith('node:')) forbidden.push(`${file}: ${specifier}`);
      const local = resolveLocalImport(file, specifier);
      if (local) pending.push(local);
    }
  }

  return { files, forbidden };
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

describe('@courtwork/core/work-protocol browser boundary', () => {
  it('keeps root compatibility and the Node-only/browser-safe package surfaces physically split', async () => {
    const root = await import('@courtwork/core');
    const browserProtocol = await import('@courtwork/core/work-protocol');
    const fileStores = await import('@courtwork/core/work-store-file');

    for (const name of [
      'createFileEventLog',
      'createFileConfirmationStore',
      'createFileRevisionEventStore',
    ] as const) {
      expect(root[name]).toBeTypeOf('function');
      expect(fileStores[name]).toBe(root[name]);
      expect(browserProtocol).not.toHaveProperty(name);
    }
  });

  it('publishes the dedicated browser-safe package subpath without file adapters', () => {
    const manifest = JSON.parse(readFileSync(join(CORE_DIR, 'package.json'), 'utf-8')) as {
      exports?: Record<string, { types?: string; default?: string }>;
    };
    expect(manifest.exports?.['./work-protocol']).toEqual({
      types: './dist/work/work-protocol.d.ts',
      default: './dist/work/work-protocol.js',
    });
    expect(manifest.exports?.['./work-store-file']).toEqual({
      types: './dist/work/work-store-file.d.ts',
      default: './dist/work/work-store-file.js',
    });

    const source = readFileSync(ENTRY, 'utf-8');
    expect(source).not.toMatch(/createFile|store-file|event-log-file|confirmation-store-file|revision-store-file/);
  });

  it('recursively contains no node:* runtime import and the guard detects an injected node:fs counterexample', () => {
    const graph = inspectRuntimeGraph(ENTRY);
    expect(graph.files.length).toBeGreaterThan(8);
    expect(graph.forbidden).toEqual([]);

    const mutationDir = mkdtempSync(join(tmpdir(), 'courtwork-work-protocol-mutation-'));
    try {
      const mutationEntry = join(mutationDir, 'entry.ts');
      writeFileSync(mutationEntry, "import 'node:fs';\nexport const injected = true;\n", 'utf-8');
      expect(inspectRuntimeGraph(mutationEntry).forbidden).toEqual([`${mutationEntry}: node:fs`]);
    } finally {
      rmSync(mutationDir, { recursive: true, force: true });
    }
  });

  it('bundles a real Vite consumer that imports the work-protocol subpath', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'courtwork-work-protocol-vite-'));
    try {
      const output = execFileSync(
        'pnpm',
        [
          '--dir', join(REPO_ROOT, 'apps/desktop'),
          'exec', 'vite', 'build',
          '--config', join(CORE_DIR, 'vite.work-protocol.config.mjs'),
        ],
        {
          cwd: REPO_ROOT,
          encoding: 'utf-8',
          env: { ...process.env, COURTWORK_WORK_PROTOCOL_OUT_DIR: outDir },
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
