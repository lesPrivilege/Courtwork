const R = new URL('../../../../app', import.meta.url).pathname;
const { runCheckRecipe } = await import(R + '/runtime/check-runner.mjs');
process.env.NODE_OPTIONS = '--max-old-space-size=123';
process.env.OPENAI_API_KEY = 'sk-probe-secret';
process.env.PYTHONPATH = '/evil';
process.env.SE_TEST_MODE = '1';
// 1. env visible to child
const envScript = "process.stdout.write(JSON.stringify(process.env))";
let r = await runCheckRecipe({ recipe: { command: process.execPath, argv: ['-e', envScript], timeoutMs: 5000, outputLimitBytes: 65536 }, cwd: '/tmp' });
console.log('child env keys:', Object.keys(JSON.parse(r.stdout)).sort().join(','));
// 2. grandchild ignoring SIGTERM, stdio ignored: does it survive cancel?
const script = `
const {spawn}=require('node:child_process');
const c=spawn('/bin/sh',['-c','trap "" TERM; sleep 20'],{stdio:'ignore'});
process.stdout.write('gc '+c.pid+'\\n');
setTimeout(()=>{},30000);`;
const ac = new AbortController();
const p = runCheckRecipe({ recipe: { command: process.execPath, argv: ['-e', script], timeoutMs: 30000, outputLimitBytes: 4096 }, cwd: '/tmp', signal: ac.signal });
await new Promise(r=>setTimeout(r,500)); ac.abort();
const res = await p;
const pid = Number(res.stdout.match(/gc (\d+)/)[1]);
await new Promise(r=>setTimeout(r,1500));
let alive = true; try { process.kill(pid,0);} catch { alive=false; }
console.log('cancelled:',res.cancelled,'grandchild pid',pid,'alive after cancel settled (+1.5s):',alive);
if (alive) { try{process.kill(pid,'SIGKILL')}catch{} try{process.kill(-pid,'SIGKILL')}catch{} }
// 3. same for timeout
const p2 = await runCheckRecipe({ recipe: { command: process.execPath, argv: ['-e', script], timeoutMs: 600, outputLimitBytes: 4096 }, cwd: '/tmp' });
const pid2 = Number(p2.stdout.match(/gc (\d+)/)[1]);
await new Promise(r=>setTimeout(r,1500));
alive = true; try { process.kill(pid2,0);} catch { alive=false; }
console.log('timedOut:',p2.timedOut,'grandchild alive after timeout settled:',alive);
if (alive) { try{process.kill(pid2,'SIGKILL')}catch{} }
