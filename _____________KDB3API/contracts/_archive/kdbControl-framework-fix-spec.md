# Fix Spec: `kdbControl` framework tranche 1 review deviations

This is the single allowed focused fix iteration after review of `kdbControl-framework-execution-spec.md`.

Do not add new behavior. Fix only the deviations listed below, then report using Section D.

---

## A. Files in scope

Only these files may be changed:

```txt
TEST/kdbControl-port/kdbControl/createKdbControlController.js
TEST/kdbControl-port/kdbControl/state/createKdbControlReducer.js
TEST/kdbControl-port/kdbControl/framework/bindFrameworkView.js
TEST/kdbControl-port/kdbControl/framework/bindFrameworkCollapse.js
TEST/kdbControl-port/kdbControl/framework/bindFrameworkTopToggles.js
TEST/kdbControl-port/kdbControl/framework/bindFrameworkSectionToggles.js
TEST/kdbControl-port/kdbControl/framework/bindFrameworkPrimitiveVisuals.js
TEST/kdbControl-port/kdbControl/framework/syncFrameworkViewFromState.js
```

You may touch another `TEST/kdbControl-port/kdbControl/**` file only if it is strictly necessary to move the framework context into runtime; report that as a deviation with motivation.

---

## B. Deviations to fix

### D1 — File-size failures caused by blank-line inflation

Several files exceed the execution-spec hard limits because blank lines were inserted between nearly every statement.

Required fix:

- Remove unnecessary blank lines from all files in scope.
- Keep readability, but do not pad every statement.
- Do not change behavior while formatting.

Hard limits to satisfy:

| File | Hard limit |
|---|---:|
| `createKdbControlController.js` | 150 |
| `state/createKdbControlReducer.js` | 150 |
| `framework/bindFrameworkPrimitiveVisuals.js` | 140 |
| `framework/syncFrameworkViewFromState.js` | 150 |
| all other files in scope | their original execution-spec limits |

Rules cited:

- `feature-structure.mdc` — JS executable files target 80-120 lines, hard limit 150 without approval.
- `kdbControl-framework-execution-spec.md` Section J — no file exceeds its declared line limit.

### D2 — Nested listener functions inside `__controller`

`bindFrameworkCollapse.js`, `bindFrameworkTopToggles.js`, and `bindFrameworkSectionToggles.js` define `clickFn` / `keyFn` inside `__controller`. This violates the AMD full-compact rule.

Required fix:

- Move listener functions to AMD factory scope.
- Do not define functions inside `__controller`, callbacks, return paths, or executable flow.
- Keep listener cleanup through the existing `AbortSignal`.
- Preserve behavior: click / Enter / Space dispatches the same framework action and syncs the view.

Allowed pattern:

```js
function onClick(_event) {
  const ctx = readContextFromRuntime(...);
  // dispatch + sync
}

function __controller(_ctx, _signal) {
  storeContextInRuntime(_ctx);
  element.addEventListener("click", onClick, { signal: _signal });
}
```

Rules cited:

- `amd.mdc` — named helpers live at AMD factory scope; no inline or nested subfunction definitions inside entry bodies or callbacks.
- `dom.mdc` — listener bodies stay thin and delegate to dispatch/sync.
- `runtime.mdc` — listener cleanup is via the passed `AbortSignal`.

### D3 — Framework context stored as DOM expando

`contentEl.__kdbFrameworkCtx = ctx` stores runtime context on a live DOM node. That context includes `_KDB`, `dispatch`, `getState`, and `syncView`.

Required fix:

- Store the framework context under `_KDB.runtime.kdbControl.domRefs.frameworkContext` or a more precise owner-private runtime field under `_KDB.runtime.kdbControl`.
- Do not store functions or runtime context on DOM node expandos.
- If event handlers need context, resolve it from owner runtime, not from `event.currentTarget.__kdbFrameworkCtx`.
- Ensure `destroy()` cleanup removes or nulls the context before `_KDB.runtime.kdbControl = null`.

Rules cited:

- `runtime.mdc` — runtime resources and technical objects live under `_KDB.runtime.<owner>`.
- `dom.mdc` — live DOM refs live under runtime `domRefs`; DOM nodes are not used as storage for module runtime context.
- `state.mdc` — context contains functions and must not enter state.

---

## C. Acceptance criteria

1. All files in scope are below their hard line limit.
2. No function declarations occur inside `__controller` bodies in `bindFrameworkCollapse.js`, `bindFrameworkTopToggles.js`, or `bindFrameworkSectionToggles.js`.
3. No `__kdbFrameworkCtx` or other custom framework-context expando remains on DOM nodes.
4. Framework context is owner-private runtime, not state and not `_KDB.elements`.
5. `AbortController` remains under `_KDB.runtime.kdbControl.abortControllers.frameworkView`.
6. `destroy()` still runs cleanup in this order: subscriptions, abortControllers, DOM detach / listener cleanup, reducer destroy, runtime null.
7. No new behavior, events, Cognos calls, services, public API methods, or foreign state writes are added.
8. `ReadLints` on touched files is clean.

---

## D. Reporting template

Report back with:

1. File checklist with line counts after fix.
2. Confirmation for D1, D2, D3.
3. Pass/fail for each acceptance criterion C1-C8.
4. Any deviation, with path and motivation.

