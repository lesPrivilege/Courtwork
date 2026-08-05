# PI-SIDECAR-DIST-1 · 调研实施回执

状态：**实施完成，待独立验收与架构裁路线**。权威契约只认父级 [`SPEC.md`](../SPEC.md)「并行相邻票与合流门」、
[`ADR-022`](../../../docs/decisions/ADR-022-pi-lane.md) 六-E 与实现就绪图同名行；本文件是该
工单的独占回执，不得在这里提前拍板分发路线或宣称发行成熟度。

实施会话只更新下列回执，不改父级 SPEC：

- **目标 SHA**：`00c8dbdbad466f0ab2edbf9083cda2998b659de7`（`main`）。独立 clean worktree／
  分支 `codex/pi-sidecar-dist-1` 施工。
- **实施提交**：`70e6482`（装置＋报告＋依赖，13 文件）；本回执为其后一枚。未 push、未 merge。
- **独立报告路径**：[`docs/engineering/pi-sidecar-dist-1.md`](../../../docs/engineering/pi-sidecar-dist-1.md)。
  装置与复现序见 [`fixtures/sidecar-dist/README.md`](../fixtures/sidecar-dist/README.md)；
  机器面读数 `dist/measurements.json`、`dist/coldstart-rounds.json`、`dist/sign-probe.json`
  （`dist/` 受根 `.gitignore` 覆盖，不入库）。
- **sealed bundle fixture SHA / 结果**：三档 bundle 均 959 input、零 esbuild warning，
  minified SHA-256 依次
  `esm-naive` `34b11452…5327120`（344,362 B）、
  `esm-createrequire` `463e75a5…da0ed232`（344,480 B）、
  `cjs` `33ae7197…06d5ef3c`（344,292 B）；三者逐次重建**字节可复现**。
  可执行文件为官方 node 原样改名（arm64 `2e3f1286…70e9b99d`、x64 `03afb361…a73852e5b`），
  改名后官方 Developer ID 签名仍 `codesign --verify --strict` 退出 0。
  **`esm-naive` 打包成功但运行即死**（`Error: Dynamic require of "process" is not supported`，
  退出码 1；根因 `yaml@2.9.0` 四处 `require("process")`），该档作为可复现红证留在装置内，
  每轮 launchProbe 重新证伪；另两档全维度通过。shipped 体积 108.03 MiB（arm64，**两件产物**）。
- **SEA fixture SHA / 结果**：CJS blob 注入 + ad-hoc 重签，两档四枚全部启动且
  `node:sea.isSea()` 为真。`default` arm64 `7c88748d…c9ac34a4`（112,382,848 B）／
  x64 `6b1f1709…a86d3cf0`（115,550,688 B）；`code-cache` arm64 `1f2b6735…c0c8abf3`／
  x64 `3498a6ed…a2ca89d3`。**单件产物**，shipped 107.18 MiB（arm64 `default`）。
  `default` 逐次重建字节可复现；**`code-cache` 不可复现**（同输入两次 blob 601,265 vs 601,289 B、
  SHA 不同），且跨架构注入**静默降级**（进程照跑，仅 stderr 一句 `Code cache data rejected.`）。
- **exact 依赖、许可与移除结论**：只动 `packages/pi-lane/package.json` 的 `devDependencies`
  与根 `pnpm-lock.yaml`（净增 21 行），生产依赖零变化、`packages/pi-lane/src` 零触碰。
  `esbuild@0.28.1`（MIT，一手读 `LICENSE.md`；lock 中本已解析，无新 resolution）——两路线均需，
  **保留**，两路线全否则同批销号。`postject@1.0.0-alpha.6`（MIT，一手读 `LICENSE`）＋传递依赖
  `commander@9.5.0`（MIT）——仅路线乙需要，**选甲即移除**。逐包用途与移除结论见报告第九节。
