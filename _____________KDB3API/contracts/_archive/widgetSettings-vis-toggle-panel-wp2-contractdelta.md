# Contract Delta: vis toggle panel WP2 (Iterator + Zoomleiste)

> New feature delta. Not a second D2 lift. Not “add two CSS rows.”
> PO vastenburg 2026-09-12: **both** controls. Labels **Iterator** / **Zoomleiste**. Header stays **`aus / Std. / ein` once**. Not C / E / toast / grouping / `settingFamily`.

---

**Status:** `Implemented` — iterator chrome and unset-effective amended 2026-09-28 by `contracts/widgetSettings-iterator-standard-on-contractdelta.md` (Pie / Line / Stacked* Standard = on). Zoomleiste law below is unchanged except where that delta says so.
**Owner module / service:** `widgetSettings` (chrome, state, history, GET/restore); `widgetVis` (property-only apply)
**Type:** `feature-module contract delta`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-12
**Reviewed by:** nest/GET/catalog dual HOLD folded; Draft dual HOLD folded; stress-test FAIL on `wtzoombar` → PO **`wzbar`** (5, widget zoom bar). **Approved** PO vastenburg 2026-09-13.
**Related rules:** `feature-structure.mdc` (workflow), `state.mdc`, `dom.mdc`, `naming.mdc`, `amd.mdc`, `cognos-adapter.mdc`
**Family:** A inherit. Chrome key `inherit` never stored. Forbidden stored: `"inherit"` / `"none"` / `"default"` / `""` / `"standard"`.

**Parents this delta amends** (one-liners on Approved — not JS)

| Parent | Slice |
|---|---|
| `contracts/widgetSettings.md` §4.2 | Pointer: live A chrome now includes Iterator / Zoomleiste Standard position (same pill family as showValues). |
| `contracts/widgetSettings-setting-family-contractdelta.md` | Classify `iterator` / `zoom` as A KEEP-all-vis. §5: no helper / registry this WP. Writeback catalog + validate + GET + restore **together**. |
| `contracts/widgetSettings-family-a-inherit-row-chrome-contractdelta.md` | Clone **delete-key** (H), not grouping CLEAR. Unset marks **Standard** position, not Diagrammstandard row. |
| `contracts/widgetVis-show-values-contractdelta.md` | **Pointer only.** KEEP / `vals` / List / catalog / seed / contrast / `overlayShowValuesOnLayoutMap` stay Frozen. |
| `contracts/writeback.md` §4.5 / §4.5.1 | New optional vis keys (own omit clause each; clone `vals`, not `grp`). |
| `contracts/widgetSettings-parameterSetRestore-contractdelta.md` | Consume the new keys; missing → leave absent. |
| `contracts/historyService.md` | **No new key.** Replay stays `widgetSettings_optionSelect`. New `kind` on the option. |
| `contracts/cognosHostService.md` | **No new facet / no new op.** `visualizationFacet.setContentProperty` only. |

**Parked (remind, do not start):** grouping **C**; grouping **E** JS (Approved as comparison only); toast PROGRAM; `_KDB.services.settingFamily` cleanup.

---

## 1. Purpose

The showValues dropdown becomes a **toggle panel**: one shared header, stacked Family A 3-ways. WP1 already restyled Werte anzeigen. WP2 adds **Iterator** and **Zoomleiste** (`zoom.bar.enable`, Line / StackedBar / StackedColumn / Prognose chrome), both Family A, KEEP-all-vis, property-only apply. Iterator relevance and Standard-on are `contracts/widgetSettings-iterator-standard-on-contractdelta.md`.

This is **new product**, not a live writeback gap and not a D2 reopen.

---

## 2. Diagnose (A vs B)

| Question | Verdict |
|---|---|
| Contract ≠ live showValues / KEEP / `vals` / List / catalog / seed? | **Not A.** D2 Frozen + H + WP1 Implemented. |
| Memo “bind 208 shut / close-on-pick”? | **A — stale.** Live keep-open (WP1 P1). Prefer this delta + WP1 over the 2026-09-12 memo. |
| Iterator / Zoomleiste missing from `definitions.js`? | **Not A.** Zero keys is the lock. Do not bake host names into the catalog. |
| Flat stack / “just add CSS rows” fails? | **B.** One `.KDB_IconsDropdown` = one radio group + WP1 child grid. Product is coherent; the layer cannot host N independent Family A groups without nest + wall lifts. |
| GET / snapshot / overlay / stamp / router? | **B — overwhelmed.** Live counts match the handoff wall table. Extract **before** both keys / before marks. |

