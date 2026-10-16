# Execution Spec: vis toggle panel WP2 (Iterator + Zoomleiste)

> Mechanical spec for grok 4.6 army. Architecture: `contracts/widgetSettings-vis-toggle-panel-wp2-contractdelta.md` (**Approved**). Compact zoom key **`wzbar`**. Choice A 3-way. One WP2.
> Echo Section A **before** producing files. Do not stamp `Implemented`. Do not start C / E / toast.

---

**Status:** `Implemented` — PO canvas groen 2026-09-13 evening (Prognose Zoomleiste on).
**Module / contract:** widgetSettings-vis-toggle-panel-wp2
**Phase:** `extension` (extract → apply → chrome)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-13
**Executing AI:** grok 4.6 army
**Reviewer:** captain + dual grok 4.6 review; PO Cognos canvas

---

## Waves

Three sequential phases. Writers inside a phase are **exclusive** (no shared files) and may run **parallel**. Do not start W-APPLY until W-EXTRACT dual review is GREEN. Do not start W-CHROME until W-APPLY kinds exist and dual review is GREEN.

Production root: `_____________KDB3API/`. Paths below are under `KDB3/js/` unless noted.

---

## Section A. Pre-flight

Read in order; echo **one sentence** each. Do not paste rule bodies.

1–11. The 10 MUST `.mdc` + `cognos-adapter.mdc`
12. `contracts/widgetSettings-vis-toggle-panel-wp2-contractdelta.md` (Approved) — product + walls + waves
13. This spec

Also echo: `wzbar` (5); `iter`; Choice A; Family A delete-key; KEEP-all-vis; no `settingFamily`; no third safeguard; no `handleApplySetting` edit; showValues Frozen; no extra `live[]` icons; bind kind-set only; piggyback startup barrel + **both** dereferences.

---

## W-EXTRACT (no chrome, no new GET keys)

Four exclusive writers, **parallel**.

### W-GET

**May edit / add:**
- `core/services/writeback/get/collectors/assignOptionalFlag01.js` (new)
- `core/services/writeback/get/collectors/buildWidgetObject.js`

**Change:** Extract the live 3-line `vals` emit into `assignOptionalFlag01(target, compactKey, value)` — omit when `typeof value !== "boolean"`; else `target[compactKey] = value ? 1 : 0`. Replace the `vals` block with one call. **Do not** add `iter` / `wzbar` yet. File stays ≤150. AMD 2→3.

**Must not:** schema keys, restore, CSS, options, other extract files.

### W-SNAP

**May edit / add:**
- `dashboard/widgets/widgetSettings/effects/visKindToControl.js` (new)
- `dashboard/widgets/widgetSettings/effects/buildWidgetVisSettingsSnapshot.js`

**Change:** Move `KIND_TO_CONTROL`, `isWidgetVisKind`, `kindToControl` into the sibling. Snapshot file imports them. **Do not** add iterator/zoom kinds yet. Leave grouping grain tests in the snapshot file. Both ≤150. AMD +1 on snapshot.

**Must not:** other extract files, apply writes.

### W-PROPS

**May edit / add:**
- `dashboard/widgets/widgetVis/effects/shouldApplyVisualizationProperties.js` (new)
- `dashboard/widgets/widgetVis/effects/applyVisualizationProperties.js`

**Change:** Move `APPLY_ON_REASON` + `shouldApply*` (live ~10–31) into the sibling. Apply file imports and calls it. **Do not** add iterator/zoom reasons or a new overlay yet. Apply file must drop below 150 after extract.

**Must not:** generalize `overlayShowValuesOnLayoutMap`; edit `handleApplySetting.js`.

### W-STAMP

**May edit / add:**
- `dashboard/widgets/widgetSettings/view/markPanelOption.js` (new)
- `dashboard/widgets/widgetSettings/view/stampPanelVisType.js`

**Change:** Extract the shared mark/clear used by `markShowValuesOption` / `markGroupingOption` into `markPanelOption`. Stamp file stays ≤150. **Do not** add iterator/zoom marks yet.

**Must not:** bind, CSS, closeVisibleDropdowns.

### W-EXTRACT nobody

`handleApplySetting.js`, `applyShowValues.js`, `KDB.js`, `sorting.js`, `.mdc`, contracts (captain), `options.js`, schema, bind.

---

## W-APPLY (machine — after extract GREEN)

Three exclusive writers, **parallel**. Compact key **`wzbar`**. State keys: `iterator`, `zoom` (kind `zoom`).

### W-WRITE

