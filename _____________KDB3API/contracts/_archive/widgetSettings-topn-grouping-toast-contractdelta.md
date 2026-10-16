# Contract Delta: Top-N grouping-dimension toast (WP3)

> User picks a non-default Top-N while the widget grouping dimension is absent. Show the legacy German toast and do not apply Top-N.

---

**Status:** `Approved` — 2026-09-07 PO vastenburg. Proposal series locked. Execution spec: `contracts/widgetSettings-topn-grouping-toast-execution-spec.md` (`Reviewed`). Cognos: green 2026-09-07.  
**Type:** `feature-module contract delta`  
**Program:** `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (tick **3** only after Cognos green)  
**Naslag:** `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` §3  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-07  
**Parents:** `contracts/widgetSettings.md`, `contracts/widgetVis.md` (§7.1.2), `contracts/widgetTopN.md` (toast **not** in widgetTopN), `contracts/messageService.md`

---

## 1. Purpose

Restore the legacy info toast when Top-N is chosen without a grouping dimension. Keep the existing helper gate (`widgetVis` §7.1.2). Do not commit a Top-N value in that situation.

---

## 2. Closed product decisions

| # | Lock |
|---|---|
| 1 | Owner: **widgetSettings**. Not `widgetTopN/**`. |
| 2 | Method: `_KDB.services.message.notifyAnchored` (fallback `notify`). Severity **`warning`**. Pattern from `warnSettingsMessage.js` only — **do not import or extend** that kdbControl helper. |
| 3 | Copy (exact DE): `Um die Top-N Funktion zu verwenden, muss zuerst eine Gruppierungsdimension gewählt werden.` |
| 4 | If dimension is absent (`none` / `default` / `""` / `null`) **and** requested Top-N is **not** absent: toast (user click only), revert, **do not** dispatch `widgetVis/applyTopNChoice`, **do not** write `topNChoice`. |
| 5 | Absent Top-N (Ohne/default) stays the existing clear path — **no** this toast (still `applyTopNChoice`). |
| 6 | `widgetTopN/**` unchanged. `widgetVis` §7.1.2 / `topNGate.js` unchanged (silent `ok: true` helper backstop if a stray dispatch occurs — **not** the toast). |
| 7 | No events. No new `_KDB` namespace. Label in `_KDB.config.labels.de.widgetSettings` via widgetSettings orchestrator. |
| 8 | Startup vis/topN is **batch** `widgetVis/applyStartupSettings`. That path **never** hits `executeIntent` — no this toast on seed. Do **not** add a `source !== "startup"` skip (leftover `dispatchStartupDefault` is colour/text only). |
| 9 | Revert: `revertTopNDropdownFromState` from `widgetSettings/view/topNDropdownSafeguard.js`. Bind already selected the dropdown before dispatch. Blocked dispatch never reaches `finalizeVisIntentResult` → **the guard must revert** and must **not** call finalize (no `errorCode` / `markTopNPending` as if apply failed). |

---

## 3. Locked mechanism (proposal series 2026-09-07)

Second army pass (consequences / duplication / parents): recommendations **stand**. Sharpenings below are part of the lock.

### 3.1 Files

| File | Role |
|---|---|
| `KDB3/js/dashboard/widgets/widgetSettings/effects/validateTopNGroupingDimension.js` | **New.** One file: absent check + toast + revert. Factory-scope named helpers. try/catch. |
| `KDB3/js/dashboard/widgets/widgetSettings/config/widgetSettingsLabels.js` | **New.** Flat DE object. One key: `topNGroupingRequired` = lock-3 string. |
| `KDB3/js/dashboard/widgets/widgetSettings/__orchestratorWidgetSettings.js` | Merge labels: `_KDB.config.labels.de.widgetSettings = Object.assign({}, _widgetSettingsLabels, existing)`. AMD **4→5**. Thin wiring only. |
| `KDB3/js/dashboard/widgets/widgetSettings/effects/dispatchWidgetSettingsIntent.js` | Hook in `executeIntent` after `planned` is built, **before** `_dispatchToTargetApi`. AMD **8→9**. No extract of `executeIntent`. |

**Must not grow / must not edit:** `handleApplySetting.js`, `topNGate.js`, `actionRouter.js`, `bindWidgetSettingsPanel.js`, `finalizeVisIntentResult.js`, `widgetTopN/**`, `KDB.js`, `warnSettingsMessage.js`.

**Must not add:** `notifyWidgetSettingsWarning.js`; `gates/` / `helpers/` / `common/` / `shared/`; reason-code constants file; `executeIntent` extract; widgetSettings → `widgetBindingPlan` import (`normalizeDefaultValue.js`). widgetSettings has **zero** bindingPlan imports today — duplicate the four sentinels locally in the guard (same list as lock 4).

### 3.2 Hook

In `executeIntent`, after `planned` exists:

1. If mapped type is not `widgetVis/applyTopNChoice` (and kind is not `topN`): no-op, existing path.
2. If requested Top-N **optionKey** is absent (`none` / `default` / `""` / `null`): no-op (Ohne clear path). Do **not** use `optionValue` (`"10"` vs key `"top-10"`).
3. If committed dimension is absent: call the guard; **return its result**. Do not `_dispatchToTargetApi`. Do not `finalizeVisIntentResult`.
4. Else existing path.

Colour / dimension / aggregation / reset unchanged.

### 3.3 Dimension source

Committed widgetSettings record only: `ensureWidgetSettingsByWidget` → `record.dimension`. Missing key = absent. Same fail-closed value vis would overlay on Top-N apply (`buildDownstreamIntentAction` uses committed snapshot, not DOM).

Do **not** read the dimension dropdown DOM.

**Accepted race:** `dropdownOption` is not awaited. Top-N click while dimension apply is in-flight still sees committed `none` → toast + block. That matches what vis would apply today (committed none + next Top-N, then illegal `topNChoice` commit). User retries Top-N after dimension confirms. DOM-read would false-allow.

### 3.4 Toast + anchor

Call **only** when `planned.isHistoryReplay !== true`.

```js
_KDB.services.message.notifyAnchored({
  anchor: connectedElement,
  code: "WIDGET_SETTINGS_TOPN_DIMENSION_ABSENT",
  message: labelOrFallback,
  severity: "warning"
});
```

- `anchor` is a **live Element**, not `fieldId` (copying `warnSettingsMessage`’s input shape would miss anchored dedupe and fall back to `notify`).
- Resolve **panel-scoped** (`resolvePanel` + `panel.querySelector`), never `document.querySelector`.
- Prefer the Top-N **icon** (`selectors.byAttr(settingsIconKindAttr, "topN")`) — the option list may already be hidden. Else the Top-N dropdown container. Else `notify` (no anchor).
- `code` dedupes an **active** anchored toast on that same node (`messageService` Q4). After dismiss, a later click may toast again. Glass `notify` fallback can overlap — accepted.
- Missing `services.message`: revert + `console.warn`; still `{ ok: false, … }`. Do not copy `warnSettingsMessage` as-is (that helper does not revert).
- Do not wrap `notifyAnchored` in an extra try/catch beyond the guard’s function try/catch — the service already falls back to `notify`.

### 3.5 History replay

Replay goes through `dropdownOption({ isHistoryReplay: true })` → `executeIntent`. Same **block + revert + `{ ok: false }`**. **No** grouping toast.

**Residual (accepted, rare after this WP):** `ok: false` keeps the history pointer put and `historyService` may `notifyReplayFailed`. Returning `ok: true` would advance the pointer without applying (UI/history desync). Do not change `historyService`. After this WP the user path never writes an illegal Top-N step.

### 3.6 Return shape

```js
{ ok: false, skipped: true, reasonCode: "WIDGET_SETTINGS_TOPN_DIMENSION_ABSENT" }
```

Inline string in the guard (module already inlines `WIDGET_SETTINGS_*` codes). Binder does not toast on `ok`; `pushHistoryAfterConfirmedApply` skips when `ok !== true`. Do **not** return `{ ok: true, skipped: true }` or `null` (those still push history).

### 3.7 Out of this WP (documented, not silent)

- Parameter-set restore / vis history **batch** / seed `applyStartupSettings` can still write settings including `topNChoice` **outside** `executeIntent`. Guard does not see them. Not this toast. Do not extend the hook to those paths in this WP.
- Do not write `record.errorCode` on this block (that is finalize’s failed-apply path).

---

## 4. Acceptance

1. Dimension Ohne + user picks Top-10 → grouping toast; dropdown back to last committed Top-N; **no** `applyTopNChoice`; no helper run; no history step.  
2. Dimension real + Top-10 → existing pipeline, no this toast.  
3. Top-N Ohne → no this toast.  
4. Missing messageService → revert + `console.warn`; still no dispatch.  
5. Startup seed → no this toast.  
6. Option undo/redo of Top-N with absent dimension → no grouping toast; no dispatch; dropdown reverted; history pointer unchanged.

---

## 5. Parent one-liners (after dual review of JS, not before)

- `widgetSettings.md` vis dropdown safeguard: absent-dimension Top-N user pick is blocked with messageService **before** dispatch; not a failed apply.  
- `widgetTopN.md`: “WP3: settings owns the toast.”  
- `widgetVis.md` §7.1.2: unchanged one-liner (helper still no-ops when dimension absent).

---

## Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-07 | Draft | coordinator | Wave 1 WP3. |
| 2026-09-07 | Draft (patched) | review captain | Pre-dispatch candidate. Guard must revert. |
| 2026-09-07 | Draft | review captain | PO: proposal series TODO; mechanism not locked. |
| 2026-09-07 | Draft — series **locked** | coordinator + army | Q1–Q7 stand. AMD 8→9. Element+`code` (not fieldId). Local sentinels (no bindingPlan import). Replay silent for this toast. Awaiting PO Approved. |
| 2026-09-07 | **Approved** | PO vastenburg | Mechanism locked. Spec next; JS after spec review. |
| 2026-09-07 | Cognos **green** | PO vastenburg | WP3 live. Program box 3 ticked. Spec `Reviewed`. |
