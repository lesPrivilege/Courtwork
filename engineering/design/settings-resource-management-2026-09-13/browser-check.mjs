import { writeFile } from 'node:fs/promises';
import { cdp, evaluate, waitFor, close, observations, key } from '../../mvp/execution/work-surface-kit/evidence/fe02/browser.mjs';
const origin = process.env.APP_URL;
const out = new URL('./evidence/', import.meta.url);
const checks = [];
const check = (name, value) => { checks.push({ name, value }); if (!value) throw new Error(name); };
try {
  for (const width of [1440, 1280, 390]) for (const scheme of ['light', 'dark']) {
    await cdp('Emulation.setDeviceMetricsOverride', {width, height: 900, deviceScaleFactor: 1, mobile: false});
    await cdp('Emulation.setEmulatedMedia', {features:[{name:'prefers-color-scheme',value:scheme}]});
    await cdp('Page.navigate', {url:origin+'/#settings/plugins'});
    await waitFor(`document.querySelector('#settings-runtime-plugins')?.textContent.includes('Evidence Memo')`);
    check(`${width}/${scheme} geometry`, await evaluate(`document.documentElement.scrollWidth === innerWidth && document.querySelector('.app-shell').scrollHeight <= innerHeight`));
    check(`${width}/${scheme} plugin owner states`, await evaluate(`document.querySelector('#settings-runtime-plugins .runtime-row').textContent.includes('Not exposed') && !document.querySelector('#settings-runtime-plugins input[role="switch"]')`));
    const {data} = await cdp('Page.captureScreenshot', {format:'png'});
    await writeFile(new URL(`plugins-${width}-${scheme}.png`,out),Buffer.from(data,'base64'));
  }
  await cdp('Emulation.setDeviceMetricsOverride', {width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate(`document.querySelector('#settings-runtime-plugins details').open=true`);
  await evaluate(`document.querySelector('#settings-runtime-plugins a[href="#settings/tools"]').click()`);
  await waitFor(`!document.querySelector('#settings-tools').hidden`);
  check('provided resource navigation',await evaluate(`document.querySelector('#settings-tools').textContent.includes('Add MCP server')`));
  await evaluate(`document.querySelector('#settings-tab-plugins').click()`);
  await evaluate(`document.querySelector('#settings-runtime-plugins a[href="#settings/permissions"]').click()`);
  await waitFor(`!document.querySelector('#settings-permissions').hidden`);
  check('policy owner navigation',true);
  await evaluate(`document.querySelector('#settings-tab-developer').click()`);
  check('developer retains lifecycle and registration',await evaluate(`document.querySelector('#settings-developer').contains(document.querySelector('#extension-list')) && document.querySelector('#settings-developer').contains(document.querySelector('#local-extension-intake'))`));
  await evaluate(`document.querySelector('#settings-developer a[href="#settings/plugins"]').click()`);
  await waitFor(`!document.querySelector('#settings-plugins').hidden`);
  await evaluate(`document.querySelector('#settings-search').value='Lifecycle Probe';document.querySelector('#settings-search').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#settings-search').focus()`);
  await key({code:'Enter',keyCode:13});
  await waitFor(`document.querySelector('#settings-runtime-plugins .runtime-detail')`);
  check('search Enter opens plugin detail',true);
  await key({code:'Escape',keyCode:27});
  await evaluate(`document.querySelector('#settings-back-button').click()`);
  await waitFor(`document.querySelector('#settings-page').hidden`);
  check('return to full app',true);
  await writeFile(new URL('full-app.png',out),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
  check('no browser exceptions',observations.exceptions.length===0);
} finally {
  await writeFile(new URL('browser.json',out),JSON.stringify({checks,exceptions:observations.exceptions},null,2)+'\n');
  await close();
}
