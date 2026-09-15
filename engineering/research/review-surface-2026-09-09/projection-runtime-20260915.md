# 多源投影与Runtime Review协议 · 新5轮登记

2026-09-15，Astra消费裁决；Courtwork main `7e1a1ff047721e1ca6c871deba7f367ccea55a06`，保留其他writer在途修改。接[Gateway](presentation-gateway-20260915.md)、[Presentation](presentation-20260914.md)和[原CodeRabbit消费](README.md)，不新立路线或实施产品。

## 来源差量

「Chat状态可视化编排」`6aa76e0c-3c90-83ec-9d15-2ed027159801`的[本轮返回](chat-states-runtime-input-20260915.json)完整10 turns/20消息，hasMore=false。与[前5轮快照](chat-states-increment-20260915.json)逐turn ID/完整items比较：新增5、旧项修改0、删除0。新增轮次如下，原快照保留。

| Turn ID | 主题 |
|---|---|
| 4731e6b1-8432-4fdc-a443-cc24ec3738c4 | Ask User/File Changes等特殊卡片与共享投影primitive |
| 5e6e3f75-8d27-477a-8fc8-aec0e5093309 | Frontier公开交互、assistant-ui实验及其他开源参照 |
| 19daaf13-09b6-425e-9345-60b18ead47ab | Command Projection、Resource Preview、多媒体与Browser边界 |
| 9b9431fb-47fa-4006-9d9f-d05df8d7d686 | DeepSeek Harness预制renderer、presentation intent及专家schema |
| acfb7ec1-86c5-470d-af5c-6be216ae6e69 | Runtime可替换性与Review协议、作者/事实/检查分源 |

返回2个附件引用。新增[Edited files截图](edited-files-reference-20260915.jpeg)已目读并按原字节保全：可见本任务上一轮登记答复及Edited 5 files、Review changes、Undo、Review、文件列表。它证明可观察的卡片结构，不证明按钮实际行为或ChatGPT/ChatKit私有代码关系。旧IMG_2455本次未重读，沿原证据；快照中的临时路径仅保留工具返回来源，不作活跃附件入口。

## 原owner下的裁决

| 输入 | 处置 | 本地采用与限制 |
|---|---|---|
| Chat是异构投影宿主 | adopt | 共存prose、Runtime状态、人类输入、工作回执、模型Presentation与资源预览；可共享primitive/placement，但不将全部非Markdown内容纳入Presentation Gateway。typed parts是目标接缝，不声称现有消息schema已迁移。 |
| Ask User/File Changes等祖先类型 | adopt / adjust | 在原Question/Permission、文件/产物和Preview合同上做共存验证；答案、工具授权、工作接受、Review/Undo分别路由原owner，不强制重构全部旧卡片。文件变更数量取真实mutation/版本证据，不解析模型“已修改”正文造事实。 |
| Command Projection | adopt / adjust | 受支持命令可直接查询Host事实后投影，不必经过LLM。接[Object Command](../../design/object-command-grammar-20260914.md)的适用条件/可执行性与单一owner；/context、/usage、/files等仅候选名称，不承诺命令已支持。自动阈值提示需要真实计量/触发合同，不因renderer存在就创建通知。 |
| Resource Preview与Generated Presentation分开 | adopt | 资源使用[RD-007](../RD-007-resource-governance.md)精确owner-backed ref/revision/representation；模型只请求已获准资源，Host解析后选renderer，不把整个PDF/视频复制进PresentationSpec。缺字节、不支持格式和权限变化有明确fallback。 |
| 音视频与HTML预览 | adopt / defer | 播放/暂停/seek可属视图状态；转录/生成notes是派生工作，片段作为Evidence走原Core来源/候选合同。远程媒体取数仍是数据披露/网络行为；HTML不按扩展名自动信任，执行与sandbox需独立adapter。格式支持、编解码与字幕可访问性待实测。 |
| Browser Snapshot与Live View | adopt / adjust | 快照保留来源版本及捕获范围；live navigation/session/auth/actions归[Browser owner](../browser-capability-2026-09-09/README.md)。Preview承载viewport不取得控制权，打开预览不授权导航、登录或执行；不用截图宣称实时浏览器已接线。 |
| 外部assistant-ui原型 | defer | 登记为可选隔离实验，验证异构parts、同实例placement、typed action往返和渐进catalog。不是CW必经迁移或本轮创建fork授权；实验成功仍须回到当前原生DOM/Host接缝验证。LibreChat/Open WebUI只作按具体问题阅读的来源候选。 |
| hot-plug ≠ 每次codegen | adopt | 动态装卸、预编译registry和模型schema是不同责任；专家设计可沉淀字段/来源/错误/动作及无障碍约束。专家schema不自动赋予法律或其他领域正确性；示例obligation字段不覆盖现Work Contract。 |
| presentation intent + generic fallback | adopt / adjust | 可选intent改变呈现时，必须保持原回答/动作语义。未知intent只有在基底schema与动作仍完全理解时才能退回generic；未知或扩权动作仍拒绝，不以fallback绕过验证。 |
| 可替换Runtime与可Review分轴 | adopt | 接[五层架构的Runtime替换矩阵](../architecture-node-2026-09-13/architecture.md)，review metadata为可选adapter增量；普通Runtime按实际可观测事件给基础回执，缺失mutation/命令结果明确unknown，不能靠推断补齐。 |
| AUTHOR / FACT / REVIEW三来源 | adopt / adjust | 作者intent/invariants/risk是注释；Host记录实际执行及覆盖；检查记录检查者、方法、版本、结果与范围。作者跑测试可是真实测试事实但不是独立检查；独立checker也不自动成为人的正式接受。所谓verification字段不能自证。 |
| ReviewUnit、change cohorts与Review Compiler | adopt / adjust | 采用为原Review Surface派生阅读结构，引用确切变化/来源/版本、依赖、未决及owner提供的动作。不新建ReviewUnit真源或通用审批API；保留原diff/来源顺序、未分组项及失败/风险，semantic不可用仍可读原件。 |
| R0–R3/Frontier能力分级 | adjust | 改为按adapter实证列能力矩阵，不以品牌或“Frontier”推定更高权限/检查质量。review hints可选，缺席不阻断已有执行与正式Review路径。 |
| 护城河低、80–90%预编译及外部成熟度 | defer | 保存为原讨论判断，不作为工程事实、采用比例或商业结论；具体技术/产品效果需独立证据。 |

