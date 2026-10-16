# Contract Delta: Chip-B leftover closed-chip overlay

> Delta on `contracts/dienststelle.md` §6 action table, §8, §21 matrix, Approval Log.
> Proven leftover: after DEZPV tab OK the active-tab host is Y (`d` has `#`, `u` is ZEB); the closed `#filterDock__other` chip still shows Gesamt / leftover `ALLE#` aria. Cognos never painted Y on that node. Widget already follows `u`.
> This wave retracts “Cognos writes the closed filter text / we only sanitize” **for leftover closed-chip chrome only**.

---

**Status:** `Implemented`
**Parents:** `dienststelle.md` §6 action table; §8; §21 `DEZPV display sanitizing` + `Manual commit display sync`; Approval Log
**Related (do not amend):** tableData source-stamp; widget-bind tab-scope; unique-flatten; S1/S2/S3 host law; `singleSelect` `paintChip`
**Type:** `feature-module contract delta`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-10-16
**Army lock:** Chip-B. Skip-aria-only (Chip-A), `writeFilter` same-Y repaint, `paintChip` import / new Dienststelle `paintChip`: out.

---

## 0. Diagnosis

**(a)** User OK on the tab is observe-only. Host page member is already Y. Closed-chip chrome stays leftover ALLE / Gesamt. 4 rAF sanitize prefers leftover `#` aria and writes Gesamt (reinforce). MUT never looksY.

**(b)** Skip leftover-aria alone leaves Gesamt: visible text has no `#` → no write.

**(c)** Writing `sanitize(hostDisplay)` through existing `stripLabelElement` shows Y. That is leftover **overlay**, not chrome-only sanitize. Reusing the strip writer does not keep the 2026-06-02 lock.

**(d)** Two visible DEZPV chips (CSS). First `[data-id]` in a bucket is not the active tab. `_syncView(null)` sanitizes both buckets. Painting Y on empty global leftover is a false pass. A-green scores **host**, not chip text.

---

## 1. Closed product decisions

| # | Lock |
|---|---|
| 1 | **Law retract.** Leftover closed-chip chrome may take this-scope first-member raw `hostDisplay` / host `.d` as strip source. Not still “Cognos paints, we only sanitize.” Name the write an overlay in the parent. Do not name a Dienststelle `paintChip`. |
| 2 | **Transform stays.** `sanitizeDienststelleVisibleLabel` (`#` / `\|` / `" - "`) still transforms the **chosen source**. Dirty `#` `hostDisplay` is required. Clean `displayValue` is a no-op (`trimmed === source`). |
| 3 | **Skip-stale-aria, closed chip only.** `#` aria/title is current iff `source === hostDisplay` or `sanitize(source) === sanitize(hostDisplay)`. Else ignore. Popup `resolveSanitizeSource` stays aria-first. Do not rewrite leftover aria (`ariaFromSource: "ifEmpty"` stays). Overlay **must** write `sanitize(hostDisplay)` onto committed `title` of the text span and `.wa-filterDock-filterItem-bottom` even when leftover title is already clean (no `#`). Hash-strip without overlay still requires `#` on title. |
| 4 | **Sticky in one function.** Skip + hostDisplay override live on every `sanitizeCommittedDisplay` / `stripLabelElement` committed call. Callers: `runDisplaySync` (tab-OK 4 rAF), `runCommittedSyncBothBuckets`, `FILTER_DOCK_POPUP_READY`, `FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED`, Sicht `_syncView(null)`, history replay. Patching only both-buckets is illegal. |
| 5 | **Target.** Overlay writes **only** the uniquely resolved `Dienststelle_DEZPV` wrapper under `#filterDock__other`. New resolver. Not `findScopedFilterWrapper` alone. `querySelectorAll`, never `querySelector`. Prefer connected `filterDock.runtime.domRefs.activeFilterEl` after pageContext OK iff it sits in `#filterDock__other` and contains that `data-id`. Count 0 → no overlay. Count 1 without matching `activeFilterEl` → that node only as **bucket uniqueness**, not tab-identity. Count >1 without unique `activeFilterEl` → **abort overlay**. Do not use computed `display` as the picker. Hash-strip may keep first-match. `sanitizeCommittedForScope === true` is not Chip-B success. |
| 6 | **Per-wrapper source.** Other + non-empty this-scope dirty `hostDisplay` → overlay. Global + empty host → skip leftover `#`, **no write**. Empty this-scope host → no overlay. Null handoff is **not** “global host / skip other.” `_syncView(null)` still overlays the other chip from **active-tab** `hostDisplay`. `readHandoffFilterScope(null) → "global"` must not drive overlay source. |
| 7 | **This-scope only.** Caption source = `pickPageContextScopeMap(..., "active")` first-member `hostDisplay`, or global `[0].hostDisplay` for the global **hash-strip** path only. From existing snapshot state. No live `readFilterValues`. **Forbidden:** `lookupFilterRef(..., "pageContext", null)`; `allPageContextScopes`; flatten all `hostDisplays`; `collectAlignedHostDisplays` / `uniqueAligned` / `collectPageContextUseValues` on the unpicked map. |
| 8 | **No host write.** No `writeFilter`, `applyDienststelleDefault`, `walkPageScopes`, widget notify from this sanitizer pass. S1 four sibling ALLE hosts KEEP. |
| 9 | **Out of this wave.** BW leftover (`shouldSanitizeOptionDisplay: false`); badge-2 while first host member is still ALLE; tab-switch leftover without Cognos mutation; Chip-A-only ship. S2 Gesamt on the **tab** chip after a real default write is intended. |
| 10 | **Out.** `paintChip` / SS import; new Dienststelle `paintChip`; extra rAF / Dienststelle observer; `KDB.js` version. |

