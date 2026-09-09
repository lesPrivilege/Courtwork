# MR-A1a · 原始文本坐标基础模块（作者交付回执）

2026-09-10。作者有界实现。基线 `ecccac2e3d51f276b4f0fe31be430ef675e2b1c9`（作者交付时的 main HEAD），
独立临时 worktree `<isolated-checkout>`，分支 `codex/mr-a1a-source-coordinates`。
本单只做**原始文本坐标基础模块**：不决定 Markdown AST、评注或存储合同（Astra 掌握架构与最终合流），
不接 HTTP，不改既有 source identity 或权限。作者不自称独立接受；接收与合流由 Astra 执行。

## 独占写权（本次新增）

| 路径 | 内容 |
|---|---|
| `app/runtime/source-coordinates.mjs` | 实现模块（纯函数，无副作用） |
| `app/tests/source-coordinates.test.mjs` | 定向测试，独立 oracle 驱动 |
| `app/tests/fixtures/source-coordinates/corpus.json` | 静态合成语料（stdlib-only 独立生成） |
| `evidence/markdown-review-20260910/source-coordinates/` | 本证据包 |

未修改 Core/service/index/store/app/web（上述新增除外）、parser 依赖、
`engineering/current.md`、`PAPER.md` 或任何共享树既有内容。模块未被任何产品代码引用；
`git diff` 相对基线只含上述新增路径。

## 冻结接口与模块合同

`buildSourceCoordinates(bytes)` 仅接受 `Uint8Array`（含 `Buffer`，含跨 realm / 带
`byteOffset` 的视图）。输入**先复制再处理**：调用方之后修改原 buffer 不影响已返回对象、
内部映射或后续转换。上限 **65,536 bytes**，超限 `source_too_large`；空内容允许。
**严格 UTF-8** 校验（RFC 3629 / WHATWG well-formedness）：overlong、编码代理对、
>U+10FFFF、游离 continuation、截断尾序列一律 `invalid_utf8`，**不以 U+FFFD 修复**。
保留 BOM、CRLF、末尾换行与组合字符；**不做任何 Unicode 归一化**（NFC/NFD/大小写等）。

返回**冻结对象**（`Object.freeze`，防元数据污染）：

| 字段 | 语义 |
|---|---|
| `text` | 完整原始文本，含 BOM（`TextDecoder ignoreBOM` 解码已验字节） |
| `contentSha256` | 原始输入字节的 SHA-256（hex） |
| `byteLength` | 输入字节数（≤ 65536） |
| `codePointLength` | code point 数（BOM 计为一个） |
| `utf16Length` | UTF-16 code unit 数（astral 计为两个；恒等于 `text.length`） |
| `toOffset(offset, from, to)` | 在 utf8 / codePoint / utf16 间映射**边界**偏移 |

### 坐标语义（原始文本坐标）

- `utf8`＝原输入字节偏移（仅 code-point 边界）；`codePoint`＝解码文本的 code-point 序号
  （0 起，BOM 是第一个）；`utf16`＝解码文本的 UTF-16 unit 偏移（astral=2 unit）。
- 三者皆为右开区间位置；**源末尾是合法边界**。
- `toOffset` 要求 offset 是**安全非负整数**、位于 `0..上限` 内、且恰好是 `from` 坐标的
  code-point 边界；UTF-8 多字节字符内部、UTF-16 代理对内部一律拒绝，**禁止自动吸附**。
- 转换是**原始文本坐标**：不是 grapheme、DOM/显示文本、或 parser 坐标。

### 错误码（稳定）

| 条件 | code |
|---|---|
| 非法/截断 UTF-8 | `invalid_utf8` |
| 超过 65,536 bytes（先于解码判定，确定性优先） | `source_too_large` |
| offset 非安全非负整数 / 越界 / 落在字符内部或代理对内部 | `invalid_offset` |
| from/to 不是 utf8/codePoint/utf16（含大小写、复数、空串） | `invalid_coordinate_unit` |
| 入参不是 Uint8Array（string/ArrayBuffer/DataView/其他 typed array 等） | `TypeError`（调用方契约违约；不属于冻结的四个内容/偏移错误码） |

