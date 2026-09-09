/* FE-01 · one screenshot per Settings group, taken against the RC fixture so the
 * runtime blocks have something to state. Light, 1440×900, reduced motion. */
import { cdp, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile } from "node:fs/promises";
const GROUPS = ["general", "appearance", "models", "tools", "skills", "memory", "permissions", "keyboard", "developer"];
await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cdp("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }],
});
try {
  for (const group of GROUPS) {
    await cdp("Page.navigate", { url: `${ORIGIN}/#settings/${group}` });
    await waitFor("document.getElementById('settings-page') && !document.getElementById('settings-page').hidden");
    await sleep(1800);
    await writeFile(
      new URL(`./shots/settings-${group}.png`, import.meta.url),
      Buffer.from((await cdp("Page.captureScreenshot", { format: "png" })).data, "base64"),
    );
  }
} finally {
  await close();
}
console.log(`settings shots: ${GROUPS.length}`);
