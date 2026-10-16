// Which owner acts on a configured filter. Three code paths decide this today and must stay complementary:
//   - singleSelect inventory classification (inventory/definitions.js: createDefinitionIndex, readFilterDefinition,
//     classifyFilterInstance),
//   - nativeMultiSelect claim (inventory.js: isUnownedFilterDescriptor),
//   - filterDock routing type (identity.js: readFilterCapabilities -> resolveFilterType).
// 1. The real configured filterPropObj (__savedProperties/filterPropId.js) maps every filter to exactly one owner,
//    and the three paths agree.
// 2. The synthetic matrix of tools/tests/fixtures/filterOwnerClassification.golden.json was recorded on the code
//    BEFORE the owner kit (Phase 2 W4); it pins every outcome including the overlap cases listed in OVERLAPS.
// Run: node --test tools/tests/filterOwnerClassification.test.mjs   (FILTER_OWNER_RECORD=1 rewrites the fixture)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import {
  CLASSIFICATION_FIXTURE, buildClassificationRows, expandClassificationRows, readClassificationFixture,
  instanceProperties, hostDescriptor, readConfiguredProperties
} from "./lib/filter-owner-matrix.mjs";

const FILTERS = path.join(JS_ROOT, "dashboard/filters");
const quiet = { log() {}, info() {}, debug() {}, warn() {}, error() {} };
const load = (rel) => loadAmd(path.join(FILTERS, rel), { stubs: { console: quiet } });

const definitions = load("singleSelect/inventory/definitions.js");
const nativeInventory = load("nativeMultiSelect/inventory.js");
const dockIdentity = load("filterDock/identity.js");
const getKennzahlenSource = loadAmd(path.join(JS_ROOT, "core/utils/getKennzahlenSource.js"));

function singleSelectOwner(KDB, scopeType, itemName, itemId, source) {
  const index = definitions.createDefinitionIndex(KDB, source);
  const result = definitions.readFilterDefinition(KDB, source, scopeType, itemName, itemId, index);
  const classification = definitions.classifyFilterInstance(result, itemName, scopeType);
  return { result, classification };
}

function nativeClaim(KDB, scopeType, itemName, itemId) {
  return nativeInventory.isUnownedFilterDescriptor(KDB, hostDescriptor(itemName, scopeType, itemId));
}

function summarize(KDB, scopeType, itemName, itemId) {
  const source = getKennzahlenSource(KDB);
  const ss = singleSelectOwner(KDB, scopeType, itemName, itemId, source);
  const claim = nativeClaim(KDB, scopeType, itemName, itemId);
  const c = ss.classification;
  return c.status + ":" + c.filterType + ":" + (c.selectionOwner || "-") + "|" + ss.result.status + "|nms=" + (claim ? 1 : 0);
}

const DOCK_TO_OWNER = {
  sicht: "sicht",
  specialSingleSelect: "specialSingleSelect",
  singleSelect: "singleSelect",
  dienststelle: "dienststelle",
  nativeMultiSelect: "nativeMultiSelect"
};

test("every configured filter of the real filterPropObj maps to exactly one owner and the dock agrees", () => {
  const properties = readConfiguredProperties();
  const KDB = { properties };
  const source = getKennzahlenSource(KDB);
  assert.equal(source, "Personal_KDB");
  const sourceConfig = properties.filterPropObj[source];
  const seen = [];
  for (const [bucket, scopeType] of [["globalFilters", "global"], ["pageContextFilters", "pageContext"]]) {
    for (const [itemName, definition] of Object.entries(sourceConfig[bucket])) {
      const ss = singleSelectOwner(KDB, scopeType, itemName, definition.itemId, source);
      const claimed = nativeClaim(KDB, scopeType, itemName, definition.itemId);
      const ssOwner = ss.classification.status === "unknown" ? null : ss.classification.filterType;
      const owners = [ssOwner, claimed ? "nativeMultiSelect" : null].filter(Boolean);
      const dockConfig = dockIdentity.readFilterConfig(KDB, itemName, scopeType, source);
      const dockType = dockIdentity.resolveFilterType(
        dockIdentity.toHandoffCapabilities(dockIdentity.readFilterCapabilities(dockConfig))
      );
      assert.equal(owners.length, 1, scopeType + "/" + itemName + " -> " + JSON.stringify(owners));
      assert.equal(owners[0], DOCK_TO_OWNER[dockType], scopeType + "/" + itemName + " dock=" + dockType);
      seen.push(scopeType + "/" + itemName + "=" + owners[0]);
    }
  }
  assert.deepEqual(seen.sort(), [
    "global/Altersgruppe=singleSelect", "global/Berufsfamilie=singleSelect", "global/Dienstverhältnis=singleSelect",
    "global/Dienststelle_BW=dienststelle", "global/Dienststelle_DEZPV=dienststelle", "global/Dienststellenleitung=specialSingleSelect",
    "global/Geschlecht=singleSelect", "global/Jahr=nativeMultiSelect", "global/Personengruppe=specialSingleSelect",
    "global/Sicht=sicht",
    "pageContext/Altersgruppe=singleSelect", "pageContext/Berufsfamilie=singleSelect", "pageContext/Dienstverhältnis=singleSelect",
    "pageContext/Dienststelle_BW=dienststelle", "pageContext/Dienststelle_DEZPV=dienststelle",
    "pageContext/Dienststellenleitung=specialSingleSelect", "pageContext/Geschlecht=singleSelect", "pageContext/Jahr=nativeMultiSelect",
    "pageContext/Personengruppe=specialSingleSelect"
  ].sort());
});

