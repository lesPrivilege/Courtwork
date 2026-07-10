import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FileOpsVerbEnum } from '@courtwork/schemas';

const root = join(dirname(fileURLToPath(import.meta.url)));

function collectTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) out.push(...collectTs(path));
    else if (name.name.endsWith('.ts') && !name.name.endsWith('.test.ts')) out.push(path);
  }
  return out;
}

describe('file-ops redline grep — 销毁级全链路不存在', () => {
  it('FileOpsVerbEnum is the closed set without delete', () => {
    expect([...FileOpsVerbEnum.options].sort()).toEqual(['copy', 'mkdir', 'move', 'rename']);
  });

  it('tools file-ops sources never declare a user-facing delete verb', () => {
    const files = collectTs(root).filter((path) => path.includes('file-ops'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      // 允许注释/测试描述中出现「删除」中文；禁止作为动词字面量进入契约
      expect(text).not.toMatch(/verb:\s*['"]delete['"]/);
      expect(text).not.toMatch(/['"]delete['"]\s*\|/);
      expect(text).not.toMatch(/FileOpsVerb.*=.*delete/);
      expect(text).not.toMatch(/z\.enum\(\[[^\]]*['"]delete['"]/);
    }
  });

  it('executor module exports no log-deletion API', () => {
    const text = readFileSync(join(root, 'file-ops-executor.ts'), 'utf8');
    // 禁止作为可调用 API 出现；注释中的否定表述（「不提供 deleteLog」）不算违规
    expect(text).not.toMatch(/\b(deleteLog|clearLog|removeLog|destroyLog)\s*[\(=]/);
    expect(text).not.toMatch(/export\s+function\s+(deleteLog|clearLog)/);
  });
});
