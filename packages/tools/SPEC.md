# SPEC: packages/tools（W5）

状态：已完成

## 职责

确定性接口层：把有权威源的事实交给接口，不让模型猜（意见稿第三.1 的工程落点）。

## 工具契约（统一）

`{ id, 输入 schema, 输出 schema, 超时, 缓存策略, 失败降级 }`。**失败降级的统一原则：降级为"标记未核验"状态返回，绝不静默回退到模型生成。**

## MVP 工具

- `party-verify` 主体核验：名称/统一社会信用代码 → 工商状态、涉诉概要（企查查/天眼查，先 mock 后接真；接口凭证走配置）
- `cite-check` 引用校验：法条/判例引用 → 存在性与现行有效性（先接现有公开库，官方接口位预留）

每个工具三种适配器（承接 `docs/20`/`docs/21` 的信源分级，W5.1 增量，见下方验收记录）：`mock`（A 级同构占位，测试/开发用）、`demo-fixture`（B 级自建演示库，数据来自 `@courtwork/demo-data`，通过装配点注入）、真实接口骨架（A 级，`qcc`/`public-law-db`，凭证走配置，当前骨架阶段）。三者的适配器身份（`sourceId`）在构造时一次性声明，互相独立，不存在自动选择/退化路径。

## 验收

契约测试（含超时/失败降级路径，六种 `reason`：`timeout`/`not_configured`/`not_implemented`/`out_of_coverage`/`adapter_error`/`invalid_response`）；mock 服务联调；缓存命中有测试；三种适配器（mock/demo-fixture/真实骨架）互不冒充有测试。

## TODO（跨层放入区）

- [架构已确认 2026-07-09] 根 CLAUDE.md 架构依赖图原标注 `packages/tools` 依赖 `packages/schemas`，本层实现未添加该依赖，已提交架构层确认：`party-verify`/`cite-check` 两个 MVP 工具的输入输出（主体名称/统一社会信用代码/引用文本 → 工商状态/涉诉概要/存在性/现行有效性）推演下来找不到非人为拼凑的具体引用点——`SourceAnchor` 定位的是"卷宗内文件的页码/坐标"，核验类工具的结果来源是外部权威源（企查查/法条库等），不是卷宗内某页，塞进输出是类型误用；塞进输入作为"该主体名/引用文本在卷宗里的出处"倒是说得通，但调用方本来就持有这个锚点（先知道要核验谁/什么，才会发起调用），工具原样透传没有实质收益，还会给缓存 key 引入"要不要把 sourceAnchor 排除在 key 之外"的额外复杂度（核验同一个真实主体但出处不同文档，语义上应命中同一条缓存）。**架构层裁决**：CLAUDE.md 依赖图已修正为"可依赖、当前无需"；边界记录一句——将来 `RiskList` 的依据字段要嵌入工具结果时，**嵌入形状定义在 schemas，映射发生在 core**，`packages/tools` 保持自持不依赖 schemas，依赖方向依然干净。
- [消费方责任提醒] `verified:false` 结果最终要在用户可见的 artifact 里呈现为"未核验"状态，这是消费方（W6 core 编排 / apps/desktop UI）的责任，不在本层范围内。本层能保证的是：`reason`（`timeout` / `not_configured` / `not_implemented` / `out_of_coverage` / `adapter_error` / `invalid_response`，W5.1 新增 `out_of_coverage`）这一分类是下游唯一的数据源，消费方按 `reason` 做展示区分时，这六个字面量需要保持稳定——如果未来要改名或增删，需要通知已消费这些值的下游一并更新。UI 层（W9）按 `docs/20` 的信源分级角标设计（已核验/库内/网络参考）应该直接消费 `source`（`mock`/`demo-fixture`/真实适配器各自的 sourceId）+ `reason` 两个字段的组合，不需要另建一套分级逻辑。
- [留给 W6] 真正的装配点（工具注册表装配代码）落地时，`party-verify`/`cite-check` 的 demo-fixture 适配器需要接上 `@courtwork/demo-data` 的访问器——写法与踩坑点见 `packages/demo-data/SPEC.md` 的 TODO 区。

