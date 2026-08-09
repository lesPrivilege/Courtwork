import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DOMParser } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';
import { strFromU8, unzipSync } from 'fflate';
import type { RevisionInstructionSet } from '@courtwork/schemas';
import { applyRevisionInstructionSet } from './apply-revision-instruction-set.js';

/**
 * CONTRACT-OUTPUT-TRUTH-1（output 票）：唯一复合原件的保真与跨时区确定性。
 *
 * 保真口径逐字照 ADR-010 决定五 2026-07-24 修订：**未触** ZIP parts 的解压内容 bytes 相等；
 * 受触四 part 只承诺既有节点/ID/关系/override 的语义保全与新增唯一性，不承诺 byte-identical。
 */
const COMPLEX_FIXTURE = fileURLToPath(
  new URL('../test/fixtures/contract-review-complex.docx', import.meta.url),
);
const ORIGINAL = new Uint8Array(readFileSync(COMPLEX_FIXTURE));

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';

/** 受触 part 闭集：只有这四枚允许规范化重序列化。 */
const TOUCHED_PARTS = new Set([
  'word/document.xml',
  'word/comments.xml',
  'word/_rels/document.xml.rels',
  '[Content_Types].xml',
]);

const CONFIRMATION_INSTANT = new Date('2026-03-11T07:41:23.456Z');

const SET: RevisionInstructionSet = {
  id: 'ris-fidelity',
  caseId: 'case-fidelity',
  targetDocument: { fileId: 'material-primary-contract' },
  outOfCoverage: [],
  instructions: [
    {
      id: 'instr-risk-01',
      kind: 'commentOnly',
      locator: { strategy: 'text', quote: '任何一方违反本合同约定，应向守约方支付合同总价款百分之十的违约金。' },
      annotation: { text: '违约金比例偏低。', citations: [] },
    },
    {
      id: 'instr-risk-02',
      kind: 'commentOnly',
      locator: { strategy: 'text', quote: '因本合同引起的争议，双方应协商解决；协商不成的，提交甲方所在地人民法院诉讼解决。' },
      annotation: { text: '管辖约定对乙方不利。', citations: [] },
    },
  ],
};

function compile(now: Date = CONFIRMATION_INSTANT): Buffer {
  return applyRevisionInstructionSet(ORIGINAL, SET, { now }).docx;
}

