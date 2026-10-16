# Contract Delta: vis toggle panel WP1 (showValues 3-way chrome)

> Display-only. Header **`aus / Std. / ein`** once (off-left / on-right). One row **Werte anzeigen**. Compact **66×22** pill. Family A machine D2 + H unchanged.
> PO vastenburg 2026-09-12: canvas reject P3/G2-width → package **A + P1**. Not WP2. Not C/E/toast. Not grouping.

---

**Status:** `Implemented`
**Owner module / service:** `widgetSettings` (chrome only)
**Type:** `feature-module contract delta`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-12
**Reviewed by:** PO 2026-09-12 canvas reject → **A + P1** (invert Standard; 66×22; `::after` header; keep-open). Hatch / `Std.` dead.
**Related rules:** `feature-structure.mdc` (workflow), `dom.mdc`, `naming.mdc`, `amd.mdc`
**Family:** A inherit. Chrome key `inherit` never stored. Header word **Standard** is a **label**, not a stored token. Forbidden stored: `"inherit"` / `"none"` / `"default"` / `""` / `"standard"`.

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/widgetVis-show-values-contractdelta.md` | **Chrome words only.** KEEP / `vals` / List / catalog / seed / contrast / overlay / apply stay Frozen. Exact replacements: §7. |
| `contracts/widgetSettings-family-a-inherit-row-chrome-contractdelta.md` | H machine stays. Visible showValues words Anzeigen / Diagrammstandard / Ausblenden → **Aus / Standard / Ein**. Grouping canvas unchanged. |
| `contracts/widgetSettings-setting-family-contractdelta.md` | Second allowed **chrome-only** D2 cite (like H). §3.1 / §4 sentences: §7. No family helper. |
| `contracts/widgetSettings.md` §4.2 | **Split.** Not “all A chrome = Standard”. Exact sentence: §7. |
| `contracts/historyService.md` | **No new key.** Replay stays `widgetSettings_optionSelect`. Frames still `inherit` / `on` / `off`. |
| `contracts/writeback.md` | **No change.** |

**Parked (not this WP):** Iterator (`widget.iterator`, pie chrome only), Zoomleiste (`zoom.bar.enable` only), writeback keys. WP2 KEEP-all-vis + Aus=`0` + apply no-op on hide **locked** (PO + army zoom). Memo: `contracts/futureTodo/vis-boolean-toggles-options-memo-2026-09-12.md`.

---

## 1. Purpose

The showValues dropdown is three vertical radio rows. WP1 restyles that **one** control into **Aus | Standard | Ein** (knob left = Aus, middle = Standard, right = Ein) with phrase **Werte anzeigen**. Display only.

A shared header **node** and a place-helper are **WP2 furniture** (second row would repeat the three words). Do not ship them in WP1.

---

## 2. Product (locked this WP)

| Topic | Law |
|---|---|
| Layout | **2 (PO locked):** header **once** above the pill column; each row = phrase **left** + 3-state pill **right**. WP1 one row (Werte anzeigen). |
| Polarity | **PO locked.** Aus left / Standard middle / Ein right. Header, DOM, knob, tab — all four. |
| Pill | **66×22** (`repeat(3, 22px)`). Height 22 / knob 18 like live `KDB_ToggleButton`. Width does **not** follow header words. Not the 2-state checkbox. Not `KDB_ToggleButton` class. |
| Track / knob | **Aus:** track `#ccc`, knob `#fff`. **Ein:** track `var(--kdb-control-steuerung-switch-on, #0056b3)`, knob `#fff`. **Standard (S1 invert):** track `#ccc`, knob **blue** (same switch-on var). No dashed. No hatch. Default is catalog inherit, not an Ein/Aus mix. |
| Header | Container `::after`: **`aus / Std. / ein`** (PO 2026-09-12). Aria/title stay **Aus / Standard / Ein**. Span the header+pill stack. Visually hide `.textIcon`. |
| Spacing | Dim/vis air is **option pad** (`6px 8px 6px 34px`), not the 3px shell. This chrome: container **`padding: 9px`** (3+6). Header↔pill **`row-gap: 6px`**. Phrase↔pill **`padding-right: 8px`**. Do not use 3px as the only inset. |
| Pill under header | Pill **horizontally centered** under the header string. Phrase stays left of that stack. Header may be wider than 66px — that width drives the stack, not the track. |
| Overflow | Scoped **`overflow: visible`**. No scrollbar. Entire header + phrase + pill in view. Do not edit shared `overflow-y: auto`. |
| Knob | **18×18**, `top: 2px; left: 2px`, **`transform: none`** (same even inset as live `KDB_ToggleButton`). Reject 19px + `50%`/`translate` (rounds to 1px top / 2px bottom). |
| Keep-open | **P1.** Option click on this dropdown does **not** close it. Close on outside click / other-icon toggle / gear. Other kinds still close-on-pick. Bind **208 → ≤214**. Focus twin. |
| Hit targets | Three existing option nodes stay `data-kdb-option-value`. Radio chrome scoped-hidden. |
| Positions | Same three nodes. DOM order **`off`, `inherit`, `on`**. Keep `isDefault: true` on inherit (else `ensureDropdownSelected` picks first = Aus). |
| Unset | Marks **Standard** (`inherit`). Do not mark Ein/Aus from catalog. |
| Clicks | Standard → delete key (H). Ein → `true`. Aus → `false`. |
| Grouping | **No edit.** Zeitebene keeps Diagrammstandard as a **row** label. |
| Icon | Button class stays `KDB_showValuesButton`. List CSS-hide keep-DOM unchanged. Filename and title superseded 2026-09-28: `adjust.svg`, title **Zusatzoptionen** (`contracts/widgetSettings-iterator-standard-on-contractdelta.md` lock 1). |
| Copy | Hardcoded DE. Not `_KDB.config.labels.de`. Never `Gruppierung*`. |

