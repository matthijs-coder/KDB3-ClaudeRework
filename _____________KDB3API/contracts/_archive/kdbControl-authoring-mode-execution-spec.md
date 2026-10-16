# Execution spec: authoring mode + kdbControl consumer (sandbox tranche)

**Status:** Ready for execution  
**Contracts:** [kdbControl-authoring-mode-contractdelta.md](./kdbControl-authoring-mode-contractdelta.md), [kdbControl.md](./kdbControl.md) §3 / §6 / Q3–Q4  
**Architecture:** [stateOwnership.md](../architecture/stateOwnership.md), [eventSubscribe.md](../architecture/eventSubscribe.md)  
**Sandbox root:** `TEST/kdbControl-port/`  
**Out of scope this tranche:** production `KDB3/js/**` copy-paste, Cognos/bootstrap adapters, header/footer/toolbox/settings behavior changes beyond what is listed here.

---

## Supersession note (mandatory for executing AI)

- Any older execution spec, seed, or comment that refers to **`_KDB.state.dashboard.isAuthoring`** or **`dashboard.isAuthoring`** as the canonical authoring flag is **superseded** for this tranche.
- **Canonical boolean:** **`_KDB.state.authoring.isAuthoring`** only; **canonical writer:** **`authoring`** module via **`_KDB.api.authoring.dispatch`**.
- The harness mock may **not** treat `state.dashboard` as the source of truth for authoring; remove authoring from `dashboard` in mock seed **or** leave `dashboard` without authoring fields—**authoring state must live under `_KDB.state.authoring`**.

---

## Section A — Pre-flight rule echo list

The executing AI **must** read each item **before** writing code, then echo **one sentence per item** as the first deliverable in the execution session (per `_executionSpecTemplate.md` / R6).

| # | Path | One-sentence summary (placeholder — executing AI replaces with real echo) |
|---|------|-----------------------------------------------------------------------------|
| 1 | `_____________KDB3API/.cursor/rules/kdb-object.mdc` | `_KDB` top-level shape: where `api`, `state`, `runtime`, `events`, `services` live and how modules register surfaces. |
| 2 | `_____________KDB3API/.cursor/rules/state.mdc` | Canonical writer per subtree; `_KDB.state` JSON-serialisable; no foreign writes. |
| 3 | `_____________KDB3API/.cursor/rules/runtime.mdc` | Ephemeral handles under `_KDB.runtime.<owner>`; teardown clears subscriptions then nulls runtime. |
| 4 | `_____________KDB3API/.cursor/rules/module-public-api.mdc` | Feature modules expose dispatch-style `mount` / `destroy` / `dispatch` / `getState` only where contracted; no extra granular reads on `_KDB.api.authoring`. |
| 5 | `_____________KDB3API/.cursor/rules/events.mdc` | Fact events after confirmed state; colon names; payloads serialisable. |
| 6 | `_____________KDB3API/.cursor/rules/feature-structure.mdc` | Folder roles, AMD one-factory-per-file, line targets vs hard limits, no nested functions in entry paths. |
| 7 | `_____________KDB3API/.cursor/rules/naming.mdc` | Slash actions vs colon events; underscore on boundary parameters. |
| 8 | `_____________KDB3API/.cursor/rules/error-handling.mdc` | `try`/`catch` on `mount`/`destroy` with `console.error` and documented error dispatch where applicable. |
| 9 | `_____________KDB3API/.cursor/rules/dom.mdc` | DOM mutations belong to owning module; kdbControl touches only its shell root for this modifier class. |
| 10 | `_____________KDB3API/.cursor/rules/amd.mdc` | `define([...], function (...) { ... })`; helpers at factory scope; no inline nested `function` inside `mount`/`destroy`/`dispatch` bodies. |
| 11 | `_____________KDB3API/.cursor/lifecycleVocabulary.md` | Authoring module may use minimal lifecycle if needed; kdbControl lifecycle unchanged. |
| 12 | `_____________KDB3API/contracts/_template.md` | Contract sections alignment for cross-refs (events, state, API). |
| 13 | `_____________KDB3API/contracts/kdbControl-authoring-mode-contractdelta.md` | CP-1: ownership, payloads, runtime keys, forbidden `KDB_authoringMod` / `state.kdbControl.authoringMode` as truth. |
| 14 | `_____________KDB3API/contracts/kdbControl.md` | kdbControl consumer-only; subscriptions on `authoringEntered` / `authoringExited`; teardown via `kdbControl.destroy()`. |
| 15 | This execution spec | Concrete file tree, harness steps, acceptance criteria, forbidden actions. |

