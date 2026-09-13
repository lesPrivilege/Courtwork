/**
 * Generic wrapper around the extension-owned catalog ABI.
 * The host validates manifests and lifecycle only; domain behavior stays in
 * extension instances.
 */

import path from "node:path";
import { LocalExtensions } from "./local-extensions.mjs";

const MANIFEST_KEYS = new Set([
  "schemaVersion", "id", "version", "title", "kind", "releaseStatus", "owner",
  "applicability", "exclusions", "declaredTools", "surface", "bindingFields",
  "stateCompatibility", "rollback", "deprecation", "evalObligations",
]);

function fail(detail) {
  const error = new Error("invalid extension manifest: " + detail);
  error.code = "INVALID_MANIFEST";
  throw error;
}

function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(label + " must be an object");
  return value;
}

function string(value, label, { allowEmpty = false, max = 1000 } = {}) {
  if (typeof value !== "string" || value.length > max || (!allowEmpty && value.trim() === "")) fail(label + " is invalid");
  return value;
}

function strings(value, label, maxItems = 100) {
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== "string" || item.trim() === "" || item.length > 200)) fail(label + " is invalid");
  return [...value];
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(label + " has unsupported or missing fields");
}

function validateManifest(input, catalogId) {
  const manifest = record(input, "manifest");
  exactKeys(manifest, MANIFEST_KEYS, "manifest");
  if (manifest.schemaVersion !== 1) fail("schemaVersion is unsupported");
  if (manifest.id !== catalogId) fail("id does not match catalog key");
  string(manifest.id, "id", { max: 120 }); string(manifest.version, "version", { max: 120 });
  string(manifest.title, "title", { max: 240 });
  if (manifest.kind !== "development-extension") fail("kind is not development-extension");
  if (manifest.releaseStatus !== "development") fail("releaseStatus is not development");
  string(manifest.owner, "owner"); string(manifest.applicability, "applicability");
  strings(manifest.exclusions, "exclusions"); strings(manifest.declaredTools, "declaredTools");
  for (const tool of manifest.declaredTools) if (!tool.startsWith("se_")) fail("declared tool is not namespaced");
  strings(manifest.evalObligations, "evalObligations");
  string(manifest.stateCompatibility, "stateCompatibility"); string(manifest.rollback, "rollback");
  if (manifest.deprecation !== null) string(manifest.deprecation, "deprecation");
  if (manifest.surface !== null) {
    exactKeys(record(manifest.surface, "surface"), new Set(["id", "title", "module"]), "surface");
    string(manifest.surface.id, "surface.id", { max: 120 });
    string(manifest.surface.title, "surface.title", { max: 240 });
    string(manifest.surface.module, "surface.module", { max: 300 });
    if (!manifest.surface.module.startsWith("/extensions/")) fail("surface.module is outside extension allowlist");
  }
  if (!Array.isArray(manifest.bindingFields) || manifest.bindingFields.length > 100) fail("bindingFields is invalid");
  const bindingFields = manifest.bindingFields.map((field) => {
    exactKeys(record(field, "binding field"), new Set(["name", "label", "multiline", "required", "maxLength"]), "binding field");
    string(field.name, "binding field.name", { max: 120 }); string(field.label, "binding field.label", { max: 240 });
    if (typeof field.multiline !== "boolean" || typeof field.required !== "boolean" || !Number.isSafeInteger(field.maxLength) || field.maxLength < 0 || field.maxLength > 1_000_000) fail("binding field flags are invalid");
    return { name: field.name, label: field.label, multiline: field.multiline, required: field.required, maxLength: field.maxLength };
  });
  return {
    schemaVersion: 1, id: manifest.id, version: manifest.version, title: manifest.title,
    kind: manifest.kind, releaseStatus: manifest.releaseStatus, owner: manifest.owner,
    applicability: manifest.applicability, exclusions: [...manifest.exclusions],
    declaredTools: [...manifest.declaredTools], surface: manifest.surface ? structuredClone(manifest.surface) : null,
    bindingFields,
    stateCompatibility: manifest.stateCompatibility, rollback: manifest.rollback,
    deprecation: manifest.deprecation, evalObligations: [...manifest.evalObligations],
  };
}

function summary(manifest, status, generation) {
  return {
    id: manifest.id, version: manifest.version, generation, status,
    kind: manifest.kind, releaseStatus: manifest.releaseStatus, title: manifest.title,
    surface: manifest.surface ? structuredClone(manifest.surface) : null,
    tools: [...manifest.declaredTools], bindingFields: structuredClone(manifest.bindingFields),
  };
}

