import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 主体核验语料记录的完整形状（对齐 data/registries/party-verify.json 的 entries[]）。
 * 这是"样板案完整主体档案"的形状，不是 @courtwork/tools 的 PartyVerifyData——字段更富，
 * 服务多个消费方（party-verify 演示、PartyGraph 演示、ingest 实体对齐测试、W7 评测），
 * 本包不 import PartyVerifyData、不做"投影成核验字段子集"这件事：契约取子集，语料存全集，
 * 投影逻辑属于装配点（把语料接给具体工具适配器的那段代码），不属于本包。
 */
export interface PartyCorpusRecord {
  entityName: string;
  aliases: string[];
  unifiedSocialCreditCode: string;
  kind: string;
  registrationStatus: string;
  legalRepresentative: string;
  registeredCapital: string;
  establishedDate: string;
  address: string;
  equityStructure: string;
  litigationSummary: string;
  sourceGrade: string;
  source: string;
  notes: string;
}

export interface PartyOutOfCoverageEntry {
  name: string;
  reason: string;
}

interface PartyRegistryFile {
  libraryName: string;
  version: string;
  entries: PartyCorpusRecord[];
  outOfCoverage: PartyOutOfCoverageEntry[];
}

function loadRegistry(): PartyRegistryFile {
  const filePath = join(import.meta.dirname, '..', 'data', 'registries', 'party-verify.json');
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as PartyRegistryFile;
}

const registry = loadRegistry();

export function listPartyRecords(): readonly PartyCorpusRecord[] {
  return registry.entries;
}

export function listPartyOutOfCoverage(): readonly PartyOutOfCoverageEntry[] {
  return registry.outOfCoverage;
}

/** 按 entityName 精确匹配，或匹配 aliases 数组中的任一别名。查不到返回 undefined——库内未覆盖，不是"不存在"的结论。 */
export function findPartyRecord(name: string): PartyCorpusRecord | undefined {
  const target = name.trim();
  return registry.entries.find(
    (record) => record.entityName === target || record.aliases.includes(target),
  );
}
