import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir, copyFile, symlink, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CoreClient } from '../core/client.mjs';

const base = '6921dbd18de153020c87e4438eebe5260762fee0';
const fixturePath = new URL('./fixtures/work-core/governance-crash.py', import.meta.url).pathname;
const corePath = new URL('../core/', import.meta.url).pathname;
const ctx = {actor:'local-user',project_id:'p',purpose:'human-governance',execution:null};
const ref = {project_id:'p',kind:'matter',id:'m'};
const q = (c, query) => c.call('governance_query',{context:ctx,query:{schema_version:1,...query}});
const act = (c,request) => c.call('governance_action',{context:ctx,request});
const py = (code,args=[]) => spawnSync('python3',['-c',code,...args],{encoding:'utf8',timeout:10000});
function successful(r) { assert.equal(r.status,0,r.stderr || r.stdout); return r.stdout; }
function sql(db, code) { return successful(py(`import sqlite3,sys\nc=sqlite3.connect(sys.argv[1])\n${code}\nc.commit()\nc.close()`,[db])); }
function dump(db) { return sql(db, 'print("\\n".join(c.iterdump()))'); }
function markers(db) { return JSON.parse(sql(db,"import json\nprint(json.dumps([c.execute('PRAGMA user_version').fetchone()[0], c.execute(\"SELECT value FROM app_meta WHERE key='schema_version'\").fetchone()[0]]))")); }
async function seed(dir) {
  const c = new CoreClient({dataDir:dir});
  try {
    await c.createMatter({matterId:'m',title:'Synthetic migration source',source:{id:'s',version:1,text:'source',digest:'41cf6794ba4200b839c53531555f0f3998df4cbb01a4d5cb0b94e3ca5e23947d'},contractVersion:'se-contract-v5.0'});
    await c.call('claim_work',{matter_id:'m',project_id:'p',extension_id:'evidence-memo'});
    const v = await q(c,{kind:'inspect',object_ref:ref});
    return {schema_version:1,request_id:'grant',matter_id:'m',expected_policy_revision:0,expected_object_version:v.object_version,
      grant:{adapter_id:'adapter',purpose:'attention-runtime',fields:['registry','sources'],expires_at:'2099-01-01T00:00:00Z',content_scope:'current'}};
  } finally { await c.close(); }
}
function downgrade(db) {
  sql(db,"c.executescript(\"DROP TABLE matter_disclosure_request; DROP TABLE matter_disclosure_event; DROP TABLE matter_disclosure; UPDATE app_meta SET value='4' WHERE key='schema_version'; UPDATE meta SET value='3' WHERE key='schema_version'; PRAGMA user_version=3;\")");
}
async function fixture(fn) {
  const dir=await mkdtemp(path.join(tmpdir(),'cw-governance-recovery-'));
  try { await fn(dir,path.join(dir,'state.db')); } finally { await rm(dir,{recursive:true,force:true}); }
}
async function oldHost(dir) {
  const dest=path.join(dir,'old-host'); await mkdir(dest);
  for(const name of ['core.py','file_candidates.py','attention.py','bridge.py']) {
    const r=spawnSync('git',['show',`${base}:app/core/${name}`],{encoding:'utf8'});
    successful(r); await writeFile(path.join(dest,name),r.stdout);
  }
  return dest;
}

for(const stage of ['before_commit','after_commit_before_ack']) {
  test(`governance policy SIGKILL ${stage} preserves zero/one complete effect`,()=>fixture(async(dir,db)=>{
    const request=await seed(dir);
    const child=spawnSync('python3',[fixturePath,'action',db,stage,JSON.stringify(ctx),JSON.stringify(request)],{encoding:'utf8',timeout:10000});
    assert.equal(child.signal,'SIGKILL',child.stderr);
    const c=new CoreClient({dataDir:dir});
    try {
      const committed=stage==='after_commit_before_ack';
      assert.equal((await q(c,{kind:'inspect',object_ref:ref})).policy.revision,committed?1:0);
      const before=await q(c,{kind:'policy_request',object_ref:ref,request_id:'grant'});
      assert.equal(before.result?.policy_revision ?? 0,committed?1:0);
      const r=await act(c,request); assert.equal(r.policy_revision,1); assert.deepEqual(await act(c,request),r);
      if(committed) assert.deepEqual(before.result,r);
    }finally{await c.close();}
    assert.equal(sql(db,"print(c.execute('SELECT COUNT(*) FROM matter_disclosure_event').fetchone()[0])").trim(),'1');
    assert.equal(sql(db,"print(c.execute('SELECT COUNT(*) FROM matter_disclosure_request').fetchone()[0])").trim(),'1');
    assert.equal(sql(db,"print(c.execute(\"SELECT version FROM matter WHERE id='m'\").fetchone()[0])").trim(),'0');
  }));
}