Silent contract↔code drift is forbidden. Extracts are named here; they are not hidden inside “add two rows.”

---

## 3. Product (locked)

| Topic | Law |
|---|---|
| Sequence | **S5:** WP1 done. WP2 = **both** Iterator + Zoomleiste. |
| Labels | Row phrases **Iterator** / **Zoomleiste**. Header **`aus / Std. / ein` once** (not per row). showValues aria stays Aus / Standard / Ein. |
| Iterator chrome | **Pie, Line, StackedBar, StackedColumn.** Host `widget.iterator` (PO 2026-09-28). Hide Prognose. See `widgetSettings-iterator-standard-on-contractdelta.md`. |
| Zoomleiste | **`zoom.bar.enable` only.** Not `zoom.items.default.count`. Relevant = **Line / StackedBar / StackedColumn / Prognose**. **Not** Pie, List. (Prognose host gained a zoom bar — PO 2026-09-13 evening.) Not relevant = **hide the row** in this dropdown (keep-DOM). List = whole icon already hidden. |
| New-control unset | Field absent. GET omit. Family A. Do not seed. Unset **marks Standard** (`inherit`), not Aus. **Zoom** inherit value stays **off**. **Iterator** inherit value is **on** for Pie / Line / StackedBar / StackedColumn and **off** elsewhere (`widgetSettings-iterator-standard-on-contractdelta.md`). |
| Explicit Aus | Persist **`0`** on every type, including hide types. |
| KEEP | **KEEP-all-vis.** Chrome hide ≠ delete. GET emits compact `0\|1` **when explicit**, including types without chrome. Not grouping CLEAR. |
| showValues | **Unchanged** inherit (Line/Prognose hide; Stacked*/Pie show). |
| Copy | Hardcoded DE. Not `_KDB.config.labels.de`. Never `Gruppierung*`. |
| Homonym | Dashboard `setDashboardZoom` / header zoom-hint ≠ vis `zoom.bar.enable`. |

**Writeback keys:** `iter` (iterator). Zoom: PO 2026-09-13 **`wzbar`** (5 chars, widget zoom bar). Not `wtzoombar`. ≤5, not `dim`, no `SCHEMA_VERSION`. Own GET omit per key.

---

## 4. Chrome (gated nest — not extra-kinds-as-rows)

**FAIL (do not ship):** flat stack of independent Family A groups in one `.KDB_IconsDropdown`. Extra children merge onto WP1 `grid-row: 2` / `:nth-child(1/2/3)` / `:has(>)` one-pill paint. `markSelectedOption` + `stampPanelVisType.markShowValuesOption` clear **all** descendant `[data-kdb-option-value]`. Shared `inherit`/`on`/`off` collide. History `closest` = one box.

**Own kinds + unique keys without nest do not salvage stamp/mark.** Unique keys (`iter-on`) fix replay first-match only.

**Rec (S3 gated nest):**

