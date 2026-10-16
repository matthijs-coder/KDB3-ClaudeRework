# Contract Delta: SET restore must realign Dienststelle chrome

> PO vastenburg 2026-09-10: after DEZPV Sicht, SET of a BW parameter set writes Sicht BW and `state.activeFilterKey === Dienststelle_BW`, but `#filterDockContainer` stays `KDB_dienststelleActive_DEZPV` (`KDB_sssSicht_BW` already swapped). Dock shows the cleared DEZPV chip; popup labels hidden. Same-sicht SET and manual Sicht were fine. Hierarchy cache was full (park killed).

---

**Status:** `Implemented` — dual JS review PASS; **PO Cognos green 2026-09-10**.
**Type:** `feature-module contract delta`
**Authoring AI:** Cursor Grok 4.6 (captain), 2026-09-10
**Related rules:** `feature-structure.mdc`, `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `module-public-api.mdc`, `dom.mdc`
**Spec:** `contracts/dienststelle-parameterSet-restore-chrome-execution-spec.md`

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/dienststelle-parameterSetRestore-contractdelta.md` | §4 restore-only steps: missing chrome/inactive realign that `writeback.md` §6.3 already named as step 21. |
| `contracts/writeback.md` | §6.3 `dstlWillFollow: true` — “step 21 will realign Dienststelle itself.” Realign includes existing `deactivateInactiveDienststelleVariants`. No writebackSet JS. |
| `contracts/dienststelle.md` | Approval-log one-liner after JS. |

Park / HideSpot / `localFilterRecipes` / tableData wrap: **OOS**.

---

## 1. Purpose

When SET restores `filt.dstl`, the dock root class and inactive-variant status must match the restored definition **before** the host apply. SSS already swaps on Sicht downstream. Dienststelle must do the same job Sicht/history already do: `deactivateInactiveDienststelleVariants`.

---

## 2. Product lock

| # | Lock |
|---|---|
| 1 | Call the **existing** `deactivateInactiveDienststelleVariants` (clear other variant + `FILTER_STATUS_CHANGED` inactive + `syncDienststelleWrapperClasses`). |
| 2 | Do **not** dispatch public `dienststelle/sichtChanged` from SET (defaults would fight `applyRestorePlan`). |
| 3 | Do **not** change sicht `dstlWillFollow` / `handleParameterSetDownstreamVisibility`. |
| 4 | Do **not** chrome-only `syncDienststelleWrapperClasses` (leaves DEZPV `byFilter` active; skips re-clear of raced defaults). |
| 5 | Do **not** add an 11th AMD import on `parameterSetRestore.js` (already 10). Hop: `restoreSupport.realignInactiveVariants` → existing deactivate. |
| 6 | Placement: after hierarchy wait + plan + stale check, **immediately before** `applyRestorePlan`. Not before the wait (DEZPV `TABLE_DATA_CHANGED` can startup-default after an early clear). |
| 7 | writebackSet, sicht, park wrap, `deactivateInactiveDienststelleVariants.js` body: **untouched**. |

---

## 3. Sequence (SET restore)

```text
key-check → abortPreviousHierarchyWarmup
→ wait tables → index/plan → stale?
→ await realignInactiveVariants(_KDB, dispatchInternal, active)
→ stale? → applyRestorePlan → stale? → commitActiveDefinition
→ reconcile({ source: "tableData" })
```

`realignInactiveVariants` is a thin try/catch forwarder. No chrome copied. `dispatchInternal` is reducer-only (no public `sichtChanged`).

Same-sicht SET: extra empty clear of the other variant is idle (already empty). Allowed.

Failed apply after realign: chrome matches restored key (better than today’s DEZPV chrome + BW state).

---

## 4. Files (exclusive)

**Edit:**

- `KDB3/js/dashboard/filters/dienststelle/actions/restoreSupport.js` — AMD 3 → 4; export `realignInactiveVariants`.
- `KDB3/js/dashboard/filters/dienststelle/actions/parameterSet/parameterSetRestore.js` — one await + stale; AMD stays 10; ≤150.

**Do not touch:** `deactivateInactiveDienststelleVariants.js`; `syncDienststelleFromSicht.js`; `handleDienststelleHistoryReplay.js`; `applyRestorePlan.js`; `runFilterRestore.js`; `handleParameterSetDownstreamVisibility.js`; tableData wrap; widgetBase; `KDB.js`; `.mdc`; git.

---

## 5. Acceptance

1. Boot BW → switch DEZPV → SET same BW parameter set: dock `KDB_dienststelleActive_BW`, state `Dienststelle_BW`, chip shows restored/default BW, popup labels visible.
2. Same-sicht SET (already BW) still keeps BW + values.
3. Manual Sicht still swaps chrome + default (unchanged path).
4. `_KDB.config.localFilterRecipes` still undefined; park leftover behaviour unchanged.

---

## 6. Out of scope

- Pre-existing `TABLE_DATA_CHANGED` reconcile without `source: "tableData"` during hierarchy wait (late realign re-clears; do not change the router).
- Personal_KDB `getFilterList` host NPE.
- HideData leftover peek vs cache.
- New events / `_KDB` namespace / cognosHost facet.