---

## 2. Law

After DEZPV tab OK, if the active-tab host first member is dirty `#` Y and the closed other-dock chip chrome is leftover vs that member, Dienststelle writes `sanitize(hostDisplay)` onto that chip’s committed text. Empty global leftover Gesamt stays leftover. Four S1 tabs stay ALLE on the host. Popup stays aria-first chrome sanitize. Observe / OK remains display-only (no `writeFilter`).

Pass/fail of this wave: DEZPV, deselect default, select ZEB (or other non-default), OK. Active-tab **host** stays Y. Closed `#filterDock__other` DEZPV chip **text** becomes `sanitize(host.d)` (for the proven Y: `3g_Ref_ZEB - Zentrale Einbringung`). Global **host** stays empty. Global leftover Gesamt is **not** a fail and must not become Y. Widget stays Y.

---

## 3. Text to land (in-place; a parent insert alone is illegal)

### `dienststelle.md` §6 action table — add one row after `filterDockFiltersReady`

| Action type | Source | Purpose |
|---|---|---|
| `dienststelle/filterDockCommittedDisplayObserved` | `filterDock` committed-display observer | Display-only leftover overlay + existing `#` strip. No reconcile, default, `writeFilter`, history, or widget. |

### `dienststelle.md` §8 — rewrite these sentences in place

**Flag (~417).** After the flag sentence, add: leftover closed-chip chrome whose wrapper `#` source is not the current host member may write `sanitize(hostDisplay)` through the existing strip writer. That overlay is not chrome-only sanitize.

**Transform step 2 (~423).** Keep steps 1–6 as the transform of the **chosen source**. Add after step 6: leftover closed-chip text with no `#` may be replaced when the committed source is current-host `hostDisplay` that still contains `#`.

**Approved surfaces (~432–434).** Keep popup `aria-label` as popup source only. Add approved **committed leftover source**: this-scope first-member raw `hostDisplay` / host `.d` when it contains `#` and wrapper `#` chrome is not that member.

**Sanitizer-only (~459–460).** Popup remains sanitizer-only. Leftover closed-chip overlay is allowed on the committed-display path.

**2026-06-02 rAF (~464).** Keep the bounded rAF. Retract the purpose clause that Cognos-written closed text is the only chip. After the defer, leftover chrome vs current host may take `hostDisplay`.

**New §8 bullet.** `dienststelle/filterDockCommittedDisplayObserved` is display-only and may run the same leftover overlay. Empty global leftover must not receive the tab caption.

### `dienststelle.md` §21

- `DEZPV display sanitizing`: popup stays chrome transform; leftover closed chip may use this-scope `hostDisplay`. BW unchanged.
- `Manual commit display sync`: rAF stays; leftover other-dock chip may take current-host `hostDisplay`. Empty global leftover is not success.

### Approval Log — add a row that **supersedes** 2026-06-02 for leftover closed chrome

2026-06-02 row stays as history. New row: leftover closed-chip overlay; retract sanitize-only for that chrome; this delta.

---

## 4. Files

| File | Change |
|---|---|
| `dienststelle/view/isDienststelleLabelSafeToShow.js` | Add + export `resolveCommittedSanitizeSource`. Leave `resolveSanitizeSource` aria-first. File stays ≤150. |
| `dienststelle/view/applyDienststelleDisplaySanitizing.js` | Thin `opts.hostDisplay` into committed `stripLabelElement`. Stay **≤150**. No matcher inline. Popup calls stay aria-first. |
| `dienststelle/view/resolveUniqueOtherDockFilterWrapper.js` | **New.** Unique `#filterDock__other` DEZPV wrapper. |
| `dienststelle/view/syncDienststelleViewFromState.js` | This-scope `hostDisplay` from snapshot; unique wrapper for overlay; pass `hostDisplay` only when overlay is legal. ≤150, AMD ≤10. |
| `dienststelle.md` | §3 text only. |

**Must not edit:** `applyDienststelleDefault.js`; walk; `lookupDienststelleFilterRef.js`; `writeFilter`; `paintChip` / `applySingleSelectCommittedDisplay.js`; `sanitizeDienststelleVisibleLabel.js` algorithm; `resolveSanitizeSource` behavior; widget bind; `KDB.js`.

---

## 5. Acceptance

- Proven DEZPV tab OK: other-dock chip text = `sanitize(active host.d)`; host `u` still Y; four sibling hosts still ALLE; global host still `[]`.
- Empty global leftover Gesamt stays Gesamt.
- BW path still `sanitizingDisabled`.
- Popup options still aria-first `#` sanitize.
- No `writeFilter` on the observe/OK display path.
- No `paintChip`. Sanitizer file ≤150. No new Dienststelle observer.
