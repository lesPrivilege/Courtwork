import { createHash } from 'node:crypto';

const SOURCE_IDS = new Set([
  'P0-S01',
  'P0-S02',
  'P0-S03',
  'P0-S04a',
  'P0-S04b',
  'P0-S05',
  'P0-S06',
  'P0-S07',
  'P0-S08',
  'P0-S09',
]);

const PRIMITIVES = new Set(['Field', 'Anchor', 'Status', 'Evidence', 'Decision', 'Estimate', 'Partial']);
const TIERS = new Set(['pages-experimental', 'agent-interface', 'schema-workface']);
const REQUIRED_HEADINGS = [
  '地位与禁区',
  '权威图',
  'Legal S3/RiskList 全链',
  '五个阅读问题',
  '元素集与有限组合',
  '新表派生入口',
  '失败条件',
  'one-shot 验证协议',
  '来源登记',
];

const digest = (value) => createHash('sha256').update(value).digest('hex');
// 平铺提案行只接受已出现并由架构签署的批次语法；不放一个宽泛 P\d-* 口子让未来行免签穿透。
const isProposalLine = (value) => typeof value === 'string'
  && /^(?:P0-A\d{2}|P1-(?:M\d{2}|N\d{3})|P2-[TL]\d{2}|P3-[SHIA]\d{2}|P4-D\d{2}|P5-F\d{2})$/.test(value);

export function validateSchemaExemplarContract({ exemplar, manifest, tierLedger, sourceTexts }) {
  const failures = [];
  const sources = Array.isArray(manifest?.sources) ? manifest.sources : [];

  if (manifest?.schemaVersion !== 'courtwork.schema-exemplar.sources.v1') {
    failures.push('source manifest 版本缺失或不受支持');
  }

  const seenIds = new Set();
  const seenPaths = new Set();
  for (const source of sources) {
    if (!SOURCE_IDS.has(source?.id)) failures.push(`非法来源 ID：${source?.id ?? '(缺)'}`);
    if (seenIds.has(source?.id)) failures.push(`来源 ID 重复：${source.id}`);
    seenIds.add(source?.id);

    if (typeof source?.path !== 'string' || source.path.length === 0) {
      failures.push(`来源路径缺失：${source?.id ?? '(缺 ID)'}`);
      continue;
    }
    if (source.path.includes(`${'arch'}ive/`)) failures.push(`archive 历史材料禁止输入：${source.path}`);
    if (seenPaths.has(source.path)) failures.push(`同一路径重复登记权威角色：${source.path}`);
    seenPaths.add(source.path);

    const text = sourceTexts.get(source.path);
    if (text === undefined) {
      failures.push(`来源缺失 ${source.id}：${source.path}`);
    } else if (digest(text) !== source.sha256) {
      failures.push(`来源哈希漂移 ${source.id}：${source.path}`);
    }
  }

  for (const id of SOURCE_IDS) {
    if (!seenIds.has(id)) failures.push(`正式来源缺项：${id}`);
  }

  if (typeof exemplar !== 'string') {
    failures.push('schema exemplar 正文缺失');
  } else {
    for (const heading of REQUIRED_HEADINGS) {
      if (!exemplar.includes(`## ${heading}`)) failures.push(`schema exemplar 缺章节：${heading}`);
    }
    if (exemplar.includes(`${'arch'}ive/`)) failures.push('schema exemplar 禁止引用 archive 历史材料');
    if (/```\s*(?:json|typescript|ts)\b/i.test(exemplar)) {
      failures.push('schema exemplar 不得复制 JSON/TypeScript schema');
    }
    if (/Panels\.tsx[^\n]*(?:跨域|通用)[^\n]*字段契约/.test(exemplar)) {
      failures.push('Panels 当前列不得成为字段契约');
    }
  }

  const derivation = manifest?.derivation;
  if (!TIERS.has(derivation?.tier)) failures.push('新表派生入口缺唯一档位');
  if (!isProposalLine(derivation?.approvedProposalLine)) failures.push('新表派生入口缺已批提案行');

  const primitives = Array.isArray(derivation?.allowedPrimitives) ? derivation.allowedPrimitives : [];
  for (const primitive of primitives) {
    if (!PRIMITIVES.has(primitive)) failures.push(`未登记 primitive：${primitive}`);
  }
  for (const primitive of PRIMITIVES) {
    if (!primitives.includes(primitive)) failures.push(`primitive 闭集缺项：${primitive}`);
  }
  const blueprints = Array.isArray(derivation?.allowedBlueprints) ? derivation.allowedBlueprints : [];
  if (blueprints.length !== 1 || blueprints[0] !== 'courtwork.artifact-table.v1') {
    failures.push('blueprint 闭集漂移：当期只允许 courtwork.artifact-table.v1');
  }

  const ledger = Array.isArray(tierLedger) ? tierLedger : [];
  const ledgerTargets = new Set();
  for (const row of ledger) {
    if (typeof row?.target !== 'string' || row.target.length === 0) failures.push('档位账 target 缺失');
    else if (ledgerTargets.has(row.target)) failures.push(`档位账 target 重复：${row.target}`);
    else ledgerTargets.add(row.target);
    if (!TIERS.has(row?.tier)) failures.push(`档位账 ${row?.target ?? '(缺 target)'} 缺唯一档位`);
    if (!isProposalLine(row?.approvedProposalLine)) {
      failures.push(`档位账 ${row?.target ?? '(缺 target)'} 缺已批提案行`);
    }
  }
  if (ledger.length === 0) failures.push('R2 档位账为空');

  return failures;
}

export const schemaExemplarContractConstants = Object.freeze({
  sourceIds: Object.freeze([...SOURCE_IDS]),
  primitives: Object.freeze([...PRIMITIVES]),
  tiers: Object.freeze([...TIERS]),
});
