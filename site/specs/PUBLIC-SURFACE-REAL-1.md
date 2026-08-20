# PUBLIC-SURFACE-REAL-1 · README／Pages 公开面真实化

状态：**补正中，未清账**。架构冻结 `a237230`；独立 Luna 实现 `381e206`，产品合入
`5187c797`；验收 `703e042` 曾给出 PASS，但此前独立验收 `3707f94` 的 provenance REJECT 后被
发现且成立，故 `c8d3292`／`70ea976` 的放行与清账结论由本补正前进式撤回。基线
`main @ 3a4a90e`。

权威：`CLAUDE.md`、`AGENTS.md`、`docs/status/current.md`、
`docs/product/roadmap.md`、`docs/architecture/implementation-readiness.md`、
`apps/desktop/specs/WORK-AGENT-SHOWCASE-1.md`、`apps/desktop/specs/UX-POLISH-1.md`、
`apps/desktop/specs/DEMO-REAL-SHELL-1.md`、`site/SPEC.md` 与本票。

## 一、公开口径

README 与 Pages 必须把以下三层分开，不能再用“法律工作台”覆盖产品定位，也不能把定位写成
已经放行的能力：

1. **产品定位／施工主线**：Courtwork 是与垂类解耦的本地优先通用 Work Agent GUI；Work 以
   本机案件或工作文件夹为容器，把受控读写、运行记录、逐次授权、结果审阅与恢复组织成个人工作线。
2. **当前已验收事实**：真实／样例壳边界、单焦点 Work renderer、proposal allow/deny、Stop、
   terminal、resume 与只读 result/viewer 已有 scripted 独立验收；Legal 是第一条真实材料垂类，
   generic 是中性基线，PM 仍只到 catalog/structure projection。
3. **尚未成立**：`PI-BASE-GUI-ACCEPT` 仍为 `external-validated blocked`；真实 DeepSeek、真实
   Tauri WKWebView 的键盘／AX／读屏／焦点总验未放行。因此不得写 Work Agent 已 product-live，
   不得写成团队协作产品，也不得把当前 main 的 GUI 说成已经包含在 v0.1.2 下载制品中。

成熟产品只借“真实容器、显式 sample、单一主焦点、先人类决定、结果可核验”的行为，不借企业
层级。不得新增或暗示 member/avatar/Owner、org/team、RBAC/ACL、audit、share、parallel board、
background/schedule、统计 dashboard 或通知中心。

## 二、README 契约

- 首段改为上述通用 Work Agent GUI 定位；删除“案件文件夹级协作”与“现行称谓只到法律工作台”。
- 原则句使用“作用域、授权与契约”，不得以“权限”暗示已存在 identity/RBAC。
- scripted 成立面与 external gate 必须相邻出现；`Stage 0 — 真实 MVP` 尚未退出必须可见。
- `packages/pi-lane` 不再写“仅 dev/在建”，改为已装配的通用 loop／scripted GUI 主线，并在同句
  保留真实外部 gate 未放行。
- `apps/desktop` 明示当前 main 的 scripted GUI 不在 v0.1.2 中。v0.1.2 仍是既有 Apple Silicon、
  ad-hoc、未公证历史开发制品；不改版本、URL、SHA、tag 或 Release。
- 可嵌一张本票重摄的 Work proposal 公开 WebP；其相邻说明必须写 `scripted`，不得标作真模型或
  product-live。

## 三、Pages 契约

### 3.1 首屏与信息层级

- `<title>`、OG title、Hero H1 改为“本地优先的通用 Work Agent GUI”同义口径；Hero 眉部／正文
  同时标明“正在闭合”与人工决定边界，不用“上线”“生产可用”等成熟度词。
- 保留一个主 CTA 和一个次 CTA；v0.1.2 下载入口、SHA、Apple Silicon、ad-hoc、未公证一字节
  真值不改，并在卷首／发布事实区明确“历史开发版，不含当前 main 的 Work Agent 主线”。
- 现有 Legal 合同微演示与 Evidence Line 保留，但 caption、aria 与卷标题明确它是第一垂类的
  合成展品，不再冒充整个产品身份。

