# WO-ATT-UI02 · Claude 返回包

2026-09-13 · 作者 Claude。本包是 Attention items 前端与 motion 的候选实现，附作者检查；未经 Astra 裁决与独立验收，不代表视觉接受，未合入 main，未 push，未部署。

| 项 | 值 |
|---|---|
| 基线 | `main@93a8ac4`（`app/` 与交接包固定基线 `6e211bd` 逐字节相同） |
| 分支 / worktree | `codex/attention-ui02-claude-20260913`，`/private/tmp/courtwork-attention-ui02-claude-20260913` |
| 产品改动 | `app/web/attention-view.mjs`、`app/web/styles.css`；测试 `app/tests/attention-ui02.test.mjs` |
| 返回文档 | 本页、[motion 规格](motion-spec.md)、[区块与判断映射](change-map.md)、[Board/Time 判断](board-time-judgment.md) |
| 新 token / 依赖 / primitive / 后端需求 | 均无，详见 change-map.md §新增项清单 |

提交 SHA 与逐文件 SHA-256 见 `evidence/return-manifest.json`。

## 启动合成预览

预览加载产品自己的 `createAttentionWorkspace` 与 Home 模块渲染函数，请求由内存 mock core 应答。没有 `/api/v5` 路由，不读取用户数据目录、凭据或 Provider。

```bash
node engineering/design/attention-ui-handoff-2026-09-13/claude-return/preview/serve.mjs --port 8872
```

打开 `http://127.0.0.1:8872/`。同一 fixture 渲染基线版本：

```bash
node engineering/design/attention-ui-handoff-2026-09-13/claude-return/preview/serve.mjs --port 8871 --ref 93a8ac4
```

`--ref` 通过 `git show <ref>:app/web/…` 逐字节提供产品文件；预览外壳、fixture 与 mock 始终来自工作树。Node ≥ 22，无需安装依赖。

URL 参数：`view=home`、`project=<id>`、`select=<attention_id>`、`theme=light|dark`、`motion=reduce`、`latency=<ms>`、`panel=0|collapsed`。

右下角 **Synthetic scenario** 面板（非产品 UI）可设置：主题、motion、延迟；下一次动作结果（正常回执、1.8 s 慢回执、版本冲突、提交后丢失响应、未提交即丢失响应、INVALID_TRANSITION 拒绝）；下一次恢复查询不可达；下一次列表或详情读取失败；重置数据。面板底部日志记录 mock core 的提交、回执重放与恢复查询结果。

## mock 边界

| 文件 | 作用 |
|---|---|
| `preview/fixtures.mjs` | 固定合成数据。项目：Harbor lease review（五状态、seen 混合、core/external 来源、grant、due、freshness unknown、来源不可见）、Long text（200 字标题、长原因、长 next label、长路径）、47 items（分页）、Empty project、Registry unavailable |
| `preview/mock-core.mjs` | 从 `app/core/attention.py`@6e211bd 移植人类工作区可达的部分：`ORDER BY id`、visible 计数与 offset、`human_actions(state)` 广告规则、六个动作的状态效果、revision+1、`VERSION_CONFLICT`、同 request_id 回执重放与 `IDEMPOTENCY_CONFLICT`、`request` 查询、回执形状 |
| `preview/harness.mjs`、`index.html`、`preview.css` | 预览外壳：Home ↔ 事项面切换与返回焦点（移植自 `app.mjs` `openAttentionWorkspace` / `onBack` / `loadHomeAttention`）、assistant 占位 dialog、场景面板；`Date.now()` 固定为 fixture 时刻后 30 分钟 |
| `preview/serve.mjs` | 静态服务，只提供 `/preview/*` 与 `/web/*` |

mock 不进入产品数据路径；产品模块只从 `request()` 注入点得到它。assistant dialog 是占位，真实对话、Runtime & memory 与模型选择不在本单绘制范围。

## 固定场景与视觉证据

`evidence/screens/before`（`93a8ac4`）与 `evidence/screens/after`（候选工作树）为同一 fixture、同一驱动脚本、同名文件：18 个场景 × 1440/1280/390 × light/dark，各 108 张，`manifest.json` 记录来源 origin 与时间。`evidence/screens/compare` 为 7 个主场景的左右并排 JPEG（42 张）。

