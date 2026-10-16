# Execution Spec: `core` (`production visual smoke: host selectors and visible shell`)

**Status:** Ready for execution  
**Module / contract:** `_____________KDB3API/contracts/core.md`  
**Phase:** production visual smoke  
**Authoring AI:** GPT-5.5, 2026-05-16  
**Executing AI:** pending  
**Reviewer:** user / supervising AI  

---

## Section A. Pre-flight read list

The executing AI must read each file below before producing output and must echo one concrete sentence per item.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — summary: `_KDB` has fixed top-level namespaces; no `apiContent` or ad hoc top-level keys.
2. `_____________KDB3API/.cursor/rules/state.mdc` — summary: host selectors and live DOM refs do not belong in `_KDB.state`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — summary: live DOM refs live under `_KDB.runtime.<owner>.domRefs`.
4. `_____________KDB3API/.cursor/rules/dom.mdc` — summary: selector strings live under `_KDB.elements.selectors.*`, live nodes under runtime.
5. `_____________KDB3API/.cursor/rules/amd.mdc` — summary: production JS remains explicit AMD modules.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — summary: core wiring is thin; feature modules own their own mount/runtime cleanup.
7. `_____________KDB3API/.cursor/rules/error-handling.mdc` — summary: lifecycle and DOM placement boundaries must fail visibly with contextual logs.
8. `_____________KDB3API/contracts/core.md` — summary: core bootstrap owns `_KDB` shape and calls feature mounts.
9. `_____________KDB3API/KDB3/js/KDB.js` — summary: imports core factories, registers feature modules in `setupCore`, then mounts them in `startModules`.
10. `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/framework/placeControlShell.js` — summary: currently resolves kdbControl mount root locally.
11. `_____________KDB3API/KDB3/js/dashboard/header/createHeaderController.js` — summary: current `mount(options)` stores `options.mountTarget`.
12. `_____________KDB3API/KDB3/js/dashboard/footer/createFooterController.js` — summary: current `mount(options)` stores `options.mountTarget`.
13. `_____________KDB3API/KDB3/js/dashboard/header/dom/placeHeader.js` — summary: current placement appends header to mount target.
14. `_____________KDB3API/KDB3/js/dashboard/footer/dom/placeFooter.js` — summary: current placement appends footer to mount target.
15. This execution spec.

The executing AI's first output must be the 15 echoed summaries.

---

## Section B. Folder tree

Create or update only these production files:

```txt
_____________KDB3API/KDB3/js/
  KDB.js
  core/
    cognosHost/
      registerCognosHostSelectors.js
  dashboard/
    canvas/kdbControl/framework/placeControlShell.js
    header/__orchestratorHeader.js
    header/createHeaderController.js
    header/dom/placeHeader.js
    footer/__orchestratorFooter.js
    footer/createFooterController.js
    footer/dom/placeFooter.js
```

No CSS files, assets, contracts, rules, TEST files or legacy files are modified in this tranche.

---

## Section C. Per-file specifications

#### `_____________KDB3API/KDB3/js/core/cognosHost/registerCognosHostSelectors.js`

- **Role:** core host selector registration.
- **Lines:** target 20-35.
- **AMD imports:** none.
- **Factory parameters:** none.
- **Entry function:** `registerCognosHostSelectors(_KDB)`.
- **Body steps:**
  1. Ensure `_KDB.elements` exists.
  2. Ensure `_KDB.elements.selectors` exists.
  3. Assign `_KDB.elements.selectors.host` with exactly:
     ```js
     {
       kdbWidgetMountRoot: ".KDB3Widget",
       headerMountRoot: ".pageViewContent",
       footerMountRoot: ".ba-common-tabList__container"
     }
     ```
  4. Return `_KDB.elements.selectors.host`.
- **Rules to apply:**
  - `dom.mdc` — selector strings only under `_KDB.elements.selectors.host`; no live nodes.
  - `kdb-object.mdc` — no new top-level namespaces.
  - `amd.mdc` — full-compact AMD and one returned function.
  - `naming.mdc` — English technical names.

#### `_____________KDB3API/KDB3/js/KDB.js`

- **Role:** import and call central host selector registration.
- **Required changes:**
  1. Add AMD dependency `"./core/cognosHost/registerCognosHostSelectors.js"` and matching factory parameter `_registerCognosHostSelectors`.
  2. In `setupCoreFactories(_KDB)`, call `_registerCognosHostSelectors(_KDB)` before `_orchestratorCognosAPI(_KDB)` and before `registerFeatureModules(_KDB)`.
  3. In `createRuntimeCore(_options)`, store `options.parent` or `options.content` as a live ref under `_KDB.runtime.core.domRefs.renderParentEl`.
  4. If keeping `hostContent` for existing code, it must be an alias of the same live ref, not a separate source of truth.
  5. Do not inline `.KDB3Widget`, `.pageViewContent` or `.ba-common-tabList__container` in `KDB.js`.
