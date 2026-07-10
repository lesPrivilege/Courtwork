# SEC-1｜push 前安全清扫报告

| 项 | 内容 |
|---|---|
| 工单 | SEC-1（`docs/11-会话唤醒prompt.md`） |
| 执行角色 | Grok 4.5 CLI（实现） |
| 执行日期 | 2026-07-11 |
| 扫描 HEAD | `4c6fbe0`（执行时）；全历史 328 commits |
| 远程 | **无 remote**（`git remote -v` 空） |
| 写操作范围 | 仅 `.gitignore` + 本报告（未改历史、未 filter-branch） |
| **push 放行建议** | **待用户定级**（凭证维度已放行；PII 定级见 §4） |

---

## 0. 三态结论（总览）

| 维度 | 状态 | 说明 |
|---|---|---|
| 真实凭证 | **放行** | 工作树 + 全历史未见疑似真实 key / 私钥 / 生产 token |
| 预裁路径历史污染 | **放行** | `.obsidian/`、`usecase/` 等从未入过 git 历史 |
| 个人信息（路径/邮箱） | **待用户定级** | 见 §4；私有可留、公有须洗 |
| **综合 push 建议** | **待用户定级** | 凭证不阻塞；先定私有/公有策略与 PII 是否洗，再 push |

---

## 1. 凭证全历史扫描

### 1.1 方法

| 范围 | 命令/手段 |
|---|---|
| 全历史 diff | `git log -p --all -G '…'` 与 `git log --all --oneline -G/ -S` |
| 工作树 | `rg` 排除 `node_modules` / `target` / `dist` / `.git` / 二进制 |
| 模式 | `sk-*` 长串、`api[_-]?key`、`BEGIN *PRIVATE KEY`、`password`/`token` 赋值、`ghp_`/`xox`/`AKIA`/`Bearer` |
| 专项 | `.env` / `*.pem` / `credentials.json` 文件存在性；`DEEPSEEK_API_KEY=` 字面量赋值 |

### 1.2 真实凭证

| 检查项 | 结果 |
|---|---|
| `BEGIN *PRIVATE KEY` | **全历史零命中** |
| `ghp_` / `github_pat_` / `xox*` / `AKIA*` | **零命中** |
| 工作树 `.env` / `*.pem` / `id_rsa` / `credentials.json` | **不存在** |
| `DEEPSEEK_API_KEY=` / 同类 `KEY=` 字面量赋值入库 | **未发现**（仅环境变量名出现在脚本/文档说明中） |
| 疑似真实生产 sk- 长串 | **未发现** |

**结论：未发现疑似真实凭证。无需历史清洗。不阻塞 push（凭证维）。**

### 1.3 测试金丝雀 / 假 key 逐项确认

下列字符串出现在测试或计划文档中；旁侧均有 canary / fake / test / 明显占位语义，**判定为假**。

| 字符串 | 出现位置（代表） | 假 key 依据 |
|---|---|---|
| `sk-super-secret-leak-canary-9f8e7d6c` | `packages/core/src/provider/http-client.test.ts`（变量名 `secretKey`，断言错误对象**不得**含该串）；`docs/42` 验收报告；provider plan | 字面含 **`canary`**；用途为泄漏防护金丝雀 |
| `sk-another-secret-canary-1a2b3c` | 同上 `http-client.test.ts` 401 用例；`docs/42`；plan | 字面含 **`canary`** |
| `sk-e2e-secret-canary-5f4e3d2c` | `openai-compatible-provider.test.ts`；plan | 字面含 **`canary`** |
| `sk-test-key` | `http-client.test.ts` 默认 `TEST_PROFILE`；plan | **`test`** 占位 |
| `sk-test` | `structured-output.test.ts` helper | **`test`** 占位 |
| `sk-x` | `openai-compatible-provider.test.ts` 多处工厂构造 | 极短占位，非真实 key 形态 |
| `sk-abc123` | `http-client.test.ts`（Bearer 头断言） | 教科书式假值 |
| `fake-key` | `packages/tools/src/web-search.test.ts`（serper 骨架） | 字面 **`fake`** |
| `test-key` | `party-verify.test.ts`（企查查骨架，`example.invalid`） | 字面 **`test`** |
| `cw-valid-secret-key` | `apps/desktop/tests/e2e/d1-case-scope.spec.ts` | E2E 长度探针占位，非第三方 API key 形态 |

