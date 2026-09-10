# 上传包接收回执 · f1700fb0

用户授权：合并入账并清理列出的三个原文件。本次是附件归档/完整性接收，不是产品代码合流或逐条架构接受。

## 字节与版本

- 原ZIP：[Courtwork-HPR-d22eb66-review-20260910.zip](originals/Courtwork-HPR-d22eb66-review-20260910.zip)，124826 bytes，SHA-256 `f1700fb0957035c4659ac4309edd97ee1b83ccb59f2ba6e66a1c29fb0c649ef3`，与用户附带[校验文件](originals/Courtwork-HPR-d22eb66-review-20260910.sha256)一致。
- 独立[FULL_REVIEW.md](originals/FULL_REVIEW.md.txt)，79150 bytes，SHA-256 `b498d56fad7e96cfc83ed784c9725f112a066b53f96bde4851165a8eea39f9cc`，与ZIP内同名文件逐字节一致。独立原件仅加.txt归档后缀，避免它的同目录相对链接被误作活动文档；字节不改，日常阅读使用完整解包目录。
- 解包36个文件，总294266 bytes；已检查无重复/绝对/父目录逃逸路径或符号链接。
- 包实际包含24个HPRO条目、13个工单P00–P12，与对话初版规模相符。**不是后版声称的14卡/316条款包**；后版声明ZIP hash `ab8c14cb…`仍未取得。不能混用版本与编号。

## 已执行核验

阅读verify-package.py后运行（只检验本包）：34个manifest artifact哈希/大小通过；SHA256SUMS通过；24个ID唯一、13卡双向映射通过、依赖DAG无环；所有localDisposition仍为null；组合报告包含分件全文。参考MCP源码Git blob为`055e66223a91eec4a4aade665f8d96af488e9573`。未运行包内参考实现/探针或产品测试，不将包校验计为产品独验。

## 消费状态

[解包阅读入口](courtwork-hpr-review/FULL_REVIEW.md)及机器台账均已保存，可以按版本完整追溯。目前完成字节入库与结构检查，未声称逐字审完正文或逐项裁决24项；不把本包条目填为已接受。下一步先确认用户要采用本上传版还是补齐后版，再按[回收规范](../../README.md)登记本地处置与施工映射。后版的P01/P02是条件性Q03整改，本包P01/P02是MCP边界，不可交叉派工。

## 原目录清理边界

只在仓库副本核验且提交合入本地main后，将用户列出的Projects根下三个原文件移至系统废纸篓：FULL_REVIEW.md、Courtwork-HPR-d22eb66-review-20260910.zip、Courtwork-HPR-d22eb66-review-20260910.sha256。具体完成情况见本session最终回执。其他Projects文件、工作树、个人数据均不动；本轮不push。
