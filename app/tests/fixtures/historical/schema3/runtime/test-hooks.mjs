// Crash-point hooks for durability tests.
//
// A crash point is a named place where the process can be killed hard
// (SIGKILL to self) so a test can observe what survives on disk. Two rules
// govern this module and are the reason it exists as its own file:
//
//   1. INERT BY DEFAULT. `SE_TEST_CRASH_POINT` alone does nothing. The hook
//      only arms when `SE_TEST_MODE=1` is also set, so a stray env var in a
//      production shell cannot kill the server.
//   2. NEVER SILENT. Whenever `SE_TEST_CRASH_POINT` or `SE_TEST_MODE` is
//      present, startup logs a line saying whether the point is armed or
//      ignored. A build that can die on purpose must say so out loud.
//
// Env format: SE_TEST_CRASH_POINT=<point>[:<qualifier>]
// The optional qualifier lets one call site distinguish situations it can
// name (e.g. the store's persist crashes only once a run exists), which keeps
// tests deterministic without counting invocations.

const TEST_MODE = process.env.SE_TEST_MODE === "1";
const RAW_POINT = process.env.SE_TEST_CRASH_POINT ?? null;

const [ARMED_POINT, ARMED_QUALIFIER] = RAW_POINT ? (() => {
  const index = RAW_POINT.indexOf(":");
  return index === -1 ? [RAW_POINT, null] : [RAW_POINT.slice(0, index), RAW_POINT.slice(index + 1)];
})() : [null, null];

const ARMED = TEST_MODE && ARMED_POINT !== null;

/** Lines describing the hook state, for the startup log. Empty when neither
 * env var is present: there is nothing to disclose. */
export function describeTestHooks() {
  const lines = [];
  if (RAW_POINT !== null && ARMED) {
    lines.push(`startup: TEST BUILD — crash point "${RAW_POINT}" is ARMED (SE_TEST_MODE=1); this process will SIGKILL itself when it reaches that point`);
  } else if (RAW_POINT !== null) {
    lines.push(`startup: SE_TEST_CRASH_POINT="${RAW_POINT}" is set but SE_TEST_MODE is not 1; crash points are INERT and will not fire`);
  } else if (TEST_MODE) {
    lines.push("startup: SE_TEST_MODE=1 is set but no SE_TEST_CRASH_POINT is named; no crash point is armed");
  }
  return lines;
}

/**
 * Kill this process immediately if the named crash point (and qualifier, when
 * the arming names one) is armed. SIGKILL rather than process.exit: the point
 * of these tests is that nothing gets a chance to flush, close, or tidy up.
 */
export function maybeCrash(point, qualifier = null) {
  if (!ARMED) return;
  if (point !== ARMED_POINT) return;
  if (ARMED_QUALIFIER !== null && ARMED_QUALIFIER !== qualifier) return;
  process.kill(process.pid, "SIGKILL");
}
