# ACCEPTANCE: packages/legal

## AUDIT-SEAL-1 · legal S6 声明清理验收（2026-07-18）

- **✅ 放行**：`legal.S6` 的 `toolIds` 由 `['copy-file', 'mkdir', 'file-ops-executor']` 收窄为 ADR-004 无损级 `['copy-file', 'mkdir']`，与 prompt「不执行任何操作，执行发生在用户确认之后」对齐；`file-ops-executor` 是审计裁定 P0 口子①（`runTools()` sideEffect 门模式不对称）在场景层的具体病灶，非独立问题。验收会话以 `git checkout bcafc5e -- src/scenarios/index.ts` 隔离撤回复现红证，连跑 3 次均 **2 failed / 13 passed**（精确命中新增 manifest 断言与联动 golden hash），归位后连跑 3 次 **15/15 passed**。`[需架构拍板]` 留痕在案（S6 未来进入 live 前的 `file-ops-executor` 触发/持久授权/事务日志另议，本单不越权实现执行时序）。全仓 Vitest **1247/1247**、`demo:legal` golden PASS 均在验收 worktree 内独立复跑绿。完整三层报告（含 core sideEffect 门与 desktop 覆盖保护）见 `packages/core/ACCEPTANCE.md` 的 AUDIT-SEAL-1 报告。

---

## VPKG-META-1 独立验收（2026-07-14）

- 验收角色：未参与实现的独立验收会话。
- 基线：`bed44095133723d33de3e153b58a286a886a612b`。
- 实现：`07c317ee4e01aacc160ccecb6541741c41849669`；验收 worktree 中等价 cherry-pick 为 `e987a6969651f77f053723301ce1a7dda5679818`。
- 环境：clean worktree `/tmp/courtwork-vpkg-meta-1-acceptance`，分支 `codex/accept-vpkg-meta-1`；冻结 lockfile 安装后先完成拓扑 build。

### 结论

**VPKG-META-1 放行。** Legal 已具备与 PM 同体例的 `test / lint / build / generate:json-schema` 脚本、package/descriptor 版本一致性门，以及 JSON Schema 文件全集、Draft、URN、drift 和递归 remote-ref 门。未发现实现级缺陷，无 `fix-by-acceptance` 产品补丁，也没有需要架构拍板的契约问题。

### 独立证据

- Legal 定点：**9 files / 73 tests**；包内 lint、build、JSON Schema 重生成均通过，重生成后工作树无 drift。
- 直接审计提交态文件：Legal 恰为 descriptor 引用的八份 schema；与 PM 合计 **12** 份文档，全部是 Draft 2020-12、`urn:courtwork:schema:<logicalSchemaId>:v1`，递归扫描只允许文档内 fragment ref。
- 差异面只有 package metadata、门禁测试与 SPEC/registry 提案留痕；`manifest.ts`、全部 payload/schema 源、场景、prompt、descriptor 与提交态 JSON Schema 字节对基线均无差异。运行态仍为 `legal / 0.1.0 / schemaVersion 1`、7 artifacts、5 scenarios、5 prompt segments。
- clean install 后直接运行包测试会因 workspace 依赖尚无 `dist` 而在解析 `@courtwork/schemas` / `@courtwork/registry` 时失败；按仓库规定先执行 `pnpm -r build` 后，包测试与全仓测试均通过。这是现行 workspace 构建前置条件，不是本单新增回归。

### 强制变异：实际触红后撤回

| 反例 | 观察到的红灯 |
|---|---|
| 从 Legal `package.json` 删除 `test` 与 `lint` | metadata 定点 **1 failed / 1 passed**，明确列出两枚缺失脚本 |
| 在 Legal `json-schema/` 新增 `Legacy.schema.json` | drift 定点 **1 failed / 8 passed**，文件全集差异明确出现残余文件 |
| 把 PM package release 改为 `9.9.9` | PM metadata 定点 **1 failed / 1 passed**，明确期望 descriptor `0.1.1` |
| 在 PM `ActionItems` 深层 `allOf[0].$ref` 注入远程 URL | PM drift 定点 **1 failed / 4 passed**，错误路径精确到 `$.properties.items.items.allOf[0].$ref` |

