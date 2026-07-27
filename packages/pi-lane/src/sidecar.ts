/**
 * Node sidecar（ADR-022 决定一：内嵌形态，非外挂 serve 进程）。
 *
 * 它同时是 dev 入口的宿主：一个 `node:http` 服务，只听 127.0.0.1，
 * 对外三条路由——静态页、状态、提问（SSE 逐事件推送，使多轮 loop 可见）。
 *
 * 密钥边界：凭据只在本进程内解析，`/api/status` 只回布尔与人话说明，
 * 绝不把 key 送进页面、事件流或日志（CLAUDE.md 不变量八）。
 *
 * 本文件不含任何 Node 侧执行/写原语——`node:http` 不在 R3 的执行/写集合内，
 * 且本包生产码零 `child_process`、零 fs 写调用，由 ADR-018 门静态锁死。
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import type { ProviderReadiness } from './provider.js';
import type { PiLaneSession } from './session.js';

export interface SidecarOptions {
  readonly session: PiLaneSession;
  readonly readiness: ProviderReadiness;
  /** dev 页面的 HTML 全文。由调用方读入，sidecar 自身不碰文件系统。 */
  readonly page: string;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(payload);
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

export function createSidecar({ session, readiness, page }: SidecarOptions): Server {
  let busy = false;

  return createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');

    if (request.method === 'GET' && url.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(page);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/status') {
      sendJson(response, 200, {
        root: session.root,
        configured: readiness.configured,
        detail: readiness.detail,
        model: readiness.model?.id ?? null,
        tools: ['read', 'glob', 'grep'],
        disabled: ['edit', 'write', 'bash'],
        budget: session.budget.snapshot(),
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/prompt') {
      if (!readiness.configured) {
        sendJson(response, 503, { error: readiness.detail });
        return;
      }
      if (busy) {
        sendJson(response, 409, { error: '上一轮还在跑；pi lane dev 入口一次只跑一轮' });
        return;
      }
      busy = true;

      response.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });

      const emit = (event: unknown) => {
        response.write(`data: ${JSON.stringify(event)}\n\n`);
      };
      const unsubscribe = session.subscribe(emit);

      void (async () => {
        try {
          const body = await readBody(request);
          const text = String((JSON.parse(body || '{}') as { text?: unknown }).text ?? '').trim();
          if (!text) {
            emit({ type: 'lane_error', message: '空提问，未发起请求' });
            return;
          }
          await session.prompt(text);
        } catch (cause) {
          // 失败必须显式落到流里：静默收尾与「模型没回话」不可区分。
          emit({ type: 'lane_error', message: cause instanceof Error ? cause.message : String(cause) });
        } finally {
          unsubscribe();
          emit({ type: 'lane_done', budget: session.budget.snapshot() });
          busy = false;
          response.end();
        }
      })();
      return;
    }

    sendJson(response, 404, { error: `无此路由：${request.method} ${url.pathname}` });
  });
}
