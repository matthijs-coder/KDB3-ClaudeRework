# Execution Spec: `core` (`module promotion for bootstrap tranche 1`)

**Status:** Ready for execution  
**Module / contract:** `_____________KDB3API/contracts/core.md`  
**Phase:** module promotion after core bootstrap tranche 1  
**Authoring AI:** GPT-5.5, 2026-05-16  
**Executing AI:** pending  
**Reviewer:** user / supervising AI  

---

## Section A. Pre-flight read list

The executing AI must read each file below before producing output and must echo one concrete sentence per item.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — summary: fixed `_KDB` namespaces; no new top-level keys.
2. `_____________KDB3API/.cursor/rules/state.mdc` — summary: owner-only state writes; no foreign state mutation.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — summary: runtime resources live under owner buckets and need cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — summary: feature modules expose one dispatch-style `_KDB.api.<module>` surface.
5. `_____________KDB3API/.cursor/rules/events.mdc` — summary: event constants have canonical homes and subscriptions return cleanup functions.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — summary: files stay in ownership folders with thin orchestrators and small responsibilities.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — summary: English technical names and canonical factory/orchestrator names.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — summary: mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — summary: selectors live under `_KDB.elements.selectors`, live refs under `_KDB.runtime.<owner>.domRefs`.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — summary: production JS uses explicit AMD dependency arrays and no ES modules.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — summary: lifecycle terms must use the canonical vocabulary.
12. `_____________KDB3API/contracts/core.md` — summary: core now imports production `header`, `footer` and `kdbControl` orchestrators.
13. `_____________KDB3API/contracts/header.md` — summary: `header` owns `_KDB.state.header`, `_KDB.runtime.header`, `_KDB.api.header`.
14. `_____________KDB3API/contracts/footer.md` — summary: `footer` owns `_KDB.state.footer`, depends on header guards and subscribes to `header:confirmedChanged`.
15. `_____________KDB3API/contracts/kdbControl.md` — summary: `kdbControl` owns `_KDB.state.kdbControl`, `_KDB.runtime.kdbControl`, `_KDB.api.kdbControl`.
16. This execution spec.

The first output must be the 16 echoed summaries. Only after that may files be created.

---

## Section B. Folder tree

Create/copy only the following production files under `_____________KDB3API/KDB3/js/`.

```txt
dashboard/
  authoring/
    events/eventNames.js
    state/selectors.js
  header/
    __orchestratorHeader.js
    createHeaderController.js
    config/extAssetPaths.js
    dom/buildHeaderChrome.js
    dom/placeHeader.js
    dom/syncHeaderFromState.js
    effects/__orchestratorHeaderEffects.js
    events/eventNames.js
    state/createHeaderReducer.js
    state/initialState.js
    state/selectors.js
  footer/
    __orchestratorFooter.js
    createFooterController.js
    dom/buildFooterChrome.js
    dom/placeFooter.js
    dom/syncFooterFromState.js
    effects/__orchestratorFooterEffects.js
    events/eventNames.js
    state/createFooterReducer.js
    state/initialState.js
    state/selectors.js
  canvas/
    kdbControl/
      __orchestratorKdbControl.js
      createKdbControlController.js
      authoringMode/__orchestratorAuthoringMode.js
      effects/__orchestratorEffects.js
      effects/settingsPostDispatchSideEffects.js
      events/eventNames.js
      framework/__orchestratorFramework.js
      framework/bindFrameworkCollapse.js
      framework/bindFrameworkKdbActionToggles.js
      framework/bindFrameworkPrimitiveVisuals.js
      framework/bindFrameworkSectionToggles.js
      framework/bindFrameworkToolboxPlaceholderApis.js
      framework/bindFrameworkTopToggles.js
      framework/bindFrameworkView.js
      framework/buildControlHeader.js
      framework/buildControlMainBlocks.js
      framework/buildControlMainToggles.js
      framework/buildControlPrimitiveGallery.js
      framework/buildControlShell.js
      framework/createFrameworkElement.js
      framework/placeControlShell.js
      framework/syncFrameworkViewFromState.js
      framework/warnMissingOwnerApis.js
      framework/config/placeholderControlOptions.js
      settings/__orchestratorSettings.js
      settings/bindSettingsForm.js
      settings/gateSettingsDimensionActions.js
      settings/parseDimensionLength.js
      settings/warnSettingsMessage.js
      settings/config/settingsColorDefaults.js
      settings/config/settingsDimensionConfig.js
      state/createKdbControlReducer.js
      state/initialState.js
      state/selectors.js
      state/writers/writeFrameworkView.js
      toolbox/__orchestratorToolbox.js
```