四项反例均用最小补丁原样撤回；撤回后 `git diff --check` 与全部门禁通过。

### 全仓门禁

- `pnpm install --frozen-lockfile`：14 个 workspace scope，1047 个包全复用，lockfile 无改写。
- `pnpm -r build`：13 个 workspace build 全通过；desktop Vite **3520 modules transformed**，仅有既存 dynamic-import/chunk-size warning。
- `pnpm lint`：exit 0。
- `pnpm test`：**122 files / 1083 tests**，exit 0。
- 本单没有 UI 行为变化，按范围不运行 Playwright。

### 放行边界

本轮只放行两垂类包的 metadata 与 JSON Schema drift 门，不放行后续目录迁移、PM rename、根出口分面、企业 runtime、bindings 真只读快照或任何新场景。上述工作仍须按 ADR-012 的后续独立工单实施与验收。

---

## VPKG-EXPORTS-1 独立验收（2026-07-14）

- 验收角色：未参与 VPKG-EXPORTS-1 实现的独立验收会话；未修改 ADR、schema 或跨层契约。
- 基线：`7e5c705`；实现：`93ef8501c0425c80fa8aedd8b68f093790581d87`。
- 环境：clean worktree `/tmp/courtwork-vpkg-exports-1-acceptance`，分支 `codex/accept-vpkg-exports-1`；冻结 lockfile 安装后先完成拓扑 build。

### 结论

**VPKG-EXPORTS-1 放行。** Legal 已把三份 demo fixture 从根出口迁到唯一 `/testing` 分面，并提供 browser-safe root、`/package`、`/schemas`；PM 提供同体例的 root、`/package`、`/schemas`，继续保持 catalog-only 且没有空 testing/runtime/scenario/interaction。desktop、eval 与 demo-runtime 已分别从正确分面消费。无契约级问题、无 `[需架构拍板]` 项、无生产实现缺陷。

### 物理迁移与字节语义

三份 Legal fixture 均由 Git 识别为 **100% rename**，迁移前后 blob id 逐一相同：

- `S3_RISK_LIST_RESPONSE`：`2daf621e7bc2885c6cba6f0849e980ca04d014da`
- `S3_RISK_LIST_DRAFT`：`f0bbcc5282e9f143dc7c4de19fd9771c87b46819`
- `S3_PDF_DOSSIER_DRAFT`：`79e4c18466bdff114f13db98ef5fc73144ba8e40`

Legal `manifest.ts` 在基线/实现的 blob 同为 `470cc9923401b1ef4d06360074002b100b730160`，PM `manifest.ts` 同为 `4ffc10aa824dfdb4f86a775f1c467272b46115e4`。对两包 manifest、schema 源、提交态 JSON Schema、Legal 编译器及 PM 计算器执行基线到实现的精确 diff，结果为空。因此 prompt 正文、typeId/schemaId、blueprint、词表、payload、schema 与计算语义均未改变；本单只移动 fixture、增加显式 barrel/exports，并迁移 consumer import。

真实从 desktop consumer 上下文动态导入七个 package subpath 成功：Legal root/package/schemas/testing 的 runtime export 数分别为 22/3/16/7，PM root/package/schemas 为 22/3/16；root 与分面共用同一 descriptor/schema 对象身份，Legal root 对三枚 fixture 名均不可见，`/testing` 全部可见。

### 强制变异：实际触红后撤回