## 验收记录

- 2026-07-09：W5 完成。统一工具契约（`ToolDefinition` / `defineTool` / `createToolExecutor`）、`party-verify`（主体核验）、`cite-check`（引用校验）两个 MVP 工具全部交付，均含 mock 适配器（可直接用于开发/评测）与真实接口适配器骨架（凭证走配置，不入库）。`pnpm test` 全绿（135 例：`packages/schemas`/`packages/registry` 原有 86 例 + `packages/tools` 新增 49 例：cache 8 + contract 14 + party-verify 13 + cite-check 14），`pnpm lint` 无 error，`pnpm -r run build` 通过。全部在移除三个包的 `node_modules` 后的干净环境重新 `pnpm install` 复核过。
  - 设计取舍（前五条经用户确认后按案实现，第六条为用户在确认阶段追加的要求）：
    - **信封是判别联合，失败分支结构上没有 `data` 字段**（`{verified:true,data,source,checkedAt} | {verified:false,reason,message,checkedAt}`）：不是"data 为空/null"，是类型上不存在。这是"失败降级只许标记未核验，绝不静默回退到模型生成"这条纪律的结构化落点——TS 编译期与 zod 运行时双重保证，不依赖"适配器自觉遵守约定"。
    - **失败原因五分类**：`timeout` / `not_configured` / `not_implemented` / `adapter_error` / `invalid_response`。前四类里的 `not_implemented` 是实现真实适配器骨架时新增的（原始讨论只到 `not_configured`/`adapter_error`）：`not_configured`（凭证没配）是运营问题，`not_implemented`（骨架没接完真实请求/响应映射）是工程问题，两者对下游排障的含义不同，拆开更利于监控/告警按原因分流。`invalid_response` 覆盖"adapter 返回的数据没过输出 schema"（含 adapter 自己的响应映射写错的情况）。五个字面量已记入上方 TODO 区标注为消费方稳定契约。
    - **输入校验失败 ≠ 失败降级**：入参不满足 `inputSchema` 直接抛 `ToolInputValidationError`（调用方契约违反，属于 bug，要在开发/测试阶段暴露，不该以"未核验"的形式流入产出）；执行器验证后才会调用 adapter，`adapter.run` 完全不会看到不合规的输入。
    - **缓存只缓存 `verified:true` 的结果**：失败/降级结果从不写缓存，避免一次瞬时故障（超时/网络抖动）被缓存放大成一段时间的静默不可用。缓存 key = 工具 id + 稳定序列化后的输入（对象属性顺序不影响结果，`cache.test.ts` 覆盖）；`ToolCacheStore` 是可插拔接口，当前只提供内存实现（惰性过期，读时淘汰，没有后台清扫定时器——MVP 阶段没有这个必要，属于刻意不做）。
    - **mock 结果的自我标识是契约层强制，不是 adapter 自觉**：`runOnce` 在写入 `verified:true` 之前会校验 `outcome.source` 非空字符串，为空则整体降级为 `invalid_response`（`contract.test.ts` 覆盖："adapter 忘记声明 source"这一类 bug 不会被放过）。`createMockPartyVerifyAdapter`/`createMockCiteCheckAdapter` 的成功分支把 `source` 硬编码为字面量 `'mock'`；两个函数都是零参数（`.length === 0`，测试里直接断言），结构上不可能读取任何凭证/配置。
    - **mock 与真实适配器的选择必须是调用方的显式动作**：`createMockXAdapter()` 与 `createXRealAdapter(config)` 是完全独立、平级的导出，本包里没有第三个"按配置是否存在自动选择"的工厂函数，`defineTool(meta, adapter)` 的 `adapter` 参数也没有默认值——调用方不传，代码就不编译。真实适配器在凭证缺失时降级为 `not_configured`，这条路径永远不会把 `source` 标成 `'mock'`（`party-verify.test.ts`/`cite-check.test.ts` 的"no implicit fallback to mock"用例覆盖了"无凭证"与"凭证齐备但骨架未接完"两种情况，均只降级、不返回 `verified:true`）。
    - **真实适配器骨架的诚实边界**：企查查/天眼查、公开法规判例库目前既没有凭证也没有可依据的官方接口文档。骨架做了真实的部分——`config` 走注入（`apiKey`/`baseUrl` 等，从不硬编码）、缺失时统一走 `not_configured`；但没有为了"看起来像接完了"去编造一个请求路径或响应字段映射去冒充对接完成——凭证齐备时骨架显式抛 `ToolNotImplementedError`（降级为 `not_implemented`），并在函数上方的 JSDoc 里写清楚补全时的要求（真实请求按官方文档实现、成功分支 `source` 要与 `'mock'` 区分、响应映射产出必须能过 `dataSchema`）。即使未来有人接错映射，`dataSchema` 校验仍是最后一道防线，错误映射只会降级为 `invalid_response`，不会向下游泄漏假数据——双保险由用户在确认阶段认可存档。
  - 工具链：沿用 W1 记录过的坑（`@types/node` 必须声明在自己包的 `package.json` + `tsconfig.json` 显式 `"types": ["node"]`），这次用到 `AbortController`/`setTimeout`/`clearTimeout`（`lib` 只到 `ES2023`、没有 DOM），提前处理没有踩坑。没有新增工具链决定。
  - 跨层动作：已在上方 TODO 区记录"未引入 schemas 依赖"的架构偏离（标 `[架构待确认]`，供 Codex 验收或后续会话判断是否需要拍板）与"`reason` 分类是下游稳定契约"的提醒。

