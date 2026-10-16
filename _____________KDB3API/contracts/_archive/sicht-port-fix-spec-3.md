# Fix Spec 3: `sicht` / `filterDock` popup DOM ownership

> Focused fix iteration for the remaining architecture issue after `sicht-port-fix-spec-2.md`.
> Goal: move popup DOM mutation ownership to `filterDock`; `sicht` keeps semantic decisions only.

---

**Status:** `Ready for execution`
**Base contract:** `_____________KDB3API/contracts/sicht.md`
**Base execution spec:** `_____________KDB3API/contracts/sicht-port-execution-spec.md`
**Prior fix specs:**

```txt
_____________KDB3API/contracts/sicht-port-fix-spec-1.md
_____________KDB3API/contracts/sicht-port-fix-spec-2.md
```

**Reviewer finding:** CP-2 still not green because `sicht` performs a feature-local `document.querySelector(...)` fallback to find Cognos popup DOM. This is less aligned with the architecture than routing DOM mutation through `filterDock`, the owner of filter dock / popup observation and DOM context.

---

## Section A. Required pre-flight

Read these files before changing anything and echo a one-sentence summary of each:

1. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
2. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
3. `_____________KDB3API/.cursor/rules/state.mdc`
4. `_____________KDB3API/.cursor/rules/runtime.mdc`
5. `_____________KDB3API/.cursor/rules/dom.mdc`
6. `_____________KDB3API/.cursor/rules/amd.mdc`
7. `_____________KDB3API/contracts/filterDock.md`
8. `_____________KDB3API/contracts/sicht.md`
9. `_____________KDB3API/contracts/sicht-port-fix-spec-2.md`
10. This fix spec.

---

## Section B. Files allowed to modify

