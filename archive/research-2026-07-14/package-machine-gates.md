# 调研 C：垂类包体例机器门工具链

调研日期：2026-07-14。置信度标注：✓ = 本次会话实抓（附 URL 与抓取日期）；※ = 训练语料记忆，未在本次核实，可能已漂移。全文不把 ※ 当结论依据，只在明确标注处使用。

---

## 0. 结论先行

**没有一条 ADR-012 约束能"装上现成工具就绿"。** 最省的一条（约束 4，exports 分面结构）也要靠 publint + attw 的标准配置组合；最重的几条（约束 1 的三者一致、约束 2 的版本一致、约束 7b 的文件名/常量命名）本质是"读 TS 源码里的 descriptor 值并和文件系统/package.json 对账"，这类检查业界没有通用工具在做——不是因为难，是因为它是 Courtwork 自定义的体例，任何通用工具的作者都没有理由为它建模。好消息：自研成本低（10~90 行 Node/TS），而且**仓库里已经有两个正在跑、被验收记录证明"红灯→绿灯"真实生效的先例**，新门应该照抄它们的形状，不是发明新形状：

- `packages/legal/src/package-metadata.test.ts`（同款见 `packages/pm/src/`）：直接 `import` descriptor 常量，和 `readFileSync` 出来的 `package.json` 对账版本号与脚本文字。这就是约束 2 的自研范式，已验收。
- `packages/core/src/package-boundary.test.ts`：对 `src/**/*.ts` 做文本级禁止名单扫描（禁止 import 特定包、禁止特定字面量、禁止 `package.json.dependencies` 出现特定包名、禁止根 barrel 转售特定路径），并且**自带反例自检**（"守卫自检：同一扫描器对植入的四种越界 import 全部报警"）。这是约束 3 的"具名黑名单"半边、约束 5 的雏形、通用架构边界的雏形——但目前**只有 core 一个机器层包有这道门，tools / reading-view / output 三个包是空白**，这是本次调研发现的一个具体缺口（见第 6 节）。

判定表总览（详表见第 2 节）：

| # | 约束 | 判定 |
|---|---|---|
| 1 | 目录 `packages/<id>` / npm 名 `@courtwork/<id>` / descriptor `identity.packageId` 三者一致 | **必须自研脚本** |
| 2 | `package.json.version === descriptor identity.version` | **必须自研脚本**（仓库已有可运行先例） |
| 3 | 根出口 browser-safe（demo/acceptance fixture、Node adapter、企业 SDK、secret、CSS、React 均不得转售） | **拆成三种机制**：具名黑名单扫描（fixture/企业SDK）+ 打包器真实构建（node:\*）+ 已被 pnpm 严格依赖隔离与共享 tsconfig 顺带挡住（CSS/React），secret 类需要另一类工具（本调研候选清单不含，标记缺口） |
| 4 | 固定 exports 分面结构 | **现成工具 + 少量配置覆盖**（publint + attw） |
| 5 | `/testing` 不进 desktop/core/registry/provider 生产依赖图 | **现成工具 + 配置为主**（eslint-plugin-import-x 的 `no-restricted-paths`），深度可达性需 dependency-cruiser 或延续自研扫描器兜底 |
| 6 | 统一 `test/lint/build/generate:json-schema` + 共享 conformance kit | **必须自研**（已有雏形，需要抽公共 helper 去重复） |
| 7a | artifact/schema id `<packageId>.<PascalCase>` | **已有现成机器门**——`packages/schemas/src/artifact-type-id.ts` 的 `ARTIFACT_TYPE_ID_PATTERN` zod 正则，admission 阶段已校验，不是新工作 |
| 7b | 文件名 kebab-case / 公开常量 `<NAME>_PACKAGE_DESCRIPTOR` 等命名 | **必须自研脚本** |
| 通用 | 依赖无环 | **现成工具直接覆盖**（dependency-cruiser 内置 `no-circular`） |
| 通用 | 三层边界收敛 + 跨域绑定白名单 + machine 层零垂类语义 | **现成工具 + 配置**（eslint-plugin-boundaries）或延续 `package-boundary.test.ts` 自研模式 |

第二个结论：**没有一条约束落在"无法机器化，只能靠评审"**——即便是"公开常量命名"这种看起来最琐碎的体例条款，也能用几十行脚本机器化。唯一的开放问题是成本划算不划算，不是能不能。

---

## 1. 逐工具核实

### 1.1 publint ✓

- 版本 `0.3.21`，最近一次 npm 发布 2026-05-13（✓ `registry.npmjs.org/publint/latest`，抓取 2026-07-14）。
- License：MIT（✓ 同上）。作者 Bjorn Lu，单一 maintainer（`bluwy`），仓库 `publint/publint`（monorepo，本包路径 `packages/publint`）。
- 定位：检查 **package.json 本身的发布形态字段**——`exports` 条件顺序、`types` 位置、CJS/ESM 格式探测（通过文件语法嗅探，不做全依赖图分析）、`repository` 字段合法性等。完整规则表已实抓（✓ `https://publint.dev/rules`，2026-07-14），核心结论：**没有任何规则检查"这个包是否 import 了 node 内置模块"或"这个包的依赖图是否浏览器安全"**——`EXPORTS_VALUE_CONFLICTS_WITH_BROWSER`、`USE_EXPORTS_BROWSER`、`USE_EXPORTS_OR_IMPORTS_BROWSER` 三条规则只是"劝你别用旧式 `browser` 字段，改用 `exports` 条件"的字段级 lint，**不涉及依赖图遍历**。
- 运行方式：默认就是"本地目录检查"，不需要先 `npm publish`（`FILE_NOT_PUBLISHED` 规则的说明原文写"该错误只在本地运行 publint 时出现"，反证了本地目录是其主用法）。这点对 Courtwork 很关键——`packages/*` 全部 `"private": true`，永远不会真正 `npm publish`，publint 仍然全额适用，因为它检查的是"exports 形状是否让 Node/打包器解析正确"，不是"能不能发布到 npm"。
- 适配本仓库的用途：约束 4（固定 exports 分面）的结构合法性半边——`/package`、`/schemas`、`/testing`、`/runtime` 四个分面一旦落地，publint 能查出条件顺序错误、`types` 缺失、`EXPORTS_MISSING_ROOT_ENTRYPOINT` 之类的低级错误。
- 引入成本：单一小工具（devDependency），无运行时依赖膨胀，`npx publint` 或 `pnpm -r exec publint` 即可跑。不引入的自研成本：exports 条件顺序/格式合法性这类细节规则多达 30+ 条，手写等价校验不现实（成本远高于装一个包）。

### 1.2 @arethetypeswrong/cli（attw）✓

- 版本 `0.18.5`，最近发布 2026-07-09（✓ `registry.npmjs.org/@arethetypeswrong/cli/latest`，2026-07-14）。License MIT。仓库 `arethetypeswrong/arethetypeswrong.github.io`（cli 是其中一个 workspace）。
- 定位：检查**类型声明与运行时 exports 在 node10 / node16 / bundler 三种 moduleResolution 模式下是否解析一致**。完整问题目录已实抓（✓ cli README，2026-07-14）：`NoResolution`、`UntypedResolution`、`FalseCJS`、`FalseESM`、`CJSResolvesToESM`、`FallbackCondition`、`CJSOnlyExportsDefault`、`FalseExportDefault`、`MissingExportEquals`、`UnexpectedModuleSyntax`、`InternalResolutionError`、`NamedExports`。**同样不检查依赖图内容**，纯粹是"类型条件 vs 运行时条件"的映射正确性。
- 关键操作细节：attw 自动从 `exports` 字段发现入口点，天然适合"每个分面各测一次"的用法（约束 4）。但 **`--pack` 选项官方声明不支持 npm 以外的包管理器**（✓ 原文："Please note that the `--pack` option does not support package managers other than npm at this time... if you use pnpm or yarn, you should generate the tarball yourself first (using `pnpm pack`/`yarn pack`) and then run `attw <packed-tarball-name>`"）。Courtwork 全仓 pnpm，意味着接入方式必须是 `pnpm pack` 产出 tarball 后再喂给 `attw`，不能直接 `attw --pack .`。
- 适配用途：约束 4 的"每个分面 entrypoint 能否被正确解析"半边，是 publint 的互补而非替代——publint 查 `package.json` 字段形状，attw 查形状背后的解析结果是否正确。
- 引入成本：小，`@arethetypeswrong/core` 是唯一依赖，无运行时膨胀。自研等价成本：要手写"在三种 moduleResolution 模式下模拟 TS 解析算法"级别的检查不现实，这是唯一一个"自研完全不划算"的角落。

