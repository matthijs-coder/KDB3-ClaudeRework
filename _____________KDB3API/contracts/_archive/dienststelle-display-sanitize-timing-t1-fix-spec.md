# Fix Spec: dienststelle display sanitize timing T1

**Status:** Draft for execution approval
**Module / contract:** `_____________KDB3API/contracts/dienststelle.md`
**Phase:** narrow display-sanitizing timing fix
**Authoring AI:** GPT-5.5, 2026-06-05
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
12. This fix spec.

If the fix appears to require filterDock observer changes, CSS committed-display hiding, a Dienststelle-owned observer, or Cognos polling, stop and report.

---

## Section B. Bug

Observed issues:

- Raw Dienststelle DEZPV labels are briefly visible before sanitizing.
- Raw text is briefly visible in committed bottom display after manual commit.
- Popup options, especially lower-level hierarchy nodes, sometimes remain unsanitized after opening or expanding.

Investigation summary:

- Popup labels are hidden by CSS until they get `KDB_dienststelle_popupLabelsReady`.
- Current popup code can add that ready class even when text was not actually sanitized.
- Current popup scan may pick only the first matching label per wrapper/selector.
- Manual commit display sync uses a bounded `requestAnimationFrame` defer, currently two frames, which may still run before Cognos completes closed-filter paint.

---

## Section C. Scope

Allowed production files to modify:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/applyDienststelleDisplaySanitizing.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/dienststelleDisplayLabelSanitizeSupport.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/runDienststelleReconcile.js
```

No other files are in scope.

---

## Section D. Required behavior

### D1. Popup ready means safe to show

Change popup ready marking so `KDB_dienststelle_popupLabelsReady` is added only when the label is safe to show:

- the label text/title was sanitized by this pass; or
- all available source text is already clean and contains no `#`; or
- the label already displays the sanitized output for its source.

Do not mark a popup label ready when available source text still contains a raw `#...` value that has not been sanitized.

This supersedes the cleanup-tranche behavior that always marked popup nodes ready after a scan. The CSS intent is now strict: not-ready remains hidden until the display text is safe.

### D2. Popup scan should include all matching labels in a wrapper

In the popup label query path, collect all matching label nodes per `.ba-common-listItem-wrapper` and selector instead of only the first match per selector.

Rules:

- Preserve the existing wrapper-first ordering.
- Preserve root-level fallback query and deduplication.
- Do not expand selector strings.
- Do not change `optionLabelSelectors`.
- Do not scan outside the existing popup root.

### D3. Manual commit committed-display sync gets a little more time

Increase the bounded user-confirm display defer in `runDienststelleReconcile.js`:

```js
USER_CONFIRM_DEFER_FRAMES: 2 -> 4
```

Rules:

- Do not remove the bounded rAF approach.
- Do not add timers, observers, polling, or logs.
- Do not change non-user reconcile timing.
- Do not change the conditional extra pageContext committed sync added by the previous fix.

---

## Section E. Explicitly out of scope

The executing AI must not:

- Modify `filterDock`.
- Modify `dienststelle.css`.
- Add committed-display ready CSS/classes.
- Add a Dienststelle-owned `MutationObserver`.
- Enable `characterData` observation.
- Widen filterDock observer roots or attribute filters.
- Add post-commit observers, timers, polling, or retries outside the existing bounded rAF pattern.
- Rewrite popup `aria-label`.
- Change selector strings, `optionLabelSelectors`, `committedDisplaySelector`, or `committedDisplayParentSelector`.
- Change `shouldSanitizeOptionDisplay` behavior.
- Change `sanitizeDienststelleVisibleLabel` semantics.
- Change Cognos writes, defaults, history, Sicht sync, widget sync, header-resync, state shape, runtime buckets, public API, or events.
- Touch contracts, rules, templates, legacy trees, or `TEST/`.

---

## Section F. Implementation guidance

Likely implementation shape:

1. Add a small helper in `dienststelleDisplayLabelSanitizeSupport.js`, for example:

```js
function isLabelSafeToShow(_labelEl, _sanitizeLabel) { ... }
```

or a similarly named helper that checks the same source priority used by `resolveSanitizeSource`.

2. In `applyDienststelleDisplaySanitizing.js`, update `sanitizePopupLabelsInRoot` so it calls `markLabelNodeReady` only if:

```js
didStrip || isLabelSafeToShow(labelEl, sanitizeLabel)
```

3. Update `queryLabelTextNodes` so each wrapper uses `querySelectorAll(selector)` for each selector and pushes all matches into the existing dedup set.

4. In `runDienststelleReconcile.js`, change only the user-confirm frame constant from `2` to `4`.

Keep all helpers at AMD factory scope. Keep files under 150 lines.

---

## Section G. Rules to apply

All touched files:

- `amd.mdc` — one full-compact AMD `define`, no ES module syntax, no nested subfunction definitions.
- `feature-structure.mdc` — touched files remain under 150 lines.
- `naming.mdc` — helper names are precise English terms.

View sanitizing:

- `dom.mdc` — preserve scoped DOM traversal; no live DOM refs in state.
- `runtime.mdc` — no observer/timer/runtime resource changes.
- `state.mdc` — no state shape or writer changes.

Effects timing:

- `error-handling.mdc` — no silent catches or logging changes.
- `module-public-api.mdc` — no public surface changes.
- `events.mdc` — no events.

---

## Section H. Acceptance criteria

AC1. Only the three files listed in Section C are modified.

AC2. Popup labels are marked `KDB_dienststelle_popupLabelsReady` only when safe to show.

AC3. Clean labels that contain no `#` are still marked ready and do not remain hidden.

AC4. Labels containing raw `#...` text are not marked ready unless the displayed text/title was sanitized or already equals the sanitized output.

AC5. Popup scan preserves wrapper-first ordering, root-level fallback, and deduplication while collecting all matching label nodes per wrapper.

AC6. No selector strings or CSS files are changed.

AC7. `USER_CONFIRM_DEFER_FRAMES` is `4`; no other timing primitive is added.

AC8. No filterDock, observer, runtime, state, history, widget, Sicht, tableData, Cognos write, or public API behavior is changed.

AC9. All touched files remain under 150 lines and preserve AMD shape.

AC10. `ReadLints` is clean on all touched production files.

AC11. Static inspection confirms AMD imports still resolve.

---

## Section I. Cognos smoke checks

After implementation, test:

1. DEZPV popup open: no raw `#...` option label becomes visible before sanitizing.
2. DEZPV popup expand lower-level nodes: new lower-level options become sanitized or remain hidden until safe.
3. DEZPV popup scroll/reopen: virtualized/recycled rows sanitize consistently.
4. DEZPV manual confirm: committed bottom display raw text is not visible or is visibly reduced.
5. DEZPV global clear + pageContext default: pageContext committed display remains sanitized.
6. BW flows: no unwanted sanitizing side effects.
7. Sicht toggle DEZPV -> BW -> DEZPV: popup and committed displays remain correct.

---

## Section J. Reviewer handoff

The executing AI final report must include:

1. Pre-flight echo for Section A.
2. File checklist with before/after line count.
3. Description of popup ready semantic change.
4. Description of popup scan change.
5. Confirmation of `USER_CONFIRM_DEFER_FRAMES = 4`.
6. Confirmation that no out-of-scope file was modified.
7. AC1-AC11 pass/fail.
8. Lint result.
9. Any uncertainty or deviation.

