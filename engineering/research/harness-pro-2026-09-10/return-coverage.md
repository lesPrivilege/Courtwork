# Pro 返回覆盖 · 部分回收，等待最终附件

后续收到用户上传[f1700fb0包](received/f1700fb0/receipt.md)：24项/13卡，原ZIP及独立FULL_REVIEW一致性已核验。与下述后版hash不同，故“最终附件未取得”仍成立；两版原文与本次上传件分别保留。

来源：[审查合入送审分支](chatgpt-conversation://6aa2b031-2c20-83ec-b7bb-02e638a4fcac)。本地接单 main `b07c178`；送审文档 `d22eb66`、产品基线 `a2b084d` 不改写。

成功读取2个completed turn、4条消息（2 user、2 assistant），hasMore=false、nextCursor=null；[原始返回正文](inputs/return-conversation.json)完整保存。接口 attachments=[]，`:chatgpt-content-reference` 21/22/23无可用URL，不是可下载附件。原回答声称的源码/上游读取与探针结果只登记为作者自述，尚未本地复核。

## 两版分离

- 初版消息 `53ac3ac1-4c25-4a4b-97ee-244909b117c0`：声称13卡/24 HPRO，P01/P02为MCP分页/效果结算，4项隔离诊断+10项分页参考测试。
- 后版消息 `7053d5f4-7475-4576-8f0b-de0369dea669`：声称18裁决/14卡/60向量/316条款，P01/P02为Q03相关条件性发布整改；MCP分页改为待实际锁定SDK验证，突出structuredContent遗漏及锁owner/发布owner分离风险；声称2个reduced probes。
- 后版是当前返回候选；两版不可混用编号、计数或证据。初版保留历史字节，不删除、不拼装成“已读完整附件”。

## 待回收（阻断完整消费）

最终ZIP声称SHA-256 `ab8c14cb071e81ab0f1d22a52c2ad92f878b91b7d6fe42d43e3531cf650b6d61`，尚未获得字节，未核验hash。缺少14张完整PR卡、18项设计裁决、60向量、316项机器台账、来源/读取范围、双向映射、探针和verify_bundle.py。必须请用户上传最终ZIP或可访问下载链接；拿到后先检查压缩包路径/内容、阅读脚本，再校验与执行，不自动运行未知代码。

## 已读正文的接续定位（不是附件逐条裁决）

1. 保留Pi、不动Matter数据坐标、不先Rust；HarnessDriver与WorkBridge为设计候选，按完整契约复核后施工。
2. 既有compileControlContext/compatible连接等不得被“尚未完备”的概括抹掉；P00须以代码逐项核实已有与缺失。
3. CoreClient惰性启动；zero-Core不等于zero-Python。需核实际依赖，不能仅看constructor下结论。
4. MCP structuredContent遗漏需分别验证模型输入与持久GUI投影；分页用安装SDK真fixture，不直接采纳初版补循环。
5. 锁与发布风险归既有RV26-Q03，先真实进程反例和现有修复证据，P01/P02条件执行，不另起publisher。
6. 保留显式resource roots，memory首版手工文本，关闭注入与清洁上下文不同；web首版受限文本，不宣称通用网页阅读完成。
7. 按后版先P00，再有条件做行为等价P03；本次仅回收，不派实现、不暂停Claude前端。
8. 工程合成、自用真实provider、对外发布资格分列；Pro作者探针不是产品独立接受。

拿到附件后依[回收协议](README.md)逐条填dispositions与implementation-map，核对当前main差异和12个送审输入hash。当前只能称“正文完整回收、附件缺失”，不能称316项全量入账或架构已接受。无产品代码、push、部署或网页外发。