### 1.3 eslint-plugin-import（经典版）✓ / eslint-plugin-import-x ✓

- 经典版 `eslint-plugin-import` 最新 `2.32.0`，**最近一次 npm 发布 2025-06-20**（✓ `registry.npmjs.org/eslint-plugin-import/latest`，2026-07-14 抓取）——距今已超过一年未发新版。`peerDependencies.eslint` 声明为 `"^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9"`（✓ 同一响应体），**不包含 `^10`**。Courtwork 根 `package.json` 锁定 `"eslint": "^10.6.0"`（本仓库实读）。也就是说经典版没有为本仓库当前的 ESLint 大版本声明过兼容性。
- `eslint-plugin-import-x` 最新 `4.16.2`，最近发布 2026-03-11（✓ 同一来源）。License MIT，`type: module`，维护者 JounQin（un-ts 组织）。`peerDependencies.eslint` 声明为 `"^8.57.0 || ^9.0.0 || ^10.0.0"`（✓ 同一响应体）——**明确覆盖 ESLint 10**。README 的 "Why" 一节（✓ 实抓 `un-ts/eslint-plugin-import-x` README，2026-07-14）说明了分叉原因：经典版长期拒绝接受破坏性修复、锁定了 `exports` 字段支持的 issue，import-x 是目前接受修复、依赖数从经典版 117 个降到 16 个、自研 Rust resolver（`unrs-resolver`）替代老旧 `resolve` 包的活跃分支。
- 两者都提供 `no-restricted-paths` 规则（Enforce which files can be imported in a given folder），配置形状完全一致（✓ 两个仓库的 `docs/rules/no-restricted-paths.md` 内容一致）：`zones: [{ target, from, except?, message? }]`，`target`/`from` 支持目录字符串或 glob。这正是约束 5（`/testing` 不进生产图）和通用跨域边界的现成机制。
- import-x 额外确认了一条对约束 3（Node adapter 禁令）有直接价值的规则：`no-nodejs-modules`（"Forbid Node.js builtin modules"，✓ README 规则表）。这是源码级、AST 级别的检查（比字符串扫描更准），但**只能看到"这个文件自己写没写 `import 'node:fs'`"，看不到"这个文件 import 的第三方包内部是否用了 node:fs"**——后者仍然需要打包器真实构建（第 3 节详述）。
- 引入成本：import-x 本身及其 `no-restricted-paths`/`no-nodejs-modules` 都是配置项，零自研代码。跨包解析需要额外装 `eslint-import-resolver-typescript`（小包，社区标准搭配）。不引入的自研成本：等价于自己写一个 AST 遍历 + import 语句分类器，参照 `package-boundary.test.ts` 现有模式做字符串扫描版本成本不高（约 90 行/包），但字符串扫描无法做“跨文件夹 zone”的精确目录规则，容易漏报/误报。

### 1.4 eslint-plugin-boundaries ✓

- 版本 `6.0.2`，最近发布 2026-03-30（✓ `registry.npmjs.org/eslint-plugin-boundaries/latest`，2026-07-14）。License MIT。**单一维护者**（javierbrea），无组织背书——这是唯一一个要标注"bus factor"风险的候选。
- 定位：把代码库划成有名字的"元素类型"（如 `contract` / `machine` / `vertical` / `binding`），再声明"谁能依赖谁"的矩阵，原生支持 ESLint flat config（✓ README quick example 直接是 `export default [...]` 写法，2026-07-14 抓取）。这个"元素类型 + 依赖矩阵"模型和 ADR-001 的三层边界（契约层/机器层/绑定层）在概念上是同构的，比 `no-restricted-paths` 的"一对一 zone"更适合表达"N 个包互相之间的允许/禁止矩阵"这种整体架构策略。
- 引入成本：中等——需要维护一份 `boundaries/elements` 类型清单和一份规则矩阵，属于新的配置面；换来的是新增机器层包（未来第二个、第三个垂类之外的通用能力包）时**零新增代码**，规则自动套用到匹配 pattern 的新文件。对比自研的 `package-boundary.test.ts` 模式：每个机器层包一份硬编码黑名单文件（当前只有 core 有），新增包必须复制一份新测试文件才能获得同等保护。

### 1.5 dependency-cruiser ✓

- 版本 `17.4.3`，最近发布 2026-05-29（✓ `registry.npmjs.org/dependency-cruiser/latest`，2026-07-14）。License MIT。维护者 Sander Verweij（`sverweij`）+ 一名协作者，仓库活跃度高（复杂的多目标 npm scripts、持续追踪 TypeScript 6.x/ESLint 9.x 等前沿依赖，devDependency 里已经是 `"typescript":"^6.0.3"`——和 Courtwork 当前 TS 版本一致，兼容性风险低）。
- 核心能力（✓ 官方 `doc/rules-tutorial.md` 与 `doc/options-reference.md` 目录，2026-07-14 抓取）：
  - **`dependencyTypes` 分类**：能把一条依赖边归类为 `"core"`（Node 内置模块）等类型，教程原文示例就是"禁止任何模块 `to: { dependencyTypes: ["core"], path: "^http$" }`"——这对约束 3 的 node:\* 禁令是一个可选的静态分析路径（区别于打包器真实构建路径，见第 3 节比较）。
  - **`no-circular`**（关键字确认，`keywords` 字段含 `"circular"`）：对通用架构边界的"依赖必须无环"是标准内置能力，几乎零配置。
  - **`reaches` 过滤器**（✓ `options-reference.md` 目录："`reaches`: show modules matching a pattern - with everything that can reach them"）：这是**反向可达性查询**——"谁能到达 X"，形状正好对应约束 5（谁在消费 `/testing`）。dependency-cruiser 自己的 `package.json` 里就有一条脚本 `depcruise:reaches ... --reaches`，证明这是一个成熟、被自己项目吃自己狗粮验证过的功能。
  - `doNotFollow` / `includeOnly` 过滤器（✓ 同一目录确认存在，但受限于该文档单文件体积过大，本次未能抓到默认值与 node_modules/pnpm 符号链接遍历细节的完整正文）。这意味着"dependency-cruiser 能否干净地穿透 pnpm workspace 的 node_modules 符号链接、精确定位到 `packages/legal/dist/testing/xxx.js`"**需要一次小 spike 验证，本报告不把它当作已确认能力**（标记为待验证，见第 3.3 节）。
  - rules-reference 目录里另确认存在一个名为 `reachable` 的 **condition**（用于"detecting dead wood and transient dependencies"），但同样因文档体积超限，未能抓到其精确配置语法——只确认"存在"，不确认"用法"。
- 引入成本：单一 devDependency，配置是一份 `.dependency-cruiser.js`/`.json`，规则语法是纯数据（`forbidden: [{ from, to }]`），学习成本低于 eslint-plugin-boundaries 的"元素类型"抽象。自研等价成本：`no-circular`/`reaches` 这类图算法如果自己写（DFS 检测环、反向遍历找可达前驱）不难（各自 50 行量级），但要做到覆盖 TS path alias、workspace 符号链接、ESM/CJS 混用等边角情况，重新发明一个简化版模块解析器的成本会显著高于直接用这个已经吃过这些坑的工具。

