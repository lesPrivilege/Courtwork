# Chat Space / 设计索引方法论：来源索引

日期：2026-09-09；隔离树基线 `f9bafb697f0ee7d7859914e44a83a581bca1ae23`。本文只登记设计讨论的来源、可复查主张和本轮有界网页核验；不冻结 Courtwork 产品 schema、UI、技术选型或验收结论。

## 原文完整性与 turn 处置

- 私有逐字快照：`chat-space-design-conversation.md`，2,061 行、49,592 字节，SHA-256 `47d44134349301a5a8e3784774b79b491f1760f040e5cca065d88d1402b28ebe`。
- 附件：`chat-space-design-screenshot.png`，2048×1255 PNG，SHA-256 `9ed16f0ef6bce3ca6d3ad84e711933897504ded553bc309d91094fbbc9a6766d`。截图在私有目录保存；根代理已目视，只能证明长文本/代码块的可见结构，不能证明底层 renderer、状态或技术行为。
- 原文完整 5 turn、8 条文本、1 个截图；无 `truncated`、`hasMore=false`。原回答中的 Exa 搜索数量（36、62、71 等）是未附查询与结果集的自述，不作为检索证据。

| turn | 原文范围与内容 | 处置 |
|---|---|---|
| `670e0cb3-81f6-40ce-a9e7-720a80f42346` | 用户引用 anti-slop 设计方法（约 L1–117）；回答形成 Claude Design index、constraints→variants→remove→showcase→preview→review→ledger loop（L118–633） | 作为方法论候选；外部来源逐条列出，未把回答自评的 canonical 等级当验证 |
| `e5ca4780-e333-49d7-ac3c-c10042cc0dba` | 用户询问 user message 的 Markdown；含 1 个截图（L634–641）；回答形成 Message Rendering Index（L645–1506） | 记录 content part/lifecycle、Markdown、安全、source/render 分离；renderer 只按下列主来源核验 |
| `1046840c-b65f-4812-9f01-7dbe991834cf` | 用户单独询问 output Download（L1508–1512） | 无助手回答；不从空 turn 推导选型或 contract |
| `7bab7981-1c03-4d09-8dd0-7ab9e5f86bf4` | 用户补充“也涉及一处局部 UI”（L1514–1518） | 无助手回答；只登记为问题上下文 |
| `ebdc1bfc-29fb-4541-9641-b1153fc0302c` | 用户提出 Ask User/Chat Space（L1520–1524）；回答提出 typed interaction primitives、MCP/AG-UI、artifact preview/download 和 showcase（L1526–2061） | MCP、AG-UI、CopilotKit、下载参考做一手核验；其余链接列为未检 |

原文无可回放的内部 citation 映射；`@Exa`、页面内的链接文字和搜索数量不能替代 URL、版本、行号或抓取快照。此次独立核验与原回答引用分开记账。

## 全部明文 URL 索引

状态：`primary_page_read`=本轮读取原始页面；`indexed_unverified`=只从逐字快照提取，未在本轮读取或页面正文不可读。

| URL（按原文出现去重；Streamdown 出现 2 次） | 状态 | 原文位置 |
|---|---|---|
| https://kylechayka.substack.com/p/why-tech-bros-are-obsessed-with-taste | indexed_unverified | L103 |
| https://ref.tools/blog/how-i-design-with-ai | indexed_unverified（网页提取正文为 0 行） | L172 |
| https://www.hup.harvard.edu/books/9780674627512 | indexed_unverified | L206 |
| https://claude.com/blog/how-the-product-designer-who-built-claude-design-uses-it-to-explore-ideas-before-building-them | indexed_unverified | L245 |
| https://claude.com/blog/claude-design-stays-on-brand-for-daily-work | indexed_unverified | L248 |
| https://storybook.js.org/ | indexed_unverified | L287 |
| https://vercel.com/docs/deployments/environments | indexed_unverified | L335 |
| https://github.com/Owl-Listener/mood-protocol | indexed_unverified | L381 |
| https://github.com/app-builders-club/design-builder | indexed_unverified | L429 |
| https://elements.ai-sdk.dev/components/message?utm_source=chatgpt.com | indexed_unverified | L702 |
| https://markdown-it.github.io/markdown-it/?utm_source=chatgpt.com | indexed_unverified | L727 |
| https://github.com/vercel/streamdown?utm_source=chatgpt.com | primary_page_read | L727, L819 |
| https://github.com/markdown-it/markdown-it/blob/master/docs/safety.md?utm_source=chatgpt.com | primary_page_read | L792 |
| https://github.com/cure53/DOMPurify?utm_source=chatgpt.com | indexed_unverified | L794 |
| https://github.com/remarkjs/react-markdown?utm_source=chatgpt.com | indexed_unverified | L859 |
| https://github.com/open-webui/open-webui/blob/9bd84258/src/lib/components/chat/Messages/Markdown.svelte?utm_source=chatgpt.com | indexed_unverified | L882 |
| https://marked.js.org/?utm_source=chatgpt.com | indexed_unverified | L908 |
| https://shiki.style/guide/best-performance?utm_source=chatgpt.com | indexed_unverified | L964 |
| https://github.com/danny-avila/LibreChat/blob/eaef87fa/client/src/components/Messages/ContentRender.tsx?utm_source=chatgpt.com | indexed_unverified | L1079 |
| https://docs.showcase.copilotkit.ai/ag-ui/introduction | primary_page_read | L1568 |
| https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation | primary_page_read | L1593 |
| https://docs.copilotkit.ai/human-in-the-loop | primary_page_read | L1657 |
| https://claude.com/docs/claude-science/artifacts | indexed_unverified | L1926 |
| https://learn.chatgpt.com/docs/artifacts-viewer | indexed_unverified | L1929 |
| https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker | primary_page_read | L2014 |

