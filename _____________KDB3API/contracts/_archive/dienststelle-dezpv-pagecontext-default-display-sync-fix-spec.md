# Fix Spec: dienststelle DEZPV pageContext default display sync

**Status:** Draft for execution approval
**Module / contract:** `_____________KDB3API/contracts/dienststelle.md`
**Phase:** narrow bugfix, behavior-preserving except missing committed-display sanitizing
**Authoring AI:** GPT-5.5, 2026-06-04
**Executing AI:** TBD
**Reviewer:** user / supervising AI

---

## Section A. Pre-flight read list

The executing AI must read each file below before editing and echo one sentence per item:

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
11. `_____________KDB3API/contracts/dienststelle.md`
12. This fix spec.

If the fix appears to require reducer changes, state-shape changes, popup sanitizing changes, or filterDock changes, stop and report.

---

## Section B. Bug

Scenario:

1. Active Sicht is `DEZPV`.
2. User clears the global Dienststelle filter and confirms.
3. During the same reconcile, Dienststelle applies defaults to pageContext / tab filters.
4. The pageContext committed bottom display keeps the raw Cognos label instead of the sanitized display label.

Root cause from investigation:

- The user-confirm handoff comes from the global filter.
- `runDienststelleReconcile` schedules `syncDienststelleViewFromState(_KDB, handoff)`.
- With a handoff, `syncDienststelleViewFromState` sanitizes committed display only for the handoff scope.
- The pageContext defaults created during the same reconcile are not included in that scoped display sync.

---

## Section C. Scope

Allowed production file to modify:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/runDienststelleReconcile.js
```

No other files are in scope.

---

## Section D. Required behavior

Keep the existing handoff-scoped display sync exactly as it is.

Add a conditional second committed-display sync after the existing handoff sync when all of these are true:

- reconcile source is the user-confirm path;
- `viewSyncHandoff.filterScope` or equivalent scope field is `global`;
- the reconcile result has no dominant/global values;
- the reconcile result has at least one pageContext scope with values in `resolution.pageContextValuesByScope`.

When the condition is true, call:

```js
_syncView(_KDB, null);
```

This invokes the existing committed-display sync for both global and pageContext buckets. It must run only as an additional committed-display pass after the existing scoped sync.

---

## Section E. Implementation guidance

Expected minimal changes in `runDienststelleReconcile.js`:

1. Thread `_reconcileResult` into `scheduleViewSyncAfterReconcile`.
2. Add a small factory-scope helper, for example:

```js
function needsPageContextCommittedSyncAfterGlobalConfirm(_context, _reconcileResult) {
  // inspect _context.viewSyncHandoff and _reconcileResult.resolution
}
```

3. Inside the existing deferred view sync, keep:

```js
_syncFilterDockNames(_KDB);
_syncView(_KDB, handoff);
```

4. After that, conditionally add:

```js
if (needsPageContextCommittedSyncAfterGlobalConfirm(context, reconcileResult)) {
  _syncView(_KDB, null);
}
```

Rules:

- Use `_reconcileResult.resolution` as the primary data source.
- Do not add reducer/state fields.
- Do not read or write filterDock runtime.
- Do not alter `USER_CONFIRM_DEFER_FRAMES`.
- Do not change popup-ready, Sicht sync, history replay, startup, or header-resync paths.
- Do not add logs.
- Keep the file under 150 lines.

---

## Section F. Explicitly out of scope

The executing AI must not:

- Modify `syncDienststelleViewFromState.js`.
- Modify `applyDienststelleDisplaySanitizing.js`.
- Modify `reconcileDienststelleHostScopes.js`, `walkDienststellePageContextScopes.js`, or reducer files.
- Add `defaultedScopes`, `affectedScopes`, or new state fields.
- Change `shouldSanitizeOptionDisplay` behavior.
- Change `dienststelleDefinitions.js`.
- Change `filterDock`.
- Change popup option sanitizing.
- Change committed-display selector strings.
- Change history, widget, Sicht, startup, or tableData behavior.
- Add events, subscriptions, timers, observers, or runtime buckets.
- Touch contracts, rules, templates, legacy trees, or `TEST/`.

---

## Section G. Acceptance criteria

AC1. Only `effects/runDienststelleReconcile.js` is modified.

AC2. Existing handoff-scoped sync still runs for user-confirm flow.

AC3. Extra `_syncView(_KDB, null)` runs only for global user-confirm reconcile results with empty dominant/global values and non-empty `pageContextValuesByScope`.

AC4. Extra sync does not run for global confirm with a selected global value.

AC5. Extra sync does not run for pageContext handoffs.

AC6. Extra sync does not run for startup, Sicht sync, history replay, or non-user reconcile paths.

AC7. No popup sanitizing behavior is changed; `_syncView(_KDB, null)` remains committed-display-only by existing implementation.

AC8. File remains under 150 lines and retains full-compact AMD shape.

AC9. `ReadLints` is clean on `runDienststelleReconcile.js`.

AC10. Static inspection confirms AMD imports still resolve and no new import is needed unless the implementation can justify it within the spec.

---

## Section H. Cognos smoke checks

After implementation, test:

1. DEZPV, global Dienststelle clear + OK, empty pageContext tabs: pageContext bottom display is sanitized.
2. DEZPV, global clear + OK, existing pageContext values: restored/defaulted pageContext bottom displays are sanitized.
3. DEZPV, global value selected + OK: global display remains sanitized and pageContext behavior is unchanged.
4. DEZPV, pageContext clear + OK: existing scoped behavior remains.
5. BW, same flows: no unwanted sanitizing side effects.
6. DEZPV popup open/reopen: popup option sanitizing still works.
7. Sicht toggle DEZPV -> BW -> DEZPV: committed display remains correct.

---

## Section I. Reviewer handoff

The executing AI final report must include:

1. Pre-flight echo for Section A.
2. File checklist with before/after line count.
3. Description of the new condition.
4. Confirmation that no out-of-scope file was modified.
5. AC1-AC10 pass/fail.
6. Lint result.
7. Any uncertainty or deviation.

