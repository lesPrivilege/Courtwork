import type { VerticalPackageDescriptorV1 } from '@courtwork/registry';

export const LEGAL_INTERACTION_TEMPLATES: NonNullable<VerticalPackageDescriptorV1['interactionTemplates']> = [
    {
      id: 'legal.contract-review-position',
      kind: 'single_choice',
      question: '本次合同审查应以哪一方立场展开？',
      options: [
        { id: 'buyer', label: '买方', description: '重点识别付款、验收与交付风险' },
        { id: 'seller', label: '卖方', description: '重点识别收款、责任与履约风险' },
        { id: 'balanced', label: '中立审查', description: '同时标注双方主要权利义务失衡' },
      ],
      skippable: false,
      anchorPolicy: 'none',
      uiTemplateId: 'question-card',
    },
    {
      id: 'legal.risk-evidence-confirmation',
      kind: 'confirmation',
      question: '是否确认当前风险判断已有可回到原文的充分依据？',
      options: [
        { id: 'confirm', label: '确认依据充分' },
        { id: 'revise', label: '返回修正依据' },
      ],
      skippable: false,
      anchorPolicy: 'required',
      uiTemplateId: 'question-card',
    },
];
