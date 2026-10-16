# Contract Delta: `showCopyable` optional action button

> Narrow Q11 widening: one optional footer button so Wien-KI can offer **Wien-KI öffnen** without HTML, callbacks in options, or service navigation.
> PO vastenburg 2026-09-13: instruction dialog is the product. Share omit-path must stay byte-identical in behaviour.

---

**Status:** `Implemented` — PO Cognos green 2026-09-14.
**Owner module / service:** `messageService`
**Type:** `shared-service contract delta`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-13
**Reviewed by:** dual Draft YELLOW folded; leftover hygiene 2026-09-14 GREEN (wienKi) / YELLOW-gates-folded (queue/`buildActionResult`). PO: auto-Approved if hygiene green.
**Related rules:** `module-public-api.mdc`, `feature-structure.mdc`, `runtime.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`, `naming.mdc`
**Related contracts:** `messageService.md` (parent), `shareControls.md` (omit-path consumer; **do not edit** unless leftmost breaks), `wienKiControls-instruction-dialog-contractdelta.md` (only consumer of `actionLabel`)

**Parents this delta amends** (one-liners on Approved — not JS)

| Parent | Slice |
|---|---|
| `contracts/messageService.md` Q11 | Optional `actionLabel` in-bounds. Still no HTML / render fns / `onClick` in **options**. Not a general portal. |
| `contracts/messageService.md` Q2 / methods table | `showCopyable` return: omit `actionLabel` → `undefined`; with `actionLabel` → `CopyableActionHandle` (not a native `Promise`). |
| `contracts/messageService.md` Interactive result | New fail-closed `{ action, reason }` for the handle path only. |
| `contracts/messageService.md` Runtime `pendingPromises` | Interactive copyable (actionLabel present) may register a settle continuation. Omit-path stays **passive** (no pending). |
| `contracts/shareControls.md` | **No change.** Call omits `actionLabel`. |

---

## 1. Purpose

Share already uses `showCopyable` as Kopieren + Schließen. Wien-KI needs the **same** Zwischenablage dialog plus one extra footer control that the **feature** uses as a real user gesture to `window.open`. This delta adds that button without turning `messageService` into a navigator or a portal.

---

## 2. Diagnose (A vs B)

| Question | Verdict |
|---|---|
| Contract `showCopyable` = live code (passive, `undefined`, Kopieren + Schließen)? | **Match.** Not a live bug. |
| Missing action button vs Wien-KI product? | **A.** Capability absent. Extend the parent; do not clone a Wien-KI Glass dialog. |
| `await confirm` / native `Promise.then` then `window.open`? | **B-risk.** Same stack as the already-forbidden confirm-then-open path. Dual explore (2026-09-13): native Promise resume is a **microtask after** `bindMessageDialog` returns. **Do not ship that as the open path.** |

Silent contract↔code drift is forbidden. Extracts below are named; they are not hidden inside “add a button.”

---

## 3. Product (locked)

| Topic | Law |
|---|---|
| Omit `actionLabel` (or whitespace-only) | **Today’s Share dialog.** `enqueuePassive`, return `undefined`, footer Kopieren + Schließen only. `toggle` unchanged. |
| Non-empty `actionLabel` | One extra footer **button** (not a link). Label = caller string. Service does not interpret the words. |
| `actionId` | **Omit in this slice.** One button. Do not add an action list. |
| Kopieren | Clipboard **only** (`copyMessageText.js` / `navigator.clipboard.writeText`). Does **not** close. Does **not** settle the handle. Does **not** open a window. |
| Action click | Same click listener turn as live `settleActive`: **cleanup first** (remove dialog, restore previous focus), **then** sync `whenDone`. Result `{ action: "selected", reason: "selected" }`. Do **not** invert (then `previousFocusEl.focus()` steals the named popup). |
| Schließen / header × / Escape / allowed backdrop | Same order. `{ action: null, reason: "dismissed" }`. **No** window. No `"cancelled"` in this slice. |
| message `destroy()` | Settles a pending action-handle with `{ action: null, reason: "destroyed" }`. Does not `window.open`. |
| Navigation | **Forbidden** in `messageService`. No `window.open`, no `_KDB.api.wienKiControls`, no feature import. |
| Q11 | Options remain declarative. No HTML, render fns, consumer `onClick`, `actionHref`, or URL in options. |

