import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const LEGAL_ROOT = join(REPO_ROOT, 'packages', 'legal');
const PM_ROOT = join(REPO_ROOT, 'packages', 'pm');

interface PackageExportTarget {
  types: string;
  default: string;
}

interface PackageMetadata {
  exports: Record<string, PackageExportTarget>;
}

interface SourceRecord {
  path: string;
  content: string;
}

function packageMetadata(packageRoot: string): PackageMetadata {
  return JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as PackageMetadata;
}

function sourceEntry(packageRoot: string, exportName: string): string {
  const target = packageMetadata(packageRoot).exports[exportName]?.default;
  if (typeof target !== 'string' || !target.startsWith('./dist/') || !target.endsWith('.js')) {
    throw new Error(`${relative(REPO_ROOT, packageRoot)} 缺少可审计的 ${exportName} ESM 出口`);
  }
  const source = join(packageRoot, 'src', target.slice('./dist/'.length).replace(/\.js$/, '.ts'));
  if (!existsSync(source)) throw new Error(`${exportName} 出口没有源码入口 ${relative(REPO_ROOT, source)}`);
  return source;
}

function importSpecifiers(content: string): string[] {
  const specifiers: string[] = [];
  const staticPattern = /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g;
  const dynamicPattern = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const match of content.matchAll(staticPattern)) specifiers.push(match[1]);
  for (const match of content.matchAll(dynamicPattern)) specifiers.push(match[1]);
  return specifiers;
}

function resolveLocalImport(fromFile: string, specifier: string): string {
  const raw = resolve(dirname(fromFile), specifier);
  const candidates = specifier.endsWith('.js')
    ? [raw.replace(/\.js$/, '.ts')]
    : [raw, `${raw}.ts`, join(raw, 'index.ts')];
  const found = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  if (!found) throw new Error(`${relative(REPO_ROOT, fromFile)} 无法解析 ${specifier}`);
  return found;
}

function workspaceImportEntry(specifier: string): string | undefined {
  const match = /^@courtwork\/([^/]+)(\/.*)?$/.exec(specifier);
  if (!match) return undefined;
  const packageRoot = join(REPO_ROOT, 'packages', match[1]);
  if (!existsSync(join(packageRoot, 'package.json'))) return undefined;
  const exportName = match[2] ? `.${match[2]}` : '.';
  return sourceEntry(packageRoot, exportName);
}

function collectImportGraph(entry: string): SourceRecord[] {
  const seen = new Set<string>();
  const records: SourceRecord[] = [];
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const content = readFileSync(file, 'utf8');
    records.push({ path: relative(REPO_ROOT, file), content });
    for (const specifier of importSpecifiers(content)) {
      if (specifier.startsWith('.')) visit(resolveLocalImport(file, specifier));
      else {
        const workspaceEntry = workspaceImportEntry(specifier);
        if (workspaceEntry) visit(workspaceEntry);
      }
    }
  };
  visit(entry);
  return records;
}

function browserUnsafeImports(records: readonly SourceRecord[]): string[] {
  return records.flatMap((record) => importSpecifiers(record.content)
    .filter((specifier) => specifier.startsWith('node:')
      || ['fs', 'path', 'os', 'crypto', 'url', 'module', 'buffer', 'stream', 'util', 'react', 'react-dom'].includes(specifier)
      || /\.(?:css|scss|sass|less)$/.test(specifier))
    .map((specifier) => `${record.path} imports ${specifier}`));
}

function collectCodeFiles(root: string, output: string[] = []): string[] {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'archive', '.git'].includes(entry.name)) continue;
    const full = join(root, entry.name);
    if (entry.isDirectory()) collectCodeFiles(full, output);
    else if (/\.(?:ts|tsx|mts|mjs)$/.test(entry.name)) output.push(full);
  }
  return output;
}

function isTestingConsumerAllowed(path: string): boolean {
  return path.startsWith('packages/demo-runtime/')
    || path.includes('/acceptance/')
    || /\.(?:test|spec)\.[^.]+$/.test(path);
}

