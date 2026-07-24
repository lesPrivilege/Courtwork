# SPEC: release

状态：`v0.1.2` 是当前已发布真值；`v0.2.0` 候选尚未生成。现行跨层语义与公开顺序只认
[ADR-020](../docs/decisions/ADR-020-release-distribution-truth.md)；[发布手册](../docs/engineering/release.md)
是其可执行落地，但在 `RELEASE-SMOKE-TRUTH-1` 放行前已知缺少直接启动、资源同一性与部署记录
后第二轮 Pages 成功等待，故不得反向覆盖 ADR 或据旧手册发布。

## v0.2.0 发布闭合链

```text
产品真值：SAFETY → OUTPUT → TRACE → DOSSIER → VERSION-PREP ─┐
发行许可：FONT-LICENSE ──────────────────────────────────────┴→ SOFTWARE-AUDIT → SOFTWARE-NOTICES
                                                                                              │
                                                                                              ▼
                                                                                         SMOKE-TRUTH
                                                                                              │
                                                                                              ▼
                                  全量门 → 唯一候选 DMG → 独立候选验收 → tag / Release / Pages
```

FONT 可与产品链并行；其余节点必须等待图示前置。发行票不占 `App.tsx` 锁，不得改变
Legal/Output/core 契约或产品功能。实现票的目标 SHA 未成为 `main` 祖先、缺独立
`release/ACCEPTANCE.md` pre-candidate 放行、SOFTWARE-AUDIT 未经独立只读复核与架构冻结，
或下游输入漂移，均不得进入公开边界。pre-candidate 放行只授权生成唯一候选；真实 DMG 仍须
另一会话独立 candidate acceptance。

## RELEASE-FONT-LICENSE-1 · 八字体 OFL/RFN 发行闭合

依赖：无产品票依赖；须先于 `RELEASE-SOFTWARE-AUDIT-1`，以便审计消费完成后的 Tauri/site/
字体输入。

### 唯一发行清单

| 面 | 当前实物 | bytes | SHA-256 | 上游 |
|---|---|---:|---|---|
| desktop | `zhuque-fangsong-gbk.woff2` | 4,539,072 | `54c7ad9b0106acbab052e8dcce3cc3bd64d94aa09bd1d21292ece7f5970facf6` | Zhuque 0.212 |
| desktop | `source-han-serif-sc-400-gb2312.woff2` | 1,877,436 | `0716704f5e3193b5f02a743d8ae04f7d5f1605c1c23a2f77f62cbc87a5820d02` | Source Han Serif 2.003R |
| desktop | `source-han-serif-sc-600-gb2312.woff2` | 1,915,688 | `5ce0ac726cdd2e359fbb396e62a40d171b0262bea28fd2a232442f972c631803` | Source Han Serif 2.003R |
| site | `zhuque-fangsong-subset.woff2` | 110,968 | `a087683855a0431dc32cdbd511a096ece3c33b76abb16880ba26fe9ba7f9158b` | Zhuque 0.212 |
| site | `noto-serif-sc-regular-subset.woff2` | 29,172 | `3d41a6d8a83c0e0a6eabeac5dd856f2760c13f1793eeba174f49241caf9dcfa2` | Noto Serif SC 2.003 |
| site | `noto-serif-sc-bold-subset.woff2` | 29,352 | `b156601450cb573d6deefd0e86bb54732992f0d5eb512b38e90811d5e8a654c6` | Noto Serif SC 2.003 |
| site | `doc-latin-subset.woff2` | 8,488 | `f3a6ce7a521a03f83943018aeb915ad2e9091efb56f4f3986d3687e895263f48` | Noto Serif SC 2.003 |
| site | `manuscript-latin-subset.woff2` | 6,872 | `a9107ca58cf646f2c36713734402da9d728987d8587cd405b26b75fa88cb27e6` | Junicode 2.226 |

四份许可快照分别固定为：