- One outer `.KDB_showValuesContainer` flyout (`KDB_visible` + keep-open on the **container**).
- Header **once:** outer `::after` `aus / Std. / ein`. Extra rows = phrase + 66×22 pill only. Header-from-`.textIcon` is a **one-row trick**, not the N-row law.
- Row 1: Werte anzeigen + existing three **child** pills (`off` / `inherit` / `on`, kind `showValues`). WP1 air/knob/S1 invert **unchanged**.
- Extra rows: **inner** hosts, own `data-kdb-dropdown-kind` (`iterator` / `zoom`), options carry that kind. Inners **must not** take `KDB_visible` (`closeVisibleDropdowns` / `hidePanelDropdowns` hide every `.KDB_IconsDropdown.KDB_visible`). Un-flyout CSS: in-flow + visible without that class.
- Phrase: option **or outside** the inner (non-option pixels on an inner `.KDB_IconsDropdown` close the panel — bind ~70).
- Keep-open **kind-set** (`showValues` \| `iterator` \| `zoom`) on `bindWidgetSettingsPanel.js` **and** `bindFocusPanelInteractions.js` (container kind vs option-kind-first — apply the set to each file’s existing source). Bind live **213**. WP1 wall was ≤214. Lift **213 → ≤220**. **No** stay-open helper for all dropdowns. **No** edit of `closeVisibleDropdowns.js` / `domQueries.js`. Family §5 “bind stays generic” is **lifted** this WP to: generic kind-set only (not a rewrite).
- If extras kept `kind: "showValues"` that is a **product bug** (history/stamp think showValues). Extra rows never ship as `showValues`.
- N-row CSS: retarget off blanket `> .dataWidgetIcon` `grid-row: 2`, `:nth-child(1/2/3)`, **and** `:first-child` / `:last-child` pill radius (a sibling inner host after the three pills breaks the 66×22 end-cap). Scope WP1 pill rules to the **showValues row only**. Each inner row gets its own scoped pill overrides. Do not edit the shared radio/pad/dashed block.
- Row hide **keep-DOM:** not relevant = **not shown** in this dropdown. CSS from existing `data-kdb-vis-type`: Pie hide Zoomleiste; **Prognose** hides Iterator (Line / Stacked* show it, 2026-09-28); List keeps **icon** hide. Do **not** fold row-hide into stamp JS. Widget and focus panel share that CSS rule.
- **Placement (2026-09-28):** do not pin Iterator and Zoomleiste to the same grid row. Iterator phrase + host: `grid-row: 3`. Zoomleiste phrase + host: `grid-row: 4`. Prognose remounts Zoomleiste to `grid-row: 3` under both `.KDB_widgetSettings` and `.KDB_focusModeSettingsPanel` (iterator is `display: none`, so row 4 would otherwise leave an empty track). Pie leaves Zoom `display: none`. Header stays row 1. Werte anzeigen stays row 2.

**Populate:** `clearDropdownChildren` on `.KDB_showValuesContainer` wipes inners. Inner hosts are **born in** `populateStaticDropdown` (not `buildSettingsIcon` unless that file is added to W-CHROME). Scope `ensureDropdownSelected` **per host** (first-default in the whole subtree marks the wrong group). W-CHROME starts **only after** W-APPLY kinds exist.

---

## 5. Family A machine (clone `vals` / H delete-key)

| Concern | Law |
|---|---|
| Stored unset | Field **absent**. Chrome `inherit` never stored. |
| Stored explicit | `true` \| `false`. |
| Seed / `VIS_STARTUP_KINDS` | **Do not** add. |
| Unset chrome | Mark **Standard** (same pill as showValues). Do not mark Ein/Aus from catalog. |
| Inherit click | **Delete** the field. Clone H (`value === "inherit"`). Not grouping CLEAR / illegal-token delete. |
| Concrete click | Commit explicit boolean **only after** apply `ok: true` and **not** `skipped`. Ein fail-close: skipped write does **not** commit `1` (chrome+GET would lie). |
| visType switch | KEEP explicit. Unset stays absent → off. |
| GET | Omit when inherit. Persist explicit `0` even when equal to catalog / on hide types. |
| SET / restore | `hasOwnProperty` only. Missing → leave absent. Present `0`/`1` → boolean. |
| Snapshot | Include only when explicit. Completeness triad stays `{ dimension, visType, topNChoice }`. New kinds **must** enter `isWidgetVisKind` / `KIND_TO_CONTROL` or commit-after-apply skips. |
| History | Same key `widgetSettings_optionSelect`. Kind on the **option**. First paint is not a history step. |

The Family-gate question (“does unset effective change on visType switch?”) is **No for zoom** (off everywhere) and **Yes for iterator** when the new type’s Standard differs (on for Pie / Line / Stacked*, off for Prognose and the rest). They are still **A**, not B: B omit-when-equals-default would collapse Standard/Aus after save. A persist-`0` is the PO lock. Explicit booleans still KEEP.

No `_KDB.services.settingFamily`. Iterator / Zoomleiste **are** the third A; helper waits for a **later** cleanup WP (Family §5).

---

## 6. Apply allowlist (not `definitions.js`)

`definitions.js` has **seven** types (`Line`, `StackedBar`, `StackedColumn`, `Pie`, `List`, `Prognose`, `TopN`) and **zero** `widget.iterator` / `zoom.bar.enable`. Keep it that way. Overlay must not mutate catalog objects. Write-fn reads maps only via `resolveVisualizationLayoutPropertyValues` (H isolation). Facet: `setContentProperty` only — **no `getContentProperty`**.

