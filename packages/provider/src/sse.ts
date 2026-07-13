/** 仅供历史录制文本/单元 fixture 使用的完整字符串解析器。
 * 生产网络路径由 provider-stream.ts 增量解码，不得把 response body 聚合后传入这里。 */
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
