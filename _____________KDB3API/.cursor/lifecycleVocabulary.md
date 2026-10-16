# Lifecycle Vocabulary

Canonical lifecycle status terms for `_KDB.state.*` subtrees. Every module or service that stores a `lifecycle` field uses a value from this vocabulary; new terms are added here first, then used.

This file is referenced from `_____________KDB3API/.cursor/rules/state.mdc`, `naming.mdc` and `error-handling.mdc`. It is the single source of truth for lifecycle terms; synonyms are forbidden per `naming.mdc` ("No lifecycle terms outside the canonical vocabulary").

## Core Terms

| Term | Meaning |
|---|---|
| `idle` | Initial state. No operation has been started yet for this subtree or entity. |
| `initializing` | One-time setup is in progress (registering listeners, fetching configuration, building initial DOM). Used when the work between `idle` and the first `loading` is non-trivial. |
| `loading` | A data load, fetch, or async setup is in flight. Consumers may show a spinner; data fields may be empty or hold previous (stale) values. |
| `ready` | The owner has produced a usable state and confirmed it. Data fields are populated and safe to read. |
| `error` | The most recent operation failed. The subtree carries an `errorCode` / `errorMessage` payload per `error-handling.mdc`; older content may remain present and is then `stale` per the freshness dimension. |
| `disposed` | The owner has torn down the subtree. Runtime references under `_KDB.runtime.<owner>` have been cleaned up. The subtree should not be read after this point; the owner's public API guards against post-disposal calls per `module-public-api.mdc` ("Disposed-State Discipline"). |

## UI / View Terms

| Term | Meaning |
|---|---|
| `mounted` | The owner has attached its view to the live DOM and bound listeners. Equivalent to `ready` for UI modules whose `ready` state is "I am attached and interactive". |
| `destroying` | Teardown is in flight: listeners being removed, DOM being detached, runtime references being cleared. Briefly between `ready` / `mounted` and `disposed`. |

## History And Workflow Terms

| Term | Meaning |
|---|---|
| `pending` | A step is staged but not yet committed. Used by `historyService` and any workflow that distinguishes proposed from confirmed transitions. |
| `committed` | A step has been applied and is part of the canonical history. Replay assumes `committed` steps only. |

## Lifecycle Vs Freshness

`lifecycle` is one dimension. `freshness` is a separate, orthogonal dimension that describes how current the underlying data is. The two are stored as two fields, never as one hybrid term.

```js
// Good: two independent fields.
_KDB.state.tableData.pkz = {
  lifecycle: "ready",
  freshness: "stale",
  // ... rows from previous successful load ...
};
```

Allowed freshness values: `fresh`, `stale`. They are not lifecycle terms and do not appear in this vocabulary's tables.

Forbidden combinations such as `stale-error`, `partial-failure`, `loaded` (use `ready`), `deleted` (use `disposed` or `removed` via module API) are explicitly out of bounds. Synonyms enter the codebase only by adding them here first.

## Per-Module Subset Declaration

A module orchestrator that manages a lifecycle declares the subset of terms it actually uses in a header comment on the orchestrator file:

```js
// Lifecycle terms for tableDataService:
//   idle, loading, ready, error, disposed.
// freshness terms: fresh, stale (separate field).
```

The declared subset must be a subset of this vocabulary. Modules do not invent local terms outside the declared subset.

### kdbControl

Per `_____________KDB3API/contracts/kdbControl.md` Section 4 and the kdbControl orchestrator header comment: this module uses the lifecycle subset **`idle`**, **`mounted`**, **`ready`**, **`error`**, **`disposed`** for `_KDB.state.kdbControl` (and documents the same subset on the orchestrator file).

### tableDataService

Per `_____________KDB3API/contracts/tableDataService.md` Section 4 and the tableDataService orchestrator header comment: this service uses the lifecycle subset **`idle`**, **`loading`**, **`ready`**, **`error`**, **`disposed`** per table at `_KDB.state.tableData.<tableName>.lifecycle`. Freshness terms **`fresh`** and **`stale`** are stored as a separate `freshness` field on the same per-table record, never merged with the lifecycle field.

## Adding A New Term

A new lifecycle term is a structural change:

1. Propose the term, definition and motivation to the user.
2. Add it to the appropriate table in this file with a clear definition.
3. Update the orchestrator header comment of any module that uses it.
4. Update `state.mdc` and `error-handling.mdc` references if the new term changes the example tables there.

Synonyms (`loaded` ≈ `ready`, `deleted` ≈ `disposed`) are rejected; pick the canonical term.

## When AI Must Ask

The AI must explicitly ask the user when:

- a needed lifecycle term is not in this vocabulary and a synonym does not fit;
- a module's lifecycle behaviour overlaps two dimensions (lifecycle vs freshness, lifecycle vs validation state, etc.) and the model is unclear;
- a port introduces a legacy lifecycle-like field whose target term in this vocabulary is non-obvious.

Ask-template: *"For `<state subtree>` I propose lifecycle term `<X>` because `<reason>`. Acceptable, or should we use `<existing term>`?"*

See also: `_____________KDB3API/.cursor/rules/state.mdc`, `naming.mdc`, `error-handling.mdc`.