function parse(xml: string) {
  return new DOMParser().parseFromString(xml, 'text/xml');
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('唯一复合原件的身份', () => {
  it('字节数与 SHA-256 与同目录 README 记载逐字相等', () => {
    expect(ORIGINAL.byteLength).toBe(39562);
    expect(sha256(ORIGINAL)).toBe('546065be238664130b459c9b9f0e236e8a5e9ec7fd1af8b03640cab8ed8b3028');
  });
});

describe('复合原件保真：未触 part bytes 相等', () => {
  it('图片、样式、页眉页脚、主题、编号等未触 part 的解压内容逐字节相等', () => {
    const before = unzipSync(ORIGINAL);
    const after = unzipSync(new Uint8Array(compile()));

    const untouched = Object.keys(before).filter((name) => !TOUCHED_PARTS.has(name));
    // 断言本身要能证明它真的看过东西：复合原件必须真含图片/页眉页脚/样式。
    expect(untouched).toContain('word/media/image1.png');
    expect(untouched).toContain('word/header1.xml');
    expect(untouched).toContain('word/footer1.xml');
    expect(untouched).toContain('word/styles.xml');
    expect(untouched.length).toBeGreaterThan(10);

    for (const name of untouched) {
      expect(after[name], `产出缺少未触 part ${name}`).toBeDefined();
      expect(Buffer.compare(Buffer.from(before[name]!), Buffer.from(after[name]!)), `${name} 内容漂移`).toBe(0);
    }
    // 未触 part 只多不少：产出不得静默丢弃任何原 part。
    for (const name of Object.keys(before)) expect(Object.keys(after)).toContain(name);
  });
});

describe('复合原件保真：受触 part 语义保全与新增唯一性', () => {
  it('既有两条批注、其 id 与 range 全部保留，新批注 id 不与既有冲突', () => {
    const after = unzipSync(new Uint8Array(compile()));
    const commentsXml = strFromU8(after['word/comments.xml']!);
    const ids = Array.from(parse(commentsXml).getElementsByTagNameNS(W, 'comment')).map((node) =>
      Number((node as Element).getAttributeNS(W, 'id')),
    );
    expect(ids).toContain(0);
    expect(ids).toContain(1);
    expect(ids.length).toBe(4);
    expect(new Set(ids).size).toBe(ids.length);
    expect(commentsXml).toContain('总价款需与预算书核对。');
    expect(commentsXml).toContain('质保期建议延长至两年。');

    const documentXml = strFromU8(after['word/document.xml']!);
    for (const id of [0, 1]) {
      expect(documentXml).toContain(`<w:commentRangeStart w:id="${id}"/>`);
      expect(documentXml).toContain(`<w:commentRangeEnd w:id="${id}"/>`);
    }
  });

  it('既有 relationship 与 content-type override 保留且不重复；表格与内嵌图片引用不丢', () => {
    const after = unzipSync(new Uint8Array(compile()));
    const rels = Array.from(
      parse(strFromU8(after['word/_rels/document.xml.rels']!)).getElementsByTagNameNS(REL_NS, 'Relationship'),
    ).map((node) => ({
      id: (node as Element).getAttribute('Id') ?? '',
      target: (node as Element).getAttribute('Target') ?? '',
    }));
    for (const target of ['header1.xml', 'footer1.xml', 'media/image1.png', 'comments.xml', 'styles.xml']) {
      expect(rels.filter((rel) => rel.target === target).length, `${target} 关系数不为 1`).toBe(1);
    }
    expect(new Set(rels.map((rel) => rel.id)).size).toBe(rels.length);

    const overrides = Array.from(
      parse(strFromU8(after['[Content_Types].xml']!)).getElementsByTagNameNS(CT_NS, 'Override'),
    ).map((node) => (node as Element).getAttribute('PartName'));
    for (const part of ['/word/comments.xml', '/word/header1.xml', '/word/footer1.xml']) {
      expect(overrides.filter((name) => name === part).length, `${part} override 数不为 1`).toBe(1);
    }

    const documentXml = strFromU8(after['word/document.xml']!);
    expect(documentXml).toContain('<w:tbl>');
    expect(documentXml).toContain('r:embed="rIdImage1"');
    expect(documentXml).toContain('<w:headerReference w:type="default" r:id="rIdHeader1"/>');
    expect(documentXml).toContain('<w:footerReference w:type="default" r:id="rIdFooter1"/>');
  });
});

describe('跨时区确定性', () => {
  const originalTz = process.env.TZ;
  beforeEach(() => {
    process.env.TZ = 'UTC';
  });
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it('UTC / Asia/Singapore / 纽约 DST gap 三处编译，bytes 与 SHA-256 相等', () => {
    const shas = new Set<string>();
    const first = compile();
    for (const tz of ['UTC', 'Asia/Singapore', 'America/New_York']) {
      process.env.TZ = tz;
      const docx = compile();
      shas.add(sha256(docx));
      expect(Buffer.compare(first, docx), `${tz} 下产物漂移`).toBe(0);
    }
    expect(shas.size).toBe(1);
  });

  it('纽约 DST gap 当刻（2026-03-08 07:30Z，本地 02:30 不存在）同样稳定', () => {
    const gap = new Date('2026-03-08T07:30:00.000Z');
    process.env.TZ = 'UTC';
    const utc = compile(gap);
    process.env.TZ = 'America/New_York';
    const ny = compile(gap);
    expect(Buffer.compare(utc, ny)).toBe(0);
  });
});
