# Contract Delta: tab progress caption on the parameterset overlay

> Product decisions closed by PO vastenburg 2026-10-06. Tranche 1 is the parameterset overlay only. No production code until the tranche-1 execution spec is reviewed and the PO says go.

---

**Status:** `Approved`
**Type:** `shared service caller delta` (no new loadingService mount, no new public field)
**Authoring AI:** Cursor coordinator, 2026-10-06
**Classification:** **(c)** The headline is the agreed behaviour. The tab line is new. The code matches the contracts this delta amends. This is not a bugfix.

**Parents this delta will amend after `Implemented` (not in tranche 1):**

| Parent | Sentence superseded, for `writeback-set-loading` only |
|---|---|
| `contracts/loadingService-dashboardPdf-progress-caption-sandwich-contractdelta.md` §3 and §7.5 | SET stays one caption below the spinner, with no session node |
| `contracts/loadingService-overlay-coverage-contractdelta.md` | SET call is exactly `{ mountEl, mountKey: "writeback-set-loading", messageKey: "dashboardRestore" }` |
| `contracts/loadingService-overlay-coverage-cognos-followup-contractdelta.md` | Unchanged in tranche 1. Tab-page copy stays `Registerkarte wird geladen` |

PDF sandwich behaviour is unchanged. WP-Q removal ownership is unchanged. No new `.mdc`. No new `_KDB` namespace. No second spinner.

---

## 1. Why this is (c)

**FACT, coordinator spot-check.** Parameterset restore starts one overlay and never updates it (`loadingGuards.js:24-28`, `messageKey: "dashboardRestore"`). That string is `Dashboard wird wiederhergestellt` (`loadingLabels.js:7`). No session line, no tab id, no tab name.

**FACT, coordinator spot-check.** `updateLoadingMessage` rewrites only `.KDB_loadingMessage`, the line under the spinner (`updateLoadingMessage.js:43-44`). The line above the spinner is set only at `startLoading` via `sessionMessage` / `sessionMessageKey`. The spinner container is already a column (`loadingAnimation.css:94-100`), and `.KDB_loading .KDB_loadingSessionMessage` is already styled (`loadingAnimation.css:131-137`). No CSS change.

**FACT.** Approved sandwich text still forbids a session node on SET (`loadingService-dashboardPdf-progress-caption-sandwich-contractdelta.md:48`, `:158`). This delta supersedes that sentence for `writeback-set-loading` only.

The tab-page overlay (`applyTabPageLoading.js:19`, `messageKey: "tab"`) is a different mount. `traverseTabs.js:59-61` still starts it during restore. Tranche 1 does not change that.

---

## 2. Closed product decisions (PO vastenburg 2026-10-06)

| # | Decision |
|---|---|
| D-L1 Layout | Sticky headline **above** the spinner. Changing tab line **below**. No new `startLoading` or `updateLoadingMessage` field. Other callers stay one caption below the spinner. |
| D-L2 Copy | When the visible total is known: `Registerkarte {n} von {m}: {name}`. Otherwise `Registerkarte {n}: {name}`. Empty name drops the colon and the name. No invented `Tab N`. A hidden slot has no `{n}`; the line is the name only, or absent when the name is empty. |
| D-L3 Scope | This delta records both surfaces. Tranche 1 implements the parameterset overlay only. The tab-mutation hook waits for a later go. Duplicate rebuild is not rewritten. |
| D-L4 Target | The new line is on `writeback-set-loading` only. The tab-page overlay and WP-Q removal stay as they are. |

There is no catalog key for “Dashboard wird aufgebaut”. The headline stays `dashboardRestore`. Boot stays `dashboard`.

---

## 3. Normative behaviour (tranche 1)

### 3.1 Start and finish

`startLoadingGuarded` passes `sessionMessageKey: "dashboardRestore"` and does **not** pass `message` or `messageKey`. The stage line starts empty. Finish stays `finishLoadingGuarded`. A caption failure must not change the restore outcome (same rule as the loading guards today).

Mount and mountKey stay `.dashboardFrame` / `writeback-set-loading`. `urlShareBootOverlayActive` still skips `startLoading`.

### 3.2 When the tab line changes

| Moment | Update |
|---|---|
| Step 27, after `forceShow` of a vis group succeeds | The tab of that group's `tabIdx` |
| Step 28, after `tabs/postParameterSetRestoreTraverseRequested` returns | The landing tab: first visible dashboard tab |

Steps 18 and 23 do not change the line. This tranche does not edit `traverseTabs.js`, so during the step-28 click sequence the line stays on the last step-27 tab until the phase returns. That lag is accepted.

If step 27 never runs, the line appears only at the step-28 landing. If neither runs, the overlay keeps the headline and an empty stage line.

### 3.3 Number, name, total

`{n}` is the 1-based index of that slot in `readVisibleTabs` (`visible === true` dashboard tabs in `state.order`). It is not the `byIndex` key and not the writeback `tabIdx`.

Writeback `tabIdx` is the 0-based index in dashboard-role slots along `state.order` (the same index `listDashboardSlots` uses). Resolve the slot from the published tabs snapshot (`selectors.readTabsState` / `readVisibleTabs`). Do not import `listDashboardSlots.js`. If `role` is missing, do not apply the `maxUserTabs` fallback: skip the update and warn.

`{name}` is `byIndex` `name` of that slot when it is a non-empty string. `{m}` is `readVisibleTabs().length` when the slot is in that list. A hidden slot omits `{n}` and `{m}`.

### 3.4 Catalog

New keys live in `loadingLabels.js`. The writeback caller formats tokens. `loadingService` does not grow a token engine. `{name}` is substituted last.

| Key | DE |
|---|---|
| `tabProgressNamedCounted` | Registerkarte {n} von {m}: {name} |
| `tabProgressNamed` | Registerkarte {n}: {name} |
| `tabProgressCounted` | Registerkarte {n} von {m} |
| `tabProgressNumber` | Registerkarte {n} |
| `tabProgressName` | {name} |

No tab line: call `updateLoadingMessage` with `message: ""` and no `messageKey`. `resolveLoadingMessage` already returns `""` for that shape, and `syncLoadingCaption` hides the stage node.

---

## 4. Later, not this tranche

Tab mutation may later pass an operation headline through the existing traverse into `applyTabPageLoading`. `source: "tabsMutation"` does not distinguish copy, delete and move. That hook is not approved for implementation yet. Delete/move rebuild-on-stock and the copy-tranche undo/redo miss are out of scope.

---

## 5. Out of scope for tranche 1

- Editing `traverseTabs.js`, `applyTabPageLoading.js`, PDF, CSS, or loadingService internals.
- A new mount, namespace, event, or state field.
- Parent text-sync (after `Implemented`).
- Swallowing host errors. Reordering restore steps.

---

## 6. Approval log

| Date | Status | Who | Note |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | coordinator | Classification (c). Spot-checks: `loadingGuards.js:24-28`, `applyTabPageLoading.js:19`, `updateLoadingMessage.js:43-44`, `traverseTabs.js:59-61`. |
| 2026-10-06 | `Draft` → `Approved` | PO vastenburg | D-L1 sandwich. D-L2 `von {m}` when the total is known. D-L3 parameterset first. D-L4 frame overlay only. |
