/* The live ask-user card, the one row where «Answer requested» was ablated.
 * A question is raised through the composer, photographed while it waits, then
 * the Run is cancelled through the product's own Stop control so the fixture
 * data is left as it was found. */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep, viewport } from "./harness.mjs";
import { writeFile } from "node:fs/promises";

const TAG = process.env.WK10B_TAG ? `-${process.env.WK10B_TAG}` : "";
const OUT = new URL("./", import.meta.url).pathname;
const state = "window.__V5_UI__.state";
try {
  await viewport(1440, 900);
  await cdp("Page.navigate", { url: ORIGIN });
  await waitFor(`window.__V5_UI__?.state.projects.length > 0`);
  await ev(`(async () => {
    document.querySelectorAll('#project-list .project-toggle').forEach(t => { if (t.getAttribute('aria-expanded') === 'false') t.click(); });
    await new Promise(r => setTimeout(r, 500));
    [...document.querySelectorAll('#project-list .session-button')].find(b => b.textContent.includes('Runtime control'))?.click();
    await new Promise(r => setTimeout(r, 2200));
  })()`);
  const draft = await ev(`document.getElementById('composer-input').value`);
  await ev(`(()=>{const i=document.querySelector('#composer-input');i.value='/fixture question';i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#composer-form').requestSubmit();})()`);
  await waitFor(`document.querySelector('#message-stream input[aria-label=Answer]') !== null`);
  await sleep(600);
  await ev(`document.getElementById('message-stream').scrollTop = document.getElementById('message-stream').scrollHeight`);
  await sleep(400);
  const { data } = await cdp("Page.captureScreenshot", { format: "png" });
  await writeFile(`${OUT}question-live-1440-light${TAG}.png`, Buffer.from(data, "base64"));
  console.log("shot", `question-live-1440-light${TAG}.png`);
  console.log("card", await ev(`document.querySelector('#message-stream .question-card').innerText`));
  await ev(`document.getElementById('cancel-run-button').click()`);
  await waitFor(`${state}.runs.every(r => !['running','waiting_user','created','stopping'].includes(r.status))`, 30000);
  await ev(`(()=>{const i=document.querySelector('#composer-input');i.value=${JSON.stringify("")};i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await ev(`(()=>{const i=document.querySelector('#composer-input');i.value=${JSON.stringify(0)} && '';i.value=${JSON.stringify("")};i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await ev(`(()=>{const i=document.querySelector('#composer-input');i.value=${JSON.stringify("")};i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  void draft;
} finally {
  await sleep(300);
  await close();
}
