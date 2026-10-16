// Location-dependent glue of the W6a tests: where the widgetBase tab-mutation handlers and the snapshot ledger live.
import path from "node:path";
import { loadAmd } from "../../lib/amd-loader.mjs";
import { JS_ROOT } from "../../lib/amd-graph.mjs";

const BASE = path.join(JS_ROOT, "dashboard/widgets/widgetBase");

export function loadWidgetBaseTabMutationHandlers({ placement, documentStub, consoleStub }) {
  const owner = loadAmd(path.join(BASE, "slotStock/tabMutationOwner.js"), {
    stubs: { document: documentStub, console: consoleStub },
    modules: { "./placeEntries.js": placement }
  });
  return {
    "widgetBase/prepareTabMutation": owner.handlePrepareTabMutation,
    "widgetBase/applyTabMutation": owner.handleApplyTabMutation,
    "widgetBase/restoreTabMutationSnapshot": owner.handleRestoreTabMutationSnapshot
  };
}

export function readSnapshotStores(KDB, ownerKeys) {
  const ledger = KDB.runtime.tabs.slotStock;
  const stores = { widgetBase: Object.keys(ledger ? ledger.snapshots : {}) };
  ownerKeys.forEach((key) => { stores[key] = Object.keys(KDB.runtime[key].tabMutationSnapshots || {}); });
  return stores;
}
