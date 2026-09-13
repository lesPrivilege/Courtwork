import test from 'node:test';
import assert from 'node:assert/strict';
import {projection,concept,current,rates} from './fixtures.mjs';
test('current request estimates never become throughput or capacity observations',()=>{
 for(const scenario of ['thinking','streaming','completed','failed','compacting','unavailable']){
  const p=projection('current',scenario);
  assert.equal(p.tps,null);assert.equal(p.used,null);assert.equal(p.limit,null);assert.deepEqual(p.values,[]);
 }
 assert.equal(current.parts.reduce((n,p)=>n+p[1],0),36600);
 assert.equal(projection('current','thinking').estimate,12800);
});
test('synthetic category total and failed samples retain distinct meanings',()=>{
 assert.equal(concept.parts.reduce((n,p)=>n+p[1],0),concept.used);
 assert.equal(projection('concept','failed').tps,null);
 assert.equal(projection('concept','failed').values.at(-1),null);
 assert.equal(projection('concept','failed',8,0).tps,rates[0]);
 const absent=projection('concept','unavailable');
 assert.equal(absent.tps,null);assert.equal(absent.used,null);assert.deepEqual(absent.values,[]);assert.deepEqual(absent.parts,[]);
});
