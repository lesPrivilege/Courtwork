# 用户输入索引 · Chat Context / Memory Sidecar

来源：2026-09-12当前用户直接粘贴的连续想法与讨论。这里是主题摘录与索引，不是完整逐字会话导出；没有另行读取外部会话、核验供应商功能或执行文中的示例调用。

用户处理要求：

> 以下想法，如果裁定不涉及发布面定义，就只登记入账，已经有相关 pr 可以合并以备消费。

| 输入段落 | 保留的主题 |
|---|---|
| 最初想法 | 封装不同Provider，投影时保留本地产出，以薄层注入/工具读取本地memory；内部context不成为用户输出 |
| 用户补充 | 通过provider侧登记的MCP或插件，让模型渐进检索本地受控对话数据，实现跨Provider合流 |
| Context/Memory Sidecar | capture→govern→retrieve/compile→ephemeral context→provider→CW conversation projection；不再造完整agent loop |
| 三份turn材料 | visible transcript、model-visible context、CW trace分开；保存来源、选择理由与编译版本 |
| Memory解耦 | 同一用户治理的memory可由不同Provider消费；provider原生memory可能关闭或opaque；不依赖其可迁移性 |
| 三种通道 | 正式context/tool通道、CW控制API请求、消费级Provider网页分别核能力；不承诺所有网页可加不可见system消息 |
| Compile / Retrieve | CW预选上下文与模型按需请求可以并存；都由本地policy裁切 |
| Turn inspector | 默认不展示内部块，可按需查看本轮context条目、来源与未知provider memory |
| Local Memory Broker | MCP是访问协议；Broker是披露/控制责任；Conversation/Memory/Matter各自持有真源 |
| 窄接口候选 | search_context / read_context / get_thread / get_matter_state；避免任意read_file或SQL访问 |
| 读写不对称 | search/read/cite与propose_memory分开；提案先检查来源、冲突、去重和目标，不直接写长期memory |
| 跨Provider归因 | Provider是provenance，不把供应商品牌天然当成个人memory分类轴 |
| 工具描述 | 少量说明存在可检索的CW context服务；仅需要时渐进读取；成本收益为设计动机，未经测量 |
| Trust boundary | 身份、conversation、Court/Matter、memory类别、query/result预算、敏感策略、audit；网页/附件诱导不能扩大权限 |
| 长期结构 | Provider Session + Local Conversation Projection + Governed Memory Sidecar；Context来自用户治理状态而非模型所有物 |

输入中的Provider支持情况、节省token/改善效果、示例授权表、API名字与UI数量均为设想；未作为当前能力或定量证据采用。具体裁决与既有PR消费路径见[登记](README.md)。
