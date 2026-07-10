import { describe, expect, it } from 'vitest';
import { convertDocxToReadingView } from './docx-to-markdown.js';
import { DEFAULT_LIMITS } from '../security/limits.js';
import { buildDocxFixture, buildCorruptDocx } from '../test-fixtures/build-docx-fixture.js';

describe('convertDocxToReadingView', () => {
  it('加粗段落渲染为二级标题，正文段落原样渲染', async () => {
    const data = buildDocxFixture({
      blocks: [
        { type: 'paragraph', paragraph: { text: '第二条 付款方式', bold: true } },
        { type: 'paragraph', paragraph: { text: '预付款：合同总价30%。' } },
      ],
    });
    const outcome = await convertDocxToReadingView(
      { fileId: 'f1', fileName: 'contract.docx', data },
      DEFAULT_LIMITS,
    );
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs[0]!.markdown).toBe('## 第二条 付款方式');
    expect(outcome.view.paragraphs[1]!.markdown).toBe('预付款：合同总价30%。');
  });

  it('简单表格渲染为 md 表格语法（内容取自样板案主合同第二条付款方式，验证真实合同场景）', async () => {
    // 样板案 main-contract.md 第二条以行内编号列举付款方式（预付款30%/验收款60%/
    // 质保金10%，见 packages/demo-data/data/contracts/main-contract.md）；真实 Word
    // 合同里这类条款极常见以表格排版，本 fixture 用同样的条款数据构造一份"如果这份
    // 合同是用表格写付款条款"的 docx，验证表格转出路径而非重新发明测试内容。
    const data = buildDocxFixture({
      blocks: [
        { type: 'paragraph', paragraph: { text: '第二条 付款方式', bold: true } },
        {
          type: 'table',
          table: {
            rows: [
              ['期次', '比例', '金额', '支付时点'],
              ['预付款', '30%', '1,140,000元', '合同签订后7日内'],
              ['验收款', '60%', '2,280,000元', '设备验收合格后15日内'],
              ['质保金', '10%', '380,000元', '质保期（12个月）届满后'],
            ],
          },
        },
      ],
    });
    const outcome = await convertDocxToReadingView(
      { fileId: 'f2', fileName: 'contract.docx', data },
      DEFAULT_LIMITS,
    );
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs[0]!.markdown).toBe('## 第二条 付款方式');
    const tableMd = outcome.view.paragraphs[1]!.markdown;
    expect(tableMd).toBe(
      [
        '| 期次 | 比例 | 金额 | 支付时点 |',
        '| --- | --- | --- | --- |',
        '| 预付款 | 30% | 1,140,000元 | 合同签订后7日内 |',
        '| 验收款 | 60% | 2,280,000元 | 设备验收合格后15日内 |',
        '| 质保金 | 10% | 380,000元 | 质保期（12个月）届满后 |',
      ].join('\n'),
    );
    // 静默丢内容是硬禁区：确认全部四期付款信息都真实出现在渲染结果里，不是被截断或摘要。
    expect(tableMd).toContain('1,140,000元');
    expect(tableMd).toContain('2,280,000元');
    expect(tableMd).toContain('380,000元');
  });

  it('含合并单元格表格的文档整文件降级为 disabled/fidelity_insufficient（不静默丢表格内容）', async () => {
    const data = buildDocxFixture({
      blocks: [
        { type: 'paragraph', paragraph: { text: '第二条 付款方式', bold: true } },
        { type: 'table', table: { rows: [['期次', '金额'], ['预付款', '114万']], merged: true } },
      ],
    });
    const outcome = await convertDocxToReadingView(
      { fileId: 'f3', fileName: 'contract.docx', data },
      DEFAULT_LIMITS,
    );
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
  });

  it('每个段落 anchor 都携带 textLayerVersion，且同一文件内全部一致', async () => {
    const data = buildDocxFixture({
      blocks: [
        { type: 'paragraph', paragraph: { text: '段落一' } },
        { type: 'paragraph', paragraph: { text: '段落二' } },
      ],
    });
    const outcome = await convertDocxToReadingView(
      { fileId: 'f4', fileName: 'a.docx', data },
      DEFAULT_LIMITS,
    );
    if (outcome.status !== 'ok') throw new Error('unreachable');
    const versions = outcome.view.paragraphs.map((p) => p.anchor.textLayerVersion);
    expect(versions[0]).toBeDefined();
    expect(versions[0]).toBe(versions[1]);
  });

  it('docx 的 anchor 不填 page（无固定分页概念）', async () => {
    const data = buildDocxFixture({ blocks: [{ type: 'paragraph', paragraph: { text: '段落' } }] });
    const outcome = await convertDocxToReadingView({ fileId: 'f5', fileName: 'a.docx', data }, DEFAULT_LIMITS);
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs[0]!.anchor.page).toBeUndefined();
  });

  it('损坏文件透传 docx-reader 抛出的 reason，映射为 disabled', async () => {
    const data = buildCorruptDocx();
    const outcome = await convertDocxToReadingView({ fileId: 'f6', fileName: 'bad.docx', data }, DEFAULT_LIMITS);
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });
});
