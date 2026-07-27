# 沙箱选型案头对照（SANDBOX-PROBE-1 前置；2026-07-27）

## srt（@anthropic-ai/sandbox-runtime）

anthropic-experimental/sandbox-runtime，v0.0.64（2026-07-07），Apache-2.0，维护活跃（27 releases／557 commits）；npm 侧版本未复核（页面 403，UNVERIFIED）。macOS 机制＝系统 `sandbox-exec`＋运行时动态生成 Seatbelt profile（读写路径＋网络规则），Linux＝bubblewrap＋seccomp，网络经宿主侧代理。API 两层：CLI `srt <command>` 包裹任意进程；库层 `SandboxManager.initialize()`＋`wrapWithSandbox()`，策略走 JSON 配置。README 自述限制：只能包裹子进程、无进程内自我禁闭；网络过滤依赖代理环境变量，无视代理的程序可绕；继承 fd 不受限；代理默认不终结 TLS（域前置可绕）。生产佐证：Claude Code 官方文档确认同一原语；已知坑——Go 系 CLI 在 Seatbelt 下 TLS 校验失败、Apple Events 默认封锁（`open`/`osascript` 报 -600）。

## gondolin

earendil-works/gondolin，v0.8.1（2026-05-05），Apache-2.0，experimental。本地 Linux microVM（QEMU 默认／libkrun 实验），TS 控制面在宿主实现网络栈与虚拟文件系统。macOS 宿主官方支持（`brew install qemu node`，ARM64 最受测试）；"boot in under a second" 为文档宣称，Apple Silicon 实测值缺（UNVERIFIED）。限制：guest 仅 Alpine；网络中介只覆盖 HTTP/1.x 与 TLS 拦截。**定位判定：须终端用户自装 QEMU，对桌面 app 内嵌分发是重负担——降为参考架构与对照实测，不作集成候选**；若走 VM 路线，apple/containerization 是更贴 macOS 的对照。

## Seatbelt／sandbox-exec 的 2026 现状

「Still deprecated. Still in use by everyone.」——自 10.13.6（2017）标记废弃，至 macOS 26.x 仍随系统出货、Apple Silicon 可用，仅打废弃警告；apple/containerization#737（2026-05-12）问移除时间表与替代 API，至调研日无官方回应。在役产品：Claude Code、OpenAI Codex、Homebrew、SwiftPM、Bazel、Nix；Chromium 走进程内 `sandbox_init_with_parameters()`（私有 API）。已知冲突：**本身启用 App Sandbox entitlement 的程序被 sandbox-exec 包裹会崩（嵌套沙箱）**——目标 app 不得开启 App Sandbox。ad-hoc 签名 app 内调用无已知障碍；**notarized＋hardened runtime 形态无一手成败记录（UNVERIFIED，真机必测）**。

## Tauri v2 侧

sidecar（externalBin）须与主 bundle 嵌套签名，公证流程较脆（tauri#11992 有 workaround）；调 `/usr/bin/sandbox-exec` 是平台二进制、按原理不需 sidecar 与额外 entitlement（推断，UNVERIFIED）；工程上宜从 Rust 侧 `std::process::Command` 直接 spawn 绕开前端 capability 面（推断，UNVERIFIED）。TCC 叠加行为无一手文档（UNVERIFIED）。

## 综合判定与两裁点

srt 路线（宿主生成 profile＋spawn 包裹子进程＋宿主代理管网）与 Tauri v2 结构吻合、在役证据充分，为首选基线。裁点一：**srt 假定 Node 运行时，Tauri 主进程是 Rust**——Node sidecar 嵌入 vs Rust 自研 profile 生成，探测票携证据回裁。裁点二：**App Sandbox entitlement 永不开启**入发行线红线。

## 真机风险清单（八条，仅真机可决）

1. ad-hoc 签名 Tauri .app 内 Rust spawn `/usr/bin/sandbox-exec`＋动态 profile 在 macOS 26.x 实际能否起、废弃警告形态；2. hardened runtime＋notarized 构建下同路径是否仍通；3. Seatbelt deny 与 TCC 叠加（弹窗归因、错误码）；4. srt 作库嵌入的 Node 运行时假定核实；5. 网络代理在桌面 app 内的落点（生命周期、端口冲突、无视代理脚本的逃逸面）；6. Go 系 TLS／Apple Events 坑在目标工作负载的命中率；7. gondolin Apple Silicon 冷启动与内存实测、QEMU 依赖能否分发；8. sandbox-exec 下一个 macOS 大版本存续——只能逐 beta 回归兜底。

## 来源

github.com/anthropic-experimental/sandbox-runtime 及 releases；code.claude.com/docs/en/sandboxing；github.com/earendil-works/gondolin 与 earendil-works.github.io/gondolin；news.ycombinator.com/item?id=47101200；apple/containerization#737；anthropics/claude-code#26095；openai/codex#215；Chromium seatbelt 设计文档；tauri-apps/tauri#11992；v2.tauri.app/develop/sidecar。