## 本轮一手网页核验

- [MCP Elicitation specification](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation)：页面当前说明 `form` 与 `url` 两种 mode；form 用受限 JSON Schema，URL mode 将敏感交互置于 client 外；response 明确为 `accept`、`decline`、`cancel`，并要求显示 server、给用户 decline/cancel 和 consent 控件。页面另注明 URL mode 于 `2025-11-25` 引入且可能继续变化。因此可作为 interaction contract 参考，不能直接当 Courtwork 已实现规范。
- [AG-UI Overview](https://docs.showcase.copilotkit.ai/ag-ui/introduction)：官方页面将 AG-UI 定义为 event-based、双向的 agent↔user protocol，并列出 streaming 的 cancel/resume、typed attachments/provenance、frontend tool calls 与 interrupt 的 pause/approve/edit/retry/escalate；这是协议/产品文档主张，不是本地 runtime 验证。
- [CopilotKit HITL Overview](https://docs.copilotkit.ai/human-in-the-loop)：官方示例展示 `useHumanInTheLoop`、渲染自定义 picker、通过 `respond` 返回用户结果和 `status`；它证明一种 UI integration pattern，不能证明 Courtwork 的 policy-enforced interrupt、resume 或提交权。
- [Vercel Streamdown](https://github.com/vercel/streamdown)：本轮读取的 GitHub 默认分支 README 页面称其为面向 AI streaming 的 `react-markdown` 替代，处理未闭合 Markdown，并列 GFM、Shiki 与 `rehype-harden` 安全渲染；未固定上游commit；依赖安装与版本兼容仍未在 Courtwork 运行。
- [markdown-it Safety](https://github.com/markdown-it/markdown-it/blob/master/docs/safety.md)：官方 safety 文档建议默认不启用 HTML；启用 HTML 时使用外部 sanitizer。它支持 rendering boundary 的安全约束，但不替代具体 parser、URL policy 或 sanitizer fixture。
- [MDN `showSaveFilePicker()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker)：当前页面标为 Limited availability、非 Baseline、experimental 且要求 secure context；因此只能作为渐进增强参考，不能成为基础下载 contract。

## 从原文保留的候选方法（未视为已冻结）

- 把聊天建模为 typed interaction space：message、attachment、tool activity、human input、approval、artifact、preview、download、citation 等 content part 与 lifecycle 分离。
- static user Markdown 与 streaming assistant Markdown 可以共享语义层，但执行路径不同；source/editor 与 rendered view 分离，历史内容收敛，创建时可展开。
- 原讨论建议preview representation 与 downloadable source分成两个对象；本仓裁决只要求明确原件/表示关系，原文件可直接预览时不强制复制对象。下载应取标明的确切原件或显式导出表示。文件名、MIME、大小、checksum、版本、provenance 仍需沿既有 Runtime/Work 合同决定。
- Ask User 的 model-initiated clarification 与 runtime-enforced approval/interrupt 共享 UI 外观但不共享 authority；`accept/decline/cancel` 不能被压缩成一个布尔值。
- 第一轮 showcase 可覆盖 `pending/active/resolved/error/narrow` 状态；这只是设计实验边界，不产生实现任务或产品验收。

## 未检与披露边界

- 其余 19 个 `indexed_unverified` 链接保留在上表；其中 Claude Artifacts、ChatGPT Files、LibreChat、Open WebUI、Marked、Shiki、DOMPurify、AI Elements 等的成熟度、版本、许可和具体实现均不能从本索引推出。
- 未核验 browser compatibility、下载 bytes/MIME、Markdown XSS、streaming diff、interrupt persistence、resume/retry、focus/keyboard/a11y、真实数据 preview 或移动窄屏行为；没有安装依赖、运行 provider、构建 showcase 或改产品代码。
- 下一次只在明确消费者后做独立 fixture：Markdown unsafe URL/HTML、static/streaming parser、artifact source/preview MIME 对照、Ask User 的 accept/decline/cancel 与 policy interrupt/resume 状态机。原文和网页都不授予自动采用权。
