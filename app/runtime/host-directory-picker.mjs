// Native "choose a folder" dialog for the Connect UI's Host, separate from
// the security-hardened repository-fs helper: this module never binds or
// reads a directory, it only asks the desktop for one path. Darwin only in
// this slice; osascript is spawned with shell:false, a fixed argv and a
// minimal environment allowlist -- no provider credentials or ambient env
// reach the child process.
import { spawn } from "node:child_process";
import path from "node:path";

const TIMEOUT_MS = 5 * 60 * 1000;
const MAX_OUTPUT_BYTES = 64 * 1024;
const DEFAULT_PROMPT = "Connect a repository";
const MAX_PROMPT_LENGTH = 120;

export class DirectoryPickerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DirectoryPickerError";
    this.code = code;
  }
}

/** Strips quotes, backslashes and control characters so the prompt can be
 * interpolated into a fixed AppleScript literal without escaping tricks. */
function sanitizePrompt(prompt) {
  const raw = typeof prompt === "string" && prompt.trim() !== "" ? prompt : DEFAULT_PROMPT;
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/["\\]|[\u0000-\u001f\u007f]/g, "").slice(0, MAX_PROMPT_LENGTH).trim();
  return cleaned === "" ? DEFAULT_PROMPT : cleaned;
}

function safeEnv() {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? "",
    LANG: process.env.LANG ?? "C",
  };
}

/** Test-only substitution for the real dialog, honoured only under
 * SE_TEST_MODE=1 (see runtime/test-hooks.mjs for the same inert-by-default
 * contract). The script named by SE_TEST_DIRECTORY_PICKER is spawned in
 * place of osascript with the sanitized prompt as argv[0]; it prints a path
 * on success, or exits non-zero with "User canceled" on stderr to simulate
 * the Cancel button. */
function testPickerCommand() {
  if (process.env.SE_TEST_MODE !== "1") return null;
  const command = process.env.SE_TEST_DIRECTORY_PICKER;
  return typeof command === "string" && command.trim() !== "" ? command : null;
}

function normalizeChosenPath(raw) {
  let value = raw.replace(/\r?\n+$/g, "");
  if (value.length > 1 && value.endsWith("/")) value = value.slice(0, -1);
  return value;
}

/**
 * Ask the Host desktop for one directory. Resolves `{ rootPath }` on a
 * choice, `{ cancelled: true }` when the user dismisses the dialog. Throws
 * DirectoryPickerError with code "directory_picker_unavailable" off Darwin
 * (and with no test override), "directory_picker_timeout" past the 5 minute
 * budget, or "directory_picker_failed" for anything else abnormal.
 */
export async function chooseHostDirectory({ prompt } = {}) {
  const cleanPrompt = sanitizePrompt(prompt);
  const override = testPickerCommand();
  if (!override && process.platform !== "darwin") {
    throw new DirectoryPickerError("directory_picker_unavailable", "a native folder dialog is not available on this host");
  }
  const [command, args] = override
    ? [override, [cleanPrompt]]
    : ["/usr/bin/osascript", ["-e", `POSIX path of (choose folder with prompt "${cleanPrompt}")`]];

  return await new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(command, args, { env: safeEnv(), shell: false, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      reject(new DirectoryPickerError("directory_picker_failed", error?.message ?? "the folder picker could not start"));
      return;
    }
    let stdout = Buffer.alloc(0);
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let killTimer = null;
    const timeout = setTimeout(() => {
      timedOut = true;
      if (child.exitCode !== null || child.signalCode !== null) return;
      try { child.kill("SIGTERM"); } catch { /* already exited */ }
      killTimer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          try { child.kill("SIGKILL"); } catch { /* already exited */ }
        }
      }, 300);
      killTimer.unref?.();
    }, TIMEOUT_MS);
    timeout.unref?.();

    const finish = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      fn();
    };

    child.stdout.on("data", (chunk) => {
      if (stdout.length < MAX_OUTPUT_BYTES) stdout = Buffer.concat([stdout, chunk]);
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < MAX_OUTPUT_BYTES) stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => finish(() => reject(new DirectoryPickerError("directory_picker_failed", error?.message ?? "the folder picker failed"))));
    child.on("close", (code) => finish(() => {
      if (timedOut) { reject(new DirectoryPickerError("directory_picker_timeout", "the folder picker exceeded its time limit")); return; }
      if (code === 0) {
        const value = normalizeChosenPath(stdout.toString("utf8"));
        if (!path.isAbsolute(value)) { reject(new DirectoryPickerError("directory_picker_failed", "the folder picker returned an invalid path")); return; }
        resolve({ rootPath: value });
        return;
      }
      if (/user canceled/i.test(stderr) || stderr.includes("-128")) { resolve({ cancelled: true }); return; }
      reject(new DirectoryPickerError("directory_picker_failed", "the folder picker failed"));
    }));
  });
}
