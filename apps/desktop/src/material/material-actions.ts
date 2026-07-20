import { MATERIAL_BLOCK_REASON_COPY } from './material-ref';
import { openMaterialReader, type MaterialReaderDoc } from './material-reader';

/**
 * 卷宗原件区的两个动作（核验 / 阅读）——**「过手即拆」纪律的产物**。
 *
 * 二者原本内联在 `App.tsx`，同一批（FILE-PREVIEW-1）触碰到它们时按纪律外提。它们本就
 * 同族：都以 `caseId + materialId` 打到 MaterialStore 的同一条重验链，都以同一个显式态
 * 通道回话，差别只在成功时一个报文案、一个开阅读面。留在 App.tsx 里既让那个文件继续
 * 长胖（高水位门在压），也让「阻断必须显式」这条不变量散落在 UI 组装代码里测不到。
 *
 * 本模块只做**纯编排**：不持有状态、不碰 React。副作用经参数注入，故可直接单测。
 */

interface MaterialResolver {
  resolveForProvider(caseId: string, materialId: string): Promise<unknown>;
}

export interface MaterialActionSink {
  /** 显式态通道（既有 systemFeedback）。ok=false 即用户可见的阻断陈述。 */
  feedback: (message: string, ok: boolean) => void;
  /** 打开只读阅读面。仅在材料重验通过时调用。 */
  openReader: (doc: MaterialReaderDoc) => void;
}

/** 核验：重读原件、比对哈希，结果一律显式——通过与阻断都说话，不静默。 */
export async function verifyMaterialAction(
  resolver: MaterialResolver,
  caseId: string,
  materialId: string,
  sink: Pick<MaterialActionSink, 'feedback'>,
): Promise<void> {
  const resolved = (await resolver.resolveForProvider(caseId, materialId)) as
    | { status: 'ready'; material: { fileName: string } }
    | { status: 'blocked'; reason: keyof typeof MATERIAL_BLOCK_REASON_COPY };
  if (resolved.status === 'ready') {
    sink.feedback(`原件校验通过：${resolved.material.fileName} 可用于生成`, true);
    return;
  }
  sink.feedback(MATERIAL_BLOCK_REASON_COPY[resolved.reason], false);
}

/** 阅读：重验通过才开面；任何阻断都走显式态，绝不开空白阅读面（空白会被读成「这份文件没内容」）。 */
export async function readMaterialAction(
  resolver: MaterialResolver,
  caseId: string,
  materialId: string,
  sink: MaterialActionSink,
): Promise<void> {
  const outcome = await openMaterialReader(resolver, caseId, materialId);
  if (outcome.kind === 'blocked') {
    sink.feedback(outcome.message, false);
    return;
  }
  sink.openReader(outcome.doc);
}
