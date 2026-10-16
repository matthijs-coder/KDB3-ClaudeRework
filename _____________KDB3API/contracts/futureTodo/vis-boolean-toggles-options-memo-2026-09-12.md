# Options memo — vis boolean toggles panel (showValues / Iterator / Zoomleiste)

**Status:** WP1 `Implemented` (PO canvas 2026-09-12). WP2 parked until PO GO. No D2 reopen.
**Date:** 2026-09-12
**Author:** Cursor Grok 4.6 investigation
**PO:** vastenburg (Dutch intent; English artifact)

PO wants the showValues dropdown to become a **general toggle-settings panel**. Per vis type it hosts **multiple 3-way toggles** (middle = Diagrammstandard / inherit / delete-key; sides = on/off). ShowValues stays first and **behavior-unchanged** (display only). Pie: Iterator under it (DE label TBD). Non-list others: Zoomleiste. Same Family A machine as showValues; Cognos property names TBD (PO looks up).

---

## Diagnose A vs B first

Two different A/B questions. Do not mix them.

### 1. Investigation A vs B (live vs missing)

| Question | Verdict |
|---|---|
| Contract ≠ live showValues / KEEP / `vals` / List hide? | **Not A.** Live = D2 Frozen + H inherit-row `Implemented`. |
| Existing control, writeback missing? | **Not B.** Iterator / Zoomleiste are **not live** and have **no** contract field. |
| What this is | **New product** on the showValues chrome. Not a grouping reopen. Not a third family. |

Repo has **no** live writes of these keys. Catalog + leftover + lastOriginal hunt: **NONE** (no leftover vis write of iterator/zoom either). `definitions.js` `layoutPropertyValues` / `propertyValues` omit them (all seven vis types have layout maps; keys are labels/grid/Prognose ticks only). `applyShowValues` does not touch them. Pie catalog already has `valueLabels.visible` + `labels.visible` = `true`. ShowValues inherit live **matches D2**. Write op = same stamped `visualizationFacet.setContentProperty` as showValues. Visualization facet has **no `getContentProperty`** — we cannot read host inherit via our API. **WP2 cannot guess inherit — PO must read current Cognos values.** Homonym: `setDashboardZoom` / header zoom-hint is **not** `zoom.bar.enable`.

**PO named 2026-09-12 (host property lists, not yet product-locked):**

| Control | Cognos property | Seen on |
|---|---|---|
| Iterator | `widget.iterator` | **Pie and Line** (same key) |
| Zoomleiste | `zoom.bar.enable` | **Line**; **absent** from the Pie list |
| Zoom sibling (not the toggle) | `zoom.items.default.count` | Line only — numeric count, not a 3-way |

**PO lock 2026-09-12:** Iterator **chrome = pie only** (host key may exist on Line; we do not show it). Zoomleiste = **`zoom.bar.enable` only** (not `zoom.items.default.count`). WP2.

### 2. Family gate (A inherit vs B sentinel)

Gate: must the **effective** value change on a visType switch **while the user never picked this control**?

| Control | Answer | Family |
|---|---|---|
| showValues (live) | Yes — Line/Prognose inherit hidden; Stacked*/Pie inherit shown; List N/A | **A** KEEP-all-vis |
| Iterator (new) | Chrome pie-only. Catalog inherit = **off** when unset (PO: default off everywhere). | **A** (omit; do not seed) |
| Zoomleiste (new) | `zoom.bar.enable` only. Catalog inherit = **off** when unset. | **A** (omit; do not seed) |

**Not B.** There is no one real default on every visType (no Ohne / `"none"`). Seeding would freeze create-time catalog and kill follow-type.

**Not grouping KEEP-specialize.** Grouping CLEARs illegal **grain tokens**. These are booleans: `true`/`false` is legal on every vis; chrome/apply no-op when the property does not exist (List `vals` pattern). PO said like showValues. Do **not** copy F CLEAR unless PO later wants “hide = forget”.

Inherit chrome already locked (H): unset marks **Diagrammstandard**; click deletes the key; do not store `"inherit"` / `"none"` / `"default"`.

---

## Dropped shapes

**S2 Clone-per-boolean (extra icons).** Incoherent with PO (one panel, not two/three bar icons). Law: no third `*DropdownSafeguard.js` (live already has topN + showValues). Still hits snapshot/overlay 150 walls and unknown Cognos names. **Drop.**

