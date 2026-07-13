# 合批验收报告 — MVP 补强四工单

| 项 | 内容 |
|---|---|
| 验收角色 | Grok 4.5 CLI（工单任命，AGENTS.md 2026-07-10） |
| 验收日期 | 2026-07-10 |
| 验收对象 | S-1 / W3.0 / T-fetch / T-provider |
| 结论依据 | 干净环境实测 + 源码阅读 + 编译期探针 + 分项复跑；**不采信实现会话自述** |
| 工作树备注 | 验收时存在无关脏文件（`eval/ACCEPTANCE.md`、`apps/desktop/ACCEPTANCE.md`、`.obsidian/`、`usecase/` 等），未纳入本报告结论，亦未提交 |

---

## 一、全局验收

### 1.1 干净环境

| 步骤 | 结果 |
|---|---|
| `find . -name node_modules -type d -prune -exec rm -rf {} +` | 已执行 |
| `pnpm install` | 成功（lockfile up to date，943 packages） |
| `pnpm test`（根 vitest：`packages/*/src/**/*.test.ts` + `eval/src/**/*.test.ts`） | **78 files / 671 tests 全绿** |
| `pnpm lint` | 退出码 0，零 error |
| `pnpm --filter '!@courtwork/eval' -r run build` | 8/8 非 eval 包通过（含 `apps/desktop` tsc+vite） |

### 1.2 用例数裁定（619 vs 607）

**权威口径（本验收实测）：**

| 口径 | 用例数 | 说明 |
|---|---:|---|
| 根 `pnpm test`（packages + eval） | **671** | vitest.config.ts 当前 include |
| packages 合计（排除 eval） | **607** | 与 T-provider SPEC 完工记录一致 |
| apps/desktop（独立 vitest，不进根配置） | 6 | 不计入 671/607 |

**逐包实测：**

| 包 | 测试文件 | 用例数 | 与 SPEC 完工记录 |
|---|---:|---:|---|
| `@courtwork/schemas` | 9 | 78 | 含 markers / needs_ocr / drift 8 例 |
| `@courtwork/registry` | 4 | 37 | 含 S1 fileTypes 断言 |
| `@courtwork/core` | 22 | **156** | 与 T-provider SPEC「156/156」一致 |
| `@courtwork/tools` | 9 | **169** | 与 T-fetch SPEC「169」一致 |
| `@courtwork/output` | 3 | 16 | — |
| `@courtwork/demo-data` | 2 | 15 | — |
| `@courtwork/reading-view` | **15** | **136** | 与 W3.0 SPEC「136/15 文件」一致 |
| `@courtwork/eval` | 14 | 64 | — |
| **packages 合计** | 64 | **607** | — |
| **根全仓（+eval）** | 78 | **671** | — |

**对「619」与「607」的裁定：**

- **607** = 当前 `packages/` 实测总和，可复现，与 T-provider 完工记录一致 → **采纳为 packages 口径权威数字**。
- **619** = W3.0 SPEC / 板面曾报「全仓 619」；在 HEAD 上**无法复现**（与 packages 607 差 12，与根 671 差 52）。
- 排查：自 W3.0 关账以来，除共享索引事故对 `web-search` 的 `git rm --cached` 撤回再正式提交（内容保留，非删测）外，**未发现「删用例凑绿」形态**；T-fetch/T-provider 之后 packages 与全仓用例数均应上升，当前 607/671 与增测方向一致。
- **结论：619 视为历史瞬时或误计口径，不作验收阻塞；当前权威为 671（根）/ 607（packages）。无无解释的用例数下降证据。**

### 1.3 JSON Schema drift

`packages/schemas/src/json-schema-drift.test.ts`：**8/8 通过**（含 Timeline.markers、CaseFile.needs_ocr 导出一致性）。实际在跑。

### 1.4 四工单 commit 文件清单（误吞核对）

**S-1**（干净，无并行污染）：

| Commit | 文件 |
|---|---|
| `522c9f1` | `packages/schemas/{timeline.ts,timeline.test.ts,json-schema/Timeline.schema.json}` |
| `daf2d72` | `packages/demo-data/data/{artifacts/timeline.json,manifest.md}` |
| `d361700` | `packages/{schemas,core}/SPEC.md` |

