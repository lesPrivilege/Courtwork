/**
 * PI-HEADLESS-HARNESS-1 组件B · headless 合成 sidecar 入口（**dev/acceptance-only**）。
 *
 * 它与 production 的 `src/product-main.ts` 组合的是**同一条** runtime + stdio + 工具面
 * （`createProductRuntime` / `createProductSidecarSession`，一字未改），只在**唯一一处**分叉：
 * provider 由本入口按 headless 配置选取，而不是 production 那样焊死 DeepSeek。这满足
 * `PI-BASE-HEADLESS-ACCEPT` 的六格矩阵要求——smoke 用 faux（不触网、无 key）证 plumbing，
 * 真验收注入真 key DeepSeek provider 跑真模型（SPEC §九 :741-744）。
 *
 * 三条边界，与 `product-main.ts` 同源同理：
 *
 * 1. **本入口绝不进 production 组合根**。`product-main.ts` / `provider.ts` 一件都不引用本文件；
 *    faux 只活在这里，守 demo/real 双向隔离（总纲不变量 7）。sealed CJS production 制品字节
 *    因此零漂移——本入口自成一枚独立 bundle。
 * 2. **provider 是注入点，不是数据面选择**。选哪支 provider 由 host 边界（headless 配置文件）
 *    决定；wire、host、journal、disk、restart 全走 production 代码，一处未碰。
 * 3. **配置缺失一律显式**。读不到 headless 配置即 stderr 具名报错并 `exit(1)`，不静默降级。
 *
 * 配置来源：`process.cwd()/headless-config.json`。sidecar 被宿主以 `env_clear()` + 固定 argv
 * 拉起（`spawn_verified_sidecar`），env 与 argv 都不参与 provider 选择；cwd 是宿主为本 leg 建好的
 * `pi-loop-runtime` 目录，headless 驱动方在 spawn 之前把配置写进去。wire 一字未借。
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxToolCall,
  type Context,
} from '@earendil-works/pi-ai';

import {
  createDeepSeekProviderBinding,
  createProductRuntime,
  withExplicitApiKey,
  type ProductProviderBinding,
  type ProductProviderFactory,
} from '../src/product-runtime.js';
import { createProductSidecarSession, type ProductSidecarTransport } from '../src/product-stdio.js';

/** headless 配置文件名。宿主在 spawn 之前写进 sidecar 的 cwd。 */
export const HEADLESS_CONFIG_BASENAME = 'headless-config.json';

/** faux 脚本的一步：一次工具调用，或一段收尾文本。驱动方逐 leg 排好一队。 */
export type FauxScriptStep =
  | { readonly kind: 'tool'; readonly name: string; readonly args: Record<string, unknown>; readonly id?: string }
  | { readonly kind: 'text'; readonly text: string };

/** headless 配置：provider 注入点。faux 带脚本、deepseek 走 production 装配。 */
export type HeadlessConfig =
  | { readonly provider: 'faux'; readonly script: readonly FauxScriptStep[] }
  | { readonly provider: 'deepseek' };

/** faux 脚本一步 → pi-ai faux 的一枚 AssistantMessage（一步即一次模型回合）。 */
function stepToFauxMessage(step: FauxScriptStep): ReturnType<typeof fauxAssistantMessage> {
  if (step.kind === 'tool') {
    return fauxAssistantMessage([fauxToolCall(step.name, step.args, step.id ? { id: step.id } : undefined)], {
      stopReason: 'toolUse',
    });
  }
  return fauxAssistantMessage([fauxText(step.text)]);
}

/**
 * faux provider 注入。**不触网、不读 key**：`apiKey` 收下即弃，脚本就是模型的全部输出。
 * 每枚 bootstrap（＝每条 leg）新建一份 faux，故新 leg 的回合队列天然从头开始。
 */
export function createFauxProviderFactory(script: readonly FauxScriptStep[]): ProductProviderFactory {
  return ({ modelId, apiKey }): ProductProviderBinding => {
    const faux = fauxProvider({ provider: 'faux', models: [{ id: modelId }] });
    const models = createModels();
    models.setProvider(faux.provider);
    faux.setResponses(script.map(stepToFauxMessage));
    const model = faux.getModel(modelId);
    if (!model) throw new Error(`faux 目录里没有 ${modelId}`);
    return {
      model,
      // key 显式塞进每次调用的 options 只为与 production 走同一条 streamSimple 通道；
      // faux 根本不看 key。用 withExplicitApiKey 让 plumbing 与 production 逐字同形。
      streamSimple: withExplicitApiKey(
        (target, context: Context, options) => models.streamSimple(target, context, options),
        apiKey,
      ),
    };
  };
}

/** 按 headless 配置选 provider 注入。faux→脚本，deepseek→production 装配（真 key 走 bootstrap）。 */
export function providerFactoryFor(config: HeadlessConfig): ProductProviderFactory {
  return config.provider === 'faux' ? createFauxProviderFactory(config.script) : createDeepSeekProviderBinding;
}

/** 读并浅校验 headless 配置。缺件/形状不符一律显式抛出——不静默降级成「模型没回话」。 */
export function readHeadlessConfig(cwd: string): HeadlessConfig {
  const file = path.join(cwd, HEADLESS_CONFIG_BASENAME);
  const raw = readFileSync(file, 'utf8');
  const parsed = JSON.parse(raw) as HeadlessConfig;
  if (parsed.provider === 'deepseek') return parsed;
  if (parsed.provider === 'faux' && Array.isArray(parsed.script)) return parsed;
  throw new Error(`headless 配置不合形状：${file}`);
}

/** 注入面恰 stdin / stdout / exit 三件——与 `product-main.ts` 的 `ProductSidecarIo` 同形。 */
export interface HeadlessSidecarIo {
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

/**
 * 组合根：`createProductRuntime({ createProvider })` + `createProductSidecarSession` + stdin/stdout。
 * io 接线逐字复刻 `product-main.ts` 的出包-flush-后-exit（刻意不引 production 入口，免得反向
 * 把 faux 拖进它的依赖图）。
 */
export function startHeadlessSidecar(io: HeadlessSidecarIo, createProvider: ProductProviderFactory): void {
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

  const runtime = createProductRuntime({ createProvider });
  const session = createProductSidecarSession({ transport, runtime });
  runtime.bind(session);

  io.stdin.on('data', (chunk) => {
    session.receive(chunk);
  });
  io.stdin.on('end', () => {
    session.endOfInput();
  });
}

// ── 进程入口（仅在被直接执行时）────────────────────────────────────────────────
if (process.argv[1] !== undefined) {
  let config: HeadlessConfig;
  try {
    config = readHeadlessConfig(process.cwd());
  } catch (cause) {
    process.stderr.write(`headless sidecar 无法读取配置：${cause instanceof Error ? cause.message : String(cause)}\n`);
    process.exit(1);
  }
  startHeadlessSidecar(
    {
      stdin: process.stdin,
      stdout: process.stdout,
      exit: (code) => {
        process.exit(code);
      },
    },
    providerFactoryFor(config),
  );
}
