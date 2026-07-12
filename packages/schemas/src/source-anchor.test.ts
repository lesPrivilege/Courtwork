import { describe, expect, it } from 'vitest';
import { SourceAnchorSchema } from './source-anchor.js';

describe('SourceAnchorSchema', () => {
  it('accepts a bbox anchor with page', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-001',
      page: 3,
      bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a textRange anchor without page or bbox', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-002',
      textRange: { start: 120, end: 180 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a zero-length textRange when end equals start', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-zero-range',
      textRange: { start: 5, end: 5 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a reversed textRange whose end is before start', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-reversed-range',
      textRange: { start: 5, end: 2 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts a fully populated anchor with quote and textLayerVersion', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-003',
      page: 1,
      bbox: { x: 0, y: 0, width: 1, height: 0.1 },
      textRange: { start: 0, end: 42 },
      textLayerVersion: 'ocr-run-2026-07-01',
      quote: '本合同自双方签字盖章之日起生效。',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an anchor with neither bbox nor textRange', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-004',
      page: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a bbox anchor missing page', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-005',
      bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an anchor missing fileId', () => {
    const result = SourceAnchorSchema.safeParse({
      page: 1,
      bbox: { x: 0, y: 0, width: 0.5, height: 0.5 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a bbox with non-positive width', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-006',
      page: 1,
      bbox: { x: 0, y: 0, width: 0, height: 0.2 },
    });
    expect(result.success).toBe(false);
  });
});
