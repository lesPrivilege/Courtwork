import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { validateSchemaExemplarContract } from './schema-exemplar-contract-lib.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function fixture() {
  const sourceText = 'export const authority = true;\n';
  const ids = ['P0-S01', 'P0-S02', 'P0-S03', 'P0-S04a', 'P0-S04b', 'P0-S05', 'P0-S06', 'P0-S07', 'P0-S08', 'P0-S09'];
  const sources = ids.map((id, index) => ({
    id,
    path: `authority/source-${index + 1}.ts`,
    sha256: sha256(sourceText),
    role: `authority-role-${index + 1}`,
    symbols: ['RiskList'],
  }));
  return {
    exemplar: [
      '# Schema Exemplar',
      '## 地位与禁区',
      '## 权威图',
      '## Legal S3/RiskList 全链',
      '## 五个阅读问题',
      '## 元素集与有限组合',
      '## 新表派生入口',
      '## 失败条件',
      '## one-shot 验证协议',
      '## 来源登记',
      '只引用 `RiskList` 与 `courtwork.artifact-table.v1`，不复制字段。',
    ].join('\n'),
    manifest: {
      schemaVersion: 'courtwork.schema-exemplar.sources.v1',
      sources,
      derivation: {
        tier: 'schema-workface',
        approvedProposalLine: 'P0-A20',
        allowedPrimitives: ['Field', 'Anchor', 'Status', 'Evidence', 'Decision', 'Estimate', 'Partial'],
        allowedBlueprints: ['courtwork.artifact-table.v1'],
      },
    },
    tierLedger: [
      {
        target: 'docs/design/schema-exemplar.md#新表派生入口',
        tier: 'schema-workface',
        approvedProposalLine: 'P0-A20',
      },
    ],
    sourceTexts: new Map(sources.map((source) => [source.path, sourceText])),
  };
}

test('接受完整的指针式凡例契约', () => {
  assert.deepEqual(validateSchemaExemplarContract(fixture()), []);
});

test('档位账接受已签 P2/P3/P4/P5 行但拒绝未登记批次语法', () => {
  const signed = fixture();
  signed.tierLedger.push(
    { target: 'apps/desktop/src/styles.css#.workspace', tier: 'agent-interface', approvedProposalLine: 'P2-L01' },
    { target: 'apps/desktop/src/styles.css#@keyframes seal-press', tier: 'agent-interface', approvedProposalLine: 'P3-S01' },
    { target: 'site/styles.css#.wordmark > span', tier: 'pages-experimental', approvedProposalLine: 'P5-F02' },
  );
  assert.deepEqual(validateSchemaExemplarContract(signed), []);

  signed.tierLedger.push({ target: 'future', tier: 'agent-interface', approvedProposalLine: 'P4-X01' });
  assert.match(validateSchemaExemplarContract(signed).join('\n'), /future 缺已批提案行/);
});

test('定点拒绝缺来源与哈希漂移', () => {
  const missing = fixture();
  missing.sourceTexts.delete(missing.manifest.sources[0].path);
  assert.match(validateSchemaExemplarContract(missing).join('\n'), /来源缺失.*P0-S01/);

  const drift = fixture();
  drift.sourceTexts.set(drift.manifest.sources[0].path, 'drift');
  assert.match(validateSchemaExemplarContract(drift).join('\n'), /来源哈希漂移.*P0-S01/);
});

test('定点拒绝重复权威与 archive 输入', () => {
  const duplicate = fixture();
  duplicate.manifest.sources.push({ ...duplicate.manifest.sources[0], id: 'P0-S02', role: 'presentation-contract' });
  assert.match(validateSchemaExemplarContract(duplicate).join('\n'), /同一路径重复登记权威角色/);

  const archived = fixture();
  archived.sourceTexts.delete(archived.manifest.sources[0].path);
  archived.manifest.sources[0].path = 'archive/old-specimen.ts';
  archived.sourceTexts = new Map([['archive/old-specimen.ts', 'old']]);
  archived.manifest.sources[0].sha256 = sha256('old');
  assert.match(validateSchemaExemplarContract(archived).join('\n'), /archive.*禁止输入/);
});

test('定点拒绝第二 schema 真源与 Panels 字段契约', () => {
  const copiedSchema = fixture();
  copiedSchema.exemplar += '\n```json\n{"type":"object"}\n```';
  assert.match(validateSchemaExemplarContract(copiedSchema).join('\n'), /不得复制 JSON\/TypeScript schema/);

  const panels = fixture();
  panels.exemplar += '\nPanels.tsx 当前五列是跨域字段契约。';
  assert.match(validateSchemaExemplarContract(panels).join('\n'), /Panels.*不得成为字段契约/);
});

test('定点拒绝漏档位、漏提案行与未登记 primitive', () => {
  const missingTier = fixture();
  delete missingTier.tierLedger[0].tier;
  assert.match(validateSchemaExemplarContract(missingTier).join('\n'), /缺唯一档位/);

  const missingProposal = fixture();
  delete missingProposal.manifest.derivation.approvedProposalLine;
  assert.match(validateSchemaExemplarContract(missingProposal).join('\n'), /缺已批提案行/);

  const unknownPrimitive = fixture();
  unknownPrimitive.manifest.derivation.allowedPrimitives.push('DecorativeCard');
  assert.match(validateSchemaExemplarContract(unknownPrimitive).join('\n'), /未登记 primitive.*DecorativeCard/);
});
