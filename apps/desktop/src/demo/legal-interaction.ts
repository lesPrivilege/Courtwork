import { requestInteraction, type TurnReplay } from '@courtwork/core/turn-protocol';
import { LEGAL_PACKAGE } from '@courtwork/legal/package';
import { admitPackages, buildPackageRegistries } from '@courtwork/registry';
import type { ResolvedSourceAnchor } from '@courtwork/schemas';

import contractSourceMd from '../../../../packages/demo-data/data/dossier/04-设备采购合同.md?raw';
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

const CONTRACT_TEXT_LAYER_VERSION = contentVersion(contractSourceMd);
const CONTRACT_TEXT_LAYER = {
  fileId: CONTRACT_FILE_ID,
  blocks: [{
    blockId: 'source',
    text: contractSourceMd,
    rangeBase: 0,
    textLayerVersion: CONTRACT_TEXT_LAYER_VERSION,
  }],
};

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
  if (anchor.fileId !== CONTRACT_FILE_ID) throw new Error(`未知原件：${anchor.fileId}`);
  if (anchor.textLayerVersion !== CONTRACT_TEXT_LAYER_VERSION) throw new Error('原件文本层版本已变化，无法打开旧锚点');
  if (!anchor.textRange) throw new Error('原件锚点缺少文本区间');
  const { start, end } = anchor.textRange;
  if (start < 0 || end < start || end > contractSourceMd.length) throw new Error('原件锚点区间无效');
  if (typeof anchor.quote !== 'string' || contractSourceMd.slice(start, end) !== anchor.quote) {
    throw new Error('原件引语与锚点切片不一致');
  }
  return {
    name: anchor.fileId,
    markdown: contractSourceMd,
    focusAnchor: structuredClone(anchor),
  };
}
