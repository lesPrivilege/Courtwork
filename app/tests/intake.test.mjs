import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {IntakeStore} from '../intake/store.mjs';
import {boot} from './helpers.mjs';
import {startServer} from '../server/index.mjs';

const upload=(sessionId,text,commandId,expectedRevision)=>({sessionId,name:'brief.md',text,commandId,...(expectedRevision===undefined?{}:{expectedRevision})});
async function store(t) {const dir=await mkdtemp(path.join(tmpdir(),'cw-intake-'));const s=await new IntakeStore(dir).open();t.after(()=>s.close());return s;}

test('Intake retains UTF-8 r1/r2 and independent session identity; same bytes do not merge scopes',async t=>{
 const s=await store(t), a=s.retain(upload('a','\uFEFF  中文 😀\r\n','1',0));s.markWritten('a','1');
 const b=s.retain(upload('a','Version two','2',1));
 assert.equal(b.retained.sourceId,a.retained.sourceId);assert.equal(b.retained.revision,2);
 assert.equal(s.read('a',a.retained).text,'\uFEFF  中文 😀\r\n');
 assert.equal(s.read('a',b.retained).text,'Version two');
 const c=s.retain(upload('b','Version two','1',0));assert.notEqual(c.retained.sourceId,a.retained.sourceId);
 assert.throws(()=>s.read('b',b.retained),{code:'not_found'});
 assert.equal(s.versions('a',a.retained.sourceId).versions.length,2);
});

test('Intake command payload conflicts, CAS and delayed pending delivery cannot rewrite later revisions',async t=>{
 const s=await store(t), a=s.retain(upload('a','old','one',0));
 assert.equal(s.retain(upload('a','old','one',0)).retained.sourceId,a.retained.sourceId);
 assert.throws(()=>s.retain(upload('a','different','one',0)),{code:'command_conflict'});
 assert.throws(()=>s.retain(upload('a','new','two',0)),{code:'source_revision_conflict'});
 const b=s.retain(upload('a','new','two',1));s.markWritten('a','two');
 assert.equal(s.retain(upload('a','old','one',0)).workspaceState,'superseded');
 assert.equal(s.markWritten('a','one').workspaceState,'superseded');
 const same=s.retain(upload('a','new','three',2));assert.equal(same.retained.revision,b.retained.revision);
 assert.equal(s.versions('a',a.retained.sourceId).versions.length,2);
});

test('Intake exact reads reject mismatched hashes and corrupt bytes, including duplicate upload reuse',async t=>{
 const s=await store(t),a=s.retain(upload('a','original','one',0));
 assert.throws(()=>s.read('a',{...a.retained,sha256:'0'.repeat(64)}),{code:'source_version_mismatch'});
 s.db.prepare('UPDATE revisions SET content=? WHERE source_id=?').run(Buffer.from('broken'),a.retained.sourceId);
 assert.throws(()=>s.read('a',a.retained),{code:'source_integrity_failed'});
 assert.throws(()=>s.retain(upload('a','original','two',1)),{code:'source_integrity_failed'});
 assert.throws(()=>s.retain(upload('a','original','one',0)),{code:'source_integrity_failed'});
 assert.equal(s.versions('a',a.retained.sourceId).versions.length,1);
});

test('Intake restarts with pending receipt and rejects unknown schema without rewriting it',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cw-intake-reopen-'));let s=await new IntakeStore(dir).open();
 const a=s.retain(upload('a','','one',0));s.close();s=await new IntakeStore(dir).open();
 assert.equal(s.retain(upload('a','','one',0)).workspaceState,'pending');assert.equal(s.read('a',a.retained).text,'');
 s.db.exec('PRAGMA user_version=2');s.close();
 await assert.rejects(new IntakeStore(dir).open(),{code:'intake_version_unsupported'});
 const db=new DatabaseSync(path.join(dir,'intake/sources.sqlite'));assert.equal(db.prepare('PRAGMA user_version').get().user_version,2);db.close();
});

test('Intake will not follow a sidecar database symlink',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cw-intake-link-'));await mkdir(path.join(dir,'intake'));
 const target=path.join(dir,'other');await writeFile(target,'unchanged');await symlink(target,path.join(dir,'intake/sources.sqlite'));
 await assert.rejects(new IntakeStore(dir).open(),{code:'intake_unavailable'});assert.equal(await readFile(target,'utf8'),'unchanged');
});

