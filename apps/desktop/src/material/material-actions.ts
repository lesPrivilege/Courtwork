import type { SourceAnchor } from '@courtwork/schemas';

import { MATERIAL_BLOCK_REASON_COPY, type MaterialBlock, type MaterialBlockReason } from './material-ref';
import type { ResolveResult } from './material-store';

/**
 * 卷宗原件的 canonical reader 单调用链（CONTRACT-TRACE-1 合并 `material-reader.ts` 后的唯一住所）。
 *
 * 合并理由（本票吸收原 `MATERIAL-READER-MERGE-1`）：同一条「caseId + materialId → MaterialStore
 * 重验链 → 显式态通道」此前被切成两个模块，doc/outcome 各有一份声明。两份 shape 意味着坐标
 * 算法可以被写两遍——而写第二遍的那个人，多半会用 `indexOf(quote)`。故只留一份。
 *
 * **零新错误形态之外的两个 reader-local reason**：`anchor_invalid` / `anchor_unsupported`
 * 不是材料的持久状态（材料本身照常可读），是**这一次定位**的结果，故不进 `MaterialBlockReason`
 * 持久闭集，只住 reader 侧。
 *
 * **原件只读**：本路径只读不写。`resolveForProvider` 内含入库后重验（重读原件、比对内容哈希与
 * 阅读视图哈希），故「打开原件」这个动作顺带就是一次漂移检查。
 */

/** 焦点坐标：块内相对偏移。ReadingView markdown 不是这个坐标系，绝不可把它套到 markdown 上。 */
export interface MaterialReaderFocus {
  blockId: string;
  page?: number;
  localStart: number;
  localEnd: number;
}

export interface MaterialReaderDoc {
  name: string;
  markdown: string;
  /** 重验后 `MaterialBlock[]` 的防御性复制——焦点坐标的唯一基底。 */
  blocks: MaterialBlock[];
  /** 只能由坐标算法成功后产生；失败一律不开面。 */
  focus?: MaterialReaderFocus;
}

/** reader-local 阻断闭集 = 材料持久闭集 + 本次定位的两态。 */
export type MaterialReaderBlockReason = MaterialBlockReason | 'anchor_invalid' | 'anchor_unsupported';

/**
 * reader 侧可见文案。材料八态逐字沿用既有产品语言表（不造第二套措辞）；
 * 两个锚点态的文案逐字冻结——`unsupported` 说的是「这个阅读面还画不出页面坐标」，
 * `invalid` 说的是「引证与当前原件对不上了」，二者对用户的下一步完全不同，不得混用。
 */
export const MATERIAL_READER_BLOCK_REASON_COPY: Record<MaterialReaderBlockReason, string> = {
  ...MATERIAL_BLOCK_REASON_COPY,
  anchor_unsupported: '当前阅读面暂不支持该定位',
  // LEGAL-ANCHOR-BINDING-1：回跳接通后本条不再只服务合同审查（时间线／图谱／矩阵三面同用），
  // 故下一步中性化为「产出这处引证的那次运行」——承 LEGAL-FIVE-FACES-1 D7 的文案中性化。
  anchor_invalid: '这处引证已无法与当前原件逐字对齐 · 请重新运行产出它的场景',
};

export type MaterialReaderOutcome =
  | { kind: 'reader'; doc: MaterialReaderDoc }
  | { kind: 'blocked'; reason: MaterialReaderBlockReason; message: string };

/**
 * 只取本模块需要的最小面——不绑定 MaterialStore 具体类，便于注入与测试（沿
 * `verticals/legal/legal-s3-binding.ts` 的 `MaterialResolver` 先例）。返回型必须是已定型的 `ResolveResult`。
 */
export interface MaterialResolver {
  resolveForProvider(caseId: string, materialId: string): Promise<ResolveResult>;
}

export interface MaterialActionSink {
  /** 显式态通道（既有 systemFeedback）。ok=false 即用户可见的阻断陈述。 */
  feedback: (message: string, ok: boolean) => void;
  /** 打开只读阅读面。仅在材料重验通过、且（携锚时）坐标验真通过后调用。 */
  openReader: (doc: MaterialReaderDoc) => void;
}

const blocked = (reason: MaterialReaderBlockReason): MaterialReaderOutcome =>
  ({ kind: 'blocked', reason, message: MATERIAL_READER_BLOCK_REASON_COPY[reason] });

export type ReaderFocusResolution =
  | { status: 'focus'; focus: MaterialReaderFocus }
  | { status: 'blocked'; reason: 'anchor_invalid' | 'anchor_unsupported' };

const ANCHOR_INVALID = { status: 'blocked', reason: 'anchor_invalid' } as const;

/** schema 意义上合法的 bbox：四数有限、宽高为正，且 page 为正整数（无页码的坐标区域没有意义）。 */
function isLegalBbox(anchor: SourceAnchor): boolean {
  const bbox = anchor.bbox;
  if (!bbox) return false;
  const finite = [bbox.x, bbox.y, bbox.width, bbox.height]
    .every((value) => typeof value === 'number' && Number.isFinite(value));
  if (!finite || bbox.width <= 0 || bbox.height <= 0) return false;
  return typeof anchor.page === 'number' && Number.isInteger(anchor.page) && anchor.page > 0;
}

/**
 * 坐标算法（ADR-010 决定五 2026-07-24 修订）：
 * 以 `textLayerVersion` 选文本层 → 分页件先以 `page` 选页 → 用 `textRange` 与 block 的 `rangeBase`
 * 包含关系**唯一**选 block → 转 block-local 偏移 → 终验 `block.text.slice(...) === quote`。
 *
 * `quote` 只作切片等式与显示，**不参与定位**——重复引语因此仍只落到坐标指定处。
 */
