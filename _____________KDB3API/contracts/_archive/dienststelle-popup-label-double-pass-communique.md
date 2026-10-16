# Communique: Dienststelle DEZPV popup label race — theory and proposed double-pass fix

**Status:** Draft for planner / execution approval  
**Date:** 2026-06-05  
**From:** Diagnostic + analysis session (user, Ask-mode AI)  
**To:** Planner AI / executing AI  
**Relation:** Supersedes narrow scope assumptions in `dienststelle-popup-safe-to-show-fix-spec.md`; extends `dienststelle-display-sanitize-timing-t1-fix-spec.md` and `dienststelle.md` popup display-sync behavior with browser-evidence.

**Execution spec:** `_____________KDB3API/contracts/dienststelle-popup-label-double-pass-execution-spec.md`

---

## 1. Executive summary

After expanding lower hierarchy nodes in the **global Dienststelle DEZPV** popup, some option labels remain **visible with raw Cognos truncated text** even though:

- `title` is already sanitized (no `#`),
- `aria-label` is intentionally raw (contract: not rewritten in popup),
- `KDB_dienststelle_popupLabelsReady` is present, so CSS reveals the label.

Browser diagnostics show this is **not** a general sanitizer failure. In a typical expand, **10/11 labels end correct**; **one newly revealed child label** (last in the expanded subtree) can remain broken.

**Proposed fix:** an **eager + confirm double-pass** sanitize model:

1. **Pass 1 (eager):** run existing popup sanitizing as early as possible on current filterDock `popupDisplayResync` triggers; update `textContent` and `title`; mark ready **only** when visible text already equals sanitized output.
2. **Pass 2 (confirm):** run the same idempotent sanitizing again after Cognos finishes truncated-text writes (via a late resync trigger); then mark ready when safe.

This preserves early sanitizing where possible, prevents raw-text flash, and closes the race on the last expanded child label.

---

## 2. Repro and observed DOM

### 2.1 Broken label example (index 10 after expand)

| Field | Value |
|-------|-------|
| `textContent` | `M06\|3h_Ref…iquidatur` (Cognos truncated, often no `#`) |
| `title` | `3h4_ZKS - Liquidatur` (sanitized) |
| `aria-label` | `M06\|3h_Ref_ZKS # 3h4_ZKS - Liquidatur` (raw, expected) |
| `expected sanitized text` | `3h4_ZKS - Liquidatur` |
| `KDB_dienststelle_popupLabelsReady` | `true` (should not be true yet) |

### 2.2 Manual console probe

Setting only `textContent` to the expected sanitized value immediately fixes the visible label. No `aria-label` rewrite is required for display correction.

```js
// before: text = "M06|3h_Ref…iquidatur", ready = true
// after:  text = "3h4_ZKS - Liquidatur", ready = true
```

This confirms the sanitize transform is correct; the failure is **timing and ready-gating**, not string rules.

---

## 3. Diagnostic method (browser-only, no production edits)

A temporary console observer was attached to:

- `#filterDockContainer #filterDock__global` → first `[data-id="Dienststelle_DEZPV"]` wrapper,
- `.wa-filterDock-filterItemMount` (popup mount),
- with a parallel lane mimicking production `popupDisplayResync` relevance (`childList`, `aria-label`, `title` only).

Key helpers:

- `snapshot()` — dump all popup label nodes with `safeToShow`, `ready`, hash flags,
- `dumpUnsafe()` — labels where `ready && !safeToShow`,
- compare `prodTrigger=true/false` batches.

---

## 4. Evidence summary

### 4.1 Label state after expand settles

| Metric | Result |
|--------|--------|
| Total popup labels | 11 |
| Correct (`safeToShow: true`) | 10 |
| Broken (`ready: true`, `safeToShow: false`) | 1 (last expanded child) |

Broken label matched acceptance case **`3h4_ZKS - Liquidatur`**.

### 4.2 Mutation timeline during one expand

Approximate sequence within ~200ms:

```
batch x6   prodTrigger=false   ← Cognos pre-write (prod ignores)
batch x6   prodTrigger=true    ← sanitize pass #1 scheduled (rAF)
batch x6   prodTrigger=false   ← text/class updates prod ignores
labels: 6 → 11
batch x31  prodTrigger=true    ← sanitize pass #2
batch x73  prodTrigger=true    ← sanitize pass #3 (bulk)
batch x11  prodTrigger=false   ← post-burst writes prod ignores
```

Interpretation:

- filterDock **does** react multiple times during expand,
- Cognos still performs **follow-up DOM writes after the last prod-trigger batch**,
- those follow-up writes are likely **`characterData`** (truncated visible text) and/or non-trigger attributes,
- production `evaluatePopupDisplayResyncSession.isRelevantMutation` returns **false** for them.

### 4.3 Production observer gap (confirmed in code)

Current mount observer:

```js
observer.observe(popupMount, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["aria-label", "title"]
});
```

`isRelevantMutation` accepts only:

- `childList`,
- `attributes` where `attributeName` is `aria-label` or `title`.

No `characterData`. No `class`. No trailing confirm pass after burst coalescing.

---

## 5. Root cause theory (two mechanisms)

### RC1 — Ready class can be set on partial strip

In `applyDienststelleDisplaySanitizing.js`:

```js
if (didStrip || _labelSupport.isLabelSafeToShow(labelEl, _sanitize)) {
  _labelSupport.markLabelNodeReady(labelEl, _selectors);
}
```

If `didStrip === true` (for example title-only or text updated in an earlier moment), ready may be added **before** the label is permanently safe to show.

CSS then reveals the label:

```css
... :not(.KDB_dienststelle_popupLabelsReady) { visibility: hidden; }
```

Note: `isLabelSafeToShow` already requires `textContent === sanitized` when a transformable `#` source exists. The **`didStrip ||` shortcut bypasses that gate**.

### RC2 — Cognos truncatedText overwrites visible text after sanitize

Cognos `ba-common-truncatedText` can write final visible text via **`characterData`** after attribute-driven sanitize passes complete.

Sequence for the broken last child:

1. Node appears; prod-trigger fires; pass 1 sanitizes (may set text correctly).
2. Ready may be set (RC1) or text may still be in flux.
3. Cognos writes truncated text `M06|3h_Ref…iquidatur` via `characterData`.
4. No prod-trigger → no pass 2 → label stuck visible and raw.

This explains why **most labels recover** (Cognos finished before ready) but the **last expanded child** does not.

---

## 6. Proposed solution — eager + confirm double-pass

### 6.1 Design principles

| Principle | Rule |
|-----------|------|
| Sanitize early | Keep first pass on existing prod triggers |
| Hide until safe | Ready only when `textContent === sanitized(source)` |
| Sanitize again late | Idempotent second pass after Cognos text stabilizes |
| No aria rewrite in popup | Keep `ariaFromSource: "never"` |
| No Dienststelle-owned observer | Confirm pass triggered via filterDock resync lifecycle |
| Idempotent strip | Same `stripLabelElement` for both passes |

### 6.2 Pass 1 — Eager (existing triggers)

**Trigger:** current `popupDisplayResync` (`childList`, `aria-label`, `title`) + existing rAF coalescing.

**Actions:**

- run `stripLabelElement` with `text: true`, `title: true`,
- mark ready **only if** `isLabelSafeToShow(labelEl, sanitize)` is true,
- **remove** unconditional ready on `didStrip`.

**Expected outcome:**

- labels with stable text after first Cognos write become visible quickly,
- labels still receiving truncated writes stay hidden.

### 6.3 Pass 2 — Confirm (new late trigger)

**Trigger (choose one in execution spec; planner may approve both as phased options):**

| Option | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| **2A — Trailing debounce** | second coalesced flush N ms after last relevant mutation burst | no MO shape change; fits existing scheduler | less precise; tune delay |
| **2B — characterData MO** | extend mount observer + relevance filter to label text nodes | precise; matches observed Cognos write | requires filterDock contract delta |

**Actions:** call the same Dienststelle popup display sync again (idempotent). Mark ready only when safe.

Recommended execution order: **Tranche 1 (RC1 fix)** then **Tranche 2A (trailing debounce)**; escalate to **2B** only if smoke still fails index-10 case.

---

## 7. When to sanitize — decision table for planner

