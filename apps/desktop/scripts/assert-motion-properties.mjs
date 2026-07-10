import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const allowed = new Set(['transform', 'opacity', 'background-color', 'border-color']);
const css = readFileSync(resolve('src/styles.css'), 'utf8');
const sources = [
  readFileSync(resolve('src/App.tsx'), 'utf8'),
  readFileSync(resolve('src/workbench/Panels.tsx'), 'utf8'),
  readFileSync(resolve('src/composer/AttachmentChip.tsx'), 'utf8'),
  readFileSync(resolve('src/composer/Composer.tsx'), 'utf8'),
];
const violations = [];

for (const match of css.matchAll(/\btransition(?:-property)?\s*:\s*([^;]+)/g)) {
  for (const segment of match[1].split(',')) {
    const property = segment.trim().split(/\s+/)[0];
    if (property !== 'none' && !allowed.has(property)) violations.push(`CSS transition: ${property}`);
  }
}

let cursor = 0;
while ((cursor = css.indexOf('@keyframes', cursor)) !== -1) {
  const start = css.indexOf('{', cursor);
  let depth = 1;
  let end = start + 1;
  while (depth > 0 && end < css.length) {
    if (css[end] === '{') depth += 1;
    if (css[end] === '}') depth -= 1;
    end += 1;
  }
  const body = css.slice(start + 1, end - 1);
  for (const declaration of body.matchAll(/([a-z-]+)\s*:/g)) {
    const property = declaration[1];
    if (!allowed.has(property)) violations.push(`CSS keyframes: ${property}`);
  }
  cursor = end;
}

for (const source of sources) {
  for (const call of source.matchAll(/\.animate\(\s*\[([\s\S]*?)\]\s*,/g)) {
    for (const entry of call[1].matchAll(/(?:^|[{,])\s*([a-zA-Z][a-zA-Z0-9]*)\s*:/g)) {
      const property = entry[1].replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      if (!allowed.has(property)) violations.push(`Web Animations API: ${property}`);
    }
  }
}

if (violations.length) throw new Error(`发现越界动画属性：\n${violations.join('\n')}`);
globalThis.process.stdout.write('动效属性门禁通过：仅 transform / opacity / background-color / border-color\n');