### 1.6 syncpack ✓

- 版本 `15.3.2`，最近发布 2026-06-15（✓ `registry.npmjs.org/syncpack/latest`，2026-07-14）。License MIT。维护者 Jamie Mason，**近期已经把 CLI 核心改写为 Rust 并以平台特定二进制分发**（`optionalDependencies` 里出现 `syncpack-linux-x64`、`syncpack-darwin-arm64` 等，✓ 同一响应体）——这是相对训练语料中"syncpack 是纯 JS 工具"印象的一个实质性变化，明确标注为 ✓ 本次实抓更新。
- 定位：monorepo 内同一依赖的版本号/semver range 一致性检查与自动修复。**不检查 descriptor/packageId 这类项目自定义语义**，只对齐 `package.json` 里字面出现的依赖版本号。
- 引入成本：中；配置面较丰富（`.syncpackrc`），功能比 sherif/manypkg 更细（能管 semver range 格式，不仅是版本号）。

### 1.7 sherif ✓（新增候选，训练语料之外）

- 版本 `1.13.0`，最近发布 2026-07-04（✓ `registry.npmjs.org/sherif/latest`，2026-07-14）。License MIT。Rust 编写、平台二进制分发（同 syncpack 新架构），**零配置**（README 原文 "Zero-config"）。
- 规则集合（✓ 实抓 README，2026-07-14）：`multiple-dependency-versions`、`unsync-similar-dependencies`、`non-existant-packages`、`packages-without-package-json`、`root-package-dependencies`、`root-package-manager-field`、`root-package-private-field`、`types-in-dependencies`、`unordered-dependencies`。作者在 credits 里明确写"Manypkg for some of their rules"——是 manypkg 精神的继任者，跑得更快（Rust、不需要装 `node_modules`）。
- 与本仓库的契合点：`root-package-private-field`、`root-package-manager-field` 这类"根 package.json 卫生"规则恰好能顺手验证根 `package.json` 的 `packageManager` 字段没有漂移；但**它不检查 descriptor 语义**，和 syncpack 一样是"monorepo 卫生"层面的通用工具，不是本次三条最难约束的答案。

### 1.8 @manypkg/cli ✓

- 版本 `0.25.1`，最近发布 2025-08-28（✓ `registry.npmjs.org/@manypkg/cli/latest`，2026-07-14）——距今约 11 个月无新版本，**维护节奏明显慢于 syncpack/sherif**，但仍在 Thinkmill 组织名下（changesets 生态常用），非"废弃"状态。License MIT。
- 定位与 sherif 接近但更早、更窄：检查 workspace 依赖版本一致性、`dependencies`/`devDependencies` 分类合理性。原生支持 pnpm workspace。
- 判断：在 sherif（更快、更新、同源规则）和 syncpack（功能更全）都在场的情况下，manypkg 目前不构成额外必要性，仅作为背景记录。

### 1.9 knip ✓

- 版本 `6.20.0`，最近发布 2026-06-24（✓ `registry.npmjs.org/knip/latest`，2026-07-14）。**License ISC**（不是 MIT，但同属宽松许可、非 copyleft，对私有/不发布代码无限制）。维护者 Lars Kappert（webpro），单人但项目本身声誉度高、发版节奏密（v6 是当前主线，2026 年内持续发布）。
- 定位：死代码/未用导出/未声明依赖/未解析导入的静态分析，官方文档明确"Workspaces are handled out-of-the-box"（✓ `https://knip.dev/features/monorepos-and-workspaces`，2026-07-14），**原生读取 `pnpm-workspace.yaml` 的 `packages` 数组**（文档列出的四种 workspace 发现来源之一），并且有专门的 "Catalogs" 文档页，对 pnpm catalogs 特性有专门支持。
- 与本仓库的契合点：约束 6（每包统一提供的四个脚本背后隐含的"这个包没有死代码/幽灵依赖"卫生要求）的现成答案，且零 workspace 适配成本。不直接回答本次三条最难约束，但值得作为"顺手买一送一"的推荐项写进回灌建议。

### 1.10 @microsoft/api-extractor ✓

- 版本 `7.58.9`，最近发布 2026-06-13（✓ `registry.npmjs.org/@microsoft/api-extractor/latest`，2026-07-14）。License MIT。Microsoft rushstack 团队维护，持续更新。
- **关键兼容性风险（本次实抓发现，非训练语料）**：该版本的 `dependencies` 字段里固定内置 `"typescript":"5.9.3"`（✓ 同一响应体）——api-extractor 历来是"自带一份精确版本的 TS 编译器来分析你项目产出的 `.d.ts`"，不是用你项目自己的 TS 版本。而 Courtwork 根 `package.json` 锁定 `"typescript": "^6.0.3"`，经核实这确实是 TypeScript 当前最新正式版（✓ `registry.npmjs.org/typescript/latest` → `6.0.3`，2026-07-14，license Apache-2.0）。**api-extractor 内置编译器落后项目实际 TS 版本一个大版本**，用它分析用 TS 6.x 新语法/新 lib 特性编译出的 `.d.ts` 是否会报"不支持的 TypeScript 版本"或解析异常，本次调研**未做实测，判定为未知风险**，不建议在没有 spike 之前写进 ADR。
- 定位与本任务的关系：api-extractor 的核心价值是"API 面冻结 + api.md diff"，即"这次改动是否意外改变了公开 API 形状"——这正好是约束 3（根出口不该转售 X）"事后审计"角度的现成工具：只要 API report 里出现了不该出现的类型名（比如某个 Node adapter 类型泄漏到了根导出），diff 就会显形。但它的正常工作模型是**单入口点**（一次分析对应一个 `.d.ts` 汇总），Courtwork 现在要做 5 个分面（`.`/`/package`/`/schemas`/`/testing`/`/runtime`），需要每个分面各跑一次（较新版本据其 `exports` 结构支持多入口配置，但本次未验证 Courtwork 场景下的具体接线方式，标记为待验证）。
- 判断：这是本次候选里**性价比最低**的一个——配置面重（需要 `api-extractor.json` + `api-extractor-model`）、内置 TS 版本落后带来未知兼容性风险、且它解决的问题（"API 形状是否意外变化"）与约束 3/4 已经被 publint+attw+esbuild 真实构建组合覆盖大部分。不建议现阶段引入，除非未来出现"需要对外部消费者承诺 API 稳定性"的强需求。

### 1.11 pnpm 自身能力 ✓

- pnpm 最新版本 `11.3.0`（✓ `registry.npmjs.org/pnpm/latest`，2026-07-14，license MIT）。**Courtwork 当前锁定 `packageManager: pnpm@9.15.0`（本仓库实读 `package.json`），落后两个大版本**。这不是本次调研题内约束，但作为背景发现记入第 6 节。
- **`workspace:*` 协议**：本仓库已经在用（`legal/package.json` 等的内部依赖全部是 `workspace:*`/`workspace:^`），发布时会被替换成真实版本号——但因为这些包 `"private": true` 永不发布，这条替换逻辑目前对 Courtwork 是死代码，不构成额外验证点。
- **`publishConfig`**：本仓库当前所有 `packages/*/package.json` 均未设置 `publishConfig`，因为不发布。若未来任何一个垂类包要走"给外部消费方用"的路径，需要单独评估，不在本次范围。
- **`catalogs`（✓ `https://pnpm.io/catalogs`，2026-07-14，文档标注当前是 pnpm 11.x 版本线）**：workspace 级别的共享版本号常量（`pnpm-workspace.yaml` 里定义 `catalog:` 字段，各 `package.json` 用 `"zod": "catalog:"` 引用）。发布/打包时 `catalog:` 会被替换成真实 range，机制和 `workspace:` 协议一致。`catalogMode`（v10.12.1 加入）、`cleanupUnusedCatalogs`（v10.15.0 加入）等精细化设置版本更新，Courtwork 目前的 9.15.0 大概率只有最基础的 catalog 声明/引用能力（未做逐条位版本核实，标记为可用但功能面较旧）。**catalogs 能替代 syncpack/sherif 的"统一版本"职责的一部分——但只对你主动声明进 catalog 的依赖生效，不会主动发现"忘记声明"的漂移**；syncpack/sherif 是侦测型工具，catalogs 是预防型机制，两者互补不互斥。
- **`--filter`**：本仓库已经在用（`release.md` 里 `pnpm --filter @courtwork/desktop test` 等），是标准能力，不需要额外调研。

