# Execution Spec: `footer` Datenaktualisierung (`update_date`)

> Mechanical spec for grok 4.6 implementers. Architecture lives in `footer-update-date-contractdelta.md` (PO approved 2026-09-02). Do not re-decide T1/F1, S1, or `"n.v."`.
> No harness. Existing production footer only.

---

**Status:** `Ready for execution`
**Module / contract:** `contracts/footer.md` + `contracts/footer-update-date-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-02
**Executing AI:** grok 4.6 subagent (captain assigns)
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist

**May create:**

- `KDB3/js/dashboard/footer/effects/formatUpdateDate.js`
- `KDB3/js/dashboard/footer/effects/readUpdateDateFromRows.js`
- `KDB3/js/dashboard/footer/effects/loadFooterUpdateDate.js`

**May edit:**

- `KDB3/js/dashboard/footer/state/initialState.js`
- `KDB3/js/dashboard/footer/state/createFooterReducer.js`
- `KDB3/js/dashboard/footer/state/selectors.js`
- `KDB3/js/dashboard/footer/effects/__orchestratorFooterEffects.js`
- `KDB3/js/dashboard/footer/view/syncFooterFromState.js`
- `KDB3/js/dashboard/footer/createFooterController.js` (destroy: **one** `_footerEffects(..., { type: "__unmount" })` line; **no 10th AMD import**)
- `KDB3/js/core/config/tables.js` (`update_date` entry only: add `shape` + `pick`)

**Must not edit:** `KDB.js`, `eventSubscribe.md`, writeback, dashboardPdf, history/*.js, header/**, tableData/**, `.cursor/rules/*.mdc`, git.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` namespaces; no `_KDB.data`; services via `_KDB.services`.
2. `_____________KDB3API/.cursor/rules/state.mdc` — one writer per subtree; no foreign `_KDB.state.tableData` writes.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — abort own `updateDate` controller; never `abortTable`.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — footer stays dispatch-only; no new public methods.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no `tableData:loadFinished` subscribe for this leftover.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — effects not orchestrator; no 10th controller import.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files; German **state keys** grandfathered (`aktualisierungsDatumRaw` / `Formatted`).
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on executables; abort/`null` rows ≠ missing date.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — view reads footer/header **selectors**, not tableData; no foreign `_KDB.state.header`.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; named helpers at factory scope; no nested subfunctions; no async IIFE.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — footer chrome `status` is **not** lifecycle; do not invent hybrid terms.
12. `_____________KDB3API/contracts/footer-update-date-contractdelta.md` — S1 + T1 + F1 + `"n.v."`.
13. `_____________KDB3API/contracts/footer.md` §2.1 / §5 — shape + `footer/applyUpdateDate`.
14. This execution spec.

---

## Section B. Folder tree (create order)

```
KDB3/js/dashboard/footer/
  effects/formatUpdateDate.js                 (new)
  effects/readUpdateDateFromRows.js           (new)
  effects/loadFooterUpdateDate.js             (new)
  state/initialState.js                       (edit)
  state/createFooterReducer.js                (edit)
  state/selectors.js                          (edit)
  view/syncFooterFromState.js                 (edit)
  effects/__orchestratorFooterEffects.js      (edit)
  createFooterController.js                   (edit, one line)
KDB3/js/core/config/tables.js                 (edit update_date only)
```

---

## Section C. Per-file specifications

#### `KDB3/js/core/config/tables.js` (`update_date` only)

- **Role:** config
- **Lines:** do not grow the file except the `update_date` object.
- **Change:**

```js
update_date: {
  name: "aktualisierungsDatum",
  role: "update_date",
  description: "contains the date of the last update of the data",
  load: true,
  shape: "row",
  pick: ["display", "use"]
}
```

- Do not rename the key. Do not set `load: false`. Do not add `isCoreTable` on the config object (caller passes it).
- **Rules to apply:** `naming.mdc`; `feature-structure.mdc`.

#### `KDB3/js/dashboard/footer/effects/formatUpdateDate.js`

- **Role:** pure helper
- **Lines:** target 40 (hard 80)
- **AMD imports:** none (`define([], ...)`)
- **Entry:** `__controller(_rawValue)`
- **Body:**
  1. try/catch; `console.error("[footer.formatUpdateDate]", err); throw`
  2. trim string; empty → `null`
  3. `/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/` or `/^(\d{4})-(\d{2})-(\d{2})$/`
  4. return `day + "." + month + "." + year` **without leading zeros** (parseInt)
  5. else `null`
- **Return:** `__controller`
- **Rules to apply:** `amd.mdc`; `naming.mdc`; `error-handling.mdc` (named executable); English filename (not `formatAktualisierungsDatum.js`).

#### `KDB3/js/dashboard/footer/effects/readUpdateDateFromRows.js`

- **Role:** pure helper
- **Lines:** target 45 (hard 80)
- **AMD imports:** none
- **Entry:** `__controller(_rows)`
- **Body:**
  1. try/catch; log `[footer.readUpdateDateFromRows]`
  2. if not array or no `[0]`, return `null`
  3. row0 column `aktualisierungsDatum` if present, else first own key
  4. cell: `use` then `u` then `display` then `d`; skip empty
  5. return string or `null`
- **Rules to apply:** `amd.mdc`; `naming.mdc`; `error-handling.mdc`.

#### `KDB3/js/dashboard/footer/effects/loadFooterUpdateDate.js`

- **Role:** effect
- **Lines:** target 90 (hard 150)
- **AMD imports (order):**
  - `"./formatUpdateDate.js"`
  - `"./readUpdateDateFromRows.js"`
- **Factory-scope helpers (not nested inside each other):**
  - `function tableInput() { return [{ tableName: "update_date", shape: "row", isCoreTable: true }]; }`
  - `async function runUpdateDateLoadWork(_KDB, _signal)`
  - `function abortFooterUpdateDate(_KDB)`
  - `function loadFooterUpdateDate(_KDB)`
- **`abortFooterUpdateDate`:** abort `runtime.footer.abortControllers.updateDate` if present; do not `tableData.abortTable`.
- **`loadFooterUpdateDate`:**
  1. if `_KDB.runtime.footer.abortControllers.updateDate` exists and not aborted, return (do not double-start)
  2. `new AbortController()`; store on `abortControllers.updateDate`
  3. call `runUpdateDateLoadWork` (do not await in this function; fire-and-forget). Attach `.catch` that logs `[footer.loadFooterUpdateDate]` unless aborted
- **`runUpdateDateLoadWork`:**
  1. try: `tableData = _KDB.services.tableData`; if missing `waitForRows`/`readRows`, dispatch apply `"n.v."` and return
  2. `await waitForRows(tableInput())`
  3. if `_signal.aborted` return (do **not** apply `"n.v."`)
  4. `rows = readRows(tableInput())`; if `rows == null` and aborted, return
  5. `raw = readUpdateDateFromRows(rows)`; `formatted = formatUpdateDate(raw)`
  6. if aborted return
  7. `_KDB.api.footer.dispatch({ type: "footer/applyUpdateDate", payload: { source: "bootstrap", raw: raw, formatted: formatted || "n.v." } })`
  8. catch: if abort/`AbortError` return; else log `[footer.runUpdateDateLoadWork]` and dispatch `{ raw: null, formatted: "n.v.", source: "bootstrap" }` unless aborted
  9. finally: if this controller is still the stored one, `delete abortControllers.updateDate`
- **Wait result:** `waitForRows` already shapes rows. `readRows` after success is required (metricsTree belt). If `waitForRows` returns the shaped array, still call `readRows`; use `readRows` result if defined, else the wait result.
- **Return:** `{ loadFooterUpdateDate: loadFooterUpdateDate, abortFooterUpdateDate: abortFooterUpdateDate }`
- **Forbidden:** `_KDB.state.tableData`, `_KDB.cognosAPI`, `__getDashboardAPI`, `_KDB.data`, `reloadTable`, `ensureFreshRows`, `abortTable`, event subscribe, `tableName: "aktualisierungsDatum"`.
- **Rules to apply:** `amd.mdc` (async helper at factory scope, no IIFE); `error-handling.mdc`; `runtime.mdc`; `state.mdc`; `cognos-adapter.mdc`; `kdb-object.mdc`; `events.mdc` (no subscribe).

#### `KDB3/js/dashboard/footer/state/initialState.js`

- **Role:** initial state
- **Header comment:** grandfather German keys `aktualisierungsDatumRaw` / `aktualisierungsDatumFormatted` (PO lock; UI strings stay German; new files English).
- **Return:** `{ status: "idle", aktualisierungsDatumRaw: null, aktualisierungsDatumFormatted: null }`
- **Rules to apply:** `state.mdc`; `naming.mdc` (grandfather).

#### `KDB3/js/dashboard/footer/state/createFooterReducer.js`

- **Role:** reducer
- **Hard:** `copy(s)` must return `{ status: s.status, aktualisierungsDatumRaw: s.aktualisierungsDatumRaw == null ? null : s.aktualisierungsDatumRaw, aktualisierungsDatumFormatted: s.aktualisierungsDatumFormatted == null ? null : s.aktualisierungsDatumFormatted }`
- **`footer/toggle` | `show` | `hide`:** keep current status logic; **do not** touch date fields (copy already preserves).
- **`footer/applyUpdateDate`:**
  - next.raw = `payload.raw == null || payload.raw === "" ? null : String(payload.raw)`
  - next.formatted = payload.formatted == null || payload.formatted === "" ? `"n.v."` : String(payload.formatted)
  - if both equal current, `return state` (no-op)
  - do not change `status`
- **Unknown types:** `return state` (including `__mountSync` / `__unmount` if they ever hit the reducer — they must **not**; effects-only).
- **Pure:** no I/O, no try/catch.
- **Rules to apply:** `state.mdc`; `naming.mdc`; `error-handling.mdc` (reducer exempt).

#### `KDB3/js/dashboard/footer/state/selectors.js`

- **Role:** selectors
- **AMD:** keep `"../../header/state/selectors"`
- **Export additionally:** `readHeaderTitleText: _headerSelectors.readHeaderTitleText`
- Optional `readAktualisierungsDatumFormatted` **not required**.
- **Rules to apply:** `state.mdc`; `module-public-api.mdc`.

#### `KDB3/js/dashboard/footer/view/syncFooterFromState.js`

- **Role:** mutator
- **AMD imports:** `"../state/selectors.js"` (add). Keep no tableData import.
- **Delete** `readDataAktDate` entirely (properties/config/`26.4.2026`).
- **Keep** `formatDMY` + center `new Date() + " (unbekannt)"` unchanged (out of scope).
- Title: `_selectors.readHeaderTitleText(_KDB)` — **not** `_KDB.state.header`.
- `dataAktEl.textContent = "Datenaktualisierung: " + String((st && st.aktualisierungsDatumFormatted) || "n.v.")` when `active`.
- Never blank `#KDB_footer_dataAkt` while active.
- **Rules to apply:** `dom.mdc`; `state.mdc`; `amd.mdc`.

#### `KDB3/js/dashboard/footer/effects/__orchestratorFooterEffects.js`

- **Role:** effects orchestrator
- **AMD add (4th import):** `"./loadFooterUpdateDate.js"` as `_loadFooterUpdateDate`
- **Lines:** stay ≤ 120 (hard 150)
- Factory-scope: keep `ensureFooterMounted`, `teardownFooter`, `syncKdbControlReadView`
- **`__effects(_KDB, action, prevState)`:**
  1. try/catch existing
  2. if `action && action.type === "__unmount"`: `_loadFooterUpdateDate.abortFooterUpdateDate(_KDB)`; return (do not teardown/sync again beyond abort — destroy already clears DOM)
  3. existing: status !== active → teardown else ensure mounted; `syncFooterFromState`; `syncKdbControlReadView`
  4. if `action && action.type === "__mountSync"`: `_loadFooterUpdateDate.loadFooterUpdateDate(_KDB)`
  5. backup: if `st.status === "active"` and `st.aktualisierungsDatumRaw == null` and `st.aktualisierungsDatumFormatted == null`: `loadFooterUpdateDate(_KDB)`
- Do not await in `__effects`.
- **Rules to apply:** `error-handling.mdc`; `amd.mdc`; `feature-structure.mdc`; `events.mdc` (no new facts).

#### `KDB3/js/dashboard/footer/createFooterController.js`

- **Role:** controller (already over 60-line function cap — **do not grow** except the destroy line)
- **AMD imports:** stay **9**. Do **not** import `loadFooterUpdateDate`.
- **`destroy`:** immediately after `disposed = true`, call `_footerEffects(_KDB, { type: "__unmount", payload: { source: "bootstrap" } }, _KDB.state.footer);` then existing abort/unsubscribe/DOM clear.
- **`dispatch`:** `footer/applyUpdateDate` goes through existing `validSource` + `commitAction` (`source: "bootstrap"` is valid).
- **Rules to apply:** `module-public-api.mdc`; `runtime.mdc`; `feature-structure.mdc` (no 10th import).

---

## Section D. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle |
|---|---|---|---|
| `footer/toggle` | toolbox / api | flip `status` idle\|removed ↔ active (header guard is **controller**, not reducer) | none (chrome `status` ≠ lifecycle) |
| `footer/show` | restore / api | `status = active` if not already | none |
| `footer/hide` | header cascade / api | `status = removed` if was active | none |
| `footer/applyUpdateDate` | load effect | replace date fields; no-op if equal; no `status` change | none |
| `__mountSync` / `__unmount` | effects only | **must not** reach reducer | none |

---

## Section E. Published selectors

| Selector | Reads | Returns |
|---|---|---|
| `readFooterStatus` | `_KDB.state.footer.status` | `idle \| active \| removed` |
| `readHeaderStatus` | header selector re-export | header chrome status |
| `readHeaderTitleText` | header selector re-export | string |

---

## Section F. Public API wiring

- Surface unchanged: `_KDB.api.footer` `{ mount, destroy, dispatch, getState }`
- New action only: `footer/applyUpdateDate`
- Runtime: `abortControllers.updateDate` created by load helper, aborted on `__unmount`
- State init: `initialState.js` three fields

---

## Section G–I. Harness / mocks

**N/A.** No new harness. Do not add TEST HTML.

---

## Section J. Acceptance criteria

1. `#KDB_footer_dataAkt` never shows `26.4.2026`. Active chrome shows `Datenaktualisierung: <D.M.YYYY>` or `Datenaktualisierung: n.v.`.
2. Caller `tableName` is `update_date` with `isCoreTable: true`. No vis-title as `tableName`.
3. No `reloadTable` / `ensureFreshRows` / `abortTable` / `_KDB.state.tableData` / `_KDB.cognosAPI` / loadFinished subscribe.
4. `copy()` preserves dates across toggle/show/hide (hide then show still shows last applied date or `n.v.`, not a dropped cache).
5. `source: "bootstrap"` apply does not push history (`pushFooterHistoryStep` already skips bootstrap; snapshot is status-only — **do not edit history files**).
6. `createFooterController.js` still **9** AMD imports. File still ≤ 150 lines.
7. `waitForRows` abort/`null` does not store `"n.v."` as a fake miss.
8. `syncFooterFromState` uses `readHeaderTitleText`; no `_KDB.state.header` read.
9. Center Erstellt line and hardcoded URL / page `"1"` **unchanged**.
10. `tables.js` `update_date` still `load: true`.
11. New files English names. State keys German as locked.
12. Report: Section L checklist.

---

## Section K. Forbidden actions

- Re-open S2/S3, T2-as-primary, T3, T4, `reloadTable`, labels.de, PDF `Datenaktualität`.
- Subscribe to `tableData:loadFinished` / `loadFailed`.
- Add `writebackSet` to `SourceEnum`.
- Edit history/*.js, writeback, PDF, `KDB.js`, tableData service internals, `.mdc` rules.
- 10th import on `createFooterController.js`.
- Nested functions inside entry bodies / async IIFE.
- Commit / push / git config.
- Invent `helpers/` `shared/`.
- Read `_______KDB3` / `_______REDESIGN2` for copy-paste (format rules are in the delta; do not port `_KDB.data.tables`).
- Modify `contracts/_template.md` or `_executionSpecTemplate.md`.
- Skip Section A echo.

---

## Section L. Reporting template

1. Pre-flight echo (14 sentences).
2. File checklist: path, line count, matches spec | deviation.
3. Deviations with motivation.
4. Self-verification of Section J (pass/fail each).
5. Open questions for captain/PO.

---

## Section M. Reviewer handoff

Captain: two **fresh** grok 4.6 reviews after JS (mechanical vs spec; semantic vs delta). Then PO Cognos: footer on → Datenaktualisierung is the leftover List date, not `26.4.2026`; toggle off/on keeps the date; missing/fail → `n.v.`.
