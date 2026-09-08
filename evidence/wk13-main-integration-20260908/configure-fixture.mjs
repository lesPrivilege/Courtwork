import { FAKE_CREDENTIAL_KEY } from '../../app/runtime/pi-session-runtime.mjs';
const base = `${process.env.APP_URL}/api/v5`;
const bootstrap = await (await fetch(`${base}/bootstrap`)).json();
const r = await fetch(`${base}/provider-credential`, { method: 'PUT', headers: {'content-type':'application/json','x-work-token':bootstrap.sessionToken}, body:JSON.stringify({provider:'fake-openai-loopback',apiKey:FAKE_CREDENTIAL_KEY}) });
if (!r.ok) throw new Error(`fixture configuration ${r.status}`);
console.log('local-fake fixture configured; real provider not_run');
