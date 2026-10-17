// Second golden for WS-C: cross-package v2 payloads (token remap) and what happens to sicht / dienststelle.
// Recorded on origin/main before the WS-C refactor; the frozen ws-c-writeback-map golden stays untouched.
// Run: node --test tools/tests/ws-c-writeback-map-xpkg.test.mjs   (WSC_RECORD=1 rewrites the golden file)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT, REPO_ROOT } from "../lib/amd-graph.mjs";

const WB = path.join(JS_ROOT, "workflows/parameterSet");
const GOLDEN = path.join(path.dirname(fileURLToPath(import.meta.url)), "ws-c-writeback-map-xpkg.golden.json");
const RECORD = process.env.WSC_RECORD === "1";
const silentConsole = { log() {}, info() {}, warn() {}, error() {}, debug() {} };

const createWritebackMapService = loadAmd(path.join(WB, "map/createWritebackMapService.js"), { stubs: { console: silentConsole } });

function readFilterPropObj() {
  const src = fs.readFileSync(path.join(REPO_ROOT, "_____________KDB3API/__savedProperties/filterPropId.js"), "utf8");
  const context = vm.createContext({});
  vm.runInContext(`${src};globalThis.__out=filterPropId;`, context);
  return JSON.parse(context.__out).filterPropId;
}

const FOREIGN = "Other_Package";
const row = (d, u) => (u === undefined ? { d } : { d, u });
const foreignKid = (table, level) => `[Other_Package_TM1].[${table}].[${table}].[${level || table}]`;
const foreignUse = (table, level) => `${foreignKid(table, level)}->:[OTM].[${table}].[${table}]`;
const SICHT_KEY = "[Other_Package_TM1].[Dienststelle].[Dienststelle].[Dienststelle].[Sicht]";
const DSTL_KEY = "[Other_Package_TM1].[Dienststelle].[Dienststelle_BW]";
const DSTL_DEZPV_KEY = "[Other_Package_TM1].[Dienststelle].[Dienststelle_DEZPV]";

const base = () => ({ configuration: { dashboardWidth: "1000px", dashboardHeight: "800px" } });

// Realistic v2 shape: the object key is the foreign KID path, meta.name / meta.itemName are the plain filter names.
function realistic() {
  return Object.assign(base(), {
    globalFiltersObj: {
      [FOREIGN]: {
        [SICHT_KEY]: { name: "Sicht", valuesArray: [row("BW")] },
        [DSTL_KEY]: { name: "Dienststelle_BW", valuesArray: [row("MAG"), row("Unbekannte Dienststelle")] },
        [foreignKid("Berufsfamilie")]: { name: "Berufsfamilie", valuesArray: [row("Technik", foreignUse("Berufsfamilie"))] },
        [foreignKid("Jahr")]: { name: "Jahr", valuesArray: [row("2023", foreignUse("Jahr"))] },
      },
    },
    tabs: {
      0: {
        name: "Tab A",
        pageContextFilterObjArr: [
          { [DSTL_KEY]: { itemName: "Dienststelle_BW", valuesArray: [row("MAG")] } },
          { [foreignKid("Geschlecht")]: { itemName: "Geschlecht", valuesArray: [row("Weiblich", foreignUse("Geschlecht"))] } },
        ],
      },
    },
  });
}

// Plain name identical to the object key: the key's KID token is also substituted in meta.name.
function keyEqualsName() {
  return Object.assign(base(), {
    globalFiltersObj: {
      [FOREIGN]: {
        Sicht: { name: "Sicht", valuesArray: [row("BW")] },
        Dienststelle_BW: { name: "Dienststelle_BW", valuesArray: [row("MAG")] },
        Jahr: { name: "Jahr", valuesArray: [row("2023", foreignUse("Jahr"))] },
      },
    },
  });
}

// meta.name carries the full KID path (same string as the key).
function nameIsKid() {
  return Object.assign(base(), {
    globalFiltersObj: {
      [FOREIGN]: {
        [SICHT_KEY]: { name: SICHT_KEY, valuesArray: [row("BW")] },
        [DSTL_KEY]: { name: DSTL_KEY, valuesArray: [row("MAG")] },
      },
    },
  });
}

// Dienststelle_DEZPV with a DEZPV sicht, both in the foreign package.
function realisticDezpv() {
  return Object.assign(base(), {
    globalFiltersObj: {
      [FOREIGN]: {
        [SICHT_KEY]: { name: "Sicht", valuesArray: [row("DEZPV")] },
        [DSTL_DEZPV_KEY]: { name: "Dienststelle_DEZPV", valuesArray: [row("Referat A")] },
      },
    },
  });
}

// Package of the runtime next to a foreign one: not "same package", so the remap runs.
function mixedPackages() {
  const payload = realistic();
  payload.globalFiltersObj.Personal_KDB = { "Jahr": { name: "Jahr", valuesArray: [row("2024")] } };
  return payload;
}

// Same-package control: untouched by the remap.
function samePackageControl() {
  return Object.assign(base(), {
    globalFiltersObj: {
      Personal_KDB: {
        [SICHT_KEY]: { name: "Sicht", valuesArray: [row("BW")] },
        [DSTL_KEY]: { name: "Dienststelle_BW", valuesArray: [row("MAG")] },
      },
    },
  });
}

const CASES = { realistic, keyEqualsName, nameIsKid, realisticDezpv, mixedPackages, samePackageControl };

function describeError(error) {
  const diagnostic = error && error.diagnostic ? error.diagnostic : null;
  return { name: error && error.name, message: diagnostic ? error.message : "<engine message>", code: diagnostic ? diagnostic.code : null, diagnostic };
}

function run(raw) {
  const service = createWritebackMapService({ _KDB: { properties: { filterPropObj: readFilterPropObj() } } });
  const diagnostics = [];
  try {
    return { ok: true, v3: service.toV3(raw, { diagnostics }), diagnostics };
  } catch (error) {
    return { ok: false, error: describeError(error), diagnostics };
  }
}

const actual = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(CASES).map(([name, make]) => [name, run(make())]))));
if (RECORD) fs.writeFileSync(GOLDEN, `${JSON.stringify(actual, null, 2)}\n`);

test("golden: cross-package v2 mapping output is unchanged", () => {
  const golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  assert.deepStrictEqual(Object.keys(actual), Object.keys(golden));
  for (const name of Object.keys(golden)) assert.deepStrictEqual(actual[name], golden[name], name);
});

test("cross-package input is not mutated", () => {
  const input = realistic();
  const snapshot = JSON.parse(JSON.stringify(input));
  run(input);
  assert.deepStrictEqual(input, snapshot);
});
