import { build } from 'esbuild';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, '../../app/web/vendor');
await build({entryPoints:[path.join(here,'entry.mjs')],bundle:true,format:'esm',minify:true,platform:'browser',alias:{'decode-named-character-reference':path.join(here,'node_modules/decode-named-character-reference/index.js')},legalComments:'inline',outfile:path.join(output,'markdown-parser.mjs')});
const lock = JSON.parse(await readFile(path.join(here,'package-lock.json'),'utf8'));
const packages = {};
let licenses = 'Markdown parser — pinned build in tools/markdown-vendor.\n\n';
for (const [name, pkg] of Object.entries(lock.packages)) {
  if (!name || name.includes('@esbuild/') || name.endsWith('/esbuild')) continue;
  packages[name] = {version:pkg.version,integrity:pkg.integrity,license:pkg.license};
  const dir=path.join(here,name);
  const file=(await readdir(dir)).find(n=>/^license(?:\.md|\.txt)?$/i.test(n));
  if (!file) throw new Error(`Missing license: ${name}`);
  licenses += `${name} ${pkg.version}\n${await readFile(path.join(dir,file),'utf8')}\n\n`;
}
await writeFile(path.join(output,'markdown-parser-LICENSES.txt'),licenses);
const hash=b=>createHash('sha256').update(b).digest('hex');
const files={};
for (const name of ['markdown-parser.mjs','markdown-parser-LICENSES.txt']) {
  const bytes=await readFile(path.join(output,name));files[name]={bytes:bytes.length,sha256:hash(bytes)};
}
await writeFile(path.join(output,'markdown-parser-manifest.json'),JSON.stringify({schemaVersion:1,profile:'cw-markdown-block-v1',packages,files,lockSha256:hash(await readFile(path.join(here,'package-lock.json'))),adaptations:['Bundled native ESM parser only; no upstream UI, HTML execution or network resources.','AST is a derived source projection, not persistent review state.','Named entities use the upstream dictionary implementation, not the DOM implementation; the same bundle runs in browser and Node.']},null,2)+'\n');
