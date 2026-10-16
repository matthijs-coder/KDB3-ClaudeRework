# Launch prompt — mapping SSOT (`core/config/mapping/`)

Paste into a **fresh** agent chat. Do **not** continue the T2.1 writebackMap
implementation chat (context full). Planner + Composer 2.5 implement + Grok 4.6
cross-review. PO = vastenburg. Branch `tabs`. Do **not** push. Commit only if PO asks.

Predecessor: T2.1 `writebackMap` v2→v3 **code landed 2026-08-16**, Cognos still
open (`contracts/writeback-v2Map-contractdelta.md`). This WP is **orthogonal**:
stop loading KIDs from Cognos properties; JS `config/mapping/` becomes the
package-bound source of truth. PO GO 2026-08-16.

---

## 0. Why a fresh chat

The previous session decided the design. Remaining work is many-file rewiring
(properties loader, kid index, writebackMap, widgetBindingPlan, dienststelle
restore, contracts). Fresh context + this prompt. Re-read **live** files.

---

## 1. PO decisions (do not reopen)

1. Project config is **package-bound** on purpose (`config/` is the place to
   edit when the Cognos package changes).
2. **Two mapping dimensions**, sibling files, different call-sites:
   - KID / package / itemId (from Cognos dump conceptually)
   - BW old caption → current member id (from KDB2 `mapOldBwToIdHelper.js`)
3. Both live under **`KDB3/js/core/config/mapping/`**.
4. **`parameterMappingObj` leaves `_KDB.properties`.** Cognos property
   `parameterMappingId` is **no longer loaded**. Single source of truth = the JS
   map file. Do **not** keep a hybrid (properties + config).
5. `__savedProperties/parameterMappingId.js` stays a **fixture / Cognos-upload
   leftover**, not a runtime import.
6. `filterPropObj` stays a Cognos property (out of this WP).
7. v2 JSON field aliases (`visualType` → `type`, `selectedOptions.topN` →
   `topn`) are a **third** layer → `writeback/map/config/v2FieldMap.js`.
   **Out of this WP** unless leftover time after SSOT is green. Do not mix into
   `parameterMap.js`.
8. No new top-level `_KDB.*`. AMD-import the mapping modules. Optional
   `_KDB.config.mapping` only if PO asks (allowed namespace, not required).
9. No `_KDB.temp`. No `_KDB.services.mapping`. Do not edit `.mdc`.
10. Do not reopen T0/T1, WP5, T3 folder regroup, T1 history.

---

## 2. Target tree

```txt
KDB3/js/core/config/mapping/
  parameterMap.js     // frozen flat *_KID object (content from the dump)
  kidIndex.js         // move/adapt core/config/parameterMapping.js
  bwOldToNewMap.js    // fill from mapOldBwToIdHelper; skip null values
```

Delete or turn into a one-line re-export (prefer **delete + update imports**):

- `KDB3/js/core/config/parameterMapping.js` (old path)
- `KDB3/js/dashboard/filters/dienststelle/config/bwOldToNewMap.js` (empty stub)

---

## 3. Sources (copy, do not invent)

**KID map values** — unwrap the inner object of:

`_____________KDB3API/__savedProperties/parameterMappingId.js`

That file is `JSON.stringify({ parameterMappingId: { …keys } })`. Production
`parameterMap.js` exports the **inner map only** (`Object.freeze({…})`), not the
wrapper, not JSON.stringify.

**BW old→new** — port pairs from:

`laatsteOriginal/KDB2/js/filters/hierarchy/restoreFromParameterset/mapOldBwToIdHelper.js`

Rules: object not `Map`; **omit entries whose value is `null`**; keep `"MAG":"MAG"`
and numeric id strings; English comments; file may exceed 150 lines (pure data
config — `projectStructureRules.md` config exception: split only if unscannable;
one data file is OK). No `_KDB.temp` cache.

---

## 4. Behaviour change (kidIndex)

Today `getParameterMappingIndex(_KDB)` reads
`_KDB.properties.parameterMappingObj`.

After:

- `kidIndex` AMD-imports `./parameterMap.js`
- `getParameterMappingIndex(_KDB)` may ignore `_KDB` for the source (keep
  signature for callers) **or** take no `_KDB` for the map and only use `_KDB`
  for the existing runtime cache bucket
- Cache: if kept, **do not** key it off `properties.parameterMappingObj`. Prefer
  module-level index of the frozen map (map never changes at runtime) **or**
  `_KDB.runtime.parameterMapping` rebuilt from the imported object. Simplest:
  build index once from `parameterMap.js`, no properties.

`findMissingRequiredKeys` must run against **`parameterMap.js`**, not properties.