## 外部引用登记与核查缺口

本轮接收的是Chat中的二手技术主张，未重新浏览供应商官网、拉取上游代码或运行外部项目。原回答的内部搜索citation ID无法充当可复查的固定源码；以下全部为待核索引，不代表当前功能已证实。前轮[官方核查](visual-orchestration-20260915.md)的有限范围保留，不能扩成这轮所有主张已核。

| 线索 | 后续固定什么证据 |
|---|---|
| OpenAI ChatKit异构items、Apps data/render tools、deferred tools | 官方模型/SDK版本、精确API与回执语义；公开SDK不能证明第一方私有实现 |
| Claude inline visual/Artifact/MCP Apps生命周期 | 官方产品/协议来源与日期，保存/消失/展开语义；CW placement改变不得自动改变保留或接受 |
| assistant-ui / LibreChat / Open WebUI | 固定repo SHA、许可证、part/renderer/action接口及最小可运行行为；原文首选不等于本地选型 |
| DeepSeek Harness ui-tool、userQuestions/plan-review、workflow-run、deliverables、sidebar/document registry、Cordis slots | 固定上游SHA/path、schema/卸载/fallback/文件mutation来源；明确已实现与issue提案，9月4–5日及“最近”主张待核 |
| dsh-webui、DSH-Right-Sidebar、DeepSeek Flow | 先确认项目身份/来源、维护版本与信任模型；社区实现不等于upstream协议 |
| CodeRabbit Change/Review Stack、Semantic Diff、independent review | 接本owner既有[source index](source-index.md)，固定本轮新增官方来源/版本再消费，保留9月9日已裁边界 |

## 接原工单的最小验证

1. 原facts纵切继续，额外用已有Question/Permission、真实文件回执、Presentation验证同流共存；错误owner、重复/迟到回答、取消/恢复、未知action均不能串路由。不将所有卡片变成一种approve。
2. Command只读fixture与模型请求同一对象时，同版本事实一致；未知/无权限命令不调LLM猜状态。资源预览覆盖精确旧版本、缺件、撤权、unsupported MIME及失败恢复；没有已实现reader就不显示假播放器/浏览器能力。
3. 两个合成Runtime adapter各输出实际支持的events；一方有review hints、一方没有。篡改作者verification字段、遗漏文件、缺来源、旧revision、分组漏项都不得产生接受或隐藏原始变更。
4. 校验每个Review判断可回源，作者自述/Host执行/独立检查/人的决定分列；同一候选仍沿Core原typed action、basis/generation及幂等合同。额外语义元数据不成为换Runtime的新强制门。
5. 未来UI施工再沿[frontend contract](../../design/agent-interface-2026-09-10/frontend-contract.md)核完整页面/明暗/窄屏/键盘与媒体适用性；本轮图片仅输入参考。无Runtime替换、媒体支持、新命令或独立产品验收声明，不打断RD-006。

本轮Astra登记，不复用前轮Luna署名作为本轮探索/验收。未改产品、schema、依赖、PAPER或历史快照，未commit/push/部署。

验证：Python按完整items比对新增5/修改0/删除0；`node tools/check-doc-links.mjs`通过（1345文档、7450链接），`git diff --check`通过。输入JSON SHA-256为`22278b638e42cd83e984b97e5224f18db1caa9da0ca60999cd297357b8ed9194`，新增截图SHA-256为`0ee990a247e4f39ea4a32a01b9e72803430fcb8b2ce1bbf1600ad5cb913bf3ab`。未跑产品测试/浏览器，图片检查不等于交互验证。
