# Module Contract: `<moduleName>`

> Template for every new module, service, adapter or subsystem under the **Module Contract First** rule in `_____________KDB3API/.cursor/rules/feature-structure.mdc`.
>
> Copy this file to `_____________KDB3API/contracts/<moduleName>.md`, fill in the sections, present to the user, and obtain explicit approval before generating implementation code. Keep it short and scannable; deeper design discussion belongs in `_____________KDB3API/architecture/`, not here.

---

**Status:** `Draft` | `Approved` | `Implementing` | `Frozen`
**Owner module / service:** `<moduleName>`
**Type:** `feature module` | `shared service` | `adapter` | `thin host wrapper` | `subsystem`
**Authoring AI:** `<agent name + date>`
**Reviewed by:** `<user / reviewer>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 1. Purpose

> One to three sentences. What does this module do, and why does it exist?

`<purpose>`

## 2. Ownership

> Which `_KDB.state.<subtree>` does this module canonically write? List the exact subtree path. If no state subtree is owned (pure adapter, pure wrapper), state that explicitly.

- Canonical state subtree: `_KDB.state.<subtree>`
- Initial state shape (one-screen sketch):

```js
_KDB.state.<subtree> = {
  /* ... */
};
```

- Foreign-write paths: none. Foreign modules request changes through this module's public surface; actual state writes happen only through internal owner writers.

## 3. Runtime

> Which `_KDB.runtime.<owner>.*` resources does this module manage? Reference `runtime.mdc` for canonical bucket names. Cleanup must be explicit.

- Owner namespace: `_KDB.runtime.<owner>`
- Buckets used: `listeners` | `subscriptions` | `abortControllers` | `observers` | `timers` | `domRefs` | `adapters` | `pendingPromises` | `customControls`
- Cleanup trigger: `<destroy / lifecycle event / route change>`
- Notes on non-standard resources: `<none | description>`

## 4. Public API

> Public surface, style and method set per `module-public-api.mdc` and `kdb-object.mdc`. Pick the relevant block below based on object type. Choose **dispatch + reducer** or **named methods** per the category default; motivate any deviation. Remove the blocks that do not apply to this contract.

### 4a. Feature module

- Surface: `_KDB.api.<module>`
- Style: `dispatch + reducer` unless this contract justifies named methods.
- Methods: `mount`, `destroy`, `dispatch`, `getState`, optional `register*`.

```js
_KDB.api.<module> = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
  // register*: ...
};
```

- Deviation motivation (if any): `<reason>`

### 4b. Shared service

- Surface: `_KDB.services.<service>`
- Style: `named methods`.
- Methods: service capability methods, including deliberate read methods (`read<Something>`, `readTableState`, etc.) when those reads are owned by the service.

```js
_KDB.services.<service> = {
  // <verb + noun> capabilities, e.g.:
  // loadAll, readRows, waitForRows, reloadTable, readTableState
};
```

- Internal mutation style (independent of public style): `named writers` | `internal reducer + dispatch` (motivate if reducer + dispatch).

### 4c. Adapter

- Published surface: `none` unless explicitly registered through an owner's module API.
- Factory: `create<Adapter>Adapter.js`
- Injected into: `<module / service>`
- Adapter instance methods: `<method list>`
- Runtime instance location if stored: `_KDB.runtime.<owner>.adapters`
- Cognos ring-2 adapters wrap an injected `_KDB.services.cognosHost.<facet>`, not `_KDB.cognosAPI`. The `adapters/` folder is optional and is not the SDK isolation layer (`_KDB.services.cognosHost` is).

```js
const adapter = createCognosTabsAdapter({ tabsFacet: /* injected _KDB.services.cognosHost.tabs */ });
// owner stores the instance in its own runtime bucket:
_KDB.runtime.<owner>.adapters.<adapterName> = adapter;
```

### 4d. Thin host wrapper

- Surface: `_KDB.cognosAPI.<theme>.<function>`
- Inner ring only (`core/cognosAPI/`). Called from ring 1 (`core/services/cognosHost/`), not from feature modules.
- One thin wrapper around one Cognos host chain.
- No feature flow, no state ownership, no business interpretation.
- Mirror / state ownership remains with the calling module or bridge per `state.mdc` "Cognos Mirror Sync".
- Feature / writeback / other-service modules **stamp** `_KDB.runtime.<owner>.*Facet` from `_KDB.services.cognosHost.<facet>` in the orchestrator and read it via `effects/read*Facet.js`. They do not call `_KDB.cognosAPI` or look up `_KDB.services.cognosHost` from deep files. How-to: `cognosHostService.md` §0 and `cognos-adapter.mdc`.

```js
_KDB.cognosAPI.<theme>.<function> = function (/* params */) {
  // single Cognos host chain; return value or Promise from host call.
};
```

### 4e. Subsystem routing

> A *subsystem* is a structural category (composite scope, possibly owning a new `_KDB.state.<subtree>`), not a publication mechanism. For subsystem contracts, choose the block above that matches the subsystem's actual public surface and motivate the choice:

- `_KDB.api.<module>` (block 4a) — if the subsystem behaves like a feature module;
- `_KDB.services.<service>` (block 4b) — if it behaves like a shared service;
- local factory / injected object (block 4c) — if it behaves like an adapter.

A subsystem does not publish through `_KDB.cognosAPI.<theme>`; thin host wrappers stay narrow per `kdb-object.mdc` and remain inner ring. A subsystem that consumes Cognos stamps `_KDB.runtime.<owner>.*Facet` and reads it via `effects/read*Facet.js` (`cognosHostService.md` §0). It does not call `_KDB.cognosAPI`.

## 5. Readers / Writers

> Read paths depend on the object type per `module-public-api.mdc`; internal writers apply to every state owner per `state.mdc`.

**For feature modules:**

- List published readers/selectors from the owner-controlled selector registry (file: `<owner>/state/selectors.js` or its index).
  - `read<Something>(_KDB)` — `<what it returns>`
  - `read<SomethingElse>(_KDB, <id>)` — `<what it returns>`

**For shared services:**

- List deliberate read methods exposed on `_KDB.services.<service>`. Services do not publish a separate selector registry for their own state subtree.
  - `_KDB.services.<service>.read<Something>(...)` — `<what it returns>`
  - `_KDB.services.<service>.read<StateView>(...)` — `<what it returns>`

**For all state owners:**

- List internal writer helpers that mutate the owned state subtree. Internal writers are not exposed across module boundaries.
  - `set<Something>(_KDB, <value>)`
  - `apply<Something>(_KDB, <payload>)`

## 6. Events

> Emitted facts, subscribed events, and request-events when applicable. Each event entry needs name, payload shape, and teardown owner. Facts are past tense; requests end with `Requested` per `events.mdc` and `naming.mdc`. Update `_____________KDB3API/architecture/eventSubscribe.md` to match.

- **Emitted (facts):**
  - `<module>:<verbPast>` — payload `{ ... }` — emitted at `<confirmation point>`.
- **Subscribed:**
  - `<other-module>:<verbPast>` — handled by `<handler>` — cleanup via `_KDB.runtime.<owner>.subscriptions`.
- **Request-events (only if motivated):**
  - `<module>:<verb><Entity>Requested` — payload `{ ... }` — motivation: `<polymorphic | architectural boundary | multi-owner>`.

## 7. Dependencies

> Which services, adapters or `_KDB.services.cognosHost.<facet>` are injected via the orchestrator/controller options object? No deep `window._KDB` lookups per `projectStructureRules.md` and `amd.mdc`. Do not inject `_KDB.cognosAPI.<theme>` into a feature module.

- `_KDB` (always)
- `eventBus` (`_KDB.events`)
- `<service>` (`_KDB.services.<service>`)
- `<adapter>` (created locally; optional ring-2 wrap of a cognosHost facet)
- `<cognosHost facet>` (`_KDB.services.cognosHost.<facet>`)

## 8. Cognos Touchpoints

> Which `_KDB.services.cognosHost.<facet>` operations (or ring-2 adapter methods wrapping that facet) does this module perform, and which state must mirror as a result? Cross-reference `kdb-object.mdc` and `state.mdc` for Cognos Mirror Sync. Feature modules do not call `_KDB.cognosAPI` — ring 1 is the isolating layer.

- Calls:
  - `_KDB.services.cognosHost.<facet>.<operation>(...)` — used in `<context>` — owner of mirror sync: `<this module | named bridge>`.
- Bridges that observe Cognos changes call this module's public API for owner-flow writes; no direct foreign state mutation.

## 9. Folder Layout

> Concrete folder structure per `feature-structure.mdc`. List only folders with real content. The orchestrator and factory files at the module root. `adapters/` is optional and is not the SDK isolation layer; Cognos isolation is `_KDB.services.cognosHost`.

```txt
<moduleName>/
  config/
  state/
  view/
  effects/
  adapters/
  events/
  create<Module>Controller.js          // or create<Service>Service.js / create<Adapter>Adapter.js
  __orchestrator<Module>.js
```

## 10. Out Of Scope

> What this module explicitly **does not** do. Use this to prevent scope creep and god-object growth. List adjacent concerns and the owners that handle them.

- `<concern>` — owner: `<other module / service>`
- `<concern>` — owner: `<other module / service>`

## 11. Open Questions

> Optional. Anything the AI needs the user to decide before implementation begins. Resolve before status moves from `Draft` to `Approved`.

- `<question>`

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `<yyyy-mm-dd>` | `Draft → Approved` | `<user>` | `<notes>` |

> When implementation diverges from the contract, stop, present the deviation, update this contract, and resume per the synchronisation clause in `feature-structure.mdc`.
