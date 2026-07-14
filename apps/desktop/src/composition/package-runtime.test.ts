import { describe, expect, it } from 'vitest';
import { createDesktopPackageRuntime } from './package-runtime.js';

describe('desktop package composition', () => {
  it('同次准入 Legal + catalog-only PM，PM 不注入 scenario 或 prompt/demo 入口', () => {
    const runtime = createDesktopPackageRuntime();
    expect(runtime.packageIds).toEqual(['legal', 'pm']);
    expect(runtime.packageRegistries.artifactSchemas.list()).toHaveLength(11);
    expect(runtime.packageRegistries.artifactSchemas.get('pm.PrdReview')?.packageId).toBe('pm');
    expect(runtime.packageRegistries.scenarios.list().every((scenario) => scenario.packageId === 'legal')).toBe(true);
    expect(runtime.packageRegistries.scenarios.list()).toHaveLength(5);
    expect(runtime.hostRenderers.get('courtwork.artifact-table.v1')).toBeDefined();
  });
});
