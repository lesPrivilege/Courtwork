import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/* Source-visible check only: this is not a JS parser or security sandbox. It
 * covers quoted static imports, export-from declarations, and literal dynamic
 * imports without escaped specifiers. Computed imports, eval, regex grammar, package export maps, and
 * runtime filesystem/network authority need separate contracts. */
const APP_ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));

function maskCommentsAndStrings(source) {
  const masked = source.split("");
  const blank = (start, end) => {
    for (let index = start; index < end; index += 1)
      if (source[index] !== "\n" && source[index] !== "\r") masked[index] = " ";
  };
  for (let index = 0; index < source.length;) {
    if (source.startsWith("//", index)) {
      const end = source.indexOf("\n", index + 2);
      blank(index, end < 0 ? source.length : end);
      index = end < 0 ? source.length : end;
      continue;
    }
    if (source.startsWith("/*", index)) {
      const close = source.indexOf("*/", index + 2);
      const end = close < 0 ? source.length : close + 2;
      blank(index, end);
      index = end;
      continue;
    }
    if (!["'", '"', "`"].includes(source[index])) {
      index += 1;
      continue;
    }
    const quote = source[index++];
    let end = index;
    while (end < source.length && source[end] !== quote) {
      end += source[end] === "\\" ? 2 : 1;
    }
    blank(index, end);
    if (end < source.length) end += 1;
    index = end;
  }
  return masked.join("");
}

function readLiteral(source, quoteIndex) {
  const quote = source[quoteIndex];
  let value = "";
  for (let index = quoteIndex + 1; index < source.length; index += 1) {
    if (source[index] === quote) return value;
    if (source[index] === "\\") return null; // Escaped specifiers require a real parser.
    if (quote === "`" && source[index] === "$" && source[index + 1] === "{") return null;
    value += source[index];
  }
  return null;
}

