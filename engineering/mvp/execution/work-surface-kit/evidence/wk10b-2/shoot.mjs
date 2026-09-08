/* WO-WK10b 第二段 · same-condition screenshots and the geometry / motion
 * measurements, on the same server and the same seeded work as checks.mjs.
 *
 *   WK10B2_BASE=http://127.0.0.1:8874 WK10B2_CDP_PORT=19664 WK10B2_TAG=after \
 *     node shoot.mjs
 *
 * WK10B2_ONLY=fallback shoots only the states that also exist at the baseline
 * (a bound Session whose renderer is not loaded), so a before/after pair can be
 * taken under one condition.
 */
import { readFile, writeFile } from "node:fs/promises";
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep, viewport } from "./harness.mjs";

const seed = JSON.parse(await readFile(new URL("./seed.json", import.meta.url), "utf8"));
const TAG = process.env.WK10B2_TAG ? `-${process.env.WK10B2_TAG}` : "";
const ONLY = process.env.WK10B2_ONLY ?? "";
const OUT = new URL("./", import.meta.url).pathname;
const state = "window.__V5_UI__.state";
const json = (value) => JSON.stringify(value);
const geometry = [];

async function shoot(name) {
  const { data } = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(`${OUT}${name}${TAG}.png`, Buffer.from(data, "base64"));
  console.log("shot", `${name}${TAG}.png`);
}
async function openSession(sessionId) {
  await ev(
    `(async () => {
      for (const button of document.querySelectorAll('#project-list .project-toggle'))
        if (button.getAttribute('aria-expanded') !== 'true') button.click();
      await new Promise(r => setTimeout(r, 500));
      document.querySelector('[data-nav-key="session:' + ${json(sessionId)} + '"]')?.click();
      await new Promise(r => setTimeout(r, 1400));
    })()`,
  );
  await waitFor(`${state}.activeSessionId === ${json(sessionId)}`);
}
async function openSurface() {
  await ev(
    `(() => {
      const open = document.querySelector('#show-surface-button');
      if (open && !window.__V5_UI__.state.surface.open) open.click();
      if (!window.__V5_UI__.state.surface.expanded)
        document.querySelector('#surface-expand-button')?.click();
    })()`,
  );
  await waitFor(`${state}.surface.open === true && ${state}.surface.expanded === true`);
  await waitFor(`${state}.surface.projection !== null`);
  await sleep(900);
}

/* FN-27 · the local floor is 32 desktop / 44 narrow and touch, and the page
 * must not scroll sideways at either width or at 200 %. Both are read from the
 * live boxes, not asserted from the stylesheet. */
async function measure(label, minimum) {
  const result = await ev(`(() => {
    const controls = [...document.querySelectorAll(
      '#surface-content button, #surface-content summary, #binding-panel button, .decision-receipt')]
      .filter(node => node.getClientRects().length);
    const short = controls
      .map(node => ({ name: (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 40),
                      height: Math.round(node.getBoundingClientRect().height) }))
      .filter(item => item.height < ${minimum});
    return {
      controls: controls.length,
      short,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      unnamed: controls.filter(node => !(node.getAttribute('aria-label') || node.textContent || '').trim()).length,
    };
  })()`);
  geometry.push({ label, minimum, ...result });
  console.log("measured", label, JSON.stringify(result));
}

