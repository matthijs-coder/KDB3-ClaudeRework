# Contract Delta: Dienststelle empty OK toast (WP2)

> User confirms an **empty** Dienststelle hierarchy. The existing default is applied. Then one user toast. Not writeback restore H2/H3.

---

**Status:** `Approved` — PO vastenburg 2026-09-08. Proposal series **locked**. Spec next; no JS until spec is ready.  
**Type:** `feature-module contract delta`  
**Program:** `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (**2** — tick only after Cognos green)  
**Naslag:** `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` §2 (facts, not law)  
**Stub:** `contracts/futureTodo/toast-message-port-wave2-2026-09-07.md` §WP2 (historical)  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-08  
**Parents:** `contracts/dienststelle.md` (§11 default-on-empty), `contracts/messageService.md`  
**OOS sibling:** `contracts/writeback-dienststelle-restore-ux-contractdelta.md` (restore `notify`s stay writeback)  
**Spec:** `contracts/dienststelle-empty-ok-toast-execution-spec.md` (write after this Approved lock)

---

## Diagnosis (contract vs live)

| Layer | Default-on-empty (S1–S6) | Empty-OK **toast** |
|---|---|---|
| `dienststelle.md` §11 | Specified | **Absent** |
| Live `dienststelle/**` | Applied (`applyDienststelleDefault.js` via userCommit / startup walk) | **Silent.** Zero `messageService` in this folder |
| Legacy | Applied | Anchored toast in `handleEmptyStelleFilter` |

This WP is **not** “codebase disagrees with parent defaulting.” Defaulting matches parent §11. The toast is a **port gap**. Do not re-implement defaulting. Do not treat restore H2/H3 copy as this toast.

---

## 1. Purpose

After a **user** OK on an empty Dienststelle selection, when the existing default path actually writes the default to eligible scopes, show the legacy German toast. Startup / PS restore / history replay stay silent for **this** copy.

User feel: **informed recovery**, not a blocked click.

---

## TODO — Proposal series (**locked** 2026-09-08)

PO: go with all recommendations. KEEP.

| # | Question | Locked |
|---|---|---|
| 1 | Toast site | **`userCommit` only, after walk’s apply loop.** Caller = `reconcileDienststelleHostScopes` `runUserConfirmAfterHostRead`. Not inside `applyDienststelleDefault`. Not `clickedOk` / route / `reconcileConfirmed`. |
| 2 | `_filterName` | Display **`"Dienststelle"`** (`visibleFilterLabel`). Not `Dienststelle_BW` / `Dienststelle_DEZPV`. Interpolate in the helper. |
| 3 | Skip set | Toast iff **`commitFromUser === true` AND `appliedCount > 0` AND `isHistoryReplay !== true`**. Covers replay, startup/`TABLE_DATA`, PS restore, S3, S6, nothing-empty, global-still-selected. **Do not** invent cascade/suppress. Empty OK **without** Clear is still `userCommit` — toast on write, not on Clear-intent. |
| 4 | One vs N | **One toast per user OK** if any scope wrote. S1 = N applies, 1 toast. |
| 5 | File split / AMD | New notify effect + `dienststelleLabels.js`. Orch merge AMD 3→4. Walk returns `{ appliedCount }` only (AMD stays 5). **Do not** grow route 148 / controller 141 / reconcileConfirmed 145. apply stays silent. |
| O1 | Severity | **`info`** |
| O2 | After vs before apply | **After apply.** S6 / all writes fail → silent. Partial N → still one toast. |
| O3 | Method / duration | **`notifyAnchored` `durationMs: 15000`** on connected dock **wrapper**. Missing → `notify`. |
| O4 | Keys in the sentence | **HOLD** display `"Dienststelle"`. |

---

## 2. Closed product decisions

| # | Lock |
|---|---|
| 1 | Owner: **`dienststelle`**. Not writeback. Not specialSingleSelect. Not `KDB.js`. |
| 2 | Trigger: filter-dock Dienststelle **OK** on an **empty** hierarchy that **writes** the active default (`appliedCount > 0`). Toast is extra; `applyDienststelleDefault.js` stays the only default applier. |
| 3 | Copy (exact DE skeleton): `Für den {filterName}-Filter ist mindestens eine Auswahl erforderlich. Ohne Auswahl wird automatisch der voreingestellte Standardwert für die (aktuellen) Reiter gesetzt.` `{filterName}` = display `"Dienststelle"` (`visibleFilterLabel`, fallback `"Dienststelle"`). German under `_KDB.config.labels.de.dienststelle.emptyOkDefaultRequired`. No DE literals in effects. |
| 4 | `_KDB.services.message.notifyAnchored` with connected wrapper; else `notify`. Severity **`info`**. `durationMs: 15000` on anchored (PO 2026-09-09; was 5000). `code: "DIENSTSTELLE_EMPTY_OK_DEFAULT"` (Glass `notify` ignores `code`; still pass it). **Do not** invent a method. |
| 5 | **Must not** toast from `applyDienststelleDefault.js` (also used at boot). |
| 6 | Skip: not user-OK `userCommit`, or `appliedCount < 1`, or `isHistoryReplay === true`. No cascade/suppress flags. |
| 7 | Parent §11 S1–S6, host-empty `null`, Option A cardinality, writeback restore UX **unchanged**. S3 / S6 → **no** this toast. |
| 8 | No new events, `_KDB` namespace, lifecycle term, or cognosHost facet. |
| 9 | Missing `notify` / `notifyAnchored`: fail-closed (`console.warn`); defaulting still ran. Missing labels: `console.warn`; **no** toast; **no** hardcoded DE in the helper. |

---

## 3. Locked mechanism

Live sizes at lock (do not grow the capped three): route **148 / AMD 10**; controller **141 / AMD 13**; `reconcileConfirmedDienststelle.js` **145 / AMD 6**.

### 3.1 Files

| File | Role |
|---|---|
| `KDB3/js/dashboard/filters/dienststelle/config/dienststelleLabels.js` | **New.** AMD 0. Flat DE object. One key: `emptyOkDefaultRequired` = lock-3 template with `{filterName}`. |
| `KDB3/js/dashboard/filters/dienststelle/effects/notifyDienststelleEmptyOk.js` | **New.** Skip + interpolate + toast. `__controller`. Factory-scope helpers. try/catch. AMD **1** (`../view/resolveScopedDienststelleFilterDom.js`). Does **not** AMD-import labels. |
| `KDB3/js/dashboard/filters/dienststelle/__orchestratorDienststelle.js` | Labels merge only. AMD **3→4**. Existing keys win: `Object.assign({}, _dienststelleLabels, existing \|\| {})`. `try/catch` on the merge only. Thin wiring. |
| `KDB3/js/dashboard/filters/dienststelle/effects/walkDienststellePageContextScopes.js` | `walkPageScopes` resolves `{ appliedCount }` (count of truthy `applyDienststelleDefault` returns). AMD **stays 5**. **Do not** change `defaultScope` return (startup uses `appliedDefault \|\| _globalValue`). Do **not** import the toast helper. Do **not** add a 4th export. |
| `KDB3/js/dashboard/filters/dienststelle/effects/reconcileDienststelleHostScopes.js` | **Only** `userCommit` branch in `runUserConfirmAfterHostRead`: after `walkPageScopes`, one helper call, then existing `finishReconcile`. AMD **6→7**. Other `.then` paths stay `function () {` (ignore walk result). |

**Must not grow / must not edit:** `applyDienststelleDefault.js`; `routeDienststelleDispatch.js`; `createDienststelleController.js`; `reconcileConfirmedDienststelle.js`; `resolveDienststelleReconcileMode.js`; `KDB.js`; `writeback/set/effects/notifyRestoreOutcome.js`; `dienststelle/actions/parameterSet/**`; specialSingleSelect; `createMessageService.js` / Glass internals; `warnSettingsMessage.js`; `resolveScopedDienststelleFilterDom.js` (call only).

**Must not add:** `helpers/` / `common/` / `shared/`; cascade/suppress flags; a stored filter-block on `runtime.dienststelle.domRefs`; new events.

### 3.2 Hook

`runUserConfirmAfterHostRead`, **only** when `mode === "userCommit"`, after `walkPageScopes`:

1. Read `appliedCount` from the walk result (`walkResult && walkResult.appliedCount`). Missing → treat as `0`.
2. Call `_notifyDienststelleEmptyOk(_KDB, { appliedCount, commitFromUser: true, isHistoryReplay: _context.isHistoryReplay === true, activeFilterKey: _activeFilterKey, visibleFilterLabel: _label, filterScope: commitSourceScope })`.
3. Then existing `finishReconcile` (same as today).

`continueAfterGlobalRead` startup / `"sync"` walks: **no** helper call.

`walkPageScopes`: initialize `appliedCount = 0`. In the existing `defaultScope(...).then`, if `appliedDefault` is truthy, increment. After the chain: `return scopeApplySteps.then(function () { return { appliedCount: appliedCount }; });`. Do not add another nested IIFE. Empty `targetScopes` → `{ appliedCount: 0 }`.

### 3.3 Helper skip + toast

`notifyDienststelleEmptyOk` `__controller`:

Skip (return, no warn) when `appliedCount` is not a number `> 0`, or `_options.commitFromUser !== true`, or `_options.isHistoryReplay === true`.

Then:

1. Read template `_KDB.config.labels.de.dienststelle.emptyOkDefaultRequired`. Missing/empty → `console.warn("[dienststelle.notifyDienststelleEmptyOk] missing label")`; return.
2. `filterName` = non-empty `visibleFilterLabel` else `"Dienststelle"`. Replace `{filterName}` in the template (all occurrences).
3. `svc = _KDB.services && _KDB.services.message`. If missing → `console.warn("[dienststelle.notifyDienststelleEmptyOk] messageService missing")`; return.
4. Anchor: `findScopedFilterWrapper(activeFilterKey, filterScope)` (`filterScope` from options; `"global"` vs `"pageContext"`). Use only if `wrapper && wrapper.isConnected === true`. **Do not** read `_KDB.runtime.filterDock`. **Do not** pass `document.body`. **Do not** add a new `document.querySelector` in this file (the view helper already owns the lookup).
5. If connected wrapper and `typeof svc.notifyAnchored === "function"`:

```js
svc.notifyAnchored({
  anchor: wrapper,
  code: "DIENSTSTELLE_EMPTY_OK_DEFAULT",
  message: interpolated,
  severity: "info",
  durationMs: 15000
});
```

6. Else if `typeof svc.notify === "function"`: `svc.notify({ code: "DIENSTSTELLE_EMPTY_OK_DEFAULT", message: interpolated, severity: "info" })`.
7. Else `console.warn` (same prefix). No throw.

Local `try/catch` on `__controller`; `console.error("[dienststelle.notifyDienststelleEmptyOk]", err)`; do not rethrow into reconcile (defaulting already succeeded). AMD factory **`return __controller`**. Skip reads `options.appliedCount` after `_options || {}`. Do **not** skip on Clear-intent.

### 3.4 Labels merge

In `__orchestrator`, after runtime ensure, before controller create:

```js
_KDB.config = _KDB.config || {};
_KDB.config.labels = _KDB.config.labels || {};
_KDB.config.labels.de = _KDB.config.labels.de || {};
_KDB.config.labels.de.dienststelle = Object.assign({}, _dienststelleLabels, _KDB.config.labels.de.dienststelle || {});
```

Existing keys win. Helper does **not** import the labels file.

### 3.5 Out of this WP (documented, not silent)

- In-flight anchored toast whose wrapper is later torn down may Glass-fallback (`messageService.md` Q4). Acceptance is “this WP does not **fire** a new toast on those paths.”
- Do not change `USER_COMMIT_DEFAULT_DELAY_MS`.
- Do not change S1–S6 default targeting.

---

## 4. Out of scope

- Re-opening S1–S6 / host-empty / Option A.  
- Writeback restore missing/fallback toasts.  
- SSS Personengruppe / Dienststellenleitung.  
- Wave 1 numbers; WP6; WP7.  
- New `messageService` method; Glass footer hacks; toast clones.  
- Inventing cascade/suppress flags.  
- Invert alert, geodata popover, Leitung banner.

---

## 5. Acceptance

1. User OK on empty Dienststelle **and** default writes → this German toast (`info`, one time). Copy contains **Dienststelle**, not `Dienststelle_BW`.  
2. Same empty OK that applies **no** default (S3 / S6 / all writes `null`) → **no** this toast.  
3. Startup / Sicht defaulting / `TABLE_DATA_CHANGED` / PS restore / history replay → **no** this toast.  
4. Restore H2/H3 copy unchanged and **not** used here.  
5. Default apply still one default-object per eligible empty scope. Toast does not apply a second default.  
6. Missing `notify` / `notifyAnchored`: fail-closed; `console.warn`; defaulting still ran.  
7. S1 with N empty tabs → **one** toast, not N.  
8. Partial N-tab write success → **one** toast; failed writes stay apply’s `console.warn`.

---

## 6. Parent one-liners (after dual review + JS, not before)

- `dienststelle.md` §11: user empty-OK that applies default also notifies via `_KDB.services.message` (this delta).  
- `messageService.md`: no surface change; Dienststelle is a new caller of existing `notify` / `notifyAnchored`.

---

## 7. Open questions

None. Mechanism locked. Cognos green 2026-09-08.

---

## Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-08 | Draft | WP2 captain | Stub → Draft. Product intent locked. Mechanism open. No JS. |
| 2026-09-08 | Draft | WP2 captain | Proposal series + second pass returned. Recommendation recorded. Waiting PO. |
| 2026-09-08 | **Approved** | PO vastenburg | Go with all recommendations (Q1–Q5, O1–O4). Mechanism locked. Spec then JS. |
| 2026-09-08 | Approved (NIT) | WP2 captain + army | Spec↔delta review: factory `return __controller`; `options.appliedCount`; no sync empty-walk return; no Clear skip. LIVE-OK. No BLOCK. |
| 2026-09-08 | JS dual-review | army A APPROVE / B APPROVE-NIT | Allowlist shipped. Waiting PO Cognos (S1/S2 toast; S3/S6/boot silent). |
| 2026-09-08 | Cognos green | PO vastenburg | Empty-OK toast as specified. Parent one-liners written. PROGRAM **2** ticked. |
| 2026-09-09 | Duration overlay | PO vastenburg | Anchored duration **15000**; still under the filter. |
