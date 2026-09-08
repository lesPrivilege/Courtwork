/* WO-WK10b 第一段 · every row this round changed is created through the
 * product's own controls: the composer sends, the host admits the Run, the fake
 * loopback provider answers. Nothing is written into the store behind the UI.
 * The host reports capabilities.mode = "local-fake": no real provider, no
 * credential file is configured or read (WK-75 (5)).
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep, observations } from "./harness.mjs";
import { writeFile } from "node:fs/promises";

const state = "window.__V5_UI__.state";
const out = [];
const log = (name, value) => {
  out.push({ name, value });
  console.log(name, JSON.stringify(value));
};
async function send(input) {
  const old = await ev(`${state}.runs.map(r=>r.id)`);
  await ev(
    `(()=>{const i=document.querySelector('#composer-input');i.value=${JSON.stringify(input)};i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#composer-form').requestSubmit();})()`,
  );
  return waitFor(`${state}.runs.find(r=>!${JSON.stringify(old)}.includes(r.id))`);
}
const done = (id, status = "completed") =>
  waitFor(`${state}.runs.find(r=>r.id===${JSON.stringify(id)} && r.status===${JSON.stringify(status)})`, 40000);
async function click(selector) {
  await waitFor(`document.querySelector(${JSON.stringify(selector)}) !== null`);
  await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
}

try {
  await cdp("Network.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: ORIGIN });
  await waitFor("window.__V5_UI__?.state.projects.length > 0");
  await ev(`(async () => {
    if (!document.querySelector('#project-list .session-button')) {
      document.querySelector('#project-list .project-toggle')?.click();
      await new Promise(r => setTimeout(r, 600));
    }
    document.querySelector('#project-list .session-button')?.click();
    await new Promise(r => setTimeout(r, 1600));
  })()`);
  log("session opened", await ev(`${state}.activeSessionId`));

  // 1 · a question row, answered through the card's own form.
  const question = await send("/fixture question");
  await done(question.id, "waiting_user");
  log("question waiting", { run: question.id });
  await waitFor(`document.querySelector("input[aria-label=Answer]") !== null`);
  await ev(
    `(()=>{const i=document.querySelector('input[aria-label=Answer]');i.value='seeded answer';i.dispatchEvent(new Event('input',{bubbles:true}));i.form.requestSubmit();})()`,
  );
  await done(question.id);

  // 2 · a read tool row and a write permission that is allowed.
  const allowed = await send(
    "/fixture script " +
      JSON.stringify([
        { name: "ws_list", arguments: {} },
        { name: "ws_write", arguments: { path: "out/wk10b.md", text: "seeded work surface artifact\n" } },
      ]),
  );
  await done(allowed.id, "waiting_user");
  await click('[data-focus-key$=":allow"]');
  const written = await done(allowed.id);
  log("write allowed", { run: allowed.id, artifacts: written.artifacts?.length ?? 0 });

  // 3 · a write permission that is denied.
  const denied = await send(
    "/fixture script " + JSON.stringify([{ name: "ws_write", arguments: { path: "out/denied.md", text: "must not exist" } }]),
  );
  await done(denied.id, "waiting_user");
  await click('[data-focus-key$=":deny"]');
  const deniedRun = await done(denied.id);
  log("write denied", { run: denied.id, artifacts: deniedRun.artifacts?.length ?? 0 });

  // 4 · a failed tool row.
  const failed = await send(
    "/fixture script " + JSON.stringify([{ name: "ws_read", arguments: { path: "out/missing-on-purpose.md" } }]),
  );
  await done(failed.id);
  log("failed tool row", { run: failed.id });

  log("page exceptions", observations.exceptions);
  await writeFile(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2));
} finally {
  await sleep(400);
  await close();
}
