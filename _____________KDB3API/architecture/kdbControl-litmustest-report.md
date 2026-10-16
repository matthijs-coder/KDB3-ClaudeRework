# kdbControl litmustest report

_Litmustest of the 10 MUST-rules and the Module-Contract-First workflow, executed 2026-05-12 by porting a skeleton of `kdbControl` into `TEST/kdbControl-port/`._

This report documents what worked, what did not, and what the rule set and templates still need. It is the empirical outcome document for the architectural foundation laid down in `_____________KDB3API/.cursor/rules/*.mdc`, `_____________KDB3API/contracts/_template.md`, `_____________KDB3API/architecture/projectStructureRules.md`, and `_____________KDB3API/architecture/stateOwnership.md`.

---

## 1. Outcome

| Aspect | Result |
|---|---|
| Module contract authored from template | Pass — all 11 sections filled with concrete content; open questions Q1–Q4 surfaced before implementation. |
| Skeleton folder layout matches contract | Pass — see `TEST/kdbControl-port/kdbControl/`. |
| AMD shape | Pass — full-compact `define([...], function (...) { ... })`, named factory-scope entry functions, no inline subfunctions inside entry/callback/return flow. |
| State ownership / runtime initialization | Pass — `_KDB.state.kdbControl` written only via reducer; `_KDB.runtime.kdbControl` initialized in `mount`, cleared in `destroy`. |
| Public API surface discipline | Pass — single dispatch-style surface, no granular `read*` methods on `_KDB.api.kdbControl`, `getState()` as coarse snapshot. |
| Lifecycle boundaries (try/catch) | Initial fail (D1) → fixed after one iteration. |
| Runtime cleanup on destroy | Initial fail (D2) → fixed after one iteration. |
| Harness CP2 (browser load + lifecycle log) | Pass — `[lifecycle] mounted` and `[lifecycle] disposed` logged without console errors. |

**Net result:** the framework is workable for a less capable AI under supervision. Two real deviations occurred, both correctable within one iteration. No rule was broken in a way that the cheap AI could not fix once shown the rule.

---

## 2. Contract template clarity

### Sections that were mechanical to fill

- **Section 1 (Purpose)** — one paragraph derived from the legacy survey.
- **Section 2 (Ownership)** — list of owned subtrees, foreign-write-paths line.
- **Section 3 (Runtime)** — bucket table matching `runtime.mdc`.
- **Section 7 (Dependencies)** — pure catalog.
- **Section 8 (Cognos touchpoints)** — pure catalog under `_KDB.cognosAPI.<theme>`.
- **Section 9 (Folder layout)** — once Q1/Q3/Q4 were answered, the tree fell out automatically.
- **Section 10 (Out of scope)** — explicit boundary list; protected the skeleton from feature creep.

### Sections that required architectural judgment

- **Section 4 (Public API style)** — choosing dispatch+reducer vs named methods needed an explicit "hard trigger" justification. Without `module-public-api.mdc`'s hard-trigger table the choice would have been arbitrary.
- **Section 5 (Readers / writers)** — splitting "published selectors" from "internal writers" only works once the consumer knows the difference. The four-block template added in the iteration cycle (feature / service / adapter / thin host wrapper) was essential.
- **Section 11 (Open questions)** — proved to be the single most valuable section. Q1–Q4 forced architectural choices into the user's hands before any code was generated. Without it, the cheap AI would have invented answers silently.

### Friction points

- The template's `Type:` enum (feature module | shared service | adapter | thin host wrapper | subsystem) is correctly enumerated, but **the template gives no guidance on representing a feature module that contains multiple subsystems** (kdbControl has four: `framework`, `toolbox`, `settings`, `authoringMode`). The folder layout fell out of the contract, but the contract has no field to declare subsystems as first-class. See Section 4 of this report for the recommended template patch.

---

## 3. Rule clarity

### Rules that worked exactly as intended

