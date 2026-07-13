import { describe, expect, it } from 'vitest';
import { parseSseEvents } from './sse.js';

describe('parseSseEvents', () => {
  it('parses multiple "data: {...}" lines into an array of parsed JSON payloads, in order', () => {
    const raw = [
      'data: {"choices":[{"delta":{"content":"He"}}]}',
      '',
      'data: {"choices":[{"delta":{"content":"llo"}}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');

    expect(parseSseEvents(raw)).toEqual([
      { choices: [{ delta: { content: 'He' } }] },
      { choices: [{ delta: { content: 'llo' } }] },
    ]);
  });

  it('stops at the [DONE] sentinel and does not include it in the result', () => {
    const raw = 'data: {"a":1}\n\ndata: [DONE]\n\ndata: {"a":2}\n';
    expect(parseSseEvents(raw)).toEqual([{ a: 1 }]);
  });

  it('ignores blank lines and non-"data:" lines (e.g. SSE comments/event: lines)', () => {
    const raw = ': this is a comment\nevent: message\ndata: {"a":1}\n\n\ndata: [DONE]\n';
    expect(parseSseEvents(raw)).toEqual([{ a: 1 }]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseSseEvents('')).toEqual([]);
  });

  it('propagates a JSON.parse error for a malformed data payload (does not swallow it)', () => {
    const raw = 'data: {not valid json}\n\ndata: [DONE]\n';
    expect(() => parseSseEvents(raw)).toThrow();
  });
});
