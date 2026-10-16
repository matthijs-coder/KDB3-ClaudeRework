# Execution Spec: Chip-B leftover closed-chip overlay

> Mechanical spec for Grok 4.6. Architecture lives in `dienststelle-chip-b-leftover-overlay-contractdelta.md`. Do not re-decide Chip-A, `writeFilter` repaint, or `paintChip`.
> Production tree only: `_____________KDB3API/KDB3/js/**` plus the parent inserts in the allowlist.
> One writer. Exclusive allowlist. Echo every Section A row **before** producing files.

---

**Status:** `Implemented`
**Module / contract:** `dienststelle.md` + this delta
**Phase:** `extension`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-10-16
**Executing AI:** grok 4.6 writer (assigned after review green)
**Reviewer:** grok 4.6 review swarm + captain

---

## Exclusive allowlist (one writer)

**May create:**

- `KDB3/js/dashboard/filters/dienststelle/view/resolveUniqueOtherDockFilterWrapper.js`

**May edit:**

- `KDB3/js/dashboard/filters/dienststelle/view/isDienststelleLabelSafeToShow.js`
- `KDB3/js/dashboard/filters/dienststelle/view/applyDienststelleDisplaySanitizing.js`
- `KDB3/js/dashboard/filters/dienststelle/view/syncDienststelleViewFromState.js`
- `contracts/dienststelle.md` (delta §3 in-place sentences only)
- the delta + this spec (status → `Implemented` after code lands)

**Must not edit:** `applyDienststelleDefault.js`; `walkDienststellePageContextScopes.js`; `lookupDienststelleFilterRef.js`; `runDienststelleReconcile.js`; `routeDienststelleDispatch.js` (observe already `_syncView`); `scheduleDienststelleViewSync.js`; `syncDienststelleFromSicht.js`; `sanitizeDienststelleVisibleLabel.js`; `resolveScopedDienststelleFilterDom.js` (`findScopedFilterWrapper` stays first-match for hash-strip); `applySingleSelectCommittedDisplay.js`; widget bind; `KDB.js`; git.

**Must not create:** `helpers/` / `common/` / `shared/`; `paintChip`; a Dienststelle `paintChip`; a second observer.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` via argument; no new namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — no new state field. Read existing `hostDisplay` on snapshot values.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — no new runtime bucket. May **read** `filterDock.runtime.domRefs.activeFilterEl`.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new `_KDB.api.dienststelle` method.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150; AMD >10 requires split. `applyDienststelleDisplaySanitizing.js` is **149** by `(Get-Content).Count`. Section C snippets land at **150**. No new AMD; no new function.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files; `_` on boundary params.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — named export try/catch + `console.error` + rethrow unless a true one-liner. Sync already catches DOM errors.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — DOM only on the allowlisted view files; scoped to `#filterDock__other` for overlay.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; factory-scope helpers; no nested subfunctions; no ESM.
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no new `_KDB.cognosAPI` / facet. No `writeFilter`.
12. The approved delta.
13. This spec.
14. Live files in Section C (read, then patch).

---

## Section B. Folder tree

```
KDB3/js/dashboard/filters/dienststelle/view/
  isDienststelleLabelSafeToShow.js          (edit)
  applyDienststelleDisplaySanitizing.js     (edit)
  resolveUniqueOtherDockFilterWrapper.js    (new)
  syncDienststelleViewFromState.js          (edit)
```

---

## Section C. Per-file specifications

#### `isDienststelleLabelSafeToShow.js`

- Add factory-scope `resolveCommittedSanitizeSource(_aria, _text, _title, _hostDisplay, _sanitize)`.
- Export it on the existing return object.
- Leave `resolveSanitizeSource` **byte-identical** (aria → title → text).
- When `_hostDisplay` is a non-empty string that `shouldTransformLabel`:
  1. If `_aria` has `#` and (`_aria === _hostDisplay` or `_sanitize(_aria) === _sanitize(_hostDisplay)`), return `_aria`.
  2. Same for `_title`.
  3. If `_text` has `#`, return `_text` (Cognos painted raw Y into the chip).
  4. Return `_hostDisplay` (overlay source).
- When `_hostDisplay` is missing/empty: return `resolveSanitizeSource(_aria, _text, _title)` (hash-strip / skip).
- File stays ≤150 (today 97). No AMD.

#### `applyDienststelleDisplaySanitizing.js`

- **≤150 hard cap.** No new function. No new AMD. Live is **149** (`Get-Content`). The pair below is **copy-paste**, not a sketch: ternary **+2**, `sanitizeCommittedDisplay` **18→17** (drop `var bottomEl` + assignment **−2**, add `hostDisplay` **+1**) → **149 + 2 − 1 = 150**. **Keep** the blank between `stripLabelElement` and `sanitizePopupLabelsInRoot` (live L100). Deleting it lands at 149.
- Popup `sanitizePopupLabelsInRoot` stays `resolveSanitizeSource` / `ariaFromSource: "never"`. Do not rewrite leftover aria.
- In `stripLabelElement`, replace **only** the `resolveSanitizeSource` line with this ternary (do not wrap it):

```js
    source = opts.hostDisplay
      ? _labelSupport.resolveCommittedSanitizeSource(aria, text, title, opts.hostDisplay, _sanitize)
      : _labelSupport.resolveSanitizeSource(aria, text, title);
```

- Replace `sanitizeCommittedDisplay` **verbatim** (4th arg, no `bottomEl` var, `hostDisplay` on the same opts object):

