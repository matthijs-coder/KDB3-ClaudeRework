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