| 上游 | snapshot | SHA-256 |
|---|---|---|
| Source Han | `site/craft-evidence/SKIN-B2-0/source-han-serif/LICENSE.txt` | `9ff5bb567e1b92c801fc1069e5fbf992ff8efccacb9db94e5959a5b3ba9bb903` |
| Zhuque | `site/craft-evidence/SKIN-B2-0/zhuque/LICENSE.txt` | `66cc01ad4df62fca6936431a426104cb32a52ce8da49de9a7d643e02d7659043` |
| Noto | `site/craft-evidence/SITE-CRAFT-2/noto/LICENSE.txt` | `6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2` |
| Junicode | `site/craft-evidence/SKIN-R2-P5/junicode/LICENSE.txt` | `6078ed582d53a416f761fd2fdeb384320b69191bf316234c21aabe71e2416822` |

`release/notices/font-license-manifest.json` 固定 `schemaVersion:1`，每一项至少含
`surface`、`artifactPath`、`bytes`、`sha256`、`upstreamFamily`、`upstreamVersion`、
`licenseSpdx:'OFL-1.1'`、`licenseSnapshotPath`、`licenseSnapshotSha256`、
`embeddedCopyright[]`、`noticeSection`；八项与两个实际字体目录必须双向全等。

### RFN 改名

两枚 Source Han 派生件改为：

- family：`Courtwork Title Serif`
- files：`courtwork-title-serif-400-gb2312.woff2`、
  `courtwork-title-serif-600-gb2312.woff2`
- PostScript：`CourtworkTitleSerif-Regular`、`CourtworkTitleSerif-SemiBold`

每个现有 platform/encoding/language record 都按下表改为同一精确值，不增删记录：

| weight | name ID 1 | ID 2 | ID 3 | ID 4 | ID 6 |
|---|---|---|---|---|---|
| 400 | `Courtwork Title Serif` | `Regular` | `2.003;ADBO;CourtworkTitleSerif-Regular;ADOBE` | `Courtwork Title Serif` | `CourtworkTitleSerif-Regular` |
| 600 | `Courtwork Title Serif` | `SemiBold` | `2.003;ADBO;CourtworkTitleSerif-SemiBold;ADOBE` | `Courtwork Title Serif SemiBold` | `CourtworkTitleSerif-SemiBold` |

CFF Name INDEX 分别为两个 ID 6；CFF `FullName` 分别为 `Courtwork Title Serif Regular` /
`Courtwork Title Serif SemiBold`，`FamilyName` 均为 `Courtwork Title Serif`，`Weight` 逐字保持
`Regular` / `SemiBold`。ID 3 只替换原 PostScript token，既有 version/vendor 段
`2.003;ADBO;…;ADOBE` 不另造。

每枚 CFF FDArray 的 11 个 `FontName` 保持项数、顺序与下列 suffix 闭集，只把前缀机械改为
`CourtworkTitleSerif-Regular-` / `CourtworkTitleSerif-SemiBold-`：
`Alphabetic`、`AlphabeticDigits`、`Dingbats`、`Generic`、`HWidth`、`HWidthCJK`、
`HWidthDigits`、`Ideographs`、`Proportional`、`ProportionalCJK`、
`ProportionalDigits`。

OpenType ID 0/5/13/14、CFF `Notice`、`CIDFontVersion`、`CIDFontRevision`、`ROS` 逐字保留；
所有未列为可变项的 name/CFF 元数据也必须逐字不变。验收者从实现父提交读取旧 blob，与新件
逐表比较：只允许 OpenType IDs 1/2/3/4/6、CFF Name INDEX、`FullName`、`FamilyName`、FDArray
`FontName`、`head.checkSumAdjustment` 与 WOFF2 容器连带变化；cmap、CharStrings、FDSelect、
metrics、GSUB/GPOS 等必须相等。CSS/token/manifest/test 只消费新名；来源记录与版权/许可字段
仍如实出现 Source Han/`Source`，不得为了过门删除归属。

### 发行资源与门

- canonical notice：`release/notices/THIRD_PARTY_FONT_LICENSES.txt`，按四个上游分别保留
  实际内嵌版权与完整许可快照，不用一段泛化 OFL 代替。
- Tauri map target：
  `Courtwork.app/Contents/Resources/THIRD_PARTY_FONT_LICENSES.txt`。
- site build target：`site-dist/notices/THIRD_PARTY_FONT_LICENSES.txt`；页脚必须有真实
  `href="notices/THIRD_PARTY_FONT_LICENSES.txt"`。
- `release-truth` 同一 validator 同时被 `release:guard` 与 `site:guard` 消费；不新造平行门。