```js
  function sanitizeCommittedDisplay(_wrapperEl, _sanitize, _selectors, _hostDisplay) {
    var textSpan;
    if (!_wrapperEl || !_wrapperEl.querySelector) {
      return false;
    }
    textSpan = _wrapperEl.querySelector(_selectors.committedDisplaySelector);
    if (!textSpan) {
      return false;
    }
    return stripLabelElement(textSpan, _sanitize, {
      text: true,
      title: true,
      ariaFromSource: "ifEmpty",
      sourceParentEl: (textSpan.closest && textSpan.closest(_selectors.committedDisplayParentSelector)) || null,
      hostDisplay: _hostDisplay || ""
    });
  }
```

- Forbidden: leaving `var bottomEl`; deleting the inter-function blank (live L100); any `Object.assign` / extra helper. Writer must quote `(Get-Content).Count` **150** after the patch.

#### `resolveUniqueOtherDockFilterWrapper.js`

- **Role:** `__controller(_KDB, _activeFilterKey)` → wrapper element or `null`.
- **Lines:** ≤80 (hard 100). **AMD 1:** `["../config/selectors.js"]`.
- Query **only** the pageContext bucket (`pageContextDockBucketSelector` = `#filterDock__other`). Never `#filterDock__global`. Never `document.querySelector("[data-id=…]")`.
- `querySelectorAll("[" + filterDataIdAttr + "=\"" + _activeFilterKey + "\"]")`. Never `querySelector`.
- Read `activeFilterEl` from `_KDB.runtime.filterDock.domRefs` when connected, `closest(pageContextDockBucketSelector)`, and contains that `data-id`.
- Length 0 → `null`.
- Length 1, no matching `activeFilterEl` → that host’s wrapper (`closest` wrapper class). Documented as bucket uniqueness, not tab-identity.
- Length >1: return the matching `activeFilterEl` wrapper if it is one of the matches; else `null` (abort). Do not return `[0]`. Do not use computed `display`.
- try/catch + `console.error("[dienststelle.resolveUniqueOtherDockFilterWrapper] failed", error)` + rethrow.

#### `syncDienststelleViewFromState.js`

- Today **6 AMD / 117 lines**. May add **two** imports: `../effects/pickPageContextScopeMap.js`, `./resolveUniqueOtherDockFilterWrapper.js`. Stay ≤10 AMD, ≤150 lines.
- Factory-scope `readThisScopeHostDisplay(_KDB, _filterScope)`:
  - Snapshot via existing `_selectors.readDienststelleSnapshot(_KDB)`.
  - `"global"` → `valuesByScope.global[0].hostDisplay` or `""`.
  - else → `pickPageContextScopeMap(_KDB, valuesByScope.pageContext, "active")`; first own key’s `[0].hostDisplay` or `""`. If pick is `{}` or key missing → `""`.
  - Never flatten. Never `lookupFilterRef`. Never `resolution.dominantValues`.
- Factory-scope `hostDisplayForOverlay(_KDB, _filterScope)`:
  - If `_filterScope === "global"` → `""` (never overlay Y on global leftover).
  - Else return `readThisScopeHostDisplay(_KDB, "pageContext")` only if `shouldTransformLabel` (`indexOf("#") !== -1`). Else `""`.
- `sanitizeCommittedForScope(_KDB, _definition, _filterScope)` (pass `_KDB`):
  1. Hash-strip wrapper = existing `findScopedFilterWrapper` (first-match). Run `sanitizeCommittedDisplay(wrapper, sanitize, selectors, "")` when overlay is not legal for this wrapper.
  2. Overlay: only when `hostDisplayForOverlay` is non-empty **and** `_filterScope !== "global"`. Resolve `overlayWrapper = resolveUniqueOtherDockFilterWrapper(_KDB, _definition.activeFilterKey)`. If null → **no overlay** (hash-strip only). If overlayWrapper: `sanitizeCommittedDisplay(overlayWrapper, sanitize, selectors, hostDisplay)`.
  3. Do not pass active-tab `hostDisplay` into the global bucket call.
- `runDisplaySync` / both-buckets must pass `_KDB` into `sanitizeCommittedForScope`.
- Null handoff still both-buckets. Other bucket still overlays from active-tab `hostDisplay`. Global bucket overlay hostDisplay stays `""`.
- `readHandoffFilterScope(null) → "global"` stays for popup/hash-strip bucket pick. It must not become overlay source.

#### Parent `dienststelle.md`

Land **exactly** delta §3. In-place rewrite of the listed §8 / matrix / log sentences. Add the action-table row. Do not only append an addendum.

---

## Section D. Done when

- Sibling resolver exported; popup resolver unchanged.
- Committed strip uses sibling when `opts.hostDisplay` is set.
- Unique other-dock resolver exists and is the only overlay target picker.
- Global leftover never receives tab `hostDisplay`.
- Sanitizer file ≤150. Sync ≤150 / ≤10 AMD. New file ≤100 / 1 AMD.
- Writer quotes the live `resolveSanitizeSource` and `sanitizeCommittedDisplay` snippets before patching.
- No `writeFilter`. No `paintChip`. No `lookupFilterRef` in view.

---

## Section E. Forbidden extras

- Chip-A-only (skip-aria without hostDisplay overlay).
- `writeFilter` / `replaceFilterContext` same-Y echo.
- Import or copy `paintChip`.
- Change `resolveSanitizeSource` globally.
- Inline the committed matcher in the 150-line sanitizer.
- `lookupFilterRef(..., "pageContext", null)`.
- Flatten all pageContext `hostDisplay`s.
- Overlay on `#filterDock__global`.
- Default missing overlay scope to `"global"`.
- Rewrite leftover `aria-label` to Y.
- BW sanitize enable.
- Tab-activate observer.
- Badge-2 / last-member caption.
- `KDB.js` version bump.
