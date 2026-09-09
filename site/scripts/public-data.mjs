// Public recordings retain product facts while replacing machine-local paths.
// This projection is deliberately separate from the recorded product owner.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const machinePath = /\/(?:Users|home|private\/tmp|tmp|var\/folders)\/|[A-Za-z]:\\+(?:Users|Windows)\\+/;
export function publicSpecimen(record) {
  const copy = structuredClone(record);
  function walk(value, parent = '') {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'string' && machinePath.test(item)) {
        if (key === 'workspaceDir' || key === 'filesystem') value[key] = 'synthetic/workspace';
        else if (key === 'path' && parent === 'hostSession') value[key] = 'synthetic/host-session/' + item.split(/[\\/]/).at(-1);
        else throw new Error('Unexpected machine-local string in public recording; review before publishing');
      } else walk(item, key);
    }
  }
  walk(copy);
  return copy;
}

export async function assertPublicTree(directory) {
  let checked = 0;
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Public output must not contain symlinks');
      if (entry.isDirectory()) await walk(file);
      else if (/\.(?:json|jsonl|mjs|js|html|css|txt|log|svg)$/.test(entry.name)) {
        checked++;
        if (machinePath.test(await readFile(file, 'utf8'))) throw new Error(`Machine-local path in public output: ${path.relative(directory, file)}`);
      }
    }
  }
  await walk(directory);
  return checked;
}
