// Independent observation-level mutations. These do NOT execute Courtwork Core.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {grade} from './grade.mjs';
const spec=JSON.parse(await readFile(new URL('./cases.json',import.meta.url),'utf8'));
const results=[];
function probe(id,caseId,mutate,expectedPass,interpretation) {
  const task=spec.cases.find(c=>c.id===caseId);
  // Independently construct the intended full observable trajectory. These are
  // synthetic, not copied production snapshots; every baseline checkpoint
  // includes the complete output shape rather than only expected fields.
  let version=0, sourceVersion=1;
  const obs=task.steps.map(step=>{
    let accepted=null;
    if (step==='replace') sourceVersion=2;
    if (step==='spoof'||step==='changed-request') accepted=false;
    if (step==='accept') {
      accepted=sourceVersion===1;
      if(accepted) version=1;
    }
    return {accepted,version,sourceVersion,artifact:version===1?spec.artifact:null,
      decisions:version,audits:version,
      openObligations:version===1?['confirm-owner']:[],historicalSource:spec.source};
  });
  assert.equal(grade(task.expected,obs).pass,true);
  mutate(obs);
  const outcome=grade(task.expected,obs);
  assert.equal(outcome.pass,expectedPass);
  results.push({id,caseId,observedGradePass:outcome.pass,expectedProbeResult:expectedPass,
    interpretation,observations:obs,grade:outcome});
}
probe('M1','receipt-replay',o=>{o[2].artifact='CORRUPTED AFTER REPLAY';},true,
  'Wrong final artifact is invisible to receipt-replay scoring.');
probe('M2','receipt-replay',o=>{o[2].openObligations=[];},true,
  'Dropped final open obligation is invisible to receipt-replay scoring.');
probe('M3','restart',o=>{o[2].artifact=null;o[2].openObligations=[];},true,
  'State can be correct immediately after restart and damaged on the final replay without failure.');
probe('M4','normal',o=>{o[1].audits=0;},true,
  'Normal completion can have no audit record and still pass.');
probe('M5','actor-spoof',o=>{o[1].artifact=null;},true,
  'The legitimate action after spoof rejection need not create an artifact to pass this case.');
probe('C1','normal',o=>{o[1].artifact='WRONG';},false,
  'Positive detection control: a graded artifact field is correctly rejected.');
probe('C2','normal',o=>{o[1].accepted=false;o[1].version=0;o[1].artifact=null;o[1].decisions=0;o[1].audits=0;o[1].openObligations=[];},false,
  'A genuine reject-all/no-effect implementation fails normal.');
const report={scope:'Independent grader mutation probes only; no Core execution, HTTP, SIGKILL, model calls, or legal judgement.',
  environment:{node:process.version,platform:process.platform,arch:process.arch},
  summary:{undesirableObservationsAccepted:5,detectionControlsRejected:2,probes:results.length},results};
await writeFile(new URL('./mutation-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary));
