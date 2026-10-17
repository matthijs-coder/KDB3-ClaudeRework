#!/usr/bin/env node
// AMD import graph check. FAIL (exit 1): broken relative deps, cycles, orphans not allowlisted, layering violations
// (core -> dashboard / workflows, dashboard -> workflows, imports of bootstrap/ outside KDB.js; tools/lib/layering.mjs).
// Usage: node tools/check-imports.mjs [--json] [--verbose]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph, findCycles, moduleOf, isVendored, JS_ROOT_REPO_REL } from './lib/amd-graph.mjs';
import { LAYERING_RULES, findLayeringViolations, findWorkflowsToDashboard } from './lib/layering.mjs';

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
  file: repoPath(f),
  status: graph.reachable.has(f) ? 'referenced' : 'unreferenced',
}));
const orphanResults = orphans.map((f) => ({ file: repoPath(f), allowedBy: (allowlist.find((a) => a.re.test(repoPath(f))) || {}).pattern || null }));
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
  if (e.from.startsWith('core/') && e.to.startsWith('dashboard/')) coreToDashboard.push({ from: repoPath(e.from), to: repoPath(e.to), line: e.line });
}
const crossModule = [...pair].map(([k, count]) => ({ edge: k, count })).sort((a, b) => b.count - a.count || a.edge.localeCompare(b.edge));

const layeringRaw = findLayeringViolations(graph.edges);
const layeringViolations = layeringRaw.map((e) => ({ rule: e.rule, from: repoPath(e.from), to: repoPath(e.to), line: e.line }));
const layeringCounts = Object.fromEntries(LAYERING_RULES.map((r) => [r.id, layeringRaw.filter((e) => e.rule === r.id).length]));
const workflowsToDashboard = findWorkflowsToDashboard(graph.edges).map((e) => ({ from: repoPath(e.from), to: repoPath(e.to), line: e.line }));

const failures = [];
if (graph.files.length === 0) failures.push(`no .js files found under ${JS_ROOT_REPO_REL}`);
if (graph.roots.length === 0) failures.push('no entry roots found (KDB.js / spec.json)');
if (graph.broken.length) failures.push(`${graph.broken.length} broken import(s)`);
if (graph.missingSpecRoots.length) failures.push(`${graph.missingSpecRoots.length} spec.json root(s) missing`);
if (cycles.length) failures.push(`${cycles.length} cycle(s)`);
if (failingOrphans.length) failures.push(`${failingOrphans.length} non-allowlisted orphan(s)`);
for (const rule of LAYERING_RULES) {
  if (layeringCounts[rule.id]) failures.push(`${layeringCounts[rule.id]} layering violation(s): ${rule.id}`);
}
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
  layeringViolations: layeringViolations.length,
  layering: layeringCounts,
  workflowsToDashboardEdges: workflowsToDashboard.length,
  roots: graph.roots.map(repoPath),
};

if (asJson) {
  console.log(JSON.stringify({
    pass, failures, summary,
    broken: graph.broken.map((b) => ({ ...b, from: repoPath(b.from) })),
    cycles: cycles.map((c) => ({ size: c.size, path: c.path.map(repoPath), members: c.members.map(repoPath) })), orphans: orphanResults, vendored,
    staleAllowlist: staleAllowlist.map((a) => a.pattern),
    nonPathDeps: graph.nonPathDeps.map((d) => ({ ...d, from: repoPath(d.from) })),
    noDefine: graph.noDefine.map(repoPath), nonLiteralDepArrays: graph.nonLiteralArrays.map(repoPath),
    dynamicEdges: graph.edges.filter((e) => e.dynamic).map((e) => ({ ...e, from: repoPath(e.from), to: repoPath(e.to) })),
    missingSpecRoots: graph.missingSpecRoots,
    crossModule, coreToDashboard, layeringViolations, workflowsToDashboard,
  }, null, 2));
  process.exit(pass ? 0 : 1);
}

