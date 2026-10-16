# Execution Spec: `properties` (direct port)

> Direct-port execution spec for porting the legacy-known-good property loader and the approved `KDBHideWidgetsToggle` property-change listener into the production tree.
>
> This spec is for an executing AI. It is exhaustive on purpose: do not make architectural choices during execution.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/properties.md`
**Phase:** `direct port`
**Authoring AI:** GPT-5.5, 2026-05-16
**Executing AI:** `<pending>`
**Reviewer:** `<user / supervising AI>`

---

## Section A. Pre-flight read list

The executing AI must read each file below in order before producing any output file. The first response must echo a one-sentence summary of each item. If any summary is missing or generic, execution stops.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` - `_KDB` has a fixed top-level namespace map; `_KDB.properties` is for Cognos property-panel configuration, runtime objects stay elsewhere, and new top-level keys are forbidden.
2. `_____________KDB3API/.cursor/rules/state.mdc` - `_KDB.state` is only serializable dashboard/session state with one canonical writer per subtree; this tranche must not add `_KDB.state.properties`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` - technical resources such as host listener cleanup records live under `_KDB.runtime.<owner>` and every created resource must have cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` - modules expose one deliberate public surface; this bootstrap-local controller must not register `_KDB.api.properties` or `_KDB.services.properties`.
5. `_____________KDB3API/.cursor/rules/events.mdc` - events require catalog entries and are not used here; `properties:reloaded` and `properties:hideWidgetsToggled` are omitted/deferred.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` - contracts precede code, folders are responsibility-based, orchestrators stay thin, and file-size/import limits apply.
7. `_____________KDB3API/.cursor/rules/naming.mdc` - generated technical identifiers are English, AMD imports and boundary parameters use underscore prefixes, and entry names follow the canonical patterns.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` - mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` - no DOM work is in scope; do not introduce live DOM references or selector namespaces.
10. `_____________KDB3API/.cursor/rules/amd.mdc` - every production file is one explicit AMD `define([...], function (...) { ... })` module with factory-scope named helpers only.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` - lifecycle terms are canonical; this tranche does not add lifecycle state.
12. `_____________KDB3API/contracts/_template.md` - contracts define ownership, API, runtime, events, dependencies and out-of-scope boundaries before implementation.
13. `_____________KDB3API/contracts/properties.md` - CP-1 contract for the bootstrap-local `properties` module.
14. This execution spec.

---

## Section B. CP-1 choices fixed for this execution

- Target path: `_____________KDB3API/KDB3/js/core/properties/`.
- No `_KDB.services.properties` and no `_KDB.api.properties`.
- Write only `_KDB.properties`; no `_KDB.state.properties`.
- Store property-change listener cleanup under `_KDB.runtime.properties.subscriptions`.
- Do not reintroduce `_KDB.apiContent`.
- Omit/defer `properties:reloaded`.
- Include `_KDB.runtime.core.adapters.content.on("change:property:KDBHideWidgetsToggle", ...)`.
- Bootstrap registration in `KDB.js` is required later but out of scope here.
- Use `__orchestratorProperties.js`.
- Preserve legacy per-property fallback semantics.
- For `KDBHideWidgetsToggle`, do not emit `properties:hideWidgetsToggled`.
- Known owner for this tranche is `launchpad`; current production has no `_KDB.api.launchpad`, so direct owner integration is deferred and must be logged as such.
- Bootstrap-local controller methods: `loadProperties`, `subscribePropertyChanges`, `destroy`.

---

## Section C. Host listener evidence

The host listener and cleanup shape are confirmed for this tranche:

- Current production wiring confirms `_KDB.runtime.core.adapters.content` exists in `KDB.js` and maps to constructor option `_options.content`.
- User console test confirms `_KDB.runtime.core.adapters.content.on("change:property:KDBLoadingImageToggle", handler)` registers and fires.
- User confirmation: `_KDB.runtime.core.adapters.content.off(eventName, handler)` exists and is the cleanup path for listeners registered through `content.on(eventName, handler)`.
- Current production has no `launchpad` production module and no `_KDB.api.launchpad`; the hide/show-widget owner call must be documented as deferred integration, not invented in this tranche.

Execution rule:

