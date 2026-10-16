# Fix Spec: `filterDock/compat` boundary cleanup

> Focused compatibility-boundary cleanup for `filterDock/compat`.
> This tranche removes an implicit runtime utility lookup and a foreign/ghost state read from the generic filterDock identity pipeline. It does not change `singleSelect`, `sicht`, Dienststelle, CSS, events, or filter commit behavior.

---

**Status:** `Ready for execution`
**Date:** 2026-05-25
**Owner module:** `filterDock`
**Base contract:** `_____________KDB3API/contracts/filterDock.md`

---

## Section A. Required Pre-flight

Read these files before changing anything and echo a one-sentence summary of each:

1. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/events.mdc`
5. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
6. `_____________KDB3API/.cursor/rules/amd.mdc`
7. `_____________KDB3API/contracts/filterDock.md`
8. `_____________KDB3API/contracts/filterDock-compat-boundary-fix-spec.md`

---

## Section B. Scope

Allowed production files:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/compat/getFilterConfig.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/compat/resolveKennzahlenSource.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/compat/resolveFilterCapabilities.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/readFilterIdentity.js
```

Allowed contract sync:

```txt
_____________KDB3API/contracts/filterDock.md
```

If a clean implementation needs any other file, stop and report before editing it.

Out of scope:

- `singleSelect/`
- `sicht/`
- `specialSingleSelect/`
- Dienststelle / hierarchy implementation
- CSS
- `KDB.js`
- `filterPropId.js` / saved properties
- legacy trees / `TEST`
- events / `eventSubscribe.md`
- rename of `dispatchSingleSelectHandoff.js`

---

## Section C. Problem 1 - `resolveKennzahlenSource` Runtime Utility Lookup

Current shape:

```js
// filterDock/compat/resolveKennzahlenSource.js
var getKennzahlenSource = _KDB.utils && _KDB.utils.getKennzahlenSource;
```

Problem:

- The dependency on `core/utils/getKennzahlenSource.js` is hidden from the AMD graph.
- `resolveKennzahlenSource.js` is a wrapper without real compatibility logic.
- The execution-spec intent was an approved production utility import if available, not a runtime service-locator lookup.

Decision:

- Use explicit AMD dependency on `core/utils/getKennzahlenSource.js`.
- Prefer the simplest shape: make `getFilterConfig.js` import the utility directly and stop using `resolveKennzahlenSource.js`.
- If deleting the wrapper is awkward in this environment, leave the file unused and report it as obsolete. Do not keep it in the production dependency path.

Required behavior:

- `getFilterConfig(_KDB, filterLabel, filterScope, optionalKennzahlenSource)` still supports an explicitly supplied source.
- If no explicit source is supplied, it resolves through imported `getKennzahlenSource(_KDB)`.
- Return value for the same `_KDB`, label, scope, and source remains unchanged.

Acceptance:

- `filterDock/compat/getFilterConfig.js` has an AMD dependency on `core/utils/getKennzahlenSource.js` using the correct relative path.
- `filterDock/compat/getFilterConfig.js` no longer imports `./resolveKennzahlenSource.js`.
- No `_KDB.utils.getKennzahlenSource` runtime string lookup remains under `filterDock/compat/`.
- `readFilterIdentity.js` no longer needs to receive or call `_resolveKennzahlenSource`.

---

## Section D. Problem 2 - `specialRights` Foreign/Ghost State Read

Current shape:

```js
// filterDock/compat/resolveFilterCapabilities.js
var rights =
  _KDB &&
  _KDB.state &&
  _KDB.state.filters &&
  _KDB.state.filters.specialRights &&
  _KDB.state.filters.specialRights.rights;
```

Problem:

- `filterDock` reads another owner-style subtree directly.
- `_KDB.state.filters.specialRights` is ghost state in current production; no canonical KDB3 writer exists.
- `specialSingleSelect` already has a tableData-based rights source for Alle (`readSpecialRightsFromTableData.js`).
- `filterDock` should classify/filter-route from config, not own specialSingleSelect runtime rights.

Decision:

- Use config-only `hasAlleOption` in `filterDock/compat/resolveFilterCapabilities.js`.
- Remove `SPECIAL_RIGHT_FILTERS`, `resolveAlleAvailability`, and all `specialRights` reads from filterDock.
- Alle runtime rights and special option visibility remain with `specialSingleSelect`.

Required behavior:

- `hasAlleOption` is `isTrueish(filterConfig.hasAlleOption)`.
- `condition` is still copied through for filter type classification.
- `Personengruppe` / `Dienststellenleitung` still classify as `specialSingleSelect` through `readFilterIdentity.resolveFilterType`.
- Sicht classification remains `isUpstream && isSingleSelect`.

Acceptance:

- No `_KDB.state.filters.specialRights` read/write under `filterDock/`.
- No `SPECIAL_RIGHT_FILTERS` under `filterDock/compat/resolveFilterCapabilities.js`.
- `resolveFilterCapabilities(filterConfig, _KDB)` may keep `_KDB` in the signature for call-site stability, but it must not use `_KDB` for rights.
- Static grep: `specialRights` has no matches under `KDB3/js/dashboard/filters/filterDock/`.

---

## Section E. Minor Non-goal - `dispatchSingleSelectHandoff` Name

`filterDock/effects/dispatchSingleSelectHandoff.js` routes known filter handoffs to:

- `_KDB.api.singleSelect`
- `_KDB.api.specialSingleSelect`
- `_KDB.api.sicht`

This name is misleading, but it is not a functional boundary violation because the file lives under `filterDock` and uses public owner APIs.

Do not rename it in this tranche. If desired, plan a later naming-only cleanup such as `dispatchFilterHandoff.js`.

---

## Section F. Contract Sync

Update `contracts/filterDock.md` narrowly:

- Document that `filterDock/compat/getFilterConfig.js` uses an explicit AMD import of `core/utils/getKennzahlenSource.js`.
- Document that `filterDock/compat/resolveFilterCapabilities.js` is config-only for `hasAlleOption`.
- Remove or qualify any text that says `filterDock` reads `specialRights` state for Alle runtime rights.
- Keep the statement that Dienststelle is deferred / future owner API.
- Do not update events or introduce new public API methods.

---

## Section G. Console Trace / Dispatch Reporting Requirement

The executing AI must explicitly report which console traces the user should expect for downstream dispatch visibility after this cleanup.

Important:

- This tranche should not add new production `console.log` statements.
- The report must provide runtime monkey-patch snippets or identify existing logs for manual verification.
- The report must distinguish "filterDock classified a filter" from "a downstream owner dispatch happened".

Required report content:

1. For `specialSingleSelect`:
   - Tell the user to patch `_KDB.api.specialSingleSelect.dispatch`.
   - Expected trace when a special single-select handoff is routed:

```js
(() => {
  const k = getKDB();
  const old = k.api?.specialSingleSelect?.dispatch;
  if (old && !old.__patched) {
    k.api.specialSingleSelect.dispatch = function(action) {
      console.log("[TRACE specialSingleSelect.dispatch]", action);
      return old.apply(this, arguments);
    };
    k.api.specialSingleSelect.dispatch.__patched = true;
  }
  return "specialSingleSelect dispatch trace installed";
})();
```

2. For Dienststelle:
   - Tell the user explicitly that `_KDB.api.dienststelle` is not expected to exist in this tranche.
   - Therefore no real `[TRACE dienststelle.dispatch]` is expected.
   - The only expected diagnostic is filterDock classification of a hierarchy/downstream filter as `filterType: "dienststelle"` in the existing `[filterDock.click]` interaction log, if such a filter exists in the dashboard.
   - If `_KDB.api.dienststelle` does exist in a future branch, the user can patch it with:

```js
(() => {
  const k = getKDB();
  const old = k.api?.dienststelle?.dispatch;
  if (!old) {
    return "No _KDB.api.dienststelle present; no Dienststelle dispatch expected in this tranche.";
  }
  if (!old.__patched) {
    k.api.dienststelle.dispatch = function(action) {
      console.log("[TRACE dienststelle.dispatch]", action);
      return old.apply(this, arguments);
    };
    k.api.dienststelle.dispatch.__patched = true;
  }
  return "dienststelle dispatch trace installed";
})();
```

