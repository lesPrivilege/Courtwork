# 前后端合流复验（Fable，2026-09-08）

对象：Courtwork `main` `e0d214d`。Astra 回执称产品代码等价于联调基线 `0a3b9b2`，其后提交只改文档。本页在隔离工作树独立重跑，不复用 Astra 的数据目录、端口或 node_modules。

## 环境

| 项 | 值 |
|---|---|
| 工作树 | `/private/tmp/se-fable-lines`，分支 `claude/fable-two-lines`，自 `main` `e0d214d` 新建 |
| Node / npm | v25.9.0 / 11.12.1 |
| 数据目录 | 会话 scratchpad 下 `cw-data-8871`，仓外、全新 |
| 端口 | 8871（启动前核对空闲） |
| provider | local-fake（`bootstrap.capabilities.realProvider=false`） |

## 结果

| 检查 | 结果 | 证据 |
|---|---|---|
| `npm --prefix app ci` | 277 packages，0 vulnerabilities | [npm-ci.txt](evidence/npm-ci.txt) |
| `npm --prefix app test` | 146 / 146，0 fail，0 skipped，34.8 s | [npm-test.txt](evidence/npm-test.txt) |
| `npm --prefix app start` 8871 | 根路径 200；bootstrap 返回 `adapterId pi-coding-agent@0.85.1/agent-session`，mode `local-fake` | [server-8871.txt](evidence/server-8871.txt) |
| 静态准入 | `app.mjs`、`styles.css`、`home-view`、`runtime-view`、`icons.svg`、`court-symbol.mjs`、`evidence-memo/renderer.mjs` 均 200 且 MIME 正确；`/web/nope.mjs` 与 `/app/server/service.mjs` 404 | 同上命令输出，见本页正文 |
| Home 空态目视 | 1440 宽：左栏 New session / Home / Find a session / Projects 空态；主区 Continue 条件句、hero "Work that exists beyond the model."、composer 与框外 Project / File writes 上下文行；连接徽标 Local test | 浏览器目视，一帧 |

产品代码：`git diff 0a3b9b2 e0d214d -- app brand tests` 为空，与 Astra 回执一致。Fable 收尾分支 `bcbca1b` 与 `main` 在 `app/` 的差异全部为 Astra 在其上追加的 source-resolver、MCP 权限措辞与 Home 状态行宽度修补；[EX-B](explore/ex-b-frontend-entries-diff.md) 逐 hunk 核对：9 个文件 323+/18−，全部为 Astra 新增，无 Fable 内容被回退；WK10c 四项（18vh 留白、64–160 px 输入区、状态句在 form 外、文案体例）均在 `main` 存活。旧 `Courtwork-fresh` 未跟踪的七件均已 tracked；五件字节相同，`copy-convention.md` 与 `pages-preparation/README.md` 各多出 Astra 的联调 / 接管补注，无冲突。

## 结论

`main` `e0d214d` 可从干净工作树安装、测试、启动并加载全部前端模块；合流成立，可作本轮两条线的共同基线。本页不重跑 Astra 的浏览器主链（run-chain / mcp-unknown / extension-recovery），其 9/9、3/3、6/6 沿 [联调回执](../../../evidence/final-integration-20260908/README.md) 记录；真实 provider、读屏、触控仍为 not_run。
