/**
 * dev 入口进程（`pnpm --filter @courtwork/pi-lane dev`）。
 *
 * 只做装配与启动，逻辑都在被测模块里；本文件不进单测面，故保持薄。
 * 授权文件夹必须显式给出——不猜、不默认取 cwd：猜错就是越权读。
 */

import { readFile } from 'node:fs/promises';
import process from 'node:process';

import { parsePositiveNumberEnv } from './dev-config.js';
import { createDeepSeekLane } from './provider.js';
import { createPiLaneSession } from './session.js';
import { createSidecar } from './sidecar.js';

const root = process.env.PI_LANE_ROOT ?? process.argv[2];
if (!root) {
  process.stderr.write(
    '未指定授权文件夹。用法：PI_LANE_ROOT=<绝对路径> pnpm --filter @courtwork/pi-lane dev\n' +
      '（也可作为第一个位置参数传入。不设默认值——默认取 cwd 等于默认越权。）\n',
  );
  process.exit(1);
}

/**
 * 数值环境变量一律 fail-closed（`PI-TOOLS-HONESTY-1` CONTESTED 裁定）。
 * 判定住 `dev-config.ts`（可测），这里只负责「拒绝即停」——与上面缺授权文件夹同一处方。
 */
function requirePositiveNumber(name: string, fallback: number): number {
  const parsed = parsePositiveNumberEnv(name, process.env[name], fallback);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.reason}\n`);
    process.exit(1);
  }
  return parsed.value;
}

const port = requirePositiveNumber('PI_LANE_PORT', 4319);
const maxTurns = requirePositiveNumber('PI_LANE_MAX_TURNS', 12);
const maxUsd = requirePositiveNumber('PI_LANE_MAX_USD', 0.5);

const readiness = await createDeepSeekLane();
if (!readiness.model) {
  process.stderr.write(`${readiness.detail}\n`);
  process.exit(1);
}

const session = await createPiLaneSession({
  root,
  models: readiness.models,
  model: readiness.model,
  limits: { maxTurns, maxUsd },
});

const page = await readFile(new URL('../dev/index.html', import.meta.url), 'utf8');

createSidecar({ session, readiness, page }).listen(port, '127.0.0.1', () => {
  process.stdout.write(
    [
      `pi lane dev 入口：http://127.0.0.1:${port}`,
      `授权文件夹：${session.root}`,
      `预算：${maxTurns} 回合 / $${maxUsd}`,
      readiness.detail,
      '',
    ].join('\n'),
  );
});