Chrome hide ≠ apply write ≠ GET emit.

| visType | iterator chrome | iterator Ein-true | zoom chrome | zoom Ein-true | iterator unset | zoom unset |
|---|---|---|---|---|---|---|
| Line | yes | **yes** (`widget.iterator`) | yes | **yes** (`zoom.bar.enable`) | **on** | off |
| Prognose | no | **no** | yes | **yes** (`zoom.bar.enable`) | off | off |
| StackedBar | yes | **yes** (`widget.iterator`) | yes | **yes** (`zoom.bar.enable`) | **on** | off |
| StackedColumn | yes | **yes** (`widget.iterator`) | yes | **yes** (`zoom.bar.enable`) | **on** | off |
| Pie | yes | **yes** (`widget.iterator`) | no | **no** (do not copy Line zoom) | **on** | off |
| List | no | **no** | no | **no** | off | off |
| TopN | no | **no** | no | **no** | off | off |

**TopN** is a catalog key (`id: "List"`) but `normalizeVisualizationType` does **not** alias `TopN` → `List`. New apply List-skip is `List` **or** `TopN`. Do **not** edit Frozen `applyShowValues`. User chrome visType is `"list"`; helper widgets use `"TopN"`.

PO 2026-09-13 zoom lock stands: Zoom relevant = Line / Stacked* / **Prognose**. Pie / List / TopN = hide Zoomleiste; never write zoom `true` there. Iterator relevance and Standard-on are amended 2026-09-28: Pie / Line / StackedBar / StackedColumn. Fail-close remains only where that control’s chrome is hidden. Explicit `false` is never treated as Standard.

**Ein / Aus / inherit when property absent** (clone List/wrong-vis; do **not** blindly clone `applyShowValues` inherit-write-false):

- **Ein:** write `true` only on the allowlist. Else `{ ok: true, skipped }` **and do not commit `1`**. Skipped must **not** carry `reportToSettings` (`isVisApplyConfirmed` treats skip+report as confirmed). No history on skip. Never write `true` where chrome is hidden. Never write `zoom.bar.enable` on a type without that property.
- **Aus:** state/GET persist `0` on every type, including hide types. Do **not** B-omit false. Host write `false` only if the property is allowlisted; else no-op (state still `0`).
- **inherit:** always delete the key (GET omit). Host: iterator allowlist → write the type’s Standard (**true** on Pie / Line / StackedBar / StackedColumn, **false** elsewhere that still has the key — none today). Zoom allowlist → write **off** (`false`). Absent property → no-op. Branch with `typeof value === "boolean"` so explicit Aus is not Standard.

New `APPLY_ON_REASON` keys = control names (`iterator` / `zoom`). **Not** `reason: "showValues"`. **Do not** generalize `overlayShowValuesOnLayoutMap`.

One new handle/write pair serving **both** kinds via `payload.control`: `handleApplyIteratorZoom.js` / `applyIteratorZoom.js` under `widgetVis/actions/` + `widgetVis/effects/`. ShowValues files stay Frozen.

**KEEP overlay:** `handleApplySetting.js` is **149 — do not edit** (it copies only `showValues` onto visType pipeline settings). New overlay reads `_KDB.api.widgetSettings.getState().byWidget[id]` (live owner; **no** new `state/selectors.js`). Also copy through `parameterSetBindingHelpers.js` / `readEffectiveSettingsContext.js` (today they copy only `showValues` / grouping). Startup copy may land on `handleApplyStartupSettings.js` (117, slack).

---

## 7. File walls (lift explicitly — extract first)

Live army counts (2026-09-12):

