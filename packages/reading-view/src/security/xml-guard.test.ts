import { describe, expect, it } from 'vitest';
import { assertNoDangerousMarkup, parseXmlStrict, XmlSecurityError, XmlParseError } from './xml-guard.js';

describe('assertNoDangerousMarkup', () => {
  it('普通 XML 不抛错', () => {
    expect(() => assertNoDangerousMarkup('<root><a>1</a></root>')).not.toThrow();
  });

  it('含 DOCTYPE 声明时抛 XmlSecurityError', () => {
    expect(() => assertNoDangerousMarkup('<!DOCTYPE foo><root/>')).toThrow(XmlSecurityError);
  });

  it('含 ENTITY 声明时抛 XmlSecurityError', () => {
    const xxe = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>';
    expect(() => assertNoDangerousMarkup(xxe)).toThrow(XmlSecurityError);
  });
});

describe('parseXmlStrict', () => {
  it('合法 XML 正常解析', () => {
    const doc = parseXmlStrict('<root><a>1</a></root>');
    expect(doc.documentElement?.nodeName).toBe('root');
  });

  it('标签不匹配时抛 XmlParseError（不是静默返回半解析结果）', () => {
    expect(() => parseXmlStrict('<root><a>1</b></root>')).toThrow(XmlParseError);
  });

  it('截断的 XML 抛 XmlParseError', () => {
    expect(() => parseXmlStrict('<root><a>1</a>')).toThrow(XmlParseError);
  });

  it('重复属性抛 XmlParseError', () => {
    expect(() => parseXmlStrict('<root a="1" a="2">x</root>')).toThrow(XmlParseError);
  });

  it('含 DOCTYPE 时在字符串级检测阶段就抛 XmlSecurityError（不会走到底层解析器）', () => {
    expect(() => parseXmlStrict('<!DOCTYPE foo><root>x</root>')).toThrow(XmlSecurityError);
  });
});