const out = (s = '') => console.log(s);
out(`check-imports: ${summary.files} files, ${summary.edges} edges (${summary.staticEdges} static + ${summary.dynamicEdges} dynamic require), roots: ${graph.roots.map(repoPath).join(', ')}`);
out(`  broken: ${summary.broken}  cycles: ${summary.cycles}  orphans: ${summary.orphans} (${summary.orphansAllowlisted} allowlisted, ${summary.orphansFailing} failing)  vendored: ${summary.vendored} (${summary.vendoredUnreferenced} unreferenced)`);
for (const b of graph.broken) out(`FAIL broken import: ${repoPath(b.from)}:${b.line} "${b.spec}" -> ${JS_ROOT_REPO_REL}/${b.resolved} (not found)`);
for (const m of graph.missingSpecRoots) out(`FAIL spec.json root not found: "${m.spec}" -> ${JS_ROOT_REPO_REL}/${m.resolved}`);
for (const c of cycles) {
  out(`FAIL cycle (${c.size} files): ${c.path.map(repoPath).join(' -> ')}`);
  if (c.size > c.path.length - 1) {
    const rest = c.members.filter((m) => !c.path.includes(m));
    out(`  ...and ${rest.length} more member(s) in this cycle group: ${rest.slice(0, 20).map(repoPath).join(', ')}${rest.length > 20 ? ', ...' : ''}`);
  }
}
for (const o of failingOrphans) out(`FAIL orphan not in tools/orphan-allowlist.txt: ${o.file}`);
for (const v of layeringViolations) out(`FAIL layering (${v.rule}): ${v.from}:${v.line} imports ${v.to}`);
for (const o of orphanResults.filter((x) => x.allowedBy)) out(`orphan (allowlisted): ${o.file}`);
for (const v of vendored) out(`vendored ${v.status}: ${v.file}${v.status === 'unreferenced' ? ' (no define/require reference found; may be loaded by Cognos/other mechanism)' : ''}`);
for (const a of staleAllowlist) out(`WARNING stale allowlist entry (matches no file): ${a.pattern}`);
if (graph.noDefine.length) out(`WARNING ${graph.noDefine.length} non-vendored file(s) without define(): ${graph.noDefine.map(repoPath).join(', ')}`);
if (graph.nonLiteralArrays.length) out(`WARNING non-literal entries in define() dep array: ${graph.nonLiteralArrays.map(repoPath).join(', ')}`);
const bare = graph.nonPathDeps.filter((d) => d.kind !== 'special');
out(`non-path deps ignored: ${graph.nonPathDeps.length} (${bare.length} plugin/bare id)`);
for (const d of graph.nonPathDeps.filter((x) => verbose || x.kind !== 'special')) out(`  ${d.kind} "${d.spec}" in ${repoPath(d.from)}:${d.line}`);
if (verbose) for (const e of graph.edges.filter((x) => x.dynamic)) out(`  dynamic require edge: ${repoPath(e.from)}:${e.line} -> ${repoPath(e.to)}`);

out(`cross-module edges: ${crossModule.length} distinct module pairs, ${crossModule.reduce((s, x) => s + x.count, 0)} edges (top ${verbose ? 'all' : 15}):`);
for (const x of crossModule.slice(0, verbose ? undefined : 15)) out(`  ${String(x.count).padStart(4)}  ${x.edge}`);
out(`layering: ${LAYERING_RULES.map((r) => `${r.id} ${layeringCounts[r.id]}`).join(', ')} (all must be 0); workflows -> dashboard ${workflowsToDashboard.length} (reported)`);
if (verbose) for (const e of workflowsToDashboard) out(`  workflows -> dashboard: ${e.from}:${e.line} -> ${e.to}`);
out(pass ? 'check-imports: PASS' : `check-imports: FAIL (${failures.join('; ')})`);
process.exit(pass ? 0 : 1);