真实 mutation 至少逐项注入并观察红灯：删 manifest 字体、篡字体或 license SHA、删某版权/OFL
段、删 Tauri resource、删 site copy/footer href、在可变 OpenType IDs 1/2/3/4/6、CFF
Name INDEX/`FullName`/`FamilyName` 或任一 FDArray `FontName` 重新引入 `Source`/`SourceHan`
token、删/改 ID 0/5/13/14 或 CFF 版本字段、新增未登记 WOFF2。ID 0/13/14 与 CFF `Notice` 中
依法保留的 Source 归属是阴性对照，不得误报。现有排印真渲与全量门不得回退。

实现白名单：

- `release/notices/{font-license-manifest.json,THIRD_PARTY_FONT_LICENSES.txt}`
- `release/README.md`
- `release/scripts/{release-truth-lib.mjs,release-truth.test.mjs}`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src/assets/fonts/subset-manifest.json`
- 两枚旧 Source Han 文件删除、两枚新 Courtwork Title Serif 文件新增
- `apps/desktop/src/styles.css`
- `apps/desktop/scripts/assert-typography.mjs`
- `apps/desktop/tests/e2e/{typography.spec.ts,typography-consume.spec.ts,versional-language.spec.ts}`
- `docs/design/{tokens.json,courtwork-design.md,typography-density.md}`
- `site/craft-evidence/SKIN-B2-0/SOURCE.md`
- `site/scripts/build.mjs`
- `site/index.html`
- `release/SPEC.md`
- `apps/desktop/SPEC.md`、`site/SPEC.md`

禁止触碰 `App.tsx`、Legal/Output/core、`current.md`、历史 release 制品或 archive。

## RELEASE-VERSION-PREP-1 · 最终产品版本真值

依赖：`CONTRACT-REVIEW-SAFETY-1 → CONTRACT-OUTPUT-TRUTH-1 → CONTRACT-TRACE-1 →
DEBT-DOSSIER-1` 已全部独立放行并成为 `main` 祖先。

只把 desktop 的唯一版本真值从 `0.1.2` 准备为 `0.2.0`，不生成候选、不写已发布状态：

- `apps/desktop/package.json`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/Cargo.lock` 的 Courtwork root package block
- `apps/desktop/src/settings/SettingsPage.tsx` 的 `APP_VERSION`
- `release/SPEC.md` 的实现留痕

版本一致性、lock 精确 diff、全仓 build 与 release guard 必须通过；禁止改根 `pnpm-lock.yaml`、
第三方依赖、产品行为、`current.md` 或发布记录。它是 SOFTWARE-AUDIT 的 graph/version freeze
前置，不代表 `v0.2.0` 已生成或已发布。

## RELEASE-SOFTWARE-AUDIT-1 · 精确许可裁定与图冻结

依赖：`RELEASE-VERSION-PREP-1` 与 `RELEASE-FONT-LICENSE-1` 均已独立放行并成为 `main`
祖先，确保审计看到最终 desktop code/resource/manifest/lock 输入。

本票是架构 evidence gate，不是实现票。调研会话只读盘点、给来源与提案；架构角色逐件裁定，
经另一只读会话复核后显式提交：

- `release/notices/software-license-audit.md`
- `release/notices/software-license-policy.json`
- `release/notices/license-snapshots/**`
- `release/SPEC.md` 的冻结 SHA、图摘要与复核留痕

policy 固定 `schemaVersion:1`，至少记录：

- desktop version、两个 Vite entry、Rust target/features、`Cargo.lock` SHA，以及根
  `yaml@2.9.0` 唯一预批准 tooling diff 前后的预期根 `package.json`/`pnpm-lock.yaml` SHA；
- 每个实际 `ecosystem/name/version` 的 raw declaration、架构裁定 SPDX expression、版权与许可
  evidence path/hash、source/repository、lock checksum/integrity、runtime/build reachability、
  notice section，以及裁定理由；
- 每个实际 nested license 的 target/feature/module 触达证据与 include 决定，以及容易被递归
  盲收的 exclude 项和不可达理由；
- MPL 五件的 runtime/build/proc-macro 区分与 Source Code Form；
- 当前 `.app` 原生基线：只允许主 executable 与 `/System/Library`、`/usr/lib` 系统链接；额外
  Mach-O/executable/dylib/framework 集合为空。

