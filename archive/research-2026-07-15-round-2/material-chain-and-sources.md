# R3：材料链真实度与源适配器——源码审查报告

审查角色：架构审查。纪律：只读、不改仓库；每条结论落 `文件:行号`；文档叙事一律回代码验证，不采信。
仓库根：`/Users/lesprivilege/Projects/Courtwork`（等价挂载路径 `/sessions/zealous-amazing-tesla/mnt/Courtwork`，本报告统一用仓库相对路径引用）。

---

## 0. 结论先行

**真实材料（非 `demo-linjiang` 样板案）今天在这条链上一步都走不通——链条在第 0 环「案件根目录」就已断裂，且断得很彻底：`NewCaseDialog.tsx` 的文件夹选择器（`webkitdirectory`）原理上拿不到绝对路径，`App.tsx` 的 `createCase()` 函数签名本身就不接受 `folderPath` 参数，硬编码写 `undefined`（`apps/desktop/src/App.tsx:943`）。**

下游的哈希、阅读视图、引用坐标铸造、进入 scenario 输入这四环，代码是真的、测试是真的、逻辑也扎实（尤其是 `packages/reading-view` 对扫描件的显式拒收和 `packages/core` 的引用 resolver 对歧义引语的拒收，两处都诚实践行了「静默降级零容忍」）——但这四环今天只在 `packages/demo-runtime` 的 Node CLI 脚本与测试环境里被真实调用过，且有机器测试（`packages/demo-runtime/src/package-boundary.test.ts:98-109`）物理断言桌面应用（`@courtwork/desktop`）与 `@courtwork/core` 都不允许依赖 `@courtwork/demo-runtime`。桌面应用运行时看到的「Work」全部内容，是提前用同一条真链路在 Node 环境跑一次、把结果冻结成 JSON/TS 字面量（`apps/desktop/src/demo/recordings.ts`）之后回放的录像带（`apps/desktop/src/main.tsx:20,29` 唯一装配点显式注入 `demoWorkFixture.projection`）。

一句话：**「代码 Build 全绿」在这个仓库里精确地翻译成——算法核心层（阅读视图转换、引用坐标 resolver、六段组装、六态执行器）是真实且诚实的，但它是一颗悬空运转的引擎，没有一根真实的传动轴接到「用户的文件」这一端；能证明它转得动的，只有开发者自己喂给它的固定虚构语料。**

---

## 1. 材料链今天到底通到哪一步

按题目给出的六环逐一判定，区分「真实（非 demo）案件」与「demo 案件」两条轨道。

### 1.1 案件根目录——真实案件：0/6，彻底断裂

- `apps/desktop/src/case/NewCaseDialog.tsx:60-67`：目录选择用 `<input type="file" webkitdirectory>`。
- `apps/desktop/src/case/NewCaseDialog.tsx:28-36`（`handleFolderChange`）：只从 `webkitRelativePath` 里 `split('/')[0]` 取出一个**字符串**当案件名建议，选中的 `File[]` 对象本身连同其字节都没有被继续传递——`onCreate` 回调只收到 `{ title, fileCount }`（见其 `interface NewCaseDialogProps`，`NewCaseDialog.tsx:6`），从类型签名上就已经不携带文件内容或路径。
- `apps/desktop/src/App.tsx:926-954`（`createCase`）：形参类型 `{ title: string; fileCount: number; kind?: ContainerKind }`——**函数签名本身没有 `folderPath` 参数位**；`App.tsx:943` 硬编码 `folderPath: undefined`。
- `apps/desktop/src/case/case-scope.ts:26-30`（`resolveCaseRoot`）：`if (active.folderPath) return active.folderPath;` → 非 demo 且无 `folderPath` 时返回 `undefined`（`case-scope.ts:29`），**不回落 demo 根**（`case-scope.ts:83` 的审计清单明确标注这是「死路由（已修）」）。

判定：**契约与 roadmap 冲突**。这不是「实现漏了一步」，是 UI 组件与状态更新函数的类型签名从根上就没有为真实路径流出预留位置；`resolveCaseRoot` 的 fail-closed 行为本身是对的（不静默借用 demo 数据），但代价是真实案件永远拿不到 `caseRoot`，后续任何依赖 `caseRoot` 的功能（哈希、写产出、S3 门禁编译，见 1.5 与 §6）对真实案件全部不可达。⚠ 已有独立调研 `docs/research/host-file-authorization.md` 得出完全一致的结论（该文档第 7.1 节），本报告独立复核代码后确认属实，非转引文档结论。

### 1.2 文件读取——两条并行的「真」，都不落地为案件材料

- **Composer 单文件附件路径（真实可用，但与案件材料脱钩）**：`apps/desktop/src/composer/Composer.tsx:69-72`（`readFileBytes`）用浏览器原生 `File.arrayBuffer()` 读字节，这条路径不依赖绝对宿主路径、技术上真实可用。`ingestFiles`（`Composer.tsx:147-170`）把字节送进 `convertToReadingView`。
- **但**：`apps/desktop/src/composer/process-upload.ts:19-22` 的函数级注释原话——「调用 reading-view 转换并把结果折叠为 chip 状态。**不在此写入卷宗、不发 SessionEvent——壳只呈现 outcome。**」`ComposerAttachment`（`apps/desktop/src/composer/types.ts:34-44`）只是纯 React `useState` 内的临时对象，无持久化字段；「存入卷宗」按钮（`Composer.tsx:205-214`、`216-224`）只把本地状态 `scope` 字段从 `'message_only'` 改成 `'dossier'`，不产生任何宿主写入或 `SessionEvent`。
- **demo-runtime CLI 路径（真实，但吃固定语料非用户输入）**：`packages/demo-runtime/src/composition/demo-assembly.ts:153-176`（`loadDemoS3Materials`）用 `node:fs` 的 `readFileSync` 读取硬编码路径（`DEMO_DOCX_PATH`/`DEMO_CREDIT_MD_PATH`，`demo-assembly.ts:153-154`，均指向 `packages/demo-data` 或 `packages/output/test/fixtures`）。

