# Execution Spec: dienststelle cleanup tranche C

**Status:** Draft for execution approval
**Module / contract:** `_____________KDB3API/contracts/dienststelle.md`
**Phase:** selector placement and selector completeness cleanup
**Authoring AI:** GPT-5.5, 2026-06-04
**Executing AI:** TBD
**Reviewer:** user / supervising AI

---

## Section A. Pre-flight read list

The executing AI must read each file below before editing and echo one sentence per item:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/contracts/dienststelle.md`
12. This execution spec.

This tranche explicitly supersedes the Tranche A/B non-goals that forbade selector relocation, but only for the exact selector move and one selector-completeness key described below.

---

## Section B. Scope

This tranche has two approved changes:

1. Move the Dienststelle DOM selector constants from `view/dienststelleViewSelectors.js` to `config/selectors.js`.
2. Add one new config selector key for the already-hardcoded committed-display parent selector `.wa-filterDock-filterItem-bottom`, then use that key in `applyDienststelleDisplaySanitizing.js`.

Allowed production file to create:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/config/selectors.js
```

Allowed production file to delete:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/dienststelleViewSelectors.js
```

Allowed production files to modify:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/resolveScopedDienststelleFilterDom.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/syncDienststelleRootClass.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/syncDienststelleWrapperClasses.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/syncDienststelleFilterDockNames.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/syncDienststelleViewFromState.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/applyDienststelleDisplaySanitizing.js
```

No other files are in scope.

---

## Section C. Required edits

### C1. Move selector object to `config/selectors.js`

Create `config/selectors.js` by moving the existing exported object from `view/dienststelleViewSelectors.js`.

Rules:

- Preserve all existing export key names and values exactly.
- Preserve object shape: one AMD module returning one object.
- Preserve the `optionLabelSelectors` array values and order exactly.
- Delete `view/dienststelleViewSelectors.js`; do not leave a re-export shim.

The moved object currently has 18 existing keys. These 18 keys must remain unchanged:

```txt
filterDockRootSelector
globalDockBucketSelector
pageContextDockBucketSelector
filterItemWrapperClass
filterDataIdAttr
filterDockFilterNameSelector
markerClass
activeClass
rootActiveClassBySicht
rootActiveClassValues
sichtClassByValue
popupMountSelector
popupLabelsReadyClass
listItemWrapperSelector
optionLabelSelectors
committedDisplaySelector
```

If the current file contains additional keys due to earlier edits, preserve those too and report them.

### C2. Add committed-display parent selector key

Add exactly one new selector key to `config/selectors.js`:

```js
committedDisplayParentSelector: ".wa-filterDock-filterItem-bottom"
```

This key replaces the same hardcoded string currently used in `view/applyDienststelleDisplaySanitizing.js`.

Rules:

- Do not change `committedDisplaySelector`.
- Do not change the selector value.
- Do not add any other new selector keys.
- Do not move or rename the committed-display sanitizing function.

### C3. Update five selector imports

Update these imports from:

```txt
./dienststelleViewSelectors.js
```

to:

```txt
../config/selectors.js
```

Files:

```txt
view/resolveScopedDienststelleFilterDom.js
view/syncDienststelleRootClass.js
view/syncDienststelleWrapperClasses.js
view/syncDienststelleFilterDockNames.js
view/syncDienststelleViewFromState.js
```

Only the AMD dependency string changes. Keep factory parameter names and downstream logic unchanged unless lint/local style requires the parameter name to stay aligned.

### C4. Use `committedDisplayParentSelector`

In `view/applyDienststelleDisplaySanitizing.js`, replace the hardcoded:

```js
".wa-filterDock-filterItem-bottom"
```

with the selector from the passed `_selectors` object:

```js
_selectors.committedDisplayParentSelector
```

Rules:

- Preserve `closest(...)` behavior.
- Preserve `ariaFromSource: "ifEmpty"` behavior.
- Preserve query order, node deduplication, ready-class behavior, text/title/aria mutation behavior, and return values.
- Do not add a fallback string. If the selector object is missing the key, that is a wiring bug; do not mask it in this tranche.

---

## Section D. Explicitly out of scope

The executing AI must not:

- Register `_KDB.elements.selectors.dienststelle`.
- Edit `__orchestratorDienststelle.js`.
- Deduplicate with `core/config/elements.js`, `_KDB.elements.selectors.filterDock`, or `filterDock` config.
- Leave `view/dienststelleViewSelectors.js` as a compatibility re-export.
- Rename any other view file.
- Move `resolveScopedDienststelleFilterDom.js` out of `view/`.
- Change any existing selector string, CSS class string, data attribute string, or export key name.
- Add any selector key other than `committedDisplayParentSelector`.
- Touch `state/selectors.js`, state helpers, reducer, effects, history, CSS, `filterDock`, `sicht`, `singleSelect`, `specialSingleSelect`, `KDB.js`, contracts, rules, templates, legacy trees, or `TEST/`.
- Change Dienststelle state shape, runtime buckets, public API, action strings, Cognos behavior, label sanitizing semantics, popup behavior, committed-display behavior, history behavior, or header-resync behavior.

---

## Section E. Rules to apply

All touched/new production files:

- `amd.mdc` — one full-compact AMD `define`, no ES module syntax.
- `naming.mdc` — canonical selector config filename is `selectors.js`; technical identifiers stay English.
- `feature-structure.mdc` — selector constants live under `config/`; touched/new JS files remain under 150 lines.

DOM selector cleanup:

- `dom.mdc` — selectors are strings/config; no live DOM refs are introduced.
- `runtime.mdc` — no runtime bucket changes.
- `state.mdc` — no state shape or writer changes.
- `module-public-api.mdc` — no public API or selector-reader changes.

---

## Section F. Acceptance criteria

AC1. `config/selectors.js` exists and exports the moved selector object plus exactly one new key: `committedDisplayParentSelector`.

AC2. The existing selector export keys and values are unchanged from the old `view/dienststelleViewSelectors.js`.

AC3. `committedDisplayParentSelector` has value exactly `.wa-filterDock-filterItem-bottom`.

AC4. `view/dienststelleViewSelectors.js` is deleted; no compatibility re-export remains.

AC5. Exactly the five view files listed in C3 import `../config/selectors.js` instead of `./dienststelleViewSelectors.js`.

AC6. No production AMD import under `KDB3/js/**` references `dienststelleViewSelectors.js`.

AC7. `applyDienststelleDisplaySanitizing.js` uses `_selectors.committedDisplayParentSelector` for the existing `closest(...)` call and preserves committed-display behavior.

AC8. No `_KDB.elements` registration, orchestrator edit, cross-module selector dedup, or unrelated view-file rename occurred.

AC9. All touched/new JS files are under 150 lines.

AC10. `ReadLints` is clean on all touched/new production files.

AC11. Static inspection confirms AMD import paths resolve.

---

## Section G. Reviewer handoff

The executing AI final report must include:

1. Pre-flight echo for Section A.
2. File checklist with before/after line counts.
3. Confirmation that the old selector object moved with existing keys/values unchanged.
4. Confirmation that exactly one new selector key was added.
5. List of the five updated import paths.
6. Confirmation that no re-export shim or `_KDB.elements` registration was added.
7. AC1-AC11 pass/fail.
8. Lint result.
9. Any uncertainty or deviation.

