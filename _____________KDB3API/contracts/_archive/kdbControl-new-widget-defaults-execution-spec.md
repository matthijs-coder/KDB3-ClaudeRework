# Execution Spec: new-widget defaults (drag-start size, seed colour)

**Status:** Ready for execution
**Module / contract:** `_____________KDB3API/contracts/kdbControl-new-widget-defaults-contractdelta.md`
**Phase:** extension
**Authoring AI:** captain, 2026-09-24
**Executing AI:** one implementation subagent
**Reviewer:** a different subagent, contract against live code

The contract is approved. Echo the rule summaries in the work report, then edit. Do not reopen ownership.

---

## Section A. Pre-flight

Read before editing:

1. `kdb-object.mdc` — `_KDB` namespaces are fixed; features do not invent a top-level key.
2. `state.mdc` — one writer per subtree; others read via API or published selectors.
3. `runtime.mdc` — technical objects live under `_KDB.runtime.<owner>` with cleanup.
4. `module-public-api.mdc` — coarse `getState()` plus published selectors; no deep imports.
5. `events.mdc` — a known owner is called through its API, not a request-event.
6. `feature-structure.mdc` — orchestrator wires; logic stays in the owning folder; 150-line hard limit.
7. `naming.mdc` — English identifiers; underscore prefix on boundary inputs.
8. `error-handling.mdc` — named executables try/catch; reducers stay pure.
9. `dom.mdc` — selectors in `_KDB.elements`; live nodes in runtime.
10. `amd.mdc` — one `define` per file; no nested functions inside the entry.
11. `lifecycleVocabulary.md` — lifecycle words come from that list.
12. `cognos-adapter.mdc` — features do not call `_KDB.cognosAPI` or `__getDashboardAPI()`.
13. The contract delta named above.
14. This spec.

---

## Section B. Files

Edit only:

- `KDB3/js/dashboard/canvas/dragDrop/session/startDragSession.js`
- `KDB3/js/dashboard/canvas/widgets/widgetSettings/effects/collectVisualStartupDefaults.js` (`buildDefaultDescriptor` only)

Allowed only if `startDragSession.js` would exceed 150 lines after the replacement:

- one new helper under `KDB3/js/dashboard/canvas/dragDrop/session/` with a verb-noun name

Do not edit: archive contracts, `pageSurface`, inner-color paint, `handleSeedDefaults.js`, `placeWidgetOnCanvas.js`, avatar templates, `publishValidatedDrop.js`, `KDB.js`, writeback, history.

---

## Section C. Behavior to implement

Follow the contract sections 3, 4, and 5 literally.

Size: AMD-import `kdbControl/state/selectors.js`. At drag-start, `getState()` then `readVisualizationDefaults` or `readCommentDefaults`. Convert with `_KDB.utils.convertUnitToPx`. Remove the local `parseDimensionToPx` and the `*PropObj` branch. Empty or unparsable → `config/defaults.js` 300×300 or 300×75 per type. Session stores px. Missing API → empty strings → that same table. try/catch on the named function that performs the read; do not throw out of drag-start.

Colour: in `buildDefaultDescriptor`, same read (`live` → visualization, `text` → comment). Non-empty hex replaces `optionValue`, including when the panel option is already weiß. Palette key via existing `findMatchingOption`. Empty keeps weiß. `#00000000` passes through. No second paint. try/catch stays on the named helper that already owns this work, or on the helper you add at factory scope. No nested function inside the entry.

Both files ≤ 150 lines. No new top-level `_KDB` key. No `_KDB.state.kdbControl` read.

---

## Section D. Forbidden

- Resize or recolor an existing widget.
- A `core/utils` chooser for visualization vs comment.
- Import of kdbControl config, reducers, writeback collectors, or `resolveEffectiveColour`.
- Dashboard, inner Farbe, page alpha, text-contrast changes.
- Drive-by refactors.

---

## Section E. Acceptance

- Contract §3 call shape is the only kdbControl read.
- New visualization uses panel width/height at drag-start and panel background at seed.
- New text/comment uses the comment defaults the same way.
- Empty size → 300×300 or 300×75. Empty colour → weiß. `#00000000` stays transparent.
- `placeWidgetOnCanvas` and avatar templates contain no `defaultsNew` read.
- `settingsPostDispatchSideEffects` gains no visualization/comment intent.
- Line counts ≤ 150. AMD arity matches parameters.
