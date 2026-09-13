// Run only against this slice's disposable boot() host, never a personal host.
// The existing bootstrap API keeps the local token in memory, out of evidence.
const base = new URL(process.argv[2]);
if (base.hostname !== '127.0.0.1') throw new Error('Synthetic loopback host required');
let token;
async function api(method, path, body) {
  const response = await fetch(new URL('/api/v5' + path, base), {
    method,
    headers: { Origin: base.origin, ...(token ? { 'x-work-token': token } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify({ status: response.status, result }));
  return result;
}
token = (await api('GET', '/bootstrap')).sessionToken;
const { projects } = await api('GET', '/projects');
if (projects.length !== 1 || projects[0].name !== 'test-project')
  throw new Error('Expected the disposable test-project fixture');
const { sessions } = await api('GET', '/sessions?projectId=' + projects[0].id);
const session = sessions.find(s => s.title === 'Inspect the local tool configuration for a synthetic review task.');
if (!session) throw new Error('Create the synthetic review Chat before seeding');
const suffix = '?sessionId=' + session.id;
async function change(body) {
  const { revision } = await api('GET', '/runtime-control' + suffix);
  return api('PUT', '/runtime-control' + suffix, { revision, ...body });
}
const scope = { type: 'user', id: 'local' };
const source = Array.from({ length: 160 }, (_, i) =>
  `Section ${i + 1} · 合成校验材料 — Keep the recorded source and configuration scope distinct. This paragraph is fixture data.`).join('\n\n');
await change({ operation: 'put', resource: {
  id: 'local:hierarchy-reference', kind: 'reference',
  title: 'Quarterly review reference — long recorded source for an independent configuration reading check',
  scope, content: source,
} });
await change({ operation: 'exposure', id: 'local:hierarchy-reference', scope, exposed: false });
await change({ operation: 'put', resource: {
  id: 'local:hierarchy-instruction', kind: 'instruction', title: 'Synthetic reading conventions',
  scope, content: 'Use clear source labels.\n\n' + source,
} });
const result = await api('GET', '/runtime-control' + suffix);
console.log(JSON.stringify({ sessionId: session.id, revision: result.revision,
  resources: result.resources.filter(r => r.id.startsWith('local:hierarchy-')).map(r => ({ id: r.id, exposed: r.exposed })) }));
