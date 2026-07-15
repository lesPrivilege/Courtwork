import { applyRevisionInstructionSet, compileDraftToDocx, NonAppliedInstructionsError } from '@courtwork/output';

// 真实浏览器消费：在 bundle 里跑一遍"起草 → 修订"终链，确保 executor 图整体进包、不被
// tree-shake，也证明 Buffer/fflate/@xmldom/xmldom 与 reading-view docx 安全预检在浏览器
// 目标下均可打包运行（对齐 @courtwork/core/work-protocol 同级的 Vite consumer 证明）。
const draft = compileDraftToDocx({ title: '测试文书', paragraphs: ['交付期限为三十日。'] });
const { docx, outcomes } = applyRevisionInstructionSet(
  draft,
  {
    id: 'ris-vite-consumer',
    caseId: 'case-vite-consumer',
    targetDocument: { fileId: 'f-vite-consumer' },
    instructions: [
      { id: 'i1', kind: 'replace', locator: { strategy: 'text', quote: '三十日' }, text: '四十五日' },
    ],
  },
  { now: new Date('2026-07-15T00:00:00.000Z') },
);

Object.assign(globalThis, {
  __courtworkOutputSmoke: {
    applyRevisionInstructionSet,
    compileDraftToDocx,
    NonAppliedInstructionsError,
    docxBytes: docx.length,
    outcomes,
  },
});
