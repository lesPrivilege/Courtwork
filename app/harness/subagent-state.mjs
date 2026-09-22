import { check, keys, str, revision } from './coordination-state.mjs';
export const SPARK_DEFINITION = Object.freeze({ id:'builtin:explore', revision:1, title:'Spark', role:'explore', tools:['spark_source','spark_note'], maxSources:16, maxSourceBytes:65536, maxOutputBytes:32768, maxTurns:8, deadlineMs:60000 });
export const emptySubagents = () => ({ agents:[{id:'spark',definition:structuredClone(SPARK_DEFINITION),manager:'local-user',status:'active'}], assignments:[], mounts:[] });
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export function validateSubagents(value,state=null) {
  keys(value,['agents','assignments','mounts']);
  check(Array.isArray(value.mounts)&&value.mounts.length<=512,'Mount capacity');const mountIds=new Set();
  for(const m of value.mounts){keys(m,['id','assignmentId','target','revision','enabled','actor']);str(m.id);check(!mountIds.has(m.id),'Duplicate mount');mountIds.add(m.id);str(m.assignmentId);keys(m.target,['kind','id']);str(m.target.id);check(['project','session'].includes(m.target.kind),'Invalid mount target');revision(m.revision);check(m.revision>=1&&typeof m.enabled==='boolean'&&m.actor==='local-user','Invalid mount');}

  check(Array.isArray(value.agents) && value.agents.length === 1,'Invalid Agent directory');
  const agent=value.agents[0]; keys(agent,['id','definition','manager','status']);
  check(agent.id === 'spark' && agent.manager === 'local-user' && ['active','disabled'].includes(agent.status),'Invalid Agent');
  check(same(agent.definition,SPARK_DEFINITION),'Unsupported Agent definition');
  check(Array.isArray(value.assignments) && value.assignments.length <= 256,'Assignment capacity');
  const ids=new Set(), children=new Set();
  for (const a of value.assignments) {
    keys(a,['id','revision','briefRevision','agentId','brief','parentSessionId','origin','scope','sources','definition','status','cancelRequested','attempts','result','consumption','createdAt','reason','notes','sourceReads','commands','archived','results','providerSelection','budget']);
    str(a.id); check(!ids.has(a.id),'Duplicate Assignment'); ids.add(a.id); revision(a.revision); check(a.revision>=1 && a.briefRevision===1,'Invalid brief revision');
    keys(a.providerSelection,['provider','model','api','baseUrl','configVersion']);for(const k of ['provider','model','api'])str(a.providerSelection[k],300);if(a.providerSelection.baseUrl!==null)str(a.providerSelection.baseUrl,2048);revision(a.providerSelection.configVersion);
    keys(a.budget,['deadlineMs','maxTurns','maxToolCalls']);check(Number.isFinite(a.budget.deadlineMs)&&a.budget.deadlineMs>0&&a.budget.deadlineMs<=60000,'Invalid deadline');for(const k of ['maxTurns','maxToolCalls'])check(Number.isInteger(a.budget[k])&&a.budget[k]>0&&a.budget[k]<=(k==='maxTurns'?SPARK_DEFINITION.maxTurns:32),'Invalid budget');
    str(a.brief,16000); str(a.parentSessionId); check(a.agentId==='spark' && same(a.definition,SPARK_DEFINITION),'Invalid definition binding');
    keys(a.origin,['actor','runId','callId']); check(['human','runtime'].includes(a.origin.actor),'Invalid origin');
    for (const key of ['runId','callId']) { if(a.origin[key]!==null) str(a.origin[key]); }
    check(a.origin.actor==='runtime' ? a.origin.runId!==null && a.origin.callId!==null : a.origin.runId===null && a.origin.callId===null,'Invalid origin binding');
    keys(a.scope,['kind','projectId']); check(['project','unassigned','global'].includes(a.scope.kind),'Invalid scope');
    if(a.scope.projectId!==null) str(a.scope.projectId); check((a.scope.kind==='project') === (a.scope.projectId!==null),'Invalid Project scope');
    check(Array.isArray(a.sources) && a.sources.length<=16,'Invalid sources');
    for (const source of a.sources) validateSource(source);
    check(new Set(a.sources.map(s=>JSON.stringify(canonical(s)))).size===a.sources.length,'Duplicate source binding');
    check(['queued','active','blocked','resolved','cancelled'].includes(a.status) && typeof a.cancelRequested==='boolean','Invalid assignment state');
    check(Array.isArray(a.attempts) && a.attempts.length<=8,'Attempt capacity');
    for(const attempt of a.attempts) {
      keys(attempt,['number','sessionId','runId','status']); check(attempt.number===a.attempts.indexOf(attempt)+1,'Invalid attempt order'); str(attempt.sessionId);
      check(!children.has(attempt.sessionId),'Shared child context'); children.add(attempt.sessionId);
      if(attempt.runId!==null) str(attempt.runId); check(['prepared','active','completed','failed','unknown','cancelled'].includes(attempt.status),'Invalid attempt');
    }
    if(a.result!==null) { keys(a.result,['revision','attempt','sessionId','runId','sha256','bytes','coverage','unknown']); check(a.result.revision>=1,'Invalid result revision'); revision(a.result.attempt);str(a.result.sessionId);str(a.result.runId); digest(a.result.sha256); revision(a.result.bytes);check(a.result.bytes<=32768,'Result limit'); str(a.result.coverage,2000);str(a.result.unknown,2000); }
    check(a.status!=='resolved'||a.result!==null,'Resolved without findings');
    check(Array.isArray(a.results)&&a.results.length<=8,'Result history capacity');
    for(const r of a.results){keys(r,['revision','attempt','sessionId','runId','sha256','bytes','coverage','unknown']);check(r.revision===a.results.indexOf(r)+1,'Invalid result history');revision(r.attempt);str(r.sessionId);str(r.runId);digest(r.sha256);revision(r.bytes);check(r.bytes<=32768,'Result bytes');str(r.coverage,2000);str(r.unknown,2000);}
    check(a.result===null?a.results.length===0:same(a.result,a.results.at(-1)),'Result pointer mismatch');
    check(Array.isArray(a.consumption)&&a.consumption.length<=128,'Consumption capacity');
    for(const c of a.consumption) { keys(c,['commandId','consumer','resultRevision','decision','reason','expandedSources']);str(c.commandId);str(c.consumer);check(c.resultRevision>=1 && ['read','adopt','reject','defer'].includes(c.decision),'Invalid consumption');str(c.reason,2000);check(Array.isArray(c.expandedSources)&&c.expandedSources.every(x=>Number.isInteger(x)&&x>=0&&x<a.sources.length),'Invalid expanded refs'); }
    check(typeof a.archived==='boolean','Invalid archive state');
    check(Array.isArray(a.notes)&&a.notes.length<=32,'Notes capacity');
    for(const note of a.notes) { keys(note,['id','attempt','sessionId','runId','callId','title','sha256','bytes']);str(note.id);revision(note.attempt);str(note.sessionId);str(note.runId);str(note.callId);str(note.title);digest(note.sha256);revision(note.bytes);check(note.bytes<=32768,'Note byte limit'); }
    check(Array.isArray(a.sourceReads)&&a.sourceReads.length<=256,'Read receipt capacity');
    for(const read of a.sourceReads) {keys(read,['actor','runId','index','sha256']);check(['human','runtime'].includes(read.actor),'Invalid reader');if(read.runId!==null)str(read.runId);check(Number.isInteger(read.index)&&read.index>=0&&read.index<a.sources.length,'Invalid source index');digest(read.sha256);}
    check(Array.isArray(a.commands)&&a.commands.length<=128,'Command capacity');
    for(const c of a.commands) {keys(c,['commandId','action','expectedRevision','reason','expandedSources']);str(c.commandId);str(c.action);revision(c.expectedRevision);str(c.reason,2000);check(Array.isArray(c.expandedSources),'Invalid command');}
    const unique=(rows,key)=>check(new Set(rows.map(r=>r[key])).size===rows.length,`Duplicate ${key}`);
    unique(a.notes,'id');unique(a.commands,'commandId');unique(a.consumption,'commandId');
    for(const r of [...a.results,...a.notes]) {
      const t=a.attempts[r.attempt-1];check(t&&t.sessionId===r.sessionId&&t.runId===r.runId,'Derived reference attempt mismatch');
      check(r.bytes>0,'Empty derived reference');
    }
    for(const r of a.sourceReads){check(r.sha256===a.sources[r.index].sha256,'Read digest mismatch');check(r.actor==='human'?r.runId===null:r.runId!==null,'Reader identity mismatch');}
    for(const c of a.consumption)check(a.results.some(r=>r.revision===c.resultRevision),'Consumption result missing');
    for(const c of a.commands){check(['cancel','archive','reconcile','retry','read','adopt','reject','defer'].includes(c.action),'Invalid command action');check(c.expectedRevision>=1,'Invalid command revision');check(c.expandedSources.every(i=>Number.isInteger(i)&&i>=0&&i<a.sources.length),'Invalid command source');}
    check(a.status!=='active'||['prepared','active'].includes(a.attempts.at(-1)?.status),'Active assignment without active attempt');
    check(a.status!=='resolved'||a.attempts.at(-1)?.status==='completed','Resolved attempt incomplete');
    check(!a.archived||(!['active','queued'].includes(a.status)&&!a.attempts.some(t=>t.status==='unknown')),'Archived task unsettled');
    str(a.createdAt);check(Number.isFinite(Date.parse(a.createdAt)),'Invalid timestamp'); if(a.reason!==null)str(a.reason,2000);
  }
  for(const m of value.mounts)check(ids.has(m.assignmentId),'Mount assignment missing');
  if(state)for(const a of value.assignments) {
    check(state.sessions.some(s=>s.id===a.parentSessionId),'Assignment parent missing');
    if(a.origin.actor==='runtime')check(state.runs.some(r=>r.id===a.origin.runId&&r.sessionId===a.parentSessionId),'Assignment origin missing');
    for(const t of a.attempts)if(t.runId!==null) {
      const run=state.runs.find(r=>r.id===t.runId);
      check(run&&run.sessionId===t.sessionId&&run.commandId===`spark:${a.id}:${t.number}`,'Execution binding mismatch');
    }
    for(const s of a.sources)if(s.kind==='artifact') {
      const run=state.runs.find(r=>r.id===s.runId&&r.sessionId===a.parentSessionId),record=run?.artifacts[s.recordIndex];
      check(record?.kind==='content-version'&&record.path===s.path&&record.sha256===s.sha256&&record.bytes===s.bytes,'Artifact source binding mismatch');
    }
    for(const r of a.sourceReads)if(r.actor==='runtime')check(state.runs.some(run=>run.id===r.runId),'Reader Run missing');
  }
}
function digest(s) { check(typeof s==='string' && /^[0-9a-f]{64}$/.test(s),'Invalid digest'); }
export function validateSource(s) {
  check(s&&['artifact','material'].includes(s.kind),'Invalid source owner');
  keys(s,s.kind==='artifact'?['kind','runId','recordIndex','path','sha256','bytes']:['kind','sourceId','revision','path','sha256','bytes']);
  if(s.kind==='artifact'){str(s.runId);revision(s.recordIndex);}else{str(s.sourceId);revision(s.revision);check(s.revision>=1,'Invalid source revision');}
  str(s.path,1000);digest(s.sha256);revision(s.bytes);check(s.bytes<=65536,'Source byte limit');
}

