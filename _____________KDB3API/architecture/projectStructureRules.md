# Project structure rules

The practical rules for how KDB3 code is organised, with a one-line reason for each. The operational versions for AI agents are in `.cursor/rules/` (start with `core.mdc`). State ownership details are in `stateOwnership.md`; the event catalog is `eventSubscribe.md`. If this file and a rule disagree, fix one of them; do not pick silently.

## `_KDB` namespaces

`state`, `runtime`, `services`, `api`, `events`, `config`, `properties`, `elements`, `utils`, `cognosAPI` (`data` is reserved). Option and dropdown lists live in `_KDB.config.options`. `_KDB.dropdownOptions`, `_KDB.utilities` and `_KDB.generalFunctions` are dead legacy names. A new top-level key needs review.

Why: a fixed set of namespaces tells a reader where to look.

## State and runtime

- `_KDB.state` holds JSON-serialisable dashboard-session state: selections, confirmed settings, active tab, presence status, load lifecycle, history.
- `_KDB.runtime.<owner>` holds technical resources: DOM refs, listeners, subscriptions, AbortControllers, timers, observers, pending promises, Cognos facet stamps. It is owner-private and never serialised.
- Every runtime resource has a cleanup path in `destroy`. Prefer one AbortController per scope and `{ signal }` on DOM listeners and bus subscriptions.

Why: state stays inspectable and restorable; cleanup belongs to whoever owns the lifecycle.

## Ownership

- Every `_KDB.state` subtree has exactly one canonical writer (see `stateOwnership.md`).
- Other modules read through the owner's selectors and request changes through `_KDB.api.<owner>.dispatch(...)` or a service method. Event subscribers and Cognos bridges follow the same rule.

```js
_KDB.state.launchpad.items.push(widget);                                                  // wrong: foreign write
_KDB.api.launchpad.dispatch({ type: "launchpad/sendWidget", payload: { widgetId: id } }); // right
var tabId = _tabsSelectors.readActiveTabId(_KDB);                                         // right: read via selector
```

Why: two writers for one subtree cause races and unclear restore behaviour.

## Layers

- `KDB.js`: bootstrap wiring only (register, mount, destroy order, root namespaces).
- `core/`: infrastructure. `core/services/<service>` publishes `_KDB.services.<service>` with named methods. `core/utils/` is pure helpers; `core/utils/kit/` is the shared helper kit (clone, isPlainObject, sleep, poll, runtime cleanup, coded errors), imported by AMD path.
- `dashboard/`: feature modules, each publishing `_KDB.api.<module>` as `{ mount, destroy, dispatch, getState, register*? }`.
- `core` never imports `dashboard`. The existing violations (writeback importing tabs, kdbControl, widgetSettings and singleSelect files) are scheduled to move in Phase 2.
- Cognos is reached only through three rings: `core/cognosAPI` (SDK), `core/services/cognosHost` (facets returning Outcome objects), `core/cognosHost` (DOM chrome selectors). Features use the facet stamped into their runtime.
- The rings stay separate (product-owner decision): the pure Cognos wrappers in `core/cognosAPI` remain isolated and usable on their own, for example from the console, so Cognos upgrades stay contained.

Why: dependencies point one way, and Cognos changes stay in one place.

## Module template

```txt
<module>/
  index.js        register + controller + mount/destroy
  state.js        action types + initial state + reducer
  selectors.js    the only file other modules import (plus events.js for event names)
  view.js         DOM build/place/sync
  effects.js      Cognos calls, events, history commits, async (or sub-domain files)
  config.js       constants, defaults, selector strings
  history.js, restore.js, tabMutation.js, events.js   optional
```

Small modules use fewer files. Large modules split by sub-domain (`binding.js`, `drillthrough.js`, or a `binding/` folder), at most 3 folder levels deep. New and refactored code does not use the `__controller` / `__orchestrator` entry names.

Registration: `bootstrap/featureManifest.js` calls `register(_KDB)` of every module (its `index.js`); `bootstrap/registerServices.js` does the same for the services. A file that a refactor moves or merges has its importers repointed in the same change (no path-preserving shims remain; Phase 2 W12 removed them). Find such imports with `node tools/check-imports.mjs --json` or grep.

Why: one predictable shape per module lets a reader find any concept without a map.

## Reducers and effects

Reducers are `state + action → nextState`: no DOM, Cognos, events, history, timers or async, and no try/catch. Effects do the outside-world work.

Why: pure reducers are easy to test and reason about.

## Events

Events carry facts (`tabs:changed`) or, rarely, requests (`header:toggleRequested`). They never transfer state ownership. Commands to a known owner are direct API calls.

Why: direct calls return values and keep stack traces; events are for genuine broadcast.

## File size

Split by cohesion, not by count. One concept per file.

| Code lines (blank lines and comments excluded) | Meaning |
|---|---|
| up to about 300 to 400 | normal |
| over 500 | check whether the file holds two concepts |
| over 800 | justify in a header comment |
| functions over about 60 | split into named steps |

No line packing (lines over 180 characters). No files that only forward to or wrap another file. No folder for fewer than about 4 files unless it is a named sub-domain. Measure with `node tools/line-report.mjs`.

Why: the old 150-line cap split single concepts across many tiny files and folders, which made the code harder to read, not easier.

## Error handling

try/catch only at boundaries: Cognos and extension hooks, public API entry points, DOM/timer/observer callbacks, async fire-and-forget. Internal code lets errors propagate. No log-and-rethrow; the boundary logs once and converts the error into state, a result object or a fact-event.

Why: one failure should produce one log line, at the place that can act on it.

## AMD

Production code under `KDB3/js` is AMD (`define([...], function (...) {...})`, relative `.js` paths, one module per file). Node tools live in `tools/` at the repo root and are ES modules.

Why: Cognos loads the extension through RequireJS.

## Checks and change workflow

- `node tools/check-all.mjs` (repo root) must pass before a PR: AMD paths, cycles, syntax, kit tests.
- Manual verification in Cognos follows `tools/smoke-checklist.md`.
- Refactors and bug fixes need no contract or execution spec.
- Changes to the frozen external contract (`spec.json`, extension entry points, saved parameter sets v2/v3, settings/storage formats, `_KDB.api.*` / `_KDB.services.*` names, event names) need a short written note in the PR and explicit review.

## Architecture docs

`architecture/` holds stable rules, catalogs and navigation help: this file, `stateOwnership.md`, `eventSubscribe.md`, `jsModuleMap.md`, `filesExplained.md`. No backups, source forks, experiments or long copied code.
