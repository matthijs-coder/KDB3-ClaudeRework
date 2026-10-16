# Contract Delta: Wien-KI instruction dialog

> Toolbar KI click opens **instruction + prompt + Kopieren**, not the chat. Named popup opens only from **Wien-KI öffnen** (second user gesture).
> PO vastenburg 2026-09-13: groen licht. Labels already live. Do not reopen iframe / hairline / `noopener`.

---

**Status:** `Implemented` — PO Cognos green 2026-09-14.
**Owner module / service:** `wienKiControls` (chrome + open); `messageService` (dialog + clipboard)
**Type:** `feature-module contract delta`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-13
**Reviewed by:** leftover hygiene 2026-09-14 GREEN on live module. PO auto-Approved. Q-wien-1 locked **unavailable**.
**Related rules:** `feature-structure.mdc` (workflow), `module-public-api.mdc`, `runtime.mdc`, `dom.mdc`, `amd.mdc`, `naming.mdc`, `error-handling.mdc`
**Related contracts:** `wienKiControls.md` (parent), `messageService.md` + `messageService-copyable-action-contractdelta.md`, `shareControls.md` (pattern only)

**Parents this delta amends** (one-liners on Approved — not JS)

| Parent | Slice |
|---|---|
| `contracts/wienKiControls.md` §0 Click | Toolbar click → instruction `showCopyable`. `window.open` only from action handle `whenDone` `{ action: "selected" }`. |
| `contracts/wienKiControls.md` §1 Purpose | Button opens the instruction dialog; chat popup is the second step. |
| `contracts/wienKiControls.md` §7 Dependencies | Add `_KDB.services.message.showCopyable`. Still no `cognosHost` / `dashboardPdf`. |
| `contracts/wienKiControls.md` §9 Folder | Add `effects/openWienKiInstructionDialog.js`. `bindWienKiClick.js` stays the click owner; **does not** import `message` into the controller. |
| `contracts/wienKiControls.md` §12 | Lift “dialog not implemented.” Six German keys stay as already in `wienKiLabels.js`. |
| `contracts/wienKiControls.md` §13 | Lift “`messageService` dialogs” out of out-of-scope. Still no iframe, no handbook send, no popup close on destroy. |
| `contracts/wienKiControls.md` Related contracts | Add `messageService.md`. |
| `contracts/shareControls.md` | **Do not edit** unless dual JS review proves `placeShareControls` leftmost broke (not expected). |

**Parked (remind, do not start):** iframe; popup flush/hairline; handbook ingest (PO); chat vs bot (`baseLinks.wienKiUrl` only); guessed `?prompt=`.

---

## 1. Purpose

`wienKiControls` already owns the toolbar button, named popup `kdbWienKiAssist`, and German labels. This slice changes **only the first click**: show the instruction dialog (copy the starter prompt, then open). KDB still does not paste into WienKI and still sends no Cognos payload.

---

## 2. Diagnose (A vs B)

| Question | Verdict |
|---|---|
| Parent §0 / §10 / live `bindWienKiClick` = immediate `window.open`? | **A vs new product.** Live matches the **stale** parent. Dual explore 2026-09-13: `bindWienKiClick` `onWienKiClick` → `_openWienKiPopup`. Labels already contain dialog copy. |
| Parent §7 / §13 “no `messageService`”? | **A.** Must lift. Zwischenablage is `_KDB.services.message` (Share does not own clipboard). |
| Popup geometry / named window / https URL? | **Not A.** Keep §10 as-is. Hairline accepted. |
| Flat “just bind the click to `showCopyable` and `await` then open”? | **B.** Gesture / Q11. Open path is the **action-button** click via `CopyableActionHandle.whenDone`, not `await showCopyable`. |

---

## 3. Product (locked)

