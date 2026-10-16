# Module Contract: `wienKiControls`

> Toolbar sibling that opens the Stadt Wien KI chat in a **named popup window**.
> No Cognos data. No iframe. Handbook PDF ingest is **out of this module** (PO).
> PO 2026-09-13: popup POC is the product; implement after army investigation green.

---

**Status:** `Implemented` — PO Cognos green 2026-09-14.
**Owner module / service:** `wienKiControls`
**Type:** `feature module` (toolbar chrome; sibling of `pdfExportControls` / `shareControls`)
**Authoring AI:** Cursor Grok 4.6, 2026-09-13
**Reviewed by:** PO Cognos green 2026-09-14; leftover hunt GREEN
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.
**Related contracts:** `pdfExportControls.md`, `shareControls.md`, `messageService.md`, `header.md` (handbook leftover — do not extend).

---

## 0. Decision summary

| Topic | Decision |
|---|---|
| Placement | `KDB3/js/dashboard/controls/wienKiControls/` |
| Public surface | `{ mount, destroy }` — named lifecycle, no `dispatch` / `getState` |
| State | No `_KDB.state.wienKiControls` |
| Click | Toolbar: instruction `showCopyable` (not `window.open`). Named popup only from action `whenDone` `{ action: "selected" }`. Law: `wienKiControls-instruction-dialog-contractdelta.md` |
| URL | `_KDB.config.links.wienKiUrl` from `core/config/dashboardSettings.js`. Default: `https://wienki.intern.wien.gv.at/assistant/#/chat`. **Absolute `https:` only** (parse without a base). Empty / non-https → unavailable |
| Payload | **None.** No query, hash, board id, user, filters, PDF export, postMessage |
| Iframe / `widget.js` | **Forbidden.** PO 2026-09-13: dead end for WienKI chat *and* WienBot. Do not reopen |
| Geometry | Named popup, right, ~420px, top flush. **Right/bottom hairline accepted** (Chrome work-area clamp + Windows DWM). Do not retune overshoot / `resizeTo` / window name for flush |
| Chat vs bot URL | PO decides. Switch only via `links.wienKiUrl` in `core/config/dashboardSettings.js`. KDB does not send the handbook |
| Visual order | **Share \| WienKI \| PDF \| History** |
| Share patch | `placeShareControls.readLeftmostAnchor` must include `[data-kdb-wien-ki-controls]` |
| Icon | Speech-bubble + letters **KI** (German). Not “AI”. Inline SVG `currentColor` (no PNG pair) |
| Labels | German only, `_KDB.config.labels.de.wienKiControls` |
| Destroy | Tear down toolbar chrome only. **Do not** close the popup |
| Cognos SDK | None. No facet stamp |

Deviation from Option A `<a target=_blank>`: PO accepted the named-popup POC. `window.open` is required for size, position, and same-name reuse.

---

## 1. Purpose

`wienKiControls` owns the KDB toolbar **Wien-KI** button. A click opens a German instruction dialog (prompt + Kopieren). **Wien-KI öffnen** then opens or focuses one named browser popup to the configured chat URL. The module never sends dashboard content. The handbook PDF is supplied to the chat product by the PO, not by this code.

---

## 2. Ownership

- Canonical state subtree: **none**.
- Foreign-write paths: none.

---

## 3. Runtime

- Owner namespace: `_KDB.runtime.wienKiControls`
- Buckets: `domRefs`, `listeners`, `observers`, `abortControllers`, `timers` (`remountTimer`), `pendingPromises.mount`, `viewModel`
- `instructionDialogOpen` — boolean on the owner runtime (not a listed bucket). Toolbar re-click no-op while the instruction dialog is in flight. Reset when the runtime bucket is cleared.
- `viewModel`: `{ disabled, serviceAvailable, label }` — `serviceAvailable` is **false** when `wienKiUrl` is missing/empty/non-https **or** `_KDB.services.message.showCopyable` is missing (dialog is the product)
- **Do not** store the popup `Window` on runtime (named reuse does not need it; storing it leaks across destroy/double-boot)
- Cleanup: `destroy()` aborts mount wait, disconnects observer, clears timers/listeners, detaches toolbar root, resets the runtime bucket. Popup stays open.

---

## 4. Public API

### 4a. Feature module

- Surface: `_KDB.api.wienKiControls`
- Style: **named lifecycle** (same deviation as `pdfExportControls` / `shareControls`)
- Motivation: one caller (`KDB.js`), one user command (open/focus popup), no undo/redo, no owner state subtree, fewer than three state-changing actions
- Orchestrator AMD id: `./dashboard/controls/wienKiControls/__orchestratorWienKiControls.js`
- `mount` return: `true` / `false` like live PDF/Share (`waitForElObserver` armed vs disposed / missing util / missing selector). `KDB.js` ignores the return.