### 1.12 esbuild ✓（作为"打包器实测"候选）

- 版本 `0.28.0`，最近发布 2026-04-02（✓ `registry.npmjs.org/esbuild/latest`，2026-07-14）。License MIT。作者 Evan Wallace，**仍是 0.x 版本号（尚未 1.0）**——这是一个需要注意的稳定性提示：语义化版本号上 esbuild 目前不承诺"次版本不破坏兼容"，锁定精确版本号并主动升级是必要的工程纪律。
- **Platform 行为（✓ 官方文档 `https://esbuild.github.io/api/#platform` 原文，2026-07-14 抓取，见第 3.3 节详细摘录）**：`platform: 'browser'`（默认值）时，conditions 自动加入 `browser`，**但不会像 `platform: 'node'` 那样自动把 node 内置模块标记为 external**——原文："All built-in node modules such as `fs` are automatically marked as external" 这句话**只出现在 `platform: 'node'` 的行为描述里**，`platform: 'browser'` 的描述里没有对应语句。这意味着在 `platform: 'browser'` 下尝试 bundle 一段 `import 'node:fs'` 会因为找不到可解析的文件而**构建失败**——这正是我们需要的"fail closed"信号。
- Courtwork 现状：`apps/desktop/package.json` 已经把 `vite@^7.1.5` 声明为 devDependency（本仓库实读），Vite 内部依赖 esbuild 做预构建/转译，意味着 esbuild 已经间接存在于本仓库的 workspace 依赖树里——把它显式提升为一个小的根级 devDependency（或直接在 `apps/desktop` 之外新增一份极小依赖）**增量成本接近零**。

---

## 2. 逐约束判定表（完整版）

| 约束 | 判定 | 理由 / 主工具 |
|---|---|---|
| 1. 目录/npm名/packageId 三者一致 | **必须自研脚本** | 没有通用工具理解 "packageId" 这个 Courtwork 自定义概念；且它同时跨越文件系统（目录名）、package.json（name 字段）、TS 源码值（descriptor.identity.packageId）三个世界，任何通用 lint 工具都不会替你建这个映射。 |
| 2. `package.json.version === descriptor identity.version` | **必须自研脚本**（已有先例） | 同上，descriptor 是 TS 值不是 JSON，通用工具读不到。仓库已有 `package-metadata.test.ts` 证明这条路可行、成本低（~15 行/包）。 |
| 3. 根出口 browser-safe（五个子禁令） | **拆解见下** | 见第 3.3 节的三分法：demo/acceptance fixture + 企业SDK → 具名黑名单扫描；Node adapter（node:\*）→ 打包器真实构建；CSS/React → 已被 pnpm 严格依赖隔离 + 共享 tsconfig（无 DOM lib、无 jsx 配置、`include` 只收 `.ts` 不收 `.tsx`）顺带挡住；secret → 需要另一类工具（本次候选清单未覆盖，标记缺口）。 |
| 4. 固定 exports 分面结构 | **现成工具 + 少量配置覆盖** | publint 查字段形状合法性，attw 查每个分面的类型/运行时解析一致性。两者组合后剩余空白很窄（谁能 import 哪个分面的"策略"问题，归约束 5）。 |
| 5. `/testing` 不进 desktop/core/registry/provider 生产依赖图 | **现成工具 + 配置为主** | `eslint-plugin-import-x` 的 `no-restricted-paths`（zone 语法）能表达"target 不能 from 某目录"，直接命中源码级直接引用。深层可达性（经第三方包间接引用）需要 dependency-cruiser 的 `reaches`/图遍历能力兜底，但其对 pnpm workspace 符号链接的遍历细节本次未完整核实，建议先 spike。 |
| 6. 统一四个脚本 + 共享 conformance kit | **必须自研**（已有雏形） | `package-metadata.test.ts` 已经在测 `scripts` 字段的 `toMatchObject`；"共享 conformance kit"目前还是两份几乎一样的文件（legal、pm 各一份），需要抽成 `packages/registry` 下的公共 helper。 |
| 7a. artifact/schema id `<packageId>.<PascalCase>` | **已有现成机器门** | `packages/schemas/src/artifact-type-id.ts` 的 `ARTIFACT_TYPE_ID_PATTERN = /^[a-z][a-z0-9-]*\.[A-Z][A-Za-z0-9]*$/`，`validateArtifactDescriptor` 与 admission 阶段的 zod schema 已经在用它校验，不需要新增任何东西。 |
| 7b. 文件名 kebab-case、公开常量 `<NAME>_PACKAGE_DESCRIPTOR/BINDINGS/PACKAGE` 命名 | **必须自研脚本** | 无通用工具理解这个命名惯例；`readdirSync` + 正则、`export const` 声明名正则即可，成本低。 |
| 通用：依赖无环 | **现成工具直接覆盖** | dependency-cruiser 内置 `no-circular`，是它的招牌能力（`keywords` 含 `circular`），配置量接近零。 |
| 通用：三层边界收敛 + 跨域绑定白名单 + machine 层零垂类语义 | **现成工具 + 配置**，或延续自研 | `eslint-plugin-boundaries` 的"元素类型 + 依赖矩阵"模型和 ADR-001 三层边界同构；也可以复制 `package-boundary.test.ts` 的字符串扫描模式（零依赖、已验证，但目前只覆盖 core，tools/reading-view/output 是空白）。 |

---

## 3. 三条最难约束的落地形状

### 3.1 约束 1：目录 / npm 名 / packageId 三者一致——几乎肯定要自研，最省的实现形状

**结论：必须自研，但只需要一个约 50 行的共享 helper，每个包 5~10 行调用代码。**

没有现成工具的原因很直接：这条约束把三个不同的"真源"绑在一起——文件系统路径、`package.json.name` 字符串、TS 源码里一个 `export const XXX_PACKAGE_DESCRIPTOR = { identity: { packageId: '...' } }` 对象字面量的运行时值。前两者是任何工具都能读的静态数据，第三者**必须真的执行/导入这段 TS 代码**才能拿到值（正则去匹配源码文本理论上可行但脆弱——字面量可能跨行、可能用变量拼接、可能被格式化工具重排）。

最省形状——沿用仓库已经验证过的"直接 `import` descriptor 常量"套路，只是把它从"每包一份重复文件"升级成"每包一份薄调用 + 一份共享 helper"：

```ts
// packages/registry/src/testing/package-identity-conformance.ts（新增，contract 层，零垂类语义）
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export interface PackageIdentitySnapshot {
  packageId: string;
  version: string;
}

export interface PackageIdentityCheckInput {
  /** import.meta.dirname 传进来的包根目录（如 packages/legal） */
  packageDir: string;
  descriptorIdentity: PackageIdentitySnapshot;
}

/** 返回问题清单；空数组即通过。调用方（各包自己的 test）负责 import 自己的 descriptor。 */
export function checkPackageIdentityConsistency({
  packageDir,
  descriptorIdentity,
}: PackageIdentityCheckInput): string[] {
  const issues: string[] = [];
  const dirId = basename(packageDir);
  const pkgJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf-8')) as {
    name: string;
    version: string;
  };

  if (dirId !== descriptorIdentity.packageId) {
    issues.push(`目录名 "${dirId}" != descriptor identity.packageId "${descriptorIdentity.packageId}"`);
  }
  if (pkgJson.name !== `@courtwork/${descriptorIdentity.packageId}`) {
    issues.push(`package.json.name "${pkgJson.name}" != "@courtwork/${descriptorIdentity.packageId}"`);
  }
  if (pkgJson.version !== descriptorIdentity.version) {
    issues.push(`package.json.version "${pkgJson.version}" != descriptor identity.version "${descriptorIdentity.version}"`);
  }
  return issues;
}
```

