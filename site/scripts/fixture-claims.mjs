import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PM_FINDING_ID = 'prd-finding-05';
const PM_CATALOG_LABEL = 'Schema catalog preview / 尚未接通运行链';
const PM_FIXTURE_FILES = [
  'artifacts/feedback-digest.json',
  'artifacts/prd-review.json',
  'case-bible.md',
  'manifest.md',
  'materials/01-prd.md',
  'materials/02-feedback.md',
];

const countClaims = [
  ['dossier-materials', '份卷宗材料'],
  ['timeline-events', '个事件'],
  ['party-nodes', '个主体节点'],
  ['contradiction-events', '个矛盾事件'],
];

function rootPath(root) {
  return root instanceof URL ? fileURLToPath(root) : root;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push(relative(root, absolute).replaceAll('\\', '/'));
    }
  };
  visit(root);
  return files.sort();
}

function sha256Version(content) {
  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sameStrings(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}

export function loadFixtureClaimInputs(root) {
  const repo = rootPath(root);
  const legalRoot = join(repo, 'packages/demo-data/data');
  const pmRoot = join(legalRoot, 'pm');
  return {
    legal: {
      dossierFiles: readdirSync(join(legalRoot, 'dossier'))
        .filter((file) => file.endsWith('.md'))
        .sort(),
      caseFile: readJson(join(legalRoot, 'artifacts/case-file.json')),
      timeline: readJson(join(legalRoot, 'artifacts/timeline.json')),
      partyGraph: readJson(join(legalRoot, 'artifacts/party-graph.json')),
    },
    pm: {
      fixtureFiles: listFiles(pmRoot),
      manifest: readFileSync(join(pmRoot, 'manifest.md'), 'utf8'),
      prdMaterial: readFileSync(join(pmRoot, 'materials/01-prd.md'), 'utf8'),
      prdReview: readJson(join(pmRoot, 'artifacts/prd-review.json')),
      descriptorSource: readFileSync(join(repo, 'packages/pm/src/package/descriptor.ts'), 'utf8'),
      presentationSource: readFileSync(join(repo, 'packages/pm/src/presentation/index.ts'), 'utf8'),
    },
  };
}

export function validateFixtureClaims(html, inputs) {
  const failures = [];
  const add = (message) => failures.push(message);

  const files = inputs.legal.caseFile?.files;
  const events = inputs.legal.timeline?.events;
  const parties = inputs.legal.partyGraph?.nodes;
  if (!Array.isArray(files)) add('legal.materials: CaseFile files is not an array');
  if (!Array.isArray(events)) add('legal.events: Timeline events is not an array');
  if (!Array.isArray(parties)) add('legal.parties: PartyGraph nodes is not an array');

  const caseFileIds = Array.isArray(files) ? files.map((file) => file.fileId) : [];
  if (!sameStrings(caseFileIds, inputs.legal.dossierFiles)) {
    add('legal.materials: CaseFile fileIds must equal the dossier markdown file set');
  }
  if (new Set(caseFileIds).size !== caseFileIds.length) add('legal.materials: duplicate CaseFile fileId');
  if (Array.isArray(events) && new Set(events.map((event) => event.id)).size !== events.length) add('legal.events: duplicate Timeline event id');
  if (Array.isArray(parties) && new Set(parties.map((party) => party.id)).size !== parties.length) add('legal.parties: duplicate PartyGraph node id');

  const contradictionEvents = Array.isArray(events)
    ? events.filter((event) => event.markers?.includes('contradiction'))
    : [];
  const expectedCounts = new Map([
    ['dossier-materials', caseFileIds.length],
    ['timeline-events', events?.length ?? 0],
    ['party-nodes', parties?.length ?? 0],
    ['contradiction-events', contradictionEvents.length],
  ]);
  for (const [key, unit] of countClaims) {
    if (countOccurrences(html, `data-fixture-count="${key}"`) !== 1) {
      add(`${key}: page must contain exactly one fixture count`);
      continue;
    }
    const claim = html.match(new RegExp(
      `<strong\\b[^>]*data-fixture-count="${escapeRegExp(key)}"[^>]*>\\s*(\\d+)\\s*</strong>\\s*<span[^>]*>\\s*${escapeRegExp(unit)}\\s*</span>`,
    ));
    if (!claim) {
      add(`${key}: visible unit must be ${unit}`);
      continue;
    }
    if (Number(claim[1]) !== expectedCounts.get(key)) {
      add(`${key}: page claims ${claim[1]}, fixture has ${expectedCounts.get(key)}`);
    }
  }

  if (countOccurrences(html, 'data-site-generalization') !== 1) {
    add('site.generalization: exactly one generalization ledger is required');
  }
  if (!/<article\b[^>]*data-runtime-state="accepted"[^>]*>[\s\S]*?已验收工作链[\s\S]*?<\/article>/.test(html)) {
    add('legal.contract: accepted work chain label is missing');
  }

  if (!sameStrings(inputs.pm.fixtureFiles, PM_FIXTURE_FILES)) {
    add('PM PriorityScore: catalog fixture file set drifted or contains a PriorityScore payload');
  }
  if (!inputs.pm.manifest.includes('本样板只预览 schema catalog，不包含 PriorityScore、排序建议、PM scenario、prompt、live harness、企业接口或产品 UI。')) {
    add('PM PriorityScore: catalog-only manifest boundary is missing');
  }
  if (!/scenarios:\s*\[\s*\]/.test(inputs.pm.descriptorSource)
    || !/promptSegments:\s*\[\s*\]/.test(inputs.pm.descriptorSource)) {
    add('PM catalog: descriptor must remain scenario- and prompt-free');
  }
  if (/\b(?:PriorityScore|RICE)\b|排名|排序|公式|\bP[0-3]\b/.test(html)) {
    add('PM PriorityScore: page must not invent score, formula, rank, or band claims');
  }

  const findings = inputs.pm.prdReview?.findings;
  const finding = Array.isArray(findings) ? findings.find((item) => item.id === PM_FINDING_ID) : undefined;
  if (!finding) {
    add(`PM finding: ${PM_FINDING_ID} is missing`);
    return failures;
  }
  if (findings.length !== 6 || new Set(findings.map((item) => item.defectType)).size !== 6) {
    add('PM finding: catalog must cover six distinct defect types');
  }
  if (!findings.every((item) => item.status === 'pending')) {
    add('PM pending: all catalog findings must remain pending');
  }
  const anchor = finding.sourceAnchors?.[0];
  const range = anchor?.textRange;
  if (finding.sourceAnchors?.length !== 1
    || anchor?.fileId !== inputs.pm.prdReview.documentId
    || anchor?.quote !== finding.clause
    || !Number.isInteger(range?.start)
    || !Number.isInteger(range?.end)
    || inputs.pm.prdMaterial.slice(range?.start, range?.end) !== anchor?.quote) {
    add('PM UTF-16: selected finding anchor must slice the PRD clause exactly');
  }
  if (anchor?.textLayerVersion !== sha256Version(inputs.pm.prdMaterial)) {
    add('PM UTF-16: selected finding textLayerVersion must match the full material hash');
  }

  const articleMatch = html.match(new RegExp(
    `<article\\b([^>]*)data-pm-finding-id="${PM_FINDING_ID}"([^>]*)>([\\s\\S]*?)</article>`,
  ));
  if (!articleMatch) {
    add(`PM catalog: page is missing ${PM_FINDING_ID}`);
    return failures;
  }
  const attributes = `${articleMatch[1]} ${articleMatch[2]}`;
  const body = articleMatch[3];
  if (!attributes.includes(`data-pm-defect-type="${finding.defectType}"`)
    || !attributes.includes(`data-pm-status="${finding.status}"`)) {
    add('PM pending: page wire metadata drifted from the selected finding');
  }
  if (!attributes.includes('data-runtime-state="catalog"')
    || !body.includes(PM_CATALOG_LABEL)
    || /\bLive\b|已接通运行链/.test(body)) {
    add('PM catalog: page must state the exact catalog preview boundary and must not claim live');
  }
  for (const [field, value] of [['clause', finding.clause], ['suggestion', finding.suggestion]]) {
    if (!body.includes(value)) add(`PM ${field}: page must use the fixture verbatim`);
  }
  if (!inputs.pm.presentationSource.includes(`'${finding.defectType}': '冲突需求'`)
    || !body.includes('冲突需求')) {
    add('PM defect: conflicting-requirement must consume the descriptor label 冲突需求');
  }
  if (!inputs.pm.presentationSource.includes("pending: '待确认'") || !body.includes('待确认')) {
    add('PM pending: page must consume the descriptor label 待确认');
  }

  return failures;
}

export function assertFixtureClaims(html, root) {
  const failures = validateFixtureClaims(html, loadFixtureClaimInputs(root));
  if (failures.length) throw new Error(`SITE fixture claims failed:\n${failures.join('\n')}`);
}
