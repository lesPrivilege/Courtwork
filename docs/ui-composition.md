# UI 编排与视觉替换边界

2026-09-07，Astra。此文补充 `ui-orchestration-contract.md`；本轮已接入接受的 Foundation R3。它规定通用 UI 的容器、展开和返回关系，不改变 Core、扩展 authority 或 renderer ABI。

## 一个工作中心，三层检查

| 层级 | 默认呈现 | 展开 / 返回 |
|---|---|---|
| Navigator | Home、项目组、组内最近创建的 5 个会话；当前会话始终可见 | 项目标题只折叠本组，不切走对话；Show more 分批增加条目；组旁加号在该项目创建会话 |
| Home | 唯一开始入口、Waiting for you / Continue / Needs a look | 使用 `/work-summary` 的真实分页、状态与错误；无会话时不显示禁用 composer 或空检查栏 |
| Thread | 用户输入的轻背景块、直接可读的助手正文、运行结果摘要 | 连续工具过程收成活动行；工具失败初次展开，用户收起选择保留；原始请求/结果继续内收 |
| 待处理决定 | 唯一具有明显边界的授权 / 回答卡 | 服务端确认后收成已处理历史行；允许一次精确写入不等于接受成果 |
| 会话概览 | 顶栏图标打开独立摘要卡：Workspace、Latest run、File permissions | 点条目进入文件对话框或完整检查栏；点击外部 / Escape 收起 |
| 检查栏 | Workspace / Run / File，共用一个宿主 | Workspace 保留扩展 renderer；Run 内含 Results、Usage，诊断再收进 details；File 明确 Current file / Recorded version |
| 放大工作面 | 原检查栏在覆盖层内扩大 | 第一次 Escape 还原布局，下一次关闭；关闭后回原入口，异步读取不抢焦点 |

导航开合、检查栏开合、内容种类与 renderer 身份分别表达。面板关闭不取消 Run，不提交输入，不卸载同一 renderer。切换会话才隔离旧读取与旧 renderer。新建请求使用目标与导航身份；普通创建接口无幂等协议，回执不明时先要求刷新核对，不自动重发。

## 响应式与焦点

- `>=1024px`：Navigator | Work | Inspector；导航可收起，Inspector 按需打开。正文与 composer 同一 `--column:740px` 对齐。
- `768–1023px`：主区独占画面；导航为抽屉，Inspector 为右侧覆盖层。底层 `inert + aria-hidden`，键盘焦点受约束。
- `<768px`：Inspector 为 `inset:0;width:100%` 的整幅工作面；导航仍为独立抽屉。不能同时露出可操作的两套主区。
- 普通桌面动作目标 32px，窄屏 / coarse pointer 44px。原生 dialog 优先于检查层；工具提示不吞掉上层 Escape；选择 tab 用箭头 / Home / End。
- 原生 dialog 的关闭回调不会覆盖已经转移到 File tab 的焦点。实际 IME、软键盘、VoiceOver、真实触屏及 200% 缩放仍需设备验收。

## 模块与数据边界

`app.mjs` 保留唯一页面状态、导航准入、草稿/回执与 renderer 生命周期 owner。新增模块承接纯事件投影、控件与 Markdown、Home、Settings、Materials、Run/File 显示，不各自发明第二套会话状态。

Run 首次发送生成 `commandId`；网络/5xx 回执不明时保留原 input/ID 到当前标签页的 sessionStorage，阻止新 Send，并允许显式恢复原回执。恢复不清掉用户较新的草稿。服务端重启使进程 token 失效时，只有路由层明确拒收的 401 才刷新 bootstrap 后重试一次；传输错误不自动重放。

文件读取按 session/path/kind/run/hash 绑定；记录版本与当前文件分别请求、校验、显示。Run completed、文件产生、一次写入允许，都不是专业 Review 成立。专业扩展继续用自身 typed action、服务端校验和持久投影。

## Claude Design 可替换部分

可替换 `styles.css` 的颜色、字重、字号、间距、圆角、边界与阴影 token，或局部 CSS 表达；改动后复核 390/430/768/1024/1440。素材可以替换局部视觉资产，但不得改变原生 SVG 的可访问名称和控件命中区。

保留：主区顺序、稳定 DOM id、ARIA 关系、popover/dialog/tab 角色、按钮语义、底层隔离、关闭/返回次序、Run/File 身份、草稿与 renderer owner。若需要改变这些，作为编排变更单独验证，不能包在换皮中。

图标为固定 Lucide 1.41.0 子集的 native SVG `<use>`；Floating UI DOM 1.8.0 只负责 tooltip 避碰；Marked + DOMPurify 用于受限 Markdown。无远端 CDN，运行时不需要安装 UI 框架。版本、源文件、许可证、完整性与改动说明见 `app/web/vendor/manifest.json` 和 `tools/ui-vendor/`。
