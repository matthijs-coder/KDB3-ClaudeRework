#!/usr/bin/env node
// Runs check-syntax, check-imports and (if any tools/tests/*.test.mjs exist) `node --test tools/tests/*.test.mjs`. Exit 1 if any fail.
// Usage: node tools/check-all.mjs [--verbose]   (--verbose prints each check's full output)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(toolsDir);
const verbose = process.argv.includes('--verbose');

const checks = [
  { name: 'check-syntax', args: [path.join(toolsDir, 'check-syntax.mjs')] },
  { name: 'check-imports', args: [path.join(toolsDir, 'check-imports.mjs')] },
];
const testsDir = path.join(toolsDir, 'tests');
const hasTests = fs.existsSync(testsDir) && fs.readdirSync(testsDir).some((f) => f.endsWith('.test.mjs'));
if (hasTests) checks.push({ name: 'tests', args: ['--test', 'tools/tests/*.test.mjs'] });

let failed = 0;
const started = Date.now();
for (const c of checks) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, c.args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}  (${Date.now() - t0} ms)`);
  if (!ok || verbose) {
    const text = `${r.stdout || ''}${r.stderr || ''}`.trimEnd();
    if (text) console.log(text.split('\n').map((l) => `    ${l}`).join('\n'));
  }
}
console.log(`check-all: ${failed ? 'FAIL' : 'PASS'} (${checks.length - failed}/${checks.length} checks, ${Date.now() - started} ms)`);
process.exit(failed ? 1 : 0);
