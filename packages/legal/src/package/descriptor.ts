import type { VerticalPackageDescriptorV1 } from '@courtwork/registry';
import { LEGAL_INTERACTION_TEMPLATES } from '../interactions/index.js';
import { LEGAL_ARTIFACTS, LEGAL_RENDERERS } from '../presentation/index.js';
import { LEGAL_PROMPT_SEGMENTS, LEGAL_SCENARIOS } from '../scenarios/index.js';

/**
 * 法律垂类包的唯一可序列化声明面。schema/场景/提示词正文/renderer 声明/词表
 * 全部住包；底座只持机械件。
 */
export const LEGAL_PACKAGE_DESCRIPTOR: VerticalPackageDescriptorV1 = {
  abiVersion: 1,
  identity: {
    packageId: 'legal',
    version: '0.1.0',
    schemaVersion: 1,
    /** 账本读侧迁移协议：append-only 历史带旧裸类型名，读取归一，永不改写历史。 */
    legacyTypeAliases: {
      CaseFile: 'legal.CaseFile',
      Timeline: 'legal.Timeline',
      PartyGraph: 'legal.PartyGraph',
      RiskList: 'legal.RiskList',
      ReviewMatrix: 'legal.ReviewMatrix',
      RevisionInstructionSet: 'legal.RevisionInstructionSet',
      FileOpsPlan: 'legal.FileOpsPlan',
    },
  },
  artifacts: LEGAL_ARTIFACTS,
  scenarios: LEGAL_SCENARIOS,
  promptSegments: LEGAL_PROMPT_SEGMENTS,
  renderers: LEGAL_RENDERERS,
  interactionTemplates: LEGAL_INTERACTION_TEMPLATES,
  vocabulary: {
    'container.noun': '卷宗',
    'stage.noun': '阶段',
    'material.noun': '卷宗材料',
  },
};
