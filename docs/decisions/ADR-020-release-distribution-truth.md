# ADR-020：发行许可、候选制品与公开真值

- 状态：**Accepted（2026-07-24）**
- 日期：2026-07-24
- 关系：继承 ADR-004 的原件/产物边界、ADR-005 的本地数据边界与现行发布手册；不改变产品运行契约
- 提出单：`v0.2.0` 发布就绪只读盘点
- 仓库盘点基线：`c6e8779`

## 背景

`v0.1.2` 的工程门、ad-hoc 签名、DMG 校验与公开真值链已经成立，但它不能自动证明下一版
可分发：

- desktop 与 Pages 实际分发八枚 WOFF2；许可快照只在 craft evidence 中，既未进入 `.app`，
  也未进入 `site-dist`。两枚 desktop Source Han 派生子集保留了 Reserved Font Name
  `Source` 的内部命名。
- desktop 的实际 Vite bundle 与 macOS Rust 图包含第三方软件；仓库和 `.app` 均无软件 notices、
  SBOM 或 MPL Source Code Form。Settings 却声称 notices 会随 release 提供。
- 发布手册写着“实际启动一次”，命令块却只挂载、验签、算 hash、卸载；没有从只读挂载点直接
  启动 Mach-O，也未锁 Info.plist、构建/挂载副本 hash 相等和许可资源存在。

因此“build 通过”“功能逻辑成立”“可公开分发”是三件不同的事。本 ADR 只收口第三件事的
跨层真值，不把许可工程描述成法律意见。

## 决定一：字体与软件 notices 分账，发行时同时到场

发行真值使用两份独立、可机器重建的资源：

- `release/notices/THIRD_PARTY_FONT_LICENSES.txt`
- `release/notices/THIRD_PARTY_SOFTWARE_NOTICES.txt`

字体账只声明八枚实际分发字体及其 OFL/RFN 信息；软件账只声明 desktop 实际 Vite 输入图与
macOS Cargo 非 dev 图。任一账不得用自己的通过结论冒充“全部第三方许可已闭合”。

两份资源必须以同一字节同时进入：

1. `Courtwork.app/Contents/Resources/`；
2. `site-dist/notices/`；
3. Pages 页脚的两个真实 `href`。

manifest、SBOM、MPL source archive 可以各自分件，但不得另造第二份可见 notice 真源。

## 决定二：字体派生名遵守 RFN，字形与排版语义不变

两枚 Source Han desktop 子集已经过 subset/WOFF2 转换，属于 modified font。其呈现名统一改为
`Courtwork Title Serif`，文件名固定为：

- `courtwork-title-serif-400-gb2312.woff2`
- `courtwork-title-serif-600-gb2312.woff2`

OpenType `name` IDs 1/2/3/4/6 与 CFF Name INDEX、`FullName`、`FamilyName`、11 项 FDArray
`FontName` 同步改名；精确映射只认 release SPEC。ID 0/5/13/14、CFF `Notice`、
`CIDFontVersion`/`CIDFontRevision`/`ROS`、版本、版权与许可原样保留。400/600 的 weight、
cmap、CharStrings、FDSelect、metrics、GSUB/GPOS 等字形和排版表不得变化，只有已逐项列明的
命名元数据及其连带 checksum/容器编码允许变化。CSS、token、manifest 与真渲测试只消费新
family/文件名；历史来源说明继续如实写 Source Han。

其余六枚字体不改字形或内部命名。八枚实物、四份上游许可快照、内嵌版权与唯一 font manifest
必须一一对应；出现漏件、游离 WOFF2、hash 漂移或丢版权即停止发行。

## 决定三：软件 notices 由实际构建图生成，不由 package 声明猜测

JavaScript 图以 desktop 现行两个 Vite production entry 的真实 Rollup module graph 为准，
再以 `pnpm-lock.yaml` 锁定外部 `name@version` 与 integrity。不得用 `pnpm list --prod`
替代，因为实际 bundle 会消费 workspace 中声明为 devDependency 的 demo-data。

Rust 图以 `aarch64-apple-darwin`、locked/offline Cargo metadata 的非 dev 依赖边遍历为准：

- normal graph 全列入 SBOM/notices；
- proc-macro 与显式 build dependency 标记 `scope=build`，不伪称链接进 Mach-O；
- 运行/宏生成所需的五枚 MPL-2.0 crate——`cssparser@0.36.0`、
  `cssparser-macros@0.6.1`、`dtoa-short@0.3.5`、`option-ext@0.2.0`、
  `selectors@0.36.1`——按 Cargo.lock checksum 保存原始 `.crate` Source Code Form，
  同时进入 `.app` 与 `site-dist/notices/`。

生成器只接受产品依赖图与版本号冻结后、由架构角色另行逐件复核并提交的 frozen policy。缺
license 文件、非 SPDX 旧表达式、unknown/new expression、copyleft 或自定义许可证均先阻断并标
`[需架构/法律拍板]`；不得把 package metadata 的一行 `license` 当作版权/许可全文，也不得启发式
把 slash/AND/OR 改写成想要的许可证。MPL 条目还须给出 exact source archive、checksum、
repository 与 Source Code Form 获取说明。

policy 不只覆盖顶层 LICENSE：它须按当前 target、feature 与实际 module graph 记录真正消费的
nested license，并显式记录经核验的排除项；不得递归盲收整个包。当前基线至少纳入
`regex-syntax/src/unicode_tables/LICENSE-UNICODE`、`ring/src/polyfill/once_cell/LICENSE-*`
与 `ring/third_party/fiat/LICENSE`，并明确排除未进入现行 std target 的
`tracing-core/src/spin/LICENSE` 及未被 desktop bundle 消费的 pdfjs cmaps/fonts/wasm。