### 3.2 通用 Work 纵切

- 复用现有 `work-ledger`／`work-row`／`work-crop` 骨架，内容改为三段：
  `真实本地容器` → `写入提案先由人决定` → `结果只读核验`。
- 三张图必须从本票实现 tip 的 scripted capture 重新生成：至少覆盖已绑定真实容器、pending
  proposal、viewer。图中不得出现 Pinned 样板、`Owner`、`Sample lead` 或假成员；可见底部只能是
  `Local workspace`，sample 不得进入真实 Recent。
- 每一段和每张图的 alt/figcaption 都必须出现 `scripted` 或“脚本化验收”边界；不能把截图写成
  真实 DeepSeek、真实 Tauri/AX 或发布制品。
- 网站只收 1440 与 720 WebP；源 PNG、视口、产品 SHA 与逐文件 SHA 写入
  `site/craft-evidence/PUBLIC-SURFACE-REAL-1/`。不得复用 2026-08-19 含旧 Owner／样板常驻的帧。

### 3.3 成熟度总声明与 FAQ

- 唯一页级总声明改为：

  > 本页通用 Work 画面来自 scripted 验收，法律引语与数字来自同一份合成卷宗；两类证据都不等于产品全面上线。

  `deslop` 的 signed hedge、退役句与 mutation 测试必须同批迁移；全站仍只能出现这一处。
- FAQ 必须新增或替换一问，逐层回答“Work Agent GUI 是定位；scripted shell 已验收；
  `PI-BASE-GUI-ACCEPT` 仍 blocked；不是 team/product-live”。
- 发布事实区补充当前 main 的证据与下载制品分离，不增加新版本、tag、Release 或下载目标。

### 3.4 视觉与 OG

- 视觉档位：**Pages 克制修订档**。复用现有冷白／冷灰、磁青主操作、字体、线、间距、Ghosty
  与单一 Mac window；不得新增颜色、渐变、阴影、glow、动效、卡片网格、依赖或图标包。
- 改 `site/og.html` 后必须用既有 `render-og.mjs` 重渲 `site/assets/og.png`，同步
  `site/assets/og-manifest.json`；不手工改 PNG 或 manifest。
- 390/375 窄屏保持 DOM 阅读序；JS-off 与 reduced-motion 下核心定位、证据边界、release 真值与
  三张 Work 图均完整可读。

## 四、精确实现范围

允许修改：

- `README.md`
- `site/index.html`
- `site/styles.css`（只为新截图的现有骨架适配；能零改则零改）
- `site/og.html`
- `site/assets/og.png`
- `site/assets/og-manifest.json`
- `site/assets/screenshots/` 下本票具名前缀的 1440/720 WebP
- `site/craft-evidence/PUBLIC-SURFACE-REAL-1/`
- `site/scripts/deslop-scan-lib.mjs`、`site/scripts/deslop-scan.mjs`、
  `site/scripts/deslop-scan.test.mjs`（只准公开真值／signed hedge／本票资产门）
- `site/scripts/versional-language-contract.test.mjs`（只准 OG/资产真值同步确需的机械更新）
- `apps/desktop/scripts/capture-pi-lane-states.mjs`（只准移除已经退役的 demo/provider 启动路径，
  使 capture 从 fresh shell 创建真实容器；不改状态脚本或产品）
- `site/SPEC.md`（实现回执）

不得修改 `apps/desktop/src/**`、产品 E2E、schema、core/runtime/provider、identity/ACL、依赖、
`docs/status/current.md`、release 制品真值、版本、tag、Release、Pages workflow 或 Morphicons。

## 五、TDD、门禁与独立验收

实现会话先让公开真值测试在旧 README/Pages 上变红，再做最小实现。最低证据：

- 新公开真值门锁定 README／HTML／OG 的定位、scripted、external gate、Stage 0、v0.1.2 分离与唯一
  页级声明；删掉任一边界或把 v0.1.2 写成包含当前主线必须红。