test("classification matrix (singleSelect classification + native claim) is unchanged", () => {
  const table = buildClassificationRows(summarize);
  if (process.env.FILTER_OWNER_RECORD === "1") {
    fs.writeFileSync(CLASSIFICATION_FIXTURE, JSON.stringify(table, null, 1) + "\n");
  }
  const expected = readClassificationFixture();
  const actual = expandClassificationRows(table);
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
  const diff = Object.keys(actual).filter((key) => actual[key] !== expected[key]).slice(0, 10)
    .map((key) => key + ": " + actual[key] + " != " + expected[key]);
  assert.deepEqual(diff, []);
});

// Cases where singleSelect and nativeMultiSelect both act on one filter, or neither does. Baseline quirks, pinned.
const OVERLAPS = [
  {
    id: "isNative without isHierarchy/isSingleSelect flags: singleSelect supports it, NMS claims it",
    key: "global|plain|isNative=true",
    expected: "supported:singleSelect:singleSelect|ok|nms=1"
  },
  {
    id: "global Sicht without a definition: singleSelect says sicht, NMS claims it",
    key: "global|sicht|<missing>",
    expected: "supported:sicht:sicht|missing|nms=1"
  }
];

for (const overlap of OVERLAPS) {
  test("overlap pinned: " + overlap.id, () => {
    assert.equal(readClassificationFixture()[overlap.key], overlap.expected);
  });
}

test("every overlap in the fixture is one of the documented classes", () => {
  const expected = readClassificationFixture();
  const both = Object.keys(expected).filter((key) => {
    const value = expected[key];
    return value.endsWith("nms=1") && /^supported|^excluded/.test(value);
  });
  const classes = new Set(both.map((key) => {
    const [scope, name, flags] = key.split("|");
    return name === "sicht" && scope === "global" ? "sichtMissing" : /isNative=true/.test(flags) ? "isNativeWithoutOwnerFlags" : "other:" + key;
  }));
  assert.deepEqual([...classes].sort(), ["isNativeWithoutOwnerFlags", "sichtMissing"]);
});

test("definition reading: source fallback and dedupe signature differ per path (pinned)", () => {
  const twin = (isNative) => ({
    scopeType: "global", itemName: "Jahr", itemId: "[J]", filterLabel: "Jahr", instanceKey: "k", isSingleSelect: "false", isHierarchy: "false", isNative
  });
  const KDB = { properties: instanceProperties([twin("true"), twin("false")]) };
  const source = getKennzahlenSource(KDB);
  const ss = singleSelectOwner(KDB, "global", "Jahr", "[J]", source);
  assert.equal(ss.result.status, "ok");
  assert.equal(nativeClaim(KDB, "global", "Jahr", "[J]"), true);
  const index = nativeInventory.createClaimIndex(KDB);
  assert.equal(nativeInventory.readClaimDefinition(KDB, "global", "Jahr", "[J]", index).status, "ambiguous");

  const noSource = { properties: { filterPropObj: KDB.properties.filterPropObj } };
  assert.equal(getKennzahlenSource(noSource), null);
  const all = singleSelectOwner(noSource, "global", "Jahr", "[J]", null);
  assert.equal(all.result.status, "ok");
  assert.equal(nativeInventory.readClaimDefinition(noSource, "global", "Jahr", "[J]").status, "missing");
});

test("definition reading: legacy fallback, itemId filtering, two sources", () => {
  const one = { scopeType: "global", itemName: "A", itemId: "[1]", isSingleSelect: "true" };
  const two = { scopeType: "global", itemName: "A", itemId: "[2]", isSingleSelect: "true" };
  const KDB = { properties: instanceProperties([one, two]) };
  assert.equal(singleSelectOwner(KDB, "global", "A", "[1]", "Personal_KDB").result.definition, one);
  assert.equal(singleSelectOwner(KDB, "global", "A", "", "Personal_KDB").result.status, "ambiguous");
  assert.equal(singleSelectOwner(KDB, "global", "A", "[3]", "Personal_KDB").result.status, "missing");
  const index = nativeInventory.createClaimIndex(KDB);
  assert.equal(nativeInventory.readClaimDefinition(KDB, "global", "A", "[2]", index).definition, two);
  assert.equal(nativeInventory.readClaimDefinition(KDB, "global", "A", "", index).status, "ambiguous");

  const legacy = { isSingleSelect: "true" };
  const twoSources = {
    properties: {
      filterPropObj: {
        s1: { globalFilters: { B: legacy } },
        s2: { globalFilters: { B: { isSingleSelect: "true", cascade: "x" } } }
      }
    }
  };
  assert.equal(singleSelectOwner(twoSources, "global", "B", "", null).result.status, "ambiguous");
  assert.equal(singleSelectOwner(twoSources, "global", "B", "", "s1").result.definition, legacy);
  assert.equal(singleSelectOwner(twoSources, "pageContext", "B", "", "s1").result.status, "missing");
});
