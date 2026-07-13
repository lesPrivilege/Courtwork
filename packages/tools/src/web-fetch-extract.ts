import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import type { WebReferenceContentType } from './contract.js';

/** 正文提取判定"内容不足/提取失败"的最小字符数阈值——MVP 阶段的经验值，非精确科学。 */
const MIN_CONTENT_LENGTH = 200;

/**
 * content-type 白名单（docs/decisions/ADR-005-data-security.md MVP 最小集第 3 条）：html/text/json 三类，参数带解析
 * 忽略大小写与 `; charset=...` 等附加参数。其余一律不支持（图片/PDF/二进制等）。
 */
export function classifyContentType(header: string): WebReferenceContentType | undefined {
  const mime = header.split(';')[0]?.trim().toLowerCase();
  if (!mime) return undefined;
  if (mime === 'text/html' || mime === 'application/xhtml+xml') return 'html';
  if (mime === 'text/plain') return 'text';
  if (mime === 'application/json' || mime === 'text/json') return 'json';
  return undefined;
}

/**
 * 大小上限流式读取：不对无界响应体做完整缓冲（如 response.text() 那样），超过 maxBytes
 * 立即截断并取消底层流。截断点可能落在多字节 UTF-8 字符中间——TextDecoder 默认
 * （fatal:false）会在末尾吐出一个替代字符而不是抛错，这是截断内容可接受的边角瑕疵，
 * 不做额外的边界对齐处理（MVP 阶段代价不成比例）。
 */
export async function readBodyWithLimit(response: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) {
    return { text: await response.text(), truncated: false };
  }

  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.byteLength;
    if (received > maxBytes) {
      const allowed = value.byteLength - (received - maxBytes);
      text += decoder.decode(value.subarray(0, Math.max(0, allowed)), { stream: true });
      truncated = true;
      await reader.cancel();
      break;
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return { text, truncated };
}

export interface ExtractedContent {
  title?: string;
  text: string;
  /** 正文提取过短或失败的启发式判定——常见于 JS 渲染壳页面（本工具不执行 JS）。 */
  possiblyIncomplete: boolean;
}

/**
 * html → 正文提取（docs/decisions/ADR-005-data-security.md MVP 最小集第 3 条）：jsdom 构造 DOM 后交给
 * @mozilla/readability 做正文识别。**不设置 runScripts / resources 选项是刚性安全要求，
 * 不是遗漏**——默认值即"不执行任何嵌入脚本、不拉取外部资源"，这是"不执行 JS"红线在
 * 这一层的落点，后续维护者不得为了兼容某个站点而打开这两个选项。
 *
 * Readability 找不到正文（常见于 JS 渲染壳：整页只有一个空 <div id="root"> 和
 * <script> 标签）或提取结果过短时，降级为读取 <body> 全部可见文本并标记
 * possiblyIncomplete:true——如实声明"内容可能不完整"，不吐一个看似正常实则空洞的结果。
 */
export function extractHtmlContent(html: string, url: string): ExtractedContent {
  const dom = new JSDOM(html, { url });

  try {
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    const text = article?.textContent?.trim() ?? '';
    if (article && text.length >= MIN_CONTENT_LENGTH) {
      return { title: article.title || undefined, text, possiblyIncomplete: false };
    }
  } catch {
    // Readability 解析失败时走下方降级路径，不中断整体抓取。
  }

  const fallbackText = (dom.window.document.body?.textContent ?? '').trim();
  return {
    title: dom.window.document.title || undefined,
    text: fallbackText,
    possiblyIncomplete: true,
  };
}