---

## Section B — File tree and target line counts

**Line targets** follow `feature-structure.mdc` (orchestrator 40–80 target / 120 hard; executable JS 80–120 target / 150 hard unless noted).

```
TEST/kdbControl-port/
  authoring/
    __orchestratorAuthoring.js                    target ≤55 lines (orchestrator)
    createAuthoringController.js                 target ≤115 lines (controller factory)
    state/
      initialAuthoringState.js                   target ≤35 lines
      createAuthoringReducer.js                  target ≤75 lines
      selectors.js                               target ≤40 lines
    events/
      eventNames.js                              target ≤35 lines
    effects/
      publishAuthoringFacts.js                   target ≤70 lines
  kdbControl/
    authoringMode/
      __orchestratorAuthoringMode.js             target ≤95 lines (consumer wiring grows)
    createKdbControlController.js                target ≤120 lines (imports + destroy order; hard 150)
    events/
      eventNames.js                              target ≤45 lines (remove authoring strings if duplicated)
  harness/
    index.html                                   target ≤120 lines (add buttons + CSS link)
    harness.js                                   target ≤130 lines
    adapters/
      createMockKdb.js                           target ≤120 lines (real topic bus + state.authoring)
    css/
      kdb-control-authoring-harness.css          target ≤25 lines (visual-only for harness)
```

**No new files under:** `_____________KDB3API/.cursor/rules/`, `_______KDB3/`, production `KDB3/js/**` (except future work not in this tranche).

---

## Section C — Sandbox canonical event strings (CP-1 mapping)

- **Production target (document only):** `KDB3/js/core/events/authoringMode.js` re-exports `AUTHORING_ENTERED` / `AUTHORING_EXITED` string constants.
- **Sandbox canonical (this port):** `TEST/kdbControl-port/authoring/events/eventNames.js` defines the same two string values (`authoring:entered`, `authoring:exited`) and the same export names **`AUTHORING_ENTERED`**, **`AUTHORING_EXITED`** (mirror production module shape).
- **Emitting module (`authoring`)** imports event names from **`authoring/events/eventNames.js`** only.
- **`kdbControl` subscriber** imports the same module for subscribe handlers (port deviation: production subscriber imports `core/events/authoringMode.js`; sandbox has no `core/events` tree—single string source is **`authoring/events/eventNames.js`** to avoid duplicate literals).
- **Remove** `AUTHORING_ENTERED` / `AUTHORING_EXITED` from `kdbControl/events/eventNames.js` if present, so bus names are not owned in two places.

---

## Section D — Per-file specifications

### D1. `TEST/kdbControl-port/authoring/events/eventNames.js`

- **Role:** event string constants for the **`authoring`** emitter (sandbox canonical; maps to future `KDB3/js/core/events/authoringMode.js`).
- **AMD:** `define([], function () { "use strict"; return { AUTHORING_ENTERED: "authoring:entered", AUTHORING_EXITED: "authoring:exited" }; });`
- **Rules to apply:** `events.mdc` (colon-style names), `naming.mdc`, `amd.mdc`, `feature-structure.mdc`.

### D2. `TEST/kdbControl-port/authoring/state/initialAuthoringState.js`