1. Register the listener with `content.on(eventName, handler)`.
2. Store a cleanup function under `_KDB.runtime.properties.subscriptions.hideWidgetsToggle`.
3. The cleanup function must call `content.off(eventName, handler)`.
4. `destroy()` must call that cleanup before clearing `_KDB.runtime.properties.subscriptions`.

---

## Section D. Mapping table

| New production file | Legacy source | Rule-alignment note |
|---|---|---|
| `core/properties/__orchestratorProperties.js` | `core/bootstrap/loadProperties/__orchestratorLoadProperties.js` and `core/bootstrap/subscribeProperties/__orchestratorSubscribeProperties.js` | Combine approved bootstrap-local controller methods; no global API/service registration; omit legacy events; add disposed guard and runtime cleanup. |
| `core/properties/loadObjectProperties.js` | `core/bootstrap/loadProperties/loadObjectProperties.js` | Preserve per-property fallback to `undefined`; AMD full-compact form and contextual boundary logs. |
| `core/properties/loadToggleProperties.js` | `core/bootstrap/loadProperties/loadToggleProperties.js` | Preserve boolean normalization and per-toggle fallback to `false`; no behavior change. |
| `core/properties/readPropertyValue.js` | `core/bootstrap/loadProperties/readPropertyValue.js` | Replace legacy `_KDB.apiContent.kdbWidgetContent` with `_KDB.runtime.core.adapters.content`; no `_KDB.apiContent`. |
| `core/properties/parsePropertyInput.js` | `core/bootstrap/loadProperties/parsePropertyInput.js` | Preserve wrapped JSON parsing and malformed-input fallback. |
| `core/properties/config/getObjectPropertyDefinitions.js` | `core/bootstrap/loadProperties/config/getObjectPropertyDefinitions.js` | Direct declarative mapping port. |
| `core/properties/config/getTogglePropertyDefinitions.js` | `core/bootstrap/loadProperties/config/getTogglePropertyDefinitions.js` | Direct declarative mapping port. |
| `core/properties/config/getPropertySubscriptionDefinitions.js` | `core/bootstrap/subscribeProperties/subscribeHideWidgetsProperty.js` | Single approved subscription definition for `KDBHideWidgetsToggle`; no extra subscriptions. |
| `core/properties/subscribePropertyChanges.js` | `core/bootstrap/subscribeProperties/__orchestratorSubscribeProperties.js` | Bootstrap-local dispatcher for approved subscriptions; no event catalog writes. |
| `core/properties/subscribeHideWidgetsToggleProperty.js` | `core/bootstrap/subscribeProperties/subscribeHideWidgetsProperty.js` | Move cleanup handle from `_KDB.state.properties.subscriptions` to `_KDB.runtime.properties.subscriptions`; require confirmed cleanup path. |
| `core/properties/applyHideWidgetsToggleChange.js` | `core/bootstrap/subscribeProperties/subscribeHideWidgetsProperty.js` and `dashboard/launchpad/subscribeHideWidgetsToggle.js` | Re-read and normalize the toggle, write `_KDB.properties.KDBHideWidgetsToggle`, then defer known-owner launchpad integration if no production API exists. |
| `core/properties/runtime/ensurePropertiesRuntime.js` | none | Rule-alignment helper for `_KDB.runtime.properties.subscriptions`. |
| `core/properties/runtime/clearPropertiesRuntime.js` | none | Rule-alignment helper that calls stored cleanup functions and clears runtime. |

No `events/eventNames.js` is created in this tranche.

---

## Section E. Folder tree

Create only these paths:

```txt
_____________KDB3API/KDB3/js/core/properties/
  __orchestratorProperties.js
  loadObjectProperties.js
  loadToggleProperties.js
  readPropertyValue.js
  parsePropertyInput.js
  subscribePropertyChanges.js
  subscribeHideWidgetsToggleProperty.js
  applyHideWidgetsToggleChange.js
  config/
    getObjectPropertyDefinitions.js
    getTogglePropertyDefinitions.js
    getPropertySubscriptionDefinitions.js
  runtime/
    ensurePropertiesRuntime.js
    clearPropertiesRuntime.js
```

Do not edit `KDB.js` in this tranche. Document the later import/call requirement in the execution report.

---

## Section F. Per-file specifications

Every file below must use one explicit AMD `define([...], function (...) { ... })` call and return one value. Keep named helpers at AMD factory scope, not nested inside entry functions or callbacks.