| 场景 | 覆盖 |
|---|---|
| 01 list · 12 registry unavailable · 13 empty project · 15 paged second page · 16 loading | 列表、筛选计数、不可用与 Retry、空、分页、加载占位 |
| 02 needs you · 04 due/later · 05 resolved · 03 context open · 14 long text | 详情分层、seen 与状态分离、trigger/due、Resolved 仅 Mark as seen/Reopen、L3 披露、长文本换行 |
| 06 editor + field error · 07 sending · 08 receipt, item left view · 09 conflict · 10 unknown + retry · 11 seen receipt | 编辑器、提交中、成功回执、冲突保留草稿、结果未知、acknowledge 只改 seen |
| 17 Home entry · 18 assistant open | 邻接入口 |

生成命令（服务已启动时）：

```bash
node engineering/design/attention-ui-handoff-2026-09-13/claude-return/tools/capture.mjs --origin http://127.0.0.1:8872 --label after
```

录屏与逐项 motion 说明见 [motion-spec.md](motion-spec.md)，文件在 `evidence/motion/`：正常路径、失败与反向路径、窄屏往返、reduced-motion。`tools/` 下的截图、录屏与浏览器检查脚本使用本机 npx 缓存中的 Playwright 1.63 驱动系统 Chrome，可用 `PLAYWRIGHT_MODULE` 与 `CHROME_PATH` 指定；它们是作者工具，不是产品依赖。

## 作者检查

以下均为作者自查，不能替代非作者复核。

| 检查 | 结果 |
|---|---|
| `node --check app/web/attention-view.mjs` | 通过 |
| `node --test app/tests/attention-ui02.test.mjs app/tests/attention-triage.test.mjs app/tests/attention-actions.test.mjs app/tests/attention-triage-recovery.test.mjs app/tests/home-presentation.test.mjs` | 49/49 通过；`attention-triage-recovery` 驱动真实 Core |
| `npm --prefix app test`（全量） | 928/928 通过（`evidence/full-tests.txt`）。运行时 worktree 的 `app/node_modules` 为指向主 checkout 依赖的本地符号链接，未提交 |
| `lint-colors`、`lint-materials`、`lint-interaction`、`lint-shapes`、`contrast-report`、`check-product-copy`、`check-semantic-consumers`、`check-doc-links` | 全部通过（`evidence/static-checks.txt`） |
| 浏览器行为检查 `tools/verify.mjs` | 17/17 通过（`evidence/author-browser-checks.json`）：detail 切换动画时长与方向；两条 reduce 路径下零动画；J/K 无动画且不换选中；窄屏往返方向、滚动恢复与焦点；`Sending…` 原位不改宽、无乐观更新、回执后才 settle；acknowledge 只改 seen；冲突保留草稿并给出版本；未知结果焦点到 Retry sending 且重发同一 request_id；Escape 两级返回；Home 进入同对象与返回焦点；assistant 关闭返回焦点；720×450（1440×900 的 200% 等效视口）、390、1280 长文本无横向溢出；390 触控目标 ≥ 44px；Large text 无溢出 |

## 未测项

| 项 | 说明 |
|---|---|
| 真实应用外壳 | 未启动 `app/server` 与 `app.mjs` 整页；侧栏、顶带高度（阅读面 sticky 偏移使用 `--band-top`）与真实 Home 布局未在整页核对 |
| 真实 assistant | 未运行 `attention-agent-view.mjs`；只验证占位 dialog 的开合与焦点 |
| 浏览器缩放 | 200% 以 720×450 视口等效，未用浏览器缩放命令实测；Safari、Firefox 未测 |
| 读屏 | 未用 VoiceOver 实听；只检查 role、aria-live、aria-label、焦点落点 |
| forced-colors | 写了 `forced-colors: active` 轮廓回退，未在强制颜色模式下截图 |
| skin | 只测默认 slate；dystopia、gray-steel、custom 未截图 |
| 真实触控 | 390 为 Chrome 视口模拟，未在触控设备上测 |
| 每页 50 条的渲染与动画性能 | 未测；`closeGap` 对当前页每行读一次几何 |
| 时区与区域格式 | 截图固定 `en-US` / UTC；`toLocaleString` 在其他区域的换行未核对 |

## 交 Astra 裁决

逐项选择见 [change-map.md §需要 Astra 裁决的选择](change-map.md#需要-astra-裁决的选择)（D-1…D-10）。与合同相邻、需要 Astra 确认的三处：

- 基线缺陷修正五项（change-map.md §行为修正）改变了焦点与在途控制，但未改变请求形状、request_id 复用或 CAS 语义。
- `VERSION_CONFLICT` 现有文案与自动 re-inspect 不一致，本单未改句。
- Board / Time 未绘制，所需查询与动作合同见 [board-time-judgment.md](board-time-judgment.md)。
