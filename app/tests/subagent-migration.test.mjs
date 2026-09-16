import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {RuntimeStore} from '../server/store.mjs';
const BASE='2d1ab6816e3dedcd613fee80a35bc61b2067d106';

test('actual schema14 Host backup restores independently and rejects schema18 without writing',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'cw-spark-schema14-'));
 let old,current,restored;
 try{
  const archive=execFileSync('git',['archive',BASE,'app'],{cwd:fileURLToPath(new URL('../..',import.meta.url)),maxBuffer:64*1024*1024});
  execFileSync('tar',['-x','-C',root],{input:archive});
  const {RuntimeStore:OldStore}=await import(pathToFileURL(path.join(root,'app/server/store.mjs')));
  const dataDir=path.join(root,'data');old=await new OldStore({dataDir}).open();const p=await old.createProject('Preserved project');const s=await old.createSession({projectId:p.id,title:'Old host conversation',workspaceDir:path.join(root,'workspace')});await old.setDraft(s.id,'Preserved draft');await old.close();
  const file=path.join(dataDir,'runtime-state.json'),before=await readFile(file);assert.equal(JSON.parse(before).schemaVersion,14);
  current=await new RuntimeStore({dataDir}).open();assert.equal(current.snapshot().schemaVersion,18);assert.equal(current.getSession(s.id).draft,'Preserved draft');assert.equal(current.snapshot().subagents.agents[0].id,'spark');assert.deepEqual(current.snapshot().subagents.assignments,[]);await current.close();
  const backup=(await readdir(dataDir)).find(n=>n.startsWith('runtime-state.schema14.'));assert.ok(backup);assert.deepEqual(await readFile(path.join(dataDir,backup)),before);
  const upgraded=await readFile(file);await assert.rejects(new OldStore({dataDir}).open(),/schema|version/i);assert.deepEqual(await readFile(file),upgraded);
  const recoveryDir=path.join(root,'recovery');await mkdir(recoveryDir);await writeFile(path.join(recoveryDir,'runtime-state.json'),before);restored=await new OldStore({dataDir:recoveryDir}).open();assert.equal(restored.getSession(s.id).draft,'Preserved draft');assert.equal(restored.snapshot().schemaVersion,14);await restored.close();
 }finally{await old?.close();await current?.close();await restored?.close();await rm(root,{recursive:true,force:true});}
});
