/**
 * MATERIAL-INGRESS-1：source-neutral 材料引用与已持久材料形制（ADR-010 决定四）。
 *
 * 契约红线：`MaterialRef` opaque、source-neutral——wire 不携带绝对/相对路径，经 `materialId` 引用；
 * 宿主独占路径、授权与来源 provenance。原件永远只读、原地不动（grant root 之下）。
 *
 * 落点裁定（2026-07-16，见 SPEC）：本型别驻 apps/desktop，零改 packages/core 导出——
 * ADR-010 未强制 core 落点（Work wire 用 `materialRefs: string[]` id，executor 消费 `MaterialInput`
 * 而非 `MaterialRef`；当前无 core 消费者）；纯加法、最小侵入。
 */

/** 材料三态：ready 可入请求；needs_ocr 待文字识别（本单只阻断，不做 OCR）；rejected reading-view 不可转出/空。 */
export type MaterialStatus = 'ready' | 'needs_ocr' | 'rejected';

/** 文本层块（引用公证基底），由 reading-view 段落 1:1 派生。 */
export interface MaterialBlock {
  blockId: string;
  page?: number;
  /** 块文本取锚点 quote（原件真实子串），非 markdown——公证对原文。 */
  text: string;
  rangeBase: number;
  textLayerVersion: string;
}

/** ADR-010 决定四：source-neutral 材料引用。**永不携带路径。** */
export interface MaterialRef {
  materialId: string;
  caseId: string;
  fileName: string;
  mediaType: string;
  byteLength: number;
  contentSha256: string;
  readingViewVersion: string;
  readingViewSha256: string;
  status: MaterialStatus;
}

/**
 * 已持久材料：MaterialRef + 持久 ReadingView 派生内容（模型阅读母语 + 公证基底）。
 * provider 前验证的读侧真源；仍 source-neutral（无 provenance）。
 */
export interface StoredMaterial extends MaterialRef {
  readingMarkdown: string;
  blocks: MaterialBlock[];
}

/**
 * provider 前阻断原因闭集（每类显式到达 UI，零静默降级）：
 * - content_drift：原件字节漂移（hash 不符）
 * - reading_drift：ReadingView 派生哈希漂移（转换器语义/内容变）
 * - unavailable：原件删除或卷卸载
 * - revoked：授权失效或记录缺失
 * - out_of_scope：跨 case / 越权
 * - needs_ocr：材料需文字识别
 * - rejected：reading-view 判 disabled 或空内容
 * - not_found：材料未持久
 */
export type MaterialBlockReason =
  | 'content_drift'
  | 'reading_drift'
  | 'unavailable'
  | 'revoked'
  | 'out_of_scope'
  | 'needs_ocr'
  | 'rejected'
  | 'not_found';

/** 阻断可见文案（chrome 中文；不泄漏路径、grantId 或技术栈名词）。 */
export const MATERIAL_BLOCK_REASON_COPY: Record<MaterialBlockReason, string> = {
  content_drift: '原件内容自入库后已改动，为避免引用错位已阻止使用。请重新入库该文件。',
  reading_drift: '该文件的阅读视图已失效，为避免引用错位已阻止使用。请重新入库该文件。',
  unavailable: '找不到原件，可能已被移动、删除或所在磁盘未挂载。请重新入库该文件。',
  revoked: '此前的访问授权已失效。请重新绑定案件文件夹并入库。',
  out_of_scope: '该材料不属于当前案件，已阻止跨案引用。',
  needs_ocr: '该文件需要文字识别后才能使用，暂不可引用。',
  rejected: '该文件无法安全转为可引用的阅读视图，暂不可引用。',
  not_found: '未找到该材料，可能尚未入库。',
};