- **Role:** initial state factory.
- **Return:** `function initialAuthoringState()` → `{ isAuthoring: false }`.
- **Rules to apply:** `state.mdc`, `amd.mdc`, `feature-structure.mdc`.

### D3. `TEST/kdbControl-port/authoring/state/createAuthoringReducer.js`

- **Role:** pure reducer for `_KDB.state.authoring`.
- **Imports:** `../events/eventNames` only if needed for no-op; prefer action types as string literals `authoring/enter` and `authoring/exit` in one `ACTION_TYPES` local object at factory scope **or** separate `authoring/config/actionTypes.js` if reducer would exceed line target (prefer single file first).
- **Behavior:**
  - Unknown action → return previous state reference unchanged (identity).
  - `authoring/enter`: if `isAuthoring === true`, return same reference; else next `{ isAuthoring: true }`.
  - `authoring/exit`: if `isAuthoring === false`, return same reference; else next `{ isAuthoring: false }`.
  - **No** `emit`, **no** DOM, **no** Cognos.
- **Rules to apply:** `state.mdc`, `naming.mdc` (slash actions), `amd.mdc`, `feature-structure.mdc`.

### D4. `TEST/kdbControl-port/authoring/state/selectors.js`

- **Role:** published selector registry (single export name per CP-1).
- **Export:** `function readIsAuthoring(_KDB)` returns boolean from `_KDB.state.authoring && _KDB.state.authoring.isAuthoring === true` (defensive `false` if subtree missing).
- **Rules to apply:** `state.mdc`, `module-public-api.mdc` (published read surface), `amd.mdc`, `feature-structure.mdc`.

### D5. `TEST/kdbControl-port/authoring/effects/publishAuthoringFacts.js`

- **Role:** emit fact events after state commit (called from controller only).
- **Factory scope helpers:** one function `function publishAuthoringFacts(_KDB, _prev, _next, _source)` where `_prev`/`_next` are full authoring state snapshots or minimal `{ isAuthoring }` per chosen signature (document in code comment ≤1 line).
- **Logic:** if `_prev.isAuthoring === _next.isAuthoring`, return. If `_next.isAuthoring === true`, `emit(AUTHORING_ENTERED, { isAuthoring: true, source: _source })`. Else `emit(AUTHORING_EXITED, { isAuthoring: false, source: _source })`.
- **Validate `source`:** must be one of `"cognos-ui"`, `"api"`, `"bootstrap"`; if invalid, **do not emit** and let controller surface dispatch error (see D6).
- **Rules to apply:** `events.mdc`, `error-handling.mdc` (guard bad payload), `amd.mdc`, `feature-structure.mdc`.

### D6. `TEST/kdbControl-port/authoring/createAuthoringController.js`

- **Role:** controller factory: `_KDB.api.authoring = { mount, destroy, dispatch, getState }`.
- **Imports:** `./state/initialAuthoringState`, `./state/createAuthoringReducer`, `./state/selectors` (only if `getState` reuses shape—`getState` must return **deep copy or frozen snapshot** of `_KDB.state.authoring` per contract; simplest: return `{ isAuthoring: !!_KDB.state.authoring.isAuthoring }` without adding new public granular methods), `./effects/publishAuthoringFacts`, `./events/eventNames` (only if needed in controller for error path—minimise imports).
- **`mount`:** `try` body: ensure `_KDB.state.authoring` from `initialAuthoringState()`; ensure `_KDB.runtime.authoring = {}` (empty object for future expansion; **no subscription registration** in this tranche); **no emit** on mount (initial `false` is not a transition).
- **`dispatch`:** validate action types; validate `payload.source` for enter/exit; on validation failure dispatch internal `authoring/error` **or** `console.error` + return without mutation (choose **one** pattern: prefer **`authoring/error` action** handled by reducer merging optional `lastError` **only if** it fits line budget—otherwise **no new state field**: `console.error` + return is acceptable for skeleton if documented in deviation; **preferred:** reducer `authoring/error` stub no-op to keep dispatch shape consistent).
- **On valid `authoring/enter` | `authoring/exit`:** `prev = _KDB.state.authoring`; `next = reduce(prev, action)`; assign `_KDB.state.authoring = next`; if `prev.isAuthoring !== next.isAuthoring`, call `publishAuthoringFacts(_KDB, prev, next, payload.source)`.
- **`destroy`:** `try` body: reset `_KDB.state.authoring` to `initialAuthoringState()`; set `_KDB.runtime.authoring = null`; **no emit** on destroy (contractdelta silent—avoid spurious `exited` unless product later requires; acceptance below does **not** require exit emit on destroy).
- **`getState`:** return read-only snapshot of `_KDB.state.authoring` only.
- **Forbidden:** any method like `getIsAuthoring()` on `_KDB.api.authoring`; consumers use **`readIsAuthoring(_KDB)`** import.
- **Rules to apply:** `module-public-api.mdc`, `state.mdc`, `runtime.mdc`, `error-handling.mdc`, `amd.mdc`, `feature-structure.mdc`.

