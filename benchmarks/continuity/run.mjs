import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {execute} from './courtwork.mjs';
import {grade} from './grade.mjs';

const root = fileURLToPath(new URL('../../',import.meta.url));
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--output') throw new Error('Usage: node benchmarks/continuity/run.mjs --output /absolute/result.json');
const bytes = await readFile(new URL('./cases.json',import.meta.url));
const spec = JSON.parse(bytes);
const hashes = {};
for (const name of ['benchmarks/continuity/cases.json','benchmarks/continuity/run.mjs','benchmarks/continuity/courtwork.mjs','benchmarks/continuity/grade.mjs','app/core/client.mjs','app/core/bridge.py','app/core/core.py']) {
  hashes[name] = createHash('sha256').update(await readFile(new URL('../../'+name,import.meta.url))).digest('hex');
}
const git = (...a) => execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
const report = {schemaVersion:1,protocol:'se-continuity-mechanism-v0',startedAt:new Date().toISOString(),
  git:{head:git('rev-parse','HEAD'),dirty:git('status','--porcelain').length > 0},hashes,
  environment:{node:process.version,platform:process.platform,arch:process.arch,python:execFileSync(process.env.WORK_AGENT_PYTHON ?? 'python3',['--version'],{encoding:'utf8'}).trim()},
  corpus:spec.corpus,split:spec.split,independentTaskFamilies:1,condition:'courtwork-core-scripted',model:null,
  limitations:['development fixtures','scripted trusted Core client','no model, host Session, GUI, SIGKILL, legal-quality or comparative claims'],results:[]};
for (const task of spec.cases) {
  const started = performance.now();
  const result = await execute(spec,task);
  report.results.push({id:task.id,durationMs:performance.now()-started,...result,grade:grade(task.expected,result.observations,result.error)});
}
report.summary = {attempted:report.results.length,passed:report.results.filter(r=>r.grade.pass).length,failed:report.results.filter(r=>!r.grade.pass).length};
await writeFile(args[1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report.summary));
if (report.summary.failed) process.exitCode = 1;
