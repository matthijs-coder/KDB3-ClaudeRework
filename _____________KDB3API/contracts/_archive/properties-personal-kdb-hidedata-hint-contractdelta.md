# Contract Delta: Entwicklermodus Hinweis on leftover `Personal_KDB`

> PO vastenburg 2026-09-10: park always writes HideData on `personal_kdb`. Authors save the dashboard with that filter still on; next boot spends extra seconds unparking before the Kennzahlen tree. They want a small **Hinweis** to remove HideData before save. **Leave `core/authoring` alone.** Army H2: leftover is only visible under `#main.KDB_developerMode`, so the hint belongs on the properties developer-mode apply path.

---

**Status:** `Implemented` — live-file review PASS 2026-09-10. Cognos-host smoke pending PO.
**Type:** `shared service contract delta` (properties)
**Authoring AI:** Cursor Grok 4.6 (captain), 2026-09-10
**Spec:** `contracts/properties-personal-kdb-hidedata-hint-execution-spec.md`

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/leftover-widgets-developer-hide-contractdelta.md` | §3 “No leftover-specific JS” — hide stays CSS-only. This WP adds **one** properties hint on `Personal_KDB` only. Do not put hide logic in JS. **No** `visibility: visible`. |
| `contracts/kdbControl-developer-mode-toggle-contractdelta.md` | Class owner stays properties. kdbControl stays toggle UI (own DOM only). |
| `contracts/properties.md` | Approval-log one-liner after JS. `applyDeveloperMode` stays sync. |

Authoring, widgetBase leftover titles, park wrap, `listLocalFilters`: **OOS**.

---

## 1. Purpose

When Entwicklermodus is **on**, show a German hint on the leftover `Personal_KDB` shell: remove the HideData filter before saving. When **off**, remove the hint. Unconditional if that leftover exists (do not list filters). Fail-open.

---

## 2. Product lock

| # | Lock |
|---|---|
| 1 | **H2.** Wire from `applyDeveloperMode.js` after a successful class apply (boot / cognos / kdbControl / writebackRestore). Leave `core/authoring/**` untouched. |
| 2 | Do **not** thicken `applyHideWidgetsToggleChange.js`. Do **not** put leftover DOM in kdbControl. |
| 3 | `applyDeveloperMode` stays **sync**. Hint wait is fire-and-forget inside the new effect (not awaited by apply). |
| 4 | Widget: `tableName: "personal_kdb"` → `tableData.waitForRows` then `readTableState` (one object) → `.widgetId` → `document.getElementById(widgetId)`. Title only via `_KDB.config.tables.personal_kdb.name` if needed — **never** a `"Personal_KDB"` literal in widgetBase. No `resolveTableWidgetId` import. |
| 5 | Personal leftover only. Not BW/DEZPV hierarchy leftovers. |
| 6 | German only: `_KDB.config.labels.de.developerMode.hideDataBeforeSaveHint`. Copy: `Hinweis: HideData-Filter vor dem Speichern entfernen`. |
| 7 | No `listLocalFilters`. No `_KDB.cognosAPI`. No new `_KDB` namespace / event. No `helpers`/`common`/`shared`. |
| 8 | CSS: new sheet under `#main.KDB_developerMode`. Do **not** add `visibility: visible` (HideSpot punch-through). |
| 9 | Idempotent badge (`data-kdb-hidedata-hint`). Off / disposed / missing widget → remove or skip. Stale `waitForRows` ignored (module seq). |

---

## 3. Files (exclusive)

**Create**

- `KDB3/js/core/properties/effects/applyPersonalKdbHideDataHint.js`
- `KDB3/js/core/properties/config/developerModeLabels.js`
- `KDB3/css/widgets/leftoverWidgets.css` — hint banner under `#main.KDB_developerMode` (merged 2026-09-10; no extra sheet)

**Edit**

- `KDB3/js/core/properties/applyDeveloperMode.js` — AMD 1→2; call hint after every successful source branch; stay sync; ≤150.
- `KDB3/js/core/properties/__orchestratorProperties.js` — AMD 6→7; stamp `labels.de.developerMode`; orch ≤120.
- `KDB3/js/core/css/config/cssHrefList.js` — leftover sheet already listed; no extra href.

**Do not touch:** `applyHideWidgetsToggleChange.js`; `core/authoring/**`; kdbControl leftover DOM; widgetBase; tableData wrap; `leftoverWidgets.css` hide rule; `KDB.js`; `.mdc`; git.

---

## 4. Acceptance

1. Entwicklermodus **on**: leftover `Personal_KDB` shows the Hinweis (German from labels.de).
2. Entwicklermodus **off**: hint node gone.
3. Authoring enter/exit does not add/remove the hint.
4. Missing leftover / no `widgetId` / wait fail: no throw, no toast.
5. Toggle twice: one badge, not stacked.

---

## 5. Out of scope

- Auto-remove HideData on save (Cognos save is host).
- Hint on Dienststelle leftovers.
- `getFilterList` Personal NPE.
- Changing leftover hide CSS subject list.