---

## 3. Must stay (D2 + H)

- Family A: unset = field absent. No seed. No `"inherit"` stored.
- `kind: "showValues"`. `widgetVis/applyShowValues`. `vals` omit inherit; persist explicit `0\|1`.
- Stamp always remakes: boolean → on/off, else inherit.
- Safeguard unset → `inherit`. Commit delete only on `"inherit"`.
- `reportToSettings.nextValue` stays the token. Overlay helper **untouched**.
- Completeness triad unchanged. Snapshot **149 — do not edit**.

---

## 4. Chrome build (after overdesign FAIL)

**G1 Order.** Reorder `options.js` to **`off`, `inherit`, `on`**. Labels **Aus / Standard / Ein**. Keys/values unchanged. Keep inherit `isDefault: true`. Visual = DOM = tab = knob.

**G2 Labels.** Real strings, not `""`. `options.js` stays **Aus / Standard / Ein** (`aria-label` / `title`). Visually hide `.textIcon` here (`display: none`). One header on the container `::after` (`aus / Std. / ein`), spanning the header+pill stack — not a DOM node, not `data-kdb-option-value`. Phrase stays `::before`.

**G3 Phrase.** `.KDB_showValuesContainer::before { content: "Werte anzeigen" }`. CSS only — **not** a DOM node, **not** `.dataWidgetIcon`, **not** `data-kdb-option-value` (same 4th-radio hole as a header node). Survives `clearDropdownChildren`.

**G4 CSS (A + P1; P3/G2-width withdrawn).** Scope **direct children** of `.KDB_IconsDropdown.KDB_showValuesContainer`. Open: three-class `display: grid`. Do **not** edit shared radio / pad / dashed / `KDB_visible { display: block }`.

- Grid: `max-content auto 22px 22px 22px auto`. Phrase col 1 row 2, `padding-right: 8px`. Header `::after` spans cols 2–6 row 1 (`text-align: center`, `width: max-content` / nowrap) so the **66px pill (cols 3–5) sits centered under the header**. Options cols 3/4/5 row 2. `padding: 3px`. `row-gap: 6px`. `overflow: visible`. In-flow. Bare 1-col = **FAIL**.
- Hide `.textIcon` here. Hide option `::before` / 34px pad / row dashed **here only**.
- Three **child** 22×22 slabs. First/last radius = capsule. Track width **66px**, not `max-content` columns.
- Paint all three slabs from container `:has(> .dataWidgetIcon.KDB_optionSelected[data-kdb-option-value=…])`. `off`/`inherit` → `#ccc`. `on` → switch-on blue. Scoped `!important`. No phrase-as-track. No dashed. No hatch.
- Knob = selected `::after`, 18px, `pointer-events: none`, pin to slab. **Aus/Ein:** `#fff`. **Standard:** switch-on blue. Jump OK. No `KDB_ToggleButton`.

