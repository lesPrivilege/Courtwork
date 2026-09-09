import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {startServer} from '../../app/server/index.mjs';
const hash = s => createHash('sha256').update(Buffer.from(s,'utf8')).digest('hex');
async function setup() {
 const dir=await mkdtemp(path.join(tmpdir(),'cw-be5-independent-')), logs=[];
 const host=await startServer({dataDir:dir,port:0,logger:line=>logs.push(line)});
 const request=async(body,headers={})=>{
  const r=await fetch(host.url+'/api/v5/runtime-sources/resolve',{method:'POST',headers:{'content-type':'application/json','x-work-token':host.token,...headers},body:JSON.stringify(body)});
  return {status:r.status,body:await r.json()};
 };
 return {host,dir,logs,request,async close(){await host.close();await rm(dir,{recursive:true,force:true});}};
}
const inline = content=>({type:'inline',kind:'reference',title:'Independent source',content});
test('independent: Unicode identity is byte-sensitive and interpretation title binds separately',async()=>{
 const h=await setup();try{
  const texts=['Café\r\n','Cafe\u0301\r\n','\uFEFF🙂\n','🙂\r\n'];
  const seen=[];
  for(const content of texts){
   const r=await h.request(inline(content));assert.equal(r.status,200);
   assert.equal(r.body.portable.content,content);assert.equal(r.body.identity.contentSha256,hash(content));
   assert.equal(r.body.identity.bytes,Buffer.byteLength(content));seen.push(r.body.identity.contentSha256);
  }
  assert.equal(new Set(seen).size,texts.length);
  const a=(await h.request(inline(texts[0]))).body;
  const b=(await h.request({...inline(texts[0]),title:'Different interpretation'})).body;
  assert.equal(a.identity.contentSha256,b.identity.contentSha256);assert.notEqual(a.identity.artifactSha256,b.identity.artifactSha256);
 }finally{await h.close();}
});
test('independent: live locator/origin/MCP target remains untouched with a positive contact control',async()=>{
 let hits=0;const target=http.createServer((req,res)=>{hits++;res.end('canary');});
 await new Promise(r=>target.listen(0,'127.0.0.1',r));
 const uri='http://127.0.0.1:'+target.address().port;const h=await setup();
 try{
  await (await fetch(uri)).text();assert.equal(hits,1);
  for(const locator of ['url','repository','package','manifest']){
   const r=await h.request({type:'locator',locator,value:uri});assert.equal(r.status,200);assert.equal(r.body.status,'unsupported');assert.equal(r.body.identity,undefined);
  }
  const mcp={type:'inline',kind:'mcp_server',title:'Not connected',content:JSON.stringify({transport:'streamable-http',protocol:'2026-07-28',url:uri})};
  assert.equal((await h.request(mcp)).body.status,'resolved');
  const r=await h.request({...inline('not fetched'),origin:{uri,version:'declared'}});
  assert.equal(r.body.provenance.verified,false);assert.deepEqual(r.body.capabilities.granted,[]);
  assert.equal(hits,1);await (await fetch(uri)).text();assert.equal(hits,2);
 }finally{await h.close();await new Promise(r=>target.close(r));}
});
test('independent: concurrent inspections/rejections neither import nor persist nor log source text',async()=>{
 const h=await setup();try{
  const before=await readFile(path.join(h.dir,'runtime-state.json'));
  const control=h.host.service.getRuntimeControl();const state=h.host.store.snapshot();
  const canary='PRIVATE_SYNTHETIC_BE5_NO_LOG';
  const results=await Promise.all(Array.from({length:12},(_,i)=>h.request({...inline(canary+i),...(i%2?{target:'local:forged'}:{})})));
  results.forEach((r,i)=>assert.equal(r.status,i%2?400:200));
  const denied=await h.request({...inline(canary),target:'bad'},{'x-work-token':'wrong'});assert.equal(denied.status,401);
  assert.deepEqual(h.host.store.snapshot(),state);assert.deepEqual(h.host.service.getRuntimeControl(),control);
  assert.deepEqual(await readFile(path.join(h.dir,'runtime-state.json')),before);
  assert(!h.logs.join('\n').includes(canary));
 }finally{await h.close();}
});
