// Pins what the widgetVis type/grain resolvers answer when `_KDB.config.visualizations` is absent (unit-test setups; the
// boot always runs the config orchestrator first). The golden was recorded on origin/main before W8:
//   W8_RECORD=1 W8_JS_ROOT=<path to a main checkout>/_____________KDB3API/KDB3/js node --test tools/tests/w8-no-config.test.mjs
// W8 keeps every answer except the Kennzahl pack of the four buckets that have a pack rule (Line, List, StackedBar,
// StackedColumn): main answered from the (missing) default grain, the shared table now answers from the bucket.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const GOLDEN = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "w8-no-config.golden.json");
const RECORD = process.env.W8_RECORD === "1";
const ROOT = process.env.W8_JS_ROOT || JS_ROOT;
const QUIET = { error() {}, warn() {}, log() {}, info() {}, debug() {} };
const load = (rel) => loadAmd(path.join(ROOT, rel), { stubs: { console: QUIET } });

const VIS_TYPES = ["Line", "line", "Pie", "pie", "StackedBar", "stackedbar", "StackedColumn", "List", "list", "Prognose", "prognose",
  "com.ibm.vis.custom.prognoseyear", "com.ibm.vis.custom.prognoseyearlinechart", "Unknown", null, ""];
const GRAINS = [undefined, "stichtag", "jahr", "jahrStichtag", "stichtagProJahrH", "stichtagProJahrV", "bogus"];
const PACK_RULE_BUCKETS = ["Line", "List", "StackedBar", "StackedColumn"];

const visTypes = load("dashboard/widgets/widgetVis/visTypes.js");
const bindingConfig = load("dashboard/widgets/widgetVis/bindingConfig.js");
const key = (type, grain) => `${type === null ? "<null>" : type}|${grain === undefined ? "<undefined>" : grain}`;

function compute() {
  const out = {};
  for (const kdb of [{}, { config: {} }, { config: { visualizations: {} } }]) {
    const label = JSON.stringify(kdb);
    out[label] = {};
    for (const type of VIS_TYPES) {
      for (const grain of GRAINS) {
        out[label][key(type, grain)] = {
          bucket: visTypes.resolveVisPropBucketKey(type, kdb) ?? null,
          cognosId: visTypes.resolveCognosVisualizationTypeId(type, kdb) ?? null,
          effectiveGrain: visTypes.resolveEffectiveGrain(type, grain, kdb) ?? null,
          pack: visTypes.resolveKennzahlPack(type, grain, kdb) ?? null,
          sortingKeys: Object.keys(bindingConfig.resolveSortingConfig(type, kdb, {})).length
        };
      }
    }
  }
  return JSON.parse(JSON.stringify(out));
}

const actual = compute();
if (RECORD) {
  fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
  fs.writeFileSync(GOLDEN, `${JSON.stringify(actual, null, 1)}\n`);
}

test("no config: bucket, Cognos id, effective grain and sorting profile are as on main; pack differs only for rule buckets", { skip: RECORD }, () => {
  const golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  assert.deepStrictEqual(Object.keys(actual), Object.keys(golden));
  let packDeltas = 0;
  for (const label of Object.keys(golden)) {
    for (const cellKey of Object.keys(golden[label])) {
      const expected = golden[label][cellKey];
      const got = actual[label][cellKey];
      const { pack: expectedPack, ...expectedRest } = expected;
      const { pack: gotPack, ...gotRest } = got;
      assert.deepStrictEqual(gotRest, expectedRest, `${label} ${cellKey}`);
      if (gotPack !== expectedPack) {
        packDeltas += 1;
        assert.ok(PACK_RULE_BUCKETS.includes(got.bucket), `${label} ${cellKey}: pack delta only for a bucket with a pack rule`);
        assert.equal(expectedPack, expected.effectiveGrain === "jahr" ? "jahr" : expected.effectiveGrain === null ? null : "stichtag");
      }
    }
  }
  assert.ok(packDeltas > 0);
});

test("no config: the pack of a rule bucket equals the configured answer", () => {
  const withConfig = {};
  loadAmd(path.join(JS_ROOT, "core/config/registerConfig.js"), { stubs: { console: QUIET } })(withConfig);
  for (const type of ["Line", "StackedBar", "StackedColumn", "List"]) {
    for (const grain of GRAINS) {
      assert.equal(visTypes.resolveKennzahlPack(type, grain, {}), visTypes.resolveKennzahlPack(type, grain, withConfig), key(type, grain));
    }
  }
});