```js
_KDB.api.wienKiControls = {
  mount: mount,
  destroy: destroy
};
```

---

## 5. Readers / Writers

- No published selectors.
- No writers.

---

## 6. Events

- **Emitted:** none (no external consumer).
- **Subscribed:** none.
- Do not catalog a fact-event for popup open.

---

## 7. Dependencies

- `_KDB`
- `_KDB.utils.waitForElObserver`
- `_KDB.elements.selectors.toolbar.actionBarLeadingSelector` (copied onto this module’s `toolbarHostSelector`)
- `_KDB.config.links.wienKiUrl`
- `_KDB.services.message.showCopyable` (instruction dialog + Zwischenablage). Effect owns the call, not the controller.
- Chrome wait catalog key: **`"toolbar.actionBarLeadingSelector"`** (same as PDF/Share/History — no new key)

No `cognosHost`, no `dashboardPdf`.

---

## 8. Cognos Touchpoints

- None. Toolbar host wait is chrome DOM (`core/cognosHost/` selectors), not a facet.

`dom.mdc` exceptions (document-root):

1. `waitForElObserver` + `document.querySelector` on `toolbar.actionBarLeadingSelector`
2. Toolbar remount: `MutationObserver` on `document.body`, remount **re-queries** the host like PDF/Share (not History’s stored host)

---

## 9. Folder Layout

```txt
controls/
  wienKiControls/__orchestratorWienKiControls.js   # shim: re-exports toolbarControls/wienKiButton.js (path kept for KDB.js)
  toolbarControls/
    index.js          # shared controller: { mount, destroy } per button
    config.js         # BUTTON_ORDER, BUTTONS.wienKi, WIEN_KI_POPUP (windowName, widthPx, insets, chromeFeatures), labels
    toolbarHost.js    # shared toolbar wait, observer, ordered placement (Share | WienKI | PDF | History)
    toolbarButton.js  # button instance and view-model sync
    wienKiButton.js   # wienKi definition: inline SVG speech-bubble icon, instruction dialog click handler
    wienKiPopup.js    # URL read (absolute https only), popup box compute/place, openWienKiPopup, instruction labels
```

No `state/`, no `events/`, no `adapters/` (inline SVG, no luminance PNG helper).

**As built (Phase 1):** all four toolbar buttons (share, wienKi, pdf, history) share one controller and one toolbar host in `KDB3/js/dashboard/controls/toolbarControls/`. Runtime is the shared `_KDB.runtime.toolbarControls` (kit buckets: `abortControllers.hostWait` plus one `<id>Bind` abort controller per button, `pendingPromises.hostWait`, `observers.toolbar`, `timers.toolbarSync`, `domRefs.toolbarHostEl`; fields `buttons`, `isHostReady`, `dashboardFacet`), not a per-button namespace. One toolbar wait (30 s) and one `MutationObserver` serve all buttons, reference counted by mount/destroy; button order is `BUTTON_ORDER` in `config.js`. `_KDB.api.<apiName>` exposes `{ mount, destroy }` (share also `applyReadOnlyChrome`). The `__orchestrator*Controls.js` files under the per-button folders are shims that re-export the button file.

CSS: `KDB3/css/customButtons/toolbarControls.css` — clone PDF button chrome (32×32 button, clipped label, `is-unavailable` on **root**). Icon box is **24×24** (not 16×16): speech-bubble + `KI` needs more pixels than a silhouette PNG. Register in `cssHrefList.js` next to share/pdf.

---

## 10. Popup behaviour (normative)

`openWienKiPopup(_KDB)`:

