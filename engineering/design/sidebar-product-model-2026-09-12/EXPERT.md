# Expert · Quiet profile前端接入

2026-09-12 · 基线main 1b8bd3c；隔离分支codex/expert-sidebar-glyph-20260912。用户授权绘制icon并前端注入，后端仍后续计划；另要求Luna explore。Luna只读提出Quiet profile与静态planned身份行，Astra负责本轮几何与前端实现，作者检查不冒称独立视觉接受。

## 产品意图

Expert帮助用户找到能够承担某一类工作的专长。图标以开放的头颈侧影表达“有专长的角色”，保留可见名称，不用认证章、勾、芯片或工程节点解释它。备选role folio因容易与Skills/book-open相撞而未采用。图形没有状态变体，不代替正式接受、权限、模型或当前助手Presence。

sidebar在Spark之后增加Expert与简短Planned文字，为产品身份预留位置。它是静态可读行，普通对比度，无hover/pressed、按钮、链接、tabstop、aria-disabled或handler；没有创建工作/选择Expert的交互。尚无专门目的地时，不把用户带去无关Runtime配置。后续可用工作面形成后再替换这一占位，不把整条路线锁死为永久导航结构。

## 现有接缝与变更

最近实现先例为1b8bd3c的[产品glyph接入](../product-icons-2026-09-11/README.md)：app/web/app.mjs三席导航、ui-controls.icon、semantic-controls.semanticIcon、同一vendor sprite。Expert沿同一链路，`expert.role`仍为Object/domain，ownerRef仍指向Work Core合同；只准入App identity glyph，Pages仍text，capabilityRef=null不授予任何动作。

唯一源为[expert.svg](../../../tools/ui-vendor/courtwork/expert.svg)，24网格、2px round/currentColor，与既有通用族同尺度。sources.json登记原创来源与SHA；build.mjs --icons-only、product-semantics.mjs --write、contact-sheet.mjs生成sprite、registry投影与16/18/20/24明暗样张。sidebar现有CSS把所有nav glyph光学显示为16px，本次与相邻Chat/Attention/Spark一致；函数声明20px不冒称实际渲染20px。

受影响grammar是产品identity准入与静态预留行。保留导航顺序、标签、密度、颜色roles、Settings与所有既有点击路径。不换Lucide族、不更改Runtime/Core/schema/provider。app/docs/attention-agent.md仅更新sidebar预留事实，Expert委派、发布和绑定仍未交付。

## 验证与后续

[本轮证据](../../../evidence/expert-sidebar-glyph-20260912/README.md)含实际App独立数据/端口、1440/1280/390明暗全场景、Tab跳过静态Expert到搜索、Escape关闭窄屏导航并返回开关，以及来源/生成/静态manifest定向19项通过。完整产品模型与其他sidebar对象仅[审阅探索](README.md)，未批量改名或搬移入口。