### `core/properties/__orchestratorProperties.js`

- **Role:** core bootstrap module orchestrator returning a bootstrap-local controller object.
- **Lines:** target 80, hard limit 120.
- **AMD imports:** `./loadObjectProperties.js`, `./loadToggleProperties.js`, `./subscribePropertyChanges.js`, `./runtime/ensurePropertiesRuntime.js`, `./runtime/clearPropertiesRuntime.js`.
- **Entry function:** `function __orchestrator(_KDB)`.
- **Factory-scope state:** local `_isDisposed` boolean in the orchestrator closure is allowed because it belongs to the returned controller instance.
- **Body steps:**
  1. Call `_ensurePropertiesRuntime(_KDB)`.
  2. Define public controller methods `loadProperties`, `subscribePropertyChanges`, `destroy` as factory-scope helpers bound through `_KDB` and the local disposed flag.
  3. Return `{ loadProperties, subscribePropertyChanges, destroy }`.
- **`loadProperties()` behavior:**
  1. If disposed, `console.warn("[properties.loadProperties] called after destroy")` and return `undefined`.
  2. In `try/catch`, reset `_KDB.properties = {}`.
  3. Call `_loadObjectProperties(_KDB)`.
  4. Call `_loadToggleProperties(_KDB)`.
  5. Return `_KDB.properties`.
  6. Do not emit `properties:reloaded`.
- **`subscribePropertyChanges()` behavior:**
  1. If disposed, warn once and no-op.
  2. In `try/catch`, call `_ensurePropertiesRuntime(_KDB)` then `_subscribePropertyChanges(_KDB)`.
- **`destroy()` behavior:**
  1. Idempotent.
  2. Set `_isDisposed = true` before cleanup.
  3. In `try/catch`, call `_clearPropertiesRuntime(_KDB)`.
- **Rules to apply:**
  - `amd.mdc` - full-compact AMD shape; no inline nested functions inside executable flow.
  - `feature-structure.mdc` - orchestrator wires only; no business logic beyond bootstrap-local method coordination.
  - `module-public-api.mdc` - no `_KDB.api.properties` and no `_KDB.services.properties`; controller is bootstrap-local.
  - `runtime.mdc` - initialize and clear `_KDB.runtime.properties.subscriptions`.
  - `error-handling.mdc` - wrap lifecycle/bootstrap method bodies in `try/catch` with contextual `console.error`.

### `core/properties/loadObjectProperties.js`

- **Role:** object property loader.
- **Lines:** target 35, hard limit 80.
- **AMD imports:** `./config/getObjectPropertyDefinitions.js`, `./readPropertyValue.js`, `./parsePropertyInput.js`.
- **Entry function:** `function __controller(_KDB)`.
- **Behavior:** read definitions, for each definition read raw value, parse wrapped object input, assign `properties[definition.runtimeKey]`, fallback to `undefined` on per-property error, then assign `_KDB.properties = properties` and return it.
- **Rules to apply:**
  - `amd.mdc` - one AMD module, one returned controller.
  - `kdb-object.mdc` - write `_KDB.properties`, not `_KDB.state`.
  - `error-handling.mdc` - keep per-property catch with contextual log; do not make one bad property fatal.
  - `naming.mdc` - boundary params/imports use underscore prefix.

### `core/properties/loadToggleProperties.js`

- **Role:** toggle property loader.
- **Lines:** target 55, hard limit 90.
- **AMD imports:** `./config/getTogglePropertyDefinitions.js`, `./readPropertyValue.js`.
- **Factory-scope helper:** `normalizeToggleValue(_value)` with exact legacy semantics.
- **Entry function:** `function __controller(_KDB)`.
- **Behavior:** read definitions, for each definition read raw value, normalize to boolean, assign `properties[definition.runtimeKey]`, fallback to `false` on per-toggle error, then assign `_KDB.properties = properties` and return it.
- **Rules to apply:**
  - `amd.mdc` - helper at factory scope only.
  - `kdb-object.mdc` - write `_KDB.properties`, not `_KDB.state`.
  - `error-handling.mdc` - keep per-property catch with contextual log.
  - `naming.mdc` - preserve English identifiers and boundary underscore discipline.

### `core/properties/readPropertyValue.js`

