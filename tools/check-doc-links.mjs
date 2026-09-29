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
// --anchors reports missing #fragments in Markdown targets; --strict-anchors also fails on them.
const strictAnchors = process.argv.includes('--strict-anchors');
const checkAnchors = strictAnchors || process.argv.includes('--anchors');
const fenced = /^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm;
const anchorCache = new Map();
// GitHub-style anchors: heading slugs (duplicates get -1, -2, ...) plus explicit id/name attributes.
async function anchorsOf(file) {
  if (anchorCache.has(file)) return anchorCache.get(file);
  const text = (await readFile(path.join(root, file), 'utf8')).replace(fenced, '');
  const anchors = new Set([...text.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)].map(m => m[1].toLowerCase()));
  const seen = new Map();
  for (const m of text.matchAll(/^ {0,3}#{1,6}[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/gm)) {
    const base = m[1]
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '').replace(/[`*]/g, '')
      .toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
    let slug = base;
    while (anchors.has(slug)) slug = `${base}-${(seen.get(base) ?? 0) + 1}`, seen.set(base, (seen.get(base) ?? 0) + 1);
    anchors.add(slug);
  }
  anchorCache.set(file, anchors);
  return anchors;
}
const problems = [];
const anchorProblems = [];
let checked = 0;
let anchorsChecked = 0;
const documents = names.filter(name => /\.(md|html)$/i.test(name));
for (const file of documents) {
  const original = await readFile(path.join(root, file), 'utf8');
  // Markdown code spans are not rendered as links, so quoted link syntax inside them is not checked.
  const text = /\.md$/i.test(file) ? original.replace(fenced, '').replace(/`[^`\n]+`/g, '') : original.replace(fenced, '');
  const links = [
    ...[...text.matchAll(/!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+['"][^)]*)?\s*\)/g)].map(m => m[1] ?? m[2]),
    ...[...text.matchAll(/^\s*\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm)].map(m => m[1] ?? m[2]),
    ...[...text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)].map(m => m[1]),
  ];
  for (const link of links) {
    if (checkAnchors && link.startsWith('#') && /\.md$/i.test(file)) await checkFragment(file, link, file);
    if (/^(?:[a-z][a-z0-9+.-]*:|\/|#|\?|\{|\$)/i.test(link)) continue;
    let relative;
    try { relative = decodeURIComponent(link.split(/[?#]/)[0]); }
    catch { problems.push({file, reason:'invalid URL encoding'}); continue; }
    if (!relative) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), relative)).replace(/\/$/, '') || '.';
    checked++;
    if (target === '..' || target.startsWith('../')) problems.push({file, target, reason:'outside repository'});
    else if (!present.has(target)) problems.push({file, target, reason:'not a repository source path'});
    else if (checkAnchors && /\.md$/i.test(target) && link.includes('#')) await checkFragment(file, link, target);
  }
}
async function checkFragment(file, link, target) {
  let fragment;
  try { fragment = decodeURIComponent(link.slice(link.indexOf('#') + 1)); }
  catch { return; }
  if (!fragment || fragment === 'top' || /^L\d+(?:C\d+)?(?:-L\d+(?:C\d+)?)?$/.test(fragment)) return;
  anchorsChecked++;
  if (!(await anchorsOf(target)).has(fragment.toLowerCase())) anchorProblems.push({file, link, target, fragment});
}
const result = {pass:problems.length === 0, documents:documents.length, checked, problems};
if (checkAnchors) Object.assign(result, {anchorsChecked, anchorProblems});
console.log(JSON.stringify(result, null, 2));
if (problems.length || (strictAnchors && anchorProblems.length)) process.exitCode = 1;
