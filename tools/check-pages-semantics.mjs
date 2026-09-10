import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './product-semantics.mjs';
import {captureSlots} from '../site/src/capture-plan.mjs';
export function validatePagesMap(map,entries,slots,figures) {
  const errors=[];
  if(map.schemaVersion!==1)return ['Unsupported Pages semantic map'];
  for(const [kind,ids] of [['captureSlots',Object.keys(slots)],['figures',figures.map(e=>e.id)]]) {
    for(const id of ids)if(!map[kind]?.[id]?.length)errors.push(`Unmapped ${kind}: ${id}`);
    for(const [id,keys] of Object.entries(map[kind]||{})) {
      if(!ids.includes(id))errors.push(`Stale ${kind}: ${id}`);
      for(const key of keys)if(!entries.some(e=>e.semanticKey===key&&e.allowedSurfaces.includes('pages')))errors.push(`Invalid Pages semantic key: ${key}`);
    }
  }
  return errors;
}
export async function checkPagesSemantics() {
  const json=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
  const map=await json('engineering/design/product-semantics/pages-map.json');
  const {entries}=await json('engineering/design/product-semantics/registry.json');
  const {figures}=await json('site/src/assets/figures/figures.json');
  const errors=validatePagesMap(map,entries,captureSlots,figures);
  const page=await readFile(path.join(root,'site/src/page.mjs'),'utf8');
  for(const [,key] of page.matchAll(/data-semantic-key="([^"]+)"/g))if(!entries.some(e=>e.semanticKey===key&&e.allowedSurfaces.includes('pages')))errors.push(`Unregistered page semantic marker: ${key}`);
  if(errors.length)throw new Error(errors.join('\n'));
  return {captureSlots:Object.keys(map.captureSlots).length,figures:Object.keys(map.figures).length};
}
if(process.argv[1]===fileURLToPath(import.meta.url))checkPagesSemantics().then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
