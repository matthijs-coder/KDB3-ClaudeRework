#!/usr/bin/env node
// Inventory and (optional) removal of `typeof x === "function"` guards around published APIs and services (Phase 2 W13).
//
//   node tools/w13-guards.mjs inventory [--out <file.md>]   every guard: file, line, expression, classification
//   node tools/w13-guards.mjs remove [--module <path prefix>] [--apply]
//                                                          class (1) guards in that module with their registrar proof;
//                                                          without --apply it only prints what would change
//
// Class 1: the guarded expression is `_KDB.api.<owner>.<method>` / `_KDB.services.<service>.<method>` (directly or through
//   a local alias assigned from it) and the real manifest registers that owner with that function property
//   unconditionally (proved by running `lifecycle.registerAll` of the real manifest on a fake world: the property exists
//   after register, before any mount). Only the `typeof` conjunct is dropped; null checks of the owner object stay.
// Class 2: optional dependency, DOM/browser API, thenable, callback option, Cognos host facet: keep.
// Class 3: everything unclear (dynamic owner, unresolved alias, owner not registered): keep.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "./lib/amd-loader.mjs";
import { JS_ROOT } from "./lib/amd-graph.mjs";

const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {} };

class FakeElement {
  constructor() { this.children = []; this.style = {}; this.attributes = {}; this.dataset = {}; this.parentNode = null; this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } }; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return name in this.attributes ? this.attributes[name] : null; }
  removeAttribute() {}
  appendChild(child) { return child; }
  insertBefore(child) { return child; }
  removeChild() {}
  addEventListener() {}
  removeEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  contains() { return false; }
}

// A real KDB instance (constructor) on a fake DOM plus the real manifest and lifecycle modules; nothing is registered yet.
export function createWorld() {
  const doc = {
    createElement: () => new FakeElement(), querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
    addEventListener() {}, removeEventListener() {}, head: new FakeElement(), body: new FakeElement(),
    location: { href: "https://h/bi/x/y", protocol: "https:", host: "h", origin: "https://h" }
  };
  const win = { top: {}, document: doc, addEventListener() {}, removeEventListener() {}, location: doc.location };
  const overrides = { "core/libraries/jstree.min.js": {}, "core/libraries/jspdf.umd.min.js": {}, "core/libraries/html2canvas.min.js": {} };
  const options = { stubs: { console: quiet, document: doc, window: win, navigator: {} }, modules: { jquery: () => {} }, overrides };
  const KDB = loadAmd(path.join(JS_ROOT, "KDB.js"), options);
  const manifest = loadAmd(path.join(JS_ROOT, "bootstrap/featureManifest.js"), options);
  const lifecycle = loadAmd(path.join(JS_ROOT, "core/bootstrap/lifecycle.js"), options);
  const kdb = new KDB({ parent: new FakeElement(), content: {}, features: {} });
  return { kdb, manifest, lifecycle };
}

// Registers the real manifest on that world and returns { surface: { api: {key: [fn names]}, services }, entryByApi }.
export function probeRegistrars() {
  const { kdb, manifest, lifecycle } = createWorld();
  lifecycle.registerAll(kdb, manifest);
  const surface = { api: {}, services: {} };
  for (const ns of ["api", "services"]) {
    for (const key of Object.keys(kdb[ns])) {
      const value = kdb[ns][key];
      surface[ns][key] = value && typeof value === "object" ? Object.keys(value).filter((name) => typeof value[name] === "function") : [];
    }
  }
  const entryByApi = {};
  for (const entry of manifest.entries) if (entry.api) entryByApi[entry.api] = entry.name;
  return { surface, entryByApi };
}

function walk(dir, out) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) { if (name.name !== "libraries") walk(full, out); }
    else if (name.name.endsWith(".js")) out.push(full);
  }
  return out;
}

const GUARD = /typeof\s+((?:\([^()]*\)|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]]*\])*))\s*(===|!==)\s*"function"/g;