export class ExtensionRegistry {
  constructor({ catalog = {}, dataDir, store = null, workCore = null } = {}) {
    this.catalog = { ...catalog };
    this.local = new LocalExtensions({ dataDir, validateManifest });
    this.localEntries = new Map();
    this.localErrors = new Map();
    this.dataDir = dataDir;
    this.store = store;
    this.workCore = workCore;
    this.instances = new Map();
    this.manifests = new Map();
    this.records = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return this;
    const savedRecords = new Map((this.store?.getExtensionRecords?.() ?? []).map((item) => [item.id, item]));
    for (const [id, candidate] of Object.entries(this.catalog)) {
      const saved = savedRecords.get(id);
      if (saved && (!Number.isSafeInteger(saved.generation) || saved.generation < 0
        || !["loaded", "unloaded", "invalidated"].includes(saved.status) || typeof saved.version !== "string")) {
        throw new Error("invalid persisted extension record: " + id);
      }
      if (typeof candidate !== "function") fail("catalog entry " + id + " is not an async factory");
      const instance = await candidate({ dataDir: path.join(this.dataDir, "extensions", id), core: this.workCore });
      this.instances.set(id, instance);
      const manifest = validateManifest(instance?.manifest, id);
      this.manifests.set(id, manifest);
      const changedVersion = saved && saved.version !== manifest.version;
      const status = changedVersion ? "invalidated" : saved?.status ?? "unloaded";
      const generation = (saved?.generation ?? 0) + (changedVersion ? 1 : 0);
      this.records.set(id, summary(manifest, status, generation));
      // Recreate process resources only for previously activated, unchanged
      // extensions. Unload/invalidation survives restart; changed code requires
      // explicit reload rather than silently reviving an old binding.
      if (status === "loaded") await instance.start?.();
    }
    await this.local.initialize();
    const restoredLocal = [];
    for (const entry of this.local.entries) {
      const id = entry.manifest.id;
      if (this.records.has(id)) fail("local extension conflicts with a host catalog ID");
      this.catalog[id] = this.local.factory(entry);
      this.localEntries.set(id, entry);
      this.manifests.set(id, entry.manifest);
      const saved = savedRecords.get(id);
      let status = saved && ["loaded", "unloaded", "invalidated"].includes(saved.status) ? saved.status : "unloaded";
      if (status === "loaded" && entry.suspended === true) {
        status = "invalidated";
        this.localErrors.set(id, "Activation was interrupted or disabled; explicit reload is required.");
      }
      const generation = Number.isSafeInteger(saved?.generation) && saved.generation >= 0 ? saved.generation : 0;
      this.records.set(id, summary(entry.manifest, status, generation));
      // Registration is inert. Only a previously explicit load is restored.
      if (status === "loaded") {
        let instance;
        try {
          await this.#localSuspended(id, true);
          instance = await this.#newInstance(id); await instance.start?.(); this.instances.set(id, instance);
          restoredLocal.push(id);
        }
        catch (error) {
          try { await instance?.dispose?.(); } catch { /* Retain the startup failure. */ }
          this.localErrors.set(id, error.message);
          this.records.set(id, summary(entry.manifest, "invalidated", generation + 1));
        }
      }
    }
    this.initialized = true;
    if (this.records.size) await this.#persist();
    for (const id of restoredLocal) await this.#localSuspended(id, false);
    return this;
  }