**W3.0 跨层三变更（各自独立 commit）+ 包本体：**

| Commit | 范围 |
|---|---|
| `09e1e0c` | schemas `IngestStatusEnum` + CaseFile schema/test/SPEC |
| `0529f3d` | registry `S1.yaml` + `builtin-scenarios.test.ts` + SPEC |
| `efa2f1e` | 根 `CLAUDE.md` 架构图补 reading-view 一行 |
| `09ca57e`…`1367005` | 仅 `packages/reading-view/**`（逐 commit 扫文件清单，**无 spill**） |

**T-fetch**（tools 内为主；一次共享索引事故已照章处置）：

| Commit | 说明 |
|---|---|
| `1747cdc`…`3b2e2a3` | contract / ssrf / spotlight / extract / web-fetch / web-search / SPEC |
| `22c3639` | **事故**：core 类型提交误吞 `web-search.ts` + test |
| `c3e8522` | 撤回误吞，归还未跟踪 → 后由 `3b2e2a3` 正式提交 |
| `932dab4` / `b628907` | governance 提交误吞 `provider/errors.ts` → 撤回归还（T-provider 在途文件） |

上述事故属共享索引判例已记录路径，**最终树中无并行 `apps/desktop` P-1 文件被本四工单永久吞入**。T-provider 系列 commit 文件面限于 `packages/core/**`（+ 相关 docs/SPEC），未见 desktop 污染。

### 1.5 凭证 / key 入库扫描

对 `packages/`、`apps/`、`eval/`、`docs/` 扫描 `sk-*` 长串与 api key 字面量赋值：

- **仓库内仅见测试金丝雀**（`sk-super-secret-leak-canary-*`、`sk-test-key`、`sk-x` 等）与配置说明。
- **未发现真实生产凭证入库。**
- 说明：本机环境若已 export `DEEPSEEK_API_KEY`，冒烟脚本会真实出网（见 D-5）；属环境侧，非仓库泄漏。

---

## 二、分项验收

每项结论 ∈ {通过 / 已修复 / 不通过 / 需架构拍板}。本轮**无实现级顺手修复**（无 `fix-by-acceptance` commit）。

### A. S-1 — TimelineEvent.markers

#### A-1 markers drift + 矛盾清单对应

| 检查点 | 实测 | 结论 |
|---|---|---|
| `markers?: string[]` 在 `timeline.ts` + JSDoc 词表仅 `contradiction` | 有 | 通过 |
| JSON Schema 再导出 + drift 测试 | 8/8 绿 | 通过 |
| timeline.json 带 markers 的事件 | **8 个**：evt-08/14/17/20/24/28/31/33，均为 `["contradiction"]` | 通过 |
| 与 case-bible 第六节 4 类矛盾精确对应 | 矛盾1→#31；矛盾2→#14/#17/#20；矛盾3→#24/#28；矛盾4→#8/#33 | 通过 |
| **立项实证**：evt-24 描述无「矛盾」字样但有 marker | 描述为验收合格签署；`markers:["contradiction"]` | 通过 |
| **立项实证**：evt-25 提及矛盾诱因但无 marker | 描述含「构成矛盾点3的诱因」；无 `markers` 字段 | 通过 |

**A 总评：通过。放行。**

---

### B. W3.0 — packages/reading-view

#### B-1 定向测试与 golden

| 检查点 | 实测 | 结论 |
|---|---|---|
| 口径 136 例 / 15 文件 | `pnpm exec vitest run packages/reading-view` → **136 / 15** | 通过 |
| 21 份真实语料 golden | 快照文件 `demo-data-corpus.test.ts.snap` **135 244 bytes**；`exports[` **21** 条，非空壳 | 通过 |
| golden 路径说明 | 语料为 `.md`，只覆盖 md 路径（SPEC 已诚实记录 docx/pdf 无等规模真实语料） | 通过（边界已声明） |

#### B-2 安全