| File | Now | Law this WP |
|---|---|---|
| `buildWidgetObject.js` | **144** | Two 3-line `0\|1` emits = **150 exactly**. Extract `assignOptionalFlag01` **before** both keys. |
| `buildWidgetVisSettingsSnapshot.js` | **149** | Extract `visKindToControl.js` (`KIND_TO_CONTROL` / `isWidgetVisKind` / `kindToControl`). Then append explicit fields. |
| `applyVisualizationProperties.js` | **150** | Extract `shouldApplyVisualizationProperties.js` **before** a new overlay call + new `APPLY_ON_REASON`. |
| `handleApplySetting.js` | **149** | **Do not edit.** |
| `actionRouter.js` | AMD **14** | Routes only, **no new import.** Piggyback already-imported `handleApplyStartupSettings.js`. Live factory **returns the function**; a barrel object breaks **two** call sites: `handleParameterSetBinding.js` **and** `actionRouter.js` `routes[APPLY_STARTUP_SETTINGS]`. Barrel + **dereference both** only in **W-APPLY**. `handleContentCreate.js` is already AMD **10** — no new import there. **If piggyback is refused → fifth extract / router split = prelude WP.** |
| `finalizeVisIntentResult.js` | AMD **9** | Stamp new kinds via already-imported `_stampPanelVisType`. **No** third `*DropdownSafeguard.js`. |
| `stampPanelVisType.js` | **141** | Extract `markPanelOption.js` **before** per-group marks. |
| `bindWidgetSettingsPanel.js` | **213** | Keep-open kind-set only. Wall **213 → ≤220**. Not a rewrite. |
| `definitions.js` | no iterator/zoom | **Do not add.** |

**GET helper:** `KDB3/js/core/services/writeback/get/collectors/assignOptionalFlag01.js` — `assignOptionalFlag01(target, compactKey, value)` omit when `typeof value !== "boolean"`; else `0|1`. **W-EXTRACT moves `vals` only.** Add `iter` + `wzbar` in **W-APPLY** with schema / validate / restore (Family §5 together). Never `grp` / `dim` / `topn`. Dumb flag01, not a family registry.

Schema/restore **together** (Family §5, W-APPLY): `schema/v3Defaults.js` `WIDGET_FIELDS.vis`, `validateWidgetFields.js` (0\|1), `handleParameterSetRestoreBatch.js` `VIS_KEYS`, `commitVisAndConsequences` (clone `vals`, not `grp`). Unknown field → `WRITEBACK_INVALID_V3_PAYLOAD`. v2 omit. `newDashboard`: inherit.

---

## 8. Waves (after Approved + execution spec)

Extracts are a **wave**, not a silent prelude, **unless** the router piggyback is refused (then this file becomes a prelude WP — captain tells PO).

### W-EXTRACT (no chrome rows, no new GET keys)

**May edit / add:** `assignOptionalFlag01.js` (new) + `buildWidgetObject.js` (**`vals` only**); `visKindToControl.js` (new) + `buildWidgetVisSettingsSnapshot.js`; `shouldApplyVisualizationProperties.js` (new) + `applyVisualizationProperties.js`; `markPanelOption.js` (new) + `stampPanelVisType.js`.

**Must not:** CSS rows; options for iterator/zoom; bind keep-open; apply writes; schema keys; GET `iter`/`wzbar`; barrel return-shape on `handleApplyStartupSettings.js` (no second handler yet — would break `handleParameterSetBinding.js`).

### W-APPLY (machine — kinds + persist together)

**May edit / add:** `handleApplyIteratorZoom.js`, `applyIteratorZoom.js` (one write loop + two allowlist maps; no `applyIterator`/`applyZoom` twins), `handleApplyStartupSettings.js` (barrel) + **both** dereferences (`handleParameterSetBinding.js` **and** `actionRouter.js` startup route), `actionRouter.js` (route only — no new AMD import), `finalizeVisIntentResult.js` (stamp kinds), `kindToStateKey.js`, `commitWidgetSettingValue.js` (inherit-delete clone), `intentDispatchMap.js` (missing kinds → `scaffoldNoop` — add in place), `actionTypes.js`, `options.js` (new keys only), `resolveCanonicalVisOptionValue.js` (boolean parse beyond `showValues`; unique keys like `iter-on` must not store a string), `parameterSetBindingHelpers.js`, `readEffectiveSettingsContext.js`, `schema/v3Defaults.js` (`WIDGET_FIELDS.vis`), `validateWidgetFields.js`, `handleParameterSetRestoreBatch.js` (`VIS_KEYS`), `parameterSetRestoreBatchCommits.js`, `buildWidgetObject.js` (add `iter` + compact zoom key via helper).

