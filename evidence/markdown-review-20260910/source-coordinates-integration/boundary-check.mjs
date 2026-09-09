// Astra non-author probes of the delivered module; rerun after integration repair.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { buildSourceCoordinates } from '../../../app/runtime/source-coordinates.mjs';
const results=[];
function check(name,fn){try{fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
check('cross-realm Uint8Array is accepted',()=>{
 assert.equal(buildSourceCoordinates(vm.runInNewContext('new Uint8Array([65])')).text,'A');
});
check('spoofed typed-array tag does not admit non-byte input',()=>{
 const value=new Uint16Array([0x41]);Object.defineProperty(value,Symbol.toStringTag,{value:'Uint8Array'});
 assert.throws(()=>buildSourceCoordinates(value),TypeError);
});
check('invalid unit does not call user coercion or lose the error code',()=>{
 const s=buildSourceCoordinates(Buffer.from('A😀B'));
 const values=[Object.create(null),{toString(){throw Error('caller coercion invoked');}},null,42,Symbol('unit')];
 for(const bad of values)for(const args of [[0,bad,'utf8'],[0,'utf8',bad]])assert.throws(()=>s.toOffset(...args),e=>e.code==='invalid_coordinate_unit');
});
check('BOM, CRLF and astral boundaries match independently encoded prefixes',()=>{
 const text='\ufeffA😀e\u0301\r\n';const points=Array.from(text);const s=buildSourceCoordinates(Buffer.from(text));
 for(let i=0;i<=points.length;i++){
  const prefix=points.slice(0,i).join('');const b=Buffer.byteLength(prefix);const u=prefix.length;
  for(const [n,from] of [[i,'codePoint'],[b,'utf8'],[u,'utf16']]){
   assert.equal(s.toOffset(n,from,'codePoint'),i);assert.equal(s.toOffset(n,from,'utf8'),b);assert.equal(s.toOffset(n,from,'utf16'),u);
  }
 }
 assert.equal(s.text,text);assert.throws(()=>s.toOffset(5,'utf8','utf16'),e=>e.code==='invalid_offset');
});
check('copied offset view stays isolated after backing store transfer',()=>{
 const buffer=new ArrayBuffer(8);new Uint8Array(buffer).set([0xff,65,0xf0,0x9f,0x98,0x80,66,0xff]);
 const source=buildSourceCoordinates(new Uint8Array(buffer,1,6));structuredClone(buffer,{transfer:[buffer]});
 assert.equal(source.text,'A😀B');assert.equal(source.toOffset(2,'codePoint','utf8'),5);
});
console.log(JSON.stringify({passed:results.filter(x=>x.pass).length,total:results.length,results},null,2));
if(results.some(x=>!x.pass))process.exitCode=1;
