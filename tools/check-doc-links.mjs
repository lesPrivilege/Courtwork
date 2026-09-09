#!/usr/bin/env node
// Check repository links in tracked documentation, including new untracked docs.
// Generated/ignored output is not a valid GitHub source link.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const names = [...new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {cwd:root, encoding:'utf8'}).split('\0').filter(Boolean))];
const present = new Set(['.']);
for (const name of names) {
  present.add(name);
  for (let dir = path.posix.dirname(name); dir !== '.'; dir = path.posix.dirname(dir)) present.add(dir);
}
const problems = [];
let checked = 0;
const documents = names.filter(name => /\.(md|html)$/i.test(name));
for (const file of documents) {
  const original = await readFile(path.join(root, file), 'utf8');
  const text = original.replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, '');
  const links = [
    ...[...text.matchAll(/!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+['"][^)]*)?\s*\)/g)].map(m => m[1] ?? m[2]),
    ...[...text.matchAll(/^\s*\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm)].map(m => m[1] ?? m[2]),
    ...[...text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)].map(m => m[1]),
  ];
  for (const link of links) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/|#|\?|\{|\$)/i.test(link)) continue;
    let relative;
    try { relative = decodeURIComponent(link.split(/[?#]/)[0]); }
    catch { problems.push({file, reason:'invalid URL encoding'}); continue; }
    if (!relative) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), relative)).replace(/\/$/, '') || '.';
    checked++;
    if (target === '..' || target.startsWith('../')) problems.push({file, target, reason:'outside repository'});
    else if (!present.has(target)) problems.push({file, target, reason:'not a repository source path'});
  }
}
console.log(JSON.stringify({pass:problems.length === 0, documents:documents.length, checked, problems}, null, 2));
if (problems.length) process.exitCode = 1;
