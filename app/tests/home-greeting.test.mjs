import assert from "node:assert/strict";
import { test } from "node:test";
import { homeGreeting, addressOf, bucketOf, localMoment, greetingIsStale, GREETING_CORPUS, corpusFor, dateLineOf } from "../web/home-greeting.mjs";

const LIN = { fullName: "林知远", preferredName: "知远", workAddress: "林律师", role: "律师", language: "zh-CN", timeZone: "Asia/Shanghai" };
const EN = GREETING_CORPUS.en;
const at = (iso) => new Date(iso);

test("greeting · the address chain is work address → preferred name → full name → none; Home composes nothing", () => {
  assert.equal(addressOf(LIN), "林律师");
  assert.equal(addressOf({ ...LIN, workAddress: "  " }), "知远");
  assert.equal(addressOf({ fullName: "林知远" }), "林知远");
  assert.equal(addressOf({}), null);
  assert.equal(addressOf(null), null);
});

test("greeting · buckets follow the profile's zone, not the machine's", () => {
  assert.equal(bucketOf(6), "morning"); assert.equal(bucketOf(11), "morning"); assert.equal(bucketOf(12), "afternoon");
  assert.equal(bucketOf(17), "evening"); assert.equal(bucketOf(21), "night"); assert.equal(bucketOf(2), "night");
  const shanghai = localMoment(at("2026-09-16T01:30:00Z"), "Asia/Shanghai");
  assert.deepEqual([shanghai.hour, shanghai.bucket, shanghai.date, shanghai.weekday], [9, "morning", "2026-09-16", 3]);
  const utc = localMoment(at("2026-09-16T01:30:00Z"), "UTC");
  assert.equal(utc.bucket, "night");
  assert.equal(localMoment(at("2026-09-16T01:30:00Z"), "Not/AZone").bucket, localMoment(at("2026-09-16T01:30:00Z"), null).bucket, "an unknown zone falls back instead of throwing");
});

test("greeting · one sentence per bucket, fixed by the seed; the address is used verbatim; weekday and session lines are eligible only when true", () => {
  const monday = at("2026-09-14T01:00:00Z"); // 09:00 Shanghai, Monday
  const a = homeGreeting({ profile: LIN, now: monday, session: null, seedBase: "u1" });
  const b = homeGreeting({ profile: LIN, now: at("2026-09-14T03:59:00Z"), session: null, seedBase: "u1" });
  assert.equal(a.text, b.text, "the same bucket keeps the same line");
  assert.equal(a.bucket, "morning");
  const morningLines = EN.filter((e) => e.buckets.includes("morning") && (!e.weekdays || e.weekdays.includes(1)) && !e.session).map((e) => e.text.replaceAll("{name}", "林律师"));
  assert.ok(morningLines.includes(a.text), a.text);
  const afternoon = homeGreeting({ profile: LIN, now: at("2026-09-14T06:00:00Z"), session: null, seedBase: "u1" });
  assert.equal(afternoon.bucket, "afternoon");
  assert.notEqual(afternoon.seed, a.seed);
  for (let d = 14; d < 21; d++) {
    const g = homeGreeting({ profile: LIN, now: at(`2026-09-${d}T01:00:00Z`), session: null, seedBase: "u1" });
    if (g.weekday !== 1) assert.ok(!g.text.includes("A new week"), "the Monday line stays on Monday");
    if (![0, 6].includes(g.weekday)) assert.ok(!g.text.includes("Weekend"));
  }
  const fresh = homeGreeting({ profile: LIN, now: monday, session: "fresh", seedBase: "u1" });
  assert.ok(EN.some((e) => e.text.replaceAll("{name}", "林律师") === fresh.text));
  const noSession = homeGreeting({ profile: LIN, now: monday, session: null, seedBase: "u1" });
  assert.ok(!/Welcome back|left off|one thing/.test(noSession.text), "session lines need their state");
});

test("greeting · without an address the plain form is used, never a placeholder; the corpus is English only for now", () => {
  const g = homeGreeting({ profile: { language: "zh-CN", timeZone: "Asia/Shanghai" }, now: at("2026-09-16T01:00:00Z"), seedBase: "u1" });
  assert.ok(!g.text.includes("{name}") && !g.text.includes(", ."), g.text);
  assert.equal(g.address, null);
  const en = homeGreeting({ profile: { workAddress: "Counsel Lin", language: "en", timeZone: "Asia/Shanghai" }, now: at("2026-09-16T01:00:00Z"), seedBase: "u1" });
  assert.ok(EN.some((e) => e.text.replaceAll("{name}", "Counsel Lin") === en.text), en.text);
  assert.equal(corpusFor("zh-TW"), EN, "no translated corpus is projected yet");
  assert.equal(corpusFor(undefined), EN);
  assert.deepEqual(Object.keys(GREETING_CORPUS), ["en"]);
  for (const entry of EN) { assert.ok(entry.plain && !entry.plain.includes("{name}")); assert.ok(/^[A-Za-z0-9 ,.?'{}]+$/.test(entry.text), entry.text); }
});

test("greeting · a new choice is due only on a new bucket, a new day, or a long absence", () => {
  const first = homeGreeting({ profile: LIN, now: at("2026-09-16T01:00:00Z"), seedBase: "u1" });
  assert.equal(greetingIsStale(first, { now: at("2026-09-16T02:00:00Z"), timeZone: "Asia/Shanghai" }), false);
  assert.equal(greetingIsStale(first, { now: at("2026-09-16T04:30:00Z"), timeZone: "Asia/Shanghai" }), true, "bucket changed");
  assert.equal(greetingIsStale(first, { now: at("2026-09-17T01:00:00Z"), timeZone: "Asia/Shanghai" }), true, "day changed");
  assert.equal(greetingIsStale(first, { now: at("2026-09-16T02:00:00Z"), timeZone: "Asia/Shanghai", lastActiveAt: at("2026-09-16T01:00:00Z").getTime() }), true, "an hour away is a return");
  assert.equal(greetingIsStale(first, { now: at("2026-09-16T01:10:00Z"), timeZone: "Asia/Shanghai", lastActiveAt: at("2026-09-16T01:00:00Z").getTime() }), false);
  assert.equal(greetingIsStale(null, {}), true);
});

test("greeting · the date line is set under the sentence: weekday, month and day in the profile's zone, English, no year", () => {
  assert.equal(dateLineOf(at("2026-09-16T01:30:00Z"), "Asia/Shanghai"), "Wednesday, September 16");
  assert.equal(dateLineOf(at("2026-09-16T23:30:00Z"), "Asia/Shanghai"), "Thursday, September 17", "the day rolls with the zone, not with UTC");
  const g = homeGreeting({ profile: LIN, now: at("2026-09-16T01:30:00Z"), seedBase: "u1" });
  assert.equal(g.dateLine, "Wednesday, September 16");
  assert.equal(dateLineOf(at("2026-09-16T01:30:00Z"), "Not/AZone"), dateLineOf(at("2026-09-16T01:30:00Z"), null));
});