当前探针中的四个缺包内许可文本 AntV 组件、Cargo 18 个缺顶层许可组件、18 个 legacy slash
expression，以及最终图出现的任何增减，必须逐件列明 exact version、原始证据、结论与理由；
不能只记录数字。至少显式纳入
`regex-syntax/src/unicode_tables/LICENSE-UNICODE`、`ring/src/polyfill/once_cell/LICENSE-*`
与 `ring/third_party/fiat/LICENSE`，并以现行 target/module 证据排除
`tracing-core/src/spin/LICENSE` 与未 bundle 的 pdfjs cmaps/fonts/wasm。

unknown、新表达式、证据缺失、copyleft/custom license 或 graph drift 一律停在
`[需架构/法律拍板]`。policy 与 evidence 只能由架构角色改；后续实现者只读消费。审计不修改
产品代码、manifest、lock 或公开资源，也不以“自动生成”代替逐件裁定。

## RELEASE-SOFTWARE-NOTICES-1 · 实际 bundle/Cargo 图与 MPL Source Code Form

依赖：`RELEASE-SOFTWARE-AUDIT-1` 已复核并由架构冻结（其上游 FONT/VERSION 仍有效）。

### 图与生成器

`release/scripts/generate-software-notices.mjs` 提供 `--write` 与 `--check`：

- Vite 侧使用 desktop 现行 `app + visualGallery` production entries 的 `write:false` Rollup
  `moduleParsed` loaded-input 图；排除 `\0` virtual module 后，把每个 realpath 归属到最近
  workspace/package root，只收实际加载的外部 `name@version` 并以 pnpm lock integrity 复验。
  `chunk.modules` 的 tree-shaken rendered 集只作附加观测，不得据此减 notice；
- Cargo 侧对 `aarch64-apple-darwin`、现行 features 的 locked/offline metadata 做带状态遍历：
  root normal edge 以 runtime 起步，任一 build edge 或进入 proc-macro target 后，该节点及其 normal
  子图传播为 build；同一 crate 可同时 runtime/build reachable，必须记录 dual scope，不能把
  proc-macro 的 normal 子依赖误称 linked；
- policy 的 component/version/expression、nested include/exclude 与实际两张图必须双向全等；
  多件、漏件、target/feature 漂移和未裁定表达式均 fail closed；
- 输出禁止时间戳、绝对路径和遍历顺序噪声，按 ecosystem/name/version/purl 固定排序。

盘点基线是 Vite `moduleParsed` **97** 个外部版本、10 个实际 workspace 包，rendered 外部版本
**81**；许可闭集采用前者。Cargo raw normal-edge union 是 **285**；纳入显式 build edge 并按
上述状态传播后 union **302**、runtime reachable **241**、build reachable **210**、dual
reachable **149**。这些数字只作开工漂移探针，最终真值是生成器从 accepted graph 得出的闭集，
不得为凑旧数字丢件。

输出固定为：

- `release/notices/software-sbom.cdx.json`
- `release/notices/THIRD_PARTY_SOFTWARE_NOTICES.txt`
- `release/notices/mpl-source/*.crate`

`software-license-policy.json`、`software-license-audit.md` 与 `license-snapshots/**` 是上游只读
架构输入，不是本实现票输出。实际图出现 policy 外组件或证据漂移时必须停止并标
`[需架构拍板]`；实现者不得改 policy、把 metadata 当全文或启发式归一化。

SBOM 固定 CycloneDX JSON 1.6：`bomFormat:"CycloneDX"`、`specVersion:"1.6"`、
`version:1`，不得含 timestamp、绝对路径或随机 serial。`metadata.component` 固定
`type:"application"`、`name:"Courtwork"`、当前 desktop version 与
`bom-ref/purl:"pkg:generic/courtwork-desktop@<version>"`。npm/Cargo/workspace component 使用
`pkg:npm/...@...` / `pkg:cargo/...@...` purl 作为稳定 `bom-ref`，`type:"library"`；实际 build
闭集统一 `scope:"required"`，外部 npm 件携 lock SHA-512、Cargo 件携 lock SHA-256，且每件用
policy 的 SPDX expression 填 CycloneDX `licenses[]`。另以
`courtwork:dependencyScope=runtime|build|runtime+build` property 表示上述状态遍历结果。
`dependencies[]` 必须保留完整 root、workspace、Vite package provenance 与 Cargo
normal/build/proc-macro union 边；每个 ref 唯一、所有边端点均存在，不能用排序后的 flat
component list 冒充 SBOM。

