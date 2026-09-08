import {readFile,writeFile,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {execute as courtwork} from './courtwork.mjs';
import {execute as standard} from './standard.mjs';
import {grade} from './grade.mjs';
import {identitiesFor} from './fixture-identities.mjs';

const root = fileURLToPath(new URL('../../',import.meta.url));
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--output') throw new Error('Usage: node benchmarks/continuity/run.mjs --output /absolute/result.json');
const spec = JSON.parse(await readFile(new URL('./cases.json',import.meta.url)));
const hashes = {};
for (const name of ['benchmarks/continuity/cases.json','benchmarks/continuity/run.mjs','benchmarks/continuity/courtwork.mjs','benchmarks/continuity/standard.mjs','benchmarks/continuity/standard.py','benchmarks/continuity/observe.mjs','benchmarks/continuity/grade.mjs','benchmarks/continuity/fixture-identities.mjs','benchmarks/continuity/trace.mjs','app/core/client.mjs','app/core/bridge.py','app/core/core.py']) {
  hashes[name] = createHash('sha256').update(await readFile(new URL('../../'+name,import.meta.url))).digest('hex');
}
const git = (...a) => execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
const report = {schemaVersion:2,protocol:'se-continuity-conformance-v1',startedAt:new Date().toISOString(),
  git:{head:git('rev-parse','HEAD'),dirty:git('status','--porcelain').length > 0},hashes,
  environment:{node:process.version,platform:process.platform,arch:process.arch,python:execFileSync(process.env.WORK_AGENT_PYTHON ?? 'python3',['--version'],{encoding:'utf8'}).trim()},
  corpus:spec.corpus,split:spec.split,independentTaskFamilies:1,model:null,
  limitations:['development fixtures; shared author','trusted scripted clients','S is a bounded conventional transaction baseline, not a general workflow product','no model, host Session, GUI, SIGKILL, legal-quality or causal advantage claims'],results:[]};
const conditions = {E:courtwork,S:standard};
const attempts = Object.keys(conditions).flatMap(condition=>spec.cases.map(task=>({id:condition+'/'+task.id,condition,identities:identitiesFor(condition),taskId:task.id,steps:task.steps})));
const manifest = await open(args[1]+'.attempts.json','wx');
try {await manifest.writeFile(JSON.stringify({...report,attempts},null,2)+'\n');await manifest.sync();} finally {await manifest.close();}
// Reserve both outputs before executing. Append-only durable journal records
// started/finished attempts even when the runner never produces a final report.
const output = await open(args[1],'wx'); await output.close();
const journal = await open(args[1]+'.journal.jsonl','wx');
async function record(value) {await journal.writeFile(JSON.stringify(value)+'\n');await journal.sync();}
try {
  for (const attempt of attempts) {
    await record({attemptId:attempt.id,status:'started',at:new Date().toISOString()});
    const task = spec.cases.find(t=>t.id === attempt.taskId);
    const started = performance.now();
    let result;
    try {result = await conditions[attempt.condition](spec,task);} catch(e) {result={identities:{},observations:[],trace:[],error:{code:e.code ?? e.name,message:e.message}};}
    const scored = {id:attempt.id,condition:attempt.condition,taskId:task.id,durationMs:performance.now()-started,...result,grade:grade(spec,task,result.observations,attempt.condition,result.trace,result.error)};
    report.results.push(scored);
    await record({attemptId:attempt.id,status:scored.grade.pass?'passed':'failed',result:scored});
  }
} finally {await journal.close();}
report.summary = {planned:attempts.length,attempted:report.results.length,passed:report.results.filter(r=>r.grade.pass).length,failed:report.results.filter(r=>!r.grade.pass).length};
await writeFile(args[1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary));
if (report.summary.failed || report.summary.attempted !== report.summary.planned) process.exitCode = 1;
