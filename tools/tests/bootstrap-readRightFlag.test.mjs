// readRightFlag: first scalar of a data-table result interpreted as a right (same semantics as isRightAllowed(readFirstRowScalar(rows))).
// Run: node --test tools/tests/bootstrap-readRightFlag.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadAmd } from '../lib/amd-loader.mjs';
import { JS_ROOT } from '../lib/amd-graph.mjs';

const readRightFlag = loadAmd(path.join(JS_ROOT, 'core/utils/readRightFlag.js'));
const isRightAllowed = loadAmd(path.join(JS_ROOT, 'core/utils/isRightAllowed.js'));
const readFirstRowScalar = loadAmd(path.join(JS_ROOT, 'core/utils/readFirstRowScalar.js'));

const CASES = [
  [[{ a: 1 }], true],
  [[{ a: '1' }], true],
  [[{ a: true }], true],
  [[{ a: { use: 1 } }], true],
  [[{ a: { u: '1' } }], true],
  [[{ a: { d: true } }], true],
  [[{ a: 0 }], false],
  [[{ a: '0' }], false],
  [[{ a: 'yes' }], false],
  [[{ a: { use: 0, u: 1 } }], false],
  [[{ a: { other: 1 } }], false],
  [[{}], false],
  [[], false],
  [null, false],
  [undefined, false],
  ['1', false],
  [[null], false],
];

test('readRightFlag equals isRightAllowed(readFirstRowScalar(rows)) for every shape', () => {
  for (const [rows, expected] of CASES) {
    assert.equal(readRightFlag(rows), expected, JSON.stringify(rows));
    assert.equal(readRightFlag(rows), isRightAllowed(readFirstRowScalar(rows)), JSON.stringify(rows));
  }
});