### D7. `TEST/kdbControl-port/authoring/__orchestratorAuthoring.js`

- **Role:** thin registration: assign `_KDB.api.authoring` from `createAuthoringController(_KDB)`, then call **`_KDB.api.authoring.mount()` once** so harness order stays `createMockKdb` → `__orchestratorAuthoring` → `__orchestratorKdbControl` without an extra harness-only bootstrap button.
- **Rules to apply:** `kdb-object.mdc`, `amd.mdc`, `feature-structure.mdc`.

### D8. `TEST/kdbControl-port/kdbControl/authoringMode/__orchestratorAuthoringMode.js`

- **Role:** kdbControl **consumer** wiring only (runs inside `kdbControl` `mount` after `domRefs.rootEl` exists—today `_auth(_KDB)` runs after framework places shell; **verify** `rootEl` is set when `_auth` runs; if not, defer authoring DOM sync to end of framework orchestrator via **minimal** change: pass `{ dispatch, getState }` from controller **not allowed** without editing framework signature—**preferred fix:** invoke authoring wiring **last** inside `createKdbControlController.mount` after `_fw(...)` so `domRefs.rootEl` is populated, by **moving** `_auth(_KDB)` to after `_fw` in `createKdbControlController.js` per this spec).
- **Steps (factory-scope helper functions only):**
  1. `ensureAuthoringSubscriptions(_KDB)` — if `_KDB.runtime.kdbControl.subscriptions.authoringEntered` already set, return.
  2. Import **`readIsAuthoring`** from `../../authoring/state/selectors` (AMD path relative from `kdbControl/authoringMode/` → `../../authoring/state/selectors`).
  3. Import event constants from `../../authoring/events/eventNames`.
  4. `function syncAuthoringClassFromBoolean(_KDB, isAuthoring)` — resolves `var el = _KDB.runtime.kdbControl && _KDB.runtime.kdbControl.domRefs && _KDB.runtime.kdbControl.domRefs.rootEl`; if `el && el.classList`, toggle **`kdb-control--authoring`** to match `isAuthoring === true`.
  5. Initial: `syncAuthoringClassFromBoolean(_KDB, readIsAuthoring(_KDB))`.
  6. Subscribe `authoring:entered` / `authoring:exited`: handler reads `payload.isAuthoring` **or** falls back to literal for event kind; prefer **event kind** + `readIsAuthoring` double-check; must call `syncAuthoringClassFromBoolean`.
  7. Store unsubscribe functions under `_KDB.runtime.kdbControl.subscriptions.authoringEntered` and `.authoringExited` (values are **functions** matching existing `destroy` loop that calls each subscription entry).
- **Rules to apply:** `state.mdc` (no writes to `_KDB.state.authoring`), `runtime.mdc`, `dom.mdc`, `events.mdc`, `amd.mdc`, `feature-structure.mdc`.