| Event | Sanitize now? | Mark ready? |
|-------|---------------|-------------|
| `childList` adds label nodes | Yes (pass 1) | Only if `text === expected` |
| `aria-label` / `title` attribute write | Yes (pass 1) | Only if `text === expected` |
| `characterData` on label text node | Yes (pass 2) | Only if `text === expected` |
| Trailing debounce after burst | Yes (pass 2) | Only if `text === expected` |
| `title` sanitized but text truncated | No ready | Stay hidden until pass 2 |
| No transformable `#` source | Yes | Ready allowed (already clean) |

---

## 8. Scope recommendation for planner

### In scope

**Tranche 1 — Dienststelle ready gate (required)**

```txt
KDB3/js/dashboard/filters/dienststelle/view/applyDienststelleDisplaySanitizing.js
```

Change ready marking to **`isLabelSafeToShow` only**.

**Tranche 2 — filterDock confirm resync (required for full fix)**

```txt
KDB3/js/dashboard/filters/filterDock/observation/schedulePopupDisplayResync.js
KDB3/js/dashboard/filters/filterDock/observation/evaluatePopupDisplayResyncSession.js   (if option 2B)
KDB3/js/dashboard/filters/filterDock/observation/managePopupDisplayResync.js             (if option 2B)
```

Add trailing confirm flush (2A) and/or `characterData` relevance (2B).

Optional contract delta file if 2B is chosen:

```txt
contracts/dienststelle-popup-display-resync-characterData-contractdelta.md
```

### Out of scope

- popup `aria-label` rewriting,
- CSS changes (existing hide-until-ready is correct),
- Dienststelle-owned `MutationObserver`,
- Cognos polling,
- committed display changes,
- state / public API / event shape changes,
- changes to `sanitizeDienststelleVisibleLabel` string rules.

---

## 9. Relationship to earlier fix specs

| Document | Status after this communique |
|----------|------------------------------|
| `dienststelle-popup-safe-to-show-fix-spec.md` | **Insufficient alone** — `isLabelSafeToShow` may already be strict; primary bug is `didStrip \|\|` + missing pass 2 |
| `dienststelle-display-sanitize-timing-t1-fix-spec.md` | **Partially overlapping** — popup scan / defer items may already be done; this communique adds confirmed race evidence and filterDock confirm pass |
| `dienststelle.md` § popup display sync | **Needs minor alignment** if `characterData` or trailing confirm is approved |

---

## 10. Acceptance case (must pass)

**AC-index-10:** Expand DEZPV global popup to reveal `3h4_ZKS - Liquidatur`.

- During expand: no visible raw truncated text flash (`…` prefix).
- Final DOM: `textContent === "3h4_ZKS - Liquidatur"`.
- Final DOM: `KDB_dienststelle_popupLabelsReady` present.
- Final DOM: `aria-label` may remain raw with `#` (unchanged contract).
- No label satisfies `ready === true && textContent !== expected`.

---

## 11. Planner decisions requested

1. Approve **Tranche 1** (ready gate: remove `didStrip ||`) — recommended **yes, first**.
2. Approve **Tranche 2A** (trailing confirm debounce in filterDock scheduler) — recommended **yes**.
3. Approve **Tranche 2B** (`characterData` MO) as fallback or combined — **conditional**.
4. Deprecate / merge older narrow fix specs into the new execution spec — recommended **yes**.
5. Keep popup `aria-label` raw — recommended **yes**.

---

## 12. Suggested execution order for executing AI

1. Read communique + execution spec + `dienststelle.md` popup section.
2. Implement Tranche 1 only → smoke index-10 → expect hidden-stuck or partial improvement.
3. Implement Tranche 2A → smoke index-10 → expect full pass.
4. If fail: implement Tranche 2B with contract delta → re-smoke.
5. Report batch timeline + label snapshots in handoff (optional console diag script reuse).

---

## 13. Approval log

| Date | Action | Notes |
|------|--------|-------|
| 2026-06-05 | Communique drafted | Based on browser mutation diagnostics + manual text probe |
| TBD | Planner approval | Tranche 1 + 2A/2B decision |
| TBD | Execution | See execution spec |