test('HTTP uploads retain exact versions across workspace edits and restart; deleted session cannot disclose',async t=>{
 const h=await boot();let current=h.runtime;t.after(()=>current.close());
 const a=await h.createSession(),b=await h.createSession();
 const first=await h.api('POST',`/sessions/${a.id}/materials`,{name:'brief.md',text:'# One\n',commandId:'one',expectedRevision:0});assert.equal(first.status,200);
 const second=await h.api('POST',`/sessions/${a.id}/materials`,{name:'brief.md',text:'# Two\n',commandId:'two',expectedRevision:1});assert.equal(second.status,200);
 const locator=new URLSearchParams({sourceId:first.json.retained.sourceId,revision:1,sha256:first.json.sha256});
 const p=`/sessions/${a.id}/materials/file?${locator}`;
 assert.equal((await h.api('GET',p)).json.text,'# One\n');
 assert.equal((await h.api('GET',`/sessions/${b.id}/materials/file?${locator}`)).status,404);
 assert.equal((await h.api('GET',p+'&scope=other')).status,400);
 await writeFile(path.join(a.workspaceDir,'materials/brief.md'),'mutable third');
 const replay=await h.api('POST',`/sessions/${a.id}/materials`,{name:'brief.md',text:'# One\n',commandId:'one',expectedRevision:0});
 assert.equal(replay.status,200);assert.equal(await readFile(path.join(a.workspaceDir,'materials/brief.md'),'utf8'),'mutable third');
 await current.close();current=await startServer({dataDir:h.dataDir,port:0,logger:()=>{}});
 const read=await fetch(current.url+'/api/v5'+p,{headers:{'x-work-token':current.token}});assert.equal((await read.json()).text,'# One\n');
 await current.service.deleteSession(a.id);
 assert.throws(()=>current.service.getMaterialFile(a.id,locator),{code:'not_found'});
 assert.equal(current.service.intake.read(a.id,first.json.retained).text,'# One\n');
});

test('HTTP simultaneous CAS uploads admit one source revision and leave the losing text out of workspace',async t=>{
 const h=await boot();t.after(()=>h.runtime.close());const a=await h.createSession();
 const results=await Promise.all(['left','right'].map((text)=>h.api('POST',`/sessions/${a.id}/materials`,{name:'a.txt',text,commandId:text,expectedRevision:0})));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.equal((await h.api('GET',`/sessions/${a.id}/materials`)).json.sources.length,1);
 const winner=results.findIndex(r=>r.status===200);assert.equal(await readFile(path.join(a.workspaceDir,'materials/a.txt'),'utf8'),['left','right'][winner]);
});


test('Upload delivery failure leaves readable bytes; same command recovers and superseded pending never overwrites',async t=>{
 const h=await boot();t.after(()=>h.runtime.close());const a=await h.createSession();
 const target=path.join(a.workspaceDir,'materials','blocked.txt');await mkdir(target,{recursive:true});
 const first={name:'blocked.txt',text:'retained first',commandId:'first',expectedRevision:0};
 const pending=await h.api('POST',`/sessions/${a.id}/materials`,first);assert.equal(pending.status,503);assert.equal(pending.json.error.code,'material_link_failed');
 const list=(await h.api('GET',`/sessions/${a.id}/materials`)).json;
 assert.equal(list.sources.length,1);
 const version=h.runtime.service.intake.versions(a.id,list.sources[0].sourceId).versions[0];
 assert.equal(h.runtime.service.intake.read(a.id,{sourceId:list.sources[0].sourceId,...version}).text,'retained first');
 await rm(target,{recursive:true});
 const retry=await h.api('POST',`/sessions/${a.id}/materials`,first);assert.equal(retry.status,200);assert.equal(retry.json.workspaceState,'written');assert.equal(retry.json.retained.revision,1);
 await rm(target);await mkdir(target);
 const second={name:'blocked.txt',text:'retained second',commandId:'second',expectedRevision:1};
 assert.equal((await h.api('POST',`/sessions/${a.id}/materials`,second)).status,503);
 await rm(target,{recursive:true});
 const third=await h.api('POST',`/sessions/${a.id}/materials`,{name:'blocked.txt',text:'third',commandId:'third',expectedRevision:2});assert.equal(third.status,200);
 const late=await h.api('POST',`/sessions/${a.id}/materials`,second);assert.equal(late.status,200);assert.equal(late.json.workspaceState,'superseded');assert.equal(await readFile(target,'utf8'),'third');
});
