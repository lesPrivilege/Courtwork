import test from 'node:test';
import assert from 'node:assert/strict';
import {prohibitedDefaultCopy,copyLiterals,checkCopy} from '../../tools/check-product-copy.mjs';
import {guardedLines,validateConsumers,checkConsumers} from '../../tools/check-semantic-consumers.mjs';
import {checkPagesSemantics,validatePagesMap} from '../../tools/check-pages-semantics.mjs';
test('copy guard rejects default record nouns and allows verbs, user values and disclosed diagnostics',async()=>{
  for(const text of ['Run','Run summary','Runs','Cancel run','Permission request','Continue in Work'])assert.equal(prohibitedDefaultCopy(text),true,text);
  for(const text of ['Run tests','Run commands','Run locally','Run from source','Work','Run the example'])assert.equal(prohibitedDefaultCopy(text),false,text);
  assert.equal(copyLiterals('el("p", {text: userInput}); const runId = run.id;').length,0);
  assert.equal(copyLiterals('el("h3", {text: "Run"}); el("button", {text: "Run tests"});').length,1);
  assert.equal((await checkCopy()).diagnosticExceptions,3);
});
test('raw consumer guard rejects new, duplicated and stale literal consumers',()=>{
  const a={file:'app/web/example.mjs',...guardedLines('icon("message-square");')[0]};
  const e={...a,disposition:'mapped-raw',reason:'Scoped Chat identity',semanticKeys:['chat.object']};
  assert.deepEqual(validateConsumers([a],[e]),[]);
  assert.match(validateConsumers([a],[]).join('\n'),/unregistered/);
  assert.match(validateConsumers([a,a],[e]).join('\n'),/count changed/);
  assert.match(validateConsumers([],[e]).join('\n'),/Stale/);
});
test('actual raw consumers and Pages cross-map remain registered',async()=>{
  assert.ok((await checkConsumers()).entries>0);
  assert.deepEqual(await checkPagesSemantics(),{captureSlots:13,figures:15});
  const entries=[{semanticKey:'chat.object',allowedSurfaces:['app']}];
  const map={schemaVersion:1,captureSlots:{home:['chat.object']},figures:{}};
  assert.match(validatePagesMap(map,entries,{home:{}},[]).join('\n'),/Invalid Pages/);
  assert.match(validatePagesMap({...map,captureSlots:{}},entries,{home:{}},[]).join('\n'),/Unmapped/);
});
