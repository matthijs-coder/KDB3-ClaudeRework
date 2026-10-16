# Files Explained

A short catalog of files and folders in the KDB3 project, intended for fast navigation by humans and AI. Each entry has one or two sentences; deep design lives in the rule files and architecture documents themselves, not here.

This file is referenced from `_____________KDB3API/architecture/projectStructureRules.md`. Add an entry when a new top-level folder, rule, architecture document or contract is introduced.

## `_____________KDB3API/`

Project root for the canonical 2026 redesign artifacts: rules, architecture documents and module contracts. Code lives elsewhere (under `KDB3/` and the legacy reference trees).

## `_____________KDB3API/.cursor/rules/`

The 10 MUST rules that govern all new KDB3 code:

| File | Purpose |
|---|---|
| `kdb-object.mdc` | Allowed top-level `_KDB.*` namespaces, ownership map, access discipline; option lists live under `_KDB.config.options`. |
| `state.mdc` | `_KDB.state` discipline, canonical writers, grey-ownership decision. |
| `runtime.mdc` | `_KDB.runtime.<owner>` per-owner technical resources and cleanup. |
| `naming.mdc` | Identifiers, files, folders, controllers, events, actions, English-only policy. |
| `module-public-api.mdc` | Single API surface, dispatch vs named methods, two-surfaces rule for features. |
| `events.mdc` | Event bus at `_KDB.events`, direct API vs request-events vs fact-events. |
| `feature-structure.mdc` | Module folder layout, orchestrator/controller roles, Module Contract First workflow. |
| `error-handling.mdc` | mandatory try/catch on named executables; reducer vs effect, error state, cross-module propagation. |
| `dom.mdc` | Selectors under `_KDB.elements.selectors.<module>`, live refs under `_KDB.runtime.<owner>.domRefs`, scoped queries, builder/placer/mutator. |
| `amd.mdc` | AMD module shape, full-compact form, no ES modules in production. |

## `_____________KDB3API/.cursor/lifecycleVocabulary.md`

Canonical lifecycle term list (`idle`, `loading`, `ready`, `error`, `disposed`, etc.). Source of truth for `lifecycle` field values across all modules. No synonyms without an entry here.

## `_____________KDB3API/architecture/`

Long-lived architecture documents that govern the project at a higher level than individual rules.

| File | Purpose |
|---|---|
| `projectStructureRules.md` | Authority document for project structure: folder layout, file size, orchestrator/controller, services vs APIs. The 10 MUST rules operationalise this. |
| `stateOwnership.md` | Authority document for state ownership: one canonical writer per subtree, the full ownership map referenced from `state.mdc`. |
| `migrationContext.md` | Historical context for the redesign: what was wrong with earlier KDB versions, why the new structure exists. |
| `openDesignCandidates.md` | Architectural ideas not yet adopted as canonical rules (e.g. `widgetBindingService`, `authoringMode` dashboard-level split, `controlDefinitions[]` data layer). Promotion requires an explicit decision and a module contract. |
| `eventSubscribe.md` | Canonical catalog of all events on `_KDB.events`. An event without a catalog entry is not considered published. |
| `kdbControl-litmustest-report.md` | Empirical outcome of the kdbControl litmustest (2026-05-12): which rules and template sections worked, where the executing AI deviated, recommended follow-ups R1–R8. |
| `tableDataService-litmustest-report.md` | Empirical outcome of the tableDataService litmustest (2026-05-12): validation of the shared-service path (named methods on `_KDB.services.tableData`), empirical confirmation of R5+R6, new gaps G1–G4 and follow-ups R9–R13. |
| `midtierHandoffTemplate.md` | Generic standing-instruction template for a mid-tier AI orchestrating **exploratory** port work via TEST sandbox + browser harness: five-phase workflow per module-port, contract-first gate, CP-1 + CP-2 (browser-level), forbidden actions, escalation triggers, session-task wrapper slot. |
| `midtierDirectPortTemplate.md` | Generic standing-instruction template for a mid-tier AI orchestrating **direct ports** of legacy-known-good code straight into the production tree, without TEST sandbox or browser harness: four-phase workflow (contract → execution spec → cheap-AI exec → review + integration check), CP-2 = diff-walk + bootstrap import check. Forbids behavioral changes beyond rule-alignment. |
| `filesExplained.md` | This file. Short catalog of files and folders. |
| `jsModuleMap.md` | Living JS on-ramp: module → folder → `_KDB.api` / `_KDB.services` → one sentence. **The JS-on-ramp is `jsModuleMap.md`.** Source: live `KDB3/js/KDB.js`, not `contracts/`. |
| `readability-maintainability.md` | 2026-08-16 captain proposal: human readability, folder uniformity, naming, overdesign, and on-ramp indexes for `KDB3/js`. Complementary to `structure-audit-2.md` (Cognos/size/leaks). No code changes. |

