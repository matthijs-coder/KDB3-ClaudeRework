# Contract Delta: loading caption for tab move, delete, and copy

> PO chose this shape on 2026-10-06. Pre-check PASS-WITH-NITS, slot sentence folded. No production code until an execution spec exists and the PO says go.

---

**Status:** `Approved`
**Type:** `tabs caller delta` on the existing `loadingService`
**Authoring AI:** Cursor coordinator, 2026-10-06
**Classification:** **(c)** The parameterset caption is doing what tranche 1 specified. Tab actions never received it. The page overlay they do get is a different, short-lived spinner with one generic sentence. This is new behaviour, not a bugfix.

**Extends:** `contracts/loadingService-tab-progress-caption-contractdelta.md` D-L3 (tab mutation was waiting). That delta’s parameterset rules stay as implemented.

**Does not change:** WBParameterSet `writeback-set-loading`, PDF sandwich, WP-Q removal of `kdb-tab-page-loading`, widget rebuild, or delete/move-on-own-stock.

---

## 1. What the user sees today

**FACT, coordinator spot-check.** `traverseTabs.js:59-61` starts `kdb-tab-page-loading` with `messageKey: "tab"` (`Registerkarte wird geladen`). `traverseTabs.js:80-81` finishes it before the traverse function returns. Widget placement runs after that return.

**FACT, coordinator spot-check.** Live move calls `applyMoveSnapshotFirst` with no reveal slot (`handleApplyTabMutation.js:36`). The reveal traverse is inside `if (revealSlot && …)` (`applyTabMutationDuplicate.js:109-110`). A move whose slots are already active can show no spinner at all.

**FACT.** Copy, delete, and `restoreDeleted` reveal a destination only while that slot is rebuilt, then the page overlay ends. `runTabMutationSaga` (`runTabMutationSaga.js:16`) is the body for move, delete, copy, and restore, including undo/redo. It does not start a loading overlay. Its `define` already has 10 imports.

The parameterset sheet on `.dashboardFrame` is a different mount and is not started here.

---

## 2. Closed product choice (PO vastenburg 2026-10-06)

One loading sheet for the whole tab action, on `.dashboardFrame`, same two-line API as the parameterset:

| Line | When it is set |
|---|---|
| Headline, above the spinner | Once, from `plan.operation` |
| Tab line, below the spinner | When a tab is actually shown |

While that sheet is up, a `tabsMutation` traverse must not also start `kdb-tab-page-loading`. One picture, not two.

---

## 3. Normative behaviour

### 3.1 Start and finish

After `planResult.ok` and before `ensureSlots`, start:

```js
loading.startLoading({
  mountEl: dashboardFrame,
  mountKey: "tabs-mutation-loading",
  sessionMessageKey: "<operation key>"
})
```

No `message` and no `messageKey` at start. The tab line stays empty until the first update.

Finish only `tabs-mutation-loading`, in a `finally` that also runs on abort, rollback, and the landing traverse. Call that finish only when this saga attempted `startLoading` for that key. A skipped start must not call `finishLoading`: `markLoadingFinished` creates an entry when the key is unknown. Do not finish `kdb-tab-page-loading` or `writeback-set-loading` from this path. Set the attempted flag immediately before `startLoading`, so a failure inside that call still reaches the finish.

If `writeback-set-loading` is already active, do not start. A second `startLoading` on the same `.dashboardFrame` reuses one spinner and a later finish removes it (`applyLoadingOverlay.js` direct-child reuse). Skipping avoids that collision. PDF and a normal parameterset are otherwise unchanged.

A caption failure warns and continues. It must not fail the mutation, and it must not swallow a host or saga error.

`runTabMutationSaga.js` may add exactly one AMD import, `tabs/effects/formatTabMutationCaption.js`. No other new import. Do not put the formatter in `config/actionTypes.js`. Do not import `publishRestoreTabCaption.js`. The role walk in that writeback file is not copied: the plan and the traverse already carry the physical index.

### 3.2 Headline

