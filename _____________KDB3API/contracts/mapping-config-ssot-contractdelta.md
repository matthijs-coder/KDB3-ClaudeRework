# Contract delta: mapping config SSOT

> As-built for the mapping SSOT work package (PO GO 2026-08-16).
> Orthogonal to T2.1 `writebackMap` v2→v3. Does not change v2 JSON field aliases.

**Status:** `as-built`
**Owner:** package-bound config under `core/config/mapping/` (not a module, not a service)
**Related:** `writeback.md` §0.9/§1/§5, `writeback-v2Map-contractdelta.md` §3, `properties.md`, `dienststelle-parameterSetRestore-contractdelta.md` §6

---

## Purpose

KID / package / itemId mapping and BW old-caption → current member-id mapping live as AMD config next to the Cognos package. Call sites import the files. Cognos property `parameterMappingId` is not loaded. There is no hybrid (properties + JS map).

## Ownership

- No `_KDB.state` subtree.
- No `_KDB.services.mapping`.
- No `_KDB.temp`.
- No new top-level `_KDB.*`.
- `_KDB.config.mapping` is allowed but **not** registered unless PO asks.
- `__savedProperties/parameterMappingId.js` is a fixture / Cognos-upload leftover, never a runtime import.

## Tree

```txt
KDB3/js/core/config/mapping/
  parameterMap.js     // frozen flat *_KID object (inner dump only)
  kidIndex.js         // grouped index + REQUIRED_KEYS over parameterMap.js
  bwOldToNewMap.js    // frozen old caption → member id; null values omitted
```

Deleted:

- `core/config/parameterMapping.js`
- `dashboard/filters/dienststelle/config/bwOldToNewMap.js`

## Call sites

| Consumer | Imports |
|---|---|
| writeback map/get | `kidIndex.js` (`findMissingRequiredKeys`, `getParameterMappingIndex`, `resolveRuntimePackageKey`) |
| writeback SET `validateRestorePayload` | `kidIndex.js` (`resolveRuntimePackageKey`) — pkg mismatch fail; SET must not import `writebackMap` |
| writeback `extractV2FilterValues` | `bwOldToNewMap.js` |
| dienststelle `parameterSetRestore` | `bwOldToNewMap.js` |
| widgetVis `resolvePlanConfigSnapshots` | `parameterMap.js` (snapshot field name on spec stays `parameterMappingObj`) |

`widgetBindingPlan` still requires `spec.config.parameterMappingObj`; the caller passes the JS map. `filterPropObj` stays a Cognos property.

## Index behaviour

- `kidIndex` AMD-imports `./parameterMap.js`.
- Index is built once from the frozen map (map does not change at runtime).
- `getParameterMappingIndex(_KDB)` keeps the caller signature and ignores `_KDB` for the source.
- `findMissingRequiredKeys` runs against `parameterMap.js`. Empty required keys still throw `WRITEBACK_MAPPING_CONFIG_MISSING`.
- Cross-package map: source from the v2 payload; target from `parameterMap.js`.

## Out of scope

- `filterPropObj` / `filterPropId`
- v2 field aliases (`visualType` → `type`, `topN` → `topn`) — `writeback/map/config/v2FieldMap.js` if ever
- T0/T1, WP5, T3 folder regroup, T1 history
- Cognos `spec.json` editor leftover for `parameterMappingId` (JS no longer reads it)
