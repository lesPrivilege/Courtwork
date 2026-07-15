#!/usr/bin/env bash
# WORK-STORE-MEASURE 三项度量的唯一可复现入口。
# 用法：bash run.sh [iterations]
#   iterations：CAS 延迟每组迭代数（默认 200）与崩溃注入每 arm 轮数（默认 40）。
# 前置：pnpm 依赖已装、@courtwork/core 等已 build（pnpm -r build）；macOS + clang（Xcode CLT）。
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_RUNTIME="$(cd "$HERE/../.." && pwd)"
ITERS="${1:-200}"
CRASH_TRIALS="${1:-40}"

TMPBIN="$(mktemp -d)"
CASTGT="$(mktemp -d)"
trap 'rm -rf "$TMPBIN" "$CASTGT"' EXIT

echo "############################################################"
echo "# 度量一：whole-envelope bytes 分布 + write count"
echo "############################################################"
( cd "$DEMO_RUNTIME" && pnpm exec tsx scripts/work-store-measure/measure-envelope.ts )

echo ""
echo "############################################################"
echo "# 度量二：原子替换 CAS 系统调用级延迟（clang，APFS 真机）"
echo "############################################################"
clang -O2 -o "$TMPBIN/cas-latency" "$HERE/cas-latency.c"
"$TMPBIN/cas-latency" "$CASTGT" "$ITERS"

echo ""
echo "############################################################"
echo "# 度量三：kill -9 崩溃注入 → 恢复窗口"
echo "############################################################"
node "$HERE/crash-inject.mjs" "$CRASH_TRIALS"

echo ""
echo "全部完成。数字判读与阈值建议见 $HERE/REPORT.md"
