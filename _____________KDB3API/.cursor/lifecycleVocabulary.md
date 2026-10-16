# Lifecycle vocabulary

Allowed values for `lifecycle` fields in `_KDB.state.*`. Use only these; add a term here (with a definition) before using it. No synonyms (`loaded` → `ready`, `deleted` → `disposed`).

## Lifecycle terms

| Term | Meaning |
|---|---|
| `idle` | Nothing started yet. |
| `initializing` | One-time setup in progress (listeners, config, first DOM). |
| `loading` | A load or async setup is in flight; data may be empty or old. |
| `ready` | Usable state produced and confirmed. |
| `mounted` | UI attached to the DOM and interactive (UI modules may use it instead of `ready`). |
| `error` | The last operation failed; the subtree carries `errorCode` / `errorMessage` (see `rules/error-handling.mdc`). |
| `destroying` | Teardown in progress. |
| `disposed` | Torn down; runtime cleaned; the public API is guarded (see `rules/module-public-api.mdc`). |
| `pending` | History/workflow step staged, not yet committed. |
| `committed` | History/workflow step applied. |

Each owner lists the subset it uses in a header comment of its entry file, for example `// Lifecycle terms: idle, loading, ready, error, disposed.` (tableData) or `idle, initializing, ready, error, disposed` (`KDB.js` root lifecycle).

## Freshness (separate field)

`freshness` is `fresh` or `stale` and is stored next to `lifecycle`, never merged into it. A table can be `lifecycle: "ready"`, `freshness: "stale"`. Hybrid terms such as `stale-error` or `partial-failure` are not allowed.

## Status and placement values (not lifecycle)

Some fields describe presence, not lifecycle. Writeback, restore and history steps read them, so keep their values unchanged:

| Field | Values | Used by |
|---|---|---|
| `status` | `idle`, `active`, `removed` | header, footer |
| `subtitleStatus` | `active`, `removed` | header |
| `placement` | `onCanvas`, `inLaunchpad`, `removed` | widgetBase (state and history steps) |

Filter owners keep their own per-instance status values (for example singleSelect `removed`, dienststelle `inactive`); the owner module documents them next to its initial state. Do not store these values in a `lifecycle` field.
