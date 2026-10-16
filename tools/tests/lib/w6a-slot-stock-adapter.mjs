// Location-dependent glue of the W6a tests: where the widgetBase tab-mutation handlers and the snapshot ledger live.
import path from "node:path";
import { loadAmd } from "../../lib/amd-loader.mjs";
import { JS_ROOT } from "../../lib/amd-graph.mjs";

const BASE = path.join(JS_ROOT, "dashboard/widgets/widgetBase");

export function loadWidgetBaseTabMutationHandlers({ placement, documentStub, consoleStub }) {
  const load = (rel) => loadAmd(path.join(BASE, rel), { stubs: { document: documentStub, console: consoleStub }, modules: { "./placeEntries.js": placement } });
  return {
    "widgetBase/prepareTabMutation": load("slotStock/prepare.js").handlePrepareTabMutation,
    "widgetBase/applyTabMutation": load("slotStock/apply.js").handleApplyTabMutation,
    "widgetBase/restoreTabMutationSnapshot": load("slotStock/rollback.js").handleRestoreTabMutationSnapshot
  };
}

export function readSnapshotStores(KDB, ownerKeys) {
  const stores = { widgetBase: Object.keys(KDB.runtime.widgetBase.tabMutationSnapshots || {}) };
  ownerKeys.forEach((key) => { stores[key] = Object.keys(KDB.runtime[key].tabMutationSnapshots || {}); });
  return stores;
}
