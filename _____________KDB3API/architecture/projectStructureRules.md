# Project Structure Rules

Practical project rules derived from `stateOwnership.md`.

These rules are written for humans and AI agents. They should be short enough to scan, but explicit enough to prevent wrong interpretation.

## Rationale Style

Each rule may include one short `Why:` line.

Rule:

```text
Use short rationale when misinterpretation is likely.
```

Why:

```text
One sentence of rationale costs few tokens and prevents expensive wrong edits.
```

Avoid long explanations in rule files. Put deeper design discussion in architecture docs, not operational `.mdc` rules.

## Priority

`stateOwnership.md` is the highest-value rule for state, runtime, module APIs, services and cross-module ownership.

If another rule conflicts with `stateOwnership.md`, update the other rule or ask the user before implementing.

Why: state ownership errors create hidden coupling and are harder to fix than naming or formatting errors.

## `_KDB` Namespaces

Allowed top-level namespaces should include:

```js
_KDB.state
_KDB.runtime
_KDB.services
_KDB.api
_KDB.events
_KDB.config
_KDB.properties
_KDB.elements
_KDB.utils
_KDB.cognosAPI
_KDB.data
```

Dropdown and option lists are declarative config and belong under `_KDB.config.options`. `_KDB.dropdownOptions` is a deprecated legacy namespace and is forbidden for new production code.

Rule:

```text
Do not introduce a new top-level `_KDB.*` namespace without user approval.
```

Why: predictable namespaces reduce search space for humans and AI.

## State vs Runtime

Rule:

```text
`_KDB.state` stores serializable dashboard/session state only.
```

Allowed in `_KDB.state`:

- selected ids and values;
- confirmed settings;
- active tab or active UI region;
- load status;
- persisted dashboard UI state;
- service-owned serializable state such as table data status.

Not allowed in `_KDB.state`:

- DOM nodes;
- jQuery objects;
- listeners;
- subscription handles;
- AbortControllers;
- timers;
- observers;
- Promise objects;
- Cognos API objects;
- adapter instances;
- functions;
- temporary hover, mouse or drag implementation details.

Use `_KDB.runtime` for technical runtime objects.

Why: `_KDB.state` should remain inspectable, serializable and safe to restore.

## Runtime Ownership

Rule:

```text
Runtime objects live under `_KDB.runtime.<owner>`.
```

Examples:

```js
_KDB.runtime.kdbControl.placedShell
_KDB.runtime.kdbControl.listeners
_KDB.runtime.kdbControl.subscriptions
_KDB.runtime.widgets[widgetId].listeners
_KDB.runtime.header.abortControllers
```

Why: listener and DOM cleanup belongs to the module that owns the lifecycle.

## State Ownership

Rule:

```text
Every `_KDB.state` subtree has exactly one canonical writer.
```

Examples:

| State subtree | Canonical owner |
|---|---|
| `_KDB.state.kdbControl` | kdbControl module |
| `_KDB.state.widgets` | widgets module |
| `_KDB.state.filters` | family container — nested writers in `stateOwnership.md` Filter sub-owners |
| `_KDB.state.launchpad` | launchpad module |
| `_KDB.state.tabs` | tabs module |
| `_KDB.state.header` | header module |
| `_KDB.state.footer` | footer module |
| `_KDB.state.tableData` | tableDataService |
| `_KDB.state.history` | historyService |

Why: two writers for the same subtree cause race conditions and unclear restore semantics.

## Public Writes

Rule:

```text
Modules do not write another module's `_KDB.state` subtree directly.
```

Use one of:

- owner public API;
- owner dispatch/action;
- request event;
- explicit owner setter.

Bad (foreign state write):

```js
_KDB.state.launchpad.items.push(widget);
```

Bad (named command on a dispatch-style API):

```js
_KDB.api.launchpad.sendWidget(widgetId);
```

Good (dispatch-style feature module API per `module-public-api.mdc`):

```js
_KDB.api.launchpad.dispatch({ type: "launchpad/sendWidget", payload: { widgetId } });
```

Good (named-method service):

```js
_KDB.services.tableData.reloadTable("pkz");
```

Why: direct writes bypass invariants, effects and sync logic; mixed-shape public APIs blur the dispatch-vs-named-methods decision documented in `module-public-api.mdc`.

## Reading State

Rule:

```text
Read foreign state through readers, selectors or public APIs.
```

Examples:

```js
readKdbControlState(_KDB)
readSelectedWidgetId(_KDB)
readWidgetState(_KDB, widgetId)
_KDB.api.tabs.readActiveTabId()
_KDB.services.tableData.readRows(tableName)
```

Why: readers allow internal state shape to change without breaking consumers.

## Module vs Service vs Util

Rule:

