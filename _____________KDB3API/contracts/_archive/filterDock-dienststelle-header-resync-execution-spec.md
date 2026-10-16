# Execution Spec: filterDock -> dienststelle header resync

**Status:** Draft for CP approval
**Module / contracts:**

```txt
_____________KDB3API/contracts/filterDock.md
_____________KDB3API/contracts/dienststelle.md
_____________KDB3API/contracts/filterDock-dienststelle-header-resync-contractdelta.md
```

**Phase:** narrow post-startup header-label timing fix
**Authoring AI:** GPT-5.5, 2026-06-04
**Executing AI:** TBD
**Reviewer:** user / supervising AI

---

## Section A. Pre-flight read list

The executing AI must read these files before editing and echo one sentence per file:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/contracts/filterDock.md`
12. `_____________KDB3API/contracts/dienststelle.md`
13. `_____________KDB3API/contracts/filterDock-dienststelle-header-resync-contractdelta.md`
14. This execution spec.

If the executing AI cannot summarize the delta's two observer limits, stop: no `characterData`, no `title` observation.

---

## Section B. Scope

Allowed production files, only if CP approves execution:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/dispatchFilterHandoff.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/evaluateObservedDockState.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/isKdbOwnedMutationTarget.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/config/actions.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/routeDienststelleDispatch.js
```

