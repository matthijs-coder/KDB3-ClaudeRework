# tableDataService litmustest report

_Litmustest of the shared-service path of the 10 MUST-rules and the Module-Contract-First workflow, executed 2026-05-12 by porting a skeleton of `tableDataService` into `TEST/tableDataService-port/`._

This is the second litmustest in the framework-validation sequence. The first (`kdbControl-litmustest-report.md`) exercised a feature module with a dispatch+reducer public API. This one exercises a shared service with a named-method public API. The two together cover the public-API split codified in `module-public-api.mdc`.

The report documents what worked, what surfaced as new gaps, how the R5 and R6 template patches performed under empirical load, and what the recommended next steps are.

---

## 1. Outcome

| Aspect | Result |
|---|---|
| Module contract authored from template | Pass — all sections filled; open questions Q1–Q5 surfaced before implementation; Q1 deferred (hierarchy) cataloged as candidate. |
| Skeleton folder layout matches contract | Pass — see `TEST/tableDataService-port/tableData/`. |
| AMD shape | Pass — full-compact `define([...], function (...) { ... })`, named factory-scope entry functions, no inline subfunctions inside entry or callback bodies. |
| State ownership / runtime initialization | Pass — `_KDB.state.tableData.<tableName>` written only via named writer helpers; `_KDB.runtime.tableData` initialized in orchestrator and reset in `destroy`. |
| Public API surface discipline | Pass — single named-method surface on `_KDB.services.tableData`; no dispatch on the public surface; no reducer; no foreign-reducer trigger. |
| Lifecycle boundaries (try/catch) — anti-D1 | **Pass on first pass.** Every named executable and public method has try/catch. |
| Runtime cleanup on destroy — anti-D2 | **Pass on first pass.** `destroy` aborts listeners, marks each table disposed, resets buckets — does not null `runtime` before cleanup. |
| Harness CP2 (browser load + lifecycle + event log) | Pass — Load pkz, Reload pkz, Destroy each produce the expected lifecycle/freshness/rowCount and emit `tableData:loadFinished` with `rowCount: 4`. |

**Net result:** the framework works without iteration for a service-type module when the execution spec is built from the new template. Zero deviations. CP2 green on first browser run.

---

## 2. Service-type validation (the primary purpose of this litmustest)

### What was new compared to kdbControl

| Concern | kdbControl (feature) | tableDataService (service) |
|---|---|---|
| Public API surface | `_KDB.api.kdbControl` | `_KDB.services.tableData` |
| Public API style | dispatch + reducer | named methods |
| State writes | one reducer, one place | five named writer helpers (`markTableLoading`, `markTableLoaded`, `markTableFailed`, `markTableStale`, `markTableDisposed`) |
| `getState()` | coarse snapshot exception | full subtree (acceptable per the service-block of `module-public-api.mdc`) |
| Public read methods | none (selectors only) | `readRows`, `waitForRows`, `ensureFreshRows` (allowed per service block) |
| Fact-events | `ACTION_ERROR` reducer slice only (internal) | two cross-module fact-events on `_KDB.events`: `tableData:loadFinished`, `tableData:loadFailed` |
| Cognos touchpoints | none | `_KDB.cognosAPI.dataQuery.awaitForTableData`, `getDataQueryResult` |

### Rules that confirmed clean on the service path

