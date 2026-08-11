import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(import.meta.dirname, '../../../..');
interface TrustedRegistration {
  toolToken: string; toolId: string; toolFactory: string; sideEffect: string;
}

/**
 * 每个受信装配点的**逐枚**注册清单。TOOL-READ-1 前本表是「文件 → 唯一一枚注册」；两枚可请求
 * 只读工具进 demo/acceptance 装配点后改为「文件 → 有序注册清单」——门的强度不变：每一次
 * `tools.register()` 仍须逐字对上具名 toolId、具名工厂与具名 sideEffect，多一次少一次都触红。
 */
const TRUSTED_REGISTRATIONS = new Map<string, TrustedRegistration[]>([
  ['apps/desktop/src/verticals/legal/legal-s3-binding.ts', [{
    toolToken: 'PARTY_VERIFY_TOOL_ID', toolId: 'party-verify', toolFactory: 'createPartyVerifyTool', sideEffect: 'pure_read',
  }]],
  ['packages/demo-runtime/src/composition/demo-assembly.ts', [
    {
      toolToken: "'party-verify'", toolId: 'party-verify', toolFactory: 'createPartyVerifyTool', sideEffect: 'pure_read',
    },
    {
      toolToken: "'dossier-list'", toolId: 'dossier-list', toolFactory: 'createDossierListTool', sideEffect: 'pure_read',
    },
    {
      toolToken: "'material-read'", toolId: 'material-read', toolFactory: 'createMaterialReadTool', sideEffect: 'pure_read',
    },
  ]],
  ['packages/demo-runtime/src/acceptance/run-s3-real.ts', [{
    toolToken: "'party-verify'", toolId: 'party-verify', toolFactory: 'createPartyVerifyTool', sideEffect: 'pure_read',
  }]],
]);

function productionFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const target = resolve(dir, name);
    if (statSync(target).isDirectory()) productionFiles(target, out);
    else if (/\.tsx?$/.test(name) && !/\.test\./.test(name)) out.push(target);
  }
  return out;
}

function auditRegistration(rel: string, source: string): string[] {
  const callCount = [...source.matchAll(/\btools\.register\(/g)].length;
  const classifiedCallCount = [...source.matchAll(
    /\b[A-Za-z_$][\w$]*\.register\(\s*[^,\n]+,\s*\{[\s\S]{0,800}?sideEffect:\s*['"]/g,
  )].length;
  const constructsRegistry = /=\s*createToolRegistry\(\)/.test(source);
  if (callCount === 0 && classifiedCallCount === 0 && !constructsRegistry) return [];
  const trusted = TRUSTED_REGISTRATIONS.get(rel);
  if (!trusted) return [`${rel}: ToolRegistry construction/registration is not a trusted composition point`];
  const violations: string[] = [];
  if (classifiedCallCount !== callCount) {
    violations.push(`${rel}: classified register() must use the statically audited tools binding`);
  }
  if (callCount !== trusted.length) {
    violations.push(`${rel}: expected exactly ${trusted.length} trusted registration(s), got ${callCount}`);
  }
  for (const expected of trusted) {
    const at = source.indexOf(`tools.register(${expected.toolToken}, {`);
    if (at < 0) {
      violations.push(`${rel}: trusted tool token drifted from ${expected.toolToken}`);
      continue;
    }
    if (expected.toolToken !== `'${expected.toolId}'`
        && !source.includes(`${expected.toolToken} = '${expected.toolId}'`)) {
      violations.push(`${rel}: ${expected.toolToken} no longer resolves to ${expected.toolId}`);
    }
    const call = source.slice(at, source.indexOf('});', at) + 3);
    if (!call.includes(`${expected.toolFactory}(`)) {
      violations.push(`${rel}: ${expected.toolId} must be assembled by ${expected.toolFactory}`);
    }
    if (!call.includes(`sideEffect: '${expected.sideEffect}'`)) {
      violations.push(`${rel}: ${expected.toolId} must declare sideEffect ${expected.sideEffect}`);
    }
  }
  return violations;
}

describe('ToolRegistry production trust boundary', () => {
  it('allows tools.register() only at the named composition points with locked classifications', () => {
    const files = [resolve(REPO_ROOT, 'apps'), resolve(REPO_ROOT, 'packages')]
      .flatMap((root) => productionFiles(root));
    const violations = files.flatMap((file) => {
      const rel = relative(REPO_ROOT, file);
      return auditRegistration(rel, readFileSync(file, 'utf8'));
    });
    expect(violations).toEqual([]);
    for (const trusted of TRUSTED_REGISTRATIONS.keys()) {
      expect(files.map((file) => relative(REPO_ROOT, file))).toContain(trusted);
    }
  });

  it('rejects a writer disguised as pure_read even inside a trusted file', () => {
    const trusted = 'packages/demo-runtime/src/composition/demo-assembly.ts';
    const injected = `${readFileSync(resolve(REPO_ROOT, trusted), 'utf8')}\n`
      + "tools.register('writer-tool', { tool: writer, grade: 'A', sideEffect: 'pure_read' });\n";
    expect(auditRegistration(trusted, injected)).toEqual([
      `${trusted}: expected exactly 3 trusted registration(s), got 4`,
    ]);
  });

  it('rejects a trusted registration whose sideEffect drifts off pure_read', () => {
    const trusted = 'packages/demo-runtime/src/composition/demo-assembly.ts';
    const drifted = readFileSync(resolve(REPO_ROOT, trusted), 'utf8')
      .replace("tool: createMaterialReadTool(adapters.materialRead),\n    grade: 'B',\n    sideEffect: 'pure_read',",
        "tool: createMaterialReadTool(adapters.materialRead),\n    grade: 'B',\n    sideEffect: 'file_write',");
    expect(auditRegistration(trusted, drifted)).toEqual([
      `${trusted}: material-read must declare sideEffect pure_read`,
    ]);
  });

  it('rejects registration from an untrusted production file', () => {
    expect(auditRegistration(
      'packages/core/src/injected.ts',
      "tools.register('reader', { tool, grade: 'A', sideEffect: 'pure_read' });",
    )).toEqual(['packages/core/src/injected.ts: ToolRegistry construction/registration is not a trusted composition point']);
  });
});
