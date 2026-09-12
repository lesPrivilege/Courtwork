# 来源与证据范围

读取日期：2026-09-12。Repository 固定基线：`1ac28980c4877f4a86adf586aeb1b66980e23504`。

Exa 共 7 次检索、35 个结果位（含重复），按上游通道/政策、容器安全、数据与组织三个主题消费；另对选定官网与 repo 回读。35 不是独立验证来源数，也不是被采用项目数。只采用下面列出的原始官方/仓库资料。

政策文件为本轮取得的页面，不等于对任一账号或分发方式作 blanket 法律核准。网页后续变化不自动改本文；实现前核准接入时应重新固定必要版本和支持条件。

<a id="r01"></a>
## R01 · CourtWork Chat Memory Broker

- 来源类型：fixed-repository
- URL：https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/chat-memory-broker-2026-09-12/README.md
- 消费与限制：已读固定版本。Provider Session、投影、Broker、Compiler 与各状态 owner 分离；BE/LG/RG 为后续消费入口。本文不是已实现证明。

<a id="r02"></a>
## R02 · CourtWork Chat 薄能力层

- 来源类型：fixed-repository
- URL：https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/chat-memory-broker-2026-09-12/thin-capabilities.md
- 消费与限制：已读固定版本。人主导 Chat、可选来源、禁止用 wrapper 宣称接管 Provider 全部能力；未来独立 Chat 不追溯改掉当前项目 Session。

<a id="r03"></a>
## R03 · CourtWork RD-007

- 来源类型：fixed-repository
- URL：https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/RD-007-resource-governance.md
- 消费与限制：已读固定版本。内容 Resource 与 Runtime Resource 分开；LG/DS/BG/Runtime/Core 原 owner；资源保留、关系、正式接受分轴。

<a id="p01"></a>
## P01 · OpenAI Terms of Use

- 来源类型：official-policy
- URL：https://openai.com/policies/terms-of-use/
- 消费与限制：本轮页面标注 2026-01-01 生效。个人服务条款限制自动/程序化提取及绕过保护；API/商业服务另有条款。内容权利不等于任意接入许可。

<a id="p02"></a>
## P02 · Anthropic Consumer Terms

- 来源类型：official-policy
- URL：https://www.anthropic.com/legal/consumer-terms
- 消费与限制：本轮页面标注 2025-10-08 生效。限制未经许可的抓取和自动访问；API 或明确允许的方式另论。商业发布还需核实际协议与产品适用性。

<a id="p03"></a>
## P03 · ChatGPT 官方数据导出

- 来源类型：official-support
- URL：https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data
- 消费与限制：官方提供账号数据/聊天导出路径。实际计划与组织权限须核对；不提供可据此假设的实时同步、稳定导出 schema 或附件完整保证。

<a id="p04"></a>
## P04 · Claude 官方数据导出

- 来源类型：official-support
- URL：https://support.claude.com/en/articles/9450526-export-your-claude-data
- 消费与限制：官方个人账号导出覆盖会话与账号数据，组织账号另按 owner 路径；文档也说明导出不等于个人账号间的原生导入迁移。

<a id="p05"></a>
## P05 · ChatGPT Developer mode / MCP apps

- 来源类型：official-support
- URL：https://help.openai.com/en/articles/12584461
- 消费与限制：官方提供自定义 MCP/app 通道，读写能力依计划与管理员策略；Pro 页面列有 developer mode 的 read/fetch。远端接入或受支持 Secure MCP Tunnel 与本机直连不同。

<a id="p06"></a>
## P06 · Claude remote MCP custom connectors

- 来源类型：official-support
- URL：https://claude.com/docs/connectors/custom/remote-mcp
- 消费与限制：官方支持自定义远端数据/工具连接，认证与 scope 需配置；不是原生聊天全量导出接口。

<a id="p07"></a>
## P07 · Claude Desktop local MCP

- 来源类型：official-support
- URL：https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop
- 消费与限制：官方本地 MCP/desktop extension 接入可作本地只读 bridge 候选；工具返回给模型仍是披露，不等于数据从未离开本机。

<a id="t01"></a>
## T01 · Electron Web Embeds

- 来源类型：official-technical
- URL：https://www.electronjs.org/docs/latest/tutorial/web-embeds
- 消费与限制：iframe 受来源 CSP 限制；文档不推荐依赖 webview tag，并列 WebContentsView 等替代。支持嵌入机制不意味着上游允许抓取或第三方包装。

<a id="t02"></a>
## T02 · Electron Security

- 来源类型：official-technical
- URL：https://www.electronjs.org/docs/latest/tutorial/security
- 消费与限制：远端内容不开放 Node；context isolation、sandbox、权限/导航/IPC 检验；不能关闭 webSecurity 求兼容。浏览器安全维护不能无限冻结。

<a id="d01"></a>
## D01 · Zotero Collections and Tags

- 来源类型：official-technical
- URL：https://www.zotero.org/support/collections_and_tags
- 消费与限制：对象可属于多个集合而不复制；删除集合与删除对象分开。消费身份/关系/视图分离，不照搬其权限与库实现。

<a id="d02"></a>
## D02 · SQLite FTS5

- 来源类型：official-technical
- URL：https://www.sqlite.org/fts5.html
- 消费与限制：FTS 可作可重建索引；external-content 一致性需显式维护。trigram MATCH 对不足三个 Unicode 字符的子串不匹配，短中文查询必须另测。

<a id="d03"></a>
## D03 · W3C PROV-DM

- 来源类型：official-standard
- URL：https://www.w3.org/TR/prov-dm/
- 消费与限制：Entity/Activity/Agent、使用、生成、派生、归属可借鉴为来源语义；不据此宣称完整 PROV 互操作或专业正确性。

<a id="d04"></a>
## D04 · W3C Web Annotation Data Model

- 来源类型：official-standard
- URL：https://www.w3.org/TR/annotation-model/
- 消费与限制：TextQuote/TextPosition 可借鉴为引用锚点；位置在变化文档上脆弱，需固定 source state/representation 与坐标约定。

<a id="d05"></a>
## D05 · OpenLineage Object Model

- 来源类型：official-technical
- URL：https://openlineage.io/docs/spec/object-model/
- 消费与限制：区分数据、处理定义、处理运行及输入/输出。借用处理来源和运行状态记录，不把 COMPLETE 当 Core 接受，也不引入整个平台。

## 附件基线

上轮 v2 以当前会话真实附件为源，身份/bytes/hash 见 `prior-inputs.json`。本包只引用其现有主线，并不将其产品能力标为已接受。未复制、修改或重新签署上轮原件。

本轮未取得任何用户真实会话导出作为产品测试输入；未验证所有 Provider 的 wrapper 登录政策；未找到足以支持“普遍、实时、完整原生聊天自动同步”的公开统一许可/接口证据。官方导出与只读 connector 已足以为首片提供可行的独立路径。
