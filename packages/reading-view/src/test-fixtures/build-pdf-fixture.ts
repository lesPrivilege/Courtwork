/**
 * 测试专用：手工拼装最小 PDF（PDF 1.4，逐字节精确计算 xref 偏移量），已用 pdfjs-dist
 * 实测验证可正确解析、可正确提取文本、无内容流的页面确实返回空文本。
 */

export function buildPdfFixture(pageContentStreams: string[]): Uint8Array {
  const chunks: string[] = [];
  let byteLength = 0;
  const push = (s: string) => {
    chunks.push(s);
    byteLength += Buffer.byteLength(s, 'latin1');
  };

  push('%PDF-1.4\n');

  const pageCount = pageContentStreams.length;
  const fontObjNum = 3 + 2 * pageCount;
  const kids = Array.from({ length: pageCount }, (_, i) => `${3 + i} 0 R`).join(' ');

  const objs: string[] = [];
  objs.push('<< /Type /Catalog /Pages 2 0 R >>'); // obj 1
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`); // obj 2
  for (let i = 0; i < pageCount; i++) {
    objs.push(
      `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /MediaBox [0 0 200 200] /Contents ${3 + pageCount + i} 0 R >>`,
    ); // obj 3..2+pageCount
  }
  for (const content of pageContentStreams) {
    objs.push(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
  } // obj 3+pageCount..2+2*pageCount
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); // obj fontObjNum

  const offsets: number[] = [0];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(byteLength);
    push(`${i + 1} 0 obj\n${objs[i]}\nendobj\n`);
  }

  const xrefOffset = byteLength;
  const total = objs.length + 1;
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Uint8Array(Buffer.from(chunks.join(''), 'latin1'));
}

export function buildPdfWithTextLayer(text = 'Hello World'): Uint8Array {
  return buildPdfFixture([`BT /F1 24 Tf 20 100 Td (${text}) Tj ET`]);
}

export function buildPdfWithoutTextLayer(): Uint8Array {
  return buildPdfFixture(['']);
}

/** 混合场景：第一页有文本、第二页没有——用于验证"只要有一页有文本仍判 ok"。 */
export function buildPdfWithMixedTextLayers(): Uint8Array {
  return buildPdfFixture(['BT /F1 24 Tf 20 100 Td (Page One Text) Tj ET', '']);
}

export function buildCorruptPdf(): Uint8Array {
  return new Uint8Array(Buffer.from('%PDF-1.4\nnot a real pdf body', 'latin1'));
}
