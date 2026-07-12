import * as z from 'zod';

/**
 * 材料摄取状态（基座词汇，2026-07-13 随 legal 迁包上移）：reading-view/ingest 管线
 * 的产出状态语言，非法律专属——任何垂类的容器材料都经同一摄取管线。
 * legal.CaseFile 的 ingestStatus 字段引用本枚举。
 */
/**
 * needs_ocr：文件本身可读但无可提取文本层（如扫描件、纯图片），需要 OCR 能力才能继续摄取。
 * 这是预期内的能力边界声明（缺口三态"禁用态"的字段级体现），不是 failed 那样的异常/出错状态——
 * 两者对下游展示（"即将支持"提示 vs 错误提示）与重试逻辑的含义不同，不应合并表达。
 */
export const IngestStatusEnum = z.enum(['pending', 'processing', 'done', 'failed', 'needs_ocr']);
export type IngestStatus = z.infer<typeof IngestStatusEnum>;
