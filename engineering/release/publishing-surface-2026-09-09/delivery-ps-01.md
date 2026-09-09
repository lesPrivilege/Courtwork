# PS-01 / PS-02 第一版发布版面回执

日期：2026-09-10（Asia/Singapore）。本轮范围为本地完整发布版面及真实 composer 图标回退修复，用户随后以 PS-27 授权 push 与 Pages 部署；发布结果另记。品牌方向探索后置；不关闭 G1–G5，不把页面完备性当产品验收。

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

入口仍为 Courtwork main 与 engineering/current.md。本版面可从 `node site/build.mjs`、`node site/scripts/preview.mjs --port 8941` 重建预览。普通 push 只构建，手动 workflow 才部署。本轮按 PS-27 推送并部署 Courtwork Pages，用户随后独立 review；不修改 SE 论文站。

品牌恢复产物 `codex/br01-resume` 的 `15b6464` 留在独立树；不要合入含品牌的旧 cleanup 分支。FE-05a 等产品队列按 current 继续，不因本回执改派。真实 provider、产品门和用户最终视觉裁定仍按各自合同处理。

## 文案与发布修订

PS-26 覆盖旧逐字旁白：使用 [public-copy-v3](public-copy-v3.md)，直接写产品与工作价值；定价仅保留 Concept pricing 一处短标记，Explore 为页内图表入口。PS-27 明确授权本轮推送与 Pages 部署，用户随后提交独立 review。README 合流保留 schema 5 的验证、独占备份与旧 host 隔离要求。

## 非作者接收与集成

Luna 的 [页面功能复核](../../../evidence/pages-first-edition-20260910/independent-review.md) 未发现有界功能阻塞；17/17 浏览器、assume-unchanged 隐藏字节反例、来源 ID/版本/digest/quote 反例通过。另有 [真实 composer 复核](../../../evidence/pages-first-edition-20260910/composer/README.md)：发送/取消/失败/重复渲染仍保留 32×32 SVG，文字按钮宽度与焦点保持。合流当前 main 后相关前端 20/20，未将固定快照 308 项重标成当前全量。用户最终视觉 review 后续提交。