判定：Composer 单文件读取本身 = **契约已定+代码已实现**（技术可用）；但它到「案件材料」之间没有契约，是 **无契约无实现**（没有 `MaterialRef` 落地这一步，注释明确写了不做）。

### 1.3 哈希——只有一处是真 SHA-256，且只在 demo-runtime 里跑

- `packages/demo-runtime/src/composition/demo-assembly.ts:116`：`createHash('sha256').update(sourceBytes).digest('hex')`——真 SHA-256，但只在 `materialFromReadingView`（CLI/测试专用装配函数）内出现。
- 唯一在「宿主文件操作」语境下存在的哈希实现是 `packages/tools/src/file-ops-host.ts:25-33`（`hashBytes`）：**FNV-1a 64-bit 校验和**，非密码学哈希，函数本身命名与语义都不是为举证设计的（用于移动前后快速比对漂移）。
- 但 schema 注释承诺的是 SHA-256：`packages/legal/src/schemas/case-file.ts:23`（`内容哈希（如 sha256 hex）`）、`packages/schemas/src/file-ops-plan.ts:32`（`执行前内容哈希（sha256 hex）`）——**注释承诺与目前唯一可复用的宿主哈希实现不是同一算法**，这是需要在 MATERIAL-INGRESS-1 前拍板统一的契约漂移（`docs/research/host-file-authorization.md` 第 6.3/8.1 节已独立发现同一问题）。

判定：**契约已定+代码未实现**（对「案件材料举证哈希」这个具体用途而言）；已存在的 `hashBytes` 是另一用途的另一算法，不能直接复用。

### 1.4 阅读视图生成——全链路里做得最扎实的一环，真实且诚实

详见 §2。判定：**契约已定+代码已实现**，且经过充分测试（`packages/reading-view` 136 例，见其 SPEC 验收记录）。

### 1.5 SourceAnchor 铸造——真实、逻辑扎实，但只在 demo-runtime 语境被调用过

- `packages/core/src/citation/resolver.ts:55-93`（`resolveClaim`）：候选块内做精确子串匹配；`hits.length === 0` → `not_found`（`resolver.ts:71-72`）；`hits.length > 1` → `ambiguous`（`resolver.ts:74-76`，**拒收歧义**，题目关注点）；命中后还有一次「终验等式」——把铸出的坐标切回文本层，要求逐字等于引语（`resolver.ts:81`）才真正出锚——这是双重防线，不是文档自称。
- 但 `resolveClaim`/`resolveDraftArtifact` 的调用点全部在 `packages/core/src/scenario-executor/executor.ts`（`layersFromMaterials`，`executor.ts:177,361`）内部，而 `executor.ts` 本身只被 `packages/demo-runtime`（CLI 脚本、测试）与桌面应用编译期机器门**禁止**直接调用（见 1.6）。

判定：**契约已定+代码已实现**，但可达性受限——这是「代码对，但没人在真实场景下调用它」的典型状态。

### 1.6 进入 scenario 输入——真实类型、真实消费，桌面应用被机器门挡在门外

- `packages/core/src/scenario-executor/executor.ts:72-77`：

  ```ts
  export interface ScenarioRunInput {
    inputArtifacts: Partial<Record<string, unknown>>;
    toolInputs: Record<string, unknown>;
    materials?: MaterialInput[];
  }
  ```

  `runScenario`（`executor.ts:502-506`）真消费 `input.materials ?? []`（`executor.ts:518`），并向下传递到 `layersFromMaterials`（`executor.ts:361`）与会话语料段组装（`packages/core/src/assembly/segments.ts:126-135`）。这条内部管线是真的。
- 但桌面应用侧：`apps/desktop/scripts/assert-work-port-contracts.mjs:32` 用机器门**禁止** `App.tsx` 出现 `scenario-executor|ScenarioRunInput|inputArtifacts|toolInputs` 字样——`forbidMatch(app, /scenario-executor|ScenarioRunInput|inputArtifacts|toolInputs/, 'React must not construct executor inputs')`。这是 ADR-010「决定一」的字面落地，当前阶段故意不让 React 碰这一层。
- `apps/desktop/src/protocol/client.ts:51-57` 声明的 `StartWorkCommand`（含 `materialRefs: string[]`）与 `ScenarioRunInput` 是两个**不同**的类型，中间需要一层「受信 composition binding」翻译（ADR-010 原文见 `docs/decisions/ADR-010-work-live-boundaries.md:102`），这层翻译代码不存在（详见 §3）。

判定：`ScenarioRunInput` 本身 = **契约已定+代码已实现**（在 core 内部真消费）；`StartWorkCommand → ScenarioRunInput` 的翻译层 = **无契约无实现**。

### 1.7 桌面应用运行时实际发生的事——回放录像带

