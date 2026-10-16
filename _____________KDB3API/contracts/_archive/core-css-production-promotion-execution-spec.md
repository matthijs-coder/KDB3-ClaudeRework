# Execution Spec: `core` (`CSS production promotion for visual smoke`)

**Status:** Ready for execution  
**Module / contract:** `_____________KDB3API/contracts/core.md`  
**Phase:** CSS production promotion after visible shell smoke  
**Authoring AI:** GPT-5.5, 2026-05-16  
**Executing AI:** pending  
**Reviewer:** user / supervising AI  

---

## Section A. Pre-flight read list

The executing AI must read each file below before producing output and must echo one concrete sentence per item.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — summary: `_KDB` namespaces are fixed; CSS loading must not add ad hoc top-level keys.
2. `_____________KDB3API/.cursor/rules/runtime.mdc` — summary: runtime technical records live under `_KDB.runtime.<owner>`.
3. `_____________KDB3API/.cursor/rules/dom.mdc` — summary: DOM nodes and link elements are runtime refs, not `_KDB.elements` or `_KDB.state`.
4. `_____________KDB3API/.cursor/rules/amd.mdc` — summary: production JS remains explicit AMD modules.
5. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — summary: loader files should be small, focused and placed under core ownership.
6. `_____________KDB3API/.cursor/rules/error-handling.mdc` — summary: CSS injection is a bootstrap boundary and must log contextual failures.
7. `_____________KDB3API/KDB3/js/KDB.js` — summary: current core setup calls selector registration, Cognos API orchestration and feature registration.
8. `_______KDB3/KDB3/js/core/bootstrap/cssLinks/addCssLinks.js` — summary: legacy pattern injects stylesheet links with duplicate prevention.
9. `_______KDB3/KDB3/js/core/bootstrap/cssLinks/config/cssHrefList.js` — summary: legacy CSS hrefs use `./v1/ext/KDB3/css/...`.
10. `TEST/kdbControl-port/harness/index.html` — summary: harness loads the CSS slices that currently match promoted kdbControl/header/footer DOM.
11. This execution spec.

The first output must be the 11 echoed summaries. Only after that may files be created.

---

## Section B. Folder tree

Create or update only these paths:

```txt
_____________KDB3API/KDB3/
  css/
    header.css
    footer.css
    kdb-control-base.css
    kdb-control-authoring.css
    kdb-control-framework/
      shell.css
      header.css
      panels.css
      form-controls.css
      toggle-button.css
      form-controls-radios.css
      action-buttons.css
      form-controls-focus.css
  js/
    KDB.js
    core/
      css/
        __orchestratorCss.js
        addCssLinks.js
        config/cssHrefList.js
```

Do not create CSS files from `TEST/css/` in this tranche. That folder is not the chosen source for the promoted DOM.

---

## Section C. Source-to-target CSS mapping

Copy these files from `TEST/kdbControl-port/harness/css/` to `_____________KDB3API/KDB3/css/`:

| Source | Target |
|---|---|
| `header.css` | `header.css` |
| `footer.css` | `footer.css` |
| `kdb-control-harness-base.css` | `kdb-control-base.css` |
| `kdb-control-authoring-harness.css` | `kdb-control-authoring.css` |
| `kdb-control-framework/shell.css` | `kdb-control-framework/shell.css` |
| `kdb-control-framework/header.css` | `kdb-control-framework/header.css` |
| `kdb-control-framework/panels.css` | `kdb-control-framework/panels.css` |
| `kdb-control-framework/form-controls.css` | `kdb-control-framework/form-controls.css` |
| `kdb-control-framework/toggle-button.css` | `kdb-control-framework/toggle-button.css` |
| `kdb-control-framework/form-controls-radios.css` | `kdb-control-framework/form-controls-radios.css` |
| `kdb-control-framework/action-buttons.css` | `kdb-control-framework/action-buttons.css` |
| `kdb-control-framework/form-controls-focus.css` | `kdb-control-framework/form-controls-focus.css` |

Do not copy the parity-slice files (`kdb-control-framework-parity-slice*.css`) unless their selectors are not already represented in the framework folder files. If a slice is required, stop and report which selector block is missing before adding it.

---

## Section D. CSS cleanup rules

For copied production CSS:

1. Remove harness-only selectors and blocks:
   - `#mock-dashboard-frame`
   - `#mock-dashboard-header-mount`
   - `#mock-dashboard-footer-mount`
   - `#harness-debug-log`
2. Remove or rewrite comments that mention `harness`, `TEST`, or legacy paths.
3. Keep required production class selectors:
   - `.KDB_visible`
   - `.kdb-control_content_hidden`
   - `.kdb-control__panel`
   - `.kdb-control--authoring`
   - header/footer/kdbControl class selectors used by promoted DOM.
4. Do not introduce `@import`.
5. Do not reference `_______KDB3`, `TEST`, `harness`, mock IDs, or local filesystem paths.
6. Do not add global body/html sizing rules from the harness inline `<style>` block.

---

## Section E. JS loader files

#### `_____________KDB3API/KDB3/js/core/css/config/cssHrefList.js`

- **Role:** list production CSS hrefs.
- **AMD imports:** none.
- **Return value:** array of strings in load order:

```js
[
  "./v1/ext/KDB3/css/header.css",
  "./v1/ext/KDB3/css/footer.css",
  "./v1/ext/KDB3/css/kdb-control-base.css",
  "./v1/ext/KDB3/css/kdb-control-framework/shell.css",
  "./v1/ext/KDB3/css/kdb-control-framework/header.css",
  "./v1/ext/KDB3/css/kdb-control-framework/panels.css",
  "./v1/ext/KDB3/css/kdb-control-framework/form-controls.css",
  "./v1/ext/KDB3/css/kdb-control-framework/toggle-button.css",
  "./v1/ext/KDB3/css/kdb-control-framework/form-controls-radios.css",
  "./v1/ext/KDB3/css/kdb-control-framework/action-buttons.css",
  "./v1/ext/KDB3/css/kdb-control-framework/form-controls-focus.css",
  "./v1/ext/KDB3/css/kdb-control-authoring.css"
]
```

- **Rules to apply:** `amd.mdc`, `feature-structure.mdc`, `naming.mdc`.

#### `_____________KDB3API/KDB3/js/core/css/addCssLinks.js`

- **Role:** inject stylesheet links once.
- **AMD imports:** none.
- **Entry function:** `addCssLinks(_KDB, _cssHrefList)`.
- **Required behavior:**
  1. Validate `_cssHrefList` is an array; no-op otherwise.
  2. For each href, skip if falsy or already present as `link[rel="stylesheet"][href="<href>"]`.
  3. Create `<link rel="stylesheet" href="<href>">` and append to `document.head`.
  4. Store created link elements under `_KDB.runtime.core.domRefs.cssLinks` as an array.
  5. Wrap injection in `try/catch`, log `console.error("[core.css.addCssLinks] failed", error)`, then rethrow.
- **Rules to apply:** `dom.mdc` (link live refs under runtime), `runtime.mdc`, `error-handling.mdc`, `amd.mdc`.

#### `_____________KDB3API/KDB3/js/core/css/__orchestratorCss.js`

- **Role:** thin CSS loader orchestrator.
- **AMD imports:**
  - `"./config/cssHrefList.js"`
  - `"./addCssLinks.js"`
- **Entry function:** `__orchestrator(_KDB)`.
- **Body:** call `_addCssLinks(_KDB, _cssHrefList)` and return nothing.
- **Rules to apply:** `feature-structure.mdc`, `amd.mdc`.

---

## Section F. `KDB.js` integration

Update `_____________KDB3API/KDB3/js/KDB.js`:

1. Add AMD dependency `"./core/css/__orchestratorCss.js"` and factory parameter `_orchestratorCss`.
2. In `setupCoreFactories(_KDB)`, call `_orchestratorCss(_KDB)` after `_registerCognosHostSelectors(_KDB)` and before feature module registration.
3. Do not inline CSS hrefs in `KDB.js`.
4. Do not add a new `_KDB.css`, `_KDB.assets`, or other top-level namespace.
5. Keep `class KDB` and existing setup/start lifecycle.

`KDB.js` may exceed the normal 150-line executable limit for this wiring-only change, up to the approved 500-line `KDB.js` limit in `core.md` Section 9.1. Stop and report only if the change would add non-wiring behavior or push `KDB.js` above 500 lines.

---

## Section G. Acceptance criteria

1. All CSS files from Section B exist under `_____________KDB3API/KDB3/css/`.
2. CSS loader files exist under `_____________KDB3API/KDB3/js/core/css/`.
3. `KDB.js` imports and calls `__orchestratorCss`.
4. CSS href list contains only `./v1/ext/KDB3/css/...` paths.
5. No CSS file contains `TEST`, `harness`, `_______KDB3`, `mock-dashboard`, `#harness-debug-log`, or `@import`.
6. No CSS files from `TEST/css/` are copied.
7. `addCssLinks.js` prevents duplicate links.
8. Created link elements are stored only under `_KDB.runtime.core.domRefs.cssLinks`.
9. No live DOM refs are stored under `_KDB.elements`.
10. No feature behavior, reducers, public APIs, events or state shapes are changed.
11. `ReadLints` is clean on changed JS files.
12. Browser CP-2 check after deployment:
    ```js
    const k = getKDB();
    console.log(k.runtime.core.domRefs.cssLinks && k.runtime.core.domRefs.cssLinks.length);
    console.log(document.querySelector("#kdb-control-root"));
    ```
    Expected: CSS links count equals the href list length, and the kdbControl root remains present and visibly styled.

---

## Section H. Forbidden actions

The executing AI must not:

- Modify `.mdc` rules, contracts, templates, TEST files or legacy trees.
- Copy `TEST/css/kdbControl.css`, `TEST/css/toggleButton.css`, or `TEST/css/harness.css`.
- Add CSS libraries or legacy full CSS bundles.
- Add `@import` to CSS.
- Modify feature JS beyond `KDB.js` loader integration.
- Add services, APIs, state, events or Cognos wrappers.
- Add live DOM refs under `_KDB.elements`.
- Commit, push or change git config.

---

## Section I. Reporting template

The executing AI final response must include:

1. **Pre-flight echo** — 11 summaries from Section A.
2. **File checklist** — each copied/created/modified file with line count.
3. **CSS cleanup report** — confirm harness/mock/legacy strings removed.
4. **Loader report** — href list and `KDB.js` call location.
5. **Self-verification** — pass/fail for every Section G criterion.
6. **Open questions** — only if a CSS source file cannot be promoted without a scope decision.

---

## Section J. Reviewer handoff

The supervising AI must:

1. Verify CSS files and loader files exist.
2. Search promoted CSS for forbidden strings.
3. Run `ReadLints` on changed JS.
4. Ask the user for CP-2 browser visual verification.
