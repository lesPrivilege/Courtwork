import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareSourceText} from '../intake/compare.mjs';
import {diffWords} from '../web/diff-view.mjs';
import {boot} from './helpers.mjs';
const version=text=>({text,bytes:Buffer.byteLength(text)});
const reconstruct=(rows,side)=>rows.filter(row=>row.kind!==(side==='old'?'add':'del')).map(row=>row.text+(row.noNewline?'':'\n')).join('');

test('Pinned jsdiff adapter preserves original lines, whitespace, Unicode and missing final newline',()=>{
 for(const [a,b] of [['',''],['','\n'],['same\r\nend','same\nend\n'],['  中文 😀\nlast\n','  中文 💡\nlast'],['a\nb\na\n','a\na\nb\n']]) {
  const result=compareSourceText(version(a),version(b));assert.equal(result.status,'complete');assert.equal(result.identical,a===b);
  assert.equal(reconstruct(result.rows,'old'),a);assert.equal(reconstruct(result.rows,'new'),b);
 }
});

test('Comparison returns explicit limited state instead of partial diff or expensive word allocation',()=>{
 assert.equal(compareSourceText(version('x'.repeat(65537)),version('y')).status,'limited');
 assert.equal(compareSourceText(version('x\n'.repeat(2001)),version('y')).status,'limited');
 const old='a '.repeat(10000),next='b '.repeat(10000),words=diffWords(old,next);
 assert.deepEqual(words.old,[{text:old,changed:true}]);assert.deepEqual(words.new,[{text:next,changed:true}]);
});

test('HTTP comparison requires two exact versions in one session and makes no adoption or revision change',async t=>{
 const h=await boot();t.after(()=>h.runtime.close());const a=await h.createSession(),b=await h.createSession();
 const first=(await h.api('POST',`/sessions/${a.id}/materials`,{name:'brief.txt',text:'Original\n',commandId:'a',expectedRevision:0})).json;
 const second=(await h.api('POST',`/sessions/${a.id}/materials`,{name:'brief.txt',text:'Revised\n',commandId:'b',expectedRevision:1})).json;
 const q=new URLSearchParams({sourceId:first.retained.sourceId,fromRevision:1,fromSha256:first.sha256,toRevision:2,toSha256:second.sha256});
 const result=await h.api('GET',`/sessions/${a.id}/materials/compare?${q}`);assert.equal(result.status,200);assert.equal(result.json.status,'complete');assert.equal(result.json.latestRetainedRevision,2);
 assert.equal(reconstruct(result.json.rows,'old'),'Original\n');assert.equal(reconstruct(result.json.rows,'new'),'Revised\n');
 assert.equal((await h.api('GET',`/sessions/${b.id}/materials/compare?${q}`)).status,404);
 q.set('toSha256','0'.repeat(64));assert.equal((await h.api('GET',`/sessions/${a.id}/materials/compare?${q}`)).status,409);
 assert.equal(h.runtime.service.intake.versions(a.id,first.retained.sourceId).versions.length,2);
 assert.equal(h.runtime.store.listRuns(a.id).length,0);
 assert.equal('adoptedRevision' in result.json,false);
});
