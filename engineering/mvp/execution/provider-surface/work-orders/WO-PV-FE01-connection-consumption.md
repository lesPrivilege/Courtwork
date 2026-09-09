# WO-PV-FE01：连接面与模型面消费真实连接（Fable，2026-09-10；待 WO-PV-BE02 合流后填基线派出）

前端单一 writer。派单方式：Agent 工具、`subagent_type: opus-wo-low`、后台。派出前 Fable 建树 `/private/tmp/se-agent-pvfe01`、分支 `claude/pvfe01-connections`、数据目录 `/private/tmp/se-agent-pvfe01-data`，端口 8911、fixture 8912（2026-09-10 已核空闲，起服务前再 `lsof` 一次），并把 `<BASE>` 换成 BE02 合流后的 main SHA。

## 先读（顺序）

1. `engineering/mvp/execution/provider-surface/intake.md` §2 与 §7（PV-1…PV-34），尤其 PV-24 真实消费、PV-25 最小层、PV-27 未知如实、PV-28 三路径、PV-30 未知窗口。
2. `explore/ex-pv1-current-state.md` §6 前端触点表、§8 gap 表；`explore/ex-pv3-precedent.md`（可移植的半边与不可移植的半边）。
3. `work-orders/WO-PV-BE02-connection-slice.md` 与其交付页（字段以交付页为准，不以本单文字为准）。
4. 代码：`app/web/settings-view.mjs`（`CONNECTION_PATHS`、`CONNECTION_STEPS`、`PROBE_PATHS`、连接列表与表单、`lock()`）、`app/web/model-picker.mjs`、`app/web/app.mjs` 的 composer 模型入口、`app/tests/models-connections.test.mjs`。

## 做什么

0. **第 0 项 PV-M-1（写入合一）**：模型选择器 PUT 带 `reasoningEffort`、Settings 连接表单 PUT 不带，后端整体替换配置，导致保存连接静默清掉已选档位。两处写入合流为一条投影：读同一 snapshot、提交同一字段集，任一处保存都不得丢另一处的字段。增断言一条。
1. **Fetch models 通到底（PV-24）**：发现出的模型 ID 可被选中、保存、执行。既有断言"发现的模型不进 Model 列表、不进保存配置"随之改写为新的真实语义——改断言要在交付页写明改的是哪一条、为何不再成立。
2. **连接列表成复数**：连接行按 BE02 的记录渲染，每行显示身份、端点、凭据状态与所属路径；`connectionPathOf` 的单条推断退役。今日只有一条连接时列表仍是一行，但结构不再假设单数。
3. **未知能力如实呈现（PV-27 / PV-30）**：发现模型的 context window 显示 `unknown`；该连接的推理档位在目录未声明时只出 `Off`，不出档位选择器；未知窗口连接的压缩关闭状态须在连接行与模型行可见，文案说明这是宿主的诚实降级而非 provider 事实。用户可选填窗口值时，标明该值来自用户输入。
4. **保存失败的三类区分**：认证失败、目录不可达、模型不在该目录，各有可读文案，直接消费 BE-17/18 的 `status` 枚举，不在前端重新分类。
5. **run 期锁不变**：`lock()` 的既有语义（有活动 run 时禁用表单与探测）保持；模型面的"applies to future runs"语义保持（PV-6），不得因多连接而改成"立即生效"。

## 边界

不改 `app/server`、`app/runtime`、HTTP 契约；不新增端点与字段（缺字段写待裁定）；不引依赖、不引新色新字新图形新材质；不做连接管理大页、不做连接并列切换、不做 Vertex 与 OAuth 表单；不做 FE-05a 的字阶与密度改动（PV 提前于 FE-05a 是用户裁定，两者互不越界）；EX-PV3 的不可移植半边不得采纳（切换立即生效、推理档位并入模型身份、一模型多 provider、Regenerate key）。

## 交付

- 提交到 `claude/pvfe01-connections`，显式路径 git add；写 `delivery-pv-fe01.md`（体例沿 `delivery-cc-d0a.md`）：基线 SHA、改动文件、写入合一前后对照、断言原文（含被改写的旧断言与理由）、未知能力呈现的截图与文案、状态矩阵、未检项、待裁定、anti-slop 门自查。
- 作者验证：`npm --prefix app ci`、`npm --prefix app test`、`node tools/lint-colors.mjs`、`node tools/lint-materials.mjs`、`node tools/contrast-report.mjs`、`npm --prefix app run smoke`，浏览器脚本沿 `evidence/cc-d0a/` 的方式逐字复制只改端口。全程 local-fake / loopback，不读任何凭据文件。
