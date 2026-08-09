import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import type { RevisionInstructionSet } from '@courtwork/schemas';
import {
  applyRevisionInstructionSet,
  InvalidRevisionInstructionSetError,
} from './apply-revision-instruction-set.js';
import { InvalidZipTimestampError, packedDosDateTime } from './docx-zip.js';

/**
 * CONTRACT-OUTPUT-TRUTH-1（output 票）：输入闭口 + 确定性 ZIP。
 *
 * 确定性只承诺「同原 bytes + 同合法 instruction set + 同 now」；不把任意不同输入宣称为同 SHA。
 */
const COMPLEX_FIXTURE = fileURLToPath(
  new URL('../test/fixtures/contract-review-complex.docx', import.meta.url),
);
const ORIGINAL = new Uint8Array(readFileSync(COMPLEX_FIXTURE));

const SET: RevisionInstructionSet = {
  id: 'ris-deterministic',
  caseId: 'case-deterministic',
  targetDocument: { fileId: 'contract-review-complex' },
  outOfCoverage: [],
  instructions: [
    {
      id: 'instr-risk-01',
      kind: 'commentOnly',
      locator: { strategy: 'text', quote: '任何一方违反本合同约定，应向守约方支付合同总价款百分之十的违约金。' },
      annotation: { text: '违约金比例偏低，建议与同类合同对齐。', citations: [] },
    },
  ],
};

const NOW = new Date('2026-03-11T07:41:23.456Z');

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function compile(now: Date = NOW): Buffer {
  return applyRevisionInstructionSet(ORIGINAL, SET, { now }).docx;
}

/** 从产出 ZIP 逐条读取 local header 与 central directory 的 packed DOS 时间。 */
function readPackedTimes(zip: Uint8Array): { local: number[]; central: number[] } {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const local: number[] = [];
  const central: number[] = [];
  for (let i = 0; i + 4 <= zip.byteLength; i++) {
    const sig = view.getUint32(i, true);
    if (sig === 0x04034b50) local.push(view.getUint32(i + 10, true));
    else if (sig === 0x02014b50) central.push(view.getUint32(i + 12, true));
  }
  return { local, central };
}

describe('输入闭口：RevisionInstructionSet 运行时校验', () => {
  it('空 instructions 在解析/压缩之前以 typed error 拒绝（TypeScript cast 绕不过）', () => {
    const smuggled = { ...SET, instructions: [] } as unknown as RevisionInstructionSet;
    expect(() => applyRevisionInstructionSet(ORIGINAL, smuggled, { now: NOW })).toThrow(
      InvalidRevisionInstructionSetError,
    );
  });

  it('畸形 instruction（缺 kind / 空 id）同样在边界拒绝，code 逐字稳定', () => {
    const malformed = {
      ...SET,
      instructions: [{ id: '', locator: { strategy: 'text', quote: 'x' } }],
    } as unknown as RevisionInstructionSet;
    let caught: unknown;
    try {
      applyRevisionInstructionSet(ORIGINAL, malformed, { now: NOW });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(InvalidRevisionInstructionSetError);
    expect((caught as InvalidRevisionInstructionSetError).code).toBe('invalid_revision_instruction_set');
  });
});

describe('确定性 ZIP：显式 mtime 与 packed DOS header', () => {
  it('同一 now 的两次编译故意跨秒，bytes 与 SHA-256 仍相等', async () => {
    const first = compile();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const second = compile();
    expect(sha256(second)).toBe(sha256(first));
    expect(Buffer.compare(first, second)).toBe(0);
  });

  it('local 与 central 两组 header 的 packed 时间逐项相等，且都来自 now 的 UTC 字段', () => {
    const docx = compile();
    const { local, central } = readPackedTimes(new Uint8Array(docx));
    expect(local.length).toBeGreaterThan(0);
    expect(local.length).toBe(central.length);
    const expected = packedDosDateTime(NOW);
    for (const packed of [...local, ...central]) expect(packed).toBe(expected);
  });

  it('奇数秒按同一 2 秒刻度向下归一，毫秒归零', () => {
    expect(packedDosDateTime(new Date('2026-03-11T07:41:23.999Z'))).toBe(
      packedDosDateTime(new Date('2026-03-11T07:41:22.000Z')),
    );
  });

  it('批注 XML 仍使用原 UTC instant，不因 DOS 精度降级', () => {
    const files = unzipSync(new Uint8Array(compile()));
    const comments = Buffer.from(files['word/comments.xml']!).toString('utf8');
    expect(comments).toContain(NOW.toISOString());
  });

  it('可表示范围边界外 typed 阻断，不静默 clamp', () => {
    for (const instant of ['1979-12-31T23:59:59.999Z', '2100-01-01T00:00:00.000Z']) {
      let caught: unknown;
      try {
        compile(new Date(instant));
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(InvalidZipTimestampError);
      expect((caught as InvalidZipTimestampError).code).toBe('invalid_zip_timestamp');
      expect((caught as InvalidZipTimestampError).instant).toBe(instant);
    }
    expect(() => compile(new Date('1980-01-01T00:00:00.000Z'))).not.toThrow();
    expect(() => compile(new Date('2099-12-31T23:59:58.000Z'))).not.toThrow();
  });
});
