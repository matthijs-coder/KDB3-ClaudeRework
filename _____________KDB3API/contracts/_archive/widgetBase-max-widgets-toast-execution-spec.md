# Execution Spec: `widgetBase` max widgets per tab toast (WP4)

> Mechanical spec for grok 4.6 implementers. Architecture lives in `widgetBase-max-widgets-toast-contractdelta.md` (**Approved A** — tracked one-pass). No harness. Existing production widgetBase only.

---

**Status:** `Reviewed` — Cognos green 2026-09-07 (PO). PROGRAM **4** ticked.  
**Module / contract:** `contracts/widgetBase.md` + `contracts/widgetBase-max-widgets-toast-contractdelta.md`  
**Phase:** `extension`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-07  
**Executing AI:** grok 4.6 subagent  
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist

**May create:** none.

**May edit:**

- `KDB3/js/dashboard/widgets/widgetBase/actions/resolveDropClaim.js` (AMD stays **2**)
- `KDB3/js/dashboard/widgets/widgetBase/actions/normalizeDispatchResult.js` (AMD stays **0**)

**Already landed — do not edit this round:** `effects/subscribeDropValidated.js` (AMD **0**), `__orchestratorWidgetBase.js` (AMD **5**).

**Must not edit:** `handleDropCreate.js`, `createWidgetBaseController.js`, `placeSerializedWidgetEntry.js`, `launchpad/**`, `KDB.js`, `messageService/**`, `publishValidatedDrop.js`, `subscribeTabsChanged.js`, `resolveWidgetShell.js`, `.cursor/rules/*.mdc`, git, parent `widgetBase.md` (one-liner = captain **after** JS dual-review).

**Must not create:** `notifyLaunchpadExhausted.js`, `config/widgetBaseLabels.js`, `helpers/` / `common/` / `shared/` / leftover `Support`, new events file, new error-code constant.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — allowed `_KDB` namespaces; labels under `_KDB.config.labels.de.*`; no new top-level namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — no `_KDB.state.launchpad` writes; widgetBase writes its own subtree only.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — no `_KDB.runtime.launchpad` reads; no new runtime buckets for this WP.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new `_KDB.api.widgetBase` methods; toast is not a public method.
5. `_____________KDB3API/.cursor/rules/events.mdc` — reuse `canvas:dropValidated`; no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS hard 150 / orch 120; AMD smell >6 / FAIL >10; split by job not overflow.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — `isEligibleListEmpty`; English files; German only in labels.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on named executables and subscriber helpers; missing messageService → `console.warn`, no throw.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no new queries; this WP does not touch DOM builders.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; factory-scope helpers; no nested `async` / `.then` inside the subscribe **entry** callback.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle terms.
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` / `__getDashboardAPI`; keep stamped `widgetsFacet`.
13. `_____________KDB3API/contracts/widgetBase-max-widgets-toast-contractdelta.md` — Approved A: tracked one-pass `sawUnevaluable`; `notify` warning; `isEligibleListEmpty` omit-unless-true; no restore toast.
14. This execution spec.

Pattern files (read, do not edit): `effects/subscribeTabsChanged.js` (`dispatchEnsureRouted`); `canvas/dragDrop/dropboxes/publishValidatedDrop.js` `showValidationWarning` (pattern only).

---

## Section B. Folder tree (edit order)

```
KDB3/js/dashboard/widgets/widgetBase/
  actions/normalizeDispatchResult.js     (edit first — omit unless true)
  actions/resolveDropClaim.js            (edit — tracked one-pass A)