export function resolveReaderFocus(
  blocks: readonly MaterialBlock[],
  anchor: SourceAnchor,
): ReaderFocusResolution {
  // 判定优先级固定：合法 bbox-only 独占 unsupported，不论 quote 有无，不得先被「缺 textRange」吞掉。
  if (anchor.textRange === undefined) {
    return isLegalBbox(anchor) ? { status: 'blocked', reason: 'anchor_unsupported' } : ANCHOR_INVALID;
  }

  const { textLayerVersion, quote, page } = anchor;
  if (typeof textLayerVersion !== 'string' || textLayerVersion.length === 0) return ANCHOR_INVALID;
  if (typeof quote !== 'string' || quote.length === 0) return ANCHOR_INVALID;

  const { start, end } = anchor.textRange;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) return ANCHOR_INVALID;

  const layer = blocks.filter((block) => block.textLayerVersion === textLayerVersion);
  if (layer.length === 0) return ANCHOR_INVALID;

  // 分页件：`rangeBase` 按页内文本层解释，故必须先选页——否则两页的同值 rangeBase 会串块。
  let candidates = layer;
  if (layer.some((block) => block.page !== undefined)) {
    if (typeof page !== 'number' || !Number.isInteger(page) || page <= 0) return ANCHOR_INVALID;
    candidates = layer.filter((block) => block.page === page);
    if (candidates.length === 0) return ANCHOR_INVALID;
  }

  const containing = candidates.filter(
    (block) => start >= block.rangeBase && end <= block.rangeBase + block.text.length,
  );
  if (containing.length !== 1) return ANCHOR_INVALID;

  const block = containing[0]!;
  const localStart = start - block.rangeBase;
  const localEnd = end - block.rangeBase;
  // 终验等式：quote 已断非空，故等式成立即蕴含切片非空（零长区间在此必红）。
  if (block.text.slice(localStart, localEnd) !== quote) return ANCHOR_INVALID;
  return { status: 'focus', focus: { blockId: block.blockId, page: block.page, localStart, localEnd } };
}

/**
 * 打开只读阅读面。携 `anchor` 时以坐标验真，失败一律不开面。
 *
 * 次序不可换：**材料级阻断先于锚点判定**——原件已漂移时该报「原件内容自入库后已改动」，
 * 报成「引证对不上」会把用户引到错误的下一步。
 */
export async function openMaterialReader(
  resolver: MaterialResolver,
  caseId: string,
  materialId: string,
  anchor?: SourceAnchor,
): Promise<MaterialReaderOutcome> {
  let outcome: ResolveResult;
  try {
    outcome = await resolver.resolveForProvider(caseId, materialId);
  } catch {
    // 宿主异常不静默吞：落到 unavailable（原件读不到是它最准确的语义），
    // 绝不返回空阅读面——空白页会被读成「这份文件没内容」，那是另一种假事实。
    return blocked('unavailable');
  }

  if (outcome.status !== 'ready') {
    if (outcome.reason in MATERIAL_BLOCK_REASON_COPY) return blocked(outcome.reason);
    // 到这里说明 store 给出了文案表里没有的 reason。**编译期本不该发生**（两者同源于
    // `MaterialBlockReason`，`tsc` 会先红）；运行期兜底仍显式阻断、不当作可读，但如实登记
    // 已知边界：此时用户看到的是 `rejected` 的文案，**显式但归因错误**。
    return blocked('rejected');
  }

  // 防御性复制：读侧持有的是快照，改它不回写 store 交出的对象。
  const blocks = outcome.material.blocks.map((block) => ({ ...block }));
  const doc: MaterialReaderDoc = {
    name: outcome.material.fileName,
    markdown: outcome.material.readingMarkdown,
    blocks,
  };
  if (!anchor) return { kind: 'reader', doc };

  const resolution = resolveReaderFocus(blocks, anchor);
  if (resolution.status === 'blocked') return blocked(resolution.reason);
  return { kind: 'reader', doc: { ...doc, focus: resolution.focus } };
}

/** 核验：重读原件、比对哈希，结果一律显式——通过与阻断都说话，不静默。 */
export async function verifyMaterialAction(
  resolver: MaterialResolver,
  caseId: string,
  materialId: string,
  sink: Pick<MaterialActionSink, 'feedback'>,
): Promise<void> {
  // 宿主异常同样显式（FILE-PREVIEW-1 验收 F 项）：无 catch 时宿主抛错即用户零反馈，与不变量 4 相抵。
  let resolved: ResolveResult;
  try {
    resolved = await resolver.resolveForProvider(caseId, materialId);
  } catch {
    sink.feedback(MATERIAL_BLOCK_REASON_COPY.unavailable, false);
    return;
  }
  if (resolved.status === 'ready') {
    sink.feedback(`原件校验通过：${resolved.material.fileName} 可用于生成`, true);
    return;
  }
  sink.feedback(MATERIAL_BLOCK_REASON_COPY[resolved.reason], false);
}

/**
 * 阅读：重验（携锚时连坐标）通过才开面；任何阻断都走显式态，绝不开空白阅读面。
 * App / Panel 的唯一入口——不得在别处另造第二套定位。
 */
export async function readMaterialAction(
  resolver: MaterialResolver,
  caseId: string,
  materialId: string,
  sink: MaterialActionSink,
  anchor?: SourceAnchor,
): Promise<void> {
  const outcome = await openMaterialReader(resolver, caseId, materialId, anchor);
  if (outcome.kind === 'blocked') {
    sink.feedback(outcome.message, false);
    return;
  }
  sink.openReader(outcome.doc);
}