**误报说明（非密钥）：** `sk-` 宽正则大量命中 `risk-list`、`s3-risk-list-response`、`risk-review-panel` 等标识符截断；`api_key` 命中为 TypeScript 判别联合 `auth.kind: 'api_key'` 与文档用语，非密钥字面量。UI 文案「访问凭证 / 连接失败」与 `__CW_FORCE_CREDENTIAL__` 为产品探针，非密钥。

### 1.4 历史中与「凭证」相关但已排除的提交（备查）

| Commit | 说明 |
|---|---|
| `e727957` 等 T-provider 系列 | 引入 canary 测试，假 key |
| `399687c` docs/42 合批验收 | 记录 canary 复跑结论 |
| `5541d9c` D-1 e2e | `cw-valid-secret-key` 占位 |
| `f0fbe10` seed | 对宽 `sk-` 模式有命中，属文档/路径噪声，无真实 key |

---

## 2. .gitignore 加固 + 路径历史核查

### 2.1 历史是否曾入库（`git log --all -- <路径>`）

| 路径 | 历史 commit 数 | 结论 |
|---|---:|---|
| `.obsidian/` | 0 | **从未入库**（当前仅工作树未跟踪） |
| `usecase/` | 0 | **从未入库**（当前仅工作树未跟踪；含真实判例 PDF） |
| `.claude/` | 0 | 已 ignore；历史干净 |
| `apps/desktop/src-tauri/target/` | 0 | 已 ignore；历史干净 |
| `node_modules/`（各层） | 0 | 已 ignore；历史干净 |
| `eval/reports/` | 0 | 已 ignore（`*.json`/`*.md`）；历史干净 |
| `apps/desktop/test-results/` | 0 | 已 ignore；历史干净 |
| `apps/desktop/playwright-report/` | 0 | 已 ignore；历史干净 |
| `apps/desktop/visual-audit/` | 9 | **有意入库**（设计验收截图，非预裁忽略对象） |
| `*.dmg` / `*.app` | 0 | 工作树与历史均无 |

**无历史污染。无需清洗。**

### 2.2 `.gitignore` 变更（本工单唯一实现级写操作）

**变更前已有：** `node_modules/`、`.claude/`、`dist/`、`target/`、`.venv/`、`eval/reports/*`、`apps/desktop/dist|test-results|playwright-report|src-tauri/target` 等。

**本单新增：**

```gitignore
# 架构预裁：用户本地文档查看器配置，不入 repo
.obsidian/

# 架构预裁：真实判例 PDF/HTML（获取手法不宜分发），不入 repo
usecase/

# 环境变量与本地密钥（防御性；仓库内当前无 .env 文件）
.env
.env.*
!.env.example

# 桌面安装包 / 构建产物（永不入库）
*.dmg
*.pkg
*.app/
```

加固后预期：`git status` 不再列出 `.obsidian/**` 与 `usecase/**` 为未跟踪。

### 2.3 未跟踪但仍须注意（非 ignore 对象）

| 路径 | 说明 |
|---|---|
| `docs/superpowers/plans/2026-07-10-core-provider-openai-compatible-adapter.md` | 未跟踪计划稿；含测试 canary 假 key 文本，**无真实密钥**；是否入库由后续会话决定 |
| `eval/ACCEPTANCE.md` 工作树修改 + `stash@{0}` | 见 §5，与 ignore 无关 |

---

## 3. 敏感数据抽查

### 3.1 demo-data 虚构纪律

抽查 `packages/demo-data/data/manifest.md`、主合同、变体合同、卷宗片段：

