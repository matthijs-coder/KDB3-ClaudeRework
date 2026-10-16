# Execution Spec: Global `notify(info)` WP2 KDB card

> Mechanical spec for Grok 4.6. Architecture lives in `messageService-info-notify-kdb-duration-contractdelta.md`. Do **not** re-decide S1/M1, Glass clone, a new method, or writeback callers. **Follow-up 2026-09-09:** global default **15000**; center stack in `.dashboardFrame` (viewport fallback). WP2 anchored stays 5000 / below-filter.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo every row in Section A **then write files in the same turn**.

---

**Status:** `Reviewed` — follow-up 15000 + center; restack FAIL closed. Cognos pending.  
**Module / contract:** `contracts/messageService.md` + `contracts/messageService-info-notify-kdb-duration-contractdelta.md`  
**Phase:** `extension`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09  
**Executing AI:** grok 4.6 army  
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Follow-up allowlist (2026-09-09 — 15s + center)

**May edit only:**

- `KDB3/js/core/services/messageService/view/positionGlobalNotification.js`
- `KDB3/js/core/services/messageService/view/renderGlobalNotification.js`

**Must not edit:** `renderAnchoredNotification.js` (keep 5000); `presentNotify.js`; `createMessageService.js`; CSS; writeback; `KDB.js`.

---

## Exclusive allowlist (one writer)

**May create:**

- `KDB3/js/core/services/messageService/effects/presentNotify.js`
- `KDB3/js/core/services/messageService/view/renderGlobalNotification.js`
- `KDB3/js/core/services/messageService/view/positionGlobalNotification.js`

**May edit:**

- `KDB3/js/core/services/messageService/createMessageService.js` (swap `showGlassToast` import → `presentNotify`; thin `notify` passes `closeLabel`; AMD **stays 5**; ≤150)
- `KDB3/js/core/services/messageService/runtime/ensureMessageRuntime.js` (`domRefs.globalNotifications = []`)
- `KDB3/js/core/services/messageService/runtime/clearMessageRuntime.js` (reset object includes `globalNotifications: []`)

**Must not edit:** `showGlassToast.js`; `createAnchoredNotification.js`; `renderAnchoredNotification.js`; `positionAnchoredNotification.js`; `createMessageRoot.js`; `messageService.css`; `__orchestratorMessageService.js`; `createWritebackSetService.js`; `notifyRestoreOutcome.js`; `presentPendingUrlShareMessage.js`; `notifyDienststelleEmptyOk.js`; `notifyZoomHint.js`; `warnSettingsMessage.js`; tab confirm effects; `KDB.js`; parent `messageService.md` (captain after Cognos); WP2/SSS/writeback deltas; `.cursor/rules/*.mdc`; git.

**Must not create:** `helpers/` / `common/` / `shared/`; a new public method; a second portal; CSS class `top`/`right` on `.kdb-message-notification`; a fake DOM anchor.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` via argument; no new top-level namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — this slice writes no `_KDB.state`; notifications are runtime DOM.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — timers/listeners on `_KDB.runtime.messageService`; `globalNotifications` is a `domRefs` array, not a new bucket name.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new named method; `notify` stays; disposed guard already on `notify`.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150; AMD ≤10; split by job; no silent grow.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files; `_` on boundary inputs; no leftover `Support`/`Helpers`.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on named executables; boundary `notify` converts (log, no throw); Glass fallback is convert, not a silent catch.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — live nodes in `runtime.messageService.domRefs`; card `querySelector`; one catalog `document.querySelector` for `.dashboardFrame` is the contracted positioning exception.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; factory-scope helpers; no nested functions in entry bodies; no ES modules.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle terms.
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — global info does **not** call `_KDB.cognosAPI`; Glass stays stamped `messagesFacet` inside `showGlassToast.js` only.
13. `_____________KDB3API/contracts/messageService-info-notify-kdb-duration-contractdelta.md` — law: S1+M1+D1b 15000, × or timer, **horizontal center + top of dashboardFrame** else viewport, no `findDuplicate`, no `anchoredNotifications` reuse.
14. This execution spec.

Copy live patterns (read, do not edit): `renderAnchoredNotification.js` (timer, × click, remove); `createAnchoredNotification.js` (card); `showGlassToast.js` (Glass args); `createMessageService.js` `notifyAnchored` `closeLabel`.

---

## Section B. Folder tree (create / edit order)

```
KDB3/js/core/services/messageService/
  runtime/ensureMessageRuntime.js          (edit)
  runtime/clearMessageRuntime.js           (edit)
  view/positionGlobalNotification.js         (new)
  view/renderGlobalNotification.js           (new)
  effects/presentNotify.js                 (new)
  createMessageService.js                   (edit)