**S4 generic Family A boolean helper in the delivery WP.** Family §5: helper allowed when a **third** A control is approved, but **do not** add a registry/framework in the same WP as the first new option. Iterator or Zoomleiste **is** that third A (showValues + grouping already exist). A `{ stateKey, cognosProps[], visAllowlist, writebackKey }` catalog + `_KDB.services.settingFamily` is exactly the forbidden framework. Also risks swallowing showValues (D2 reopen). **Drop as delivery.** Survive only as a **later cleanup WP** after at least one cloned A boolean is live.

No unnamed hybrid. S5 is the listed two-WP sequence, not a new machine.

---

## Bind / history wall (why naive one-dropdown stack breaks)

`bindWidgetSettingsPanel.js` (do not edit) builds history frames from **one** selected option in the closest `.KDB_IconsDropdown`. `markSelectedOption` clears **all** rows in that dropdown. `stampPanelVisType.markShowValuesOption` does the same. Replay `findOptionInDropdown` matches the first `inherit`/`on`/`off` key.

A flat stack of three 3-ways in the current showValues container would: unmark ShowValues when Iterator is clicked; push a showValues history step for an iterator click; collide on shared `inherit` keys.

**Nested S3 vs bind 208 (mechanical 2026-09-12: HOLD-WITH-GATES).** Bind can stay shut. `querySelector` first = outer toggle. Option `closest` = inner → mark/history kind from the option. Flat stack in one box stays **FAIL**.

The nest recipe as first written is **not GO**:

1. `.KDB_IconsDropdown` is `display:none` until `KDB_visible`. Inners must **not** take `KDB_visible` (`closeVisibleDropdowns` would hide them). Salvage = **CSS nest exception** (in-flow + visible without that class). Live dropdowns are `position: absolute` flyouts, not stacked rows.
2. Stamp `markShowValuesOption` hits the **outer** (kind `showValues` / `.KDB_showValuesContainer`) and clears **all descendant** option marks. Gate: strip kind from the outer **or** extract stamp (141, no slack).
3. Each inner needs its own `data-kdb-dropdown-kind`; options carry that kind (empty old-frame + `findDropdownByKind`).
4. Unique keys (`iter-on`) only fix replay first-match. They do **not** replace 1–3.
5. Non-option pixels inside an inner close the panel (bind 70–75). Option click still closes the whole panel (same as live showValues).

S2 extra icons and a bind unlock are **not** the only WP2 chrome paths if these gates land.

S1 does not hit this wall: still **one** kind, **one** selected mark.

---

## File-size / AMD walls (WP2)

| File | Now | Why it blocks a same-WP feature dump |
|---|---|---|
| `buildWidgetVisSettingsSnapshot.js` | 149 — do not grow | Optional snapshot fields required so visType/post-render overlay does not stomp. `isWidgetVisKind` / `KIND_TO_CONTROL` live here; new kinds otherwise skip commit-after-apply. |
| `applyVisualizationProperties.js` | 150 | Overlay hook + `APPLY_ON_REASON` for new property-only reasons. One extra call needs an extract first. |
| `handleApplySetting.js` | 149 — do not edit | Full rebind. New booleans stay property-only like `applyShowValues`. |
| `actionRouter.js` | 14 AMD already | Family: routes only, no new import. Two cloned handles would add two. |
| `finalizeVisIntentResult.js` | 9 AMD | Third safeguard import forbidden. |
| `stampPanelVisType.js` | 141 | Per-group mark + row hide will blow 150 without extract. |
| `buildWidgetObject.js` | **144** | Two house-style 3-line `0\|1` GET emits land on **150 exactly**. No slack. Writeback for two keys needs a GET extract or a later helper. |
| `bindWidgetSettingsPanel.js` / `KDB.js` / `sorting.js` | forbidden | — |

PO named `widget.iterator` + `zoom.bar.enable`. WP2 apply still cannot ship until per-`visType` catalog inherit exists (our `definitions.js` has **NONE**). Overlay must not mutate `definitions.js`; inherit read stays `resolveVisualizationLayoutPropertyValues` (write-fn only), same isolation as H.

---

## Surviving options

### S1 — Display-only WP (showValues 3-way chrome)

Restyle the existing three option nodes into one horizontal 3-way. Same keys: `inherit` / `on` / `off`. Same apply/commit/history/`vals`.

