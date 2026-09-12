# 独立有界复核记录 · 2026-09-13

本记录汇总首片 Intake、版本比较与 Files/UI glue 的实际复核范围，并补记 composer 锁定问题的修复复验。它不是全量回归或产品接受声明。

## 固定范围与先例

复验使用Courtwork临时隔离checkout，分支 `codex/data-surfaces-20260913`，HEAD `97bdaa043217497e2f9a0cb8e68d8b2cdf3023a4`。复验期间 `app/web/app.mjs` 有工作树改动，加入 Quote 的 `disabled` / `readOnly` guard；本复核只读取并执行该源片段，没有改应用代码。共享工作区中的其他改动保持原样。

受影响语法为 `composer`、`button.action` 与 `markdown.reading`。最近已实现入口是 [`app.mjs::applyComposerDraft`](../../../app/web/app.mjs)、[`inspector.mjs::createFileView`](../../../app/web/inspector.mjs) 和 [`chat-sources.mjs::quoteRecordedFile`](../../../app/web/chat-sources.mjs)；precedent index 的 `composer` 行及 [UI Continuity 合同](../../design/agent-interface-2026-09-10/frontend-contract.md)要求保持会话范围、读写分离与原生控件行为。此修复只保留现有草稿锁和引用路径，不改变视觉基线或事实 owner。

## 各片实际复核范围

| 片 | 已记录的检查范围 | 本次复核的边界 |
|---|---|---|
| Intake 后端 | 作者 8 项 + 独立 2 项；交付记录另列原 workspace 14 项及最低 Node 22.19.0 的 8 项。详见 [总回执](./README.md)、[UI交付记录](./ui-delivery.md) 与 `evidence/intake-tests.log`。 | 本次只核对既有记录，没有重跑后端范围。 |
| 精确版本比较 | Compare 后端与原 diff 合计 8/8，见 [比较合同](./compare-contract.md) 与 [UI交付记录](./ui-delivery.md)。 | 本次没有重跑比较范围。 |
| UI glue | `node --test app/tests/chat-sources.test.mjs app/tests/chat-reading.test.mjs app/tests/inspector-quote-cache.test.mjs`：12/12 通过。 | 定向测试，不是 `npm --prefix app test`，不覆盖全量 UI 或设备辅助技术。 |

另有 [`intake-ui.test.mjs`](../../../app/tests/intake-ui.test.mjs) 的 retained-source Inspector 场景，验证确切 revision 的正文与引用回调身份；它不执行 `app.mjs` 的 composer 集成回调。

## Quote guard 复验

先前独立检查发现 Quote 回调能绕过 pending-send 时 `composer-input.readOnly` 的锁。当前工作树的 `app/web/app.mjs` 在读取草稿前检查 `input.disabled || input.readOnly`，显示提示并返回；超出 `input.maxLength` 的合并草稿仍在赋值前拒绝。页面仍将 composer 的 `maxlength` 固定为 100000。

复验脚本从当前 `app/web/app.mjs` 提取实际 `onQuote` 箭头函数，在最小 input/state/surface stub 下执行，并调用真实 `chat-sources.mjs::quoteRecordedFile`。5 个场景全部通过：

- disabled 与 read-only 两种状态均不改草稿、不派发 `input`、不关闭 Files reader、不移动焦点，并显示提示；
- 100000 字符正文与来源头组合后超限时，不改草稿、不关闭 reader；
- 不匹配的 Session 在读取/引用前被拒绝；
- 可编辑时，保留的完整来源原文及 provenance 精确追加到现有草稿，派发 `input`，关闭 Files surface 并聚焦 composer。

此为一次性源片段复验，不新增持久测试文件。剩余测试缺口是没有已提交的 `app.mjs` 集成回归，覆盖 composer 锁定、100000 边界、失败时 surface 保持以及 retained-source 原文最终进入草稿；现有 Inspector 测试只验证引用回调收到的身份与正文。原生辅助技术、200% 缩放、forced-colors、reduced-transparency 与物理触控仍未在本次检查中运行；未跑全套测试，也未做整体产品接受判断。

## 第二轮有界复核 · Compare 与上传原文