```

No new folders. No CSS file.

---

## Section C. Per-file specifications

#### `KDB3/js/core/services/messageService/runtime/ensureMessageRuntime.js`

- **Role:** runtime ensure
- **Lines:** target 27 (hard 40). Live ~25.
- **AMD imports:** none (keep `define([], ...)`)
- **Change:** after `anchoredNotifications` init, add `runtime.domRefs.globalNotifications = runtime.domRefs.globalNotifications || []`.
- **Must not:** new bucket names; rename `anchoredNotifications`.
- **Rules to apply:** `runtime.mdc` — owner-private `domRefs`; `amd.mdc`; `naming.mdc`; `feature-structure.mdc` size.

#### `KDB3/js/core/services/messageService/runtime/clearMessageRuntime.js`

- **Role:** destroy cleanup
- **Lines:** target 56 (hard 80). Live ~55. AMD stays 1 (`ensureMessageRuntime.js`).
- **Change:** in the reset object `domRefs`, add `globalNotifications: []` next to `anchoredNotifications`. Keep existing timer/listener/observer/portal teardown (portal remove already drops nodes).
- **Must not:** skip existing `clearTimers` / `removeListeners`; invent a second portal remove.
- **Rules to apply:** `runtime.mdc` — abort/remove then reset; `error-handling.mdc` (file stays as-is for try/catch ownership); `amd.mdc`; `naming.mdc`.

#### `KDB3/js/core/services/messageService/view/positionGlobalNotification.js`

- **Role:** view placer (position only)
- **Lines:** target 70 (hard 120)
- **AMD imports:** none (`define([], ...)`)
- **Factory-scope helpers:**
  - `readStackOffset(records, record)` — sum `offsetHeight + 8` of **preceding** records.
- **Entry:** `__controller(_runtime, _record, _box)`
  1. If `!_record` or `!_record.notificationEl` return `false`. `_box` must have finite `left`, `top`, `width`, `height`; else return `false`.
  2. Horizontal: `left = _box.left + ((_box.width - cardWidth) / 2)`.
  3. Vertical: `top = _box.top + 8 + readStackOffset` (**top of frame**, not vertical center). Drop `readStackHeight` / group-middle.
  4. Clamp `left`/`top` into `_box` with 8 px inset.
  5. Set `notificationEl.style.left` and `.top` to rounded px.
  6. Return `true`.
- **Return:** boolean
- **Rules to apply:** `dom.mdc` — no `document.querySelector` in **this** file (box comes from render); `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `KDB3/js/core/services/messageService/view/renderGlobalNotification.js`

- **Role:** view builder+placer for global info cards
- **Lines:** target 130 (hard 150)
- **AMD imports (order):**
  - `"./createAnchoredNotification.js"`
  - `"./createMessageRoot.js"`
  - `"./positionGlobalNotification.js"`
- **Factory parameters:** `_createAnchoredNotification`, `_createMessageRoot`, `_positionGlobalNotification`
- **Factory-scope helpers:**
  - `readCenterBox(_KDB)` — `selector = _KDB.elements.selectors.root.dashboardFrame`. If a non-empty string, `document.querySelector(selector)` (positioning exception). Connected → `{ left, top, width, height }` from `getBoundingClientRect()`. Else viewport `{ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }`.
  - `removeNotification(_KDB, record)` — same teardown as live (timer delete, listeners, splice `globalNotifications`); then `repositionAll(_KDB)`.
  - `repositionAll(_KDB)` — `box = readCenterBox(_KDB)`; for each `globalNotifications` record, `_positionGlobalNotification(runtime, record, box)`.
  - `handleClose(_KDB, record)` — `removeNotification(_KDB, record)`.
  - `registerListener` — copy the anchored pattern.
