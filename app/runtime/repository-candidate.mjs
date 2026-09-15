import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { runRepositoryCandidateFs } from "./repository-candidate-fs.mjs";

const GIT_TIMEOUT_MS = 120_000;
const MAX_STDOUT_BYTES = 2 * 1024 * 1024;
const MAX_DIFF_BYTES = 2 * 1024 * 1024;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_STDERR_BYTES = 256 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;

export class RepositoryCandidateError extends Error {
  constructor(code, message, candidatePath = null) {
    super(message);
    this.name = "RepositoryCandidateError";
    this.code = code;
    this.candidatePath = candidatePath;
  }
}

function fail(code, message, candidatePath = null) {
  throw new RepositoryCandidateError(code, message, candidatePath);
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function identitiesMatch(info, expected) {
  return String(info.dev) === String(expected.device) && String(info.ino) === String(expected.inode);
}

async function inspectBoundRoot(rootPath, identity) {
  if (process.platform !== "darwin" && process.platform !== "linux") {
    fail("unsupported_platform", "private Git candidates are unavailable on this host");
  }
  if (typeof rootPath !== "string" || !path.isAbsolute(rootPath) || rootPath.includes("\0")) {
    fail("invalid_source_root", "source root identity is invalid");
  }
  if (!identity || !/^\d+$/.test(String(identity.device)) || !/^\d+$/.test(String(identity.inode))) {
    fail("invalid_source_root", "source root identity is invalid");
  }
  let canonical;
  let info;
  try {
    canonical = await realpath(rootPath);
    info = await lstat(canonical);
  } catch {
    fail("source_root_changed", "source repository root is unavailable or changed");
  }
  if (canonical !== path.resolve(rootPath) || info.isSymbolicLink() || !info.isDirectory() || !identitiesMatch(info, identity)) {
    fail("source_root_changed", "source repository root identity changed");
  }
  return { path: canonical, device: String(info.dev), inode: String(info.ino) };
}

function safeEnv(homePath) {
  return {
    PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    HOME: homePath,
    XDG_CONFIG_HOME: path.join(homePath, "xdg-config"),
    TMPDIR: path.join(homePath, "tmp"),
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    LC_ALL: "C",
  };
}

function runGit(args, {
  gitBinary = "git",
  cwd,
  env,
  signal,
  timeoutMs = GIT_TIMEOUT_MS,
  discardOutput = false,
  maxStdoutBytes = MAX_STDOUT_BYTES,
  acceptedExitCodes = [0],
  trimOutput = true,
  strictOutput = false,
  returnBuffer = false,
  candidatePath = null,
  operation = "Git operation",
} = {}) {
  if (signal?.aborted) return Promise.reject(new RepositoryCandidateError("cancelled", "candidate creation was cancelled", candidatePath));
  return new Promise((resolve, reject) => {
    const child = spawn(gitBinary, args, { cwd, env, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = Buffer.alloc(0);
    let stderrBytes = 0;
    let stdoutExceeded = false;
    let timedOut = false;
    let cancelled = false;
    let settled = false;
    let timeout;
    let killTimer;

    const stop = () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      try { child.kill("SIGTERM"); } catch { /* process already exited */ }
      killTimer ??= setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          try { child.kill("SIGKILL"); } catch { /* process already exited */ }
        }
      }, 300);
      killTimer.unref?.();
    };
    const onAbort = () => { cancelled = true; stop(); };
    const finish = (error, output) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      signal?.removeEventListener("abort", onAbort);
      error ? reject(error) : resolve(output);
    };

    timeout = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
    child.stdout.on("data", chunk => {
      if (discardOutput) return;
      if (stdout.length + chunk.length > maxStdoutBytes) {
        stdoutExceeded = true;
        stop();
        return;
      }
      stdout = Buffer.concat([stdout, chunk]);
    });
    child.stderr.on("data", chunk => {
      stderrBytes += chunk.length;
      if (stderrBytes > MAX_STDERR_BYTES) stop();
    });
    child.once("error", error => {
      const code = error?.code === "ENOENT" ? "git_unavailable" : "git_failed";
      finish(new RepositoryCandidateError(code, code === "git_unavailable" ? "the configured Git runtime is unavailable" : `${operation} could not start`, candidatePath));
    });
    child.once("close", code => {
      if (cancelled || signal?.aborted) return finish(new RepositoryCandidateError("cancelled", "candidate creation was cancelled", candidatePath));
      if (timedOut) return finish(new RepositoryCandidateError("git_timeout", `${operation} exceeded its time limit`, candidatePath));
      if (stderrBytes > MAX_STDERR_BYTES || stdoutExceeded) {
        return finish(new RepositoryCandidateError("git_output_limit", `${operation} exceeded the Host output limit`, candidatePath));
      }
      if (!acceptedExitCodes.includes(code)) return finish(new RepositoryCandidateError("git_failed", `${operation} failed`, candidatePath));
      if (returnBuffer) return finish(null, stdout);
      let output;
      try { output = strictOutput ? new TextDecoder("utf-8", { fatal: true }).decode(stdout) : stdout.toString("utf8"); }
      catch { return finish(new RepositoryCandidateError("invalid_git_output", `${operation} returned non-UTF-8 output`, candidatePath)); }
      finish(null, trimOutput ? output.trimEnd() : output);
    });
  });
}

