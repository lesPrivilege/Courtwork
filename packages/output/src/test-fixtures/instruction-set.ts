import type { RevisionInstructionSet } from '@courtwork/schemas';

/**
 * 十条指令覆盖 replace/insert/delete/commentOnly 四种操作、text/tableCell/tableRow 三种定位策略、
 * 依据引用的两条腿（sourceAnchors / statuteRef）。改编自 packages/output/spike/ 的 spike 素材，
 * 迁移到正式 RevisionInstructionSet 契约形状（kind: 'commentOnly' 而非 'comment-only'，
 * text 字段统一命名，citations 用 statuteRef 结构化引用而非散文）。
 */
export const SAMPLE_INSTRUCTION_SET: RevisionInstructionSet = {
  id: 'ris-golden-001',
  caseId: 'case-golden-001',
  targetDocument: { fileId: 'sample-sale-contract-v1' },
  instructions: [
    {
      id: 'ins-01',
      kind: 'replace',
      locator: { strategy: 'text', quote: '百分之十的违约金', paragraphHint: '第六条 违约责任' },
      text: '百分之十五的违约金',
      annotation: {
        text: '违约金比例建议上调，与本所同类合同模板对齐。',
        citations: [
          {
            citation: '《民法典》第五百八十五条',
            sourceAnchors: [],
            statuteRef: { law: '中华人民共和国民法典', article: '第五百八十五条' },
          },
        ],
      },
    },
    {
      id: 'ins-02',
      kind: 'insert',
      locator: { strategy: 'text', quote: '提交甲方所在地人民法院诉讼解决。' },
      text: '第七条之一 保密条款\n双方对本合同履行过程中知悉的对方商业秘密负有保密义务，未经对方书面同意不得向第三方披露。',
      annotation: {
        text: '补充保密条款，原合同缺失该项约定。',
        citations: [],
      },
    },
    {
      id: 'ins-03',
      kind: 'delete',
      locator: { strategy: 'text', quote: '本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。', paragraphHint: '第八条 其他约定' },
      annotation: {
        text: '该条内容并入合同尾部通用条款，此处删除避免重复。',
        citations: [],
      },
    },
    {
      id: 'ins-04',
      kind: 'replace',
      locator: { strategy: 'tableCell', rowContains: '第一期', columnHeader: '支付比例', quote: '30%' },
      text: '20%',
      annotation: {
        text: '首期付款比例下调，与甲方财务部沟通后调整。',
        citations: [],
      },
    },
    {
      id: 'ins-05',
      kind: 'replace',
      locator: { strategy: 'text', quote: '质保期为交付之日起壹年', paragraphHint: '第五条 质量保证' },
      text: '质保期为交付之日起贰年',
      annotation: {
        text: '质保期建议延长至两年，参考同类设备行业惯例。',
        citations: [
          {
            citation: '《产品质量法》第四十条',
            sourceAnchors: [],
            statuteRef: { law: '中华人民共和国产品质量法', article: '第四十条' },
          },
        ],
      },
    },
    {
      id: 'ins-06',
      kind: 'replace',
      locator: { strategy: 'text', quote: '提交甲方所在地人民法院诉讼解决', paragraphHint: '第七条 争议解决' },
      text: '提交标的物所在地人民法院诉讼解决',
      annotation: {
        text: '管辖法院建议改为标的物所在地，便于纠纷发生时勘验现场设备。',
        citations: [],
      },
    },
    {
      id: 'ins-07',
      kind: 'commentOnly',
      locator: { strategy: 'text', quote: '规格、数量、单价详见本合同附表一', paragraphHint: '第一条 标的物' },
      annotation: {
        text: '请核实附表一是否已作为合同附件一并签署，本次送审文本未见附表。',
        citations: [],
      },
    },
    {
      id: 'ins-08',
      kind: 'replace',
      locator: { strategy: 'text', quote: '本合同签订之日起三十日内', paragraphHint: '第三条 交付期限' },
      text: '本合同签订之日起四十五日内',
      annotation: {
        text: '交付期限延长，乙方反馈设备生产周期需要更多时间。',
        citations: [],
      },
    },
    {
      id: 'ins-09',
      kind: 'replace',
      locator: { strategy: 'text', quote: '甲方（买受人）：星辰科技有限公司', paragraphHint: '抬头' },
      text: '甲方（买受人）：星辰科技股份有限公司',
      annotation: {
        text: '核对营业执照后更正甲方全称（有限公司→股份有限公司）。',
        citations: [],
      },
    },
    {
      id: 'ins-10',
      kind: 'delete',
      locator: { strategy: 'tableRow', rowContains: '第三期' },
      annotation: {
        text: '第三期验收付款并入第二期一次性支付，删除该行。',
        citations: [],
      },
    },
  ],
};
