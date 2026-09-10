import { mkdir, readFile, rename, writeFile, chmod, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Provider credentials live in their own file, independent of
// runtime-state.json, and are never embedded in store events or logs. The key
// is the CONNECTION id, not a provider id: two connections onto the same wire
// protocol each keep their own key instead of overwriting one another.

function filePath(dataDir) {
  return path.join(dataDir, "credentials.json");
}

export async function readCredentialFile(dataDir) {
  try {
    const raw = await readFile(filePath(dataDir), "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

async function writeCredentialFile(dataDir, entries) {
  await mkdir(dataDir, { recursive: true });
  const target = filePath(dataDir);
  const tempPath = target + "." + randomUUID() + ".tmp";
  try {
    await writeFile(tempPath, JSON.stringify(entries, null, 2), { encoding: "utf8", mode: 0o600 });
    await chmod(tempPath, 0o600);
    await rename(tempPath, target);
  } finally {
    await unlink(tempPath).catch((error) => { if (error.code !== "ENOENT") throw error; });
  }
}

export async function setCredential(dataDir, connectionId, apiKey) {
  const entries = await readCredentialFile(dataDir);
  entries[connectionId] = apiKey;
  await writeCredentialFile(dataDir, entries);
}

/** Rewrite the whole file, used once at startup to move the old provider-id
 * key space onto connection ids. */
export async function replaceCredentialFile(dataDir, entries) {
  if (Object.keys(entries).length === 0) {
    await unlink(filePath(dataDir)).catch((error) => { if (error.code !== "ENOENT") throw error; });
    return;
  }
  await writeCredentialFile(dataDir, entries);
}

export async function deleteCredential(dataDir, connectionId) {
  const entries = await readCredentialFile(dataDir);
  if (!(connectionId in entries)) return false;
  delete entries[connectionId];
  if (Object.keys(entries).length === 0) {
    await unlink(filePath(dataDir)).catch((error) => { if (error.code !== "ENOENT") throw error; });
  } else {
    await writeCredentialFile(dataDir, entries);
  }
  return true;
}
