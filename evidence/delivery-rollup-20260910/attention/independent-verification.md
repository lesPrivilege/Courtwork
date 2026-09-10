# ATT-FE-01 独立复核

复核者：Luna（非作者）
复核日期：2026-09-10
候选：`1097fd453a6da0d0302cb64a881b48c583dc06d1`
基线保留：`68b8d3d67d6b66d1a6c2c8d4f72ff7079135b662` 是候选祖先；候选相对该节点只有 37 个 Attention 前端、定向测试/fixture 与交付证据路径变化。Runtime11、SK-1 Review 语义/测试和 FE-05a 保留；没有直接合并已废弃的 `cd1326d`。

## 结果

**有界独立 PASS。**

- 真实 Chromium + 本地 HTTP：116 项独立断言通过，页面异常 0。
- Attention 定向单元/恢复测试：29/29 通过，0 fail/cancel/skip。
- 五个合成对象覆盖 investigating、needs_you、waiting、later、resolved；六个显式视图（All、Investigating、Needs you、Waiting、Later、Resolved）均按服务端查询工作。All 的渲染顺序与 registry 返回顺序逐项一致；这验证了投影不排序，不把 BE-40 尚未关闭的默认排序口径记作已关闭。
- 动作控件只来自当前 `human_actions` 且 schema/revision 可识别；open/resolved 两组均正确省略 `attach_relation` 与 `request_disclosure`（grant editor 不在本单）。动作请求带精确六字段集合、对象身份、`request_id` 和 inspect 时的 `expected_revision`。
- 实际 CAS 冲突返回 `VERSION_CONFLICT`，无部分状态变化、无静默重放，`role="alert"` 文案正确；保留草稿，第二次决定使用新 `request_id` 和重读后的 revision。
- 两条请求不确定路径均通过：服务端已提交但响应丢失时按同一 `request_id` 查询 receipt；请求未发出时显示未知结果并以完全相同的 request/payload 重试。两种情况下各只产生一个事件。
- `resolve` 没有 reason 时本地拒绝并 alert；`snooze` 的 `at` 编辑器发送带时区的 `due_at`，Later 保持可见且没有倒计时/调度器。读取和处置期间 Run HTTP 请求、记录 Run、Session 均为 0。
- 真实 CDP 键盘覆盖 J/K、Arrow、Enter、Escape 和返回焦点；390px light/dark 覆盖列表→详情、返回焦点、44px 目标和无页面级横向滚动。状态条按合同使用 `overflow-x:auto`：390 初始视口会显示前五个词，`Resolved` 位于同一可滚动条内（实测 strip `scrollWidth=478`、`clientWidth=390`），词本身不截断。
- 已目视检查 1440 light/dark、390 light/dark list/detail 截图；层级、状态色、详情面和窄屏切换没有发现额外裁切或重排问题。

## 固定执行环境

- Detached source tree：`/private/tmp/cw-attention-delivery-verify-20260910`
- Synthetic data：`/private/tmp/cw-att-fe01-verify-data-20260910c`
- App URL：`http://127.0.0.1:8951`
- CDP：`20191`
- 未读取凭据、个人数据或真实 Email/GitHub；未运行付费 provider；未部署、未修改作者树或共享产品 checkout。

## 证据

- [independent-browser-verification.json](./independent-browser-verification.json) — 116 项实际断言、request/receipt/recovery/CAS payload 及网络计数。
- [screenshots/](./screenshots/) — 独立 Chromium 截图（1440 light/dark、390 light/dark list/detail、unavailable）。
- [scripts/independent-browser-verify-20260910.mjs](./scripts/independent-browser-verify-20260910.mjs) — 可复跑驱动；同目录 `browser.mjs`、`seed.mjs` 为其 helper/fixture。
- [logs/focused-attention-tests.log](./logs/focused-attention-tests.log) — 29/29 定向测试回执。
- [logs/independent-browser-run.log](./logs/independent-browser-run.log) — 真实浏览器执行命令、固定树、数据目录与结果。
- [logs/retention-check.log](./logs/retention-check.log) — 候选祖先与 37 文件范围检查。

## 后续边界

本复核不替代真实 provider、真人/法律专业 Review、读屏/IME/触控/真机性能或发布验收。proposal 实际渲染/批准流、`attach_relation`、`request_disclosure` grant 编辑器、批量动作、scheduler、BE-40 默认排序合同仍按既有台账留在后续工作。
