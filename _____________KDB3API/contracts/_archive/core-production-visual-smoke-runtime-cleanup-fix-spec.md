# Fix Spec: `core` production visual smoke runtime cleanup

**Status:** Ready for execution  
**Parent spec:** `_____________KDB3API/contracts/core-production-visual-smoke-execution-spec.md`  
**Phase:** focused fix iteration  
**Authoring AI:** GPT-5.5, 2026-05-16  
**Executing AI:** pending  
**Reviewer:** user / supervising AI  

---

## 1. Purpose

Clean up the runtime/DOM ownership details left after the production visual smoke implementation:

- `KDB.js` should register Cognos render input and call module mounts without passing a shared `mountTarget`.
- `header` and `footer` live mount targets must live under `runtime.<owner>.domRefs.mountTargetEl`.
- `runtime.core.adapters` should include the raw `features` map for future host access without reintroducing legacy `apiContent`.

No visual behavior, CSS, selector values, public APIs or module state shapes are changed.

---

## 2. Files To Modify

Only these files may be changed:

```txt
_____________KDB3API/KDB3/js/KDB.js
_____________KDB3API/KDB3/js/dashboard/header/__orchestratorHeader.js
_____________KDB3API/KDB3/js/dashboard/header/createHeaderController.js
_____________KDB3API/KDB3/js/dashboard/header/effects/__orchestratorHeaderEffects.js
_____________KDB3API/KDB3/js/dashboard/footer/__orchestratorFooter.js
_____________KDB3API/KDB3/js/dashboard/footer/createFooterController.js
_____________KDB3API/KDB3/js/dashboard/footer/effects/__orchestratorFooterEffects.js
```

---

## 3. Required Changes

### 3.1 `KDB.js`

Required:

1. In `createRuntimeCore(_options)`, add the raw feature map under `runtime.core.adapters.features`.
2. Keep existing adapter shortcuts:
   - `dashboardCanvas`
   - `userProfile`
   - `properties`
   - `dashboardApi`
3. Keep render parent as a live runtime ref under `runtime.core.domRefs.renderParentEl`.
4. Remove or stop using `hostContent` if it is only an alias; if retained for compatibility, it must not become a second source of truth.
5. In `mountFeatureModules(_KDB, _renderOptions)`, update `runtime.core.domRefs.renderParentEl` from `_renderOptions.parent` when present, then call:

```js
_KDB.api.header.mount({});
_KDB.api.footer.mount({});
_KDB.api.kdbControl.mount({});
```

Do not pass the same `mountTarget` to header/footer anymore. Each module resolves its own Cognos host mount via `_KDB.elements.selectors.host`.

Forbidden:

- No `apiContent`.
- No inline `.KDB3Widget`, `.pageViewContent`, `.ba-common-tabList__container`.
- No new top-level `_KDB` namespaces.

### 3.2 `header/__orchestratorHeader.js`

Required:

1. Move `mountTargetEl: null` into the existing `domRefs` object:

```js
domRefs: {
  rootEl: null,
  titleEl: null,
  subtitleEl: null,
  draftTitleEl: null,
  draftSubtitleEl: null,
  mountTargetEl: null
}
```

2. Remove direct `_KDB.runtime.header.mountTargetEl`.

### 3.3 `header/createHeaderController.js`

Required:

1. In `mount(options)`, assign:

```js
_KDB.runtime.header.domRefs.mountTargetEl = resolveHeaderMountTarget(_KDB, options);
```

instead of `_KDB.runtime.header.mountTargetEl = ...`.

2. In `destroy()`, preserve the reset of `domRefs`, but include `mountTargetEl: null` in the reset object.
3. Remove direct writes to `rt.mountTargetEl`.

### 3.4 `header/effects/__orchestratorHeaderEffects.js`

Required:

1. Replace reads of `rt.mountTargetEl` with `rt.domRefs && rt.domRefs.mountTargetEl`.
2. Do not introduce a compatibility alias on `runtime.header.mountTargetEl`.
3. Preserve all existing header effects behavior and event publishing.

### 3.5 `footer/__orchestratorFooter.js`

Required:

1. Move `mountTargetEl: null` into the existing `domRefs` object:

```js
domRefs: {
  rootEl: null,
  barEl: null,
  dashboardTitleEl: null,
  dataAktEl: null,
  centerDateUserEl: null,
  pageIndicatorEl: null,
  mountTargetEl: null
}
```

2. Remove direct `_KDB.runtime.footer.mountTargetEl`.

### 3.6 `footer/createFooterController.js`

Required:

1. In `mount(options)`, assign:

```js
_KDB.runtime.footer.domRefs.mountTargetEl = resolveFooterMountTarget(_KDB, options);
```

instead of `_KDB.runtime.footer.mountTargetEl = ...`.

2. In `destroy()`, preserve the reset of `domRefs`, but include `mountTargetEl: null` in the reset object.
3. Remove direct writes to `rt.mountTargetEl`.

### 3.7 `footer/effects/__orchestratorFooterEffects.js`

Required:

1. Replace reads of `rt.mountTargetEl` with `rt.domRefs && rt.domRefs.mountTargetEl`.
2. Do not introduce a compatibility alias on `runtime.footer.mountTargetEl`.
3. Preserve all existing footer effects behavior and subscription behavior.

---

## 4. Rules To Apply

- `runtime.mdc` — live DOM references belong under `_KDB.runtime.<owner>.domRefs`, not directly under `runtime.<owner>`.
- `dom.mdc` — `_KDB.elements` holds selector strings only; live mount targets are runtime refs.
- `kdb-object.mdc` — raw host features belong under `_KDB.runtime.core.adapters.features`; do not reintroduce `apiContent`.
- `feature-structure.mdc` — keep `KDB.js` thin and module mount resolution owner-local.
- `amd.mdc` — preserve explicit AMD shape and existing `class KDB`.

---

## 5. Acceptance Criteria

1. `KDB.js` calls `header.mount({})`, `footer.mount({})`, and `kdbControl.mount({})`.
2. `KDB.js` contains `features: features` under `_KDB.runtime.core.adapters`.
3. `KDB.js` does not contain `apiContent`.
4. No direct `_KDB.runtime.header.mountTargetEl` or `_KDB.runtime.footer.mountTargetEl` initialization remains.
5. Header live mount target is stored at `_KDB.runtime.header.domRefs.mountTargetEl`.
6. Footer live mount target is stored at `_KDB.runtime.footer.domRefs.mountTargetEl`.
7. No live DOM refs are stored under `_KDB.elements`.
8. No contracts, rules, TEST files, legacy trees, CSS or assets are modified.
9. No remaining reads or writes of `runtime.header.mountTargetEl`, `runtime.footer.mountTargetEl`, `rt.mountTargetEl` or `mountTargetEl` directly under `runtime.<owner>` remain in the seven changed files.
10. `ReadLints` is clean on all seven changed files.

---

## 6. Reporting Template

The executing AI must report:

1. Files changed.
2. Exact runtime-ref placements after the fix.
3. Confirmation that `apiContent` was not introduced.
4. Confirmation that `mountFeatureModules` no longer passes a shared `mountTarget`.
5. Confirmation that header/footer effects now read `domRefs.mountTargetEl`.
6. `ReadLints` result.
