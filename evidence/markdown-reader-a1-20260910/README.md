# MR-A1 / MR-T1 · 固定 Markdown 阅读交付

2026-09-10。用户授权施工，Astra 持有 source identity、分页投影、宿主接入与架构；Terra 按冻结 DTO 实现局部 reader；两位 Luna 分别写独立 source 反例和实际 HTTP/Core 测试。起始 main `a243a6c`，代码 `ec7f4fd`；施工中与 main `85693a6` 无冲突合流为 `21fde2f`，最终产品与独立测试提交 **`b119fc3`**。临收尾主线推进至 Pages交付 `5909f2f`，本分支合流为 **`e8f1438`**；唯一冲突为current末尾两段新增记录，已同时保留。共享ui-controls的composer glyph修复原样接收，页面固定快照未重建。随后保留 BE-5/T3 主线 `ecccac2` 合流为 `e047a0e`（同样保留current双新增记录）；最后在 `5f17cde` 有界修复连续助手消息覆盖，构成最终组合产品。本包后续提交只记录交付，不把作者验证称为独立接受。

## 实际交付

- 在现有 Work fallback 提供 Core Candidate/Accepted Artifact 的文件读取入口，继续复用唯一 File 文档 tab。完整录制 Markdown 文件也使用新 reader；当前、截断或超限预览保留原路径，不冒充固定 source projection。
- 所有 Core 页面校验 scope selector、Candidate/Artifact、bundle/file digest、游标、长度与终态，再对完整源校验 UTF-8 bytes/SHA-256。原始 BOM/CRLF/emoji/组合字符保留；块位置采用原文 code points，重复块 identity 不合并。
- reader 提供 outline、Find、块原文检查、全文件 raw source，以及既有 copycard 控件。Code body、块原始 Markdown 与整文件复制各有确切对象。Find 不消费复制按钮或 source panel 的文字。
- 生命周期有 abort/generation、关闭销毁、固定文档重开保留；布局按 reader 容器宽度适配，原文检查紧邻选中块。HTML 只读、图片只展示描述、HTTP(S) 外链；不执行 Markdown 插件。
- vendor parser 是 145,962 bytes 的本地 ESM；锁定 unified/remark/GFM 及完整依赖许可证。[构建来源](../../tools/markdown-vendor/README.md)、[manifest](../../app/web/vendor/markdown-parser-manifest.json)与[精确 reader 合同](../../docs/markdown-reader.md)给出限制和 Chat profile 差异。重建三个产物逐字节一致；无 CDN/生产依赖解析。

## 证据与归因

| 验证 | 实际结果 | 归因/范围 |
|---|---|---|
| [完整组合 suite](validation/full-tests.log) | 386/386 | Astra 作者运行，最终组合 `5f17cde`，含本单新增19项及输出边界6项；此前365为中间组合 |
| [最终定向 suite](validation/targeted-final.log) | 19/19 | 两位 Luna 独立设计/实施，Astra 在 `b119fc3` 重跑；[source 独验](luna-independent.md)、[HTTP/Core 独验](luna-http.md)分列 |
| [组件作者 fixture](terra/README.md) / [Astra 新端口复跑](astra/checks.json) | 各28/28 | Terra 作者运行；Astra 非作者重跑同组组件断言（截图等待两帧以完成动态sprite绘制），独立目视1440/740/390截图；clipboard 为显式 synthetic stub |
| [真实宿主浏览器](host-checks.json) | 11/11 | Astra 在最终 `5f17cde` 作者运行真实临时 service/local-fake/HTTP；Luna只读审查接缝，不称其独立执行浏览器 |
| [输出消息边界](validation/output-boundary-green.log) | 14/14（6新+8既有） | Luna独立设计6项，修前4/6，修后6/6；Astra亲写3行投影修正，Luna独立绿验，详见[调查末尾](output-coverage-luna.md) |
| [smoke](validation/smoke.log)、[colors](validation/colors.log)、[materials](validation/materials.log)、[contrast](validation/contrast.md) | 通过 | 使用主线既有检查；token对比度不是所有屏幕的自动可访问性认证 |

HTTP 独验包括跨 Matter 拒绝、接受 Artifact 后 workspace 修改、producer Session 删除、同项目续行与 extension unload 后原文仍精确可读。unload 保留 `extension.status:"unloaded"` 描述，不是 `extension:null`；此前计划简写已在合同纠正。

宿主11项覆盖实际候选入口/分页、205重复块、raw bytes、同文档状态保留、原文邻近/实际copy glyph、390容器、关闭与切换迟到响应、普通/截断预览和 hash mismatch 拒绝。组件额外覆盖键盘/原生link、build listener清理、profile拒绝、语义Find排除chrome、Code与raw复制、暗色/缩放、表格局部滚动。初次静态fixture没有映射共享sprite导致截图copy glyph空白；修正测试server的 `/web/` 映射后重跑并验证SVG200与非零glyph几何，产品路径本来正常。浏览器来源全为合成数据，不含用户截图或个人工作内容。

## 复跑

从仓库根目录：

```sh
npm --prefix app ci
node --test app/tests/markdown-core-read.test.mjs app/tests/markdown-source-independent.test.mjs
node evidence/markdown-reader-a1-20260910/host-browser.mjs
MARKDOWN_READER_PORT=8980 node evidence/markdown-reader-a1-20260910/terra/static-server.mjs
# 在另一终端，完成后关闭上面的临时静态 server：
APP_URL=http://127.0.0.1:8980 WK6_CDP_PORT=20280 node evidence/markdown-reader-a1-20260910/component-checks.mjs
```

宿主 runner 自建临时数据目录/动态端口、CDP20279，完成后关闭 runtime/browser并清理该目录。组件复跑使用隔离 Chrome profile；[host1440](host-1440.png)、[host390](host-390.png)、[component740](astra/reader-740-light.png)供目视。普通阅读不调用模型；仅合成测试通过local-fake生成文件。

## 两条产品边界与未完成范围

用户补充：目标为接住模型所有 output 并提供适当 review UI；Markdown 同时是独立格式边界。已形成[相交边界架构](../../docs/output-review.md)及[实际输出链调查](output-coverage-luna.md)。Chat Space copycard 的历史消费已核对并[补记](../../engineering/research/chat-space-2026-09-09/courtwork-mapping.md)；用户截图里的派单文字只视为内容。

此外，Output Review 的一个独立小切片已修复：完整assistant消息关闭其显示段，下一消息不再覆盖它，累计delta/final仍归同一条；没有为此改Markdown或持久化协议。

本单关闭 MR-A1/T1 的固定文件读取切片，**不关闭全 output 覆盖，也不关闭 Markdown 全部来源/生命周期**。正式 create/reply/resolve/reopen、Core迁移、跨版本匹配/重锚、inline、semantic diff、媒体/文档专用adapter、下载接口均未交付。OR-A0须先确认真实输出接收/历史缺口，MR-A2/A3保持各自事务/格式边界。

Core3/app4、当前已合流 RuntimeStore5 未因 reader 改版；未读取或升级个人数据，未运行付费provider、未对外发送、未部署/推送，不改变Paper或G1–G5。
