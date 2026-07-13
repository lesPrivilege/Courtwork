import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { preflightDocx } from '@courtwork/reading-view/docx-security';
import { compileDraftToDocx } from './compile-draft-to-docx.js';

describe('compileDraftToDocx', () => {
  it('把起草画布编译为可通过同源预检的 OOXML 产物', () => {
    const docx = compileDraftToDocx({
      title: '答辩意见 & 请求',
      paragraphs: ['第一段：合同价款 < 400 万元。', '第二段：请求驳回。'],
    });

    expect(docx.subarray(0, 2).toString('utf-8')).toBe('PK');
    expect(() => preflightDocx(docx)).not.toThrow();

    const files = unzipSync(docx);
    const documentXml = strFromU8(files['word/document.xml']);
    expect(documentXml).toContain('答辩意见 &amp; 请求');
    expect(documentXml).toContain('合同价款 &lt; 400 万元');
    expect(documentXml).toContain('w:eastAsia="仿宋_GB2312"');
    expect(documentXml).toContain('w:eastAsia="黑体"');
  });

  it('拒绝空标题或全空正文，不制造纸面定稿', () => {
    expect(() => compileDraftToDocx({ title: '   ', paragraphs: ['正文'] })).toThrow('标题不能为空');
    expect(() => compileDraftToDocx({ title: '答辩意见', paragraphs: [' ', ''] })).toThrow('正文不能为空');
  });
});
