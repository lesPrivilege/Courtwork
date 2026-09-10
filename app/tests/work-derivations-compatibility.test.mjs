import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { CoreClient } from "../core/client.mjs";
import { boot } from "./helpers.mjs";

/* BE41-A compatibility evidence. These are independent synthetic fixtures;
 * they do not exercise a provider and do not claim product acceptance. */
const source = (id, version = 1) => ({
  id,
  version,
  text: `${id}-${version}`,
  digest: createHash("sha256").update(`${id}-${version}`).digest("hex"),
});

async function matter(core, id, project = "p", contractVersion = "contract-1") {
  await core.createMatter({
    matterId: id,
    title: id,
    source: source(`${id}-s`),
    contractVersion,
  });
  await core.call("claim_work", {
    matter_id: id,
    project_id: project,
    extension_id: "evidence-memo",
  });
}

const query = (core, opts = {}) => core.call("work_derivations", {
  project_id: "p",
  limit: 25,
  offset: 0,
  snapshot_ref: null,
  ...opts,
});

async function fixture(name, fn) {
  const dataDir = await mkdtemp(path.join(tmpdir(), `cw-be41-compat-${name}-`));
  const core = new CoreClient({ dataDir });
  try {
    return await fn(core, dataDir);
  } finally {
    await core.close();
    await rm(dataDir, { recursive: true, force: true });
  }
}