3. For filterDock classification:
   - Existing discovery log, if present, is:

```txt
[filterDock.click]
```

   - The user should inspect `interaction.filterType`, not treat this log as downstream dispatch proof.

---

## Section H. Verification

Static verification:

1. `ReadLints` on touched files.
2. `filterDock/compat/` has no `_KDB.utils.getKennzahlenSource` runtime lookup.
3. `filterDock/compat/getFilterConfig.js` imports `core/utils/getKennzahlenSource.js` explicitly.
4. `filterDock/` has no `_KDB.state.filters.specialRights` or `specialRights` references.
5. `resolveFilterCapabilities.js` remains config-only and <=150 lines.
6. `readFilterIdentity.js` no longer receives `_resolveKennzahlenSource`.
7. No `singleSelect/`, `sicht/`, `specialSingleSelect/`, CSS, `KDB.js`, events, or legacy files changed.
8. No new production debug logs were added.

Manual smoke:

1. Existing normal singleSelect filters still route and commit.
2. Existing specialSingleSelect filters still route as `filterType: "specialSingleSelect"`.
3. Sicht still routes as `filterType: "sicht"`.
4. SpecialSingleSelect Alle visibility/right behavior remains owned by specialSingleSelect sync.
5. Existing `[filterDock.click]` still shows the same filter labels/scopes/types.
6. User can see `[TRACE specialSingleSelect.dispatch]` when a specialSingleSelect handoff dispatch happens.
7. User should not expect Dienststelle dispatch traces unless `_KDB.api.dienststelle` exists.

---

## Section I. Reporting Template

Executing AI must report:

1. Pre-flight echo.
2. Files modified/deleted/left obsolete with line counts.
3. Kennzahlen source dependency before/after.
4. Alle-option capability logic before/after.
5. Confirmation that no `specialRights` read remains in filterDock.
6. Confirmation that `dispatchSingleSelectHandoff.js` was not renamed and why.
7. Console trace instructions for:
   - `specialSingleSelect.dispatch`
   - Dienststelle missing/deferred dispatch
   - `[filterDock.click]` classification vs downstream dispatch
8. Static verification results.
9. Manual smoke steps still required.
10. Deviations or blockers.

---

## Executing-AI Prompt

```text
You are the executing AI for `filterDock/compat` boundary cleanup.

Project root:
c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05

Read first:
1. _____________KDB3API/contracts/filterDock-compat-boundary-fix-spec.md
2. All Section A files from that spec.

Echo one sentence per file/rule before editing.

Implement only this spec.

Core goals:
- Make kennzahlen source resolution in filterDock explicit via AMD import of core/utils/getKennzahlenSource.js.
- Remove runtime-only `_KDB.utils.getKennzahlenSource` lookup from filterDock/compat.
- Remove foreign/ghost `_KDB.state.filters.specialRights` read from filterDock capabilities.
- Make `hasAlleOption` config-only in filterDock.
- Keep specialSingleSelect runtime rights/Alle behavior with specialSingleSelect.
- Do not rename dispatchSingleSelectHandoff.js in this tranche.

Hard constraints:
- Do not modify singleSelect.
- Do not modify sicht.
- Do not modify specialSingleSelect.
- Do not modify CSS.
- Do not modify KDB.js.
- Do not modify filterPropId or savedProperties.
- Do not modify legacy trees or TEST.
- Do not add events.
- Do not add Dienststelle/hierarchy behavior.
- Do not add production console.log debug statements.
- Keep touched JS files <=150 lines.

Important reporting requirement:
- Explicitly tell the user which console traces prove specialSingleSelect dispatch.
- Explicitly tell the user that Dienststelle dispatch is not expected because `_KDB.api.dienststelle` does not exist in this tranche.
- Explain that `[filterDock.click]` proves classification only, not downstream dispatch.

After edits:
- Run lints on touched files.
- Run static checks from Section H.
- Report using Section I.
```