### D9. `TEST/kdbControl-port/kdbControl/createKdbControlController.js`

- **Role:** reorder `mount` so **`_fw` runs before `_auth`**; keep `destroy` behavior (existing loop already clears all `subscriptions` entries).
- **Rules to apply:** `error-handling.mdc`, `runtime.mdc`, `amd.mdc`, `feature-structure.mdc`.

### D10. `TEST/kdbControl-port/kdbControl/events/eventNames.js`

- **Role:** remove authoring event constants if fully superseded by `authoring/events/eventNames.js`; ensure no remaining references in kdbControl break.

### D11. `TEST/kdbControl-port/harness/adapters/createMockKdb.js`

- **Role:** provide working in-memory bus: `subscribe(name, fn)` pushes listener; return `function unsubscribe() { ... }`; `emit(name, payload)` iterates copy of list.
- **State seed:** add `_KDB.state.authoring = { isAuthoring: false }`; **remove** `isAuthoring` from `state.dashboard` if present (supersession).
- **Rules to apply:** harness exception in `amd.mdc` (non-AMD IIFE allowed), no real Cognos calls.

### D12. `TEST/kdbControl-port/harness/harness.js`

- **Role:** after `createMockKdb`, `require` **`authoring/__orchestratorAuthoring`** (add `paths` alias `"authoring": "authoring"` or relative from `harness`—use same `baseUrl: ".."` pattern); call authoring orchestrator before `dashboard/canvas/kdbControl/__orchestratorKdbControl`.
- **Buttons:** `harness-authoring-enter`, `harness-authoring-exit` calling `_KDB.api.authoring.dispatch` with `{ type: "authoring/enter", payload: { source: "api" } }` and `{ type: "authoring/exit", payload: { source: "api" } }`.
- **Logging:** append lines for `readIsAuthoring` result after each dispatch (import selector via small AMD `require` callback or duplicate read via `getState` only on authoring—**prefer** dynamic `require(["authoring/state/selectors"], ...)` once to log `readIsAuthoring(_KDB)` to avoid duplicate truth); log **last event** by wrapping `emit` after mock created **optional**—simpler: log `_KDB.api.authoring.getState()` + explicit line "dispatch enter/exit clicked".
- **Rules to apply:** `amd.mdc` harness exception.

### D13. `TEST/kdbControl-port/harness/index.html`

- **Add:** stylesheet link `css/kdb-control-authoring-harness.css`.
- **Add:** two buttons next to existing harness controls; ids as in D12.
- **Rules to apply:** none from production DOM rules beyond accessibility basics.

### D14. `TEST/kdbControl-port/harness/css/kdb-control-authoring-harness.css`

- **Role:** when `#kdb-control-root.kdb-control--authoring`, apply obvious visual (e.g. `outline: 3px solid #f90`) for CP-2 manual verification.
- **Rules to apply:** harness-only; no legacy path edits.

---

## Section E — Authoring reducer / state / selectors / events / public API (skeleton summary)

| Layer | Responsibility |
|------|------------------|
| **State** | `_KDB.state.authoring = { isAuthoring: boolean }` |
| **Reducer** | Pure transitions for `authoring/enter`, `authoring/exit` |
| **Selectors** | `readIsAuthoring(_KDB)` only (published) |
| **Events** | After boolean commit, `publishAuthoringFacts` emits with `{ isAuthoring, source }` |
| **Public API** | `_KDB.api.authoring`: `mount`, `destroy`, `dispatch`, `getState` only |

**Dispatch action table**

| type | payload | Reducer / notes |
|------|---------|-----------------|
| `authoring/enter` | `{ source: SourceEnum }` | `isAuthoring` → `true` if changed |
| `authoring/exit` | `{ source: SourceEnum }` | `isAuthoring` → `false` if changed |

**`SourceEnum`:** `"cognos-ui"` \| `"api"` \| `"bootstrap"`.

---

## Section F — kdbControl consumer integration (files to touch)

