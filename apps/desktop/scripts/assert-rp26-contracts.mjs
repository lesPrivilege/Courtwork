import { readFile } from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const tokens = JSON.parse(await readFile(path.join(repoRoot, 'docs', 'design', 'tokens.json'), 'utf8'));
const css = await readFile(path.join(appRoot, 'src', 'styles.css'), 'utf8');
const host = await readFile(path.join(appRoot, 'src', 'preview', 'PreviewHost.tsx'), 'utf8');
const app = await readFile(path.join(appRoot, 'src', 'App.tsx'), 'utf8');
const rail = await readFile(path.join(appRoot, 'src', 'rail', 'CaseRail.tsx'), 'utf8');

const expectedControl = {
  heightSm: 28,
  heightMd: 32,
  fontSizeSm: 13,
  fontSizeMd: 14,
  weightRegular: 400,
  weightEmphasized: 510,
  iconSize: 16,
  gap: 6,
};
const expectedPreview = {
  semanticGutter: 12,
  progressTrackWidth: 2,
  utilityHeight: 44,
  headerHeight: 40,
  toolbarHeight: 36,
};
const failures = [];

for (const [key, value] of Object.entries(expectedControl)) {
  if (tokens.component?.control?.[key] !== value) failures.push(`component.control.${key} must be ${value}`);
}
for (const [key, value] of Object.entries(expectedPreview)) {
  if (tokens.component?.preview?.[key] !== value) failures.push(`component.preview.${key} must be ${value}`);
}

if (!host.includes('PreviewProgressModel')) failures.push('PreviewHost must own the generic progress contract');
if (!host.includes('aria-readonly="true"')) failures.push('Preview progress must remain read-only');
if (!css.includes('width: var(--preview-progress-track)')) failures.push('Preview track width must consume its token');
if (!css.includes('margin-left: var(--preview-semantic-gutter)')) failures.push('Schema semantic gutter must consume its token');
if (/case-demo-badge|unread-count/.test(`${rail}\n${css}`)) failures.push('Demo must not use an absolute watermark or unread badge');
if (/['"`]样板案(?:·演示)?['"`]/.test(app) || /['"`]样板案(?:·演示)?['"`]/.test(rail)) {
  failures.push('Demo identity copy must come from container-copy');
}

const declaredTones = [...host.matchAll(/tone-(danger|attention|revision|authority|neutral)/g)].map((match) => match[1]);
if (declaredTones.some((tone) => !['danger', 'attention', 'revision', 'authority', 'neutral'].includes(tone))) {
  failures.push('Preview markers may consume only the existing semantic tone whitelist');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('RP-2.6 token/demo/preview contracts: OK');