- `apps/desktop/src/main.tsx:10,18-31`：唯一装配点，`const demoWorkFixture = createDemoWorkFixture();` 直接注入 `workProjection={demoWorkFixture.projection}`。
- `apps/desktop/src/demo/client.ts:75-88`（`createDemoWorkFixture`）：函数级注释——「Explicit demo-only composition. **No production command implementation lives here.**」返回值只有 `WorkProjectionPort.replay()`，没有任何 `WorkCommandPort`（`start`/`resume`/`cancel`）的生产实现。
- `apps/desktop/src/demo/client.ts:41-47`（`assertDemoRef`）：`caseId !== DEMO_CASE_ID` 或找不到录像 → 直接 `throw`——非 demo case 连尝试回放都会报错，不会静默展示空内容（这一点是对的，`case-scope.ts` 审计清单 `CASE_SCOPE_AUDIT` 第 2 条也标注为「死路由」，即非 demo 时零调用）。
- `apps/desktop/src/demo/recordings.ts:1-6`：`S1_RECORDING`/`S3_RECORDING` 直接 `import` 静态 JSON（`packages/demo-data/data/artifacts/*.json`），是提前算好、冻结成字面量的「录像带」，不是运行时执行。
- **物理隔离证据**（本报告本轮独立验证到的最强证据）：`packages/demo-runtime/src/package-boundary.test.ts:98-109`：

  ```ts
  it('is the one-way development composition root and is not imported by core or desktop', () => {
    const graph = courtworkGraph();
    expect(graph.get('@courtwork/demo-runtime')).toEqual(expect.arrayContaining([
      '@courtwork/core', '@courtwork/demo-data', '@courtwork/legal',
      '@courtwork/output', '@courtwork/reading-view',
    ]));
    expect(graph.get('@courtwork/core')).not.toContain('@courtwork/demo-runtime');
    expect(graph.get('@courtwork/desktop')).not.toContain('@courtwork/demo-runtime');
  });
  ```

  （`apps/desktop/package.json:2` 确认包名即为 `@courtwork/desktop`。）这条测试机器保证了：唯一真正跑通「哈希→阅读视图→锚点铸造→scenario 执行」全链路的代码（`demo-assembly.ts`）**不可能**被桌面应用引用——不是「目前没连」，是「连了会被这条测试打回」。

判定：**仅 demo/fixture 成立**，且是「仅 CLI/测试可达」的更严格版本。

### 1.8 demo-data / demo-runtime 的物理边界

- `packages/demo-data`（259 行，src 非测试代码：`party-corpus.ts` 62 + `citation-corpus.ts` 129 + `index.ts` 3 + `pm-fixtures.ts` 65，bash 实数核对）是**纯数据/查表**包：结构化虚构语料（当事人库、引用库）+ `data/` 目录下的原始文件（20 份 dossier md、`main-contract.md`、`设备采购合同.{pdf,docx}`、`artifacts/*.json` 预铸产物）。
- `packages/demo-runtime`（1,196 行 = `src` 非测试 1,062 + `scripts` 134，bash 实数核对，与题目给出的数字一致）是**唯一装配点**：`demo-assembly.ts:66-70` 注释原话——「装配点（composition root）：全仓库运行时代码中唯一允许 import `@courtwork/demo-data` 与 `@courtwork/legal` 的绑定层……真实数据接入 = 换这一个文件的 wiring，其余板块零改动。」
- 物理边界 = `packages/demo-runtime/src/package-boundary.test.ts` 这一张机器测试；边界的实际形状是**依赖图单向**（`demo-runtime` 可以依赖 `core`/`legal`/`demo-data`，但反向禁止），而不是运行时权限隔离——也就是说，只要有人在 `apps/desktop` 里手写代码直接 `import` `@courtwork/demo-data`（跳过 `demo-runtime`），这条测试是拦不住的，只挡「依赖 `demo-runtime` 本身」这一种越界方式。⚠（推断：本报告未逐一排查 `apps/desktop` 是否已有直接 `import @courtwork/demo-data` 的口子——`App.tsx:99` 的 `contractSourceMd` 正是这样一个口子，见 §6，只是它绕开的是 `demo-runtime` 而不是 `demo-data` 本身，两者边界不是同一件事，`docs/status/current.md` 的「已成立」清单也未对此做区分。）

---

## 2. `packages/reading-view` 的真实覆盖面

### 2.1 支持格式（`packages/reading-view/src/convert.ts:53-75`，格式分发表）

| 格式 | 实现 | 文本层来源 |
|---|---|---|
| docx | 手写 `fflate`+`@xmldom/xmldom` 遍历 `word/document.xml`（`docx/docx-to-markdown.ts`） | 按文档序线性化段落纯文本 |
| md | `unified`+`remark-parse`+`remark-gfm` | AST `position.start/end.offset` |
| txt | 空行分块 | 原始字符串直接切片 |
| pdf | `pdfjs-dist` 逐页 `getTextContent()` | 该页文本层（**仅限已有文本层的 PDF**） |
| jpg/png | **直接短路，不进入解析** | 无——`convert.ts:55-57` 扩展名命中即返回 `needs_ocr` |

### 2.2「文本层 PDF」的实现细节

`packages/reading-view/src/pdf/pdf-to-reading-view.ts:33-51`：逐页调用 `page.getTextContent()`，拼出 `pageText`；`pageText.trim().length === 0` 的页直接 `continue`（跳过，不计入产出，`pdf-to-reading-view.ts:37`）；`hasAnyText` 标记全篇是否至少一页有文本。

### 2.3 扫描件 PDF（无文本层）今天的真实行为——报错？空返回？假装成功？

