# FutureTodo: singleSelect bookkeeping makes every SET restore `degraded`

**Found:** 2026-10-06, live restore of `oude parameterset.txt` (v2 → v3: `sicht`, `dstl` global, `pcfs` Jahr on tabs 0/1/3, **no `sels`**).
**Status:** open — PO decision on diagnostic policy needed (was parked as accepted leftover in `post-nms-slim-futuretodo-launch-prompt.md:120-121`).

## Observation

`singleSelectPreRestoreReconcile` and `singleSelectResync` both return `ok: true, degraded: true` → `RestoreResult.outcome: "degraded"` (`runNormalRestore.js:87`, `createRunContext.js:59-61`) even when no single-select write failed.

## Causes (verified)

1. `SINGLE_SELECT_HOST_ITEM_UNKNOWN` for every live host item singleSelect does not adopt (`enumerateFilterInstances.js:92-98`, `classifyFilterInstance.js:38-46`). Here: 6× Jahr (1 global + 5 page scopes; `isSingleSelect: "false"`, `isNative: "true"` → owned by nativeMultiSelect) and 3–4× empty `itemName` (unidentified Cognos page-context rows).
2. `reconcileFilterInstances.js:27` sets `degraded: _diagnostics.length > 0`.
3. `WRITEBACK_SINGLESELECT_RESYNC_UNREGISTERED` + skip `noRegisteredAssignments` when no `sels` were restored (`parameterSetResyncApply.js:99-102`); `:61-63` sets `degraded` on any diagnostic/skip or degraded reconcile.

## Contract position

- Identity delta (`singleSelect-filterInstanceIdentity-contractdelta.md:302-320`) requires the unknown-item diagnostic; its degraded rule covers "partial malformed items", not configured foreign-owner items.
- `writeback.md:299-308` allows `outcome: "degraded"` only for diagnostic-tolerant / skipped-by-design degradation; no contract makes foreign-owner items or an empty resync registry degraded.
- Classification: degraded promotion = code beyond contract; missing rule "foreign-claimed (pcfs / Dienststelle / Sicht) vs truly unknown" and "empty resync" = contract gap.

## Open questions for PO

- Should unknown/foreign host items stay diagnostic-only without `degraded`?
- Should an empty resync registry (no `sels` in the set) be silent, diagnostic-only, or degraded?
- What are the empty-`itemName` page-context rows (legacy read `getPageContextSpecItem().filterName` when `getItemName()` is blank)?

## Sequencing

After `writeback-step27-bindPerActiveTab-contractdelta.md` (TopN); otherwise the run never reaches `committed` anyway.

Update 2026-10-06: step 27 is `Implemented`. The live run now completes all phases and ends `degraded` **only** through these two phases, so this note is the remaining blocker for `committed`. Same run: `singleSelectPreRestoreReconcile` reports 6× Jahr + 3× empty `itemName`; `singleSelectResync` reports 6× Jahr + **4×** empty `itemName` (+ `WRITEBACK_SINGLESELECT_RESYNC_UNREGISTERED`). One extra unidentified page-context row appears during restore (fact; source not investigated).
