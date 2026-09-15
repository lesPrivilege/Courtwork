import { createHash } from "node:crypto";
import { Type } from "@earendil-works/pi-ai";
import { decodeRepositoryText, grepRepositoryInWorker, repositorySource } from "./repository-tools.mjs";
import { readPrivateRepositoryCandidateDiff } from "./repository-candidate.mjs";

const MAX_PATH_CHARS = 1000;
const MAX_PATTERN_CHARS = 200;
const MAX_GREP_FILES = 500;
const MAX_WRITE_BYTES = 4 * 1024 * 1024;
const sha256 = value => createHash("sha256").update(value).digest("hex");

function candidateError(message, code = "repository_candidate_failed") {
  const error = new Error(message);
  error.code = code;
  error.isRepositoryError = true;
  return error;
}

function identity(candidate) {
  return {
    candidateDirectory: candidate.candidateDirectory,
    containerDevice: candidate.containerDevice,
    containerInode: candidate.containerInode,
    candidatePath: candidate.candidatePath,
    device: candidate.device,
    inode: candidate.inode,
    stagingDevice: candidate.stagingDevice,
    stagingInode: candidate.stagingInode,
  };
}

function decodeFile(base64, bytes, digest) {
  try { return decodeRepositoryText(base64, bytes, digest); }
  catch (error) { throw candidateError("candidate file is not bounded UTF-8 text", error.code ?? "binary_file"); }
}

