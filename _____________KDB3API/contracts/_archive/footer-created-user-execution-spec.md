# Execution Spec: `footer` Erstellt user (`getUserName`)

> Mechanical spec for grok 4.6 implementers. Architecture lives in `footer-created-user-contractdelta.md` (PO go 2026-09-02). Do not re-decide adapter rings, `userName`, or `"unbekannt"`.
> No harness. Existing production footer + dashboard facet only.

---

**Status:** `Ready for execution`
**Module / contract:** `contracts/footer.md` + `contracts/footer-created-user-contractdelta.md` + `contracts/cognosHostService.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-02
**Executing AI:** grok 4.6 subagent (captain assigns)
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist

**May create:**

- `KDB3/js/core/cognosAPI/dashboard/getUserName.js`
- `KDB3/js/dashboard/footer/effects/readDashboardFacet.js`
- `KDB3/js/dashboard/footer/effects/loadFooterCreatedUser.js`

**May edit:**

- `KDB3/js/core/cognosAPI/dashboard.js` (wire `getUserName`; **keep** `getUserInfo`; AMD 3 → 4, still ≤ 6)
- `KDB3/js/core/services/cognosHost/facets/dashboard/createDashboardAdapter.js` (one bind `getUserName`; no new AMD import)
- `KDB3/js/dashboard/footer/__orchestratorFooter.js` (stamp `dashboardFacet`; preserve if runtime already exists)
- `KDB3/js/dashboard/footer/state/initialState.js`
- `KDB3/js/dashboard/footer/state/createFooterReducer.js`
- `KDB3/js/dashboard/footer/view/syncFooterFromState.js`
- `KDB3/js/dashboard/footer/effects/__orchestratorFooterEffects.js` (5th AMD: `./loadFooterCreatedUser.js`; `__mountSync` + backup; stay ≤ 150)

**Must not edit:** `KDB.js`, `createFooterController.js`, `loadFooterUpdateDate.js`, `formatUpdateDate.js`, `readUpdateDateFromRows.js`, `tables.js`, history/*.js, writeback, dashboardPdf, header/**, tableData/**, `.cursor/rules/*.mdc`, git, `getUserInfo` body (leave dead-but-kept).

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` namespaces; services via `_KDB.services`; no `_KDB.data`.
2. `_____________KDB3API/.cursor/rules/state.mdc` — one writer per subtree; footer writes only `_KDB.state.footer`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — stamp `dashboardFacet` on `runtime.footer`; do not invent buckets.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — footer stays dispatch-only; no new public methods.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new footer fact subscribe for this leftover.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — effects not orchestrator business; AMD walls.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files and state key `createdUserName`; UI literal `"unbekannt"` stays German.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on executables; reducer exempt.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — view reads footer state; no facet / `_KDB.cognosAPI` in view.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; factory-scope helpers; no nested subfunctions; no async IIFE.
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — footer uses stamped facet; never `__getDashboardAPI` / `_KDB.cognosAPI`; D4 existing facet.
12. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — footer chrome `status` is not lifecycle.
13. `_____________KDB3API/contracts/footer-created-user-contractdelta.md` — S1 `createdUserName`; `getUserName` flatten; `"unbekannt"`.
14. `_____________KDB3API/contracts/cognosHostService.md` — dashboard metadata = primitives; live object = failed; shareControls stamp analogue.
15. This execution spec.

---

## Section B. Folder tree (create order)

```
KDB3/js/core/cognosAPI/dashboard/getUserName.js
KDB3/js/core/cognosAPI/dashboard.js                          (edit)
KDB3/js/core/services/cognosHost/facets/dashboard/createDashboardAdapter.js  (edit)
KDB3/js/dashboard/footer/effects/readDashboardFacet.js
KDB3/js/dashboard/footer/effects/loadFooterCreatedUser.js
KDB3/js/dashboard/footer/__orchestratorFooter.js             (edit)
KDB3/js/dashboard/footer/state/initialState.js               (edit)
KDB3/js/dashboard/footer/state/createFooterReducer.js        (edit)
KDB3/js/dashboard/footer/view/syncFooterFromState.js         (edit)
KDB3/js/dashboard/footer/effects/__orchestratorFooterEffects.js (edit)
```

---

## Section C. Per-file specifications

#### `KDB3/js/core/cognosAPI/dashboard/getUserName.js`

- **Role:** thin host wrapper (inner ring)
- **Lines:** target 40 (hard 80)
- **AMD imports:** none (`define([], ...)`)
- **Copy:** `KDB3/js/core/cognosAPI/dashboard/getBoardId.js` flatten pattern (thenable → null; extract field; string/number → String; empty → null)
- **Factory-scope helpers:** `isThenable`, `flattenUserName`, `getUserName`
- **`flattenUserName(_account)`:**
  1. `_account == null` or thenable → `null`
  2. `userName` from `_account.userName`
  3. if string or number: `String(userName).trim()`; empty → `null`; else that string
  4. else `null`
- **`getUserName`:** try: `return flattenUserName(__getDashboardAPI().getFeature("UserProfile").getUserAccount())`; catch: `console.error("[cognosAPI.dashboard.getUserName]", err); throw`
- **Return:** `getUserName`
- **Forbidden:** returning the account object; reading `displayName` / CAMID as the paint field.
- **Rules to apply:** `amd.mdc`; `error-handling.mdc`; `cognos-adapter.mdc` (inner ring may call `__getDashboardAPI`).

#### `KDB3/js/core/cognosAPI/dashboard.js`

- **Role:** inner-ring theme export
- **AMD imports (order, 4 total):**
  - `"./dashboard/resolveCaptureRoot.js"`
  - `"./dashboard/getBoardId.js"`
  - `"./dashboard/getDashboardBiBaseUrl.js"`
  - `"./dashboard/getUserName.js"`
- **Factory params:** keep existing three, add `_getUserName` as 4th.
- **Change:** add `getUserName: _getUserName` next to `getLanguage` (or next to `getBoardId`). **Keep** `getUserInfo` body unchanged (dead-but-kept live object).
- **Rules to apply:** `amd.mdc` (≤ 6 imports); `cognos-adapter.mdc`.

#### `KDB3/js/core/services/cognosHost/facets/dashboard/createDashboardAdapter.js`

- **Role:** adapter factory
- **AMD:** keep 2 (`readDashboardHostValue`, `subscribeUiState`). No new import.
- **Change:** in the returned object, add `getUserName: _readDashboardHostValue.bind(null, ctx, "getUserName")` immediately after `getLanguage`.
- **Do not** bind `getUserInfo`.
- **Rules to apply:** `cognos-adapter.mdc`; `amd.mdc`; `naming.mdc`.

#### `KDB3/js/dashboard/footer/effects/readDashboardFacet.js`

- **Role:** stamp reader
- **Lines:** target 12 (hard 40)
- **AMD:** none
- **Copy shape of** `KDB3/js/dashboard/controls/shareControls/effects/readDashboardFacet.js` but read `_KDB.runtime.footer` (not shareControls).
- **Entry:** `readDashboardFacet(_KDB)` → `rt && rt.dashboardFacet ? rt.dashboardFacet : null`
- **Rules to apply:** `cognos-adapter.mdc`; `amd.mdc`.

#### `KDB3/js/dashboard/footer/effects/loadFooterCreatedUser.js`

- **Role:** effect (sync)
- **Lines:** target 55 (hard 80)
- **AMD imports (order):**
  - `"./readDashboardFacet.js"`
- **Factory-scope helpers:**
  - `function dispatchApplyCreatedUser(_KDB, _userName)`
  - `function loadFooterCreatedUser(_KDB)`
- **`dispatchApplyCreatedUser`:** try; `_KDB.api.footer.dispatch({ type: "footer/applyCreatedUser", payload: { source: "bootstrap", userName: _userName } })`; catch log `[footer.dispatchApplyCreatedUser]`.
- **`loadFooterCreatedUser`:**
  1. try/catch; log `[footer.loadFooterCreatedUser]`
  2. if `_KDB.state.footer.createdUserName` is a non-empty string, return (no overwrite)
  3. `facet = readDashboardFacet(_KDB)`; if missing `getUserName` function → dispatch `null`, return
  4. `outcome = facet.getUserName()`
  5. if `outcome && outcome.ok === true` and `outcome.data` is non-empty string (trim) → dispatch that string; else dispatch `null`
  6. never `_KDB.cognosAPI` / `__getDashboardAPI` / `_KDB.services.cognosHost`
- **Return:** `{ loadFooterCreatedUser: loadFooterCreatedUser }`
- **Not async.** No AbortController. No `abortTable`.
- **Rules to apply:** `cognos-adapter.mdc`; `error-handling.mdc`; `amd.mdc`; `state.mdc`.

#### `KDB3/js/dashboard/footer/__orchestratorFooter.js`

- **Role:** module orchestrator
- **AMD:** stay **2** (`createFooterController`, `initialState`)
- **After** seeding `_KDB.runtime.footer` (keep existing `||` object):
  - Preserve `var facet = _KDB.runtime.footer.dashboardFacet;`
  - `var cognosHost = _KDB.services && _KDB.services.cognosHost;`
  - `_KDB.runtime.footer.dashboardFacet = facet || (cognosHost && cognosHost.dashboard) || null;`
- If the `|| { ... }` seed object is newly created, it has no facet; the assign fills it. If runtime already existed, keep prior stamp unless null, then stamp from service.
- Do not put getUserName business logic here.
- **Rules to apply:** `kdb-object.mdc`; `cognos-adapter.mdc`; `feature-structure.mdc` (thin).

#### `KDB3/js/dashboard/footer/state/initialState.js`

- **Role:** initial state
- **Return:** `{ status: "idle", aktualisierungsDatumRaw: null, aktualisierungsDatumFormatted: null, createdUserName: null }`
- Keep grandfather comment for German date keys; add one line that `createdUserName` is English (new).
- **Rules to apply:** `state.mdc`; `naming.mdc`.

#### `KDB3/js/dashboard/footer/state/createFooterReducer.js`

- **Role:** reducer
- **`copy(s)` must return:**
```js
{
  status: s.status,
  aktualisierungsDatumRaw: s.aktualisierungsDatumRaw == null ? null : s.aktualisierungsDatumRaw,
  aktualisierungsDatumFormatted: s.aktualisierungsDatumFormatted == null ? null : s.aktualisierungsDatumFormatted,
  createdUserName: s.createdUserName == null ? null : s.createdUserName
}
```
- Keep `footer/applyUpdateDate` **unchanged** (must not write `createdUserName`).
- **`footer/applyCreatedUser`:**
  - `userName = payload.userName == null || payload.userName === "" ? null : String(payload.userName)`
  - if equal current `createdUserName`, `return state`
  - set `next.createdUserName`; do not change `status` or date fields
- Unknown types `return state`. Pure. No try/catch.
- **Rules to apply:** `state.mdc`; `naming.mdc`; `error-handling.mdc` (reducer exempt).

#### `KDB3/js/dashboard/footer/view/syncFooterFromState.js`

- **Role:** mutator
- **AMD:** keep `"../state/selectors.js"` only. No facet import.
- Replace center paint with:
  `dr.centerDateUserEl.textContent = formatDMY(new Date()) + " (" + String((st && st.createdUserName) || "unbekannt") + ")";`
- Keep `formatDMY`, title selector, Datenaktualisierung `formatted || "n.v."`.
- **Rules to apply:** `dom.mdc`; `cognos-adapter.mdc` (no host in view); `amd.mdc`.

#### `KDB3/js/dashboard/footer/effects/__orchestratorFooterEffects.js`

- **Role:** effects orchestrator
- **AMD add (5th):** `"./loadFooterCreatedUser.js"` as `_loadFooterCreatedUser`
- **Lines:** stay ≤ 120 (hard 150). Current ~67.
- Keep `__unmount` → abort updateDate only (no created-user abort).
- After existing `__mountSync` `loadFooterUpdateDate`: also `_loadFooterCreatedUser.loadFooterCreatedUser(_KDB)`
- Backup: if `st.status === "active"` and `st.createdUserName == null`: `_loadFooterCreatedUser.loadFooterCreatedUser(_KDB)` (in addition to existing date backup).
- Do not await. Do not merge into `loadFooterUpdateDate.js`.
- **Rules to apply:** `error-handling.mdc`; `amd.mdc` (5 ≤ 6); `feature-structure.mdc`; `cognos-adapter.mdc`.

---

## Section D. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle |
|---|---|---|---|
| `footer/applyCreatedUser` | load effect | replace `createdUserName`; no-op if equal; no `status` / date change | none |
| existing toggle/show/hide/applyUpdateDate | unchanged | `copy()` now also keeps `createdUserName` | none |
| `__mountSync` / `__unmount` | effects only | **must not** reach reducer | none |

---

## Section E–I. Selectors / harness

Selectors unchanged (no required `readCreatedUserName`). Harness **N/A**.

---

## Section J. Acceptance criteria

1. Active center line is `D.M.YYYY (userName)` or `D.M.YYYY (unbekannt)`. Not hardcoded unbekannt when facet returns a name.
2. Inner `getUserName` returns a primitive/null, never the account object.
3. Facet has `getUserName`, not `getUserInfo`. `getUserInfo` still exists on layer 1 with 0 new callers.
4. Footer has no `_KDB.cognosAPI` / `__getDashboardAPI` / deep `_KDB.services.cognosHost`.
5. `createFooterController.js` **unedited**, still 9 AMD imports.
6. `__orchestratorFooterEffects.js` AMD **5** (≤ 6). `loadFooterUpdateDate.js` **unedited**.
7. `copy()` preserves dates **and** `createdUserName`.
8. View does not call the facet.
9. `dashboard.js` AMD **4** (≤ 6).
10. Report: Section L.

---

## Section K. Forbidden actions

- Re-open update-date product. Edit `loadFooterUpdateDate.js` / `tables.js` / history / writeback / PDF / `KDB.js` / `.mdc`.
- Bind `getUserInfo` on the dashboard facet.
- Call Cognos from footer view or controller.
- 10th controller import. 6th effects-orchestrator import (5 is the add).
- `canvasExtensionBottom` / authoring `#main` class (other WP).
- Commit / push / git config.
- Skip Section A echo.

---

## Section L. Reporting template

1. Pre-flight echo (15 sentences).
2. File checklist: path, line count, matches spec | deviation.
3. Deviations with motivation.
4. Self-verification of Section J.
5. Open questions for captain/PO.

---

## Section M. Reviewer handoff

Captain: two **fresh** grok 4.6 reviews after JS (mechanical vs spec; semantic vs delta + cognos-adapter). Then PO Cognos: Fußzeile on → center `D.M.YYYY (<your userName>)` not `(unbekannt)`; toggle off/on keeps the name; missing profile still `(unbekannt)`.