- 资产门锁三张源 PNG 与六张 WebP 的 SHA、视口和 product SHA；旧 Owner／Pinned/sample 视觉残影
  以 DOM/capture 前置断言结构性阻断，不靠人工肉眼猜。
- `pnpm site:guard`、`pnpm site:build`、`pnpm lint`、`pnpm -r build` 全绿；README 链接与 Pages
  build 产物中的截图、OG、CSS、JS 均存在且可读。
- 独立 Luna 使用 clean worktree，不采信实现截图，自起独立端口复摄公开页 1440/375 light/dark、
  JS-off、reduced-motion；核对零横向溢出、零破图、主次 CTA、唯一 Mac window、工作链阅读序。
- 独立验收实际注入至少六类反例并观察红：去 `scripted`、删 external gate、把 v0.1.2 写成包含
  当前主线、恢复旧页级声明、图中/文案恢复 Owner 或 Pinned sample、篡改任一 Work WebP。
- 本票零 Rust/Tauri 产品触面，Cargo 不跑并如实记录；capture 只是 browser scripted evidence，
  不能据此外推 WKWebView/AX。

验收只追加 `site/ACCEPTANCE.md`；实现级测试小缺陷可用 `fix-by-acceptance` 单独提交。放行后由架构
角色合入、清账，再在 main 上执行 fresh fetch/push；push 不创建 tag/Release。Pages workflow 成功且
线上首页／OG／截图／v0.1.2 链接复核通过后，才算本轮完成。

## 六、清账事实（2026-08-20）

- 实现严格落在票面文件面：README／Pages／OG 完成公开口径校准；三枚当前 shell 源 PNG 与六枚
  WebP 逐字节入 manifest；产品源码、schema/runtime/identity/ACL、依赖、版本、tag、Release 与
  `docs/status/current.md` 均未修改。
- 独立验收对象为产品 merge `5187c797c6ced84188c0b4e8ae7b00ecb8e50922`。focused Node
  **66/66**、`site:guard` **106/106**、site build、lint、全仓 build 均绿；1440/375、light/dark、
  JS-off、reduced-motion 与三帧肉眼复核通过。
- 去 scripted、去 external gate、伪称 v0.1.2 含 current main、恢复旧免责声明、恢复 Owner/Pinned
  sample、篡改 WebP 六类反例均实际触红并复原。完整证据见 `site/ACCEPTANCE.md` 的
  `PUBLIC-SURFACE-REAL-1-ACCEPT-3`。
- 原清账结论已由下节 provenance 补正撤回；本节保留为发生过的提交事实，不再构成放行依据。

## 七、provenance 补正 R1（2026-08-20）

`3707f94` 指出的阻断成立：manifest 与 evidence README 将 `productSha` 写成实现前基线
`3a4a90e…`，且机器门只校验 40 位 hex，不能证明公开帧来自被验产品 tip。架构裁决如下：

1. 本票 `productSha` 的语义固定为**实际执行 capture 的完整 git tip**，该 tip 必须同时包含现行
   Work shell、capture script 与 DEMO/REAL 边界；不得用父提交、口头等价或实现前基线代替。
2. 补正实现必须在精确产品 merge `5187c797c6ced84188c0b4e8ae7b00ecb8e50922` 的 clean worktree
   重跑 capture；即使 PNG/WebP 字节与旧帧相同，也必须记录重摄命令与新 provenance。manifest 与
   evidence README 同步写入该完整 SHA。
3. 机器门必须锁定 manifest `productSha === 5187c797…`，并锁定 evidence README 出现同一完整
   SHA；把字段换回任意其他 40 位 SHA 必须变红，不能只测格式。
4. Hero 可见短句“本地工作面。”是既有层级选择，不是本轮阻断；完整定位已在 title、eyebrow、
   aria 与首段成立，本补正不扩张为视觉重排。
5. 补正由原实现 Luna 执行，只改 evidence README／manifest、确需重摄的三 PNG/六 WebP、精确
   provenance 门与 `site/SPEC.md` 回执；另一 Luna 必须从 clean worktree 复验 provenance mutation、
   资产 bytes/SHA 与原全门。新 PASS 前 README/Pages 槽保持占用，不得 push/deploy。