`WRITEBACK_MAPPING_CONFIG_MISSING` still applies if required keys are empty
strings in `parameterMap.js`.

---

## 5. Stop Cognos load

`KDB3/js/core/properties/config/getObjectPropertyDefinitions.js`

**Remove** the line:

`{ propertyId: "parameterMappingId", runtimeKey: "parameterMappingObj" }`

Leave `filterPropId` and every other property.

Update `contracts/properties.md` so `parameterMappingObj` is **not** a loaded
object property.

Grep and fix remaining `_KDB.properties.parameterMappingObj` / snapshots that
assume properties:

| File | What to do |
|---|---|
| `core/config/parameterMapping.js` | move → `mapping/kidIndex.js`; stop properties read |
| `writeback/map/adapters/mapV2ToV3.js` | `findMissingRequiredKeys` on imported map / kidIndex |
| `writeback/map/adapters/remapV2KidTokens.js` | AMD path `../../../../config/mapping/kidIndex.js` |
| `writeback/get/createWritebackGetService.js` | expectedSource comment + any diagnostic text |
| `widgetVis/config/visTypes/resolvePlanConfig.js` | snapshot from kidIndex/parameterMap, **not** `properties.parameterMappingObj` |
| `widgetVis/effects/buildBindingSpec.js` | same snapshot source |
| `widgetBindingPlan/validate/validateSpec.js` | still requires a mapping object on spec; caller must pass config map |
| `widgetBindingPlan/filters/resolveFilterItemId.js` | unchanged API; callers pass the JS map |
| `dienststelle/actions/parameterSetRestore.js` | import `core/config/mapping/bwOldToNewMap.js` |
| `writeback/map/adapters/extractV2FilterValues.js` | same new BW path |

Grep the whole `KDB3/js` tree for `parameterMappingObj` and
`config/parameterMapping.js` before done.

---

## 6. Contracts to patch (as-built, same WP)

- `contracts/writeback.md` §0.9, §1 config path, §5: **drop hybrid model**.
  SSOT = `core/config/mapping/parameterMap.js`. Index =
  `core/config/mapping/kidIndex.js`. Static fixture is not runtime. Cross-package:
  source map from **v2 payload**; target from **parameterMap.js**.
- `contracts/writeback-v2Map-contractdelta.md` §3 allowed reads: replace
  `_KDB.properties.parameterMappingObj` with mapping modules.
- `contracts/futureTodo/writeback-restore-deferred-backlog.md` §1.1: BW map
  **filled** from KDB2 helper (this WP).
- `contracts/dienststelle-parameterSetRestore-contractdelta.md` if it names the
  old `dienststelle/config/bwOldToNewMap.js` path.
- `contracts/properties.md`: remove parameterMapping from loaded object props.
- Short new delta optional: `contracts/mapping-config-ssot-contractdelta.md`
  (purpose, ownership: no `_KDB.state`, AMD config only, out of scope).

---

## 7. Rules

JS executable ≤150, orchestrator ≤120, ≤10 AMD imports. **Pure data** config
files may exceed 150 (`parameterMap.js`, `bwOldToNewMap.js`).
No `helpers/` `common/` `misc/` `shared/`. AMD `define`, named factory-scope
functions, try/catch on executables. English identifiers.
`filterPropObj` classify in writebackMap stays properties (not this WP).

---

## 8. Process

1. Re-read live files + this prompt. Confirm T2.1 map adapters exist; do not
   rewrite v2 field mapping in this WP.
2. Compact contract delta (or parent §5 rewrite) reflecting SSOT. Then implement.
   PO already GO’d the design; do not wait for a second GO unless you must
   deviate (e.g. keep properties as fallback).
3. Composer 2.5 implements. Composer initial review. **Grok 4.6** cross-review
   (properties fully unwired? BW nulls omitted? no dual truth?).
4. STOP for PO: Cognos — widget bind still resolves slots; dienststelle restore
   with an old BW label maps or diagnostics; v2 map still finds required KIDs
   without the Cognos property.

SUCCESS: one folder `core/config/mapping/`; grep finds **zero** runtime reads of
`_KDB.properties.parameterMappingObj`; Cognos no longer needs `parameterMappingId`
on the dashboard object for KDB3 JS.

---

## 9. Forbidden

- Copying `__savedProperties/parameterMappingId.js` as a `JSON.stringify` wrapper
  into production and `eval`/parse it
- Leaving the property definition **and** the JS map both live
- Putting `visualType` / `globalFiltersObj` keys into `parameterMap.js`
- Filling BW map with `null` values (omit those keys)
- New `_KDB.properties.*` keys, new top-level `_KDB.*`
- T1 history / NMS dest-write / WP5 / T3
- Commits unless PO asks