**G5 Keep-open (P1).** `bindWidgetSettingsPanel.js` option path: skip `closeDropdowns` when kind is `showValues`. Other kinds still close. Document outside / icon toggle / gear unchanged. Focus-out must not snap this flyout shut after option `preventDefault` (`relatedTarget` null) — skip that closer while `.KDB_showValuesContainer.KDB_visible` is in the panel; document pointerdown still closes. Focus clone: skip `hidePanelDropdowns` on showValues option pick only (`bindFocusPanelInteractions.js`). Bind wall **208 → ≤214**. No extract. No `closeVisibleDropdowns` edit.

---

## 5. Exclusive allowlist (after Approved + spec)

| May edit | What |
|---|---|
| `css/widgets/widgetSettings.css` | Rewrite the WP1 appended block only (G2/G4 A). Shared 270–339 untouched. Not `toggle-button.css`. |
| `view/bindWidgetSettingsPanel.js` | G5 only: skip close + focus-out snap. **≤214**. |
| `widgetVis/effects/focusMode/bindFocusPanelInteractions.js` | G5 twin: skip hide on showValues option pick only. |

**Do not edit** `options.js` this wave (already Aus/Standard/Ein + `isDefault`). **Do not add** `placeShowValuesToggleChrome.js`. **Do not** change `buildDropdownOptions.js` AMD. **Do not** edit `closeVisibleDropdowns.js` / `panelDropdownUi.js` / `domQueries.js`.

**Do not touch:** `populateStaticDropdown.js`, `buildDropdownOption.js`, `stampPanelVisType.js`, `showValuesDropdownSafeguard.js`, `KDB.js`, `sorting.js`, apply/snapshot/commit, grouping options, `.mdc`.

---

## 6. Anti-goals

- Iterator / Zoomleiste / new `wgts[]` keys / `SCHEMA_VERSION`
- Reopen D2 KEEP / `vals` / List / catalog / contrast
- Change grouping chrome or Diagrammstandard there
- Store `"standard"` / `"Standard"` / `"inherit"`
- `options.js` `label: ""` (falls through to key)
- Rewrite bind / extract a stay-open helper / edit `closeVisibleDropdowns` (would break outside + other-icon close)
- Keep-open on grouping / vis / color / topN
- Shared dashed / radio / pad / `KDB_visible { display: block }` edits
- `_KDB.services.settingFamily` / third safeguard / `labels.de`
- New JS helper / `buildDropdownOptions.js` import / header DOM node
- `display: contents` on options; `overflow: hidden`; abs header
- Header / phrase as `data-kdb-option-value` (4th-radio) or header **outside** the dropdown
- Edit shared `populateStaticDropdown.js` / `buildDropdownOption.js` / `toggle-button.css` / `domQueries.js`
- Flat-stack extra kinds in this dropdown
- Seed showValues
- Share `KDB_ToggleButton` / copy input/slider rules
- Hatch / dashed Standard / reopen header copy / columns `max-content`
- Descendant (not child) pill selectors; write “header = option labels” as the WP2 N-row law

---

## 7. Parent patches (apply on Approved — not JS)

Applied on this Approved. Captain writes these one-liners; army writes JS from the execution spec.

**`widgetSettings.md` §4.2** — replace the live-A chrome sentence. Keep the family-gate sentence. New chrome sentence:

> Live A unset chrome: grouping marks the **Diagrammstandard row** (`family-a-inherit-row-chrome`). `showValues` marks the **Standard position** (header word Standard; key `inherit`; **middle** of Aus \| Standard \| Ein) — `widgetSettings-vis-toggle-panel-wp1-contractdelta.md`. Do not mark catalog Ein/Aus while unset. `showValues` is A (D2 Frozen except H inherit-row + this chrome cite).

**Family §3.1 Chrome cell** — append, do not replace the grouping row law:

> Unset still marks `inherit` (never stored). **showValues** paints that mark on the **Standard position** (Aus / Standard / Ein). **Grouping** still paints a **Diagrammstandard row**. Do not mark Ein/Aus or `defaultGrain` from catalog while unset.

**Family §4 `showValues` Do-not** — lift like H:

> Seed it. Reopen D2 beyond inherit-row chrome (`family-a-inherit-row-chrome`) **and** this WP1 chrome cite. Move to B “for uniformity”.