| 反例 | 观察到的红灯 |
|---|---|
| Legal root 重导出 fixture | root 可达 testing 的递归门 **1 failed / 7 passed** |
| 分别删除 Legal `/package`、`/schemas`、`/testing` | 每项均 **2 failed / 3 passed**，同时命中出口闭集与源码入口解析 |
| PM 同时偷建 `testing/runtime/scenarios/interactions` 空目录 | **1 failed / 4 passed**；永久守卫对四目录逐项断言不存在 |
| Legal 旧 `src/demo` 恢复第二份 fixture | **1 failed / 4 passed**，旧目录与唯一 fixture 路径门触红 |
| `/package` types target 指向错误声明 | **1 failed / 4 passed**，明确报 types/ESM 漂移 |
| `/schemas` 的 ESM 与 types 同时漂移到根入口 | **1 failed / 4 passed**，精确出口 target 快照触红 |
| root、package、schemas 可达入口分别注入 `node:fs/path/crypto` | 三轮均各 **1 failed / 4 passed**，递归图报告具体文件与 builtin |
| desktop/core/provider/registry 四个生产文件同时 import `/testing` | **2 failed / 3 passed**；专用门一次列出四个违规 consumer，另有 Legal 图污染联动红灯 |
| demo-runtime 把两份 fixture 改回从 Legal root 读取 | demo-runtime TypeScript build exit 2，明确两枚 fixture 均未从 root 导出 |

所有反例均用精确 patch 撤回；提交前复核所有被变异的生产文件均为零 diff。验收以独立提交 `79c6771`（`fix-by-acceptance(registry): harden vertical export guards`）补强三类可证伪性：每个出口的 ESM/types target 精确同源、PM 四类空目录全部禁止、三份 fixture 在 Legal 源树只能存在于 `src/testing`。只改测试，不改产品实现、ABI 或 payload。

### 定向与全仓门禁

- Legal：**10 files / 76 tests**；PM：**7 files / 41 tests**。
- registry：**5 files / 81 tests**；demo-runtime：**8 files / 29 tests**。
- eval：**14 files / 64 tests**；desktop unit：**36 files / 150 tests**。
- `pnpm install --frozen-lockfile`：**14 workspace projects / 1047 packages**，lockfile 无改写。
- `pnpm -r build`：**13/14 workspace projects** 全绿；desktop **3515 modules transformed**，只有既有 Tauri static/dynamic import 与 chunk-size warning。
- `pnpm lint`：exit 0，零 error。
- `pnpm test`：**126 files / 1101 tests**。
- `git diff --check`：通过；无临时 fixture、目录或 production mutation 残留。本单只有 import/出口迁移，没有 desktop 行为或视觉变化，按总纲不运行 Playwright。

### 放行边界

本结论只放行 Legal/PM 当前 package export 分面及 fixture 消费迁移；不放行 VPKG-LAYOUT-1、PM scenario/prompt、企业 `/runtime`、bindings 真只读快照、blueprint 版本迁移或任何新 payload。Legal `/testing` 仍只允许 demo-runtime、acceptance 与 test 使用，生产 Desktop/Core/Provider/Registry 不得消费。

---

## VPKG-LAYOUT-1 独立验收（2026-07-14）

- 验收角色：未参与实现的独立验收会话；此前只做过只读可视化依赖调研。
- 基线：`f7532f72570ed0a5c19e78ed988461ef45c3725f`；实现：`697f196bea2c4c07f7a8706fce7f7005b442f0d7`。
- 环境：clean worktree `/tmp/courtwork-vpkg-layout-1-acceptance`，分支 `codex/accept-vpkg-layout-1`；另建 detached parent worktree 做迁移前运行时基线，不采信实现自述。

### 结论

**VPKG-LAYOUT-1 放行。** Legal 的 package、presentation、scenarios、interactions、domain、schemas、testing 已按 ADR-012 归位；PM 只建立真实存在的 package、presentation、schemas、domain，继续 catalog-only，未制造 scenarios/interactions/runtime/testing 空壳。未发现 schema、prompt、fixture、计算或编译语义漂移，也没有 `[需架构拍板]` 项。

验收发现三项实现级守卫缺口并以 `8b21e39`（`fix-by-acceptance(vertical): harden layout identity guards`）补齐：`PACKAGE.bindings` 必须与公开 `*_PACKAGE_BINDINGS` 保持对象同一；垂类 browser-safe 图只允许 Courtwork workspace 与登记的 `zod` 外部依赖；全仓 consumer 不得绕过 exports 读取迁移前 `manifest/score-calc/compile-risk-list` 内部路径。只改测试，不改产品实现、ABI、schema 或字段语义。

