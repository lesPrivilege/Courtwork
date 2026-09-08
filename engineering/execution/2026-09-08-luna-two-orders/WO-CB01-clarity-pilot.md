# CB-01 · Code base clarity 有界试点

目标：以小范围可证明的维护性收益验证 Luna 协作协议，避免大规模代码搬迁干扰当前产品施工。基线与执行环境见 [派单入口](README.md)。

## 范围与来源裁取

参考 [maintainable-update README](https://github.com/Lakr233/maintainable-update/blob/e62832f6af4dad90c1e5ee6548e17dbcb20bb543/README.md)，2026-09-08 读取，上游 HEAD `e62832f6af4dad90c1e5ee6548e17dbcb20bb543`。只消费分片、find/verify/fix/review、stage barrier 和显式路径协议；未安装、未运行其 skill/workflow。上游默认 commit/push 不继承为本单授权。其去除全部空白比较存在字符串空白盲区，不能作为 JavaScript/Python 语义不变性的充分证明。

第一片精确文件：`app/runtime/source-resolver.mjs`、`app/runtime/artifact-history.mjs`、`app/core/client.mjs`、`app/core/owner.mjs`。先记录行数/hash/调用者，至多三个候选；只考虑冗余推导、死状态、可明确减少概念负担的局部表达。事务、schema、权限、错误外观、时序和公共接口均须保持。

不包含 copy、wrap/width、split、rename/tidy，不移动文件、不引入formatter、不更新依赖。server/control-plane/UI 不自动扩入；需要扩大范围时记录原因交 Astra 重新裁定。

## 执行合同

Finder 只写 `evidence/luna-two-orders-20260908/clarity-findings.md`，提供位置、现状、调用方、建议变更、收益与风险；不能直接修。另一 Luna 重新打开源码与调用方，逐项 confirm/reject/needs-evidence，写独立回执。Fixer 只消费 confirmed finding，并由 Astra 指定精确路径；Reviewer 不得是该改动作者。最多三轮 review/fix，未解决项保留，不强行接收。

每次修复跑实际受影响测试；若确有产品代码改动，最终 `npm --prefix app test` 与 `npm --prefix app run smoke`，先检查脚本的独立数据/端口。没有代码改动时不为文档重复全套 runtime 测试。交付前复测量同一文件集，记录 diff 及每项保留/拒绝原因。只有通过检查与非作者复核的变更才可进入集成。

完成：可复核的候选/独验/裁定链与实际小修复，或明确证据支持的 no-change；不声称全仓优化完成。
