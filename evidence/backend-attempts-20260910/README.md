# WO-BG-02 证据 · Run 显式承接血缘

隔离工作树 `/private/tmp/se-bg02`，分支 `claude/bg02-run-lineage`。每份日志首行记录命令、
并发参数与 `git rev-parse HEAD`（BG02-D10）。

| 文件 | 内容 | SHA |
|---|---|---|
| `full-baseline.log` | 开工前基线全量：tests 467 / pass 467 / fail 0 | `29e1eac`（产品代码 = `main@461ab12`） |
| `focused.log` | 本片专项 `tests/run-lineage.test.mjs`：tests 8 / pass 8 / fail 0 | `c1e7595` |
| `full.log` | 完工全量：tests 475 / pass 475 / fail 0 | `c1e7595` |
| `smoke.log` | `npm --prefix app run smoke`，退出码 0 | `c1e7595` |

## 作者验证（由执行者自己跑出）

- schema 8 → 9 升级一次成功、备份文件名与字节精确、旧 Run 一律 `supersedes: null`、备份只有一份。
- 备份路径被占用（符号链接）时拒绝升级，原状态文件字节不变。
- `461ab12` 的 store 打开 schema 9 文件被拒，且不改写任何字节。
- 坏血缘（指向不存在 / 跨 Session / 未终态 Run）的 schema 9 文件打开失败关闭。
- HTTP 正例与五种拒绝（404 `not_found`、409 `supersede_active` / `supersede_completed` /
  `supersede_conflict` / `effect_unreconciled`），404 的两种成因响应体相同。
- 幂等身份含血缘：同 commandId + 同 input + 同 `supersedes` 返回同一 Run 且不新建 Run；
  `supersedes` 不同或缺失 → 409 `command_conflict`；未知字段 → 400。
- 承接 Run 的 `user.message` 只含自己的输入，会话内不重放旧 prompt。
- SIGKILL 后重开：承接 Run 转 `unknown`、`supersedes` 保留、可再被承接。

## 未检项（本片没有验证，不得当作已接受）

- 两个请求同时承接同一 Run 的竞态用例（串行性只由 `store._mutate` 的单队列论证）。
- 真实 MCP unknown 路径下的 `effect_unreconciled`（用例以 store 直写夹具状态构造）。
- 真实 provider、UI 投影、跨版本 3/4/5/6/7 直升 9 的完整链路。
- 独立评审：本目录全部为作者验证。固定 SHA 的 Sonnet 只读探查与 Fable 裁定另行记录。
