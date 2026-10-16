# Contract Delta: max widgets per tab toast (WP4)

> Drop finds no eligible launchpad shell on that tab/pad. Tell the user. Do not pretend Cognos id resolution failed.

---

**Status:** `Approved` — PO vastenburg **Approved A** (tracked one-pass) 2026-09-07. Tick PROGRAM **4** only when Cognos green.  
**Type:** `feature-module contract delta`  
**Program:** `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (tick **4**)  
**Naslag:** `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` §4  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-07  
**Parents:** `contracts/widgetBase.md`, `contracts/launchpad.md`, `contracts/messageService.md`, `contracts/dragDrop` consumers of `canvas:dropValidated`

---

## 1. Purpose

Legacy showed a global toast when `getWidgetFromLaunchpad` had no unclaimed slot. Current returns `WIDGET_BASE_WIDGET_ID_MISSING` with no UI. This delta adds the user toast on **eligible-list exhaustion** for **user drop** only.

---

## 2. Closed product decisions

| # | Lock |
|---|---|
| 1 | Owner: **widgetBase**. Call site: `effects/subscribeDropValidated.js`. Must not grow `handleDropCreate.js` (117 / AMD **13**) or `createWidgetBaseController.js` (140 / AMD **28**). |
| 2 | Surface: `_KDB.services.message.notify`. Severity: **`warning`**. No `showAlert`. No `notifyAnchored`. No new messageService method. No Glass toast clone. |
| 3 | Copy (exact DE): `Die maximale Anzahl von Widgets pro Tab ist bereits in Verwendung` |
| 4 | Fire **only** when the eligible launchpad widget-id list for that pad+tab is **empty**. English `"No eligible widget shell could be claimed."` / `WIDGET_BASE_WIDGET_ID_MISSING` is **shared** — **not** a toast predicate. **Do not mint** `WIDGET_BASE_LAUNCHPAD_EXHAUSTED`. |
| 5 | Launchpad remains environment-only: no toast in `launchpad/**`. Claim via `_KDB.api.launchpad.dispatch` only. No `_KDB.state.launchpad` writes. No `_KDB.runtime.launchpad` reads. |
| 6 | History replay: **no** toast (replay never hits this subscriber). GET/PS restore and tab-duplicate via `placeSerializedWidgetEntry.js`: **no** toast. |
| 7 | Label: `_KDB.config.labels.de.widgetBase.maxWidgetsPerTab`. Seed from `__orchestratorWidgetBase.js` (inline one-key, existing-wins `Object.assign`). No extra labels AMD file. |

---

## 3. Locked mechanism (proposal series + second pass)

### 3.1 Call site

`canvas:dropValidated` → `subscribeDropValidated` factory-scope helper **starts** `widgetBase/dropCreate` (`Promise.resolve(_dispatch(...)).then/.catch`), same shape as `subscribeTabsChanged.js` `dispatchEnsureRouted`.

- Do **not** `await` inside the bus callback. `createEventBus` ignores handler returns; an `async` nested callback is an AMD FAIL.
- After the Promise settles: toast iff `result.ok !== true && result.isEligibleListEmpty === true`.
- Missing / disposed `messageService`: `console.warn`, no throw. Pattern: `publishValidatedDrop.js` `showValidationWarning` (copy the pattern, **not** the function; dragDrop keeps its own copy).
- No `code` / `dedupeKey` (global `notify` does not honor them; two full-pad drops → two warnings is OK).
- **No** sibling `notifyLaunchpadExhausted.js` (overdesign: one caller, subscribe has room, 27 → ~50–60 / AMD 0).

### 3.2 Exhaustion flag (not a public error code)

`normalizeDispatchResult.js` already copies `reasonCode`. **Do not** reuse `reasonCode` for this toast — live `reasonCode` is skip vocabulary (`HOST_WIDGET`, `WRITEBACK_TABLE`, `NON_FINAL_PREVIEW`, …).

Use boolean **`isEligibleListEmpty: true`** on the `ok: false` missing-shell result. `normalizeDispatchResult.js` copies that key **only when `true`** (omit `false`). Subscriber predicate stays `=== true`. Do not add it to `widgetBase.md` §14 error taxonomy. Do not name it `WIDGET_BASE_*`.

`handleDropCreate.js` already returns `_normalizeDispatchResult(claim)` when `claim.ok !== true` — **do not edit that file**. The flag flows if `resolveDropClaim` puts it on the missing-shell object.

### 3.3 Where to stamp (false-positive / ghost-widget gates)

`claimFromPad` today returns `null` for (1) launchpad API missing, (2) `readSlotWidgets.ok !== true`, (3) `ok === true` and `claimFirstEligibleFromDiscovery` returns null.

**Stamp only (3).** API-miss and read-fail stay bare `null` → existing `WIDGET_BASE_WIDGET_ID_MISSING`, **no** toast.

Then, at `metricsTreeLeaf` / `toolboxTextButton` **exclusive pad exits only**, copy the flag onto `missingShellResult`. Visualization/text that **falls through** to `resolveDirectClaim` must **not** inherit the flag (originId / payload miss is not this copy).

**Ghost widget:** `if (claim)` in `resolveDropClaim.js` must not treat an exhaustion sentinel as a shell. Keep `claimFromPad` returning `null` for (1)(2); for (3) return a **non-claim** marker **without** `widgetId`, and gate success with `claim && claim.widgetId`. Never `{ ok: true, widgetId: claim.widgetId }` from a flag-only object.

**`hasContent` — Approved package A (tracked one-pass):**

- Host (`cognosHostService.md`): not `ok && data === true` → ineligible, **continue**. Do not abort the pad.
- Facet missing (`isHasContentEvaluable !== true`) with children → `null`, **no** stamp.
- Empty pad (`ok === true`, `widgets: []`) → `emptyListMarker()` (no `hasContent` needed).
- `claimFirstEligibleFromDiscovery`: **one** `while`. Skip unevaluable ids; track `sawUnevaluable` (name may vary). Return the first `claim && claim.widgetId`. After no `widgetId`: if any unevaluable was seen → `null` (no German toast); else → `emptyListMarker()`.
- **Must not:** two-pass first-`while` abort; `{ hasContentUnevaluable: true }` sentinel; naive-delete of unevaluable tracking (that is option B: false DE copy when host `hasContent` failed).

### 3.4 Restore / duplicate

`placeSerializedWidgetEntry.js` (150 / AMD 7) remaps failed claims to `WRITEBACK_WIDGET_RESTORE_FAILED` and **drops** extra fields. Do not toast there. Duplicate uses the same helper. Do not touch that file.

### 3.5 Allowlist (exclusive)

Predecessor landed subscribe / orch / ghost-gate / `missingShellResult` omit-on-flag before Approve. Remaining patch after Approved A:

| File | Action | Expected |
|---|---|---|
| `widgetBase/actions/resolveDropClaim.js` | **PATCH** — tracked one-pass A; delete first-`while` abort and `hasContentUnevaluable` | keep ≤150; AMD **2** |
| `widgetBase/actions/normalizeDispatchResult.js` | **PATCH** — omit `isEligibleListEmpty` unless `true` | ~42–48; AMD **0** |

**Already landed — do not edit unless dual-review FAIL:** `subscribeDropValidated.js` (AMD **0**), `__orchestratorWidgetBase.js` (AMD **5**).

**Do not add / edit:** `notifyLaunchpadExhausted.js`, `config/widgetBaseLabels.js`, `handleDropCreate.js`, `createWidgetBaseController.js`, `placeSerializedWidgetEntry.js`, `launchpad/**`, `KDB.js`, `messageService`, `publishValidatedDrop.js`.

---

## 4. Out of scope

- Changing how many widgets exist per pad.
- dragDrop `name-conflicts-with-filter` toasts.
- Creating a new Cognos widget when the pad is empty.
- New `_KDB` namespace / new events (`canvas:dropValidated` already exists).
- Shared notify helper with dragDrop or WP8.
- Minting `WIDGET_BASE_LAUNCHPAD_EXHAUSTED`.
- Restore-burst toasts (legacy did; this program does not).

---

## 5. Acceptance

1. Visualization pad full + drop new kennzahl → warning toast with lock-3 copy; no half-placed shell.
2. Pad has a free eligible id → existing drop; no this toast.
3. Launchpad not ready / API missing / `hasContent` unevaluable / originId miss / direct-claim miss → existing error code; **not** this copy.
4. Replay miss → no toast.
5. GET/PS restore miss and tab-duplicate miss → no toast.
6. Missing `messageService` → console, no throw.
7. `handleDropCreate.js` AMD stays 13; controller AMD stays 28; `placeSerializedWidgetEntry.js` stays 150.

---

## 6. Parent one-liners (after dual review, not writers)

- `widgetBase.md` dropCreate: exhausted eligible list on **user drop** → `message.notify` warning with `labels.de.widgetBase.maxWidgetsPerTab`; other missing-id causes stay coded. No new error-code name. Dispatch result may carry `isEligibleListEmpty` (not an error taxonomy entry).

---

## 7. Open questions

None for WP4. Severity = warning (PROGRAM). Restore toast = no. Empty pad and evaluable all-ineligible share one copy.

---

## Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-07 | Draft | coordinator | Wave 1 WP4. |
| 2026-09-07 | Draft (patched) | review captain | Shared missing-id is not exhaustion. |
| 2026-09-07 | Draft | review captain | PO: proposal series TODO; mechanism not locked. |
| 2026-09-07 | Draft (mechanism proposed, not Approved) | coordinator | Series recommendation written in; spec+JS followed without PO Approved. Three-way re-review. |
| 2026-09-07 | Draft | coordinator | Struck prior “Locked/Reviewed” rows — PO had not Approved. |
| 2026-09-07 | `Approved` | PO vastenburg | Package **A**: tracked one-pass `sawUnevaluable`; normalize omit-unless-true; then army patch. |
| 2026-09-07 | dual-review | captain | Mechanical + semantic APPROVE. Parent dropCreate one-liner written. Cognos pending. |
| 2026-09-07 | Cognos green | PO vastenburg | PROGRAM **4** ticked. Copy lock unchanged (legacy DE). |
