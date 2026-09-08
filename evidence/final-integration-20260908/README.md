# Fresh Astra · Fable收尾后的Web联调回执

2026-09-08。Fable交接提交 `bcbca1b3b6b848f8976a12e697e0972cf975b3bf`，其中产品代码截至 `0bc416b`。本轮在独立树接收该提交，纳入等待期间已独验的后端解析切片 `dc75404`（本树 `c1b19f6`），再以 `0a3b9b22f47f5605ccedc227106b0c17a4df6120` 完成两项有界修补。**此 SHA 是本轮固定代码基线**；之后的证据/同步记录不改变产品代码。

## 实际改变

1. MCP/非写工具权限不再被称作 file write。仅 `payload.tool === ws_write` 使用写入词，其余使用 action；远程 tool/server/source来自同一Run的recorded runtime.bound，缺失历史不从当前catalog回填。Home summary缺tool字段时称Permission requested。API、exact-call参数、allow/deny与服务端owner不变；文案体例/Review说明同步。
2. Fable已把Home条件句移到框外，但原CSS没有内容列约束：1440下form left475/width740，status left278/width1134。补max-width、auto边距与内容padding，维持既定Home留白/composer高度。见`home-status-before.json`与最终几何/截图。没有重新安排Continue或桌面composer。
3. Fable交付引用的`user-message-audit.md`及WK-76 intake当时未进交接提交。已从fresh候选的未提交文件原字节保存，来源/hash见`intake.json`，没有改写writer工作树。Fable的19/27是作者消费报告，不转换为本轮27条独立产品验收。

## 从源码到浏览器

Node v25.9.0、npm 11.12.1；`npm --prefix app ci`，277 packages，audit 0 vulnerabilities。当前原生MJS无独立build script。实际执行`npm --prefix app test`及`npm --prefix app start -- --data-dir <全新仓外synthetic目录> --port <独立端口>`。本轮应用19011/19013、MCP19012；零项目Home先19014，再用19015验证空态修补，互不共享数据。没有运行真实provider或读取个人凭据。

| 检查 | 本轮结果 | 证据 |
|---|---|---|
| 全量unit/integration | 146/146；最终远端独立clone再次146/146 | `tests.txt`、`remote-tests.txt` |
| 静态模块、MIME、未知/源码路径拒绝 | 23/23；浏览器实际17个MJS请求200、未捕获JS异常 | `static-modules.json`、`browser-loading.json` |
| 干净Home交互 | 7/7 | `home-final.txt` |
| Home→回答→精确写allow→录制File身份/内容→Preview fallback→deny→Stop→离线/重连 | 9/9 | `run-chain.json` |
| MCP权限→丢失远程回执→unknown→reload | 3/3；后端code=mcp_effect_unknown，重复调用脚本wire仅1次 | `mcp-unknown.json` |
| 真renderer/source/action与加载故障fallback、恢复同一draft；provider失败/新Run恢复 | 6/6 | `extension-recovery.json` |
| RC CAS/来源/context/parent gate/MCP lifecycle | 契约20/20、反例9/9、视口36/36 | `rc/results.txt`及三份JSON |
| Home空/列表 × 1440/390 × 浅/深 | 8/8；空态条件句同列、无横向溢出、textarea64–160 | `home-empty-geometry.json`、`home-rows-geometry.json` |
| 颜色lint | 两项通过 | `lint.txt` |
| 独立Luna复核 | focused25/25；独立MCP同run来源与调用前门控、状态句宽度复核；文案P2澄清后关闭 | `independent-review.md` |

实际目视：修补前/后1440浅宗空Home、最终1440深宗有列表Home、MCP pending权限卡。其余截图生成并做几何断言，未逐张目视；不能将其称为全面视觉验收。

## 可复现命令

- 控制面：先`MCP_PORT=19012 node evidence/final-integration-20260908/rc/mcp-fixture.mjs`；在19011独立服务上跑`MCP_PORT=19012 RC_PORT=19011 node evidence/final-integration-20260908/rc/seed-fixture.mjs`；随后`RC_APP=http://127.0.0.1:19011/ RC_PORT=19011 node evidence/final-integration-20260908/rc/verify.mjs`。
- Home：空数据服务上`CHROME_BIN='<Chrome binary>' WK6_CDP_PORT=19645 WK6_BASE=http://127.0.0.1:19014 node evidence/final-integration-20260908/home-checks.mjs`。
- 主链：已有Home项目的独立服务上，串行运行`APP_URL=http://127.0.0.1:19013 node evidence/final-integration-20260908/run-chain.mjs`、`mcp-unknown.mjs`、`extension-recovery.mjs`（后两者同目录）。共用browser helper，勿并行占用同一CDP端口/数据。
- Home几何：`HOME_STAGE=empty|rows APP_URL=<匹配状态的服务> WK6_CDP_PORT=19647 node evidence/final-integration-20260908/home-geometry.mjs`。真实Chrome headless经CDP；media/viewport是模拟，不是真机读屏/触控。

## 失败保留与归因

- `home.txt`的7条行为断言通过，但Chrome尚未退出时清理profile触发ENOTEMPTY。最终脚本等exit再rm，空目录复跑通过。此前旧Home脚本只等session ID出现即读runs的竞态，也改为等实际Run receipt后仍断言恰好1个Run；没有延长产品timeout。
- extension的三份setup-error保留：没有先load扩展、错写expand按钮ID、Page.reload之后读取到上一document状态。修正fixture准备和navigation marker后通过；没有据这些错误修改产品。
- 先前暂停轮的MCP终态断言读UI增量Run对象上的error字段（该字段不一定已hydrate）曾失败；本轮同时核对UI unknown与GET /runs/:id持久错误回执，wire保持1。没有改unknown/retry实现。
- 原作者135/1无失败栈的报告仍未定位；本轮没有复现，不声称已修复flaky。

## 保留的收尾归属

| 范围 | 后续owner/入口 |
|---|---|
| glyph语义、热插拔槽位、Chat Flow/行卡、Review纵切、Home下带两态、旧三栏文档 | Fable WK10b，沿现有工单；不以本次扩展renderer fixture关闭H1/H3领域契约 |
| Workbench、二级信息编排与对齐 | Fable WK11，消费真实Runtime Control API |
| activity/UTC过滤、多文档实例、完整source acquisition/proposal/apply/rollback/Expert版本、模型effort | Astra既有BE/R/H阶段；本轮R2仅只读解析模块，无HTTP/UI/model工具入口 |
| 真实provider、VoiceOver/NVDA、IME/触控、桌面壳与200%缩放 | not_run，不能由fake/CDP替代 |

Paper仍为PAPER.md固定9.3。无公开部署、DMG、legacy main/default branch变更或SE发版。候选推送与远端独立clone均完成，见 [同步与复现回执](sync.md)。