Only modify or create files under these paths:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/
_____________KDB3API/KDB3/js/dashboard/filters/sicht/
```

If a clean fix requires any other file, stop and report before editing it.

---

## Section C. Required architecture change

### C1. Remove feature-local popup DOM discovery from `sicht`

Files:

```txt
KDB3/js/dashboard/filters/sicht/effects/resolveSichtPopupMount.js
KDB3/js/dashboard/filters/sicht/effects/syncSichtOptionAvailability.js
KDB3/js/dashboard/filters/sicht/effects/handleSichtFilterDockHandoff.js
```

Required change:

- `sicht` must no longer use document-scoped popup discovery such as:

```js
document.querySelector(".wa-filterDock-filterItemMount")
document.querySelector(_KDB.elements.selectors.filterDock.rootSelector)
document.querySelector(_KDB.elements.selectors.filterDock.globalDockSelector)
document.querySelector(_KDB.elements.selectors.filterDock.pageContextDockSelector)
```

- `sicht` may keep pure/serializable option availability calculations.
- `sicht` may still hold pure helpers for transforming option availability payloads.
- `sicht` must request popup DOM mutation through `_KDB.api.filterDock.dispatch(...)`, not by finding popup DOM itself.
- Remove `resolveSichtPopupMount.js` if it becomes unused.

Acceptance:

- No file under `dashboard/filters/sicht/` contains `document.querySelector`.
- No file under `dashboard/filters/sicht/` reads `_KDB.runtime.filterDock`.
- No file under `dashboard/filters/sicht/` mutates popup DOM directly unless the node is passed in by `filterDock` inside a filterDock-owned action handler. Preferred result: no Sicht-owned popup DOM mutation.

Rules to apply:

- `dom.mdc` - filterDock owns dock/popup DOM context; no feature-local document fallback.
- `module-public-api.mdc` - cross-owner operation goes through public API dispatch.
- `state.mdc` - no foreign state writes.

### C2. Add a `filterDock` owner action for Sicht popup availability sync

Files:

```txt
KDB3/js/dashboard/filters/filterDock/config/actions.js
KDB3/js/dashboard/filters/filterDock/effects/dispatchFilterDockDomAction.js
```

Create as needed under `filterDock/effects/`:

```txt
applySichtPopupAvailability.js
```

Required change:

- Add action constant:

```js
APPLY_SICHT_POPUP_AVAILABILITY_REQUESTED: "filterDock/applySichtPopupAvailabilityRequested"
```

- Extend `dispatchFilterDockDomAction.js` to route that action to `applySichtPopupAvailability.js`.
- `applySichtPopupAvailability.js` is filterDock-owned DOM code. It may resolve the active popup mount using filterDock selectors/runtime because it is inside the owner module.
- It receives a serializable payload from `sicht`, for example:

```js
{
  filterKey: string,
  filterLabel: string,
  filterScope: "global" | "pageContext",
  byOption: {
    BW: { displayValue, isVisible, isEnabled },
    DEZPV: { displayValue, isVisible, isEnabled }
  },
  activeSichtValue: string | null
}
```

- It applies:
  - hide `"Alle"`;
  - hide invisible Sicht options;
  - disable visible but not-ready options;
  - prevent duplicate option rows;
  - keep selected/current option visible.
- It must not write `_KDB.state.filters.sicht`.
- It must not write any foreign state.
- It may store live refs only under `_KDB.runtime.filterDock.domRefs` if needed, because filterDock owns those refs.

Acceptance:

- DOM query / mutation for popup availability lives in filterDock.
- `filterDock` public `dispatch` handles the new action.
- No new event is introduced.
- No new top-level `_KDB` namespace is introduced.
- `filterDock` file sizes remain <=150 lines.

Rules to apply:

- `dom.mdc` - live DOM and popup mutations stay with filterDock owner.
- `runtime.mdc` - live refs under `_KDB.runtime.filterDock.domRefs`.
- `module-public-api.mdc` - public dispatch action, no new named method.
- `feature-structure.mdc` - new file under `effects/`, focused and under line limit.

### C3. Make `sicht` request filterDock DOM sync through public API

Files:

```txt
KDB3/js/dashboard/filters/sicht/effects/handleSichtFilterDockHandoff.js
KDB3/js/dashboard/filters/sicht/effects/syncSichtOptionAvailability.js
```

Required change:

- Replace local DOM sync with a public dispatch to filterDock:

```js
_KDB.api.filterDock.dispatch({
  type: "filterDock/applySichtPopupAvailabilityRequested",
  payload: {
    filterKey: mappedHandoff.filterKey,
    filterLabel: mappedHandoff.filterLabel,
    filterScope: mappedHandoff.filterScope,
    byOption: byOption,
    activeSichtValue: <current active Sicht value or null>
  }
});
```

- This request should be made only for popup-ready or visible popup handoffs, matching prior behavior.
- If `_KDB.api.filterDock.dispatch` is unavailable, return false / no-op; do not fallback to document query.
- `syncSichtOptionAvailability.js` may become a request-builder/wrapper rather than DOM code, or it may be removed if unused.

Acceptance:

- `sicht` does not discover or mutate popup DOM.
- `sicht` still computes and sends availability state.
- `filterDock` applies DOM availability.
- `singleSelect` delegation remains unchanged.

Rules to apply:

- `module-public-api.mdc` - direct API to known owner.
- `events.mdc` - no event for known-owner request.
- `dom.mdc` - no feature-local dock/popup DOM ownership.

---

## Section D. Forbidden actions

Do not:

- modify `.cursor/rules/`;
- modify contract templates;
- modify legacy trees;
- modify `TEST/`;
- add events or `eventSubscribe.md`;
- add Dienststelle / hierarchy behavior;
- write foreign state;
- read `_KDB.runtime.filterDock` from `sicht`;
- use document-scoped popup fallback from `sicht`;
- touch files outside Section B unless you stop and report first.

---

## Section E. Self-verification

Before reporting back, verify:

1. No file under `dashboard/filters/sicht/` contains `document.querySelector`.
2. No file under `dashboard/filters/sicht/` reads `_KDB.runtime.filterDock`.
3. `filterDock/config/actions.js` contains `APPLY_SICHT_POPUP_AVAILABILITY_REQUESTED`.
4. `filterDock/effects/dispatchFilterDockDomAction.js` routes the new action.
5. `filterDock/effects/applySichtPopupAvailability.js` exists and is <=150 lines.
6. Sicht requests the DOM sync through `_KDB.api.filterDock.dispatch(...)`.
7. No events were added.
8. No foreign state writes were added.
9. All touched JS files are <=150 lines unless explicitly reported.
10. No lint diagnostics were introduced.

---

## Section F. Report template

Final report must include:

1. Pre-flight echo (10 summaries).
2. File checklist with final line counts.
3. Fix confirmation for C1-C3.
4. Self-verification result for E1-E10.
5. Deviations, if any.
