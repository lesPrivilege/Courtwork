import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,checkRegistry} from './product-semantics.mjs';
export const guardedGlyphs=['message-square','activity','plug','folder','file-text','refresh-cw'];
// Exact string literals, including data identifiers: exclusions are reviewed
// records too. This is intentionally narrower than a complete JS/HTML parser.
export function guardedLines(source) {
  const pattern=new RegExp(`(["'])(${guardedGlyphs.join('|')})\\1`);
  return source.split('\n').flatMap((line,index)=>pattern.test(line)?[{source:line.trim(),line:index+1}]:[]);
}
export function validateConsumers(actual,ledger) {
  const errors=[];
  for(const a of actual) {
    const e=ledger.find(e=>e.file===a.file&&e.source===a.source);
    if(!e||!e.reason||!['mapped-raw','named-read','data-identifier'].includes(e.disposition))errors.push(`${a.file}:${a.line}: unregistered semantic consumer: ${a.source}`);
  }
  for(const e of ledger)if(!actual.some(a=>a.file===e.file&&a.source===e.source))errors.push(`Stale consumer exception: ${e.file}: ${e.source}`);
  const count = rows => {const m=new Map(); for(const e of rows){const k=JSON.stringify([e.file,e.source]);m.set(k,(m.get(k)||0)+1);}return m;};
  const actualCounts=count(actual),ledgerCounts=count(ledger);
  for(const [key,n] of actualCounts)if(n!==(ledgerCounts.get(key)||0))errors.push(`Consumer count changed: ${key}: ${n}`);
  return errors;
}
export async function scanConsumers() {
  const actual=[];
  for(const name of (await readdir(path.join(root,'app/web'))).filter(n=>n.endsWith('.mjs')&&!['ui-controls.mjs','product-semantics.generated.mjs'].includes(n)).sort()) {
    const file=`app/web/${name}`;
    for(const hit of guardedLines(await readFile(path.join(root,file),'utf8')))actual.push({file,...hit});
  }
  return actual;
}
export async function checkConsumers() {
  await checkRegistry();
  const ledger=JSON.parse(await readFile(path.join(root,'engineering/design/product-semantics/raw-consumers.json'),'utf8'));
  const errors=validateConsumers(await scanConsumers(),ledger);
  const registry=JSON.parse(await readFile(path.join(root,'engineering/design/product-semantics/registry.json'),'utf8'));
  for(const e of ledger)for(const key of e.semanticKeys||[])if(!registry.entries.some(e=>e.semanticKey===key))errors.push(`Unknown consumer key: ${key}`);
  if(errors.length)throw new Error(errors.join('\n'));
  return {guardedGlyphs,entries:ledger.length,scope:'app/web module literal lines; vendor, static allowlist and generated projection excluded'};
}
if(process.argv[1]===fileURLToPath(import.meta.url))checkConsumers().then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
