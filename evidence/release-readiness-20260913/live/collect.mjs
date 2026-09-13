// Read-only collector for this synthetic release project. Never reads a credential store.
import { writeFile } from 'node:fs/promises';
const origin = process.argv[2];
const label = process.argv[3];
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin ?? '') || !/^[a-z0-9-]+$/.test(label ?? '')) throw new Error('Provide a loopback origin and snapshot label');
const bootstrap = await (await fetch(origin + '/api/v5/bootstrap')).json();
const get = async path => {
  const response = await fetch(origin + '/api/v5' + path, { headers: { 'x-work-token': bootstrap.sessionToken } });
  if (!response.ok) throw new Error(`GET ${path}: ${response.status}`);
  return response.json();
};
const { projects } = await get('/projects');
const project = projects.find(item => item.name === 'Release readiness · synthetic 2026-09-13' || item.title === 'Release readiness · synthetic 2026-09-13');
if (!project) throw new Error('Synthetic project not found');
const { sessions } = await get('/sessions?projectId=' + project.id);
const records = [];
for (const session of sessions) {
  records.push({ session: await get('/sessions/' + session.id), events: await get('/sessions/' + session.id + '/events'), workspace: await get('/sessions/' + session.id + '/workspace'), surface: await get('/sessions/' + session.id + '/surface') });
}
const result = { collectedAt: new Date().toISOString(), project, configuration: await get('/provider-config'), records };
const redactions = [
  ['/private/tmp/cw-readiness-live-data-20260913', '$DATA_DIR'],
  ['/private/tmp/cw-readiness-qualification-20260913', '$SOURCE'],
];
const json = JSON.stringify(result, (key, value) => {
  if (/^(apiKey|token|sessionToken|authorization|password)$/i.test(key)) return '[not retained]';
  if (typeof value === 'string') for (const [source, target] of redactions) value = value.replaceAll(source, target);
  return value;
}, 2) + '\n';
await writeFile(new URL(label + '.json', import.meta.url), json);
console.log(JSON.stringify(records.map(r => ({ sessionId: r.session.session?.id, runs: r.session.runs?.map(run => ({ id:run.id, status:run.status, input:run.input, provider:run.provider, usage:run.usage })) }))));