| 检查点 | 实测 | 结论 |
|---|---|---|
| zip 炸弹在解压前 | `docx-reader.ts`：先 `readZipCentralDirectory` → `checkZipBomb` → 才 `unzipSync`；`zip-guard.ts` 注释与实现一致（只读 EOCD/中央目录） | 通过 |
| 高压缩比样本测试 | `zip-guard.test.ts` 7 例 + malformed 集成 | 通过 |
| DOCTYPE/ENTITY 拒绝 | `xml-guard.ts` 正则 + 测试 8 例 | 通过 |
| `.docm` 与 zip 内 `vbaProject.bin` | 扩展名短路 + 中央目录 entry 名检测 + Content_Types macroEnabled；测试覆盖 | 通过 |
| 大小/超时走配置 | `limits.ts` + convert 前置检查；测试覆盖 | 通过 |

#### B-3 锚点纪律

| 检查点 | 实测 | 结论 |
|---|---|---|
| docx/PDF 每 anchor 带 `textLayerVersion` | 单元测试断言（docx-to-markdown / pdf-to-reading-view）；实现 `computeTextLayerVersion` | 通过 |
| md/txt 指向原件文本层 | `textRange: {start,end}` 为解码后字符串字符区间（与 schemas「文本层字符区间」一致）；测试断言 `slice` 等于 quote；**不填** textLayerVersion | 通过 |
| 合并单元格整文件降级 | `merged:true` → `disabled/fidelity_insufficient`，有 reader + convert + malformed 测试 | 通过 |
| 无文本层 PDF / 图片 → `needs_ocr` | pdf 全空文本层、jpg/png 短路；非空文 | 通过 |

#### B-4 跨层三变更

| 变更 | Commit | 内置测试同步 |
|---|---|---|
| `IngestStatusEnum` += `needs_ocr` | `09e1e0c` 独立 | case-file.test 接受 needs_ocr |
| S1.yaml fileTypes += docx/md/txt | `0529f3d` 独立 | `builtin-scenarios.test` 期望 `['docx','md','txt','pdf','jpg','png']` |
| CLAUDE.md 架构图补行 | `efa2f1e` 独立 | 文档变更 |

**B 总评：通过。放行。**

---

### C. T-fetch — web-fetch / web-search

#### C-1 编译期红线（Data=never）

验收探针（临时文件，已删除，未入库）：

```text
Type 'Promise<{ ok: boolean }>' is not assignable to type 'Promise<never>'.
Type '{ ok: boolean }' is not assignable to type 'never'.
```

- 手写返回数据的适配器**无法**赋给 `WebFetchAdapter`（`ToolAdapter<WebFetchInput, never>` + `run(): Promise<never>`）。
- mock 同样 `Promise<never>`，只能 `throw ToolWebReferenceError`。
- 运行时端到端：mock/http 成功路径均为 `verified:false` + `reason:'web_reference'`（测试覆盖）。

**结论：通过。**

#### C-2 SSRF / 证书 / spotlighting

| 检查点 | 实测 | 结论 |
|---|---|---|
| 私网段 / 云元数据 / IPv4-mapped IPv6 | `web-fetch-ssrf.ts` 用 `BlockList`；注释说明 IPv4-mapped 行为；**38 例** SSRF 测试 | 通过 |
| 重定向逐跳检查 | `fetchWithGuardedRedirects` + 测试 | 通过 |
| 证书失败 = adapter_error | 不设 `rejectUnauthorized:false`；TLS 错误经 `describeError` 进 message；测试断言不放宽重试 | 通过 |
| spotlighting | 随机 `boundaryToken` + `<<<UNTRUSTED_WEB_DATA_…>>>` + 空白→`^` datamarking | 通过 |

#### C-3 缓存门禁扩展（共享执行器唯一逻辑变更）

`isCacheableEnvelope`：`verified:true` **或** `reason==='web_reference'`。

| 行为 | 测试 |
|---|---|
| web_reference 可缓存 | contract.test 明确用例 |
| 其余 verified:false 家族不缓存 | adapter_error 等回归用例 |
| TTL 生效 | cache 包 9 例 + web-fetch `cacheTtlMs = 10min` |

