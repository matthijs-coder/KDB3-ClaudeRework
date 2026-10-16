// The action types the filter owners send to each other are exported by the receiving owner and imported by the
// sender. The string values are public (cross-module command bus) and must not change.
// Run: node --test tools/tests/filterOwnerActions.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const FILTERS = path.join(JS_ROOT, "dashboard/filters");
const quiet = { log() {}, info() {}, debug() {}, warn() {}, error() {} };
const load = (rel) => loadAmd(path.join(FILTERS, rel), { stubs: { console: quiet } });

test("owner exported action constants keep their string values", () => {
  const singleSelect = load("singleSelect/config.js").actions;
  assert.equal(singleSelect.APPLY_OWNER_SELECTION, "singleSelect/applyOwnerSelection");
  assert.equal(singleSelect.APPLY_SPECIAL_SELECTION_POLICY, "singleSelect/applySpecialSelectionPolicy");
  assert.equal(singleSelect.FILTER_DOCK_POPUP_READY, "singleSelect/filterDockPopupReady");
  assert.equal(singleSelect.FILTER_DOCK_STATE_CHANGED, "singleSelect/filterDockStateChanged");

  const sicht = load("sicht/state.js").actions;
  assert.equal(sicht.SINGLE_SELECT_COMMITTED, "sicht/singleSelectCommitted");
  assert.equal(sicht.SINGLE_SELECT_DRAFT_CHANGED, "sicht/singleSelectDraftChanged");
  assert.equal(sicht.SINGLE_SELECT_DRAFT_REVERTED, "sicht/singleSelectDraftReverted");
  assert.equal(sicht.SINGLE_SELECT_INVENTORY_RECONCILED, "sicht/singleSelectInventoryReconciled");

  const special = load("specialSingleSelect/state.js").actions;
  assert.equal(special.SICHT_CHANGED, "specialSingleSelect/sichtChanged");
  assert.equal(special.USER_SELECTION_COMMITTED, "specialSingleSelect/userSelectionCommitted");
  assert.equal(special.SINGLE_SELECT_INVENTORY_RECONCILED, "specialSingleSelect/singleSelectInventoryReconciled");

  const dienststelle = load("dienststelle/state.js").ACTIONS;
  assert.equal(dienststelle.SICHT_CHANGED, "dienststelle/sichtChanged");
  assert.equal(dienststelle.HISTORY_REPLAY_REQUESTED, "dienststelle/historyReplayRequested");

  const filterDock = load("filterDock/state.js").ACTIONS;
  assert.equal(filterDock.CLICK_ORIGINAL_BUTTON_REQUESTED, "filterDock/clickOriginalButtonRequested");
  assert.equal(filterDock.CLOSE_ACTIVE_POPUP_REQUESTED, "filterDock/closeActivePopupRequested");
});

test("singleSelect hands its delegated owners the exported constants", () => {
  const owners = load("singleSelect/commit/ownerNotify.js").ownerActions;
  assert.deepEqual(owners, {
    sichtCommitted: "sicht/singleSelectCommitted",
    sichtDraftChanged: "sicht/singleSelectDraftChanged",
    sichtDraftReverted: "sicht/singleSelectDraftReverted",
    sichtInventoryReconciled: "sicht/singleSelectInventoryReconciled",
    specialCommitted: "specialSingleSelect/userSelectionCommitted",
    specialInventoryReconciled: "specialSingleSelect/singleSelectInventoryReconciled"
  });
});

test("no owner folder under test spells another owner's action type as a literal (tabs/resolveFilterScopeTargets is the only exception)", () => {
  const owners = ["singleSelect", "sicht", "specialSingleSelect"];
  const literal = /["'](singleSelect|sicht|specialSingleSelect|dienststelle|filterDock)\/[A-Za-z]+["']/g;
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith(".js")) { continue; }
      const owner = path.relative(FILTERS, full).split(path.sep)[0];
      const own = new Set([owner]);
      const text = fs.readFileSync(full, "utf8");
      for (const match of text.matchAll(literal)) {
        const isOwnConstantsFile = /(^|\/)(config|state)\.js$/.test(full) && own.has(match[1]);
        if (!own.has(match[1]) && !isOwnConstantsFile) { offenders.push(path.relative(FILTERS, full) + ": " + match[0]); }
      }
    }
  };
  owners.forEach((owner) => walk(path.join(FILTERS, owner)));
  assert.deepEqual(offenders, []);
});
