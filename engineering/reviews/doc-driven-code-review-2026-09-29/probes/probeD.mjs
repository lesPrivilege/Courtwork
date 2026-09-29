import { boot } from '../../../../app/tests/helpers.mjs';
import { rm } from 'node:fs/promises';
const h = await boot();
try {
  const s = await h.createSession({ permissionMode: 'ask' });
  const snap = (await h.api('GET', `/runtime-control?sessionId=${s.id}`)).json;
  const spark = snap.resources.find(r => r.id === 'tool:spark_explore');
  console.log('inspect spark_explore exposed', spark?.exposed, 'effect', spark?.permission?.effect);
  const ev = await h.api('POST', `/runtime-permissions/evaluate?sessionId=${s.id}`, { resourceId: 'tool:spark_explore' });
  console.log('evaluate spark_explore', ev.status, ev.json?.effect ?? JSON.stringify(ev.json));
  const ws = await h.api('POST', `/runtime-permissions/evaluate?sessionId=${s.id}`, { resourceId: 'tool:ws_write' });
  console.log('evaluate ws_write (ask mode)', ws.json?.effect, 'inspect', snap.resources.find(r => r.id==='tool:ws_write').permission.effect);
} finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
