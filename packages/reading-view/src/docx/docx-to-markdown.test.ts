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

describe('READING-SDT-1 · 块级白名单外整文件降级（不静默丢内容）', () => {
  const SDT_P =
    '<w:sdt><w:sdtPr/><w:sdtContent><w:p><w:r><w:t xml:space="preserve">第五条 违约责任：违约金为合同总价百分之十。</w:t></w:r></w:p></w:sdtContent></w:sdt>';

  it('body 级 w:sdt 包段落：整文件降级并具名 sdt，正文不静默消失', async () => {
    const data = buildDocxFixture({
      blocks: [
        { type: 'paragraph', paragraph: { text: '第一条 总则' } },
        { type: 'raw', xml: SDT_P },
      ],
    });
    const outcome = await convertDocxToReadingView({ fileId: 'f-sdt-p', fileName: 'c.docx', data }, DEFAULT_LIMITS);
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    if (outcome.status !== 'disabled') throw new Error('unreachable');
    expect(outcome.detail).toContain('sdt');
  });

  it('body 级 w:sdt 包表格：同样整文件降级', async () => {
    const data = buildDocxFixture({
      blocks: [
        {
          type: 'raw',
          xml: '<w:sdt><w:sdtContent><w:tbl><w:tr><w:tc><w:p><w:r><w:t>期次</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:sdtContent></w:sdt>',
        },
      ],
    });
    const outcome = await convertDocxToReadingView({ fileId: 'f-sdt-t', fileName: 'c.docx', data }, DEFAULT_LIMITS);
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
  });

  it('单元格内嵌套表格：整文件降级并具名，不静默丢内层文本', async () => {
    const data = buildDocxFixture({
      blocks: [
        {
          type: 'raw',
          xml: '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>外层</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>内层保证金条款</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:tc></w:tr></w:tbl>',
        },
      ],
    });
    const outcome = await convertDocxToReadingView({ fileId: 'f-nested', fileName: 'c.docx', data }, DEFAULT_LIMITS);
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    if (outcome.status !== 'disabled') throw new Error('unreachable');
    expect(outcome.detail).toContain('tbl');
  });

  it('白名单外未知块级节点必不静默通过（合成标签反例）', async () => {
    const data = buildDocxFixture({
      blocks: [{ type: 'raw', xml: '<w:zzUnknownBlock><w:p><w:r><w:t>正文</w:t></w:r></w:p></w:zzUnknownBlock>' }],
    });
    const outcome = await convertDocxToReadingView({ fileId: 'f-unk', fileName: 'c.docx', data }, DEFAULT_LIMITS);
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    if (outcome.status !== 'disabled') throw new Error('unreachable');
    expect(outcome.detail).toContain('zzUnknownBlock');
  });

  it('白名单内良性节点（sectPr/bookmark/proofErr/commentRange）照常 ok，段落零损', async () => {
    const data = buildDocxFixture({
      blocks: [
        { type: 'raw', xml: '<w:bookmarkStart w:id="0" w:name="_Toc1"/>' },
        { type: 'paragraph', paragraph: { text: '第一条 总则' } },
        {
          type: 'raw',
          xml: '<w:bookmarkEnd w:id="0"/><w:proofErr w:type="spellStart"/><w:commentRangeStart w:id="1"/><w:commentRangeEnd w:id="1"/>',
        },
        { type: 'paragraph', paragraph: { text: '第二条 定义' } },
        { type: 'raw', xml: '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>' },
      ],
    });
    const outcome = await convertDocxToReadingView({ fileId: 'f-benign', fileName: 'c.docx', data }, DEFAULT_LIMITS);
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.markdown).toContain('第一条 总则');
    expect(outcome.view.markdown).toContain('第二条 定义');
  });
});

/**
 * READING-SDT-1R：首轮只闭了 body 与 `w:tc` 两道直子过滤器，`w:tbl→w:tr` 与 `w:tr→w:tc`
 * 两道仍是「不认识就跳过」（fail-open），外加所有门禁判据只比 localName 不比命名空间。
 * 下面每一枚都在首轮 tip 上先实测为红（现状 status:'ok' 且内容静默消失），再最小实现转绿。
 */