function scanImports(source, sourcePath = "<inline>") {
  const masked = maskCommentsAndStrings(source);
  const edges = [];
  const collect = (kind, pattern) => {
    for (const match of masked.matchAll(pattern)) {
      const quoteIndex = match.index + match[0].length - 1;
      const specifier = readLiteral(source, quoteIndex);
      if (specifier === null) continue;
      edges.push({ kind, source: sourcePath, line: source.slice(0, match.index).split("\n").length, specifier, start: match.index });
    }
  };
  collect("static", /\bimport\s*(?:["'`])/g);
  collect("static", /\bimport\b[^;]*?\bfrom\s*(?:["'`])/g);
  collect("export-from", /\bexport\b[^;]*?\bfrom\s*(?:["'`])/g);
  collect("dynamic", /\bimport\s*\(\s*(?:["'`])/g);
  return edges.sort((left, right) => left.start - right.start);
}

function resolveSpecifier(sourcePath, specifier) {
  if (specifier.startsWith(".")) {
    const from = path.resolve(APP_ROOT, sourcePath);
    const targetAbsolute = path.resolve(path.dirname(from), specifier);
    const target = targetAbsolute === APP_ROOT ? "." : toPosix(path.relative(APP_ROOT, targetAbsolute));
    const inside = targetAbsolute === APP_ROOT || targetAbsolute.startsWith(`${APP_ROOT}${path.sep}`);
    return { kind: "relative", inside, target };
  }
  if (specifier.startsWith("/")) return { kind: "absolute", inside: false, target: specifier };
  return { kind: "package", inside: false, target: null };
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function inTree(target, directory) {
  return target === directory || target.startsWith(`${directory}/`);
}

function boundaryViolations(edges, scope) {
  const violations = [];
  for (const edge of edges) {
    const resolved = resolveSpecifier(edge.source, edge.specifier);
    const allowed = scope === "core"
      ? resolved.kind === "package" ? edge.specifier.startsWith("node:") : resolved.kind === "relative" && resolved.inside && inTree(resolved.target, "core")
      : scope === "runtime"
        ? resolved.kind === "package" || resolved.kind === "relative" && resolved.inside && !inTree(resolved.target, "domains") && !inTree(resolved.target, "extensions")
        : scope === "renderer"
          ? resolved.kind === "absolute" ? edge.specifier.startsWith("/web/") : resolved.kind === "relative" && resolved.inside && inTree(resolved.target, "web")
          : (() => { throw new TypeError(`unknown boundary scope: ${scope}`); })();
    if (!allowed) violations.push({ ...edge, ...resolved, scope });
  }
  return violations;
}

async function mjsFiles(relativeDirectory) {
  const entries = (await readdir(path.join(APP_ROOT, relativeDirectory), { withFileTypes: true }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const files = [];
  for (const entry of entries) {
    const relative = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...await mjsFiles(relative));
    else if (entry.isFile() && entry.name.endsWith(".mjs")) files.push(toPosix(relative));
  }
  return files;
}

async function rendererFiles() {
  const entries = (await readdir(path.join(APP_ROOT, "extensions"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).sort((left, right) => left.name.localeCompare(right.name));
  const files = [];
  for (const entry of entries) {
    const relative = path.join("extensions", entry.name, "renderer.mjs");
    try { await readFile(path.join(APP_ROOT, relative), "utf8"); files.push(toPosix(relative)); }
    catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  return files;
}

async function scanFiles(files) {
  return (await Promise.all(files.map(async (file) => scanImports(await readFile(path.join(APP_ROOT, file), "utf8"), file)))).flat();
}

function hasEdge(edges, source, specifier, kind = "static") {
  return edges.some((edge) => edge.source === source && edge.specifier === specifier && edge.kind === kind);
}

test("the limited scanner recognizes imports while ignoring comments and strings", () => {
  const source = [
    `// import "./comment.mjs";`, `/* export * from "./block-comment.mjs"; */`, `const text = "import('./string.mjs')";`,
    `import { value as imported } from "./value.mjs";`, `import "./side-effect.mjs";`, `export { imported } from "../exported.mjs";`,
    `export * from "../star.mjs";`, `const loaded = import("../dynamic.mjs");`, "const template = import(`../template.mjs`);",
    `const computed = import(prefix + "/computed.mjs");`,
  ].join("\n");
  assert.deepEqual(scanImports(source).map(({ kind, specifier }) => ({ kind, specifier })), [
    { kind: "static", specifier: "./value.mjs" }, { kind: "static", specifier: "./side-effect.mjs" },
    { kind: "export-from", specifier: "../exported.mjs" }, { kind: "export-from", specifier: "../star.mjs" },
    { kind: "dynamic", specifier: "../dynamic.mjs" }, { kind: "dynamic", specifier: "../template.mjs" },
  ]);
});

test("legal and forbidden synthetic edges exercise all approved boundaries", () => {
  const legal = [
    ["core", "core/deep/probe.mjs", `import "../../core/client.mjs"; import "node:path";`],
    ["runtime", "runtime/deep/probe.mjs", `import "../../runtime/control-plane.mjs"; import "@modelcontextprotocol/client";`],
    ["renderer", "extensions/synthetic/renderer.mjs", `import "/web/ui-controls.mjs"; export * from "/web/surface-modules.mjs";`],
  ];
  for (const [scope, sourcePath, source] of legal) assert.equal(boundaryViolations(scanImports(source, sourcePath), scope).length, 0, `${scope} legal probe failed`);

  const forbidden = [
    ["core", "core/deep/probe.mjs", [`import "../../server/index.mjs";`, `export * from "../../runtime/control-plane.mjs";`, `await import("../../extensions/catalog.mjs");`, `import "@earendil-works/pi-ai";`, `import "@modelcontextprotocol/client";`]],
    ["runtime", "runtime/deep/probe.mjs", [`import "../../domains/inbound-nda/index.mjs";`, `export * from "../../extensions/catalog.mjs";`, `await import("../../domains/inbound-nda/rules.mjs");`]],
    ["renderer", "extensions/synthetic/renderer.mjs", [`import "../../core/owner.mjs";`, `export * from "../../server/runtime.mjs";`, `await import("../../domains/inbound-nda/index.mjs");`, `import "node:fs";`, `import "@modelcontextprotocol/client";`]],
  ];
  for (const [scope, sourcePath, lines] of forbidden) {
    const edges = scanImports(lines.join("\n"), sourcePath);
    const violations = boundaryViolations(edges, scope);
    assert.equal(edges.length, lines.length, `${scope} every negative probe must be scanned`);
    for (const edge of edges) assert.ok(violations.some((violation) => violation.specifier === edge.specifier), `${scope} must reject ${edge.specifier}`);
  }
  const bypass = resolveSpecifier("core/deep/probe.mjs", "../../server/index.mjs");
  assert.equal(bypass.inside, true);
  assert.equal(bypass.target, "server/index.mjs", "relative targets must resolve from the importing file");
});

test("the current Core, runtime, renderer, and composition-root graph obeys ownership", async () => {
  const [coreFiles, runtimeFiles, rendererPaths, serverFiles, extensionFiles, domainFiles] = await Promise.all([
    mjsFiles("core"), mjsFiles("runtime"), rendererFiles(), mjsFiles("server"), mjsFiles("extensions"), mjsFiles("domains"),
  ]);
  const [coreEdges, runtimeEdges, rendererEdges, serverEdges, extensionEdges, domainEdges] = await Promise.all([
    scanFiles(coreFiles), scanFiles(runtimeFiles), scanFiles(rendererPaths), scanFiles(serverFiles), scanFiles(extensionFiles), scanFiles(domainFiles),
  ]);
  const violations = [...boundaryViolations(coreEdges, "core"), ...boundaryViolations(runtimeEdges, "runtime"), ...boundaryViolations(rendererEdges, "renderer")];
  assert.equal(violations.length, 0, `production import boundary violations: ${JSON.stringify(violations)}`);
  assert.ok(coreEdges.length && runtimeEdges.length && rendererPaths.length, "all three production graphs must be scanned");
  assert.ok(hasEdge(coreEdges, "core/owner.mjs", "./client.mjs"));
  assert.ok(hasEdge(runtimeEdges, "runtime/source-resolver.mjs", "./control-plane.mjs"));
  assert.ok(hasEdge(runtimeEdges, "runtime/control-tools.mjs", "./workspace-tools.mjs"));
  assert.ok(hasEdge(rendererEdges, "extensions/inbound-nda/renderer.mjs", "/web/ui-controls.mjs"));
  const catalogImporters = [...new Set([...serverEdges, ...extensionEdges, ...domainEdges]
    .filter((edge) => resolveSpecifier(edge.source, edge.specifier).target === "extensions/catalog.mjs").map((edge) => edge.source))];
  assert.deepEqual(catalogImporters, ["server/index.mjs"], "only the composition root may import the installed catalog");
  assert.ok(hasEdge(serverEdges, "server/index.mjs", "../extensions/catalog.mjs"));
  assert.ok(hasEdge(serverEdges, "server/index.mjs", "./cli.mjs", "dynamic"));
});
