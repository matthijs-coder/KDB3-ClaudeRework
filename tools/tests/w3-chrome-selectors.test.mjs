// _KDB.elements.selectors.<group> equals the core/cognosHost/config/* catalogue for every group (W3, additive).
// Consumers that import the config modules directly today can read the same values from the registry.
// Run: node --test tools/tests/w3-chrome-selectors.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const CONFIG_DIR = path.join(JS_ROOT, "core/cognosHost/config");
const CATALOGUE_MODULES = ["rootChromeSelectors", "tabChromeSelectors", "pageChromeSelectors", "filterDockChromeSelectors", "widgetChromeSelectors"];
// config module export name -> _KDB.elements.selectors group; only the pdf group is registered under another name.
const REGISTRY_GROUP = { pdf: "dashboardPdf" };
const registryGroup = (exportName) => REGISTRY_GROUP[exportName] || exportName;

const register = loadAmd(path.join(JS_ROOT, "core/cognosHost/registerCognosHostSelectors.js"));
const modules = Object.fromEntries(CATALOGUE_MODULES.map((name) => [name, loadAmd(path.join(CONFIG_DIR, `${name}.js`))]));
const _KDB = {};
register(_KDB);
const registry = _KDB.elements.selectors;

test("the catalogue modules are exactly the config files that export selector groups", () => {
  const exporting = fs.readdirSync(CONFIG_DIR)
    .filter((file) => file.endsWith(".js"))
    .map((file) => file.replace(/\.js$/, ""))
    .filter((name) => {
      const value = loadAmd(path.join(CONFIG_DIR, `${name}.js`));
      return value && typeof value === "object" && Object.values(value).some((group) => group && group.entries && group.strings);
    });
  assert.deepEqual(exporting.sort(), [...CATALOGUE_MODULES].sort());
});

test("every group of every config module is registered, with the same values", () => {
  for (const [moduleName, exported] of Object.entries(modules)) {
    for (const [exportName, group] of Object.entries(exported)) {
      const name = registryGroup(exportName);
      assert.ok(registry[name], `${moduleName}.${exportName} -> selectors.${name} is missing`);
      assert.deepEqual(registry[name], group.strings, `${moduleName}.${exportName} -> selectors.${name}`);
      assert.deepEqual(Object.keys(registry[name]), Object.keys(group.strings), `${name} key order`);
      for (const [key, value] of Object.entries(group.strings)) {
        assert.deepEqual(registry[name][key], value, `${name}.${key}`);
      }
    }
  }
});

test("the registry holds no group the config modules do not define", () => {
  const expected = Object.values(modules).flatMap((exported) => Object.keys(exported).map(registryGroup));
  assert.deepEqual(Object.keys(registry).sort(), expected.sort());
});

test("strings equals the entries' selectors (nothing is lost between the catalogue and the registry)", () => {
  for (const exported of Object.values(modules)) {
    for (const [exportName, group] of Object.entries(exported)) {
      const fromEntries = {};
      for (const [key, entry] of Object.entries(group.entries)) {
        if (entry && entry.selector != null) fromEntries[key] = entry.selector;
      }
      assert.deepEqual(registry[registryGroup(exportName)], fromEntries, exportName);
    }
  }
});

test("a feature registering extra keys on a group keeps the catalogue values (tabs and filterDock merge their own keys)", () => {
  const kdb = {};
  register(kdb);
  kdb.elements.selectors.tabs = Object.assign({}, kdb.elements.selectors.tabs, { extraKey: ".x" });
  kdb.elements.selectors.filterDock = Object.assign({ onlyHere: ".y" }, kdb.elements.selectors.filterDock);
  for (const [key, value] of Object.entries(modules.tabChromeSelectors.tabs.strings)) assert.deepEqual(kdb.elements.selectors.tabs[key], value);
  for (const [key, value] of Object.entries(modules.filterDockChromeSelectors.filterDock.strings)) assert.deepEqual(kdb.elements.selectors.filterDock[key], value);
});
