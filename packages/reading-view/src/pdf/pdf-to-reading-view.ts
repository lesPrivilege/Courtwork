// 注意：Node 环境必须从 legacy 入口导入，裸 'pdfjs-dist' 在 Node 下会因缺少浏览器
// 全局对象（如 DOMMatrix）而报错——这一点已用探测脚本实测确认，不是习惯性写法。
import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { computeTextLayerVersion } from '../text-layer-version.js';
import type { ConvertInput, ReadingView, ReadingViewOutcome, ReadingViewParagraph } from '../types.js';

const CONVERTER_NAMESPACE = 'reading-view-pdf@1';

export async function convertPdfToReadingView(input: ConvertInput): Promise<ReadingViewOutcome> {
  let doc;
  try {
    doc = await getDocument({
      data: input.data,
      useWorkerFetch: false,
      isEvalSupported: false,
      verbosity: VerbosityLevel.ERRORS,
    }).promise;
  } catch (err) {
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'corrupt_file',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    const paragraphs: ReadingViewParagraph[] = [];
    let hasAnyText = false;
    let index = 0;

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => ('str' in item ? item.str : '')).join('');
      if (pageText.trim().length === 0) continue;
      hasAnyText = true;
      const textLayerVersion = computeTextLayerVersion(CONVERTER_NAMESPACE, pageText);
      paragraphs.push({
        index: index++,
        markdown: pageText,
        anchor: {
          fileId: input.fileId,
          page: pageNumber,
          textRange: { start: 0, end: pageText.length },
          quote: pageText,
          textLayerVersion,
        },
      });
    }

    if (!hasAnyText) {
      return { status: 'needs_ocr', fileId: input.fileId, fileName: input.fileName, detail: '全部页面均无可提取文本层' };
    }

    const view: ReadingView = {
      fileId: input.fileId,
      markdown: paragraphs.map((p) => p.markdown).join('\n\n'),
      paragraphs,
    };
    return { status: 'ok', fileId: input.fileId, fileName: input.fileName, view, pageCount: doc.numPages };
  } finally {
    await doc.destroy();
  }
}
