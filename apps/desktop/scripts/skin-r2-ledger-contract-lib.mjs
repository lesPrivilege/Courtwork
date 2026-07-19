export const signedR2LedgerRows = Object.freeze([
  ['P2-T01', 'docs/design/tokens.json#typography.family.ui', 'agent-interface'],
  ['P2-T02', 'apps/desktop/src/styles.css#:root|--font-ui', 'agent-interface'],
  ['P2-T03', 'docs/design/tokens.json#typography.family.mono', 'agent-interface'],
  ['P2-T04', 'apps/desktop/src/styles.css#:root|--mono', 'agent-interface'],
  ['P2-T05', 'docs/design/tokens.json#typography.family.title', 'agent-interface'],
  ['P2-T06', 'docs/design/tokens.json#typography.track.title', 'agent-interface'],
  ['P2-T07', 'docs/design/tokens.json#typography.family.body', 'agent-interface'],
  ['P2-T08', 'docs/design/tokens.json#typography.track.document', 'agent-interface'],
  ['P2-T09', 'apps/desktop/src/assets/fonts/subset-manifest.json#fonts', 'agent-interface'],
  ['P2-T10', 'apps/desktop/scripts/assert-typography.mjs#retired-font-values', 'agent-interface'],
  ['P2-T11', 'site/craft-evidence/SKIN-R2-P2/blind-typography#Sarasa-v1.0.40', 'agent-interface'],
  ['P2-T12', 'docs/design/typography-density.md#P2本轮复议门', 'agent-interface'],
  ['P2-T13', 'docs/design/typography-density.md#四档密度-排印语义', 'agent-interface'],
  ['P2-T14', 'apps/desktop/SPEC.md#SKIN-R2-P2', 'agent-interface'],
  ['P2-L01', 'apps/desktop/src/styles.css#.workspace', 'agent-interface'],
  ['P2-L02', 'apps/desktop/src/styles.css#.workspace.right-narrow', 'agent-interface'],
  ['P2-L03', 'apps/desktop/src/styles.css#.workspace.left-collapsed.right-collapsed', 'agent-interface'],
  ['P2-L04', 'apps/desktop/src/styles.css#.risk-grid', 'schema-workface'],
  ['P2-L05', 'apps/desktop/src/styles.css#.risk-master-detail', 'schema-workface'],
  ['P2-L06', 'apps/desktop/src/chat/ProcessTrace.tsx#ProcessTrace', 'agent-interface'],
  ['P2-L07', 'docs/design/typography-density.md#四档密度-版式实用法', 'agent-interface'],
  ['P2-L08', 'apps/desktop/src/styles.css#.interaction-card', 'agent-interface'],
  ['P2-L09', 'apps/desktop/src/styles.css#.settings-body', 'agent-interface'],
  ['P2-L10', 'apps/desktop/src/styles.css#.artifact-table-view', 'schema-workface'],
  ['P2-L11', 'apps/desktop/src/styles.css#.workspace.welcome-mode', 'agent-interface'],
  ['P2-L12', 'apps/desktop/src/styles.css#P1-line-consumers', 'agent-interface'],
  ['P2-L13', 'apps/desktop/src/App.tsx#case-rail-information-architecture', 'agent-interface'],
  ['P2-L14', 'apps/desktop/src/App.tsx#output-placement', 'agent-interface'],
  ['P2-L15', 'apps/desktop/src/styles.css#decorative-quote-frame', 'agent-interface'],
  ['P2-L16', 'apps/desktop/src/styles.css#product-shell-gold-mark', 'agent-interface'],
  ['P2-L17', 'apps/desktop/src/styles.css#.composer-stack|inline-end', 'agent-interface'],
  ['P2-L18', 'apps/desktop/src/styles.css#.workspace.comparing.left-collapsed|grid', 'agent-interface'],
  ['P3-S01', 'apps/desktop/src/styles.css#@keyframes seal-press', 'agent-interface'],
  ['P3-S02', 'apps/desktop/src/styles.css#@media(prefers-reduced-motion)|.settle-seal', 'agent-interface'],
  ['P3-H01', 'apps/desktop/src/styles.css#document-track|hanging-punctuation', 'agent-interface'],
  ['P3-I01', 'site/craft-evidence/SKIN-R2-P3#ink-bleed-ab', 'agent-interface'],
  ['P3-A01', 'site/craft-evidence/SKIN-R2-P3#restraint-audit', 'agent-interface'],
  ['P5-F01', 'site/styles.css#@font-face(Courtwork-Manuscript-Latin)', 'pages-experimental'],
  ['P5-F02', 'site/styles.css#.wordmark > span', 'pages-experimental'],
  ['P5-F03', 'site/styles.css#.promise-heading h2 .latin-manuscript', 'pages-experimental'],
  ['P5-F04', 'site/styles.css#.closing .eyebrow .latin-manuscript', 'pages-experimental'],
  ['P5-F05', 'site/og.html#.wordmark', 'pages-experimental'],
  ['P5-F09', 'site/styles.css#:root|--mono', 'pages-experimental'],
  ['P5-F10', 'site/scripts/deslop-scan-lib.mjs#p5-font-coverage', 'pages-experimental'],
  ['P5-F11', 'site/scripts/deslop-scan-lib.mjs#p5-data-static', 'pages-experimental'],
  ['P5-F12', 'site/SPEC.md#SKIN-R2-P5', 'pages-experimental'],
]);

export const retiredP5ProposalLines = Object.freeze(['P5-F06', 'P5-F07', 'P5-F08']);

export function validateSignedR2Ledger(entries) {
  const failures = [];
  const signedLines = new Set(signedR2LedgerRows.map(([line]) => line));
  const byLine = new Map();
  const byTarget = new Map();

  for (const entry of entries ?? []) {
    const line = entry?.approvedProposalLine;
    const target = entry?.target;
    if (line) {
      if (signedLines.has(line) && byLine.has(line)) failures.push(`提案行重复：${line}`);
      else if (!byLine.has(line)) byLine.set(line, entry);
    }
    if (target) {
      if (!byTarget.has(target)) byTarget.set(target, []);
      byTarget.get(target).push(line ?? '(无提案行)');
    }
  }

  for (const [line, target, tier] of signedR2LedgerRows) {
    const entry = byLine.get(line);
    if (!entry) {
      failures.push(`已签提案行缺失：${line}`);
      continue;
    }
    if (entry.target !== target) failures.push(`${line} target 漂移：应为 ${target}，实为 ${entry.target}`);
    if (entry.tier !== tier) failures.push(`${line} 档位漂移：应为 ${tier}，实为 ${entry.tier}`);
    const owners = byTarget.get(target) ?? [];
    if (owners.length !== 1) failures.push(`${line} target 未唯一绑定：${target} -> ${owners.join(', ')}`);
  }

  for (const line of retiredP5ProposalLines) {
    if (byLine.has(line)) failures.push(`退场提案行不得进入活档位账：${line}`);
  }

  return failures;
}
