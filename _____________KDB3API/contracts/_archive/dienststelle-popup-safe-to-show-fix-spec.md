# Fix Spec: dienststelle popup safe-to-show gate

**Status:** Draft for execution approval
**Module / contract:** `_____________KDB3API/contracts/dienststelle.md`
**Phase:** micro-fix after display-sanitize timing T1
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

If this fix appears to require popup `aria-label` rewriting, filterDock observer changes, CSS changes, or `characterData` observation, stop and report instead of expanding scope.

---

## Section B. Bug

Observed DOM after expanding a Dienststelle DEZPV hierarchy option:

```html
<div
  data-tid="ba-common-truncated-text__text-node"
  class="ba-common-truncatedText__text KDB_dienststelle_popupLabelsReady"
  aria-label="M06|3h_Ref_ZKS # 3h2_ZKS - Girostelle"
  title="3h2_ZKS - Girostelle">M06|3h_Ref…irostelle</div>
```

Problem:

- `title` is sanitized.
- `aria-label` is intentionally raw in the current contract.
- visible `textContent` is still raw/truncated.
- `KDB_dienststelle_popupLabelsReady` is present, so CSS reveals the raw/truncated text.

Root cause:

The current `isLabelSafeToShow` logic can treat `title === sanitized` as sufficient even when the visible text is not sanitized.

---

## Section C. Scope

Allowed production file to modify:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/dienststelleDisplayLabelSanitizeSupport.js
```

No other production file is in scope.

---

## Section D. Required behavior

Tighten `isLabelSafeToShow` so that when a transformable source exists (a source containing `#`), a sanitized `title` alone is not enough to mark the label ready.

Rules:

- If no transformable source exists, the label is safe to show.
- If a transformable source exists, compute the sanitized display value from that source.
- The label is safe to show only when the visible `textContent` already equals that sanitized display value.
- Do not use `title === sanitized` as an independent reason to mark a popup label ready.
- Do not change `resolveSanitizeSource` source priority.
- Do not change `shouldTransformLabel`.
- Do not rewrite popup `aria-label`.
- Do not change `sanitizeDienststelleVisibleLabel` semantics.

This means a node whose title is sanitized but visible text is still raw/truncated remains not-ready and hidden by existing CSS.

---

## Section E. Explicitly out of scope

The executing AI must not:

- Modify `applyDienststelleDisplaySanitizing.js`.
- Modify `dienststelle.css`.
- Modify filterDock.
- Modify observer options or add observers.
- Enable `characterData`.
- Rewrite popup `aria-label`.
- Change selector strings.
- Change title sanitizing.
- Change committed display behavior.
- Change Cognos writes, defaults, history, Sicht, widget, state, runtime, public API, or events.
- Touch contracts, rules, templates, legacy trees, or `TEST/`.

---

## Section F. Acceptance criteria

AC1. Only `view/dienststelleDisplayLabelSanitizeSupport.js` is modified.

AC2. `isLabelSafeToShow` no longer returns true solely because `title === sanitized`.

AC3. A label with raw `aria-label` containing `#`, sanitized title, and raw/truncated visible text is not considered safe.

AC4. A label with no transformable source remains safe, so clean labels do not stay hidden.

AC5. A label whose visible text equals the sanitized value is considered safe.

AC6. Popup `aria-label` rewrite remains out of scope and is not implemented.

AC7. File remains under 150 lines and preserves AMD shape.

AC8. `ReadLints` is clean on the touched file.

AC9. Static inspection confirms no import path changes are needed unless the current implementation already requires none.

---

## Section G. Cognos smoke checks

After implementation, test:

1. DEZPV popup fake-expand leaf: node with raw `aria-label`, sanitized `title`, raw/truncated text should not become visible as ready.
2. DEZPV normal popup options: clean or successfully sanitized labels become visible.
3. DEZPV lower-level options: newly inserted nodes sanitize or remain hidden until safe.
4. BW popup: no unintended sanitizing or hiding.

---

## Section H. Reviewer handoff

The executing AI final report must include:

1. Pre-flight echo for Section A.
2. File checklist with before/after line count.
3. Description of the revised safe-to-show logic.
4. Confirmation that popup `aria-label` is still not rewritten.
5. AC1-AC9 pass/fail.
6. Lint result.
7. Any uncertainty or deviation.

