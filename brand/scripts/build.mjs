import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('geometry/mark.svg',root),'utf8');
const parts = [...source.matchAll(/<rect\s+data-part="([^"]+)"([^>]+)\/>/g)].map(([,name,attrs]) => ({name,svg:`<rect${attrs}/>`}));
if(parts.map(p=>p.name).join(',') !== 'stem,line-1,line-2,line-3') throw Error('Unexpected canonical geometry');
const digest = createHash('sha256').update(source).digest('hex');
await writeFile(new URL('src/geometry.generated.mjs',root),`// Generated from geometry/mark.svg. Do not edit.\nexport const geometryHash = ${JSON.stringify(digest)};\nexport const parts = ${JSON.stringify(parts,null,2)};\n`);
const { renderSymbol, concepts, materials } = await import(new URL('src/symbol.mjs',root));
await mkdir(new URL('exports/',root),{recursive:true});
const records=[];
for(const concept of concepts) for(const material of materials) {
 const file=`exports/${concept}-${material}.svg`;
 const svg=renderSymbol({concept,material,size:128,label:`CourtWork ${concept}`,idPrefix:`cw-${concept}-${material}`}).split("\n").map(line=>line.trimEnd()).join("\n");
 await writeFile(new URL(file,root),svg+'\n');records.push({concept,material,file,sha256:createHash('sha256').update(svg+'\n').digest('hex')});
}
await writeFile(new URL('exports/manifest.json',root),JSON.stringify({geometry:'geometry/mark.svg',geometrySha256:digest,generatedBy:'node brand/scripts/build.mjs',assets:records},null,2)+'\n');
console.log(`Built ${records.length} native SVG assets from ${fileURLToPath(new URL('geometry/mark.svg',root))}`);
