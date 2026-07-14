import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const app = read('src/App.tsx');
const artifactTable = read('src/preview/ArtifactTableRenderer.tsx');
const moduleStack = read('src/modules/module-stack.ts');
const main = read('src/main.tsx');

assert(!/artifactType\s*===\s*['"]legal\./.test(app), 'App production route still switches on legal artifact type id');
assert(!app.includes('HOMED_ARTIFACT_TYPES'), 'App still depends on HOMED_ARTIFACT_TYPES');
assert(!app.includes('GenericStructurePanel'), 'App still renders raw GenericStructurePanel');
assert(!moduleStack.includes("'legal."), 'module auto-open still maps legal artifact type ids');
assert(!fs.existsSync(path.join(root, 'src/workbench/generic-structure.ts')), 'raw generic-structure fallback still exists');
assert(!fs.existsSync(path.join(root, 'src/workbench/GenericStructurePanel.tsx')), 'raw GenericStructurePanel still exists');
assert(!/JSON\.stringify\s*\(\s*payload\b/.test(artifactTable), 'artifact renderer serializes raw payload');
assert(!/Object\.(?:entries|keys|values)\s*\(\s*payload\b/.test(artifactTable), 'artifact renderer enumerates raw payload');
assert(!/Reflect\.ownKeys\s*\(\s*payload\b/.test(artifactTable), 'artifact renderer enumerates raw payload through Reflect');
assert(main.includes('createDesktopPackageRuntime'), 'composition root does not admit the package runtime');
assert(main.includes('packageRegistries={packageRuntime.packageRegistries}'), 'App does not receive admitted package registries');
assert(main.includes('hostRenderers={packageRuntime.hostRenderers}'), 'App does not receive host renderer registry');

if (failures.length > 0) {
  console.error(`VIEW-ABI contracts failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('VIEW-ABI contracts passed (12/12)');
