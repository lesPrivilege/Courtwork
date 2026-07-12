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