- **Role:** narrow host-bound property read helper.
- **Lines:** target 35, hard limit 70.
- **AMD imports:** none.
- **Entry function:** `function __controller(_KDB, _propertyId)`.
- **Behavior:**
  1. Resolve `content` as `_KDB.runtime.core.adapters.content`.
  2. If missing or no `getPropertyValue`, log `"[properties.readPropertyValue] <propertyId> content adapter unavailable"` and return `undefined`.
  3. Return `content.getPropertyValue(_propertyId)`.
  4. On host error, log and return `undefined`.
- **Rules to apply:**
  - `kdb-object.mdc` - do not use legacy `_KDB.apiContent`.
  - `runtime.mdc` - read existing runtime adapter placement; do not create runtime resources here.
  - `error-handling.mdc` - host API boundary catches and degrades per legacy fallback semantics.
  - `amd.mdc` - one helper return.

### `core/properties/parsePropertyInput.js`

- **Role:** pure parser for wrapped object property input.
- **Lines:** target 45, hard limit 80.
- **AMD imports:** none.
- **Entry function:** `function __controller(_propertyId, _rawInput)`.
- **Behavior:** preserve legacy semantics exactly: `null`, `undefined`, empty string and `"-"` return `undefined`; input must be a stringified object with exactly one key matching `_propertyId`; malformed values log and return `undefined`.
- **Rules to apply:**
  - `amd.mdc` - one returned pure helper.
  - `error-handling.mdc` - parser catch logs and returns fallback; no state writes.
  - `naming.mdc` - boundary parameter underscores.

### `core/properties/config/getObjectPropertyDefinitions.js`

- **Role:** declarative object property definitions.
- **Lines:** target 35, hard limit 80.
- **AMD imports:** none.
- **Entry function:** `function getObjectPropertyDefinitions()`.
- **Return:** exact legacy array of `{ propertyId, runtimeKey }` definitions from the legacy file.
- **Rules to apply:**
  - `amd.mdc` - constants/config in AMD object/function form.
  - `feature-structure.mdc` - config folder holds declarative mappings.
  - `naming.mdc` - English identifiers.

### `core/properties/config/getTogglePropertyDefinitions.js`

- **Role:** declarative toggle property definitions.
- **Lines:** target 20, hard limit 60.
- **AMD imports:** none.
- **Entry function:** `function getTogglePropertyDefinitions()`.
- **Return:** exact legacy array for `KDBReadyToggle`, `KDBLoadingImageToggle` mapped to `KDBPlayLoadingImageToggle`, `KDBLoadingImageTransparentToggle`, and `KDBHideWidgetsToggle`.
- **Rules to apply:** same as `getObjectPropertyDefinitions.js`.

### `core/properties/config/getPropertySubscriptionDefinitions.js`

- **Role:** declarative property subscription definitions.
- **Lines:** target 20, hard limit 60.
- **AMD imports:** none.
- **Entry function:** `function getPropertySubscriptionDefinitions()`.
- **Return:** one definition only:
  - `propertyId: "KDBHideWidgetsToggle"`
  - `eventName: "change:property:KDBHideWidgetsToggle"`
  - `runtimeKey: "hideWidgetsToggle"`
- **Rules to apply:**
  - `feature-structure.mdc` - config holds declarative definitions.
  - `events.mdc` - this is a Cognos host event name, not `_KDB.events`; do not add a project event constant.

### `core/properties/subscribePropertyChanges.js`

- **Role:** bootstrap-local subscription coordinator.
- **Lines:** target 45, hard limit 90.
- **AMD imports:** `./config/getPropertySubscriptionDefinitions.js`, `./subscribeHideWidgetsToggleProperty.js`.
- **Entry function:** `function __controller(_KDB)`.
- **Behavior:** read definitions and invoke `_subscribeHideWidgetsToggleProperty(_KDB, definition)` only for `KDBHideWidgetsToggle`; ignore unknown definitions with a contextual `console.warn` rather than adding behavior.
- **Rules to apply:**
  - `feature-structure.mdc` - coordinator only, no listener body logic.
  - `runtime.mdc` - subscription creation must route to the file that stores cleanup.
  - `error-handling.mdc` - wrap subscription boundary with contextual log.

### `core/properties/subscribeHideWidgetsToggleProperty.js`