```

---

## Section C. Per-file specifications

#### `KDB3/js/dashboard/widgets/widgetBase/actions/normalizeDispatchResult.js`

- **Role:** dispatch result normalizer (edit)
- **Lines:** 42 → target **≤48** (hard 80)
- **AMD imports:** none (keep `define([], ...)`)
- **Change only:** omit `isEligibleListEmpty` unless `true`. Do **not** keep `isEligibleListEmpty: result.isEligibleListEmpty === true` on every result (that writes `false`).

```js
const normalized = {
  /* existing fields through reasonCode — no isEligibleListEmpty key here */
};
if (result.isEligibleListEmpty === true) {
  normalized.isEligibleListEmpty = true;
}
return normalized;
```

- Subscriber predicate stays `=== true`. Do not copy `reasonCode` into a toast predicate. Do not add other keys.
- Keep `readSkipped` / `isAggregateResult` / `readCount` at factory scope.
- **Rules to apply:**
  - `amd.mdc` — existing shape; no nested functions.
  - `naming.mdc` — boolean `isEligibleListEmpty`.
  - `feature-structure.mdc` — one-line passthrough, not a new file.
  - `module-public-api.mdc` — not an error taxonomy entry; not a new public method.

---

#### `KDB3/js/dashboard/widgets/widgetBase/actions/resolveDropClaim.js`

- **Role:** drop-claim resolver (edit)
- **Lines:** live **130** → target ≤130 if possible (hard **150**)
- **AMD imports** (keep **2**, same order):
  1. `"../config/launchpadChannels.js"`
  2. `"../view/resolveWidgetShell.js"`
- **Factory parameters:** `_launchpadChannels`, `_shellModule`
- **Entry:** keep `resolveClaimedWidget` as returned function. Helpers at factory scope.

**A–C already landed — verify, do not rewrite:** ghost gate `if (claim && claim.widgetId)` on both pad `.then`s; exclusive pad exits pass `claim && claim.isEligibleListEmpty === true` into `missingShellResult`; `missingShellResult` omits the flag unless `true`; `resolveDirectClaim` calls `missingShellResult()` with no flag.

**D. `claimFromPad`** — keep (1) API-missing → `Promise.resolve(null)` and (2) `!result || result.ok !== true` → `null`. After `ok === true`:

1. `widgets = result.widgets || []`.
2. If `widgets.length === 0` → return `emptyListMarker()` (`{ isEligibleListEmpty: true }` — **no** `widgetId`, **no** `ok: true`).
3. If `isHasContentEvaluable(context) !== true` → return `null` (children present, facet missing — **no** stamp).
4. `found = claimFirstEligibleFromDiscovery(context, widgets)`.
5. If `found && found.widgetId` → return `found`.
6. If `found && found.sawUnevaluable === true` → return `null` (**no** stamp).
7. Else → return `emptyListMarker()`.

Delete live step `if (found && found.hasContentUnevaluable === true)`.

**E. Factory-scope helpers** (keep; named declarations, not nested):

- `function emptyListMarker()` — `return { isEligibleListEmpty: true };`
- `function isHasContentEvaluable(context)` — `widgetsFacet = context && context.widgetsFacet`; `return !!(widgetsFacet && typeof widgetsFacet.hasContent === "function");`
- `function readHasContentState(context, widgetId)` — if `!isHasContentEvaluable(context)` return `"unevaluable"`. `try`: `outcome = context.widgetsFacet.hasContent(widgetId)`; if `!outcome || outcome.ok !== true` return `"unevaluable"`; return `outcome.data === true ? "yes" : "no"`. `catch`: return `"unevaluable"`.
- Keep `widgetHasContent(context, widgetId)` as `return readHasContentState(context, widgetId) === "yes";` (used by `claimOptions`).

**F. `claimFirstEligibleFromDiscovery`** — **one** `while` at factory scope (Approved A). Delete the first abort loop. Delete `{ hasContentUnevaluable: true }`.

```js
function claimFirstEligibleFromDiscovery(context, widgets) {
  let sawUnevaluable = false;
  let index = 0;
  while (index < widgets.length) {
    if (readHasContentState(context, widgets[index].widgetId) === "unevaluable") {
      sawUnevaluable = true;
      index += 1;
      continue;
    }
    const claim = _shellModule.claimShellById(context._KDB, widgets[index].widgetId, claimOptions(context, { requireLaunchpadSlot: true }));
    if (claim && claim.widgetId) {
      return claim;
    }
    index += 1;
  }
  if (sawUnevaluable === true) {
    return { sawUnevaluable: true };
  }
  return null;
}
```

Do not nest functions inside this helper. Flag name may be `sawUnevaluable` only.

**Must not:** mint `WIDGET_BASE_LAUNCHPAD_EXHAUSTED`; toast; read `_KDB.runtime.launchpad` / write `_KDB.state.launchpad`; change `mode: "all"`; use `claimFirstEligibleShellInSlot`; abort on first unevaluable; naive-delete of `sawUnevaluable` (option B).

- **Rules to apply:**
  - `amd.mdc` — AMD 2; factory-scope helpers; no nested functions inside `resolveClaimedWidget` / `.then` callbacks (`.then(function (claim) { ... })` already exists — keep the callback body as statements only, no inner `function`).
  - `naming.mdc` — `isEligibleListEmpty`, `isHasContentEvaluable`, `readHasContentState`, `emptyListMarker`, `sawUnevaluable`.
  - `feature-structure.mdc` — ≤150 lines; AMD 2.
  - `error-handling.mdc` — `readHasContentState` try/catch; existing claim functions keep try/catch if they already have it; `emptyListMarker` / `isHasContentEvaluable` may be pure one-liners.
  - `state.mdc` / `runtime.mdc` — launchpad via `api.launchpad.dispatch` only.
  - `cognos-adapter.mdc` — `context.widgetsFacet.hasContent` only.
  - `module-public-api.mdc` — flag is not a new API method.

---

#### `KDB3/js/dashboard/widgets/widgetBase/effects/subscribeDropValidated.js`

- **FROZEN this round. Do not edit.** Landed: factory-scope `startDropCreate` / `notifyPadExhausted`; toast iff `ok !== true && isEligibleListEmpty === true`; AMD **0**.

---

#### `KDB3/js/dashboard/widgets/widgetBase/__orchestratorWidgetBase.js`

- **FROZEN this round. Do not edit.** Landed: `seedWidgetBaseLabels` existing-wins; AMD **5**.

---

## Section D. Reducer behavior table

**N/A.** No new actions. `widgetBase/dropCreate` already exists. Fail path already returns `_normalizeDispatchResult(claim)` from `handleDropCreate.js` — **do not edit that file**. The new boolean rides that path.

---

## Section E. Published selectors

**N/A.** No new selectors.

---

## Section F. Public API wiring

- Surface unchanged: `_KDB.api.widgetBase` (no new methods).
- `_KDB.services.message.notify` unchanged.
- Labels: `_KDB.config.labels.de.widgetBase.maxWidgetsPerTab` after orch seed.
- Dispatch result of `widgetBase/dropCreate` may include `isEligibleListEmpty: true` on exhaustion. Not an error-code. Not added to `widgetBase.md` §14 by the writer.
- Runtime: no new buckets.

---

## Section G–I. Harness / mocks

**N/A.** No new harness.

---

## Section J. Acceptance criteria (executing AI self-check)

1. Allowlist only: **two edits** (`resolveDropClaim.js`, `normalizeDispatchResult.js`), **zero** new files. Do not edit subscribe/orch.
2. AMD: resolveDropClaim **2**, normalize **0**. Untouched: subscribe **0**, orch **5**, `handleDropCreate` **13**, controller **28**, `placeSerializedWidgetEntry.js` **150**.
3. No edited file >150.
4. `claimFirstEligibleFromDiscovery`: **one** `while`; `sawUnevaluable` present; **no** `hasContentUnevaluable`; **no** first-loop abort.
5. Toast predicate (already landed) is **only** `ok !== true && isEligibleListEmpty === true`. Never `errorCode` / English `errorMessage`.
6. `if (claim && claim.widgetId)` still on both pad success branches.
7. API-miss / `readSlotWidgets.ok !== true` / facet missing / `sawUnevaluable` → missing-id **without** `isEligibleListEmpty`.
8. Empty pad (`widgets: []`) after `ok === true` → `isEligibleListEmpty: true`. All-evaluable ineligible children → stamp.
9. `normalizeDispatchResult` omits `isEligibleListEmpty` unless `true` (no `false` key).
10. No launchpad state/runtime access. No `_KDB.cognosAPI`.
11. No `WIDGET_BASE_LAUNCHPAD_EXHAUSTED`. No new files.
12. `"use strict"` optional; do not convert the whole module style.
13. Report: Section L.

---

## Section K. Forbidden actions

- Re-open proposal series (restore toast, `error` severity, minted error code, separate notify file, labels AMD file, `reasonCode` as toast key, option B/C/D).
- Edit forbidden files, including subscribe/orch this round.
- Grow `handleDropCreate.js` / `createWidgetBaseController.js`.
- Naive-delete of unevaluable tracking (option B).
- Nested functions inside `.then` callbacks (new inner `function` declarations).
- ES modules in `KDB3/js/**`.
- Commit / push / git config.
- Modify `.mdc`, templates, or the Approved delta.
- Parent one-liner on `widgetBase.md` (captain after JS review).
- Skip Section A echo.
- Read `_______KDB3` / `_______REDESIGN2` for copy-paste.

---

## Section L. Reporting template

1. Pre-flight echo (14 sentences).
2. File checklist: path, line count, AMD count, matches spec | deviation.
3. Deviations with motivation.
4. Self-verification of Section J (pass/fail each).
5. Open questions for captain/PO.

---

## Section M. Reviewer handoff

Captain: two **fresh** grok 4.6 reviews after JS (mechanical vs this spec; semantic vs Approved delta). Then PO Cognos: vis pad full + kennzahl drop → German warning toast, no half-placed shell; free slot → no this toast; launchpad-not-ready → no this copy; GET restore miss → no this toast.
