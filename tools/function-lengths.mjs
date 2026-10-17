#!/usr/bin/env node
// Report of named `function` declarations/expressions longer than a threshold (default 60 lines), by physical lines.
// Usage: node tools/function-lengths.mjs [--min N] [--json] [--module <js-relative prefix>]
import path from 'node:path';
import { JS_ROOT, JS_ROOT_REPO_REL, listJsFiles, readSource, tokenize, makeLineIndex, isVendored } from './lib/amd-graph.mjs';

const argv = process.argv.slice(2);
const value = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const min = Number.parseInt(value('--min'), 10) || 60;
const prefix = (value('--module') || '').replace(/\/+$/, '');
const asJson = argv.includes('--json');

export function listFunctions(src) {
  const tokens = tokenize(src);
  const lineAt = makeLineIndex(src);
  const out = [];
  for (let k = 0; k < tokens.length; k++) {
    const tk = tokens[k];
    if (tk.t !== 'id' || tk.v !== 'function') continue;
    let j = k + 1;
    if (tokens[j] && tokens[j].v === '*') j++;
    const name = tokens[j] && tokens[j].t === 'id' ? tokens[j].v : null;
    const before = tokens[k - 1];
    const isDefineFactory = !name && before && ((before.v === ',' && tokens[k - 2] && tokens[k - 2].v === ']') || (before.v === '(' && tokens[k - 2] && tokens[k - 2].v === 'define'));
    if (isDefineFactory) continue;
    if (name) j++;
    if (!tokens[j] || tokens[j].v !== '(') continue;
    let depth = 0;
    for (; j < tokens.length; j++) {
      if (tokens[j].v === '(') depth++;
      else if (tokens[j].v === ')' && --depth === 0) break;
    }
    j++;
    if (!tokens[j] || tokens[j].v !== '{') continue;
    const open = j;
    depth = 0;
    for (; j < tokens.length; j++) {
      if (tokens[j].t !== 'punct') continue;
      if (tokens[j].v === '{') depth++;
      else if (tokens[j].v === '}' && --depth === 0) break;
    }
    if (j >= tokens.length) continue;
    const startLine = lineAt(tk.s).line;
    const endLine = lineAt(tokens[j].s).line;
    out.push({ name: name || '(anonymous)', startLine, endLine, lines: endLine - startLine + 1, open });
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const rows = [];
  for (const rel of listJsFiles()) {
    if (isVendored(rel) || (prefix && !rel.startsWith(prefix))) continue;
    for (const f of listFunctions(readSource(path.join(JS_ROOT, rel)))) {
      if (f.lines > min) rows.push({ file: `${JS_ROOT_REPO_REL}/${rel}`, name: f.name, startLine: f.startLine, lines: f.lines });
    }
  }
  rows.sort((a, b) => b.lines - a.lines);
  if (asJson) console.log(JSON.stringify(rows, null, 2));
  else {
    console.log(`function-lengths: ${rows.length} function(s) longer than ${min} lines`);
    for (const r of rows) console.log(`${String(r.lines).padStart(5)}  ${r.name}  ${r.file}:${r.startLine}`);
  }
}
