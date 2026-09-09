# 当前体验审查与 PR / commit 对照

## 范围与证据

目标用户：在 CourtWork 开始或继续工作、配置模型、核对来源并作候选决定的人。目标：减少查找和阅读成本，同时保留动作对象、状态与后果。

本次直接启动基线代码的两个独立 local-fake 实例，复用仓库合成种子；未读个人凭据、未请求真实 provider。桌面 1440×1024；补看 Models 390×844。按 Home → Settings → Models → Add provider，以及另一实例的 Work → Open work surface → Open workspace → 未决规则依次实看。所有下列截图先捕捉并目视，再形成判断。历史回执仅提供覆盖背景，不替代此次画面。

| 步骤 | 当前截图 | 体验判断 |
|---|---|---|
| 1 Home，有四条会话与一项待回答 | [Home](captures/home.jpg) | 输入锚点清楚；待回答对象接近屏幕底部，空白占据上半屏 |
| 2 Models | [Models](captures/models.jpg) | 当前连接独立可辨；编辑与技术只读长表同时常驻 |
| 3 Add provider 展开 | [新增流程](captures/models-add.jpg) | 路径选择明确；五步说明显著推低实际字段，包含已过期的后端缺失描述 |
| 4 Work 打开导轨 | [Work 导轨](captures/work-review.jpg) | 候选审阅藏在 Workspace 入口，Runtime 技术卡更显眼 |
| 5 打开领域审阅 | [Review](captures/review.jpg) | pending、版本和合法决定明确；规则 ID、哈希和来源编号压过业务阅读 |
| 6 展开未决规则 | [规则与来源](captures/review-source.jpg) | 确切引用可读，有独立来源回跳；跨层框线和大浮层使阅读重心分散 |
| 7 窄屏 Models | [390 视口](captures/models-mobile.jpg) | 分组变为原生选择器、字段单列；长说明仍使主要保存动作落在下方 |

步骤 4 的 `/fixture script` JSON 是合成输入原文本身，不能据此声称真实用户消息会泄漏工具协议。步骤 6 的“来源写三年、事实为 unknown”是刻意构造的未决状态；界面不得自行把事实改为已确认。

## 已实现与待做的关系

本地可核实的是提交和工单，没有据此编造远端 PR 编号。

| 提交或工单 | 实际内容与审查处置 |
|---|---|
| `24c6eaa`，FE-01；交付头 `bfefcd2` | 词表、Settings IA、chrome、Home composition。保留基础语义；图稿提出 populated Home 几何变体，须显式修订 WK-96 的 55% 约束 |
| `7125e07`，FE-02 | Models 分组、三条连接路径、说明步骤。新设计保留连接事实，去除把施工路线铺成用户操作说明的方式 |
| `a82c192`，FE-02 修订 | 移除本设备 display name。明确保留：连接身份／名称等 BE-21，不能以本地偏好补造注册表 |
| `e118992`，WK10b 第二段 | 领域 renderer、引用阅读、候选决定／修订。保留 renderer 及 Core 动作协议，探索来源优先阅读版式 |
| `644cc43`，WK11 | Settings Runtime Workbench 与材质接缝。本包建议普通页的底层诊断按需展开；不以视觉重排重写控制面 |
| FE-03 待做 | Chat/Work、Continue in Work、Memory Off。衔接 Review 入口可发现性；无 BE-19 不加可交互 Memory；Continue 使用现有绑定 API |
| FE-04 待做 | Primitive 行为归一。保留 keyboard、focus、streaming、scroll、approval、expired/cancelled 的实测责任；本轮静态图不能替代该单 |
| FE-05 后置 | 仅登记表面材质和降低透明度回退。图稿的冷白／银灰不要求 blur；无装饰性发光、无侧栏或内容区 blur |
| BE-17/18 已交付，前端未接 | 新 Models 图画的是下一单可接的临时预览，不是当前已完成流程；Test/Fetch 不证明可推理、已保存或可用于 Run |
| ES-FE-01、LG/EX/AM 规划 | 只读来源、执行文件候选、长运行进度等仍按各自契约；本包不凭图增加候选接受、文件写回或后台任务能力 |

权威输入：[第四轮工单](../../mvp/execution/work-surface-kit/work-orders/WO-FE-round4.md)、[FE-02交付](../../mvp/execution/work-surface-kit/delivery-fe02.md)、[BE台账](../../mvp/execution/work-surface-kit/backend-requests.md)、[分层规范](../frontend-layering-spec.md)、[当前状态](../../current.md)。

## 发现与建议

| 编号 / 优先级 | 证据与影响 | 处置 |
|---|---|---|
| CC-01 / P2 视觉提案 | 步骤1：1440×1024 下标题约 y=493、待办对象约 y=990。当前符合既定几何，仍使“回来处理已有工作”多滚动一步 | populated Home 提高 composer；保留空态单独规则。以首项待办可见作为目标，不把全局密度一律压缩 |
| CC-02 / P2 命名提案 | 步骤1 AX 列表 In progress 包含 Failed、Completed、No run recorded，容易把集合名读成运行状态；`app/web/home-view.mjs:35` | 建议恢复 Continue／Recent chats 的集合语言；每行保留原状态。此项挑战既有 WK-86 命名，需记录产品裁定，不能偷偷改 |
| CC-03 / P1 接缝文案 | 步骤3 声称 host 没有不启动 Chat 的 handshake；`app/web/settings-view.mjs:122`。主线 BE-17/18 已交付；current 已登记此差距 | 随探测接入修正文案；临时预览单独成组。不因为端点可探测就显示 custom provider 的 Save / Enable |
| CC-04 / P2 信息层级 | 步骤2/7：In force 重复 provider/model，展示 Session history、内部枚举、BE-12编号及 Edit in General；`app/web/runtime-view.mjs:2199` 起 | 当前连接只保留用户判断必需的事实；技术详情去 disclosure/Developer。当前默认与指定 Run bound 的区别仍可访问，不删除后端事实 |
| CC-05 / P2 入口与阅读 | 步骤4/5：审阅入口叫 Workspace；进入后实际显示 NDA 候选。领域内容被通用标题、规则 ID 和多层边界压住 | 绑定 Work 的既有入口按贡献内容命名；正文/未决规则优先，技术标识入详情。全幅阅读模式仅提案，须协调宿主层级，不能由 renderer 擅自接管 Shell |
| CC-06 / P2 后续行为验证 | 步骤7显示可见焦点框与单列字段，桌面规则展开为有名按钮；只证明本次可见状态。图稿的更轻控件可能减弱可发现性 | 保持完整 label、键盘路径、触屏≥44px、文本状态、明显 focus。对比度、读屏、200%缩放、IME、触控及恢复状态由实现后测，不宣称本轮通过 |

正面保留：输入是 Home 主锚点；默认模型作用域有说明；unknown 候选没有 Accept；引用与记录版本可见；按钮不靠颜色表达决定。以上是本次场景的观察，不是全产品验收。

## 验证边界

此次未执行任何候选决定、真实 provider 探测或配置保存。未跑全量产品测试，也未进行屏幕阅读器或动效审计。本包为 Astra 的设计审查；不把自己的图稿描述为独立验收。完整回归仍由对应实现作者和非作者分别提供。
