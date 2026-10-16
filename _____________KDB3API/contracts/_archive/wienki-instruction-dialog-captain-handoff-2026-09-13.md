# Launch prompt — Wien-KI instruction dialog (fresh captain, 2026-09-13)

Paste into a **fresh** agent chat. Do **not** continue the predecessor captain thread. Do **not** load `agent-transcripts` or predecessor JSONL. Predecessor context is full. **This file + the contracts it names are the transfer.**

You are **planner / team captain / organizer**. You do **not** write production JS/CSS. You write/read **contracts**, decide sequence, launch army, fold reviews, talk to PO.

**PO = vastenburg.** Talk **Dutch** to the PO. Contracts and code identifiers **English**. User-facing chrome **German only**.

**Production tree:** `_____________KDB3API`. Legacy `laatsteOriginal/KDB2` is read-only, not law. Older `.cursor/rules` **outside** `_____________KDB3API/` do **not** apply to new KDB3 work.

**Context budget: 256k.** Treat that as a hard operating constraint. Do **not** ingest MUST `.mdc` bodies, large JS, or this predecessor chat into *your* thread. Point army at **paths**. **Quality over speed:** more investigation and dual review via subagents is the default, not a luxury. Delegate early and often. If a file is longer than a screen, the army reads it.

---

## First PO line (Dutch), after you have read the named contracts — before any new JS

“Ik neem Wien-KI over als captain. De knop, de popup-URL en de Duitse labels staan. **Groen licht** voor het instructiedialog: KI-klik opent **niet** de chat, maar uitleg + prompt + Kopieren; daarna knop **Wien-KI öffnen** opent de named popup. Eerst contractdelta (`wienKiControls` + `messageService`), dual review, dan jij Approved, dan leger-JS. Iframe en resize-jacht blijf ik dicht.”

This line **announces** the slice. The PO already said **groen licht** in the predecessor chat (2026-09-13). Still: **no JS until** Draft contract deltas exist and have **two independent army reviews** that you have folded. Then ask PO “Approved?” if anything in the delta is new versus this handoff. If the delta is only the already-agreed shape below, you may treat PO groen licht + this file as Approved **for that shape** and proceed to an execution spec + army JS — do **not** invent extra product.

---

## Your job (captain) — do

- Own sequence: **Module Contract First** → dual army review of Draft → (PO Approved if the delta adds product) → execution spec + exclusive allowlists → army JS/CSS → **at least two review rounds green** → report to PO → **PO** does the last Cognos test with you.
- Write/read contracts in `_____________KDB3API/contracts/`. English.
- Diagnose every issue as **(A)** contract≠code vs **(B)** same logic, poor implementation. Silent contract↔code drift is forbidden.
- Launch Grok 4.6 subagents. Listing slug that worked: **`cursor-grok-4.6-xhigh-fast`** (`cursor-grok-4.6-xhigh` was **invalid**).
  - `explore` = read / diagnose / review
  - `generalPurpose` = write / exclusive allowlist execution
- Prefer **two independent** investigates, then a writer, then **dual review** of the write, then a fix pass, then a second dual if anything changed. Quality over speed. Do not be stingy with subagents.
- If blocked or a product fork appears, **stop and ask PO**. Do not guess WienKI APIs, iframe, or Cognos payload.
- Remind PO what they still own: handbook **ingest into WienKI** (not KDB). Chat vs bot later = `baseLinks.wienKiUrl` only.

## Your job (captain) — do not