**Family §6** “D2 reopen is only the inherit-row cite” → add “+ WP1 chrome cite”.

**D2 §2 Options row:**

> **Aus** (`off`) / **Standard** (`inherit`, never stored) / **Ein** (`on`) — visual + DOM order. WP1: `widgetSettings-vis-toggle-panel-wp1-contractdelta.md`. Machine still H delete-key. Visible words replace Anzeigen / Diagrammstandard / Ausblenden.

**D2 §5.1 `options.js` snippet** — same three keys; labels Aus / Standard / Ein; order `off`, `inherit`, `on`.

**H canvas 2 / 6 / 8** — pointer: showValues visible words are now Aus / Standard / Ein (off-left). Mark/GET/`vals` unchanged.

---

## 8. Canvas (PO; captain does not certify)

1. Open: `Werte anzeigen` left; header **`aus / Std. / ein`** once above a **66×22** pill (air around). Not `AusStandardEin`. Not a sausage as wide as the words.
2. New widget: Standard = **gray track + blue knob** middle. GET omits `vals`.
3. Ein = blue track + white knob right; `vals: 1`. Aus = gray track + white knob left; `vals: 0`. Standard again = gray + blue knob; key gone.
4. Click Aus/Std/Ein: values change; **dropdown stays open**. Click outside: closes. Zeitebene still closes on pick.
5. List: icon still hidden. Zeitebene chrome unchanged.
6. Undo/redo moves the knob (H).

---

## Approval log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-12 | `Draft` | captain | PO locks: WP1 now; Ein/Standard/Aus once; Werte anzeigen; not WP2. |
| 2026-09-12 | Draft gates | captain | Mechanical HOLD-WITH-GATES: G1–G4. |
| 2026-09-12 | Draft gates | captain | Semantic HOLD-WITH-GATES folded. |
| 2026-09-12 | Rec shrink | captain | Overdesign FAIL: drop helper/header node. WP1 = `options.js` + scoped CSS only. |
| 2026-09-12 | Draft parents | captain | Contract-holes HOLD folded. Radio-row GO later withdrawn. |
| 2026-09-12 | Layout 2 | PO vastenburg | Header once; phrase left; 3-state pill right; rhyme existing toggle height/colors. |
| 2026-09-12 | Polarity | PO vastenburg | Aus left / Standard middle / Ein right — same as live toggle off-left / on-right. DOM `off`, `inherit`, `on`. |
| 2026-09-12 | Build GO | army | CSS-only GO. Bind 208 shut. Helper HOLD. Radio-row G4 withdrawn. |
| 2026-09-12 | Standard P3 | PO + captain | Dashed inherit track. Hatch rejected: default ≠ Ein/Aus mix. |
| 2026-09-12 | Re-attack | army | CSS HOLD-WITH-GATES (grid item / !important / no 66px clamp). Family GO. P3 stands. |
| 2026-09-12 | `Approved` | PO vastenburg | Rec stands → GO. Gates folded. Parents + spec next. |
| 2026-09-12 | `Implementing` | captain | Spec Ready. W-OPT + W-CSS parallel. |
| 2026-09-12 | Dual GREEN/GREEN | army | Mechanical GO. Semantic GO. P3 stands. Await PO Cognos. |
| 2026-09-12 | Canvas HOLD | PO vastenburg | P3 knob invisible; pill too wide; jammed copy; close-on-pick unwanted. |
| 2026-09-12 | A + P1 | PO vastenburg | Invert Standard; 66×22; `aus / Standard / ein`; keep-open; bind ≤214. Polish spec. |
| 2026-09-12 | Polish dual GREEN/GREEN | army | Mechanical GO. Semantic GO. Await PO Cognos. |
| 2026-09-12 | Canvas geometry | PO vastenburg | Scrollbar; knob high/small; spacing ≠ dimension; pill not under header. `Std.` discuss, not locked. |
| 2026-09-12 | Header lock | PO vastenburg | `aus / Std. / ein`. Aria stays Standard. |
| 2026-09-12 | Air + knob | army dual | 3px was shell-only (captain miss). Pad 9 / gap 6 / phrase 8. Knob 18@2px. #2 padding-0 rejected. |
| 2026-09-12 | `Implemented` | PO vastenburg | Canvas green (“nu staat het goed”). |
