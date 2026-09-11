# BE-6/BE-7 首片 · 声明式Skill提案

状态：Astra已裁的可施工边界，尚未实现。它细化[既有backend requests](../../mvp/execution/work-surface-kit/backend-requests.md)中的Runtime R4/R5，不另立同义队列，不代表完整Expert安装/回滚能力。

## 一条真实链

Agent提供Skill文本 → Host解析并保存不可执行的proposal → Runtime管理面显示草稿及准确diff → human批准精确版本 → Host在原配置队列/CAS内应用 → 下一新Run编译该资源 → 显式runtime_load留下使用证据。

首片只收既有`skill`声明式文本，初始目标限发起Session作用域。无URL/repository/path扫描、脚本、bundle、MCP连接、hook、provider修改或Memory写入。Skill正文可提到脚本，但首片明确不加载执行；allowed-tools仅为声明，不授予权限。将来扩展scope单独复核，不照搬输入中的任意Agent/User/System枚举。

## 所有权与状态

- Host控制面拥有proposal与决定回执；复用resolver的精确content/artifact hash、校验器和配置mutation queue，proposal不是新的可执行资源registry。
- 作者身份从真实Session/Run上下文取值，human决定从认证入口取值；客户端不能自报`created_by:user`冒充批准。声明origin保留unverified，不从URL或名称推导信任。
- Draft记录proposal id/revision、发起Session/Run、精确kind/title/content hashes、目标id/scope、预期config revision、差异与必要来源。未apply的draft不出现在compiled capability set。
- Edit产生新revision并使旧review失效；reject有持久回执。Apply必须核对proposal revision/hash、目标scope及当前config CAS。冲突显示需重新review，不能静默rebasing或批准未来版本。
- 首片人类apply只作`put`，不捆绑policy放宽；现有exposure规则与compile事实照实展示。UI分别显示资源已录入、是否暴露、是否已绑定新Run与是否实际加载。
- Draft提交通道可以在Run内工作，但不得修改当前Run的绑定。Apply仍遵守现有active-Run freeze与配置队列。模型侧只获有界propose能力，没有approve/apply权限。

`propose`是metadata/content ledger写入，不调用`operation:put`、不改变effective resources、不递增runtime config revision。Proposal ledger有自己的revision；无论落在同Host配置文件还是RuntimeStore，都不成为第二个capability registry。后续apply才在既有active-run freeze/CAS队列内执行配置变更。

BE-6结果字段必须完整映射：`source`绑定解析artifact/content hashes；`target`绑定资源id、Session scope与预期config revision；`operations[]`首片只有准确的put；`effectiveDiff`展示旧/新内容及实际暴露后果；`permissions delta`声明无policy变更（不等于新Skill无需review）；`contextImpact`显示metadata/显式正文加载带来的字符变化，不假称精确token；`trustImpact`保留agent-created/unverified与声明的tools；`persistence`明确session；`rollback`指向准确先前资源版本或新增资源的移除计划。上述完整结果与proposal revision一并绑定为批准摘要，修改其中任何字段都使旧批准失效，不能只绑定正文hash。

## 原子性必须先于施工冻结

现有importer和未来proposal存储不能靠两次无协调文件写入声称事务完成。实现作者必须在Host owner内给出crash-safe决定/配置提交方案、幂等键与恢复路径：成功回执绑定实际配置revision；重放不重复put；崩溃后只允许恢复为明确pending或已应用的同一结果。失败不得让UI显示已生效，也不得丢失先前有效配置。该设计由Astra先裁，再由Luna执行有界实现；这不是新增用户审批门。

按BE-7保留明确current pointer及fail-back不变量：失败时current仍指向最后有效配置，不以“写入失败后无配置运行”代替fail-back。Proposal、Apply、Rollback与逐版本DecisionReceipt均须持久且可inspect；Receipt包含可信决定者、proposal revision/批准摘要、前后配置revision、结果与幂等关联。first-slice没有外部package时，逐版本绑定指向该Skill artifact版本；不声称获得插件包事务能力。现有临时文件rename本身不能证明跨proposal/配置/receipt的一致性。

Rollback作为新的人类请求，经当前CAS恢复先前资源版本并留下新回执；不倒退全局revision、不抹audit、不自动恢复旧权限。不具备这段证据时，只接收明确命名的proposal/apply子片，完整BE-7继续开放。

## 前端与验收

复用Runtime Workbench目录/详情和现有diff、button、focus/overlay规则；草稿区显示作者、scope、变更、状态及Review动作，聊天仅链接真实proposal id。不存在的Apply endpoint不渲染可用按钮。Nearest precedent为[Runtime view](../../../app/web/runtime-view.mjs)，scope/revision沿[HTTP contract](../../../docs/runtime-control/api.md)；施工时按[continuity](../../design/agent-interface-2026-09-10/frontend-contract.md)记录固定版本及布局证据。

验收使用独立合成目录和本地fake provider，覆盖：agent身份不可伪造；无效/超限文本；draft不入compile；跨Session拒绝；edit后旧批准拒绝；CAS冲突；active Run冻结；reject无配置变化；重复apply；崩溃/重启恢复；apply后下一Run metadata出现；runtime_load精确正文和trace；历史Run绑定不变。前端补空/错误/冲突/待审/已应用、键盘与返回焦点、宽窄明暗。作者证据与非作者验收分开。
