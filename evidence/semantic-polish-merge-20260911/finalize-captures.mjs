// Run only after all 13 state pairs have been captured and independently reviewed.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const source = 'f1373cde341b5a17299fad6ba5921ba3fcc43824';
const slots = ['home','spark','running','attention','approval','artifact','matter','review','continuity','models','integrations','settings','conversation'];
const observations = JSON.parse(await readFile('site/media/merged-20260911/observations.json', 'utf8'));
if (observations.length !== 26) throw new Error('Expected exactly 26 observations');
function dimensions(bytes) {
  if (bytes.readUInt16BE(0) !== 0xffd8) throw new Error('Expected native JPEG');
  for (let offset = 2; offset + 9 < bytes.length;) {
    if (bytes[offset++] !== 0xff) throw new Error('Invalid JPEG marker');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++], length = bytes.readUInt16BE(offset);
    if ([0xc0,0xc1,0xc2].includes(marker)) return `${bytes.readUInt16BE(offset+5)}x${bytes.readUInt16BE(offset+3)}`;
    offset += length;
  }
  throw new Error('No JPEG dimensions');
}
const media = [];
for (const slot of slots) {
  const pair = ['light','dark'].map(theme => {
    const items = observations.filter(o => o.slot === slot && o.theme === theme);
    if (items.length !== 1) throw new Error(`Missing or duplicate ${slot}/${theme}`);
    return items[0];
  });
  if (!pair[0].state_id || pair[0].state_id !== pair[1].state_id) throw new Error(`State pair mismatch: ${slot}`);
  for (const o of pair) {
    const bytes = await readFile(o.asset_path);
    const viewport = dimensions(bytes);
    if (o.source_sha !== source || viewport !== '1440x900' || o.observed.width !== 1440 || o.observed.height !== 900 || o.observed.dpr !== 1 || o.observed.bodyFont !== '14px') throw new Error(`Capture mismatch: ${o.asset_path}`);
    media.push({id:slot,kind:'product-screenshot',source_sha:source,state_id:o.state_id,capture_date:o.captured_at.slice(0,10),captured_at:o.captured_at,viewport,theme:o.theme,data_kind:'synthetic',provider_mode:'Local deterministic loopback; catalog fake seed and documented local compatible fixture corrections; no external model call',capture_command:'CUA connected in-app browser; actual UI navigation and native viewport screenshot; no DOM/image edits',operator:'Astra',independent_reviewer:'Luna (image and API verification; not photographer)',asset_path:o.asset_path,evidence_path:'evidence/semantic-polish-merge-20260911/capture-review.md',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,displayed_path:o.observed.url,setup_steps:o.detail,claim_ids:[slot],limitations:'Synthetic task material and deterministic local provider. UI state evidence does not establish model quality or formal product acceptance.',mime_type:'image/jpeg'});
  }
}
const manifest = {source_sha:source,batch:'merged-20260911',origin:'multiple isolated localhost fixtures; per-image URLs recorded below',media};
await writeFile('site/media/main/manifest.json', JSON.stringify(manifest,null,2)+'\n');
await writeFile('evidence/semantic-polish-merge-20260911/capture-records.json', JSON.stringify({source_sha:source,operator:'Astra',independent_reviewer:'Luna',records:media},null,2)+'\n');
let plan = await readFile('site/src/capture-plan.mjs','utf8');
plan = plan.replace("{ status: 'pending', source_sha: null }",`{ status: 'ready', source_sha: '${source}' }`);
for (const slot of slots) plan = plan.replace(`${slot}: { mediaId: null`,`${slot}: { mediaId: '${slot}'`);
await writeFile('site/src/capture-plan.mjs',plan);
console.log(`Verified ${media.length} native 1440x900 JPEG images in 13 same-state pairs at ${source}`);
