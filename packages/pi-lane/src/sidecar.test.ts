import { createServer, type AddressInfo } from 'node:net';
import { mkdtemp, mkdir, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxToolCall,
} from '@earendil-works/pi-ai';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ProviderReadiness } from './provider.js';
import { createPiLaneSession, type PiLaneSession } from './session.js';
import { createSidecar } from './sidecar.js';

/** dev 入口的 HTTP 面。真起服务、真发请求；provider 仍是构造件，不触网。 */

let root: string;
let session: PiLaneSession;
let faux: ReturnType<typeof fauxProvider>;
let server: ReturnType<typeof createSidecar>;
let origin: string;

const readiness = (configured: boolean): ProviderReadiness => ({
  models: createModels(),
  configured,
  detail: configured ? 'deepseek-v4-flash 已就绪' : '未配置 DEEPSEEK_API_KEY：pi lane 不会用无凭据的连接去试',
});

/**
 * 环境前置（`PI-LANE-SIDECAR-HANG-1`）：本文件是全仓唯一真发网络往返的测试
 * （`packages/provider/src/http-client.test.ts` 的 fetch 是注入桩）。因此凡是本机回环不通的
 * 环境，红都只落在这里；而原先它落成**无信息的悬挂**——`listen` 失败只发 `'error'` 事件、
 * 不走回调，`start()` 又只在回调里 resolve，promise 于是永不 settle，八枚各挂满 5s 通用超时，
 * 日志里连 errno 都不出现（Seatbelt 拒 bind 实测：八枚 40.06s，`EPERM` 出现 0 次）。
 * 两条路现在都具名快红，注入反例见文件末尾。
 *
 * 预算必须显著小于 vitest 的 5s 通用超时，否则先到的仍是那句无信息的超时；
 * 健康环境下一次回环往返是毫秒级，2000ms 是两个量级的余量，不是在赌时长。
 */
const ROUND_TRIP_BUDGET_MS = 2000;

/** 失败时把环境事实一并报出，否则下一个人还得把这次诊断从头做一遍。代理只报有无，不报值（不变量八）。 */
const environment = () =>
  [
    `node ${process.version}`,
    ...['NODE_USE_ENV_PROXY', 'HTTP_PROXY', 'NO_PROXY'].map((name) => `${name}=${process.env[name] ? '已设' : '未设'}`),
  ].join('；');

const start = (configured = true, port = 0) =>
  new Promise<void>((resolve, reject) => {
    server = createSidecar({ session, readiness: configured ? readiness(true) : readiness(false), page: '<h1>pi lane</h1>' });
    // 用 `on` 而非 `once`：afterEach 对未起来的 server 调 close 会再发一次 'error'，
    // 届时若没有监听者，那一发就是未捕获异常。promise 只 settle 一次，重复 reject 是空操作。
    server.on('error', (cause: NodeJS.ErrnoException) => {
      reject(new Error(`回环监听失败 127.0.0.1:${port}：${cause.code ?? cause.message}（${environment()}）`, { cause }));
    });
    server.listen(port, '127.0.0.1', () => {
      origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });

/** 本文件唯一的请求出口。回环往返给显式预算：连得上却不回话（或被静默丢包）时当场具名。 */
async function call(route: string, init: RequestInit = {}, base = origin): Promise<Response> {
  try {
    return await fetch(`${base}${route}`, { ...init, signal: AbortSignal.timeout(ROUND_TRIP_BUDGET_MS) });
  } catch (cause) {
    const detail =
      (cause as { name?: string })?.name === 'TimeoutError'
        ? `回环往返未在 ${ROUND_TRIP_BUDGET_MS}ms 内完成（连得上但没回话，或被静默丢包）`
        : `回环请求失败：${(cause as { cause?: NodeJS.ErrnoException })?.cause?.code ?? (cause as Error)?.message}`;
    throw new Error(`${detail}：${base}${route}（${environment()}）`, { cause });
  }
}

const getJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

/** 读完 SSE 流，返回逐条事件。 */
async function collect(response: Response): Promise<Record<string, unknown>[]> {
  const events: Record<string, unknown>[] = [];
  const text = await response.text();
  for (const frame of text.split('\n\n')) {
    const line = frame.split('\n').find((candidate) => candidate.startsWith('data: '));
    if (line) events.push(JSON.parse(line.slice(6)));
  }
  return events;
}

beforeEach(async () => {
  const sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'pi-lane-sidecar-')));
  root = path.join(sandbox, '案卷');
  await mkdir(root);
  await writeFile(path.join(root, '备忘.md'), '# 备忘\n合同编号 HT-2024-081\n');

  faux = fauxProvider({ provider: 'faux', models: [{ id: 'faux-1' }] });
  const models = createModels();
  models.setProvider(faux.provider);
  session = await createPiLaneSession({ root, models, model: faux.getModel(), limits: { maxTurns: 5 } });
});

