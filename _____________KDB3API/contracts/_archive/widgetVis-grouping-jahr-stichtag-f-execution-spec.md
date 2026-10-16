# Execution Spec: vis grouping — Step F (layout-set)

> Mechanical spec for grok 4.6 army. Architecture lives in `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` **§12**.
> Title pack: `contracts/widgetVis-title-aggregation-contractdelta.md` §2/§3 (F amend). Family: KEEP-specialize on grouping only.
> Echo Section A **before** producing files. Army does not stamp F `Implemented`. Do not start C/D/E.

---

**Status:** `Executed` — F1+F2 landed; CLEAR-simple (no leftover alias) 2026-09-12. PO canvas green. Grouping-delta Step F `Implemented`.
**Module / contract:** grouping-delta §12
**Phase:** `extension` (F)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-12 night
**Executing AI:** grok 4.6 army
**Reviewer:** captain + dual grok 4.6 review

---

## Waves (do not invert)

| Wave | Writers | Starts when |
|---|---|---|
| **F1-GRAIN** | one | spec Ready |
| **F1-ID** | one | spec Ready (∥ GRAIN; no shared files) |
| **F1-PLAN** | one | F1-ID done (pack table must match identity) |
| **F1-OR** | one | F1-ID done (in-place token OR only) |
| **F2-CHROME** | parallel writers, exclusive files | F1 dual-green + PO U2 **Diagrammstandard** |

F2: inherit row + allowlist hide + CLEAR delete + List CSS unhide + commit delete-key. Do not edit `buildBindingSpec.js`.

## Exclusive allowlists

### F1-GRAIN

**May edit:** `KDB3/js/core/config/visualizations/bindingSpecsGrain.js`

**Must not:** identity, planner, chrome, apply, visTypes bodies, `.mdc`.

### F1-ID

**May edit:** `KDB3/js/dashboard/widgets/widgetVis/config/visTypes/resolveVisTypeIdentity.js`

**Must not:** grain file, planner, chrome, `buildBindingSpec.js`.

### F1-PLAN

**May edit:** `KDB3/js/core/services/widgetBindingPlan/filters/buildLocalFilters.js` — **local `resolveKennzahlPack` only**. Stay ≤150. AMD unchanged.

**Must not:** rewrite `addWidgetFilters` / extraFilter / slot planner.

### F1-OR

**May edit** (in-place one-line token OR expand only; **no new import**):

- `KDB3/js/dashboard/widgets/widgetVis/effects/buildBindingSpec.js` (150 — same line)
- `KDB3/js/dashboard/widgets/widgetSettings/effects/buildWidgetVisSettingsSnapshot.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/handleApplySetting.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/handleApplyStartupSettings.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/readEffectiveSettingsContext.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/parameterSetBindingHelpers.js`
- `KDB3/js/dashboard/widgets/widgetSettings/view/stampPanelVisType.js` (token mark only; no hide/rebuild yet)

**Must not:** add AMD imports; add delete-key; add options rows; CSS.

### Nobody in F1

`applyGrainOverlayOnClone.js` (already generic), `bindingSpecsVisTypes.js`, `sorting.js`, `KDB.js`, `bindWidgetSettingsPanel.js`, `commitWidgetSettingValue.js`, `options.js`, CSS, shards, `.mdc`, grouping-delta (captain).

---

## Section A. Pre-flight

Read in order; echo **one sentence** each. Do not paste rule bodies.

1–11. The 10 MUST `.mdc` + `cognos-adapter.mdc`
12. grouping-delta **§12 only**
13. This spec

Also echo: F — tokens `stichtag|jahr|jahrStichtag|stichtagProJahrH|stichtagProJahrV`; inherit = absence; pie/stacked B `stichtag` aliases `jahrStichtag`; apply data-only; no P3; no `"default"` token; List overlay lift in identity; Prognose hard-return stays; no 4th factory pack.

---

## Section B. Files

F1 only: `bindingSpecsGrain.js`, `resolveVisTypeIdentity.js`, `buildLocalFilters.js` (pack fn), F1-OR list above.

---

## Section C. Per-file

#### `bindingSpecsGrain.js`

