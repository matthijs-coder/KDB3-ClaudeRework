# Contract Delta: Exit widget focus mode before dashboard PDF capture, restore after

> Product ack PO vastenburg 2026-08-27: toolbar PDF is a dashboard document, not a screenshot of maximize/focus overlay. Temporarily exit confirmed focus mode, export the normal dashboard, restore focus in `finally`.

---

**Status:** `Implemented` — code review PASS 2026-08-27 (captain vs contract); Cognos-host not verified in-browser
**Parent:** `contracts/dashboardPdf.md`
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6, 2026-08-27
**Reviewed by:** PO vastenburg (product route)

---

## 1. Purpose

When a visualization is in Cognos focus/maximize mode, widget content lives in `.expandModeContainer` and the canvas shell is empty. `html2canvas` of `.pagegenericPage` then paints a small empty widget.

`exportDashboardPdf` must normalize the live view before capture: exit confirmed focus mode, run the existing dashboard PDF, restore the same widget(s) after original-tab restore. Maximize remains a viewing aid; it does not change PDF scope (no focused-widget-only PDF, no extra enlarge page).

Amends `dashboardPdf.md` Execution Contract stages 3 and 8, plus error/warning codes.

---

## 2. Product

| Moment | Focus mode |
|---|---|
| Export not running | unchanged |
| Loading overlay + capture class already on (existing stages 1–2) | still on; user does not see collapse/expand |
| After visible-tab manifest is valid, before title page / tab capture | snapshot maximized widget ids; exit via `widgetVis` public API |
| Tab loop, Anhang, save | canvas widgets populated; no expand overlay |
| `runDashboardPdfExport` `finally` | restore original tab, then restore focus for ids that were successfully exited |
| Outer service `finally` | capture class off, loading overlay off (unchanged) |

One toolbar button, one dashboard document. Cover page and Anhang unchanged.

---

## 3. Ownership

- **Canonical focus owner:** `widgetVis`. Confirmed mirror is `_KDB.state.widgets.vis.byId[widgetId].maximized`.
- **dashboardPdf** is a consumer only: `widgetVis.getState()` and `widgetVis.dispatch({ type: "widgetVis/maximizeToggle", ... })`.
- dashboardPdf does not write `_KDB.state.widgets.vis`, `_KDB.runtime.widgetVis`, or Cognos focus DOM.
- dashboardPdf does not import widgetVis internals (`state/`, `effects/widgetFocusMode.js`, selectors registry files).
- `source` on the action payload is `"programmatic"` (already allowed on `widgetVis/maximizeToggle`).
- No new events. No `_KDB.state.dashboardPdf`. No widgetVis public-API shape change (`mount/destroy/dispatch/getState` unchanged).

---

## 4. Snapshot and exit

Read ids from `_KDB.api.widgetVis.getState().byId` where `maximized === true`. Deterministic `Object.keys` order. Typically one id (Cognos expands one widget); exit all matches serially.

Dispatch per id:

```js
_KDB.api.widgetVis.dispatch({
  type: "widgetVis/maximizeToggle",
  widgetId: widgetId,
  payload: { nextMaximized: false, source: "programmatic" }
})
```

Await each result. `ok === true` (including already-collapsed) appends the id to `exitedWidgetIds`. Stop at first failure.

| Condition | Result |
|---|---|
| `widgetVis` API / `getState` missing or `getState()` is `undefined` | warning `DASHBOARD_PDF_FOCUS_STATE_UNAVAILABLE`; `ok:true`; `widgetIds:[]`; export continues |
| No `maximized === true` | `ok:true`; `skipped:true`; `widgetIds:[]` |
| Exit dispatch `ok !== true` | fatal `DASHBOARD_PDF_FOCUS_EXIT_FAILED`; no PDF; still restore any ids already exited |
| Exit throws | same fatal; restore any exited ids |

Failed exit is knowingly incomplete capture (empty shell), so it is fatal, same class as capture/readiness failure.

---

## 5. Restore

Run in `runDashboardPdfExport` `finally` **after** original-tab restore, **before** outer service `finally` (capture class and loading overlay still on).

For each id in `exitedWidgetIds` (same order), dispatch `nextMaximized: true`, `source: "programmatic"`. Await serially.

Restore runs on success, error, and abort. Empty `exitedWidgetIds` is a no-op (`ok:true`, `skipped:true`).

Failed restore: `console.warn` + warning `DASHBOARD_PDF_FOCUS_RESTORE_FAILED`. If the PDF already saved (`ok:true`), keep `ok:true` and attach the warning (same pattern as `DASHBOARD_PDF_RESTORE_FAILED`). Do not delete or withhold a saved PDF.

---

## 6. Out of scope

- Focused-widget-only PDF
- Extra PDF page of the enlarge overlay
- widgetVis history for maximize
- New widgetVis methods (`exitAll`, `restoreFocus`, …)
- pdfExportControls changes
- Changing capture-class hide-set
- Importing widgetVis internal files from dashboardPdf

---

## 7. Files

- `KDB3/js/core/services/dashboardPdf/effects/manageFocusModeForExport.js` (new)
- `KDB3/js/core/services/dashboardPdf/runDashboardPdfExport.js` (wire exit + restore)
- `contracts/dashboardPdf.md` (Execution Contract + error/warning list) — coordinator
- `contracts/widgetVis.md` (allowed programmatic caller note) — coordinator

---

## 8. Acceptance

1. PDF started while a vis widget is maximized: capture shows that widget populated on the canvas, not an empty shell and not the enlarge overlay.
2. After success, error, or abort, the same widget is maximized again when exit succeeded; loading overlay still covers expand.
3. No maximize at start: behavior identical to today (no extra dispatch).
4. Failed exit: no PDF saved; coded `DASHBOARD_PDF_FOCUS_EXIT_FAILED`.
5. Failed restore after save: PDF kept; warning `DASHBOARD_PDF_FOCUS_RESTORE_FAILED`.
6. Missing `widgetVis.getState`: warning `DASHBOARD_PDF_FOCUS_STATE_UNAVAILABLE`; export continues.
7. dashboardPdf does not write vis state/runtime.
