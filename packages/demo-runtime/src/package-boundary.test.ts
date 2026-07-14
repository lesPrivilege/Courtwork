import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const PACKAGES_ROOT = join(REPO_ROOT, 'packages');

interface PackageJson {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPackageJson(dir: string): PackageJson {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')) as Partial<PackageJson>;
  if (typeof manifest.name !== 'string' || manifest.name.trim().length === 0) {
    throw new Error(`${dir}/package.json 缺少合法 name`);
  }
  return manifest as PackageJson;
}

function courtworkGraph(): Map<string, string[]> {
  const packageDirs = readdirSync(PACKAGES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PACKAGES_ROOT, entry.name))
    .filter((dir) => existsSync(join(dir, 'package.json')));
  const manifests = [readPackageJson(join(REPO_ROOT, 'apps', 'desktop')), ...packageDirs.map(readPackageJson)];
  const names = new Set(manifests.map((manifest) => manifest.name));
  return new Map(
    manifests.map((manifest) => [
      manifest.name,
      Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).filter((dependency) => names.has(dependency)),
    ]),
  );
}

function findCycles(graph: Map<string, string[]>): string[][] {
  const cycles: string[][] = [];
  const visiting: string[] = [];
  const visited = new Set<string>();
  const visit = (node: string) => {
    const activeIndex = visiting.indexOf(node);
    if (activeIndex >= 0) {
      cycles.push([...visiting.slice(activeIndex), node]);
      return;
    }
    if (visited.has(node)) return;
    visiting.push(node);
    for (const dependency of graph.get(node) ?? []) visit(dependency);
    visiting.pop();
    visited.add(node);
  };
  for (const node of graph.keys()) visit(node);
  return cycles;
}

describe('@courtwork/demo-runtime dependency boundary', () => {
  it('ignores a non-directory entry under packages', () => {
    const plainFile = join(PACKAGES_ROOT, '.core-boundary-file-fixture');
    try {
      writeFileSync(plainFile, 'not a package');
      expect(courtworkGraph().has('@courtwork/core')).toBe(true);
    } finally {
      rmSync(plainFile, { force: true });
    }
  });

  it('ignores a directory without package.json', () => {
    const noPackageDir = join(PACKAGES_ROOT, '.core-boundary-empty-dir-fixture');
    try {
      mkdirSync(noPackageDir);
      expect(courtworkGraph().has('@courtwork/core')).toBe(true);
    } finally {
      rmSync(noPackageDir, { recursive: true, force: true });
    }
  });

  it('does not skip a workspace directory with a valid package.json', () => {
    const workspaceDir = join(PACKAGES_ROOT, '.core-boundary-workspace-fixture');
    try {
      mkdirSync(workspaceDir);
      writeFileSync(
        join(workspaceDir, 'package.json'),
        JSON.stringify({
          name: '@courtwork/core-boundary-workspace-fixture',
          private: true,
          dependencies: { '@courtwork/core': 'workspace:*' },
        }),
      );

      const graph = courtworkGraph();
      expect(graph.get('@courtwork/core-boundary-workspace-fixture')).toEqual(['@courtwork/core']);
    } finally {
      rmSync(workspaceDir, { recursive: true, force: true });
    }
  });

  it('is the one-way development composition root and is not imported by core or desktop', () => {
    const graph = courtworkGraph();
    expect(graph.get('@courtwork/demo-runtime')).toEqual(expect.arrayContaining([
      '@courtwork/core',
      '@courtwork/demo-data',
      '@courtwork/legal',
      '@courtwork/output',
      '@courtwork/reading-view',
    ]));
    expect(graph.get('@courtwork/core')).not.toContain('@courtwork/demo-runtime');
    expect(graph.get('@courtwork/desktop')).not.toContain('@courtwork/demo-runtime');
  });

  it('keeps the internal Courtwork package graph acyclic', () => {
    expect(findCycles(courtworkGraph())).toEqual([]);
  });

  it('self-checks the cycle detector with an injected two-node cycle', () => {
    expect(findCycles(new Map([['a', ['b']], ['b', ['a']]]))).toEqual([['a', 'b', 'a']]);
  });
});