**都不是。是显式、可读的三态之一，`needs_ocr`。**

`packages/reading-view/src/pdf/pdf-to-reading-view.ts:53-55`：

```ts
if (!hasAnyText) {
  return { status: 'needs_ocr', fileId: input.fileId, fileName: input.fileName, detail: '全部页面均无可提取文本层' };
}
```

这不是 `throw`，不是返回空 `ReadingView`，也不是把 `ok` 状态伪造出来——是一个独立的、类型系统强制处理的第三态（`packages/reading-view/src/types.ts:26-29`，`ReadingViewOutcome` 是 `'ok' | 'needs_ocr' | 'disabled'` 的判别式联合）。桌面侧消费（`apps/desktop/src/composer/outcome-copy.ts:10-15`）把它映射成具体办案语言：

```ts
if (outcome.status === 'needs_ocr') {
  return { message: '这份文件需要文字识别 · 当前请上传可选中文字的 PDF 或 Word', retryable: false };
}
```

`retryable: false` 是诚实的——因为真的没有 OCR 能力可以重试。`packages/reading-view/SPEC.md:7` 原话：「OCR（扫描件/无文本层）不在范围内，是 W3/W8 ingest v1 的职责；本包对这类输入只负责准确声明"需要 OCR"，不吐半坏的 md，不静默出空文。」代码与 SPEC 承诺一致。

**对照核心不变量「静默降级零容忍」：这一环是全审查范围内少数完全合规的实现**——不虚报成功、不吞异常、不返回空结果冒充"处理完了"。

### 2.4 但这个诚实拒绝的下游是一条死路

全仓 grep `needs_ocr`（28 个命中文件）里，没有任何一处存在「OCR 完成后把 `needs_ocr` 重新提交变成 `ok`」的回路代码——命中的都是：类型声明（`ingest-status.ts:13`）、UI 文案映射（`outcome-copy.ts`）、`reading-view` 自身测试、SPEC/ACCEPTANCE 文档。因为 `services/ingest` = 0 行（见 §5），`needs_ocr` 在今天的系统里是一个**没有出口的终态**。

判定：`packages/reading-view` 对扫描件的处理本身 = **契约已定+代码已实现**（且质量过关，忠实执行「拒收不猜」）；但「扫描件卷宗最终能被读」这件事（产品滩头假设的字面要求）整体 = **契约已定+代码未实现**——因为唯一能把 `needs_ocr` 变回 `ok` 的生产方是空的。

---

## 3. 材料存储抽象是否存在

全仓 grep 结果（`.ts`/`.tsx`，含文档）：

| 符号 | 命中位置 | 判定 |
|---|---|---|
| `MaterialStore` | 仅 `docs/decisions/ADR-010-work-live-boundaries.md:102` 一处散文提及（"`ScenarioRunInput` 只能由受信 composition binding 依据已准入 package 与 MaterialStore 构造"），**代码零命中，连类型声明都没有** | **无契约无实现** |
| `MaterialRef` | 类型形状定义于 `docs/decisions/ADR-010-work-live-boundaries.md:210-221`（`materialId`/`caseId`/`fileName`/`mediaType`/`byteLength`/`contentSha256`/`readingViewVersion`/`readingViewSha256`/`status`），代码零实现、零构造 | **契约已定+代码未实现** |
| `materialRefs`（字段） | 仅 `apps/desktop/src/protocol/client.ts:55`（`StartWorkCommand.materialRefs: string[]`，镜像 ADR-010:43 的类型声明），全仓 `.tsx` 零命中，`.ts` 也只有这一处**声明**，从未被任何代码以非空值**构造**过 | **契约已定+代码未实现** |

### 3.1 `StartWorkCommand` 与 `ScenarioRunInput` 是怎么被构造的

- `StartWorkCommand`（`apps/desktop/src/protocol/client.ts:51-57`）：全仓搜索，除类型声明本身外，没有任何 `: StartWorkCommand = {...}` 或等价字面量构造——它是一个**从未被实例化过的类型**。`apps/desktop/scripts/assert-work-port-contracts.mjs:29` 只机器验证这个接口"存在声明"，不验证"有人构造它"。
- `ScenarioRunInput`（`packages/core/src/scenario-executor/executor.ts:72-77`）：在 `packages/demo-runtime` 的 CLI 脚本（如 `acceptance/run-s3-demo.ts`）与测试（`acceptance/s3-flow.integration.test.ts` 等）里被真实构造，但走的字段是 `materials: MaterialInput[]`（内容型：sha256、reading markdown、文本层块），**不是** `materialRefs: string[]`（引用型：opaque id）。

**这两个类型之间存在一层「资格转换」——把 UI 提交的 opaque id 数组解析成真实内容数组——这层代码今天完全不存在**（ADR-010:102 点名它该由「受信 composition binding 依据……MaterialStore 构造」，但 composition binding 与 MaterialStore 都是空的）。

### 3.2 `materialRefs: string[]` 是路径、是 id、还是别的

**按契约文本（ADR-010 决定四原文，`docs/decisions/ADR-010-work-live-boundaries.md:223`）：「Tauri folder/file picker 返回 opaque case/material id；绝对路径和授权只住 host。」——明确设计为不透明 id，不是路径。**

这是好设计（源无关），有两处间接佐证：
1. `MaterialRef` 类型（ADR-010:210-221）里没有 `filePath`/`hostPath` 字段，只有 `fileName`（展示用文件名）+ `mediaType` + 哈希 + 状态——形状上不预设"这东西一定活在文件系统里"。
2. `apps/desktop/src/protocol/client.ts:55` 的字段类型是 `string[]`，没有任何路径分隔符假设。

