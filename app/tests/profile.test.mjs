import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { test } from "node:test";
import { boot, reopen } from "./helpers.mjs";

test("profile · the Host holds one profile with a revision; saves are CAS, fields are bounded, the address chain is the client's to read", async () => {
  const h = await boot();
  try {
    const initial = (await h.api("GET", "/profile")).json.profile;
    assert.equal(initial.revision, 0);
    assert.deepEqual(initial.avatar, { kind: "initial", dataUrl: null });
    assert.equal(initial.language, "en");
    assert.equal(initial.preferences.contextualGreetings, true);
    const saved = await h.api("PUT", "/profile", { expectedRevision: 0, fullName: "林知远", preferredName: "知远", workAddress: "林律师", role: "律师", organization: "衡山律师事务所", language: "zh-CN", timeZone: "Asia/Shanghai" });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    assert.equal(saved.json.profile.revision, 1);
    assert.equal(saved.json.profile.workAddress, "林律师");
    assert.ok(saved.json.profile.updatedAt);
    const stale = await h.api("PUT", "/profile", { expectedRevision: 0, workAddress: "陈律师" });
    assert.equal(stale.status, 409); assert.equal(stale.json.error.code, "profile_conflict");
    assert.equal((await h.api("GET", "/profile")).json.profile.workAddress, "林律师", "a stale save writes nothing");
    const unknown = await h.api("PUT", "/profile", { expectedRevision: 1, nickname: "x" });
    assert.equal(unknown.status, 400);
    const tooLong = await h.api("PUT", "/profile", { expectedRevision: 1, workAddress: "x".repeat(41) });
    assert.equal(tooLong.status, 400);
    const badLanguage = await h.api("PUT", "/profile", { expectedRevision: 1, language: "fr" });
    assert.equal(badLanguage.status, 400);
    const badZone = await h.api("PUT", "/profile", { expectedRevision: 1, timeZone: "Mars/Olympus" });
    assert.equal(badZone.status, 400);
    const badAvatar = await h.api("PUT", "/profile", { expectedRevision: 1, avatar: { kind: "photo", dataUrl: "data:text/html;base64,PGI+" } });
    assert.equal(badAvatar.status, 400);
    const huge = await h.api("PUT", "/profile", { expectedRevision: 1, avatar: { kind: "photo", dataUrl: "data:image/png;base64," + "A".repeat(300 * 1024) } });
    assert.equal(huge.status, 413);
    const portrait = await h.api("PUT", "/profile", { expectedRevision: 1, avatar: { kind: "portrait" }, preferences: { contextualGreetings: false } });
    assert.equal(portrait.status, 200, JSON.stringify(portrait.json));
    assert.deepEqual(portrait.json.profile.avatar, { kind: "portrait", dataUrl: null });
    assert.equal(portrait.json.profile.preferences.contextualGreetings, false);
    assert.equal(portrait.json.profile.revision, 2);
    const cleared = await h.api("PUT", "/profile", { expectedRevision: 2, workAddress: "", timeZone: null });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.json.profile.workAddress, ""); assert.equal(cleared.json.profile.timeZone, null);

    const dataDir = h.dataDir;
    await h.runtime.close();
    const again = await reopen(dataDir);
    try {
      const after = (await again.api("GET", "/profile")).json.profile;
      assert.equal(after.revision, 3); assert.equal(after.fullName, "林知远"); assert.equal(after.avatar.kind, "portrait");
    } finally { await again.runtime.close(); }
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("account · the fixture states an entitlement and stable rows, names its unavailable actions, and invents no usage number", async () => {
  const h = await boot();
  try {
    await h.api("PUT", "/profile", { expectedRevision: 0, workAddress: "林律师" });
    const account = (await h.api("GET", "/account")).json.account;
    assert.equal(account.fixture, true);
    assert.deepEqual(account.plan, { name: "Max", status: "active", description: "For sustained work with Courtwork.", cycle: "Monthly", renewsOn: "2026-10-16" });
    assert.equal(account.identity.address, "林律师");
    assert.deepEqual(account.unavailable, ["sign_out", "sign_out_all", "delete_account", "manage_plan"]);
    const text = JSON.stringify(account).toLowerCase();
    for (const word of ["token", "quota", "usage", "percent", "tps"]) assert.ok(!text.includes(word), `no ${word} in the account fixture`);
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});