const DOM_METHODS = /\.(closest|querySelector|querySelectorAll|matches|getAttribute|contains|cloneNode|getElementById|getComputedStyle|addEventListener|removeEventListener|disconnect|observe|abort|escape|replace|getEntriesByType|focus|scrollIntoView|insertAdjacentElement|remove)$/;
const BROWSER_ROOT = /^(window|document|CSS|MutationObserver|requestAnimationFrame|cancelAnimationFrame|performance|AbortController|ResizeObserver|IntersectionObserver|setTimeout|navigator|console|Promise|jQuery|\$)\b/;
const HOST_ROOT = /(Facet|facet|cognosAPI|cognosHost|content|Content|widgetsContent|slot|_item|widget|dashboardApi)\b/;
const CALLBACK_ROOT = /^(_?options?|opts?|_?opts|_callbacks?|callbacks?|_listener|listener|_callback|callback|cb|handler|_handler|fn|_fn|_handle|handle|_value|value|_ctx|_context|ctx|context|entry|_entry|hooks|_hooks|deps|_deps|adapter|_adapter|result|outcome|pending|_signal|signal|controller|observer|_target|target)\b/;

function classify(expr, line, table, probe) {
  const root = expr.replace(/^\(/, "").split(/[.[]/)[0];
  const method = expr.includes(".") ? expr.split(".").pop().replace(/\]$/, "") : null;
  let direct = expr.match(/^_KDB\.(api|services)\.(\w+)\.(\w+)$/);
  let ns = null;
  let owner = null;
  let via = "direct";
  if (direct) { ns = direct[1]; owner = direct[2]; }
  else if (/^\w+\.\w+$/.test(expr)) {
    const alias = resolveAlias(table, root, line);
    if (alias) { ns = alias.ns; owner = alias.owner; via = "alias " + root + " (line " + alias.line + ")"; }
  }
  if (ns && owner && owner !== "*") {
    const methods = probe.surface[ns][owner];
    if (!methods) return { cls: 3, reason: ns + "." + owner + " is not registered by the manifest (" + via + ")" };
    if (!methods.includes(method)) return { cls: 3, reason: ns + "." + owner + "." + method + " is not a function property after register (" + via + ")" };
    return { cls: 1, reason: "registered unconditionally", ns, owner, method, via };
  }
  if (ns && owner === "*") return { cls: 3, reason: "dynamic owner (" + via + ")" };
  if (BROWSER_ROOT.test(expr) || DOM_METHODS.test(expr)) return { cls: 2, reason: "DOM/browser API" };
  if (/\.(then|catch|finally)$/.test(expr)) return { cls: 2, reason: "thenable detection" };
  if (HOST_ROOT.test(root) || /^_KDB\.cognosAPI/.test(expr)) return { cls: 2, reason: "Cognos host facet/content method" };
  if (CALLBACK_ROOT.test(root)) return { cls: 2, reason: "callback/option/handle parameter" };
  if (/^_KDB\.(events|utils)\./.test(expr)) return { cls: 2, reason: "bus/util injected into _KDB (test seam)" };
  if (/^_KDB\.(api|services)/.test(expr) || table.aliases[root]) return { cls: 3, reason: "api/service-like but not a direct owner method" };
  return { cls: 3, reason: "unclear" };
}

// Alias assignments per variable name with their line: { name: [{ line, ns, owner }] }. `owner` is "*" for a dynamic
// key, null for an assignment that is not a plain `_KDB.api.<owner>` / `_KDB.services.<service>` read (then the alias is
// unresolved at that point). A local helper `function readX(_KDB) { return ..._KDB.api.<owner>... }` resolves calls to it.
function collectAliases(text) {
  const lines = text.split("\n");
  const helpers = {};
  for (let i = 0; i < lines.length; i += 1) {
    const fn = lines[i].match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (!fn) continue;
    const body = lines.slice(i, i + 8).join(" ");
    const ret = body.match(/return\s+[^;]*?\.(api|services)\.([A-Za-z_$][\w$]*)\b/);
    if (ret && !/\[/.test(ret[0])) helpers[fn[1]] = { ns: ret[1], owner: ret[2] };
  }
  const aliases = {};
  const params = {};
  lines.forEach((line, index) => {
    const fn = line.match(/function\s*[\w$]*\s*\(([^)]*)\)/);
    if (fn) fn[1].split(",").map((p) => p.trim()).filter(Boolean).forEach((p) => { (params[p] = params[p] || []).push(index + 1); });
    const arrow = line.match(/\(([^)]*)\)\s*=>/);
    if (arrow) arrow[1].split(",").map((p) => p.trim()).filter(Boolean).forEach((p) => { (params[p] = params[p] || []).push(index + 1); });
    const assign = line.match(/(?:^|[;\s(])(?:var|let|const)?\s*([A-Za-z_$][\w$]*)\s*=\s*([^;]+)/);
    if (!assign || /^(?:[A-Za-z_$][\w$]*)\s*(===|==)/.test(assign[2])) return;
    const name = assign[1];
    let rhs = assign[2];
    let entry = { line: index + 1, ns: null, owner: null };
    const direct = rhs.match(/\.(api|services)\.([A-Za-z_$][\w$]*)\b/);
    const dynamic = rhs.match(/\.(api|services)\[\s*([^\]]+)\]/);
    const call = rhs.match(/^\s*([A-Za-z_$][\w$]*)\(/);
    if (direct && !/\w\(/.test(rhs.slice(0, rhs.indexOf(direct[0])))) entry = { line: index + 1, ns: direct[1], owner: direct[2] };
    else if (dynamic) entry = { line: index + 1, ns: dynamic[1], owner: /^["']\w+["']$/.test(dynamic[2].trim()) ? dynamic[2].trim().slice(1, -1) : "*" };
    else if (call && helpers[call[1]]) entry = { line: index + 1, ns: helpers[call[1]].ns, owner: helpers[call[1]].owner };
    (aliases[name] = aliases[name] || []).push(entry);
  });
  return { aliases, params };
}

function resolveAlias(table, name, line) {
  const candidates = (table.aliases[name] || []).filter((entry) => entry.line <= line);
  if (!candidates.length) return null;
  const nearest = candidates[candidates.length - 1];
  const shadowing = (table.params[name] || []).some((paramLine) => paramLine > nearest.line && paramLine <= line);
  if (shadowing || !nearest.ns) return null;
  return nearest;
}

export function inventory(probe) {
  const rows = [];
  for (const file of walk(JS_ROOT, []).sort()) {
    const rel = path.relative(JS_ROOT, file).split(path.sep).join("/");
    const text = fs.readFileSync(file, "utf8");
    const table = collectAliases(text);
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      GUARD.lastIndex = 0;
      let m;
      while ((m = GUARD.exec(line))) {
        const verdict = classify(m[1], index + 1, table, probe);
        rows.push({ file: rel, line: index + 1, expr: m[1], op: m[2], source: line.trim(), ...verdict });
      }
    });
  }
  return rows;
}

function summarise(rows) {
  const out = { total: rows.length, byClass: { 1: 0, 2: 0, 3: 0 }, positive: 0, negative: 0 };
  for (const row of rows) { out.byClass[row.cls] += 1; if (row.op === "===") out.positive += 1; else out.negative += 1; }
  return out;
}

function toMarkdown(rows, probe) {
  const summary = summarise(rows);
  const lines = [];
  lines.push("# W13 sweep D: `typeof x === \"function\"` inventory", "");
  lines.push("Generated by `node tools/w13-guards.mjs inventory`. Occurrences in `KDB3/js` without the vendored `core/libraries`.", "");
  lines.push("| | count |", "|---|---|");
  lines.push("| all occurrences | " + summary.total + " (`===`: " + summary.positive + ", `!==`: " + summary.negative + ") |");
  lines.push("| class 1 (registered unconditionally, removable) | " + summary.byClass[1] + " |");
  lines.push("| class 2 (keep: optional dependency, DOM, thenable, callback, host) | " + summary.byClass[2] + " |");
  lines.push("| class 3 (keep: unclear) | " + summary.byClass[3] + " |", "");
  lines.push("## Registrar surface (real manifest registered on a fake world)", "");
  lines.push("| `_KDB.api` key | manifest entry | function properties after `registerAll` |", "|---|---|---|");
  for (const key of Object.keys(probe.surface.api)) lines.push("| " + key + " | " + (probe.entryByApi[key] || "(authoring/properties)") + " | " + probe.surface.api[key].join(", ") + " |");
  lines.push("", "| `_KDB.services` key | function properties after `registerAll` |", "|---|---|");
  for (const key of Object.keys(probe.surface.services)) lines.push("| " + key + " | " + probe.surface.services[key].join(", ") + " |");
  lines.push("", "## Per-file rows (file:line, guarded expression, class, reason)", "");
  lines.push("| file:line | guarded expression | class | reason |", "|---|---|---|---|");
  for (const row of rows) {
    lines.push("| " + row.file + ":" + row.line + " | `" + row.expr.replace(/\|/g, "\\|") + "` " + (row.op === "!==" ? "(!==)" : "") + " | " + row.cls + " | " + row.reason + " |");
  }
  return lines.join("\n") + "\n";
}

// Rewrites that keep the null check of the owner object and drop only the typeof conjunct.
function rewriteLine(line, row) {
  const expr = row.expr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const owner = row.expr.replace(/\.\w+$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    [new RegExp("!" + owner + "\\s*\\|\\|\\s*typeof " + expr + " !== \"function\"\\s*\\|\\|\\s*"), "!" + row.expr.replace(/\.\w+$/, "") + " || "],
    [new RegExp("!" + owner + "\\s*\\|\\|\\s*typeof " + expr + " !== \"function\""), "!" + row.expr.replace(/\.\w+$/, "")],
    [new RegExp(owner + "\\s*&&\\s*typeof " + expr + " === \"function\"\\s*&&\\s*"), row.expr.replace(/\.\w+$/, "") + " && "],
    [new RegExp(owner + "\\s*&&\\s*typeof " + expr + " === \"function\""), row.expr.replace(/\.\w+$/, "")]
  ];
  for (const [re, replacement] of patterns) {
    if (re.test(line)) return line.replace(re, replacement);
  }
  return null;
}

function run() {
  const [command, ...rest] = process.argv.slice(2);
  const probe = probeRegistrars();
  const rows = inventory(probe);
  if (command === "inventory") {
    const outIndex = rest.indexOf("--out");
    const md = toMarkdown(rows, probe);
    if (outIndex >= 0) fs.writeFileSync(rest[outIndex + 1], md);
    else process.stdout.write(md);
    console.error(JSON.stringify(summarise(rows)));
    return;
  }
  if (command === "remove") {
    const moduleIndex = rest.indexOf("--module");
    const prefix = moduleIndex >= 0 ? rest[moduleIndex + 1] : "";
    const apply = rest.includes("--apply");
    const picked = rows.filter((row) => row.cls === 1 && row.file.startsWith(prefix) && row.file !== "KDB.js" && !row.file.startsWith("core/bootstrap/"));
    const byFile = new Map();
    for (const row of picked) byFile.set(row.file, [...(byFile.get(row.file) || []), row]);
    let removed = 0;
    let manual = 0;
    for (const [file, fileRows] of byFile) {
      const full = path.join(JS_ROOT, file);
      const lines = fs.readFileSync(full, "utf8").split("\n");
      for (const row of fileRows) {
        const before = lines[row.line - 1];
        const after = rewriteLine(before, row);
        const proof = row.ns + "." + row.owner + "." + row.method + " (" + row.via + "): manifest registers it, function after register";
        if (after == null || after === before) { console.log("MANUAL  " + file + ":" + row.line + "  " + row.expr + "  | " + before.trim()); manual += 1; continue; }
        console.log("REMOVE  " + file + ":" + row.line + "  " + proof + "\n    - " + before.trim() + "\n    + " + after.trim());
        lines[row.line - 1] = after;
        removed += 1;
      }
      if (apply) fs.writeFileSync(full, lines.join("\n"));
    }
    console.log((apply ? "applied" : "dry run") + ": " + removed + " removals, " + manual + " manual, prefix '" + prefix + "'");
    return;
  }
  if (command === "proof") {
    const out = rest[rest.indexOf("--out") + 1];
    const keep = rest.includes("--keep") ? rest[rest.indexOf("--keep") + 1].split(",") : [];
    const proofs = new Map();
    for (const row of rows.filter((r) => r.cls === 1 && r.file !== "KDB.js" && !r.file.startsWith("core/bootstrap/") && !keep.includes(r.file))) {
      const key = row.ns + "." + row.owner + "." + row.method;
      proofs.set(key, [...(proofs.get(key) || []), row.file]);
    }
    const table = [...proofs].map(([key, files]) => ({ guard: key, files: [...new Set(files)].sort() })).sort((a, b) => a.guard.localeCompare(b.guard));
    fs.writeFileSync(out, JSON.stringify(table, null, 2) + "\n");
    console.log(table.length + " registered members relied on by removed guards -> " + out);
    return;
  }
  console.error("usage: w13-guards.mjs inventory [--out f] | remove [--module prefix] [--apply] | proof --out f [--keep file,file]");
  process.exit(2);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) run();
