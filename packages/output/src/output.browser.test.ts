import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const OUTPUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(OUTPUT_DIR, '../..');
const ENTRY = join(OUTPUT_DIR, 'src/index.ts');

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
  const candidates =
    extname(unresolved) === '.js'
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

describe('@courtwork/output browser consumer boundary (OUTPUT-CORRECTNESS-1 #7)', () => {
  it('recursively contains no node:* runtime import and the guard detects an injected node:fs counterexample', () => {
    const graph = inspectRuntimeGraph(ENTRY);
    expect(graph.files.length).toBeGreaterThan(5);
    expect(graph.forbidden).toEqual([]);

    const mutationDir = mkdtempSync(join(tmpdir(), 'courtwork-output-mutation-'));
    try {
      const mutationEntry = join(mutationDir, 'entry.ts');
      writeFileSync(mutationEntry, "import 'node:fs';\nexport const injected = true;\n", 'utf-8');
      expect(inspectRuntimeGraph(mutationEntry).forbidden).toEqual([`${mutationEntry}: node:fs`]);
    } finally {
      rmSync(mutationDir, { recursive: true, force: true });
    }
  });

  it('bundles a real Vite consumer that imports @courtwork/output and runs the redline pipeline', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'courtwork-output-vite-'));
    try {
      const output = execFileSync(
        'pnpm',
        [
          '--dir', join(REPO_ROOT, 'apps/desktop'),
          'exec', 'vite', 'build',
          '--config', join(OUTPUT_DIR, 'vite.output.config.mjs'),
        ],
        {
          cwd: REPO_ROOT,
          encoding: 'utf-8',
          env: { ...process.env, COURTWORK_OUTPUT_OUT_DIR: outDir },
        },
      );
      expect(output).toContain('built in');
      expect(existsSync(join(outDir, 'index.html'))).toBe(true);

      const bundledJavaScript = listFiles(outDir)
        .filter((file) => file.endsWith('.js'))
        .map((file) => readFileSync(file, 'utf-8'))
        .join('\n');
      // 浏览器目标不得回退到 node 外部化或裸 node:* 内置模块。
      expect(bundledJavaScript).not.toMatch(/__vite-browser-external|node:(?:crypto|fs|path)/);
      // 证明 output 著录器代码确实进包（房子字体常量来自 src/fonts.ts）。
      expect(bundledJavaScript).toContain('仿宋_GB2312');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  }, 60_000);
});
