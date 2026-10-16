// Unit tests of dashboard/filters/_core/{filterDefinitions,ownerPolicy}.js (definition reading and owner policy of the
// filter owner kit), including the recorded classification matrix of the pre-kit owners.
// Run: node --test tools/tests/filterOwnerKit.policy.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import {
  instanceProperties, legacyProperties, missingProperties, hostDescriptor, buildClassificationRows,
  expandClassificationRows, readClassificationFixture, readConfiguredProperties
} from "./lib/filter-owner-matrix.mjs";

function loadKit(file) {
  return loadAmd(path.join(JS_ROOT, "dashboard/filters/_core", file));
}

const defKit = loadKit("filterDefinitions.js");
const policyKit = loadKit("ownerPolicy.js");
const getKennzahlenSource = loadAmd(path.join(JS_ROOT, "core/utils/getKennzahlenSource.js"));

test("definitions: value helpers", () => {
  assert.equal(defKit.normalizeText(null), "");
  assert.equal(defKit.normalizeText("  a "), "a");
  assert.equal(defKit.normalizeText(5), "5");
  assert.equal(defKit.normalizeLower(" AbC "), "abc");
  assert.deepEqual([true, "true", " TRUE ", "trueish", "TrueIsh", false, "false", "", null, undefined, 1, "1"].map(defKit.isTrueish),
    [true, true, true, true, true, false, false, false, false, false, false, false]);
  assert.equal(defKit.hasOwnFlag({ a: "x" }, "a"), true);
  assert.equal(defKit.hasOwnFlag({ a: "  " }, "a"), false);
  assert.equal(defKit.hasOwnFlag({ a: null }, "a"), false);
  assert.equal(defKit.hasOwnFlag({}, "a"), false);
  assert.equal(defKit.hasOwnFlag(Object.create({ a: "x" }), "a"), false);
  assert.equal(defKit.hasOwnFlag(null, "a"), false);
});

test("definitions: the two option policies differ exactly in source fallback and the isNative signature field", () => {
  const single = defKit.SINGLE_SELECT_DEFINITION_OPTIONS;
  const native = defKit.NATIVE_DEFINITION_OPTIONS;
  assert.equal(single.allSourcesWhenNoSource, true);
  assert.equal(native.allSourcesWhenNoSource, false);
  assert.deepEqual(native.dedupeFields.filter((field) => !single.dedupeFields.includes(field)), ["isNative"]);
  assert.deepEqual(single.dedupeFields.filter((field) => !native.dedupeFields.includes(field)), []);
  assert.equal(Object.isFrozen(single) && Object.isFrozen(native), true);
});

test("definitions: single/ambiguous/missing for instance entries, itemId narrowing, legacy fallback, multi source", () => {
  const A1 = { scopeType: "global", itemName: "A", itemId: "[1]", isSingleSelect: "true" };
  const A2 = { scopeType: "global", itemName: "A", itemId: "[2]", isSingleSelect: "true" };
  const KDB = { properties: instanceProperties([A1, A2]) };
  const options = Object.assign({ source: "Personal_KDB" }, defKit.SINGLE_SELECT_DEFINITION_OPTIONS);
  const index = defKit.createDefinitionIndex(KDB, options);
  assert.equal(defKit.readDefinition(KDB, "global", "A", "[1]", index).definition, A1);
  assert.equal(defKit.readDefinition(KDB, "global", "A", "", index).status, "ambiguous");
  assert.equal(defKit.readDefinition(KDB, "global", "A", "[9]", index).status, "missing");
  assert.equal(defKit.readDefinition(KDB, "pageContext", "A", "[1]", index).status, "missing");
  assert.equal(defKit.readDefinition(KDB, "global", " A ", "[2]", index).definition, A2);
  assert.equal(defKit.readDefinition(KDB, "global", "A", "[2]", undefined, options).definition, A2);

  const legacy = { isSingleSelect: "true" };
  const KDB2 = { properties: { filterPropObj: { s1: { globalFilters: { B: legacy } }, s2: { globalFilters: { B: { cascade: "x" } }, pageContextFilters: { C: legacy } } } } };
  assert.equal(defKit.readDefinition(KDB2, "global", "B", "", undefined, { source: "s1" }).definition, legacy);
  assert.equal(defKit.readDefinition(KDB2, "global", "B", "", undefined, {}).status, "ambiguous");
  assert.equal(defKit.readDefinition(KDB2, "global", "B", "", undefined, { allSourcesWhenNoSource: false }).status, "missing");
  assert.equal(defKit.readDefinition(KDB2, "pageContext", "C", "", undefined, { source: "s2" }).definition, legacy);
  assert.equal(defKit.readDefinition({}, "global", "B", "", undefined, {}).status, "missing");
});