| File | Change |
|------|--------|
| `kdbControl/createKdbControlController.js` | Run framework before authoring orchestrator in `mount`. |
| `kdbControl/authoringMode/__orchestratorAuthoringMode.js` | Implement subscribe + class sync + initial `readIsAuthoring`. |
| `kdbControl/events/eventNames.js` | Drop duplicated authoring event strings if unused. |

**Do not** add `_KDB.state.kdbControl.authoringMode` as truth. **Do not** use `KDB_authoringMod`.

---

## Section G — Harness acceptance scenarios

1. Load harness with order: `createMockKdb` → **`__orchestratorAuthoring`** (registers API **and** calls **`_KDB.api.authoring.mount()`**) → **`__orchestratorKdbControl`**.
2. Click **Mount** (kdbControl): log shows `readIsAuthoring === false`; DOM `#kdb-control-root` **lacks** `kdb-control--authoring`.
3. Click **Enter authoring**: state `true`; log shows event emission order: **state then log line**; class **present**.
4. Click **Exit authoring**: state `false`; class **absent**.
5. Click **Destroy** (kdbControl): subscriptions cleared; dispatch enter on bus **must not** mutate kdbControl DOM if destroy already ran (no throw; **no class updates** from kdbControl handlers—verify by optional emit after destroy in harness test sequence).

---

## Section H — Acceptance criteria (self-verify before handoff)

1. **`authoring` `mount`** initialises `_KDB.state.authoring.isAuthoring === false` and runtime bucket.
2. **Initial sync:** after `kdbControl.mount`, kdbControl root **does not** have `kdb-control--authoring`.
3. **Enter:** `dispatch(authoring/enter, { source: "api" })` commits `true`, emits `authoring:entered` with `{ isAuthoring: true, source: "api" }`, root gains **`kdb-control--authoring`**.
4. **Exit:** `dispatch(authoring/exit, { source: "api" })` commits `false`, emits `authoring:exited` with `{ isAuthoring: false, source: "api" }`, class removed.
5. **kdbControl `destroy`:** calls both unsubscribe fns and deletes keys; subsequent `emit` does not run kdbControl handlers (use counter or log in handler—manual harness check acceptable).
6. **No Cognos:** no `onDashboardUiStateChange`, no `cognosAPI.dashboard` usage in new authoring code.
7. **No header/footer/toolbox/settings** behavior changes in this tranche (subscriber is authoringMode orchestrator only).

---

## Section I — Forbidden actions

- No edits under `_____________KDB3API/.cursor/rules/`, no contract file edits except as separate CP.
- No **`_______KDB3/`** or production **`KDB3/js/**`** copies in this tranche.
- **No** canonical authoring state under `_KDB.state.kdbControl.authoringMode`.
- **No** `KDB_authoringMod`.
- **No** extra public methods on `_KDB.api.authoring` (including granular reads).
- **No** wiring header/footer/toolbox/settings to authoring events in this tranche.

---

## Section J — CP-1 resolutions (closed; formerly open questions)

1. **`authoring.destroy()`** emits **no** `authoring:exited` when `isAuthoring === true`. Destroy is **teardown/cleanup** only, not a user-visible authoring state transition; consumers must not treat destroy as an exit signal on the fact bus.
2. **`authoring/enter`** while **`isAuthoring === true`** performs **no** state change and **no** re-emit, **including** when `payload.source` differs from the prior transition. **No-dup** pattern aligned with legacy `syncAuthoringState` (same boolean → no event).
3. **`_KDB.api.authoring.getState()`** may return a **shallow clone** of the authoring slice for as long as that state stays **flat** (e.g. `isAuthoring`, optional `source` / `lifecycle` fields at the same object depth). If authoring state later gains **nested** objects, revise this rule and require a deeper snapshot or documented projection.

---

**Spec path:** `_____________KDB3API/contracts/kdbControl-authoring-mode-execution-spec.md`
