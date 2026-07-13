import type {
  ProviderFailureKind,
  ProviderStreamEvent,
  ProviderTransportEvent,
} from './types.js';

export interface ProviderStreamContext {
  requestId: string;
  providerId: string;
  modelId: string;
  reasoningFieldCandidates: readonly string[];
  signal?: AbortSignal;
}

class StreamViolation extends Error {
  constructor(public readonly kind: 'protocol' | 'invalid_response', message: string) {
    super(message);
  }
}

class IncrementalSseParser {
  private buffer = '';
  private data: string[] = [];

  push(text: string): string[] {
    this.buffer += text;
    const payloads: string[] = [];
    while (true) {
      const newline = this.buffer.indexOf('\n');
      if (newline < 0) break;
      const line = this.buffer.slice(0, newline).replace(/\r$/, '');
      this.buffer = this.buffer.slice(newline + 1);
      this.consumeLine(line, payloads);
    }
    return payloads;
  }

  finish(): string[] {
    const payloads: string[] = [];
    if (this.buffer.length > 0) this.consumeLine(this.buffer.replace(/\r$/, ''), payloads);
    this.buffer = '';
    this.flush(payloads);
    return payloads;
  }

  private consumeLine(line: string, payloads: string[]) {
    if (line === '') {
      this.flush(payloads);
      return;
    }
    if (line.startsWith(':')) return;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') this.data.push(value);
    else if (!['event', 'id', 'retry'].includes(field)) {
      throw new StreamViolation('protocol', '服务商返回了非法 SSE 字段');
    }
  }

  private flush(payloads: string[]) {
    if (this.data.length === 0) return;
    payloads.push(this.data.join('\n'));
    this.data = [];
  }
}

function failureKindForStatus(status: number): { kind: ProviderFailureKind; retryable: boolean } {
  if (status === 401 || status === 403) return { kind: 'auth', retryable: false };
  if (status === 429) return { kind: 'rate_limit', retryable: true };
  if (status === 400 || status === 422) return { kind: 'model', retryable: false };
  if (status === 404) return { kind: 'endpoint', retryable: false };
  if (status >= 500) return { kind: 'endpoint', retryable: true };
  return { kind: 'invalid_response', retryable: false };
}

function finishReason(value: unknown): 'stop' | 'length' | 'content_filter' | 'unknown' {
  return value === 'stop' || value === 'length' || value === 'content_filter' ? value : 'unknown';
}

type ParsedPayload = {
  reasoning: string[];
  content: string[];
  usage?: { inputTokens: number; outputTokens: number };
  finishReason?: 'stop' | 'length' | 'content_filter' | 'unknown';
};

function parsePayload(raw: string, candidates: readonly string[]): ParsedPayload {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new StreamViolation('protocol', '服务商返回了非法 SSE JSON');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new StreamViolation('invalid_response', '服务商返回了无法识别的流事件');
  }
  const record = value as Record<string, unknown>;
  const output: ParsedPayload = { reasoning: [], content: [] };
  if (record.choices !== undefined) {
    if (!Array.isArray(record.choices)) throw new StreamViolation('invalid_response', 'choices 不是数组');
    for (const choice of record.choices) {
      if (!choice || typeof choice !== 'object' || Array.isArray(choice)) {
        throw new StreamViolation('invalid_response', 'choice 形状无效');
      }
      const choiceRecord = choice as Record<string, unknown>;
      if (choiceRecord.finish_reason !== undefined && choiceRecord.finish_reason !== null) {
        output.finishReason = finishReason(choiceRecord.finish_reason);
      }
      if (choiceRecord.delta === undefined) continue;
      if (!choiceRecord.delta || typeof choiceRecord.delta !== 'object' || Array.isArray(choiceRecord.delta)) {
        throw new StreamViolation('invalid_response', 'delta 形状无效');
      }
      const delta = choiceRecord.delta as Record<string, unknown>;
      if (delta.content !== undefined && delta.content !== null) {
        if (typeof delta.content !== 'string') throw new StreamViolation('invalid_response', 'content delta 不是字符串');
        if (delta.content) output.content.push(delta.content);
      }
      for (const field of candidates) {
        const reasoning = delta[field];
        if (reasoning === undefined || reasoning === null) continue;
        if (typeof reasoning !== 'string') throw new StreamViolation('invalid_response', 'reasoning delta 不是字符串');
        if (reasoning) output.reasoning.push(reasoning);
        break;
      }
    }
  }
  if (record.usage !== undefined && record.usage !== null) {
    if (!record.usage || typeof record.usage !== 'object' || Array.isArray(record.usage)) {
      throw new StreamViolation('invalid_response', 'usage 形状无效');
    }
    const usage = record.usage as Record<string, unknown>;
    if (typeof usage.prompt_tokens !== 'number' || typeof usage.completion_tokens !== 'number') {
      throw new StreamViolation('invalid_response', 'usage token 不是数字');
    }
    output.usage = { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens };
  }
  return output;
}

