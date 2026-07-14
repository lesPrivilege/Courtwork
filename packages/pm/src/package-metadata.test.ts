import { readFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PM_PACKAGE_DESCRIPTOR } from './manifest.js';

interface PackageMetadata {
  name: string;
  version: string;
  scripts?: Record<string, string>;
}

const packageJsonUrl = new URL('../package.json', import.meta.url);
const packageMetadata = JSON.parse(
  readFileSync(packageJsonUrl, 'utf-8'),
) as PackageMetadata;
const packageDirectory = basename(dirname(fileURLToPath(packageJsonUrl)));

describe('PM package metadata conformance', () => {
  it('目录、npm name 与 descriptor packageId 同字节', () => {
    expect(packageDirectory).toBe(PM_PACKAGE_DESCRIPTOR.identity.packageId);
    expect(packageMetadata.name).toBe(`@courtwork/${PM_PACKAGE_DESCRIPTOR.identity.packageId}`);
  });

  it('package release version 与 descriptor identity.version 同字节', () => {
    expect(packageMetadata.version).toBe(PM_PACKAGE_DESCRIPTOR.identity.version);
  });

  it('提供垂类包统一的 test / lint / build / generate:json-schema 脚本', () => {
    expect(packageMetadata.scripts).toMatchObject({
      test: 'vitest run --root ../.. packages/pm/src',
      lint: 'eslint .',
      build: 'tsc -p tsconfig.json',
      'generate:json-schema': 'tsx scripts/generate-json-schema.ts',
    });
  });
});
