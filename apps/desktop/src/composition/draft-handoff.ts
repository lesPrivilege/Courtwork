import { DraftDocumentSchema } from '@courtwork/generic';

/**
 * 产出 → 通用起草画布的显式移交（GENERIC-SCENARIOS-1 票面一节场景①收口）。
 *
 * **为何住受信组合根**：判定「这枚载荷能不能进画布」必须以包冻结的 schema 为准（ADR-023
 * 决定一），而壳与通用件不得直连包（零泄漏静态门）。故地址、文案与判定一并住此，壳只拿到
 * 一枚领域无关的声明（地址＋文案＋处理器）。
 *
 * **为何不按形状猜**：`{title, paragraphs}` 这个形状谁都可能长成，按形状认就等于宿主替包
 * 认领语义。地址是显式的一枚 artifact type，认不出即拒绝。
 */

/** 可移交进起草画布的产物地址（基线起草产物，恒一枚）。 */
export const DRAFT_HANDOFF_ARTIFACT_TYPE = 'generic.DraftDocument';

/** 动作文案（动词＋名词；voice.md §1）。 */
export const DRAFT_HANDOFF_LABEL = '送入起草画布';

export type DraftHandoffPlan =
  | { status: 'ready'; document: { title: string; paragraphs: string[] } }
  | { status: 'blocked'; message: string };

/**
 * 移交判定（纯函数）。两道显式闸，次序不可交换：
 *
 * 1. **画布已定稿**——定稿即转只读存档是既有确认账（`confirmDraftCompile`），移交不得从背面
 *    把它改回可编辑态；此闸先判，因为用户的下一步（先起新案/先移走产物）与结构不合时不同。
 * 2. **载荷不合包冻结 schema**——半份文稿塞进画布属静默降级（不变量四），一律显式拒绝。
 */
export function planDraftHandoff(input: { payload: unknown; frozen: boolean }): DraftHandoffPlan {
  if (input.frozen) {
    return { status: 'blocked', message: '本案起草画布已定稿转为只读，无法再送入文稿' };
  }
  const parsed = DraftDocumentSchema.safeParse(input.payload);
  if (!parsed.success) {
    return { status: 'blocked', message: '这份产出不是可编辑文稿的形制，无法送入起草画布' };
  }
  return { status: 'ready', document: { title: parsed.data.title, paragraphs: [...parsed.data.paragraphs] } };
}
