/**
 * 解析 OpenAI 兼容 SSE 流的完整文本为逐条 JSON payload；遇到 "data: [DONE]" 停止
 * （不含在返回数组内）。纯字符串解析，不做网络 I/O——网络读取在 http-client.ts，
 * 那边用 `await response.text()` 读完整个流后传给这里解析（详见 http-client.ts 的
 * 设计说明：SSE 分片在网络层依然是逐块到达、能防代理判定连接空闲，但应用层不需要
 * 增量消费，缓冲后一次性解析更简单，两者不矛盾）。
 */
export function parseSseEvents(rawText: string): unknown[] {
  const events: unknown[] = [];
  for (const line of rawText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice('data:'.length).trim();
    if (payload.length === 0) continue;
    if (payload === '[DONE]') break;
    events.push(JSON.parse(payload));
  }
  return events;
}