- **`module-public-api.mdc` shared-service block** — the four-block split codified after the kdbControl litmustest works exactly as intended. No mixed shape. No `dispatch` on `_KDB.services.tableData`. No granular reads on `_KDB.api.*`. Service-internal writers are not exposed across module boundaries.
- **Q5 decision (named writer helpers, no internal reducer)** — produced five tiny modules that each mutate one slice of `_KDB.state.tableData[tableName]`. State ownership is preserved without dispatch ceremony. Trade-off documented below in Section 4.
- **`runtime.mdc` for a service** — `_KDB.runtime.tableData.pendingLoads` / `listeners` / `subscriptions` initialized in `__orchestratorTableData.js`, cleaned in `destroy`. The runtime bucket is per-service (not per-table), which fits the named-method service pattern.
- **`events.mdc` for a service emitter** — only documented fact-events are emitted (`loadFinished`, `loadFailed`). No emission on intermediate state (no `loadStarted`). The owner-canonical event-constants file (`tableData/events/eventNames.js`) was placed correctly without prompting — R2 from the kdbControl report worked.
- **`error-handling.mdc` for async methods** — async methods return `Promise.reject(err)` on synchronous catches and rethrow inside the async helper, so consumer `.catch()` chains work. `markTableFailed` distinguishes `AbortError` (`errorCode: "aborted"`) from generic failures (`loadFailed`).

### Rules not exercised by this litmustest either

- `dom.mdc` — service has no DOM.
- Cross-module subscriber wiring of fact-events — the harness subscribes, but no second module reacts. See R12 below.

---

## 3. Empirical validation of R5 and R6

This is the most important framework-level result of the litmustest.

### R5 — per-file Rules to apply checklists

In the kdbControl litmustest, the execution spec had no per-file rule citations. Two deviations occurred (D1 missing try/catch, D2 incomplete destroy cleanup), both rule-clear but easy to skip.

In this litmustest, the execution spec (`tableDataService-port-execution-spec.md`) included a `Rules to apply:` checklist for every file, citing `error-handling.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc` and `amd.mdc` with one-line summaries.

**Empirical result:** zero deviations on first pass. Anti-D1 and anti-D2 both passed without iteration. The exact rules that were forgotten in kdbControl were applied without prompting in tableDataService.

### R6 — Pre-flight echo of rule summaries

The execution spec required the cheap AI to echo a one-sentence summary of each MUST rule before producing any file (Section A). The cheap AI's report stated Section A was completed and Section L was filled. The output (faithful application of `error-handling.mdc`, `runtime.mdc`, `events.mdc`, `module-public-api.mdc`, `amd.mdc` in every relevant file) is behaviorally consistent with having read the rules — but the rule-read itself cannot be verified from this side of the wire. R6 has an unobservable failure mode (silent echo without true read) which remains a residual risk.

### Bonus signal — the cheap AI corrected the execution spec on `amd.mdc`

The execution spec's first draft of `reloadTable` suggested an inline async-IIFE for fire-and-forget loading. The cheap AI refused this pattern and lifted the work into a factory-scope helper `runReloadTableLoadWork(_KDB, tableName, signal)`. This is the **stricter and correct** reading of `amd.mdc`: no inline anonymous async functions inside the entry function body.

This is the inverse of the kdbControl D1/D2 pattern — there the cheap AI was less strict than the rules; here the cheap AI was more strict than the spec. Conclusion: the rule was internalized rather than mechanically applied. This is a positive signal for R5+R6.

---

## 4. New gaps and tensions surfaced

### G1 — Service post-destroy behavior is undefined

After `destroy()`, calling `reloadTable("pkz")` does not throw. The service silently calls `ensureTableEntry`, which re-creates `_KDB.state.tableData.pkz` with a fresh `initialState()`. From the consumer's perspective, a destroyed service appears to work again. This is consistent with `lifecycleVocabulary.md` (`disposed` says "the subtree should not be read after this point") in the sense that consumer responsibility is implied, but no rule **enforces** consumer responsibility.

Three options:

- **G1-A** — services must hold an internal `_isDisposed` flag; every public method returns `undefined` (reads) or rejected promise (async) after disposal. Codify in `module-public-api.mdc`.
- **G1-B** — services may revive on call; consumers are responsible for not calling. Codify in `lifecycleVocabulary.md` ("calls to a disposed service have undefined behavior").
- **G1-C** — leave silent. Discourage in code review; no rule. Status quo of this skeleton.

