# Future Todo: dienststelle / filterDock cleanup backlog

**Status:** Future backlog, not current execution scope  
**Date:** 2026-06-05  
**Area:** `dienststelle`, `filterDock`  
**Reason:** Capture deferred cleanup ideas after the Dienststelle/filterDock display-resync work and Tranche D micro-cleanup.

---

## 1. Decision

Do not continue cleanup in the current fix line if Cognos smoke is green.

The important work has already been handled:

- Dienststelle display sanitizing behavior is stabilized.
- Committed bottom-display resync has a deterministic filterDock-to-Dienststelle handoff.
- The hard file-size issue in `applyStoredDienststelleScopeValues.js` was addressed by Tranche D.
- A dead DOM helper export was removed.
- Generic filterDock timer cleanup was hardened defensively.

The items below are maintenance polish. They should wait until the core project is complete, or until a concrete rule violation, file-size issue, or navigation problem makes them worth the churn.

---

## 2. Deferred Cleanup Candidates

### 2.1 `SCOPE_BUCKETS` dedup

**Candidate files:**

```txt
KDB3/js/dashboard/filters/dienststelle/view/syncDienststelleViewFromState.js
KDB3/js/dashboard/filters/dienststelle/view/syncDienststelleFilterDockNames.js
KDB3/js/dashboard/filters/dienststelle/view/syncDienststelleWrapperClasses.js
```

**Idea:** Extract the repeated `["global", "pageContext"]` bucket iteration into a config constant.

**Value:** Low. It removes small duplication and documents canonical bucket order.

**Risk:** Low to medium. It touches multiple view-sync files that recently participated in timing-sensitive display fixes.

**Do later only if:** These files are being edited anyway, or bucket handling grows.

### 2.2 Dienststelle variant key dedup

**Candidate areas:**

```txt
KDB3/js/dashboard/filters/dienststelle/effects/routeDienststelleDispatch.js
KDB3/js/dashboard/filters/dienststelle/view/applyDienststelleFilterDockNameDisplay.js
KDB3/js/dashboard/filters/dienststelle/config/
```

**Idea:** Move repeated Dienststelle variant-key sets/matching helpers into a small config/support module.

**Value:** Low to medium. It can reduce confusion around `Dienststelle_BW` / `Dienststelle_DEZPV`.

**Risk:** Medium. Variant matching protects inactive-variant and host-key behavior; accidental broadening or narrowing can break dispatch filtering.

**Do later only if:** Variant logic grows, a third variant appears, or `dashboard/filters/dienststelle/effects/dispatchRoute.js` (`routeDienststelleDispatch`) is already being touched.

### 2.3 `dashboard/filters/dienststelle/effects/dispatchRoute.js` (`routeDienststelleDispatch`) split

**Candidate file:**

```txt
KDB3/js/dashboard/filters/dienststelle/effects/routeDienststelleDispatch.js
```

**Idea:** Split filterDock actions, sync/replay actions, and variant-handoff helpers into smaller focused files.

**Value:** Medium if the router grows further. It would keep the router from becoming a mini-orchestrator.

**Risk:** Medium to high. Dispatch order, Promise returns, history pushes, and user-confirm semantics must remain exact.

**Do later only if:** The router approaches or exceeds 150 lines again, or more action types are added.

### 2.4 `evaluateObservedDockState.js` import-count review

**Candidate file:**

```txt
KDB3/js/dashboard/filters/filterDock/observation/evaluateObservedDockState.js
```

**Idea:** Extract a small observed-state context reader or lane coordinator to reduce import pressure.

**Value:** Medium. The file is a high-pressure orchestrator for header, committed display, filtersReady, popup ready, and popup resync detach.

**Risk:** Medium. The committed-display route is recently stabilized; import churn here can regress observer timing.

**Do later only if:** The file grows again, receives another observer lane, or a rule pass requires reducing imports.

### 2.5 `readDockRoot` / `readFilterWrapperCount` dedup

**Candidate areas:**

```txt
KDB3/js/dashboard/filters/filterDock/observation/
KDB3/js/dashboard/filters/filterDock/runtime/readDockRoot.js
```

**Idea:** Replace repeated local root/wrapper-count helpers with shared focused helpers.

**Value:** Low. It removes small duplication.

**Risk:** Low to medium. It touches observation files and can create import churn without improving behavior.

**Do later only if:** Working in the same files for another reason.

### 2.6 `observation/` folder organization

**Candidate area:**

```txt
KDB3/js/dashboard/filters/filterDock/observation/
```

**Idea:** Group observation files by lane, for example:

```txt
observation/dock/
observation/popupResync/
observation/popupReady/
observation/guards/
```

**Value:** Low today. It may improve navigation if the folder grows much larger.

**Risk:** Medium. It requires many import-path edits and does not directly improve behavior.

**Do later only if:** `observation/` grows beyond practical navigation, and the move is done as a dedicated no-behavior-change import migration.

---

## 3. Explicit Stop Rules

Do not pick up these cleanup items:

- in the same run as a behavior bugfix;
- immediately after timing-sensitive Dienststelle/filterDock changes;
- before Cognos smoke is green;
- without an execution spec that lists exact allowed files;
- if the only benefit is aesthetic;
- if it requires changing popup timing, observer options, reconcile/defaulting, history replay, or filterDock route semantics.

Do not combine folder moves with logic cleanup. If folder organization is ever done, it should be a pure import-path migration.

---

## 4. Recommended Trigger For Future Work

Reopen this backlog only when one of these is true:

- a touched file exceeds 150 lines again;
- `dashboard/filters/dienststelle/effects/dispatchRoute.js` (`routeDienststelleDispatch`) receives more action branches;
- `evaluateObservedDockState.js` receives another observer lane;
- developers report that module navigation is slowing work down;
- a future feature naturally edits the same files and can absorb a small cleanup safely.

Until then, prefer closing the current line after successful Cognos smoke.

---

## 5. Suggested Future Spec Shape

If this backlog is reopened, create a small execution spec with:

- one cleanup theme only;
- exact allowed files;
- no behavior changes;
- static before/after line counts;
- `ReadLints` on touched files;
- a targeted smoke list only if the touched files are behavior-adjacent.

The preferred order, if ever needed:

1. Small dedup while already touching the same files.
2. Router split only if `dashboard/filters/dienststelle/effects/dispatchRoute.js` (`routeDienststelleDispatch`) grows again.
3. `evaluateObservedDockState.js` import-count cleanup only if it grows or receives another lane.
4. Observation folder organization last, only as pure import-path migration.