function sql(db, code, ...args) {
  const result = spawnSync("python3", ["-c", code, db, ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function derivationsPath(projectId, params = {}) {
  const queryParams = new URLSearchParams({ projectId, ...params });
  return `/work-derivations?${queryParams}`;
}

test("BE41-A HTTP snapshot binds project identity and rejects off-page changes", async () => {
  const host = await boot({ configureFakeCredential: false });
  try {
    const otherProject = await host.api("POST", "/projects", { name: "other-project" });
    assert.equal(otherProject.status, 200);
    const otherId = otherProject.json.project.id;
    const core = host.runtime.service.workCore;
    await matter(core, "http-a", host.projectId);
    await matter(core, "http-b", host.projectId);
    await matter(core, "http-other", otherId);

    const first = await host.api("GET", derivationsPath(host.projectId, { limit: "1" }));
    assert.equal(first.status, 200);
    assert.match(first.json.snapshotRef, /^core-state:[a-f0-9]{64}$/);

    const crossProject = await host.api("GET", derivationsPath(otherId, {
      snapshotRef: first.json.snapshotRef,
    }));
    assert.equal(crossProject.status, 409);
    assert.equal(crossProject.json.error.code, "derivations_snapshot_changed");

    await core.call("replace_sources", {
      matter_id: "http-b",
      sources: [source("http-b-s", 2)],
      revision: 2,
    });
    const offPage = await host.api("GET", derivationsPath(host.projectId, {
      limit: "1",
      offset: "1",
      snapshotRef: first.json.snapshotRef,
    }));
    assert.equal(offPage.status, 409);
    assert.equal(offPage.json.error.code, "derivations_snapshot_changed");
  } finally {
    await host.runtime.close();
  }
});

test("BE41-A HTTP keeps a top-level snapshot token on an empty beyond-total page", async () => {
  const host = await boot({ configureFakeCredential: false });
  try {
    await matter(host.runtime.service.workCore, "empty-page", host.projectId);
    const first = await host.api("GET", derivationsPath(host.projectId, {
      limit: "1",
      offset: "99",
    }));
    assert.equal(first.status, 200);
    assert.deepEqual(first.json.matters, []);
    assert.equal(first.json.page.total, 1);
    assert.match(first.json.snapshotRef, /^core-state:[a-f0-9]{64}$/);
    assert.equal(first.json.scopeRef, `project:${host.projectId}`);

    const repeated = await host.api("GET", derivationsPath(host.projectId, {
      limit: "1",
      offset: "99",
      snapshotRef: first.json.snapshotRef,
    }));
    assert.equal(repeated.status, 200);
    assert.deepEqual(repeated.json.matters, []);
    assert.equal(repeated.json.snapshotRef, first.json.snapshotRef);
    assert.deepEqual(repeated.json.page, { limit: 1, offset: 99, total: 1 });
  } finally {
    await host.runtime.close();
  }
});

test("BE41-A preserves FILE/Matter version zero and reports source revision zero as partial", () =>
  fixture("version-zero", async (core, dataDir) => {
    await matter(core, "file-zero", "p", "se-file-memo-v1");
    const observed = await query(core);
    const file = observed.matters.find((item) => item.matterId === "file-zero");
    assert.equal(file.version, 0);
    assert.equal(file.sourceVersion, 1);
    assert.equal(file.availability, "observed");
    assert.deepEqual(file.derivations, { total: 0, current: 0, stale: 0, byStatus: [] });

    await matter(core, "source-revision-zero");
    await core.close();
    sql(dataDir + "/state.db", `
import sqlite3, sys
db = sqlite3.connect(sys.argv[1])
for table in ("matter", "source_set", "source_history"):
    if table == "matter":
        db.execute("UPDATE matter SET source_version=0 WHERE id='source-revision-zero'")
    else:
        db.execute(f"UPDATE {table} SET revision=0 WHERE matter_id='source-revision-zero'")
db.commit()
db.close()
`);
    const after = await query(core);
    const zero = after.matters.find((item) => item.matterId === "source-revision-zero");
    assert.equal(zero.version, 0);
    assert.equal(zero.sourceVersion, 0);
    assert.equal(zero.availability, "partial");
    assert.equal(zero.reason, "source_history_unavailable");
    assert.deepEqual(zero.derivations, { total: null, current: null, stale: null, byStatus: [] });
    assert.deepEqual(zero.staleRefs, []);
    assert.equal(zero.sourceSetChange, null);
  }));

test("BE41-A staleRefs thresholds 19/20/21 retain exact refs and truncation", () =>
  fixture("stale-ref-thresholds", async (core) => {
    for (const count of [19, 20, 21]) {
      const id = `refs-${count}`;
      await matter(core, id);
      await core.createRun({
        runId: `${id}-run`,
        matterId: id,
        baseVersion: 0,
        sourceVersion: 1,
        contractVersion: "contract-1",
        instruction: "synthetic threshold fixture",
      });
      for (let index = 0; index < count; index += 1) {
        const candidateId = `${id}-candidate-${String(index).padStart(2, "0")}`;
        await core.saveCandidate({
          matterId: id,
          runId: `${id}-run`,
          payload: {
            id: candidateId,
            matter_id: id,
            run_id: `${id}-run`,
            base_version: 0,
            source_version: 1,
            contract_version: "contract-1",
            artifact_text: "synthetic",
            evidence: [],
            obligations: [],
          },
        });
      }
      await core.updateRun({ runId: `${id}-run`, status: "completed", admissionOpen: false });
      await core.call("replace_sources", {
        matter_id: id,
        sources: [source(`${id}-s`, 2)],
        revision: 2,
      });
    }

    const result = await query(core);
    for (const count of [19, 20, 21]) {
      const row = result.matters.find((item) => item.matterId === `refs-${count}`);
      const expected = Array.from({ length: Math.min(count, 20) }, (_, index) =>
        `refs-${count}-candidate-${String(index).padStart(2, "0")}`,
      );
      assert.equal(row.derivations.stale, count);
      assert.deepEqual(row.staleRefs.map((ref) => ref.candidateId), expected);
      assert.equal(row.staleRefs.length, Math.min(count, 20));
      assert.equal(row.staleRefsTruncated, count > 20);
      for (const ref of row.staleRefs) {
        assert.equal(ref.candidateSourceVersion, 1);
        assert.equal(ref.matterSourceVersion, 2);
      }
    }
  }));
