#!/usr/bin/env node
// Parses every .js under KDB3/js with node:vm (script mode, as Cognos loads them). FAIL on any syntax error.
// Handles UTF-8 BOM and UTF-16 (LE/BE BOM) files. Usage: node tools/check-syntax.mjs [--json]
import path from 'node:path';
import vm from 'node:vm';
import { JS_ROOT, JS_ROOT_REPO_REL, listJsFiles, readSource } from './lib/amd-graph.mjs';

const asJson = process.argv.includes('--json');
const files = listJsFiles();
const failures = [];

function locate(err) {
  const lines = String(err.stack || '').split('\n');
  const m = /:(\d+)$/.exec(lines[0] || '');
  const line = m ? Number(m[1]) : 0;
  const caret = lines.findIndex((l) => /^\s*\^+/.test(l));
  const col = caret >= 0 ? lines[caret].indexOf('^') + 1 : 0;
  return { line, col };
}

for (const rel of files) {
  const abs = path.join(JS_ROOT, rel);
  try {
    new vm.Script(readSource(abs), { filename: abs });
  } catch (err) {
    failures.push({ file: `${JS_ROOT_REPO_REL}/${rel}`, ...locate(err), message: err.message });
  }
}

const parsed = files.length - failures.length;
if (files.length === 0) failures.push({ file: JS_ROOT_REPO_REL, line: 0, col: 0, message: 'no .js files found' });
const pass = failures.length === 0;
if (asJson) {
  console.log(JSON.stringify({ pass, checked: files.length, passed: parsed, failures }, null, 2));
} else {
  for (const f of failures) console.log(`${f.file}:${f.line}:${f.col} ${f.message}`);
  console.log(`check-syntax: ${pass ? 'PASS' : 'FAIL'} (${parsed}/${files.length} files parsed)`);
}
process.exit(pass ? 0 : 1);
