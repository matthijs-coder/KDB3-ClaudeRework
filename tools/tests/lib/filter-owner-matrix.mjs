// Shared inputs for the filter owner classification tests: the real configured filterPropObj
// (__savedProperties/filterPropId.js) and a synthetic matrix of names x scopes x definition flags.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SAVED = path.resolve(here, "../../../_____________KDB3API/__savedProperties");

function readSavedProperty(fileName, propertyId) {
  const source = fs.readFileSync(path.join(SAVED, fileName), "utf8");
  const sandbox = {};
  vm.runInNewContext(source + "\nthis.__value = " + propertyId + ";", sandbox);
  const parsed = JSON.parse(sandbox.__value);
  return parsed[propertyId];
}

export function readConfiguredProperties() {
  return {
    filterPropObj: readSavedProperty("filterPropId.js", "filterPropId"),
    kennzahlenTablesPropObj: readSavedProperty("kennzahlenTablesPropId.js", "kennzahlenTablesPropId")
  };
}

export const NAME_CLASSES = [
  { id: "sicht", itemName: "Sicht" },
  { id: "dienststelleExact", itemName: "Dienststelle_BW" },
  { id: "dienststellePrefix", itemName: "Dienststelle_XY" },
  { id: "plain", itemName: "Geschlecht" }
];

export const SCOPE_TYPES = ["global", "pageContext"];

const FLAG_VALUES = {
  isHierarchy: [undefined, "true", "false"],
  isSingleSelect: [undefined, "true", "false"],
  isNative: [undefined, "true"],
  cascade: [undefined, "downstream"],
  condition: [undefined, "Personengruppe", "dienststellenleitung", "other"]
};

export function* flagCombinations() {
  for (const isHierarchy of FLAG_VALUES.isHierarchy) {
    for (const isSingleSelect of FLAG_VALUES.isSingleSelect) {
      for (const isNative of FLAG_VALUES.isNative) {
        for (const cascade of FLAG_VALUES.cascade) {
          for (const condition of FLAG_VALUES.condition) {
            const definition = { itemId: "[X].[Y]" };
            const parts = [];
            for (const [key, value] of Object.entries({ isHierarchy, isSingleSelect, isNative, cascade, condition })) {
              if (value !== undefined) {
                definition[key] = value;
                parts.push(key + "=" + value);
              }
            }
            yield { key: parts.join(",") || "-", definition };
          }
        }
      }
    }
  }
}

export function legacyProperties(scopeType, itemName, definition) {
  const bucket = scopeType === "global" ? "globalFilters" : "pageContextFilters";
  return {
    kennzahlenTablesPropObj: { Personal_KDB: {} },
    filterPropObj: { Personal_KDB: { [bucket]: { [itemName]: definition } } }
  };
}

export function missingProperties() {
  return {
    kennzahlenTablesPropObj: { Personal_KDB: {} },
    filterPropObj: { Personal_KDB: { globalFilters: {}, pageContextFilters: {} } }
  };
}

export function instanceProperties(entries) {
  const filterInstances = {};
  entries.forEach((entry, index) => { filterInstances["i" + index] = entry; });
  return {
    kennzahlenTablesPropObj: { Personal_KDB: {} },
    filterPropObj: { Personal_KDB: { filterInstances } }
  };
}

export function hostDescriptor(itemName, scopeType, itemId) {
  return {
    itemId: itemId || "[X].[Y]",
    itemName,
    sourceId: "src",
    rawScopeId: scopeType === "global" ? "global" : "page1_tabpanel",
    scopeType,
    values: []
  };
}

export const CLASSIFICATION_FIXTURE = path.resolve(here, "../fixtures/filterOwnerClassification.golden.json");
export const COMBO_KEYS = [...flagCombinations()].map((combo) => combo.key);

// Fixture rows hold one outcome code per flag combination (order of flagCombinations()) per scope/name class.
export function expandClassificationRows(stored) {
  const lookup = {};
  for (const [rowKey, row] of Object.entries(stored.rows)) {
    if (rowKey.endsWith("|<missing>")) {
      lookup[rowKey] = stored.legend[row.charCodeAt(0) - 65];
    } else {
      COMBO_KEYS.forEach((comboKey, index) => { lookup[rowKey + "|" + comboKey] = stored.legend[row.charCodeAt(index) - 65]; });
    }
  }
  return lookup;
}

export function readClassificationFixture() {
  return expandClassificationRows(JSON.parse(fs.readFileSync(CLASSIFICATION_FIXTURE, "utf8")));
}

export function buildClassificationRows(summarize) {
  const legend = [];
  const code = (outcome) => {
    if (!legend.includes(outcome)) { legend.push(outcome); }
    return String.fromCharCode(65 + legend.indexOf(outcome));
  };
  const rows = {};
  for (const scopeType of SCOPE_TYPES) {
    for (const nameClass of NAME_CLASSES) {
      let row = "";
      for (const combo of flagCombinations()) {
        const KDB = { properties: legacyProperties(scopeType, nameClass.itemName, combo.definition) };
        row += code(summarize(KDB, scopeType, nameClass.itemName, combo.definition.itemId));
      }
      rows[scopeType + "|" + nameClass.id] = row;
      rows[scopeType + "|" + nameClass.id + "|<missing>"] = code(
        summarize({ properties: missingProperties() }, scopeType, nameClass.itemName, "[X].[Y]")
      );
    }
  }
  return { legend, rows };
}