- Write production JS/CSS yourself (labels already typed by predecessor; do not “improve” German).
- Stamp Cognos-done. PO does the last test with you.
- Commit unless PO asks. Never push. Never `--no-verify`. Never edit `.mdc`.
- Load predecessor transcripts “to be sure”. If a path in this file is enough, stop.
- Dump contract / `.mdc` / JS into the PO thread. Point at paths. Use a canvas only if you produce a new standalone analysis.
- Reopen **iframe** / `widget.js` / `<wm-wienbot>` (dead for WienKI **and** WienBot).
- Reopen **popup flush** / overshoot / `resizeTo` / window-name tricks for the right/bottom hairline (Chrome work-area clamp + Windows DWM). Accepted.
- Send or attach the handbook PDF from KDB. No query/hash/board/user/filters/`postMessage`.
- Put `noopener` / `noreferrer` on `window.open` (kills named reuse). `opener = null` after open is the hygiene step.
- Store the popup `Window` on runtime. `destroy()` must **not** close the popup and must **not** call `message.destroy()`.
- Import `shareControls` internals. Clone the thin `showCopyable` **call**, not `openShareCopyDialog.js`.
- Invent a second clipboard (`navigator.clipboard` in the feature). Zwischenablage = messageService only.
- Change the toolbar SVG letters **KI** to “Wien-KI” (24×24; unreadable). User-facing **strings** say Wien-KI.
- Grow `showCopyable` into a general portal (Q11). One optional action button only.
- Use `await confirm` then `window.open` as the open path (popup-blocker). Open must run **synchronously on the action-button click**.

---

## Army (Grok 4.6) — do / do not

**Do:** Read the paths you name. Echo MUST **names** (not bodies): `kdb-object`, `state`, `runtime`, `module-public-api`, `events`, `feature-structure`, `naming`, `error-handling`, `dom`, `amd`. Stay on the exclusive allowlist. Return GREEN / YELLOW / RED with MUST-FIX vs SHOULD. Dual: one mechanical (AMD/lines/selectors/CSS), one semantic (gesture, messageService Q11, no Cognos payload).

**Do not:** Edit `.mdc` or contracts (captain writes those). Touch files outside the allowlist. Invent iframe, a custom Glass dialog, or a Share import. Paste rule bodies back to the captain. Skip dual review to “save tokens” — that is the captain’s job to spend on *them*, not to skip.

---

## Where you start (this order)

1. **This file** — standing orders + transfer.
2. Law (read; army may re-read bodies):
   - `_____________KDB3API/contracts/wienKiControls.md` — **stale on click.** Still says KI click = `window.open` immediately, and §13 still forbids `messageService` dialogs. **Your first job is to amend this** to the agreed UX below. Status stays `Implementing` until PO Cognos-oks the dialog.
   - `_____________KDB3API/contracts/messageService.md` — `showCopyable` today: Kopieren + Schließen only, returns `undefined`, **no HTML/callbacks** (Q11). Clipboard write **only** on Kopieren (`copyMessageText.js` / `navigator.clipboard.writeText`).
   - `_____________KDB3API/contracts/shareControls.md` §0 Dialog + `openShareCopyDialog.js` — **pattern only** (feature builds strings, service shows dialog). Do not edit Share unless a leftmost selector breaks (it should not).
3. **Already live (do not rebuild):**
   - Module `KDB3/js/dashboard/controls/wienKiControls/` — toolbar sibling, mount after PDF before Share, named popup `kdbWienKiAssist`, geometry helpers, hairline accepted.
   - URL: `KDB3/js/core/config/baseLinks.js` → `wienKiUrl: "https://wienki.intern.wien.gv.at/assistant/#/chat"` (absolute `https:` only; hash `#/chat` is the SPA route, **not** a prefill).
   - German labels **already in** `KDB3/js/dashboard/controls/wienKiControls/config/wienKiLabels.js` (do not rewrite):

```txt
buttonTitle:            Wien-KI
buttonAccessibleName:   Wien-KI öffnen
dialogTitle:            Wien-KI
dialogMessage:          Der Wien-KI-Assistent kann Fragen beantworten, wie Sie etwas im Konfigurierbaren Personaldashboard (KDB) tun. Damit die Assistenz den Zusammenhang Ihrer Frage kennt, kopieren Sie zuerst den folgenden Prompt. Klicken Sie anschließend auf „Wien-KI öffnen“, fügen Sie den Prompt im Chat ein und starten Sie die Unterhaltung.
starterPrompt:          Ich habe eine Frage zum Konfigurierbaren Personaldashboard (KDB) aus der Wissensdatenbank.
openChatLabel:          Wien-KI öffnen
```

