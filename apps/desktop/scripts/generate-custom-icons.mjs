import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const elementPattern = /<(path|line|polygon|polyline|circle|ellipse|rect)\b([^>]*)\/>/g;
const attributePattern = /([a-z][a-z0-9-]*)="([^"]*)"/g;

const camelCase = (name) => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
const pascalCase = (name) => name.split('-').map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join('');

function parseNodes(source, name) {
  const nodes = [];
  for (const match of source.matchAll(elementPattern)) {
    const attributes = {};
    for (const attribute of match[2].matchAll(attributePattern)) {
      attributes[camelCase(attribute[1])] = attribute[2];
    }
    attributes.key = `${name}-${nodes.length + 1}`;
    nodes.push([match[1], attributes]);
  }
  return nodes;
}

export function generateCustomIconModule(iconDirectory = resolve('src/icons/custom')) {
  const names = readdirSync(iconDirectory)
    .filter((file) => file.endsWith('.svg'))
    .map((file) => file.slice(0, -4))
    .sort();
  const nodes = Object.fromEntries(names.map((name) => [
    name,
    parseNodes(readFileSync(resolve(iconDirectory, `${name}.svg`), 'utf8'), name),
  ]));

  const componentDeclarations = names
    .map((name) => `export const ${pascalCase(name)}Icon: LucideIcon = createLucideIcon('${pascalCase(name)}', customIconNodes['${name}']);`)
    .join('\n');
  const registryEntries = names
    .map((name) => `  '${name}': ${pascalCase(name)}Icon,`)
    .join('\n');

  return `/* 此文件由 scripts/generate-custom-icons.mjs 从规范化 SVG 生成；请勿手改。 */
import { createLucideIcon, type IconNode, type LucideIcon } from 'lucide-react';

export const customIconNames = ${JSON.stringify(names, null, 2)} as const;
export type CustomIconName = typeof customIconNames[number];

const customIconNodes = ${JSON.stringify(nodes, null, 2)} as unknown as Record<CustomIconName, IconNode>;

${componentDeclarations}

export const customIcons: Record<CustomIconName, LucideIcon> = {
${registryEntries}
};
`;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const output = resolve('src/icons/custom-icons.generated.ts');
  writeFileSync(output, generateCustomIconModule(), 'utf8');
  process.stdout.write(`已生成 ${output}\n`);
}