**Must not (W-APPLY):** extra `controlDefinitions.js` `live[]` **icons** (one icon, nested rows — Family `live[]` is for a new bar icon, not this stack).

**Must not:** `handleApplySetting.js`, `applyShowValues.js`, `handleApplyShowValues.js`, `overlayShowValuesOnLayoutMap`, `showValuesDropdownSafeguard.js`, `handleContentCreate.js` (AMD 10), `KDB.js`, `sorting.js`, `.mdc`.

### W-CHROME (nest + CSS + keep-open — after W-APPLY kinds)

**Starts only after** W-APPLY kinds exist. Extra rows never ship as `kind: "showValues"`.

**May edit:** `css/widgets/widgetSettings.css` (WP1 block retarget including `:first-child` / `:last-child` + nest un-flyout + row-hide; not `toggle-button.css`); `populateStaticDropdown.js` / `buildDropdownOptions.js` / `dropdownPopulateHelpers.js` (birth inner hosts + no-wipe + per-host `ensureDropdownSelected`); `bindWidgetSettingsPanel.js` + `bindFocusPanelInteractions.js` (kind-set + wall ≤220). Add `buildSettingsIcon.js` only if populate cannot birth inners.

**Must not:** `closeVisibleDropdowns.js`, `domQueries.js`, shared radio/dashed/`KDB_visible { display: block }`.

**Nobody:** `KDB.js`, `sorting.js`, `.mdc`, contracts (captain), third safeguard, `settingFamily`.

---

## 9. Anti-goals

- Flat stack / “just add CSS rows” / extra kinds without nest
- Header-from-`.textIcon` as N-row law; per-row header; extras as `kind: "showValues"`
- Reopen D2 Frozen (KEEP / `vals` / List / catalog / seed / contrast / `overlayShowValuesOnLayoutMap`)
- Copy grouping KEEP-specialize / CLEAR
- Seed Family A; store `"inherit"` / `"none"` / `"default"` / `"standard"` / `""`
- `_KDB.services.settingFamily` / registry this WP
- Third `*DropdownSafeguard.js`; route new booleans through `handleApplySetting`
- `reason: "showValues"`; generalize showValues overlay
- Bake `widget.iterator` / `zoom.bar.enable` into `definitions.js`; mutate catalog objects
- Guess Line zoom onto Pie; treat `zoom.items.default.count` as the toggle
- `SCHEMA_VERSION`; keys >5 / `dim`; `_KDB.config.labels.de`; `Gruppierung*`
- `_KDB.cognosAPI` / `__getDashboardAPI` from widgetSettings / deep widgetVis
- New cognosHost facet / new op
- Commit Ein `1` when apply skipped (chrome+GET lie)
- B-omit explicit `false` / `0`
- New `widgetSettings/state/selectors.js` this WP
- Bind rewrite; stay-open helper for all dropdowns; edit `closeVisibleDropdowns` / `domQueries`
- Hide five extracts inside “add two rows”
- Extra `live[]` icons / S2 clone-per-boolean
- Catalog a >5-char vis key without an explicit PO lift of writeback §4 / Family §5 (validate will not catch it)
- Start C / E JS / toast PROGRAM

---

## 10. Parent patches (apply on Approved — not JS)

**`widgetSettings.md` §4.2** — after the showValues Standard-position sentence, append:

> WP2: `iterator` / `zoom` (Zoomleiste) are A KEEP-all-vis and paint the **Standard position** on their own nest rows — `widgetSettings-vis-toggle-panel-wp2-contractdelta.md`. Standard-position chrome only; inherit catalog for these keys stays **off everywhere**, not showValues Line-hide.

**Family §4** — add rows: `iterator` / `zoom` = **A**. Do not: seed; copy grouping CLEAR; add `settingFamily` this WP; reopen D2; B-omit explicit `false`. Persist explicit `0` on every type (including hide). A machine is the Aus=`0` lock (unset is off everywhere; still not Family B).

**Family §3.1 Chrome** — append: WP2 new rows mark Standard (inherit), same pill family as showValues.

**Family §5** — lift “`bindWidgetSettingsPanel.js` stays generic (do not edit)” to: **generic kind-set only** this WP (`showValues` \| `iterator` \| `zoom`). Not a rewrite. Not a stay-open helper.

