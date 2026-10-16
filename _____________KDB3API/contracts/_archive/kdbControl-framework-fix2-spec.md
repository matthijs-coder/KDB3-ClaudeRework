# Fix Spec 2: `kdbControl` framework runtime-context cleanup

This second focused fix iteration is explicitly approved by the user after escalation on 2026-05-12.

Fix only the remaining D3 deviation from the first fix review: factory-scope `WeakMap` runtime-context storage in framework binders.

---

## A. Files in scope

Only these files may be changed:

```txt
TEST/kdbControl-port/kdbControl/framework/bindFrameworkCollapse.js
TEST/kdbControl-port/kdbControl/framework/bindFrameworkTopToggles.js
TEST/kdbControl-port/kdbControl/framework/bindFrameworkSectionToggles.js
TEST/kdbControl-port/kdbControl/framework/bindFrameworkPrimitiveVisuals.js
```

Do not change behavior, state shape, public API, harness, reducer, controller, contract, rules, templates or legacy files.

---

## B. Required fix

Remove all factory-scope `WeakMap` context storage from the four files in scope.

Current problem:

- `collapseArrowToFrameworkCtx`, `topTogglesElToFrameworkCtx`, `sectionContentElToFrameworkCtx`, and `primitiveContentElToKdb` store runtime context outside `_KDB.runtime.kdbControl`.
- This violates the intent of `runtime.mdc` and `dom.mdc`: technical runtime objects belong owner-private under `_KDB.runtime.<owner>`, not in module-scope lookup maps keyed by DOM nodes.

Required target:

- Keep the canonical context at `_KDB.runtime.kdbControl.frameworkBindContext`, already created by `bindFrameworkView.js`.
- Event handlers must resolve context from owner runtime.
- Because factory-scope handlers receive only the DOM event, add one minimal AMD-factory-scope module variable per file if needed:
  - `var kdbForFrameworkCollapse = null;`
  - `var kdbForFrameworkTopToggles = null;`
  - `var kdbForFrameworkSectionToggles = null;`
  - `var kdbForFrameworkPrimitives = null;`
- In each `__controller(_ctx, _signal)`, assign that variable from `_ctx._KDB`.
- Add a factory-scope helper like:

```js
function readFrameworkBindContext(_KDB) {
  return _KDB &&
    _KDB.runtime &&
    _KDB.runtime.kdbControl &&
    _KDB.runtime.kdbControl.frameworkBindContext;
}
```

- Handlers call `readFrameworkBindContext(kdbForFramework...)`.
- Do not store context on DOM nodes.
- Do not use `WeakMap`.
- Do not define functions inside `__controller`.

This module-scope `_KDB` pointer is tolerated only as a minimal bridge for AMD factory-scope handlers in this sandbox tranche. The authoritative context remains `_KDB.runtime.kdbControl.frameworkBindContext`, and `destroy()` already nulls it before `_KDB.runtime.kdbControl = null`.

---

## C. Rules to apply

- `runtime.mdc` — framework context lives under `_KDB.runtime.kdbControl.frameworkBindContext`; no owner runtime context in `WeakMap`.
- `dom.mdc` — no DOM expandos and no DOM-keyed context storage; DOM nodes are interacted with, not used as context stores.
- `amd.mdc` — handlers remain AMD factory-scope; no nested listener functions inside `__controller`.
- `state.mdc` — no runtime context or functions enter `_KDB.state`.

---

## D. Acceptance criteria

1. `rg "WeakMap|__kdbFrameworkCtx" TEST/kdbControl-port/kdbControl/framework` returns no matches.
2. The only framework context storage is `_KDB.runtime.kdbControl.frameworkBindContext`.
3. No new `function ...` declarations inside `__controller` bodies.
4. Existing listener behavior is preserved:
   - collapse click/key toggles collapse state;
   - top toggles select `metrics`, `toolbox`, `settings`;
   - section toggles update `openSectionId`;
   - placeholder input/radio/dropdown updates placeholder state.
5. No new events, Cognos calls, services, public API methods, foreign writes or `controlDefinitions[]`.
6. Files remain under their hard line limits.
7. `ReadLints` on touched files is clean.

---

## E. Reporting template

Report:

1. File checklist with line counts.
2. Confirmation that `WeakMap` and DOM expandos are gone.
3. Confirmation that handlers read `_KDB.runtime.kdbControl.frameworkBindContext`.
4. Pass/fail for D1-D7.
5. Deviations, or `none`.