但**因为完全没有实现，这只是纸面意图，无法用代码验证实际行为**。而且已有的唯一 host 抽象——`packages/tools/src/file-ops-host.ts:8-22`（`FileOpsHost`）——全部方法都以 `path: string` 为参数（`exists(path)`、`readFile(path)`、`hash(path)`，见 `file-ops-host.ts:9,11,21`），是彻头彻尾的路径中心接口。如果 `MATERIAL-INGRESS-1` 顺手复用/参照这个已有接口的形状去实现 `MaterialStore`，"id 优先"的契约意图会在实现层被悄悄退化成"path 优先"——这正是题目关注的风险，且有真实代码倾向性作为佐证，不是凭空担心。

---

## 4. 邮件源适配器要接进来，今天要改什么

### 4.1 现状：零代码

全仓 `packages/**` grep `email|IMAP|imap|Graph API|邮件|附件`（排除误命中）——**零个生产代码命中**。唯一涉及"邮件"的产品代码是一条**禁用态 UI 提示**：

`apps/desktop/src/settings/data-promise-copy.ts:63`：
```ts
email: reservedTooltip('Email', 'send exported files with your default mail app'),
```

即：今天"邮件"在产品里只是设置页一个置灰按钮的 tooltip，文案是"暂不支持，请用你的邮件客户端手动发送导出文件"——是反向功能（从 Courtwork 导出发邮件），不是摄取方向，且是禁用态。

判定：**无契约无实现**。

### 4.2 `materialRefs: string[]` 能不能承载"一封邮件的一个附件"

**形状上能。** 因为它是 opaque string，语义上完全可以是类似 `"email:account-abc:msg-123:attachment-0"` 的合成 id——不需要修改 `StartWorkCommand.materialRefs` 这个字段的类型。

**但下游 `MaterialRef`（ADR-010:210-221）今天的字段集缺一样东西：来源溯源（provenance/origin）。** 现有字段——`materialId`/`caseId`/`fileName`/`mediaType`/`byteLength`/`contentSha256`/`readingViewVersion`/`readingViewSha256`/`status`——无法回答"这份材料到底来自哪封邮件、哪个发件人、什么时间"。而 roadmap 对邮件接入的明确要求是"插件侧只做'一键归档进案件'按钮，不做静默摄取（留人确认纪律）"（`archive/docs-legacy-2026-07-13/docs/04-长期Roadmap.md:15`）——留人确认这一步，大概率需要在确认弹窗里向用户展示"这是从哪封邮件归档的"，今天的 `MaterialRef` 形状没有为此留位置。

### 4.3 现在改 vs Stage 1 再改的代价

**现在改（低成本）**：
- 给 `MaterialRef` 加一个判别式 `origin` 字段（例如 `{ kind: 'host_file' } | { kind: 'chat_upload' } | { kind: 'email'; accountRef: string; messageId: string; attachmentIndex: number }`）——因为目前零实现，改类型零迁移成本，纯粹是"现在把坑占上"。
- 把 `MaterialStore` 的写入方法设计成统一的 `put(caseId, bytes, meta)`（字节优先），而不是 `registerPath(path)`（路径优先）——让 `CASE-ROOT-1` 的本地文件也走"host 读字节→统一 put"这一条路径，不给文件系统开语义特权。

**Stage 1 才改（高成本，⚠ 推断，方向性判断而非精确代码验证）**：
如果 `MATERIAL-INGRESS-1` 先把 `MaterialStore` 焊死成"host id → 本地路径 → `FileOpsHost.readFile(path)`"（即内部即等价于 `packages/tools/src/file-ops-host.ts` 现有的路径中心模式，见 §3.2），那么：
- 已落库的 `MaterialRef` 记录里如果隐含了"必然对应一个本地路径"的假设（哪怕类型上没写，实现上默认了），迁移到"字节来自网络下载、无本地路径"的邮件场景需要重新设计存储层，而不是加一个 adapter；
- 下游任何已经"顺手"依赖 `caseRoot` 拼路径读材料的代码（例如 `apps/desktop/src/App.tsx:906` 的 `if (!caseRoot || !riskList) throw ...`，`caseOutputClient.writeDocx(caseRoot, ...)` 一类写法，见 §6）会进一步固化"案件 = 一个文件系统目录"这个假设，届时要打的补丁数量正比于这类调用点的数量；
- 大概率需要出第二份 ADR 修订 `MaterialRef`/`MaterialStore` 的形状，而不是在现有形状上做加法——这是架构级返工，不是"加一个 adapter"量级的工作。

**结论**：真正决定「现在改」还是「Stage 1 再改」代价差多少的，不是 `materialRefs: string[]` 这个 UI 层契约（它已经是对的、id 优先的设计），而是 `MaterialStore` 内部实现今天要不要顺手继承 `FileOpsHost` 的路径中心思维——这是 `MATERIAL-INGRESS-1` 开工前唯一需要提前拍板、且现在改代价明显低于以后改的点。

---

## 5. `services/ingest` 的 HTTP + 进度事件流边界

### 5.1 Python 侧：0 行

`find services/ingest -type f` 只返回一个文件：`services/ingest/SPEC.md`。`services/ingest/SPEC.md:3`——「状态：W3 spike 未开工（最高优先级，结论决定 S1 滩头假设是否成立）」。没有 `pyproject.toml`、没有 `src/`、没有任何 `.py` 文件。

