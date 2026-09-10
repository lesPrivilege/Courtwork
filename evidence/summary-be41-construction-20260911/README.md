# Summary / SD-ENTRY / BE41 · 可合并自足节点

2026-09-11，按用户“达到自足节点先收尾，我需要 merge”收束。交付分支 `codex/summary-be41-construction-20260911`；产品组合固定 `b57b831aeaa65db5ff74d948e8fabe4a349897dc`，包含 main `9bc6090b5b463bdf6286a0c42bdcd399781fc067`。最终交付提交只补本回执、manifest 与认领状态，可直接 merge 此分支。来源 Astra 保留主线接收及 current 写权；本回执不宣称 main 已合并或产品整体接受。未推送、未部署。

## 已交付范围与证据

| 节点 | 固定版本 | 结果与边界 |
|---|---|---|
| SD-FIX / CS-01 / CI-B/F | `445fb48`，补充 `466bdfd` | 修复禁用控件前保存 opener、同对象重绘焦点、长 Unicode 路径/SHA 列；工具行垂直对齐，Run details 入口；WORK-3 两行与增长/清空/错误检查。[作者回执](sd-fix/README.md)、[非作者 37/37 与反例](sd-fix/final-independent/review.md) |
| SD-ENTRY | `901d5f9` | 独立交付入口目录及缺席态，修复 clicked opener 和同 scope 返回；作者全量 720/720，有界明暗/窄屏 CUA。[回执](sd-entry/README.md) |
| BE41-A | `c71eb02` | 接收既有 `30fd470` / `4c2a56a` 后端并补兼容反例，10/10；不重写后端、不新增状态 owner。[回执](be41-a/README.md) |
| BE41-B | `0cbbf7e` | live Spark 接合法零版本、源版本回退、空页顶层 token、分页 snapshotRef 与 409 Refresh；sample/late response 边界保留。作者 77/77、全量 736/736、smoke 与四 lint；合成 Core + 真实 HTTP/CUA 分页拒绝与恢复。[回执](be41-b/README.md) |
| 最终非作者复验 | `0cbbf7e` / `901d5f9` | Luna 重跑 Spark/BE41 77/77、Entry 22/22，原始日志与范围见[报告](final-independent/README.md)；不冒充独立真机/视觉验收 |

完整 736/736 固定在 `0cbbf7e`。之后 `589102c` 仅修正 composer 的过时注释并补证据；`b57b831` 消费已接受 main 的 Pages/文档，未把它记为新的全量测试。SD-FIX 完整 715/715、SD-ENTRY 720/720 是各阶段实际结果；中间失败和 fixture 修正按各目录保留，不能改写成一次全绿。版本为 RuntimeStore **12 / Core 4 / app 5**。

## 合并与后续

输入完整 SHA 见 [inputs.json](inputs.json)。[manifest.json](manifest.json) 固定本次相对 main 的源文件及全部本包证据的路径、大小与 SHA-256（manifest 自身除外）。源哈希对应 `b57b831`；本次仅文档收尾。核对 main 仍为 `9bc6090` 时，交付分支包含其全部祖先，可快进接收；若 main 继续前进，应先核差异。共享 main 有其他 writer 的未提交文件，本线程未操作该现场。

未完成 Chat actions 已完整移到 `codex/chat-actions-wip-20260911@2361a837c23433cc582a386d594dac9a488f377c`，后续从该 ref 的 `evidence/chat-actions-20260911/WIP.md` 召回。它不属于本交付，没有 Fake UI demo adapter/page、完整验证或非作者接受，不应随本次合并带入。

仍开放：Q1 read-state、Q3 跨客户端同步；真实 Chromium147、forced-colors、原生 Courtwork 宿主、IME/软键盘/VoiceOver；Home Modules 旧前提在基线与候选均失败的裁定限制。SD-FIX 的原生 Chrome200% 证据不覆盖 Entry/BE41 新矩阵。EX-IC2/Fake UI 暂停续作，BE-42 仅登记；Spark 重建/恢复、ME03/RV26-SP01 整体及 G1–G5 均未关闭。全部运行采用独立合成数据，未调用付费 provider。