User-facing defaults stay the existing German message labels. The extra button text is **caller-owned** (Wien-KI: `openChatLabel`).

---

## 4. Return shape (gesture — not a native Promise)

Handoff preferred a native `Promise` “if Cognos proves `window.open` in that `.then`.” Dual army did **not** agree: `pending.resolve` is sync, but consumer `await` / `.then` runs **after** the click handler. That is the popup-blocker shape already closed for `confirm`.

**Law for this delta:**

When `actionLabel` is a non-empty string, `showCopyable` returns a **`CopyableActionHandle`**. It is **not** a native `Promise`. It is **not** thenable (`then` / `catch` / `finally` absent). Callers must **not** `await` it as the open path.

```js
var handle = _KDB.services.message.showCopyable({
  title: labels.dialogTitle,
  message: labels.dialogMessage,
  copyText: labels.starterPrompt,
  actionLabel: labels.openChatLabel
});
handle.whenDone(function (result) {
  if (result && result.action === "selected") {
    openWienKiPopup(_KDB);
  }
});
```

`whenDone(_onSettled)`:

- Registers **exactly one** continuation. Second call: ignore + one tagged `console.warn`.
- `_onSettled` is **not** stored on `options`. It lives on the queue request / handle (runtime), like confirm’s `pending.resolve`.
- On action / dismiss / unavailable / destroyed: stay on the **same listener turn**. Live `settleActive` order is **law**: cleanup (remove DOM, restore `previousFocusEl`) **then** invoke `_onSettled(result)`. Do not globally reorder other kinds; do not `whenDone` before cleanup on the action path (toolbar focus would run **after** `win.focus()`).
- **Do not** `queueMicrotask` / `Promise.resolve().then` / `setTimeout` before `_onSettled` on the action path.
- Feature `whenDone` registration happens on the **toolbar** click, before that handler returns (dialog may already be in the DOM). The **second** click (action button) is the `window.open` gesture.

Disposed `showCopyable` with `actionLabel`: same warn-once as today; return `undefined` (no handle). Feature treats missing handle like missing `showCopyable`.

This is the documented Q2 exception: a **result continuation on the return handle**, not an options callback, not a render fn, not a portal.

**Forbidden lookalikes:** native `Promise` as the open path; `confirm` then `window.open`; `window.open` inside `messageService`; feature `querySelector` on service DOM; `noopener` on any window the feature later opens; `whenDone` **before** cleanup on the action path.

---

## 5. Result object

Only for the handle path. Share never sees it.

```js
{ action: "selected", reason: "selected" }
{ action: null, reason: "dismissed" }
{ action: null, reason: "unavailable" }
{ action: null, reason: "destroyed" }
```

Live `handleAction` settles **`buildActionResult`**, not `buildClosedResult`. Close / × / Escape / the new `action` stamp all hit that path. **Must** extend all three:

| Helper | Copyable handle result |
|---|---|
| `buildActionResult` | `"action"` → `{ action: "selected", reason: "selected" }`; any other (`close` / `dismiss` / …) → `{ action: null, reason: "dismissed" }` |
| `buildClosedResult` | `{ action: null, reason }` (render-fail `"unavailable"`) |
| `buildDestroyedResult("copyable")` | `{ action: null, reason: "destroyed" }` — **not** choose-shaped `{ choice: null }` |

Kopieren does not produce a result (request stays active).

---

## 6. View / CSS

Live copyable footer (`buildMessageDialog.js` `appendActions`): Schließen (`close`) then Kopieren (`copy`, `--primary`). Bind already delegates `[data-kdb-message-action]` — **no bind rewrite required** for a third button.

With `actionLabel`:

- Stamp `data-kdb-message-action="action"` (not `copy` / `close` / `dismiss`).
- Footer order: **Schließen | Kopieren | action** (action gets `--primary`; Kopieren loses primary when the action button exists).
- `flex-wrap` **only** when the third button is present (Share’s two-button row stays as today). Live sheet is `min(560px, …)`, not 600px. Long German `Wien-KI öffnen` must not overflow.

Escape / backdrop still `dismiss` only. Kopieren unchanged in bind.

---

## 7. Walls (lift before growth)

| File | Live | Law |
|---|---:|---|
| `createMessageService.js` | **141** / AMD 5 | Dual `enqueuePassive` vs interactive handle **will** breach 150. **Extract first** to `effects/showCopyable.js` (preferred) **or** lift disposed helpers. Exclusive allowlist must name the extract file. Stay ≤ AMD 6. Trim/empty `actionLabel` at **enqueue/return**, not only in `appendActions`. |
| `createModalQueue.js` | **126** / AMD 3 | **Do not** call `enqueueInteractive` (native `Promise`). Add `enqueueCopyableAction(options)` that: `createRequest("copyable")`, store `pendingPromises[id] = { kind: "copyable", resolve: syncInvokeWhenDone }`, `processNext`, **return the handle**. `destroy` already walks `pendingPromises` — that is the settle slot. Extract `handleCopyResult` → `effects/handleCopyableCopy.js` **first** so the new enqueue fits ≤150. Copy branch stays non-settle. Export `enqueueCopyableAction` on the queue `__controller`. |
| `buildMessageDialog.js` | **125** | One `appendButton` fits. Extract `appendActions` only if validation also lands here. |
| `bindMessageDialog.js` | **130** | **Do not edit** unless dual JS review proves a new bind is required (not expected). |
| `buildMessageResult.js` | 36 | Extend copyable handle results. |
| `copyMessageText.js` | 28 | **Do not edit.** |
| `openShareCopyDialog.js` | 40 | **Do not edit.** |
| `createWienKiControlsController.js` | AMD **6** | **Do not import `message`.** Effect owns the call (Share pattern). |

`pendingPromises` / queue: omit-path stays **`enqueuePassive`** (no pending). Action path uses **`enqueueCopyableAction`**, not `enqueueInteractive`. `pending.resolve` **is** `whenDone` (same `settleActive` order: cleanup then resolve). Do not wrap that resolve in `Promise.resolve().then`. No `CopyableActionHandle.js` constructor file. Extract `effects/showCopyable.js` is **internal** — public surface stays one `showCopyable`. Wien must not import the extract.

---

## 8. Out of scope

- Growing `showCopyable` into a general portal (Q11).
- Multiple action buttons, HTML body, caller render fns.
- Clipboard outside `copyMessageText.js`.
- Share internals import.
- Iframe / Glass clone / Wien-KI-owned dialog.
- Changing `notify` / `confirm` / `choose`.
- `actionId` / action lists.

---

## 9. Open questions

| ID | Question | Captain rec | Until PO |
|---|---|---|---|
| Q-msg-1 | Missing `showCopyable` while `wienKiUrl` is valid | **Locked unavailable chrome** (2026-09-14 auto-Approve). Not degraded `window.open`. | locked |

No ASK on Promise vs handle: dual review rejected native Promise as the open path.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-13 | `Draft` | Captain | Dual explore: mechanical YELLOW (walls + omit-safe); semantic YELLOW (C = sync handle, not A) |
| 2026-09-13 | `Draft` (fold) | Captain | Dual Draft review YELLOW. MUST: cleanup then `whenDone`. SHOULD folded: 560px, extract name, `buildClosedResult`, wrap gated to 3-button. |
| 2026-09-14 | `Draft → Approved` | PO vastenburg (auto if hygiene green) | Leftover hunt GREEN on live wienKi. Folded: `buildActionResult` + `enqueueCopyableAction` (not Promise). Q-msg-1 unavailable. |
| 2026-09-14 | `Approved → Implemented` | PO vastenburg Cognos green | Final leftover hunt GREEN on JS. Share omit-path unchanged. |
