import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LEGAL_PACKAGE_DESCRIPTOR } from './index.js';
import {
  S3_PDF_DOSSIER_DRAFT,
  S3_RISK_LIST_DRAFT,
  S3_RISK_LIST_RESPONSE,
} from '../testing/index.js';

function sha256(value: unknown): string {
  const bytes = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(bytes).digest('hex');
}

function promptBlob(): string {
  return LEGAL_PACKAGE_DESCRIPTOR.promptSegments
    .map(({ id, body }) => `${id}\0${body}`)
    .join('\0\0');
}

describe('VPKG-LAYOUT-1 Legal content golden', () => {
  it('descriptor 保持纯 JSON 深等价、整面 hash 与 prompt blob 字节不漂移', () => {
    expect(structuredClone(LEGAL_PACKAGE_DESCRIPTOR)).toStrictEqual(LEGAL_PACKAGE_DESCRIPTOR);
    // CONTRACT-OUTPUT-TRUTH-1 重铸：S3 prompt 补「主合同是批注目标 / 支持材料不冒充主合同定位」
    // 的主合同纪律（legal SPEC 明载「prompt blob hash 变化是本票有意内容契约变更，须同步 golden」）。
    // 输出 schema 不变，故两枚 hash 同批重铸——descriptor 含 promptSegments，两者必然一起漂。
    // PANEL-BLUEPRINT-1 重铸（仅 descriptor 一枚）：`legal.ReviewMatrix` 与 S2 场景的 uiTemplateId
    // 由 `matrix-review-panel` 改为版本化 `courtwork.review-matrix.v1`，renderer 声明同改。
    // 这是**呈现绑定**变更，payload 契约与 promptSegments 均未动——故 prompt blob hash 不漂、
    // `schemaVersion` 不升（ADR-012 决定一「payload 契约未变时不得误升」）。
    // ADMISSION-ENUM-1 重铸（仅 descriptor 一枚）：legal.RiskList 词表补 `enumLabels.reason`
    // （受控外溢，见 legal SPEC 状态更新）——promptSegments 未动，prompt blob hash 不漂。
    // GENERIC-PACK-1 重铸（仅 descriptor 一枚，逐 panel 各一次）：`legal.Timeline` 与
    // `legal.PartyGraph` 的 uiTemplateId 与 renderer 声明由 `timeline-panel` / `party-graph-panel`
    // 改为版本化 `courtwork.timeline.v1` / `courtwork.party-graph.v1`（同矩阵先例）；第三枚 `legal.RiskList`
    // 与 S3 场景的 `risk-review-panel` 同改为 `courtwork.risk-review.v1`。
    // 同属**呈现绑定**变更：payload 契约与 promptSegments 未动，故 prompt blob hash 不漂、
    // `schemaVersion` 不升。
    // GENERIC-PACK-1 裁定二重铸（仅 descriptor 一枚）：S1/S3/S4/S6 场景新增 `launch` 声明
    // （场景条按钮 + 预检表单有限元素集契约，ADR-016 同族）——payload 契约与 promptSegments
    // 未动，prompt blob hash 不漂、`schemaVersion` 不升。
    // LEGAL-ANCHOR-BINDING-1 重铸（**两枚同批**，与此前几次「只漂 descriptor」不同）：
    // ① descriptor —— `legal.Timeline`／`legal.PartyGraph`／`legal.ReviewMatrix` 三枚补
    //    `draftSchemaId` + `citationBinding`，并各补 `enumLabels.reason`（缺口表带出 wire 枚举）；
    // ② prompt blob —— S1/S2 正文补「引语一字不差、坐标由系统铸造」的生产者纪律。这是本票
    //    有意的内容契约变更（不变量五：schema 变化必须同步生产者），故 prompt hash 必漂。
    // `schemaVersion` 维持 1 并挂 [需架构拍板]：三枚最终形新增的 `outOfCoverage` 是
    // `.default([])` 的加法键，存量持久 payload 双向可读；升版会改全包每一枚 `$id` URN
    // （含本票未触及的四枚），超出票面边界。见 `packages/legal/SPEC.md` 偏离表。
    // LEGAL-ANCHOR-BINDING-2 重铸（**两枚同批**，同 BINDING-1 的理由）：
    // ① descriptor —— `legal.RevisionInstructionSet` 补 `draftSchemaId` + `citationBinding`
    //    与 `enumLabels.reason`（缺口表带出 wire 枚举），携锚模型输出的在册债自此清零；
    // ② prompt blob —— S4 正文补「卷宗依据引语一字不差」与「坐标由系统铸造、证据台账键由系统签发」
    //    的生产者纪律。不变量五：schema 变化必须同步生产者，故 prompt hash 必漂。
    // `schemaVersion` 仍维持 1：`outOfCoverage` 是 `.default([])` 加法键，2026-08-09 裁定二
    // 已判「additive-default 键不构成 ADR-009 升版事由」，此处直接引用该口径，不再挂待判。
    expect(sha256(LEGAL_PACKAGE_DESCRIPTOR)).toBe('f3ef3d66de06d4b891e9dcb87fc4db07b874e9886d861f78d499714a8ef23675');
    expect(sha256(promptBlob())).toBe('56e03f15e044783f2982b89cea4bed43f3df2b5031ba9b7448219ed1d602d5b7');
  });

  it('三份 testing fixture 的序列化内容不漂移', () => {
    expect(sha256(S3_RISK_LIST_RESPONSE)).toBe('8cd77784331b51166c46012b51480290d5f942eee25ddfa825a9c142e8a36487');
    expect(sha256(S3_RISK_LIST_DRAFT)).toBe('e8713e923b136ce63f0d82015ee3e2fe268b0ba48d7e7efe3d6801b801a37a14');
    expect(sha256(S3_PDF_DOSSIER_DRAFT)).toBe('33f6b705d15965aa3ce8ccc405caf7928bf21023c962674c4d38466c1b83cb1b');
  });

  it('守卫自检：descriptor 与 prompt 任一变异都会改变 hash', () => {
    const descriptorDrift = structuredClone(LEGAL_PACKAGE_DESCRIPTOR);
    descriptorDrift.identity.version = '9.9.9';
    expect(sha256(descriptorDrift)).not.toBe(sha256(LEGAL_PACKAGE_DESCRIPTOR));
    expect(sha256(`${promptBlob()}\n额外提示`)).not.toBe(sha256(promptBlob()));
  });
});