每个垂类包的调用侧（并入现有 `package-metadata.test.ts`，不新增文件）：

```ts
// packages/legal/src/package-metadata.test.ts 追加
import { checkPackageIdentityConsistency } from '@courtwork/registry/testing';

it('目录/npm名/packageId 三者一致', () => {
  expect(
    checkPackageIdentityConsistency({
      packageDir: fileURLToPath(new URL('..', import.meta.url)),
      descriptorIdentity: LEGAL_PACKAGE_DESCRIPTOR.identity,
    }),
  ).toEqual([]);
});
```

**是否存在"读 descriptor 的既有惯例"**：存在——就是"这个测试文件本来就在这个包内部，可以直接 `import` 同包的 descriptor 常量"，不需要跨包动态发现。另一种形状（根级脚本用 `import()` 动态遍历 `packages/*/dist/package/index.js` 找 `<NAME>_PACKAGE_DESCRIPTOR` 导出）技术上可行，但依赖约束 7b 的命名惯例已经生效（否则找不到该 import 哪个符号），而且要求先 `pnpm -r build` 产出 `dist/`，比"包内自测"多一层前置依赖，不建议作为首选。

### 3.2 约束 2：`package.json.version === descriptor identity.version`——已有生产先例，直接复用

**结论：不需要新设计，`packages/legal/src/package-metadata.test.ts` 与 `packages/pm/src/package-metadata.test.ts` 已经是这条约束的生产实现，且已经过 TDD 红灯验证（SPEC.md 记录："临时加入 Legacy.schema.json 时全集门失败" 是同一批工作里 JSON Schema drift 门的红灯证据，version 门本身的红灯证据是"缺 test/lint 时 metadata 门失败"）。**

唯一的改进空间：目前两份文件几乎逐字重复（只有包名/常量名不同），应该抽成 3.1 节的共享 helper，同时覆盖约束 2：

```ts
export function checkVersionConsistency(pkgVersion: string, descriptorVersion: string): string[] {
  return pkgVersion === descriptorVersion
    ? []
    : [`package.json.version "${pkgVersion}" != descriptor identity.version "${descriptorVersion}"`];
}
```

这条不需要"跨越 JSON 元数据与 TS 值两个世界"的额外技巧——因为测试文件本身就是 TS，`import` descriptor 和 `readFileSync` + `JSON.parse` package.json 都是普通操作，两个世界在同一个 Vitest 测试进程里自然相遇，不存在需要序列化桥接的问题。真正需要自研的不是"怎么读",而是"读完之后按 Courtwork 的规则判断"，这部分没有通用工具会替你做。

### 3.3 约束 3 / 5：根出口 browser-safe、`/testing` 不进生产图——依赖图 + 导出面的联合约束

这是唯一需要"评估打包器实测当机器门"这个形状的地方。**结论：值得用，但只覆盖约束 3 五个子禁令中的一个（node:\*），不是万能药；约束 5 主要靠 ESLint 规则，打包器实测作为可选的第二层防御。**

#### 3.3.1 约束 3 拆解：五个子禁令不是同一类问题

逐条对应机制：

| 子禁令 | 机制 | 理由 |
|---|---|---|
| demo/acceptance fixture（如 `@courtwork/demo-data`） | 具名黑名单扫描（`no-restricted-paths` 或 `package-boundary.test.ts` 式扫描） | 包名已知、数量少，属于"点名"问题，不需要图算法。 |
| 企业 SDK | 同上 | 同样是点名问题；且 ADR-012 决定三已经要求企业 SDK 只能住 `/runtime`，`/runtime` 目录本身不存在时这条禁令天然满足（"不为空壳造接口"）。 |
| Node adapter（`node:*`） | **打包器真实构建**（见 3.3.2） | 这是唯一真正需要"整条依赖图，含第三方包内部实现"的问题——一个第三方 npm 包即使名字听起来无害，其内部实现完全可能 `require('node:crypto')`，源码级扫描（无论 ESLint 还是字符串匹配）只能看到你自己代码里写了什么，看不到第三方包内部写了什么。 |
| secret | **本次候选清单未覆盖，标记缺口** | 这不是"依赖图"问题，是"字面量值是否是密钥形状/是否命中已知密钥模式"的问题，需要秘钥扫描类工具（如 gitleaks/trufflehog 一类，未在本次任务的候选清单内，也未调研）。CLAUDE.md 不变量 8 已经声明"密钥不进前端明文、日志、事件流或遥测"，本仓库大概率在别处已有对应机制，但本次未验证，建议架构角色另行确认是否已有门覆盖，若无则需要单独立项调研。 |
| CSS / React | **已被现有配置顺带挡住**（见下） | 本仓库根 `tsconfig.json` 的 `lib` 只有 `["ES2023"]`（无 DOM）、没有配置 `jsx`、且 `packages/legal/tsconfig.json` 的 `include` 只收 `src/**/*.ts`（不含 `.tsx`）——写真正的 JSX 语法在这些包里过不了 `tsc -p tsconfig.json`（这本来就是约束 6 要求的统一 `build` 脚本）。更根本的保护是 **pnpm 的严格依赖隔离**：`packages/legal` 没有把 `react`/任何 CSS 处理器声明为 `dependencies`，就无法 `import` 到——这是 pnpm 非幽灵依赖（no phantom dependency）特性自带的免费保护，不需要新增工具。唯一的剩余风险是"有人把 react 加进了某个垂类包的 `dependencies`"，这个风险已经被 `package-boundary.test.ts` 现有模式里的"检查 `package.json.dependencies` 不含禁止包名"这一招覆盖（目前只在 core 实现，建议推广，见第 6 节）。 |

#### 3.3.2 打包器实测评估：用 esbuild `--platform=browser` 当机器门

**这个形状本身是可靠的，理由已经用官方文档核实（非训练记忆推断）**：esbuild 的 Platform 文档原文（✓ 2026-07-14 实抓）明确写"All built-in node modules such as `fs` are automatically marked as external"**只在 `platform: 'node'` 的行为里**；`platform: 'browser'`（默认值）的行为条目里没有这句话，意味着在浏览器平台下遇到 `node:fs` 这类 import，esbuild 会尝试当作普通模块解析，因为 `node_modules` 里没有叫 `node:fs` 的包，解析失败，**构建直接报错退出**——这正是需要的"fail closed"信号，不是需要额外编写判断逻辑的软信号。

最小实现（约 25 行，`packages/registry` 下作为共享脚本，或独立小脚本）：

```js
// scripts/verify-browser-safe.mjs（建议放根级 scripts/，因为要在 pnpm -r build 之后、跨包运行）
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const packageId = process.argv[2];
if (!packageId) {
  console.error('用法：node scripts/verify-browser-safe.mjs <packageId>');
  process.exit(1);
}

const entryDir = mkdtempSync(join(tmpdir(), 'browser-safe-'));
const entryFile = join(entryDir, 'entry.mjs');
writeFileSync(entryFile, `import '@courtwork/${packageId}';\n`);

try {
  await build({
    entryPoints: [entryFile],
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'esm',
    absWorkingDir: process.cwd(), // 仓库根，让 node_modules 解析到 pnpm 的 workspace 符号链接
    logLevel: 'silent',
  });
  console.log(`OK  @courtwork/${packageId} 根出口 browser-safe`);
} catch (err) {
  console.error(`FAIL  @courtwork/${packageId} 根出口拉入了非 browser-safe 模块：`);
  console.error(err.message);
  process.exitCode = 1;
} finally {
  rmSync(entryDir, { recursive: true, force: true });
}
```

