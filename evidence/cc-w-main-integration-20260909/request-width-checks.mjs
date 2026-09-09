// Browser component regression: production CSS and setRequestLabel, synthetic
// buttons; this does not claim an end-to-end approval or question submission.
import { cdp, evaluate, waitFor, close, ORIGIN } from './browser.mjs';
import { writeFile } from 'node:fs/promises';
let results;
try {
  await cdp('Page.navigate', { url: ORIGIN });
  await waitFor('Boolean(window.__V5_UI__)');
  results = await evaluate(`(async () => {
    const {setRequestLabel} = await import('/web/ui-controls.mjs');
    const host = document.createElement('div');
    host.style.cssText='position:fixed;inset:100px auto auto 100px;z-index:9999;display:flex;gap:12px';
    document.body.append(host);
    const results=[];
    for (const scale of [1,1.25,2]) for (const label of ['Answer','Send','Cancel run','Approve this write','Deny this write']) {
      document.documentElement.style.setProperty('--text-scale',scale);
      const button=document.createElement('button'), neighbor=document.createElement('button');
      neighbor.textContent='Neighbor';host.replaceChildren(button,neighbor);
      setRequestLabel(button,label,false);button.focus();
      const measure=()=>({width:button.getBoundingClientRect().width,left:neighbor.getBoundingClientRect().left,focus:document.activeElement===button,text:button.textContent,name:button.getAttribute('aria-label')});
      const idle=measure();setRequestLabel(button,label,true);const busy=measure();setRequestLabel(button,label,false);const restored=measure();
      results.push({label,scale,idle,busy,restored,pass:Math.abs(idle.width-busy.width)<.1 && Math.abs(idle.left-busy.left)<.1 && Math.abs(idle.width-restored.width)<.1 && idle.focus && busy.focus && restored.focus && idle.name===label && busy.name==='Sending…' && busy.text==='Sending…'});
    }
    host.remove();document.documentElement.style.removeProperty('--text-scale');return results;
  })()`);
  for (const result of results) console.log(`${result.pass?'PASS':'FAIL'} ${JSON.stringify(result)}`);
} finally { await close(); }
await writeFile(new URL(`./request-width-${process.env.CHECK_STAGE || 'after'}.json`, import.meta.url),JSON.stringify(results,null,2)+'\n');
console.log(`${results.filter(r=>r.pass).length} / ${results.length}`);
process.exitCode=results.every(r=>r.pass)?0:1;