```text
A module lives under `dashboard/` and publishes `_KDB.api.<module>`. A service lives under `core/services/` and publishes `_KDB.services.<service>`. A util lives under `core/utils/` and is pure; if it has runIds, snapshots or cancellation it is not a util.
```

Search `config/actions.js` or `config/actionTypes.js` before the module contract — that file is the TOC. Rook: `core/utils/filters/tabMutationRun/` is saga machinery and is **not** published on `_KDB.utils`.

Why: the three buckets stop agents from hiding orchestration in utils or inventing a second public surface.

## Services vs Module APIs

Rule:

```text
`_KDB.services` contains shared capabilities; `_KDB.api` contains feature module public APIs.
```

Use services for:

- table data;
- history;
- Cognos adapters;
- logging;
- async wait/poll utilities.

The event bus is **not** a service: it lives at the top-level `_KDB.events` per `_____________KDB3API/.cursor/rules/kdb-object.mdc` and `events.mdc`. Older drafts that listed it under `_KDB.services.eventBus` are superseded.

Use module APIs for:

- kdbControl behavior;
- widgets behavior;
- launchpad behavior;
- filters behavior;
- tabs behavior;
- header/footer behavior.

Why: services should not become god objects that own feature behavior.

## Service Rule

Rule:

```text
A service may write only its own state subtree.
```

Examples:

```js
_KDB.services.tableData -> _KDB.state.tableData
_KDB.services.history -> _KDB.state.history
```

A service must not mutate:

```js
_KDB.state.widgets
_KDB.state.kdbControl
_KDB.state.launchpad
```

unless that subtree is explicitly owned by that service.

Why: services are infrastructure, not shortcuts around feature ownership.

## Module Public API

Rule:

```text
Externally used feature modules expose a small API under `_KDB.api.<module>`.
```

Example:

```js
_KDB.api.kdbControl = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState,
  registerControl: registerControl
};
```

Why: one public surface is easier to test, mock and document than many internal imports.

## Orchestrator vs Controller

Rule:

```text
The orchestrator wires startup; the controller owns the module public API.
```

`__orchestrator<Module>.js` may:

- create dependencies;
- call setup steps in order;
- register `_KDB.api.<module>`;
- register services when in `core/services`;
- return the public surface.

`__orchestrator<Module>.js` must not contain:

- business logic;
- DOM-heavy implementation;
- reducer logic;
- event listener bodies;
- callback bodies;
- long data transformations.

`create<Module>Controller.js` may:

- create public API methods;
- own `dispatch`;
- call reducers;
- call effects;
- call view sync;
- enforce module ownership.

Why: separating wiring from behavior keeps startup files short and predictable.

## Reducers and Effects

Rule:

```text
Reducers are pure; effects touch the outside world.
```

Reducers:

```text
state + action -> nextState
```

Reducers must not:

- touch DOM;
- call Cognos;
- emit events;
- write history;
- start timers;
- perform async work.

Effects may:

- call Cognos;
- publish events;
- commit history;
- apply DOM effects;
- start async work.

Why: pure reducers can be tested in isolation and are cheap for AI to reason about.

## Events

Rule:

```text
Events communicate facts or requests between owners.
```

Events do not transfer state ownership.

Subscribers may:

- write their own state subtree;
- call the owning module API;
- publish a follow-up event.

Subscribers must not directly mutate another owner's subtree.

Why: event-driven code stays decoupled only when ownership remains explicit.

## Dependency Injection

Rule:

```text
Dependencies are passed from orchestrators/controllers, not discovered from deep files.
```

Good:

```js
createKdbControlController({
  _KDB: _KDB,
  eventBus: _KDB.events,
  tableDataService: _KDB.services.tableData
});
```

Avoid in deep files:

```js
window._KDB.services.tableData
window.top.getKDB()
```

Why: explicit dependencies make modules easier to run in harnesses and tests.

## Folder Structure

Rule:

```text
Create folders around ownership and responsibility, not around vague utility categories.
```

Preferred module layout for larger modules:

```text
moduleName/
  config/
  state/
  view/
  effects/
  adapters/
  events/
  createModuleNameController.js
  __orchestratorModuleName.js
```

Only create folders that have real content. Optional folders `actions/`, `history/`, `runtime/` and `observation/` are allowed when they hold real content. Service-specific splits (writeback `get/`/`set/`, widgetBindingPlan pipeline) stay allowed. `adapters/` is not required for Cognos isolation; that is the service `core/services/cognosHost/`.

Why: predictable placement reduces file search and token usage.

## Folder Meanings

`config/`

Declarative definitions, constants, defaults, selectors and action names.

`state/`

Initial state, reducers, readers, selectors and owner write helpers.

`view/`

DOM builders, renderers, binders and view sync.

`effects/`

External effects such as Cognos calls, event publishing, history commits and DOM effects.

`adapters/`

