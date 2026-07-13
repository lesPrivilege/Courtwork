import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const source = resolve(root, 'site');
const output = resolve(root, 'site-dist');

rmSync(output, { recursive: true, force: true });
mkdirSync(resolve(output, 'assets/screenshots'), { recursive: true });
for (const file of ['index.html', 'styles.css', 'main.js']) cpSync(resolve(source, file), resolve(output, file));
for (const file of ['icon.svg', 'og.png']) cpSync(resolve(source, 'assets', file), resolve(output, 'assets', file));
cpSync(resolve(source, 'assets/screenshots'), resolve(output, 'assets/screenshots'), { recursive: true });
