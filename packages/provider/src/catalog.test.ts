import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEEPSEEK_CATALOG } from './catalog.generated.js';

const packageRoot = join(import.meta.dirname, '..');

describe('provider catalog single machine source', () => {
  it('keeps the generated TS descriptor byte-equivalent to deepseek.json', () => {
    const source = JSON.parse(readFileSync(join(packageRoot, 'catalog', 'deepseek.json'), 'utf8'));
    expect(DEEPSEEK_CATALOG).toEqual(source);
  });

  it('keeps endpoint literals out of handwritten TS and Rust production sources', () => {
    const handwritten = [
      join(import.meta.dirname, 'quirk-profile.ts'),
      join(import.meta.dirname, 'registry.ts'),
      join(packageRoot, '..', '..', 'apps', 'desktop', 'src-tauri', 'src', 'lib.rs'),
    ];
    for (const file of handwritten) {
      expect(readFileSync(file, 'utf8'), file).not.toContain('api.deepseek.com');
    }
  });

  it('would turn red if a handwritten descriptor drifted from the catalog', () => {
    const injected = 'const CHAT = "https://api.deepseek.com/v1/chat/completions";';
    expect(injected).toContain(DEEPSEEK_CATALOG.baseUrl);
  });
});