### 5.2 TS 侧：同样 0

全仓 grep `services/ingest|ingest-client|IngestClient|ingestClient|progress_event|progressEvent|IngestProgress|ingest_progress|队列化批处理|进度事件流`——**命中的 16 个文件全部是 `.md` 文档**（`docs/`、各包 `SPEC.md`/`ACCEPTANCE.md`、`archive/`、`README.md`、`CLAUDE.md`），**零个 `.ts`/`.tsx` 命中**。

这意味着：
- 没有 HTTP client 桩代码（哪怕是一个空函数签名）；
- 没有为"HTTP API 请求/响应形状"定义过 TS 类型；
- 没有为"进度事件流"定义过专门的事件类型——`packages/core` 里已有的 `progress`/`SessionEvent` 是 Turn/Work 通用进度机制（`apps/desktop/src/protocol/client.ts` 的 `SessionEvent` 家族），与 `services/ingest/SPEC.md:17` 说的"队列化批处理 + 进度事件流（右栏进度 UI 的数据源）"是两回事，后者目前没有任何独立类型痕迹。

### 5.3 唯一存在的"接缝"：输出侧 JSON Schema 契约（已就绪，等米下锅）

`services/ingest/SPEC.md:32` 的 TODO 提到"`packages/schemas` 导出的 JSON Schema 位于 `packages/schemas/json-schema/*.schema.json`（`CaseFile.schema.json` / `Timeline.schema.json` / `PartyGraph.schema.json` 等，共 7 个文件）"——**本次核实发现这个路径描述已经过时（⚠ 属推断，未深究何时漂移）**：实际上 `CaseFile.schema.json`、`Timeline.schema.json`、`PartyGraph.schema.json` 三个文件今天位于 `packages/legal/json-schema/`，而不是 `packages/schemas/json-schema/`（后者存在但内容是 `SourceAnchor`/`RevisionEvent`/`FileOpsPlan` 等领域无关 schema，见证据附录 8.6）。这属于 SPEC.md 自身文档漂移（大概率是包重整后没跟着更新引用路径），不是本报告的核心发现，但如实记录，因为按 CLAUDE.md「契约先行」纪律，这也是一种需要清理的漂移。

这三份 JSON Schema 本身是真实存在、由 `packages/legal` 的 zod 定义自动生成、且被 `packages/legal` 自身测试消费的——**这部分"目标契约"是准备好的**，只是产生数据的一方（Python 服务）和消费数据的一方之间的**传输层**（HTTP 请求/响应形状、认证、进度事件、TS 侧 client）完全没有设计过，不是"设计了没实现"，是"连形状草稿都没有"。

判定：
- "output JSON Schema 契约" = **契约已定+代码已实现**（但仅覆盖 §W1 TODO 所述的结构性校验，不含 `SourceAnchor` 跨字段规则，`services/ingest/SPEC.md:32-33` 已如实记录这个已知缺口，要求 W8 阶段在 Python 侧等效实现）；
- "HTTP API 形状"与"进度事件流形状" = **无契约无实现**。

---

## 6. 扫描件这条路的战略暴露——如果 ingest 永远不落地，产品还剩什么

诚实回答，不粉饰。逐条对照 `docs/product/vision.md:34-41` 的六条 MVP 衡量标准：

| # | vision.md 原文 | 代码现状 | 判定 |
|---|---|---|---|
| 1 | 安全摄取并生成阅读视图 | `reading-view` 包本身真实、测试充分（§2）；但真实案件在"案件根目录"这一步就已断裂（§1.1），扫描件卷宗在 reading-view 层被诚实拒收且无 OCR 回路出口（§2.4） | 仅 demo/fixture 成立 |
| 2 | 模型按场景声明推理 | `executor.ts`+ S1/S3 场景声明真实、测试充分；但桌面运行时从未调用过 `runScenario`（§1.6-1.7，机器门物理隔绝） | 仅 demo/fixture 成立 |
| 3 | 系统为引语铸造坐标并拒收歧义 | `resolver.ts` 逻辑扎实、双重防线（§1.5）；同样只在 `demo-runtime` 语境被调用过 | 仅 demo/fixture 成立 |
| 4 | 产出通过 schema 与确认门禁 | schema 校验、`ConfirmationStore` 是真代码；但门禁投影今天硬编码在 `apps/desktop/src/demo/client.ts:16-29`（`GATES` 常量），ADR-010 决定五（`docs/decisions/ADR-010-work-live-boundaries.md:229-244`）明确把"非 demo 真实门禁投影"列为待办 `LEGAL-S3-BINDING-1`，尚未开工（`docs/status/current.md:64-66` 的优先序排在 `MATERIAL-INGRESS-1` 之后） | 仅 demo/fixture 成立 |
| 5 | 用户修正被记录并投影到续行上下文 | `RevisionEvent`/`revision-store.ts` 真实存在于 `packages/core`；但同样卡在"Work live 未装配"，`docs/status/current.md:49`（架构债①）原话——「`WorkCommandPort` 契约与 projection 注入缝已经成立，但生产实现仍未装配」 | 仅 demo/fixture 成立 |
| 6 | 正式文书可安全编译或修订为 docx | `packages/output` 编译器接口真实存在（`compileConfirmedReviewToDocx`，`App.tsx:907` 调用）；但触发它的唯一 UI 路径被硬编码早退：`apps/desktop/src/App.tsx:893`——`if (!requestId \|\| !selectedCaseId \|\| !flow \|\| !isDemoCaseId(selectedCaseId)) return;`——**非 demo 案件连尝试执行这段代码都不会发生**，不是"执行了但失败"，是根本不会进入。且该路径的源文件写死引用 demo 语料：`App.tsx:99`（`import contractSourceMd from '../../../packages/demo-data/data/dossier/04-设备采购合同.md?raw'`）、`App.tsx:910`（`sourceMarkdown: contractSourceMd`）——ADR-010 背景部分（`docs/decisions/ADR-010-work-live-boundaries.md:18`）已经点名这是需要解决的风险（"当前确认后 docx 编译仍引用 demo 原文，直接接真实 RiskList 会造成跨案件串料"），当前的"解决方式"是把整条路径锁死在 demo case，而不是让真实案件安全跑通 | 仅 demo/fixture 成立 |