- `kdb-object.mdc` — top-level namespaces were unambiguous; cheap AI placed `_KDB.api.kdbControl`, `_KDB.runtime.kdbControl`, and `_KDB.state.kdbControl` correctly without prompting.
- `state.mdc` — canonical writer for `_KDB.state.kdbControl` lives only in the reducer; cheap AI did not write the subtree from any other location.
- `module-public-api.mdc` — single dispatch-style API surface; no mixed shape; `getState()` used as snapshot exception; no granular reads exposed.
- `naming.mdc` — underscore prefix correctly limited to AMD imports and boundary parameters; no underscore noise on inline callbacks (none exist by design).
- `amd.mdc` — full-compact `define([...], function (...) { ... })` shape applied consistently; named entry functions at AMD factory scope (cheap AI initially flagged this as a possible violation in its own self-review, which is itself evidence that the "no inline subfunctions" wording could be clearer — see Section 4).

### Rules that surfaced as under-specified

- **`feature-structure.mdc` — no explicit guidance on subsystem discipline.** A feature module with 2–5 subsystems is a real and recurring pattern (kdbControl, likely future widgets). The rule should describe a canonical subsystem folder pattern, its `__orchestrator<Subsystem>.js` filename, and the relationship between the module orchestrator and subsystem orchestrators.
- **`events.mdc` — file location for event-name constants is implicit.** The cheap AI invented `events/eventNames.js`. The rule mentions a catalog (`eventSubscribe.md`) but not a per-module constants file. Either the file location should be canonical or the rule should say "any single owner-controlled location is acceptable".
- **`amd.mdc` — "no inline or nested subfunction definitions" wording was misread by the cheap AI in its self-audit.** The cheap AI thought factory-scope named entry functions might be a violation. The wording is correct; the cheap AI was confused. Either an example marked "this is allowed" should be added or the rule's negative wording should be tightened ("no anonymous function expressions inside the entry function body, callbacks or return path").

### Rules that proved easy to forget

- **`error-handling.mdc` — mandatory try/catch on named executables; lifecycle boundaries convert errors.** First-pass skeleton omitted try/catch in `mount` and `destroy`. The rule is clear; the execution spec did not repeat it; the cheap AI did not cross-reference. (See deviation D1 below.)
- **`runtime.mdc` — required cleanup of `subscriptions` and `listeners` on destroy.** First-pass skeleton zeroed `_KDB.runtime.kdbControl` without unsubscribing or aborting. (See deviation D2 below.) Same pattern as D1.

Both were rule-clear-but-easy-to-skip. Conclusion: rule clarity is not enough; the execution spec must repeat the relevant rule fragments per file.

### Rules not exercised by this litmustest

- `dom.mdc` — no DOM building in the skeleton; selectors namespace and Builder/Placer/Mutator pattern are untested here.
- The whole subscriber-discipline section of `state.mdc` was untouched (no cross-module subscribers wired in the skeleton).

---

## 4. Cheap-AI behavior

### Deviation D1 — missing mandatory try/catch on named executable/subscriber/async

**Where:** `TEST/kdbControl-port/kdbControl/createKdbControlController.js`, `mount` and `destroy` bodies (first pass).
**Root cause:** the execution spec specified the AMD shape and lifecycle transitions but did not restate `error-handling.mdc`'s requirement.
**Fix:** dispatched `ACTION_ERROR` on catch with `errorCode` + `errorMessage`; `console.error("[kdbControl.<phase>]", err)`; no foreign-state writes. Verified in iteration 2.

### Deviation D2 — destroy did not unsubscribe / abort before clearing runtime

**Where:** same file, `destroy` body (first pass).
**Root cause:** the execution spec said to clear runtime but did not enumerate cleanup steps.
**Fix:** destroy now iterates `_KDB.runtime.kdbControl.subscriptions` and calls each as an unsubscribe function; iterates `_KDB.runtime.kdbControl.listeners` and calls `.abort()` on each `AbortController`; then sets runtime to `null`. Verified in iteration 2.

### Self-audit limitations

The cheap AI explicitly reported that it could not perform a full MUST-rule audit because it did not read the `.mdc` rule files, **despite the execution spec's Section A instructing it to do so first**. This is the most important behavioural observation of the litmustest: an explicit "read these rule files first" instruction is **not sufficient** to guarantee the cheap AI reads them.

### Things the cheap AI did well

- Followed the prescribed folder layout exactly.
- Used the four-block public-API template correctly (feature-module block).
- Kept files small (5–50 lines each).
- Did not invent behavior beyond stubs.
- Did not touch forbidden trees (`TEST/dashboard/`, `_______KDB3/`, `_______REDESIGN2/`, `_______LAATSTEORIGINAL/`).
- Did not modify rules, template, contract, or write CSS/tests/README.
- Iterated cleanly on D1/D2 once shown the rule citations.