根生成器获准直接声明精确 devDependency `yaml@2.9.0`；不得借用 workspace 的传递依赖。该版本
已在 lock packages 中存在，故实现只可改变根 importer，不得借此改动其他 importer、版本或
packages snapshot。这个唯一预批准 lock 变化须在最终软件账验收中复核；除此之外，frozen policy
后的 source import、package/Cargo manifest 或 lock 变化都会使 policy 与下游验收失效。

## 决定四：候选验的是同一制品，不以重建替代

唯一候选 DMG 生成后，独立验收只能消费该字节，不得另行 rebuild 一个“等价候选”。候选校验至少
包括：

- Info.plist 的短版本、构建版本与最低 macOS；
- 构建 `.app` 与 DMG 挂载副本的 Mach-O SHA-256 相等；
- 两份 notices、SBOM 与五枚 MPL source archive 在包内到场且与 canonical bytes 相等；
- 从只读挂载点直接执行 Mach-O，核对 PID command、存活窗口，再 TERM/wait；
- 签名、架构、Applications symlink、DMG hash 与 ad-hoc/未公证边界。

软件账与候选门还须枚举 `.app/Contents/{MacOS,Frameworks,PlugIns,Resources}` 内全部 Mach-O、
额外 executable、dylib 与 framework，并对每个 Mach-O 解析 `otool -L`。当前可接受基线只有主
executable 与 `/System/Library`、`/usr/lib` 系统链接；任何未在 frozen policy/SBOM 登记的额外
可执行件、内嵌原生库或非系统链接均停止发行。

任何 DMG build input——desktop 源码、manifest、包内资源配置或 lockfile——在候选构建后发生
变化，候选即失效；候选后按既定流程写 release notes/site 下载真值不改变 DMG 时不在此列。
软件 notices 独立验收之后若 desktop source import、package/Cargo manifest 或 lockfile 变化，
其验收在候选生成之前也已失效，必须从 policy drift 起重验，不能等到候选阶段才发现。

## 决定五：公开顺序保持资产先于页面

公开顺序固定为：

1. accepted release tip 上创建 annotated tag，只 push tag；
2. 创建 GitHub Release，上传 exact DMG、SHA 与本版要求的伴随资产；
3. 从远端重新下载并复算；
4. 再 push `main`，让 Pages 暴露已经存在的下载目标；
5. 等该 Pages workflow 成功后才写部署记录；
6. 部署记录的后置 push 触发的新 workflow 也必须等到成功。

`cancel-in-progress` 不能被用来抢跑后置记录。Developer ID 与 notarization 凭据缺失只决定当前
通道必须诚实标为 arm64 ad-hoc、未公证；不能用来豁免 notices、候选同一性或直接启动验证。

## 派生工单

1. `RELEASE-FONT-LICENSE-1`：八字体 manifest、RFN 改名、字体 notice、desktop/site 分发与门。
2. `RELEASE-VERSION-PREP-1`：产品四票放行后把 desktop 唯一版本真值准备为 `0.2.0`，在软件
   图审计前完成 manifest/lock 的预期版本变化。
3. `RELEASE-SOFTWARE-AUDIT-1`：对最终产品图逐件形成 license、nested evidence 与原生基线；
   由架构角色裁定并提交 policy，不向实现者下放许可语义。
4. `RELEASE-SOFTWARE-NOTICES-1`：只读消费 frozen policy，生成 CycloneDX SBOM、软件 notice、
   五枚 MPL source archive、精确分发资源与 Settings 诚实文案。
5. `RELEASE-SMOKE-TRUTH-1`：实现可执行的候选同一性、原生漂移和直接启动门。

FONT 可与产品链并行；VERSION-PREP 必须等产品链放行；AUDIT 同时依赖 FONT 与 VERSION-PREP，
NOTICES 再只读消费 AUDIT。
所有实现票先由非实现会话完成 pre-candidate 验收，AUDIT 经独立只读复核并由架构冻结，才允许
生成 `v0.2.0` 唯一候选。随后另由未参与候选构建的会话在该 exact DMG 上做 candidate
acceptance；pre-candidate 的 fixture/mutation 通过不得冒充真机候选已经验收。

## 明确拒绝

- 把 build、codesign 或“仓库里有 LICENSE 快照”当作可分发证明；
- 用字体 notice 冒充通用第三方 notices，或反过来省略字体 RFN/内嵌版权；
- 只检查声明存在，不检查 `.app`/`site-dist` 实物；
- 只给 MPL 易失 URL 而不保存本版 exact source archive；
- 为通过门而删除 unknown/特殊许可证组件、改写许可证表达式或伪造版权行；
- 验收者重建 DMG，或 Pages 先暴露尚不存在的 Release asset。

## 来源

- SIL OFL 官方 FAQ：modified font 即使只作小改，也须在声明 RFN 时改内部名称；分发须随附可得的
  copyright 与 licensing information：<https://openfontlicense.org/ofl-faq/>。
- SIL OFL 1.1 正文：<https://openfontlicense.org/open-font-license-official-text/>。
- Mozilla MPL 2.0 §3.2 与官方 FAQ：发行 Executable Form 时须告知 Source Code Form 的获取方式；
  larger work 不扩大到自有文件：<https://www.mozilla.org/en-US/MPL/2.0/>、
  <https://www.mozilla.org/en-US/MPL/2.0/FAQ/>。
- 仓库实测与精确清单写入 [`release/SPEC.md`](../../release/SPEC.md)。
