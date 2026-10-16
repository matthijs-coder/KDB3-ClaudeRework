# Execution Spec: `dienststelle` minimum-selection / default-on-empty-commit

---

**Status:** `Ready for execution after CP-1 approval`
**Module / contract:** `_____________KDB3API/contracts/dienststelle.md`
**Phase:** `incremental behavior completion`
**Authoring AI:** GPT-5.5, 2026-06-03
**Executing AI:** assigned by reviewer
**Reviewer:** `user / supervising AI`

---

## Section A. Pre-flight read list

The executing AI must read each file below in order before editing any file. Its first response must echo one concrete sentence per item explaining what that rule/document means for this tranche. If any summary is missing or generic, stop and re-read.

1. `_____________KDB3API/architecture/midtierDirectPortTemplate.md` — direct production workflow, no `TEST/`, CP gates, forbidden actions.
2. `_____________KDB3API/architecture/projectStructureRules.md` — ownership, small files, services vs APIs, orchestrator/controller split.
3. `_____________KDB3API/architecture/stateOwnership.md` — `_KDB.state.filters.dienststelle` is written only by Dienststelle.
4. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — use allowed `_KDB.*` namespaces only; Cognos host calls go through `_KDB.cognosAPI`.
5. `_____________KDB3API/.cursor/rules/state.mdc` — no foreign state writes; serializable state only.
6. `_____________KDB3API/.cursor/rules/runtime.mdc` — do not create runtime resources without cleanup; this tranche should not add runtime resources.
7. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — keep `_KDB.api.dienststelle = { mount, destroy, dispatch, getState }`; no named public methods.
8. `_____________KDB3API/.cursor/rules/events.mdc` — no new events for this known-owner dispatch path.
9. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — files stay focused; add a helper only to keep the main effect under limits.
10. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names, action names stay slash-style.
11. `_____________KDB3API/.cursor/rules/error-handling.mdc` — effect boundaries catch/log or return controlled results; do not silently swallow new host-read failures.
12. `_____________KDB3API/.cursor/rules/dom.mdc` — if visible-tab DOM detection is needed, it is read-only and scoped; no live refs stored.
13. `_____________KDB3API/.cursor/rules/amd.mdc` — production files use one full-compact AMD `define`; helpers at factory scope, no inline subfunctions.
14. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — do not invent lifecycle terms.
15. `_____________KDB3API/contracts/dienststelle.md` — especially Section 11.1 and CP-1 matrix.
16. This execution spec.

---

## Section B. Folder tree / exact files

Modify or create only these files:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/
  effects/
    routeDienststelleDispatch.js              (modify)
    runDienststelleReconcile.js               (modify)
    reconcileDienststelleHostScopes.js        (modify)
    resolveDienststelleDefaultTargets.js      (new)
