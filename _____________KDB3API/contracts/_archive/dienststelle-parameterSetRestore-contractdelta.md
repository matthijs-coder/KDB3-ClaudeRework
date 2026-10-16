# Contract Delta: `dienststelle` Parameter-Set Restore

> Delta on top of `contracts/dienststelle.md` and `contracts/writeback.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved` — leaf-id restore lookup 2026-09-03 (PO GO vastenburg); display/use protocol 2026-08-27 still in force
**Parent contract:** `contracts/dienststelle.md`
**Consumer:** `writebackSet`
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08; amendment 2026-08-27 Cursor Grok 4.6; leaf-id lookup 2026-09-03 captain
**Reviewed by:** PO (vastenburg), 2026-07-12; restore display protocol authorized 2026-08-27; leaf-id lookup GO 2026-09-03
**Sync note:** 2026-07-12 — v3-keys gesynchroniseerd naar het descriptieve schema van `contracts/writeback.md` (`fl.di{k,g,p}` → `filt.dstl{key,glob,byTab}`, `fl.si` → `filt.sicht`); `tabIdxToScopeId` gedefinieerd als de tabs-owner `tabTargets`-map. Met PO-akkoord.
**Amendment:** 2026-08-27 — restore display/use protocol aligned with `singleSelect-filterInstanceIdentity-contractdelta.md` §8 and `writeback.md` §4.7 / §9. v3 still stores semantic use values only. Host writes must use a resolved `{d, u}` pair from the restore-only hierarchy index. Transport-only `d = u` is last-resort + diagnostic, not the default path. Fallback keeps the default-table pair. Parameter-set reconcile must run the same view-sync path as other owner reconciles.
**Amendment:** 2026-09-03 — hierarchy `useValue` is often a TM1 unique name; the fachliche Dienststelle id is the **last `[…]` segment** (example glob `["MAG"]`). Restore lookup: exact full `useValue` → unique leaf → unique display → BW map → missing. Host apply writes the **full** resolved `useValue`. GET unchanged. C4/C5 unchanged.

---

## 1. Purpose

`writebackSet.restore(v3)` must restore v3 `filt.dstl` through the `dienststelle` owner. This is the CP-3 restore-only path where hierarchy validation and BW old-to-new mapping may be used.

This delta must not reintroduce hierarchy validation into normal startup, Sicht switch, default, reconcile or history paths.

## 2. v3 Mapping

v3 field:

```js
filt: {
  sicht: "BW",
  dstl: {
    key: "Dienststelle_BW",
    glob: ["MAG"],
    byTab: {
      "2": ["00123456"]
    }
  }
}
```

Mapping:

| v3 | Meaning |
|---|---|
| `filt.dstl.key` | active Dienststelle filter key |
| `filt.dstl.glob` | global semantic use-value: full hierarchy `useValue` **or** the fachliche last `[…]` leaf id |
| `filt.dstl.byTab[tabIdx]` | page-context semantic use-value: full `useValue` **or** last `[…]` leaf id |
| `filt.sicht` | active Sicht value required to choose active hierarchy |

v3 stores semantic use values only. It does not store display values, Cognos `itemId`, `sourceId`, `scopeId` or hierarchy DOM data.

## 3. Public Dispatches

Clear:

```js
_KDB.api.dienststelle.dispatch({
  type: "dienststelle/parameterSetClearRequested",
  payload: {
    source: "writebackSet",
    runId,
    skipHistory: true,
    status
  }
});
```

Restore:

```js
_KDB.api.dienststelle.dispatch({
  type: "dienststelle/parameterSetRestoreRequested",
  payload: {
    dienststelle: v3.filt.dstl,
    activeSichtValue: v3.filt.sicht,
    tabIdxToScopeId,
    source: "writebackSet",
    runId,
    skipHistory: true,
    options: {
      mapOldToNew: true,
      fallbackToDefault: true,
      hierarchyWaitTimeoutMs: 60000
    }
  }
});
```

Return contract:

```js
Promise<{
  ok: boolean,
  appliedScopes: string[],
  fallbackScopes: string[],
  missingValues: Array<{ scope, value }>,
  diagnostics: Array<{ code, scope?, message }>
}>
```

`tabIdxToScopeId` is the tabs-owner `tabTargets` map (`{ [tabIdx: string]: { tabId, pageId, scopeId?, visible } }` per `contracts/tabs-parameterSetRestore-contractdelta.md` §3/§3.1). `scopeId` may be absent; the owner must then derive the scope via its own Cognos paths or fail the scope with a diagnostic.