### 隔离与不变量

- 不读文件、不访问网络/store/时钟；仅用 `node:crypto` 内置哈希，未新增依赖。
- 返回对象不引用调用方输入；输入复制、元数据冻结 ⇒ “修改输入和输出元数据不污染后续转换”。
- 无模块级可变状态；同输入重复构建结果逐字段相等且相互独立。

## 验证方法（expected 不由实现产生）

测试文件内的**独立 oracle** 与实现路径不同源：

1. **合法性 oracle**：`TextDecoder('utf-8', { fatal: true })` —— 与实现的原始字节结构扫描
   （lead/continuation 窗口表）互不共享代码。
2. **边界 oracle**：先解码成字符，再以 `codePointAt` 逐字符行走、对每个字符重编码量得
   UTF-8 宽度 —— 与实现的“顺扫原始字节累加”相反方向推导。
3. **静态语料**：`corpus.json` 由**独立生成脚本**（仅 `Buffer`/`TextDecoder`/`crypto`，
   绝不 import 被测模块）产出 hex + 期望摘要；测试逐条与 oracle、静态期望三方对账。
4. 逐字节**保真回写**：`Buffer.from(text,'utf8')` 必须逐字节还原输入（证明无归一化/无 BOM 剥离）。
5. 全边界穷举：对每条语料枚举全部三坐标合法边界 + 全部非法内部/越界偏移逐一断言。

覆盖：ASCII、中文、emoji（astral/代理对）、组合字符（NFD 序列不被 NFC 折叠，且与
precomposed 并存）、BOM（开头/内部/单独）、CRLF、空内容、末尾换行、NUL/控制字符、
非法/截断 UTF-8 矩阵、65,536/65,537 大小边界、代理对内部与各坐标越界拒绝、
单位名与偏移类型校验、输入变异隔离、输出冻结与 `this` 无关解构调用、Buffer/带偏移视图、
确定性。

## 证据

| 文件 | 内容 |
|---|---|
| `README.md` | 本回执（合同 + 交付 + 未检项） |
| `targeted.log` | 定向：`node --test app/tests/source-coordinates.test.mjs` |
| `tests.log` | 全量：`npm --prefix app test`（含本模块 17 项新增） |
| `smoke.log` | `npm --prefix app run smoke`（local-fake） |

作者代码 SHA：`570fda858febf7d1b14b7f60c27385ff64841442`；作者证据 SHA：`7a6db4a0ba8c6a438218e12ae15e6f5551e5a6c8`。代码提交只新增本模块与测试，证据提交只新增本包。
复跑命令（worktree 根）：

```sh
node --test app/tests/source-coordinates.test.mjs   # 定向
npm --prefix app test                               # 全量
npm --prefix app run smoke                          # smoke
```

## 未检项 / 边界

- **作者不自称独立接受**；AGENTS.md 要求非作者复核（Luna 反例或 Astra 读码）后才能算独立验收。本包未 merge main、未 push、未部署。
- 本模块是 MR-A1 的一个有界切片，**不是**完整 MR-A1：内容身份 adapter、ES file-content
  分页消费者、projection profile/DTO、真实 service packets、跨 scope 拒绝的宿主接线均不在本单。
- 未做 grapheme/显示文本/parser/mdast 映射；块级或 inline 锚定由后续切片定义。
- 无性能门槛、无真实浏览器/模型/网络验证；full-suite 数字是隔离 worktree 当时环境的组合结果。
- 类型违约用 `TypeError`（无 code）：这是对“四码表”的有意收窄，已在合同中说明，待 Astra 裁定是否需并入统一错误面。
- 大小判定先于 UTF-8 判定（oversized 且畸形输入报 `source_too_large`）：确定性排序已在测试固化，供 Astra 复核是否与上层合同一致。


## 接收接续

Astra 在当前主线的独立复核、两处输入合同修复与组合验证见 [合流回执](../source-coordinates-integration/README.md)。上文作者计数与当时未合流声明保留其历史时点。原始回执字节可从 `7a6db4a0ba8c6a438218e12ae15e6f5551e5a6c8` 的本路径读取；本次只可移植化工作树位置、明确固定作者 SHA 并补接续链接。
