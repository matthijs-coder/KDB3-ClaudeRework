# Module Contract: `messageService`

> CP-1 contract for one canonical, shared user-messaging capability. The service coordinates presentation and user-response signals; it does not replace `_KDB.events` and does not own consumer decisions.

---

**Status:** `Approved`
**Owner module / service:** `messageService`
**Type:** `shared service / runtime-DOM boundary`
**Authoring AI:** GPT-5.6 Sol, 2026-07-15
**Reviewed by:** PO, 2026-07-15
**Related rules:** `module-public-api.mdc`, `feature-structure.mdc`, `state.mdc`, `runtime.mdc`, `events.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## Legacy Survey

The legacy inventory was investigated read-only across `laatsteOriginal/KDB2`, `_______REDESIGN2/KDB3`, and the current `_____________KDB3API`.

The identified user-facing mechanisms reduce to these capability shapes:

1. Global Glass toasts with severity and automatic dismissal.
2. Toasts anchored below or near an element, with positioning, stacking, deduplication, timeout and close behavior.
3. Informational, warning or error dialogs with one acknowledgement action.
4. Awaitable binary confirmations, including `Ja/Nein` and `OK/Abbrechen`.
5. Awaitable dynamic choices, such as tab positions `1..N`.
6. Choice dialogs whose returned choice causes consumer-owned navigation, such as dashboard close/minimize. Live callers: tab-move (footer **Nein**) and `core/homeDialog/` (`showCancel: false`).
7. Copyable text dialogs used by dashboard sharing.
8. Fullscreen confirmation, after which the consumer calls the Cognos fullscreen wrapper.
9. Cognos-owned warning popovers proxied from widget UI.
10. Feature-owned transactional footers, loading overlays and old native `alert` calls.

Representative evidence:

- Tab delete, duplicate and move custom dialogs: `laatsteOriginal/KDB2/js/controlContainer/configurationFunctions/helpers/configurationToolboxHelpers.js:229-318,595-683,929-1045`.
- Share-link dialog and copy feedback: `laatsteOriginal/KDB2/js/generalFunctions/helpers/exportShareFunctions/exportShareDialogAndClipboardHelpers.js:64-173`.
- Parameter-set discard confirmation: `laatsteOriginal/KDB2/js/generalFunctions/helpers/uiUxFunctions/uiUxDialogsAndHomeFunctions.js:15-195` and `setupWBParameterSetFunction.js:287-608`.
- Dienststelle restore/default anchored notifications: `restoreHierarchyFromPSHelpers.js:2075-2199` and `hierarchyDefaultsHelpers.js:1193-1210`.
- Widget Top-N anchored notification: `widgetDropdownOptionHandlersHelpers.js:203-253`.
- Cube/loading navigation choices: `uiUxDialogsAndHomeFunctions.js:197-320`.
- Fullscreen prompt: `coreAndMessagingHelpers.js:86-158`.
- Cognos geodata popover proxy: `visWidgetOrchestrator.js:99-105` and `uiUxInteractionAndLayoutFunctions.js:165-192`.

Current-code findings:

- `_KDB.cognosAPI.glassMessages` already provides thin `showToast`, `showErrorDialog` and `showMessageDialog` wrappers.
- `_KDB.services.message` is not registered.
- `dashboard/canvas/kdbControl/dimensionGate.js` (`warnSettingsMessage`) already targets a provisional `_KDB.services.message.warn(...)` surface.
- Drag/drop validation still calls a non-existent flat `_KDB.cognosAPI.showToast` path.
- PDF export calls `_KDB.cognosAPI.glassMessages.showErrorDialog` directly.

The Glass footer/content mutation and Glass-toast cloning used by legacy code are not accepted as implementation patterns. They depend on host DOM details, make dialog selection ambiguous under concurrency, and cannot guarantee complete teardown.

---

## CP-1 Decisions Needed

| ID | Recommendation | Reason / trade-off |
|---|---|---|
| **Q1 Service and location** | Publish `_KDB.services.message` from `KDB3/js/core/services/messageService/`. Keep `_KDB.events` unchanged at top level. | Services use named methods (`module-public-api.mdc:110-128`); the event bus remains `_KDB.events`, not a service (`events.mdc:10-18`, `kdb-object.mdc:52-53`). |
| **Q2 Public surface** | Use `notify`, `notifyAnchored`, `showAlert`, `confirm`, `choose`, `showCopyable`, and `destroy`. Do not expose `dispatch`, `getState`, arbitrary render callbacks, or ad-hoc readers. | This covers the observed interaction shapes without a mixed public API or generic UI-host escape hatch. |
| **Q3 Rendering boundary** | Reuse `_KDB.cognosAPI.glassMessages.showToast` only for global toasts. Render service-owned KDB DOM in one document-root portal for anchored notifications and dialogs. | This explicit `dom.mdc:66-67` exception removes legacy Glass footer/content and toast-clone hacks while keeping Cognos access behind a thin wrapper. |
| **Q4 Concurrency** | Use one FIFO modal queue with exactly one active dialog. Global toasts may overlap; anchored notifications stack per anchor and suppress only an active matching `dedupeKey` on that same anchor. | This prevents the legacy “last Glass blocker” race while preserving intentional concurrent notifications. WP5 (2026-09-07) does not reopen Q4: global `notify` still ignores `code`; zoom-hint collapse stays `notifyAnchored` only — [header-footer-zoom-hint-contractdelta.md](./_archive/header-footer-zoom-hint-contractdelta.md). |
| **Q5 State/runtime** | Own no `_KDB.state` subtree. Store transient coordination only under `_KDB.runtime.messageService`. | Queue entries, Promise settlers, timers and DOM refs are forbidden in `_KDB.state` (`state.mdc:17-40`; `runtime.mdc:17-63`). |
| **Q6 Text ownership** | Callers provide feature copy. Generic German labels live under `_KDB.config.labels.de.message` and remain overridable per call. | Domain terminology stays with its owner; generic labels remain centrally consistent without turning the service into a localization router. |
| **Q7 Result/failure semantics** | Use distinct fail-closed results for `confirm` and `choose`. Existing pending requests resolve once on destroy; new async calls after destroy reject. | Binary confirmation and N-way choice must not share a misleading `confirmed` field. |
| **Q8 Events** | Emit and subscribe to no events in tranche 1. | Calls target a known owner directly. No independent consumer currently justifies fact-events (`events.mdc:33-51,69-87`). |
| **Q9 Tab duplicate** | Follow the current tabs authority: duplicate is single-click with post-result notification, not pre-confirmed. | `kdbControl-tabsCrud-contractdelta.md:42` remains authoritative unless the tabs owner contract is explicitly reopened. |
| **Q10 Tab move** | Use generic `choose` with tabs-owned opaque position ids and labels. | The service renders and returns a choice but never reads tabs state or infers positions. |
| **Q11 Copyable sharing** | Keep narrow declarative `showCopyable`; forbid arbitrary HTML/render callbacks. Optional `toggle` object is in-bounds. Optional `actionLabel` in-bounds (`messageService-copyable-action-contractdelta.md`). Copy failure leaves selectable text visible and the dialog open. | This covers sharing without creating a general-purpose portal or feature-flow host. |
| **Q12 Migration** | Migrate incrementally without flat Cognos aliases; update current consumers in the service registration tranche. | This fixes the known seams without a big-bang legacy migration. |

---

## 1. Purpose

`messageService` is the single shared capability for KDB-authored user notifications, alerts, confirmations and declarative choices.

It owns:

- choosing the approved presentation adapter;
- rendering and removing service-owned messaging DOM;
- modal queue coordination;
- anchored-notification positioning, stacking and deduplication;
- settling interactive requests exactly once;
- copy interaction inside a copyable-text dialog;
- cleanup of all owned runtime resources.

Consumers own:

- when a message is requested;
- feature-specific text and dynamic choices;
- whether domain suppression applies;
- all state mutations and follow-up actions after a result;
- mapping domain diagnostics to user-facing copy.

`messageService` is above `_KDB.cognosAPI.glassMessages` and beside `_KDB.events`. It does not duplicate or replace either surface.

## 2. Ownership

- Canonical state subtree: **none**.
- Canonical writer: not applicable.
- Initial state shape: not applicable.
- Foreign-write paths: none.

The service must not write `_KDB.state.tabs`, `_KDB.state.widgets`, `_KDB.state.filters`, `_KDB.state.dienststelle`, `_KDB.state.kdbControl`, or any other foreign subtree.

No message history, queue, Promise, DOM node, timer or active-dialog record is durable dashboard state. If durable notification history is requested later, implementation stops and this contract plus `architecture/stateOwnership.md` must be updated before code changes.

## 3. Runtime

- Owner namespace: `_KDB.runtime.messageService`.
- Cleanup trigger: `destroy()`.

| Bucket | Shape / role |
|---|---|
| `domRefs` | Service overlay root, active modal, anchored notification nodes and anchor references. |
| `listeners` | Owned DOM, focus, keyboard, scroll and resize listener records. |
| `observers` | Anchor-connectivity observers for active anchored notifications. |
| `timers` | Auto-dismiss and deferred-position timeout ids keyed by notification id. |
| `queues` | FIFO modal request descriptors, active request and monotonic request id. |
| `pendingPromises` | One-shot settlers for active or queued interactive requests, keyed by request id. |

Runtime requirements:

- No module-scope `Map`, timer registry, active request or surviving mutable singleton.
- `pendingPromises` stores only active or queued interactive `confirm`/`choose` requests **and** copyable-with-`actionLabel` handle continuations, never fire-and-forget notifications or omit-`actionLabel` copyable.
- Every queued interactive request settles exactly once.
- User dismissal settles with the method-specific fail-closed result.
- `destroy()` closes active DOM, removes queued DOM work, clears timers/listeners and settles existing interactive requests with `reason: "destroyed"`.
- A new async call after disposal returns a rejected Promise per the shared-service disposed protocol.
- An anchored notification requires a connected `Element`. If its anchor is missing or disconnects, the service downgrades it once to global `notify` and clears all anchor-bound resources.
- No other module reads or writes `_KDB.runtime.messageService`.

## 4. Public API

### Shared service

- Surface: `_KDB.services.message`.
- Style: named methods.
- Lifecycle method: `destroy()`.
- Internal disposed flag: `_isDisposed`.

All option objects are declarative. They must not contain render functions, event handlers, consumer callbacks, DOM-construction functions or feature state.

#### Shared option vocabulary

| Field | Contract |
|---|---|
| `code?` | Stable diagnostic/message code for logging and optional default deduplication. |
| `title?` | Caller-owned German title. |
| `message` | Caller-owned German body text. Required unless a method documents otherwise. |
| `severity?` | `"info"`, `"success"`, `"warning"` or `"error"`; default `"info"`. Caller-owned. Domain mapping: `toast-severity-content-rule-contractdelta.md`. Dienststelle empty-OK is a caller of `notify` / `notifyAnchored` (`dienststelle-empty-ok-toast-contractdelta.md`). |
| `dismissible?` | Whether close/Escape is permitted; defaults per method. |
| `dedupeKey?` | Suppresses a duplicate active notification; defaults to `code` when present. |

#### Methods

| Method | Input | Return | Contract |
|---|---|---|---|
| `notify(options)` | Shared fields | `undefined` | Fire-and-forget global toast through `glassMessages.showToast`; dismissal timing is Glass-managed. |
| `notifyAnchored(options)` | Shared fields plus `anchor`, `durationMs?`, `align?`, `offset?`, `maxWidthPx?` | `undefined` | Fire-and-forget KDB notification positioned relative to a caller-provided live element. Missing/disconnected anchor falls back to `notify`. |
| `showAlert(options)` | Shared fields plus `acknowledgeLabel?` | `undefined` | Queued KDB modal with one acknowledgement action. Intended for pure informational/warning/error messages. |
| `confirm(options)` | Shared fields plus `confirmLabel?`, `cancelLabel?` | `Promise<ConfirmResult>` | Queued binary decision. Confirm is the only result with `confirmed: true`. |
| `choose(options)` | Shared fields plus `choices`, `cancelLabel?`, `showCancel?` | `Promise<ChoiceResult>` | Queued declarative choice. The service returns the chosen id and performs no domain action. |
| `showCopyable(options)` | Shared fields plus `copyText`, optional `toggle` (`label`, `title`, `isChecked`, `copyTextChecked`, `copyTextUnchecked`), `copyLabel?`, `closeLabel?`, `copiedMessage?`, `copyFallbackMessage?`, optional `actionLabel` | omit `actionLabel` → `undefined`; non-empty `actionLabel` → `CopyableActionHandle` (not a native Promise) | Queued copyable dialog. Copy uses the **current** `options.copyText` after a toggle change (mutate by reference; queue does not clone the string at enqueue). Omit `toggle` → today’s textarea-only dialog. Omit `actionLabel` → Kopieren + Schließen only. Law: `messageService-copyable-action-contractdelta.md`. |
| `destroy()` | none | `undefined` | Idempotent full teardown; clears its own `_KDB.services.message` registration so a later orchestrator run creates a fresh instance. |

`anchor` may be a live element supplied for positioning, but it is stored only in runtime and never in `_KDB.state`, config or event payloads.

`choices` is a non-empty array of declarative records:

```js
[
  {
    id: "position-2",
    label: "2",
    disabled: false
  }
]
```

Choice ids are opaque strings. Tabs computes positions; navigation consumers map ids to navigation calls. The service never interprets domain ids or reads tabs state.

`showCancel` defaults **on**. Only `showCancel === false` omits the footer cancel button and does **not** render an empty actions row. Omit / `undefined` / `true` keep today’s **Nein**. `cancelLabel: ""` still does **not** hide the button. This is **not** a new method. Tab-move omits the flag. Header **×**, Escape, and backdrop dismiss stay on `dismissible` (default allowed). Home-dialog choices (`home-close` / `home-minimize`) may be equal-width and centered via a **scoped** `:has` rule in `messageService.css`; unscoped `.kdb-message-dialog__choice` (tab-move) stays hug-text.

Choice UI uses an accessible single-choice pattern with a labelled group, deterministic initial focus, full Tab support, and arrow-key movement where the selected widget pattern requires it.

#### Interactive result

`confirm` resolves a `ConfirmResult`:

```js
{
  confirmed: true,
  reason: "selected"
}
```

`choose` resolves a `ChoiceResult`:

```js
{
  choice: "position-2",
  reason: "selected"
}
```

`showCopyable` with non-empty `actionLabel` does **not** use this Promise table. It returns a `CopyableActionHandle`; `whenDone` receives `{ action: "selected" | null, reason }` per `messageService-copyable-action-contractdelta.md`. Omit `actionLabel` returns `undefined` (Share).

All cancel, dismiss, unavailable and destroy paths are fail-closed: `confirm.confirmed` is `false`; `choose.choice` is `null`.

Allowed reasons:

- `"selected"` — confirm or choice button selected;
- `"cancelled"` — explicit cancel selected;
- `"dismissed"` — close button, Escape or allowed backdrop dismissal;
- `"unavailable"` — rendering boundary failed;
- `"destroyed"` — an already-pending request was cancelled by service teardown.

The Promises do not reject for normal user cancellation, dismissal or rendering unavailability. They reject only when invocation occurs after disposal or for an explicitly documented programmer-contract violation.

#### Default labels

Generic German defaults live under `_KDB.config.labels.de.message` and are overridable per call:

- acknowledge: `OK`;
- confirm: `Ja`;
- cancel: `Nein`;
- close: `Schließen`;
- copy: `Kopieren`;
- copied feedback: `In Zwischenablage kopiert.`;
- copy fallback: `Bitte Text markieren und Strg+C drücken.`;
- untitled dialog: `Meldung`;

Callers override labels where legacy parity requires `OK/Abbrechen`.

The provisional `dashboard/canvas/kdbControl/dimensionGate.js` (`warnSettingsMessage`) call to `_KDB.services.message.warn(...)` is not a binding API precedent. Its migration target is `notify({ severity: "warning", ... })` or `notifyAnchored(...)`.

## 5. Readers / Writers

### Readers

None. The service exposes no `read*`, `getState`, queue-inspection or active-message method.

### Writers

Public methods may mutate only `_KDB.runtime.messageService` and service-owned DOM.

No consumer may:

- enqueue by writing runtime directly;
- close a dialog by removing service DOM;
- settle a pending result directly;
- mutate another module through a service choice definition.

Consumers await `confirm` or `choose`, then call their own owner API or dispatch their own action.

## 6. Events

No emitted or subscribed events in the initial contract.

Therefore:

- no `events/` folder;
- no `events/eventNames.js`;
- no `architecture/eventSubscribe.md` entry;
- no event-bus subscription bucket is needed initially.

If an independent consumer later requires a message lifecycle fact, implementation stops until the fact-event, payload, real consumer and catalog entry are approved. Message commands still use the direct service API.

## 7. Dependencies

Required dependencies:

- `_KDB` for approved namespace registration and runtime ownership;
- `_KDB.cognosAPI.glassMessages.showToast` for global Glass toasts;
- browser DOM APIs for service-owned dialogs and anchored notifications;
- `navigator.clipboard` when available for copyable content;
- injected timer functions where existing project test patterns require them.

Not dependencies:

- `_KDB.events`;
- feature APIs or feature state;
- raw Cognos `glassContext`;
- `_KDB.generalFunctions` or other forbidden legacy namespaces;
- direct writeback, tabs, filters, Dienststelle, widgetVis or navigation APIs.

The orchestrator injects dependencies. Deep files do not rediscover them through `window.top.getKDB()` or raw host globals.

## 8. Cognos Touchpoints

Allowed Cognos touchpoint:

- `_KDB.cognosAPI.glassMessages.showToast(message, severity)` for global notifications.

Not allowed:

- direct `window.__glassAppController` or `glassContext` access;
- polling for `.ba-common-dialog__blocker`;
- hiding or replacing Glass dialog footers/content;
- cloning and suppressing Cognos toast DOM;
- feature flow inside `_KDB.cognosAPI.glassMessages`.

Service-owned modal and anchored-notification markup uses `kdb-` CSS classes, accessible dialog semantics, deterministic focus restoration and complete teardown.

The service owns one document-root portal as an approved shared-overlay exception under `dom.mdc:66-67`. Live portal and message nodes remain under `_KDB.runtime.messageService.domRefs`; the service registers no `_KDB.elements.selectors.messageService` bucket (the portal root id is the fixed `kdb-message-root`).

Global and anchored notifications use appropriate `aria-live` politeness based on severity. Choice dialogs expose a labelled single-choice group and keyboard navigation. Copyable text receives focus/select-on-focus behavior so keyboard users can immediately copy it. Copyable focus trap includes `input:not([disabled])` (toggle checkbox); initial focus stays on the textarea.

Clipboard access occurs only from the copy-button user gesture. When secure-context, permission or Clipboard API access fails, the service keeps the dialog open, selects the text, shows the configured fallback message and does not reject.

The fullscreen consumer awaits `confirm` and then calls the existing Cognos fullscreen wrapper itself. The message service does not call fullscreen or navigation APIs.

The widget geodata warning remains a widget-owned Cognos-popover integration because its content and lifecycle are Cognos-owned rather than KDB-authored messaging.

## 9. Folder Layout

Target production tree after CP-1 approval:

As built (7 files, exports per file; the stylesheet is `KDB3/css/messageService.css`). `__orchestratorMessageService.js` is a shim over `index.js` (`registerMessageService`).

```txt
core/services/messageService/
  __orchestratorMessageService.js                     shim over index.js (path kept for KDB.js)
  config.js                                           ANCHORED_DURATION_MS, GLOBAL_DURATION_MS, ROOT_ID, STACK_GAP_PX, messageLabels
  copyable.js                                         appendCopyableToggle, bindCopyableToggle, copyActiveRequestText, readActionLabel, showCopyable
  dialog.js                                           bindDialog, cleanupDialog, mountDialog
  index.js                                            registerMessageService
  modalQueue.js                                       createModalQueue
  notifications.js                                    presentNotify, renderAnchoredNotification
  runtime.js                                          clearMessageRuntime, ensureMessageRoot, ensureMessageRuntime
