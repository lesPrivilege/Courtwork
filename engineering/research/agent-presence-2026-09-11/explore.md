# Luna fast explore · 本地召回与Astra处置

2026-09-11；Luna low effort只读，基线 `ec240e7a3ff06ba25d4d9e8d1bc82ad45786d0ab`。未改文件、未联网；为来源召回，不是产品独立接受。

| 入口 | 可消费先例 |
|---|---|
| [Scout](../../design/scout/README.md) | 发现→成熟产品局部→规则→行为primitive→一变量specimen→本地裁决；motion按60fps/transitions/beUI召回。仅候选，不将donor当状态owner。 |
| [前端规范](../../design/agent-interface-2026-09-10/frontend-contract.md)、[先例](../../design/agent-interface-2026-09-10/precedents.md) | 四类合同、nearest precedent、固定基线与验证；identity/motion尚有grammar gap，不能直接标canonical。 |
| [Atlas](../../design/atlas/README.md) | running≠progress、estimate≠meter、unknown≠0、cancel requested≠stopped；纯adapter不持有时钟/fetch/cache。 |
| [品牌合同](../../../brand/CONTRACT.md) | court-symbol由宿主驱动presence/authority/activity，play不发业务事件。140ms默认、整段不超220ms、不循环，reduced-motion静态；complete不代表Review接受。 |
| [UI controls](../../../app/web/ui-controls.mjs)、[semantic controls](../../../app/web/semantic-controls.mjs) | icon/setAction/action及semanticPresentation/semanticIcon/semanticAction/setSemanticControl可复用；动作权限与handler仍属调用方。 |
| [产品语义registry](../../design/product-semantics/registry.json) | 产品glyph语义与生成链的最近先例；generated文件不能手改。 |
| [产品glyph](../../design/product-icons-2026-09-11/README.md)、[返件](../../design/se-control-one-shot-2026-09-11/return-intake.md) | 16/18/20/24光学、邻接辨识、manifest/hash/parity、forced-colors与200%验证方法可复用；旧造型方向以current中的最新重设计裁决为准。 |
| [Attention合同](../../../app/docs/attention-agent.md)、[投影](../../../app/web/presentation-adapters.mjs) | 运行/工具与用户等待的宿主事实入口；嘴型仅显示事实，不新建状态库。 |

## Astra 对探索回执的收敛

Luna提出沿registry→semantic-controls→sprite→host接入。这是静态产品glyph的最近先例，**不预先裁定动画presence必须塞进同一sprite生成链**。静态fallback可以复用该模式，动画路径需要独立specimen与接口裁定。品牌包的三轴也不能挪作Run的新字段。

现有brand短促非循环合同与thinking长期氛围存在明确差异：AP-02在独立研究specimen验证，不修改brand合同；未来若引入循环，只限有活动事实、可暂停的局部表现并单独裁动效参数。状态adapter保持无时钟，elapsed/seed仅传入geometry及文案采样层。

Scout外部候选仅按需召回；没有取得donor固定源码/许可前不采依赖。原会话的bloub与agent-robot-avatar保留为方法/API研究候选，Rive/WebGL/Flutter不选为首片运行时。

共享writer冲突面为app.mjs、styles.css、semantic-controls、product-semantics生成链、vendor/icons.svg及Spark/Attention views。AP-01只写本研究包和current登记；后续几何specimen独立目录，实际host接线在同一Claude UI返回后重读HEAD、合同与文件写权。最新Spark/Attention形象重设计裁决优先于旧fan-out/ring造型记载。

实际影响grammar：identity/motion候选扩展、运行状态纯投影、局部披露placement。最近实现先例：ui-controls与semantic-controls的图形/动作分离、presentation-adapters纯投影、brand短动作的reduced-motion；本轮没有改变这些关系。
