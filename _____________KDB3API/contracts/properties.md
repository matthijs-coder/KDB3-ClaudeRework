# Module Contract: `properties`

> Direct-port CP-1 contract for the legacy-known-good property bootstrap loader and property-change host listeners. This contract translates `core/bootstrap/loadProperties` and the small `subscribeProperties` workflow into the 2026 rule set without redesigning property semantics.

---

**Status:** `Draft`
**Owner module / service:** `properties`
**Type:** `core bootstrap module / host listener boundary`
**Authoring AI:** GPT-5.5, 2026-05-16
**Reviewed by:** `<pending CP-1>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## Legacy Survey

Primary legacy source used:

| Legacy file | Role |
|---|---|
| `_______KDB3/KDB3/js/core/bootstrap/loadProperties/__orchestratorLoadProperties.js` | Bootstrap orchestrator that resets `_KDB.properties`, loads object and toggle properties, and emits `properties:reloaded`. |
| `_______KDB3/KDB3/js/core/bootstrap/loadProperties/loadObjectProperties.js` | Reads object-style property values, parses wrapped JSON input, and writes runtime keys on `_KDB.properties`. |
| `_______KDB3/KDB3/js/core/bootstrap/loadProperties/loadToggleProperties.js` | Reads boolean-like toggle properties, normalizes them, and writes runtime keys on `_KDB.properties`. |
| `_______KDB3/KDB3/js/core/bootstrap/loadProperties/readPropertyValue.js` | Reads a property from legacy `_KDB.apiContent.kdbWidgetContent.getPropertyValue(propertyId)`. |
| `_______KDB3/KDB3/js/core/bootstrap/loadProperties/parsePropertyInput.js` | Parses wrapper-object property input and rejects malformed values. |
| `_______KDB3/KDB3/js/core/bootstrap/loadProperties/config/getObjectPropertyDefinitions.js` | Defines object property ids and `_KDB.properties` runtime keys. |
| `_______KDB3/KDB3/js/core/bootstrap/loadProperties/config/getTogglePropertyDefinitions.js` | Defines toggle property ids and `_KDB.properties` runtime keys. |
| `_______KDB3/KDB3/js/core/events/widgetProperties.js` | Defines legacy `properties:reloaded` and `properties:hideWidgetsToggled` constants. |
| `_______KDB3/KDB3/js/core/bootstrap/subscribeProperties/__orchestratorSubscribeProperties.js` | Bootstrap orchestrator for property-change subscriptions. |
| `_______KDB3/KDB3/js/core/bootstrap/subscribeProperties/subscribeHideWidgetsProperty.js` | Subscribes to `change:property:KDBHideWidgetsToggle`, updates `_KDB.properties.KDBHideWidgetsToggle`, and emits `properties:hideWidgetsToggled`. |

Context-only legacy sources:

| Legacy file | Reason |
|---|---|
| `architecture/eventSubscribe.md` | Documents `properties:reloaded` as emitted by the loader with no subscribers yet, and `properties:hideWidgetsToggled` as part of the separate property-subscription workflow. |
| `_______KDB3/KDB3/js/dashboard/launchpad/subscribeHideWidgetsToggle.js` | Legacy consumer of `properties:hideWidgetsToggled`; used to understand the downstream behavior, not copied as-is unless CP-1 chooses event fanout. |
| `_______KDB3/KDB3/js/KDB.js` | Shows setup ordering and downstream reads of `_KDB.properties.KDBReadyToggle`, `KDBPlayLoadingImageToggle`, and `KDBLoadingImageTransparentToggle`. |

Legacy behavior summary:

- The loader initializes `_KDB.properties = {}` during core setup, then loads object properties and toggle properties.
- Object properties are expected as JSON strings shaped like `{ "<propertyId>": <value> }`; malformed input returns `undefined` and logs an error.
- Toggle properties normalize `true`, `false`, `"true"`, `"1"`, `"yes"`, `"false"`, `"0"`, `"no"`, `""`, `null` and `undefined` to booleans.
- Failed individual property reads do not abort the whole loader; the affected object property becomes `undefined`, and the affected toggle becomes `false`.
- Legacy emits `properties:reloaded` after the full load, but the legacy catalog records no subscribers for that event yet.
- Legacy subscribes directly to Cognos content event `change:property:KDBHideWidgetsToggle`, re-reads the toggle, updates `_KDB.properties.KDBHideWidgetsToggle` when the value changes, and then emits `properties:hideWidgetsToggled`.
- Legacy stores subscription flags/handles under `_KDB.state.properties.subscriptions` and `_KDB.state.launchpad.subscriptions`; rule-alignment moves those technical handles to `_KDB.runtime.<owner>.subscriptions`.

---

## CP-1 Decisions Needed

| ID | Recommendation | Reason / trade-off |
|---|---|---|
| **Q1 Target path** | Use `KDB3/js/core/properties/`. | This is core bootstrap/property-panel configuration, not a reusable named-method service. It writes the already-approved `_KDB.properties` top-level namespace. |
| **Q2 Public surface** | No `_KDB.services.properties`. **2026-09-02 exception:** narrow `_KDB.api.properties = { applyDeveloperMode }` only — [kdbControl-developer-mode-toggle-contractdelta.md](./_archive/kdbControl-developer-mode-toggle-contractdelta.md). | Bootstrap remains the owner; kdbControl needs a legal callee that does **not** re-read Cognos. |
| **Q3 State ownership** | No `_KDB.state.properties` in this tranche. | `_KDB.properties` is the canonical namespace for Cognos dashboard spec / property panel configuration per `kdb-object.mdc`; adding state would duplicate the same data. |
| **Q4 Runtime ownership** | Use `_KDB.runtime.properties.subscriptions` for Cognos property-change listener cleanup. | The load-only path has no runtime resources, but `content.on("change:property:...")` creates a host listener and therefore needs owner cleanup per `runtime.mdc`. |
| **Q5 Host property read source** | Read from `_KDB.runtime.core.adapters.properties` or another existing host content object wired from constructor options; do not reintroduce `_KDB.apiContent`. | Prior core specs explicitly forbid `apiContent`. The direct port must replace legacy `_KDB.apiContent.kdbWidgetContent` with the new runtime host-adapter placement. |
| **Q6 Event behavior** | Omit/defer `properties:reloaded`; do not emit uncataloged events. | Legacy emits it, but production `eventSubscribe.md` has no properties event and legacy has no subscriber. Adding it would require explicit event-catalog approval. |
| **Q7 Property-change subscriptions** | Include `KDBHideWidgetsToggle` host listener in this contract, but prefer direct known-owner dispatch over legacy event indirection. | The Cognos host hook is simple and belongs to `properties`; `events.mdc` prefers direct API calls when the owner is known. |
| **Q8 Bootstrap registration** | Required later in `KDB.js` setup ordering, but out of scope for this direct-port tranche. | The produced module must be imported/called by bootstrap later, before any code reads `_KDB.properties`; this integration is a separate approved change after CP-2. |
| **Q9 Naming** | Use `properties` as folder/module label and `__orchestratorProperties.js` as the orchestrator. | The target owns the canonical `_KDB.properties` namespace; `loadProperties` remains an implementation concern, not the folder name. |
| **Q10 Error semantics** | Preserve per-property fallback behavior while adding boundary `try/catch` at the orchestrator. | Rule-alignment adds explicit boundary logging; it must not convert legacy tolerated bad inputs into dashboard-fatal errors except for unexpected top-level loader failure. |
| **Q11 Property-change reaction target** | For `KDBHideWidgetsToggle`, call the known owner through its public API/dispatch when that owner exists; use an event only if CP-1 chooses multi-consumer fanout. | Direct calls keep return paths and ownership explicit. Event fanout is justified only if multiple independent modules must react. |

Open CP-1 point with behavior impact:

- Legacy emits `properties:reloaded` even though no current subscriber is known. The rule-aligned choices are **A** omit/defer the event for now because there is no production catalog entry and no known consumer, or **B** include `properties/events/eventNames.js` plus an `eventSubscribe.md` catalog entry and emit the fact after `_KDB.properties` is filled. Option B preserves legacy observable behavior more closely but modifies an authority event catalog.
- Legacy emits `properties:hideWidgetsToggled`; the rule-aligned choices are **A** replace it with a direct public-API call to the known owner (recommended), or **B** keep it as a fact-event with a production `eventSubscribe.md` catalog entry if multiple independent consumers must react.

---

## 1. Purpose

`properties` loads Cognos property-panel values into `_KDB.properties` during core setup so downstream bootstrap and feature code can read configured toggles and object definitions from one canonical place.

The module also owns narrow Cognos property-change listeners for property ids that must update `_KDB.properties` while the dashboard is open. It does not own feature reactions themselves, service APIs, dashboard startup decisions or Cognos spec redesign.

## 2. Ownership

- Canonical config namespace written: `_KDB.properties`.
- Canonical state subtree: none.
- Initial namespace shape:

```js
_KDB.properties = {
  loadingTablesPropObj: undefined,
  kennzahlenTablesPropObj: undefined,
  kennzahlenTreePropObj: undefined,
  filterPropObj: undefined,
  textWidgetPropObj: undefined,
  visualizationsPropObj: undefined,
  visualizationsDataPropObj: undefined,
  linePropObj: undefined,
  piePropObj: undefined,
  stackedBarPropObj: undefined,
  stackedColumnPropObj: undefined,
  listPropObj: undefined,
  prognosePropObj: undefined,
  kennzahlSpecificSlotDefaultObj: undefined,
  headerWidgetPropObj: undefined,
  pdfAttachmentPageObj: undefined,
  KDBReadyToggle: false,
  KDBPlayLoadingImageToggle: false,
  KDBLoadingImageTransparentToggle: false,
  KDBHideWidgetsToggle: false
};
```

Ownership rules:

- `_KDB.properties` is not `_KDB.state`; it holds Cognos property-panel configuration values per `kdb-object.mdc`.
- KID / package mapping is **not** a loaded object property. SSOT is `core/config/mapping/parameterMap.js` (`contracts/_archive/mapping-config-ssot-contractdelta.md`). `filterPropObj` remains a loaded object property.
- The loader may replace `_KDB.properties` during bootstrap before consumers read it.
- Other modules read `_KDB.properties` but do not write it.
- `KDBPlayLoadingImageToggle` gates **boot** overlay only (`loadingService-overlay-coverage-contractdelta.md`). SET / GET persist / tree / slot / PDF / vis overlays ignore it.
- No `_KDB.state.properties` subtree is introduced by this tranche.

## 3. Runtime

- Owner namespace: `_KDB.runtime.properties`.
- Buckets used:

| Bucket | Shape / role |
|---|---|
| `subscriptions.hideWidgetsToggle` | Cleanup handle or unsubscribe function for `content.on("change:property:KDBHideWidgetsToggle", ...)`. |

- Cleanup trigger: root destroy / properties cleanup during the later bootstrap integration tranche.

Notes:

- The initial load path creates no runtime resources.
- The property-change listener path creates a host subscription and must store cleanup under runtime, not under `_KDB.state.properties`.
- If the Cognos `content.on(...)` return value is not an unsubscribe function, the implementation must adapt to the host shape: call `.remove()`, `.off()`, `.unsubscribe()`, or the documented cleanup mechanism when available. If no cleanup mechanism exists, stop and escalate per direct-port Section 8.

## 4. Public API

### Core bootstrap module

- Published global surface: none.
- Orchestrator AMD module: `core/properties/__orchestratorProperties.js`.
- Invocation style: bootstrap calls the orchestrator directly during core setup.
- Return value: local controller object for bootstrap wiring, not registered on `_KDB.api` or `_KDB.services`.

```js
const propertiesController = _orchestratorProperties(_KDB);
propertiesController.loadProperties();
propertiesController.subscribePropertyChanges();
```

No `_KDB.services.properties` or `_KDB.api.properties` surface is created. The controller is a bootstrap-local object used by the root setup/destroy wiring; consumers continue to read `_KDB.properties`.

Controller methods:

| Method | Role | Returns |
|---|---|---|
| `loadProperties()` | Reset and fill `_KDB.properties` from configured property ids. | `_KDB.properties` |
| `subscribePropertyChanges()` | Register approved Cognos property-change host listeners. | `undefined` |
| `destroy()` | Remove property-change host listeners and clear `_KDB.runtime.properties.subscriptions`. | `undefined` |

Post-disposal behavior is root-owned. The bootstrap-local controller should still use an internal `_isDisposed` guard so `destroy()` is idempotent and late `subscribePropertyChanges()` calls no-op with `console.warn`.

## 5. Readers / Writers

**For core bootstrap module:**

- Deliberate public read methods: none.
- Consumers read `_KDB.properties.<key>` after bootstrap registration has run.

**Internal writers / loaders:**

- `loadObjectProperties(_KDB)` — writes object property runtime keys on `_KDB.properties`.
- `loadToggleProperties(_KDB)` — writes toggle runtime keys on `_KDB.properties`.
- `parsePropertyInput(propertyId, rawInput)` — pure parser returning parsed value or `undefined`.
- `readPropertyValue(_KDB, propertyId)` — host-bound read helper; returns raw property value or `undefined`.
- `subscribeHideWidgetsToggleProperty(_KDB, deps)` — registers the `change:property:KDBHideWidgetsToggle` host listener.
- `applyHideWidgetsToggleChange(_KDB, payload)` — re-reads, normalizes and writes `_KDB.properties.KDBHideWidgetsToggle`; then routes the confirmed change to the known owner or emits an approved fact-event.

Internal loaders are not exposed through `_KDB.services` or `_KDB.api`.

## 6. Events

`properties:reloaded` CP-1 choice:

- **A. Recommended for this tranche:** no emitted events, no subscribed events, no `events/eventNames.js`; document `properties:reloaded` as deferred until a real production consumer or explicit event-catalog approval exists.
- **B. Legacy-compatibility option:** emit `properties:reloaded` after `_KDB.properties` is filled, create `properties/events/eventNames.js`, and add a matching production `eventSubscribe.md` catalog entry before implementation lands.

If option B is approved, the event contract is:

- **Emitted fact:** `properties:reloaded`.
- **Emitter:** `properties`.
- **Confirmation point:** `_KDB.properties` has been reset and both object and toggle loaders have completed.
- **Payload:**

```js
{
  source: "bootstrap"
}
```

- **Subscribers:** none initially.
- **Teardown owner:** not applicable until subscribers exist.

`properties:hideWidgetsToggled` CP-1 choice:

- **A. Recommended:** do not emit it; after `_KDB.properties.KDBHideWidgetsToggle` changes, call the known owning module through its public surface.
- **B. Legacy fanout option:** emit `properties:hideWidgetsToggled`, create `properties/events/eventNames.js`, add a production `eventSubscribe.md` catalog entry, and ensure subscribers store cleanup under their own `_KDB.runtime.<owner>.subscriptions`.

If option B is approved, the event contract is:

- **Emitted fact:** `properties:hideWidgetsToggled`.
- **Emitter:** `properties`.
- **Confirmation point:** `_KDB.properties.KDBHideWidgetsToggle` has changed to the normalized next boolean value.
- **Payload:**

```js
{
  propertyId: "KDBHideWidgetsToggle",
  isHidden: boolean,
  previousValue: boolean,
  source: "propertyChange"
}
```

- **Subscribers:** CP-1 must name the production subscribers before implementation; legacy launchpad is only historical context.
- **Teardown owner:** each subscriber's `destroy()` clears its own subscription handle.

## 7. Dependencies

- `_KDB` (always).
- Host property content object, read from the redesigned runtime placement instead of legacy `_KDB.apiContent`:
  - preferred candidate: `_KDB.runtime.core.adapters.properties`, if it exposes `getPropertyValue(propertyId)`;
  - fallback candidate to be confirmed during execution: `_KDB.runtime.core.adapters.dashboardApi` or `_KDB.runtime.core.adapters.features.Properties`, if that is where Cognos exposes property access in the current host.
- Host property change API on the same content object: `content.on("change:property:<propertyId>", handler)`.
- Known owner public API for `KDBHideWidgetsToggle` reaction, pending CP-1 owner decision:
  - likely `_KDB.api.launchpad.dispatch(...)` if launchpad remains the owner of hiding/showing widgets via launchpad routing;
  - otherwise the future widget owner public API if widget visibility ownership moves there before this tranche lands.
- Optional `_KDB.events` only if CP-1 chooses an event option B.

No service dependency is required.

## 8. Cognos Touchpoints

- Host read: `getPropertyValue(propertyId)` on the Cognos property/content object supplied by the renderer host.
- Host subscription: `content.on("change:property:<propertyId>", handler)` on the same content object for approved property ids.
- Mirror owner: `properties` writes `_KDB.properties`.

No `_KDB.cognosAPI.<theme>.<function>` wrapper exists yet for property reads. CP-1 recommendation is to keep `readPropertyValue.js` as the narrow local host-bound helper for this direct port. If a future second module needs property reads, promote that access to a thin `_KDB.cognosAPI.properties.getPropertyValue` wrapper under a separate contract/update.

## 9. Folder Layout

Target production tree, pending CP-1:

```txt
properties/
  __orchestratorProperties.js
  loadObjectProperties.js
  loadToggleProperties.js
  parsePropertyInput.js
  readPropertyValue.js
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
  events/
    eventNames.js              // only if CP-1 chooses an event option B
