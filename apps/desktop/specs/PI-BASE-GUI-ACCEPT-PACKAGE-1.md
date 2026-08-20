# PI-BASE-GUI-ACCEPT-PACKAGE-1

状态：已清账（架构 `cb8aeb3`；实现 `4273f4f`；package assertion 修复 `2737c98`；
独立 Luna PASS `831bcee`）。只放行 signed Route A packaging seam，不放行
`PI-BASE-GUI-ACCEPT`、Agent 或 product-live。

## 架构冻结

目标是修复 PI-BASE-GUI-ACCEPT 本机 Tauri 制品的 packaging seam：Tauri 对
externalBin 做 ad-hoc signing 后，包内 Contents/MacOS/pi-sidecar 的物理
bytes/SHA 必须仍与随包 route manifest 的 target runtime 完全一致。

本票不得放宽 preflight_route_pair，不得把签名后的 runtime 改成只验架构、
长度或“签名前 digest”，不得增加 runtime fallback，也不得改变 route manifest
schema、routeId、Node 版本、sidecar CJS bytes、provider、journal 或 GUI 行为。
最终 .app 必须在真实启动前通过现有 fail-closed runtime preflight。

## 实现范围

- 只允许修改构建/打包所需的 route-manifest 生成与 Tauri packaging 配置或其
  直接测试；实现者必须在完工回执列出精确文件。
- 允许更新 route manifest 中已由最终 packaged arm64/x86_64 runtime 物理测得的
  bytes/SHA，但不能手写猜测值；若要改变生成方式，必须保持 source archive、
  targetTriple、machoArch 和 sealed CJS 语义不变。
- 禁止修改 apps/desktop/src-tauri/src/pi_loop_process.rs 的 strict
  verify_artifact/preflight_route_pair 语义，除非架构另行拍板。
- 不改 current.md、Pages、README、公开 release、版本号或 product-live
  叙事。

## Born-red 与验收证据

1. 在当前基线构建后，独立证明最终 app sibling 与 manifest runtime digest
   不一致且 preflight 被拒绝。
2. 修复后，从 clean worktree 运行 pnpm --filter @courtwork/pi-lane build:product-sidecar、
   pnpm -r build、pnpm lint 和
   pnpm --filter @courtwork/desktop tauri build --bundles app,dmg。
3. 对最终 .app 与挂载 DMG 副本分别核 arm64、regular/non-symlink、
   route manifest byte identity、sidecar CJS bytes/SHA、runtime bytes/SHA、
   codesign --verify --deep --strict、hdiutil verify，并实际运行现有
   runtime preflight control；preflight 未通过即 REJECT。
4. 证据不得含 API key、Authorization、raw prompt 或案件正文；验收者必须是
   独立 Luna clean worktree，禁止采信实现者自述。

## 完成门

仅当独立验收证明最终 signed sibling 与 manifest 完全相等、preflight 通过且
全量 build/lint 绿，才可消费该票并继续 PI-BASE-GUI-ACCEPT。本票本身不授予
Agent/product-live，不替代真实 DeepSeek、WKWebView、Stop、AX/焦点或 reduced-motion
验收。