**六条，今天无一条对真实材料成立。** 不是"部分成立、还差临门一脚"，是链条在进入第一环（案件根目录）时就已经断裂——后面五条无论测试覆盖多充分、逻辑多严谨，因为物理不可达（`package-boundary.test.ts:98-109` 的机器断言 + `assert-work-port-contracts.mjs` 的机器断言双重锁死），对任何真实用户材料而言等同于不存在。

**如果 `services/ingest` 永远不落地，产品还剩什么：** 一台已经被证明"算法核心不说谎"的引擎——阅读视图转换对不支持的输入诚实拒收、引用坐标 resolver 对歧义引语诚实拒收、六段组装与执行器状态机测试充分——但这台引擎今天只能靠开发者在自己电脑上跑 CLI 脚本、喂虚构的"临江精铸诉起云智能"案卷才能验证它真的转得动。没有一条从真实律师的真实文件（无论是排文本层的电子合同,还是——占绝大多数的——盖了章、手写批注、多次复印的扫描卷宗)到这台引擎的通路。产品目前的"安全摄取"承诺，字面意义上还没有一个可以被非开发者用户触达的入口。

---

## 7. `MATERIAL-INGRESS-1` 开工前必须先定的契约（具体到类型形状）

基于 §1-6 的证据，以下三处需要在动工前拍板，理由是"现在改 vs 事后改"的成本差在代码层面已经可以预判：

### 7.1 `MaterialRef` 补一个来源判别式字段（对应 §4.2 的空缺）

ADR-010 现有形状（`docs/decisions/ADR-010-work-live-boundaries.md:210-221`）保留，追加 `origin`：

```ts
type MaterialOrigin =
  | { kind: 'host_file'; sourceId: string }   // CASE-ROOT-1 授权来源返回的 opaque host 源 id，不含绝对路径
  | { kind: 'chat_upload' }                   // Composer 附件 → 存入卷宗
  | { kind: 'email'; adapterId: 'imap' | 'graph'; accountRef: string; messageId: string; attachmentIndex: number }; // Stage 1 占位

type MaterialRef = {
  materialId: string;
  caseId: string;
  fileName: string;
  mediaType: string;
  byteLength: number;
  contentSha256: string;      // 见 7.3，必须是真 SHA-256，不得复用 FileOpsHost.hashBytes
  readingViewVersion: string;
  readingViewSha256: string;
  status: 'ready' | 'needs_ocr' | 'rejected';
  origin: MaterialOrigin;     // 新增：MaterialInput/prompt 不需要它，但确认弹窗与审计需要
  ingestedAt: string;
};
```

不加这个字段不会立刻报错，但会让"留人确认"弹窗（roadmap Stage 1 邮件接入的强制要求）无源可示，事后加需要迁移所有已落库记录。

### 7.2 `MaterialStore` 接口现在必须先定（今天连类型声明都没有）

```ts
interface MaterialStore {
  put(caseId: string, bytes: Uint8Array, meta: { fileName: string; mediaType: string; origin: MaterialOrigin }): Promise<MaterialRef>;
  get(caseId: string, materialId: string): Promise<{ found: true; ref: MaterialRef; bytes: Uint8Array } | { found: false }>;
  resolveRefs(caseId: string, materialRefs: string[]): Promise<{ ok: true; materials: MaterialInput[] } | { ok: false; reason: string }>;
}
```

`resolveRefs` 是 `StartWorkCommand.materialRefs: string[]`（§3 已确认的 opaque id 数组）与 `ScenarioRunInput.materials: MaterialInput[]`（§1.6 已确认的执行器真实消费类型）之间唯一允许存在的翻译层。**关键纪律：`put` 方法必须以 `bytes` 为第一等输入，不得设计成 `registerPath(path)`**——这是防止"path-first"在实现层复辟的具体手段（对应 §3.2、§4.3 的风险）。本地文件、chat 附件、未来的邮件附件都先在 host 侧被读成字节，再统一走 `put`，路径只活在 `host_file` 这一种 `origin` 变体的 `sourceId` 解析细节里，不上升为存储层的公共接口形状。

### 7.3 哈希算法现在必须统一（对应 §1.3）

`MaterialRef.contentSha256` 与 `readingViewSha256` 必须使用真密码学 SHA-256（demo-runtime 已有先例：`demo-assembly.ts:116` 的 `createHash('sha256')`；桌面壳的浏览器/browser-safe 版本对应 Web Crypto `crypto.subtle.digest('SHA-256', ...)`），**不得复用** `packages/tools/src/file-ops-host.ts:25-33` 的 `hashBytes()`（FNV-1a，另一用途另一算法）。同时需要回头修正 `packages/legal/src/schemas/case-file.ts:23` 与 `packages/schemas/src/file-ops-plan.ts:32` 的字段注释，使其准确描述"这是哪种哈希、供什么举证强度使用"，不与 `FileOpsHost` 的漂移校验和共用"哈希"这个模糊说法。

