# Release P05/P06 · 合成输入绑定组合

2026-09-13，隔离基线 `462469231051752cbb299d30286a7a7e50728796`。Sol作者，Astra架构裁决、源码复核与独立执行，Luna只读非作者复核。新增 [release-input-binding.test.mjs](../../app/tests/release-input-binding.test.mjs)，无产品实现变化、无Provider付费调用。

Node 22.19.0 / macOS arm64；沿[首片锁定依赖与环境](../release-test-contract-20260913/README.md)。命令为 `node --test app/tests/release-input-binding.test.mjs`。Sol [修订前3/3](sol-node2219-before-review.tap)；Astra删去无效自比、要求先证明摘要实际进入agent输入后，独立[3/3通过](astra-node2219.tap)。源文件及日志hash见 [files.sha256](files.sha256)。Sol首次运行因缺node_modules在加载前失败，补只读依赖软链后通过；不归为产品失败。

实际Pi→loopback HTTP路径覆盖：r1 instruction/skill来源hash与冻结正文；initial只有skill metadata，显式runtime_load之后follow-up才有正文；声明allowed-tools不扩大本轮工具集合。下一Run绑定r2并隐藏loader，重开、强制压缩，恶意摘要确实进入agent输入，随后旧工具请求仍被拒绝，新binding与旧历史binding分开。agent/compaction三种顶层effort字段均省略，telemetry按隔离串行请求次序对应purpose/count，providerEffectiveEffort仍null。两份各自合法来源合计超预算时，Run identity与provider dispatch前拒绝。

Luna复核意见为可作为有界增量合入。T2此前未加载私有skill，因此**不证明撤销后清除旧对话中已经加载的正文**，也未声明历史内容删除；权限集合缩减和历史信息保留是不同合同。wire次序关联不是通用请求hash join；脚本响应不是模型理解或真实Provider有效effort的证据。本片不能独立关闭全部P05/P06、DF-06或G1–G5。

后续沿[Release裁决](../../engineering/release/review-intake-2026-09-13/README.md)继续真实探针、其余能力故障路径、Core Review发现性与最终候选门。本片未push/部署。
