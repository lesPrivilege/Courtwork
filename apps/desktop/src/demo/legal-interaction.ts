import { requestInteraction, type TurnReplay } from '@courtwork/core/turn-protocol';
import { LEGAL_PACKAGE } from '@courtwork/legal/package';
import { admitPackages, buildPackageRegistries } from '@courtwork/registry';
import type { ResolvedSourceAnchor } from '@courtwork/schemas';

import type { MaterialReaderDoc } from '../material/material-actions';
import type { TurnProtocolClient } from '../provider/turn-protocol-client';
import { isDemoCaseId } from '../case/case-scope';
import { DEMO_ARTIFACTS } from './recordings';

export const LEGAL_DEMO_INTERACTION_TURN_ID = 'demo-legal-risk-evidence-turn';
const LEGAL_DEMO_INTERACTION_REQUEST_ID = 'demo-legal-risk-evidence-request';
const CONTRACT_FILE_ID = '04-设备采购合同.md';

function contentVersion(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `source-text@1:${text.length}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export interface LegalDemoTextLayer {
  fileId: string;
  blocks: Array<{ blockId: string; text: string; rangeBase: number; textLayerVersion: string }>;
}

/**
 * DEMO-ANCHOR-2：样板案语料的文本层按**整目录**取入（卷宗 + 合同变体），`fileId` 即文件名。
 *
 * 取 glob 而非逐份 import：路由表与语料目录同源，不留「代码里少写一份原件」的同步账——
 * 三面产物的锚点指向哪份卷宗由数据说了算，路由不需要跟着改。
 */
const demoCorpusRaw: Record<string, string> = {
  ...import.meta.glob('../../../../packages/demo-data/data/dossier/*.md', {
    query: '?raw', import: 'default', eager: true,
  }),
  ...import.meta.glob('../../../../packages/demo-data/data/contracts/variants/*.md', {
    query: '?raw', import: 'default', eager: true,
  }),
} as Record<string, string>;

const TEXT_LAYERS: ReadonlyMap<string, LegalDemoTextLayer> = new Map(
  Object.entries(demoCorpusRaw).map(([path, text]) => {
    const fileId = path.slice(path.lastIndexOf('/') + 1);
    return [fileId, {
      fileId,
      blocks: [{ blockId: 'source', text, rangeBase: 0, textLayerVersion: contentVersion(text) }],
    }] as const;
  }),
);

// 空 glob 与「语料整个消失」同形。静默零一律硬失败（不变量四），不让路由退化成万能拒绝。
if (!TEXT_LAYERS.has(CONTRACT_FILE_ID)) {
  throw new Error('Legal demo corpus text layers are unavailable');
}

export const CONTRACT_TEXT_LAYER = TEXT_LAYERS.get(CONTRACT_FILE_ID)!;

const admission = admitPackages([LEGAL_PACKAGE]);
if (admission.rejected.length > 0 || admission.admitted.length !== 1) {
  throw new Error('Legal package interaction templates failed admission');
}
const registries = buildPackageRegistries(admission.admitted);

function assertDemoCaseId(caseId: string | null | undefined): void {
  if (!isDemoCaseId(caseId)) throw new Error('Legal demo interaction rejects non-demo case refs');
}

function riskQuoteClaim() {
  const source = DEMO_ARTIFACTS.riskList.risks[0]?.basis[0]?.sourceAnchors[0];
  if (!source || source.fileId !== CONTRACT_FILE_ID || typeof source.quote !== 'string' || source.quote.length === 0) {
    throw new Error('Legal demo risk source is unavailable');
  }
  return { fileId: source.fileId, exactQuote: source.quote };
}

/** Vertical adapter: domain text/template/anchor enter the generic protocol only here. */
export function ensureLegalDemoInteraction(client: TurnProtocolClient, caseId: string | null | undefined): TurnReplay {
  assertDemoCaseId(caseId);
  const replay = client.replayTurn(LEGAL_DEMO_INTERACTION_TURN_ID);
  if (replay.state !== 'idle') return replay;
  requestInteraction({
    turnId: LEGAL_DEMO_INTERACTION_TURN_ID,
    requestId: LEGAL_DEMO_INTERACTION_REQUEST_ID,
    packageId: 'legal',
    templateId: 'legal.risk-evidence-confirmation',
    anchorRefs: [riskQuoteClaim()],
  }, {
    templateRegistry: registries.interactionTemplates,
    materials: [CONTRACT_TEXT_LAYER],
    store: client.store,
  });
  return client.replayTurn(LEGAL_DEMO_INTERACTION_TURN_ID);
}

export interface LegalDemoSourceRoute {
  name: string;
  markdown: string;
  focusAnchor: ResolvedSourceAnchor;
}

/** Host routing fails closed on file identity, text-layer drift and quote mismatch. */
export function resolveLegalDemoSource(
  anchor: ResolvedSourceAnchor,
  caseId: string | null | undefined,
): LegalDemoSourceRoute {
  assertDemoCaseId(caseId);
  const layer = TEXT_LAYERS.get(anchor.fileId);
  if (!layer) throw new Error(`未知原件：${anchor.fileId}`);
  const sourceText = layer.blocks[0]!.text;
  if (anchor.textLayerVersion !== layer.blocks[0]!.textLayerVersion) throw new Error('原件文本层版本已变化，无法打开旧锚点');
  if (!anchor.textRange) throw new Error('原件锚点缺少文本区间');
  const { start, end } = anchor.textRange;
  if (start < 0 || end < start || end > sourceText.length) throw new Error('原件锚点区间无效');
  if (typeof anchor.quote !== 'string' || sourceText.slice(start, end) !== anchor.quote) {
    throw new Error('原件引语与锚点切片不一致');
  }
  return {
    name: anchor.fileId,
    markdown: sourceText,
    focusAnchor: structuredClone(anchor),
  };
}

/**
 * 样板案的显式降级文案。
 *
 * 生产文案的下一步是「重新运行产出它的场景」——样板案是录播回放，没有可重跑的那次运行，
 * 照搬即不实指路（LEGAL-ANCHOR-BINDING-1 验收须处理项①）。故 demo 分流自持一句，
 * 只说这一次定位没成、以及样板案本身是什么，不派给用户一个做不到的动作。
 */
export const LEGAL_DEMO_ANCHOR_BLOCKED_COPY =
  '这处引证无法与样板案原件逐字对齐 · 样板案是只读展品，不提供重跑';

export type LegalDemoSourceOutcome =
  | { kind: 'reader'; doc: MaterialReaderDoc }
  | { kind: 'blocked'; message: string };

/**
 * 样板案「回到原件」的唯一入口：路由、文本层与坐标任一不齐即显式阻断，绝不开空白阅读面。
 *
 * demo 语料没有 MaterialStore 重验链，故坐标直接取 resolver 已验真的 `textRange`，
 * **不保留 quote-search**。非 demo caseId 是编程错误，照旧抛出——不化装成用户可见降级。
 */
export function openLegalDemoSource(
  anchor: ResolvedSourceAnchor,
  caseId: string | null | undefined,
): LegalDemoSourceOutcome {
  assertDemoCaseId(caseId);
  let route: LegalDemoSourceRoute;
  try {
    route = resolveLegalDemoSource(anchor, caseId);
  } catch {
    return { kind: 'blocked', message: LEGAL_DEMO_ANCHOR_BLOCKED_COPY };
  }
  const { textRange, textLayerVersion } = route.focusAnchor;
  if (!textRange || !textLayerVersion) return { kind: 'blocked', message: LEGAL_DEMO_ANCHOR_BLOCKED_COPY };
  return {
    kind: 'reader',
    doc: {
      name: route.name,
      markdown: route.markdown,
      blocks: [{ blockId: 'source', text: route.markdown, rangeBase: 0, textLayerVersion }],
      focus: { blockId: 'source', localStart: textRange.start, localEnd: textRange.end },
    },
  };
}
