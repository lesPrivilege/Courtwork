import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CORE_ROOT = join(import.meta.dirname, '..', '..');
const COMPAT = {
  './provider-quirks': ['provider-quirks.ts', '@courtwork/provider/quirks'],
  './provider-openai': ['provider-openai.ts', '@courtwork/provider/openai'],
  './provider-types': ['provider-types.ts', '@courtwork/provider/types'],
} as const;

describe('ADR-007 provider compatibility subpaths', () => {
  it('keeps the three declared subpaths as deprecated one-hop re-exports', () => {
    const packageJson = JSON.parse(readFileSync(join(CORE_ROOT, 'package.json'), 'utf-8')) as {
      exports: Record<string, unknown>;
      courtwork: { deprecatedExports: Record<string, string> };
    };

    for (const [subpath, [fileName, target]] of Object.entries(COMPAT)) {
      expect(packageJson.exports).toHaveProperty(subpath);
      expect(packageJson.courtwork.deprecatedExports[subpath]).toBe(target);
      expect(readFileSync(join(import.meta.dirname, fileName), 'utf-8').trim()).toBe(`export * from '${target}';`);
    }
  });

  it('does not leak compatibility implementations through the core root barrel', () => {
    const rootBarrel = readFileSync(join(CORE_ROOT, 'src', 'index.ts'), 'utf-8');
    expect(rootBarrel).not.toContain('@courtwork/provider/quirks');
    expect(rootBarrel).not.toContain('@courtwork/provider/openai');
    expect(rootBarrel).not.toContain("export * from '@courtwork/provider/types'");
    expect(rootBarrel).toContain("export type { GenerationNotice } from '@courtwork/provider/types';");
  });
});
