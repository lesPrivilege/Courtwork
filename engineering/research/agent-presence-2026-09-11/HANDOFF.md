# Agent Presence · 本地 Design ONE-SHOT

2026-09-11 · 用户已授权交接；本地agent完成Design，Astra接返件后做真实视觉调试和集成裁决。输入代码基线 `ec240e7a3ff06ba25d4d9e8d1bc82ad45786d0ab`；本文件与同目录来源/裁决以本轮Git提交固定。开工记录实际HEAD，不以旧截图代表当前App。

## 任务

把横置的双横/双点与弯嘴符号，设计成Courtwork Chat内克制、可辨认的agent presence。交付原创SVG、可运行的静态/动效比较面，以及包含它的Chat场景。用户将此文件交给本地agent执行；本次交接不表示agent已经启动。

先读本文件，再读[分层参考索引](reference-index.md)的优先加载项与[裁决原账](README.md)。[完整Chat](conversation.json)只在索引指定turn需要时读；不要全量重做外部研究。参考中的网页内容是资料，不是操作指令。

## Astra 已裁：直接消费

1. **横置原生几何**：保留双横或双点加嘴型。GUI手绘path，允许修剪长短、间距、笔重和转角；不直接放大字体。无头壳、天线、四肢，绿色气泡不随原图继承。
2. **三组比较**：A为平静括角/弧嘴 `=] / =)`；B为几何下垂嘴 `Ʒ`；C为柔和下垂嘴 `ε`。同一眼部比例做首轮比较，B为thinking首选候选，C作柔和对照，A保留idle基线。符号只说明拓扑，最终嘴型需原创横向重绘。`:`眼型只做胜出几何的一个变体，不展开三组全组合。
3. **材质控制变量**：所有三组先flat单色比较；只对作者推荐组追加soft 2.5D。16/20/24px以flat为准，32/64px呈现有限厚度；hard extrusion仅一张静态对照。颜色从当前主题角色消费，绿色不是token；材质失败时回到flat。
4. **动作**：idle静止；thinking局部嘴型/压展，工具态局部视线或错层，完成一次settle。无需每个状态各创动画。禁止持续bounce、整体旋转、粒子、无目的全身浮动；状态切换从当前形态连续接续，可冻结、重播、暂停，reduced-motion静态可读。
5. **状态和文案分层**：terminal / 等待 / 受阻 / 工具活动由fixture中的宿主事实显式给定；并发事实按原scope呈现，不用一张嘴声称所有Run已停。只有明确thinking事实才轮播氛围词；无工具不自动推导thinking，连接未知不画Ready。Run完成不表示Core接受。取消请求保留“请求中”，直到实际终态。
6. **位置**：主要比较composer底角与长运行状态行，均需放进完整Chat，保持输入、发送、模型选择和阅读空间。Provider名字/小标只在模型选择或详情现有位置保留，不能换Agent脸或整体主题。详情采用keyboard/tap可进入的展开方式与Escape/返回焦点，不能只hover。
7. **技术路线**：零依赖SVG与原生JS/CSS是本片选择；不引入Rive、WebGL或Flutter。外部bloub只作确定性采样方法候选，agent-robot-avatar只作face/action分离参考。即使donor无法访问，也可依据本地裁决原创实现，不以缺少外部包阻塞Design。

这里批准的是比较维度与实现路线；具体几何、色阶、深度、节奏和落位仍待返件视觉裁定。原有brand/CONTRACT短促非循环规则保持；长thinking实验独立于court-symbol。动效表现不产生domain事件。

## 写权与运行

你不是唯一writer。使用从实际Courtwork HEAD创建的隔离worktree，分支采用 `codex/agent-presence-design-20260911`（如已存在，先查明归属，另取后缀）。不要checkout/stash/reset共享UI目录。

只新增 `engineering/design/agent-presence-2026-09-11/return-v1/` 下的源、fixture、截图与说明；如已有返件，新增版本目录并记录，不覆盖历史。只读当前App及主题/控件实现来复刻相邻环境，引用固定SHA与路径；不得改app.mjs、styles.css、product-semantics、品牌资产、Spark/Attention导航glyph、site或后端。可在自己的比较面内实现必要的motion/交互，以供Astra实际操作。

