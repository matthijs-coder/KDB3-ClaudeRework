# Contract Delta: Global `notify(info)` uses WP2 KDB card (duration + ×)

> Blue **info** `notify` must stay readable. Reuse the live WP2 card (portal, ×, 5000 ms). Do not clone Glass. Do not add a method. SSS restore product stays; only transport duration/dismiss changes.

---

**Status:** `Implemented` — dual review PASS; leftover-card fix PASS. **Cognos pending.** No parent one-liners until green.  
**Type:** `shared-service contract delta`  
**Program:** `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` — **do not tick** any box (not WP 1–8; SSS stays `[x]`).  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09  
**Parents:** `contracts/messageService.md` (Q3, Q4, `notify` / `notifyAnchored` table); `toast-severity-content-rule-contractdelta.md` (tokens unchanged)  
**Visual twin:** WP2 `notifyAnchored` card (`dienststelle-empty-ok-toast-contractdelta.md` O3)  
**OOS:** SSS P1/P4/H2/Leitung/dstl-wins/writeback restore hints; WP2/WP5/WP6/WP7 product; `createWritebackSetService.js`  
**Spec:** `contracts/messageService-info-notify-kdb-duration-execution-spec.md`

---

## Diagnosis (contract vs live)

| Layer | Anchored info (WP2) | Global `notify(info)` |
|---|---|---|
| `messageService.md` | `notifyAnchored`: portal, `durationMs?`, × via `dismissible` | `notify` → Glass; dismissal Glass-managed; **no** `durationMs` |
| Live | `#kdb-message-root` + `.kdb-message-notification` + × + timer default **5000** | `showGlassToast` → `showToast(text, type)` only |
| Legacy | `showMessageBelowElement` clone + `keepVisibleMs` 5000 + Carbon × | Native Glass `showToast({ type })` |

Not a parent-logic mismatch on WP2. Anchored **is** the Q3 successor of the clone. Restore C4/SSS correctly call `notify` (no filter anchor). Glass drops that blue toast too fast. **Overflow:** one product (readable info) on two transports; only Glass is too fast.

`createWritebackSetService.js` is AMD **10** / ~149. This slice does **not** add AMD there. `notifyRestoreOutcome` already calls `notify`.

---

## TODO — Proposal series (**locked** 2026-09-09)

PO: WP2 visueel = standaard voor globale blauwe `notify(info)`, default 5000 ms.

| # | Question | Locked |
|---|---|---|
| S | Scope | **S1** — every live `notify` whose severity is `"info"` (default omitted → info). Restore C4/SSS, overlay replay, tab-degraded, WP2/settings Glass fallback. Not SSS-only. Do **not** retouch live `notifyAnchored` callers. |
| M | Surface | **M1** — `notify(info)` renders the existing KDB card in the existing portal. warning / error / **success** stay Glass. No new method. No Glass clone. |
| D | Duration | **D1c** — global `notify(info)` default **15000**. WP2 empty-Dienststelle **`notifyAnchored` `durationMs: 15000`**, still under the filter. Finite `durationMs` still honored (`0` = no timer). |
| W | warning/error | **Out.** PO: blue info only. |

---

## 1. Purpose

Give every global blue info toast the same user capability as empty-Dienststelle-OK: WP2 card, **×** (not click-outside / not document click-away), or auto-hide after **15000** ms (unless the caller passes another finite `durationMs`). **Horizontal center**, **top** of `.dashboardFrame`.

---

## 2. Closed product decisions