工作树仍以 `97bdaa0` 为 HEAD，`materials-view.mjs`、`styles.css` 与 `intake-ui.test.mjs` 含另一位 Luna 的未提交改动。本轮只读核查指定路径，未写这些源文件。

`node --test app/tests/intake-ui.test.mjs` 通过 **8/8**。覆盖保留版本列表与原按钮返回焦点、显式版本比较、limited / 失败重试、BOM+CRLF 文件上传原文及同命令重试、旧 Session 文件读取隔离、503 / 409 重试边界，以及 retained-source Inspector 的精确版本正文与引用身份。

比较接线按当前代码核实：首次打开时 From/To 都为空；比较请求走捕获的 Session 路径，并提交两侧选定 revision 的各自 SHA-256。响应须匹配同一 Session、source、path、revision、SHA、bytes 和 `original-utf8-v1` 表示。已运行的 UI 测试验证初始未选中、无关 Workspace 刷新不改选项，并检查精确 query 参数。代码在选项改变、来源收起、dialog 关闭或 Session 变化时中止请求并推进 generation；响应与错误处理还要求当前 scope、generation 和 controller 都匹配。

另用临时 Tiny DOM 场景让已取消的比较在新选择请求之后迟到成功：旧 signal 已 abort，迟到结果没有进入面板，也没有清理或覆盖新请求；新结果仍正常渲染。此一次性场景通过，未新增测试文件。

上传路径以 `TextDecoder(..., { fatal: true, ignoreBOM: true })` 将 BOM 保留在 `fileDraft.originalText`；显示用 textarea 可把 CRLF 归一为 LF，未编辑时提交及 same-command retry 仍使用原字符串。8/8 测试断言两次 POST 的 BOM/CRLF 原文和 command ID 均相同。当前 Quote 回调的 Session 与 `disabled` / `readOnly` guard、长度检查仍先于草稿变更；上一节的 5 场景源片段复验继续适用。

边界：父级此前实际 QA 已覆盖 happy、limited、坏 hash、原文返回与 scope；本轮未重跑该浏览器路径。定向代码检查也没有覆盖作者正在补的 Refresh retained uploads 按钮被列表重绘替换后的焦点恢复；作者继续处理该改动，本复核未修改其文件。

## 第三轮有界复核 · Refresh 焦点

后续补充仅复核 retained uploads 显式刷新期间的焦点恢复。当前实现只为点击时确实持有焦点的 Refresh 按钮记录恢复请求；仅在同一 Session/epoch、dialog 仍打开、请求仍是最新一代且用户没有把焦点移到别处时，才聚焦重绘后的 Refresh 按钮。对应测试验证刷新完成后替换按钮重新获得焦点，以及用户在请求期间移到 Submit 后焦点不会被抢回。

`node --test app/tests/intake-ui.test.mjs` 通过 **9/9**，其中新增的 Refresh 焦点场景通过。此轮没有改动应用或测试源文件，没有重跑浏览器 QA 或全套测试；整体产品接受仍不在本记录范围内。

## 第四轮有界复核 · 集成夹具与语义账本

在固定提交 `2843116687869aa32e0f2716284aa6f5feef5086` 上只读核对两项整合修复。`renderer-admission.test.mjs` 的唯一行为改动是把服务器真实导入的 `app/intake` 加入临时源码副本；404/200、MIME、响应字节、兄弟路径及删除后回到 404 等原有断言均保留。`raw-consumers.json` 补登记新增精确消费者并移除已经消失的旧 refresh 行；完整扫描器与 `validateConsumers` 未改，仍按文件和精确源行检查缺项、重复计数和 stale 项。新增的 retained-version `file-text` glyph 指向已有 `file.object`，其含义覆盖具名文件版本；`pre.file-text` 是展示类名，按 `data-identifier` 排除；刷新项的 `action` 仍由 helper 设置完整 `aria-label`，登记为无语义键的 named read。

`node --test app/tests/renderer-admission.test.mjs app/tests/semantic-guards.test.mjs` 通过 **4/4**；`node tools/check-semantic-consumers.mjs` 通过，扫描并验证 **46** 项账本。此轮只读，没有降低断言、扩大扫描排除范围或改变生产代码；完整 UI suite 由父级另行验证。
