import type { AddressInfo } from 'node:net';
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

const start = (configured = true) =>
  new Promise<void>((resolve) => {
    server = createSidecar({ session, readiness: configured ? readiness(true) : readiness(false), page: '<h1>pi lane</h1>' });
    server.listen(0, '127.0.0.1', () => {
      origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });

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
    const response = await fetch(origin);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(await response.text()).toContain('pi lane');
  });

  it('绿证二：状态面回授权文件夹、可用工具与禁用面', async () => {
    await start();
    const status = await getJson<{ root: string; tools: string[]; disabled: string[]; configured: boolean }>(
      await fetch(`${origin}/api/status`),
    );
    expect(status.root).toBe(root);
    expect(status.tools).toEqual(['read', 'glob', 'grep']);
    expect(status.disabled).toEqual(['edit', 'write', 'bash']);
    expect(status.configured).toBe(true);
  });

  it('红证一：状态面不回传任何凭据字段（密钥不进前端）', async () => {
    await start();
    const raw = await (await fetch(`${origin}/api/status`)).text();
    expect(raw.toLowerCase()).not.toContain('api_key');
    expect(raw.toLowerCase()).not.toContain('apikey');
    expect(raw).not.toContain('sk-');
  });

  it('红证二：未知路由回 404 且说明是哪条', async () => {
    await start();
    const response = await fetch(`${origin}/api/whatever`);
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
      await fetch(`${origin}/api/prompt`, {
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
    const response = await fetch(`${origin}/api/prompt`, {
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
      await fetch(`${origin}/api/prompt`, {
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
      await fetch(`${origin}/api/prompt`, {
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
