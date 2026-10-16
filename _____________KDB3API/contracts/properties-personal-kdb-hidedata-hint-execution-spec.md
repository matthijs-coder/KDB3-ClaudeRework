# Execution Spec: Entwicklermodus HideData hint on `Personal_KDB`

> Mechanical spec. Architecture: `properties-personal-kdb-hidedata-hint-contractdelta.md`. Do **not** re-decide H2, authoring, kdbControl leftover DOM, or `listLocalFilters`.
> Production: `_____________KDB3API/KDB3/**`.

---

**Status:** `Implemented` — live-file review PASS 2026-09-10. Cognos-host smoke pending PO.
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-10
**Executing AI:** grok 4.6 army (one writer)
**Reviewer:** dual grok 4.6 + PO Cognos

---

## Exclusive allowlist (one writer)

**Create:** `KDB3/js/core/properties/effects/applyPersonalKdbHideDataHint.js`; `KDB3/js/core/properties/config/developerModeLabels.js`

**Edit:** `KDB3/js/core/properties/applyDeveloperMode.js`; `KDB3/js/core/properties/__orchestratorProperties.js`; `KDB3/js/core/css/config/cssHrefList.js`

**Must not edit:** `applyHideWidgetsToggleChange.js`; `core/authoring/**`; kdbControl leftover DOM; widgetBase; tableData wrap; `leftoverWidgets.css`; `KDB.js`; contracts (captain); `.mdc`; git.

---

## Section A. Pre-flight (echo one sentence each before JS)

1. `kdb-object.mdc` — no new top-level namespace; labels under `_KDB.config.labels.de.developerMode`.
2. `state.mdc` — no new `_KDB.state` writer.
3. `runtime.mdc` — no new runtime bucket; in-flight cancel is module-scope seq.
4. `module-public-api.mdc` — `applyDeveloperMode` signature stays sync; no new public method.
5. `events.mdc` — no new events (`properties:hideWidgetsToggled` still not invented).
6. `feature-structure.mdc` — JS ≤150; orch ≤120; AMD ≤10; no helpers/common/shared.
7. `naming.mdc` — English files; `_` on boundary params; CSS `kdb-hidedata-save-hint`.
8. `error-handling.mdc` — try/catch on named helpers; fail-open (log, no throw to apply).
9. `dom.mdc` — `getElementById(widgetId)` on leftover shell only; no `getElementById("main")`.
10. `amd.mdc` — one `define` per JS file; factory-scope helpers; no ES modules; no `.catch` on the applyDeveloperMode entry.
11. `cognos-adapter.mdc` — no `_KDB.cognosAPI`; tableData public API only.
12. The chrome/hint contract delta + this spec.

---

## Section B. Per-file

#### `developerModeLabels.js`

- AMD `define([], …)` return `{ hideDataBeforeSaveHint: "Hinweis: HideData-Filter vor dem Speichern entfernen" }`.

#### `applyPersonalKdbHideDataHint.js`

- AMD `define([], …)`. Return factory-scope `applyPersonalKdbHideDataHint(_KDB)`.
- Off / missing properties: remove existing `[data-kdb-hidedata-hint]`, return.
- On: increment module `hintSeq`; `async` factory-scope `waitAndAppend(_KDB, _seq)`:
  - `waitForRows([{ tableName: "personal_kdb" }])` then `readTableState([{ tableName: "personal_kdb" }])` (array of one; a bare object throws and returns `undefined`).
  - If `_seq !== hintSeq` or toggle now off: return.
  - `widgetId` → `document.getElementById(widgetId)`.
  - If node already has `[data-kdb-hidedata-hint]` child: skip.
  - Else `createElement("div")`, class `kdb-hidedata-save-hint`, attr `data-kdb-hidedata-hint`, `textContent` from labels (fallback empty → skip). `appendChild`.
- All failures: `console.error`, no throw.
- Do not import widgetBase. Do not hardcode leftover vis title.

#### `applyDeveloperMode.js`

- AMD add `./effects/applyPersonalKdbHideDataHint.js` as `_applyPersonalKdbHideDataHint`.
- After every **successful** source branch (boot/cognos and kdbControl/writebackRestore), call `_applyPersonalKdbHideDataHint(_KDB)` (sync call; do not await).
- Stay sync. Do not call hint on unknown source. ≤150.

#### `__orchestratorProperties.js`

- AMD add `./config/developerModeLabels.js`.
- In `__orchestrator`, stamp `_KDB.config.labels.de.developerMode` via `Object.assign` (writeback/dienststelle pattern). Keep file ≤120.

#### `leftoverWidgets.css`

- Hint banner only under `#main.KDB_developerMode .kdb-hidedata-save-hint` in this same leftover sheet (no extra file).
- Small readable banner (absolute, high z-index, padding, contrast). **No** `visibility: visible`. No German in CSS.

#### `cssHrefList.js`

- No extra href. Hint lives in `./v1/ext/KDB3/css/widgets/leftoverWidgets.css`.

---

## Section C. Done when

Section A echoes; line + AMD counts; apply stays sync; authoring/kdbControl leftover DOM untouched. STOP.