| Concern | Law |
|---|---|
| Chrome | Hardcoded DE. Keep Anzeigen/Ausblenden unless PO changes (open). Middle = Diagrammstandard, `isDefault`. **Must stay three option nodes** with current attrs so bind/stamp/safeguard/replay keep working. No new icon. Title may stay “Werte anzeigen” for this WP. |
| Apply | **None.** `applyShowValues` untouched. |
| KEEP | D2 KEEP-all-vis unchanged. |
| Writeback | None. `vals` omit-inherit unchanged. |
| visType hide | Icon CSS-hide List keep-DOM unchanged. No row hide yet. |
| History | `widgetSettings_optionSelect` / `kind: "showValues"` unchanged. |
| 150/AMD | CSS scoped to `.KDB_showValuesContainer` only. Do **not** edit the shared dashed inherit rule (grouping/dimension). Horizontal 3-way fights that vertical separator — new look for this control only. |
| Contract | **Sibling chrome-only delta.** Pointer on D2/H at most. Not a second D2 lift. Do **not** reopen Frozen KEEP / `vals` / List / catalog / contrast / overlay helper. |
| Cognos names | **None.** |

**Pro:** Unlocks the 3-way widget; zero behavior risk; unblocks PO visual sign-off. **Con:** Does not ship Iterator/Zoomleiste.

### S3 — One icon, stacked 3-ways, per-property apply (showValues path frozen)

One `showValues` icon; panel hosts stacked rows. Each new row is its own kind (`iterator` / `zoom`). ShowValues apply/commit/report/`vals` **unchanged**. New kinds: property-only apply + inherit-delete commit (clone of H, not `handleApplySetting`).

**Chrome:** nested inner groups **plus** the HOLD-WITH-GATES above (CSS nest exception + stamp/outer-kind isolation). Not the first nest sentence alone. Row CSS-hide keep-DOM: Pie hide Zoomleiste unless PO unlocks Line iterator chrome; List keeps **icon** hide (whole panel). Focus keep-list stays one class (`KDB_showValuesButton`).

| Concern | Law |
|---|---|
| Chrome | Hardcoded DE. Never `labels.de`. Never Gruppierung*. Labels TBD (open). |
| Apply | `widgetVis/applyShowValues` frozen. One new handle/write for both new kinds via `payload.control` — **not** a family registry. Family §5: `actionRouter` routes only, **no new import** (already AMD 14). WP2 must **extract the router first** (or piggyback an already-imported module that is not showValues). List/wrong-vis = success no-op + still delete on inherit. Overlay: extract 149 + 150 first. New `APPLY_ON_REASON` keys after that extract — do **not** reuse `reason: "showValues"`. Do not generalize `overlayShowValuesOnLayoutMap`. |
| KEEP | KEEP-all-vis (store on hidden vis; round-trip like List `vals`). Do not CLEAR. |
| Writeback | Clone **`vals`**, not `grp`. New keys ≤5, not `dim`, no `SCHEMA_VERSION` bump. Live vis keys: `code type dim topn vals grp bgcol ctcol`. Candidates: `iter`, `zoom` (canvas-zoom homonym) / `zl` / `zbar`. Family A: omit inherit; persist explicit `0` even when equal to catalog. Own omit clause per key — do not splice into the `vals` sentence. v2 omit. §5: catalog + validate + GET + restore **together** if persisted. `VIS_KEYS` + `commitVisAndConsequences` have room; GET 144 and snapshot 149 do **not**. Same-WP vs later = **open**. |
| History | Same key. New `kind` on the **option**. Click/mark/frame are inner-safe (bind 208 stays shut). Stamp + replay + safeguard **resolve the outer** today — WP2 must retarget / strip outer kind. Unique keys do not fix stamp. |
| Populate | `populateStaticDropdown` / `clearDropdownChildren` on `.KDB_showValuesContainer` would wipe inners. WP2 chrome includes populate/build + outer-kind strip, not only “nest a class”. Row labels must be option nodes or **outside** the inner (else bind 70 closes the panel). |
| 150/AMD | Extract prelude: snapshot 149, properties 150, GET 144, stamp 141, **actionRouter AMD 14**. Generalize or stamp safeguard (replace topN+showValues imports, no third file). Do not edit bind / KDB / sorting / handleApplySetting. |
| Contract | **New** delta. D2 gets at most a pointer sentence. Family gate: classify the two new controls as A KEEP-all-vis. |
| Cognos names | **Hard dependency.** Cannot write apply/overlay/catalog inherit without them. |

**Pro:** Matches PO panel; showValues path stays the exemplar; no family registry. **Con:** HOLD-WITH-GATES (CSS nest + stamp isolation) + inherit table + 149/150/GET 144 extracts. Too fat for one WP if it also invents S4. Bind 208 stays shut.

**S3 narrowing (not a new shape):** one new handle/write module serving both new kinds via `payload.control`; showValues files not merged. Still per-property commit. Not `_KDB.services.settingFamily`. **Not** “one new router import” — extract router first.

### S5 — Two WPs (S1 then S3)

