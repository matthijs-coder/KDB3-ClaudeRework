# Contract Delta: Hide subsequent same-caption Sicht popup rows (layout)

> After Fertig, reopen can show the committed caption twice (e.g. `BW, DEZPV, BW` or `BW, DEZPV, DEZPV`). Hide the **second and later** DOM row that already has the same KDB option class. CSS only. No host rewrite.

---

**Status:** `Implemented` — dual review PASS; **PO Cognos green 2026-09-09**; PO committed. Fallback ARIA/observer **not** needed.  
**Type:** `feature-module contract delta`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09  
**Parents:** `contracts/sicht.md` §11 (duplicate entries prevented), §16 (bounded CSS hide)  
**OOS:** calculated cube item; DEZPV hierarchy helper; `tables.js`; `writeFilter` / `applyOwnerSelection`; `hideDuplicateSichtOptions.js` rewrite; `applySichtOptionState.js`; new events / `_KDB` namespace / lifecycle / cognosHost facet; `.mdc`; toast PROGRAM  
**Spec:** `contracts/sicht-popup-duplicate-caption-hide-execution-spec.md`

---

## Diagnosis (contract vs live)

| Layer | Law | Live (PO HTML 2026-09-09) |
|---|---|---|
| Duplicates | `sicht.md` §11: duplicate **visible** option entries prevented | Reopen after Fertig: two wrappers with the same `KDB_sichtOptionBw` or `KDB_sichtOptionDezpv`; both `KDB_selectedOption is-selected` when that caption is active |
| JS hide | `hideDuplicateSichtOptions` by trimmed caption | Runs on `popupReady`, then `applySichtOptionState` sets `style.display = ""` on every visible BW/DEZPV row (**C** — overwhelmed) |
| CSS | Alle + `:has([aria-label="duplicates"])` | Calculated `'duplicates'` marker only. Native same-caption twins keep `aria-label="BW"` / `"DEZPV"` |

**Overflow, not missing hide file.** Fertig remains intercept-and-write (`singleSelect` → `writeFilter`). This slice does not change that path.

---

## TODO — Proposal series (**locked** 2026-09-09)

| # | Question | Locked |
|---|---|---|
| Scope | What to hide | **Keep-first** same-caption row. Legacy KDB2 kept **all checked** twins → would **not** fix PO HTML. Both twins are selected. |
| Mechanism | How | **M-CSS-KDB** (locked). Fallback ARIA / apply-skip / observer **only** if Cognos smoke fails. |

---

## 1. Purpose

Stop the committed Sicht caption from appearing twice in the popup on the next open. Keep Alle hide and the `'duplicates'` marker hide. Do not change Cognos filter binding or host write.

---

## 2. Product intent (PO 2026-09-09)

| # | Intent |
|---|---|
| 1 | Hide the extra same-caption popup row after Fertig + reopen. Layout, not host rewrite. |
| 2 | Owner folder `sicht`. Do not hide via `singleSelect.css`. |
| 3 | Keep Alle hide and `'duplicates'` marker hide. No dock-chip overlay. |
| 4 | Hierarchy / calculated cube item / toast OOS. |
| 5 | Keep-first (DOM). Keep-selected is a no-op on PO HTML (both selected). |

---

## 3. Army series (2026-09-09) — **M-CSS-KDB locked**

Evidence: live C (hide then apply `display:""`); KDB2 hide-unchecked-only; REDESIGN2 hide-after-apply + list observer; PO HTML both twins selected + already have option classes.

| Id | Mechanism | Verdict |
|---|---|---|
| **M-CSS-KDB** | `.KDB_sichtOptionBw ~ .KDB_sichtOptionBw` (+ DEZPV) in existing `!important` block | **Recommend.** CSS-only. Beats apply. No extra native selector. PO HTML already stamped. |
| **M-CSS-ARIA** | `:has([aria-label="BW"])` sibling / `:nth-child(n+2 of …)` | Strong vs first paint before class stamp. Needs `sicht.md` §16 native exception. |
| **M-CLASS** | Stamp `KDB_sichtDuplicateOption` + CSS + `aria-hidden` | Heavier JS. Useful a11y extra, not required for layout. |
| **M-APPLY** | Apply skips second same `optionKey`; live `document.contains` mount | Fixes C in JS. Still loses if Cognos appends after `popupReady`. |
| **M-OBS** | Hide-only `MutationObserver` on popup (REDESIGN2) | Fallback if smoke shows late append. New observation files. |
| **M-CLICK** | `preventDefault` on Sicht option click | **Reject.** Extra row is reopen-after-`writeFilter`, not Fertig checkbox. |
| **M-KDB2** | Keep all checked twins | **Reject.** PO both-selected would stay visible. |

Locked CSS:

```css
.KDB_sichtSingleSelect .KDB_sichtHideAlle,
.KDB_sichtSingleSelect .ba-common-listItem-wrapper:has([aria-label="duplicates"]),
.KDB_sichtSingleSelect .KDB_sichtOptionBw ~ .KDB_sichtOptionBw,
.KDB_sichtSingleSelect .KDB_sichtOptionDezpv ~ .KDB_sichtOptionDezpv
{
  display: none !important;
}
```

**Allowlist:** `KDB3/css/filters/sichtSingleSelect.css` only. Keep calling `hideDuplicateSichtOptions`. Do not edit apply/JS. JS / observer / `.mdc` stay off until smoke fails.

---

## 4. Acceptance (product — independent of mechanism)

1. Reopen after Fertig on **BW**: at most one **visible** BW row; DEZPV still visible if present.
2. Reopen after Fertig on **DEZPV**: at most one **visible** DEZPV row; BW still visible if present.
3. Alle remains hidden. `'duplicates'` marker still hidden.
4. No host write / calculated-item / hierarchy change.
5. Disabled Fertig on reopen (no pending change) is **not** a fail of this slice.

---

## 5. Parent one-liners

**Before CSS (done 2026-09-09):** `sicht.md` §16 **CSS behavior** — subsequent same owned option-class rows may be hidden via `.KDB_sichtOptionBw ~ .KDB_sichtOptionBw` and DEZPV twin, scoped to `.KDB_sichtSingleSelect`. Owned-class table Meaning updated. **Not** a native-exception expansion.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-09 | `Draft` (series done) | PO vastenburg | Product: hide post-Fertig twin. Captain rec **M-CSS-KDB**. |
| 2026-09-09 | `Draft → Approved` | PO vastenburg | Second-pass army GO. Lock M-CSS-KDB. Parent `sicht.md` §16 CSS-behavior one-liner before CSS write. |
| 2026-09-09 | dual review PASS | army | Mechanical + semantic PASS. Wait Cognos smoke. |
| 2026-09-09 | hygiene PASS | army | No dead AMD/CSS/refs FAIL. Keep JS hide. Docs NITs not blocking. |
| 2026-09-09 | `Approved → Implemented` | PO vastenburg | Cognos green. PO committed. |
