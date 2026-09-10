import { readFile } from 'node:fs/promises';
import { reopen } from '../../app/tests/helpers.mjs';
const manifest=JSON.parse(await readFile('/tmp/courtwork-vs01-preview.json','utf8'));
if(manifest.dataClass!=='synthetic · real HTTP/Pi loopback/Core') throw new Error('Only the explicit synthetic fixture may be reopened');
const h=await reopen(manifest.dataDir,{port:Number(new URL(manifest.url).port)});
console.log(h.runtime.url);
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await h.runtime.close();process.exit(0);});
