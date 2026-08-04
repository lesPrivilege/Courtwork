/**
 * dev 入口的数值环境变量解析（`PI-TOOLS-HONESTY-1` CONTESTED 裁定：**startup fail-closed**）。
 *
 * 病根：`Number('十二') === NaN`。NaN 交给 {@link import('./budget.js').createBudget}，
 * `usd >= limits.maxUsd` 与 `turns >= limits.maxTurns` 双双恒假——ADR-022 决定三要的那道
 * 上限于是整枚失守，而进程一声不吭照跑。`PI_LANE_PORT` 同族：`listen(NaN)` 被 Node 当 0 处理，
 * 服务起在随机端口而 banner 印着 `NaN`。两枚都不是「值不好看」，是不变量四的破口。
 *
 * 故取拒绝启动，比照同文件「缺授权文件夹 → stderr + exit(1)」的既有先例：dev 线也不接受
 * 「带着失守的预算先跑起来」。判据只到「有限正数」——超出端口值域、非整数端口这类，Node
 * `listen` 自己会显式抛 `ERR_SOCKET_BAD_PORT`，已经是显式失败，不在此层再抄一份值域。
 *
 * 解析住在这里而不是 `sidecar-main.ts`：那个文件是顶层 await + `process.exit` 的装配壳，
 * 结构上进不了单测面；判定逻辑放在壳里就等于放在测不到的地方。
 */

export type DevNumberResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: string };

/**
 * 环境变量 → 有限正数。未设置取默认值；设置了但不是有限正数一律拒绝，**不回落默认值**——
 * 回落等于把用户写错的上限静默换成另一个上限，那是同一种静默降级换了个位置。
 */
export function parsePositiveNumberEnv(
  name: string,
  raw: string | undefined,
  fallback: number,
): DevNumberResult {
  if (raw === undefined) return { ok: true, value: fallback };
  // `Number('')` 与 `Number('  ')` 都是 0：空值当 0 收下是静默改写，不是用户意图。
  if (raw.trim() === '') {
    return { ok: false, reason: `${name} 为空：需要一个有限正数（如 ${fallback}）` };
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return {
      ok: false,
      reason: `${name}=${raw} 不是有限正数：上限一旦是 NaN/Infinity/非正数即形同虚设，拒绝带病开线`,
    };
  }
  return { ok: true, value };
}