function testingConsumerViolations(records: readonly SourceRecord[]): string[] {
  return records.flatMap((record) => importSpecifiers(record.content)
    .filter((specifier) => /^@courtwork\/[^/]+\/testing(?:\/|$)/.test(specifier))
    .filter(() => !isTestingConsumerAllowed(record.path))
    .map((specifier) => `${record.path} may not import ${specifier}`));
}

describe('VPKG-EXPORTS-1 垂类包出口与递归依赖图', () => {
  it('Legal 明确提供 root/package/schemas/testing；PM 只提供 browser-safe root/package/schemas', () => {
    expect(Object.keys(packageMetadata(LEGAL_ROOT).exports)).toEqual(['.', './package', './schemas', './testing']);
    expect(Object.keys(packageMetadata(PM_ROOT).exports)).toEqual(['.', './package', './schemas']);
    expect(existsSync(join(PM_ROOT, 'src', 'testing'))).toBe(false);
    expect(existsSync(join(PM_ROOT, 'src', 'runtime'))).toBe(false);
  });

  it('Legal root/package/schemas 递归图 browser-safe 且 root 不可达 fixture；testing 独占三份 fixture', () => {
    const rootGraph = collectImportGraph(sourceEntry(LEGAL_ROOT, '.'));
    const packageGraph = collectImportGraph(sourceEntry(LEGAL_ROOT, './package'));
    const schemasGraph = collectImportGraph(sourceEntry(LEGAL_ROOT, './schemas'));
    const testingGraph = collectImportGraph(sourceEntry(LEGAL_ROOT, './testing'));
    const fixtureMarkers = ['S3_RISK_LIST_RESPONSE', 'S3_RISK_LIST_DRAFT', 'S3_PDF_DOSSIER_DRAFT'];

    expect(browserUnsafeImports([...rootGraph, ...packageGraph, ...schemasGraph])).toEqual([]);
    expect(rootGraph.some((record) => record.path.includes('/testing/'))).toBe(false);
    expect(rootGraph.flatMap((record) => fixtureMarkers.filter((marker) => record.content.includes(marker)))).toEqual([]);
    expect(testingGraph.filter((record) => /packages\/legal\/src\/testing\/s3-/.test(record.path))).toHaveLength(3);
    for (const marker of fixtureMarkers) {
      expect(testingGraph.some((record) => record.content.includes(`export const ${marker}`))).toBe(true);
    }
  });

  it('PM root/package/schemas 递归图 browser-safe，且不偷建 runtime/testing/scenario/interaction 出口', () => {
    const graphs = ['.', './package', './schemas']
      .flatMap((exportName) => collectImportGraph(sourceEntry(PM_ROOT, exportName)));
    expect(browserUnsafeImports(graphs)).toEqual([]);
    expect(Object.keys(packageMetadata(PM_ROOT).exports)).not.toEqual(expect.arrayContaining([
      './testing', './runtime', './scenarios', './interactions',
    ]));
  });

  it('全仓只有 demo-runtime、acceptance 与 test 可以消费 /testing', () => {
    const records = [join(REPO_ROOT, 'apps'), join(REPO_ROOT, 'packages'), join(REPO_ROOT, 'eval')]
      .flatMap((root) => collectCodeFiles(root))
      .map((file) => ({ path: relative(REPO_ROOT, file), content: readFileSync(file, 'utf8') }));
    expect(testingConsumerViolations(records)).toEqual([]);
  });

  it('守卫自检：desktop/core/provider/registry 生产图植入 /testing import 必须逐项触红', () => {
    const injected = ['apps/desktop', 'packages/core', 'packages/provider', 'packages/registry']
      .map((root, index) => ({
        path: `${root}/src/injected.ts`,
        content: index === 2
          ? "const fixture = import('@courtwork/legal/testing');"
          : "import { fixture } from '@courtwork/legal/testing';",
      }));
    expect(testingConsumerViolations(injected)).toEqual([
      'apps/desktop/src/injected.ts may not import @courtwork/legal/testing',
      'packages/core/src/injected.ts may not import @courtwork/legal/testing',
      'packages/provider/src/injected.ts may not import @courtwork/legal/testing',
      'packages/registry/src/injected.ts may not import @courtwork/legal/testing',
    ]);
  });
});
