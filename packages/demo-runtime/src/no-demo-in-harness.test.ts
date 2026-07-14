import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { S3_PDF_PRELOADED_ANCHOR_QUOTES } from '@courtwork/legal/testing';
import { S3_PRELOADED_ANCHOR_QUOTES } from './acceptance/run-s3-demo.js';

/**
 * assert-no-demo-in-harness（LEGAL-DEMO-RUN 防过拟合隔离审计，与 assert-no-demo-in-real
 * 成对）：assert-no-demo-in-real 守"真跑里没有 demo"，本守卫守"机器里没有 demo"——
 * 组装器/resolver/executor 等 harness 机器层零 demo 引用、零 fixture 特调分支；
 * demo 数据只经装配点（composition）注入，golden 考点住 demo/legal 包不住机器。
 * 机器对样板案过拟合的每一条通道（认得素材名、认得考点引语、按固定 id 走捷径）
 * 在此逐一断言关死。
 */

const CORE_SRC_ROOT = join(import.meta.dirname, '..', '..', 'core', 'src');
const DEMO_SRC_ROOT = import.meta.dirname;

/** demo 素材指纹：夹具文件名 / 样板案主体 / 案号 / 装配点标识。机器层出现任意一枚即越界。 */
const DEMO_FIXTURE_MARKERS = [
  'demo-fixture',
  'demo-scripted',
  'demo-s3',
  'sample-sale-contract',
  '设备采购合同',
  '企业信用信息查询单',
  'main-contract',
  '临江精铸',
  '起云',
  '星辰科技',
  'linjiang-qiyun',
] as const;

/** fixture 特调分支指纹：对 id 类字段与字符串字面量的相等比较（走捷径的机器形态）。 */
const TUNED_BRANCH_PATTERN = /(fileId|caseId|sessionId|artifactId)\s*===?\s*['"]/;

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

/** 可复用扫描器（供机器扫描与防空转自检共用同一实现，不留两套判定）。 */
function scanForDemoLeakage(rel: string, content: string): string[] {
  const violations: string[] = [];
  for (const marker of DEMO_FIXTURE_MARKERS) {
    if (content.includes(marker)) {
      violations.push(`${rel} 含 demo 素材指纹 "${marker}"`);
    }
  }
  if (TUNED_BRANCH_PATTERN.test(content)) {
    violations.push(`${rel} 含对 id 字段的字符串字面量比较（fixture 特调分支指纹）`);
  }
  return violations;
}

describe('assert-no-demo-in-harness（机器零 demo 渗透）', () => {
  const machineFiles = collectSourceFiles(CORE_SRC_ROOT);

  it('机器层零 demo 素材指纹、零 fixture 特调分支', () => {
    const violations = machineFiles.flatMap((file) =>
      scanForDemoLeakage(relative(CORE_SRC_ROOT, file), readFileSync(file, 'utf-8')),
    );
    expect(violations).toEqual([]);
  });

  it('golden 考点引语住 demo/legal 包与验收层，不住机器', () => {
    const quotes = [...S3_PRELOADED_ANCHOR_QUOTES, ...S3_PDF_PRELOADED_ANCHOR_QUOTES];
    const violations: string[] = [];
    for (const file of machineFiles) {
      const content = readFileSync(file, 'utf-8');
      for (const quote of quotes) {
        if (content.includes(quote)) {
          violations.push(`${relative(CORE_SRC_ROOT, file)} 内嵌考点引语 "${quote.slice(0, 12)}…"`);
        }
      }
    }
    expect(violations).toEqual([]);
    // 考点确实存在于包侧（防禁词表悬空：断言对象若不存在，守卫等于没上岗）。
    expect(S3_PDF_PRELOADED_ANCHOR_QUOTES.length).toBeGreaterThanOrEqual(7);
    expect(S3_PRELOADED_ANCHOR_QUOTES.length).toBeGreaterThanOrEqual(7);
  });

  it('防空转自检：扫描器对植入的越界样本必须报警（变异矩阵自证）', () => {
    expect(scanForDemoLeakage('x.ts', "const a = loadFixture('sample-sale-contract-v1.docx');")).not.toEqual([]);
    expect(scanForDemoLeakage('x.ts', "if (fileId === '04-设备采购合同.md') { return shortcut(); }")).not.toEqual([]);
    expect(scanForDemoLeakage('x.ts', "if (caseId === 'case-x') { }")).not.toEqual([]);
    expect(scanForDemoLeakage('x.ts', 'const anchors = resolveClaim(claim, layers);')).toEqual([]);
  });

  it('成对与注入点自证：real 侧断言在岗，demo 内容确经装配点绑定', () => {
    const realSource = readFileSync(join(DEMO_SRC_ROOT, 'acceptance', 'run-s3-real.ts'), 'utf-8');
    expect(realSource).toContain('export function assertNoDemoInReal');
    const composition = readFileSync(join(DEMO_SRC_ROOT, 'composition', 'demo-assembly.ts'), 'utf-8');
    expect(composition).toContain('createScriptedProvider');
    expect(composition).toContain('S3_PDF_DOSSIER_DRAFT');
    // 剧本与考点住 legal demo 包（不在 core）——从包导入即是位置证明。
    expect(S3_PDF_PRELOADED_ANCHOR_QUOTES[0]).toContain('违约金');
  });
});