```

Do not modify `applyDienststelleDefault.js`, `readDefaultDienststelleValue.js`, history files, widget modules, filterDock, Sicht, bootstrap, rules, templates or legacy trees in this tranche unless the reviewer explicitly updates this spec.

---

## Section C. Mapping table

| Production file | Evidence / source | Required behavior note |
|---|---|---|
| `effects/routeDienststelleDispatch.js` | Current production filterDock confirm route; REDESIGN2 confirms pass `commitFromUser`, `commitSourceScope`, `commitSourceWasClear`, `allowDefaulting`. | On clicked OK, pass handoff scope and clear intent into reconcile. Do not add legacy OK polling. |
| `effects/runDienststelleReconcile.js` | Current production strips context down to active Sicht/source/history. | Preserve and forward reconcile options (`commitFromUser`, `commitSourceScope`, `commitSourceWasClear`, `scopeId`, `allowDefaulting`, `viewSyncHandoff`) to `reconcileConfirmedDienststelle`. |
| `effects/reconcileDienststelleHostScopes.js` | laatsteOriginal `handleEmptyStelleFilter` scope rules; current production naive global default then page defaults. | Replace naive empty defaulting with S1-S6 targeting: user global-clear defaults eligible empty visible pageContext scopes only; page clear defaults only that tab when global empty; global value blocks page default. |
| `effects/resolveDienststelleDefaultTargets.js` | Current architecture investigation: use `readDienststelleHostSelection` + `_KDB.cognosAPI.filters`; visible-tab read may be DOM-scoped and read-only. | New focused helper returns pageContext target scopes/apis that are confirmed host-empty. No legacy caches, no multi-scan, no sticky forcing. |

---

## Section D. Per-file specifications

### `effects/resolveDienststelleDefaultTargets.js`

- **Role:** focused effect helper for default target selection.
- **Lines:** target 80-120, hard limit 150.
- **AMD imports:**
  - `./readDienststelleHostSelection.js`
- **Factory parameters:**
  - `_hostSelection`
- **Factory-scope named helpers:**
  - `function normalizeScopeId(_scopeId)` — return `"global"` or scope id without `_tabpanel` suffix.
  - `function readVisibleScopeIds(_KDB)` — best-effort read-only visible tab ids from current DOM / `_KDB.state.tabs.currentTabId`; if no visibility evidence is available, return an empty array to signal fallback.
  - `function filterVisibleScopes(_scopeIds, _visibleScopeIds)` — when visible ids exist, keep matching scopes; otherwise keep all supplied scopes.
  - `function readPageContextValue(_KDB, _activeFilterKey, _scopeId)` — use `_hostSelection.lookupFilterApi` and `_hostSelection.readFilterValues`.
- **Entry function:**
  - Name: `__controller`
  - Parameters: `_KDB`, `_definition`, `_context`, `_globalValue`
  - Body steps:
    1. Read all pageContext scopes via `_hostSelection.listPageContextScopes(_KDB, _definition.activeFilterKey)`.
    2. Normalize and de-duplicate scope ids.
    3. If `_context.commitSourceScope === "pageContext"`, restrict to `_context.scopeId`.
    4. If `_context.commitSourceScope === "global"` and `_context.commitFromUser === true`, restrict to visible scopes when visible scope evidence exists.
    5. For each remaining scope, look up the pageContext API and read committed values.
    6. Return `{ targetScopes, existingValuesByScope }` where `targetScopes` contains only scopes whose host read is empty (`readFilterValues(...) === null`) and whose API exists.
  - Return value: object with `targetScopes` array and `existingValuesByScope` map.
- **Rules to apply:**
  - `amd.mdc` — full-compact AMD, one returned controller, helper functions at factory scope.
  - `naming.mdc` — English names; underscore prefixes only for boundary parameters.
  - `feature-structure.mdc` — focused helper under `effects/`, small file.
  - `state.mdc` — no state writes.
  - `dom.mdc` — visible-tab detection is read-only; do not store DOM refs.
  - `error-handling.mdc` — catch host/DOM read failures and return empty evidence, with at most one scoped warning for unexpected host read errors.

### `effects/reconcileDienststelleHostScopes.js`

- **Role:** main host-scope reconcile effect.
- **Lines:** hard limit 150; if edits push over the limit, stop and report before proceeding.
- **AMD imports:** add the new helper:
  - `./resolveDienststelleDefaultTargets.js`
- **Factory parameters:** add `_resolveDefaultTargets` in the same position as the new import.
- **Entry function:**
  - Keep name `__controller`.
  - Continue to read the global host value through `readDienststelleHostSelection`.
  - Remove the current unconditional "global empty -> apply default to global" behavior for user clear paths.
  - Implement these branches:
    1. Determine `isUserCommit = _context.commitFromUser === true`.
    2. Determine `commitSourceScope = _context.commitSourceScope || (_context.filterScope === "pageContext" ? "pageContext" : "global")`.
    3. Determine `allowDefaulting = _context.allowDefaulting === true && _context.isHistoryReplay !== true`.
    4. If global host value exists, dispatch `SELECTION_OBSERVED` for global, sync any observed pageContext values, and do not apply pageContext defaults.
    5. If no global value and `allowDefaulting` is false, only sync observed host values; do not default.
    6. If `isUserCommit && commitSourceScope === "global"`, call `_resolveDefaultTargets` and apply the default only to returned empty pageContext targets. Do not default global.
    7. If `isUserCommit && commitSourceScope === "pageContext"`, call `_resolveDefaultTargets`; apply default only to the confirmed `_context.scopeId` when it is host-empty and global is empty.
    8. For non-user startup/Sicht reconcile, preserve existing defaulting behavior where no selection exists, but keep it inside active Sicht/default-table context and do not introduce global user-clear defaulting.
    9. For each applied default, dispatch `DEFAULT_APPLIED` with `scopeId`, `filterKey`, `visibleFilterLabel`, and `selection`.
    10. Always finish with one `SYNC_REQUESTED` payload reflecting actual observed/applied values by scope.
  - S6: if `_applyDefault` returns `null`, do not invent fallback values; leave that scope absent/empty in `pageContextValuesByScope` and allow existing warning/error behavior.
- **Rules to apply:**
  - `amd.mdc` — keep full-compact AMD and factory-scope helpers only.
  - `naming.mdc` — use semantic names (`commitSourceScope`, `allowDefaulting`, `targetScopes`).
  - `feature-structure.mdc` — effect remains focused; helper file carries target selection.
  - `state.mdc` — no direct foreign writes; only dispatch owner actions.
  - `module-public-api.mdc` — no new public methods.
  - `error-handling.mdc` — host/default failures are boundary failures; log or return controlled null without throwing through dispatch.
  - `dom.mdc` — no direct DOM mutation here.

### `effects/runDienststelleReconcile.js`

- **Role:** preserve reconcile context and schedule view sync.
- **Lines:** keep under current size target.
- **AMD imports:** unchanged.
- **Entry function:** `runDienststelleReconcile`
- **Required change:**
  - Build the reconcile payload by preserving existing `_context` fields, not only `activeSichtValue`, `source`, and `isHistoryReplay`.
  - Ensure these keys can reach `reconcileConfirmedDienststelle` / `reconcileDienststelleHostScopes`:
    - `commitFromUser`
    - `commitSourceScope`
    - `commitSourceWasClear`
    - `allowDefaulting`
    - `filterScope`
    - `scopeId`
    - `viewSyncHandoff`
    - `source`
    - `isHistoryReplay`
  - Continue to resolve `activeSichtValue` through existing logic.
  - Continue view sync scheduling after reconcile; do not change DOM timing.
- **Rules to apply:**
  - `amd.mdc` — no new nested subfunctions.
  - `naming.mdc` — boundary parameters keep underscore prefix.
  - `feature-structure.mdc` — thin coordination only.
  - `module-public-api.mdc` — no public API changes.
  - `error-handling.mdc` — do not add silent async failure paths.

### `effects/routeDienststelleDispatch.js`

- **Role:** dispatch router; user confirm hook.
- **Lines:** keep under current hard limit.
- **AMD imports:** unchanged.
- **Required change:**
  - In `runUserConfirmReconcile`, pass these fields into `_runReconcile`:
    - `source: "user"`
    - `commitFromUser: true`
    - `allowDefaulting: true`
    - `filterScope: _mappedHandoff.filterScope`
    - `scopeId: _mappedHandoff.scopeId || _mappedHandoff.scope`
    - `commitSourceScope: _mappedHandoff.filterScope === "pageContext" ? "pageContext" : "global"`
    - `commitSourceWasClear: _mappedHandoff.clickedClear === true || _mappedHandoff.interactionType === "clear"`
    - `viewSyncHandoff: _mappedHandoff`
    - `observedAt: _mappedHandoff.timestamp || Date.now()`
  - Do not require `commitSourceWasClear` to be true for defaulting if the host-read after confirm is empty; the host read is the architecture-level empty signal. The clear intent is still passed for branch selection and auditability.
  - Keep inactive-variant handoff guard unchanged.
  - Keep history push after reconcile (`maybePushDienststelleHistoryStep`) unchanged so auto-default is included in the same commit step.
- **Rules to apply:**
  - `amd.mdc` — keep AMD shape.
  - `naming.mdc` — clear action/context names.
  - `feature-structure.mdc` — router only; no host-read logic here.
  - `module-public-api.mdc` — dispatch-style API unchanged.
  - `state.mdc` — no direct state writes.
  - `error-handling.mdc` — promise chain must not swallow unexpected reconcile errors silently.

---

## Section E. Scenario behavior table

| Scenario | Trigger context | Expected result |
|---|---|---|
| S1 — global clear, empty pageContext tabs | `commitFromUser: true`, `commitSourceScope: "global"`, global host empty | Do not default global; apply active default to eligible visible pageContext scopes whose host read is empty. |
| S2 — single tab clear, no global value | `commitSourceScope: "pageContext"`, target scope host empty, global host empty | Apply active default only to that target scope. |
| S3 — global has value, one tab cleared | Global host read returns value | Do not default pageContext; global remains dominant. |
| S4 — tab has value, global cleared | Global host empty, pageContext host read returns existing/restored value | Preserve pageContext value; do not force REDESIGN2 sticky restore into Cognos. |
| S5 — multiple tabs mixed | Some target scopes host-empty, others have values | Apply default only to empty eligible scopes; never copy values between tabs. |
| S6 — default unavailable | `_applyDefault` returns `null` | No fallback; no invented value; controlled warning/error only. |

---

## Section F. Public API and state wiring

- Public surface remains `_KDB.api.dienststelle = { mount, destroy, dispatch, getState }`.
- No new public methods.
- No new `_KDB` top-level keys.
- State writes continue only through existing reducer dispatch actions:
  - `SELECTION_OBSERVED`
  - `DEFAULT_APPLIED`
  - `SYNC_REQUESTED`
  - existing `ERROR` if needed.
- No new event names and no `events/` folder.

---

## Section G. History semantics

- Preserve current `routeDienststelleDispatch` pattern: old snapshot is read before user confirm reconcile; history step is pushed after reconcile.
- Because defaults are applied inside the same reconcile, `filter_dienststelle.new` includes auto-defaulted values.
- Do not create a separate history step for auto-default.
- History replay paths must not enable defaulting unless replay snapshot already contains the defaulted values.

---

## Section H. No harness

No `TEST/` sandbox, no browser harness, no mock files. This is a direct production-tree tranche.

---

## Section I. Acceptance criteria

1. Only the files in Section B are modified/created.
2. All modified production files keep valid AMD shape and no ES module syntax.
3. `routeDienststelleDispatch.js` passes user commit context into reconcile.
4. `runDienststelleReconcile.js` preserves commit/default context instead of stripping it.
5. `reconcileDienststelleHostScopes.js` no longer defaults global on user global-clear when pageContext exists.
6. S1-S6 behavior from Section E is implemented exactly.
7. Scope emptiness uses current host-read utilities (`lookupFilterApi` + `readFilterValues`) and treats `null` as empty.
8. No legacy polling, `savedSettings`, `selectedValues`, post-OK watcher, REDESIGN2 sticky/multi-scan, or `pageRestoredAfterGlobalClear` forcing is introduced.
9. Default values still come from `readDefaultDienststelleValue.js` through `tableDataService` and `dienststelleDefinitions.js`.
10. No direct widget module edits and no direct widget state/runtime writes.
11. No foreign state writes; all state changes go through Dienststelle dispatch/reducer.
12. History remains one user commit step; no second step for auto-default.
13. `ReadLints` is clean for every touched `.js` file.
14. Static AMD imports resolve by path inspection.

---

## Section J. Forbidden actions

The executing AI must not:

- Modify any file under `_____________KDB3API/.cursor/rules/`.
- Modify `projectStructureRules.md`, `stateOwnership.md`, `lifecycleVocabulary.md`, `eventSubscribe.md`, litmustest reports, or contract templates.
- Modify `_____________KDB3API/contracts/dienststelle.md` or this execution spec during execution.
- Modify any legacy tree: `_______KDB3/`, `_______REDESIGN2/`, `_______LAATSTEORIGINAL/`, `laatsteOriginal/`.
- Write anything under `TEST/`.
- Modify widget modules, filterDock, Sicht, bootstrap, CSS, tests, or README files.
- Add new `_KDB` top-level keys, lifecycle terms, or event names.
- Add legacy OK polling, `savedSettings`, `selectedValues`, post-OK watcher, sticky/multi-scan, or direct widget downstream logic.
- Commit, push, change git config, or run destructive git commands.

If immediate host-read staleness appears likely, stop and report. Do not improvise a wait loop.

---

## Section K. Reviewer handoff / CP-2 checks

The supervising AI must:

1. Verify the Section A echo is concrete and complete.
2. Read every touched file.
3. Run `ReadLints` on touched `.js` files.
4. Cross-check every touched file against its Section D `Rules to apply`.
5. Verify static AMD imports resolve.
6. Diff-walk against the approved behavior: only the minimum-selection delta is implemented.
7. Check regression list:
   - Sicht sync still routes to Dienststelle.
   - Existing filterDock OK commit still routes.
   - Existing display sync remains unchanged.
   - History replay does not push a new step.
   - Widget modules are untouched.
   - No foreign state writes.

---

## Section L. Reporting template for executing AI

Final response must include, in order:

1. **Pre-flight echo** — 16 numbered summaries from Section A.
2. **File checklist** — each touched path with status `modified | created`, approximate line count, and `matches spec | deviation`.
3. **Scenario checklist** — S1-S6 pass/fail with one sentence each.
4. **Rules checklist** — AMD, state ownership, public API, error handling, DOM, runtime.
5. **Forbidden-actions confirmation** — confirm no forbidden paths/actions were touched.
6. **Static import check** — list added/changed AMD imports and whether they resolve.
7. **Open questions / deviations** — only if something could not be implemented exactly.

---

> End of execution spec. Stop after execution/reporting for CP-2 reviewer approval.
