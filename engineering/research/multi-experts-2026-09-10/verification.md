# 文档交付验证

范围：Astra作者检查、Luna有界只读探索/映射复核；不是产品独立接受。基线 `8b1e0b143f7091da0acba3ee24af58595e721eb8`，日期2026-09-10。没有运行provider、升级用户数据或改变runtime/schema。

## 可复现命令

在仓库根目录运行：

```sh
python3 engineering/research/multi-experts-2026-09-10/verify-intake.py
node tools/check-doc-links.mjs
git diff --check
```

完整性检查通过：3页10+10+3，23 turn/44消息，45外链出现/44唯一URL，HC/RA/AT 22项均在计划映射。原始JSON SHA-256：`d3d433d7756b2d064a283dd17a3812afa3f7dbd95241dd1fb2fb2620828835da`。每条消息hash、字符数和原始ID见[source-manifest](source-manifest.json)，本脚本可用`--write`从保留原文重建manifest。

文档链接检查及空白差异检查通过；全量产品测试不适用于本次纯研究/文档变化。校验脚本验证来源结构/覆盖/哈希和编号存在，不能证明语义消费质量、外部来源真实性或产品能力；这些由逐条处置和阅读范围说明承担。

## 复核边界

Luna补核21个准确目录标题、两份社区仓库、HiGMem/APEX-MEM，结果见[探索](exploration.md)。目录和摘要阅读不升级成论文/全书复现，仓库README的测试声明不升级成本项目测试。Astra保留关键owner、权限、no-replay、Pi默认与延后路线的裁决。

Luna随后对文档包作有界只读复核：HC/RA/AT 22项各一次、21标题一致、T19–23后半段决定完整、planned/current与owner无明显冲突，未发现阻塞项。唯一措辞意见是RA2可能让人误以为RPC已有；Astra将该行明确改为当前生产入口是Pi coding AgentSession SDK、RPC未接。此复核仅覆盖所列文档映射，不替代全部来源全文或产品行为审查。

共享main工作树仍有既存`evidence/fe01-main-integration-20260909/wk98-regression.json`修改及`site/verification/main-20260910/`未跟踪目录；本次均未触碰。隔离分支只提交本研究目录、current与roadmap。远端main落后本地BG-02的六个提交，PR正文单独准备，见[pull-request](pull-request.md)。