**必要前提**：Courtwork 各包 `exports` 目前只有单一 `default` 条件（无 `browser`/`node` 分流，本仓库实读 `legal/package.json` 确认），这恰好简化了测试——不需要显式传 `--conditions=browser`，因为不管什么 condition 都会解析到同一个 `dist/index.js`，esbuild 默认 `platform:'browser'` 自动加入的 `browser` condition 找不到专门条目时会退回 `default`，测的就是"唯一那份代码是否安全"，和 ADR-012"根出口就是唯一、通用、安全的那一份"的设计意图完全对齐。这个脚本必须在 `pnpm -r build` **之后**运行（`exports` 指向 `dist/`）。

**评估结论（直接回答"这个形状值不值得当机器门"）**：

- 优点：唯一真正权威的 oracle——用的是 Node 生态实际使用的解析算法（esbuild 的 resolver 是生产级实现），而不是自己近似猜测的规则；能捕获第三方依赖内部的泄漏（源码扫描和 ESLint 规则都做不到）；成本极低（esbuild 已经通过 `apps/desktop` 的 `vite@^7.1.5` 间接存在于依赖树，脚本本身约 25 行）；速度快（esbuild 是编译型工具，单包验证在亚秒级）。
- 缺点：需要先 `pnpm -r build`（排序依赖，但这本来就是本仓库既定顺序，见第 4 节）；esbuild 目前仍是 0.x 版本号，没有 semver 稳定性承诺，需要锁定精确版本并谨慎升级；只覆盖"根出口是否引入不可解析的 node 内置模块"这一个具体问题，不是约束 3 全部五个子禁令的通用答案（见 3.3.1 表）；报错信息是"解析失败"级别，不会主动告诉你"这是因为 ADR-012 决定二"，需要在 CI 输出里包一层人话提示。
- 与 dependency-cruiser 的 `dependencyTypes: ["core"]` 路径相比：两者都能达到目的，但 esbuild 路径的**判据更贴近"实际会不会在浏览器里跑炸"**（真实模块解析算法），dependency-cruiser 路径的判据是"静态依赖图分类"（同样可信，但需要额外配置一次 `.dependency-cruiser.json` 并决定是否要它同时承担"无环"和"跨域边界"两件事）。如果仓库已经因为约束 5/通用边界引入了 dependency-cruiser，顺手加一条 `to: { dependencyTypes: ["core"] }` 规则是免费的；如果没有引入 dependency-cruiser，单独为这一条上 dependency-cruiser 不如直接用 esbuild 脚本轻。**建议：两者不互斥，若已引入 dependency-cruiser 则两者都留（互为交叉验证），若只能选一个，优先 esbuild（判据更权威、成本更低）。**

#### 3.3.3 约束 5：`/testing` 不进生产图

主力机制是 `eslint-plugin-import-x` 的 `no-restricted-paths`，配置形状（✓ 语法已核实）：

```js
// eslint.config.js 追加一段 override
{
  files: ['packages/core/src/**/*.ts', 'packages/tools/src/**/*.ts', 'packages/reading-view/src/**/*.ts', 'packages/output/src/**/*.ts', 'packages/registry/src/**/*.ts', 'packages/provider/src/**/*.ts', 'apps/desktop/src/**/*.{ts,tsx}'],
  rules: {
    'import-x/no-restricted-paths': ['error', {
      zones: [
        { target: '.', from: ['packages/legal/src/testing', 'packages/pm/src/testing'], message: '/testing 只允许 demo-runtime/acceptance 消费' },
      ],
    }],
  },
}
```

这能捕获"源码里直接写了 `import ... from '@courtwork/legal/testing'`"的情况——因为 target 覆盖了全部机器层 + desktop，任何一个文件（不管是被几层间接 import 的深层文件）只要自己写了违规 import，linting 到那个具体文件时就会报警，**不需要额外的"多跳可达性"能力**，因为违规的源头总是某个具体文件的具体一行代码，而 ESLint 会检查工作区里的每一个文件。真正需要多跳可达性分析的场景，是"能不能通过已经打包成 `dist/` 的第三方 npm 包间接引用"——这种情况理论存在但概率低（因为 `/testing` 分面的消费方目前只可能是仓库内部包，不涉及外部黑盒 npm 包），可以先不上 dependency-cruiser 的深度可达性分析，作为 P1 加固项。

---

## 4. 门跑在哪 + 反例触红方案

### 4.1 门跑在哪——必须先承认一个现状

本仓库**当前没有跑测试/lint/build 的自动化 CI**：`.github/workflows/` 目录下只有 `pages.yml`（部署文档/营销站点），没有任何 workflow 跑 `pnpm test`/`pnpm lint`/`pnpm -r build`（本仓库实读确认）。也没有 `husky`/`lint-staged`/`.pre-commit-config.yaml` 之类的 pre-commit 钩子（同样实读确认为不存在）。

本仓库真正的"门"是**流程性的、会话制的**（`docs/engineering/workflow.md`）：

- 每个工单的**实现会话**收尾必须手动跑 `pnpm -r build && pnpm lint && pnpm test`（workflow.md 步骤 5）；
- 每个工单必须有**独立的验收会话**重新实测并写入 `ACCEPTANCE.md`（工程纪律要求实现者与验收者不同）；
- 发布前有更完整的手动"全量门"清单（`release.md` 步骤 2：`pnpm install --frozen-lockfile && pnpm site:guard && pnpm lint && pnpm -r build && ... && pnpm test && cargo test ... && playwright test`）。

**因此本次新增的所有机器门，正确的接入点是折进已经存在、已经是强制流程的三条命令（`pnpm -r build` / `pnpm lint` / `pnpm test`），而不是发明第四条命令**，理由是：workflow.md 和 CLAUDE.md 目前只把这三条列为强制项，新增一条独立命令意味着要同时改这两份文档并且信任每个未来的实现/验收会话都记得多跑一条——这正是"静默降级"风险的来源。具体分配：

| 新增检查 | 归入哪条命令 | 原因 |
|---|---|---|
| 约束 1/2/6/7b（纯 Vitest 断言，不需要 dist/） | `pnpm test`（各包 `test` 脚本天然会跑到，根 `pnpm test` 是 `vitest run` 全仓扫） | 和现有 `package-metadata.test.ts`/`json-schema-drift.test.ts` 同一批，零新增调用面。 |
| 约束 3 的 node:\* 打包器真实构建、约束 4 的 publint/attw | 追加到根 `lint` 脚本尾部（`"lint": "eslint . && node scripts/verify-browser-safe.mjs legal && node scripts/verify-browser-safe.mjs pm && ..."`），因为它们需要先有 `dist/`，且概念上属于"静态验证"而非"编译" | 不新增命令；但要求 `pnpm lint` 在 `pnpm -r build` 之后跑——workflow.md 步骤顺序本来就是"包级 build → 全仓 build/lint/test"，天然满足。需要在 CLAUDE.md/workflow.md 里明确写一句"lint 依赖 build 产物"，否则未来有人可能把 lint 提到 build 前面导致假红。 |
| 约束 5、通用架构边界（`no-restricted-paths`/`eslint-plugin-boundaries`） | 根 `eslint.config.js` 配置项，天然随 `pnpm lint` 跑 | 无需 dist/，属于纯源码级 ESLint 规则。 |
| dependency-cruiser（无环 + 可选的 reaches 深度校验） | 新增 `pnpm depcruise` 脚本，折进 `lint`（`"lint": "eslint . && depcruise ..."`）或单独在 `pnpm -r build` 后跑 | 同上，不新增顶层调用面。 |

