# ACCEPTANCE: packages/demo-runtime

## CORE-BOUNDARY-1 独立验收（2026-07-14）

**结论：放行。** 本包从原 core 机械承接 demo composition、acceptance runner、三条 CLI 与 golden，未改变 fixture、场景、事件、引用、确认、修订或 output 语义。

- 实现：`e42165d2c592c95a3dd00b36616f745f691d5f6b`；独立验收分支：`codex/accept-core-boundary-1`。
- 本包测试：8 files / 26 tests；S3 与 LEGAL scripted CLI golden 均通过。
- 六段组装 golden 与基线旧文件 SHA-256 同为 `0047e71264f6ddb6aa25cf5ceb10aca7b4a0bd7aee913b9630bb8cafb79bcd07`。
- 整包移出 workspace、清 core `dist` 后，core 仍可独立 build 且 22 files / 232 tests 通过。
- 最终全仓 build/lint 与 116 files / 1000 tests 全绿；无 UI 变化，未跑 Playwright。
- 环境无用户提供的真实卷宗路径，未冒充完成 `real:s3` 真材料验证。

完整差异、破坏性反例、compat 子路径、依赖图与 CLI 数字见 `packages/core/ACCEPTANCE.md` 的“CORE-BOUNDARY-1 独立验收”。
