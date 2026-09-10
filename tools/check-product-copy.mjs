import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './product-semantics.mjs';

// Incremental lexical guard, not an AST or a translation/user-data filter.
// Only hard-coded visible fields are read. Runtime values never enter this gate.
export function prohibitedDefaultCopy(text) {
  const value=String(text).trim();
  if (/^Run (?:tests?|commands?|locally|from source|the (?:tests?|command|example))\b/.test(value)) return false;
  return /^(?:Run(?:s)?(?:\b|\s)|Cancel run$|Continue in Work$|Permission request$)/.test(value);
}
export function copyLiterals(source) {
  const matches=[];
  const pattern=/\b(?:text|title)\s*:\s*(["'`])([^\n]*?)\1|["']aria-label["']\s*:\s*(["'`])([^\n]*?)\3/g;
  for(const m of source.matchAll(pattern)) {
    const text=m[2]??m[4];
    if(prohibitedDefaultCopy(text))matches.push({text,line:source.slice(0,m.index).split('\n').length});
  }
  return matches;
}
export async function checkCopy() {
  const exceptions=JSON.parse(await readFile(path.join(root,'engineering/design/product-semantics/copy-exceptions.json'),'utf8'));
  const actual=[];
  for(const name of (await readdir(path.join(root,'app/web'))).filter(n=>n.endsWith('.mjs')&&!n.endsWith('.generated.mjs')).sort()) {
    const file=`app/web/${name}`;
    for(const match of copyLiterals(await readFile(path.join(root,file),'utf8')))actual.push({file,...match});
  }
  const html=await readFile(path.join(root,'app/web/index.html'),'utf8');
  for(const m of html.replace(/<!--[\s\S]*?-->/g,'').matchAll(/>([^<>]+)</g))if(prohibitedDefaultCopy(m[1]))actual.push({file:'app/web/index.html',text:m[1].trim(),line:0});
  const errors=[];
  for(const item of actual)if(!exceptions.some(e=>e.file===item.file&&e.text===item.text&&e.scope==='diagnostic-details'&&e.reason))errors.push(`${item.file}:${item.line}: unregistered default copy: ${item.text}`);
  for(const e of exceptions)if(!actual.some(a=>a.file===e.file&&a.text===e.text))errors.push(`Stale copy exception: ${e.file}: ${e.text}`);
  if(errors.length)throw new Error(errors.join('\n'));
  return {scope:'app/web hard-coded text/title/aria-label fields plus index.html text nodes',diagnosticExceptions:actual.length};
}
if(process.argv[1]===fileURLToPath(import.meta.url))checkCopy().then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
