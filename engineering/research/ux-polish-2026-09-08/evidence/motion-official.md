# 局部 motion / hover · 官方机制补证

2026-09-08 · Astra限定补证，直接读取官方页面正文；网页为访问日快照，未安装/运行上游组件。

| 来源与确切入口 | 已核机制 | 本地消费边界 |
|---|---|---|
| [Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover#origin-aware-animations)，Origin-aware / Collision-aware animations、Content CSS variables、Keyboard interactions | 提供按实际side/offset/align/碰撞计算的transform origin；side/align可随避碰更新，Esc返回trigger；模式可选modal或non-modal | 复用“位置求解结果也驱动动画方向”的接缝。本地已有Floating UI定位时不再叠一套定位器。示例scale从0、0.5/0.6秒是教学例，不采纳为高频控件处方 |
| [Base UI Popover](https://base-ui.com/react/components/popover)，API Positioner / Popup | Positioner有anchor/available size及transform origin；Popup区分starting/ending-style，instant与side属性；进入/退出是明确的视图过渡状态 | 状态结构可作native组件参考；不是拷贝React组件或新增业务状态。存在ending属性不证明任意重入/焦点时序都正确；按本地真实DOM验收 |
| [Radix Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip#provider)，Provider / Root / Show instantly | 延迟与连续浏览的skip delay可配置，存在hoverable-content开关，支持即时显示配置 | 借状态控制，不机械把本地400ms改成其700ms默认或为凑一致改值。keyboard/触屏与可移入tooltip的实际行为按本地检查 |

这些来源证明公开接口与示例机制，不能证明本地“成熟手感”或无障碍已通过。具体当前值、节点、owner与已保留行为见 [Luna本地/历史对账](motion-index.md)；未来改变必须绑定 [PX片段](../astra-polish-plan.md)。
