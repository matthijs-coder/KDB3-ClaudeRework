# Execution Spec: filterDock -> dienststelle committed display resync

**Status:** Draft for execution approval  
**Module / contracts:**

```txt
_____________KDB3API/contracts/filterDock.md
_____________KDB3API/contracts/dienststelle.md
_____________KDB3API/contracts/filterDock-dienststelle-committed-display-resync-contractdelta.md
```

**Phase:** deterministic committed bottom-display sanitizing after programmatic defaults  
**Authoring AI:** GPT-5.5, 2026-06-05  
**Executing AI:** TBD  
**Reviewer:** user / planner AI / supervising AI

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
14. `_____________KDB3API/contracts/filterDock-dienststelle-committed-display-resync-contractdelta.md`
15. This execution spec.

If the executing AI cannot summarize why fake `filterDockStateChanged` commits are forbidden, stop before editing.

---

## Section B. Problem statement

### B1. User-visible bug

After the user clears and commits the global Dienststelle filter, DEZPV pageContext defaults can be applied programmatically. The committed bottom-display for the pageContext filter may then show raw Cognos hierarchy text for too long before the Dienststelle sanitizer corrects it.

Canonical symptom:

```txt
M06|3h_Ref_ZKS # 3h4_ZKS - Liquidatur
```

should be visible as:

```txt
3h4_ZKS - Liquidatur
```

### B2. Diagnostic facts

- Normal committed display sanitizing currently follows user click -> `dienststelle/filterDockStateChanged` -> Dienststelle reconcile -> bounded rAF -> `_syncView`.
- Programmatic defaults must not be represented as fake user clicks or fake OK commits.
- The existing `needsPageContextCommittedSyncAfterGlobalConfirm` pass solves scope coverage but can still run before Cognos writes the final pageContext bottom DOM.
- Existing popup resync (`popupDisplayResync`) is popup-only and not responsible for post-OK committed bottom-display.
- `filterDockHeaderObserved` provides a proven ownership pattern: filterDock observes/routes; Dienststelle mutates its own labels.

### B3. Root cause

There is no deterministic observer-handoff for committed bottom-display DOM changes. When Cognos changes `.wa-filterDock-filterItem-bottom` after the Dienststelle reconcile lifecycle pass, no narrow `filterDock` route asks Dienststelle to rerun its committed display sanitizer.

---

## Section C. Target behavior

When the long-lived `filterDock` observer sees relevant committed bottom-display DOM activity, it dispatches a coalesced owner notification to route-map owners that opt in.

For Dienststelle, that notification is:

```js
{
  type: "dienststelle/filterDockCommittedDisplayObserved",
  payload: {
    source: "filterDockCommittedDisplayObserved",
    observedAt: number,
    addedCount: number,
    removedCount: number,
    attributeCount: number,
    committedDisplayMutationCount: number,
    filterWrapperCount: number
  }
}
```

Dienststelle handles the action by running existing idempotent committed display sanitizing across global and pageContext buckets. It must not reconcile values, default values, push history, change widget downstream state, or reuse popup resync.

---

## Section D. Execution tranches

Execute in order. Do not start Tranche 2 unless Tranche 1 has been implemented and Cognos smoke shows the committed bottom-display is still missed.

---

### Tranche 0 — Contract documents

#### D0.1 Allowed files

```txt
_____________KDB3API/contracts/filterDock-dienststelle-committed-display-resync-contractdelta.md
_____________KDB3API/contracts/filterDock-dienststelle-committed-display-resync-execution-spec.md
```

This tranche is complete when these documents exist and the user approves execution.

---

### Tranche 1 — deterministic committed display observer-handoff

#### D1.1 Allowed production files

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/dispatchFilterHandoff.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/evaluateObservedDockState.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/isKdbOwnedMutationTarget.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/config/actions.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/routeDienststelleDispatch.js
```

Optional new production files, only if needed to keep files focused and under 150 lines:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/evaluateDockCommittedDisplayResync.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/isCommittedDisplayMutationTarget.js
```

No other production files are in scope for Tranche 1 unless the supervising AI explicitly expands this spec.