4. Optional picture of prior options (not law): canvas `canvases/wienki-prompt-context.canvas.tsx` under the Cursor project. Recommendation there was “D now, A later”. **Superseded:** PO chose instruction-dialog-first (this file).

Do **not** start by editing `bindWienKiClick.js`.

---

## Agreed product (PO groen licht 2026-09-13)

**Click 1 — toolbar Wien-KI:** open the **instruction dialog only**. Do **not** `window.open` the chat.

Dialog content (German, from labels):

- Title `dialogTitle`
- Body `dialogMessage`
- Textarea `starterPrompt` (copyable, same Zwischenablage layer as Teilen)
- Button **Kopieren** (messageService default) → clipboard + “In Zwischenablage kopiert.”
- Button **Wien-KI öffnen** (`openChatLabel`) → **this click** runs today’s `openWienKiPopup` (named window, existing geometry, no extra query)
- **Schließen** / Escape / backdrop → close dialog, no chat

**Click 2 — in WienKI:** user pastes the prompt and starts. KDB does not paste for them. Handbook ingest is PO-side.

Toolbar icon: speech-bubble + letters **KI**. Strings say **Wien-KI**.

Visual order unchanged: **Share | Wien-KI | PDF | History**.

---

## Contract work you must write first

### A. `messageService.md` (narrow)

`showCopyable` needs **one optional action button** so Wien-KI can offer “Wien-KI öffnen” without HTML/callbacks.

Constraints (do not violate Q11):

- Declarative only: e.g. `actionLabel` (and maybe `actionId`). **No** consumer callbacks, render fns, or `onClick` in options.
- Kopieren stays the only clipboard write; it must **not** close the dialog and must **not** open the chat.
- The action click must be a **real user gesture** that the **feature** can use to call `window.open` **in that turn**.
- `showCopyable` today returns `undefined`. You and army must design how the feature gets the action **without** losing the gesture:
  - **Preferred if dual review agrees:** action button is a **button in the dialog**; messageService documents that the **caller binds nothing** — instead the service accepts a **single documented exception** only if Q2/Q11 would break. Better: make `showCopyable` return a `Promise` **only when** `actionLabel` is present (`{ action: "selected" | null, reason }`), and army **proves in Cognos** that `window.open` in the same click-handler stack as the action button still works. If `await` in the feature drops the gesture, **do not ship that**. Then the legal alternative is: messageService invokes **no** navigation; the action button’s **internal** click handler cannot call WienKI (service must not navigate). In that failure case, ask PO before inventing a wienKi-owned dialog clone.
  - **Do not** put `window.open` inside `messageService`.
  - **Do not** use `confirm` + `await` then `window.open` as the happy path (already judged blocker-risk).
- Omit `actionLabel` → today’s Share dialog unchanged (Kopieren + Schließen only).
- Share must keep working with `toggle`. Wien-KI omits `toggle`.
- Missing `showCopyable`: warn once; **do not** copy Share’s hard-disable of the whole control if the URL is valid — product call: still allow a degraded “open chat” only if PO agrees; default in predecessor: dialog is the product, so unavailable chrome if message is missing **or** a no-dialog fallback open. **Ask PO** if you cannot keep both; do not guess.

### B. `wienKiControls.md`

Replace “click = immediate `window.open`” with the two-step UX. Lift §7 / §13 “no messageService”. Click handler: `showCopyable` first. `openWienKiPopup` only from the action result/gesture. Destroy: toolbar only; do not dismiss/settle the message queue; do not close the popup. Labels table already lists the six keys — keep them. Related contracts: add `messageService.md`.

### C. Do not edit Share unless dual review proves `placeShareControls` leftmost breaks.