Source roots:

- `TEST/kdbControl-port/header/` -> `_____________KDB3API/KDB3/js/dashboard/header/`
- `TEST/kdbControl-port/footer/` -> `_____________KDB3API/KDB3/js/dashboard/footer/`
- `TEST/kdbControl-port/kdbControl/` -> `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/`
- `TEST/kdbControl-port/authoring/events/eventNames.js` -> `_____________KDB3API/KDB3/js/dashboard/authoring/events/eventNames.js`
- `TEST/kdbControl-port/authoring/state/selectors.js` -> `_____________KDB3API/KDB3/js/dashboard/authoring/state/selectors.js`

The two `authoring` files are dependency-only files for `kdbControl/authoringMode`. Do not promote `authoring` orchestrator, controller, reducer or effects in this tranche.

---

## Section C. Copy and rewrite specifications

### C1. Pure copy files

Copy every file from Section B from its matching source path to its target path, preserving contents except for the AMD dependency rewrites listed in C2 and the image path cleanup listed in C3.

- **Rules to apply**:
  - `amd.mdc` — preserve AMD shape and do not convert to ES modules.
  - `feature-structure.mdc` — preserve module folder ownership and file names.
  - `state.mdc` — do not add or remove state writes.
  - `runtime.mdc` — do not alter cleanup behavior unless C2 import paths require it.
  - `error-handling.mdc` — do not remove existing `try/catch` boundaries.

### C2. AMD dependency rewrites

Rewrite only sandbox absolute module IDs that assumed the harness baseUrl. Keep relative imports such as `"../dom/..."` unchanged.

Required replacements:

| Old AMD dependency | New AMD dependency |
|---|---|
| `"header/state/selectors"` | `"dashboard/header/state/selectors"` |
| `"header/events/eventNames"` | `"dashboard/header/events/eventNames"` |
| `"footer/dom/syncFooterFromState"` | `"dashboard/footer/dom/syncFooterFromState"` |
| `"footer/state/selectors"` | `"dashboard/footer/state/selectors"` |
| `"footer/events/eventNames"` | `"dashboard/footer/events/eventNames"` |
| `"authoring/state/selectors"` | `"dashboard/authoring/state/selectors"` |
| `"authoring/events/eventNames"` | `"dashboard/authoring/events/eventNames"` |

Search the promoted production files for these old strings after copying. No old string from the left column may remain.

Do not rewrite:

- relative AMD imports beginning with `"./"` or `"../"`;
- action strings such as `"header/toggle"`, `"footer/toggle"` or `"tabs/add"`;
- event names such as `"header:confirmedChanged"`;
- DOM data attributes such as `data-header-action`.

### C3. Production asset path cleanup

The sandbox files may contain comments or fallback strings pointing to `TEST/`, `harness/`, or `_______KDB3/` image paths.

Allowed cleanup:

- In promoted production JS, remove or rewrite comments that describe harness-only asset serving.
- Replace fallback image paths that point into legacy trees, such as `../../../_______KDB3/KDB3/images/settings.svg`, with production extension-relative paths under `v1/ext/KDB3/images/`.

Do not add a CSS loader, copy CSS files, or introduce new asset files in this tranche. CSS promotion/loading is a separate tranche.

### C4. Dependency-only authoring files

Promote only:

- `dashboard/authoring/state/selectors.js`
- `dashboard/authoring/events/eventNames.js`

These files satisfy AMD imports from `kdbControl/authoringMode`. They do not register `_KDB.api.authoring`, do not initialize `_KDB.state.authoring`, and do not emit authoring events.

---

## Section D. Reducer behavior table

No reducer behavior is changed in this tranche.

| Reducer | Required behavior |
|---|---|
| `header/state/createHeaderReducer.js` | Copy existing sandbox reducer unchanged except AMD path rewrites if any. |
| `footer/state/createFooterReducer.js` | Copy existing sandbox reducer unchanged except AMD path rewrites if any. |
| `kdbControl/state/createKdbControlReducer.js` | Copy existing sandbox reducer unchanged except AMD path rewrites if any. |

---

## Section E. Published selectors

Promote existing selector registries:

| Target | Role |
|---|---|
| `dashboard/header/state/selectors.js` | Published header selectors. |
| `dashboard/footer/state/selectors.js` | Published footer selectors; import header selector path using `dashboard/header/...`. |
| `dashboard/canvas/kdbControl/state/selectors.js` | Published kdbControl selectors. |
| `dashboard/authoring/state/selectors.js` | Dependency-only `readIsAuthoring(_KDB)` for kdbControl authoring DOM sync. |

No new selectors are added.

---

## Section F. Public API wiring

No changes to `KDB.js` are required in this tranche unless import path verification finds a typo from the prior core tranche.

Expected existing `KDB.js` imports:

```js
"./dashboard/header/__orchestratorHeader.js"
"./dashboard/footer/__orchestratorFooter.js"
"./dashboard/canvas/kdbControl/__orchestratorKdbControl.js"
```

The promoted files must make those imports resolvable. No `_KDB.api.authoring`, `_KDB.api.launchpad`, `_KDB.api.tabs`, `_KDB.api.comments` or `_KDB.api.canvas` implementation is added. Existing kdbControl warnings for missing optional owner APIs remain acceptable.

---

## Section G. Harness HTML spec

No harness HTML is created or modified.

---

## Section H. Harness JS spec

No harness JS is created or modified.

---

## Section I. Mock extensions

No mock files are created or modified.

---

## Section J. Acceptance criteria

1. Every target file listed in Section B exists under `_____________KDB3API/KDB3/js/`.
2. No files outside `_____________KDB3API/KDB3/js/dashboard/{authoring,header,footer,canvas/kdbControl}/` are created or modified by this tranche.
3. No legacy tree (`_______KDB3`, `_______REDESIGN2`, `_______LAATSTEORIGINAL`) is modified.
4. No `TEST/` file is modified.
5. `KDB.js` imports for `header`, `footer` and `kdbControl` resolve to existing production files.
6. No old sandbox AMD dependency remains: `"header/`, `"footer/`, or `"authoring/` at the start of an AMD dependency string.
7. Relative AMD imports beginning with `"./"` or `"../"` are preserved unless they were demonstrably broken by the target folder layout.
8. No ES `import` or `export` syntax is introduced.
9. No `authoring` orchestrator/controller/reducer/effects files are promoted.
10. No `launchpad`, `tableData`, `history`, `loading`, `widgets`, `filters`, `tabs`, `comments` or `canvas` owner modules are created.
11. No CSS files are copied or created.
12. No `_KDB.state.tablesLoaded`, table rows, data-query runtime dependency or table service code is introduced.
13. Existing public API shapes remain unchanged: `_KDB.api.header`, `_KDB.api.footer`, `_KDB.api.kdbControl`.
14. Run `ReadLints` on all promoted `.js` files and fix only issues introduced by path rewrites.

---

## Section K. Forbidden actions

The executing AI must not:

- Modify `.mdc` rules, templates, `core.md`, `header.md`, `footer.md`, `kdbControl.md`, or this execution spec.
- Modify files under `TEST/`.
- Modify legacy trees.
- Create a top-level `KDB3/` folder outside `_____________KDB3API/`.
- Promote full `authoring` module files beyond the two dependency-only files listed in Section B.
- Promote CSS files, harness files, reports or mocks.
- Add new behavior, reducers, selectors, public API methods or event names.
- Add service registrations or optional owner modules.
- Commit, push or change git config.

---

## Section L. Reporting template

The executing AI final response must include:

1. **Pre-flight echo** — 16 numbered summaries from Section A.
2. **File checklist** — every promoted file path with line count and `copied | copied + AMD rewrite | copied + asset cleanup`.
3. **Rewrite checklist** — old AMD dependency strings removed and new dependency strings inserted.
4. **Deviations** — any deviation with path, reason and rule consulted.
5. **Self-verification** — pass/fail for every Section J criterion.
6. **Open questions for reviewer** — only if a dependency could not be resolved without a scope decision.

---

## Section M. Reviewer handoff

The supervising AI must:

1. Verify all Section B files exist.
2. Search production files for old harness AMD dependency prefixes.
3. Search production files for `TEST/`, `harness/`, `_______KDB3`, `runtimeDependencies`, `tablesLoaded`, `import ` and `export `.
4. Run `ReadLints` on all promoted `.js` files.
5. Confirm `KDB.js` can resolve its three module orchestrator import paths.
6. Stop at CP-2 for user-level verification.