test("definitions: instance entries win over legacy; a legacy twin in two sources dedupes by signature", () => {
  const instance = { scopeType: "global", itemName: "J", itemId: "[J]", isNative: "true" };
  const KDB = {
    properties: {
      filterPropObj: {
        s1: { filterInstances: { x: instance }, globalFilters: { J: { isNative: "false" } } },
        s2: { globalFilters: { J: { isNative: "false" } } }
      }
    }
  };
  assert.equal(defKit.readDefinition(KDB, "global", "J", "[J]", undefined, {}).definition, instance);
  const only = { properties: { filterPropObj: { s1: { globalFilters: { K: { isNative: "true" } } }, s2: { globalFilters: { K: { isNative: "true" } } } } } };
  assert.equal(defKit.readDefinition(only, "global", "K", "", undefined, {}).status, "ok");
});

function kitSummarize(KDB, scopeType, itemName, itemId) {
  const source = getKennzahlenSource(KDB);
  const ssOptions = Object.assign({ source }, defKit.SINGLE_SELECT_DEFINITION_OPTIONS);
  const nativeOptions = Object.assign({ source }, defKit.NATIVE_DEFINITION_OPTIONS);
  const ssResult = defKit.readDefinition(KDB, scopeType, itemName, itemId, defKit.createDefinitionIndex(KDB, ssOptions));
  const nativeResult = defKit.readDefinition(KDB, scopeType, itemName, itemId, defKit.createDefinitionIndex(KDB, nativeOptions));
  const inventory = policyKit.classifyOwners({ itemName, scopeType, definitionResult: ssResult }).inventory;
  const claimed = policyKit.classifyOwners({ itemName, scopeType, definitionResult: nativeResult }).claimedByNativeMultiSelect;
  return inventory.status + ":" + inventory.filterType + ":" + (inventory.selectionOwner || "-") + "|" + ssResult.status +
    "|nms=" + (claimed ? 1 : 0);
}

test("ownerPolicy: reproduces the recorded classification matrix of the pre-kit owners", () => {
  const actual = expandClassificationRows(buildClassificationRows(kitSummarize));
  const expected = readClassificationFixture();
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
  const diff = Object.keys(actual).filter((key) => actual[key] !== expected[key]).slice(0, 10)
    .map((key) => key + ": " + actual[key] + " != " + expected[key]);
  assert.deepEqual(diff, []);
});

test("ownerPolicy: the real configured filters map to exactly one owner", () => {
  const properties = readConfiguredProperties();
  const KDB = { properties };
  const source = getKennzahlenSource(KDB);
  const owners = {};
  for (const [bucket, scopeType] of [["globalFilters", "global"], ["pageContextFilters", "pageContext"]]) {
    for (const [itemName, definition] of Object.entries(properties.filterPropObj[source][bucket])) {
      const result = defKit.readDefinition(KDB, scopeType, itemName, definition.itemId, undefined,
        Object.assign({ source }, defKit.SINGLE_SELECT_DEFINITION_OPTIONS));
      const classified = policyKit.classifyOwners({ itemName, scopeType, definitionResult: result });
      assert.equal(classified.owners.length, 1, scopeType + "/" + itemName);
      owners[scopeType + "/" + itemName] = classified.owners[0];
    }
  }
  assert.equal(owners["global/Sicht"], "sicht");
  assert.equal(owners["global/Jahr"], "nativeMultiSelect");
  assert.equal(owners["global/Dienststelle_BW"], "dienststelle");
  assert.equal(owners["pageContext/Personengruppe"], "specialSingleSelect");
  assert.equal(owners["global/Geschlecht"], "singleSelect");
});

test("ownerPolicy: owners list shows the two documented overlaps", () => {
  const nativeFlag = { isNative: "true" };
  const KDB = { properties: legacyProperties("global", "Land", nativeFlag) };
  const result = defKit.readDefinition(KDB, "global", "Land", "", undefined, { source: "Personal_KDB" });
  assert.deepEqual(policyKit.classifyOwners({ itemName: "Land", scopeType: "global", definitionResult: result }).owners,
    ["singleSelect", "nativeMultiSelect"]);
  const missing = defKit.readDefinition({ properties: missingProperties() }, "global", "Sicht", "", undefined, { source: "Personal_KDB" });
  assert.deepEqual(policyKit.classifyOwners({ itemName: "Sicht", scopeType: "global", definitionResult: missing }).owners,
    ["sicht", "nativeMultiSelect"]);
  assert.deepEqual(policyKit.classifyOwners({}).owners, ["nativeMultiSelect"]);
  assert.equal(hostDescriptor("Land", "global").itemName, "Land");
});
