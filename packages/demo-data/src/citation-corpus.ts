import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface StatuteCitationRaw {
  id: string;
  law: string;
  chapter?: string;
  article: string;
  text: string;
  sourceGrade: string;
  source: string;
  version?: string;
  effectiveDate?: string;
  repealedDate?: string;
  repealedBy?: string;
  supersededByArticle?: string;
}

/**
 * officialTextVerified 不是语料自带字段，是本访问器加的复核标记位（当前批量硬编码 false）：
 * manifest.md 已声明这批法条文本依据训练知识整理、未逐条对照全国人大官网/国家法律法规数据库
 * 原文核验过。这不是本包能替语料解决的问题（核对 67 条的工单已挂账，见本包 SPEC.md TODO），
 * 但访问器先把"哪些条目复核过"这个位置留出来，方便未来逐条销账时只改这一处判定逻辑，
 * 不用改调用方代码。判例条目（status: 'demo'）不适用此字段——它们本来就是永久虚构的占位，
 * 没有"官方原文"可核对。
 */
export interface EffectiveStatuteCitation {
  id: string;
  law: string;
  chapter?: string;
  article: string;
  text: string;
  status: 'effective';
  version?: string;
  sourceGrade: string;
  source: string;
  officialTextVerified: boolean;
}

export interface RepealedStatuteCitation {
  id: string;
  law: string;
  chapter?: string;
  article: string;
  text: string;
  status: 'repealed';
  effectiveDate?: string;
  repealedDate?: string;
  repealedBy?: string;
  supersededByArticle?: string;
  sourceGrade: string;
  source: string;
  officialTextVerified: boolean;
}

export interface DemoCaseCitation {
  id: string;
  type: 'judicial_precedent';
  caseNo: string;
  court: string;
  summary: string;
  status: 'demo';
  sourceGrade: string;
  source: string;
  notes?: string;
}

export type CitationCorpusRecord = EffectiveStatuteCitation | RepealedStatuteCitation | DemoCaseCitation;

interface CaseCitationRaw {
  id: string;
  type: 'judicial_precedent';
  caseNo: string;
  court: string;
  summary: string;
  sourceGrade: string;
  source: string;
  notes?: string;
}

type RawEntry =
  | (StatuteCitationRaw & { status: 'effective' | 'repealed' })
  | (CaseCitationRaw & { status: 'demo' });

interface CitationRegistryFile {
  libraryName: string;
  version: string;
  entries: RawEntry[];
}

function loadRegistry(): CitationRegistryFile {
  const filePath = join(import.meta.dirname, '..', 'data', 'registries', 'cite-check.json');
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as CitationRegistryFile;
}

function withOfficialTextVerified(entry: RawEntry): CitationCorpusRecord {
  if (entry.status === 'demo') {
    return entry;
  }
  return { ...entry, officialTextVerified: false };
}

const records: readonly CitationCorpusRecord[] = loadRegistry().entries.map(withOfficialTextVerified);

export function listCitationRecords(): readonly CitationCorpusRecord[] {
  return records;
}

/** 按法律名称 + 条号精确匹配，命中 effective 或 repealed 条目均可。查不到返回 undefined。 */
export function findStatuteCitation(
  law: string,
  article: string,
): EffectiveStatuteCitation | RepealedStatuteCitation | undefined {
  const targetLaw = law.trim();
  const targetArticle = article.trim();
  return records.find(
    (record): record is EffectiveStatuteCitation | RepealedStatuteCitation =>
      (record.status === 'effective' || record.status === 'repealed') &&
      record.law === targetLaw &&
      record.article === targetArticle,
  );
}

/** 按案号精确匹配虚构判例条目。查不到返回 undefined。 */
export function findCaseCitation(caseNo: string): DemoCaseCitation | undefined {
  const target = caseNo.trim();
  return records.find((record): record is DemoCaseCitation => record.status === 'demo' && record.caseNo === target);
}