## 4. Restore-Only Validation

The owner must:

1. validate `runId`;
2. determine active Dienststelle definition from `activeSichtValue` and `filt.dstl.key`;
3. wait for required hierarchy/default table data only in this restore path;
4. build a restore-only hierarchy index that records each unique `useValue` and, when unique, its table `displayValue`;
5. apply BW old-to-new mapping when configured;
6. validate saved semantic values against the hierarchy index;
7. resolve page-context `tabIdx` keys through `tabIdxToScopeId`;
8. resolve a true `{ displayValue, useValue }` pair per valid member (§4.1) and apply through existing Dienststelle/Cognos scope helpers using `{ d: displayValue, u: useValue }` — the same live write shape as `dienststelleScopeApplySupport.toCognosValues`;
9. reconcile confirmed Dienststelle owner state through the owner reconcile path that also runs view sync;
10. avoid history writes when `skipHistory === true`;
11. after the restore-only wait + plan and **before** host apply: realign the inactive variant with existing `deactivateInactiveDienststelleVariants` (chrome root class + inactive clear/status). That is the `writeback.md` §6.3 step-21 realign. Do not dispatch public `dienststelle/sichtChanged`. Authorship: `dienststelle-parameterSet-restore-chrome-contractdelta.md`.

If `v3.filt` or `v3.filt.dstl` is omitted in a normal restore status, `writebackSet` must not call `dienststelle/parameterSetRestoreRequested`. Dienststelle owner defaults are applied only by explicit reset/default orchestration such as `status === "newDashboard"`.

The owner must not:

- call restore-only hierarchy validation from normal reconcile/default flows;
- mutate Sicht state;
- write singleSelect/widget state directly;
- silently default when hierarchy data timed out;
- write Cognos `{ d: useValue, u: useValue }` as the default restore path;
- confirm a transport-only `d` as a resolved hierarchy display.

### 4.1 Restore Display/Use Semantics

v3 `filt.dstl.glob` / `byTab` remain semantic use-value strings. Display is not persisted (`writeback.md` §4.3 / §4.7). Restore must derive labels before the host write, matching the singleSelect protocol:

1. Wait for hierarchy/default table data (existing restore-only wait).
2. Build a restore-only index from hierarchy rows. Each cell is parsed as `{ display, use }` with the same field aliases as the default-table reader (`display`/`d` and `use`/`u`/`useValue`). Membership for **apply** is keyed by the cell `useValue` (often a TM1 unique name). Saved glob/byTab strings are looked up per §4.2.
3. Unique-match rule: one `useValue` with one non-empty display → that pair. The same `useValue` with identical displays stays unique. The same `useValue` with differing displays, or with no display, is **not** a resolved pair.
4. For each validated saved use value, resolve a pair from the index (§4.2). Write `{ d: displayValue, u: useValue }` through the live Cognos value adapter using the **full** resolved `useValue`, never the unmatched leaf/caption string. Do not invent a restore-only `{ d: String(useValue), u: String(useValue) }` helper as the default path.
5. When a true display is unavailable (missing, empty, or ambiguous), the **one** restore apply helper may use transport-only `d = u` and must emit `WRITEBACK_DIENSTSTELLE_RESTORE_DISPLAY_DEGRADED` for that scope/value. That transport `d` is not a hierarchy-resolved label.
6. Fallback-to-default writes the default-table `{ displayValue, useValue }` pair, not the default `useValue` alone.
7. After host apply, reconcile rereads Cognos `.d`/`.u` into owner `{ displayValue, useValue, source }` as today. Owner state does not gain `displaySource` in this amendment.
8. Reconcile after parameter-set apply/clear must use the same view-sync wrapper as other Dienststelle reconciles (`runDienststelleReconcile`), so DEZPV committed-display sanitizing can run when the host caption contains `#`. BW sanitizing stays off per `dienststelleDefinitions.js`.

Do not persist display in v3. Do not parse `displayValue` from a MUN/use value. Do not copy nativeMultiSelect `filt.pcfs[].vals[].d` persistence onto `filt.dstl`. The last `[…]` segment of a unique name is the **id** for lookup (§4.2), not a caption.

### 4.2 Restore lookup ladder (leaf id)

