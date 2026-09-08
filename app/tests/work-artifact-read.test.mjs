import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CoreClient} from '../core/client.mjs';

test('artifact read is paged by code point and bound to an open trusted Matter/Run',async()=>{
  const dataDir=await mkdtemp(path.join(tmpdir(),'cw-artifact-read-'));
  const core=new CoreClient({dataDir});
  try {
    const text='Synthetic source';const digest=createHash('sha256').update(text).digest('hex');
    for(const id of ['a','b']) {
      await core.createMatter({matterId:id,title:id,source:{id:'s-'+id,version:1,text,digest},contractVersion:'contract'});
    }
    await core.createRun({runId:'r-a',matterId:'a',baseVersion:0,sourceVersion:1,contractVersion:'contract',instruction:'read'});
    const body='First 😀 /local ../relative https://example.invalid/quotation';
    await core.saveCandidate({matterId:'a',runId:'r-a',payload:{id:'c',matter_id:'a',run_id:'r-a',base_version:0,source_version:1,contract_version:'contract',artifact_text:body,evidence:[{source_id:'s-a',source_version:1,start:0,end:text.length,quote:text,digest}],obligations:[]}});
    await core.updateRun({runId:'r-a',status:'completed',admissionOpen:false});
    const decision=await core.decide({request_id:'d',matter_id:'a',candidate_id:'c',base_version:0,action:'accept',reason:'review'});
    await core.createRun({runId:'next',matterId:'a',baseVersion:1,sourceVersion:1,contractVersion:'contract',instruction:'continue'});
    const read={matterId:'a',runId:'next',artifactId:decision.active_artifact};
    const chunk=await core.readArtifact({...read,offset:6,limit:1});
    assert.equal(chunk.text,'😀');assert.equal(chunk.nextOffset,7);
    assert.equal(chunk.lengthCodePoints,Array.from(body).length);
    assert.equal((await core.readArtifact({...read,offset:Array.from(body).length,limit:1})).nextOffset,null);
    for(const invalid of [{offset:-1},{offset:body.length+1},{limit:0},{limit:4001},{offset:1.5}]) await assert.rejects(core.readArtifact({...read,...invalid}),{code:'INVALID'});
    await assert.rejects(core.readArtifact({...read,artifactId:'../../outside'}),{code:'BINDING_MISMATCH'});
    await assert.rejects(core.readArtifact({...read,artifactId:'https://example.invalid/'}),{code:'BINDING_MISMATCH'});
    await core.updateRun({runId:'next',status:'completed',admissionOpen:false});
    await assert.rejects(core.readArtifact(read),{code:'CANDIDATE_CLOSED'});
    await core.createRun({runId:'r-b',matterId:'b',baseVersion:0,sourceVersion:1,contractVersion:'contract',instruction:'read'});
    await assert.rejects(core.readArtifact({...read,matterId:'b',runId:'r-b'}),{code:'BINDING_MISMATCH'});
    await assert.rejects(core.call('read_artifact',{artifact_id:decision.active_artifact,offset:0,limit:4,context:{matter_id:'a',run_id:'next',actor:'model'}}),{code:'INVALID'});
  } finally {await core.close();await rm(dataDir,{recursive:true,force:true});}
});
