import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(import.meta.dirname);
const PACKAGE_ROOT = join(SRC_ROOT, '..');
const FORBIDDEN_PACKAGES = ['@courtwork/legal', '@courtwork/pm', '@courtwork/demo-data'];
const FORBIDDEN_LITERALS = ["'legal.", '"legal.', "'RiskList'", "'CaseFile'", '风险清单', '卷宗'];

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collectSourceFiles(full, out);
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

function scanForbidden(rel: string, content: string): string[] {
  return [
    ...FORBIDDEN_PACKAGES.filter((value) => content.includes(value)).map((value) => `${rel} import/mention ${value}`),
    ...FORBIDDEN_LITERALS.filter((value) => content.includes(value)).map((value) => `${rel} literal ${value}`),
  ];
}

describe('tools package boundary', () => {
  const machineFiles = collectSourceFiles(SRC_ROOT);

  it('production sources contain no vertical/demo imports or vertical literals', () => {
    expect(machineFiles.flatMap((file) => scanForbidden(relative(SRC_ROOT, file), readFileSync(file, 'utf8')))).toEqual([]);
  });

  it('package dependencies contain no vertical/demo package', () => {
    const packageJson = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(FORBIDDEN_PACKAGES.filter((name) => packageJson.dependencies?.[name])).toEqual([]);
  });

  it('guard self-check reports every forbidden literal family', () => {
    for (const literal of FORBIDDEN_LITERALS) {
      expect(scanForbidden('injected.ts', `const injected = ${JSON.stringify(literal)};`)).not.toEqual([]);
    }
  });
});