#### D1.2 Step T1.1 — route-map capability

In `filterDock/effects/dispatchFilterHandoff.js`:

- Add `needsFilterDockCommittedDisplayResync: true` for the Dienststelle route.
- Add `actionTypes.committedDisplayObserved = "dienststelle/filterDockCommittedDisplayObserved"`.
- Add a helper equivalent to the header helper, for example `dispatchCommittedDisplayObservedToOwners`.
- Dispatch only to route-map owners with `needsFilterDockCommittedDisplayResync === true`.
- Use `_KDB.api.<owner>.dispatch(action)`; do not add `_KDB.events`.
- Do not inspect, sanitize, or transform Dienststelle text in filterDock.

Checkpoint T1.1: route exists and direct known-owner API dispatch remains the only cross-module command.

#### D1.3 Step T1.2 — committed display relevance

Add a focused evaluator/helper for committed bottom-display relevance.

Approved selector concepts:

```txt
.wa-filterDock-filterItem-bottom
.wa-filterDock-filterItemText
```

Rules:

- Treat a mutation as relevant when its target, added nodes, or removed nodes are at, inside, or contain committed bottom-display nodes.
- Use existing long-lived dock observer signals only: `childList`, `subtree`, and already-approved attribute signals.
- Do not enable `characterData`.
- Do not add `title` or `aria-label` to the long-lived dock observer attribute filter.
- Do not import Dienststelle modules into filterDock.
- Payload must be serializable and must not contain DOM nodes or MutationRecord objects.

Recommended payload fields:

```js
{
  source: "filterDockCommittedDisplayObserved",
  observedAt: Date.now(),
  addedCount: number,
  removedCount: number,
  attributeCount: number,
  committedDisplayMutationCount: number,
  filterWrapperCount: number
}
```

Checkpoint T1.2: relevant bottom-display `childList` changes produce a decision to dispatch; unrelated dock mutations do not.

#### D1.4 Step T1.3 — hook into observed-state evaluation

In `filterDock/observation/evaluateObservedDockState.js`:

- Hook committed-display evaluation into the existing coalesced observed-state path.
- Run it near the existing header-resync evaluation so both use the same long-lived observer lifecycle.
- Do not dispatch from the raw `MutationObserver` callback.
- Do not replace `detectAndDispatchFiltersReady`.
- Do not touch popup attach/detach semantics.

Checkpoint T1.3: filterDock can dispatch committed-display observations while popup code remains unchanged.

#### D1.5 Step T1.4 — KDB-owned feedback guard

In `filterDock/observation/isKdbOwnedMutationTarget.js`, extend or reuse KDB-owned filtering so Dienststelle's own classes do not cause noisy repeated owner notifications by themselves.

Must cover at minimum:

```txt
KDB_dienststelle
KDB_dienststelle_active
KDB_dienststelleActive_BW
KDB_dienststelleActive_DEZPV
KDB_dienststelle_popupLabelsReady
```

Do not suppress genuine Cognos child-list replacement of committed bottom-display nodes.

Checkpoint T1.4: Dienststelle sanitize output does not create a self-sustaining filterDock dispatch loop.

#### D1.6 Step T1.5 — Dienststelle action

In `dienststelle/config/actions.js`, add:

```js
FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED: "dienststelle/filterDockCommittedDisplayObserved"
```

Keep the action declarative. Do not add events or state.

Checkpoint T1.5: action constant exists and naming matches current style.

#### D1.7 Step T1.6 — Dienststelle handler

In `dienststelle/effects/routeDienststelleDispatch.js`:

- Handle `FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED`.
- Handler must call existing view sanitizing only, preferably `_syncView(_controller._KDB, null)`.
- It may call `_syncFilterDockNames(_controller._KDB)` only if needed by existing local lifecycle consistency, but this is not required for the committed-display fix.
- It must not call `_runReconcile`, `_syncFromSicht`, history replay, or `maybePushHistoryStep`.
- It must not dispatch `FILTER_DOCK_STATE_CHANGED`.
- It must be safe when wrappers are missing and when actions arrive repeatedly.