- **Entry:** `__controller(_KDB, _options)`
  1. try/catch. On catch: `console.error("[messageService.renderGlobalNotification] failed", err)`; return `null` (do **not** call `notify` / `notifyAnchored` / `showGlassToast`).
  2. `runtime = _KDB.runtime.messageService`. If missing, return `null`.
  3. `options = _options || {}`.
  4. `portalEl = _createMessageRoot(_KDB)` (existing document-root exception).
  5. Build record: `id = "message-notification-" + runtime.domRefs.nextNotificationId` (then increment); `listeners: []`; `notificationEl = _createAnchoredNotification(portalEl.ownerDocument, options)`; **no** `anchor`; **no** `dedupeKey` / `findDuplicate`. Numeric-only id is forbidden (presentNotify would Glass-fallback while the card remains).
  6. `portalEl.appendChild`; push onto `runtime.domRefs.globalNotifications` (**not** `anchoredNotifications`).
  7. If `.kdb-message-notification__close` exists on **the card** (`notificationEl.querySelector` only), click → `handleClose`.
  8. `window` `resize` and `scroll` → `repositionAll(_KDB)` so the stack stays centered on the frame. **No** `MutationObserver`.
  9. After append/`didAppend`: **`repositionAll(_KDB)`** so existing cards re-center as a group (do not position only the new record). If `_positionGlobalNotification(runtime, record, readCenterBox(_KDB))` is still falsy: `removeNotification(_KDB, record)`; return `null`. Keep `didAppend` catch cleanup.
  10. `durationMs = isFinite(options.durationMs) ? Math.max(0, Number(options.durationMs)) : 15000`. If `> 0`, `runtime.timers[record.id] = setTimeout(handleClose.bind(null, _KDB, record), durationMs)`.
  11. Return `record.id`.
- **Return:** id string or `null`
- **Rules to apply:** `amd.mdc` no nested functions in `__controller`; `dom.mdc` card `querySelector` plus **one** catalog `document.querySelector` for dashboardFrame; `runtime.mdc` timers+listeners; `error-handling.mdc` try/catch convert to `null`; `naming.mdc`; `feature-structure.mdc` ≤150; `cognos-adapter.mdc` — no cognosAPI.

#### `KDB3/js/core/services/messageService/effects/presentNotify.js`

- **Role:** effect / notify transport branch
- **Lines:** target 45 (hard 80)
- **AMD imports (order):**
  - `"./showGlassToast.js"`
  - `"../view/renderGlobalNotification.js"`
- **Factory parameters:** `_showGlassToast`, `_renderGlobalNotification`
- **Factory-scope helpers:**
  - `function isInfoSeverity(_severity)` — `true` iff `_severity == null || _severity === "" || _severity === "info"`. `"success"` / `"warning"` / `"error"` / any other non-empty string → `false` (Glass).
- **Entry:** `__controller(_KDB, _options)`
  1. try/catch. `options = _options || {}`.
  2. If `!isInfoSeverity(options.severity)`: return `_showGlassToast(_KDB, options)`.
  3. `id = _renderGlobalNotification(_KDB, options)`. If `id` is a non-empty string, return `id`.
  4. Else: **one** `_showGlassToast(_KDB, options)` (restore must not go silent). Never call `notify`.
  5. catch: `console.error("[messageService.presentNotify] failed", err)`; try `_showGlassToast(_KDB, options)` once; if that throws, log and stop (no rethrow).
- **Return:** whatever Glass returns, or the global id, or `undefined`
- **Rules to apply:** `error-handling.mdc` convert at this effect; `cognos-adapter.mdc` Glass only via `showGlassToast`; `amd.mdc`; `naming.mdc`; `feature-structure.mdc`; `module-public-api.mdc` — this file is not a public method.