---

## 5. Recommended follow-ups

Listed in order of impact. Each is a separate decision the user can take or defer.

### R1 — Add subsystem discipline to `feature-structure.mdc`

Document that a feature module may contain `2–5 subsystems`, each as a sibling folder under the module (`framework/`, `toolbox/`, …). Each subsystem has a `__orchestrator<Subsystem>.js` and is wired from the module orchestrator. Subsystem state lives at `_KDB.state.<module>.<subsystem>`. Subsystems do not publish their own public surfaces; their behavior is exposed only through the module's public API.

### R2 — Canonicalise event-name constants location

Either prescribe `<module>/events/eventNames.js` (preferred — already in the skeleton and consistent with `_KDB.events`) in `feature-structure.mdc` or `events.mdc`, or explicitly state that the location is owner's choice. Avoid leaving it implicit.

### R3 — Strengthen `amd.mdc` example block

Add an explicit "Allowed" example showing a named entry function at factory scope, so the negative rule "no inline subfunction definitions inside the entry function" cannot be misread.

### R4 — Module-Contract-First template: add subsystem field

Add a top-of-document field `Subsystems: <comma-separated list or "none">` and reference it from Section 9 (Folder layout). For modules with subsystems, Section 9 should mirror the subsystem list one-to-one.

### R5 — Execution-spec template addition: per-file rule checklist

The biggest single fix for the litmustest. Every file in the execution spec should have a `Rules to apply:` line citing the relevant rules with one-line summaries. Example for `createKdbControlController.js`:
- `error-handling.mdc` — wrap `mount` and `destroy` in try/catch; on catch dispatch `ACTION_ERROR` with `errorCode`+`errorMessage`; log with `console.error`.
- `runtime.mdc` — initialize runtime sub-buckets in `mount`; in `destroy` unsubscribe `subscriptions`, abort `listeners.<AbortController>`, then null runtime.
- `module-public-api.mdc` — single dispatch surface; methods: `mount, destroy, dispatch, getState`.

This would have prevented D1 and D2 on first pass.

### R6 — Pre-flight rule-read enforcement

Section A of an execution spec should require the cheap AI to **echo back a one-sentence summary of each rule** before producing any file. If the cheap AI cannot summarise the rule, it has not read it, and execution should not proceed.

### R7 — `authoringMode` split candidate

Per Q3 decision: `authoringMode` stays a kdbControl subsystem for now but is a candidate for a dashboard-level module in a later iteration (authoring affects header, footer, widgets, filters — not just kdbControl). Add to `_____________KDB3API/architecture/openDesignCandidates.md`.

### R8 — `controlDefinitions[]` revisit trigger

Per Q1 decision: deferred until Phase 4. Add to `_____________KDB3API/architecture/openDesignCandidates.md` with the trigger "first real settings builder that needs a serialisable data source".

---

## 6. Decision for the user

Choose one of:

- **A** — Adopt R1–R6 as rule / template patches before any further port work. Recommended if the next litmustest target is a different module type (e.g. `tableDataService` as shared service); patches will pay off across multiple ports.
- **B** — Skip rule patches; proceed directly to Phase 4 (full behavior port of `kdbControl`). Recommended only if Phase 4 is small enough that the patches would slow down rather than help.
- **C** — Hybrid: adopt R5 (per-file rule checklist) and R6 (echo-back pre-flight) immediately, defer R1–R4 to after a second litmustest on a different module type. Recommended baseline.

R7 and R8 are catalog updates (no rule changes); they can be done at any time independently of A/B/C.

---

## 7. Pointers

- Module contract: `_____________KDB3API/contracts/kdbControl.md`
- Execution spec: `_____________KDB3API/contracts/kdbControl-port-execution-spec.md`
- Skeleton: `TEST/kdbControl-port/kdbControl/`
- Harness: `TEST/kdbControl-port/harness/`
- Event catalog entries: `_____________KDB3API/architecture/eventSubscribe.md` (kdbControl section)
- Lifecycle subset declaration: `_____________KDB3API/.cursor/lifecycleVocabulary.md` (per-module subsets, kdbControl)
- Plan that produced this litmustest: `c:\Users\vastenburg\.cursor\plans\kdbcontrol_litmustest_plan_d9feb817.plan.md`
