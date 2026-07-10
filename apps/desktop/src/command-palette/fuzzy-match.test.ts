import { describe, expect, it } from 'vitest';
import { filterCommands, fuzzyMatch } from './fuzzy-match';

describe('fuzzyMatch', () => {
  it('matches when query characters appear in order', () => {
    expect(fuzzyMatch('cp', 'Copy Path').matched).toBe(true);
  });

  it('rejects when a query character is missing', () => {
    expect(fuzzyMatch('xyz', 'Copy Path').matched).toBe(false);
  });

  it('treats an empty query as matching everything with score 0', () => {
    expect(fuzzyMatch('', 'anything')).toEqual({ matched: true, score: 0 });
  });

  it('is case-insensitive', () => {
    expect(fuzzyMatch('COPY', 'copy path').matched).toBe(true);
  });

  it('scores contiguous matches higher than scattered ones', () => {
    const contiguous = fuzzyMatch('copy', 'Copy Path');
    const scattered = fuzzyMatch('cy', 'Copy Path');
    expect(contiguous.score).toBeGreaterThan(scattered.score);
  });

  it('matches Chinese label substrings', () => {
    expect(fuzzyMatch('专注', '进入专注模式').matched).toBe(true);
    expect(fuzzyMatch('专注', '整理卷宗').matched).toBe(false);
  });
});

describe('filterCommands', () => {
  const items = [{ label: 'Copy Path' }, { label: 'Copy Link' }, { label: 'Rename' }];

  it('returns all items in original order for an empty query', () => {
    const result = filterCommands('', items, (item) => item.label);
    expect(result.map((item) => item.label)).toEqual(['Copy Path', 'Copy Link', 'Rename']);
  });

  it('filters out non-matching items', () => {
    const result = filterCommands('rename', items, (item) => item.label);
    expect(result.map((item) => item.label)).toEqual(['Rename']);
  });

  it('ranks better matches first', () => {
    const result = filterCommands('copy', items, (item) => item.label);
    expect(result.map((item) => item.label)).toEqual(['Copy Path', 'Copy Link']);
  });
});
