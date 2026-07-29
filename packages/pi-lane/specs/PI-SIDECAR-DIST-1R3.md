# PI-SIDECAR-DIST-1R3 · entitlements 四层证据返修回执

状态：**实现完成，待独立验收**。本回执不裁 sidecar 路线，不启动 `PI-HOST-LOOP-1`，
不宣称发行成熟度；权威仍只认父级 [`SPEC.md`](../SPEC.md)、[`ADR-022`](../../../docs/decisions/ADR-022-pi-lane.md)
六-E 与 implementation-readiness 同名行。

## 一 · 基线、组合与提交边界

- 实现分支：`codex/pi-sidecar-dist-1r3`。
- 架构基线：`main@4e2d07a08f0a772873ddea65a66bf4ef312f5e05`；开工时 HEAD 与 main 同 SHA、
  工作树 clean，`4e2d07a` 是当前基线祖先。开工时 `origin/main@3ddb14e...`，没有用远端叙述
  覆盖本地架构锚点。
- 十一枚提交严格顺取且零冲突：
  `c304745→f0162fd`、`e8963ef→eb806f2`、`972f42a→b284764`、
  `c6361a7→f7ecd32`、`4e530cb→20461aa`、`3435fa8→c6a9819`、
  `166a89a→df65ab0`、`42858b2→0230bf6`、`33100d8→57f91dc`、
  `850fa11→473bc00`、`9ebb92a→ba374d8`。
- 实现／工程报告提交：
  `7b4184b70cecea26fe583d177fbb9eb62b644369`。该提交只含 fixture README、
  `sign-probe.mjs`、共享 verdict、verdict tests、上游 exact plist 与原工程报告六个白名单路径；
  未改 package/lock、旧回执、ACCEPTANCE、父级契约、其他 fixture/build/runtime 脚本、
  产品源码、Tauri/Rust/GUI。
- `850fa11` 的 exact `publishedPath` 门保全：R2 的 success/failure path 定向测试、
  `path.wrongCell`／`path.escapesAssembly`／`path.wrongExtension` 生产反例均继续通过；
  full 224 例与 14 枚 reproducibility 反例未出现回退。

## 二 · first-red、canonical 与反向锁

R2 未改 production 先跑为 **203/203**。只加 R3 测试后为 **224 例中 203 绿、21 红**；
21 枚分别为：

`sign mode name`、canonical SHA、canonical 六键值、受限域分类、control 空 XML、
control launch、official ordered Authority、spctl internal error、spctl 非 exact rejected、
official 空 XML、DER human 少键／多键／false／重复键、六格 canonical input SHA、
actual entitlements、非法 domain id、PATH shim、tool/command SHA correlation、
command stdout 与 stderr bytes/SHA。

所有红例均由既有 R2 verdict 忽略真实 observation 字段造成，不是 missing import、stub、
模块加载或脚本未命中。收紧后 224/224。

canonical 一手核对：

- Node v22.23.1 commit：
  `bd96dfbf0361576724b65322046e2ca9f9609cb9`；
- `tools/osx-codesign.sh` Git blob：
  `346afdbe66e9fda3349c46b5ccae221160313720`，明确消费同树
  `tools/osx-entitlements.plist`；
- plist Git blob：`045df8eaf98e65e4fb4ea9a82b5821d41590dbdd`；
- 仓内 exact path：
  `packages/pi-lane/fixtures/sidecar-dist/upstream/node-v22.23.1/osx-entitlements.plist`；
- `lstat` 为 regular file、632 bytes、SHA-256
  `a0387464b93dd3d92c9f92c3d3f67713b355cc76d131f0542a69d2ca2cc6d797`，
  `/usr/bin/plutil -lint` exit 0；六键全为 `true`。

脚本只读这条仓内 path，并同时核 exact path、bytes、SHA 与 parsed values；没有手写替代、
历史 `dist/`、runtime-generated、extraction fallback 或路径逃逸。六格每行另存
`canonicalInputPath` 与同一 SHA，签后再独立回读 actual entitlements。

## 三 · 两个 execution domain 与 manifest

### 受限域

- id：`impl-seatbelt-final`；
- 独占目录：`packages/pi-lane/fixtures/sidecar-dist/dist/security-domain/impl-seatbelt-final/`；
- manifest：
  `packages/pi-lane/fixtures/sidecar-dist/dist/security-domain/impl-seatbelt-final/manifest.json`；
- manifest 外算 SHA-256：
  `4ef6b974ca69c1bd8cc9328d0cd41735f61985f2f5db4093d4c5fffeddd4b2f0`；
