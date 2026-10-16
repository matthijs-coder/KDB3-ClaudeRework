# Fix Spec 1: `sicht` CP-2 blockers

> Focused fix iteration for the executed `sicht` direct-port tranche.
> Apply only the fixes below. Do not broaden scope.

---

**Status:** `Ready for execution`
**Base contract:** `_____________KDB3API/contracts/sicht.md`
**Base execution spec:** `_____________KDB3API/contracts/sicht-port-execution-spec.md`
**Reviewer finding:** CP-2 not green; four blockers found.

---

## Section A. Required pre-flight

Read these files before changing anything and echo a one-sentence summary of each:

1. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
5. `_____________KDB3API/.cursor/rules/dom.mdc`
6. `_____________KDB3API/.cursor/rules/amd.mdc`
7. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
8. `_____________KDB3API/contracts/sicht.md`
9. `_____________KDB3API/contracts/sicht-port-execution-spec.md`
10. This fix spec.

---

## Section B. Files allowed to modify

Only modify these files:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/runSingleSelectInteraction.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/effects/syncSichtOptionAvailability.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/effects/mapFilterDockHandoff.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/createSichtController.js
```

If a clean fix needs a different file, stop and report before editing it.

---

## Section C. Required fixes

### C1. Let `singleSelect` accept `filterType: "sicht"`

File:

```txt
KDB3/js/dashboard/filters/singleSelect/effects/runSingleSelectInteraction.js
```

Problem:

`processFilterDockHandoff()` currently drops `filterType: "sicht"` because `isAcceptedFilterType()` only accepts `singleSelect` and `specialSingleSelect`.

Required change:

- Add `"sicht"` to the accepted filter types.
- Do not treat `sicht` as `specialSingleSelect`.
- Preserve existing `specialSingleSelect` deferred-rights guard.

Acceptance:

- A delegated payload with `filterType: "sicht"` reaches `runInteraction()`.
- Existing `singleSelect` and `specialSingleSelect` behavior is unchanged.

Rules to apply:

- `module-public-api.mdc` - `sicht` delegates through the public singleSelect API.
- `state.mdc` - no foreign state writes.
- `amd.mdc` - keep helpers at factory scope.

### C2. Skip generic `singleSelect` history for `filterType: "sicht"`

File:

```txt
KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
```

Problem:

After C1, a successful Sicht commit would push both:

- generic `singleSelect` history step from `singleSelect`; and
- semantic `filter_sicht` step from `sicht`.

Required change:

- Keep the new `notifySichtCommit(...)` hook after confirmed commit.
- For `filterType: "sicht"`, do not push the generic `_buildCommittedStep(...)` from `singleSelect`.
- For `filterType: "singleSelect"` and `filterType: "specialSingleSelect"`, preserve existing history behavior.

Acceptance:

- `filterType: "sicht"` produces only the `filter_sicht` step from `sicht`.
- `filterType: "singleSelect"` still produces generic singleSelect history.
- `filterType: "specialSingleSelect"` behavior is unchanged.

Rules to apply:

- `state.mdc` - no foreign state writes.
- `module-public-api.mdc` - use public API hook only.
- `feature-structure.mdc` - keep file below the hard limit if possible; if not possible, report exact line count and why.

### C3. Restore a real popup DOM sync route

Files:

```txt
KDB3/js/dashboard/filters/sicht/effects/mapFilterDockHandoff.js
KDB3/js/dashboard/filters/sicht/effects/syncSichtOptionAvailability.js
KDB3/js/dashboard/filters/sicht/createSichtController.js
```

Problem:

`syncSichtOptionAvailability.js` expects live popup nodes in `handoff.popup.popupMount` / `mountEl`, but `filterDock` handoffs are serializable and may not carry live DOM refs. This can make Sicht hidden/disabled/Alle rules silently no-op.

Required change:

- Do not require live DOM refs inside the serializable handoff.
- In the Sicht owner, resolve the current popup mount by an owner-scoped DOM lookup only when handling a Sicht popup/open/popup-ready handoff.
- The lookup must be scoped as narrowly as available:
  1. prefer an existing `_KDB.runtime.sicht.domRefs.popupMount` if still attached;
  2. otherwise use the current active filter wrapper / popup selector from the handoff context if available;
  3. otherwise use the known Cognos popup mount selector `.wa-filterDock-filterItemMount` as a documented, bounded owner effect.
- Store any live node only in `_KDB.runtime.sicht.domRefs`.
- If no popup mount is found, return `{ didSync: false }` and do not fail the interaction.

Acceptance:

- Sicht option availability sync can run without non-serializable handoff fields.
- No live DOM node is stored in `_KDB.state`.
- No cross-owner `_KDB.runtime.filterDock` read is introduced.
- `"Alle"` hiding and disabled option classes are applied when popup DOM is present.

Rules to apply:

- `dom.mdc` - live DOM refs under `_KDB.runtime.sicht.domRefs`; scoped DOM lookup only.
- `runtime.mdc` - runtime refs cleaned on destroy.
- `state.mdc` - handoff/state remain serializable.

### C4. Address `commitConfirmedSelection.js` line count

File:

```txt
KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
```

Problem:

The file was reported at 162 lines, above the hard limit in `feature-structure.mdc`.

Preferred fix:

- Keep the file under 150 lines by compacting the new hook or extracting no new file unless absolutely required.
- Do not create a new folder.

If not possible:

- Report the exact final line count.
- Explain why the overrun is unavoidable in this fix iteration.
- Do not silently leave the overrun unreported.

Rules to apply:

- `feature-structure.mdc` - hard line limit requires restructuring or explicit report.
- `amd.mdc` - no inline/nested helper functions.

---

## Section D. Forbidden actions

Do not:

- modify `.cursor/rules/`;
- modify contract templates;
- modify legacy trees;
- modify `TEST/`;
- add events or `eventSubscribe.md`;
- add Dienststelle / hierarchy behavior;
- write foreign state;
- import `singleSelect` internals from `sicht`;
- touch files outside Section B unless you stop and report first.

---

## Section E. Self-verification

Before reporting back, verify:

1. `filterType: "sicht"` reaches `singleSelect` interaction.
2. `filterType: "sicht"` does not push generic singleSelect history.
3. `notifySichtCommit(...)` still fires only after successful commit.
4. Sicht popup sync does not depend on non-serializable handoff fields.
5. No `_KDB.runtime.filterDock` read was added.
6. No direct `_KDB.state.tableData` read was added.
7. No foreign state write was added.
8. `commitConfirmedSelection.js` final line count is either <=150 or explicitly reported.
9. No lint diagnostics were introduced.

---

## Section F. Report template

Final report must include:

1. Pre-flight echo (10 summaries).
2. File checklist with final line counts.
3. Fix confirmation for C1-C4.
4. Self-verification result for E1-E9.
5. Deviations, if any.