**这个安全网目前不存在自动化兜底**是本次调研的一个独立发现（不在原始 7 条约束范围内，但直接影响"门跑在哪"这个问题的答案）：只要某个实现/验收会话忘记手动跑这三条命令，所有新门都不会触发。是否要新增一个 GitHub Actions workflow 在 PR 上自动跑同样三条命令，属于架构决定（CLAUDE.md："跨层变化写提案，由架构角色拍板"），本报告只指出这个缺口存在，不代为决定。

### 4.2 反例触红方案（每条约束的注入方式）

CLAUDE.md 工程纪律要求"先证明测试会红，再做最小实现"；本仓库已有的两个先例（`package-metadata.test.ts` 的红灯记录、`package-boundary.test.ts` 的"守卫自检"用例）证明这个纪律在这类体例门上是可执行的。逐条对应：

| 约束 | 反例注入方法 | 期望的红灯信号 |
|---|---|---|
| 1. 三者一致 | 临时把某包 `package.json.name` 改成错误值（如 `@courtwork/pm-temp`），不改目录名/descriptor | 新增的一致性检查报"package.json.name != @courtwork/pm" |
| 2. 版本一致 | 临时把 descriptor `identity.version` 改成 `9.9.9`，不改 `package.json.version` | 沿用已证明的模式：`package-metadata.test.ts` 直接变红（此模式仓库已跑过一次真实红灯，见 legal/SPEC.md "VPKG-META-1 实现记录"） |
| 3. browser-safe（node:\*） | 临时在 `packages/legal/src/index.ts` 追加 `export { readFileSync } from 'node:fs';` | `verify-browser-safe.mjs` 报 esbuild `Could not resolve "node:fs"`，进程 exit 1 |
| 4. exports 分面 | 临时删掉某分面 `exports` 条目里的 `"types"` 键，或把 `"default"` 放到非最后位置 | publint 报 `EXPORTS_TYPES_SHOULD_BE_FIRST` / `EXPORTS_DEFAULT_SHOULD_BE_LAST` |
| 5. `/testing` 隔离 | 临时在 `packages/core/src/` 任一文件加一行 `import '@courtwork/legal/testing';` | `import-x/no-restricted-paths` 直接标红该行；ESLint exit 非 0 |
| 6. 统一脚本 | 临时删掉某包 `package.json.scripts.lint` | 沿用已证明的模式：`package-metadata.test.ts` 的 `toMatchObject` 断言失败 |
| 7a. typeId 命名 | 临时把某 artifact 的 `typeId` 改成 `"RiskList"`（缺 namespace 前缀） | zod `ARTIFACT_TYPE_ID_PATTERN` 校验失败——**这条红灯已经存在**（admission 阶段），不需要新工作，可以直接拿现有测试当证据 |
| 7b. 文件名/常量命名 | 临时新增 `src/schemas/RiskList.ts`（PascalCase 文件名违反 kebab-case）或把导出常量改名 `LegalDescriptor` | 新增的命名扫描脚本报文件名/常量名不匹配 |
| 通用：无环 | 临时让 `packages/core` 加一行 import 回 `packages/legal` | dependency-cruiser `no-circular` 报错；或者延续 core 现有 `FORBIDDEN_PACKAGES` 扫描器（该扫描器已经自带"守卫自检"红灯用例，是这类反例注入最直接的现成范本） |

---

## 5. 对 VPKG-META-1 / VPKG-EXPORTS-1 / VPKG-LAYOUT-1 的分工建议

这三个工单已经在仓库里挂了号（`packages/legal/SPEC.md`、`packages/pm/SPEC.md`、`docs/status/current.md` 均可查到），不是本报告新造的名字，以下建议基于已读到的真实范围文字：

**VPKG-META-1**（legal 待独立验收 / pm 已验收）——范围已经是"统一 test/lint/build/generate 脚本、版本一致性门与 JSON Schema 全集/URN/Draft/remote-ref drift 门"，对应本报告约束 2、6 的核心，以及约束 7a 的姊妹关注（JSON Schema id 而非 artifact typeId，但同精神）。**已完整实现，不需要额外工具**。

- 遗留缺口：约束 1（三者一致）**没有**被 VPKG-META-1 的实现记录列为已建立的"持续性"门——`PM-PACKAGE-RENAME-1` 只是把这一次的目录名/npm名改对，`package-metadata.test.ts` 目前只测版本号和脚本文字，不测目录名/npm名与 packageId 的关系。这意味着"未来再次改名漂移"目前无门可查。**建议**：VPKG-META-1 的下一个小补丁（或 VPKG-EXPORTS-1 顺手带上）把 3.1 节的 `checkPackageIdentityConsistency` 加入两包的 `package-metadata.test.ts`。

**VPKG-EXPORTS-1**（待派发，`PM-PACKAGE-RENAME-1` 验收后启动）——SPEC.md 原文范围："根出口保持 browser-safe；三份 demo fixture 迁入显式 `/testing`，只允许 demo-runtime/acceptance 消费。`/package`、`/schemas` 与 `/testing` 形成可被依赖图审计的出口。"精确对应本报告的约束 3、4、5。**建议这张工单直接采纳第 3 节的三个落地形状**：

1. `verify-browser-safe.mjs`（esbuild 真实构建）作为约束 3 的 node:\* 判据；
2. publint + attw 组合验证约束 4 的分面结构；
3. `import-x/no-restricted-paths` 作为约束 5 的主力门。

dependency-cruiser 的跨包 `reaches` 可达性分析列为**可选加固项**，不建议作为 VPKG-EXPORTS-1 的必须交付——先花半天做一次 spike，验证它能否干净解析 pnpm workspace 的 node_modules 符号链接、精确定位到分面对应的真实文件；如果能，升级为强制门；如果不能干净解析（比如需要大量 `doNotFollow`/`includeOnly` 调优才勉强工作），退回只依赖 ESLint 规则 + 延续 `package-boundary.test.ts` 风格的手写扫描器覆盖到 desktop/registry/provider。

**VPKG-LAYOUT-1**（在 EXPORTS-1 与 `PM-FIXTURE-1` 之后）——SPEC.md 原文："按 `src/package / schemas / presentation / scenarios / interactions / domain / testing` 逐步归位。纯物理迁移不得顺手改未版本化 blueprint、prompt 字节、typeId 或历史 snapshot。"这本身**不需要新机器门**，但它是所有"基于文件夹 glob 的规则"（`no-restricted-paths` 的 zones、dependency-cruiser 的 `path` 匹配、`eslint-plugin-boundaries` 的 elements pattern）能否写成干净的 `src/testing/**` 而不是脆弱的单文件枚举清单的前提。

**排序建议（这点比较重要，容易被忽略）**：不要等 LAYOUT-1 做完物理归位之后才立约束 3/4/5 的门——那样中间会有一段完全不设防的窗口期。正确顺序是 **VPKG-EXPORTS-1 先用"当前实际文件位置"的显式清单把门立住（哪怕当下写法丑陋，比如要枚举具体的 3 份 demo fixture 文件路径而不是一个干净的 `testing/**` glob）**，等 VPKG-LAYOUT-1 完成物理归位后，再把这些规则收敛成干净的文件夹级 glob——这是一次机械的配置简化，不是重新设计。

---

## 6. 回灌建议（哪些结论应该写回 ADR-012 或衍生 SPEC）

以下是本次调研认为应该回灌到架构文档的具体条目，均标注理由，但**不代为决定**（决定权在架构角色）：

1. **约束 1 的机器门归属未定**：ADR-012 决定一目前只写了规则文字，没有写"谁来校验、校验代码住哪"。建议明确：住 `packages/registry`（契约层，零垂类语义，天然适合放跨包共用的结构性校验 helper），而不是让每个垂类包各自发明一份。

2. **约束 3（"根出口不得转售 Node adapter"）目前没有落到"怎么判"**：ADR-012 决定二只写了结论，没有写判据。本报告建议把"唯一权威 oracle 是打包器 `platform: 'browser'` 真实构建，静态字符串扫描/ESLint 规则只是前置防线不是最终判据"这句话写回 ADR 或衍生 SPEC，否则不同实现会话可能各自理解"怎样算 browser-safe"，出现判据不一致。