Checkpoint T1.6: Dienststelle owns the display mutation; filterDock only routes the observation.

#### D1.8 Step T1.7 — lint and static checks

1. Run `ReadLints` on all touched production files.
2. Confirm every touched production file remains under 150 lines.
3. Confirm AMD dependency arrays and factory parameters match.
4. Confirm no new public API shape, state shape, `_KDB.events`, CSS, or Cognos write behavior.
5. Confirm no Tranche 2 `characterData` changes were made.

Checkpoint T1.7: lint clean and line counts recorded.

---

### Tranche 2 — characterData fallback (conditional only)

Execute only if Tranche 1 is implemented and Cognos smoke proves relevant committed bottom-display changes are not detected because Cognos mutates in-place text nodes.

Requires explicit user/planner approval before editing.

#### D2.1 Allowed files

To be finalized by a new contract delta before execution. Expected area only:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/<long-lived observer setup file>
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/evaluateDockCommittedDisplayResync.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/isCommittedDisplayMutationTarget.js
```

#### D2.2 Required contract decision

Before enabling `characterData`, create or approve a follow-up delta that states:

- `filterDock` may observe `characterData` on the long-lived dock root;
- relevance is limited to committed bottom-display text nodes;
- KDB-owned Dienststelle text writes must not create feedback loops;
- no owner transform moves into filterDock.

Tranche 2 is forbidden without this approval.

---

## Section E. Explicitly out of scope

The executing AI must not:

- Route programmatic defaults as fake `dienststelle/filterDockStateChanged`.
- Set `clickedOk` or user intent fields for programmatic defaults.
- Add timer retry ladders for committed display.
- Reuse popup `popupDisplayResync` for committed bottom-display.
- Enable `characterData` in Tranche 1.
- Add a Dienststelle-owned `MutationObserver`.
- Add a second dock-level observer.
- Rewrite popup or committed `aria-label` beyond existing Dienststelle sanitizer behavior.
- Modify CSS.
- Change Dienststelle string sanitizing rules.
- Change defaulting, Cognos selection writes, history, Sicht, widget downstream behavior, or tableData behavior.
- Change state shape, runtime top-level shape, public API shape, or `_KDB.events`.
- Touch legacy trees, `TEST/`, rules, templates, or unrelated contracts.

---

## Section F. Implementation notes

### F1. Uniformity principle

Manual and programmatic committed display changes should not share fake user intent. They should share the same deterministic post-DOM-change owner lifecycle:

```txt
Cognos committed display DOM changed
  -> filterDock observes and routes
  -> Dienststelle sanitizes owned display
