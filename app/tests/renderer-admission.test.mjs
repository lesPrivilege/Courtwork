import assert from 'node:assert/strict';
import test from 'node:test';
import {cp,mkdtemp,mkdir,rm,symlink,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Use a disposable source copy so adding/removing renderer bytes never writes
// the frontend owner's checkout, and the missing-file case remains repeatable.
test('NDA renderer is an exact declared path: missing is 404, present bytes are served, siblings stay private',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'cw-renderer-admission-'));
  const appRoot=fileURLToPath(new URL('../',import.meta.url));
  const copyRoot=path.join(root,'app');let runtime;
  try {
    await mkdir(copyRoot);
    for(const name of ['server','runtime','extensions','core','domains']) await cp(path.join(appRoot,name),path.join(copyRoot,name),{recursive:true});
    await cp(path.join(appRoot,'package.json'),path.join(copyRoot,'package.json'));
    await symlink(path.join(appRoot,'node_modules'),path.join(copyRoot,'node_modules'),'dir');
    const renderer=path.join(copyRoot,'extensions/inbound-nda/renderer.mjs');
    await rm(renderer,{force:true});
    const {startServer}=await import(pathToFileURL(path.join(copyRoot,'server/index.mjs')));
    runtime=await startServer({dataDir:path.join(root,'data'),port:0,logger:()=>{}});
    const declared=runtime.registry.getRecord('inbound-nda').surface.module;
    assert.equal(declared,'/extensions/inbound-nda/renderer.mjs');
    assert.equal((await fetch(runtime.url+declared)).status,404);
    const synthetic='// Synthetic static transport fixture, not the product renderer.\nexport const fixture = true;\n';
    await writeFile(renderer,synthetic);
    const served=await fetch(runtime.url+declared);
    assert.equal(served.status,200);assert.match(served.headers.get('content-type'),/^text\/javascript/);
    assert.equal(await served.text(),synthetic);
    for(const other of ['/extensions/inbound-nda/index.mjs','/extensions/inbound-nda/renderer.mjs/extra','/extensions/inbound-nda/%2e%2e%2findex.mjs','/domains/inbound-nda/index.mjs','/core/bridge.py']) {
      assert.equal((await fetch(runtime.url+other)).status,404,other);
    }
    await rm(renderer);
    assert.equal((await fetch(runtime.url+declared)).status,404);
  } finally {await runtime?.close();await rm(root,{recursive:true,force:true});}
});
