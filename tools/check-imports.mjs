#!/usr/bin/env node
// AMD import graph check. FAIL (exit 1): broken relative deps, cycles, orphans not allowlisted.
// Usage: node tools/check-imports.mjs [--json] [--verbose]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph, findCycles, moduleOf, isVendored, JS_ROOT_REPO_REL } from './lib/amd-graph.mjs';

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const verbose = args.has('--verbose');
const ALLOWLIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'orphan-allowlist.txt');

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      i++;
      if (glob[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST)) return [];
  return fs.readFileSync(ALLOWLIST, 'utf8').split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const [pattern, ...rest] = l.split(/\s+#/);
      const comment = rest.join(' ').trim();
      return { pattern: pattern.trim(), keep: /^keep\b/i.test(comment), re: globToRegExp(pattern.trim().replace(/\/$/, '/**')) };
    });
}

const graph = buildGraph();
const cycles = findCycles(graph);
const repoPath = (rel) => `${JS_ROOT_REPO_REL}/${rel}`;
const allowlist = loadAllowlist();

const orphans = graph.files.filter((f) => !graph.reachable.has(f) && !isVendored(f));
const vendored = graph.files.filter(isVendored).map((f) => ({
  file: f,
  status: graph.reachable.has(f) ? 'referenced' : 'unreferenced',
}));
const orphanResults = orphans.map((f) => ({ file: f, allowedBy: (allowlist.find((a) => a.re.test(repoPath(f))) || {}).pattern || null }));
const failingOrphans = orphanResults.filter((o) => !o.allowedBy);
const existingRepoPaths = graph.files.map(repoPath);
const staleAllowlist = allowlist.filter((a) => !a.keep && !existingRepoPaths.some((p) => a.re.test(p)));

const pair = new Map();
const coreToDashboard = [];
for (const e of graph.edges) {
  const from = moduleOf(e.from);
  const to = moduleOf(e.to);
  if (from !== to) {
    const k = `${from} -> ${to}`;
    pair.set(k, (pair.get(k) || 0) + 1);
  }
  if (e.from.startsWith('core/') && e.to.startsWith('dashboard/')) coreToDashboard.push({ from: e.from, to: e.to, line: e.line });
}
const crossModule = [...pair].map(([k, count]) => ({ edge: k, count })).sort((a, b) => b.count - a.count || a.edge.localeCompare(b.edge));
const coreToDashboardModules = new Map();
for (const e of coreToDashboard) {
  const k = `${moduleOf(e.from)} -> ${moduleOf(e.to)}`;
  coreToDashboardModules.set(k, (coreToDashboardModules.get(k) || 0) + 1);
}

const failures = [];
if (graph.broken.length) failures.push(`${graph.broken.length} broken import(s)`);
if (graph.missingSpecRoots.length) failures.push(`${graph.missingSpecRoots.length} spec.json root(s) missing`);
if (cycles.length) failures.push(`${cycles.length} cycle(s)`);
if (failingOrphans.length) failures.push(`${failingOrphans.length} non-allowlisted orphan(s)`);
const pass = failures.length === 0;

const summary = {
  files: graph.files.length,
  edges: graph.edges.length,
  staticEdges: graph.edges.filter((e) => !e.dynamic).length,
  dynamicEdges: graph.edges.filter((e) => e.dynamic).length,
  broken: graph.broken.length,
  cycles: cycles.length,
  orphans: orphans.length,
  orphansAllowlisted: orphanResults.length - failingOrphans.length,
  orphansFailing: failingOrphans.length,
  vendored: vendored.length,
  vendoredUnreferenced: vendored.filter((v) => v.status === 'unreferenced').length,
  coreToDashboardEdges: coreToDashboard.length,
  roots: graph.roots,
};

if (asJson) {
  console.log(JSON.stringify({
    pass, failures, summary,
    broken: graph.broken, cycles, orphans: orphanResults, vendored,
    staleAllowlist: staleAllowlist.map((a) => a.pattern),
    nonPathDeps: graph.nonPathDeps, noDefine: graph.noDefine, nonLiteralDepArrays: graph.nonLiteralArrays,
    dynamicEdges: graph.edges.filter((e) => e.dynamic),
    missingSpecRoots: graph.missingSpecRoots,
    crossModule, coreToDashboard,
  }, null, 2));
  process.exit(pass ? 0 : 1);
}

const out = (s = '') => console.log(s);
out(`check-imports: ${summary.files} files, ${summary.edges} edges (${summary.staticEdges} static + ${summary.dynamicEdges} dynamic require), roots: ${graph.roots.join(', ')}`);
out(`  broken: ${summary.broken}  cycles: ${summary.cycles}  orphans: ${summary.orphans} (${summary.orphansAllowlisted} allowlisted, ${summary.orphansFailing} failing)  vendored: ${summary.vendored} (${summary.vendoredUnreferenced} unreferenced)`);
for (const b of graph.broken) out(`FAIL broken import: ${repoPath(b.from)}:${b.line} "${b.spec}" -> ${b.resolved} (not found)`);
for (const m of graph.missingSpecRoots) out(`FAIL spec.json root not found: "${m.spec}" -> ${m.resolved}`);
for (const c of cycles) out(`FAIL cycle (${c.length} files): ${c.join(' <-> ')}`);
for (const o of failingOrphans) out(`FAIL orphan not in tools/orphan-allowlist.txt: ${repoPath(o.file)}`);
for (const o of orphanResults.filter((x) => x.allowedBy)) out(`orphan (allowlisted): ${o.file}`);
for (const v of vendored) out(`vendored ${v.status}: ${v.file}${v.status === 'unreferenced' ? ' (no define/require reference found; may be loaded by Cognos/other mechanism)' : ''}`);
for (const a of staleAllowlist) out(`WARNING stale allowlist entry (matches no file): ${a.pattern}`);
if (graph.noDefine.length) out(`WARNING ${graph.noDefine.length} non-vendored file(s) without define(): ${graph.noDefine.join(', ')}`);
if (graph.nonLiteralArrays.length) out(`WARNING non-literal entries in define() dep array: ${graph.nonLiteralArrays.join(', ')}`);
const bare = graph.nonPathDeps.filter((d) => d.kind !== 'special');
out(`non-path deps ignored: ${graph.nonPathDeps.length} (${bare.length} plugin/bare id)`);
for (const d of graph.nonPathDeps.filter((x) => verbose || x.kind !== 'special')) out(`  ${d.kind} "${d.spec}" in ${d.from}:${d.line}`);
if (verbose) for (const e of graph.edges.filter((x) => x.dynamic)) out(`  dynamic require edge: ${e.from}:${e.line} -> ${e.to}`);

out(`cross-module edges: ${crossModule.length} distinct module pairs, ${crossModule.reduce((s, x) => s + x.count, 0)} edges (top ${verbose ? 'all' : 15}):`);
for (const x of crossModule.slice(0, verbose ? undefined : 15)) out(`  ${String(x.count).padStart(4)}  ${x.edge}`);
if (coreToDashboard.length) {
  out(`WARNING core -> dashboard edges (known layering violations): ${coreToDashboard.length} edges in ${coreToDashboardModules.size} module pairs`);
  for (const [k, count] of [...coreToDashboardModules].sort((a, b) => b[1] - a[1])) out(`  ${String(count).padStart(4)}  ${k}`);
  if (verbose) for (const e of coreToDashboard) out(`    ${e.from}:${e.line} -> ${e.to}`);
}
out(pass ? 'check-imports: PASS' : `check-imports: FAIL (${failures.join('; ')})`);
process.exit(pass ? 0 : 1);
