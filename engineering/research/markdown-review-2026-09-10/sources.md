# 来源边界与主源核验

2026-09-10。参考对话完整性及 hash 见 [manifest](source-manifest.json)；1轮2条文本、无附件、hasMore=false，无消息截断。原回答自述 Exa 62 条 / 7 方向未附原始结果集，本轮不冒称重做或恢复该检索。

## Astra 核验的标准与解析原语

| 主源 | 实际支持 | 本单消费 |
|---|---|---|
| [W3C Web Annotation §4.2.4–6](https://www.w3.org/TR/annotation-model/#selectors) | quote/position 的逻辑文本、code points、规范化和 byte selector 区别 | 原语参照；不把 raw Markdown 的 UTF-16 offset 直接标成 W3C selector，也不宣称完整互操作 |
| [CSS Custom Highlight 草案](https://www.w3.org/TR/css-highlight-api-1/) | 以 Range 样式化文本，不改 DOM | 仅显示增强；应用仍需独立语义状态、生命周期与降级 |
| [MDN Highlight accessibility](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API#accessibility) | 高亮语义和辅助技术支持有限，需其他可访问线索 | 评注列表/文字/跳转不依赖高亮；未做真实读屏验收 |
| [mdast](https://github.com/syntax-tree/mdast) / [micromark](https://github.com/micromark/micromark) | Markdown AST 规范与 CommonMark/GFM 解析底层 | 原始字节为真源，AST 为派生值；无 React 前提，不由 AST 决定正式状态 |
| [Tufte CSS](https://edwardtufte.github.io/tufte-css/) | 边注与阅读内容的版面组织示例 | 只借信息邻接原则；本轮未视觉克隆/审计，不导入 CSS 或字体 |

[parser spike](../../../evidence/markdown-review-20260910/parser-spike/README.md)实际安装固定 npm artifact 后运行10条合成探针；这是本轮实测。仓库主分支文档说明与固定 npm artifact 结果分别归因，不把两者当同一构建验证。

## 仓库来源

Luna 的固定 SHA、路径、许可证与未检项见 [上游核验](luna-sources.md)。Streamdown 的 React 假设、mdProbe/md-review-server 的持久机制、markdown-diff-viewer 的匹配策略都是局部候选；当前 Courtwork 不直接采用这些应用或服务作为正式 owner。

原文没有提供 Motto 的仓库 URL，不能由名字猜项目；暂只保留“正文安静、控制面表达评审语义”的设计输入。CriticMarkup/md-redline 同样未核验具体实现，不作技术依赖。原文提到 react-markdown 没有明确链接；本轮无需为 native ES modules 另作 React renderer 选型。Math/Mermaid/footnote/relative asset 是待分项能力，不是当前 renderer 已支持的事实。

本轮不引用热度/星数证明成熟，不运行上述完整第三方 app，不安装浏览器扩展，不读取个人数据或发送外部消息。
