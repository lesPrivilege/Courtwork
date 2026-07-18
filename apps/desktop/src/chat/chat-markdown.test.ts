import { describe, expect, it } from 'vitest';
import { parseMarkdownBlocks } from './ChatMarkdown';

describe('chat md 解析器（批次七②）', () => {
  it('段落按空行切分，段内换行保留为行数组', () => {
    const blocks = parseMarkdownBlocks('第一段第一行\n第一段第二行\n\n第二段');
    expect(blocks).toEqual([
      { kind: 'paragraph', lines: ['第一段第一行', '第一段第二行'] },
      { kind: 'paragraph', lines: ['第二段'] },
    ]);
  });

  it('标题/无序列表/有序列表各归其块', () => {
    const blocks = parseMarkdownBlocks('# 标题\n- 甲\n- 乙\n\n1. 一\n2. 二');
    expect(blocks).toEqual([
      { kind: 'heading', level: 1, text: '标题' },
      { kind: 'list', ordered: false, items: ['甲', '乙'] },
      { kind: 'list', ordered: true, items: ['一', '二'] },
    ]);
  });

  it('围栏代码块整段收纳，内部不再解析', () => {
    const blocks = parseMarkdownBlocks('```\nconst a = **不是加重**;\n# 不是标题\n```\n尾段');
    expect(blocks).toEqual([
      { kind: 'code', text: 'const a = **不是加重**;\n# 不是标题' },
      { kind: 'paragraph', lines: ['尾段'] },
    ]);
  });

  it('缺闭栏容错：到文末收束，不吞行不抛错', () => {
    const blocks = parseMarkdownBlocks('```\n未闭合代码');
    expect(blocks).toEqual([{ kind: 'code', text: '未闭合代码' }]);
  });

  it('纯文本零 markdown 时原样单段', () => {
    const blocks = parseMarkdownBlocks('没有任何标记的回复。');
    expect(blocks).toEqual([{ kind: 'paragraph', lines: ['没有任何标记的回复。'] }]);
  });
});

describe('管道表格解析（CHAT-MD-TABLE-1 ①，审慎 GFM 子集）', () => {
  it('合法管道表格进 table 块：表头/分隔行/数据行三分', () => {
    const blocks = parseMarkdownBlocks('| 列甲 | 列乙 |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |');
    expect(blocks).toEqual([
      { kind: 'table', align: [null, null], header: ['列甲', '列乙'], rows: [['1', '2'], ['3', '4']] },
    ]);
  });

  it('分隔行对齐标记（左/右/居中）逐列解析', () => {
    const blocks = parseMarkdownBlocks('| 甲 | 乙 | 丙 |\n| :--- | ---: | :---: |\n| a | b | c |');
    expect(blocks).toEqual([
      { kind: 'table', align: ['left', 'right', 'center'], header: ['甲', '乙', '丙'], rows: [['a', 'b', 'c']] },
    ]);
  });

  it('省略首尾竖线的表格行同样识别为合法语法', () => {
    const blocks = parseMarkdownBlocks('甲 | 乙\n--- | ---\n1 | 2');
    expect(blocks).toEqual([
      { kind: 'table', align: [null, null], header: ['甲', '乙'], rows: [['1', '2']] },
    ]);
  });

  it('表格后空行接段落：表格不吞尾段', () => {
    const blocks = parseMarkdownBlocks('| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |\n\n尾段文字');
    expect(blocks).toEqual([
      { kind: 'table', align: [null, null], header: ['甲', '乙'], rows: [['1', '2']] },
      { kind: 'paragraph', lines: ['尾段文字'] },
    ]);
  });

  it('畸形：分隔行缺失，整体降级回段落（不猜测补全）', () => {
    const blocks = parseMarkdownBlocks('| 甲 | 乙 |\n| 1 | 2 |');
    expect(blocks).toEqual([{ kind: 'paragraph', lines: ['| 甲 | 乙 |', '| 1 | 2 |'] }]);
  });

  it('畸形：分隔行列数与表头不符，整体降级回段落', () => {
    const blocks = parseMarkdownBlocks('| 甲 | 乙 |\n| --- |\n| 1 | 2 |');
    expect(blocks).toEqual([{ kind: 'paragraph', lines: ['| 甲 | 乙 |', '| --- |', '| 1 | 2 |'] }]);
  });

  it('畸形：分隔行单元格不匹配 -/: 语法，整体降级回段落', () => {
    const blocks = parseMarkdownBlocks('| 甲 | 乙 |\n| foo | bar |\n| 1 | 2 |');
    expect(blocks).toEqual([{ kind: 'paragraph', lines: ['| 甲 | 乙 |', '| foo | bar |', '| 1 | 2 |'] }]);
  });

  it('歧义：数据行列数与表头不符处表格止步，不猜测补全/截断该行', () => {
    const blocks = parseMarkdownBlocks('| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |\n| 只一列 |\n| 3 | 4 |');
    expect(blocks).toEqual([
      { kind: 'table', align: [null, null], header: ['甲', '乙'], rows: [['1', '2']] },
      { kind: 'paragraph', lines: ['| 只一列 |', '| 3 | 4 |'] },
    ]);
  });

  it('列表/标题起始行优先于表格判定，不误吞', () => {
    const blocks = parseMarkdownBlocks('- 甲 | 乙\n- 丙 | 丁');
    expect(blocks).toEqual([{ kind: 'list', ordered: false, items: ['甲 | 乙', '丙 | 丁'] }]);
  });

  it('围栏代码块内的管道文本不被误判为表格', () => {
    const blocks = parseMarkdownBlocks('```\n| 甲 | 乙 |\n| --- | --- |\n```');
    expect(blocks).toEqual([{ kind: 'code', text: '| 甲 | 乙 |\n| --- | --- |' }]);
  });
});

describe('--- hr 分隔线解析（CHAT-MD-TABLE-1 ②）', () => {
  it('独占一行的 --- 归 hr 块', () => {
    const blocks = parseMarkdownBlocks('第一段\n\n---\n\n第二段');
    expect(blocks).toEqual([
      { kind: 'paragraph', lines: ['第一段'] },
      { kind: 'hr' },
      { kind: 'paragraph', lines: ['第二段'] },
    ]);
  });

  it('紧跟段落无空行：--- 仍独立成 hr 块（不支持 Setext 标题语法，不猜测意图）', () => {
    const blocks = parseMarkdownBlocks('结论文字\n---');
    expect(blocks).toEqual([
      { kind: 'paragraph', lines: ['结论文字'] },
      { kind: 'hr' },
    ]);
  });

  it('两个短横线不构成 hr，按普通段落文字处理', () => {
    const blocks = parseMarkdownBlocks('--');
    expect(blocks).toEqual([{ kind: 'paragraph', lines: ['--'] }]);
  });

  it('围栏代码块内的 --- 不被误判为 hr', () => {
    const blocks = parseMarkdownBlocks('```\n---\n```');
    expect(blocks).toEqual([{ kind: 'code', text: '---' }]);
  });
});
