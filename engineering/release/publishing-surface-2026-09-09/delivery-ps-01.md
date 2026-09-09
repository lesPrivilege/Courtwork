# PS-01 / PS-02 第一版发布版面回执

日期：2026-09-10（Asia/Singapore）。本轮范围为本地完整发布版面及真实 composer 图标回退修复，未 push、未部署。品牌方向探索后置；不关闭 G1–G5，不把页面完备性当产品验收。

## 来源与归因

- 原 PS-01：Claude Opus，`e492dc9` 与中断时九个文件的未提交修改；Astra 在隔离树恢复、修正并提交 `230a719`。中断原因为调用限额，原工作树保留。
- Composer 修复：Astra `9e5384fcabdac432259b3ffab7928251bea49859`。`setRequestLabel` 对既有 icon-only SVG 保留节点、更新隐藏标签与 accessible name；文字按钮仍走既有路径。
- PS-02 pricing：Terra `082b35f`、`f412a62`；仅定价模块与样式。Astra 集成第 01/06/07/08 段、从产品深色 token 派生 Organization 局部配色，并补全 Hosted 图的语义标签。
- 非作者 Luna 在独立清洁 `9e5384f` 树重跑 benchmark 与应用测试。Astra 自身源码与浏览器检查按作者验证记录；非作者页面/真实 composer 复核另存原始回执。

## 固定证据

产品快照为 `9e5384f`；页面另以 `site_sha` 标识原始输入摘要。产品代码可继续合流，页面构建从固定 Git blob 取 token/renderer，不混用新代码与旧图。截图 12 张与标本均已重录。发布 manifest 固定四份 benchmark/test 文件哈希；构建核对源码哈希、attempt 元数据、journal/result 一致性。capture 守卫核对实际文件字节，不依赖可被 assume-unchanged 隐藏的 Git diff。

- [应用测试](../../../evidence/publishing-surface-2026-09-09/tests.log)：308/308，0 failed。
- [Continuity 原始记录](../../../evidence/publishing-surface-2026-09-09/continuity-9e5384f.json)：E 6/6、S 6/6；git.dirty=false；无真实模型。
- [浏览器结果](../../../site/verification/verify.json)：17/17；同源资源、八步键盘、来源版本/候选/字节反例、replay 拒绝发送、三定价 tab、减弱动效/透明度、双主题对比度、1440/390/200% 重排。
- [标本复录](../../../site/verification/specimen-recapture.json)：32 个易变标识归一化后完全一致。
- [材料](../../../site/verification/material.json)、[链接](../../../site/verification/links.json)、[确定性构建](../../../site/verification/reproducibility.json)。

## 五轮实际检查与处置

| 轮次 | 检查面 | 实际处置 / 边界 |
|---|---|---|
| 1 | 信息与来源 | 消费原 Opus 日志、public-copy-v2、PS-21/22/24、pricing-specimen 与 Scout Index v2；补齐八段、七节点与概念价。未启动 sweep 或新前端选型。 |
| 2 | 光学层级 | 价格使用产品字阶的比例放大；Professional 顶边强调、Organization 局部深色；副文沿产品角色 token。桌面/移动截图人工查看。 |
| 3 | 几何 | 三列转单列；图表统一 300×400，最大 420px；390px 与 200% 无横向溢出。 |
| 4 | 材料 | 产品 token 构建时提取；局部深色递归解析同一产品角色链。仅第 03 段非焦点连线 1.6px blur，文字清晰；偏好 reduce 时停用。 |
| 5 | 状态与真实性 | 修复真实 Send/Cancel 的标签更新抹除 SVG；页面按修复快照重录。历史证据保留原有范围；Stop 明示本回放未录制。来源查询校验 candidate/source/version/digest/quote，决定仅显示拒绝发送。 |

## 次日接续

入口仍为 Courtwork main 与 engineering/current.md。本版面可从 `node site/build.mjs`、`node site/scripts/preview.mjs --port 8941` 重建预览。普通 push 只构建，手动 workflow 才部署。本轮没有执行任何外部发布。

品牌恢复产物 `codex/br01-resume` 的 `15b6464` 留在独立树；不要合入含品牌的旧 cleanup 分支。FE-05a 等产品队列按 current 继续，不因本回执改派。真实 provider、产品门和用户最终视觉裁定仍按各自合同处理。
