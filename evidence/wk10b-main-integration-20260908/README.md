# WK10b 第一段：main 合流复验

2026-09-08，Astra。main输入 `7941bdbdd2ca2bfcaaa36e451ab8a15b1e72e866`；接收 Opus代码 `84803ad`、作者回执 `f1ef5ae`、Fable复核 `d408961cf9f7a4c94fb5072e873508726fdae3ba`。无冲突合流提交 `9f562c0a034c8ddbba97c1def41cfeaeb7e8ea05`；随后在 `bb756c6` 补下述集成修正。历史作者证据未改写。

## 结果

- [全量](tests.log) 174/174；[smoke](smoke.log) 通过；[颜色lint](lint.log) 通过；[contrast报告](contrast.log) 生成。
- [浏览器](checks.json) 22/22，含 FE-T05 未知槽位、脚本字段、缺失依赖、无外部模块执行；FE-T07 A迟到读取不污染B、开合不运行命令/不丢草稿；生命周期无重复读取、Escape与可访问名、390/1440几何。实测日志 [browser.log](browser.log)。
- [覆盖态](overlay.json) 5/5：1440、1024、1023、800、390，展开时聊天区 inert/aria-hidden，尝试focus不能进入聊天；侧栏在≥1024可操作，在<1024退出；aria-modal仅<1024。关闭后聊天恢复。对应 docs/surface-assignment.md 第3条，无需改变条款限定。

## 集成修正

最新后端已声明 `/extensions/inbound-nda/renderer.mjs`，但第二段尚未创建文件。首次原脚本复跑 [21/22](checks-before-fix.json)：HTTP404后没有挂载/动作按钮且保留投影，槽位却仍报告 mount=true，缺席原因句未出现。

宿主现将当前读取context的renderer失败纳入槽位解析，卡片和面板共享 renderer-absent 状态；守卫先排除迟到失败，不改变后端事实/正式状态/producer状态。新context不继承旧失败，成功挂载清除标记。修正后同一实际HTTP+Chromium脚本22/22。未实现专业renderer，不据此关闭第二段或G2/G3。

## 复跑与边界

在独立工作树安装 app 依赖，独立合成数据启动服务器 `--port 8891`；未使用Opus端口8873及数据。CDP19752–19755，各次新浏览器profile。顺序：`RC_PORT=8891 node evidence/rc/seed-fixture.mjs`，再本目录 `seed.mjs`、`bind.mjs`、`checks.mjs`、`overlay.mjs`；浏览器脚本设 `WK10B_BASE=http://127.0.0.1:8891` 与独立 `WK10B_CDP_PORT`。脚本从作者证据复制，写入本目录；checks额外在断言失败时退出非零。bind通过现有HTTP路由创建两种工作会话。

local-fake，无真实provider/个人凭据。未实际触控、VoiceOver/NVDA、长中文行标签；FE-T06/T08/T11与第二段仍not_run。WK11仍应把composition纳入runtime summary后删除宿主runtimeControlRequest包装；本次不抢占该单。

非作者对集成修补与覆盖态的有界复核另见 [独立复核](independent-review.md)。main同步属于已授权工程合流，不代表部署或产品G1–G5通过。