1. Read `url = _KDB.config.links.wienKiUrl`. Trim. Parse with `new URL(trimmed)` **without a base**. Accept only `protocol === "https:"`. Otherwise no-op (button already unavailable).
2. Geometry from `WIEN_KI_POPUP` in `toolbarControls/config.js` + `screen.availLeft` / `availTop` / `availWidth` / `availHeight` (iframe `window.screen` is the monitor, not the iframe box). Goal: **maximum vertical work area** (PO 2026-09-13): from just below the host browser chrome when that is readable, otherwise from the top of the Windows work area, down to the taskbar.
   - `width = widthPx` (420), clamped to `availWidth`
   - Default work edges: `workRight = availLeft + availWidth`, `workBottom = availTop + availHeight`. If `window.top.screenX` / `screenY` / `outerWidth` / `outerHeight` are readable and finite and outer size `> 0`, **replace** those edges with the host outer box (`screenX+outerWidth`, `screenY+outerHeight`). A maximized Cognos window already includes the Windows DWM overhang; copying it is what can meet the visual screen edge. `try/catch` — cross-origin failure keeps `avail*`.
   - `overshoot = 0` when host outer edges were used, else `frameOvershootPx` (16). `left = workRight - width - rightInsetPx + overshoot`. Clamp `left` against **`availLeft`**, not `0`. `rightInsetPx` default **0**.
   - `top`: try `window.top.screenY + (window.top.outerHeight - window.top.innerHeight)` (bottom of browser tabs/address bar). Use it only when the read succeeds **and** the value sits in `(availTop, workBottom - 120)`. Cross-origin / missing metrics → `availTop`. Then add `topOffsetPx` (default **0**). Do **not** change this formula to “fix” the right/bottom hairline (PO: top is already flush).
   - `height = workBottom - top - bottomInsetPx + overshoot` (`bottomInsetPx` default **0**). Minimum height 120. Do not shrink height back to `avail` bottom (that kills host-outer / overshoot).
   - After a successful `window.open`, **before** `opener = null`: `resizeTo` then `moveTo` to that box. Then nudge with `moveBy(dx, 0)` / `resizeBy(0, dy)` — positive shortfalls only, each capped at `max(frameOvershootPx, 16)`. Do **not** `moveBy` on Y and do **not** compute a new height from live `screenY`. Failures silent. One `setTimeout(0)` retry of apply + nudge. Not before `window.open`. Repeat on every click.
3. `features = chromeFeatures + ",width=…,height=…,left=…,top=…"`. `chromeFeatures` default `popup=yes,toolbar=no,menubar=no,location=no,status=no,scrollbars=yes,resizable=yes`. Still **no** `noopener` / `noreferrer`.
4. `windowName` constant **`kdbWienKiAssist`** (not `kdbWienKi`, not `kdbHelp`). PO 2026-09-13: changing overshoot on the existing named window did **nothing** — Chrome reused a full browser window from the POC / first open, where `resizeTo` is a no-op. A new name forces a real popup that can be sized. User must close the old “Wienbot Widget” window once.
5. `var win = window.open(url, windowName, features)` — **synchronous on the click** (no `await` / `rAF` / `setTimeout` before open). Call `window.open`, not `window.top.open`.
6. If `win` is falsy: one tagged `console.warn` `[wienKiControls.openWienKiPopup]` + `WIENKI_POPUP_BLOCKED`; no `showAlert`
7. If `win` is an object: apply box + shortfall close (step 2), then `try { win.opener = null; } catch (e) {}` then `try { win.focus(); } catch (e) {}` — **every** open, including reuse (the spec re-attaches opener). The `setTimeout(0)` shortfall retry may run after `opener = null`.
8. Do **not** put `noopener` / `noreferrer` in the features string (kills named reuse). `opener = null` is the hygiene step.
9. Do **not** append query/hash. Do **not** read `_KDB.state` or Cognos. Do **not** store `win` on runtime.
10. Re-click with the same name **navigates** the existing popup (may reload the chat). Accepted — same as the PO POC. Do not invent a stored-Window “focus only” path.

Remount: **re-query** the host; **always move** the existing root immediately before the PDF node (else history / `firstChild`). Short-circuit only when `nextSibling` is already that anchor. **Do not** copy PDF `same host && root still attached → sync only`.

Empty / non-https URL at `finishMount`: `serviceAvailable: false`, root `is-unavailable`, button `disabled`, click no-op. Warn once (`[wienKiControls.mount]`).

`mount` after `destroy` is a no-op + `console.warn`. `destroy` is idempotent. `_isDisposed` before runtime clear.

---

## 11. Bootstrap

`KDB.js` (wiring-only, 500-line exception):

- AMD import `__orchestratorWienKiControls.js`
- `registerFeatureModules`: after PDF, before Share
- `mountFeatureModules`: `_KDB.api.wienKiControls.mount({})` **after PDF, before Share** (Share remount re-asserts leftmost)
- `destroyRegisteredFeatures`: next to `pdfExportControls` / `shareControls`, **before** message / cognosHost teardown

`core/config/dashboardSettings.js`: `wienKiUrl: "https://wienki.intern.wien.gv.at/assistant/#/chat"`

`shareControls.md` + `toolbarControls/toolbarHost.js` (`BUTTON_ORDER`): leftmost set = **WienKI + PDF + History** (leftmost-in-document-order). Visual **Share \| WienKI \| PDF \| History**.

---

## 12. Icon and copy

`_KDB.config.labels.de.wienKiControls` (orchestrator `Object.assign({}, defaults, existing)`; existing wins):

