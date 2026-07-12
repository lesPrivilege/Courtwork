import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 包域律机器守卫（docs/53：core 对包是纯执行器——跑得动 legal.*，读不懂 legal.*）。
 * 装配点例外（docs/21 + ABI 三层边界）：src/composition 与 src/acceptance 是绑定层，
 * 允许 import 垂类包与演示数据；其余 core 板块零垂类依赖、零垂类字面量。
 * 缺口即测试缺口判例：本守卫就是"本应抓住越界的测试"。
 */

const SRC_ROOT = join(import.meta.dirname);
const BINDING_LAYERS = ['composition', 'acceptance'];
const FORBIDDEN_IMPORTS = ['@courtwork/legal', '@courtwork/demo-data', '@courtwork/output'];
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

function isBindingLayer(file: string): boolean {
  const rel = relative(SRC_ROOT, file);
  return BINDING_LAYERS.some((layer) => rel.startsWith(`${layer}/`) || rel.startsWith(`${layer}\\`));
}

describe('core 包域律边界', () => {
  const machineFiles = collectSourceFiles(SRC_ROOT).filter((file) => !isBindingLayer(file));

  it('机器层零垂类/演示/产出包 import（装配点与验收层除外）', () => {
    const violations: string[] = [];
    for (const file of machineFiles) {
      const content = readFileSync(file, 'utf-8');
      for (const forbidden of FORBIDDEN_IMPORTS) {
        if (content.includes(forbidden)) {
          violations.push(`${relative(SRC_ROOT, file)} import 了 ${forbidden}`);
        }
      }
    }
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

  it('守卫自检：装配点确实存在且真的 import 垂类包（防守卫空转）', () => {
    const composition = readFileSync(join(SRC_ROOT, 'composition', 'demo-assembly.ts'), 'utf-8');
    expect(composition).toContain('@courtwork/legal');
    expect(composition).toContain('@courtwork/demo-data');
  });
});
