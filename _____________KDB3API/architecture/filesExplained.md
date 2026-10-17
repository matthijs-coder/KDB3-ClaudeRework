# Files Explained

A short catalog of files and folders in the KDB3 project, intended for fast navigation by humans and AI. Each entry has one or two sentences; deep design lives in the rule files and architecture documents themselves, not here.

This file is referenced from `_____________KDB3API/architecture/projectStructureRules.md`. Add an entry when a new top-level folder, rule, architecture document or contract is introduced.

## `_____________KDB3API/`

Project root for the canonical 2026 redesign artifacts: rules, architecture documents and module contracts. Code lives elsewhere (under `KDB3/` and the legacy reference trees).

## `_____________KDB3API/.cursor/rules/`

The rules for all KDB3 code. `core.mdc` is always applied; the topic rules load for matching files or on request:

| File | Purpose |
|---|---|
| `core.mdc` | Always applied. Frozen external contract, layers, namespaces, ownership, Cognos rings, API shapes, events, file size, change workflow. |
| `state.mdc` | `_KDB` namespaces, `_KDB.state` discipline, canonical writers, unclear-ownership decisions. |
| `runtime.mdc` | `_KDB.runtime.<owner>` per-owner technical resources and cleanup. |
| `naming.mdc` | Identifiers, files, folders, events, actions, error codes; English with German domain nouns. |
| `module-public-api.mdc` | Single API surface, dispatch vs named methods, disposed guard, tableData read contract. |
| `events.mdc` | Event bus at `_KDB.events`, direct API vs request-events vs fact-events. |
| `feature-structure.mdc` | Module template, `index.js` skeleton, old-to-new file mapping, Phase 1 path-preserving shims. |
| `error-handling.mdc` | try/catch only at boundaries, no log-and-rethrow, error codes, result objects. |
| `dom.mdc` | Selectors under `_KDB.elements.selectors.<module>`, live refs under `_KDB.runtime.<owner>.domRefs`, scoped queries, builder/placer/mutator. |
| `cognos-adapter.mdc` | The three Cognos rings, facet stamps, Outcome objects. |
| `amd.mdc` | AMD module shape, no ES modules in production. |

## `_____________KDB3API/.cursor/lifecycleVocabulary.md`

Canonical lifecycle term list (`idle`, `loading`, `ready`, `error`, `disposed`, etc.). Source of truth for `lifecycle` field values across all modules. No synonyms without an entry here.

## `_____________KDB3API/architecture/`

Long-lived architecture documents that govern the project at a higher level than individual rules.

| File | Purpose |
|---|---|
| `projectStructureRules.md` | Authority document for project structure: folder layout, file size, orchestrator/controller, services vs APIs. The rules in `.cursor/rules/` operationalise this. |
| `stateOwnership.md` | Authority document for state ownership: one canonical writer per subtree, the full ownership map referenced from `state.mdc`. |
| `eventSubscribe.md` | Canonical catalog of all events on `_KDB.events`. An event without a catalog entry is not considered published. |
| `jsModuleMap.md` | Living JS on-ramp: module → folder → `_KDB.api` / `_KDB.services` → one sentence. **The JS-on-ramp is `jsModuleMap.md`.** Source: live `KDB3/js/KDB.js`, not `contracts/`. |
| `conventions.md` | Practical conventions beyond the rules: event timing and memoization, CSS file conventions, where labels live. |
| `filesExplained.md` | This file. Short catalog of files and folders. |
| `_archive/` | Historical only: design reviews, port reports, legacy surveys, structure audits, hand-off templates, litmus-test reports, and the pre-redesign rules (`cursor-rules-old/`). Do not implement against it. |

## `_____________KDB3API/contracts/`

Reference contracts: one living contract per module, listed in `contracts/README.md`; finished work orders and deltas are in `contracts/_archive/`. The contract-per-change workflow (contracts and execution specs before implementation) is retired. Refactors and bug fixes need no contract or execution spec; changes to the frozen external contract need a short written note in the PR and explicit review (`core.mdc`).

## `KDB3/`

The production code tree. AMD modules per `amd.mdc`. All code follows the rules in `.cursor/rules/`; modules are refactored to the module template one at a time.

**JS-on-ramp = `architecture/jsModuleMap.md`.** Boot is `KDB3/js/KDB.js` plus the composition root `KDB3/js/bootstrap/` (`featureManifest.js`, `registerServices.js`); `core/bootstrap/` holds the manifest-agnostic lifecycle code.

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
      index.js
      state.js
      selectors.js
      view.js
      effects.js
      config.js
      __orchestrator<Module>.js   one-line shim to index.js until Phase 2
```

This is the target module template (`feature-structure.mdc`); many modules still use the older `config/ state/ view/ effects/ adapters/ events/` folders plus `create<Module>Controller.js` until they are refactored. The living module list is `jsModuleMap.md`, not this sketch.

## `_______REDESIGN2/`, `_______LAATSTEORIGINAL/`, `_______KDB3/`

Legacy reference trees for older redesign attempts and the original code base. Treated as reference, not as a blueprint (see `_archive/migrationContext.md`). Legacy code is rewritten against the current rules, not copy-pasted.

## Adding A New Entry

1. Add a one- or two-sentence entry in the appropriate section.
2. Place new top-level folders under their natural parent (`.cursor/`, `architecture/`, `contracts/`, `KDB3/`).
3. If the new file is a rule referenced by other rules, also update `filesExplained.md` so the cross-reference resolves.

Keep entries short. Detailed design lives in the file itself, not here.

See also: `_____________KDB3API/architecture/projectStructureRules.md`, `stateOwnership.md`, `jsModuleMap.md`.
