# VG01 main integration · 2026-09-10

用户授权接收 `claude/vg01-figures@2eca4885a7f1ebab4c6e8b7d38e76ffbe3d09a50`，main 基线 `9c8b64e85e1b4a906dcd23cd5be621da1ba90638`；基线为候选祖先，接收其10个提交。范围为 Opus 图示、Fable VG14–20 文档裁决、Pages 校验与发布门；无 app 产品或 schema 改动。Registry 移至 engineering/design 留待 Fable 后续处理。

## 非作者核验与裁决

Luna 在固定候选的独立 detached 树重建两次，71文件哈希一致；链接71文件/184项、材质零问题、10图示零问题、public-data 3/3、文档735份/3451链接通过。Luna 使用仓库 verify 脚本经 headless CDP 重跑，见 [verify](independent-verify.json)、[matrix](independent-matrix.json)：28/28、V9四项与V10六项通过；此项不是 CUA 交互验收。最终候选已有完整截图归档于 [原交付](../publishing-visuals-20260910/README.md)。

三个独立负例均退出1，恢复后退出0：[第二处红](N1-second-red.log)、[缺desc](N2-missing-desc.log)、[文本溢出](N3-text-overflow.log)、[恢复](restored-pass.log)。固定旧标本检查因候选HEAD不等于标本固定9e5384f而拒绝，该检查不属于本次 Pages workflow，不宣称其通过。

Astra 另以 CUA 检查最终页面1440与390宽度，见 [实际观测](browser-final.json)、[桌面](pipeline-final-1440.png)、[续图](pipeline-final-1440-continuation.png)、[手机](pipeline-final-390.png)。Retrieve 对象与 Compile context projection 标签可读；390页面无横向溢出，720宽图示在342宽容器内横向滚动。Astra 接受上述有界 Pages 交付；不代替 G1–G5、真实provider或全产品验收。

## 独立研究入账

随后按用户授权登记 [Codex 与 Courtwork 对比](../../engineering/research/codex-courtwork-comparison-2026-09-10/README.md)，来源提交 `be23540f7554a2ebc9e285ab39c3e0a583b1839e`，本树 cherry-pick `967ca0be32d4cabb603f34a202c0f305d24478f4`。完整可访问1轮2消息入账，外部2026产品主张尚未核验，不构成架构采纳。

本轮仅本地 main 快进；未 push、部署、迁移个人数据或调用付费provider。共享 Claude checkout 的未提交工作保持；Controls/Demo 候选未合入。
