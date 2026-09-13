# Chatspace 代码块中性灰

2026-09-13，基线 `f8ffa9b`。按用户“浅色区分度不足，考虑与diff同token灰色”的请求，助手代码块背景从panel改为selected，与diff-del-word的中性灰共用；沿原色彩角色，不引入新色值。仅 `.message.assistant` / `.attention-agent-message.is-assistant` 消费，前景ink与边框line-strong保留。用户消息的独立authored深色平面不受影响。

最近先例：`styles.css:.diff-del-word`、Chat现有`.code-block`及authored plane。只改background，不改语义、Markdown或复制行为。

使用[合成标本](evidence/code-gray-specimen.html)加载真实Markdown renderer及产品stylesheet，独立8850静态服务，无模型调用；这不是整页Chat端到端接受。[前](evidence/37-code-light-before.png)、[浅色后](evidence/38-code-light-gray.png)、[深色后](evidence/39-code-dark-gray.png)。标本容器后调为产品panel以检查灰底分界，前后整页背景不作像素基线。

浏览器computed values：浅色代码与diff灰均rgb(216,222,226)，ink(42,44,44)，文本对比10.34:1；深色均rgb(65,74,79)，ink(244,245,246)，8.30:1。用户代码块仍使用authored配色。颜色/材质lint、contrast-report与diff检查通过。Luna非作者只读复核确认选择器范围与前景风险，并复算对比；未另操作浏览器。纯样式微调未重跑完整suite，未push/部署。
