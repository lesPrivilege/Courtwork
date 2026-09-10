// Shared synchronous first-paint and module policy; no DOM or storage access.
(() => {
"use strict";
const LEGACY_SKIN_COLOR_TOKENS = [
  "--gray-1", "--gray-2", "--gray-3", "--gray-4", "--gray-5", "--gray-6",
  "--gray-7", "--gray-8", "--gray-9", "--gray-10", "--gray-11", "--gray-12",
  "--accent-3", "--accent-9", "--accent-10", "--accent-11",
  "--danger-3", "--danger-11", "--success-3", "--success-11",
  "--paper", "--float-s", "--frame-s", "--ink-max", "--on-accent-s",
];
const LEGACY_SKIN_NUMERIC_TOKENS = {
  "--alpha-ink": "triple",
  "--alpha-paper": "triple",
  "--shadow-alpha": "unit",
  "--glass-alpha": "unit",
  "--rim-alpha": "unit",
};
const SKIN_TOKEN_NAMES = new Set([
  ...LEGACY_SKIN_COLOR_TOKENS,
  ...Object.keys(LEGACY_SKIN_NUMERIC_TOKENS),
]);
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const TRIPLE = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/;
const UNIT = /^(?:0|1|0?\.\d{1,3})$/;
/* 危险形状先于逐行解析拒绝，因为它们说明这不是一个色阶，而是有人在往样式表里塞别的东西。 */
const FORBIDDEN = [
  ["url(", "url( is not a colour"],
  ["expression", "expression is not a colour"],
  ["@", "at-rules such as @import are not accepted"],
  ["</", "markup is not accepted"],
  ["\\", "escapes are not accepted"],
  ["javascript:", "a URL is not a colour"],
];
const SKIN_LIMIT = 8000;

/** 一组粘贴进来的 Tier S token。通过时返回可直接落进样式表的规范化文本；
 *  不通过时逐行返回问题，绝不「尽力而为」地应用一半。 */
function parseSkinTokens(input, legacy = false) {
  const required = legacy ? LEGACY_SKIN_COLOR_TOKENS : SKIN_COLOR_TOKENS;
  const names = legacy ? SKIN_TOKEN_NAMES : new Set(SKIN_COLOR_TOKENS);
  const errors = [];
  const text = typeof input === "string" ? input : "";
  if (!text.trim())
    return { ok: false, css: "", values: {}, missing: [], errors: [{ line: 0, text: "", reason: "Paste a Tier S token set first." }] };
  if (text.length > SKIN_LIMIT)
    return { ok: false, css: "", values: {}, missing: [], errors: [{ line: 0, text: "", reason: `A token set is at most ${SKIN_LIMIT} characters.` }] };
  const lowered = text.toLowerCase();
  for (const [needle, reason] of FORBIDDEN)
    if (lowered.includes(needle))
      errors.push({ line: 0, text: needle, reason });
  if (errors.length) return { ok: false, css: "", values: {}, missing: [], errors };
  /* 注释与外层的一对花括号先去掉，因为最自然的粘贴动作就是整块复制 styles.css 或
     skins/*.css 的一个 :root 块；行号保持不变，报错才指得回原文。 */
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    match.replace(/[^\n]/g, " "),
  );
  const opens = (stripped.match(/\{/g) || []).length;
  const closes = (stripped.match(/\}/g) || []).length;
  if (opens > 1 || closes > 1)
    return { ok: false, css: "", values: {}, missing: [], errors: [{ line: 0, text: "", reason: "Paste one block at a time; this text holds more than one." }] };
  if (opens !== closes)
    return { ok: false, css: "", values: {}, missing: [], errors: [{ line: 0, text: "", reason: "The block's braces do not match." }] };
  if (opens && (stripped.slice(0, stripped.indexOf("{")).trim() !== ":root" || stripped.slice(stripped.lastIndexOf("}") + 1).trim()))
    return { ok: false, css: "", values: {}, missing: [], errors: [{ line: 0, text: "", reason: "Use declarations or one :root block, with no surrounding CSS." }] };
  const body = opens
    ? stripped.slice(stripped.indexOf("{") + 1, stripped.lastIndexOf("}"))
    : stripped;
  const offset = opens ? stripped.slice(0, stripped.indexOf("{")).split("\n").length - 1 : 0;
  const values = {};
  body.split("\n").forEach((rawLine, index) => {
    const lineNumber = offset + index + 1;
    for (const piece of rawLine.split(";")) {
      const declaration = piece.trim();
      if (!declaration) continue;
      const match = /^(--[a-z0-9-]+)\s*:\s*(.+)$/i.exec(declaration);
      if (!match) {
        errors.push({ line: lineNumber, text: declaration, reason: "Not a `--token: value` declaration." });
        continue;
      }
      const [, name, value] = [match[0], match[1].toLowerCase(), match[2].trim()];
      if (!names.has(name)) {
        errors.push({ line: lineNumber, text: declaration, reason: `${name} is not a Tier S token name.` });
        continue;
      }
      const kind = LEGACY_SKIN_NUMERIC_TOKENS[name];
      if (!kind) {
        if (!HEX.test(value) || (!legacy && value.length === 9 && !value.toLowerCase().endsWith("ff"))) {
          errors.push({ line: lineNumber, text: declaration, reason: "Only a hex colour is accepted here." });
          continue;
        }
      } else if (kind === "triple") {
        const parts = TRIPLE.exec(value);
        if (!parts || parts.slice(1).some((part) => Number(part) > 255)) {
          errors.push({ line: lineNumber, text: declaration, reason: "This token is an r, g, b triple." });
          continue;
        }
      } else if (!UNIT.test(value)) {
        errors.push({ line: lineNumber, text: declaration, reason: "This token is a number between 0 and 1." });
        continue;
      }
      values[name] = value;
    }
  });
  const missing = required.filter((name) => !(name in values));
  if (missing.length && !errors.length)
    errors.push({
      line: 0,
      text: "",
      reason: `A skin is a whole scale. Missing: ${missing.join(", ")}.`,
    });
  if (errors.length) return { ok: false, css: "", values, missing, errors };
  const css = Object.entries(values)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
  return { ok: true, css, values, missing: [], errors: [] };
}


  // Versioned appearance projection. Legacy values are readable, never authority.
  const SKIN_POLICY_VERSION = 1;
  const SKIN_COLOR_TOKENS = Object.freeze(LEGACY_SKIN_COLOR_TOKENS.filter(name =>
    !name.startsWith("--danger-") && !name.startsWith("--success-")));
  function validateSkinTokens(input) { return parseSkinTokens(input); }
  function validateLegacySkinTokens(input) { return parseSkinTokens(input, true); }
  function projectSkin(input) {
    const modern = validateSkinTokens(input);
    const parsed = modern.ok ? modern : validateLegacySkinTokens(input);
    const sourceFormat = modern.ok ? "appearance-v1" : "legacy";
    if (!parsed.ok) return { ...parsed, version: SKIN_POLICY_VERSION, sourceFormat: "invalid", ignored: [] };
    const allowed = new Set(SKIN_COLOR_TOKENS);
    const ignored = Object.keys(parsed.values).filter(name => !allowed.has(name));
    const values = Object.fromEntries(Object.entries(parsed.values).filter(([name]) => allowed.has(name)));
    // Alpha in a legacy colour cannot bypass the fixed material recipe either.
    const transparent = Object.entries(values).filter(([, value]) => value.length === 9 && !value.toLowerCase().endsWith("ff"));
    if (transparent.length) return { ok: false, css: "", values: {}, missing: [], ignored, version: SKIN_POLICY_VERSION, sourceFormat,
      errors: transparent.map(([name]) => ({line: 0, text: name, reason: "Appearance colours must be opaque; the stored original is retained."})) };
    const css = Object.entries(values).map(([name,value]) => `${name}: ${value};`).join(" ");
    return { ...parsed, values, css, ignored, version: SKIN_POLICY_VERSION, sourceFormat };
  }
  globalThis.__cwSkinPolicy = Object.freeze({ SKIN_POLICY_VERSION, SKIN_COLOR_TOKENS,
    LEGACY_SKIN_COLOR_TOKENS: Object.freeze(LEGACY_SKIN_COLOR_TOKENS),
    LEGACY_SKIN_NUMERIC_TOKENS: Object.freeze(LEGACY_SKIN_NUMERIC_TOKENS),
    SKIN_LIMIT, validateSkinTokens, validateLegacySkinTokens, projectSkin });
})();