Recommendation: G1-A. It costs ~5 lines per service and makes the lifecycle a real contract, not a documentation convention.

### G2 — `amd.mdc` is silent on the factory-scope async-helper pattern

The cheap AI's `runReloadTableLoadWork` is the canonical way to do fire-and-forget work that needs `try / catch / finally` and runtime cleanup, while staying within the no-inline-subfunctions discipline. The shape is:

```js
async function runFooWork(_KDB, _args, signal) {
  try { /* effect + writer */ }
  catch (err) { /* writer + emit + rethrow */ }
  finally { /* delete pendingLoads[name]; delete listeners[name] */ }
}
function createFooService(_KDB) {
  function startFoo() {
    /* setup runtime entry */
    const p = runFooWork(_KDB, args, signal);
    _KDB.runtime.foo.pendingLoads[name] = p;
    return p;
  }
}
```

This pattern needs to be in `amd.mdc`'s Allowed examples block. Right now the rule forbids one shape (inline async IIFE) but does not show the replacement.

### G3 — Named writer helpers (Q5) scatter the state shape across five files

`Q5: named writer helpers, no internal reducer` works at this scale (5 writers, 1 state shape). It would not scale to 20 writers. The skeleton mitigates this by having every writer use `initialState()` as the fallback shape, so `state/initialState.js` is the single source of truth for shape. This is a discipline, not a rule. A future port with a 10+ writer service should reconsider whether a service-internal reducer becomes preferable, even though the public surface remains named methods.

Acceptable for tableDataService. Note for later.

### G4 — Two-file public-surface tension

