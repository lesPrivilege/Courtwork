// Bind CUA captures to an explicit product commit, never the later evidence HEAD.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const productSha=process.argv[2];
if(!/^[a-f0-9]{40}$/.test(productSha||''))throw Error('Pass the exact verified product SHA');
const root=new URL('./',import.meta.url);
const steps=JSON.parse(await readFile(new URL('cua-steps.json',root),'utf8'));
const captures=[];
for(const name of (await readdir(root)).filter(n=>n.endsWith('.png')).sort()){
 const bytes=await readFile(new URL(name,root));
 captures.push({file:name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,...steps.captions[name]});
}
const sources=['app/web/summary-disclosure-projection.mjs','app/web/summary-disclosure.mjs','app/web/summary-disclosure.css','app/web/app.mjs','app/web/index.html','app/server/index.mjs','app/web/surface-layout.css','app/web/styles.css','evidence/summary-disclosure-20260910/serve.mjs','evidence/summary-disclosure-20260910/fixture.mjs','evidence/summary-disclosure-20260910/fixture.css'];
const manifest={schemaVersion:1,productSha,pageBuildSha:null,pageBuildStatus:'No Pages build or deployment in this task',dataKind:'synthetic; real local HTTP/Pi loopback Run plus explicit read-state projection fixtures',provider:'local-fake only; no paid provider',runtimeSchema:11,coreSchema:4,appSchema:5,environment:steps.environment,operator:'Astra; non-author of summary module, author of production host/layout and synthetic harness',sourceHashes:sources.map(path=>({path,sha256:createHash('sha256').update(execFileSync('git',['show',`${productSha}:${path}`])).digest('hex')})),captures,steps:steps.steps,limitations:steps.limitations};
await writeFile(new URL('manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(`${captures.length} captures bound to ${productSha}`);