### 7.4 `CaseRootHost.authorizeSource` 的 `kind` 枚举现在占位

若采纳 `docs/research/host-file-authorization.md` 第 5.3 节建议的 `CaseRootHost.authorizeSource(kind: 'case-root' | 'inbox-source')` 形状，`inbox-source` 这个变体今天就该出现在类型里（哪怕实现推迟到 Stage 1），避免 Stage 1 邮件接入时还要回头改一个"以为只服务本地目录"的枚举。

---

## 8. 证据附录（本次审查引用的全部 `文件:行号`）

**产品/架构文档**
- `docs/product/vision.md:7`（一句话定位）、`:34-41`（MVP 六条标准）
- `docs/decisions/ADR-010-work-live-boundaries.md:39-45`（`StartWorkCommand`）、`:102`（`MaterialStore` 唯一提及）、`:207-227`（决定四 `MaterialRef`）、`:229-244`（决定五 `LEGAL-S3-BINDING-1`）、`:246-264`（工单依赖图）
- `docs/status/current.md:14`（"已成立"清单含"文本层 PDF"）、`:49`（架构债①）、`:52`（架构债④，`services/ingest` 仍只有规格）、`:64-66`（下一阶段优先序）
- `docs/research/host-file-authorization.md`（全篇独立调研，本报告§1.1、§3.2、§7.3-7.4 复核并引用其结论）
- `archive/docs-legacy-2026-07-13/docs/04-长期Roadmap.md:15`（Stage 1 邮件接入）、`:30`（Stage 2 机构知识沉淀）
- `services/ingest/SPEC.md:1,3`（状态：W3 spike 未开工）、`:17`（HTTP API+队列化+进度事件流）、`:32-33`（JSON Schema TODO，路径描述与实际不符）

**材料链——案件根目录**
- `apps/desktop/src/case/NewCaseDialog.tsx:6,28-36,60-67`
- `apps/desktop/src/App.tsx:926-954,943`
- `apps/desktop/src/case/case-scope.ts:19,26-30,81-84`

**材料链——文件读取/Composer**
- `apps/desktop/src/composer/Composer.tsx:69-72,147-170,205-224`
- `apps/desktop/src/composer/process-upload.ts:19-22`
- `apps/desktop/src/composer/types.ts:34-44`
- `apps/desktop/src/composer/outcome-copy.ts:10-15`
- `packages/schemas/src/ingest-status.ts:8-13`

**reading-view**
- `packages/reading-view/src/pdf/pdf-to-reading-view.ts:9-66`（全函数，关键：33-55）
- `packages/reading-view/src/convert.ts:53-75,77-98`
- `packages/reading-view/src/types.ts:18-31`
- `packages/reading-view/SPEC.md:7,63`

**core——执行器/引用 resolver/组装**
- `packages/core/src/scenario-executor/executor.ts:72-77,177,361,502-506,518`
- `packages/core/src/citation/resolver.ts:54-93`
- `packages/core/src/assembly/segments.ts:98-116,119-135`

**demo-runtime——唯一装配点与物理隔离**
- `packages/demo-runtime/src/composition/demo-assembly.ts:66-70,106-127,153-176`
- `packages/demo-runtime/src/package-boundary.test.ts:98-109`

**桌面应用——Work 回放边界**
- `apps/desktop/src/protocol/client.ts:51-57,55`
- `apps/desktop/scripts/assert-work-port-contracts.mjs:22-32`
- `apps/desktop/src/main.tsx:10,18-31`
- `apps/desktop/src/demo/client.ts:41-47,75-88`
- `apps/desktop/src/demo/recordings.ts:1-6,20`
- `apps/desktop/src/App.tsx:99,893,906-914,910,1799`
- `apps/desktop/package.json:2`

**哈希/host 抽象**
- `packages/tools/src/file-ops-host.ts:8-22,25-33`
- `packages/legal/src/schemas/case-file.ts:23,25`
- `packages/schemas/src/file-ops-plan.ts:32,33,35`

**邮件/触发器**
- `apps/desktop/src/settings/data-promise-copy.ts:63`
- `packages/registry/src/package-manifest.ts:61-69`

**JSON Schema 落地位置**
- `packages/legal/json-schema/CaseFile.schema.json`、`Timeline.schema.json`、`PartyGraph.schema.json`（存在，路径与 `services/ingest/SPEC.md:32` 描述的 `packages/schemas/json-schema/` 不符）
- `packages/schemas/json-schema/`（存在但内容为 `SourceAnchor`/`RevisionEvent`/`FileOpsPlan` 等领域无关 schema，不含 CaseFile/Timeline/PartyGraph）

**行数核实（bash 实数，非估算）**
- `services/ingest`：`find services/ingest -type f` 仅返回 `SPEC.md`，生产代码 0 行
- `packages/demo-data`：src 非测试 259 行（`party-corpus.ts` 62 + `citation-corpus.ts` 129 + `index.ts` 3 + `pm-fixtures.ts` 65）
- `packages/demo-runtime`：`src` 非测试 1,062 + `scripts` 134 = 1,196 行
- `packages/reading-view`：src 非测试 1,049 行