五枚 MPL source archive 固定为：

- `cssparser-0.36.0.crate`
- `cssparser-macros-0.6.1.crate`
- `dtoa-short-0.3.5.crate`
- `option-ext-0.2.0.crate`
- `selectors-0.36.1.crate`

每枚 bytes 必须与 Cargo.lock checksum 一致。notice 逐件给出 name/version/checksum/repository、
MPL-2.0 与包内/线上 Source Code Form 位置；不得把四个 linked crate 与一个 proc-macro 都写成
“链接进 Mach-O”。

### 发行资源、诚实文案与门

- Tauri 的 release-notice resource mapping 与 site build 都只公开以下精确 allowlist：
  `THIRD_PARTY_FONT_LICENSES.txt`、`THIRD_PARTY_SOFTWARE_NOTICES.txt`、
  `software-sbom.cdx.json`、`mpl-source/{cssparser-0.36.0,cssparser-macros-0.6.1,
  dtoa-short-0.3.5,option-ext-0.2.0,selectors-0.36.1}.crate`。Tauri 包内相对资源与
  `site-dist/notices/` 都须和该闭集逐字、双向全等；不得用目录通配公开 policy、audit 或内部
  clarification snapshots，其他既有非 notice 应用资源不受此闭集影响。
- 页脚新增 software notice 真实 href；Settings 退役不存在的 `See NOTICE`/“Product license
  ships”断言，只可诚实表述 proprietary 产品与随包两类第三方 notices，不新增打开文件动作。
- `release:guard` 调 live graph `--check`，具备已安装的 Vite 与 locked/offline Cargo 环境；
  Pages 的 fresh Ubuntu `site:guard` 只调不依赖 node_modules/Rust cache 的 committed/public
  exact-bytes mode。两者共享 validator library，但后者不得伪称重算了 Vite/Cargo 图。
- candidate/native mode 必须枚举 `.app/Contents/{MacOS,Frameworks,PlugIns,Resources}` 内所有
  Mach-O、额外 executable、dylib/framework，并对每个 Mach-O 解析 `otool -L`；未在
  policy/SBOM 登记的额外可执行件、内嵌原生库或 `/System/Library`、`/usr/lib` 以外链接即红。
- `release-truth-lib.mjs` 必须在本票内导出并冻结 canonical-resource/native-policy 的纯验证
  API，供后续 candidate CLI 只读复用；其定向测试与本票 pre-candidate acceptance 一并锁定。

真实 mutation 至少包括：删一个实际 Vite 包、将 policy license 改成 GPL/unknown、删 AntV
clarification、删 `selectors` source archive、改 Cargo checksum、删 Tauri mapping、改生成顺序；
删 nested include、把两个 negative nested exclude 误收、将 SBOM dependency edges 拍平、植入
未登记 dylib/额外 executable 也必须触红；另加阴性对照——只改未进入实际 Vite loaded-input
graph 的 lock 项不得被误报为已分发组件。

实现白名单：

- `release/scripts/{generate-software-notices.mjs,software-notices.test.mjs,release-truth-lib.mjs,release-truth.test.mjs}`
- `release/notices/{software-sbom.cdx.json,THIRD_PARTY_SOFTWARE_NOTICES.txt,mpl-source/**}`
- `apps/desktop/src-tauri/tauri.conf.json`
- 根 `package.json`
- 根 `pnpm-lock.yaml`
- `site/scripts/build.mjs`、`site/index.html`
- `apps/desktop/src/settings/SettingsPage.tsx`
- `apps/desktop/tests/e2e/settings.spec.ts`
- `release/README.md`
- `release/SPEC.md`
- `apps/desktop/SPEC.md`、`site/SPEC.md`