| # | Lock |
|---|---|
| 1 | Owner: **`messageService`**. Callers (writeback C4/SSS, tabs degraded, WP2 fallback) stay as-is. |
| 2 | Trigger: `_KDB.services.message.notify` when `severity` is omitted or `"info"`. Other severities stay `glassMessages.showToast`. |
| 3 | Visual: **same card as WP2** — `createAnchoredNotification` → `.kdb-message-notification` + `--info` + × unless `dismissible === false`. `closeLabel` default = service `labels.close` (aria fallback already `"Schließen"`). |
| 4 | Placement: **not** pin to Dienststelle. **Horizontal center**, **vertical top** of a connected `.dashboardFrame` (`_KDB.elements.selectors.root.dashboardFrame`); if missing/disconnected, same in the **viewport**. First card at `_box.top + 8`; further infos stack down with 8 px gap. Position via **JS `left`/`top` only**. Do **not** put `top`/`right` on the shared `.kdb-message-notification` class. One `document.querySelector` of that catalog selector is an allowed positioning exception. Q4 overlap stays. |
| 5 | `notify` still **ignores** `code` / `dedupeKey` (Q4). Global renderer must **not** copy `findDuplicate`. Do not collapse two SSS infos into one. |
| 6 | `notifyAnchored` unchanged: still requires a connected `anchor`; dead/missing anchor still falls back to `notify` (which then uses this info card). Do not feed a fake DOM anchor. |
| 7 | No new `messageService` method. No Glass `cloneNode`, no hide/suppress of Cognos toast DOM, no `[data-kdb-hide-toast]`. |
| 8 | No new events, `_KDB` namespace, lifecycle term, or cognosHost facet. Do not edit `.mdc`. |
| 9 | Do not edit writeback SET service / restore copy / H2 / P1. `createWritebackSetService.js` off the allowlist. Empty-Dienststelle stays **anchored under the filter**; duration **15000** (PO 2026-09-09). |
| 10 | Parked WP5 `notifyZoomHint.js` stays parked. Cubes/home stay `choose` dialogs. |
| 11 | Portal exception remains the existing `dom.mdc` document-root portal (`messageService.md` §8). Global info uses that portal; it does not invent a second root. |

---

## 3. Locked mechanism

Live sizes at lock (do not silently grow past hard caps):

| File | Lines | AMD |
|---|---|---|
| `createMessageService.js` | 138 | 5 |
| `showGlassToast.js` | 34 | 0 |
| `renderAnchoredNotification.js` | 118 | 3 |
| `createAnchoredNotification.js` | 35 | 0 |
| `positionAnchoredNotification.js` | 63 | 0 |
| `ensureMessageRuntime.js` | 25 | 0 |
| `createWritebackSetService.js` | ~149 | **10 — do not touch** |

### 3.1 Files

| File | Role |
|---|---|
| `effects/presentNotify.js` | **New.** `notify` body: if info → global KDB card; else `_showGlassToast`. AMD 2. |
| `view/renderGlobalNotification.js` | **New.** Portal + same card factory + × + timer. No anchor. Do not call `notifyAnchored`. Do **not** copy `findDuplicate`. |
| `view/positionGlobalNotification.js` | **New.** Horizontal center, top of dashboardFrame rect (else viewport). Job = position only. |
| `createMessageService.js` | Swap `showGlassToast` import for `presentNotify`. AMD stays **5**. `notify` stays a thin call. Pass `closeLabel` like `notifyAnchored`. |
| `runtime/ensureMessageRuntime.js` | **Required:** `domRefs.globalNotifications` array. **Must not** reuse `domRefs.anchoredNotifications` (anchored position-fail already falls back to `notify` — mixed list = loop). Not a new `_KDB.runtime` bucket name. |
| `showGlassToast.js` | **KEEP.** warning / error / success only, via `presentNotify`. |
| `createAnchoredNotification.js` | **KEEP** reused. Prefer no edit. |
| `renderAnchoredNotification.js` | **KEEP** WP2 path. Do not merge global into this file (would mix jobs / size). |
| `messageService.css` | **KEEP.** No `top`/`right` on the shared card class. No one-class modifier unless JS cannot set `left`/`top`. |

`createMessageService.js` must stay ≤150 / AMD ≤10. If the swap still grows it over 150: stop, split, do not hide logic in nested entry-body functions.

### 3.2 `notify` contract overlay

Replace `messageService.md` method row (parent one-liner **after** Cognos green):

| Method | Input | Return | Contract |
|---|---|---|---|
| `notify(options)` | Shared fields plus **`durationMs?`** (info path only) | `undefined` | **info** (default): fire-and-forget KDB portal card (WP2 visual), default `durationMs` **15000**, × unless `dismissible === false`, **horizontally centered at the top** of `.dashboardFrame` (else viewport). **warning / error / success:** unchanged Glass `showToast`; `durationMs` ignored; dismissal Glass-managed. Still ignores `code`. |