- **Rules to apply:**
  - `kdb-object.mdc` — no `apiContent`; raw features stay in `_KDB.runtime.core.adapters`.
  - `runtime.mdc` — live render parent is under `_KDB.runtime.core.domRefs`.
  - `dom.mdc` — selector values are registered by the core host selector module, not inline here.
  - `amd.mdc` — keep AMD shape and return `class KDB`.
  - `feature-structure.mdc` — keep `KDB.js` thin; no feature-specific DOM logic.

#### `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/framework/placeControlShell.js`

- **Role:** resolve and store kdbControl production mount target.
- **Required behavior:**
  1. Read selector from `_KDB.elements.selectors.host.kdbWidgetMountRoot`.
  2. Resolve live mount target via `document.querySelector(selector)`.
  3. If not found, fallback to `_KDB.runtime.core.domRefs.renderParentEl`.
  4. Store live mount target under `_KDB.runtime.kdbControl.domRefs.mountTargetEl`.
  5. Append shell to the mount target only if `_shell.parentNode !== mountTarget`.
  6. Continue storing `placedShell`, `rootEl`, `contentEl`, `arrowEl`, etc. as today.
  7. Do not use `_KDB.elements.controlRoot`.
  8. Do not use `_KDB.elements.selectors.kdbControl.rootSelector` as a Cognos host mount selector.
- **Rules to apply:**
  - `dom.mdc` — selector string comes from `_KDB.elements.selectors.host`; live ref goes to `_KDB.runtime.kdbControl.domRefs.mountTargetEl`.
  - `runtime.mdc` — owner stores and cleans up its own runtime refs.
  - `error-handling.mdc` — if no mount target exists, log `console.warn("[kdbControl.placeControlShell] mount target not found")` and return without throwing.
  - `amd.mdc` — preserve AMD module shape.

#### `_____________KDB3API/KDB3/js/dashboard/header/__orchestratorHeader.js`

- **Role:** initialize header state/runtime/API without hardcoding mock selectors.
- **Required changes:**
  1. Remove `"#mock-dashboard-header-mount"` from production code.
  2. Do not write `_KDB.elements.selectors.header.mountRootSelector`.
  3. Keep runtime buckets and API registration unchanged.
- **Rules to apply:**
  - `dom.mdc` — Cognos host selector belongs under `_KDB.elements.selectors.host`, not module selector config.
  - `feature-structure.mdc` — orchestrator is wiring only.

#### `_____________KDB3API/KDB3/js/dashboard/footer/__orchestratorFooter.js`

- **Role:** initialize footer state/runtime/API without hardcoding mock selectors.
- **Required changes:**
  1. Remove `"#mock-dashboard-footer-mount"` from production code.
  2. Do not write `_KDB.elements.selectors.footer.mountRootSelector`.
  3. Keep runtime buckets and API registration unchanged.
- **Rules to apply:**
  - `dom.mdc` — Cognos host selector belongs under `_KDB.elements.selectors.host`, not module selector config.
  - `feature-structure.mdc` — orchestrator is wiring only.

#### `_____________KDB3API/KDB3/js/dashboard/header/createHeaderController.js`

- **Role:** resolve header mount target from central host selector during mount.
- **Required changes:**
  1. Add factory-scope helper `resolveHeaderMountTarget(_KDB, _options)`.
  2. It first uses `document.querySelector(_KDB.elements.selectors.host.headerMountRoot)`.
  3. If not found, fallback to `_options.mountTarget` when it is a DOM node.
  4. Store result in `_KDB.runtime.header.mountTargetEl`.
  5. Do not use `#mock-dashboard-header-mount`.
- **Rules to apply:**
  - `dom.mdc` — central host selector; live ref in header runtime.
  - `error-handling.mdc` — mount remains wrapped in `try/catch`.
  - `amd.mdc` — helper is factory-scope, not nested.

#### `_____________KDB3API/KDB3/js/dashboard/header/dom/placeHeader.js`

- **Role:** legacy-equivalent header placement.
- **Required behavior:**
  1. If `mountTarget.firstChild` exists, use `mountTarget.insertBefore(rootEl, mountTarget.firstChild)`.
  2. Otherwise use `mountTarget.appendChild(rootEl)`.
  3. Do not query the document here; placement receives a resolved live target.
- **Rules to apply:**
  - `dom.mdc` — placer receives live target and only places DOM.
  - `feature-structure.mdc` — placer does not resolve selectors or mutate state.

#### `_____________KDB3API/KDB3/js/dashboard/footer/createFooterController.js`

- **Role:** resolve footer mount target from central host selector during mount.
- **Required changes:**
  1. Add factory-scope helper `resolveFooterMountTarget(_KDB, _options)`.
  2. It first uses `document.querySelector(_KDB.elements.selectors.host.footerMountRoot)`.
  3. If not found, fallback to `_options.mountTarget` when it is a DOM node.
  4. Store result in `_KDB.runtime.footer.mountTargetEl`.
  5. Do not use `#mock-dashboard-footer-mount`.
- **Rules to apply:**
  - `dom.mdc` — central host selector; live ref in footer runtime.
  - `error-handling.mdc` — mount remains wrapped in `try/catch`.
  - `amd.mdc` — helper is factory-scope, not nested.

