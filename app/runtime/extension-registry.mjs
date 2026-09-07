/**
 * Generic wrapper around the extension-owned catalog ABI.
 * The host validates manifests and lifecycle only; domain behavior stays in
 * extension instances.
 */

import path from "node:path";

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
  constructor({ catalog = {}, dataDir, store = null } = {}) {
    this.catalog = catalog;
    this.dataDir = dataDir;
    this.store = store;
    this.instances = new Map();
    this.manifests = new Map();
    this.records = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return this;
    for (const [id, candidate] of Object.entries(this.catalog)) {
      if (typeof candidate !== "function") fail("catalog entry " + id + " is not an async factory");
      const instance = await candidate({ dataDir: path.join(this.dataDir, "extensions", id) });
      const manifest = validateManifest(instance?.manifest, id);
      this.manifests.set(id, manifest);
      this.instances.set(id, instance);
      this.records.set(id, summary(manifest, "unloaded", 0));
    }
    this.initialized = true;
    return this;
  }

  #ensureInitialized() {
    if (!this.initialized) throw new Error("extension registry is not initialized");
  }

  list() {
    this.#ensureInitialized();
    return [...this.records.values()].map((item) => structuredClone(item));
  }

  getRecord(id) {
    this.#ensureInitialized();
    const item = this.records.get(id);
    return item ? structuredClone(item) : null;
  }

  #manifest(id) {
    const item = this.manifests.get(id);
    if (!item) throw new Error("extension not found");
    return item;
  }

  async #newInstance(id) {
    const factory = this.catalog[id];
    if (typeof factory !== "function") throw new Error("extension not found");
    const instance = await factory({ dataDir: path.join(this.dataDir, "extensions", id) });
    const manifest = validateManifest(instance?.manifest, id);
    const known = this.#manifest(id);
    if (manifest.version !== known.version || manifest.id !== known.id) throw new Error("extension manifest changed during reload");
    return instance;
  }

  async #persist() {
    if (this.store?.setExtensionRecords) await this.store.setExtensionRecords(this.list());
  }

  async #start(id, instance, generation) {
    const manifest = this.#manifest(id);
    await instance.start?.();
    this.instances.set(id, instance);
    this.records.set(id, summary(manifest, "loaded", generation));
    await this.#persist();
    return structuredClone(this.records.get(id));
  }

  async lifecycle(id, action) {
    this.#ensureInitialized();
    const current = this.records.get(id);
    const manifest = this.#manifest(id);
    if (action === "load") {
      if (current?.status === "loaded") return structuredClone(current);
      if (current?.status === "invalidated") throw new Error("invalidated extension requires explicit reload");
      return this.#start(id, this.instances.get(id) ?? await this.#newInstance(id), current?.generation ?? 0);
    }
    if (action === "invalidate") {
      const next = (current?.generation ?? 0) + 1;
      this.records.set(id, summary(manifest, "invalidated", next));
      await this.#persist();
      return structuredClone(this.records.get(id));
    }
    if (action === "unload") {
      const next = (current?.generation ?? 0) + 1;
      this.records.set(id, summary(manifest, "unloaded", next));
      // Keep the singleton instance alive for read-only projection. Unload
      // revokes execution/renderer activation; it does not release the DB.
      await this.#persist();
      return structuredClone(this.records.get(id));
    }
    if (action === "reload") {
      const old = this.instances.get(id);
      if (old) await old.dispose?.();
      this.instances.delete(id);
      try {
        const replacement = await this.#newInstance(id);
        const result = await this.#start(id, replacement, (current?.generation ?? 0) + 1);
        return result;
      } catch (error) {
        this.records.set(id, summary(manifest, "invalidated", current?.generation ?? 0));
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

  async begin({ extensionId, runId, sessionId, binding, provider, instruction }) {
    const record = this.records.get(extensionId);
    if (!record || record.status !== "loaded") throw new Error("extension is not loaded");
    const result = await this.#instance(extensionId).begin({ runId, sessionId, binding, provider, instruction });
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
    for (const instance of new Set(this.instances.values())) await instance.dispose?.();
    this.instances.clear();
  }
}

export { validateManifest };
