import {RuntimeStore} from '../../app/server/store.mjs';
import {mkdtemp,readFile,rm,readdir,copyFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const baseline=process.argv[2];if(!baseline)throw Error('Pass the fixed baseline checkout directory.');
const {RuntimeStore:Old}=await import(pathToFileURL(path.join(baseline,'app/server/store.mjs')).href);
const dataDir=await mkdtemp(path.join(tmpdir(),'cw-schema13-compat-'));let old,newStore;
try{
 old=await new Old({dataDir}).open();const project=await old.createProject('Synthetic migration');
 const session=await old.createSession({projectId:project.id,title:'Original chat',workspaceDir:path.join(dataDir,'workspaces','original')});
 await old.setDraft(session.id,'Original draft');
 await old.setProviderConnections([{id:'synthetic-compatible',kind:'compatible',providerIdentity:'synthetic-compatible',api:'openai-completions',baseUrl:'http://127.0.0.1:59999/v1',models:[{id:'synthetic-model',contextWindow:32000,reasoning:true,reasoningEfforts:['off','low','high']}]}]);
 const original=old.snapshot();assert.equal(original.schemaVersion,13);await old.close();
 const file=path.join(dataDir,'runtime-state.json'),before=await readFile(file);
 newStore=await new RuntimeStore({dataDir}).open();const upgraded=newStore.snapshot();assert.equal(upgraded.schemaVersion,14);
 assert.deepEqual({...upgraded,schemaVersion:13},original);
 const unassigned=await newStore.createSession({scope:'unassigned',projectId:null,title:'New ordinary chat',workspaceDir:path.join(dataDir,'workspaces','unassigned')});
 await newStore.close();const newer=await readFile(file);
 await assert.rejects(new Old({dataDir}).open(),/schemaVersion 14 is not supported/);
 assert.deepEqual(await readFile(file),newer);
 const backup=(await readdir(dataDir)).find(n=>n.startsWith('runtime-state.schema13.'));assert(backup);
 assert.deepEqual(await readFile(path.join(dataDir,backup)),before);
 const restore=path.join(dataDir,'separate-restore');await mkdir(restore);await copyFile(path.join(dataDir,backup),path.join(restore,'runtime-state.json'));
 old=await new Old({dataDir:restore}).open();assert.deepEqual(old.snapshot(),original);await old.close();
 console.log(JSON.stringify({baselineSchema:13,currentSchema:14,oldHostRejects:true,untouchedOnRefusal:true,exactBackup:true,separateOldHostRestore:true,scope:unassigned.scope,originalSha256:createHash('sha256').update(before).digest('hex'),upgradedSha256:createHash('sha256').update(newer).digest('hex')},null,2));
}finally{await old?.close();await newStore?.close();await rm(dataDir,{recursive:true,force:true});}
