// Sanity check for amd-loader: node tools/lib/amd-loader.selftest.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadAmd } from './amd-loader.mjs';
import { JS_ROOT } from './amd-graph.mjs';

const at = (rel) => path.join(JS_ROOT, rel);

const textColor = loadAmd(at('core/utils/readableTextColorForHex.js'));
assert.equal(textColor('#ffffff'), '#000000');
assert.equal(textColor('#000'), '#FFFFFF');

const normalize = loadAmd(at('core/utils/normalizeCognosScopeId.js'));
assert.equal(normalize(' abc_tabpanel '), 'abc');
assert.equal(normalize(null), '');

const buildPlan = loadAmd(at('core/services/widgetBindingPlan/buildPlan.js'));
assert.equal(typeof buildPlan, 'function');

const timers = [];
const { sleep } = loadAmd(at('core/utils/kit/async.js'), { stubs: { setTimeout: (fn, ms) => timers.push(ms) } });
sleep(25);
assert.deepEqual(timers, [25]);

console.log('amd-loader selftest: PASS');
