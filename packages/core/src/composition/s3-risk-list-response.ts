import type { RiskList } from '@courtwork/schemas';

/**
 * S3 生成节点的录制回放响应。本演示有意分成两层，不假装无缝——如实记录原因：
 *
 * 1. **案件/主体层**：caseId 与 party-verify 查询目标沿用 packages/demo-data 的真实
 *    样板案语料（临江精铸诉起云智能），risk-07 的核验结果就是本次场景真实调用
 *    party-verify（demo-fixture 适配器）拿到的，用来在验收演示里真正走一遍信源
 *    等级台账的记账路径（而不仅仅在 evidence/grade.test.ts 里用合成数据验证机制
 *    本身）。
 * 2. **被改的 docx 文本层**：risk-01–06 的 sourceAnchor.quote 改为取自
 *    packages/output/src/test-fixtures/instruction-set.ts 的黄金样例合同真实文本
 *    （而非 demo-data 主合同的文本）——因为验收要把修订指令集喂给
 *    packages/output/test/fixtures/original.docx（SPEC 明确允许"输入 docx 可用
 *    output 包的 sample"），而 demo-data 主合同目前只有 markdown 形态，还没有对应
 *    的 docx（"markdown → 新建 docx"是 W4.1 挂账工单，未排期，见
 *    packages/output/SPEC.md TODO）。把 demo-data 合同的引文硬套进一份文本完全
 *    不同的 docx 只会让每条指令定位失败——那不是更真实，只是自欺。
 *
 * risk-07 的 quote 取自 demo-data 自己的卷宗文件（'20-企业信用信息查询单.md'），
 * 不出现在 original.docx 里——编译进 RevisionInstructionSet 后，output 侧对它的
 * 处理结果预期就是 'locator_not_found'，这是"定位失败时报错并跳过，不错插"纪律
 * 的真实展示，不是缺陷（见 acceptance/s3-flow.integration.test.ts 的显式断言）。
 */
export const S3_RISK_LIST_RESPONSE: RiskList = {
  caseId: 'case-linjiang-qiyun-2025',
  risks: [
    {
      id: 'risk-01',
      description:
        '违约金比例未与实际迟延损失挂钩：合同约定的百分之十违约金属固定比例条款，未考虑逾期时长与实际损失的对应关系，一旦买方逾期时间较短、损失有限，该比例仍可能被认定畸高而被法院酌减，建议与迟延天数或实际损失挂钩分级约定。',
      level: 'medium',
      basis: [
        {
          citation: '《中华人民共和国民法典》第五百八十五条',
          sourceAnchors: [{ fileId: 'sample-sale-contract-v1.docx', quote: '百分之十的违约金', textRange: { start: 0, end: 8 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-02',
      description:
        '管辖条款单方倾斜：约定争议提交甲方（卖方）所在地人民法院管辖，排除买方就近应诉或就近勘验标的物的便利，若该条款系甲方单方拟定的格式条款且未采取合理方式提示乙方注意，乙方可主张该条款未成为合同内容。建议改为标的物所在地法院管辖，便于纠纷发生时勘验现场设备。',
      level: 'medium',
      basis: [
        {
          citation: '《中华人民共和国民法典》第四百九十六条',
          sourceAnchors: [{ fileId: 'sample-sale-contract-v1.docx', quote: '提交甲方所在地人民法院诉讼解决', textRange: { start: 0, end: 16 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-03',
      description:
        '质保期短于行业惯例：合同约定质保期为交付之日起壹年，同类精密设备行业惯例通常为两年，且法律对产品质量瑕疵责任期间另有规定，过短的合同约定质保期可能在实际质量纠纷中对买方保护不足，建议参照行业惯例延长。',
      level: 'low',
      basis: [
        {
          citation: '《中华人民共和国产品质量法》第四十条',
          sourceAnchors: [{ fileId: 'sample-sale-contract-v1.docx', quote: '质保期为交付之日起壹年', textRange: { start: 0, end: 11 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-04',
      description:
        '交付期限偏紧存在违约风险：合同约定签订之日起三十日内交付，未预留设备生产周期的合理缓冲，若卖方产能或供应链出现波动，三十日内交付存在较高的逾期违约风险，建议核实卖方实际产能后适当延长交付期限或增加合理免责事由。',
      level: 'medium',
      basis: [
        {
          citation: '《中华人民共和国民法典》第五百七十七条',
          sourceAnchors: [{ fileId: 'sample-sale-contract-v1.docx', quote: '本合同签订之日起三十日内', textRange: { start: 0, end: 12 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-05',
      description:
        '标的物规格依赖未见附表：合同约定规格、数量、单价详见附表一，但本次送审文本未见该附表随附，若附表缺失或未与合同一并签署，标的物范围与价款约定将失去可核验的具体依据，建议核实附表一是否已作为合同附件一并签署。',
      level: 'high',
      basis: [
        {
          citation: '《中华人民共和国民法典》第四百七十条',
          sourceAnchors: [{ fileId: 'sample-sale-contract-v1.docx', quote: '规格、数量、单价详见本合同附表一', textRange: { start: 0, end: 16 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-06',
      description:
        '买受人名称核验存在滞后风险：合同抬头载明的买受人名称若未与最新营业执照/企业信用信息核对，可能存在企业名称变更（如有限公司改制为股份有限公司）未及时更新导致合同主体表述不准确的风险，建议核对最新登记信息后确认。',
      level: 'low',
      basis: [
        {
          citation: '《中华人民共和国民法典》第四百七十条',
          sourceAnchors: [{ fileId: 'sample-sale-contract-v1.docx', quote: '甲方（买受人）：星辰科技有限公司', textRange: { start: 0, end: 16 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-07',
      description:
        '买方主体核验（演示库/B 级信源）：起云智能装备（虚构）有限公司工商状态存续，未见涉诉记录；核验结果来自内部演示库（非官方接口），建议在正式出具意见前改用 A 级信源（企查查/天眼查）复核一次。',
      level: 'low',
      basis: [
        {
          citation: '主体核验：party-verify（demo-fixture，B 级信源）',
          sourceAnchors: [
            { fileId: '20-企业信用信息查询单.md', quote: '起云智能装备（虚构）有限公司', textRange: { start: 0, end: 14 } },
          ],
        },
      ],
      dispositionStatus: 'pending',
    },
  ],
};