#### `_____________KDB3API/KDB3/js/dashboard/footer/dom/placeFooter.js`

- **Role:** legacy-equivalent footer placement.
- **Required behavior:**
  1. Use `mountTarget.appendChild(rootEl)`.
  2. Do not query the document here; placement receives a resolved live target.
  3. Keep existing no-op behavior when target or root is missing.
- **Rules to apply:**
  - `dom.mdc` — placer places only.
  - `feature-structure.mdc` — no selector resolution or state mutation.

---

## Section D. Reducer behavior table

No reducers are changed in this tranche.

| Reducer | Required behavior |
|---|---|
| n/a | n/a |

---

## Section E. Published selectors

No module selectors are added. This tranche adds only `_KDB.elements.selectors.host` through core bootstrap.

| Selector namespace | Keys |
|---|---|
| `_KDB.elements.selectors.host` | `kdbWidgetMountRoot`, `headerMountRoot`, `footerMountRoot` |

---

## Section F. Public API wiring

No public API methods are added or removed.

Expected public surfaces after this tranche:

- `_KDB.api.header`
- `_KDB.api.footer`
- `_KDB.api.kdbControl`

No `_KDB.api.core`, `_KDB.api.authoring`, `apiContent`, table service or history service is introduced.

---

## Section G. Harness HTML spec

No harness is created or modified.

---

## Section H. Harness JS spec

No harness JS is created or modified.

---

## Section I. Mock extensions

No mocks are created or modified.

---

## Section J. Acceptance criteria

1. `core/cognosHost/registerCognosHostSelectors.js` exists and registers only `_KDB.elements.selectors.host`.
2. `KDB.js` imports and calls `_registerCognosHostSelectors(_KDB)` inside `setupCoreFactories` before feature module registration.
3. `KDB.js` has no inline `.KDB3Widget`, `.pageViewContent` or `.ba-common-tabList__container` strings.
4. `KDB.js` stores Cognos render parent under `_KDB.runtime.core.domRefs.renderParentEl`.
5. No `apiContent` top-level namespace is introduced.
6. `header` and `footer` orchestrators no longer contain `#mock-dashboard-header-mount` or `#mock-dashboard-footer-mount`.
7. `kdbControl` placement reads `_KDB.elements.selectors.host.kdbWidgetMountRoot` and stores the live target at `_KDB.runtime.kdbControl.domRefs.mountTargetEl`.
8. `header` mount reads `_KDB.elements.selectors.host.headerMountRoot`, stores live target at `_KDB.runtime.header.mountTargetEl`, and `placeHeader` uses `insertBefore(..., firstChild)` when possible.
9. `footer` mount reads `_KDB.elements.selectors.host.footerMountRoot`, stores live target at `_KDB.runtime.footer.mountTargetEl`, and `placeFooter` uses append.
10. No live DOM refs are stored under `_KDB.elements`.
11. No CSS, assets, contracts, rules, TEST files or legacy files are modified.
12. No ES `import` / `export` syntax is introduced.
13. `ReadLints` is clean on all changed JS files.
14. Browser CP-2 console check after deployment:
    ```js
    const k = getKDB();
    console.log(k.elements.selectors.host);
    console.log(k.runtime.kdbControl.domRefs.mountTargetEl, document.querySelector("#kdb-control-root"));
    console.log(k.runtime.header.mountTargetEl, k.runtime.footer.mountTargetEl);
    ```
    Expected: host selector object present, kdbControl root exists, and all mount target refs are non-null unless the Cognos host page lacks the corresponding region.

---

## Section K. Forbidden actions

The executing AI must not:

- Modify `.mdc` rules, contracts, templates, TEST files or legacy trees.
- Add `apiContent`.
- Add live DOM refs under `_KDB.elements`.
- Inline Cognos host selectors anywhere outside `core/cognosHost/registerCognosHostSelectors.js`.
- Reintroduce `#mock-dashboard-header-mount` or `#mock-dashboard-footer-mount`.
- Add CSS, assets, services, data-query code, table loading or authoring bootstrap.
- Change feature behavior beyond resolving mount targets and placement.
- Commit, push or change git config.

---

## Section L. Reporting template

The executing AI final response must include:

1. **Pre-flight echo** — 15 summaries from Section A.
2. **File checklist** — every changed/created file with line count and `matches spec | deviation`.
3. **Selector placement audit** — where each host selector is registered and where each live mount target is stored.
4. **Forbidden scan** — results for `apiContent`, `#mock-dashboard`, `.KDB3Widget`, `.pageViewContent`, `.ba-common-tabList__container`, `TEST`, `harness`, `_______KDB3`.
5. **Self-verification** — pass/fail for every Section J criterion.
6. **Open questions** — only if a Cognos host selector could not be applied without a scope decision.

---

## Section M. Reviewer handoff

The supervising AI must:

1. Read all changed files.
2. Verify host selectors occur only in `core/cognosHost/registerCognosHostSelectors.js`.
3. Verify no live DOM refs are placed under `_KDB.elements`.
4. Run `ReadLints` on changed JS.
5. Ask the user for CP-2 browser verification with the console snippet in Section J.