Optional new production files, only if they keep existing files under the hard size limit:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/evaluateDockHeaderResync.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/scheduleDockHeaderResync.js
```

No other production files are in scope unless the supervising AI explicitly expands this spec.

---

## Section C. Target behavior

When the long-lived `filterDock` observer sees coalesced dock `childList` or existing approved attribute signals that may indicate Cognos replaced or changed filter dock wrapper/header DOM, `filterDock` dispatches a narrow owner notification to route-map owners that opt in.

For Dienststelle, that notification is:

```js
{
  type: "dienststelle/filterDockHeaderObserved",
  payload: {
    source: "filterDockHeaderObserved",
    observedAt: number,
    addedCount: number,
    removedCount: number,
    attributeCount: number,
    filterWrapperCount: number
  }
}
```

Dienststelle handles the action by running only the existing idempotent filterdock header-name sync. It must not reconcile values, change selection state, run widget downstream effects, or sanitize popup option labels from this action.

---

## Section D. Per-file instructions

### `filterDock/effects/dispatchFilterHandoff.js`

- Add a route-map capability for `dienststelle`:
  - `actionTypes.headerObserved = "dienststelle/filterDockHeaderObserved"`
  - `needsFilterDockHeaderResync = true`
- Add or expose a helper that dispatches header-observed notifications to owners with `needsFilterDockHeaderResync === true`.
- Reuse the existing public API dispatch discipline: `_KDB.api.<owner>.dispatch(action)`.
- If target API or dispatch is missing, return a failed/no-op result without throwing.
- Do not inspect or transform `.wa-filterDock-filterName` text.
- Do not hardcode `Dienststelle_BW -> Dienststelle`.

Rules to apply:

- `module-public-api.mdc` — cross-module command goes through the known owner's public dispatch API.
- `events.mdc` — do not add an event; direct API is correct because owner is known.
- `state.mdc` — no sibling state writes.
- `dom.mdc` — no live DOM refs in payload.
- `naming.mdc` — action names use slash-style; event names are not introduced.

### `filterDock/observation/evaluateObservedDockState.js`

- Hook the header-resync evaluation into the existing coalesced evaluation path, after raw mutation signals have been normalized.
- Do not dispatch from the raw `MutationObserver` callback.
- The hook must run before the `filtersReady` 500ms stability gate completes; it must not replace `filtersReady`.
- Keep existing popup-ready and filters-ready behavior intact.

Rules to apply:

- `runtime.mdc` — use existing scheduled evaluation lifecycle; no new untracked observer.
- `error-handling.mdc` — keep existing boundary handling; no silent catches if a new boundary is introduced.
- `dom.mdc` — reads are scoped to the filterDock root already owned by filterDock.
- `amd.mdc` — factory-scope helpers only; no inline subfunctions.

### `filterDock/observation/isKdbOwnedMutationTarget.js`

- Extend or supplement KDB-owned mutation filtering so Dienststelle's own ready/visibility classes do not trigger repeated header-observed dispatches by themselves.
- Must cover at minimum:

```txt
KDB_dienststelle
KDB_dienststelle_active
KDB_dienststelleActive_BW
KDB_dienststelleActive_DEZPV
KDB_dienststelle_popupLabelsReady
```

- The filter may be conservative: it may suppress dispatch for purely KDB-owned class mutations, but must not suppress real Cognos child-list replacement signals.

Rules to apply:

- `runtime.mdc` — avoid feedback loops that create unnecessary scheduled work.
- `dom.mdc` — class names are DOM/config concerns, not state.
- `naming.mdc` — preserve existing class naming; do not invent new marker classes in this tranche.

### Optional `filterDock/observation/evaluateDockHeaderResync.js`

- Create only if it keeps `evaluateObservedDockState.js` below the file-size limit.
- Input: `_KDB`, normalized mutation summary, dock root / wrapper count access as already available in evaluation flow.
- Output: a small serializable decision object such as `{ shouldDispatch: boolean, payload: object }`, or directly call the route dispatch helper if that better matches local patterns.
- Dispatch only on:
  - `childList` activity that may represent wrapper/header node replacement; or
  - non-KDB approved attribute changes already observed by the current observer.
- Do not require `characterData`.
- Do not require `title`.
- Do not query Dienststelle state.

Rules to apply:

- `feature-structure.mdc` — file has one focused responsibility and remains under 150 lines.
- `dom.mdc` — no owner-specific label mutation in filterDock.
- `state.mdc` — no sibling state reads/writes.
- `amd.mdc` — full-compact AMD shape.

### Optional `filterDock/observation/scheduleDockHeaderResync.js`

- Create only if existing scheduling does not already provide sufficient coalescing.
- Use `requestAnimationFrame` by default, with `setTimeout(..., 0)` fallback only if needed.
- Store timer/frame handles in `_KDB.runtime.filterDock.timers` under a clear key.
- Cancel / ignore scheduled work after `filterDock.destroy()`.
- Do not create any new `MutationObserver`.

Rules to apply:

- `runtime.mdc` — every scheduled handle has cleanup ownership.
- `error-handling.mdc` — no uncaught async fire-and-forget boundary.
- `feature-structure.mdc` — focused file, no broad evaluation logic.

### `dienststelle/config/actions.js`

- Add the new action constant:

```js
FILTER_DOCK_HEADER_OBSERVED: "dienststelle/filterDockHeaderObserved"
```

- Keep naming aligned with existing Dienststelle action constants.
- Do not add events.

Rules to apply:

- `naming.mdc` — slash-style action names; English technical identifier.
- `feature-structure.mdc` — config file stays declarative.

### `dienststelle/effects/routeDienststelleDispatch.js`

- Add handling for `dienststelle/filterDockHeaderObserved`.
- Handler must run only the existing header-name sync path used for filterdock header names.
- It must not call reconcile, Sicht sync, history replay, popup option sanitizing, or widget downstream effects.
- It must be safe when wrappers are missing and when the action arrives repeatedly.
- It must respect disposed-state behavior through the existing public dispatch guard; do not add throws.

Rules to apply:

- `module-public-api.mdc` — public dispatch action remains on existing dispatch-style surface.
- `dom.mdc` — Dienststelle may mutate only approved `.wa-filterDock-filterName` `textContent` and `title` via its existing header-name sync.
- `state.mdc` — no foreign writes and no new state shape for this action.
- `error-handling.mdc` — preserve existing boundary handling.

---

## Section E. Forbidden actions

The executing AI must not:

- Enable `characterData` on the long-lived dock observer.
- Add `title` to the long-lived dock observer `attributeFilter` for this tranche.
- Add a Dienststelle-owned `MutationObserver`.
- Add a second dock-level observer for header labels.
- Mutate `.wa-filterDock-filterName` from filterDock.
- Implement `Dienststelle_BW` / `Dienststelle_DEZPV` string replacement in filterDock.
- Change `[data-id]`, `filterId`, `filterKey`, `activeFilterKey`, Cognos lookup identity, selection values, or history snapshots.
- Reuse `dienststelle/filterDockFiltersReady` for repeated header observations.
- Route this through `_KDB.events`.
- Add behavior to `KDB.js`, bootstrap registration, `eventSubscribe.md`, or any legacy tree.
- Touch `TEST/`.

---

## Section F. Acceptance criteria

AC1. The existing filterDock `MutationObserver` remains the only dock-level observer involved.

AC2. The observer configuration still uses only `childList`, `subtree`, and approved attributes; no `characterData`, no `title`.

AC3. Header-observed dispatch is coalesced through existing evaluation/scheduling discipline and never runs directly inside the raw observer callback.

AC4. `filterDock` emits only a serializable owner notification; it does not mutate labels or implement Dienststelle display rules.

AC5. Dienststelle handles `dienststelle/filterDockHeaderObserved` by running only idempotent header-name sync.

AC6. KDB/Dienststelle-owned class mutations do not cause an unbounded notification loop.

AC7. Repeated notifications and missing wrappers are safe no-ops or idempotent writes.

AC8. No production file exceeds the hard 150-line limit after the change; if a touched file would exceed it, split into a focused optional helper from Section B or stop and escalate.

AC9. `ReadLints` is clean on all touched production files.

AC10. Static inspection confirms AMD imports resolve and no ES module syntax was introduced.

---

## Section G. Reviewer checklist

After execution, reviewer verifies:

1. The executing AI echoed Section A summaries.
2. The diff touches only files listed in Section B.
3. The new route-map capability is narrow and owner-neutral.
4. The Dienststelle action does not perform reconcile, popup sanitizing, history, Sicht, or widget work.
5. The two explicit limits are preserved: no `characterData`; no `title` in the long-lived dock observer.
6. The implementation has no Dienststelle-owned observer and no second dock-level observer.
7. Lints pass.

