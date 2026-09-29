// Leader of one check recipe's process group (see check-runner.mjs). It runs
// the recipe command as its own child in the same group and supervises the
// group for as long as any of it can run:
// - While the recipe runs, it watches stdin, a pipe the Host holds open for the
//   whole check. A Host that dies without stopping the check (a crash, SIGKILL)
//   closes that pipe, and the guard kills the whole group.
// - When the recipe's own process exits, the guard reports how it ended and
//   kills the whole group, itself included: nothing the recipe started in its
//   group outlives it, whether or not the Host is still there.
// Mirrors core/bridge.py's parent watch.
//
// fd 3 carries lines to the Host: "started" once the command runs, "failed
// <message>" when it cannot start (spawn_failed), and "exit <code> <signal>"
// with the recipe's own exit status (one of the two fields is empty).
import { spawn } from "node:child_process";
import { writeSync } from "node:fs";

const [command, ...args] = process.argv.slice(2);
const report = (line) => { try { writeSync(3, line + "\n"); } catch { /* Host gone */ } };
const killGroup = () => { try { process.kill(-process.pid, "SIGKILL"); } catch { /* already gone */ } };

// Group-wide TERM (the Host's stop) and HUP/INT/QUIT (a recipe signalling its
// own group) are for the recipe; the guard stays to report its exit.
for (const name of ["SIGTERM", "SIGHUP", "SIGINT", "SIGQUIT"]) process.on(name, () => {});

const child = spawn(command, args, { stdio: ["ignore", "inherit", "inherit"] });
child.once("spawn", () => report("started"));
child.once("error", (error) => { report("failed " + error.message); process.exit(1); });
child.once("exit", (code, signal) => {
  report(`exit ${code ?? ""} ${signal ?? ""}`);
  killGroup();
});

process.stdin.once("end", killGroup);
process.stdin.once("close", killGroup);
process.stdin.resume();
