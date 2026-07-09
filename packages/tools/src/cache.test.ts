import { describe, expect, it } from 'vitest';
import { createInMemoryCacheStore, cacheKeyFor } from './cache.js';

describe('createInMemoryCacheStore', () => {
  it('returns undefined for a key that was never set', () => {
    const store = createInMemoryCacheStore();
    expect(store.get('missing')).toBeUndefined();
  });

  it('returns the stored value before the TTL expires', () => {
    let clock = 1000;
    const store = createInMemoryCacheStore(() => clock);
    store.set('key', { hello: 'world' }, 5000);
    clock += 4999;
    expect(store.get('key')).toEqual({ hello: 'world' });
  });

  it('returns undefined once the TTL has expired', () => {
    let clock = 1000;
    const store = createInMemoryCacheStore(() => clock);
    store.set('key', { hello: 'world' }, 5000);
    clock += 5000;
    expect(store.get('key')).toBeUndefined();
  });

  it('evicts an expired entry so it does not leak memory forever', () => {
    let clock = 1000;
    const store = createInMemoryCacheStore(() => clock);
    store.set('key', 'value', 1000);
    clock += 1000;
    store.get('key');
    expect(store.has('key')).toBe(false);
  });

  it('overwrites an existing entry with a new value and TTL', () => {
    const clock = 1000;
    const store = createInMemoryCacheStore(() => clock);
    store.set('key', 'first', 1000);
    store.set('key', 'second', 1000);
    expect(store.get('key')).toBe('second');
  });
});

describe('cacheKeyFor', () => {
  it('produces the same key for objects with the same properties in a different order', () => {
    const a = cacheKeyFor('party-verify', 'mock', { name: '张三', unifiedSocialCreditCode: '123' });
    const b = cacheKeyFor('party-verify', 'mock', { unifiedSocialCreditCode: '123', name: '张三' });
    expect(a).toBe(b);
  });

  it('produces different keys for different tool ids given the same input', () => {
    const a = cacheKeyFor('party-verify', 'mock', { name: '张三' });
    const b = cacheKeyFor('cite-check', 'mock', { name: '张三' });
    expect(a).not.toBe(b);
  });

  it('produces different keys for different input values', () => {
    const a = cacheKeyFor('party-verify', 'mock', { name: '张三' });
    const b = cacheKeyFor('party-verify', 'mock', { name: '李四' });
    expect(a).not.toBe(b);
  });

  it('produces different keys for the same tool id and input but different adapter sourceIds (the collision this guards against)', () => {
    const a = cacheKeyFor('party-verify', 'mock', { name: '张三' });
    const b = cacheKeyFor('party-verify', 'demo-fixture', { name: '张三' });
    expect(a).not.toBe(b);
  });
});