- **Role:** Cognos host property listener registration.
- **Lines:** target 80, hard limit 120.
- **AMD imports:** `./applyHideWidgetsToggleChange.js`, `./runtime/ensurePropertiesRuntime.js`.
- **Factory-scope helpers:**
  - `resolvePropertiesContent(_KDB)` returns `_KDB.runtime.core.adapters.content` or `null`.
  - `createCleanup(content, eventName, handler)` returns a cleanup function that calls `content.off(eventName, handler)`.
  - `createHandler(_KDB)` calls `_applyHideWidgetsToggleChange(_KDB)`.
- **Entry function:** `function __controller(_KDB, _definition)`.
- **Behavior:**
  1. Ensure runtime.
  2. If `runtime.properties.subscriptions.hideWidgetsToggle` already exists, return.
  3. Resolve content from `_KDB.runtime.core.adapters.content`; if unavailable or no `on`, log and return.
  4. If `content.off` is not a function, log and return without subscribing.
  5. Create handler.
  6. Call `content.on(_definition.eventName, handler)`.
  7. Create cleanup function that calls `content.off(_definition.eventName, handler)`.
  8. If cleanup is not a function, log and return.
  9. Store cleanup function at `_KDB.runtime.properties.subscriptions[_definition.runtimeKey]`.
- **Rules to apply:**
  - `runtime.mdc` - no host listener without cleanup; cleanup function calls `content.off(eventName, handler)` and lives under `_KDB.runtime.properties.subscriptions`.
  - `error-handling.mdc` - host subscription boundary and handler setup are wrapped with contextual logs.
  - `kdb-object.mdc` - do not use `_KDB.apiContent`.
  - `events.mdc` - do not emit project events.

### `core/properties/applyHideWidgetsToggleChange.js`

- **Role:** property-change handler effect.
- **Lines:** target 70, hard limit 110.
- **AMD imports:** `./readPropertyValue.js`.
- **Factory-scope helper:** `normalizeToggleValue(_value)` with exact legacy semantics.
- **Entry function:** `function __controller(_KDB)`.
- **Behavior:**
  1. Read raw `KDBHideWidgetsToggle` through `_readPropertyValue`.
  2. Normalize next value and previous `_KDB.properties.KDBHideWidgetsToggle`.
  3. If unchanged, return.
  4. Write `_KDB.properties.KDBHideWidgetsToggle = next`.
  5. Do not emit `properties:hideWidgetsToggled`.
  6. If `_KDB.api.launchpad.dispatch` exists, dispatch the approved future action only if that action is already documented in a launchpad contract; current production has no launchpad API, so the expected behavior in this tranche is to log once: `"[properties] launchpad API is not available; KDBHideWidgetsToggle owner integration deferred."`
  7. Do not invent `_KDB.api.launchpad`, do not write `_KDB.state.launchpad`, and do not call legacy launchpad internals.
- **Rules to apply:**
  - `state.mdc` - write only `_KDB.properties`; no foreign state writes.
  - `module-public-api.mdc` - use known-owner public API only if it already exists; otherwise defer.
  - `events.mdc` - no replacement event.
  - `error-handling.mdc` - handler boundary catches/logs; no silent swallowing.

### `core/properties/runtime/ensurePropertiesRuntime.js`

- **Role:** runtime namespace initializer.
- **Lines:** target 25, hard limit 60.
- **AMD imports:** none.
- **Entry function:** `function __controller(_KDB)`.
- **Behavior:** ensure `_KDB.runtime`, `_KDB.runtime.properties`, and `_KDB.runtime.properties.subscriptions`; return `_KDB.runtime.properties`.
- **Rules to apply:**
  - `runtime.mdc` - use standard `subscriptions` bucket.
  - `kdb-object.mdc` - do not create unrelated top-level namespaces.

### `core/properties/runtime/clearPropertiesRuntime.js`

- **Role:** runtime cleanup helper.
- **Lines:** target 45, hard limit 80.
- **AMD imports:** `./ensurePropertiesRuntime.js`.
- **Entry function:** `function __controller(_KDB)`.
- **Behavior:** iterate `_KDB.runtime.properties.subscriptions`; call each function cleanup; catch/log individual cleanup failures; then reset `_KDB.runtime.properties.subscriptions = {}` without deleting `_KDB.runtime.core`.
- **Rules to apply:**
  - `runtime.mdc` - cleanup before clearing runtime bucket.
  - `error-handling.mdc` - cleanup errors are contextual logs and do not prevent remaining cleanup.

