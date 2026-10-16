# Contract Delta: canvas dropdown mark after a focus-mode commit

> Classification B. No earlier contract required the canvas settings panel to show the option chosen inside Cognos maximize. PO vastenburg 2026-09-28: after leaving maximize, the normal dropdown must show that choice.

---

**Status:** `Approved` — 2026-09-28 PO vastenburg (go after the recommendation held).  
**Type:** `feature-module contract delta`  
**Authoring AI:** Cursor Grok 4.7 coordinator, 2026-09-28  
**Parents:** `contracts/widgetSettings.md` (vis dropdown safeguard), `contracts/widgetVis.md` (maximize step 7), `contracts/widgetVis-show-values-contractdelta.md` §5.2, `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` §11.2

---

## 1. Purpose

A dropdown click inside the focus clone updates the chart and the clone’s `KDB_optionSelected` mark. The canvas panel (`.KDB_widgetSettings` / `data-kdb-widget-settings-root`) kept the mark from before maximize. After a confirmed commit, that canvas mark must match settings state, so leaving maximize shows the choice made inside it.

---

## 2. Closed product decisions

| # | Lock |
|---|---|
| 1 | After every **confirmed** user/history widgetVis settings commit for `dimension`, `visualization`, `topN`, `showValues`, `grouping`, `iterator`, and `zoom`, `finalizeVisIntentResult` calls `stampPanelVisType` for that widget. Drop the old gate that stamped only `visualization` / `iterator` / `zoom`. |
| 2 | Source of truth is `_KDB.state.widgets.settings`. Never copy `KDB_optionSelected` from the focus clone onto the canvas panel. |
| 3 | `stampPanelVisType` marks the canvas option rows for **visualization**, **dimension**, and **topN** as well as the rows it already marks (showValues, iterator, zoom, grouping) and `data-kdb-vis-type`. Reuse `markPanelOption`. No new stamp engine. No new `*DropdownSafeguard.js`. |
| 4 | Visualization mark token is the existing `resolveStampVisTypeKey` result (`prognose` for both IBM Prognose ids). Dimension mark token is `record.dimension` when non-empty, else `"none"`. TopN mark token is `record.topNChoice` when non-empty, else the TopN dropdown default (`"none"`). Lookup stays key-then-value inside `markPanelOption`. |
| 5 | Focus-clone matching still only copies `data-kdb-vis-type`. It does not clear or restamp clone option marks. |
| 6 | Failed or stale apply does not stamp. The canvas panel keeps the last committed selection. This delta does not add failure-revert for grouping, dimension, visualization, iterator, or zoom. |
| 7 | Do not optimistic-mark the canvas panel when the click was on the focus clone. Optimistic mark stays on the clicked dropdown only. |
| 8 | Do not move the live settings panel into expand. The focus panel stays a clone. Dispose stays chrome-only: no settings re-stamp on focus exit. |
| 9 | Startup, parameter-set restore, and history-batch restore keep their existing stamp call sites. This delta does not add a second stamp there. |

---

## 3. Files

| File | Action |
|---|---|
| `widgetSettings/effects/finalizeVisIntentResult.js` | Always stamp after a confirmed vis commit. No new AMD import. |
| `widgetSettings/view/stampPanelVisType.js` | Three extra `markPanelOption` calls. No new AMD import. Stay ≤150 lines. Do not change `clearIllegalGrouping`. |

**Must not:** `disposeFocusMode.js`, `bindFocusPanelInteractions.js`, `bindWidgetSettingsPanel.js`, `markPanelOption.js` API, live-panel move, class copy from the clone.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-28 | Draft → Approved | PO vastenburg | Canvas dropdown follows the committed choice after a maximize-mode pick. Stamp on success, not on focus exit. |
