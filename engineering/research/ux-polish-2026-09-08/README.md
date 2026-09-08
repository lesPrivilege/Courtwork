# UX Polish · 材质、层级、局部 motion 与 hover 研究包

2026-09-08 · 用户要求Luna溯源当前前端选型index及UX Polish现状，为build联调阶段Astra更细粒度的polish绘制准备输入，并补充局部motion与hover小巧思。研究不派发新的WK实现单，不改Fable/Opus活动源码；本包在现有选型之上提供可按片段检索的来源和待验证方案。

## 阅读与消费

1. [来源与现状index](index.md)：从具体交互片段定位成熟机制、已吸收实现、仍待验证处。
2. [Astra联调polish清单](astra-polish-plan.md)：按实际任务把值、结构、行为、反例和消融绑定，合流build后执行。
3. Luna证据：[本地源码/候选](evidence/current.md)、[材质与可访问性官方溯源](evidence/upstream.md)、[历史index与局部motion/hover](evidence/motion-index.md)，另附 [Astra官方motion补证](evidence/motion-official.md)。源码存在、作者旧验收、当前实际视觉效果分别记录。

## 研究边界与基线

- 主仓为CourtWork fresh，既有 [当前状态](../../current.md)、[WSK最新接管](../../mvp/execution/work-surface-kit/intake-round-2.md)、[表面体例](../../design/surface-hierarchy.md)、[编排体例](../../design/ui-composition-standard.md) 与相关contracts共同定界。活动候选继续变化，研究快照绑定各证据的commit/path；进入build绘制前必须重对基线。
- 最新WK51把品牌符号限制在侧栏一处20px hierarchical；工作UI的品牌八动词播放已撤去。旧UX Polish与WK15的hero/两处品牌/等待微光不能作为新实现指令复活。
- WK52规定frame、panel、panel-muted、floating四种空间物性；WK53规定参考按交互片段采样，统一值/结构/行为，并做删除测试。研究服从这套已选语法，不通过新的来源重新替用户做整站选型。
- “隐形”在本轮覆盖低存在感和按需显隐；阴影另列为高度/遮挡手段。完全隐藏、opacity=0、disabled与inert含义不同，不能只看截图下结论。
- “厚重/立体”转译成可感知的平面边界、抬升/遮挡、输入的内收反馈和稳定连续性；不预设3D倾斜、厚边框或更多卡片。
- Apple Design技能用于材质/深度与可访问性判断，其网页示例值是启发式示例。官方原文与浏览器机制另行核对；不会把原生vibrancy/Liquid Glass等同于CSS blur，也不将技能中的玻璃导航或逐帧blur建议强加给已选UI。

## 接入阶段

研究先于实现。Fable完成选型与活动UI交付后，Astra沿 [合流联调安排](../../release/2026-09-08/integration.md)核对实际DOM/ABI、角色token与runtime事实，先做一个完整工作切片：进入工作→处理当前输入/授权→开检查面→局部操作→返回原阅读位置。随后只推广已通过的局部机制。

用户四轴设计判断、浏览器/设备行为、性能证据与Core/runtime状态正确性分别成立。文档或CSS扫描不能关闭像素、触屏、读屏、真实macOS壳或专业成果验收；局部视觉变化也不能改变权限、完成、提交或renderer的owner。

## 优先核对的现状缺口

Luna在整合候选 `272680519b9faa4f896b68b46888c247662d6991` 的 `app/web/styles.css:2840` 发现未闭合的desktop media；Astra限定静态复核一致。后续Runtime与composer规则可能受桌面条件限制，应在联调时先核对修复与窄屏实际命中，再做PX材质/层级比较。源码位置及范围见 [当前快照§3](evidence/current.md#3-一个阻断级静态问题css-scope-未闭合)。本轮保持只读研究，不并行修改活动UI。

材料来源中Apple HIG正文仍未获取，保留not_verified；reduced-transparency媒体特性与forced-colors的能力边界已分别记录。BoardUI未核到源码/MCP，不把旧借鉴记录升为本轮独立源码验证。

本轮来源裁取、静态复核与链接检查见 [验证回执](evidence/validation.md)。
