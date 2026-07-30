# PI-SIDECAR-DIST-1R5-ACCEPT · 独立验收冻结件

状态：已冻结，待独立验收领取。

本件由架构角色冻结验收范围，只服务 `PI-SIDECAR-DIST-1R5` 的独立验收。契约真源仍只认
`main` 上的 [ADR-022](../../../docs/decisions/ADR-022-pi-lane.md) 六-E 与修订记录、父级
[`SPEC.md`](../SPEC.md) R5 节、[实现就绪图](../../../docs/architecture/implementation-readiness.md)
同名行；本件不新增契约，只固定目标、允许面与必测项。验收会话不得以组合树内文档替代 `main`
契约（R4 教训：分支树内 ADR 曾缺 38 行现行条款）。

## 一、目标冻结

- 分支 `codex/pi-sidecar-dist-1r5`，目标 SHA **`6cdb9ba`**（不可变；patch-equivalent 不算同一枚）。
- 实现提交链：`eb90bc6`（T1 四闭口 + 25 枚新判据）→ `7e2eb31`（T1b preflight-only XML 投影与
  failures 摊出）→ `825f3bb`（T1c 死赋值，**矩阵取数 tip**）→ `9466b51`（T2 docs）→
  `6cdb9ba`（T3 docs）。改动面恰七文件（四代码 + 三文档）。
- 架构契约链：`9b8705f`（R5 冻结）→ `45a9db8`（配方修订）→ `4812acf`（移植落位订正）→
  `5ec9839`（C3 锚点补拍）→ `db3b5d7`（串味测试改写追认）→ 本件提交。

## 二、组合树复核义务（先于一切实测）

1. base `5ec9839` 为目标祖先；`5ec9839..94f662e` 恰 16 枚。
2. 十四枚 cherry-pick 逐枚 `git patch-id --stable` 与源提交（父级 SPEC R5 节链表）相同。
3. 两枚标注 `[架构移植]` 的 ACCEPTANCE 证据件：源 `ba374d8` 的 74 行 added-lines SHA-256
   `cd9c553592a8ebb78c272720feb98b5e1e58c477bb616074da05710cc2452cb4`、源 `eb71d6f` 的 122 行
   `49694a9feb437b28b79c75b90b5891f2454ff6541b11be5d0a4a21ed86564d28`。
   **验法用区域提取对照，不用 git diff added-lines 提取**——后者在块首尾空行上有对齐歧义
   （同一文件字节可给出两种 hunk 描述），架构侧已实测。
4. untouched R4 target：`packages/pi-lane/fixtures/sidecar-dist` 树对象与
   `docs/engineering/pi-sidecar-dist-1.md` blob 在 `07d2dbc` 与 `94f662e` 下同值。
5. `94f662e..6cdb9ba` 恰五枚；T2、T3 相对 T1c 对 `scripts/` 的 diff 为空。

## 三、验收环境

- **全新会话**，独立 clean worktree（不进实现树 `/private/tmp/courtwork-pi-sidecar-dist-1r5`）。
- 自装依赖（`--frozen-lockfile`，禁改 lockfile）；**旧 `dist` 零消费**——不读实现树 `dist/`、
  不以实现者 manifest 代替自跑；实现侧留档只作对照取证。
- 自用 fresh execution-domain id（`[a-z0-9][a-z0-9-]{0,31}`，前缀不得与 `impl-r5` 相同）。
- 长跑期间**禁并发**任何仓库门、测试或矩阵项：探针带 15/30 秒级具名 deadline，负载会造假红。

## 四、实测义务（严格串行）

1. verdict 定向测试全量（预期 **384/384**；356 基线 + R5 增量 28 分计）。
2. 空 assembly 复跑：来源门双架构、双 cycle、十件 inventory/source、600 cold-start、
   `measure`（assembly 实物闭集）、跨架构注入（须见 `timeouts:[]` 与 `exit:{code:0,signal:null}`）。