export function createRepositoryCandidateTools({
  candidate,
  runRepositoryFs,
  runCandidateFs,
  recordRead,
  writeCandidate,
  assertActive,
} = {}) {
  if (!candidate || candidate.status !== "active") return [];
  const candidateId = candidate.id;
  const revision = candidate.revision;
  let writeRevision = candidate.writeRevision;

  async function verify(signal) {
    if (signal?.aborted || !assertActive(candidateId, revision, writeRevision)) throw candidateError("repository candidate is no longer active for this Run", "candidate_revoked");
    await runCandidateFs({ operation: "verify", ...identity(candidate) }, { signal });
    if (signal?.aborted || !assertActive(candidateId, revision, writeRevision)) throw candidateError("repository candidate is no longer active for this Run", "candidate_revoked");
  }

  async function read(operation, relativePath, signal) {
    await verify(signal);
    const result = await runRepositoryFs({ operation, path: relativePath, rootPath: candidate.candidatePath,
      device: candidate.device, inode: candidate.inode }, { signal });
    await verify(signal);
    return result;
  }

  async function record(operation, path, text, sources, signal) {
    await verify(signal);
    await recordRead({ candidateId, revision, writeRevision, operation, path,
      resultSha256: sha256(Buffer.from(text, "utf8")), sources }, signal);
  }

  const listTool = {
    name: "candidate_list",
    label: "List private candidate files",
    description: "List direct entries under the Host-owned private Git candidate or a relative subdirectory. The user-selected source repository remains read-only.",
    parameters: Type.Object({ path: Type.Optional(Type.String({ maxLength: MAX_PATH_CHARS })) }),
    async execute(_callId, params, signal) {
      const result = await read("list", params.path ?? ".", signal);
      const text = JSON.stringify(result, null, 2);
      const digest = sha256(Buffer.from(text, "utf8"));
      await record("list", result.path, text, [repositorySource(result.path, Buffer.byteLength(text), digest)], signal);
      return { content: [{ type: "text", text }], details: { path: result.path, entries: result.entries.length, truncated: result.truncated, sha256: digest, candidateId } };
    },
  };

  const readTool = {
    name: "candidate_read",
    label: "Read private candidate file",
    description: "Read UTF-8 text from the Host-owned private Git candidate. Reads from the user-selected source repository remain available through repo_read.",
    parameters: Type.Object({ path: Type.String({ minLength: 1, maxLength: MAX_PATH_CHARS }), startLine: Type.Optional(Type.Integer({ minimum: 1 })), endLine: Type.Optional(Type.Integer({ minimum: 1 })) }),
    async execute(_callId, params, signal) {
      const result = await read("read", params.path, signal);
      const decoded = decodeFile(result.dataBase64, result.bytes, result.sha256);
      let text = decoded.text;
      if (params.startLine || params.endLine) {
        const lines = text.split("\n");
        const start = Math.max(1, params.startLine ?? 1) - 1;
        const end = Math.min(lines.length, params.endLine ?? lines.length);
        text = lines.slice(start, end).join("\n");
      }
      await record("read", result.path, text, [repositorySource(result.path, result.bytes, result.sha256)], signal);
      return { content: [{ type: "text", text }], details: { path: result.path, bytes: result.bytes, sha256: result.sha256, candidateId } };
    },
  };

  const grepTool = {
    name: "candidate_grep",
    label: "Search private candidate files",
    description: "Search bounded UTF-8 text files inside the Host-owned private Git candidate. Symlinks and .git control paths are never followed or exposed.",
    parameters: Type.Object({ pattern: Type.String({ minLength: 1, maxLength: MAX_PATTERN_CHARS }), path: Type.Optional(Type.String({ maxLength: MAX_PATH_CHARS })) }),
    async execute(_callId, params, signal) {
      const scanned = await read("grep", params.path ?? ".", signal);
      if (!Array.isArray(scanned.files) || scanned.files.length > MAX_GREP_FILES) throw candidateError("candidate search set exceeded its Host limit", "invalid_helper_response");
      for (const file of scanned.files) decodeFile(file.dataBase64, file.bytes, file.sha256);
      const matched = await grepRepositoryInWorker(scanned.files, params.pattern, signal);
      const result = { matches: matched.matches, truncated: scanned.truncated || matched.truncated,
        scannedFiles: scanned.files.length, scannedBytes: scanned.scannedBytes, skippedBinary: scanned.skippedBinary,
        skippedLarge: scanned.skippedLarge, skippedSymlinks: scanned.skippedSymlinks };
      const text = JSON.stringify(result, null, 2);
      await record("grep", scanned.path, text, scanned.files.map(file => repositorySource(file.path, file.bytes, file.sha256)), signal);
      return { content: [{ type: "text", text }], details: { path: scanned.path, matches: matched.matches.length, truncated: result.truncated, scannedFiles: result.scannedFiles, candidateId } };
    },
  };

  const writeTool = {
    name: "repo_write",
    label: "Write a private candidate file",
    description: "Create or replace a regular UTF-8 file in the Host-owned private Git candidate. Replacements require the expected prior SHA-256; the connected source repository is never written.",
    parameters: Type.Object({ path: Type.String({ minLength: 1, maxLength: MAX_PATH_CHARS }), text: Type.String({ maxLength: MAX_WRITE_BYTES }), expectedSha256: Type.Optional(Type.String({ minLength: 64, maxLength: 64 })) }),
    permissionContext(params) {
      return { candidateId, candidateRevision: revision, candidateWriteRevision: writeRevision,
        sourceBindingId: candidate.sourceBindingId, sourceBindingRevision: candidate.sourceBindingRevision,
        expectedSha256: params.expectedSha256 ?? null };
    },
    async execute(callId, params, signal, _onUpdate, approvedContext) {
      const content = Buffer.from(params.text, "utf8");
      if (content.length > MAX_WRITE_BYTES) throw candidateError("candidate write exceeds the Host limit", "write_too_large");
      const contentSha256 = sha256(content);
      if (params.expectedSha256 !== undefined && !/^[0-9a-f]{64}$/.test(params.expectedSha256)) throw candidateError("expectedSha256 must be lowercase SHA-256", "invalid_expected_hash");
      if (approvedContext && (approvedContext.candidateId !== candidateId || approvedContext.candidateRevision !== revision
        || approvedContext.candidateWriteRevision !== writeRevision || approvedContext.sourceBindingId !== candidate.sourceBindingId
        || approvedContext.sourceBindingRevision !== candidate.sourceBindingRevision
        || approvedContext.expectedSha256 !== (params.expectedSha256 ?? null))) {
        throw candidateError("Repository candidate changed after approval; review the current candidate and retry", "candidate_changed");
      }
      const approvedWriteRevision = approvedContext?.candidateWriteRevision ?? writeRevision;
      const result = await writeCandidate({ callId, candidateId, candidateRevision: revision, candidateWriteRevision: approvedWriteRevision,
        sourceBindingId: candidate.sourceBindingId, sourceBindingRevision: candidate.sourceBindingRevision,
        path: params.path, text: params.text, expectedSha256: params.expectedSha256 ?? null, contentSha256, bytes: content.length }, { signal });
      const replay = result.idempotent === true;
      if (!Number.isSafeInteger(result.writeRevision) || (replay ? result.writeRevision > writeRevision : result.writeRevision <= writeRevision)) {
        throw candidateError("candidate write result is invalid", "invalid_helper_response");
      }
      if (!replay) writeRevision = result.writeRevision;
      const { idempotent: _idempotent, ...receipt } = result;
      const text = JSON.stringify(receipt, null, 2);
      return { content: [{ type: "text", text }], details: receipt };
    },
  };

  const diffTool = {
    name: "repo_diff",
    label: "Review private candidate changes",
    description: "Show a bounded text diff from the immutable commit used to create this private candidate. The base cannot be changed by the caller.",
    parameters: Type.Object({}),
    async execute(_callId, _params, signal) {
      await verify(signal);
      const result = await readPrivateRepositoryCandidateDiff({ candidate: {
        candidateId, candidatePath: candidate.candidatePath, candidateDevice: candidate.device, candidateInode: candidate.inode,
        candidateDirectory: candidate.candidateDirectory, candidateContainerDevice: candidate.containerDevice,
        candidateContainerInode: candidate.containerInode, stagingDevice: candidate.stagingDevice,
        stagingInode: candidate.stagingInode, gitDirectory: candidate.gitDirectory, gitDevice: candidate.gitDevice, gitInode: candidate.gitInode,
      }, baseCommit: candidate.baseCommit, signal });
      await verify(signal);
      const text = JSON.stringify(result, null, 2);
      await record("diff", ".", text, result.files.map(file => repositorySource(file.path, file.bytes, file.sha256)), signal);
      return { content: [{ type: "text", text }], details: { baseCommit: result.baseCommit, files: result.files.length, patchBytes: result.patchBytes, patchSha256: result.patchSha256, truncated: result.truncated, candidateId } };
    },
  };

  // Pi can execute tool calls in one model response concurrently. Candidate
  // read receipts include the mutable writeRevision, so serialize the whole
  // tool operation (including its filesystem read and provenance event) with
  // writes. governTools waits for any human decision before execute is called,
  // keeping permission waits outside this queue.
  let operationTail = Promise.resolve();
  return [listTool, readTool, grepTool, writeTool, diffTool].map(tool => {
    const execute = tool.execute;
    return {
      ...tool,
      async execute(...args) {
        const operation = operationTail.then(() => execute.apply(tool, args));
        operationTail = operation.then(() => undefined, () => undefined);
        return operation;
      },
    };
  });
}
