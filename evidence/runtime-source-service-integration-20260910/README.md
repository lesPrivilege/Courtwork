# BE-5 非作者复核与合流回执

2026-09-10，Astra接收用户转交的实现回执。从实际main `5909f2fac7750ccf5b45eec838c447f9ca0509be` 建独立临时树，接收代码 `9cbae87` 和作者证据 `470498b`，组合 `a41b590` 无产品冲突。原作者范围与测试见 [作者回执](../runtime-source-service-20260910/README.md)。

## 架构接受

代码只有一个路由、一层service解析/错误适配；复用既有纯resolver及host认证/body边界。没有改变parser、存储、Runtime loop、Core、schema、依赖或前端。输入/输出沿冻结合同，locator保持unsupported；source hash和语法接受不授予安装、许可或执行。Astra未修改产品实现，作者交付接受为有界HTTP检查接缝。

Astra补齐INDEX和source-resolver末段的过时说明、工单状态/current/后端台账。完整R2获取、R3兼容、R4/R5提案事务与UI消费仍未交付。

## 独立验证与组合回归

非作者Astra编写 [独立测试](independent.test.mjs)，没有修改作者的6项测试。对实际startServer/HTTP使用全合成目录、port0：

1. NFC/NFD、BOM、emoji、CRLF的content bytes/hash独立计算且不归一化；同内容改title不改content hash，但改变artifact identity。
2. 活的本地HTTP canary先后正对照确能被访问；locator、inline MCP和declared origin解析期间命中数不增，来源仍unverified、granted空。此证据是有限路径检查，不声称OS网络隔离。
3. 12个并发合法/伪target请求与错误token反例，分别正确200/400/401；store快照、runtime-state原字节、资源目录/revision不变，logger没有合成来源canary。

独立3/3通过，见 [日志](independent.log)。源码只读确认纯解析路径不访问I/O；作者guard子进程测试作为作者证据单列，不重标为独立验证。

组合 `a41b590` 全量 **352/352**（包含作者6项与最新main现有测试），[日志](tests.log)；[smoke](smoke.log) passed，local-fake。独立3项单列，不累加成全量355。后续改动仅文档/证据，没有产品集成补丁。

复跑（仓库根）：

```sh
node --test evidence/runtime-source-service-integration-20260910/independent.test.mjs
npm --prefix app test
npm --prefix app run smoke
```

## 两项观察的裁决

- **1MiB超限**：共享body reader先destroy request再抛413，客户端观察到断连，不能保证JSON 413。BE-5继承既有有界拒绝，作者测试验证随后正常请求仍成功；本次作为明确已知限制接受。未来若要可显示的413，须另做宿主级body lifecycle修复与全路由回归，不扩入本单。
- **过时文案**：INDEX的“no HTTP”及source-resolver末段“not a UI-ready service”已改为认证HTTP检查可用、UI消费缺席；不宣称获取或安装能力。

无个人数据、真实provider、凭据读取、外部发送、部署或数据迁移。共享main既有前端证据未提交修改保留，G1–G5不关闭。
