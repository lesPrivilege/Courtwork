import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { validateVersionalSite } from './versional-language-contract-lib.mjs';

const root = process.cwd();
const failures = validateVersionalSite({
  html: readFileSync(path.join(root, 'site/index.html'), 'utf8'),
  css: readFileSync(path.join(root, 'site/styles.css'), 'utf8'),
  desktopCss: readFileSync(path.join(root, 'apps/desktop/src/styles.css'), 'utf8'),
});

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('VERSIONAL-LANG Pages contract passed');
