import test from 'node:test';
import assert from 'node:assert/strict';
import {grade} from './grade.mjs';

test('oracle rejects missing, extra, corrupted and interrupted observations',()=>{
  const expected = [{artifact:null,version:0},{artifact:'Current',version:1,openObligations:['follow-up']}];
  assert.equal(grade(expected,structuredClone(expected)).pass,true);
  for (const field of ['artifact','version','openObligations']) {
    const altered = structuredClone(expected); altered[1][field] = 'corrupt';
    assert.equal(grade(expected,altered).pass,false);
  }
  assert.equal(grade(expected,[expected[0]]).pass,false);
  assert.equal(grade(expected,[...expected,{}]).pass,false);
  assert.equal(grade([{artifact:null}],[{}]).pass,false);
  assert.equal(grade(expected,expected,{code:'TIMEOUT'}).pass,false);
  assert.equal(grade([],[]).pass,false);
});