Cognos host `.u` / hierarchy cell `use` is often a TM1 unique name (`dataElementId`). The fachliche Dienststelle id is only the **last** bracket segment (example: `…[Dienststelle_BW].[MAG]` → `MAG`). GET may persist that leaf (`glob: ["MAG"]`) or the full unique name.

Index construction (restore-only, same `buildDienststelleHierarchyIndex` owner):

- Keep the existing `useValue` → member map. Do **not** insert leaf strings as keys in that map.
- Parse leaf with last-`[…]` only: all `/\[([^\]]+)\]/g` captures, take the last; ignore text after the last `]`; empty if there is no bracket pair. No `includes` / first-token / unbracketed fallback on the unique name.
- Reverse map `leaf → { useValue, unique }`. Two members with the same leaf → `unique: false` (miss, no guess).
- Reverse map `displayValue → { useValue, unique }` the same way (secondary). Existing per-`useValue` display uniqueness (§4.1.3) stays for pair resolution, not this alias.

Lookup order for each saved string (as written in v3, not re-parsed into a leaf unless it already is the leaf string):

1. Exact `useValue` map hit.
2. Unique leaf alias (`unique === true`).
3. Unique display alias (`unique === true`), **only if** step 2 did not uniquely hit.
4. BW `mapOldToNew` (existing restore-only map; identity `MAG→MAG` must not hide a leaf collision).
5. Missing (then configured S6 fallback).

A unique leaf or unique display hit is a **valid** member: resolved pair uses the aliased member’s **full** `useValue` and hierarchy display. It is not `missing` and not S6 fallback. C4 therefore does not toast on the MAG-root baseline when the leaf is unique.

Ambiguous leaf or ambiguous display → miss that step (no guess). Leaf wins over display when both could match different members. Display-only MAG vs unique leaf XYZ for the same saved string: restore XYZ.

`hasUseValue` / `resolveRestorePair` own this ladder. `normalizeScope` stays the caller (exact/`hasUseValue` then BW map then missing). Expanding `hasUseValue` to mean “resolvable before BW map” (exact or unique leaf or unique display) is allowed so `buildRestoreScopePlan.js` (150-line cap) need not grow.

Out of scope: GET rewriting leaf → MUN; C4/C5; hardcoded MUN in `bwOldToNewMap`; `waitForStable` host echo of leaf after a full-MUN write (known risk; do not expand this WP unless Cognos fails).

## 5. Hierarchy Readiness And Fallback

| Condition | Behavior |
|---|---|
| hierarchy ready and `rowCount > 0` | validate saved values and apply valid scopes |
| hierarchy ready and `rowCount === 0` | emit explicit diagnostic and apply configured fallback per scope |
| hierarchy not ready before timeout | fail restore with `WRITEBACK_DIENSTSTELLE_RESTORE_FAILED` |
| saved values partially missing; **global** has at least one **saved** member that validates | apply valid scopes (incl. global); **do not** S6-default missing `byTab`; those PC scopes stay empty after clear (Cognos inherit / vis already binds **global** `dominantValues`) |
| saved values missing on **global** (and `fallbackToDefault`) | S6-default **global** with default-table `{d,u}` pair; then apply other scopes: valid saved → write; missing `byTab` → S6-default only if global itself is on the default path (all-miss / global-miss), not when global kept a saved member |
| global cannot apply and cannot fallback | **fail-fast:** do not write later `byTab` scopes; skip restore reconcile; owner `ok: false` (`requiredOk` still global-only) |
| no saved Dienststelle data | apply owner default only when writeback status requires it |

Fallback must be visible in restore diagnostics. When fallback applies, the host write uses the default-table display/use pair.

Outcome classification for `writebackSet`:

| Dienststelle result | RestoreResult outcome |
|---|---|
| all requested scopes applied | `"committed"` unless another phase degraded/failed |
| fallback or partial restore on diagnostic-tolerant scopes | `"degraded"` |
| required global scope cannot be applied or fallbacked | `"failed"` |
| hierarchy timeout | `"failed"` |

## 6. BW Old-To-New Mapping

BW old-to-new mapping is restore-only.

Mapping source:

```txt
KDB3/js/core/config/mapping/bwOldToNewMap.js
```

The mapping source must be an owner-approved config/helper, not `_KDB.temp`.

Normative mapping phases:

| Phase | Owner | Behavior |
|---|---|---|
| legacy map pre-normalize | `writebackMap` | when v2/v0/v1 contains old BW labels, normalize them to semantic v3 use values where possible |
| restore validation | `dienststelle` | re-validate v3 values against `bwOldToNewMap` and current hierarchy index before Cognos apply |
| direct v3 restore | `dienststelle` | if v3 contains an old BW label, map it only on this restore path and emit diagnostic that legacy label was accepted |

Diagnostics:

```txt
WRITEBACK_DIENSTSTELLE_BW_LABEL_MAPPED
WRITEBACK_DIENSTSTELLE_BW_LABEL_UNMAPPED
WRITEBACK_DIENSTSTELLE_RESTORE_DISPLAY_DEGRADED
```

Behavior:

- mapped old label -> apply mapped value and include informational diagnostic;
- unmapped old label -> skip/fallback affected scope and emit `WRITEBACK_DIENSTSTELLE_BW_LABEL_UNMAPPED`;
- numeric/current value -> validate directly against hierarchy index;
- mapping must never run in normal Dienststelle reconcile/default paths.

Minimum fixture:

```js
const sample = readRequiredBwOldToNewFixtureSample();

{
  config: {
    bwOldToNewMap: {
      [sample.oldValue]: sample.newValue
    }
  },
  input: { filt: { sicht: "BW", dstl: { key: "Dienststelle_BW", glob: [sample.oldValue] } } },
  expected: {
    mappedBy: "bwOldToNewMap",
    appliedValues: [sample.newValue],
    appliedScopes: ["global"],
    diagnostics: ["WRITEBACK_DIENSTSTELLE_BW_LABEL_MAPPED"]
  }
}
```

`sample.oldValue` and `sample.newValue` must come from a real legacy-to-current pair in `bwOldToNewMap.js`. The fixture is invalid if either side is a placeholder.

## 7. Failure Modes

| Condition | Behavior |
|---|---|
| clear failure | abort SET before Dienststelle restore, except `status === "newDashboard"` may continue with non-fatal diagnostic + reset defaults |
| stale `runId` | cancel with `WRITEBACK_RESTORE_CANCELLED` |
| missing page-context target | fail scope with `WRITEBACK_TABS_TARGET_MISSING` |
| hierarchy timeout | fail with `WRITEBACK_DIENSTSTELLE_RESTORE_FAILED` |
| invalid active key/Sicht mismatch | fail with owner diagnostic |
| hierarchy member valid but display missing or ambiguous | apply use value with transport-only `d = u`; emit `WRITEBACK_DIENSTSTELLE_RESTORE_DISPLAY_DEGRADED`; restore remains `ok` for that scope unless the host write itself fails |

## 8. Acceptance

- CP-3 remains intact: normal flows do not use restore-only hierarchy validation.
- BW and DEZPV restore paths both work.
- Page-context scopes restore by `tabIdxToScopeId`, not persisted `scopeId`.
- Empty hierarchy table behavior is explicit and diagnostic.
- WidgetVis can consume confirmed Dienststelle hierarchy state after restore.
- Closed FilterDock chip after SET shows the resolved display (Cognos `.d`), not the persisted use value / MUN, when the hierarchy index has a unique display.
- Transport-only `d = u` is last-resort + `WRITEBACK_DIENSTSTELLE_RESTORE_DISPLAY_DEGRADED`, never the silent default.
- Default fallback writes `{ d: default.displayValue, u: default.useValue }`.
- Live select, history replay and tab-mutation writes keep using `dienststelleScopeApplySupport.toCognosValues`; they are unchanged.
- GET still persists `useValue` strings only.
- Saved leaf id (example `MAG`) uniquely matching the last `[…]` of one hierarchy `useValue` restores that full `useValue` and does not S6-default or C4-toast.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-07-12 | `Approved` | PO vastenburg | Original restore-only hierarchy validation + BW map + `tabIdxToScopeId`. |
| 2026-08-27 | `Approved` — display/use restore protocol | PO vastenburg | Plan A: resolve display from hierarchy index before host write; transport `d = u` last-resort + `WRITEBACK_DIENSTSTELLE_RESTORE_DISPLAY_DEGRADED`; fallback keeps default pair; parameter-set reconcile uses `runDienststelleReconcile` for view sync. v3 remains use-value-only. |
| 2026-09-03 | `Approved` — leaf-id lookup | PO vastenburg | Exact `useValue` then unique last-`[…]` leaf then unique display then BW map. Apply full resolved unique name. GET/C4/C5 unchanged. |