- **双架构 / Tauri 装配证据**：`aarch64-apple-darwin` 原生、`x86_64-apple-darwin` 经 Rosetta 2；
  两架构十枚产物按 `pi-sidecar-<target-triple>` 命名装配（命名规则一手核实
  `tauri-utils-2.9.3/src/config.rs:1660-1672`，与 `Cargo.lock` 的 tauri 2.11.5 同源）。
  八枚能启动的产物：stdio 三类 payload（1 MiB ASCII／850 KB 多字节／240 KB C0 最坏转义）
  SHA-256 逐条全等零截断；真实 tool loop `toolsExecuted:["read"]`、`turns:2`；
  abort 全部 `stopReason:"aborted"` 且进程存活；四类终止（异常 1／`exit(7)`／SIGKILL／SIGTERM）
  读数同构，复启全 `respawnReady`。冷启动取三轮独立取样中位数之中位数（arm64
  33.4／39.5／41.0／43.2 ms，x86_64 104.1／113.3／118.6／123.7 ms；裸运行时基线 25.2／88.0 ms）。
  `.app` 嵌套形态实测：`Contents/MacOS/` 下先签嵌套再签外层，`codesign --verify --deep --strict`
  退出 0 且嵌套件可正常启动。
- **全仓门结果**：`pnpm -r build`、`pnpm lint`、`pnpm test`（160 文件 **1397/1397**）、
  `lint:isolation-binding`（等级 `none`，扫 18 份 pi lane 源码）四项**各自实测 exit 0**
  （首轮曾用管道取退出码，zsh 无 `PIPESTATUS` 致取空，已去管道重跑）。
  本单零触碰 `apps/**` 与 `packages/*/src`，新增测试 0 例，故 Playwright 不适用、e2e floor 不动。

## 待架构裁项

1. **分发路线二选一**。报告第十节的建议是**路线乙 `default` 档（不开 `useCodeCache`）**，
   主依据是装配形态（一件产物、一套机制、Rust 侧无资源路径解析），非性能非体积——
   两者差距均在噪声或「真实签名后消失」的量级。报告同节已如实列出该建议的最大反对理由
   （上游叠了 alpha 版 `postject` 与 Stability 1.1 的 SEA，且排障与热修更重），
   并指出路线甲 **CJS 档**是站得住的替代。**未裁定前 `PI-HOST-LOOP-1` 不得开工。**
2. **`useCodeCache` 取舍**。开则冷启省 6.1 ms（arm64），代价是产物不可复现 + 跨架构静默降级；
   建议不开。若架构要开，须同批要求构建链按架构分别生成并断言 `Code cache data rejected.` 不出现。
3. **entitlements 与嵌套签名，属跨票**。官方 Node 二进制带六枚 entitlement；硬化运行时下
   不带 entitlements 重签即 SIGTRAP，而 `codesign --verify` 三种姿势全退出 0（对此零区分力）。
   本仓 `tauri.conf.json` 现行正是「`hardenedRuntime` 默认开 + `entitlements` 空」，
   并已在 `/Applications/Courtwork.app` 上实证（`flags=0x10002(adhoc,runtime)`、entitlements 空）。
   **但 tauri-bundler 是否以同一套选项签 `externalBin` 未核实**（crate 随 `@tauri-apps/cli`
   预编译分发，坐实须真实 `tauri build`，要改 `tauri.conf.json`，属本票禁止范围）。
   请架构裁定该条挂 `PI-SIDECAR-RELEASE-1` 还是提前挂 `PI-HOST-LOOP-1`；
   另注：官方 entitlements 含调试用 `com.apple.security.get-task-allow`，分发件带它会被公证拒绝，
   发行票不得整份照抄。
4. **是否吸收一条跨票输入**。首轮八枚产物 abort 全红，真因是 fixture 把控制面排进了与 prompt
   同一条串行队列。ADR-022 六-B.1 的 `cancel` 按定义要打断在途 prompt，**不能与 prompt 共用
   串行链**，否则取消对在途回合结构性不可达。此点是否写入 `PI-CODE-STDIO-1` 票面，请架构定。

## blocked（如实登记，不以开发态冒充）

Developer ID 签名、notarize/staple、Gatekeeper 首启（本机无证书无凭据，`spctl -a -vv` 实测
`rejected`／退出 3，属 `PI-SIDECAR-RELEASE-1`）；原生 x86_64 硬件性能（本机 Apple M2，
x86_64 全程 Rosetta 翻译）；Windows／Linux 装配与签名；跨平台 CI 的 esbuild 平台包与 blob 生成；
真实 DeepSeek key 端到端（与分发无关，沿父级 SPEC 第七节另记）。