根生成器只获准新增精确 devDependency `"yaml":"2.9.0"`；`pnpm-lock.yaml` 只可改变根 importer，
`packages` snapshot、其他 importer 与既有 resolution/integrity 必须逐字不变。禁止其他依赖/
lock 变化、`App.tsx`、Legal/Output/core、产品功能与历史 release 制品。除这项预批准 diff 外，
任一 source import、package/Cargo manifest 或 lock 漂移都会使 AUDIT 与本票验收失效，须回到
架构复核；不得顺手安装或静默扩图。

## RELEASE-SMOKE-TRUTH-1 · 挂载候选直接启动

依赖：`RELEASE-SOFTWARE-NOTICES-1` 已独立放行（其上游 FONT/AUDIT/VERSION 仍有效）。

只改 `docs/engineering/release.md`、
`release/scripts/{candidate-truth.mjs,candidate-truth-lib.mjs,candidate-truth.test.mjs}`、
`release/README.md` 与本 SPEC 的实现留痕；不改已由 FONT/NOTICES 验收冻结的
`release-truth-lib.mjs`/test，也不改产品、站点或制品配置。`candidate-truth.mjs` 必须是接受
explicit DMG path、built app path 与 canonical notices root/frozen policy path 的可执行
validator，不得只检查手册中是否出现命令文本。

发布手册 §3 必须形成一段 fail-safe shell 流：

1. `plutil` 对 build app 与 mounted app 分别断言
   `CFBundleShortVersionString=0.2.0`、`CFBundleVersion=0.2.0`、
   `LSMinimumSystemVersion=12.0`；期望值来自本 SPEC，不得拿 build app 字段反向自证 mounted app；
2. 保存构建 app 的 Mach-O SHA，再与挂载副本逐字比较；
3. `cmp`/SHA 证明包内两份 notices、SBOM 与 canonical bytes 相等，并枚举五枚 MPL source；
4. 枚举 `.app` 全部 Mach-O/额外 executable/dylib/framework，逐一 `otool -L` 并与
   policy/SBOM 的原生基线核对；
5. 从只读挂载路径直接执行 Mach-O，不走 `open`/LaunchServices；
6. 核对 PID command 精确命中挂载路径且连续存活至少 **5 秒**，再 TERM/wait；
7. trap 保证任一失败也终止子进程、卸载 DMG、清理精确临时目录。

pre-candidate 验收以 synthetic app/DMG seam 实跑 success 与 mutation，证明 validator 的步骤、
先后、清理、原生漂移和直接执行 fail closed；它通过后才允许生成唯一候选。真实候选生成后，
另一个未参与构建的会话在仓库外只读、按 SHA 命名且拒绝覆盖的路径消费 exact DMG，再实跑同一
validator。fixture 绿不等于真机 candidate acceptance。

## v0.2.0 候选与公开边界

1. 产品四票与 FONT、VERSION-PREP、SOFTWARE-NOTICES、SMOKE 实现票全部 pre-candidate
   accepted，目标 SHA 均为 `main` 祖先；SOFTWARE-AUDIT 的 frozen SHA 与只读复核仍有效。
2. 候选阶段只校验既有 desktop `0.2.0` 版本一致性；不得再改 package/Cargo manifest 或 lock。
3. clean 稳定 worktree 跑完整门，清理明确 bundle 目录后只构建一次；保留 exact DMG。
4. 候选真值提交只写 candidate、SHA、release notes、release README、desktop/site SPEC 与两处
   site 下载真值；不提前写 `current.md`/根 README/部署实录。
5. 将 exact DMG 复制到仓库外
   `/private/tmp/courtwork-release-candidates/v0.2.0/<sha256>/Courtwork_0.2.0_aarch64.dmg`
   并去掉写位；已存在路径必须 bytes 相同，否则拒绝覆盖。不同会话在 clean worktree 消费该
   同一 DMG，完成全门、mutation、挂载直接启动与资源核验。
6. accepted release tip 才可 tag；tag → Release/assets → 远端回下载/SHA → main/Pages →
   部署记录，顺序遵守 ADR-020 与发布手册。

Release notes 必须明示：Legal 单品边界、原 DOCX bytes、至少一项 confirmed 且无待索证才产文书、
零输出正常终态、重启/切案、DeepSeek-only、arm64、ad-hoc、未公证、`not external-validated`。
macOS 12 只是声明的最低版本；当前实际验证系统必须逐字写出。Word/WPS 往返和持续真实试点未成立，
不得据版本号宣称 Stage 0 退出。