**May edit / add:**
- `dashboard/widgets/widgetVis/actions/handleApplyIteratorZoom.js` (new)
- `dashboard/widgets/widgetVis/effects/applyIteratorZoom.js` (new)
- `dashboard/widgets/widgetVis/actions/handleApplyStartupSettings.js` (barrel `{ handleApplyStartupSettings, handleApplyIteratorZoom }`)
- `dashboard/widgets/widgetVis/actions/handleParameterSetBinding.js` (dereference startup)
- `dashboard/widgets/widgetVis/actions/actionRouter.js` (route `widgetVis/applyIteratorZoom` + dereference startup route — **no new AMD import**)
- `dashboard/widgets/widgetVis/config/actionTypes.js` (one new type)
- `dashboard/widgets/widgetSettings/effects/intentDispatchMap.js` (kinds `iterator` / `zoom` → new apply)

**Change:** One handle/write pair, both kinds via `payload.control`. Clone showValues **envelope**, not inherit-catalog body. One write loop + two maps: iterator Ein-true = Pie only (`widget.iterator`); zoom Ein-true = Line / StackedBar / StackedColumn / Prognose (`zoom.bar.enable`). List **or** TopN = skip. Inherit: allowlist → write `false`; else no-op. Ein skip = `{ ok: true, skipped }` **without** `reportToSettings`; no commit `1`; no history. `setContentProperty` only. Overlay **not** stuffed into the write file if that would pass 150 — sibling overlay OK; never generalize `overlayShowValuesOnLayoutMap`. New `APPLY_ON_REASON` keys go in the already-extracted shouldApply file **only if this writer is also allowed that file**; otherwise W-OVERLAY below.

If `applyVisualizationProperties.js` / `shouldApplyVisualizationProperties.js` need the new reason + overlay call: **this writer may edit those two** (they are idle after extract). New overlay reads `_KDB.api.widgetSettings.getState().byWidget[id]`. Startup copy of explicit iterator/zoom on `handleApplyStartupSettings` (the function body, slack).

**Must not:** `handleApplySetting.js`, showValues files, `handleContentCreate.js`, extra `live[]` icons.

### W-STATE

**May edit:**
- `dashboard/widgets/widgetSettings/config/kindToStateKey.js`
- `dashboard/widgets/widgetSettings/state/commitWidgetSettingValue.js` (inherit-delete clone `value === "inherit"` for iterator/zoom — not grouping)
- `dashboard/widgets/widgetSettings/config/options.js` (new keys only: same 3-way `off`/`inherit`/`on`, labels Aus/Standard/Ein, inherit `isDefault: true`, kinds `iterator` / `zoom`)
- `dashboard/widgets/widgetSettings/effects/resolveCanonicalVisOptionValue.js` (boolean parse for new kinds; unique keys `iter-on` / `zoom-on` must parse boolean)
- `dashboard/widgets/widgetSettings/actions/parameterSetBindingHelpers.js`
- `dashboard/widgets/widgetSettings/effects/readEffectiveSettingsContext.js`
- `dashboard/widgets/widgetSettings/effects/finalizeVisIntentResult.js` (stamp new kinds via existing `_stampPanelVisType` import — no third safeguard)
- `dashboard/widgets/widgetSettings/effects/visKindToControl.js` (add iterator/zoom)
- `dashboard/widgets/widgetSettings/effects/buildWidgetVisSettingsSnapshot.js` (append explicit booleans only)

**Must not:** `controlDefinitions.js` extra icons. `handleApplySetting.js`.

### W-WB

**May edit:**
- `core/services/writeback/schema/v3Defaults.js` (`WIDGET_FIELDS.vis.iter` + `.wzbar`, number optional)
- `core/services/writeback/schema/validate/validateWidgetFields.js` (`0|1` for `iter` / `wzbar`, clone vals)
- `dashboard/widgets/widgetSettings/actions/handleParameterSetRestoreBatch.js` (`VIS_KEYS`)
- `dashboard/widgets/widgetSettings/actions/parameterSetRestoreBatchCommits.js` (clone vals `hasOwnProperty` + `commitDirect`, not grp)
- `core/services/writeback/get/collectors/buildWidgetObject.js` (add `iter` + `wzbar` via `assignOptionalFlag01`)

**Together.** Unknown field stays invalid until these land. v2 omit. No `SCHEMA_VERSION` bump.

---

## W-CHROME (after W-APPLY GREEN)

Two exclusive writers, **parallel**.

### W-CSS-POP

**May edit:**
- `KDB3/css/widgets/widgetSettings.css` (WP1 block retarget: `nth-child`, `grid-row: 2`, `:first-child`/`:last-child`, `:has(>)`; nest un-flyout; row-hide by `data-kdb-vis-type`; not `toggle-button.css`; not shared radio/dashed/`KDB_visible { display: block }`)
- `dashboard/widgets/widgetSettings/view/populateStaticDropdown.js`
- `dashboard/widgets/widgetSettings/view/buildDropdownOptions.js`
- `dashboard/widgets/widgetSettings/view/dropdownPopulateHelpers.js`

