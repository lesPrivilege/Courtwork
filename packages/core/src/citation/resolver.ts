import {
  QuoteClaimSchema,
  type CitationBinding,
  type CitationFailure,
  type OutOfCoverageEntry,
  type QuoteClaim,
  type SourceAnchor,
} from '@courtwork/schemas';

/**
 * 引用 resolver（HARNESS-1 拍板一：「模型出引语，系统出坐标」）。
 * 模型只交 fileId + 页/块 + 精确引语；本模块对材料文本层做唯一精确匹配，
 * 铸造 start/end 与 textLayerVersion；多义或未命中即拒收——坐标是裁决性事实，
 * 模型机制性失去伪造 offset 的能力。引语即证词，坐标即公证。
 * 机器零垂类语义：回填映射由 descriptor.citationBinding 声明（包域律）。
 */

/** 文本层块：由 reading-view 段落 1:1 派生（text = 原件真实子串，非 markdown）。 */
export interface TextLayerBlock {
  blockId: string;
  page?: number;
  text: string;
  /** 块文本在其文本层坐标系中的起点（PDF 页内=0；docx 文档级=段落起点）。 */
  rangeBase: number;
  textLayerVersion: string;
}

export interface MaterialTextLayer {
  fileId: string;
  blocks: TextLayerBlock[];
}

export interface CitationResolutionStats {
  claims: number;
  resolved: number;
  failed: number;
}

interface ClaimResolution {
  anchor?: SourceAnchor;
  failure?: CitationFailure;
}

function occurrencesIn(text: string, quote: string): number[] {
  const positions: number[] = [];
  let idx = text.indexOf(quote);
  while (idx !== -1) {
    positions.push(idx);
    idx = text.indexOf(quote, idx + 1);
  }
  return positions;
}

/** 单条引语公证：候选块（按页/块声明收窄）内唯一精确匹配 → 铸锚；否则拒收。 */
export function resolveClaim(claim: QuoteClaim, layers: MaterialTextLayer[]): ClaimResolution {
  const layer = layers.find((l) => l.fileId === claim.fileId);
  if (!layer) {
    return { failure: { claim, reason: 'file_unavailable' } };
  }
  const candidates = layer.blocks.filter((block) => {
    if (claim.page !== undefined && block.page !== claim.page) return false;
    if (claim.blockId !== undefined && block.blockId !== claim.blockId) return false;
    return true;
  });
  const hits: { block: TextLayerBlock; at: number }[] = [];
  for (const block of candidates) {
    for (const at of occurrencesIn(block.text, claim.exactQuote)) {
      hits.push({ block, at });
    }
  }
  if (hits.length === 0) {
    return { failure: { claim, reason: 'not_found' } };
  }
  if (hits.length > 1) {
    return { failure: { claim, reason: 'ambiguous', occurrences: hits.length } };
  }
  const { block, at } = hits[0];
  const start = block.rangeBase + at;
  const end = start + claim.exactQuote.length;
  // 终验等式（拍板一）：铸出的坐标切回文本层必须逐字等于引语——公证自检，防偏移算术错。
  if (block.text.slice(at, at + claim.exactQuote.length) !== claim.exactQuote) {
    return { failure: { claim, reason: 'not_found' } };
  }
  return {
    anchor: {
      fileId: claim.fileId,
      page: block.page,
      textRange: { start, end },
      textLayerVersion: block.textLayerVersion,
      quote: claim.exactQuote,
    },
  };
}

export type DraftResolutionResult =
  | { status: 'resolved'; artifact: unknown; stats: CitationResolutionStats }
  | { status: 'needs_repair'; failures: CitationFailure[]; stats: CitationResolutionStats };

interface ItemOutcome {
  item: Record<string, unknown>;
  failures: CitationFailure[];
}

