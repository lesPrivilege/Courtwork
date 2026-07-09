export interface ToolCacheStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  has(key: string): boolean;
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

export function createInMemoryCacheStore(now: () => number = Date.now): ToolCacheStore {
  const entries = new Map<string, CacheEntry>();

  function isExpired(entry: CacheEntry): boolean {
    return now() >= entry.expiresAt;
  }

  return {
    get<T>(key: string): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (isExpired(entry)) {
        entries.delete(key);
        return undefined;
      }
      return entry.value as T;
    },
    set<T>(key: string, value: T, ttlMs: number): void {
      entries.set(key, { value, expiresAt: now() + ttlMs });
    },
    has(key: string): boolean {
      const entry = entries.get(key);
      if (!entry) return false;
      if (isExpired(entry)) {
        entries.delete(key);
        return false;
      }
      return true;
    },
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const body = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',');
  return `{${body}}`;
}

/**
 * 缓存 key = 工具 id + 适配器 sourceId + 稳定序列化后的输入（对象属性顺序不影响结果）。
 * 必须带 sourceId：同一个 tool.id 在同一个共享缓存下可能先后接入不同适配器（如 eval
 * 场景对比 mock/demo-fixture/真实三种配置），只用 tool.id 做 key 会让后接入的适配器读到
 * 前一个适配器留下的缓存条目——静默把一种数据源的结果当成另一种数据源的结果返回。
 */
export function cacheKeyFor(toolId: string, sourceId: string, input: unknown): string {
  return `${toolId}:${sourceId}:${stableStringify(input)}`;
}