New catalog keys in `loadingLabels.js`. No German in the tabs modules.

| `plan.operation` | Key | DE |
|---|---|---|
| `duplicate` | `tabMutationCopy` | Registerkarte wird kopiert |
| `delete` | `tabMutationDelete` | Registerkarte wird gelöscht |
| `move` | `tabMutationMove` | Registerkarte wird verschoben |
| `restoreDeleted` | `tabMutationRestore` | Gelöschte Registerkarte wird wiederhergestellt |

Undo and redo use the operation the saga actually runs. Undo of a copy is `tabs/delete`, so the headline is `Registerkarte wird gelöscht`. Undo of a delete is `restoreDeleted`. That is the honest verb, not “undo” copy.

### 3.3 Tab line

Reuse the existing `tabProgressNamedCounted`, `tabProgressCounted`, `tabProgressNumber`, `tabProgressNamed`, and `tabProgressName` templates. Same rules as the parameterset delta: `{n}` is the 1-based index in `readVisibleTabs`, matched by physical `index`. Empty name drops the colon. A hidden slot has no `{n}`. Do not invent `Tab N`. Do not copy the plan fallback `"Tab " + (index + 1)`.

The tabs module formats the string. It must not import `writeback/set/effects/publishRestoreTabCaption.js`.

Update the line with `updateLoadingMessage({ mountKey: "tabs-mutation-loading", message })` at each `tabsMutation` traverse that shows a tab (slot activation, reveal, landing). If that call returns `false`, the sheet is not up: start `kdb-tab-page-loading` as today. User click, PDF, and WBParameterSet traverses do not go through this branch.

The initial tab, before the first traverse, is the slot the user acted on:

| Operation | Initial slot |
|---|---|
| `move` | `sourceSlot` (`buildTabMovePlan.js:32`) |
| `delete` | `deletedSlot`, name `deletedName` (`buildTabMutationPlan.js:26-27`) |
| `duplicate` | `sourceSlot` (`buildTabDuplicatePlan.js:31`, `:38`). Not `insertSlot`, which is the neighbor at `source.tabIdx + 1`. |
| `restoreDeleted` | `insertSlot` (`buildTabRestoreDeletedPlan.js:35`, `:42`). `revealSlot` is the hidden shell, a different tab. |

During widget placement the line stays on the last tab that was shown. Move with no mid-saga traverse keeps the source tab on the line until the landing traverse replaces it.

### 3.4 What stays

`applyTabPageLoading.js` stays the page overlay. It is at the 150-line cap, so this delta does not add a branch there. `traverseTabs.js` is at the same cap: the mutation branch replaces the existing `start` call, it does not add a second block.

Do not rewrite `rebuildSlotFromEntries`, `placeSerializedWidgetEntry`, or the move/delete shell shift.

---

## 4. Out of scope

- A new `_KDB` namespace, event, or `startLoading` field.
- Changing the parameterset caption, PDF captions, or WP-Q snapshot removal.
- Delete and move rebuilt on slot stock.
- Parent text-sync before this delta is `Implemented`.

---

## 5. Approval log

| Date | Status | Who | Note |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | coordinator, after PO choice | Frame sheet for the whole saga. Page overlay stays off while it is up. Spot-checks: `traverseTabs.js:59-61` and `:80-81`; `handleApplyTabMutation.js:36`; `applyTabMutationDuplicate.js:109-110`. |
| 2026-10-06 | pre-check PASS-WITH-NITS → `Approved` | coordinator | [Pre-check](45a3eafc-bcbc-4764-b4d9-4696f2f0ebbc). Slot sentence folded. Coordinator spot-check: duplicate `sourceSlot` is `buildTabDuplicatePlan.js:31`; restore `insertSlot` is `buildTabRestoreDeletedPlan.js:35`. |
| 2026-10-06 | stress STAND, formatter shrink, PO go | coordinator | Consequences stand. One new effect file. No role-walk copy. Saga may take that single extra import. `finishLoading` runs only if this saga attempted `startLoading`, so a skipped start does not create a loading entry. |