describe('READING-SDT-1R · 表内两道直子过滤器与外部命名空间同样 fail-closed', () => {
  const cell = (text: string) => `<w:tc><w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p></w:tc>`;
  const MERGED_CELL = '<w:tc><w:tcPr><w:gridSpan w:val="2"/></w:tcPr><w:p><w:r><w:t>期次</w:t></w:r></w:p></w:tc>';

  async function convertRaw(fileId: string, xml: string) {
    const data = buildDocxFixture({ blocks: [{ type: 'raw', xml }] });
    return convertDocxToReadingView({ fileId, fileName: 'c.docx', data }, DEFAULT_LIMITS);
  }

  it('P1 · w:tbl 的行被 w:sdt 包住（重复节内容控件，真实付款表常见）：整文件降级并具名 sdt', async () => {
    const outcome = await convertRaw(
      'p1',
      `<w:tbl><w:sdt><w:sdtContent><w:tr>${cell('预付款')}${cell('1,140,000元')}</w:tr></w:sdtContent></w:sdt></w:tbl>`,
    );
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    if (outcome.status !== 'disabled') throw new Error('unreachable');
    expect(outcome.detail).toContain('sdt');
  });

  it('P2 · w:tr 的单元格被 w:sdt 包住：整文件降级并具名 sdt', async () => {
    const outcome = await convertRaw(
      'p2',
      `<w:tbl><w:tr><w:sdt><w:sdtContent>${cell('1,140,000元')}</w:sdtContent></w:sdt></w:tr></w:tbl>`,
    );
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    if (outcome.status !== 'disabled') throw new Error('unreachable');
    expect(outcome.detail).toContain('sdt');
  });

  it('P9 · w:customXml 包住 w:tr：与 sdt 同族，整文件降级并具名 customXml', async () => {
    const outcome = await convertRaw(
      'p9',
      `<w:tbl><w:customXml w:element="Row"><w:tr>${cell('质保金')}${cell('380,000元')}</w:tr></w:customXml></w:tbl>`,
    );
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    if (outcome.status !== 'disabled') throw new Error('unreachable');
    expect(outcome.detail).toContain('customXml');
  });

  it('P10/P11 成对 · 合并单元格在裸 w:tr 下降级；同一合并单元格被 w:sdt 包住后必须同样降级（本包唯一保真出口不可被一层包装绕过）', async () => {
    const bare = await convertRaw('p10', `<w:tbl><w:tr>${MERGED_CELL}</w:tr></w:tbl>`);
    const wrapped = await convertRaw(
      'p11',
      `<w:tbl><w:sdt><w:sdtContent><w:tr>${MERGED_CELL}</w:tr></w:sdtContent></w:sdt></w:tbl>`,
    );
    expect(bare).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    expect(wrapped).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    // 包装形必须在 tbl 直子门禁上就被拒——早于合并探测，故 detail 具名 sdt 而不是合并单元格文案。
    if (wrapped.status !== 'disabled') throw new Error('unreachable');
    expect(wrapped.detail).toContain('sdt');
  });

  it('P3 · 外部命名空间借用良性名（zz:sectPr 携正文）：不得被良性名单吞掉，且报错不冒充 w: 节点', async () => {
    const data = buildDocxFixture({
      blocks: [
        { type: 'paragraph', paragraph: { text: '第一条 总则' } },
        {
          type: 'raw',
          xml: '<zz:sectPr xmlns:zz="urn:x"><w:p><w:r><w:t>第三条 保密义务：乙方不得披露。</w:t></w:r></w:p></zz:sectPr>',
        },
      ],
    });
    const outcome = await convertDocxToReadingView({ fileId: 'p3', fileName: 'c.docx', data }, DEFAULT_LIMITS);
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    if (outcome.status !== 'disabled') throw new Error('unreachable');
    expect(outcome.detail).toContain('zz:sectPr');
    expect(outcome.detail).not.toContain('w:sectPr');
  });

  it('P4 · 外部命名空间借用内容名（zz:p）：不再误判为 w:p，落 body 门禁降级', async () => {
    const outcome = await convertRaw(
      'p4',
      '<zz:p xmlns:zz="urn:x"><zz:r><zz:t>外部结构承载的正文</zz:t></zz:r></zz:p>',
    );
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    if (outcome.status !== 'disabled') throw new Error('unreachable');
    expect(outcome.detail).toContain('zz:p');
  });

  it('tbl 级外部命名空间（zz:tr）：不得被当作 w:tr 采集，落 tbl 直子门禁降级', async () => {
    const outcome = await convertRaw(
      'ns-tr',
      `<w:tbl><zz:tr xmlns:zz="urn:x">${cell('预付款')}</zz:tr></w:tbl>`,
    );
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    if (outcome.status !== 'disabled') throw new Error('unreachable');
    expect(outcome.detail).toContain('zz:tr');
  });

  it('tr 级外部命名空间（zz:tc）：不得被当作 w:tc 采集，落 tr 直子门禁降级', async () => {
    const outcome = await convertRaw(
      'ns-tc',
      '<w:tbl><w:tr><zz:tc xmlns:zz="urn:x"><w:p><w:r><w:t>1,140,000元</w:t></w:r></w:p></zz:tc></w:tr></w:tbl>',
    );
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    if (outcome.status !== 'disabled') throw new Error('unreachable');
    expect(outcome.detail).toContain('zz:tc');
  });

  it('tc 级外部命名空间借用良性名（zz:tcPr 携正文）：不得被单元格良性名单吞掉', async () => {
    const outcome = await convertRaw(
      'ns-tcpr',
      '<w:tbl><w:tr><w:tc><zz:tcPr xmlns:zz="urn:x"><w:p><w:r><w:t>藏在外部节点里的正文</w:t></w:r></w:p></zz:tcPr><w:p><w:r><w:t>期次</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
    );
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
    if (outcome.status !== 'disabled') throw new Error('unreachable');
    expect(outcome.detail).toContain('zz:tcPr');
  });

  it('w:tcPr 内的外部命名空间 gridSpan 不是 W 合并标记：表格照常转出、内容零损（children 只认 W 的直接后果，SPEC 已登记为本单唯一放宽方向变化）', async () => {
    const outcome = await convertRaw(
      'ns-gridspan',
      `<w:tbl><w:tr><w:tc><w:tcPr><zz:gridSpan xmlns:zz="urn:x" w:val="2"/></w:tcPr><w:p><w:r><w:t>预付款</w:t></w:r></w:p></w:tc>${cell('1,140,000元')}</w:tr></w:tbl>`,
    );
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.markdown).toContain('预付款');
    expect(outcome.view.markdown).toContain('1,140,000元');
  });

  it('正向守卫 · 表格属性直子（tblPr/tblGrid/trPr）照常 ok，单元格内容零损（真实 docx 必有而 fixture 全无的盲区，同 sectPr 先例）', async () => {
    const outcome = await convertRaw(
      'benign-tbl',
      '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/></w:tblPr><w:tblGrid><w:gridCol w:w="4261"/><w:gridCol w:w="4261"/></w:tblGrid>' +
        `<w:tr><w:trPr><w:trHeight w:val="397"/></w:trPr>${cell('预付款')}${cell('1,140,000元')}</w:tr></w:tbl>`,
    );
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.markdown).toContain('| 预付款 | 1,140,000元 |');
  });
});
