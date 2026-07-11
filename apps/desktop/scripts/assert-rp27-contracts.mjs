import { readFile } from 'node:fs/promises';
import path from 'node:path';

const src = path.resolve(import.meta.dirname, '..', 'src');
const [copy, rail, composer, settings, panels] = await Promise.all([
  readFile(path.join(src, 'chrome', 'copy.ts'), 'utf8'),
  readFile(path.join(src, 'rail', 'CaseRail.tsx'), 'utf8'),
  readFile(path.join(src, 'composer', 'Composer.tsx'), 'utf8'),
  readFile(path.join(src, 'settings', 'SettingsPage.tsx'), 'utf8'),
  readFile(path.join(src, 'workbench', 'Panels.tsx'), 'utf8'),
]);

const failures = [];
if (/\p{Script=Han}/u.test(copy)) failures.push('chrome/copy.ts must remain English-only');
for (const duplicate of ['onOpenWorkDrafts', 'onOpenFileOps', 'onFocusOriginals']) {
  if (rail.includes(duplicate)) failures.push(`CaseRail retains duplicate route handler: ${duplicate}`);
}
if ((rail.match(/onClick=\{onOpenSettings\}/g) ?? []).length !== 1) {
  failures.push('Settings/update route must have one merged trigger in CaseRail');
}
if ((composer.match(/data-testid="composer-upload"/g) ?? []).length !== 1) {
  failures.push('Attach files must have one trigger');
}
const uploadIndex = composer.indexOf('data-testid="composer-upload"');
const plusMenuIndex = composer.indexOf('data-testid="composer-plus-menu"');
const composerBoxEnd = composer.indexOf('<textarea');
if (!(plusMenuIndex < uploadIndex && uploadIndex < composerBoxEnd)) {
  failures.push('Attach files must live inside the plus menu, before the composer input');
}
for (const required of ['Settings', 'Model', 'Output & files', 'Data & privacy', 'About & updates']) {
  if (!settings.includes(required)) failures.push(`Settings chrome is missing English label: ${required}`);
}
for (const legalTerm of ['卷宗', '确认', '驳回', '修订']) {
  if (!panels.includes(legalTerm)) failures.push(`Schema renderer lost Chinese legal term: ${legalTerm}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('RP-2.7 subtraction/language boundaries: OK');
