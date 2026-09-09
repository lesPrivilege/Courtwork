import path from "node:path";
import { WorkCoreOwner } from "../core/owner.mjs";
import { createFakeOpenAiProvider } from "../runtime/fake-provider.mjs";
import { createIsolatedModelRuntime } from "../runtime/pi-session-runtime.mjs";
import { describeTestHooks } from "../runtime/test-hooks.mjs";
import { ExtensionRegistry } from "../runtime/extension-registry.mjs";
import { RuntimeStore } from "./store.mjs";
import { RuntimeService } from "./service.mjs";

/**
 * If the host process inherited DEEPSEEK_API_KEY from its environment,
 * remove it before any ModelRuntime/provider code can consult it, so the
 * provider's own env-var auth fallback (a pi-ai behavior this host does not
 * control) never silently activates. Logged once, key value never logged.
 */
function stripInheritedProviderEnv(logger) {
  const removed = [];
  for (const name of ["DEEPSEEK_API_KEY", "OPENAI_API_KEY"]) {
    if (process.env[name] !== undefined) {
      delete process.env[name];
      removed.push(name);
    }
  }
  if (removed.length) logger(`startup: removed inherited env var(s) so provider auth cannot fall back to them: ${removed.join(", ")}`);
  return removed;
}

/** One local runtime owner, independent of HTTP and the frontend. Future
 * orchestration calls service commands; it does not become a store/JSONL writer.
 * extensionCatalog is the composition seam for trusted domain adapters.
 */
export async function createRuntime({ dataDir, extensionCatalog = [], fakeResponder = null, responder = null,
  budget, compaction, asyncTaskAdapters = [], logger = () => {} } = {}) {
  if (typeof dataDir !== "string" || !dataDir.trim()) throw new TypeError("dataDir is required");
  dataDir = path.resolve(dataDir);
  const removedEnvVars = stripInheritedProviderEnv(logger);
  for (const line of describeTestHooks()) logger(line);
  const store = await new RuntimeStore({ dataDir, logger }).open();
  let fakeProvider, registry, service;
  const workCore = new WorkCoreOwner(dataDir);
  try {
    fakeProvider = await createFakeOpenAiProvider({ host: "127.0.0.1", port: 0, responder, fakeResponder });
    const modelRuntime = await createIsolatedModelRuntime();
    registry = new ExtensionRegistry({ catalog: extensionCatalog, dataDir, store, workCore: workCore.client });
    await registry.initialize();
    service = new RuntimeService({ store, fakeProvider, extensionRegistry: registry, workCore: workCore.client, dataDir, modelRuntime, budget, compaction, asyncTaskAdapters, logger });
    await service.initialize();
    let closePromise;
    return {
      service, store, registry, fakeProvider, modelRuntime, dataDir, removedEnvVars,
      close() {
        closePromise ??= (async () => {
          try { await service.close(); }
          finally {
            try { await registry.dispose(); }
            finally {
              try { await fakeProvider.close(); }
              finally { await workCore.close(); await store.close(); }
            }
          }
        })();
        return closePromise;
      },
    };
  } catch (error) {
    await service?.close().catch(() => {});
    await registry?.dispose().catch(() => {});
    await fakeProvider?.close().catch(() => {});
    await workCore.close().catch(() => {});
    await store.close().catch(() => {});
    throw error;
  }
}
