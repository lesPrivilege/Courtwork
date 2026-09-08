# 第二自足节点 · Astra独立集成回执

输入：Fable `claude/wsk-integration` @ `0a307802b61a6847ee88bfea870bdf340647caee`（WK10a + r2）。本回执区分对Fable交付的独验、Astra修补的作者测试与Luna独立复核；不把作者数字当独验。日期2026-09-08，Fable原始记录标2026-09-09，原文保留。

## 当前结果

| 验证 | 本轮实际结果 | 范围 |
|---|---|---|
| 原候选unit/integration | 两次136/136 | `tests-baseline.txt`、`tests-repeat.txt`；独立临时数据，未复现作者报告的135/1 |
| Astra修补后全量 | 139/139 | `tests-final.txt`；新增3项语义回归，既有MCP反例增加parent gate断言 |
| 有界接缝 | 18/18 | `tests-seams.txt`；编译字节、贡献计数、历史binding、模板draft-only与覆写/闸门区别 |
| Fable布局断言 | 30/30 | `layout/dom-assertions.json`、`layout-checks.txt`；是当前快照几何事实，不是最终设计批准 |
| Home交互 | 7/7 | `home-checks.txt`；另用零项目的干净数据服务 |
| MCP与runtime控制UI | API true→false→true；契约20/20（原19项+parent gate浏览器反例）、反例9/9、视口36/36 | `mcp-api-baseline.json`、`rc/*.json`；真正连接独立loopback fixture，不依赖example.org |
| 色彩 | lint两项通过，对比76/76 | `contrast.txt`与`tests-final.txt`；不代替用户四轴判断 |

第一轮RC契约先于fixture连接，`remote-tools`失败；连接后通过。后续旧单段条断言与WK50不符，复核后改为实际分桶数≥2才出条。新计数说明漏写“characters, not tokens”被浏览器断言捕获，补回后契约19/19；反例与视口此前已分别9/9、36/36，未将失败日志擦成通过。`rc-final.txt`保留修正说明前18/19，补入parent gate反例后为20/20；最终以`rc-contract-final.txt`与最后生成的`rc/runtime-ui-checks.json`为准。

## 接缝补齐

- Parent gate追加到权威provenance，子工具仍不能越过父服务器曝光/运行闸门。UI只把explicit override当可撤销覆写，避免把强制闸门显示成用户可移除的设置。
- `context[]`明确定义为admission catalog。新增`admittedCharacters`精确对应原有编译文本，`deferredCharacters`是未自动注入的正文；模板自动贡献为0且仍draft-only。提示词字节不变、无新执行权、无存储迁移。旧binding继续标部分计数，不用当前资源回填历史。
- BE-13在正确fixture下未复现，浏览器disconnect状态也能回翻；不因旧失败猜测并改写MCP生命周期。
- 旧`2726805`的未闭合desktop media在接收SHA已不存在，本轮没有再修CSS。

## 前端 ↔ harness对照

| 表面/动作 | 真实owner与回路 | 本节点处理 |
|---|---|---|
| Home / Continue /待处理与待检查 | `app/web/app.mjs` → `GET /work-summary` → `app/server/work-summary.mjs`从store导出；三个集合不等同于Matter接受 | 现有分页、身份与恢复通过既有测试；新增activity/day接口继续记BE-1/3；版面位置留Fable |
| Composer创建与发送 | `app/web/app.mjs` → project/session/run API → `app/server/service.mjs` admission与run store | Home7项、权限与幂等测试；无effort契约时继续不画；不强制Desktop沉底 |
| 权限/提问 | questionId、runId与明确答案 → questions API → runtime action admission | 现有exact-argument/race测试；permission允许不替代成果commit |
| Runtime曝光/继承 | `runtime-view.mjs` → CAS PUT → `control-plane.mjs` scopes/parent/profile/policy →返回snapshot | parent gate因果补齐；409不静默重提 |
| MCP连接与断开 | UI lifecycle → service配置队列 → MCPManager live handles →重新inspect | 本地wire + browser实测成立；连接不授予曝光或运行许可 |
| Next-run与recorded context | `runtime-view.mjs` → runtime-context → control binding/compiled context + recorded load events | 注入目录与待加载正文拆量；历史内容及数值不回填 |
| Preview/workspace/file/Run | `surface-modules.mjs`登记与`app.mjs`host委托 →原workspace、run、surface读取与renderer | 布局30项、身份/切换与零重复读取；BE-2是多文档实例状态，现有kind tab不能冒充 |
| 领域成果 | `app/extensions`与既有surface/actions →领域Core状态与验证 | 保留已有owner；WK10b Review纵切仍待做，不用Chrome按钮伪造Matter接受 |
| 未知效果/恢复 | MCPManager unknown → Run事件/terminal state →既有Run呈现与no-retry限制 | 两种wire失败的后台测试通过；B-10浏览器Run链仍未验，不增加配置面伪造unknown入口 |

