import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 包域律机器守卫（docs/architecture/schema-engineering.md：core 对包是纯执行器——跑得动 legal.*，读不懂 legal.*）。
 * CORE-BOUNDARY-1 后装配例外整体迁入 packages/demo-runtime；core 内不再有 binding layer，
 * 所有生产源文件均必须零垂类/demo/output/reading-view 依赖、零垂类字面量。
 * 缺口即测试缺口判例：本守卫就是"本应抓住越界的测试"。
 */

const SRC_ROOT = join(import.meta.dirname);
const PACKAGE_ROOT = join(SRC_ROOT, '..');
const FORBIDDEN_PACKAGES = ['@courtwork/legal', '@courtwork/demo-data', '@courtwork/output', '@courtwork/reading-view'];
const FORBIDDEN_ROOT_EXPORTS = [
  '@courtwork/provider/scripted',
  '@courtwork/provider/quirks',
  '@courtwork/provider/errors',
  '@courtwork/provider/pricing',
  '@courtwork/provider/openai',
  './composition/',
  './acceptance/',
];
/** 垂类语义字面量抽样（namespaced 或裸名皆不许出现在机器层）。 */
const FORBIDDEN_LITERALS = ["'legal.", '"legal.', "'RiskList'", "'CaseFile'", '风险清单', '卷宗'];

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, out);
    } else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

function scanForbiddenImports(rel: string, content: string): string[] {
  return FORBIDDEN_PACKAGES
    .filter((forbidden) => content.includes(forbidden))
    .map((forbidden) => `${rel} import 了 ${forbidden}`);
}

describe('core 包域律边界', () => {
  const machineFiles = collectSourceFiles(SRC_ROOT);

  it('生产源文件零垂类/demo/output/reading-view import，不再设装配例外', () => {
    const violations = machineFiles.flatMap((file) =>
      scanForbiddenImports(relative(SRC_ROOT, file), readFileSync(file, 'utf-8')),
    );
    expect(violations).toEqual([]);
  });

  it('机器层零垂类语义字面量（executor/events/session 读不懂 legal.*）', () => {
    const violations: string[] = [];
    for (const file of machineFiles) {
      const content = readFileSync(file, 'utf-8');
      for (const literal of FORBIDDEN_LITERALS) {
        if (content.includes(literal)) {
          violations.push(`${relative(SRC_ROOT, file)} 含垂类字面量 ${literal}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('package dependency 与根 barrel 不再转售绑定包或 provider 实现', () => {
    const packageJson = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>;
    };
    expect(FORBIDDEN_PACKAGES.filter((name) => packageJson.dependencies?.[name])).toEqual([]);

    const rootBarrel = readFileSync(join(SRC_ROOT, 'index.ts'), 'utf-8');
    expect(FORBIDDEN_ROOT_EXPORTS.filter((specifier) => rootBarrel.includes(specifier))).toEqual([]);
    expect(rootBarrel).toContain("export type { GenerationNotice } from '@courtwork/provider/types';");
  });

  it('core 内不再存在 composition/acceptance 绑定目录', () => {
    expect(existsSync(join(SRC_ROOT, 'composition'))).toBe(false);
    expect(existsSync(join(SRC_ROOT, 'acceptance'))).toBe(false);
  });

  it('守卫自检：同一扫描器对植入的四种越界 import 全部报警', () => {
    for (const forbidden of FORBIDDEN_PACKAGES) {
      expect(scanForbiddenImports('injected.ts', `import x from '${forbidden}';`)).toEqual([
        `injected.ts import 了 ${forbidden}`,
      ]);
    }
  });
});