---

## Section G. Public API and integration

- Published global surface: none.
- Bootstrap-local returned methods: `loadProperties`, `subscribePropertyChanges`, `destroy`.
- Later `KDB.js` integration, out of scope here:
  - Add AMD import for `./core/properties/__orchestratorProperties.js`.
  - Create the controller in `setupCoreFactories` before code reads `_KDB.properties`.
  - Call `propertiesController.loadProperties()` during setup.
  - Call `propertiesController.subscribePropertyChanges()` once `_KDB.runtime.core.adapters.content` is available.
  - Call `propertiesController.destroy()` from root `destroy()` before `clearRuntimeCore(this)`.

The executing AI must not edit `KDB.js`; it only reports these integration steps.

---

## Section H. Acceptance criteria

1. Section A summaries are present and specific.
2. Subscription implementation that calls `content.on(...)` also stores a cleanup function that calls `content.off(...)`.
3. Every file from Section E exists after execution, and no extra files are created.
4. Every file follows the AMD full-compact shape from `amd.mdc`.
5. No file uses ES module syntax, CommonJS `require`, multiple `define` calls, or inline nested subfunctions inside entry functions/callbacks.
6. No file writes `_KDB.state.properties` or creates `_KDB.services.properties` / `_KDB.api.properties`.
7. No file references `_KDB.apiContent`.
8. Object property fallback remains `undefined`; toggle property fallback remains `false`.
9. `properties:reloaded` and `properties:hideWidgetsToggled` are not emitted and no `events/eventNames.js` is created.
10. The `KDBHideWidgetsToggle` listener stores a real cleanup function under `_KDB.runtime.properties.subscriptions.hideWidgetsToggle`.
11. `destroy()` calls stored cleanup functions before clearing `runtime.properties.subscriptions`.
12. Current missing production `launchpad` API is documented as deferred integration; no launchpad API/state is invented.
13. `ReadLints` is run on all new `.js` files and every diagnostic introduced by this tranche is fixed.
14. Imports resolve relative to `_____________KDB3API/KDB3/js/core/properties/`.
15. `KDB.js` bootstrap registration is reported as required but deferred.

---

## Section I. Forbidden actions

The executing AI must not:

- Modify any file under `_____________KDB3API/.cursor/rules/`.
- Modify `projectStructureRules.md`, `stateOwnership.md`, `lifecycleVocabulary.md`, `eventSubscribe.md`, `filesExplained.md`, or litmustest reports.
- Modify `_____________KDB3API/contracts/_template.md` or `_executionSpecTemplate.md`.
- Modify `_____________KDB3API/contracts/properties.md`.
- Modify `KDB.js` in this tranche.
- Create `_KDB.api.properties`, `_KDB.services.properties`, `_KDB.state.properties`, or `_KDB.apiContent`.
- Create or emit `properties:reloaded` or `properties:hideWidgetsToggled`.
- Add `properties/events/eventNames.js`.
- Port any property subscription beyond `KDBHideWidgetsToggle`.
- Write under `TEST/`.
- Delete, rename, or modify anything under `_______KDB3/`, `_______REDESIGN2/`, or `_______LAATSTEORIGINAL/`.
- Commit, push, or change git config.
- Introduce behavior changes beyond rule-alignment.

---

## Section J. Reporting template

The executing AI's final response must include:

1. Pre-flight echo: 14 numbered summaries from Section A.
2. Host listener status: confirmation that `content.on(...)` and `content.off(...)` are used as specified.
3. File checklist: every created path with line count and `matches spec` or `deviation`.
4. Deviations: file path, deviation, motivation, and consulted rule.
5. Self-verification against every Section H acceptance criterion.
6. Integration note: exact `KDB.js` import/call/destroy registration still required later.

---

## Section K. Reviewer handoff

The supervising AI/reviewer must:

1. Verify Section A summaries.
2. Verify Section C host listener evidence is reflected in the subscription implementation.
3. Read every created file.
4. Run `ReadLints` on all new `.js` files.
5. Cross-check every file against Section F and Section H.
6. Confirm diff-walk against the listed legacy sources shows rule-alignment only.
7. Confirm production import paths would resolve from the future `KDB.js` integration.
8. Stop at CP-2 for user diff-walk and integration approval.