export async function* normalizeProviderTransport(
  transport: AsyncIterable<ProviderTransportEvent>,
  context: ProviderStreamContext,
): AsyncIterable<ProviderStreamEvent> {
  let seq = 0;
  let started = false;
  let done = false;
  let contentLength = 0;
  let terminal = false;
  let observedFinishReason: 'stop' | 'length' | 'content_filter' | 'unknown' = 'unknown';
  const decoder = new TextDecoder();
  const parser = new IncrementalSseParser();

  const fail = (kind: ProviderFailureKind, message: string, retryable = false): ProviderStreamEvent => ({
    type: 'failed', requestId: context.requestId, seq: seq++, kind, message, retryable,
  });

  const consumePayloads = function* (payloads: string[]): Generator<ProviderStreamEvent> {
    for (const raw of payloads) {
      if (raw === '[DONE]') {
        if (done) throw new StreamViolation('protocol', '服务商重复发送流终态');
        done = true;
        continue;
      }
      if (done) throw new StreamViolation('protocol', '服务商在终态后继续发送数据');
      const parsed = parsePayload(raw, context.reasoningFieldCandidates);
      for (const delta of parsed.reasoning) {
        yield { type: 'reasoning_delta', requestId: context.requestId, seq: seq++, delta };
      }
      for (const delta of parsed.content) {
        contentLength += delta.length;
        yield { type: 'content_delta', requestId: context.requestId, seq: seq++, delta };
      }
      if (parsed.usage) {
        yield { type: 'usage', requestId: context.requestId, seq: seq++, ...parsed.usage };
      }
      if (parsed.finishReason) observedFinishReason = parsed.finishReason;
    }
  };

  try {
    for await (const event of transport) {
      if (terminal) return;
      if (event.requestId !== context.requestId) {
        yield fail('protocol', '传输事件 requestId 不匹配');
        return;
      }
      if (context.signal?.aborted && event.type !== 'failed') {
        yield fail('canceled', '请求已取消');
        return;
      }
      if (event.type === 'failed') {
        terminal = true;
        yield fail(event.kind, event.message, event.retryable);
        return;
      }
      if (event.type === 'response_started') {
        if (started) {
          yield fail('protocol', '服务商重复开始响应');
          return;
        }
        const classified = failureKindForStatus(event.status);
        if (event.status < 200 || event.status >= 300) {
          yield fail(classified.kind, `服务商请求失败（HTTP ${event.status}）`, classified.retryable);
          return;
        }
        if (event.contentType && !event.contentType.toLowerCase().includes('text/event-stream')) {
          yield fail('invalid_response', '服务商没有返回 SSE 流');
          return;
        }
        started = true;
        yield { type: 'started', requestId: context.requestId, seq: seq++, providerId: context.providerId, modelId: context.modelId };
        continue;
      }
      if (!started) {
        yield fail('protocol', '服务商在响应开始前发送了数据');
        return;
      }
      if (event.type === 'chunk') {
        const text = decoder.decode(Uint8Array.from(event.bytes), { stream: true });
        yield* consumePayloads(parser.push(text));
        continue;
      }
      const tail = decoder.decode();
      yield* consumePayloads(parser.push(tail));
      yield* consumePayloads(parser.finish());
      if (!done) {
        yield fail('protocol', '服务商在 [DONE] 前异常结束');
        return;
      }
      if (contentLength === 0) {
        yield fail('invalid_response', '服务商正常结束但没有返回正文');
        return;
      }
      terminal = true;
      yield { type: 'completed', requestId: context.requestId, seq: seq++, finishReason: observedFinishReason };
      return;
    }
    if (!terminal) yield fail('protocol', '服务商传输未发送终态');
  } catch (error) {
    if (terminal) return;
    const violation = error instanceof StreamViolation ? error : undefined;
    yield fail(violation?.kind ?? 'network', violation?.message ?? '服务商流读取失败');
  }
}