**结论：通过。** 此为契约级扩展，实现与测试一致，**背书**（见第四节）。

#### C-4 search 诚实边界

| 条件 | 结果 | 结论 |
|---|---|---|
| 无 apiKey | `not_configured` | 通过 |
| 有 key 的 serper 骨架 | `not_implemented`（无假搜索） | 通过 |

**C 总评：通过。放行。**

---

### D. T-provider — OpenAI 兼容 + quirk + 降级链 + 计价 + 冒烟

#### D-1 凭证金丝雀

亲手复跑 `http-client.test.ts` + `openai-compatible-provider.test.ts`：**24/24 绿**。

金丝雀 `sk-super-secret-leak-canary-9f8e7d6c` / `sk-another-secret-canary-1a2b3c` 注入后触发 500/401；断言 `message`/`stack`/`JSON.stringify(error)` **均不含 key**。

**结论：通过。**

#### D-2 反静默吞参

| 检查点 | 实测 | 结论 |
|---|---|---|
| `tier:'unsupported'` 在发 HTTP 前拒绝 | `fetchImpl` 未被调用；`ProviderResponseFormatUnsupportedError` | 通过 |
| `ProviderInvalidResponseError.suspectedSilentParamSwallow` | 全失败非 JSON → true；JSON 过但 schema 不过 → false | 通过 |

**结论：通过。**

#### D-3 结构化输出降级链

| 检查点 | 实测 | 结论 |
|---|---|---|
| 档位 | `json_schema_strict` → `json_schema` → `json_object` + zod 重试 | 通过 |
| 重试次数走配置 | 测试 `attempts: 2` 等 | 通过 |
| 最终失败 invalid_response 语义 | `ProviderInvalidResponseError` | 通过 |
| 成功路径剥围栏 | 返回剥栏后 content（非原始 fence） | 通过 |
| quirk「已确认 vs 推测」 | Qwen/豆包 `reasoningFieldCandidates` 注释标明**推测、未经 docs/18 证实**；DeepSeek 为已用字段 | 通过 |

**结论：通过。**

#### D-4 auth/billing 判别与计价

| 检查点 | 实测 | 结论 |
|---|---|---|
| `auth.kind` / `billing.kind` 判别联合 | `types.ts`：`api_key`\|`oauth_subscription` × `metered`\|`plan` | 通过 |
| 当期工厂仅接受 api_key + metered | 其他 kind 构造期 `ProviderNotImplementedError` | 通过 |
| maxUsd + checkUsd | RuntimeGuard 累加；超限抛 `maxUsd` | 通过 |
| 价格表走配置 | `pricing-table.ts` 三家型号；未知组合返回 undefined | 通过 |
| 未知 provider/model 诚实跳过 | 非静默算零；负数 maxUsd 测试区分「跳过」与「零成本」 | 通过 |
| usage 缺失 | ScriptedProvider 等不触发计价 | 通过 |

**结论：通过。**

#### D-5 冒烟脚本

1. **无 key**（`env -u DEEPSEEK_API_KEY -u DASHSCOPE_API_KEY -u ARK_API_KEY`）：
   - 三家均打印「跳过：未设置环境变量 …」
   - 汇总「未检测到任何 provider 的 API key…」+ 修复指引
   - 退出码 0
2. **有 DeepSeek 环境变量时**（本机曾 export）：真实出网冒烟通过（模型应答、token、估算成本）；另两家仍跳过。属可选增强路径，与「无 key 跳过」不矛盾。

**结论：通过。**

**D 总评：通过。放行。**

---

## 三、分项结论一览

| ID | 项 | 结论 |
|---|---|---|
| A-1 | markers + 8 事件 + evt-24/25 实证 | **通过** |
| B-1 | reading-view 136/15 + 21 golden | **通过** |
| B-2 | zip 炸弹 / XXE / 宏 / 配置上限 | **通过** |
| B-3 | textLayerVersion / 原件锚点 / 合并降级 / needs_ocr | **通过** |
| B-4 | 跨层三 commit + registry 测试 | **通过** |
| C-1 | Data=never 编译期红线 | **通过** |
| C-2 | SSRF / 证书 / spotlighting | **通过** |
| C-3 | 缓存门禁 web_reference 扩展 | **通过** |
| C-4 | search not_configured / not_implemented | **通过** |
| D-1 | 金丝雀无 key 泄漏 | **通过** |
| D-2 | unsupported 预拒绝 + silent swallow 信号 | **通过** |
| D-3 | 结构化输出降级链 + quirk 诚实标注 | **通过** |
| D-4 | auth/billing + maxUsd 诚实跳过 | **通过** |
| D-5 | 冒烟无 key 跳过 | **通过** |

