# Execution Spec: WP6/WP7 copy + choice-layout follow-up

> Tiny delta on shipped JS/CSS. Architecture stays. Do not reopen detector, poll, minimize-C, or add a `messageService` method.

**Status:** `Reviewed` — dual Grok 2026-09-08. PO Cognos green 2026-09-08. PROGRAM **6** / **7** `[x]`.  
**Law:** `contracts/cubes-unavailable-home-dialog-contractdelta.md` locks **14** and **15** (this rewrite)  
**Sibling:** `contracts/loadingService-watchdog-dialog-contractdelta.md` lock 5 (inherits instruction + chrome)  
**Supersedes:** `contracts/home-dialog-wp6-wp7-copy-followup-execution-spec.md` (können-sentence; “no CSS”)  
**Phase:** copy + scoped layout  
**Authoring AI:** WP6 captain, 2026-09-08  
**Executing AI:** Grok 4.6 army (`cursor-grok-4.6-xhigh`)

---

## Section A. Pre-flight (echo one sentence each, then write same turn)

1. `feature-structure.mdc` — workflow / size / no silent contract drift  
2. `naming.mdc` — English identifiers; DE only in `labels.de.*`  
3. `dom.mdc` — CSS in `KDB3/css`; no inline `style` on choices  
4. WP6 delta locks **14** and **15** (imperative instruction; scoped equal-width in `messageService.css`)  
5. This spec

Also echo: keep **two** choices; no `homeDialog.css`; no `cssHrefList` edit; no `KDB.js`; no PROGRAM tick.

---

## Section B. Exclusive allowlist

**MAY edit only:**

| Path | Job | Lines / AMD |
|---|---|---|
| `KDB3/js/core/homeDialog/config/homeDialogLabels.js` | `navInstruction` only. Title/body/button labels **unchanged**. | 11 / 0 |
| `KDB3/css/messageService.css` | Append **one** scoped block after the existing `__choices` / `__choice` rules. Do not change the unscoped `__choices` or `__choice` rules. | 199 → ≤230 |

**MUST NOT touch:** `presentHomeChoice.js`, `buildMessageDialog.js`, `createMessageService.js`, `cssHrefList.js`, new `homeDialog.css`, `confirmAndDispatchTabMove.js`, `loadingLabels.js`, `showLoadingWatchdogDialog.js`, `presentCubesUnavailable.js`, `KDB.js`, cognosHost, `.cursor/rules/*.mdc`, WP2/SSS.

---

## Section C. Exact DE

In `homeDialogLabels.js` key `navInstruction` only:

`Wechseln Sie zur Startseite.`

Do **not** ship `Sie können zur Startseite wechseln.` or the killed `Sie wechseln zur Startseite.`

---

## Section D. CSS (append; do not restyle shared chrome)

Insert **after** the existing `.kdb-message-dialog__choice, .kdb-message-dialog__button` block (around line 90). Literal intent:

```css
.kdb-message-dialog:has([data-kdb-message-choice="home-close"]) .kdb-message-dialog__choices {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  width: max-content;
  max-width: 100%;
  margin-inline: auto;
  gap: 8px;
}

.kdb-message-dialog:has([data-kdb-message-choice="home-close"]) .kdb-message-dialog__choice {
  box-sizing: border-box;
}
```

Do **not** set `flex: 1` on the unscoped row. Do **not** set `justify-content` on the unscoped `__choices`. Tab-move choices stay hug-text + wrap.

---

## Section E. Forbidden

New CSS file. `choose({ dialogClass })`. New `messageService` method. Unscoped `__choice` restyle. Inline `style`. Close-only WP6. Tick PROGRAM 6/7. Git commit. Dump `KDB.js`. Detector / poll / `ds.on`.

---

## Section F. After files

Grok dual-review: allowlist paths + FAIL/NIT. Confirm tab-move still Nein and left-wrapped chips. Confirm `presentHomeChoice.js` untouched. Do not self-certify Cognos green.
