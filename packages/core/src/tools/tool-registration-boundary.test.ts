import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(import.meta.dirname, '../../../..');
const TRUSTED_REGISTRATIONS = new Map<string, {
  toolToken: string; toolId: string; toolFactory: string; sideEffect: string;
}>([
  ['apps/desktop/src/work/legal-s3-binding.ts', {
    toolToken: 'PARTY_VERIFY_TOOL_ID', toolId: 'party-verify', toolFactory: 'createPartyVerifyTool', sideEffect: 'pure_read',
  }],
  ['packages/demo-runtime/src/composition/demo-assembly.ts', {
    toolToken: "'party-verify'", toolId: 'party-verify', toolFactory: 'createPartyVerifyTool', sideEffect: 'pure_read',
  }],
  ['packages/demo-runtime/src/acceptance/run-s3-real.ts', {
    toolToken: "'party-verify'", toolId: 'party-verify', toolFactory: 'createPartyVerifyTool', sideEffect: 'pure_read',
  }],
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
  if (callCount !== 1) violations.push(`${rel}: expected exactly one trusted registration, got ${callCount}`);
  if (!source.includes(`tools.register(${trusted.toolToken}, {`)) {
    violations.push(`${rel}: trusted tool token drifted from ${trusted.toolToken}`);
  }
  if (trusted.toolToken !== `'${trusted.toolId}'`
      && !source.includes(`${trusted.toolToken} = '${trusted.toolId}'`)) {
    violations.push(`${rel}: ${trusted.toolToken} no longer resolves to ${trusted.toolId}`);
  }
  const call = source.slice(source.indexOf('tools.register('), source.indexOf('});', source.indexOf('tools.register(')) + 3);
  if (!call.includes(`${trusted.toolFactory}(`)) {
    violations.push(`${rel}: ${trusted.toolId} must be assembled by ${trusted.toolFactory}`);
  }
  if (!call.includes(`sideEffect: '${trusted.sideEffect}'`)) {
    violations.push(`${rel}: ${trusted.toolId} must declare sideEffect ${trusted.sideEffect}`);
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
      `${trusted}: expected exactly one trusted registration, got 2`,
    ]);
  });

  it('rejects registration from an untrusted production file', () => {
    expect(auditRegistration(
      'packages/core/src/injected.ts',
      "tools.register('reader', { tool, grade: 'A', sideEffect: 'pure_read' });",
    )).toEqual(['packages/core/src/injected.ts: ToolRegistry construction/registration is not a trusted composition point']);
  });
});