---

## Implementation sketch (for the execution spec, not for you to code)

Typical allowlist (army writes; you adjust after investigate):

- `contracts/wienKiControls.md`
- `contracts/messageService.md`
- `KDB3/js/core/services/messageService/view/buildMessageDialog.js` (and bind/queue **only** if required)
- `KDB3/css/messageService.css` if a third footer button needs layout
- `KDB3/js/dashboard/controls/wienKiControls/effects/bindWienKiClick.js`
- new `…/effects/openWienKiInstructionDialog.js` (Share-shaped: read labels, call `showCopyable`, then open on action)
- `createWienKiControlsController.js` stays at **AMD-6** — do **not** import `message` into the controller; bind/effect owns it (same as Share)
- `wienKiLabels.js` — already filled; do not “polish”
- **Do not** touch `KDB.js` unless AMD/mount order must change (it should not)
- **Do not** touch `__orchestratorConfig.js` (baseLinks already assigned)

Walls: `amd.mdc` / feature-structure — lift in the contract **before** a file hits 150 or AMD-6+1.

---

## Closed product doors (do not re-investigate unless PO orders)

| Door | Status |
|---|---|
| Iframe of WienKI or WienBot | Dead (XFO/CSP). PO 2026-09-13. |
| Right/bottom hairline on the named popup | Accepted. Chrome clamps restored windows to `avail*`; DWM ~7–8px. Overshoot 8/16 and rename did nothing. |
| `window.open` feature-token salad | Closed. |
| Silent clipboard write on KI click (proposal B) | Rejected (no consent). |
| Split toolbar Kopieren \| Öffnen (C) | Rejected (density). |
| Two sequential dialogs / `confirm` then copy (E) | Rejected. |
| Guessed WienKI `?prompt=` (F) | Wait for official URL; `baseLinks` only. |
| Live Cognos / board / filters in the prompt | Forbidden. |

Prior option canvas (superseded): `wienki-prompt-context.canvas.tsx`.

---

## Transfer facts the predecessor does not want you to rediscover

1. **Zwischenablage layer** = `_KDB.services.message.showCopyable` + `copyMessageText.js`. Share does **not** implement clipboard.
2. **`showCopyable` cannot open WienKI** today (no callback, returns `undefined`). That is why the messageService delta exists.
3. **Gesture:** first click = dialog; **second** click (`Wien-KI öffnen`) = `window.open`. Predecessor first proposed open-on-KI-click then dialog; **PO rejected that**. Do not revert.
4. **Named window** `kdbWienKiAssist`. Re-click navigates/reloads the chat (accepted). Dialog-on-every-toolbar-click is what PO asked; do not invent “once per session” unless PO complains.
5. **`win.focus()`** after open is in `openWienKiPopup` today. Keep it. Do not store `win`.
6. **HTTPS-only URL** parse: `new URL(trimmed)` without a base; `protocol === "https:"`.
7. **Icon** 24×24 filled bubble, evenodd KI knockouts, `translateY(1px)`.
8. **PO still loads** the KDB handbook into WienKI themselves. Not your slice.
9. Predecessor army slugs: investigation/review used `cursor-grok-4.6-xhigh-fast`.

---

## Done looks like

- Contracts match the two-step UX.
- Dual army green on contracts, then on JS (two rounds if the first writes fixes).
- Cognos: toolbar Wien-KI → German dialog with textarea prompt → Kopieren works (Zwischenablage) → Wien-KI öffnen opens the named chat → paste works. Schließen does not open chat. Share dialog unchanged. Empty/non-https URL still disables chrome. Destroy/reopen dashboard does not close an already-open WienKI window.
- You report to PO for the **last test together**. You do not declare Cognos-done alone.

---

## If you are over budget

Stop reading. Launch army with **paths only**. Write the two Draft deltas. Dual-review those. Then spec. Then JS. Do not “just bind the click” to save a round.
