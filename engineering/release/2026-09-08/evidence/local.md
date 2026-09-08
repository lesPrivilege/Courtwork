# CourtWork fresh · 本地发布盘点

核对归档日期：2026-09-08（Asia/Singapore）；活动Fable工单中的2026-09-09日期按来源原文保留。
范围：只读检查 `/Users/lesprivilege/Projects/Courtwork-fresh` 的 fresh checkout、活动工作树、工程契约与发布说明；未读取私有运行时数据，未修改项目文件，未跑测试，未 push。

> Astra归档说明：这是Luna并行只读盘点时的观察快照，分支可能继续前进。下文当时尚缺的发布稿/回执现已由本轮创建，不作为当前缺口；未完成的RC/WK9与产品验证仍按活动工单。推荐顺序是计划裁取，不是运行证据。

## 现状与远端

- 当前分支 `codex/fresh-courtwork`，HEAD `f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`；`origin/codex/fresh-courtwork` 与之相同（`git ls-remote --heads origin`）。legacy `main` 为冻结参考，当前本地/远端为 `f9ade85`（`engineering/current.md:3`；`engineering/pre-takeover-roadmap.md:115-125`）。
- fresh 工作树有大量工程文档、研究、WSK 和发布准备的修改/未跟踪文件；未见 `app/**` 产品源文件在 fresh 被修改。工作树状态本身不能当作候选提交或发布状态。
- 远端没有作者工作分支：`claude/rc-runtime-ui`、`claude/wk6-home-brand`、`claude/wk7-color-governance`、`codex/brand-host-colors` 当前均为本地分支。不能把本地 SHA 写成已同步。

## 已委派工作与真实完成度

| 工作树 | 本地 HEAD / 状态 | 可用证据与剩余门 |
|---|---|---|
| RC 控制面 UI | `/private/tmp/se-agent-rc`，`claude/rc-runtime-ui@37a05f3`；修改 `app/web/runtime-view.mjs`、`styles.css`，未跟踪 delivery/evidence | `delivery-rc.md:1-39` 仍为“施工中”，提交、验证、未验证和像素判断均待填；不能接收为完成交付 |
| WK6 + WK8 + BR-1 | `/private/tmp/se-agent-wk6`，`claude/wk6-home-brand@dbea510`；产品改动已由提交承载，当前仅见未跟踪 intake/evidence | `delivery-wk6.md:3-22`、`delivery-wk8.md:3-27` 记录 `802c65e/8adafb5/4007f80`、`bd54107/af7cf8b` 与 BR-1 合流；测试/Chromium fixture 有证据，但未 push，真实 provider、真实桌面壳和部分视口未验证 |
| WK7 色彩 | `/private/tmp/se-agent-wk7`，`claude/wk7-color-governance@10f1afe`，干净 | `delivery-wk7.md:3-38` 记录 lint、对比度和 136 tests；data-theme 宿主切换、forced-colors、Safari/Firefox、设备与合流冲突仍未验证；未 push |
| BR-1 品牌包 | `/private/tmp/cw-brand-br1`，`codex/brand-host-colors@d799a7f` | 是 WK6 已消费的候选来源；应在集成前复核是否有新修订，不能单独关闭产品验收（`engineering/release/2026-09-08/integration.md:7-10,20`） |
| WK9 设计 | fresh 的 `design/wk9/` 有静态 artboards 和 `index.html` | `WO-WK9-home-work-design.md:5-17` 要求的 `clean-evaluation.md`、`gaps-wk9.md`、`contracts/presentation-primitives.d.ts` 尚未出现；设计仍不能转作产品实现 |
| EX-WK5 | fresh 已有 `explore/ex-wk5-home-work-data.md` | 仅为本地数据/生命周期事实清单；WK9 仍需完成选择和 Astra 契约复核，不能把参考图中的无数据字段画入产品（`intake-round-2.md:91-97`） |

## Runtime 与 Preview/Extension 边界