**`parameterSetRestore`** — consume `iter` / `wzbar`; missing → leave absent (`hasOwnProperty` only). Present `0`/`1` → boolean, `skipHistory: true`.

**writeback.md** vis `wgts[]` — add optional `iter?` / `wzbar?`. Own sentence each: Family A omit when inherit; present `0` is explicit false, not a sentinel; persist `0` on hide types; do not B-omit false. Do not splice into the `vals` or `grp` sentence.

**D2** — pointer sentence only: panel may host sibling Family A rows (WP2). Machine unchanged.

**history / cognosHost** — no new history key; no new facet (table-only).

---

## 11. Canvas (PO; captain does not certify)

1. Pie: Werte anzeigen + **Iterator**; no Zoomleiste row. Header `aus / Std. / ein` once.
2. Line / Stacked* / **Prognose**: Werte anzeigen + **Zoomleiste**; no Iterator row. Ein writes `zoom.bar.enable`. New widget: Zoomleiste marks **Standard** (effective Aus / off). No type starts on Ein.
3. List: whole icon still hidden. State/GET still KEEP **when explicit**.
4. New widget: both new controls mark **Standard**; GET omits `iter` / `wzbar`.
5. Ein persist `1` only after apply `ok` and not skipped. Aus persist `0` on every type. Standard deletes the key. Dropdown **stays open** on pick; outside click closes. Zeitebene still closes on pick.
6. Switch visType KEEP + hide-row: Line Zoomleiste **Ein** → Pie (row hidden, GET still explicit `1`) → Line still **Ein**. Line **Ein** → Prognose (row **shown**, still Ein, host `zoom.bar.enable`). Pie Iterator **Ein** → Line (row hidden) → Pie still **Ein**. Apply never writes `true` on the hide type. Skipped Ein does not commit, does not stamp, does not push history.
7. Undo/redo moves the matching knob only (own kind).
8. showValues Line/Prognose inherit still hide; Stacked*/Pie still show.

---

## 12. Stress-test + Approved (2026-09-13)

| Pick | Result |
|---|---|
| 1 Choice A (3-way) | **GO** |
| 2 Compact zoom key | `wtzoombar` (9) **FAIL** → PO re-pick **`wzbar`** (5, widget zoom bar) **GO** |
| 3 One WP2 | **GO** — piggyback; dereference both barrel call sites |

**Approved** PO vastenburg 2026-09-13. Implementing via execution spec.

---

## Approval log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-12 | `Draft` | captain | Fold: nest dual HOLD; GET HOLD; catalog/host HOLD. No JS. |
| 2026-09-12 | Draft gates | captain | Mechanical + semantic HOLD folded (bind 213; GET vals-only extract; fail-close Ein; restore/schema together; Family bind lift; CSS first/last-child; W-CHROME after kinds). |
| 2026-09-13 | Product lock | PO vastenburg | Default Aus all types (no auto-Ein). Zoom relevant except Pie/List (show + write). Iterator Pie only. Not relevant = hide row. Fail-close lifted on Prognose/Stacked*. |
| 2026-09-28 | Iterator lock amended | PO vastenburg | `widgetSettings-iterator-standard-on-contractdelta.md`. Iterator chrome + `widget.iterator` on Pie, Line, StackedBar, StackedColumn. Standard = on there. Prognose stays hidden. No seed. Zoom unchanged. |
| 2026-09-13 | Three picks | PO vastenburg | A = 3-way. Key `wzbar`. One WP2. Army stress-test before GO. |
| 2026-09-13 | Stress-test | army dual + clone | A GO. One WP2 GO. `wtzoombar` FAIL (≤5). |
| 2026-09-13 | `Approved` | PO vastenburg | Key **`wzbar`**. Choice A. One WP2. Parents + spec next. |
| 2026-09-13 | Canvas + amend | PO vastenburg | Undo/redo GO. Prognose: hide Zoomleiste (host has no zoom bar). Not Implemented until that hide is on canvas. |
| 2026-09-13 | `Implemented` | PO vastenburg | Canvas GO incl. Prognose hide + undo/redo. |
| 2026-09-13 | Prognose zoom on | PO vastenburg | Host now has zoom bar. Re-show 3-way + write `zoom.bar.enable`. |
| 2026-09-13 | `Implemented` | PO vastenburg | Prognose Zoomleiste canvas groen. |
