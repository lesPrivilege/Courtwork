import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = join(import.meta.dirname, '..');
const SRC_ROOT = import.meta.dirname;
const CORE_PROVIDER_ROOT = join(PACKAGE_ROOT, '..', 'core', 'src', 'provider');
const CORE_PROVIDER_COMPAT_ROOT = join(PACKAGE_ROOT, '..', 'core', 'src', 'provider-compat');
const FORBIDDEN_DEPENDENCIES = [
  '@courtwork/core',
  '@courtwork/desktop',
  '@courtwork/legal',
  '@courtwork/demo-data',
  '@courtwork/registry',
] as const;

function collectProductionSources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collectProductionSources(full, out);
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

export function scanProviderBoundary(files: ReadonlyArray<{ path: string; content: string }>): string[] {
  return files.flatMap(({ path, content }) =>
    FORBIDDEN_DEPENDENCIES
      .filter((dependency) => content.includes(dependency))
      .map((dependency) => `${path} references ${dependency}`),
  );
}

describe('@courtwork/provider dependency boundary', () => {
  it('declares no core, desktop, vertical, registry, or demo package dependency', () => {
    const manifest = readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8');
    expect(scanProviderBoundary([{ path: 'package.json', content: manifest }])).toEqual([]);
  });

  it('production sources contain no forbidden cross-layer import', () => {
    const sources = collectProductionSources(SRC_ROOT).map((file) => ({
      path: relative(SRC_ROOT, file),
      content: readFileSync(file, 'utf8'),
    }));
    expect(scanProviderBoundary(sources)).toEqual([]);
  });

  it('core has no provider implementation and keeps only explicit compatibility re-exports', () => {
    const implementationFiles = existsSync(CORE_PROVIDER_ROOT) ? collectProductionSources(CORE_PROVIDER_ROOT) : [];
    expect(implementationFiles).toEqual([]);
    const violations = collectProductionSources(CORE_PROVIDER_COMPAT_ROOT).flatMap((file) => {
      const content = readFileSync(file, 'utf8').trim();
      return /^export \* from '@courtwork\/provider\/[^']+';$/.test(content)
        ? []
        : [`${relative(CORE_PROVIDER_COMPAT_ROOT, file)} is not a thin @courtwork/provider re-export`];
    });
    expect(violations).toEqual([]);
  });

  it('self-checks with injected forbidden imports so the guard cannot pass vacuously', () => {
    const fixture = [
      { path: 'bad-core.ts', content: "import type { Provider } from '@courtwork/core';" },
      { path: 'bad-demo.ts', content: "import data from '@courtwork/demo-data';" },
    ];
    expect(scanProviderBoundary(fixture)).toEqual([
      'bad-core.ts references @courtwork/core',
      'bad-demo.ts references @courtwork/demo-data',
    ]);
    expect(scanProviderBoundary([{ path: 'ok.ts', content: "import * as z from 'zod';" }])).toEqual([]);
  });
});