A service has methods on `_KDB.services.tableData` and fact-events on `_KDB.events`. The events are part of the cross-module behavior but are not the surface (per `module-public-api.mdc`'s addition that "events are not a module surface"). A consumer therefore reads two pieces of documentation to understand how to integrate: the service's public methods and the event catalog. This is correct per the rules, but the contract template's Section 6 (Events) should explicitly say "the event catalog entry in `eventSubscribe.md` is the canonical wire description; this section is a summary." This avoids two contradictory truths drifting apart.

---

## 5. R1 and R4 — still cannot be decided

R1 (subsystem discipline in `feature-structure.mdc`) and R4 (Subsystems field in the contract template) were deferred from the kdbControl report on the basis that a second litmustest might inform the decision.

`tableDataService` has no subsystems — it is a flat service. Therefore R1 and R4 remain **unexercised** by this litmustest. They cannot be decided until a litmustest target with real subsystems runs. Candidates: `header` (title / subtitle / toolBar subsystems), `filters` (one subsystem per filter type), or a future `widgets` module.

Status: R1 and R4 stay deferred. No new evidence either way.

---

## 6. Cross-litmustest synthesis

| Item | After kdbControl | After tableDataService |
|---|---|---|
| Feature-module path validated | yes | unchanged |
| Service path validated | no | **yes** |
| Public-API four-block template | added based on findings | confirmed for both feature and service |
| Per-file Rules to apply (R5) | proposed | **empirically validated — zero D1/D2 recurrence** |
| Pre-flight rule echo (R6) | proposed | applied; not directly verifiable but behaviorally consistent |
| Event-name file location (R2) | rule patched | confirmed — cheap AI placed `events/eventNames.js` correctly |
| `amd.mdc` examples (R3) | rule patched | confirmed — cheap AI correctly resolved the inline-async-IIFE question by being stricter than the spec |
| Subsystem discipline (R1) | proposed | **still unexercised** |
| Contract Subsystems field (R4) | proposed | **still unexercised** |
| `authoringMode` dashboard module (R7) | cataloged | unchanged |
| `controlDefinitions[]` (R8) | cataloged | unchanged |
| `hierarchyDataService` | — | **newly cataloged** (Q1 of this litmustest) |
| Service-disposed contract | not surfaced | **new gap G1** |
| Factory-scope async-helper pattern | not surfaced | **new gap G2** |
| Multi-writer state-shape risk | not surfaced | **new gap G3** (acceptable at this scale) |

---

## 7. Recommended follow-ups

R1, R2, R3, R5, R6, R7, R8 from the kdbControl report retain their status. New recommendations from this litmustest, in order of impact:

### R9 — Codify the factory-scope async-helper pattern in `amd.mdc`

Add an Allowed example block showing `runFooWork(_KDB, args, signal)` at factory scope, called from a named method on the returned service. This closes G2 and prevents the inline async-IIFE temptation in future ports.

### R10 — Decide service-disposed contract

Pick one of G1-A / G1-B / G1-C. Recommendation: G1-A (internal `_isDisposed` flag with guards) — small cost, real contract. Add to `module-public-api.mdc` shared-service block or to `lifecycleVocabulary.md` `disposed` clause.

### R11 — Promote R5 and R6 from "candidate patches" to "canonical execution-spec discipline"

Two consecutive litmustests show R5+R6 produce zero-iteration first passes. They are no longer candidates; they are the workflow. Update `feature-structure.mdc`'s "Delegated Execution" subsection to require:

- Execution specs must include a Pre-flight Section A with rule summaries (R6).
- Every per-file specification must carry a `Rules to apply:` checklist (R5).

Without this, the next cheap-AI run risks D1/D2-class regressions.

### R12 — Next litmustest must exercise cross-module subscriber wiring

Neither kdbControl nor tableDataService wired a non-harness subscriber to a fact-event for behavior chaining. The state-subscriber rules in `state.mdc` and the subscription-cleanup path through `_KDB.runtime.<owner>.subscriptions` therefore remain unverified end-to-end. The next litmustest target should be a module that subscribes to `tableData:loadFinished` and reacts (for example, a minimal `widgetList` skeleton that re-renders on row update).

### R13 — Note multi-writer scaling risk (G3)

No rule patch. Mention in `state.mdc` as a sentence: "When a service uses named writer helpers instead of an internal reducer, all writers must read their shape fallback from a single `initialState()` module. If the writer count grows beyond a small set (≈5), reconsider whether a service-internal reducer becomes preferable."

---

## 8. Decision for the user

Choose one of:

- **A** — Adopt R9, R10 and R11 as rule / template patches before any further port work. Recommended if the next target is a third module type (e.g. a feature with subsystems, or a module with subscribers), since the patches close the gaps that the third litmustest would otherwise re-discover.
- **B** — Adopt only R11 (promote R5+R6 to canonical discipline). Defer R9 (async-helper example) and R10 (service-disposed contract) until a port actually needs them.
- **C** — Skip rule patches. Move directly to a third litmustest (preferably R12-shaped: a subscriber-wiring module). Recommended only if the patches would slow down rather than help.

R12 and R13 are guidance for the next litmustest, not rule patches.

R1 and R4 remain deferred — there is no new evidence on subsystem discipline.

R7, R8 and `hierarchyDataService` are catalog entries; no action required.

---

## 9. Pointers

- Module contract: `_____________KDB3API/contracts/tableDataService.md`
- Execution spec: `_____________KDB3API/contracts/tableDataService-port-execution-spec.md`
- Execution-spec template: `_____________KDB3API/contracts/_executionSpecTemplate.md`
- Skeleton: `TEST/tableDataService-port/tableData/`
- Harness: `TEST/tableDataService-port/harness/`
- Event catalog entries: `_____________KDB3API/architecture/eventSubscribe.md` (tableData section)
- Lifecycle subset declaration: `_____________KDB3API/.cursor/lifecycleVocabulary.md` (per-module subsets, tableData)
- Prior litmustest report: `_____________KDB3API/architecture/kdbControl-litmustest-report.md`
- Open design candidates: `_____________KDB3API/architecture/openDesignCandidates.md` (incl. `hierarchyDataService`)
