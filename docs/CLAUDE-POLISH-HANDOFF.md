# Claude Polish handoff

2026-09-07 · SE Web UI + Harness Core，可继续打磨的本地集成基线。

## 从这里继续

- **工作目录：`<isolated-checkout>`**
- **集成分支：`codex/gui-completeness`**，由 `codex/ui-maturity-surface` 快进合入。
- **最后的功能提交：`511c29c`**（后续提交仅交接说明）。
- **浏览器：`http://127.0.0.1:8816/`**，收尾时服务将从上述集成目录启动。
- 测试数据：`/private/tmp/se-ui-maturity-data-20260907`。这是本地 synthetic/fake-provider 数据，不是生产内容。
- 原 UI 工作树 `<isolated-checkout>` 保留作历史。请在集成目录工作，避免改了另一份代码但浏览器看不到。

启动（端口已有服务时不要重复启动）：

```sh
cd <isolated-checkout>
npm --prefix app start -- --data-dir /private/tmp/se-ui-maturity-data-20260907 --port 8816
```

纯前端改动刷新页面即可。新增静态模块需要同步 `app/server/index.mjs` 的精确 allowlist，并重启服务。需要安装依赖时使用 `npm --prefix app ci`。不要清除现有测试数据或覆盖其他工作树。

## 本轮目标

用户要的是 **clean and cool、局部陌生化、成熟而清楚的层级**。应通过排版、比例、空间和按需展开改进，避免不断回到同一种 AI 设计模板。

可以调整：字体级差与字重、行高、间距、图标光学尺寸、按钮比例、圆角 token、卡片与页面的边界、hover/focus/selected 的清晰度、微文案、窄屏密度。允许必要的组件级整理，但不重新搭建产品骨架或状态模型。

不要机械延伸古籍隐喻、朱墨体系、印章、陌生 glyph、暖纸主题或左侧彩色装饰线。此前 intervention 朱线已撤下。Image Gen 对照采用 B 的排版层级加 A 的减法，C 的彩色关系词未采纳。

## 已成立的交互与模块

1. **布局**：桌面 Navigator / Work / Inspector；窄屏中央单阅读区，导航 drawer、inspector sheet。展开层、Tab、Escape、焦点归还已有契约。
2. **Chat**：用户消息靠右，最大宽 82%（窄屏 88%）；消息下方为时间、Copy、Edit。Agent 每次 run 独立分组，工具、已解决请求可收起，正文保持开放阅读。
3. **编辑**：`Edit as new message` 用 native dialog 编辑，`Use as draft` 才替换 composer。原消息/运行不变，不自动发送；已有草稿会先提示替换。Cancel 保留原草稿。
4. **Composer**：一体容器；附件/模型/权限为 quiet controls。Send/Cancel 共用右侧圆形位置，运行中只显示 Cancel；停止时焦点在禁用按钮前转回 composer。
5. **Workspace**：按实际父目录分组；文件点击进入 File；Add material 直接打开 material form。Overview 分 Workspace / Runs / Session settings。
6. **Run history**：从 Session overview 进入，按记录时间倒序列出现有 session runs；选择后复用同一个 Run inspector。
7. **Run inspector**：显示 session、started time、输入摘要、状态、Results、Usage 和可展开事件/身份。被取消且未返回的工具标为 interrupted，不能继续假称 working。
8. **Files**：明确 current workspace read 与 immutable recorded version；同一文件可核对 hash。当前内容不等于 canonical，完成运行或允许写入不等于 review acceptance。
9. **Core 接通**：真实 provider/model catalog/credential 设置、session permissions、materials、allow/deny、ask_user、run notices/usage/artifact history、断连与不确定回执恢复都已接通；日常视觉测试使用 Local test。

## 代码地图与优先阅读

| 文件 | 职责 |
| --- | --- |
| `app/web/styles.css` | 视觉 token、响应式与组件样式；首要 polish 面 |
| `app/web/index.html` | 稳定 shell、native dialogs、ARIA hooks |
| `app/web/user-message.mjs` | 用户消息与时间/操作栏 |
| `app/web/workspace-view.mjs` | 文件目录、overview、run history 的无状态视图 |
| `app/web/inspector.mjs` | Run/File 内容、Markdown 与版本核对 |
| `app/web/settings-view.mjs` | Provider 与 session permission 设置 |
| `app/web/materials-view.mjs` | 文本材料导入与文件列表 |
| `app/web/home-view.mjs` | Home 工作摘要与分页 |
| `app/web/ui-controls.mjs` | 原生 SVG 图标、动作、tooltip、Markdown 净化 |
| `app/web/thread-projection.mjs` | 事件投影；不承担视觉状态 |
| `app/web/app.mjs` | 唯一应用状态 owner、请求竞态、草稿、导航、renderer lifetime |

