# 给 Claude 的独立前端绘制与 motion 任务

请完成 Courtwork 的 WO-ATT-UI02：Attention items 前端 UI 与 motion 候选实现。你是本轮独立绘制作者，Astra 在你交回后裁决、独立验收并合入；请不要将自己的检查标记为独立接受，也不要直接合 main 或部署。

请从本目录 README.md、layers.md、references.md、acceptance.md 开始，按索引读取必要源码、合同和截图。交接包保留仓库相对目录结构，PACKET-MANIFEST.json 记录逐文件 SHA-256 和固定产品基线。源文件供阅读和提取，不含可运行后端；请自建不访问真实服务的合成数据预览，并清楚说明启动方法。

目标是让 Attention 的“扫描 → 理解 → 决定 → 确认结果 → 返回”形成连贯的界面。独立做出完整视觉和可操作前端，不只提供文字建议或静态图片。沿 Courtwork 已有语义/token/icon 体系，主动决定布局、空间、密度与 motion；不要机械复制参考图。主场景包括五种真实状态、筛选/分页、选中详情、Why/Next step、技术披露、广告动作编辑器、提交中、成功、冲突、结果未知及重试、窄屏往返和助手入口。保留真实语义，不把严谨的技术解释平铺为主页面文案。

所有 mock 明确标为合成；动作模拟真实合同与拒绝/回执，不请求个人数据或真实Provider。acknowledge 只设置 seen；resolve 是 Attention 的人类判断，不批准外部效果；due_at 不是自动调度。模型、Run、Matter 与 Attention 的身份不合并。

Motion 服务于位置关系、状态反馈与注意力转移。请逐项给出触发、起止属性、duration/easing、打断/反向、退出、焦点时机、reduced-motion及失败恢复。反馈的成功/消失必须由成功回执触发；未知结果保留恢复路径。高频扫描操作应即时响应，是否需要motion由你按任务判断。

可以附加有明确任务理由的 Board/Time 视觉探索，但与主要可接线候选分开，说明字段/查询覆盖和动作缺口，不能宣称已经投产。不要实现新的后端状态或通用View引擎。

Context window 与 TPS 的视觉/motion由 Astra 稍后串行完成，不在你的任务范围内。

请交回：可运行前端源码与启动说明；固定合成fixtures；1440/1280/390明暗图和录屏；交互/motion规格；源码或patch与改动映射；作者检查结果和未测项；新token/依赖/后端缺口列表。以 acceptance.md 为返回清单，保留你的独立设计判断及需要Astra裁决的选择。
