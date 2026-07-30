/**
 * 产品 sidecar 的 production 组合根（PI-HOST-LOOP-1 §二.2、§二.4）。
 *
 * 它是 `sidecar.cjs` 的 esbuild entry，也是整条产品线上**唯一**决定「组合哪一支 provider」
 * 的地方。四条边界写在这里，免得日后被当成可配置项：
 *
 * 1. **不选择**。provider 只能是 {@link createDeepSeekProviderBinding}；命令行参数、进程环境
 *    与 wire 都不参与这个选择。modelId 与 key 来自 bootstrap payload，由状态机交给 runtime。
 * 2. **`node:process` 只碰 stdin / stdout / exit**。没有环境读写、没有命令行、没有 cwd。
 * 3. **出包不截断**。`process.exit()` 会丢掉尚未 flush 的 stdout（pipe 上尤其如此），
 *    故 exit 只在**每一行的 flush 回调都已回来**之后才落。这里刻意不用 `'drain'`：
 *    该事件只在曾经背压过之后才触发，缓冲区非空但从未背压时它永远不来，进程就此挂死
 *    （实测：vitest 下 ready+terminal 全部出包、退出码 8 秒不至）。
 * 4. **零 dev 依赖**。dev 的 `provider.ts` / `session.ts` / `sidecar.ts` 一件都不引：
 *    那几支会读环境变量、开 HTTP 或投影物理路径。
 */

import process from 'node:process';

import { createDeepSeekProviderBinding, createProductRuntime } from './product-runtime.js';
import { createProductSidecarSession, type ProductSidecarTransport } from './product-stdio.js';

/** 注入面恰是 stdin / stdout / exit 三件——本文件不认识别的宿主能力。 */
export interface ProductSidecarIo {
  readonly stdin: {
    on(event: 'data', listener: (chunk: Uint8Array) => void): unknown;
    on(event: 'end', listener: () => void): unknown;
    pause(): unknown;
  };
  readonly stdout: {
    write(chunk: Uint8Array, callback: () => void): boolean;
  };
  exit(code: number): void;
}

export function startProductSidecar(io: ProductSidecarIo): void {
  let pendingWrites = 0;
  let requestedExit: number | null = null;

  const exitWhenFlushed = (): void => {
    if (requestedExit !== null && pendingWrites === 0) io.exit(requestedExit);
  };

  const transport: ProductSidecarTransport = {
    write(line) {
      pendingWrites += 1;
      io.stdout.write(line, () => {
        pendingWrites -= 1;
        exitWhenFlushed();
      });
    },
    exit(code) {
      if (requestedExit !== null) return;
      requestedExit = code;
      io.stdin.pause();
      exitWhenFlushed();
    },
  };

  const runtime = createProductRuntime({ createProvider: createDeepSeekProviderBinding });
  const session = createProductSidecarSession({ transport, runtime });
  runtime.bind(session);

  io.stdin.on('data', (chunk) => {
    session.receive(chunk);
  });
  io.stdin.on('end', () => {
    session.endOfInput();
  });
}

startProductSidecar({
  stdin: process.stdin,
  stdout: process.stdout,
  exit: (code) => {
    process.exit(code);
  },
});