| Key | German |
|---|---|
| `buttonTitle` | `Wien-KI` |
| `buttonAccessibleName` | `Wien-KI öffnen` |
| `dialogTitle` | `Wien-KI` |
| `dialogMessage` | `Der Wien-KI-Assistent kann Fragen beantworten, wie Sie etwas im Konfigurierbaren Personaldashboard (KDB) tun. Damit die Assistenz den Zusammenhang Ihrer Frage kennt, kopieren Sie zuerst den folgenden Prompt. Klicken Sie anschließend auf „Wien-KI öffnen“, fügen Sie den Prompt im Chat ein und starten Sie die Unterhaltung.` |
| `starterPrompt` | `Ich habe eine Frage zum Konfigurierbaren Personaldashboard (KDB) aus der Wissensdatenbank.` |
| `openChatLabel` | `Wien-KI öffnen` |

- `buttonAccessibleName` → `aria-label`; `buttonTitle` → `title` + clipped `__label`
- User-facing German says **Wien-KI**, not bare “KI”. The toolbar SVG still shows letters **KI** inside the bubble (24×24; “Wien-KI” would not fit).
- `dialogTitle` / `dialogMessage` / `starterPrompt` / `openChatLabel` are live instruction-dialog copy (`wienKiControls-instruction-dialog-contractdelta.md`).
- Icon: 24×24 `viewBox` inline `<svg>` displayed at **24×24** (not `<img>`), **filled** speech-bubble + evenodd **knockout** letters `KI` (not an outline ring with tiny filled letters; not `<text>`), `fill="currentColor"`, `aria-hidden` + `focusable="false"` on the graphic. Letters must stay readable at toolbar size. Optical nudge: `__icon` `translateY(1px)` so the bubble body lines up with Share/PDF (the tail otherwise sits the glyph high).
- Data attrs `="true"`: `data-kdb-wien-ki-controls`, `data-kdb-wien-ki-button`, `data-kdb-wien-ki-icon`, `data-kdb-wien-ki-label`
- Root class `.kdb-wien-ki-controls` + `__item` / `__button` / `__icon` / `__label`
- Focus: visible button focus (do not remove outline). No `pluginContainer` / `ba-common-toolbar__item` on the root.

---

## 13. Out Of Scope

- Iframe / `widget.js` / `<wm-wienbot>` — dead end (WienKI + WienBot). Not this product
- Further popup flush / overshoot / feature-token hunts — closed
- Sending or attaching the handbook PDF — PO uploads to chat or bot; not KDB
- Dashboard PDF export — `pdfExportControls` / `dashboardPdf`
- Header / kdbControl Benutzerhandbuch links — those owners
- Read-only share hide-set (toolbar icon stays; no panel to hide)
- `widgets/widgetHiding.css` (former `pdfCapture.css`) (action bar is outside capture root)
- Cognos facet ops
- Closing or tracking the popup on `destroy`
- Calling `message.destroy()` from this module
- English UI copy

---

## 14. Open questions

PO is choosing WienKI chat vs WienBot and will ingest the KDB handbook there. When the start URL is known, change **only** `links.wienKiUrl` in `core/config/dashboardSettings.js` (absolute `https:`). No other module work for that switch.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-13 | `Draft` | Coordinator | PO: popup POC perfect; handbook PDF by PO; army then implement |
| 2026-09-13 | `Draft → Implementing` | PO vastenburg (auto-go after army) | Army YELLOW→patched: remount-move, https-only URL, 3-way Share leftmost, re-click navigate accepted |
| 2026-09-13 | `Implementing` | PO vastenburg | Icon too small vs Share/PDF; popup left a vertical gap. Filled 24px KI knockout; work-area height + `resizeTo` |
| 2026-09-13 | `Implementing` | PO vastenburg | Top flush; bottom + right still open. `rightInsetPx` 0; Win DWM `frameOvershootPx` 8; live outer shortfall close |
| 2026-09-13 | `Implementing` | PO vastenburg | Last hairline: `frameOvershootPx` 16 + `moveBy`/`resizeBy` cap; no live-`screenY` height |
| 2026-09-13 | `Implementing` | PO vastenburg | 8/16 overshoot changed nothing. New name `kdbWienKiAssist` + popup chrome features + align to host outer |
| 2026-09-13 | `Implementing` | PO vastenburg | Iframe dead (chat + bot). Resize/flush closed; hairline accepted. PO picks chat vs bot and loads the handbook there |
| 2026-09-13 | `Implementing` | PO vastenburg | URL → WienKI assistant `/assistant/#/chat`. Prompt-context UX still undecided (no query param yet) |
| 2026-09-13 | `Implementing` | PO vastenburg | Visible copy: Wien-KI (not KI). Starter prompt + dialog strings in labels; dialog not built yet |
| 2026-09-14 | `Implementing` (instruction dialog Approved) | PO vastenburg (auto) | Parent one-liners from `wienKiControls-instruction-dialog-contractdelta.md`. JS via execution spec. |
| 2026-09-14 | `Implementing → Implemented` | PO vastenburg Cognos green | Instruction dialog live. Handbook ingest + chat-vs-bot URL remain PO. |