  #ensureInitialized() {
    if (!this.initialized) throw new Error("extension registry is not initialized");
  }

  list() {
    this.#ensureInitialized();
    return [...this.records.values()].map((item) => this.#describe(item));
  }

  getRecord(id) {
    this.#ensureInitialized();
    const item = this.records.get(id);
    return item ? this.#describe(item) : null;
  }

  #describe(item) {
    const local = this.localEntries.get(item.id);
    return { ...structuredClone(item), format: "cw-host-extension", trust: "host-trusted", isolation: "in-process",
      source: local ? { type: "local-config", uri: local.sourcePath, hash: local.hash } : { type: "builtin", version: item.version },
      ...(this.localErrors.has(item.id) ? { diagnostics: [this.localErrors.get(item.id)] } : {}),
    };
  }

  previewLocal(directory) { this.#ensureInitialized(); return this.local.preview(directory); }

  async registerLocal(input) {
    this.#ensureInitialized();
    const entry = await this.local.install(input, Object.keys(this.catalog));
    const id = entry.manifest.id;
    this.catalog[id] = this.local.factory(entry);
    this.localEntries.set(id, entry);
    this.manifests.set(id, entry.manifest);
    this.records.set(id, summary(entry.manifest, "unloaded", 0));
    await this.#persist();
    return this.getRecord(id);
  }

  #manifest(id) {
    const item = this.manifests.get(id);
    if (!item) throw new Error("extension not found");
    return item;
  }

  async #newInstance(id) {
    const factory = this.catalog[id];
    if (typeof factory !== "function") throw new Error("extension not found");
    const instance = await factory({ dataDir: path.join(this.dataDir, "extensions", id), core: this.workCore });
    const manifest = validateManifest(instance?.manifest, id);
    const known = this.#manifest(id);
    if (manifest.version !== known.version || manifest.id !== known.id) throw new Error("extension manifest changed during reload");
    return instance;
  }

  async #persist() {
    if (this.store?.setExtensionRecords) {
      // A headless composition may install only part of the catalog. Keep
      // dormant records without instantiating extensions absent from it.
      const dormant = (this.store.getExtensionRecords?.() ?? []).filter((item) => !this.records.has(item.id));
      await this.store.setExtensionRecords([...dormant, ...this.list()]);
    }
  }

  async #localSuspended(id, value) {
    if (this.localEntries.has(id)) this.localEntries.set(id, await this.local.setSuspended(id, value));
  }

  async #start(id, instance, generation) {
    const manifest = this.#manifest(id);
    try {
      await instance.start?.();
      this.instances.set(id, instance);
      this.records.set(id, summary(manifest, "loaded", generation));
      await this.#persist();
      await this.#localSuspended(id, false);
      this.localErrors.delete(id);
      return structuredClone(this.records.get(id));
    } catch (error) {
      if (this.localEntries.has(id)) {
        try { await instance.dispose?.(); } catch { /* Retain the activation failure. */ }
        this.instances.delete(id);
        this.records.set(id, summary(manifest, "invalidated", generation));
        this.localErrors.set(id, error.message);
        try { await this.#persist(); } catch { /* Durable suspension still blocks restart. */ }
      }
      throw error;
    }
  }

  async lifecycle(id, action) {
    this.#ensureInitialized();
    const current = this.records.get(id);
    const manifest = this.#manifest(id);
    if (action === "load") {
      if (current?.status === "loaded") return structuredClone(current);
      if (current?.status === "invalidated") throw new Error("invalidated extension requires explicit reload");
      await this.#localSuspended(id, true);
      return this.#start(id, this.instances.get(id) ?? await this.#newInstance(id), current?.generation ?? 0);
    }
    if (action === "invalidate") {
      await this.#localSuspended(id, true);
      const next = (current?.generation ?? 0) + 1;
      this.records.set(id, summary(manifest, "invalidated", next));
      await this.#persist();
      return structuredClone(this.records.get(id));
    }
    if (action === "unload") {
      await this.#localSuspended(id, true);
      const next = (current?.generation ?? 0) + 1;
      // Shared work data outlives its producer. Release executable resources;
      // the host Core reader serves history without this singleton.
      const instance = this.instances.get(id);
      if (this.localEntries.has(id) || (instance?.core === this.workCore && this.workCore)) {
        try { await instance?.dispose?.(); }
        catch (error) {
          if (this.localEntries.has(id)) {
            this.records.set(id, summary(manifest, "invalidated", next));
            this.localErrors.set(id, `Cleanup failed; process resources may remain active: ${error.message}`);
            await this.#persist();
          }
          throw error;
        }
        this.instances.delete(id);
      }
      this.localErrors.delete(id);
      this.records.set(id, summary(manifest, "unloaded", next));
      try { await this.#persist(); }
      catch (error) {
        if (this.localEntries.has(id)) {
          this.records.set(id, summary(manifest, "invalidated", next));
          this.localErrors.set(id, `Lifecycle receipt failed; automatic activation is blocked: ${error.message}`);
        }
        throw error;
      }
      return structuredClone(this.records.get(id));
    }
    if (action === "reload") {
      await this.#localSuspended(id, true);
      const old = this.instances.get(id);
      try {
        if (old) await old.dispose?.();
        this.instances.delete(id);
        const replacement = await this.#newInstance(id);
        const result = await this.#start(id, replacement, (current?.generation ?? 0) + 1);
        return result;
      } catch (error) {
        this.records.set(id, summary(manifest, "invalidated", (current?.generation ?? 0) + 1));
        if (this.localEntries.has(id)) this.localErrors.set(id, error.message);
        await this.#persist();
        throw error;
      }
    }
    throw new Error("unknown extension lifecycle action");
  }

  #instance(id) {
    const item = this.instances.get(id);
    if (!item) throw new Error("extension is not initialized");
    return item;
  }

  async createBinding({ extensionId, input }) {
    const record = this.records.get(extensionId);
    if (!record || record.status !== "loaded") throw new Error("extension is not loaded");
    return this.#instance(extensionId).createBinding(input);
  }

  async begin({ extensionId, runId, sessionId, binding, provider, instruction, runtimeProfile = null }) {
    const record = this.records.get(extensionId);
    if (!record || record.status !== "loaded") throw new Error("extension is not loaded");
    const instance = this.#instance(extensionId);
    const result = await instance.begin({ runId, sessionId, binding, provider, instruction, ...(instance.core === this.workCore && this.workCore ? {runtimeProfile} : {}) });
    return { record: structuredClone(record), run: result };
  }

  async projection({ extensionId, binding }) {
    const record = this.records.get(extensionId);
    if (!record || !["loaded", "unloaded", "invalidated"].includes(record.status)) throw new Error("extension is not available");
    return this.#instance(extensionId).projection(binding);
  }

  async humanAction({ extensionId, binding, actor, action, payload }) {
    const record = this.records.get(extensionId);
    if (!record || record.status !== "loaded") throw new Error("extension is not loaded");
    return this.#instance(extensionId).humanAction({ binding, actor, action, payload });
  }

  async dispose() {
    const errors = [];
    for (const instance of new Set(this.instances.values())) {
      try { await instance.dispose?.(); } catch (error) { errors.push(error); }
    }
    this.instances.clear();
    if (errors.length) throw new AggregateError(errors, "Extension cleanup failed");
  }
}

export { validateManifest };