### 基线等价与真实出口

- 从 desktop 真实 consumer 上下文由 Node 导入 Legal root/package/schemas/testing 与 PM root/package/schemas 全部成功；运行时 export key 集合与 parent 基线逐字节相同。
- 同一进程内 root/subpath 共用 `PACKAGE`、descriptor、bindings 与各 Zod schema 对象；新增守卫进一步锁定 `PACKAGE.bindings === *_PACKAGE_BINDINGS`。
- parent 与实现的完整运行快照逐字节相同：Legal descriptor `620105…410b1`、prompt blob `41b807…618a`、三份 fixture `8cd777…36487 / e8713e…37a14 / 33f6b7…cb1b`、真实 fixture 编译结果 `9f3f82…398b2`；PM descriptor `4513f7…8ef5`，RICE 结果保持 `640 / {low:250,high:1500} / null`。
- Legal 旧 `src/manifest.ts` 与根编译器真源不存在；PM 旧 manifest、根 schema/计算器与四类空能力目录不存在。活动 consumer 对旧内部 import 零命中。
- Legal 八份、PM 四份 JSON Schema 实际重生成后零 diff；Draft、URN 与 remote-ref 门保持闭合。

### 强制变异：实际触红后撤回

| 反例 | 观察到的红灯 |
|---|---|
| 恢复 Legal `src/manifest.ts` 与根编译器第二真源 | layout 定点明确列出两枚 forbidden path |
| 删除 PM `package/descriptor.ts` | layout 定点明确报告 missing path |
| 给 PM 建空 `scenarios/` | layout 定点明确报告 forbidden `scenarios` |
| 分别改 Legal descriptor、prompt 正文、fixture | content golden 分别因整面 hash 或 fixture hash 漂移失败 |
| 把 `PM_PACKAGE.bindings` 改为同内容的新 Map | 原门意外全绿；补入对象同一守卫后定点 **1 failed / 1 passed** |
| 把 Legal `/package` 指回 root | exports 精确快照失败，显示 ESM/types target 漂移 |
| PM presentation 注入 `node:fs` | browser-safe 递归图报告具体 builtin import |
| PM presentation 注入 `@vendor/sdk` | 新增 allowlist 门报告 unapproved external |
| desktop consumer import 旧 `@courtwork/legal/manifest` | 新增全仓门报告 old vertical internal import |
| PM 提交态 schema 注入远程 `$ref` | remote-ref 门精确报 `https://vendor.example/schema.json` |
| 同时破坏 RICE 单点、区间下界与 OOC | PM golden 显示 `800 / low 500 / 0`，三类语义全部触红 |
| Legal 编译指令 id 改为 `mutant-*` | compile golden **1 failed / 5 passed** |

全部反例均精确撤回；最终无临时文件、空目录、schema drift 或生产源码差异残留。

### 最终工程门

- `pnpm install --frozen-lockfile`：14 个 workspace project、1047 个包，lockfile 无改写；clean install 后先按仓库拓扑 build，再运行依赖 dist 的包测试。
- 定点：Legal **11 files / 79 tests**；PM **8 / 44**；registry **6 / 84**；demo-runtime **8 / 29**；eval **14 / 64**。
- `pnpm -r build`：13/14 workspace project 全绿；desktop **3524 modules transformed**，只有既存 Tauri dynamic/static import 与 chunk-size warning。
- `pnpm lint`：exit 0。
- `pnpm test`：**131 files / 1127 tests**，exit 0。
- 本单是纯目录与出口整理，没有 desktop 行为或视觉变化，按范围不运行 Playwright。

### 放行边界

本结论只放行 Legal/PM 的 VPKG-LAYOUT-1 物理归位与等价守卫；不放行 PM-SCHEMA-1、PM scenario/prompt、企业 runtime、blueprint 迁移、UI gallery 或任何新 payload。PM 仍为 catalog-only。
