import { DOMParser, onErrorStopParsing } from '@xmldom/xmldom';
import type { Document } from '@xmldom/xmldom';

export class XmlSecurityError extends Error {}
export class XmlParseError extends Error {}

/**
 * 真实的 Word/WPS 导出的 document.xml/styles.xml 等部件永远不会含 DOCTYPE/ENTITY 声明。
 * 字符串级探测是双保险——不单纯信任 @xmldom/xmldom 的默认解析行为（实测其默认配置下
 * 裸 DOCTYPE 不会被当作错误拒绝，必须自己挡）。
 */
const DANGEROUS_MARKUP_PATTERN = /<!DOCTYPE|<!ENTITY/i;

export function assertNoDangerousMarkup(xmlText: string): void {
  if (DANGEROUS_MARKUP_PATTERN.test(xmlText)) {
    throw new XmlSecurityError('XML 内容包含 DOCTYPE/ENTITY 声明，拒绝解析（XXE 防护）');
  }
}

/**
 * onError: onErrorStopParsing 让 error/fatalError 级别的问题同步抛出 ParseError，
 * 而不是像默认配置那样只把 fatalError 抛出、error 只打日志继续解析——
 * 本包需要"任何解析异常都不产出半解析结果"的严格保证。
 */
export function parseXmlStrict(xmlText: string): Document {
  assertNoDangerousMarkup(xmlText);
  try {
    return new DOMParser({ onError: onErrorStopParsing }).parseFromString(xmlText, 'text/xml');
  } catch (err) {
    throw new XmlParseError(`XML 解析失败：${err instanceof Error ? err.message : String(err)}`);
  }
}