| 检查点 | 结果 |
|---|---|
| 样板案明确「全部虚构」 | 是（临江精铸 × 起云智能（虚构）；案号 `(2025)云章03民初472号`；云章市） |
| 统一社会信用代码 `DEMO` 前缀 | 是（不可用于真实核验） |
| 自然人姓名 | 封文昌、岑瑞霖等，manifest 声明虚构 |
| 法条 | 真实公开法条 + 3 条 `status: demo` 虚构判例，已标注 |

**结论：虚构纪律 intact。抽查通过。**

### 3.2 visual-audit 截图

- 已跟踪 24 张 PNG，合计约 **7.6 MB**（均 <5MB 单文件）。
- 目视抽查 `00-provider-first-run`、`22-d1-credential-failed`：内容为 demo 案「临江精铸诉起云智能」、案号云章虚构、主办律师「林律师」等 UI 演示文案；**凭证输入框为空或遮罩态，未见真实 key / 真实当事人证件号电话。**
- 截图与 demo-data 同源虚构叙事，符合「无真实个人信息」。

**结论：抽查通过。**（visual-audit 保留入库合理，供设计回归。）

### 3.3 测试夹具当事人

| 夹具 | 内容 |
|---|---|
| `apps/desktop/tests/fixtures/sample-brief.md` | 起云智能 + 会议纪要矛盾（demo 叙事） |
| E2E 新建案名 | 「张三诉李四…」「某某科技…」等占位，非真实卷宗 |
| tools/core 测试 | `fake-key` / canary / `example.invalid` |

**结论：未见真实当事人夹具。通过。**

---

## 4. 个人信息盘点（报告不处置 · 交用户定级）

> 定级口径（工单原文）：**私有 repo 可留 / 公有须洗**。本单不改历史、不重写文档。

### 4.1 清单

| ID | 类别 | 内容 | 位置 | 是否在 git 历史 | 建议定级参考 |
|---|---|---|---|---|---|
| P1 | 本机绝对路径 | `/Users/lesprivilege/Projects/Courtwork/...` | `docs/superpowers/plans/2026-07-10-reading-view-package.md`（约 55 处） | 是（随 plan 提交） | 公有：洗为相对路径或 `$REPO`；私有：可留 |
| P2 | 本机绝对路径 | 同上模式 | `docs/superpowers/plans/2026-07-10-eval-promptfoo-boundary-remediation.md`（约 31 处） | 是 | 同 P1 |
| P3 | 本机绝对路径 | spike 输出路径 | `packages/output/spike/py-redlines/out/report.json`（4 处） | 是 | 公有：可删 report 或洗路径；私有：可留 |
| P4 | 本机绝对路径（工单自指） | SEC-1 清单原文含路径示例 | `docs/11-会话唤醒prompt.md` | 是 | 低敏（元说明）；公有可改写示例 |
| P5 | 提交人邮箱 | `lesprivilege@gmail.com` | **全部 328 commits** 的 author/committer email | 是（不可逆除非历史改写） | 公有：考虑 `git mailmap` 仅影响显示，**不能**从已 push 历史抹掉；须在 **首次 push 前**决定是否 `filter`/`rebase` 换邮箱。私有：通常可留 |
| P6 | 提交人显示名 | `lesPrivilege` / `Courtwork Architecture (Cowork)` / `Courtwork DemoData (subagent)` | 同上 | 是 | 同 P5；显示名暴露度低于邮箱 |
| P7 | 机器名 / hostname | — | 工作树与历史 **未发现** 典型机器名入库 | — | 无项 |

### 4.2 定级决策表（用户勾选）

| 场景 | 建议动作 |
|---|---|
| **仅私有 remote（GitHub private / 自建）** | P1–P4 可留；P5 可留。SEC-1 凭证与 ignore 已就绪 → 定级后可改「放行」 |
| **未来可能公开 / 开源** | P1–P4 建议在 push 前批量相对路径化；P5 **必须在首次 push 前**决定是否换邮箱并改写历史（一旦公开 push，邮箱永留 git 对象） |
| **先私有后公开** | 可先私有 push；公开前再开「历史洗 PII」专项（另议，不在本单） |

---

## 5. 仓库卫生