先读 `docs/interface-components.md` 和 `docs/ui-composition.md`。参考差距见 `docs/reference-entrypoint-audit.md`，其中条目 1–6 已处理，不能直接作为当前缺陷清单重复执行。

## 不可误改的约束

- 不建立第二套 session/run store，不用视觉组件重排或推断服务器事实。
- 不改 commandId 的一次逻辑提交身份；不确定回执必须复用原 commandId + 原 input，不能自动重发新命令。新草稿不能覆盖原恢复义务。
- 保留 session/read-generation guards、请求取消、迟到结果隔离、runtime-token 一次性恢复边界。
- 时间来自 `run.startedAt`；后端没有独立 user-message timestamp。完整时间/可访问标签说明来源，不伪造时间。
- 不用 current path-only 文件替换 recorded version；保留 runId/path/hash 精确定位与截断提示。
- Surface close/reopen 不卸载或重建 extension renderer，不丢它的未保存输入。
- 不为了紧凑而隐藏操作的可访问名称、键盘路径或触摸命中区。桌面 32px，窄屏 44px；glyph 可以更小。
- Settings 保存/删 key 是真实操作；key 不回显、不写前端 storage。视觉验证使用 Local test，不切付费 provider 试跑。
- 不增加未支持的历史重写、fork、review acceptance、审批印章、scheduler 等入口。

## 建议的 polish 顺序

1. 同一真实 session 在 390/430/768/1024/1440 宽度下检查 composer、用户气泡/操作栏、运行记录与正文距离。保留短消息 content-fit 的右对齐，不把它重新拉成宽卡片。
2. 协调 Workspace 目录卡、overview 卡、Run inspector 小节与 native dialogs 的轻重。独立任务模块可用卡片，正文/trace 不逐行卡片化。
3. 检查主/次/flat buttons 的尺寸、图标与文字基线、Send/Stop 同位转换和 hover/focus。圆角现有 4/8/12/16/pill 角色表优先复用。
4. 检查 Settings、Edit as new message、Run history、material form 的完整二级流程；确认窄屏滚动、关闭、焦点返回与未提交内容保存。
5. 使用自然长度的中文/英文内容作视觉验证。现有 `/fixture ...` 消息是功能测试语法，不能据其长 JSON 外观设计最终阅读密度，也不能把 SIMULATED 字样当成正式产品文案删掉。

## 验证与证据

已通过：119 backend tests；9 surface + 5 receipt + 4 edit/focus counterexamples。真实浏览器已验证 draft cancel/use、历史未重写、Run history → Run、目录 → File、Add material → form、取消后 Send 恢复及键盘焦点回 composer。

```sh
npm --prefix app test
node evidence/ui-maturity/surface-counterexamples.mjs
node evidence/ui-maturity/run-receipt-counterexamples.mjs
node evidence/ui-maturity/message-edit-counterexamples.mjs
git diff --check
```

纯样式改动优先真实浏览器检查，无需为每个像素新增实现镜像测试。若动焦点、对话框、composer 或状态投影，请重跑相关 counterexamples。

证据目录：
- `evidence/ui-maturity/modules/`：本轮用户消息、workspace、overview、运行中控制。
- `evidence/ui-maturity/typography/`：Image Gen 选型图与先前实页截图。
- `evidence/ui-maturity/current/`：上一集成节点的功能/响应式记录。

这些截图属于各自验证时刻；以当前 live UI 为准，不为复刻历史截图恢复已撤销的彩线。实际 VoiceOver、物理触控、真正 IME、200% zoom、付费 provider 本轮未验证；不要把它们记成已通过。

## 参考来源的边界

用户提供的 Codex 截图是布局与消息操作参考。Luna 另读 Claude desktop 可见结构和本地 DSH 源码 `<private-source>`：`ui-layout`、`ui-workspace`、`ui-conversation`。DSH 3080 服务未启动，本轮没有其 live UI 证据；Codex 原生窗口未读取。不要把参考产品的全部菜单照搬进 SE。

完成后请记录具体视觉改动、实际验证的宽度/流程、保留的限制和最终 commit；保持可运行的本地 preview。