```

Only files needed by the approved implementation are created. No empty `state/`, `events/`, `adapters/`, `helpers/`, `common/`, `manager/` or `shared/` folders.

Structural limits:

- executable files target 80-120 lines and remain below 150;
- orchestrator targets 40-80 lines and remains below 120;
- each AMD file has one `define`;
- each entry function delegates to factory-scope named helpers;
- no inline or nested subfunctions;
- at most six imports per normal executable file;
- `core/services/messageService/index.js` (`createMessageService`) coordinates named helpers and does not become a god factory;
- `__orchestratorMessageService.js` performs wiring and registration only.

Later registration target:

- `KDB3/js/core/services/__orchestratorServices.js`.

No production file is changed before this contract moves to `Approved`.

## 10. Out Of Scope

- Replacing, wrapping or renaming `_KDB.events`.
- Message history, persistence, inbox state or unread counters.
- Feature-specific text selection, localization routing or diagnostic interpretation.
- Tabs, writeback, filter, Dienststelle, widgetVis, dashboard-sharing or navigation business logic.
- Consumer suppression/re-entry flags such as parameter-set restore bypasses.
- Deriving tab positions or deciding whether duplicate requires confirmation.
- Cognos geodata popover proxying.
- Filter popup transactional controls.
- Loading overlays and progress indicators.
- Arbitrary custom HTML or caller-supplied render callbacks.
- A general-purpose portal, overlay framework or DOM manager.
- Flat compatibility aliases under `_KDB.cognosAPI`.
- Migrating all legacy call sites in the service implementation tranche.
- Fact-events without an approved independent consumer.

## 11. Approved Decisions

Q1-Q12 are approved as recorded in `CP-1 Decisions Needed`. The tabs owner contract remains authoritative for duplicate behavior: single-click without pre-confirmation.

## CP-2 Plan After Approval

1. Implement and verify the isolated service, owned DOM, queue, disposed guard and teardown.
2. Register `_KDB.services.message` through `core/services/__orchestratorServices.js`.
3. Migrate current seams first:
   - `dashboard/canvas/kdbControl/dimensionGate.js` (`warnSettingsMessage`);
   - drag/drop validation's broken flat toast call;
   - PDF export's direct Glass error dialog.
4. Replace the tabs delete native-confirm seam with awaited `message.confirm`.
5. Implement move through `message.choose` after the tabs tranche-2 execution spec is approved; duplicate remains single-click and uses post-result notification only.
6. Migrate dashboard sharing, writeback parameter-set confirmation, Dienststelle notifications and widget notifications when their owner tranches are scheduled.
7. Audit every migrated consumer for:
   - no foreign state writes;
   - caller-owned domain decisions;
   - awaited interactive result where required;
   - no hardcoded event strings;
   - full runtime cleanup;
   - no direct Glass or legacy messaging bypass.

Each consumer migration is a separate reviewable tranche. Deviations from this contract require an immediate stop and contract synchronization before implementation resumes.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-07-15 | `Draft` created | GPT-5.6 Sol | CP-1 draft after legacy/current messaging inventory; Q1-Q12 awaiting PO decision. |
| 2026-07-15 | `Draft → Approved` | PO | Q1-Q12 approved after architecture, UX/API, runtime and consumer-compatibility review; duplicate follows current tabs authority. |
| 2026-07-15 | `Approved` synchronized | GPT-5.6 Sol | CP-2 folder/runtime/result/accessibility details aligned before and during implementation; no public-surface deviation. |
| 2026-09-04 | `Approved` (read-only link) | Captain after dual review | One-liners from `shareControls-read-only-link-contractdelta.md` §9: optional `showCopyable` `toggle`; Copy reads live `options.copyText`; focus trap includes `input`. |
| 2026-09-08 | `Approved` (WP6/WP7 choose) | Captain after dual review | Optional `choose.showCancel`; default on. Home dialog passes `false`. Tab-move unchanged. No new method. |
| 2026-09-08 | `Approved` (WP6/WP7 copy/layout) | Captain after dual review + PO Cognos green | Scoped `:has(home-close)` equal-width choices in `messageService.css`. No new method. No `homeDialog.css`. |
| 2026-09-08 | `Approved` (severity content-rule) | Captain after dual review + PO Cognos green | Pointer on `severity?`: callers map tokens per `toast-severity-content-rule-contractdelta.md`. Q2 unchanged. |
| 2026-09-14 | `Approved` (copyable actionLabel) | PO vastenburg (auto) | One-liners from `messageService-copyable-action-contractdelta.md`: optional `actionLabel`; handle `whenDone`; omit-path Share unchanged. |
| 2026-09-14 | `Approved` (copyable actionLabel Implemented) | PO vastenburg Cognos green | Wien-KI instruction dialog live. Q11 still narrow. |

> When implementation diverges from the contract, stop, present the deviation, update this contract, and resume per the synchronisation clause in `feature-structure.mdc`.
