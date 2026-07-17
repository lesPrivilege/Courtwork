# AnySearch 与检索类 plugin 生态定位（2026-07-17）

调研原稿，不具约束力。速查 anysearch.com（自称 agent 检索基础设施，API/MCP/Skill 三形态，23 垂类标签含 legal/ip）。

## 厂商速查结论

成色弱：发布仅两月（2026-05-11）；PR 称 4000+ star 与实测约 500 明显不符；**法律垂类真实数据源查无实证**（无任何独立信源证实接中国裁判文书/北大法宝类专库，`zone:cn` 只是路由参数，大概率通用 web 检索+标签路由伪装垂类）；隐私宣称营销层（zero-logging 无审计佐证，SKILL.md 自身风险提示与之相抵）；其「Skill」是自定格式非 Anthropic 官方规范；中国合规信息空白。同类赛道 Exa/Tavily/Brave 成熟度均高于它。**仅入通用检索 plugin 候选池最低优先级观察，不作任何生产依赖。**

## 架构定调（产品负责人 2026-07-17，与 generic-connectors-tier 一脉）

1. **检索类 skill/plugin 生态丰富且理论可兼容，对上下游都 cheap——但核心资产不变**：垂类语义、锚点、事实等级、确认账本全在 schema/秩序层；检索工具是最后一公里的铺设，走左栏 plugins 位（通用办公接口同档），不进 schema、不碰 core。
2. **接入三原则**（日后任何检索 connector 适用）：具名 connector 接入（named profile 政策同构，不猜能力）；fail-closed（不可用/超时显式，零静默降级）；**事实等级铁律——外部检索结果永远是「未经锚定的外部线索」等级，不得进入锚点链或与卷宗事实混写**，模型引用检索结果必须显式标源且系统判级。
3. 中文法律检索的真专库（裁判文书/法规库）若未来接入，属垂类语义资产，走 schema 侧另案拍板——与通用 web 检索的 plugins 位分属两层，不混。

来源：anysearch.com/pricing、github.com/anysearch-ai 两仓、PRNewswire 发布稿（自报）、mcpmarket 条目；独立信源缺失本身即结论之一。