## `_____________KDB3API/contracts/`

Module contracts produced under the Module Contract First workflow per `feature-structure.mdc`. One file per module:

- `_template.md` — the contract template; every new contract starts as a copy of this file.
- `_executionSpecTemplate.md` — execution-spec template for delegated execution; required when Phase 2 (skeleton or port) is handed to a less-capable executing AI. Carries pre-flight rule-read enforcement and per-file `Rules to apply` checklists.
- `<moduleName>.md` — one contract per planned module / service / adapter / subsystem.
- `<moduleName>-<phase>-execution-spec.md` — execution spec for a specific phase, derived from `_executionSpecTemplate.md`.

A contract precedes implementation. Bugfixes that do not change public API, ownership, state shape or events do not require a contract update.

## `KDB3/`

The production code tree. AMD modules per `amd.mdc`. New code follows the 10 MUST rules; legacy code is migrated module-by-module via the Module Contract First workflow.

**JS-on-ramp = `architecture/jsModuleMap.md`.** Boot is `KDB3/js/KDB.js`. There is **no** `core/bootstrap/` folder.

Folders within `KDB3/js/` follow `feature-structure.mdc`. Three Cognos-related folders are **not** the same thing:

| Folder | Role |
|---|---|
| `core/cognosHost/` | Chrome selector catalog + miss-checks. Not an SDK ring. |
| `core/services/cognosHost/` | Ring-1 host adapter (`_KDB.services.cognosHost`). |
| `core/cognosAPI/` | Inner SDK encyclopedia (`_KDB.cognosAPI`). |

```txt
KDB3/js/
  KDB.js
  core/
    cognosHost/
    services/
      cognosHost/
    cognosAPI/
    authoring/
    events/
    utils/
  dashboard/
    <feature-module>/
      config/
      state/
      view/
      effects/
      adapters/
      events/
      create<Module>Controller.js
      __orchestrator<Module>.js
```

Feature `adapters/` is optional (today: tabs wrapping a cognosHost facet) and is not required for Cognos isolation. The living module list is `jsModuleMap.md`, not this sketch.

## `_______REDESIGN2/`, `_______LAATSTEORIGINAL/`, `_______KDB3/`

Legacy reference trees for older redesign attempts and the original code base. Treated as reference, not as a blueprint per `migrationContext.md`. Ports always go through the Module Contract First flow; legacy code is rewritten against the new rules, not copy-pasted.

## Adding A New Entry

1. Add a one- or two-sentence entry in the appropriate section.
2. Place new top-level folders under their natural parent (`.cursor/`, `architecture/`, `contracts/`, `KDB3/`).
3. If the new file is a rule referenced by other rules, also update `filesExplained.md` so the cross-reference resolves.

Keep entries short. Detailed design lives in the file itself, not here.

See also: `_____________KDB3API/architecture/projectStructureRules.md`, `stateOwnership.md`, `jsModuleMap.md`.
