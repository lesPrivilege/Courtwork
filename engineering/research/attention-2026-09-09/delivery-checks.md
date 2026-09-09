# 本轮文档与手动起步核验

日期：2026-09-09。Courtwork读取基线 `683b6d1419242bd08d20b7deec77ce12af7dcf12`；Paper基线 `d78fd312955c1f594e59cbdcbb0d3074ac355940`。

## 来源覆盖

Astra通过网页会话接口读取两页，分别10与3个turn；每项文本上限20000字符，返回项无truncated标记，第二页hasMore=false。原始文本分两份本地保存；[来源索引](source-index.md)登记turn、外链与字节摘要。Astra另通过接口返回的附件路径实际目视IMG_2378.jpeg。截图只支持来信展示的内容，不证明隔离实现或邮箱当前回复状态。

完整对话及截图仅存个人项目private目录并被Git忽略。本包不提交原文、私人邮件或个人运行状态。

## 写作与复核责任

- Luna撰写Courtwork三个准备文档，并依据实际代码核对Core/RuntimeStore/service/UI接缝；Astra非作者复读后接受其作为候选施工输入，另亲自修正维护授权、物理存储与验证范围。
- Luna核验外部局部实践并编制来源/选型索引；来源自述、代码读取、运行验证分别标明。
- Luna提供Paper研究稿；Astra复读Canonical摘要、PI-20/21与验证队列后，亲自重写最小PI-22，撤下候选正文。Luna对Astra的17行Index改动做非作者复核，确认条目归属、编号和既有正文支持；固定产品来源引用在最终提交时绑定。
- Attention Assistant scaffold由Astra编写，Luna只读复核。JSON解析、registry/state的id/revision/status一致性、last_event_id引用与Git忽略规则通过。

## 验证范围

本次没有产品代码改动，不运行真实provider或全量产品测试。检查Markdown相对路径、Git diff空白、私有文件排除及本地JSON一致性；Paper正文、版本与发布产物保持不变。未运行跨Session/跨Runtime受控对照、自动ACL、并发CAS、成本或质量实验。一次文件化起步不替代这些证据。

Codex项目注册未完成：项目工具没有添加文件夹能力，电脑控制接口禁止操作Codex自身。个人目录与手动入口已就绪；用户UI添加是剩余应用操作。

## 主线文档合流

准备提交b260feb形成后，主线收到d112beb截图交接。本次在隔离树合并，唯一冲突是current.md末尾的两段追加，完整保留并补一段共同状态；ATT-FE-01链接既有视觉交接，未重复编号或改产品代码。
