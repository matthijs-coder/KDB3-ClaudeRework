# Contract Delta: popupDisplayResync characterData for Dienststelle labels

**Status:** Approved by execution tranche 3C (2026-06-05)  
**Owner modules:** `filterDock`, `dienststelle`  
**Base contracts:**

```txt
_____________KDB3API/contracts/filterDock.md
_____________KDB3API/contracts/dienststelle.md
_____________KDB3API/contracts/dienststelle-popup-label-double-pass-execution-spec.md
```

---

## 1. Purpose

Approve `characterData` observation on the filterDock-owned popup mount observer for owners with `needsPopupDisplayResync: true`, limited to hierarchy option label text writes that affect visible popup display sanitizing.

This closes the race where Cognos `ba-common-truncatedText` updates visible text after attribute-driven resync passes.

## 2. Approved observer extension

`managePopupDisplayResync.js` may observe popup mount with:

```js
characterData: true
```

Existing `childList`, `subtree`, `attributes`, and `attributeFilter: ["aria-label", "title"]` remain unchanged.

## 3. Relevance filter

`evaluatePopupDisplayResyncSession.isRelevantMutation` may treat `characterData` as relevant only when the mutation target's parent element is a popup label text node:

- `[data-tid="ba-common-truncated-text__text-node"]`
- `.ba-common-truncatedText__text`

All other `characterData` mutations remain ignored.

## 3b. Synchronous resync on label characterData

When `hasRelevantCharacterDataMutation(records)` is true, `managePopupDisplayResync` must call `dispatchPopupDisplayResync` **synchronously** in the MO callback (before `schedulePopupDisplayResync`) with:

```js
resyncSource: "mountMutationCharacterDataSync"
```

This closes the paint gap after Cognos overwrites visible truncated text following an earlier async sanitize pass. The existing async primary + confirm ladder remains scheduled for stable-safe ready marking.

## 4. Ownership boundaries (unchanged)

- filterDock owns observer lifecycle, coalescing, and re-dispatch.
- Dienststelle owns strip/transform rules and ready semantics.
- Dienststelle-owned observers remain forbidden.
- Popup `aria-label` rewrite remains out of scope.

## 5. Confirm ladder (same tranche)

`schedulePopupDisplayResync.js` may schedule multiple confirm flushes per burst at `[0, 16, 50]` ms in addition to the primary rAF flush.

## 6. Stable-safe ready (Dienststelle)

Dienststelle may require two consecutive safe sanitize passes before adding `KDB_dienststelle_popupLabelsReady`, tracked per label element in view-layer memory (WeakMap), not in `_KDB.state`.

---

## Approval log

| Date | Action | Notes |
|------|--------|-------|
| 2026-06-05 | Delta recorded | Tranche 3C: characterData + confirm ladder + stable-safe ready |
