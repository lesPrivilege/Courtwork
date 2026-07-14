import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { EventLog } from './event-log.js';
import type { SessionEvent } from './types.js';

/**
 * Node-only 落盘实现：append 追加一行 JSONL，list()/append() 每次都从磁盘重新读取整段历史。
 * browser-safe Work 协议不得导入本模块。
 */
export function createFileEventLog(
  sessionId: string,
  filePath: string,
  now: () => string = () => new Date().toISOString(),
): EventLog {
  mkdirSync(dirname(filePath), { recursive: true });
  const readAll = (): SessionEvent[] => {
    if (!existsSync(filePath)) return [];
    return readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as SessionEvent);
  };
  return {
    sessionId,
    append(input) {
      const seq = readAll().length;
      const event = { ...input, sessionId, seq, emittedAt: now() } as SessionEvent;
      appendFileSync(filePath, `${JSON.stringify(event)}\n`, 'utf-8');
      return event;
    },
    list() {
      return readAll();
    },
  };
}
