# EX-PS3 · 互动标本可行性：纯静态重放一段已记录的工作（Sonnet，只读产品代码，可起服务）

派单：Fable，2026-09-09。裁定依据 [intake](../intake.md) PS-7、PS-8。输出：`../explore/ex-ps3-specimen-feasibility.md`（只写此文件）。

## 问题

GitHub Pages 上一个不接后端、不调模型的页面，能否用产品自己的投影模块与一份固定 SHA 生成的 JSON，重放一段合成 NDA 工作：Chat → Run（工具调用、Approve this write、Question）→ File → Continue in Work → 候选 → 决定，并同时给出同一事实的三个层级：Event log、Work state、Compiled context。

## 允许的动作

- 只读 `app/web/*.mjs`、`app/extensions/inbound-nda/**`、`app/domains/inbound-nda/**`、`app/tests/helpers.mjs`、`app/scripts/work-core-fixture.mjs`、`app/docs/api-v6.md`、`docs/runtime-control/api.md`、`app/server/index.mjs` 的 STATIC allowlist；
- 可以启动产品：`npm --prefix app start -- --data-dir /private/tmp/se-fable-ps-ex3-data --port 8906`（默认 fake provider；结束后删除该数据目录）；
- 不修改仓内任何文件；不读取任何凭据；不访问外网。

## 交付表

1. 模块表：`文件 · 导出 · 是否 fetch / 依赖 `/api/v5` · 是否可对一份 JSON 投影纯渲染 · 依赖的宿主状态（token、session 选择、localStorage）· 对 `/web/` 绝对路径的引用数`。
2. 三层数据源表：Event log / Work state / Compiled context 各来自哪个端点或文件（实际名称与字段），样本大小（字节），是否已有固定 SHA 的 fixture（`app/tests/fixtures/work-core/nda-packets.json` 覆盖哪几层，缺哪层）。
3. 捕获脚本轮廓：沿 `tests/helpers.mjs boot()` 与 `work-core-fixture.mjs` 的调用顺序，写出为标本一次性录下"事件列表 + 每步 surface 投影 + 记录的 context + 文件列表"需要的调用序列（端点、顺序、每步落盘的键），以事实陈述，不写代码。
4. 子路径核对：`index.html` / `styles.css` / 各 `.mjs` 中以 `/web/`、`/api/`、`url(/` 开头的绝对引用计数，站点部署在 `/Courtwork/` 下会断的项。
5. 渲染 ABI：inbound-nda renderer 的 `mount / update / dispose` 签名与它对宿主的要求；在没有服务器时它能否只靠 `pending / accepted / revised` 三份投影挂载。
6. 体量与风险：预计标本 JSON 大小、需要复制的产品模块清单、哪些模块必须由站点另写最小替代。
7. 结论不超过十行，只陈述观察。

端口 8906、数据目录 `/private/tmp/se-fable-ps-ex3-data`。
