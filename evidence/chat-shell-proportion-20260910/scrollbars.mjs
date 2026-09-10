// WO-CS-01 · edge check with classic (space-taking) scrollbars visible.
// Run with CS_SCROLLBARS=1; CS_CONFIG / CS_OUT as for checks.mjs.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { openBrowser, sleep } from './cdp.mjs';
const config = JSON.parse(await readFile(process.env.CS_CONFIG, 'utf8'));
const out = path.resolve(process.env.CS_OUT || 'after');
await mkdir(out, { recursive: true });
const b = await openBrowser();
const rows = [];
for (const [width, height] of [[1440, 900], [1280, 800], [1195, 772]]) {
  await b.cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await b.cdp('Page.navigate', { url: config.url + '/' });
  await b.waitFor(`!!document.querySelector('.session-button, .project-toggle')`);
  if (!(await b.evaluate(`!!document.querySelector('.session-button')`))) await b.evaluate(`document.querySelector('.project-toggle').click()`);
  await b.waitFor(`!!document.querySelector('.session-button')`);
  await b.evaluate(`[...document.querySelectorAll('.session-button')].find(n => n.textContent.includes(${JSON.stringify(config.main.title)})).click()`);
  await b.waitFor(`!!document.querySelector('.message-list .message.assistant')`);
  await sleep(600);
  rows.push({ width, ...(await b.evaluate(`(() => { const s = document.querySelector('.message-stream'); const l = document.querySelector('.message-list').getBoundingClientRect(); const c = document.getElementById('composer-form').getBoundingClientRect(); return { scrollbar: s.offsetWidth - s.clientWidth, scrolls: s.scrollHeight > s.clientHeight, leftDelta: +(c.left - l.left).toFixed(2), rightDelta: +(c.right - l.right).toFixed(2) }; })()`)) });
}
console.log(JSON.stringify(rows));
await writeFile(path.join(out, 'scrollbars.json'), JSON.stringify({ schemaVersion: 1, browser: b.version.Browser, mode: 'classic scrollbars (no --hide-scrollbars)', rows }, null, 2));
await b.close();
