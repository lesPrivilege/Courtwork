import { describe, expect, it } from 'vitest';
import { applyJsonPointer, JsonPointerError } from './json-pointer.js';

describe('applyJsonPointer', () => {
  it('sets a top-level field', () => {
    const target: Record<string, unknown> = { name: 'old' };
    applyJsonPointer(target, '/name', 'new');
    expect(target.name).toBe('new');
  });

  it('sets a nested array-index field', () => {
    const target = { risks: [{ id: 'risk-01', dispositionStatus: 'pending' }] };
    applyJsonPointer(target, '/risks/0/dispositionStatus', 'confirmed');
    expect(target.risks[0].dispositionStatus).toBe('confirmed');
  });

  it('throws JsonPointerError when the pointer does not start with "/"', () => {
    expect(() => applyJsonPointer({}, 'name', 'x')).toThrow(JsonPointerError);
  });

  it('throws JsonPointerError on the bare root pointer "/"', () => {
    expect(() => applyJsonPointer({}, '/', 'x')).toThrow(JsonPointerError);
  });

  it('throws JsonPointerError when an intermediate segment does not exist', () => {
    expect(() => applyJsonPointer({}, '/risks/0/dispositionStatus', 'x')).toThrow(JsonPointerError);
  });
});
