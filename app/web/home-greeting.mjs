/* Home identity · the greeting is a light "you are back at work" line, not a
 * slogan slot and not a carousel. Grammar: address × language × time bucket ×
 * weekday × session state → one sentence, fixed for the whole bucket. The
 * address comes from Profile (work address → preferred name → full name →
 * none); Home keeps no nickname of its own. Nothing here reads Activity,
 * Attention or any module: those may fail or load late without touching this
 * line. */

export const TIME_BUCKETS = Object.freeze(["morning", "afternoon", "evening", "night"]);

/** Local calendar facts for a moment in a time zone. Falls back to the
 * runtime's own zone when the zone is unknown to it. */
export function localMoment(now = new Date(), timeZone = null) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", ...(timeZone ? { timeZone } : {}) }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  }
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour")) % 24;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { hour, weekday, date: `${get("year")}-${get("month")}-${get("day")}`, bucket: bucketOf(hour) };
}

export function bucketOf(hour) {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** Which name Home uses. The chain is fixed; Home never composes one. */
export function addressOf(profile) {
  for (const key of ["workAddress", "preferredName", "fullName"]) {
    const value = profile?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/* Each entry: which buckets, an optional weekday condition, an optional session
 * condition, and the two forms — with an address and without one. Sentences
 * are short, work-facing, and never discover features. */
const ZH = [
  { buckets: ["morning"], text: "早上好，{name}。", plain: "早上好。" },
  { buckets: ["morning"], text: "上午好，{name}。", plain: "上午好。" },
  { buckets: ["morning"], text: "新的一天，{name}。", plain: "新的一天。" },
  { buckets: ["morning"], text: "今天从哪里开始？", plain: "今天从哪里开始？" },
  { buckets: ["morning"], weekdays: [1], text: "新的一周，{name}。", plain: "新的一周。" },
  { buckets: ["morning"], weekdays: [5], text: "周五了，{name}。", plain: "周五了。" },
  { buckets: ["morning"], weekdays: [0, 6], text: "周末好，{name}。", plain: "周末好。" },
  { buckets: ["afternoon"], text: "下午好，{name}。", plain: "下午好。" },
  { buckets: ["afternoon"], text: "又见面了，{name}。", plain: "又见面了。" },
  { buckets: ["afternoon"], text: "继续吗，{name}？", plain: "继续吗？" },
  { buckets: ["afternoon"], text: "今天还有什么要处理？", plain: "今天还有什么要处理？" },
  { buckets: ["evening"], text: "晚上好，{name}。", plain: "晚上好。" },
  { buckets: ["evening"], text: "继续一会儿？", plain: "继续一会儿？" },
  { buckets: ["evening"], text: "收尾，还是开一件新的？", plain: "收尾，还是开一件新的？" },
  { buckets: ["night"], text: "夜深了，{name}。", plain: "夜深了。" },
  { buckets: ["night"], text: "还在工作，{name}？", plain: "还在工作？" },
  { buckets: ["night"], text: "今晚想先处理哪一件？", plain: "今晚想先处理哪一件？" },
  { buckets: TIME_BUCKETS, session: "return", text: "欢迎回来，{name}。", plain: "欢迎回来。" },
  { buckets: TIME_BUCKETS, session: "recent", text: "继续上次的工作？", plain: "继续上次的工作？" },
  { buckets: TIME_BUCKETS, session: "fresh", text: "从一件事开始，{name}。", plain: "从一件事开始。" },
];

const EN = [
  { buckets: ["morning"], text: "Good morning, {name}.", plain: "Good morning." },
  { buckets: ["morning"], text: "A new day, {name}.", plain: "A new day." },
  { buckets: ["morning"], text: "Where does today start?", plain: "Where does today start?" },
  { buckets: ["morning"], weekdays: [1], text: "A new week, {name}.", plain: "A new week." },
  { buckets: ["morning"], weekdays: [5], text: "Friday, {name}.", plain: "Friday." },
  { buckets: ["morning"], weekdays: [0, 6], text: "Weekend, {name}.", plain: "Weekend." },
  { buckets: ["afternoon"], text: "Good afternoon, {name}.", plain: "Good afternoon." },
  { buckets: ["afternoon"], text: "Back again, {name}.", plain: "Back again." },
  { buckets: ["afternoon"], text: "What is left for today?", plain: "What is left for today?" },
  { buckets: ["evening"], text: "Good evening, {name}.", plain: "Good evening." },
  { buckets: ["evening"], text: "A little longer?", plain: "A little longer?" },
  { buckets: ["evening"], text: "Wrap up, or open something new?", plain: "Wrap up, or open something new?" },
  { buckets: ["night"], text: "Late, {name}.", plain: "Late." },
  { buckets: ["night"], text: "Still working, {name}?", plain: "Still working?" },
  { buckets: ["night"], text: "What comes first tonight?", plain: "What comes first tonight?" },
  { buckets: TIME_BUCKETS, session: "return", text: "Welcome back, {name}.", plain: "Welcome back." },
  { buckets: TIME_BUCKETS, session: "recent", text: "Continue where you left off?", plain: "Continue where you left off?" },
  { buckets: TIME_BUCKETS, session: "fresh", text: "Start with one thing, {name}.", plain: "Start with one thing." },
];

export const GREETING_CORPUS = Object.freeze({ zh: ZH, en: EN });

/** FNV-1a over the seed: deterministic, tiny, no crypto needed. */
export function seedHash(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

export function corpusFor(language) {
  return String(language || "").toLowerCase().startsWith("zh") ? ZH : EN;
}

/**
 * The one line for this moment. `session` is one of `fresh` (nothing recorded
 * yet), `recent` (there is recent work), `return` (a long absence ended), or
 * null; `seed` is what keeps the choice fixed for a bucket (caller passes
 * user + local date + bucket).
 */
export function homeGreeting({ profile = null, now = new Date(), session = null, seedBase = "local" } = {}) {
  const moment = localMoment(now, profile?.timeZone || null);
  const name = addressOf(profile);
  const corpus = corpusFor(profile?.language);
  const eligible = corpus.filter((entry) =>
    entry.buckets.includes(moment.bucket)
    && (!entry.weekdays || entry.weekdays.includes(moment.weekday))
    && (!entry.session || entry.session === session)
    && (name || entry.plain));
  const seed = `${seedBase}|${moment.date}|${moment.bucket}|${session ?? ""}`;
  const pick = eligible[seedHash(seed) % eligible.length];
  const text = name ? pick.text.replaceAll("{name}", name) : pick.plain;
  return { text, bucket: moment.bucket, date: moment.date, weekday: moment.weekday, seed, address: name };
}

/** Whether a new choice is due: a new bucket, a new day, or a long absence. */
export function greetingIsStale(previous, { now = new Date(), timeZone = null, lastActiveAt = null, idleMs = 30 * 60 * 1000 } = {}) {
  if (!previous) return true;
  const moment = localMoment(now, timeZone);
  if (previous.bucket !== moment.bucket || previous.date !== moment.date) return true;
  return Boolean(lastActiveAt && now.getTime() - lastActiveAt >= idleMs);
}
