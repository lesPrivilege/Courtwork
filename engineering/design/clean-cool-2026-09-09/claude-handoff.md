# 给 Claude 的施工前输入

先读取 `engineering/current.md`、实际分支/HEAD/工作树和本包 manifest；从最新 main 建隔离树，保留前端单 writer 顺序。本包提供三个不同表面的探索方向，不是要求直接仿制全部像素。当前尚无用户选中记录。用户选定局部后，记录选中的文件 hash、保留点和拒绝点，再写实施差异。

## 可以自由设计

- 同一主线内调整标题、段落、输入、列表和来源的相对位置；用留白、字重、缩进、列宽建立层级。
- Clean：每个事实说一次，一次任务一个主动作；详细解释靠近需要它的操作，诊断按需展开。
- Cool：冷白／石墨／浅银灰、清楚而克制的对比；状态语义仍由文本说明。冷感不等于低对比或蓝色泛光。
- Home 可探索“空态适度留白、已有工作更早出现”；Models 可分离当前连接与临时探测；Review 可探索来源优先的全幅阅读。
- 使用现有字体与图标实现；不为图稿引进新 UI 框架、字体依赖、图标系统或任意远端 renderer。

## 需显式变更的现有产品配置

Home 上移挑战 WK-96/55% 几何；Continue 命名挑战 WK-86；全幅 Review 挑战现有浮层/宿主编排。选中这些设计后，先同步体例、geometry assertions、词表及宿主契约；不要把这些差异伪装成普通 CSS 修复。未选中的画面不改变当前规范。

图稿没有冻结所有尺寸。实施初值仍从现有 `--nav:256`、Work measure 740、Home 820、14–16px正文、8/12/16组内间距、24/32节间距出发，再按选定差异调整。小字号、图稿中的不精确品牌 glyph、文字重复或任何虚构状态都不能作为实现依据。

### 本次生成图的目视校正单

| 图文件 | 保留的视觉实验 | 不得照抄的偏差 |
|---|---|---|
| `home-editorial.png` | 更早可见的待回答行、Continue 列表、轻量导航 | 图中将 Rent ledger 与 Exhibit index 的 Project 归属互换；实现应分别为 Coastal Freight / Northside Housing。额外 Good morning、日期与超大标题属于可删装饰，不固定为产品文案 |
| `models-preview.png` | 当前连接与临时预览明确分区、字段与动作接近 | “before saving anything”可能暗示随后支持保存；改为“Preview an endpoint without changing your current connection.”。当前连接外框可消融，日期不必出现 |
| `review-reading.png` | 原文与未决判断并列，Request evidence 为主动作，unknown 没有 Accept | 原文被画成巨大衬线标题，正文实施应回到可持续阅读字号；不要添加图中 JD 用户头像与 Help 入口。原始ID/digest进可访问详情，不重复 source revision。引用跨度的UI符号应忠实契约，不从绘图推断闭区间 |

三张输出实际为1487×1058，目标prompt为1440×1024；原图未拉伸、裁剪或重绘。它们适合作为版式方向，不能直接用图上距离替代CSS几何验收。

## 不可由图稿改变

| 边界 | Claude 必须保留 |
|---|---|
| 状态所有权 | 服务端快照决定事实；外观不推导 accepted / complete / enabled |
| 探测与连接 | BE-17/18 请求中的临时 key/URL 仅用于预览；测试结果不等于 key 验证、模型可推理或已保存。无 BE-21 不造多个持久连接、名称或 provider 身份 |
| 候选决定 | unknown 示例只有 Reject / Request evidence；是否出现 Accept 由当前 descriptor 决定。固定 candidate/base/source/request identity、CAS和恢复机制 |
| 来源阅读 | 保持源 ID、版本、digest、确切 span 的可访问入口；不得画未经后端提供的 PDF 页码、定位几何或来源文件名 |
| Chat/Work | Continue in Work 使用现有绑定；不复制数据。Memory Off 无后端前保持只读 |
| 生命周期 | collapse 不重新执行；renderer 缺席仍只读历史；网络未知不乐观成功；保留草稿与焦点 |
| 材质 | 仅 FE-05登记表面，提供不透明回退；阅读区和侧栏不加 blur；此包不新增材质层 |

## 建议拆单与验收

| 设计切片 | 前置与主要验证 |
|---|---|
| CC-M：Models 临时探测与说明收敛 | 消费实际 BE-17/18 协议；表单未保存、失败、结果过期、URL改动后的失效、active Run受限状态分别测；custom/local 保存仍禁止。更正旧说明同步进入此单 |
| CC-H：populated Home | 用户采纳布局/命名差异后改几何规范；1440/1024/390、空态/有待办/长标题/大量会话；列表不丢对象，显示去重不改聚合后端事实，不虚构 Today 日过滤 |
| CC-R：Review 阅读优先 | 先协调宿主呈现变体，再让 renderer 消费原 contract；unknown无Accept、历史source精确回跳、拒绝/补证/修订、版本过期、失联、producer/renderer缺席；返Chat保留焦点、滚动、草稿 |
| FE-04/05 横向回归 | 继续原工单，不以漂亮截图结束；键盘、streaming/auto-scroll、停止/未知/过期、200%缩放、深浅对比度、reduced motion/transparency；触控/读屏未测单列 |

CC 切片是可拆 PR 输入，不自动重排 FE-03→FE-04→FE-05，也不把 ES/LG/AM 后端规划提前画成已交付。

Models 实际请求/回执以 [BE-17/18协议](../../../app/docs/runtime-foundation.md#unsaved-provider-preview-be-1718) 为准。其余参考 [既有分层规范](../frontend-layering-spec.md)；Review 只迁移布局，不另立 source/candidate/decision 协议。

交付应含：选定图稿与实现同状态截图、明确视觉差异、更新的规范和词表、实际测试证据、作者/非作者范围及未检项。生成图只作目标；最后交付产品自己的控件和文本，不把整张 PNG 嵌入界面充当实现。