test('Core3/app4 migrates atomically with an exclusive original backup; fixed old host refuses new DB and reads separate backup',()=>fixture(async(dir,db)=>{
  await seed(dir); downgrade(db); const original=dump(db); const old=await oldHost(dir);
  const c=new CoreClient({dataDir:dir});
  try { const info=await c.start();assert.equal(info.core_schema_version,4);assert.equal(info.app_schema_version,5);assert.equal((await q(c,{kind:'inspect',object_ref:ref})).policy.revision,0); }
  finally{await c.close();}
  const backup=db+'.pre-governance-core-v4-app-v5.bak'; assert.equal(dump(backup),original); assert.deepEqual(markers(db),[4,'5']);
  const refused=py("import sys\nsys.path.insert(0,sys.argv[1])\nfrom bridge import open_or_initialize\nopen_or_initialize(sys.argv[2])",[old,db]);
  assert.notEqual(refused.status,0);assert.match(refused.stderr,/SCHEMA_NEWER|unsupported user_version=4/);
  const restore=path.join(dir,'restored');await mkdir(restore);const restored=path.join(restore,'state.db');await copyFile(backup,restored);
  const read=successful(py("import sys\nsys.path.insert(0,sys.argv[1])\nfrom bridge import open_or_initialize,close_store\ns=open_or_initialize(sys.argv[2]);print(s._matter_row('m')['contract_version']);close_store(s)",[old,restored]));
  assert.equal(read.trim(),'se-contract-v5.0');assert.deepEqual(markers(restored),[3,'4']);
  assert.equal(dump(backup),original);
}));

test('migration refuses existing or symlink backup, malformed owned schema, and partial new tables without modifying old bytes',async()=>{
  for(const mode of ['backup','symlink','malformed','partial']) await fixture(async(dir,db)=>{
    await seed(dir);downgrade(db);
    if(mode==='backup') await writeFile(db+'.pre-governance-core-v4-app-v5.bak','do not overwrite');
    if(mode==='symlink') await symlink(db,db+'.pre-governance-core-v4-app-v5.bak');
    if(mode==='malformed') sql(db,'c.execute("ALTER TABLE attention ADD COLUMN wrong TEXT")');
    if(mode==='partial') sql(db,'c.execute("CREATE TABLE matter_disclosure (id TEXT)")');
    const bytes=await readFile(db);const c=new CoreClient({dataDir:dir});
    try { await assert.rejects(c.start(),{code:'SCHEMA_INVALID'});assert.deepEqual(await readFile(db),bytes); }
    finally{await c.close();}
  });
});

for(const stage of ['governance_migration_before_commit','governance_migration_after_commit']) {
  test(`governance migration SIGKILL ${stage} keeps schema markers and tables together`,()=>fixture(async(dir,db)=>{
    await seed(dir);downgrade(db);const original=dump(db);
    const child=spawnSync('python3',[fixturePath,'migration',db,stage],{encoding:'utf8',timeout:10000});
    assert.equal(child.signal,'SIGKILL',child.stderr);
    const committed=stage==='governance_migration_after_commit';
    assert.deepEqual(markers(db),committed?[4,'5']:[3,'4']);
    assert.equal(sql(db,"print(c.execute(\"SELECT COUNT(*) FROM sqlite_master WHERE name LIKE 'matter_disclosure%' AND type='table'\").fetchone()[0])").trim(),committed?'3':'0');
    assert.equal(dump(db+'.pre-governance-core-v4-app-v5.bak'),original);
    const c=new CoreClient({dataDir:dir});
    try { if(committed) await c.start();else await assert.rejects(c.start(),{code:'SCHEMA_INVALID'}); }
    finally{await c.close();}
  }));
}

test('disclosure expiry is checked at query time with a deterministic future clock',()=>fixture(async(dir,db)=>{
  const request=await seed(dir);const c=new CoreClient({dataDir:dir});try{await act(c,request);}finally{await c.close();}
  const observed=successful(py(`import sys,json\nsys.path.insert(0,sys.argv[1])\nfrom bridge import open_or_initialize,close_store\nimport governance\nfrom datetime import datetime,timezone\nclass Future(datetime):\n @classmethod\n def now(cls,tz=None): return datetime(2100,1,1,tzinfo=timezone.utc)\ngovernance.datetime=Future\ns=open_or_initialize(sys.argv[2])\nctx={'actor':'runtime','project_id':'p','purpose':'attention-runtime','execution':{'adapter_id':'adapter','session_id':'s','run_id':'r'}}\nprint(json.dumps(governance.query(s,ctx,{'schema_version':1,'kind':'registry'})))\nclose_store(s)`,[corePath,db]));
  assert.equal(JSON.parse(observed).count,0);
}));
