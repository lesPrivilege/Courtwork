import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertFixtureClaims } from './fixture-claims.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const source = resolve(root, 'site');
const output = resolve(root, 'site-dist');

assertFixtureClaims(readFileSync(resolve(source, 'index.html'), 'utf8'), root);
rmSync(output, { recursive: true, force: true });
mkdirSync(resolve(output, 'assets/screenshots'), { recursive: true });
mkdirSync(resolve(output, 'assets/fonts'), { recursive: true });
for (const file of ['index.html', 'styles.css', 'main.js']) cpSync(resolve(source, file), resolve(output, file));
for (const file of ['icon.svg', 'og.png', 'ghosty-mask.svg']) cpSync(resolve(source, 'assets', file), resolve(output, 'assets', file));
for (const font of ['zhuque-fangsong-subset.woff2', 'noto-serif-sc-regular-subset.woff2', 'noto-serif-sc-bold-subset.woff2', 'doc-latin-subset.woff2', 'manuscript-latin-subset.woff2']) {
  cpSync(resolve(source, 'assets/fonts', font), resolve(output, 'assets/fonts', font));
}
cpSync(resolve(source, 'assets/screenshots'), resolve(output, 'assets/screenshots'), { recursive: true });