### 5.1 stash 提醒（不阻塞 push）

```
stash@{0}: On main: acceptance-temp
```

- 内容摘要：对 `eval/ACCEPTANCE.md` 的 W7.1 补验结论追加 + 当时 `pnpm-lock.yaml` 中 `reading-view` importer 片段。
- **stash 不随 `git push` 上传**，不阻塞远程安全。
- **提醒收口**：他会话遗留；请相关会话 `stash show` 核对后 `stash drop` 或合法 commit，避免日后误 `stash pop`（AGENTS.md F-4 判例）。

### 5.2 大文件盘点（>5MB）

**已跟踪文件：无单文件 >5MB。** 最大已跟踪约 1.1MB（WPS 验收截图）。

| 路径 | 约大小 | 跟踪？ | 用途 |
|---|---:|---|---|
| `packages/output/spike/py-redlines/.venv/.../osx-arm64.tar.gz` | ~38 MB | **否**（命中 `.venv/` ignore） | Python spike 本地 venv 二进制 |
| `packages/output/spike/py-redlines/.venv/.../etree.*.so` | ~9 MB | **否** | 同上 |
| `apps/desktop/visual-audit/*.png`（24 张合计） | ~7.6 MB | 是 | UI 视觉验收金样；单张均 <1MB |
| `packages/output/test/manual-verification/screenshots/wps-*.png` | ~1.0–1.1 MB ×2 | 是 | WPS 兼容目视验收 |

工作树其余 >5MB 仅见上述 venv，已被 ignore。

### 5.3 DMG / 构建产物

| 项 | 结果 |
|---|---|
| 工作树 `*.dmg` / `*.app` / `*.pkg` | **无** |
| git 历史同类 | **无** |
| `apps/desktop/src-tauri/target/` | 未跟踪；已 ignore |
| 本单 | 追加 `*.dmg` / `*.pkg` / `*.app/` 防御性 ignore |

### 5.4 其他工作树脏项（信息性，非本单处置）

- `M eval/ACCEPTANCE.md`：与 stash 同源补验文本，可能尚未 commit。
- `?? docs/superpowers/plans/2026-07-10-core-provider-openai-compatible-adapter.md`：未跟踪计划。

---

## 6. Push 放行建议

### 6.1 三态裁定

| 候选态 | 是否适用 |
|---|---|
| 发现凭证阻塞 | **否** — 无真实凭证、无历史密钥污染 |
| **待用户定级** | **是** — §4 P1–P6 需用户选择私有可留 / 公有须洗；尤其 **P5 邮箱在首次 push 前不可逆** |
| 放行 | 凭证与 ignore 维度已满足；综合态在用户完成 §4.2 勾选前 **不写「放行」** |

### 6.2 用户勾选后的操作提示（本单不执行）

1. 定级：私有 / 公有（或先私有）。
2. 若公有且要洗 P5：另开历史改写专项（**不**在多会话共享树上贸然 filter-branch；按 AGENTS.md 另议）。
3. 收口 `acceptance-temp` stash。
4. 确认 `.gitignore` 已 commit（建议独立 commit：`chore(sec): SEC-1 gitignore 预裁 .obsidian/usecase 与构建产物`）。
5. 添加 remote → push（首次建议 private）。

### 6.3 本单交付物

| 文件 | 说明 |
|---|---|
| `.gitignore` | 已加固（§2.2） |
| `docs/51-push前安全清扫报告.md` | 本文件 |

---

## 7. 执行纪律自检

| 纪律 | 遵守 |
|---|---|
| 只读扫描为主 | 是 |
| 唯一写操作 = `.gitignore` + 本报告 | 是 |
| 发现历史污染不自行改写历史 | 是（无污染） |
| 不 `git add -A` / 不误吞他会话文件 | 是（本单若 commit，仅 pathspec 上述两文件） |
| 不自行 filter-branch | 是 |

---

**SEC-1 完工。等待用户对 §4 个人信息定级后，可将 push 建议从「待用户定级」更新为「放行」或进入公开前清洗专项。**