3. **门禁小节"生产代码消费 `/testing`、core 出现 vendor SDK/import 必须触红"目前只有 core 一个包有对应机器门**（`package-boundary.test.ts`），`tools`、`reading-view`、`output` 三个机器层包是空白，和门禁小节字面要求（写的是"core/tools/reading-view/output"，四个都要）不符。建议 VPKG-EXPORTS-1 或紧随其后的小工单把同等级门补齐到全部四个机器层包，工具选型二选一：复制 `package-boundary.test.ts` 模式（零新依赖、已验证但四份重复代码）或迁移到 `eslint-plugin-boundaries` 单一仓库级配置（一次配置覆盖全部现在和未来的机器层包，但引入外部依赖 + 新配置抽象）。这是一个需要架构角色拍板的取舍，本报告只列选项。

4. **CI 自动化兜底缺失是本次调研的旁支发现**：`.github/workflows/` 只有站点部署，没有测试/lint/build 的自动 CI，也没有 pre-commit 钩子；当前"门"完全靠 workflow.md 的会话制人工纪律执行。新增的机器门建议全部折进既有的 `pnpm -r build`/`pnpm lint`/`pnpm test` 三条命令（见第 4 节），不新增第四条命令；但"要不要另外新增一条 GitHub Actions 在 PR 上自动跑这三条命令"是独立的架构决定，本报告只指出这个安全网目前不存在。

5. **pnpm 版本落后两个大版本**（仓库锁定 `9.15.0`，当前最新 `11.3.0`，✓ 2026-07-14 实抓）：不在本次约束范围内，但如果未来要采纳"用 pnpm catalogs 部分替代 syncpack/sherif 的版本统一职责"，`catalogMode`/`cleanupUnusedCatalogs` 等精细化设置是 pnpm 10.12+/10.15+ 才有，需要先决定是否升级 pnpm 大版本，这个决定超出本工单范围，仅记录供架构角色参考。

6. **`@microsoft/api-extractor` 与 TypeScript 6.x 的兼容性风险未知**：api-extractor 7.58.9 内置固定 `typescript@5.9.3`，落后仓库实际使用的 `^6.0.3` 一个大版本（两者均 ✓ 2026-07-14 实抓）。若未来要引入 api-extractor 做 API 面冻结，需要先起一次 spike 验证它解析本仓库 TS 6.x 产出的 `.d.ts` 是否报版本不支持或解析异常。本报告判定当前不建议在没有 spike 前把 api-extractor 写进 ADR 或任何工单的必须交付范围。

---

## 7. 来源清单

### 7.1 npm registry 实抓（✓，全部 2026-07-14 通过 `registry.npmjs.org/<pkg>/latest` 抓取）

| 包 | 版本 | 最近发布日期（UTC，由响应体时间戳换算） | License |
|---|---|---|---|
| publint | 0.3.21 | 2026-05-13 | MIT |
| @arethetypeswrong/cli | 0.18.5 | 2026-07-09 | MIT |
| eslint-plugin-import | 2.32.0 | 2025-06-20 | MIT |
| eslint-plugin-import-x | 4.16.2 | 2026-03-11 | MIT |
| eslint-plugin-boundaries | 6.0.2 | 2026-03-30 | MIT |
| dependency-cruiser | 17.4.3 | 2026-05-29 | MIT |
| syncpack | 15.3.2 | 2026-06-15 | MIT |
| @manypkg/cli | 0.25.1 | 2025-08-28 | MIT |
| sherif | 1.13.0 | 2026-07-04 | MIT |
| knip | 6.20.0 | 2026-06-24 | ISC |
| @microsoft/api-extractor | 7.58.9 | 2026-06-13 | MIT |
| typescript | 6.0.3 | 2026-04-16 | Apache-2.0 |
| pnpm | 11.3.0 | 2026-05-24 | MIT |
| esbuild | 0.28.0 | 2026-04-02 | MIT |

### 7.2 官方文档/仓库实抓（✓，2026-07-14）

- `https://esbuild.github.io/api/#platform` —— Platform 章节原文，`platform: 'browser'` vs `'node'` 的 node 内置模块处理差异。
- `https://publint.dev/rules` —— 完整规则列表，确认无 node:\* / 依赖图相关规则。
- `https://raw.githubusercontent.com/arethetypeswrong/arethetypeswrong.github.io/main/packages/cli/README.md` —— 问题目录（12 类）+ pnpm 需要先 `pnpm pack` 的操作限制。
- `https://raw.githubusercontent.com/un-ts/eslint-plugin-import-x/master/README.md` —— Why/Differences 分叉说明、peerDependencies、规则表（含 `no-nodejs-modules`）。
- `https://raw.githubusercontent.com/un-ts/eslint-plugin-import-x/master/docs/rules/no-restricted-paths.md` —— zones 配置语法。
- `https://raw.githubusercontent.com/javierbrea/eslint-plugin-boundaries/master/README.md` —— elements/dependencies flat config 示例。
- `https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/rules-tutorial.md` —— `dependencyTypes: ["core"]` 等规则写法，工作案例。
- `https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/rules-reference.md` —— 因体积超限（54.5KB），仅确认目录级条目（`orphan`、`reachable`），未获取 `reachable` 完整配置语法，标记未完全核实。
- `https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/options-reference.md` —— 因体积超限（67.2KB），仅确认 `doNotFollow`/`includeOnly`/`reaches`/`focus` 等过滤器名称存在，未获取默认值/node_modules 遍历细节，标记未完全核实。
- `https://raw.githubusercontent.com/QuiiBz/sherif/main/README.md` —— 规则集合、零配置定位。
- `https://knip.dev/features/monorepos-and-workspaces` —— pnpm-workspace.yaml 原生支持确认。
- `https://pnpm.io/catalogs` —— catalog 机制、`catalogMode`（v10.12.1+）/`cleanupUnusedCatalogs`（v10.15.0+）版本门槛。
- `https://arethetypeswrong.github.io/` —— 首页确认（内容较薄，主要用于确认站点归属，问题目录以 cli README 为准）。

### 7.3 本仓库实读（2026-07-14，工具：Read/Grep/Glob，路径均为 `/Users/lesprivilege/Projects/Courtwork/` 下）

- `docs/decisions/ADR-012-vertical-package-kit-and-visual-blueprints.md`
- `docs/decisions/ADR-001-package-abi.md`
- `CLAUDE.md`
- `docs/engineering/workflow.md`、`docs/engineering/release.md`
- `docs/status/current.md`
- `package.json`（根）、`pnpm-workspace.yaml`、`eslint.config.js`、`tsconfig.json`（根）
- `packages/legal/package.json`、`packages/legal/tsconfig.json`、`packages/legal/src/manifest.ts`、`packages/legal/src/package-metadata.test.ts`、`packages/legal/SPEC.md`
- `packages/pm/package.json`（原 `pm-schemas`，已完成机械改名待验收）、`packages/pm/src/package-metadata.test.ts`、`packages/pm/SPEC.md`、`packages/pm/ACCEPTANCE.md`
- `packages/core/package.json`、`packages/core/src/package-boundary.test.ts`
- `packages/schemas/package.json`、`packages/schemas/src/artifact-descriptor.ts`、`packages/schemas/src/artifact-type-id.ts`、`packages/schemas/src/json-schema-drift.test.ts`
- `packages/registry/package.json`、`packages/registry/src/package-manifest.ts`
- `apps/desktop/package.json`
- `.github/workflows/`（目录列表，仅 `pages.yml`）

### 7.4 ※ 训练语料标注

本次报告的关键判断全部经过实抓验证，没有以训练语料记忆直接作为结论依据的条目。唯一残留的背景性描述（如"esbuild 历史上是否曾自动 polyfill node 内置模块"）已经用官方文档原文替代，不影响结论。
