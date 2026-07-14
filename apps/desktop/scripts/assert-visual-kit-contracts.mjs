import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const required = [
  'src/preview/projection/view-model.ts',
  'src/preview/projection/artifact-table.ts',
  'src/preview/projection/interaction.ts',
  'src/preview/primitives/index.tsx',
  'src/preview/composition/FiniteComposition.tsx',
  'src/preview/registry/visual-blueprints.ts',
  'src/preview/gallery/VisualizationGallery.tsx',
];
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`${file}: required VISUAL-KIT boundary missing`);
}

if (failures.length === 0) {
  const primitive = read('src/preview/primitives/index.tsx');
  const projections = [
    read('src/preview/projection/artifact-table.ts'),
    read('src/preview/projection/interaction.ts'),
  ].join('\n');
  const registry = read('src/preview/registry/visual-blueprints.ts');
  const productionFiles = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (/\.(?:ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) productionFiles.push(target);
    }
  };
  walk(path.join(root, 'src'));
  const production = productionFiles.map((file) => read(path.relative(root, file))).join('\n');

  if (/descriptor|pointer|payload|artifact|store|event|@courtwork\/(?:legal|pm|registry)/i.test(primitive)) {
    failures.push('primitives interpret descriptor/pointer/raw artifact/store/event or vertical imports');
  }
  if (/\btypeId\b|['"](?:legal|pm)\./.test(projections)) {
    failures.push('projection contains namespace/typeId switch');
  }
  if (/@courtwork\/demo-data|@courtwork\/(?:legal|pm)\/testing|from\s+['"]node:/.test(production)) {
    failures.push('desktop production graph imports demo-data, vertical testing, or Node builtin');
  }
  if (/candidate|deferred/.test(registry)) {
    failures.push('candidate/deferred gallery shapes entered production blueprint registry');
  }
  for (const banned of ['@tanstack', 'react-flow', 'reactflow', 'echarts']) {
    if (production.toLowerCase().includes(banned)) failures.push(`new visual dependency/use is forbidden: ${banned}`);
  }
}

if (failures.length > 0) {
  console.error(`VISUAL-KIT contracts failed (${failures.length}):\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
  process.exit(1);
}
console.log('VISUAL-KIT contracts passed');