路径均相对仓根。固定输入源码为上述0a30780；修补路径与提交由集成交接指定。

## BE-1…13裁取

| BE | 处置 |
|---|---|
| 1 | `work-activity`未实现；后续以recorded run/UTC day冻结接口，当前不画伪热力图 |
| 2 | 多文档实例与选中状态尚待契约；现有surface kind/runId/fileRef保持 |
| 3 | work-summary只有project/分页参数，未提供today过滤；不静默选择时区 |
| 4 | B-1因果与B-2/B-4计数/入模边界已补；B-10保留浏览器覆盖缺口 |
| 5–9 | Resolver、Proposal/Diff、事务apply/rollback、Expert代际、兼容矩阵属于后续R/H切片；本次不借合流扩大为全量实现 |
| 10 | profile/policy已有CAS operation与scope校验，见`docs/runtime-control/api.md`；缺的是后续Workbench编辑表面，不重复造API |
| 11 | resource kind枚举已有hook/memory_provider/registry/secret/sandbox；真实adapter支持与可编辑入口各自判定，不把枚举存在当功能可用 |
| 12 | provider-models仅reasoning布尔，无强度集合/配置值；继续不画，后续按真实provider adapter定义 |
| 13 | 正确loopback setup下API与浏览器往返通过；旧报告保留并标为未复现，未修改wire代码 |

## 尚未关闭

作者所报一次135/1未提供失败用例名或原始失败栈；本轮两次136/136和修补后139/139均通过，不能声称已定位或修复flaky。保留给fresh Astra在有失败证据时定位，不能盲目延长超时。

真实provider、VoiceOver/NVDA真机朗读、IME/真实触控、桌面壳env与200%缩放：未运行。CUA当前Home可访问性树显示原生select的整句选项（Ask before writing / Workspace writes allowed / Read only）；这不是VoiceOver朗读证据。若后续真实朗读失败，再回退可见双词标签。

最新用户明确：Desktop优先，composer沉底仅窄宗范式且可暂缓；Continue等版面位置留Fable。这里的几何PASS不关闭其设计待办。WK10b与WK11由Fable使用合流基线后派发。

## 复现与原文保留

Node v25.9.0；独立app端口18881、MCP18882、零项目Home18883。运行`npm --prefix app ci`与`npm --prefix app test`。用全新数据目录启动app，先以`MCP_PORT=18882 node evidence/node2-independent/rc/mcp-fixture.mjs`启动本地fixture，再以`RC_PORT=18881 node evidence/node2-independent/rc/seed-fixture.mjs`建synthetic数据并连接。`RC_APP=http://127.0.0.1:18881/ RC_PORT=18881 node evidence/node2-independent/rc/verify.mjs`串行跑套件；`RC_ONLY=contract`只复跑契约。所有控制动作仍经真实受保护API，不读取个人凭据。不要并行让多个浏览器套件修改同一个fixture。

来源文档在`document-intake.json`登记sha256；此前未提交的94个工程文档/画布输入已按明确路径保留为独立提交。来源输入和历史调查保留原字节，含Markdown硬换行与末尾空行，所以全仓原文导入的whitespace检查有已知提示；产品修补的`git diff --check -- app docs/runtime-control`通过。唯一重叠的色彩契约采用交付的WK10a-r2扩展版，保留四层原则。


## 独立复核与合流

Luna复核见`seam-independent-review.md`：18/18独立运行，无P1；指出一个父级闸门下子开关的P2，Astra修正后Luna只读复查闭合，无新增P1/P2。产品修补提交`dbf12b3`。工程输入保存提交`24d6497`与UI/修补支在`7df1f6c486db8f1558dc0020ff4a62281856e207`合流；三个add/add文档冲突分别保留WK10a-r2完整色彩契约，以及包含最新用户Desktop边界的交接包/集成说明，其余输入原文保持。

Astra实际查看了本轮生成的1440深宗收敛态与1200浅宗展开态截图，确认悬浮卡和主区scrim/侧栏交互范围与交付相符；其余截图仅生成，未逐张目视。截图为本地fake provider synthetic会话，不作公开真实产品案例。
