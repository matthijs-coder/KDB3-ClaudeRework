#!/usr/bin/env node
// Size report for KDB3/js (report only, exit 0). code lines = lines holding at least one token
// (non-blank, non-comment). Vendored core/libraries/** is listed separately.
// Usage: node tools/line-report.mjs [--json] [--module <path-prefix>] [--include-vendor] [--top N]
import path from 'node:path';
import { JS_ROOT, listJsFiles, readSource, tokenize, makeLineIndex, moduleOf, isVendored } from './lib/amd-graph.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const asJson = flag('--json');
const prefix = (value('--module') || '').replace(/^\/+|\/+$/g, '');
const top = Number(value('--top') || 30);
const LONG = 180;

function measure(rel) {
  const src = readSource(path.join(JS_ROOT, rel));
  const lines = src.split(/\r\n|\n|\r/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const lineAt = makeLineIndex(src);
  const codeLines = new Set();
  for (const t of tokenize(src)) {
    const a = lineAt(t.s).line;
    const b = t.e > t.s ? lineAt(t.e - 1).line : a;
    for (let l = a; l <= b; l++) codeLines.add(l);
  }
  let maxLen = 0;
  let long = 0;
  for (const l of lines) {
    if (l.length > maxLen) maxLen = l.length;
    if (l.length > LONG) long++;
  }
  return { file: rel, module: moduleOf(rel), vendored: isVendored(rel), total: lines.length, code: codeLines.size, maxLineLength: maxLen, longLines: long };
}

const all = listJsFiles().filter((f) => !prefix || f === prefix || f.startsWith(`${prefix}/`)).map(measure);
const vendor = all.filter((f) => f.vendored);
const files = flag('--include-vendor') ? all : all.filter((f) => !f.vendored);

const over = (n) => files.filter((f) => f.code > n).map((f) => ({ file: f.file, code: f.code }));
const modules = new Map();
for (const f of files) {
  const m = modules.get(f.module) || { module: f.module, files: 0, total: 0, code: 0 };
  m.files++; m.total += f.total; m.code += f.code;
  modules.set(f.module, m);
}
const sum = (k) => files.reduce((s, f) => s + f[k], 0);
const report = {
  filter: prefix || null,
  files: files.length,
  totalLines: sum('total'),
  codeLines: sum('code'),
  filesWithLongLines: files.filter((f) => f.longLines > 0).length,
  longLines: sum('longLines'),
  filesUnder30Lines: files.filter((f) => f.total < 30).length,
  filesUnder30CodeLines: files.filter((f) => f.code < 30).length,
  over400: over(400), over500: over(500), over800: over(800),
  top: [...files].sort((a, b) => b.code - a.code).slice(0, top),
  modules: [...modules.values()].sort((a, b) => b.code - a.code),
  vendor,
  perFile: files,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const out = (s = '') => console.log(s);
  out(`line-report${prefix ? ` [${prefix}]` : ''}: ${report.files} files, ${report.totalLines} total lines, ${report.codeLines} code lines`);
  out(`  files over 400 code lines: ${report.over400.length}   over 500: ${report.over500.length}   over 800: ${report.over800.length}`);
  out(`  files < 30 total lines: ${report.filesUnder30Lines}   (< 30 code lines: ${report.filesUnder30CodeLines})`);
  out(`  lines > ${LONG} chars: ${report.longLines} in ${report.filesWithLongLines} files`);
  out(`\ntop ${top} files by code lines (total / code / max line len / lines>${LONG}):`);
  for (const f of report.top) out(`  ${String(f.code).padStart(5)} code ${String(f.total).padStart(5)} total ${String(f.maxLineLength).padStart(5)} maxlen ${String(f.longLines).padStart(3)} long  ${f.file}${f.code > 800 ? '  [>800: justify]' : f.code > 500 ? '  [>500: review]' : f.code > 400 ? '  [>400]' : ''}`);
  out('\nper module (files / total lines / code lines):');
  for (const m of report.modules) out(`  ${String(m.files).padStart(4)} ${String(m.total).padStart(6)} ${String(m.code).padStart(6)}  ${m.module}`);
  if (vendor.length) {
    out('\nvendored (excluded from the numbers above unless --include-vendor):');
    for (const v of vendor) out(`  ${v.file}: ${v.total} lines, max line ${v.maxLineLength}`);
  }
}