3. **既有 76 项回归矩阵全量**逐项实跑→核冻结观察→byte-identical 还原。
   **逐组枚数在此冻结为独立字面量，验收须以本表为期望侧、逐组核对实跑枚数**（承「被测物不得
   给自己出考卷」：期望侧必须独立于被测装置，不得由 harness 自身枚举派生）：

   | 组 | 冻结枚数 |
   |---|---|
   | `sea` | 8 |
   | `fetchextract` | 5（fetch 4 + extract 1） |
   | `repro` | 14 |
   | `measure` | 23 |
   | `coldstart` | 15 |
   | `physical` | 11 |
   | **合计** | **76** |

   **2026-07-30 架构口径订正**：这 76 项沿用 R2 冻结账，精确构成为 **68 个失败注入 +
   8 个恢复／证据对照**，不得把 8 个 exit 0／数值观察伪写成失败注入：

   - `sea`：4 个 `--fail-stage` 失败注入 + 4 个 `:evidence` 对照；
   - `fetchextract`：`truncated:notOverwritten` 数值证据、fetch restored、extract restored 共
     3 个对照，其余 2 个为失败注入；
   - `physical`：`reportsOutside` 为反向对照，其余 10 个为失败注入；
   - `repro` 14、`measure` 23、`coldstart` 15 均为失败注入。

   68 个失败注入须证明变形或物理前置实际成立（有 `applied` 字段者必须为 `true`）并核冻结
   非零退出；有稳定 check 字段者还须核具名判据，其余须核冻结失败观察与磁盘后置条件，不得
   臆造判据名。8 个对照须核各自冻结的 exit 0／数值观察及后置条件。验收还须另造下列
   **8 个 acceptance-owned 失败变体**，逐一证明上述对照所保护的判断面不会因恢复／证据行而
   假绿；每行须独立 applied/变形前置、失败观察、恢复与健康复证，同一变体不得跨行复用：

   | 对应历史对照 | 验收自造变形 | 最小区分证据 |
   |---|---|---|
   | `sea:remove-signature:evidence` | 在真实该阶段失败 observation 上把 row `status` 改报 `ok` | verdict 非空且命中 `seaBuild.status` |
   | `sea:postject:evidence` | 在真实该阶段失败 observation 上把 row `stage` 改报另一阶段 | verdict 非空且命中 `seaBuild.stage` |
   | `sea:sign:evidence` | 在真实该阶段失败 observation 上填入非空 `publishedPath` | verdict 非空且命中 `seaBuild.publishedPath` |
   | `sea:strict-verify:evidence` | 在真实该阶段失败 observation 上把 `publishDirPresent` 改报 `true` | verdict 非空且命中 `seaBuild.publishDirPresent` |
   | `fetch:truncated:notOverwritten` | 让 acceptance checker 所比的 after bytes/hash 与拒绝前错件不同 | checker 必须非零；随后恢复拒绝前错件，再恢复 canonical archive |
   | `fetch:restored` | 恢复后再放入一份非冻结 regular archive 并真跑 fetch | exit 非零、target `rejected` + `problems` 非空，错件仍不被覆盖 |
   | `extract:restored` | 在 extract 交 verdict 前把一格解包身份改成错误 `nodeVersion` | exit 非零并命中 `runtime.nodeVersion` |
   | `physical:reportsOutside` | 把同类 report 实物放入 assembly root 后真跑 `measure` | exit 非零并命中 `assembly.unexpected` / `assembly.count` |

   这 8 个新增负例与历史 76 项**分别计数、不得冒称历史 exact 复跑**。本订正修复的是冻结件
   把历史对照误写成“逐枚非零”的内部矛盾，不降低任何 production 门。

   两处**已知读数陷阱**，验收须避开：其一，`sea` 组会打印 **9** 行，末行 `sea:restore→measure`
   是组后 assembly 复建验证、**不是矩阵项**——把 9 计入会得出 77 的错数（架构侧首轮即误算，
   由实现侧纠正）。其二，`reproducibility-probe.mjs` **不支持** `--list-counterexamples`，
   未知 flag 被忽略、照常跑完整探针并 exit 0，枚举得零而组账印作「共 0 枚，符合 0 枚」＝
   读起来像通过；该组 14 枚名单须从探针源码 `COUNTEREXAMPLES` 表取。**枚举为零或少于本表
   冻结值一律判失败**，不得以「本组无项」解释。
4. R5 新增反例（四门五枚有效）＋验收自造变体；等价形态如实作废、不计红证。实现回执所引
   `scratchpad/r5-stage-{b,c}`、`ce76.mjs` 与 `r5-counterexample.mjs` **未进入 Git 对象**，
   不能称为可复跑交付物；验收须从冻结契约与 production 源码独立重建装置，不得用实现叙述
   代替实际注入，并在报告登记这一 evidence-packaging 缺口。
5. **production mutation 独立注入**：至少覆盖撤跨架构 exit/deadline 门、撤 timeline 严格推进、
   撤 preflight hard verdict、撤 full raw 真源四形；逐枚验证 patch 命中、定向见红、
   byte-identical 恢复，总用例数不漂。
6. **三格 execution domain 自跑**（不得由实现或架构代跑，实现域实测非受限故结构上无法自证）：
   - 受限（seatbelt）域 preflight → 预期 `security_execution_domain_blocked`；
   - 同域缺 sidecar build 混合态 → 预期 `probe_failed`（次序门：control lifecycle/ordinary
     failure 先于 security blocked）；
   - 明确批准的非受限执行 → preflight `passed` 后 full 六格 + 嵌套 `.app` 全跑。
   三格各自 manifest path + 外算 SHA 入报告；域分类以功能 preflight 为真源，环境变量只诊断。
7. **追认复核**（ADR-022 修订记录 2026-07-30 首条）：旧「整份观察绿」形态在 R5 下不可再现；
   串味防护仍有效（五枚 preflight 判据名不出现在 failures）；撤 full raw 真源的 mutation
   使该测试转红。
8. 五仓库门逐门独立退出码（禁管道吞码）：`pnpm -r build`、`pnpm lint`、`pnpm test`、
   `pnpm --filter @courtwork/desktop lint:isolation-binding`、`git diff --check`。

## 五、实现侧已如实登记的过程缺陷（验收只需复核登记属实，不重复归因）

- 首轮 sweep 在 `sea` 组后**假停**约 2 小时：`grep -c` 零命中打印 `0` 且退出码 1，
  `$(grep -c … || echo 0)` 令变量成 `"0\n0"`，halt 条件被计数管道自身触发；真实逃逸为零。
- `repro` 组首轮**静默零**、14 枚从未注入；补跑 14/14 全中（`applied=true caught=true`）。
  首轮「共 0 枚」那行已作废，不得作为通过证据。
- 一枚 R5 反例首版 patch 为等价变异（no-op、零命中），已如实作废并替换为有效形态。

## 六、边界

- 报告只追加 [`ACCEPTANCE.md`](../ACCEPTANCE.md)，明确 PASS 或 REJECT。实现级小缺陷适用
  AGENTS 的 `fix-by-acceptance` 窄例外（红证 + 全量门亲跑 + 前缀标注）；**契约级问题一律
  REJECT，不得代修**。R4 轮那种约 1800 行的验收树返修已被架构判为越界，不得重演。
- 零路线建议、零路线消费；不 merge、不 push 实现链、不动 `current.md`、不真清 `dist/`。
- PASS 后才交架构消费报告裁分发路线；届时 `PI-HOST-LOOP-1` 与 `PI-DEBUG-BUILD-1` 解锁。
