import { mkdir, readFile, rename, writeFile, chmod, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Provider credentials live in their own file, independent of
// runtime-state.json, and are never embedded in store events or logs.

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
  await writeFile(tempPath, JSON.stringify(entries, null, 2), { encoding: "utf8", mode: 0o600 });
  await chmod(tempPath, 0o600);
  await rename(tempPath, target);
}

export async function setCredential(dataDir, provider, apiKey) {
  const entries = await readCredentialFile(dataDir);
  entries[provider] = apiKey;
  await writeCredentialFile(dataDir, entries);
}

export async function deleteCredential(dataDir, provider) {
  const entries = await readCredentialFile(dataDir);
  if (!(provider in entries)) return false;
  delete entries[provider];
  if (Object.keys(entries).length === 0) {
    await unlink(filePath(dataDir)).catch(() => {});
  } else {
    await writeCredentialFile(dataDir, entries);
  }
  return true;
}