- 命令 exit 1，manifest status `security_execution_domain_blocked`；
- `preflight.json` 同时记录 `authority_unavailable` 与
  `security_subsystem_internal_error`。control 自身仍 sign 0、strict verify 0、
  XML 568 bytes，并完整完成 `ready → EOF → exit 0`；blocked 来自 official signature
  service 与 spctl internal error，不与普通 `probe_failed` 混淆。

### 明确批准的非-seatbelt 域

- id：`impl-approved-full-final`；
- 独占目录：
  `packages/pi-lane/fixtures/sidecar-dist/dist/security-domain/impl-approved-full-final/`；
- manifest：
  `packages/pi-lane/fixtures/sidecar-dist/dist/security-domain/impl-approved-full-final/manifest.json`；
- manifest 外算 SHA-256：
  `cedfd3a35c7da21d298e9adea7a38abee492e3691fa88642ccd0910ec0d449ff`；
- manifest status `ok`。同一进程／域先完成 preflight `passed`，之后才生成 full。

批准域 manifest 绑定三份文件：

| 文件 | bytes | SHA-256 |
|---|---:|---|
| `host-tool-receipt.json` | 83,497 | `d2ae4844c3b02ffada4859805aeaa06ac0ccdd75df069a2a5bff5e720c01798c` |
| `preflight.json` | 13,056 | `1b2e93effd3030dd6f4c86dfbf6b767eb473ef80efeb32c233104786be442a79` |
| `sign-probe.json` | 154,831 | `6a4869df83b34a20a9a18e302f611a709f86019a296f776260157fac449a6c6c` |

顶层共享 `dist/sign-probe.json` 不存在。重复使用 `impl-approved-full-final` 与非法
`../escape` 均在动作前 exit 2；既有目录未覆盖。所有运行从
`dist/security-domain/.stage-<id>-...` 原子落名，目标 id 已存在即拒绝。

## 四 · control、原签名、XML／DER 与六格

control 在批准域完成：

- official arm64 Node 私有副本以 canonical input 重签；
- strict verify exit 0；
- XML exit 0、568 bytes、SHA-256
  `cf2c3d27530139c19ee66f289be8169991dc3206322d5df3c22f529c136883e6`，
  解析后六键逐值等义；
- 冻结 `sidecar-fixture.mjs` 真跑 `ready → EOF → exit 0`，timeouts 为空。

official Node 原签名：

- `/usr/bin/codesign --verify --strict --verbose=4` exit 0；
- Identifier `node`；
- CDHash `59cdea89a982b05f23e756c08115bebc555ff092`；
- TeamIdentifier `HX7739G8FX`；
- flags `0x10000(runtime)`；
- ordered Authority：
  `Developer ID Application: Node.js Foundation (HX7739G8FX)` →
  `Developer ID Certification Authority` → `Apple Root CA`；
- synthetic `.app` 的 `/usr/sbin/spctl -a -vv` exact exit 3、signal null、stdout 0 bytes，
  第一非空 stderr 行 exact `<absolute-app-path>: rejected`。

两条 entitlement observation 独立采集：

- XML：`codesign -d --entitlements - --xml <official-node>`，exit 0/signal null，
  stdout 568 bytes、SHA
  `cf2c3d27530139c19ee66f289be8169991dc3206322d5df3c22f529c136883e6`；
- DER human：`codesign -d --entitlements - <official-node>`，exit 0/signal null，
  stdout 469 bytes、SHA
  `954631d7167d00e90d08416ff1aa128785b111ec68e54f4aa544e55481937147`；
- 两路 stdout/stderr 各有独立 bytes/SHA receipt，分别严格解析，少键、多键、false、
  duplicate 均判红；没有用 XML 结果代填 human。

两候选 `a/aarch64-apple-darwin/cjs` 与 `b/aarch64-apple-darwin/default` × 三姿势：

- 六格 status `ok`，sign/strict verify 均 exit 0；
- `adhoc-plain`：flags `0x2(adhoc)`，两格均 launch true，actual entitlements none；
- `adhoc-hardened-no-entitlements`：flags `0x10002(adhoc,runtime)`，两格均按冻结形态
  launch false，actual entitlements none；
- `adhoc-hardened-with-node-v22.23.1-entitlements`：同 hardened flags，两格 launch true，
  actual 六键全 `true`；
- 每格 canonical input path 与 SHA 均为第二节冻结值。

嵌套 `.app`：nested sign 0 → outer sign 0 → deep strict verify 0 → 内嵌 SEA
`ready → EOF → exit 0`；spctl exact exit 3/rejected。

## 五 · host/tool receipt、deadline 与 mutation