afterEach(() => {
  server?.close();
});

describe('dev 入口路由', () => {
  it('绿证一：根路径回 dev 页面', async () => {
    await start();
    const response = await call('/');
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(await response.text()).toContain('pi lane');
  });

  it('绿证二：状态面回授权文件夹、可用工具与禁用面', async () => {
    await start();
    const status = await getJson<{ root: string; tools: string[]; disabled: string[]; configured: boolean }>(
      await call('/api/status'),
    );
    expect(status.root).toBe(root);
    expect(status.tools).toEqual(['read', 'glob', 'grep']);
    expect(status.disabled).toEqual(['edit', 'write', 'bash']);
    expect(status.configured).toBe(true);
  });

  it('红证一：状态面不回传任何凭据字段（密钥不进前端）', async () => {
    await start();
    const raw = await (await call('/api/status')).text();
    expect(raw.toLowerCase()).not.toContain('api_key');
    expect(raw.toLowerCase()).not.toContain('apikey');
    expect(raw).not.toContain('sk-');
  });

  it('红证二：未知路由回 404 且说明是哪条', async () => {
    await start();
    const response = await call('/api/whatever');
    expect(response.status).toBe(404);
    expect((await getJson<{ error: string }>(response)).error).toContain('/api/whatever');
  });
});

describe('提问链路', () => {
  it('绿证三：SSE 逐条推送工具调用与模型回复，收尾带预算', async () => {
    await start();
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('read', { path: '备忘.md' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('合同编号是 HT-2024-081。')]),
    ]);

    const events = await collect(
      await call('/api/prompt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: '合同编号是多少' }),
      }),
    );

    const kinds = events.map((event) => event.type);
    expect(kinds).toContain('tool_execution_start');
    expect(kinds).toContain('tool_execution_end');
    expect(kinds.at(-1)).toBe('lane_done');
    expect(JSON.stringify(events)).toContain('HT-2024-081');
  });

  it('红证三：未配置凭据时直接 503，且回的是那句人话（不静默假跑）', async () => {
    await start(false);
    const response = await call('/api/prompt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '随便问问' }),
    });
    expect(response.status).toBe(503);
    expect((await getJson<{ error: string }>(response)).error).toContain('DEEPSEEK_API_KEY');
  });

  it('红证四：空提问不发起请求，且在流里显式说明', async () => {
    await start();
    faux.setResponses([fauxAssistantMessage('不该被消费')]);
    const events = await collect(
      await call('/api/prompt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: '   ' }),
      }),
    );
    expect(events.some((event) => event.type === 'lane_error')).toBe(true);
    expect(faux.getPendingResponseCount()).toBe(1);
  });

  it('红证五：模型索要 bash 时，禁用面在事件流里可见（dev 入口看得见拒绝）', async () => {
    await start();
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('bash', { command: 'rm -rf /' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('我不执行命令。')]),
    ]);

    const events = await collect(
      await call('/api/prompt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: '删掉所有文件' }),
      }),
    );

    const ended = events.find((event) => event.type === 'tool_execution_end');
    expect(ended?.toolName).toBe('bash');
    expect(ended?.isError).toBe(true);
  });
});

/**
 * 反例用的陪衬服务。它同样得挂 `'error'`——第一版没挂，于是在拒 bind 的注入环境里
 * 两枚反例自己各挂满 5s，把本票要修的悬挂形态原样复刻了一遍（实测记入 SPEC 十一）。
 */
const listenPlaceholder = (onConnection?: () => void) =>
  new Promise<ReturnType<typeof createServer>>((resolve, reject) => {
    const placeholder = onConnection ? createServer(onConnection) : createServer();
    placeholder.on('error', (cause: NodeJS.ErrnoException) => {
      reject(new Error(`反例陪衬服务监听失败：${cause.code ?? cause.message}（${environment()}）`, { cause }));
    });
    placeholder.listen(0, '127.0.0.1', () => resolve(placeholder));
  });

describe('环境前置：回环往返（PI-LANE-SIDECAR-HANG-1 悬挂形态注入）', () => {
  it('反例一：listen 失败当场具名，不挂满通用超时', async () => {
    const occupied = await listenPlaceholder();
    const taken = (occupied.address() as AddressInfo).port;
    try {
      await expect(start(true, taken)).rejects.toThrow(/回环监听失败.*EADDRINUSE/s);
    } finally {
      occupied.close();
    }
  });

  it('反例二：连上却不回话时按预算具名快红，不静默挂死', async () => {
    const blackhole = await listenPlaceholder(() => {});
    const base = `http://127.0.0.1:${(blackhole.address() as AddressInfo).port}`;
    try {
      await expect(call('/', {}, base)).rejects.toThrow(/回环往返未在 \d+ms 内完成/);
    } finally {
      blackhole.close();
    }
  });
});
