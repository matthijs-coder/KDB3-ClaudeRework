# Execution Spec: Wien-KI instruction dialog + `showCopyable` action button

> Mechanical spec for Grok 4.6. Architecture lives in the two Approved deltas. Do not re-decide Promise vs handle, iframe, hairline, or Q-wien-1.

---

**Status:** `Executed` — army W1–W3 dual GREEN. **PO Cognos last** (captain does not stamp).
**Module / contract:** `contracts/wienKiControls-instruction-dialog-contractdelta.md` + `contracts/messageService-copyable-action-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-14
**Executing AI:** grok 4.6 army (exclusive waves)
**Reviewer:** dual grok 4.6 after each wave; PO Cognos last

---

## Exclusive allowlists

No two writers on the same file. **Finish W1 before W2. Finish W2 before W3.**

### W1 — results + queue handle (no chrome)

**May create:**

- `KDB3/js/core/services/messageService/effects/handleCopyableCopy.js`

**May edit:**

- `KDB3/js/core/services/messageService/effects/buildMessageResult.js`
- `KDB3/js/core/services/messageService/effects/createModalQueue.js`

**Must not edit:** `createMessageService.js`, `buildMessageDialog.js`, `bindMessageDialog.js`, `copyMessageText.js`, `openShareCopyDialog.js`, wienKi files, CSS, `KDB.js`, contracts, `.mdc`.

### W2 — `showCopyable` extract + footer button

**May create:**

- `KDB3/js/core/services/messageService/effects/showCopyable.js`

**May edit:**

- `KDB3/js/core/services/messageService/createMessageService.js`
- `KDB3/js/core/services/messageService/view/buildMessageDialog.js`
- `KDB3/css/messageService.css`

**Must not edit:** W1 files, `bindMessageDialog.js`, `copyMessageText.js`, Share, wienKi, `KDB.js`.

### W3 — Wien-KI click + unavailable chrome

**May create:**

- `KDB3/js/dashboard/controls/wienKiControls/effects/openWienKiInstructionDialog.js`

**May edit:**

- `KDB3/js/dashboard/controls/wienKiControls/effects/bindWienKiClick.js`
- `KDB3/js/dashboard/controls/wienKiControls/createWienKiControlsController.js`

**Must not edit:** `openWienKiPopup.js`, `wienKiLabels.js`, `KDB.js`, Share internals, messageService except via W1/W2 already done.

---

## Section A. Pre-flight read list

Echo **one sentence** per MUST **name** (not body) plus one sentence per contract below. Wrong/missing echo → stop. Then produce files.

1. `kdb-object`
2. `state`
3. `runtime`
4. `module-public-api`
5. `events`
6. `feature-structure`
7. `naming`
8. `error-handling`
9. `dom`
10. `amd`
11. `contracts/messageService-copyable-action-contractdelta.md`
12. `contracts/wienKiControls-instruction-dialog-contractdelta.md`
13. This execution spec

Paths (read, do not paste bodies): `_____________KDB3API/.cursor/rules/<name>.mdc`

---

## W1 per-file

### `effects/handleCopyableCopy.js` (new)

- **Role:** factory-scope helpers extracted from live `handleCopyResult` (`createModalQueue.js` 32–47).
- **Lines:** target ≤50. Hard 150.
- **AMD:** `["./copyMessageText.js"]` (AMD 1).
- Factory-scope: `applyCopyableCopyResult(_context, _requestId, _copied)` = live `handleCopyResult` body.
- Factory-scope entry `handleCopyableCopy(_context, _requestId)`: read active copyable request; `_copyMessageText(request.options.copyText).then(applyCopyableCopyResult.bind(null, _context, _requestId))`.
- Queue `handleAction` copy branch: `_handleCopyableCopy(context, request.id); return;` — no `_copyMessageText` in the queue file.
- **Return:** `handleCopyableCopy`.
- **Rules:** `amd.mdc`, `naming.mdc`, `error-handling.mdc` (try/catch).

### `effects/createModalQueue.js` (edit)

- Remove `handleCopyResult` **and** the `_copyMessageText` call. Copyable `"copy"` branch: `_handleCopyableCopy(context, request.id)` only (extract starts `writeText` then toasts).
- Add AMD import `"./handleCopyableCopy.js"`; **remove** `"./copyMessageText.js"` so AMD stays **3**.
- Add factory-scope named helpers (not nested inside `enqueueCopyableAction`): `registerCopyableWhenDone(_handle, _fn)`, `invokeCopyableWhenDone(_handle, _result)`.
- Add `enqueueCopyableAction(context, options)` using those helpers:
  1. `request = createRequest(runtime, "copyable", options)`
  2. `handle = { whenDone: registerCopyableWhenDone.bind(null, slot) }` where `slot = { onSettled: null }` — **not** a thenable
  3. `runtime.pendingPromises[request.id] = { kind: "copyable", resolve: invokeCopyableWhenDone.bind(null, slot) }`
  4. push request, `processNext(context)`, `return handle`
- Second `whenDone`: ignore + `console.warn("[messageService.showCopyable] whenDone already registered")`.
- **Do not** call `enqueueInteractive` / `new Promise` / `queueMicrotask` / `setTimeout` / `Promise.resolve().then` on this path.
- Export `enqueueCopyableAction` on `__controller` return.
- `settleActive` order **unchanged**: cleanup then `pending.resolve` then `processNext`.
- **Lines:** must stay ≤150. **AMD = 3.**

### `effects/buildMessageResult.js` (edit)

Copyable handle only (confirm/choose unchanged):

- `buildActionResult`: if `request.kind === "copyable"` → `actionPayload.action === "action"` → `{ action: "selected", reason: "selected" }`; else `{ action: null, reason: "dismissed" }`.
- `buildClosedResult`: if `request.kind === "copyable"` → `{ action: null, reason: reason }`.
- `buildDestroyedResult`: if `kind === "copyable"` → `{ action: null, reason: "destroyed" }`. Keep confirm / else-choose as today.
- **Lines:** ≤80. **Rules:** `amd.mdc`, `naming.mdc`. Pure helpers, no try/catch required if they stay one-liner-ish; wrap each named helper if body is more than a return.

---

## W2 per-file

### `effects/showCopyable.js` (new)

- **Role:** branch omit vs action. **Not** a second public API.
- **AMD:** `[]` (uses `context` only).
- `__controller(context, _options)`:
  1. `options = _options || {}`
  2. Trim `actionLabel`: `String(raw == null ? "" : raw).replace(/^\s+|\s+$/g, "")`
  3. If empty: `context.modalQueue.enqueuePassive("copyable", options); return;`
  4. `options.actionLabel = trimmed`; `return context.modalQueue.enqueueCopyableAction(options);`
- try/catch: log `console.error("[messageService.showCopyable]", err)` and return `undefined`.
- **Lines:** target ≤40. **Rules:** `amd.mdc`, `module-public-api.mdc` (no extra surface), `error-handling.mdc`.

### `createMessageService.js` (edit)

- AMD 5 → **6**: add `"./effects/showCopyable.js"`. **Do not** add a 7th.
- Replace in-file `showCopyable` body with disposed check + `return _showCopyable(context, _options)` inside try (same `logPublicError` as today).
- Do **not** leave the old `enqueuePassive` body.
- Public API still one `showCopyable`.
- **Lines:** ≤150. **Rules:** `amd.mdc`, `module-public-api.mdc`, `error-handling.mdc`.

### `view/buildMessageDialog.js` (edit)

In copyable `appendActions` (live 75–78):

- If trimmed `options.actionLabel`:
  - `actionsEl.className = "kdb-message-dialog__actions kdb-message-dialog__actions--with-action"`
  - Order: close, copy **without** `--primary`, action **with** `--primary` and `data-kdb-message-action="action"` (`textContent = actionLabel`)
- Else: today’s two buttons (copy keeps `--primary`).
- **Do not** change alert/confirm/choose.
- **Lines:** ≤150. Live 125. **Rules:** `dom.mdc`, `amd.mdc`. No bind rewrite.

### `css/messageService.css` (edit)

Add **only**:

```css
.kdb-message-dialog__actions--with-action {
  flex-wrap: wrap;
}
```

Do not change `.kdb-message-dialog__actions` for Share. Do not retune 560px sheet.

---

## W3 per-file

### `effects/openWienKiInstructionDialog.js` (new)

- **AMD:** `["./openWienKiPopup.js"]` (AMD 1).
- `__controller` / export `openWienKiInstructionDialog(_KDB)`:
  1. `runtime = _KDB.runtime.wienKiControls`; if missing return
  2. If `runtime.instructionDialogOpen === true` return
  3. `message = _KDB.services && _KDB.services.message`; if `!message || typeof message.showCopyable !== "function"` return
  4. Read labels from `_KDB.config.labels.de.wienKiControls` (same path as controller). Missing strings → empty string, still call
  5. `runtime.instructionDialogOpen = true`
  6. `handle = message.showCopyable({ title: labels.dialogTitle, message: labels.dialogMessage, copyText: labels.starterPrompt, actionLabel: labels.openChatLabel })` — **no** `toggle`
  7. If `!handle || typeof handle.whenDone !== "function"`: `runtime.instructionDialogOpen = false`; return
  8. `handle.whenDone(onInstructionSettled.bind(null, _KDB, _openWienKiPopup))` **only** — do not also paste an inline `function (result)`.
- Named helper at factory scope: `function onInstructionSettled(_KDB, _openPopup, _result)` — clear `instructionDialogOpen`; if `result.action === "selected"` call `_openPopup(_KDB)`. try/catch on that helper.
- try/catch `[wienKiControls.openWienKiInstructionDialog]`.
- **Lines:** target ≤80. **Rules:** `amd.mdc`, `error-handling.mdc`, `naming.mdc`, `cognos-adapter` N/A (no Cognos).

### `effects/bindWienKiClick.js` (edit)

- AMD swap: `"./openWienKiInstructionDialog.js"` instead of `"./openWienKiPopup.js"`. AMD stays **1**.
- `onWienKiClick`: same disabled/unavailable guard; call `_openWienKiInstructionDialog(_KDB)` instead of `_openWienKiPopup`.
- **Rules:** `amd.mdc`, `error-handling.mdc`.

### `createWienKiControlsController.js` (edit)

- AMD stays **6**. No `message` import.
- Add `hasMessageCopyable(_KDB)` factory helper: `message = _KDB.services && _KDB.services.message`; return `!!(message && typeof message.showCopyable === "function")`.
- `finishMount`: `hasUrl && hasMessage` → `serviceAvailable: true`, `disabled: false`. Else disabled + `serviceAvailable: false`.
- Warn once URL: keep existing.
- Warn once missing message **only when `hasUrl && !hasMessage`**: `[wienKiControls.mount] _KDB.services.message.showCopyable is missing; controls disabled.` Flag `didWarnMissingMessage` on controller (next to `didWarnMissingUrl`).
- **Lines:** ≤150 (live 119). **Rules:** `amd.mdc`, `module-public-api.mdc` (no message import), `error-handling.mdc`.

Do **not** init `instructionDialogOpen` in orchestrator unless you must; first click may set it. Cleanup need not delete it (runtime bucket reset already).

---

## Section J. Acceptance (self-check before report)

1. Omit `actionLabel` (Share) still `enqueuePassive`, return `undefined`, two footer buttons, copy `--primary`.
2. Wien `showCopyable` returns handle with `whenDone` only.
3. `window.open` only inside existing `openWienKiPopup.js`, reached only from `whenDone` `{ action: "selected" }`.
4. Kopieren does not close / does not open popup.
5. `settleActive` order unchanged.
6. No file >150. Controller AMD 6. `createMessageService` AMD 6.
7. No Share import. No `enqueueInteractive` for copyable. No `CopyableActionHandle.js`. No `.mdc` / `KDB.js` / `wienKiLabels.js` / `openWienKiPopup.js` edits.
8. Missing message + valid URL → unavailable chrome at `finishMount`.

---

## Section K. Forbidden

- `.mdc`, contract templates, `KDB.js`, `baseLinks.js`, `wienKiLabels.js` polish
- `window.open` in `messageService`
- `await showCopyable` / native Promise as open path
- `noopener` / `noreferrer`
- iframe / Glass clone / Share internals
- `actionId`, extra events, extra service
- Commit / push

---

## Section L. Reporting

After **each** wave: file table (path, lines, AMD, matches spec | deviation). After W3: Section J checklist.

> End of spec.