function gitDirArgs(gitDir, args) { return ["--git-dir", gitDir, ...args]; }
function worktreeArgs(_gitDir, worktree, args) { return ["-C", worktree, ...args]; }

function quoteGitConfig(value) {
  if (value.includes("\0") || value.includes("\n") || value.includes("\r")) fail("invalid_candidate_path", "candidate metadata path is invalid");
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

async function replaceCandidateConfig(gitDir, { objectFormat, hooksPath }, candidatePath) {
  const configPath = path.join(gitDir, "config");
  let configInfo;
  try { configInfo = await lstat(configPath); } catch { fail("git_clone_failed", "private Git configuration is missing", candidatePath); }
  if (!configInfo.isFile() || configInfo.isSymbolicLink()) fail("git_clone_failed", "private Git configuration is invalid", candidatePath);
  const formatVersion = objectFormat === "sha1" ? 0 : 1;
  const lines = [
    "[core]",
    `\trepositoryformatversion = ${formatVersion}`,
    "\tfilemode = true",
    "\tbare = true",
    "\tlogallrefupdates = true",
    `\thooksPath = ${quoteGitConfig(hooksPath)}`,
    "\tfsmonitor = false",
    "\tattributesFile = /dev/null",
    "\texcludesFile = /dev/null",
    "\tsymlinks = true",
    "\tautocrlf = false",
    "\teol = lf",
    "[submodule]",
    "\trecurse = false",
  ];
  if (objectFormat === "sha256") lines.push("[extensions]", "\tobjectFormat = sha256");
  const tempPath = `${configPath}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(tempPath, "wx", 0o600);
    await handle.writeFile(lines.join("\n") + "\n", "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(tempPath, configPath);
    await chmod(configPath, 0o600);
  } catch {
    await handle?.close().catch(() => {});
    await unlink(tempPath).catch(() => {});
    fail("git_config_failed", "private Git configuration could not be restricted", candidatePath);
  }
}

async function makeCandidateDirectory(parentPath, candidateId, sourcePath) {
  if (typeof parentPath !== "string" || !path.isAbsolute(parentPath) || parentPath.includes("\0")) {
    fail("invalid_candidate_parent", "candidate parent path is invalid");
  }
  if (candidateId !== undefined && (typeof candidateId !== "string" || !UUID.test(candidateId))) {
    fail("invalid_candidate_id", "candidate id is invalid");
  }
  let parentReal;
  try {
    await mkdir(parentPath, { recursive: true, mode: 0o700 });
    parentReal = await realpath(parentPath);
    await chmod(parentReal, 0o700);
  } catch {
    fail("candidate_parent_unavailable", "Host candidate parent is unavailable");
  }
  const actualId = candidateId ?? randomUUID();
  const candidatePath = path.join(parentReal, `candidate-${actualId}`);
  if (isWithin(sourcePath, candidatePath) || isWithin(candidatePath, sourcePath)) {
    fail("candidate_source_overlap", "private candidate storage cannot overlap the source repository");
  }
  try { await mkdir(candidatePath, { mode: 0o700 }); }
  catch { fail("candidate_exists", "private candidate directory already exists or could not be created", candidatePath); }
  return { id: actualId, path: candidatePath };
}

/**
 * Create one Host-owned private Git worktree from an explicit commit OID.
 * This helper is not a shell or generic Git interface. All Git subcommands,
 * flags and environment keys are fixed here; callers pass only Host-resolved
 * paths, root identity, an object ID and cancellation.
 */
export async function createPrivateRepositoryCandidate({
  sourcePath,
  sourceIdentity,
  candidateParent,
  candidateId,
  baseCommit,
  signal,
  gitBinary = "/usr/bin/git",
} = {}) {
  if (typeof baseCommit !== "string" || !OID.test(baseCommit)) fail("invalid_commit", "candidate base must be a full Git object id");
  const source = await inspectBoundRoot(sourcePath, sourceIdentity);
  const candidate = await makeCandidateDirectory(candidateParent, candidateId, source.path);
  const candidatePath = candidate.path;
  const gitDir = path.join(candidatePath, "git");
  const worktree = path.join(candidatePath, "worktree");
  const staging = path.join(candidatePath, "staging");
  const template = path.join(candidatePath, "template");
  const hooks = path.join(candidatePath, "hooks");
  const home = path.join(candidatePath, "home");
  const temp = path.join(home, "tmp");
  const xdg = path.join(home, "xdg-config");
  const env = safeEnv(home);

  try {
    const containerInfo = await lstat(candidatePath);
    if (!containerInfo.isDirectory() || containerInfo.isSymbolicLink()) fail("candidate_identity_invalid", "private candidate container is not a directory", candidatePath);
    const containerDevice = String(containerInfo.dev);
    const containerInode = String(containerInfo.ino);
    const verifyCandidateContainer = () => runRepositoryCandidateFs({ operation: "verify_container",
      candidateDirectory: candidatePath, containerDevice, containerInode }, { signal });
    const runCandidateGit = async (args, options) => {
      await verifyCandidateContainer();
      const result = await runGit(args, options);
      await verifyCandidateContainer();
      return result;
    };

    await verifyCandidateContainer();
    await chmod(candidatePath, 0o700);
    await verifyCandidateContainer();
    for (const directory of [template, hooks, home, temp, xdg, staging]) await mkdir(directory, { mode: 0o700 });
    for (const directory of [template, hooks, home, temp, xdg, staging]) await chmod(directory, 0o700);
    await verifyCandidateContainer();

    const sourcePrefix = ["-C", source.path];
    const topLevel = await runGit([...sourcePrefix, "rev-parse", "--show-toplevel"], {
      gitBinary, cwd: source.path, env, signal, candidatePath, operation: "source Git root validation",
    });
    if (path.resolve(topLevel) !== source.path) fail("not_repository_root", "selected source path is not the Git worktree root", candidatePath);
    const objectFormat = await runGit([...sourcePrefix, "rev-parse", "--show-object-format=storage"], {
      gitBinary, cwd: source.path, env, signal, candidatePath, operation: "source Git object-format inspection",
    });
    if (objectFormat !== "sha1" && objectFormat !== "sha256") fail("unsupported_object_format", "source Git object format is unsupported", candidatePath);
    const sourceShallow = await runGit([...sourcePrefix, "rev-parse", "--is-shallow-repository"], {
      gitBinary, cwd: source.path, env, signal, candidatePath, operation: "source Git completeness inspection",
    });
    if (sourceShallow !== "false") fail("incomplete_repository", "shallow source repositories cannot create private candidates", candidatePath);
    const resolvedCommit = await runGit([...sourcePrefix, "rev-parse", "--verify", "--end-of-options", `${baseCommit}^{commit}`], {
      gitBinary, cwd: source.path, env, signal, candidatePath, operation: "explicit source commit validation",
    });
    if (resolvedCommit.toLowerCase() !== baseCommit.toLowerCase()) fail("invalid_commit", "candidate base commit does not match the requested object id", candidatePath);

    await runCandidateGit([
      "clone", "--quiet", "--bare", "--local", "--no-hardlinks", "--dissociate", "--no-checkout",
      "--no-tags", "--no-recurse-submodules", "--reject-shallow", `--template=${template}`,
      "-c", `core.hooksPath=${hooks}`, source.path, gitDir,
    ], { gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private Git clone" });

    // Local clone can copy source configuration. No candidate Git command is
    // run after clone until its config is replaced by this Host-owned file.
    await verifyCandidateContainer();
    await replaceCandidateConfig(gitDir, { objectFormat, hooksPath: hooks }, candidatePath);
    await verifyCandidateContainer();
    const hooksPath = await runCandidateGit(gitDirArgs(gitDir, ["config", "--get", "core.hooksPath"]), {
      gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private Git hooks validation",
    });
    if (path.resolve(hooksPath) !== hooks) fail("git_config_failed", "private Git hooks path is not Host-controlled", candidatePath);

    const hasAlternates = await lstat(path.join(gitDir, "objects", "info", "alternates")).then(() => true, () => false);
    if (hasAlternates) fail("dependent_object_store", "private Git clone still depends on an external object store", candidatePath);
    await runCandidateGit(gitDirArgs(gitDir, ["cat-file", "-e", `${baseCommit}^{commit}`]), {
      gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private base commit verification",
    });
    await runCandidateGit(gitDirArgs(gitDir, ["fsck", "--full", "--strict", "--no-reflogs", "--no-progress"]), {
      gitBinary, cwd: candidatePath, env, signal, candidatePath, discardOutput: true, operation: "private object integrity check",
    });

    const baseRef = "refs/heads/courtwork-base";
    await runCandidateGit(gitDirArgs(gitDir, ["update-ref", baseRef, baseCommit]), {
      gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private base ref creation",
    });
    const refsText = await runCandidateGit(gitDirArgs(gitDir, ["for-each-ref", "--format=%(refname)"]), {
      gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private ref enumeration",
    });
    const refs = refsText ? refsText.split("\n") : [];
    for (const ref of refs) {
      if (ref === baseRef) continue;
      if (!ref.startsWith("refs/") || ref.includes("\0")) fail("invalid_source_ref", "source repository contains an invalid ref", candidatePath);
      await runCandidateGit(gitDirArgs(gitDir, ["update-ref", "-d", ref]), {
        gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private source-ref removal",
      });
    }
    await runCandidateGit(gitDirArgs(gitDir, ["symbolic-ref", "HEAD", baseRef]), {
      gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private base HEAD binding",
    });
    const remotes = await runCandidateGit(gitDirArgs(gitDir, ["remote"]), {
      gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private remote inspection",
    });
    for (const remote of remotes ? remotes.split("\n") : []) {
      if (!/^[A-Za-z0-9._-]{1,80}$/.test(remote)) fail("invalid_source_remote", "source repository contains an invalid remote", candidatePath);
      await runCandidateGit(gitDirArgs(gitDir, ["remote", "remove", remote]), {
        gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private remote removal",
      });
    }

    await runCandidateGit(gitDirArgs(gitDir, ["worktree", "add", "--detach", "--no-checkout", worktree, baseCommit]), {
      gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private worktree creation",
    });
    await runCandidateGit(worktreeArgs(gitDir, worktree, ["checkout", "--detach", "--no-recurse-submodules", baseCommit]), {
      gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private worktree checkout",
    });
    const checkedOut = await runCandidateGit(worktreeArgs(gitDir, worktree, ["rev-parse", "--verify", "HEAD"]), {
      gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private worktree commit verification",
    });
    if (checkedOut.toLowerCase() !== baseCommit.toLowerCase()) fail("candidate_commit_mismatch", "private worktree is not at the requested base commit", candidatePath);
    const clean = await runCandidateGit(worktreeArgs(gitDir, worktree, ["diff", "--quiet", "--no-ext-diff", "--no-textconv", "HEAD", "--"]), {
      gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "private worktree cleanliness check",
    });
    if (clean !== "") fail("candidate_not_clean", "private worktree did not start clean", candidatePath);
    await verifyCandidateContainer();
    await chmod(worktree, 0o700);
    await verifyCandidateContainer();

    const sourceAfter = await inspectBoundRoot(source.path, sourceIdentity);
    if (sourceAfter.device !== source.device || sourceAfter.inode !== source.inode) fail("source_root_changed", "source repository root changed during candidate creation", candidatePath);
    const worktreeInfo = await lstat(worktree);
    const gitDirInfo = await lstat(gitDir);
    const finalContainerInfo = await lstat(candidatePath);
    const stagingInfo = await lstat(staging);
    const gitFileInfo = await lstat(path.join(worktree, ".git"));
    if (!worktreeInfo.isDirectory() || !gitDirInfo.isDirectory() || !finalContainerInfo.isDirectory() || !stagingInfo.isDirectory()
      || !identitiesMatch(finalContainerInfo, { device: containerDevice, inode: containerInode })
      || !gitFileInfo.isFile() || gitFileInfo.isSymbolicLink()) {
      fail("candidate_identity_invalid", "private candidate paths are invalid", candidatePath);
    }
    const gitVersion = await runCandidateGit(["--version"], {
      gitBinary, cwd: candidatePath, env, signal, candidatePath, operation: "Git version inspection",
    });
    return {
      candidateId: candidate.id,
      candidatePath: worktree,
      candidateDevice: String(worktreeInfo.dev),
      candidateInode: String(worktreeInfo.ino),
      candidateDirectory: candidatePath,
      candidateContainerDevice: containerDevice,
      candidateContainerInode: containerInode,
      stagingDevice: String(stagingInfo.dev),
      stagingInode: String(stagingInfo.ino),
      gitDirectory: gitDir,
      gitDevice: String(gitDirInfo.dev),
      gitInode: String(gitDirInfo.ino),
      sourcePath: source.path,
      sourceDevice: source.device,
      sourceInode: source.inode,
      baseCommit: baseCommit.toLowerCase(),
      objectFormat,
      gitVersion,
    };
  } catch (error) {
    if (error instanceof RepositoryCandidateError) throw error;
    fail("candidate_creation_failed", "private Git candidate could not be created", candidatePath);
  }
}

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }

function candidateFsIdentity(candidate) {
  return {
    candidateDirectory: candidate.candidateDirectory,
    containerDevice: candidate.candidateContainerDevice,
    containerInode: candidate.candidateContainerInode,
    candidatePath: candidate.candidatePath,
    device: candidate.candidateDevice,
    inode: candidate.candidateInode,
    stagingDevice: candidate.stagingDevice,
    stagingInode: candidate.stagingInode,
  };
}

function splitGitPaths(value, operation, candidatePath) {
  if (value === "") return [];
  const paths = value.split("\0");
  if (paths.at(-1) === "") paths.pop();
  for (const relativePath of paths) {
    if (!relativePath || relativePath.length > 1000 || relativePath.startsWith("/") || relativePath.includes("\\")
      || relativePath.split("/").some(part => !part || part === "." || part === ".." || part.toLowerCase() === ".git")) {
      fail("invalid_candidate_diff", `${operation} returned a path outside the candidate file scope`, candidatePath);
    }
  }
  return paths;
}

async function verifyCandidateDiffIdentity(candidate, { gitBinary, env, signal }) {
  try {
    const root = await inspectBoundRoot(candidate.candidatePath, { device: candidate.candidateDevice, inode: candidate.candidateInode });
    const gitCanonical = await realpath(candidate.gitDirectory);
    const gitInfo = await lstat(gitCanonical);
    if (gitCanonical !== path.resolve(candidate.gitDirectory) || !gitInfo.isDirectory() || gitInfo.isSymbolicLink()
      || !identitiesMatch(gitInfo, { device: candidate.gitDevice, inode: candidate.gitInode })) {
      fail("candidate_root_changed", "private Git directory identity changed", candidate.candidatePath);
    }
    await runRepositoryCandidateFs({ operation: "verify", ...candidateFsIdentity(candidate) }, { signal });
    return root;
  } catch (error) {
    if (error instanceof RepositoryCandidateError) throw error;
    if (error?.code) throw new RepositoryCandidateError(error.code, error.message, candidate.candidatePath);
    fail("candidate_root_changed", "private candidate identity could not be verified", candidate.candidatePath);
  }
}

async function baseBlobSha256({ gitBinary, cwd, env, signal, gitDirectory, baseCommit, relativePath, candidatePath }) {
  const treeListing = await runGit([
    "--literal-pathspecs", "--git-dir", gitDirectory, "ls-tree", "-z", "--full-tree", baseCommit, "--", relativePath,
  ], {
    gitBinary, cwd, env, signal, candidatePath, operation: "candidate base-file lookup",
    trimOutput: false, strictOutput: true,
  });
  const matches = treeListing.split("\0").filter(Boolean).filter(record => record.slice(record.indexOf("\t") + 1) === relativePath);
  if (matches.length !== 1) fail("candidate_diff_invalid_state", "changed candidate file does not have one base-tree entry", candidatePath);
  const separator = matches[0].indexOf("\t");
  if (separator < 0) fail("candidate_diff_invalid_state", "candidate base-file record is invalid", candidatePath);
  const [mode, type, objectId] = matches[0].slice(0, separator).split(" ");
  if (!/^(?:100644|100755)$/.test(mode) || type !== "blob" || !OID.test(objectId)) {
    fail("candidate_diff_invalid_state", "changed candidate base path is not a regular text file", candidatePath);
  }
  const original = await runGit(["--git-dir", gitDirectory, "cat-file", "blob", objectId], {
    gitBinary, cwd, env, signal, candidatePath, operation: "candidate base-file hashing",
    trimOutput: false, maxStdoutBytes: MAX_FILE_BYTES, returnBuffer: true,
  });
  return sha256(original);
}

/** Produce a bounded, Host-built text patch for a private candidate. Git is
 * invoked only with fixed diff commands and no external diff/textconv; every
 * path is checked through the candidate dirfd helper before inclusion. */
export async function readPrivateRepositoryCandidateDiff({
  candidate,
  baseCommit,
  signal,
  gitBinary = "/usr/bin/git",
} = {}) {
  if (!candidate || typeof candidate !== "object") fail("invalid_candidate", "candidate identity is required");
  if (typeof baseCommit !== "string" || !OID.test(baseCommit)) fail("invalid_commit", "candidate diff base must be a full Git object id");
  const env = safeEnv(path.join(candidate.candidateDirectory ?? "/", "home"));
  const scope = { candidatePath: candidate.candidatePath };
  const runOptions = { gitBinary, cwd: candidate.candidateDirectory, env, signal, ...scope };
  const initialRoot = await verifyCandidateDiffIdentity(candidate, { gitBinary, env, signal });
  const head = await runGit(["-C", candidate.candidatePath, "rev-parse", "--verify", "HEAD"], {
    ...runOptions, operation: "candidate HEAD inspection",
  });
  if (head.toLowerCase() !== baseCommit.toLowerCase()) fail("candidate_base_changed", "candidate worktree HEAD no longer matches its recorded base", candidate.candidatePath);

  const trackedStatus = await runGit([
    "-C", candidate.candidatePath, "diff", "--name-status", "-z", "--no-renames", baseCommit, "--",
  ], {
    ...runOptions, operation: "candidate tracked-path inspection", trimOutput: false, strictOutput: true,
  });
  const statusItems = splitGitPaths(trackedStatus, "tracked-path inspection", candidate.candidatePath);
  if (statusItems.length % 2 !== 0) fail("invalid_candidate_diff", "candidate tracked-path status is incomplete", candidate.candidatePath);
  const tracked = [];
  for (let index = 0; index < statusItems.length; index += 2) {
    const status = statusItems[index];
    const relativePath = statusItems[index + 1];
    if (status !== "M") fail("candidate_diff_unmanaged_change", "candidate contains a change outside repo_write create/update scope", candidate.candidatePath);
    tracked.push(relativePath);
  }
  const untrackedText = await runGit(["-C", candidate.candidatePath, "ls-files", "--others", "-z"], {
    ...runOptions, operation: "candidate untracked-path inspection", trimOutput: false, strictOutput: true,
  });
  const untracked = splitGitPaths(untrackedText, "untracked-path inspection", candidate.candidatePath);
  const allPaths = [...tracked, ...untracked];
  if (allPaths.length > 500 || new Set(allPaths).size !== allPaths.length) {
    fail("candidate_diff_too_large", "candidate diff contains too many or duplicate paths", candidate.candidatePath);
  }

  const fileRecords = [];
  for (const relativePath of tracked) {
    const state = await runRepositoryCandidateFs({
      operation: "inspect", ...candidateFsIdentity(candidate), path: relativePath,
    }, { signal });
    if (!state.target?.present) fail("candidate_diff_unmanaged_change", "candidate contains a missing or non-file target", candidate.candidatePath);
    const beforeSha256 = await baseBlobSha256({
      ...runOptions, gitDirectory: candidate.gitDirectory, baseCommit, relativePath,
    });
    fileRecords.push({ path: relativePath, status: "modified", beforeSha256, sha256: state.target.sha256, bytes: state.target.bytes });
  }
  for (const relativePath of untracked) {
    const state = await runRepositoryCandidateFs({
      operation: "inspect", ...candidateFsIdentity(candidate), path: relativePath,
    }, { signal });
    if (!state.target?.present) fail("candidate_diff_unmanaged_change", "candidate contains a missing or non-file target", candidate.candidatePath);
    fileRecords.push({ path: relativePath, status: "created", beforeSha256: null, sha256: state.target.sha256, bytes: state.target.bytes });
  }

  const patches = [];
  let patchBytesLength = 0;
  const appendBoundedPatch = async (args, options) => {
    const remaining = MAX_DIFF_BYTES - patchBytesLength;
    if (remaining < 0) fail("candidate_diff_too_large", "candidate patch exceeds the Host review limit", candidate.candidatePath);
    let patchPart;
    try {
      patchPart = await runGit(args, { ...options, maxStdoutBytes: remaining, trimOutput: false, strictOutput: true });
    } catch (error) {
      if (error?.code === "git_output_limit") fail("candidate_diff_too_large", "candidate patch exceeds the Host review limit", candidate.candidatePath);
      throw error;
    }
    const partBytes = Buffer.byteLength(patchPart, "utf8");
    if (partBytes > remaining) fail("candidate_diff_too_large", "candidate patch exceeds the Host review limit", candidate.candidatePath);
    patchBytesLength += partBytes;
    patches.push(patchPart);
  };
  if (tracked.length) {
    await appendBoundedPatch([
      "-C", candidate.candidatePath, "diff", "--binary", "--no-ext-diff", "--no-textconv",
      "--no-color", "--no-renames", "--unified=3", baseCommit, "--",
    ], { ...runOptions, operation: "candidate tracked diff" });
  }
  for (const relativePath of untracked) {
    await appendBoundedPatch([
      "-C", candidate.candidatePath, "diff", "--no-index", "--binary", "--no-ext-diff", "--no-textconv",
      "--no-color", "--no-renames", "--unified=3", "--", "/dev/null", relativePath,
    ], { ...runOptions, operation: "candidate new-file diff", acceptedExitCodes: [0, 1] });
  }
  const patch = patches.join("");
  const patchBytes = Buffer.from(patch, "utf8");
  if (patchBytes.length !== patchBytesLength) fail("candidate_diff_invalid_state", "candidate patch byte accounting changed", candidate.candidatePath);
  const finalRoot = await verifyCandidateDiffIdentity(candidate, { gitBinary, env, signal });
  if (finalRoot.device !== initialRoot.device || finalRoot.inode !== initialRoot.inode) {
    fail("candidate_root_changed", "private candidate root changed while its diff was read", candidate.candidatePath);
  }
  return {
    candidateId: candidate.candidateId,
    baseCommit: baseCommit.toLowerCase(),
    files: fileRecords.sort((a, b) => a.path.localeCompare(b.path)),
    patch,
    patchBytes: patchBytes.length,
    patchSha256: sha256(patchBytes),
    truncated: false,
  };
}