| Topic | Law |
|---|---|
| Click 1 — toolbar Wien-KI | Instruction dialog **only**. Do **not** `window.open`. |
| Dialog | Title `dialogTitle`. Body `dialogMessage`. Textarea `starterPrompt`. Kopieren (message default). Action `openChatLabel` (**Wien-KI öffnen**). Schließen / Escape / backdrop → close, **no** chat. |
| Click 2 — action button | **This** gesture runs today’s `openWienKiPopup` (named window, existing geometry, no extra query). |
| Click in WienKI | User pastes. KDB does not paste. Handbook ingest is PO-side. |
| Kopieren | messageService only. Dialog stays open. No chat. |
| Visual order | **Share \| Wien-KI \| PDF \| History** |
| Icon | Speech-bubble + letters **KI**. Strings **Wien-KI**. Do not grow the SVG to the word Wien-KI. |
| Copy | Hardcoded German in `wienKiLabels.js`. **Do not polish.** Not `_KDB.config.labels.de` rewrites. |
| Re-click toolbar | Dialog **every** time (PO) after the previous instruction dialog has closed. If the feature already has an in-flight handle (local flag; **not** a messageService reader): toolbar re-click is a **no-op**. Do not FIFO a second copyable. Named window re-click still navigates/reloads the chat (accepted). Do not invent once-per-session. |
| `win.focus()` | Keep after open. **Do not** store `win`. |
| `noopener` / `noreferrer` | **Forbidden** (kills named reuse). `opener = null` after open stays. |
| HTTPS URL | `new URL(trimmed)` without a base; `protocol === "https:"`. Empty / non-https → unavailable (unchanged). |
| Omit `toggle` | Wien-KI has no Share toggle. |
| Payload | **None.** No query/hash/board/user/filters/`postMessage`. |

Labels (already live — do not rewrite):

```txt
buttonTitle:            Wien-KI
buttonAccessibleName:  Wien-KI öffnen
dialogTitle:            Wien-KI
dialogMessage:          Der Wien-KI-Assistent kann Fragen beantworten, wie Sie etwas im Konfigurierbaren Personaldashboard (KDB) tun. Damit die Assistenz den Zusammenhang Ihrer Frage kennt, kopieren Sie zuerst den folgenden Prompt. Klicken Sie anschließend auf „Wien-KI öffnen“, fügen Sie den Prompt im Chat ein und starten Sie die Unterhaltung.
starterPrompt:          Ich habe eine Frage zum Konfigurierbaren Personaldashboard (KDB) aus der Wissensdatenbank.
openChatLabel:          Wien-KI öffnen
```

---

## 4. Click flow (normative)

`bindWienKiClick` remains the toolbar listener. Disabled / unavailable → no-op (unchanged).

Enabled click → `openWienKiInstructionDialog(_KDB)` (**new** file). That effect:

1. Read labels from `_KDB.config.labels.de.wienKiControls`.
2. If `_KDB.services.message` or `showCopyable` is missing → no-op here (chrome already unavailable). Do not import Share.
3. `var handle = showCopyable({ title: dialogTitle, message: dialogMessage, copyText: starterPrompt, actionLabel: openChatLabel })`.
4. If `handle` is missing / has no `whenDone` → clear in-flight flag; no popup.
5. `handle.whenDone(function (result) { if (result && result.action === "selected") openWienKiPopup(_KDB); })`.
6. **No** `await`. **No** native `Promise.then` as the open path. **No** `window.open` on the toolbar click.

`openWienKiPopup` §10 stays: synchronous `window.open` **on the call that runs from `whenDone`**. messageService invokes `whenDone` **after** live cleanup, still **inside** the action-button click listener (`messageService-copyable-action-contractdelta.md`).

Clone Share’s **call shape** (feature builds strings, service shows dialog). **Do not** import `openShareCopyDialog.js` or any `shareControls` internal.

---

## 5. Destroy / remount

Unchanged: toolbar chrome only. **Do not** close the popup. **Do not** call `message.destroy()`. **Do not** settle or dismiss the message queue.

Full dashboard teardown: `KDB.js` already destroys features **before** `message`. Message then dismisses any open dialog. Correct.