Q3 overlay (does not revive clone): Glass `showToast` remains the global path for **non-info**. Global **info** is service-owned KDB DOM in the **existing** document-root portal. Anchored notifications stay element-relative.

### 3.3 Fail path

Named executables: try/catch. If the portal/document is unavailable: `console.error` with function tag; **one** Glass fallback so restore is not silent; do not loop (`didFallback` / call Glass directly, never `notify` → `presentNotify` → global → `notify`).

### 3.4 MUST fragments

- `amd.mdc` — one `define`, factory-scope helpers, no ES modules.
- `naming.mdc` — `presentNotify` / `renderGlobalNotification` / `positionGlobalNotification`; no `helpers` folder.
- `error-handling.mdc` — local try/catch on named executables; no silent catch.
- `dom.mdc` — portal already contracted; no extra `document.querySelector` beyond that root.
- `runtime.mdc` — timers / listeners / observers on `_KDB.runtime.messageService`; destroy already clears via `clearMessageRuntime`.
- `feature-structure.mdc` — JS 150 / AMD 10; this delta is law for the slice after Approved.
- `cognos-adapter.mdc` — `showGlassToast` keeps the stamped messages facet; global info must **not** call `_KDB.cognosAPI`.
- `module-public-api.mdc` — named methods unchanged; no new public name.

---

## 4. Out of scope

- New `messageService` method; `warn` revival; Glass toast clones / footer hacks.
- Changing severity tokens or caller copy.
- Writeback restore hints, SSS policy, two-notify product, dstl-wins, H2 prefix, Leitung.
- WP2 anchored duration/copy/hook; do **not** reopen WP2 (stale “Glass `notify`” wording in that delta is a post-green one-liner at most). WP5 re-enable; WP6/WP7 dialogs.
- Document click-outside / click-away to dismiss. Dismiss = × or timer only.
- `showAlert` / `confirm` / `choose`.
- Ticking PROGRAM boxes.
- Growing `createWritebackSetService.js`.

---

## 5. Parent one-liners (captain after dual review **and** Cognos green)

- `messageService.md` `notify(options)` row + Q3 sentence: info = KDB portal card; Glass remains non-info global. Q3 sentence 2: portal also hosts global info (not only anchored + dialogs).
- `messageService.md` §8 allowed touchpoint: Glass `showToast` for non-info global only.
- `dienststelle-empty-ok-toast-contractdelta.md` lock 4: “missing → `notify`” still method routing; info transport is now this card (do not reopen WP2 product).
- No writeback / SSS parent edits.
- No PROGRAM tick.

---

## Approval log

- 2026-09-09 — Investigation: live anchored already has × + 5000 ms; global `notify(info)` is Glass-only. Series S1+M1+D1. PO akkoord visueel = WP2 for all global blue `notify(info)`, default 5000. Draft mechanism written. JS forbidden until Approved + spec.
- 2026-09-09 — Dual grok 4.6 vs live: **PASS WITH NITS** (no FAIL). NITs folded: no click-outside; required `globalNotifications`; JS-only top-right; no `findDuplicate` on global. Still awaiting PO Approved.
- 2026-09-09 — PO: write spec, army compare, then implement if clean. Status **Approved**. Spec written.
- 2026-09-09 — JS on allowlist. Dual grok 4.6: mechanical PASS; semantic PASS WITH NITS (leftover card if position throws). One-file fix. Re-review **PASS**. Cognos pending.
- 2026-09-09 — PO Cognos: works as expected. Follow-up: global default **15000**; place stack **center** in `.dashboardFrame` (viewport fallback). WP2 anchored 5000 unchanged.
- 2026-09-09 — Follow-up JS: restack FAIL (second info) fixed via `repositionAll` after append. Dual/spot **PASS**. Cognos pending (15s + center).
- 2026-09-09 — PO: 15s + horizontal center **KEEP**. Vertical → **top** of `.dashboardFrame` (not vertical middle).
- 2026-09-09 — Top-align JS. Spot-check **PASS**. Cognos pending.
- 2026-09-09 — PO: empty-Dienststelle **15 s**, still under the filter. D1c.