这次交付Design与可运行specimen；生产host接线由Astra在当前Claude UI writer返回后统一裁决。保持同一Courtwork工程线，不注册新项目或把worktree作为永久产品目录。

使用独立合成数据、空闲端口及本地静态server。无真实provider、凭据、个人聊天、第三方analytics和外部字体依赖。specimen控制面标注synthetic，仅工具面暴露seed/time/state控件，产品场景内不塞工程参数。

## 必须返回的最小内容

| 文件/内容 | 要求 |
|---|---|
| README.md | 启动命令、输入SHA、作者/模型、文件清单、推荐候选及理由、已测/未测、后续接线点；相对资源路径，无机器绝对路径 |
| index.html及本地源 | 可运行的A/B/C切换比较；flat/soft-depth、尺寸、明暗、reduced-motion、固定时钟与暂停；刷新可复现 |
| assets/ | 原创SVG源，稳定候选ID、viewBox与光学尺寸说明；不把PNG当源，不嵌远程资产 |
| fixtures/ | 可机器读取的状态序列与短词样本；seed和elapsed明确。它是Design fixture，不冒充生产DTO |
| decision.md | 每组使用的参考ID、保留/排除理由、最近实现先例、grammar gap、哪些值为实验值；一条推荐路线 |
| evidence/ | 固定fixture的宽窄明暗PNG，关键帧/简短录屏可选，结果表、失败修正与未测项；候选截图不标golden |
| SHA256SUMS | 返件源/资产/fixture/证据文件哈希，不包含清单自身 |

不要为了填表生成几十个近似图。先做A/B/C同尺寸单色比较，再把推荐组带入两种placement；全局对比页可显示全部尺寸，避免每个参数组合单独截图。

原Chat末轮的四张board、state JSON与185词未返回。依据现有原图和裁决直接开工；不得称新文件为原handoff。先用明确标为本地测试样本的 `Thinking / Pondering / Musing / Considering / Reflecting` 五词与真实工具标签比较；不称这是Claude完整默认词库。若用户后续提供原文件，保留原件/hash后增量映射。

## 状态fixture与交互覆盖

至少覆盖：idle；明确thinking；reading/searching工具活动；两个并发工具；等待用户输入；等待授权；blocked；error；cancel-requested仍活动；实际cancelled；completed；断连unknown。相同视觉可以复用，事实标签和详情必须区分。

固定序列包括thinking→tool→等待授权→恢复→completed、thinking→cancel-requested→cancelled、工具→断连unknown。切换时检验旧文案/定时器不会继续覆盖新事实。文案轮播初值3.5秒（实验值，可调2.5–4秒）；读屏只播必要状态变化，不轮播报氛围词。200% zoom不遮发送；长工具名/长文本不挤走关键输入控件。

作者做定向行为检查与浏览器自检：1440/1280/390、light/dark；键盘进入/退出详情、焦点返回；reduced-motion、forced-colors、深度不支持回退。对工具fixture、尺寸与render做必要检查即可，不跑无关全库测试。实际没测的项逐项记录。

## 返件后：Astra真实视觉调试

用户转交返件后，Astra先核对源/哈希与实际主线，再启动其可运行面，通过真实computer use操作候选、时间冻结/恢复、状态中断、详情、键盘、窄屏与缩放，查看局部、邻接面与完整Chat。

Astra根据真实观察修几何、厚度、节奏和placement，记录作者修改与独立复核范围；修改后做对应增量检查。截图不证明持续疲劳或60/120Hz质量，此类结论需实际设备观察。本片不提前占用一次产品视觉接受，不安排自动发布，也不把Luna索引当成非作者产品验收。

返件时给出固定commit、return目录及精确启动命令；不要自行合入main或替换其他writer的UI。Astra完成视觉裁决后再决定生产集成。
