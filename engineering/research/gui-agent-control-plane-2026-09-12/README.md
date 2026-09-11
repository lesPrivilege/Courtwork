# GUI Agent 后端与控制面 grammar · Astra裁决

2026-09-12，实际基线 `main@647bc2167efe5437d0ca73a60a406549d9a1e268`。用户要求 Luna explore、Astra裁决并推荐立时消费。输入是《GUI Agent 后端选型探索》两轮四消息；[原始工具快照](conversation.json)完整返回 `hasMore:false`。图片轮播只有引用，无附件，未把未见图片当视觉证据。对话中的外部产品能力与示例计数是研究输入。

## 已裁，立即进入既有路线

采用“同一批资源的多种投影”和 Agent-created draft → review → explicit apply → next-Run binding 的方向。CW已经有Host control plane，不新建 Capability Registry 或 State Registry；Memory继续归其状态owner。第一施工切片收敛为**声明式Skill提案**，并账既有BE-6/BE-7（Runtime R4/R5），见[可施工边界](skill-proposal-slice.md)。本次交付裁决、来源核验和合同细化；未实现提案API、model tool、草稿UI或第三方安装能力。

| 原建议 | 现有事实与裁决 |
|---|---|
| 薄Capability Registry | [control-plane.mjs](../../../app/runtime/control-plane.mjs)已持有资源、scope、exposure、profile、policy、revision；沿同owner扩展，禁止复制第二份enabled list |
| Agent自行创建后浮现 | 当前只有host的声明式`put`及inspect-only resolver；缺proposal持久化、人审与精确apply。按BE-6/7补这条链，聊天中的“已创建”不成为资源事实 |
| Skill标准兼容 | 保留既有frontmatter解析与metadata-first/body-on-load；格式、发现路径、脚本/资产加载分别声明兼容程度，不把语法解析叫完整包兼容 |
| Plugin / MCP manager | 当前plugin仅trusted builtin；MCP为显式Streamable HTTP连接。外部catalog只作discovery adapter候选；导入格式、信任、执行、认证分别处理 |
| Memory管理 | 现有Attention retained conversation读工具不等于通用Memory CRUD；不借新管理页推导持久Memory provider已经存在 |
| Runtime真正消费 | 复用compile、runtime_load与历史binding；installed/running/exposed/permitted和实际used保持分开，下一Run生效，重试不换旧binding |
| Draft → Apply/Discard | 采用可视diff与精确版本决定；不采用Agent自动enable或替用户扩大权限。模型能提案不意味着能approve/apply |

Luna对代码进行了有界只读探索；Astra读取resolver、control plane、HTTP/资源合同与既有BE请求后裁决。第二个session的只读后端探索也确认缺口，但不构成实现接受。[Runtime index](../../../docs/runtime-control/INDEX.md)、[resolver](../../../docs/runtime-control/source-resolver.md)仍是当前能力事实入口。

## 前后端合流的grammar

“Inventory / Bindings / Runtime / Permissions”采用为用户问题分类，暂不增加四个顶级页面或迁移导航。最近实现先例为[Runtime Workbench](../../../app/web/runtime-view.mjs)、[Settings](../../../app/web/settings-view.mjs)以及已有资源/权限合同；按[frontend continuity](../../design/agent-interface-2026-09-10/frontend-contract.md)消费。

| 投影 | 采用方式 | 数据前提 |
|---|---|---|
| Catalog / list → inspector | 目录用于定位，详情承载scope、来源、版本与动作；长描述进入详情 | 只显示owner实际返回的字段，未知保留未知 |
| Profile / toolbox | 复用agent_profile组合和真实资源引用 | 组合不能扩张host权限，不虚构Expert routing |
| Policy blocks / matrix | 延续现有allow/ask/deny、scope与CAS；diff展示本次变化 | 不把exposure开关等同permission，也不承诺无损manifest双向编辑 |
| Typed relation | 有具体查关系任务时作为次级视图 | 类型来自owner合同；无边事实不画推断线 |
| Observed topology | 后续从真实调用证据投影 | 配置关系、允许关系、实际调用分别呈现；无trace不画“12 calls” |

优先让对象事实、数量、关系、scope与实际状态减少解释文字；不以更多卡片或glyph代替事实。现有Review、危险、焦点及材质语义不因换面而变。此轮无UI代码变更，无新视觉基线。

## 来源与验证

外部选型核验见[source-review](source-review.md)；未核实的Letta、Dify、Docker、ToolHive、Open WebUI和控制面板细节保留为donor候选，本裁决的授权与owner边界由CW现有合同支持，不依赖供应商宣传成立。

本轮文档链接检查记录于前端节点最终回执。未跑真实provider、未读取个人credential stores、未执行外部install。既有Runtime R2获取、R3兼容、R4/5完整事务与R6 Expert门没有因本研究而关闭。

Luna最终有界复核确认：BE-6完整字段与批准摘要、BE-7 current pointer/fail-back及Proposal/Apply/Rollback/DecisionReceipt持久记录、active-Run期间独立proposal ledger revision三处已补齐，无新增material issue；这只是合同复核，不是实现接受。原始对话JSON SHA-256：`71c03d2016da18ffa2f41ce15f8ed83d9ce71aaec59889073558e10a5b20064c`。
