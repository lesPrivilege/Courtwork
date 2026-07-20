import { MATERIAL_BLOCK_REASON_COPY, type MaterialBlockReason } from './material-ref';
import type { ResolveResult } from './material-store';

/**
 * FILE-PREVIEW-1 · 非 demo 案原件阅读的判别层。
 *
 * **本单唯一新增概念，为何非加不可**：判别只有三种去向（可读 / 显式阻断 / 宿主异常），
 * 逻辑本身很薄；但它必须**穷举** `resolveForProvider` 的阻断闭集——漏任何一个 reason
 * 就是一处静默降级（不变量 4）。内联在 `App.tsx` 里有两个坏处：测不到闭集完整性，
 * 且会把那个正被高水位门压缩的文件继续撑大（「过手即拆」纪律要求外提所触面）。
 *
 * **零新错误形态**：阻断文案直接取既有 `MATERIAL_BLOCK_REASON_COPY`（MATERIAL-INGRESS-1
 * 已定的产品语言表），本模块不造第二套措辞，也不新增 reason。
 *
 * **原件只读**：本路径只读不写。`resolveForProvider` 内含入库后重验（重读原件、比对
 * 内容哈希与阅读视图哈希），故「打开原件」这个动作顺带就是一次漂移检查——读到的
 * 一定是与入库时逐字节一致的那份，否则 fail-closed。
 */

export interface MaterialReaderDoc {
  name: string;
  markdown: string;
}

export type MaterialReaderOutcome =
  | { kind: 'reader'; doc: MaterialReaderDoc }
  | { kind: 'blocked'; reason: MaterialBlockReason; message: string };

/**
 * 只取本模块需要的最小面——不绑定 MaterialStore 具体类，便于注入与测试（沿
 * `work/legal-s3-binding.ts` 的 `MaterialResolver` 先例）。
 *
 * **返回类型必须是已定型的 `ResolveResult`，不是 `unknown`**（验收 B 项）：首版写成
 * `Promise<unknown>` 再 `as` 强转，等于在本模块唯一存在理由（把阻断闭集逐条落到显式去向）
 * 上把编译器关掉；而注释还称「沿 legal-s3-binding 先例」——那条先例做的恰好相反。
 */
export interface MaterialResolver {
  resolveForProvider(caseId: string, materialId: string): Promise<ResolveResult>;
}

const blocked = (reason: MaterialBlockReason): MaterialReaderOutcome =>
  ({ kind: 'blocked', reason, message: MATERIAL_BLOCK_REASON_COPY[reason] });

export async function openMaterialReader(
  resolver: MaterialResolver,
  caseId: string,
  materialId: string,
): Promise<MaterialReaderOutcome> {
  let outcome: ResolveResult;
  try {
    outcome = await resolver.resolveForProvider(caseId, materialId);
  } catch {
    // 宿主异常不静默吞：落到 unavailable（原件读不到是它最准确的语义），
    // 绝不返回空阅读面——空白页会被读成「这份文件没内容」，那是另一种假事实。
    return blocked('unavailable');
  }

  if (outcome.status === 'ready') {
    return { kind: 'reader', doc: { name: outcome.material.fileName, markdown: outcome.material.readingMarkdown } };
  }
  if (outcome.reason in MATERIAL_BLOCK_REASON_COPY) return blocked(outcome.reason);
  // 到这里说明 store 给出了文案表里没有的 reason。**编译期本不该发生**（两者同源于
  // `MaterialBlockReason`，`tsc` 会先红）；运行期兜底仍显式阻断、不当作可读，但如实登记
  // 已知边界：此时用户看到的是 `rejected` 的文案，**显式但归因错误**。不为此新造 reason
  // ——「零新错误形态」是票面硬约束，宁可留一条有记录的窄边界。
  return blocked('rejected');
}