- **Role:** config. AMD `[]`. Config-size OK.
- Line: keep `defaultGrain: "stichtag"`. Keep `grains.jahr`. Add `jahrStichtag`, `stichtagProJahrH`, `stichtagProJahrV` per §12.4. Do **not** add `grains.stichtag` (body is default).
- pie / StackedBar / StackedColumn: `defaultGrain: "jahr"`. **Rename** live `grains.stichtag` → `jahrStichtag` **and keep** `grains.stichtag` as **identical alias** (B leftover token). Add H/V per §12.4 (Monat exclude + Agg pin; unused Repeat `""`).
- List: add `{ defaultGrain: "jahrStichtag", grains: { jahr: { grid_cols: ["Jahr", "[Personal_KDB_TM1].[KDB Kennzahlen].[replaceKennzahlName]"], slotComposition: full object targetIndex 1 + hierarchy from visTypes List } } }`. No H/V. Copy `slotComposition.hierarchy` from List body — do not invent.
- Prognose row unchanged (`defaultGrain` only).
- **Rules:** `amd.mdc`; §12.4; §9 no unique names except List Kennzahl placeholder `[` passthrough.

#### `resolveVisTypeIdentity.js`

- Widen `resolveEffectiveGrain`: explicit if token is one of the five; pie/Stacked* `"stichtag"` → treat as `jahrStichtag` for overlay+pack; else `defaultGrain`.
- `resolveGrainOverlay`: lift **List** hard-return (read `grains[effective]`). Prognose hard-return **stays**.
- `resolveKennzahlPack`: §12.5 table. Allowlist-before-pack. Prognose hard `stichtag`. No 4th pack.
- Optional factory-scope `isExplicitGrain` **in this file only**.
- Stay ≤150. AMD unchanged.
- **Rules:** `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `buildLocalFilters.js`

- Local `resolveKennzahlPack` must match identity §12.5 (same table; no `_KDB` / no identity import).
- ≤150. AMD 6 unchanged.

#### F1-OR files

- Expand every `=== "stichtag" || === "jahr"` grouping gate to include `jahrStichtag`, `stichtagProJahrH`, `stichtagProJahrV`.
- `buildBindingSpec.js`: **same line**, still 150.
- No new behavior.

---

## Section D–I

N/A — not a new module.

## Section J. Acceptance (F1)

1. Grain file has Line 4 overlays + pie/Stacked H/V + `jahrStichtag` + `stichtag` alias on pie/Stacked + List `grains.jahr`.
2. Identity + planner pack match §12.5. List+`jahr` → pack `jahr`. pie+`jahrStichtag` → pack `stichtag`.
3. List overlay no longer hard-undefined.
4. Token ORs accept five tokens. No new AMD on 148–150 files.
5. Apply / visTypes / CSS / options untouched.
6. Report: echoes + line counts.

## Section K. Forbidden

- `"default"` / `"none"` / `""` inherit token. Write `defaultGrain` on coerce.
- P3 occupancy. New service. New visType buckets. Unique names in Zeit overlay keys.
- Start C/D/E. Close Q6. Edit `KDB.js` / `bindWidgetSettingsPanel.js` / `sorting.js` / CSS / `options.js` in F1.
- Skip Section A echo.

## Section L. Writer report

Echoes + file table (path, lines, AMD, matches|deviation).

## Section M. Review

Dual FAIL/NIT. Listed paths only. Do not paste `.mdc`.

---

## Approval Log

| Date | Status | Who | Notes |
|---|---|---|---|
| 2026-09-12 night | `Ready for execution` | captain (PO F lock + second-pass hold) | F1 catalog first. F2 chrome later. |
| 2026-09-12 night | F1 `Executed` | captain; army GRAIN/ID/PLAN/OR; dual R1/R2 GREEN/GREEN | F2 waits: label, delete-key, stamp-hide, List CSS. |
| 2026-09-12 night | F2 `Executed` | captain; army chrome; dual R1/R2 GREEN/GREEN | U2 Diagrammstandard; inherit delete-key; List unhide; stamp hide + CLEAR. |
| 2026-09-12 night | CLEAR-simple | PO vastenburg; captain | Drop leftover `stichtag`→`jahrStichtag` remap. Illegal token → inherit. |
| 2026-09-12 | `Executed` + grouping-F `Implemented` | PO vastenburg | Cognos canvas green. C–E not this spec. |
