import { compileDraftToDocx } from '@courtwork/output';
import type { CaseBinding } from '../case/case-scope';
import { caseOutputClient } from './case-output-client';

/**
 * 起草画布 → 案件产出目录的编译落盘（GENERIC-SCENARIOS-1 顺带清偿）。
 *
 * 两处清偿都落在这里，且是同一件事的两面：
 *
 * 1. **产物名中性化**：`答辩意见.docx` 是通用壳里的垂类文案——起草画布是 ADR-015 成品律点名的
 *    通用主工作面，零绑定 matter 上也在，产物却叫一个只有诉讼语境才成立的名字。改为中性
 *    `起草文稿.docx`。
 *
 *    这里**取「最小中性化」而非版本化命名**（票面顺带清偿条给了二选一）：版本化名会让
 *    `caseOutputClient.exists` 的挂载期存在性探测失去可问的对象（同 `contract-review-file-name`
 *    的 grant 路径注释「固定名只对样板案提问」），而起草画布的**定稿冻结**恰恰靠那次探测
 *    跨重启成立。为一个中性化改动牺牲冻结的持久性不划算，故留固定名。
 *
 * 2. **落盘改原子 no-replace**：`writeDocx` 的 `overwrite: true` 退役。固定名 ＋ no-replace 是
 *    自洽的：编译成功即画布冻结转只读，产品路径上第二次编译不可达；真出现同名文件（用户在
 *    访达手放了一份）时 no-replace 会**显式**报出来，而不是把用户的文件悄悄盖掉。
 */

/** 起草画布产物名（中性、固定；见上文为何不版本化）。 */
export const DRAFT_OUTPUT_FILE = '起草文稿.docx';

export type DraftCompileOutcome =
  | { status: 'written'; fileName: string }
  | { status: 'blocked'; message: string };

/** 落盘失败三态 → 产品语（零技术概念暴露；「读不到」与「不存在」不折成同一句）。 */
const WRITE_FAILURE_COPY: Readonly<Record<string, string>> = {
  invalid_input: '文稿内容无法写入 Word，请检查后重试',
  unbound: '本案尚未绑定案件文件夹',
  unavailable: '暂时无法写入本案「产出」目录，请稍后重试',
};

/**
 * 编译并原子落盘。写成后再向宿主确认一次存在——写入回执与目录事实不是一回事
 * （`failed` 之后 effect 未知，必须重新提问）。
 */
export async function compileDraftToCaseOutput(input: {
  binding: CaseBinding;
  draft: { title: string; paragraphs: readonly string[] };
}): Promise<DraftCompileOutcome> {
  if (input.binding.kind === 'unbound') return { status: 'blocked', message: '本案尚未绑定案件文件夹' };
  let bytes: Uint8Array;
  try {
    bytes = compileDraftToDocx({ title: input.draft.title, paragraphs: input.draft.paragraphs });
  } catch (error) {
    return { status: 'blocked', message: error instanceof Error ? error.message : 'Word 产物生成失败' };
  }
  const result = await caseOutputClient.writeDocxNoReplace(input.binding, DRAFT_OUTPUT_FILE, bytes);
  if (result.status === 'exists') {
    return { status: 'blocked', message: `本案「产出」目录已有同名文件：${DRAFT_OUTPUT_FILE} · 请先移走再定稿` };
  }
  if (result.status === 'failed') {
    return { status: 'blocked', message: WRITE_FAILURE_COPY[result.reason] ?? 'Word 产物写入失败，请稍后重试' };
  }
  const exists = await caseOutputClient.exists(input.binding, DRAFT_OUTPUT_FILE);
  if (!exists) return { status: 'blocked', message: 'Word 产物写入后未能在案件产出目录确认' };
  return { status: 'written', fileName: DRAFT_OUTPUT_FILE };
}