- 2026-07-09（W5.1 增量）：承接 `docs/20-架构决定-信源分级与检索策略.md`（信源分级 A/B/C）与 `docs/21-架构决定-演示数据包与样板案.md`（演示数据独立成包）。交付：`reason` 新增 `out_of_coverage`（B 级信源的覆盖边界语义，"库里没有"≠"不存在"）；`party-verify`/`cite-check` 各新增第三种适配器 `createDemoFixtureXAdapter(lookup)`（数据源以注入函数传入，生产代码本身不 import 任何具体演示数据）；新建 `packages/demo-data`（`@courtwork/demo-data`，独立 SPEC.md，详见其验收记录——过程中有一次因并发工作导致的方向修正，见下方"装配点"条）。本层净增 81 例测试：`packages/tools` 66 例（cache 9 / contract 17 / party-verify 19 / cite-check 21）+ `packages/demo-data` 15 例（party-corpus 8 / citation-corpus 7）。收尾时跑 `pnpm test` 读到 178 例全绿——这个总数里包含了并发的其他层会话对 `packages/schemas`（新增 `RevisionInstructionSet` 相关测试）的独立产出，不是本层交付，如实说明避免误报战功。`pnpm lint` 无 error，`pnpm -r run build` 通过（5 个 workspace 包中 4 个有 build 脚本，全过）。全部在移除全部 workspace 包的 `node_modules` 后的干净环境重新 `pnpm install` 复核过。
  - **推翻并升级了上一轮"mock 自我标识"的实现方式**（不是新决定，是发现原设计有一个真实缺口后的修正，如实记录）：写"三种适配器互不冒充"这条新测试时，实测发现 mock 与 demo-fixture 两个适配器包在同一个 `party-verify` tool.id 下、共享同一个执行器时，第二次调用会读到第一次调用留在缓存里的结果——`source` 变成了错误的那一个。根因：原设计的缓存 key 只有 `tool.id + input`，`source` 是每次调用时 adapter 自己在 `run()` 返回值里现报的，key 计算时根本看不到它。这不是测试写错，是"同一个 tool.id 在共享缓存下换了数据源"这个场景在原设计里没有被考虑到——而这恰恰是 W5.1 引入第三种适配器之后才会真实发生的场景（比如 W7 eval 要在同一进程里对比 mock/demo-fixture/真实三种配置）。**修复**：把 `source` 从"每次调用时由 adapter 现报"改成 `ToolAdapter.sourceId`——适配器构造时一次性声明的只读身份，`defineTool` 在组装时立刻校验非空（构造期失败，不拖到运行期），执行器缓存 key 相应改为 `tool.id + tool.sourceId + input`（`cache.ts` 的 `cacheKeyFor` 签名从两参数改三参数）。这比原设计更强，不是简单修补：原设计"防手滑漏标 source"是运行期校验一次返回值，新设计是结构上不再存在"每次调用重新声明"这件事——没有重复声明，就没有"这次声明和身份对不上"的空间。用户此前对原设计"mock 结果自我标识"的批复在新设计下依然成立且更彻底，未被推翻，只是承载方式变了；`packages/tools/src/contract.ts`/`party-verify.ts`/`cite-check.ts` 与三个测试文件已同步更新，`ToolRunOutcome` 类型已删除。**用户明确把这条列为本轮最有价值的发现，记入验收记录供 Codex 验收核对。**
  - 其余设计取舍：
    - **`装配点`：先误判为"完全解耦零导入"，架构裁决后收敛为"生产代码零导入 + 测试代码经批准导入"**（如实记录判断变化过程，不是推翻重来，是补上一个当时不知道的事实后的必然结果）。本条最初的版本判断"`packages/tools/package.json` 完全不出现 `@courtwork/demo-data`"——那时不知道 `packages/demo-data/data/` 已有一份规模大得多的并发产出（用户侧 subagent，commit `8dcac60`，按 `docs/21` 的所有权切分只写 `data/**`），本层同一时段手写的 4 条主体 + 3 条法条占位 fixture 与真实语料是两套互不相关的虚构世界观，且真实语料字段（`aliases`/`equityStructure`/`legalRepresentative` 等）远比工具契约丰富，"鸭子类型对齐"的说法也一并作废。架构裁决后：占位 fixture 模块整体删除（从未提交，删除无成本）；`packages/demo-data/src/` 重写为读取真实语料（`data/registries/*.json`）的类型化访问器，记录类型不再对齐 `PartyVerifyData`/`CiteCheckData`（**契约取子集，语料存全集**，投影责任明确划给装配点，不划给任何一个包）；`packages/tools` 加了 `@courtwork/demo-data` 作为 **devDependency**（不是 `dependencies`——生产构建产物不受影响），只有 `party-verify.test.ts`/`cite-check.test.ts` 两个测试文件用它写"装配点未来长什么样"的集成烟雾测试，`out_of_coverage` 测试直接读语料自带的 `outOfCoverage` 名单（`listPartyOutOfCoverage()`），不是抄一份字符串进测试代码——语料改名单，测试自动跟着变，不会静默过期。`party-verify.ts`/`cite-check.ts` 生产代码本身仍然零导入 `@courtwork/demo-data`，这条边界没有变；变的是"测试代码算不算受这条边界约束的 src"这个问题的答案（结论：不算，详细论证见 `packages/demo-data/SPEC.md`）。
    - **虚构纪律与法条真实性，最终由语料自身（非本层）背书**：真实语料（22 条主体 + 3 条 `outOfCoverage`、67 条法条判例）的虚构纪律护栏与校验结果由 subagent 一侧的 `data/manifest.md` 自证，本层不重复审计，只在访问器测试里断言几条关键事实（信用代码 `DEMO` 前缀、`outOfCoverage` 名单可查且确实查不到）作为"访问器没读错文件"的验证。本层占位阶段用 WebSearch 核对过的 2 条法条（民法典第一百四十三条/第五百七十七条）与语料对应条目文字一致，交叉印证但不代表对全部 67 条负责——67 条待逐条官方核验是 `manifest.md` 已声明的独立挂账工单，本层不动手核验，只在访问器里预留 `officialTextVerified: boolean` 标记位（当前批量 `false`）方便未来销账。
  - 跨层动作：已同步更新上方 TODO 区的 `reason` 枚举与消费方提醒；`packages/demo-data/SPEC.md` 已按最终架构重写（含所有权切分说明、装配点例外的边界论证、67 条法条待核验的挂账记录）。