#### `KDB3/js/core/services/messageService/createMessageService.js`

- **Role:** service factory
- **Lines:** target 142 (hard 150). Live 138. **AMD stays 5.**
- **AMD imports (order):**
  - `"./effects/createModalQueue.js"`
  - `"./effects/presentNotify.js"`  ← replaces `showGlassToast.js`
  - `"./runtime/clearMessageRuntime.js"`
  - `"./runtime/ensureMessageRuntime.js"`
  - `"./view/renderAnchoredNotification.js"`
- **Change `notify` only:** after disposed guard, `options = Object.assign({}, _options || {}); options.closeLabel = options.closeLabel || context.labels.close;` then `_presentNotify(context._KDB, options)` inside existing try/catch. **Do not `return` that value** (`notify` stays `undefined` per parent overlay). Keep `logPublicError("notify", ...)`.
- **Must not:** add a public method; change `notifyAnchored` except that its existing `notify.bind` fallback now hits this `notify` (no code change required if bind stays).
- **Must not:** nest new functions inside `notify`. `Object.assign` in `notify` is fine; if line count would exceed 150, stop and report (do not split by leftover `Support` name).
- **Rules to apply:** `module-public-api.mdc` named methods unchanged; `amd.mdc`; `naming.mdc`; `error-handling.mdc`; `feature-structure.mdc` AMD 5 / ≤150.

---

## Section D. Reducer / selectors / harness

None. Named-method service. No harness. No `KDB.js`. No CSS.

---

## Section E. Public API

- Surface stays `_KDB.services.message`.
- Methods unchanged: `notify`, `notifyAnchored`, `showAlert`, `confirm`, `choose`, `showCopyable`, `destroy`.
- `notify(info)`: KDB global card. `notify(warning|error|success)`: Glass.
- Runtime: `domRefs.globalNotifications` plus existing buckets. Destroy via existing `clearMessageRuntime` (updated reset).

---

## Section F. Acceptance (executor self-check)

1. `notify({ message, severity: "info" })` and `notify({ message })` (omitted severity) create `.kdb-message-notification--info` in `#kdb-message-root`, × unless `dismissible === false`, timer **15000** unless finite `durationMs` (including `0` = no timer).
2. `notify({ severity: "warning"|"error"|"success" })` still only `showGlassToast` (no global card).
3. Two info `notify`s overlap (stack **horizontally centered at the top** of `.dashboardFrame`, else viewport). No `code` collapse.
4. `notifyAnchored` with connected anchor unchanged (still below element, **5000**). Dead anchor still calls `notify` → info card 15000 centered.
5. No Glass `cloneNode`. No `_KDB.cognosAPI` in new files. No `findDuplicate`. No `anchoredNotifications` push for global records.
6. `createMessageService.js` AMD 5, ≤150. Writeback SET not touched. CSS not touched. `renderAnchoredNotification.js` still 5000.
7. No click-outside. Resize **and** scroll repositions globals; no MutationObserver.
8. Section A 14 echoes in the report. Section L checklist.

---

## Section G. Forbidden

Re-open S1/M1. New `messageService` method. Glass toast clone / hide. Click-outside. `helpers/` folders. Nested AMD entry-body functions. ES modules. Edit `.mdc`. Tick PROGRAM. Commit. Touch `createWritebackSetService.js`. Re-enable WP5. Change `renderAnchoredNotification.js` 5000. Dump full `messageService.md` / `KDB.js` into chat.

---

## Section H. After files

Grok dual-review (short briefs: allowlist paths + FAIL/NIT vs **this spec** and the delta). Captain patches parent one-liners only after dual review **and** PO Cognos green. Executor does not edit contracts.

---

## Section L. Reporting template

1. Pre-flight echo (14).
2. File checklist (path, lines, AMD, matches spec | deviation).
3. Deviations (path, what, why, rule).
4. Self-verification vs Section F.
5. Open questions — must be empty unless blocked; if blocked, stop (no invented architecture).
