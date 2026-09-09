# 来源、固定基线与核验范围

## 讨论

[考虑解耦提供](chatgpt-conversation://6aa15944-d4ac-83ec-b667-5264664e6da6)，conversation ID `6aa15944-d4ac-83ec-b667-5264664e6da6`。接口完整返回1轮/2条文本，`hasMore:false`，无附件。缓存preview只含答复前段；本轮已读完整返回。保存为 [source-transcript.md](source-transcript.md)，7620 UTF-8 bytes，SHA-256 `1b55ade6c3a854c1c55deaadf00895961b0861add8335af0a2c2e54ff630e4a0`。

唯一原始显式外链：[browser-use/browser-use-pi](https://github.com/browser-use/browser-use-pi)。原答复8个独立内部citation ID没有URL映射：turn649832view0/1/2/3、turn658134view0、turn671630search1、turn844553view0/1。它们仅保留在原文，不声称已恢复原检索。以下为本轮新增的一手核验。

## 当前产品

开始读取 `codex/backend-bounded-20260909@52f75dd`，工作树干净；保持该交付分支不动。在另一个临时研究worktree建立 `codex/browser-capability-research`；获知main合流后快进至实际 `751be02939cd458965b7bdfbe20cb00a13b6e45b`，读取current及BE台账的合流差异再写本包。没有搜索冻结legacy目录。

- [当前状态](../../current.md)、[后端合流](../../../evidence/backend-bounded-main-integration-20260909/README.md)：AM-C局部与BE metrics已合流；AM-B、ES-01和Attention仍未实施。
- [AM准备包](../architecture-maintenance-2026-09-09/README.md)、[AM合流Design](../architecture-maintenance-2026-09-09/integration-design.md)：可替换接口、执行/交付/接受、native/adapted、无第二ledger。
- [ES-00](../../execution/2026-09-09-execution-state/backend-contract-draft.md)：可信recorded版本、完整历史字节、输入覆盖与Core接受。
- [Attention裁定](../attention-2026-09-09/adjudication.md)、[LG](../local-governance-2026-09-09/README.md)：对象owner与最小披露，来源/Intake单独接缝。
- `751be02:app/server/runtime.mjs`、`app/server/service.mjs`、`app/runtime/control-tools.mjs`、`app/runtime/extension-registry.mjs`：现有Run准入、权限、abort、代际与扩展生命周期。

## 上游

只读浅clone取得并固定 `e0df2743e680125a4378d4d578420917620711f2`。未安装依赖、执行构建/测试/脚本、启动浏览器或模型；源码与README不是实际端到端验收。源码package version为0.1.0，未核对npm tarball/integrity或发布供应链，因此不声称已锁定可安装artifact。LICENSE为MIT，未来复制/分发须保留其许可与copyright。

| 一手固定来源 | 本轮核验 |
| --- | --- |
| [package.json](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/package.json)、[LICENSE](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/LICENSE) | 0.1.0、Pi三包固定0.85.1、单公开package与许可 |
| [API](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/docs/api.md)、[types](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/src/types.ts) | schema/partial、hooks、软预算、事件、telemetry边界 |
| [sessions](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/docs/sessions.md)、[browser primitives](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/docs/browser.md) | transcript/heap/login分离，navigation policy非网络隔离、worker非sandbox |
| [index](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/src/index.ts)、[browser](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/src/browser.ts) | run/followUp/lifecycle、JSONL、created/attached资源、cloud不重试 |
| [events](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/src/events.ts)、[history](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/src/history.ts) | bounded queue、原子history写与验证、普通文件清单不等于不可变包 |
| [worker](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/src/worker.ts)、[runtime](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/src/runtime.ts)、[policy](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/src/policy.ts) | checkpoint/IPC、cancel、Node/CDP/域名规则边界；Luna专项复读 |
| [telemetry](https://github.com/browser-use/browser-use-pi/blob/e0df2743e680125a4378d4d578420917620711f2/src/telemetry.ts) | default-on、显式关闭条件、请求外发 |

精确文件hash与本轮验证记录在 [verification.json](verification.json)。Star、benchmark数字、网站覆盖率、模型能力、真实费用、云端profile语义未做验收；不把上游宣传或本轮方案计为Courtwork成果。
