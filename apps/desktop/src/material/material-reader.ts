import { MATERIAL_BLOCK_REASON_COPY, type MaterialBlockReason } from './material-ref';

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

/** 只取本模块需要的最小面——不绑定 MaterialStore 具体类，便于注入与测试（沿 legal-s3-binding 先例）。 */
interface MaterialResolver {
  resolveForProvider(caseId: string, materialId: string): Promise<unknown>;
}

const blocked = (reason: MaterialBlockReason): MaterialReaderOutcome =>
  ({ kind: 'blocked', reason, message: MATERIAL_BLOCK_REASON_COPY[reason] });

export async function openMaterialReader(
  resolver: MaterialResolver,
  caseId: string,
  materialId: string,
): Promise<MaterialReaderOutcome> {
  let result: unknown;
  try {
    result = await resolver.resolveForProvider(caseId, materialId);
  } catch {
    // 宿主异常不静默吞：落到 unavailable（原件读不到是它最准确的语义），
    // 绝不返回空阅读面——空白页会被读成「这份文件没内容」，那是另一种假事实。
    return blocked('unavailable');
  }

  const outcome = result as
    | { status: 'ready'; material: { fileName: string; readingMarkdown: string } }
    | { status: 'blocked'; reason: MaterialBlockReason };

  if (outcome?.status === 'ready') {
    return { kind: 'reader', doc: { name: outcome.material.fileName, markdown: outcome.material.readingMarkdown } };
  }
  if (outcome?.status === 'blocked' && outcome.reason in MATERIAL_BLOCK_REASON_COPY) {
    return blocked(outcome.reason);
  }
  // 既非 ready 又非已知 reason：仍显式阻断，不当作可读。新增 reason 时上面的单测会先红。
  return blocked('rejected');
}