```

Rationale:

- `properties/` is a core ownership folder for `_KDB.properties`, not a service folder.
- `config/` holds property-id definitions because they are declarative mappings.
- `runtime/` is needed once property-change listeners are in scope, because host listener cleanup is technical runtime.
- No `state/` folder is created because `_KDB.properties` is config/spec data, not `_KDB.state`.
- `events/` is conditional because event emission requires catalog approval.

## 10. Out Of Scope

- Bootstrap registration in `KDB.js` / core setup imports — owner: later integration tranche after CP-2.
- Porting any property subscription beyond `KDBHideWidgetsToggle` — separate CP-1 decision.
- Porting legacy launchpad event subscriber as-is — use direct owner API unless CP-1 chooses event fanout.
- Creating `_KDB.services.properties` or `_KDB.api.properties`.
- Creating `_KDB.state.properties`.
- Adding a generic Cognos properties API wrapper unless CP-1 rejects the local helper approach.
- Editing `.cursor/rules/`, contract templates, `stateOwnership.md` or lifecycle vocabulary.
- Browser harness or `TEST/` sandbox.
- Redesigning property ids, runtime keys, parse semantics or boolean normalization.
- Reworking launchpad/widget visibility ownership beyond the minimal direct call needed for `KDBHideWidgetsToggle`.

## 11. Open Questions

- **Q1:** Approve target path `KDB3/js/core/properties/`?
- **Q2:** Approve no `_KDB.services.properties` and no `_KDB.api.properties` public surface?
- **Q3:** Approve `_KDB.properties` as the only written namespace, with no `_KDB.state.properties` subtree?
- **Q4:** Approve `_KDB.runtime.properties.subscriptions` for Cognos property-change listener cleanup?
- **Q5:** Approve replacing legacy `_KDB.apiContent.kdbWidgetContent` with the current host placement under `_KDB.runtime.core.adapters.*`, with the exact property object resolved during execution by reading current core wiring?
- **Q6:** Choose event behavior: **A** omit/defer `properties:reloaded` for now (recommended, no known production consumer), or **B** add `properties/events/eventNames.js` plus a production `eventSubscribe.md` entry and emit `properties:reloaded`.
- **Q7:** Approve including `content.on("change:property:KDBHideWidgetsToggle", ...)` in this properties tranche?
- **Q8:** Confirm bootstrap registration is required but out of scope until after CP-2.
- **Q9:** Approve `__orchestratorProperties.js` as the orchestrator filename instead of preserving legacy `__orchestratorLoadProperties.js`.
- **Q10:** Approve preserving per-property fallback behavior (`undefined` for bad object values, `false` for bad toggle values) while adding top-level boundary logging per `error-handling.mdc`.
- **Q11:** For `KDBHideWidgetsToggle`, choose reaction route: **A** direct known-owner API/dispatch (recommended), or **B** `properties:hideWidgetsToggled` fact-event with production event catalog entry and named subscribers.
- **Q12:** Confirm the known owner for the hide/show-widget reaction in this tranche: `launchpad` (legacy behavior) or a different module.
- **Q13:** Approve bootstrap-local controller methods `loadProperties`, `subscribePropertyChanges`, and `destroy`, without publishing `_KDB.api.properties` or `_KDB.services.properties`.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-05-16 | `Draft` created | GPT-5.5 | Direct-port CP-1 draft; Q1-Q10 awaiting user decision. |
| 2026-05-16 | `Draft` updated | GPT-5.5 | Added property-change host listener scope; Q1-Q13 awaiting user decision. |
| 2026-09-10 | Entwicklermodus HideData hint | PO vastenburg | `applyDeveloperMode` sync-calls `applyPersonalKdbHideDataHint` on leftover `personal_kdb`. Authoring untouched. Delta: `properties-personal-kdb-hidedata-hint-contractdelta.md`. |

> When implementation diverges from the contract, stop, present the deviation, update this contract, and resume per the synchronisation clause in `feature-structure.mdc`.