- Runtime Control Plane 后端已有 schema 4、资源/权限/MCP/context 契约；资源的 installed/running/exposed/permitted 维度独立，Core 拥有正式工作状态，Pi 拥有执行，host 拥有控制配置（`docs/runtime-control/INDEX.md:13-42`；`app/runtime/control-contract.d.ts:3-145`）。当前 fresh 状态明确新控制面 UI 待施工，已有验收不包含浏览器、新前端或真实 provider（`engineering/current.md:7-12`；`docs/runtime-control/acceptance.md:23-31`）。
- Preview 的现有实现是受信 extension catalog（当前 `evidence-memo`、`probe`，`app/extensions/catalog.mjs:1-7`）加 session extension binding、surface renderer 和 host actions；路由在 `app/server/index.mjs:107-110,128-129`，工作区入口在 `app/web/workspace-view.mjs:97-106`。它不是 marketplace、第三方插件沙箱或远程 Expert 编排。
- `getRuntimeInfo()` 明示 browser/fork/subagents/scheduler 均为 false、orchestration 为 `external_caller`（`app/server/service.mjs:340-359`）。因此发布阶段不能宣称已有多 Agent 调度、浏览器自动化、任务计划或独立 Preview marketplace。
- Work Surface 边界要求 Chrome/Runtime、Domain Core、共享 presentation primitives、Expert 分工；Review、commit、外部效果和正式写权必须分开，Preview 只能消费真实 identity/投影并保留 renderer 生命周期与 fallback（`engineering/design/work-surface-boundaries.md:1-28,30-66,68-115`；`engineering/release/2026-09-08/integration.md:15-23`）。Fable 负责 UI/Preview projection 选择，Astra 负责 runtime 路由、数据 adapter、身份/恢复接缝；两者均不能把 UI allow 当作 Artifact acceptance。

## 真正的发布门

1. **合流候选**：Fable 交付选定 UI 方向、Preview typed projection 与完成回执；RC 回执补齐；Astra 在隔离集成树检查 ancestor，合入 WK6/WK8、WK7、BR-1、RC 和必要 runtime 接缝，锁定单一 SHA（`engineering/release/2026-09-08/README.md:5-18`；`integration.md:5-10,25-33`）。
2. **干净 Web 链**：用锁定 SHA 在 clean clone 执行 `npm --prefix app ci`、`npm --prefix app test`、`npm --prefix app start -- --data-dir <独立目录> --port <独立端口>`；本仓是原生 MJS，当前没有 `build` script（`app/package.json:9-12`；`release/README.md:18`）。
3. **同源操作与恢复**：同一 SHA 覆盖 Home → Run → 工具允许/拒绝 → question/permission → Review/Preview → cancel/stop/reconnect，以及 runtime 配置 CAS、active-run freeze、unknown effect reconciliation；真实 provider/外部效果未跑时必须标 `not_run`（`integration.md:16-19,27-30`；`docs/runtime-control/acceptance.md:5-7,23-31`）。
4. **独立复核**：审查作者遗漏的反例，失败回到唯一 writer 或 Astra，受影响检查重跑。当前 RC、WK9 和 release review 输入尚未形成完整可接收证据。
5. **push**：仅在上述两笔（UI 独立交付、Astra 集成/联调）完成后 push 候选；记录 local/remote SHA、clean clone 结果和未通过产品门。当前没有 push。
6. **公开 preview / Pages**：静态 preview、README、quickstart、截图和 live demo 必须绑定真实 SHA，并明确不能运行 Node 后端、访问本地文件或提供真实 provider。当前 `engineering/release/2026-09-08/` 只有 `README.md` 与 `integration.md`；README 所链接的 `public-surface.md`、`review-handoff.md`、`evidence/local.md`、`evidence/reef.md` 尚未出现，发布面仍是骨架。
7. **DMG**：fresh 只有 Node/Web；没有 Cargo、Tauri/Electron 配置、桌面 build workflow 或 DMG 产物（`app/package.json:1-19`；`engineering/options.md:25-27`；`intake-round-2.md:70-71`）。先选壳并做最小包装实验；DMG 门需证明干净环境 build、安装/首次启动/退出/重开、数据保留、卸载边界、架构/系统版本、校验和及可复现产物。签名/公证和广泛分发是后续独立门（`release/README.md:31-37`）。
8. **takeover**：PT2 门仍要求 clone 后自足启动、真实工具调用、中断恢复与重启恢复；PT7 才检查完整 E2E、continuity、demo、GUI、legacy 独立与 release package（`pre-takeover-roadmap.md:55-61,95-111`）。候选分支同步或 Web preview 均不能关闭 PT2/PT7，也不能替换冻结 `main`。

## 推荐依赖顺序

完成 WK9 设计选择与 RC/WK6/WK7/BR-1 接收 → Astra 在隔离树合流并补 runtime/Preview 接缝 → clean clone 安装、测试、Web 启动与真实/未运行项分栏记录 → 独立复核与修复 → push 候选 → 绑定公开 preview/review 输入 → 单独进行 Tauri/Electron 包装实验与 DMG 门 → 真实发行身份可用后再做签名/公证。长期 Expert/NDA、多 Agent、远程任务、完整 Matter 与 legacy takeover 不应被本阶段 Web/DMG 候选隐式提前。