**Change:** Birth inner hosts in populate (own `data-kdb-dropdown-kind` `iterator` / `zoom`, **no** `KDB_visible`). No-wipe inners. Per-host `ensureDropdownSelected`. Phrase outside inner or as option. Header once (`::after`). Extra rows = phrase + 66×22 pill. Pie hide Zoomleiste; Line / Stacked* / Prognose hide Iterator; List icon hide stays. Unique option keys (`iter-off` / `iter-inherit` / `iter-on`, `zoom-off` / …).

### W-BIND

**May edit:**
- `dashboard/widgets/widgetSettings/view/bindWidgetSettingsPanel.js` (keep-open kind-set `showValues|iterator|zoom` on the **container** kind check; wall **213 → ≤220**)
- `dashboard/widgets/widgetVis/effects/focusMode/bindFocusPanelInteractions.js` (same set on **option-kind-first**)
- `dashboard/widgets/widgetSettings/view/stampPanelVisType.js` (per-group marks via extracted `markPanelOption`; do not wipe inners)

**Must not:** `closeVisibleDropdowns.js`, `domQueries.js`, stay-open helper, bind rewrite. **Do not** edit `pushHistoryAfterConfirmedApply.js` (title-dropdown `ok+skipped` stays history-worthy by design). Ein-skip has no chrome (row/icon hide) so that helper is not the WP2 history gate.

**W-APPLY leftover (folded):** semantic review noted that helper still treats any `ok: true` skip as history. Product guard is chrome hide, not a history-helper rewrite.

### W-MARK (after W-CHROME HOLD — nest isolation)

Chrome dual: nest/hide/keep-open GREEN; **HOLD** because `markSelectedOption` + `markPanelOption` `querySelectorAll` descendant options on the **outer** flyout. A Werte-anzeigen pick (keep-open) clears Iterator/Zoomleiste knobs. Finalize stamps extras only after `visualization` / `iterator` / `zoom`, not after showValues. Safeguard revert and history replay of showValues take the same path.

**May edit:**
- `dashboard/widgets/widgetSettings/view/dropdownOptionSelection.js` (live 43)
- `dashboard/widgets/widgetSettings/view/markPanelOption.js` (live 33)

**Change:** Per-host isolation. Clear / read only options whose `closest(dropdownSelector) ===` that host. Outer showValues pick must not unmark inner knobs. `readSelectedOption` must not return an inner pill when asked for the outer. Same isolation in `markPanelOption` so stamp’s showValues mark does not wipe extras (order-independent). Both files stay ≤150. AMD unchanged (1 / 1).

**Must not:** bind rewrite, CSS, populate, finalizeVisIntentResult.js, showValuesDropdownSafeguard.js, Frozen apply, `closeVisibleDropdowns.js`, `pushHistoryAfterConfirmedApply.js`. Do not stamp extras after showValues as a substitute (would still flash).

### W-CHROME nobody

`KDB.js`, `sorting.js`, `.mdc`, contracts, showValues Frozen files, `handleApplySetting.js`.

---

## Acceptance

- New widget: Iterator (Pie) / Zoomleiste (Line / Stacked* / Prognose) mark **Standard**; GET omits `iter` / `wzbar`.
- Ein → `1` + host write only on allowlist. Aus → `0` every type. Standard deletes key.
- Dropdown stays open on pick of these kinds. Outside click closes.
- Werte-anzeigen pick on an open nest must **not** unmark Iterator / Zoomleiste knobs (per-host clear).
- Line Ein Zoomleiste → Pie (row hidden, GET `wzbar:1`) → Line still Ein.
- No `wtzoombar`. No `settingFamily`. No third safeguard. No extra icon.

---

## Approval log

| Date | Status | Notes |
|---|---|---|
| 2026-09-13 | Ready | Approved delta + `wzbar`. Exclusive waves. |
| 2026-09-13 | Apply GREEN | W-WB + W-STATE + W-WRITE dual GO. |
| 2026-09-13 | Chrome HOLD | Nest GREEN; Werte-anzeigen pick wiped extra knobs. |
| 2026-09-13 | Mark GREEN | Per-host `closest === host`. Chrome HOLD closed. PO canvas next. |
| 2026-09-13 | Canvas amend | PO: undo/redo GO. Hide Prognose Zoomleiste. |
| 2026-09-13 | Implemented | PO canvas GO. |
| 2026-09-13 | Prognose zoom on | Host gained zoom bar. Canvas groen. Implemented. |
