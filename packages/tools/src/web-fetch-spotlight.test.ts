import { describe, expect, it } from 'vitest';
import { spotlight } from './web-fetch-spotlight.js';

describe('spotlight — raw field is preserved verbatim', () => {
  it('does not modify the raw field at all (datamarking only applies to the spotlighted field)', () => {
    const result = spotlight('hello world\nsecond line', { randomToken: () => 'tok' });
    expect(result.raw).toBe('hello world\nsecond line');
  });
});

describe('spotlight — datamarking replaces whitespace runs with the marker', () => {
  it('replaces single spaces with the default marker "^"', () => {
    const result = spotlight('hello world', { randomToken: () => 'tok' });
    expect(result.spotlighted).toContain('hello^world');
  });

  it('collapses a run of mixed whitespace (space/tab/newline) into a single marker', () => {
    const result = spotlight('hello \t\n world', { randomToken: () => 'tok' });
    expect(result.spotlighted).toContain('hello^world');
  });

  it('honors a custom marker character', () => {
    const result = spotlight('hello world', { marker: '#', randomToken: () => 'tok' });
    expect(result.spotlighted).toContain('hello#world');
    expect(result.spotlighted).not.toContain('hello^world');
  });
});

describe('spotlight — boundary wrapping', () => {
  it('wraps the datamarked content in delimiters that embed the boundary token', () => {
    const result = spotlight('hello world', { randomToken: () => 'abc123' });
    expect(result.boundaryToken).toBe('abc123');
    expect(result.spotlighted).toContain('abc123');
    expect(result.spotlighted.indexOf('abc123')).toBeLessThan(result.spotlighted.indexOf('hello^world'));
  });

  it('uses a cryptographically random boundary token by default (two calls differ)', () => {
    const a = spotlight('x');
    const b = spotlight('x');
    expect(a.boundaryToken).not.toBe(b.boundaryToken);
    expect(a.boundaryToken.length).toBeGreaterThan(0);
  });
});

describe('spotlight — edge cases', () => {
  it('handles empty input without throwing', () => {
    const result = spotlight('', { randomToken: () => 'tok' });
    expect(result.raw).toBe('');
    expect(result.spotlighted).toContain('tok');
  });
});