同轮 host 为 macOS 26.5.2 build 25F84、Darwin 25.5.0、arm64；
Command Line Tools `26.6.0.0.1781586589`。harness Node 为 v25.9.0、regular、非 symlink、
68,384 bytes、SHA
`32e234a5b6bec67d72a016f2baadf7fadf3afd328470b395b73af473fdee0d85`。
official Node v22.23.1 为 regular、非 symlink、112,928,848 bytes、SHA
`2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`。

Apple 工具只以绝对路径调用，均 regular、非 symlink：

| path | bytes | SHA-256 |
|---|---:|---|
| `/usr/bin/codesign` | 459,824 | `214d455584d19abc0d74d02b9cbc7d3da6bdcb0596c235e6156dd9ed2f4e1ba7` |
| `/usr/sbin/spctl` | 351,984 | `4f1ec872401316140996c7ce6929db27729933318f48b0fc8042830a25c46466` |
| `/usr/bin/plutil` | 663,776 | `9d2296746d4519a8094738e7570972d44791793a072767b8bcbf0ea82af90358` |

receipt 同时记录 Mach-O 描述、command argv[0]、同一 tool SHA、`LC_ALL=C` 与双流
bytes/SHA。PATH-shim、tool/command SHA 不一致与双流自相矛盾定向测试均判红。

`sign-probe.mjs` 的 ready、EOF、exit、kill-confirm 都走具名 deadline；源码 grep
零裸 `await proc.exited`。超时会写结构化 observation，并经 bounded kill-confirm 收口。

source mutation 总账（逐枚 applied 后跑 224 例，再恢复）：

| mutation | 结果 |
|---|---:|
| preflight verdict 短路 | exit 1；218 pass / 6 fail |
| official XML／DER verdict 短路 | exit 1；218 pass / 6 fail |
| host/tool receipt verdict 短路 | exit 1；222 pass / 2 fail |

恢复后 224/224，`git diff --check` 通过。

## 六 · 快速门后的完整重跑

快速签名门通过后从空 `dist/assembly` 重跑，未引用旧 `dist/final`：

- verdict：**224/224**（R2 203 + R3 21）；
- counterexamples：**76/76**，分项为 measure 23、cold-start 15、repro 14、
  SEA 8、physical 11、fetch 4、extract 1；预期退出码机器核对全匹配；
- normal measure：十件闭集、8 候选、2 负控，`status:"ok" failures:0`；
- cold-start：8 × 3 × 25 = **600**，`status:"ok" failures:0`；
- 双 cycle：三份 sealed bundle、两架构 SEA default 各自 exact identical；
  两架构 code-cache 各自 non-identical；跨架构 exact
  `Code cache data rejected.` warning；
- runtime fetch/source restored：exit 0，arm64/x64 两架构来源门均 `ok`；
- 受限域 preflight 与批准域 full 六格均为本轮新 id、新 manifest。

四项仓库门：

| 命令 | 结果 |
|---|---|
| `pnpm -r build` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm test` | 批准域 exit 0；160 files / 1397 tests |
| `pnpm --filter @courtwork/desktop lint:isolation-binding` | exit 0 |

`pnpm test` 在受限域首跑与单文件复核均只红 `sidecar.test.ts` 8 例，八例同样停在
`server.listen(0,'127.0.0.1')` callback 前 5 s timeout；批准域完整重跑全绿。
没有修改该测试或产品源码规避执行域差异。

`clean.mjs --report-only` 为 4,664,670,380 bytes（4.34 GiB），未清理；主要是
`security-domain/` 2,924,845,105、`assembly/` 1,143,565,916、`runtime/` 473,562,352、
`cross-arch/` 115,806,624、`build/` 5,854,322、`r3-evidence/` 716,291 bytes。

## 七 · 边界、复杂度与待验收

- 报告只写实验事实、实测／推论／blocked 分界，零路线建议。
- `get-task-allow:true` 只作为 Node 上游 canonical ad-hoc probe 控制变量，
  **零流入 product signing plan**。
- 新增概念只有：canonical source identity、execution-domain id/manifest、
  tool-command correlation、XML/DER 双 observation、签后 actual entitlements。
  它们分别用于阻止输入漂移、跨域复用、PATH/tool 替换、两路提取互相代填与签后状态假设；
  没有新增 package、lock、生产导出或跨层接口。
- 未 push、未 merge、未自验收；未启动 `PI-HOST-LOOP-1`，未构建 DMG、未部署 Pages、
  未改外部叙事。
- 当前停点：**待另一独立 clean worktree / execution domain 会话验收**。