Optional ring-2 wrap of a `_KDB.services.cognosHost` facet (today: tabs). Cognos SDK isolation is the service `core/services/cognosHost/`, not a per-module Cognos wrapper. The same folder name is grandfathered for non-SDK adapters (writeback `map/adapters/` JSON mapping, PDF DOM helpers, metricsTree dragDrop). `_KDB.runtime.<owner>.adapters` is a runtime bucket, not a folder mandate.

`events/`

Event constants, event payload helpers and subscribe/publish glue when needed.

Why: a reader should infer where code lives before searching.

## File Size

Rule:

```text
Keep files small and responsibility-focused.
```

Recommended limits:

| File type | Target | Hard limit without approval |
|---|---:|---:|
| JavaScript executable file | 80-120 lines | 150 lines |
| Orchestrator file | 40-80 lines | 120 lines |
| Controller function | 20-40 lines | 60 lines |
| Pure config file | 150-250 lines | split when hard to scan |
| Markdown rule file | concise | split when sections are unrelated |

Approved exception: `KDB3/js/KDB.js` may grow up to 500 lines for bootstrap wiring only: AMD imports, core factory calls, module orchestrator registration, module mount/destroy calls and allowed `_KDB` namespace initialization. Any non-wiring change to `KDB.js` still needs explicit user approval.

Why: small files reduce token cost and make responsibility easier to verify.

## Import Count

Rule:

```text
More than 6 imports is a smell; more than 10 imports requires restructuring.
```

Allowed exception:

```text
Thin orchestrators may approach the limit when they only coordinate clearly named steps.
```

Why: many imports usually mean the file owns too many responsibilities.

## Controller Shape

Rule:

```text
Every executable file has one clear top-level controller.
```

For normal executable files:

```js
function __controller(_KDB, _options) {}
```

For folder orchestrators:

```js
function __orchestrator(_KDB, _options) {}
```

The controller coordinates named helpers. It should not hide major logic in inline callbacks or nested functions.

Why: predictable entry points help humans and AI scan files quickly.

## AMD Boundary

Rule:

```text
Production `KDB3/js` files remain AMD modules unless the project explicitly migrates.
```

Harness files may use ES modules only when outside the production AMD tree.

Why: Cognos loads production code through RequireJS.

## Harnesses

Rule:

```text
Harnesses test modules outside Cognos while preserving real public contracts.
```

A harness may mock:

- `_KDB`;
- Cognos adapters;
- dashboard DOM;
- services;
- events;
- table data.

A harness should not invent a different UI when visual parity matters.

Why: harnesses are useful only if they test the same contract the production module uses.

## Architecture Docs

Rule:

```text
Architecture docs capture stable rules, catalogs and navigation help.
```

Use:

- `stateOwnership.md` for ownership principles;
- `projectStructureRules.md` for practical project rules;
- `filesExplained.md` for short file/folder catalog entries;
- `eventSubscribe.md` for event catalog entries.

Do not use `architecture/` for:

- backup files;
- source forks;
- temporary experiments;
- long copied source snippets.

Why: architecture docs should help navigation, not become another source tree.

## Completed Cursor Rule Updates

_Completed 2026-05-12._

These rule-updates have been carried out as part of the 2026 redesign. The 10 MUST rules in `_____________KDB3API/.cursor/rules/` now operationalise this architecture:

1. ✅ `rules/state.mdc` — "serializable dashboard/session state" wording; listeners/subscriptions live in `_KDB.runtime`.
2. ✅ `rules/kdb-object.mdc` — `_KDB.runtime` and `_KDB.api` added to allowed namespaces; full namespace ownership map.
3. ✅ `rules/dom.mdc` — listener handles and AbortControllers under `_KDB.runtime.<owner>`; selectors under `_KDB.elements.selectors.<module>`.
4. ✅ `rules/events.mdc` — event bus at `_KDB.events`; subscription handles under `_KDB.runtime.<owner>.subscriptions`.
5. ✅ Foreign state reads — selectors / readers / public APIs per `state.mdc` and `module-public-api.mdc`.
6. ✅ `rules/module-public-api.mdc` — `_KDB.api.<module>` contracts; dispatch vs named methods; two-surfaces rule.
7. ✅ `rules/feature-structure.mdc` — file-size and orchestrator/controller rules aligned with controller/public API ownership; Module Contract First workflow.

The full MUST set is `kdb-object`, `state`, `runtime`, `naming`, `module-public-api`, `events`, `feature-structure`, `error-handling`, `dom`, `amd`. See `_____________KDB3API/architecture/filesExplained.md`.

These rules are the canonical source for new code. Older guidance that conflicts with them is superseded.

## Summary

The project should optimize for:

- explicit ownership;
- small files;
- predictable folder placement;
- narrow public APIs;
- serializable state;
- isolated runtime objects;
- thin orchestrators;
- testable controllers;
- harness-friendly dependency injection.

These constraints reduce hidden coupling and lower token usage for future AI work.
