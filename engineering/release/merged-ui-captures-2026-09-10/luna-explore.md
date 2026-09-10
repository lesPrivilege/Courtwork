# Luna 截图接缝探索

2026-09-10，Luna 只读回执；没有编辑、采图或部署。公开分支起始 `bd1f815`，父任务准备片为 `6517e8a`。以下候选引用仅是探索时读取的固定版本，不声明已进入当前main。

## 需等待的实际节点

- `codex/spark-fe-20260910@63840a7` 的 `app/web/spark-view.mjs` 仍说明 BE-41 缺席、没有真实 source connection、只读且不写 Attention。合成界面可以表达设计，但不能作为生产来源接通的截图证据。
- `codex/multi-experts-longlife-20260910@852bd3e` 的 Spark SP0 是只读全合成样例；没有 backend、production entry 或 scheduler。估算量不能当真实 meter。
- `codex/attention-delivery-candidate-20260910@1097fd4` 的交付说明属于作者验证，包含状态/查询/键盘/typed action UI；不自动成为非作者接受、Core/server新增能力或部署证明。
- 本轮没有证明以上分支已完成独立验证并合并。之后按实际 main/交付合同重新读取；不可从 current.md 的某一历史段推断整轮完成。

## Capture 接缝

旧 `site/scripts/capture-media.mjs` 围绕 M1–M7，使用 `window.__V5_UI__`、`data-nav-key`、`surface-content` 等旧接缝，不能直接覆盖新的13图位。它默认绑定历史release与media目录，也提供显式source-sha/media-dir路径；后续必须选择新批次输出并适配实际API/选择器，保留source-drift检查。

当前产品批次 `site/media/main/manifest.json` 固定 `e818463…`，需要整体替换。历史 `site/media/manifest.json`、Specimen与CLI录制保持 `9e5384f` 的来源关系；若重录回放，应同时更新fixture、recording、renderer与manifest，不能靠改SHA迁移历史。

13图位的合并版本、真实合成状态、媒体尺寸/hash、暗色配对、页面窄宽/键盘/无脚本与最终部署仍待下一节点。Astra本轮空图位构建检查见 [checks.json](checks.json)，不把它当未完产品UI的独立接受。
