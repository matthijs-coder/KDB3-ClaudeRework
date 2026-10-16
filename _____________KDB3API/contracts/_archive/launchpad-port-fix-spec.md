# Fix Spec: `launchpad` direct port CP-2 deviations

> Focused one-iteration fix spec after CP-2 review of the first `launchpad` implementation.
> Do not broaden scope. Fix only the deviations listed below.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/launchpad.md`
**Base execution spec:** `_____________KDB3API/contracts/launchpad-port-execution-spec.md`
**Target production tree:** `_____________KDB3API/KDB3/js/dashboard/launchpad/`
**Reviewer:** GPT-5.5, 2026-05-17

---

## A. Pre-flight

Before editing, re-read:

1. `_____________KDB3API/contracts/launchpad.md`
2. `_____________KDB3API/contracts/launchpad-port-execution-spec.md`
3. `_____________KDB3API/.cursor/rules/state.mdc`
4. `_____________KDB3API/.cursor/rules/runtime.mdc`
5. `_____________KDB3API/.cursor/rules/dom.mdc`
6. `_____________KDB3API/.cursor/rules/amd.mdc`
7. `_______KDB3/KDB3/js/dashboard/launchpad/getLaunchpadTabDescriptors.js`
8. `_______KDB3/KDB3/js/dashboard/launchpad/collectLaunchpadTabIndexes.js`
9. `_______KDB3/KDB3/js/dashboard/launchpad/buildLaunchpadTabsFromConfig.js`
10. `_______KDB3/KDB3/js/dashboard/launchpad/buildLaunchpadTabsFromCanvas.js`
11. `_______KDB3/KDB3/js/dashboard/launchpad/buildLaunchpadDom.js`
12. `_______KDB3/KDB3/js/dashboard/launchpad/getLaunchpadPadConfig.js`

Then fix only the files listed in Section C.

---

## B. Deviations To Fix

### D1: Config fallback lost Cognos layout-container resolution

Current `state/buildLaunchpadTabDescriptors.js` falls from tabs snapshot directly to `_KDB.config.tabs`, and `state/buildLaunchpadTabsFromConfig.js` builds descriptors from config entries themselves.

Legacy behavior:

- read layout items from `_KDB.cognosAPI.tabs.getTabsContainers()`;
- collect dashboard/helper indexes from `_KDB.config.tabs`;
- build config fallback tabs by indexing into the layout items with dashboard indexes;
- skip layout items without a resolved real `tabId`.

Required fix:

- `state/buildLaunchpadTabDescriptors.js` must read layout items through a helper equivalent to legacy `readLayoutItems(_KDB)`, with mandatory try/catch returning `[]` on host failure.
- `state/buildLaunchpadTabsFromConfig.js` must accept `(layoutItems, dashboardIndexes)` and build descriptors from `layoutItems[layoutIndex]`, not from config objects.
- Keep direct `_KDB.state.tabs` deep reads forbidden. Tabs owner snapshot path remains: `_KDB.api.tabs.getState()` / injected `readTabsState` / `options.tabsSnapshot`.

### D2: Canvas fallback lost real container ids

Current `state/buildLaunchpadTabsFromCanvas.js` passes canvas items directly into `buildLaunchpadTabDescriptor`.

Legacy behavior:

- for each canvas item, call `getContainer()`;
- use the resolved canonical tab id as `tabId` and `pageId`;
- dedupe by `tabId`;
- skip items without a real id.

Required fix:

- Restore the above behavior while keeping `try/catch` around Cognos/canvas calls.
- Do not invent synthetic `tab-<index>` ids for canvas items.

### D3: DOM identity/class parity drifted

Current `config/padConfig.js` changed legacy pad ids and `view/buildLaunchpadDom.js` omitted legacy classes.

Legacy behavior:

- hide spot: `id="KDB_HideSpot"`, `className="KDB_hidden"`, `aria-hidden="true"`;
- root: `id="KDB_widgetLaunchpad"`, `className="KDB_widgetLaunchpad"`;
- slot: `className="KDB_launchpadSlot"`;
- pad ids:
  - `visualization`: `KDB_visualizationLaunchpad`
  - `text`: `KDB_textLaunchpad`
  - `dataTables`: `KDB_dataTablesPad`
  - `shapes`: `KDB_shapesPad`

Required fix:

- Restore those exact IDs/classes/attributes.
- Keep live DOM references under `_KDB.runtime.launchpad.domRefs`.
- Keep serializable slot metadata under `_KDB.state.launchpad.padsByKey`.

### D4: Object-key tab config index handling drifted

Current `state/collectLaunchpadTabIndexes.js` converts object configs to values before collecting indexes, so object keys like `"3"` can be lost.

Legacy behavior:

- object keys are the tab index source;
- select keys where config role is `dashboard` or `helper`;
- sort keys numerically.

Required fix:

- For object `_KDB.config.tabs`, collect and sort the numeric object keys like legacy.
- Preserve array support only as an additive compatibility shape if already implemented, but do not break object-key behavior.

---

## C. Files Allowed To Modify

Modify only:

```txt
_____________KDB3API/KDB3/js/dashboard/launchpad/config/padConfig.js
_____________KDB3API/KDB3/js/dashboard/launchpad/state/collectLaunchpadTabIndexes.js
_____________KDB3API/KDB3/js/dashboard/launchpad/state/buildLaunchpadTabDescriptors.js
_____________KDB3API/KDB3/js/dashboard/launchpad/state/buildLaunchpadTabsFromConfig.js
_____________KDB3API/KDB3/js/dashboard/launchpad/state/buildLaunchpadTabsFromCanvas.js
_____________KDB3API/KDB3/js/dashboard/launchpad/view/buildLaunchpadDom.js
```

Do not modify:

- `KDB.js`
- `eventSubscribe.md`
- `contracts/launchpad.md`
- `.cursor/rules/*`
- legacy files
- any widget-related module
- any TEST/harness file

---

## D. Per-file Requirements

### `config/padConfig.js`

- Return legacy pad ids exactly:
  - `KDB_visualizationLaunchpad`
  - `KDB_textLaunchpad`
  - `KDB_dataTablesPad`
  - `KDB_shapesPad`
- Keep the existing pad keys: `visualization`, `text`, `dataTables`, `shapes`.

### `state/collectLaunchpadTabIndexes.js`

- For object configs, return:
  - `dashboardIndexes`: numeric-sort keys whose value has `role === "dashboard"`;
  - `helperIndexes`: numeric-sort keys whose value has `role === "helper"`.
- If array config support remains, do not let it change object-key behavior.
- Keep output property names currently used by production code: `dashboardTabIndexes`, `helperTabIndexes`, unless you update all local callers consistently.

### `state/buildLaunchpadTabDescriptors.js`

- Add/read layout items via `_KDB.cognosAPI.tabs.getTabsContainers()` with safe fallback `[]`.
- Flow:
  1. read `tabsConfig`;
  2. collect tab indexes from config;
  3. read `tabsSnapshot`;
  4. read layout items;
  5. resolve helper tabs from snapshot/config/layout if needed;
  6. try `buildLaunchpadTabsFromState(tabsSnapshot, helperTabIds)`;
  7. if empty and dashboard indexes exist, try `buildLaunchpadTabsFromConfig(layoutItems, dashboardIndexes)`;
  8. if still empty, try `buildLaunchpadTabsFromCanvas(_KDB)`.
- Do not deep-read `_KDB.state.tabs`.

### `state/buildLaunchpadTabsFromConfig.js`

- Signature should effectively be `(layoutItems, dashboardIndexes)`.
- For each dashboard index, get `layoutItems[layoutIndex]`.
- Build descriptor from that layout item with `layoutIndex`.
- Skip descriptors without real `tabId`.
- Compact `childIndex` to the output order, as legacy did.

### `state/buildLaunchpadTabsFromCanvas.js`

- Use `canvasItem.getContainer().getId()` when available.
- Dedupe by resolved `tabId`.
- Return descriptor objects with:
  - `aliases: [tabId]`
  - `childIndex`
  - `corTabIndex`
  - `pageId: tabId`
  - `tabId`
- Skip entries without a real `tabId`.

### `view/buildLaunchpadDom.js`

- Restore exact legacy classes:
  - hide spot class `KDB_hidden`;
  - root class `KDB_widgetLaunchpad`;
  - slot class `KDB_launchpadSlot`.
- Set `aria-hidden="true"` on hide spot.
- Pad container `id` and `className` both equal the configured legacy pad id, matching legacy `createContainer`.
- Use `data-kdb-launchpad-pad`, `cor_page_id`, and `cor_page_index` for slot DOM targeting.
- Preserve serializable `padsByKey` slot metadata and runtime `domRefs` split.

---

## E. Acceptance Criteria

1. ReadLints is clean for all modified launchpad files.
2. No new files are created.
3. No forbidden files are modified.
4. No widget movement, cleanup, classification, render, or `_KDB.state.widgets` write is introduced.
5. No `_KDB.state.tabs` deep-read is introduced.
6. No event emit/subscribe is introduced.
7. `KDB.js` remains unchanged.
8. `config/padConfig.js` contains the exact legacy pad ids.
9. `view/buildLaunchpadDom.js` contains the exact legacy launchpad classes and `aria-hidden`.
10. Config fallback uses layout items from `_KDB.cognosAPI.tabs.getTabsContainers()`, not config entries as descriptors.
11. Canvas fallback uses `getContainer().getId()` and does not invent synthetic tab ids.
12. AMD imports still resolve by static inspection.

---

## F. Report Back

Report:

1. Files modified.
2. One-line fix summary for D1-D4.
3. ReadLints result.
4. Confirmation that forbidden ownership/scope items remain absent.
5. Any deviation; if none, say `none`.