try {
  for (const [scheme, features] of [
    ["light", []],
    ["dark", [{ name: "prefers-color-scheme", value: "dark" }]],
  ]) {
    for (const [label, width, height] of [
      ["1440", 1440, 900],
      ["390", 390, 844],
    ]) {
      await cdp("Emulation.setEmulatedMedia", { features });
      await viewport(width, height, width < 768);
      await cdp("Page.navigate", { url: `${ORIGIN}/` });
      await waitFor("window.__V5_UI__?.state.projects.length > 0");

      if (ONLY !== "fallback") {
        /* The per-rule reading with its advertised decisions, and the same
         * candidate with one rule expanded to its anchor and frozen quote. */
        await openSession(seed.sessions.conflicting);
        await openSurface();
        await shoot(`review-${label}-${scheme}`);
        await measure(`review-${label}-${scheme}`, width < 768 ? 44 : 32);
        await ev(`(async () => {
          document.querySelector('.rule-row summary').click();
          await new Promise(r => setTimeout(r, 300));
        })()`);
        await shoot(`review-rule-${label}-${scheme}`);

        /* The accepted candidate: its receipt in the conversation, and the
         * revision form its packet advertises. */
        await openSession(seed.sessions.complete);
        await sleep(1200);
        await shoot(`receipt-${label}-${scheme}`);
        await openSurface();
        await ev(`(async () => {
          document.querySelector('.candidate-revision summary')?.click();
          await new Promise(r => setTimeout(r, 300));
        })()`);
        await shoot(`revision-${label}-${scheme}`);

        /* The binding panel's two segments. */
        await openSession(seed.sessions.outside);
        await ev(`(async () => {
          document.querySelector('#runtime-setup-button')?.click();
          await new Promise(r => setTimeout(r, 600));
          document.querySelector('.developer-settings').open = true;
          await new Promise(r => setTimeout(r, 300));
          const row = [...document.querySelectorAll('.extension-row')].find(n => n.textContent.includes('inbound-nda'));
          [...row.querySelectorAll('button')].find(b => b.textContent === 'Bind to session')?.click();
          await new Promise(r => setTimeout(r, 1400));
        })()`);
        await shoot(`binding-empty-${label}-${scheme}`);
        await openSession(seed.sessions.continuation);
        await ev(`(async () => {
          document.querySelector('#runtime-setup-button')?.click();
          await new Promise(r => setTimeout(r, 600));
          document.querySelector('.developer-settings').open = true;
          await new Promise(r => setTimeout(r, 300));
          const row = [...document.querySelectorAll('.extension-row')].find(n => n.textContent.includes('inbound-nda'));
          [...row.querySelectorAll('button')].find(b => b.textContent === 'Bind to session')?.click();
          await new Promise(r => setTimeout(r, 1400));
        })()`);
        await shoot(`binding-${label}-${scheme}`);
        await measure(`binding-${label}-${scheme}`, width < 768 ? 44 : 32);
        /* The second segment, in the same panel, scrolled to. */
        await ev(`(async () => {
          document.querySelector('#binding-panel .binding-segment:last-of-type')
            ?.scrollIntoView({ block: 'start' });
          await new Promise(r => setTimeout(r, 400));
        })()`);
        await shoot(`binding-continue-${label}-${scheme}`);
      }

      /* The read-only reading: the producer is unloaded, so the work is
       * history. This is the one state that also exists at the baseline. */
      await ev(
        `(async () => window.__V5_UI__.request('/extensions/inbound-nda/lifecycle', { method: 'POST', body: { action: 'unload' } }))()`,
      );
      await cdp("Page.navigate", { url: `${ORIGIN}/` });
      await waitFor("window.__V5_UI__?.state.projects.length > 0");
      await openSession(seed.sessions.conflicting);
      await openSurface();
      await shoot(`readonly-${label}-${scheme}`);
      await measure(`readonly-${label}-${scheme}`, width < 768 ? 44 : 32);
      await ev(
        `(async () => window.__V5_UI__.request('/extensions/inbound-nda/lifecycle', { method: 'POST', body: { action: 'load' } }))()`,
      );
    }
  }

  /* 200 % zoom and reduced motion, at the width the reading is designed for. */
  await cdp("Emulation.setEmulatedMedia", { features: [] });
  await viewport(720, 450, false);
  await cdp("Page.navigate", { url: `${ORIGIN}/` });
  await waitFor("window.__V5_UI__?.state.projects.length > 0");
  await openSession(seed.sessions.conflicting);
  await openSurface();
  await shoot("review-200pct-light");
  await measure("review-200pct-light", 32);

  await cdp("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await viewport(1440, 900, false);
  await cdp("Page.navigate", { url: `${ORIGIN}/` });
  await waitFor("window.__V5_UI__?.state.projects.length > 0");
  await openSession(seed.sessions.conflicting);
  await openSurface();
  const motion = await ev(
    `document.getAnimations().filter(a => a.playState === 'running').length`,
  );
  geometry.push({ label: "reduced-motion", runningAnimations: motion });
  console.log("reduced motion running animations", motion);
  await shoot("review-1440-reduced-motion");

  /* Keyboard: real Tab presses, not programmatic focus. Every control of the
   * reading has to be reached this way and has to carry a name (FN-27). */
  await cdp("Emulation.setEmulatedMedia", { features: [] });
  await ev(`document.querySelector('#surface-content').querySelector('summary, button')?.focus()`);
  const visited = [];
  /* Only what is actually on screen: a control inside a closed disclosure is
   * not reachable and must not be, so it is not counted as a miss. A closed
   * <details> keeps client rects in this engine, so visibility is asked for
   * directly rather than inferred from a box. */
  const expected = await ev(
    `[...document.querySelectorAll('#surface-content button, #surface-content summary, #surface-content textarea, #surface-content input')]
       .filter(node => node.checkVisibility ? node.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true }) : node.getClientRects().length > 0).length`,
  );
  for (let i = 0; i < expected + 6; i++) {
    const active = await ev(`(() => {
      const node = document.activeElement;
      if (!node || !node.closest('#surface-content')) return null;
      /* A wrapping <label> names a field; that is its accessible name. */
      const name = node.getAttribute('aria-label')
        || (node.tagName === 'TEXTAREA' || node.tagName === 'INPUT'
              ? node.closest('label')?.childNodes[0]?.textContent
              : node.textContent);
      return { tag: node.tagName,
               name: (name || '').trim().slice(0, 40),
               visibleFocus: getComputedStyle(node).outlineStyle !== 'none' || getComputedStyle(node).boxShadow !== 'none' };
    })()`);
    if (active) visited.push(active);
    for (const type of ["rawKeyDown", "keyUp"])
      await cdp("Input.dispatchKeyEvent", { type, key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await sleep(40);
  }
  const keyboard = {
    focusables: expected,
    reachedByTab: visited.length,
    unnamed: visited.filter((item) => !item.name).length,
  };
  geometry.push({ label: "keyboard", ...keyboard, visited });
  console.log("keyboard", JSON.stringify(keyboard));

  await writeFile(
    new URL(`./viewport${TAG}.json`, import.meta.url),
    JSON.stringify(geometry, null, 2),
  );
} finally {
  await sleep(400);
  await close();
}
