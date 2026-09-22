import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { startServer } from '../../server/index.mjs';

export async function localPiHost(options = {}) {
  const dataDir = options.dataDir ?? await mkdtemp(path.join(tmpdir(), 'cw-local-pi-host-'));
  const requests = [];
  const runtime = await startServer({ dataDir, port: 0, localPiWorker: true, logger: () => {},
    fakeResponder: async request => { requests.push(request.body); return options.respond ? options.respond(request) : { kind: 'text', id: 'fixture', created: 1, text: 'Retained finding 中文 from source [0]; coverage unverified.' }; },
  });
  const api = async (method, route, body) => {
    const response = await fetch(runtime.url + '/api/v5' + route, { method, headers: { 'content-type': 'application/json', 'x-work-token': runtime.token }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, json: await response.json() };
  };
  const parent = options.parentId ? runtime.store.getSession(options.parentId) : (await api('POST', '/sessions', { title: 'Local Pi parent', permissionMode: 'read_only' })).json.session;
  return { runtime, api, dataDir, parent, requests,
    assignment(id) { return runtime.store.snapshot().subagents.assignments.find(a => a.id === id); },
    async source(text = 'Exact retained source version.') {
      const r = await api('POST', `/sessions/${parent.id}/materials`, { name: 'source.txt', text, commandId: randomUUID() });
      if (r.status !== 200) throw Error(JSON.stringify(r));
      return { kind: 'material', sourceId: r.json.retained.sourceId, revision: r.json.retained.revision, path: r.json.path, sha256: r.json.sha256, bytes: r.json.bytes };
    },
    async create(sources = []) {
      const input = { id: randomUUID(), parentSessionId: parent.id, brief: 'Consult the exact source packet and disclose gaps.', sources };
      const response = await api('POST', '/subagents', input);
      if (response.status !== 200) throw Error(JSON.stringify(response));
      return input;
    },
    async close({ remove = true } = {}) { await runtime.close(); if (remove) await rm(dataDir, { recursive: true, force: true }); },
  };
}

export async function localPiWait(probe, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) { const result = await probe(); if (result) return result; await new Promise(resolve => setTimeout(resolve, 20)); }
  throw Error('local Pi fixture timed out');
}