function resolvePointerPath(root: unknown, pointer: string): unknown {
  if (pointer === '/') return root;
  let current: unknown = root;
  for (const segment of pointer.slice(1).split('/')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** 深走一个覆盖单元：凡对象节点携 binding.draftField（QuoteClaim[]）即公证；全部收敛才算单元收敛。 */
function resolveItem(item: unknown, binding: CitationBinding, layers: MaterialTextLayer[]): ItemOutcome {
  const failures: CitationFailure[] = [];

  function walk(node: unknown): unknown {
    if (Array.isArray(node)) return node.map(walk);
    if (node === null || typeof node !== 'object') return node;
    const source = node as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      if (key === binding.draftField && Array.isArray(value)) {
        const anchors: SourceAnchor[] = [];
        for (const rawClaim of value) {
          const parsedClaim = QuoteClaimSchema.safeParse(rawClaim);
          if (!parsedClaim.success) {
            // 形状不合法的引语按未命中拒收（草稿 schema 已挡在前面，此处防御）。
            failures.push({ claim: { fileId: '(malformed)', exactQuote: String(rawClaim) }, reason: 'not_found' });
            continue;
          }
          const resolution = resolveClaim(parsedClaim.data, layers);
          if (resolution.anchor) anchors.push(resolution.anchor);
          if (resolution.failure) failures.push(resolution.failure);
        }
        output[binding.anchorField] = anchors;
      } else {
        output[key] = walk(value);
      }
    }
    return output;
  }

  return { item: walk(item) as Record<string, unknown>, failures };
}

export interface ResolveDraftInput {
  draft: unknown;
  binding: CitationBinding;
  layers: MaterialTextLayer[];
}

/**
 * 草稿级公证（首过）：itemScope 数组逐单元公证。任一引语拒收即整体 needs_repair
 * （受限修复重试携全部原判与失败原因）——首过不剪枝，给模型一次修正机会。
 */
export function resolveDraftArtifact(input: ResolveDraftInput): DraftResolutionResult {
  const items = resolvePointerPath(input.draft, input.binding.itemScope);
  if (!Array.isArray(items)) {
    return {
      status: 'needs_repair',
      failures: [{ claim: { fileId: '(structure)', exactQuote: input.binding.itemScope }, reason: 'not_found' }],
      stats: { claims: 0, resolved: 0, failed: 1 },
    };
  }
  const outcomes = items.map((item) => resolveItem(item, input.binding, input.layers));
  const failures = outcomes.flatMap((o) => o.failures);
  const claims = outcomes.reduce((n, o) => n + o.failures.length, 0) + countAnchors(outcomes, input.binding);
  const stats: CitationResolutionStats = { claims, resolved: claims - failures.length, failed: failures.length };
  if (failures.length > 0) {
    return { status: 'needs_repair', failures, stats };
  }
  return { status: 'resolved', artifact: rebuild(input.draft, input.binding, outcomes, []), stats };
}

/**
 * 终局剪枝（重试后）：仍不收敛的单元移入 outOfCoverageField——整 artifact 部分成功
 * 呈现，缺口如实标注（缺口三态）。收敛单元照常落格。
 */
export function resolveDraftArtifactWithPruning(input: ResolveDraftInput): {
  artifact: unknown;
  outOfCoverage: OutOfCoverageEntry[];
  stats: CitationResolutionStats;
} {
  const items = resolvePointerPath(input.draft, input.binding.itemScope);
  const list = Array.isArray(items) ? items : [];
  const outcomes = list.map((item) => resolveItem(item, input.binding, input.layers));
  const survivors: Record<string, unknown>[] = [];
  const outOfCoverage: OutOfCoverageEntry[] = [];
  let resolved = 0;
  let failed = 0;
  for (const outcome of outcomes) {
    failed += outcome.failures.length;
    if (outcome.failures.length === 0) {
      survivors.push(outcome.item);
      resolved += countItemAnchors(outcome.item, input.binding);
    } else {
      const summary = String(outcome.item[input.binding.itemSummaryField] ?? '(无摘要)');
      outOfCoverage.push({ summary, reason: 'citation_unresolved', failures: outcome.failures });
    }
  }
  const artifact = rebuildFromSurvivors(input.draft, input.binding, survivors, outOfCoverage);
  return { artifact, outOfCoverage, stats: { claims: resolved + failed, resolved, failed } };
}

function countItemAnchors(item: unknown, binding: CitationBinding): number {
  let count = 0;
  function walk(node: unknown): void {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === binding.anchorField && Array.isArray(value)) count += value.length;
      else walk(value);
    }
  }
  walk(item);
  return count;
}

function countAnchors(outcomes: ItemOutcome[], binding: CitationBinding): number {
  return outcomes.reduce((n, o) => n + countItemAnchors(o.item, binding), 0);
}

function rebuild(
  draft: unknown,
  binding: CitationBinding,
  outcomes: ItemOutcome[],
  outOfCoverage: OutOfCoverageEntry[],
): unknown {
  return rebuildFromSurvivors(draft, binding, outcomes.map((o) => o.item), outOfCoverage);
}

function rebuildFromSurvivors(
  draft: unknown,
  binding: CitationBinding,
  survivors: Record<string, unknown>[],
  outOfCoverage: OutOfCoverageEntry[],
): unknown {
  const root = { ...(draft as Record<string, unknown>) };
  const scopeKey = binding.itemScope.slice(1);
  if (scopeKey.includes('/')) {
    // itemScope 深路径：MVP 覆盖单层根数组（legal.RiskList=/risks）；深路径按结构错误处理，
    // 由调用方的最终 schema 校验兜住（诚实失败，不静默）。
    return draft;
  }
  root[scopeKey] = survivors;
  root[binding.outOfCoverageField] = outOfCoverage;
  return root;
}
