import {readFile} from 'node:fs/promises';
const args=process.argv.slice(2), filters={};
for(let i=0;i<args.length;i+=2){if(!['--surface','--status','--id'].includes(args[i])||!args[i+1])throw Error('Usage: node brand/scripts/query-index.mjs [--surface icon] [--status verified] [--id mdn-waapi]');filters[args[i].slice(2)]=args[i+1];}
const index=JSON.parse(await readFile(new URL('../sources/visual-runtime-index.json',import.meta.url),'utf8'));
const matches=index.entries.filter(e=>(!filters.surface||e.surfaces.includes(filters.surface))&&(!filters.status||e.status===filters.status)&&(!filters.id||e.id===filters.id));
console.log(JSON.stringify(matches,null,2));