If the instruction dialog is still open after a wienKi `destroy` (without message destroy), a later action click may still open the named popup. Accepted (popup is not KDB-owned). Do not store the handle on `_KDB.runtime.wienKiControls` as a Window. A local continuation close-over is enough; optional: skip `openWienKiPopup` when the module `_isDisposed` (no throw).

---

## 6. Missing `showCopyable` (Q-wien-1 — **locked unavailable**)

Share: missing message → warn once, hard-disable chrome even if the share URL is valid.

Wien-KI: dialog is the product. Missing `_KDB.services.message.showCopyable` while URL is valid → **unavailable chrome** (warn once `[wienKiControls.mount]`, `serviceAvailable: false`, root `is-unavailable`, button disabled). **Not** degraded `window.open`.

`finishMount` may read `_KDB.services.message` in place (no 7th AMD import). `createWienKiControlsController.js` is on the allowlist **only** for this gate + `didWarnMissingMessage`.

Empty/non-https URL still disables chrome regardless of message.

---

## 7. Walls / exclusive allowlist (for the later spec)

**Do not write JS except via the execution spec after Approved.**

Allowlist (army later):

- `contracts/wienKiControls.md` (parent one-liners after Approved)
- `contracts/messageService.md` (parent one-liners after Approved)
- `KDB3/js/dashboard/controls/wienKiControls/effects/bindWienKiClick.js` (swap callee; stay AMD 1)
- **new** `…/effects/openWienKiInstructionDialog.js`
- `createWienKiControlsController.js` — `finishMount` message-missing gate only (AMD stays 6)
- messageService files listed in `messageService-copyable-action-contractdelta.md` (extract `handleCopyableCopy` + `showCopyable` **first**)
- `KDB3/css/messageService.css` footer wrap class only

**Do not:**

- `createWienKiControlsController.js` (AMD **6**) — no `message` import. Exception: Q-wien-1 **unavailable** may edit `finishMount` in place (runtime lookup, still 6 imports).
- `wienKiLabels.js` polish
- `KDB.js` / `__orchestratorConfig.js` / `baseLinks.js`
- `openWienKiPopup.js` behaviour (keep `focus`, no store `win`)
- Share internals
- `.mdc`

---

## 8. Out of scope

- Iframe / `widget.js` / `<wm-wienbot>`
- Popup flush / `resizeTo` / window-name tricks for the hairline
- Sending the handbook from KDB
- Live Cognos / board / filters in the prompt
- Guessed WienKI `?prompt=`
- Split toolbar Kopieren \| Öffnen
- Silent clipboard on KI click
- Two sequential dialogs / `confirm` then copy
- `settingFamily` / vis toggle work

---

## 9. Acceptance (PO Cognos — captain does not stamp)

- Toolbar Wien-KI → German dialog with textarea prompt.
- Kopieren → Zwischenablage + “In Zwischenablage kopiert.” Dialog stays. Chat does not open.
- Wien-KI öffnen → named popup `kdbWienKiAssist` at `wienKiUrl`. Paste works in WienKI.
- Schließen / Escape / backdrop → no chat.
- Share `showCopyable` unchanged (toggle, Kopieren + Schließen, no third button).
- Empty / non-https URL still disables Wien-KI chrome.
- Destroy / reopen dashboard does not close an already-open WienKI window.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-13 | `Draft` | Captain | Handoff groen licht for this shape; Q-wien-1 still ASK PO |
| 2026-09-13 | `Draft` (fold) | Captain | Dual Draft YELLOW folded: re-click no-op if dialog already active; Q-wien-1 controller allowlist only if unavailable. |
| 2026-09-14 | `Draft → Approved` | PO vastenburg (auto if hygiene green) | Live wienKi: no dead files. Q-wien-1 unavailable. |
| 2026-09-14 | `Approved → Implemented` | PO vastenburg Cognos green | Final leftover hunt GREEN on JS. |
