# Astra 后续串行 · Context window / TPS 真实视觉与 motion

2026-09-13 用户追加：context window 和 TPS 的 motion，稍后由 Astra 串行绘制，采用真实视觉。此页只登记安排；未开始绘制、未交Claude、未声称已实现。

接续 [Context/TPS 审计](../frontend-audit-2026-09-13/context-tps-audit.md)。Astra 后续先读取实际main与当前运行UI，用真实浏览器捕获 Context 与 telemetry 的明暗、展开/收起、进行中/完成/缺数据界面，打开图像检查；依实际字段/口径作视觉候选和motion，而不是只用文字或ASCII。候选图与当前截图分开标识，并进行实际视觉比对。

现有字符构成、request估算、声明容量与Host timing各自有口径；真实 decode TPS 与Provider TTFT仍未接线。设计应覆盖真实可达的估算和Unavailable；需要真实token-clock的新图形另列BE-42合同/测量条件。不得把host elapsed或UI chunk速率包装成真实TPS，也不从字符分布推导容量使用百分比。

交付包含当前截图、视觉候选/实现、字段→视觉/motion映射、数据缺失/异步/失败/打断与reduced-motion、真实浏览器前后验证。真实视觉指实际图像与UI检查，不表示已取得真实Provider计量；无付费Provider默认调用。具体绘制在此独立串行片执行，不阻塞Claude接收Attention工单。