export function assignmentForSession(state,id) { return state.subagents.assignments.find(a=>a.attempts.some(t=>t.sessionId===id)); }

// Session deletion removes its Runs/events too. Keep all still-referenced
// Spark history, regardless of runtime, outcome or archive state. This check
// runs before deletion; it cannot lose its evidence by scanning after removal.
export function assertSessionNotReferencedBySubagents(state, sessionId) {
  const runIds = new Set(state.runs.filter(run => run.sessionId === sessionId).map(run => run.id));
  const referenced = state.subagents.assignments.some(a =>
    a.parentSessionId === sessionId
    || runIds.has(a.origin.runId)
    || a.attempts.some(t => t.sessionId === sessionId || runIds.has(t.runId))
    || a.sources.some(source => source.kind === 'artifact' && runIds.has(source.runId))
    || [a.result, ...a.results, ...a.notes].some(ref => ref && (ref.sessionId === sessionId || runIds.has(ref.runId)))
    || a.sourceReads.some(read => runIds.has(read.runId))
    || a.consumption.some(receipt => receipt.consumer.startsWith(`${sessionId}/`)))
    || state.subagents.mounts.some(mount => mount.target.kind === 'session' && mount.target.id === sessionId);
  check(!referenced, 'Session is retained by Spark work history and cannot be deleted', 'spark_session_referenced', 409);
}

export function bindSubagentRun(state,sessionId,runId,commandId) {
  const a=assignmentForSession(state,sessionId); if(!a)return;
  const attempt=a.attempts.at(-1);
  check(state.subagents.agents[0].status==='active' && a.status==='active' && !a.cancelRequested && attempt.sessionId===sessionId && attempt.status==='prepared' && commandId===`spark:${a.id}:${attempt.number}`,'Child admission closed','spark_closed');
  const parent=state.sessions.find(s=>s.id===a.parentSessionId);
  check(parent && same(a.scope,{kind:parent.scope,projectId:parent.projectId}),'Assignment scope changed','spark_scope');
  attempt.runId=runId; attempt.status='active'; a.revision++;
}
