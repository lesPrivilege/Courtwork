import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PM_PACKAGE_DESCRIPTOR } from './manifest.js';

interface PackageMetadata {
  version: string;
  scripts?: Record<string, string>;
}

const packageMetadata = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
) as PackageMetadata;

describe('PM package metadata conformance', () => {
  it('package release version 与 descriptor identity.version 同字节', () => {
    expect(packageMetadata.version).toBe(PM_PACKAGE_DESCRIPTOR.identity.version);
  });

  it('提供垂类包统一的 test / lint / build / generate:json-schema 脚本', () => {
    expect(packageMetadata.scripts).toMatchObject({
      test: 'vitest run --root ../.. packages/pm-schemas/src',
      lint: 'eslint .',
      build: 'tsc -p tsconfig.json',
      'generate:json-schema': 'tsx scripts/generate-json-schema.ts',
    });
  });
});
