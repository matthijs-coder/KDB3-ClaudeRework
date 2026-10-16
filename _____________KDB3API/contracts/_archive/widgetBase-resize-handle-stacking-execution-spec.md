# Execution Spec: widgetBase resize handle stacking (`extension`)

> Mechanical spec. Architecture lives in `widgetBase-resize-handle-stacking-contractdelta.md` (**Approved**, PO vastenburg 2026-09-02, adapted A, not C).
> CSS only. One writer. Exclusive allowlist: `KDB3/css/widgets/widgetVis.css`.

---

**Status:** `Frozen` — PO Cognos green 2026-09-02. W1 CSS; mechanical PASS; semantic YELLOW documented in delta.
**Module / contract:** `contracts/widgetBase.md` + `contracts/widgetBase-resize-handle-stacking-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-02
**Executing AI:** grok 4.6 army (W1 CSS)
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist (W1)

**May edit:** `KDB3/css/widgets/widgetVis.css`

**Must not edit:** `widgetSettings.css`, `pdfCapture.css`, `jquery-ui.css`, `widgetResizeInteraction.js`, any `.js`, any other `.css`, `.mdc`, git.

---

## Section A. Pre-flight read list

Echo **one sentence** per row **before** editing:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — do not invent `_KDB` keys; this WP is CSS only.
2. `_____________KDB3API/.cursor/rules/state.mdc` — no state writes; resize ownership stays widgetBase.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — no runtime/abort changes.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no API change.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — no new CSS file; no vague folders; stay in existing widgetVis.css.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — no new class names; keep existing selectors.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — N/A for this CSS-only line.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — KDB handles stay on the widget shell; do not query `#main`; do not restyle Cognos `.resizeEdge.topRight`.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — N/A (no JS).
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no Cognos SDK; do not restyle host `.resizeEdge`.
12. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle term.
13. `_____________KDB3API/contracts/widgetBase-resize-handle-stacking-contractdelta.md` — `z-index: 10020 !important` on armed `.ui-resizable-handle` only.
14. This execution spec.

---

## Section B. Folder tree

No new files. Edit only:

```
KDB3/css/widgets/widgetVis.css
```

---

## Section C. Per-file specification

#### `KDB3/css/widgets/widgetVis.css`

- **Role:** existing widget chrome stylesheet (grandfathered home of resize-handle rules; not a new widgetBase.css)
- **Change:** in the grouped rule that currently sets `z-index: 1000` on

  `.widget.resizable-div.resizable-active .ui-resizable-handle`,
  `.liveWidget.resizable-div.resizable-active .ui-resizable-handle`,
  `.textWidget.resizable-div.resizable-active .ui-resizable-handle`

  replace that one declaration with `z-index: 10020 !important;`
- **Keep:** width/height `!important`, `display`, `position`, colors, all compass `top`/`left`/`right`/`bottom` rules, `.resizeEdge.topRight` crush, move-handle 9999
- **Rules to apply:** `dom.mdc` (chrome on existing selectors); `feature-structure.mdc` (no new file); `naming.mdc` (no new classes)

---

## Section D–I

N/A. No reducer, selectors, API, harness.

---

## Section J. Acceptance (self-verify)

1. The three-selector handle rule uses `z-index: 10020 !important` and no leftover `z-index: 1000` on that rule.
2. No other declaration in the file changed.
3. No `.resizeEdge` rule added or edited except if already untouched.
4. No JS files modified.
5. Report: 14 echoes + file checklist + line count of `widgetVis.css`.

---

## Section K. Forbidden actions

- Proposal C / any `.resizeEdge` z-index
- Editing `widgetResizeInteraction.js` `zIndex` option
- Changing settings 9999 or dropdown 10050
- New CSS file / `helpers` folders / git commit
- Silent extra CSS (hover, cursor, size)

---

## Section L. Reporting template

1. Pre-flight echo (14)
2. File checklist: path, line count, matches spec | deviation
3. Deviations (must be empty)
4. Section J pass/fail
5. Open questions — stop if blocked

---

## Section M. Reviewer handoff

Fresh reviewers (not W1):

1. Mechanical: only `widgetVis.css`; one declaration; `!important` present
2. Semantic: 10020 > 9999 and < 10050; no `.resizeEdge`; crush intact
