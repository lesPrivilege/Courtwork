import { lstat, readdir, readFile, writeFile, mkdir, rename, rm, realpath, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');
const MAX_BYTES = 2_000_000, MAX_FILES = 64;
function invalid(message, code = 'invalid_local_extension', status = 400) {
  const error = new Error(message); Object.assign(error, { code, status }); throw error;
}
function digest(files) { return sha(JSON.stringify(files.map(file => [file.name, sha(file.bytes)]))); }

/** Acquisition for explicitly selected, host-trusted local packages. Reading
 * and registering never import a module. A reviewed byte snapshot is copied to
 * an immutable package directory before ExtensionRegistry may execute it. */
export class LocalExtensions {
  constructor({ dataDir, validateManifest }) {
    this.root = path.join(dataDir, 'local-extensions');
    this.file = path.join(this.root, 'index.json');
    this.validateManifest = validateManifest;
    this.entries = [];
    this.previews = new Map();
  }
  async initialize() {
    let data;
    try { data = JSON.parse(await readFile(this.file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    if (data?.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 32) invalid('Unsupported local extension index');
    const ids = new Set();
    for (const entry of data.entries) {
      if (!entry || !/^[a-f0-9]{64}$/.test(entry.hash) || entry.trust !== 'host-trusted' || typeof entry.sourcePath !== 'string') invalid('Invalid local extension record');
      if (Object.hasOwn(entry, 'suspended') && typeof entry.suspended !== 'boolean') invalid('Invalid local activation suspension marker.');
      this.manifest(entry.manifest);
      if (ids.has(entry.manifest.id)) invalid('Duplicate local extension ID');
      ids.add(entry.manifest.id);
    }
    this.entries = data.entries;
  }
  manifest(value) {
    if (!/^[a-z][a-z0-9-]{0,79}$/.test(value?.id)) invalid('Local extension IDs use lowercase letters, numbers and hyphens.');
    let manifest;
    try { manifest = this.validateManifest(value, value.id); }
    catch (error) { invalid(error.message); }
    if (manifest.surface !== null) invalid('Local extensions currently use the generic inspector; custom renderer modules are not supported.');
    if (manifest.declaredTools.some(name => !/^se_[a-zA-Z0-9_]+$/.test(name)) || new Set(manifest.declaredTools).size !== manifest.declaredTools.length) invalid('Declared tools must have unique se_ names.');
    return manifest;
  }
  async snapshot(directory) {
    if (typeof directory !== 'string' || !path.isAbsolute(directory) || directory.length > 4000) invalid('Choose an absolute local extension folder path.');
    const root = await realpath(directory);
    if (!(await lstat(root)).isDirectory()) invalid('The extension path must be a folder.');
    const files = []; let bytes = 0;
    const visit = async (dir, depth = 0) => {
      if (depth > 4) invalid('The extension folder is too deeply nested.');
      for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        if (entry.isSymbolicLink()) invalid('Symbolic links are not supported in local extension packages.');
        const filename = path.join(dir, entry.name);
        const resolved = await realpath(filename);
        if (!resolved.startsWith(root + path.sep)) invalid('A package path leaves the selected folder.');
        if (entry.isDirectory()) { await visit(filename, depth + 1); continue; }
        if (!entry.isFile() || files.length >= MAX_FILES) invalid('Use a package with at most 64 regular files.');
        const handle = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
          const stat = await handle.stat();
          if (!stat.isFile() || stat.size > MAX_BYTES - bytes) invalid('The extension package exceeds 2 MB.');
          const buffer = await handle.readFile(); bytes += buffer.length;
          if (bytes > MAX_BYTES) invalid('The extension package exceeds 2 MB.');
          files.push({ name: path.relative(root, filename).split(path.sep).join('/'), bytes: buffer });
        } finally { await handle.close(); }
      }
    };
    await visit(root);
    files.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    const manifestFile = files.find(file => file.name === 'manifest.json');
    if (!manifestFile || !files.some(file => file.name === 'index.mjs')) invalid('The folder needs manifest.json and index.mjs.');
    let manifest;
    try { manifest = this.manifest(JSON.parse(manifestFile.bytes.toString('utf8'))); }
    catch (error) { if (error.status) throw error; invalid('manifest.json must contain a valid extension manifest.'); }
    return { sourcePath: root, files, manifest, hash: digest(files), bytes };
  }
  async preview(directory) {
    const snapshot = await this.snapshot(directory);
    const now = Date.now();
    for (const [key, value] of this.previews) if (value.expiresAt < now) this.previews.delete(key);
    while (this.previews.size >= 8) this.previews.delete(this.previews.keys().next().value);
    const previewId = randomUUID(), expiresAt = now + 5 * 60_000;
    this.previews.set(previewId, { ...snapshot, expiresAt });
    return { previewId, expiresAt, sourcePath: snapshot.sourcePath, hash: snapshot.hash, bytes: snapshot.bytes,
      files: snapshot.files.map(file => file.name), manifest: snapshot.manifest,
      trust: 'requires-host-trust', isolation: 'in-process', disposition: 'inspect-only' };
  }
  async persist(entries) {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const temp = this.file + '.' + randomUUID() + '.tmp';
    try { await writeFile(temp, JSON.stringify({ version: 1, entries }), { mode: 0o600 }); await rename(temp, this.file); }
    finally { await rm(temp, { force: true }); }
    this.entries = entries;
  }
  async install({ previewId, hash, trust }, reservedIds) {
    const preview = this.previews.get(previewId);
    if (!preview || preview.expiresAt < Date.now() || preview.hash !== hash) invalid('Review this folder again before registering it.', 'local_extension_preview_expired', 409);
    if (trust !== 'host-trusted') invalid('Explicit host trust is required to register executable code.');
    if (reservedIds.includes(preview.manifest.id) || this.entries.some(entry => entry.manifest.id === preview.manifest.id)) invalid('This extension ID is already registered.', 'local_extension_conflict', 409);
    if (this.entries.length >= 32) invalid('At most 32 local extensions may be registered.');
    const packageRoot = path.join(this.root, 'packages', preview.hash);
    const staging = packageRoot + '.' + randomUUID() + '.tmp';
    await mkdir(staging, { recursive: true, mode: 0o700 });
    try {
      for (const file of preview.files) {
        const destination = path.join(staging, file.name);
        await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
        await writeFile(destination, file.bytes, { mode: 0o600 });
      }
      try { await rename(staging, packageRoot); }
      catch (error) { if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error; }
    } finally { await rm(staging, { force: true, recursive: true }); }
    const entry = { manifest: preview.manifest, sourcePath: preview.sourcePath, hash: preview.hash, trust: 'host-trusted', registeredAt: new Date().toISOString() };
    await this.persist([...this.entries, entry]);
    this.previews.delete(previewId);
    return entry;
  }
  async setSuspended(id, suspended) {
    const entry = this.entries.find(item => item.manifest.id === id);
    if (!entry) invalid('Local extension not found.');
    const next = { ...entry, suspended };
    await this.persist(this.entries.map(item => item === entry ? next : item));
    return next;
  }
  factory(entry) {
    return async context => {
      const directory = path.join(this.root, 'packages', entry.hash);
      const snapshot = await this.snapshot(directory);
      if (snapshot.hash !== entry.hash) invalid('The registered package bytes changed; code was not loaded.', 'local_extension_changed', 409);
      const module = await import(pathToFileURL(path.join(directory, 'index.mjs')).href);
      if (typeof module.createExtension !== 'function') invalid('index.mjs must export createExtension.');
      const instance = await module.createExtension(context);
      try {
        if (JSON.stringify(this.manifest(instance?.manifest)) !== JSON.stringify(entry.manifest)) invalid('The executable manifest differs from the reviewed manifest.');
        for (const method of ['createBinding', 'begin', 'projection', 'humanAction', 'dispose']) if (typeof instance[method] !== 'function') invalid(`The extension must implement ${method}.`);
        return instance;
      } catch (error) {
        try { await instance?.dispose?.(); } catch { /* Preserve the validation failure. */ }
        throw error;
      }
    };
  }
}
