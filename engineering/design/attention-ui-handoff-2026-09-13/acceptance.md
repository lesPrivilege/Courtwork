# 返回包与 Astra 验收

本表是待执行验收，不是通过回执。作者为 Claude，最终架构/视觉接受与合入为 Astra。

## Claude 返回

| 产物 | 必要内容 |
|---|---|
| README | 候选版本/基线、启动命令、依赖、入口、实现与mock边界 |
| 前端源码 | 自足合成预览或可审查分支/patch；不依赖个人账号、不将mock带入生产数据路径 |
| 合成场景 | investigating/needs_you/waiting/later/resolved；空/长文本/不可用/加载；分页/筛选；seen与状态分离；revision冲突、未知结果重试、成功回执 |
| 视觉证据 | 相同fixture的before/after；1440/1280/390、light/dark；详情/编辑器/披露/返回；来源截图版本明确 |
| Motion说明 | 每项用户目的、触发、起止属性、时长/曲线、打断/反向/退出、焦点、reduced-motion；一段正常与一段失败/反向录屏 |
| 差异与判断 | 区块→源码映射，新token/primitive/依赖、采用或改写参考的理由；候选功能/数据缺口分开 |
| 作者检查 | 可运行、键盘、长文、异常、200%真实缩放、窄屏触达、reduced-motion；没跑的写没跑 |

## Astra 裁决与接线

1. 固定交回版本及文件hash，重新读取Courtwork实际HEAD/dirty；逐项标采用、需修订、暂缓。保持原owner和并行writer改动。
2. 对照真实UI与合同核验分层：L1保留判断所需限制、错误、下一动作；L2/L3增加信息；不把版本/授权影响按字段黑名单藏起来。
3. 核验列表最小字段与原分页/排序、项目隔离、广告动作schema/revision、CAS草稿保留、同request_id未知恢复；open/read不处置、resolve不影响外部对象。
4. 以实际浏览器独立运行候选并与真实产品集成面比对。主流程、邻接Home/助手、键盘与焦点、Escape、滚动、明暗、窄屏、200%与reduced-motion按实际影响覆盖。动画结束不是成功事实，异步错误不能被离场吞掉。
5. 将可接受表现接入现有模块；如需adapter差额，由Astra保持领域合同做集成。定向unit/行为检查及interaction/colors/materials/contrast检查按变更执行，必要扩全量；截图不能替代行为检查。
6. 记录固定SHA、作者/独立证据、未测/残留项与视觉接受结果。检查通过并完成必要修正后合入main；不自动push/部署，不关闭无关Release门。

## Motion 现有约束与可探索空间

现有CSS有 `--duration-fast:120ms`、`--duration:180ms`、`--ease-out`，以及系统 `prefers-reduced-motion` 与显式 `data-motion="reduce"` 两条降级路径；它们是起点。新的曲线/弹簧/时长可以作为候选附理由，交Astra裁决，不能局部静默增加一套token体系。列表跳转/筛选/键盘输入不得等待装饰动画完成，焦点与可操作状态应符合当前DOM与读屏语义。无已测进度时不画百分比，错误/unknown不以完成庆祝或离场替代。