```

### F2. Idempotency

`_syncView(_KDB, null)` is acceptable because committed display sanitizing is already idempotent and covers both global and pageContext buckets. Repeated notifications are acceptable if they are coalesced and do not loop.

### F3. Selector ownership

filterDock may use local relevance selector constants to identify generic dock committed display nodes. It must not import Dienststelle selectors or encode Dienststelle-specific hierarchy string rules.

### F4. Performance guardrails

- Dispatch only from the coalesced evaluation path.
- Use relevance filtering before owner dispatch.
- Do not dispatch once per mutation node if one payload can represent the batch.
- Do not run the sanitizer for all owners; dispatch only to owners that opt in.

---

## Section G. Rules to apply

All touched files:

- `amd.mdc` — one full-compact AMD `define`; no ES module syntax; no nested subfunction definitions.
- `feature-structure.mdc` — each touched file stays under 150 lines; extract focused helpers if needed.
- `naming.mdc` — precise English names such as `committedDisplayObserved`.
- `dom.mdc` — no live DOM refs in state or action payloads; scoped dock traversal only.
- `runtime.mdc` — no new observer/timer in Tranche 1; use existing observer lifecycle.
- `state.mdc` — no state shape changes and no foreign writes.
- `module-public-api.mdc` — use existing owner dispatch API.
- `events.mdc` — do not add event bus entries for known owner dispatch.
- `error-handling.mdc` — preserve existing async boundaries and logging discipline.

---

## Section H. Acceptance criteria

### H1. Code constraints

AC1. Tranche 1 modifies only the allowed production files and optional new focused helper files.

AC2. All touched production files remain under 150 lines and AMD-shaped.

AC3. `ReadLints` is clean on all touched production files.

AC4. No fake `FILTER_DOCK_STATE_CHANGED`, `clickedOk`, or user-intent payload is created for programmatic defaults.

AC5. No timers, polling, second observer, Dienststelle-owned observer, or popup route reuse is added.

AC6. No `characterData` observation is added in Tranche 1.

### H2. Behavioral

AC7. Relevant committed bottom-display `childList` changes under the filter dock produce one coalesced owner notification.

AC8. Dienststelle handles `filterDockCommittedDisplayObserved` by running display sanitizing only; no reconcile, defaulting, history, or widget effects.

AC9. DEZPV global clear + OK + pageContext default results in sanitized pageContext committed bottom-display without reopening the filter.

AC10. Existing manual Dienststelle commit behavior remains unchanged.

AC11. Existing header resync remains unchanged.

AC12. Existing popup resync remains unchanged.

AC13. BW flows do not receive unintended visible label transformations.

AC14. Repeated committed-display observations do not create a feedback loop.

### H3. Regression smokes

AC15. DEZPV global clear, empty pageContext tabs -> defaults appear with sanitized committed display.

AC16. DEZPV global clear, tabs with restored values -> committed display remains sanitized.

AC17. DEZPV pageContext-only clear/commit -> scoped behavior remains unchanged.

AC18. Sicht toggle DEZPV -> BW -> DEZPV -> committed displays remain correct.

AC19. Popup open/reopen/expand behavior from the popup double-pass spec remains correct.

---

## Section I. Cognos smoke script

### I1. Primary repro

1. Start with Sicht = DEZPV.
2. Clear the global Dienststelle filter.
3. Click OK/commit.
4. Let pageContext defaults apply.
5. Without reopening the filter, inspect the pageContext committed bottom-display in `#filterDock__other`.

Expected:

- visible text is sanitized, for example `3h4_ZKS - Liquidatur`;
- no visible `M06|... #` prefix remains after the committed DOM settles;
- no filter reopen is required to trigger sanitizing.

### I2. Dispatch trace

If tracing is available, observe:

```txt
dienststelle/filterDockCommittedDisplayObserved
```

after Cognos committed bottom-display DOM activity, followed by Dienststelle display sync.

### I3. Tranche 2 decision probe

If Tranche 1 fails, inspect whether the raw display changed via:

- node replacement / `childList` activity: Tranche 1 relevance may be incomplete;
- in-place text mutation / `characterData`: stop and request Tranche 2 contract approval.

---

## Section J. Milestone checklist

| Milestone | Steps | Done when |
|-----------|-------|-----------|
| M0 Pre-flight | Section A | Read list echoed |
| M1 Route map | T1.1 | Capability and dispatch helper exist |
| M2 Relevance | T1.2-T1.4 | Bottom-display mutations are detected and guarded |
| M3 Dienststelle handling | T1.5-T1.6 | New action triggers display-only sync |
| M4 Verification | T1.7 + Section I | Lint/static/smoke recorded |
| M5 Fallback decision | Tranche 2 only if needed | CharacterData evidence documented |

---

## Section K. Executing AI handoff report

Final report must include:

1. Pre-flight echo.
2. Tranches executed and why.
3. Files changed with before/after line counts.
4. Route-map and action names added.
5. Relevance rule summary.
6. Confirmation that no fake manual commit path was used.
7. Confirmation that Tranche 2 / `characterData` was not started unless explicitly approved.
8. Lint and static-check result.
9. AC1-AC19 pass/fail table or concise equivalent.
10. Remaining risks and Cognos smoke observations.

---

## Section L. Approval log

| Date | Action | Notes |
|------|--------|-------|
| 2026-06-05 | Contract delta + execution spec drafted | Deterministic committed-display observer handoff |
| TBD | User approval | |
| TBD | Execution completed | |