实现级 bug 顺手修：无。  
契约级 `[需架构拍板]`：无（本批五项契约变更均已有架构拍板来源，见下）。

---

## 四、三问终裁

### 4.1 四张工单各自是否放行？

| 工单 | 放行 |
|---|---|
| **A. S-1** | **是** |
| **B. W3.0** | **是** |
| **C. T-fetch** | **是** |
| **D. T-provider** | **是** |

### 4.2 五项契约变更是否背书？

| 契约变更 | 背书 | 依据摘要 |
|---|---|---|
| **web_reference**（第七 reason） | **背书** | 枚举 + envelope 耦合校验 + Data=never；docs/20 C 级形态 |
| **缓存门禁扩展**（verified:true **或** web_reference） | **背书** | 共享执行器唯一逻辑变更；有正反回归测试；失败家族仍不缓存 |
| **needs_ocr**（IngestStatusEnum） | **背书** | schemas + JSON Schema + reading-view 投影无损 + drift |
| **markers**（TimelineEvent） | **背书** | 可选字段纯增量；8 事件与 case-bible 对齐；drift 过 |
| **auth.kind / billing.kind 判别** | **背书** | 正交联合类型；当期仅 api_key+metered 实装；plan/oauth 占位不假装可用 |

### 4.3 MVP 补强是否齐备、可否进入「真实 key 首跑 + 对外演示」？

**是 — MVP 补强四工单齐备，可进入下一阶段。**

对齐 docs/41 本体自足定义的补强面：

| 能力面 | 本批交付 | 状态 |
|---|---|---|
| office 阅读 + 段落锚点 | W3.0 reading-view | 就绪（扫描件/无文本层 PDF 诚实 needs_ocr） |
| 时间线矛盾结构化标记 | S-1 markers | 就绪（UI 消费已在 polish 路径，非本批阻塞） |
| web 补信息（C 级） | T-fetch | 就绪（search 真实后端仍为 not_implemented 骨架，诚实边界） |
| 真实模型 HTTP | T-provider | 就绪（冒烟脚本 + 三家 quirk；需环境变量注入 key） |

**进入「真实 key 首跑 + 对外演示」的前置（非本批缺陷，属既有边界）：**

1. 配置 `DEEPSEEK_API_KEY`（及可选 DASHSCOPE/ARK）后跑 `pnpm --filter @courtwork/core smoke:provider` 与 eval 真实基线。
2. 对外演示版 UI 侧依赖 polish / P-1 等桌面工单（本合批不重新验收 desktop；板面已记 polish 放行路径）。
3. Developer ID 公证、OCR v1、企查查等仍按 docs/41 分期，**不阻塞**本补强关账。

---

## 五、过程观察（非阻塞）

1. **用例数叙事**：建议后续 SPEC/板面统一写「根 vitest 全量 N（packages M + eval K）」，避免 619/607 混口径。本报告裁定后以 **671 / 607** 为基线。
2. **共享索引事故**：22c3639、932dab4 均已按 AGENTS.md 撤回+记录、未重写历史；验收侧确认最终树干净即可，不另开缺陷。
3. **首次 Grok 验收校准**：本会话仅做验收与报告；未改业务代码；探针文件已删除。

---

## 六、签字栏

| 角色 | 标识 | 结论 |
|---|---|---|
| 验收工程师 | Grok 4.5 CLI | **四工单全部放行；五项契约变更背书；MVP 补强齐备，可进真实 key 首跑与对外演示衔接** |
| 架构会话 | （待阅本报告后更新 docs/90 板面） | — |
