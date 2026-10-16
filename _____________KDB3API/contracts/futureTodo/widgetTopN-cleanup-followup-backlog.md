# Future Todo: `widgetTopN` Cleanup Follow-Up

## Context

The 2026-06 `widgetTopN` behavior-preserving cleanup round (tiers A–E + CP-2) is **closed**.

Delivered in that tranche:

- dead/scaffold removal (`lifecycle/`, `events/`, unused `defaults.js`, `REGISTER_OWNER`, etc.);
- internal dedupe (`utils/effectResultHelpers.js`, runtime extract, routing split);
- file-size compliance (all module JS files ≤ 150 lines);
- contract §10/§11/§18 sync;
- post-close import fixes (`createWidgetTopNReducer`, `resolveTopNHelperListConfig` AMD depth).

Public API, state shape, action types and terminal dispatch choreography were intentionally unchanged.

---

## Deferred Module Items (former Tier F)

Do **not** implement opportunistically. Each item needs explicit approval and, where noted, runtime or caller evidence.

### F1 — Disposed `dispatch` return shape

**Current:** `{ ok: true, status: "aborted", errorCode: "WIDGET_TOPN_DESTROY_FAILED" }`

**Inconsistency:** `widgetBase` / `launchpad` use `ok: false`; `widgetVis` / `widgetSettings` / `widgetTopN` use `ok: true` (+ `skipped` / `aborted`).

**Risk:** callers that check only `ok` without `status` / `skipped`.

**Before change:** grep all `_KDB.api.widgetTopN.dispatch` callers and align project-wide disposed discipline first.

### F2 — Cleanup abort signal

**Current:** `handleCleanup` passes `signal: { aborted: false }` after `abortOwnerResolve()`.

**Risk:** cleanup effect cannot be cancelled mid-flight; possible race with in-flight `resolveRequested`.

**Before change:** trace teardown/supersede paths (vis destroy, launchpad transfer, module destroy).

### F3 — `extractTopNResult` catch error mapping

**Current:** unexpected throws map to `WIDGET_TOPN_RESULT_EMPTY`.

**Risk:** loses distinct error codes on programmer/unexpected failures.

**Safe only if:** catch preserves upstream `errorCode` when present; normal validation paths stay unchanged.

### F4 — Helper `visualizationType` in `runHelperBinding`

**Current:** `applyVisualizationProperties` defaults to `"TopN"` while helper `dataConfig` from `topNHelper.js` uses `"List"`.

**Risk:** Cognos vis-property phase mismatch.

**Before change:** Cognos runtime verification or binding-apply harness — not caller grep alone.

### F5 — `jahrFilterValue` / `yearFilterValue` fallback chain

**Current:** multiple fallback paths in `validateResolveRequest` and `buildHelperBindingSpec`.

**Production path:** `widgetVis` `topNGate` already supplies `jahrFilterValue`. NewestStichtag delta (`widgetTopN-newestStichtag-contractdelta.md`) makes `jahrFilterValue` + `monatFilterValue` canonical. F5 stays **alias hygiene** (`yearFilterValue`), not the period-pin feature.

**Before change:** confirm no direct/test callers rely on legacy alias keys; then normalize at dispatch boundary only. May ride with the NewestStichtag JS slice if those files are already open.

---

## Cross-Module Follow-Up

### Disposed-dispatch discipline (project-wide)

Standardize post-destroy dispatch results across feature modules:

| Pattern | Modules |
|---|---|
| `ok: true` + `skipped` / `aborted` | `widgetVis`, `widgetSettings`, `widgetTopN`, `widgetText`, `widgetDataTable` |
| `ok: false` + error code | `widgetBase`, `launchpad` |

Treat as a **separate mini-contract** + caller audit, not a single-module tweak.

### Shared `messageFromError`

`messageFromError` is duplicated per module (also `launchpad`, etc.). A shared helper under `_KDB.utils` would reduce drift but is **out of scope** for the closed `widgetTopN` tranche unless a project-wide utils cleanup is approved.

---

## Hygiene / Audit (low priority)

### AMD relative-depth audit

`config/visTypes/` is one level deeper than `effects/` under `widgetVis`. Any new imports to `KDB3/js/core/**` from `visTypes/` need **five** `../` segments, not four.

**Reference:** fixed in `widgetVis/config/visTypes/resolveTopNHelperListConfig.js` (2026-06).

**Optional sweep:** grep `widgetVis/config/visTypes/**/*.js` for `../../../../core/` (four levels) and correct to `../../../../../core/`.

---

## Explicit Non-Goals (remain closed)

- Reviving `events/eventNames.js` or `config/defaults.js` in `widgetTopN` without a new contract tranche.
- Reintroducing `REGISTER_OWNER` as a dispatched action (owners auto-register via reducer side paths).
- Cross-module semantic changes without Cognos or integration evidence.
- Editing `.cursor/rules/` or authority docs as part of this follow-up.

---

## Suggested Trigger To Reopen

Reopen this backlog when **one** of these is true:

1. a teardown race or disposed-dispatch bug is observed in production;
2. a project-wide disposed-dispatch standard is approved;
3. Cognos helper binding tests expose F4/F5 mismatch;
4. a new `widgetTopN` feature tranche touches helper apply/read paths.

Until then, consider `widgetTopN` cleanup **complete**.