| WP | Scope |
|---|---|
| **WP1** | S1 display-only 3-way for showValues. |
| **WP2** | After inherit table: extract snapshot / overlay / stamp / GET / **actionRouter** → un-flyout CSS + outer-kind strip + populate that does not wipe inners → Iterator + Zoomleiste as gated S3 (one shared new apply pair, no extra router import). Writeback in WP2 **if** persist is in scope; else session-only and say so in the delta. |

**Pro:** ShowValues behavior cannot change in WP1; Cognos-unknown does not block chrome; extracts are not mixed with a registry; third A arrives without S4. **Con:** Two trips; panel is incomplete after WP1 (PO must accept that).

---

## Recommendation

**S5** (WP1 = S1, WP2 = gated S3). Dual semantic + mechanical: HOLD-WITH-GATES folded; **S5 still stands.** Bind 208 stays shut.

Why: Family A is already diagnosed; the missing piece is product chrome plus two more A booleans, not a new family and not a helper. S1 is the only slice that respects Frozen D2 and the 149/150 walls while inherit defaults are still unknown. S3 is the only surviving Iterator/Zoomleiste chrome (not S2, not a bind unlock). Walls force the split; they do not force S4. WP2 is not “just nest”.

Default lean holds. Do not start C, E, toast PROGRAM, or grouping reopen.

---

## Must-not

- Edit `KDB3/js/**` or `.mdc` in this investigation (done: memo only).
- Reopen D2 Frozen (KEEP / `vals` / List hide / catalog maps / seed / contrast / `overlayShowValuesOnLayoutMap`).
- Copy grouping KEEP-specialize / CLEAR onto these booleans without a new PO lock.
- Third family. `_KDB.services.settingFamily`. Registry in the same WP as the first new option.
- Third `*DropdownSafeguard.js`. Route new booleans through `handleApplySetting` / full rebind.
- Edit `bindWidgetSettingsPanel.js`, `KDB.js`, `sorting.js`, grow snapshot / `handleApplySetting` / `actionRouter` in place (extract first).
- Reuse `reason: "showValues"` or generalize `overlayShowValuesOnLayoutMap` for the new keys.
- `SCHEMA_VERSION` bump. Keys >5 chars or `dim`. `_KDB.config.labels.de`. Gruppierung* chrome.
- Seed Family A. Store `"inherit"` / `"none"` / `"default"`. New cognosHost facet. `_KDB.cognosAPI` from widgetSettings / deep widgetVis.
- Bake user toggles into `definitions.js`. Mutate catalog objects.

---

## PO locks 2026-09-12

| # | Lock |
|---|---|
| WP | **WP1 now** (showValues 3-way only). WP2 parked. |
| Header | **Ein / Standard / Aus once** (not per row). Row phrase must fit Ein/Aus (**Werte anzeigen**, not “Werte”). |
| Iterator chrome | **Pie only** |
| Zoom | **`zoom.bar.enable` only** |
| New-control inherit | Unset = off everywhere. GET omit. Family A (do not seed). **Explicit Aus = `0`** on every type, including hide types. |
| KEEP | **KEEP-all-vis** (PO + zoom 2026-09-12). Chrome hide ≠ delete. GET still emits `iter`/`zoom` `0\|1` on Line/Pie. Apply **no-op** (never write `true` where chrome is hidden; never write `zoom.bar.enable` on a type without that property). Not grouping CLEAR. Not a third KEEP mode. |
| showValues inherit | **Unchanged** (Line hidden / pie shown). Not “off everywhere”. |

## Still open

- WP2 row phrases: Iterator / Zoomleiste (fit Ein/Aus).
- Stacked* / Prognose / List host dumps (zoom allowlist).
- WP1 **ready for PO GO** (shrunk: `options.js` + CSS). Parent patches listed in the WP1 delta; apply on Approved.

---

## Diagnose table (compact)

| Item | Verdict |
|---|---|
| Live drift (A)? | No |
| Writeback gap on live control (B)? | No |
| Family | **A inherit** for all three; not B; not grouping specialize |
| Drop | S2 (extra icons + third safeguard); S4 as delivery (helper + first new option) |
| Survive | S1, S3 (nested + CSS/stamp gates), S5 = S1→gated S3 |
| Rec | **S5** (HOLD-WITH-GATES folded; still stands) |
| Contract | WP1 sibling chrome-only delta; WP2 new feature delta; D2 pointer only |
| Blockers for WP2 | Inherit table; un-flyout CSS; stamp/replay/safeguard retarget; populate that keeps inners; extract snapshot 149 / properties 150 / GET 144 / stamp 141 / **actionRouter AMD 14** |
