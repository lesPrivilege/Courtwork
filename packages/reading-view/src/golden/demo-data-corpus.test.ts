import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { convertToReadingView } from '../convert.js';

interface CorpusFile {
  fileId: string;
  fileName: string;
  content: string;
}

function demoDataRoot(): string {
  const resolved = import.meta.resolve('@courtwork/demo-data');
  return dirname(dirname(fileURLToPath(resolved)));
}

function loadCorpusFiles(): CorpusFile[] {
  const root = demoDataRoot();
  const dossierDir = join(root, 'data', 'dossier');
  const dossierFiles = readdirSync(dossierDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => ({ fileId: name, fileName: name, content: readFileSync(join(dossierDir, name), 'utf-8') }));

  const mainContractPath = join(root, 'data', 'contracts', 'main-contract.md');
  const mainContract: CorpusFile = {
    fileId: 'main-contract.md',
    fileName: 'main-contract.md',
    content: readFileSync(mainContractPath, 'utf-8'),
  };

  return [...dossierFiles, mainContract];
}

describe('样板案语料全量 golden：md 阅读视图路径', () => {
  const corpus = loadCorpusFiles();

  it('样板案恰好 20 份 dossier 文书 + 1 份主合同，共 21 个文件', () => {
    expect(corpus.length).toBe(21);
    expect(corpus.filter((f) => f.fileName.startsWith('main-contract')).length).toBe(1);
  });

  it.each(corpus)('$fileName 转换为阅读视图并产出稳定快照', async ({ fileId, fileName, content }) => {
    const outcome = await convertToReadingView({ fileId, fileName, data: new TextEncoder().encode(content) });
    expect(outcome.status).toBe('ok');
    expect(outcome).toMatchSnapshot();
  });

  it.each(corpus)('$fileName 每个段落的 anchor.textRange 都能精确 slice 回原文', ({ fileId, fileName, content }) => {
    return convertToReadingView({ fileId, fileName, data: new TextEncoder().encode(content) }).then((outcome) => {
      if (outcome.status !== 'ok') throw new Error(`${fileName} 应为 ok 状态，实际是 ${outcome.status}`);
      for (const paragraph of outcome.view.paragraphs) {
        const { start, end } = paragraph.anchor.textRange!;
        expect(content.slice(start, end)).toBe(paragraph.anchor.quote);
      }
    });
  });
});
