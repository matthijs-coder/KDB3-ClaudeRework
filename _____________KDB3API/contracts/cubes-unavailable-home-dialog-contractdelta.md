# Contract Delta: cubes unavailable home dialog (WP6)

> Legacy boot snapshot of Cognos DataSources `getState() === "error"` → Type2 two-action home dialog. Current tree has no live detector and no this dialog. Wave-2 investigation **#6**. WP6 owns the shared two-action chrome WP7 will reuse. This file does **not** write WP7’s delta.

---

**Status:** `Implemented` — Cognos green 2026-09-08 (PO). Settlement + copy/layout shipped. PROGRAM **6** `[x]`.  
**Type:** `shared-service consumer contract delta` + cognosHost consumer + `KDB.js` wiring  
**Program:** `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (**6** `[x]` — Cognos green 2026-09-08)  
**Naslag:** `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` §6  
**Stub:** `contracts/futureTodo/toast-message-port-wave2-2026-09-07.md` §WP6 + review notes WP6 + Open Questions 5–6  
**Authoring AI:** Cursor Grok 4.6 WP6 captain, 2026-09-08  
**Parents:** `contracts/messageService.md` (Legacy Survey capability **6**, Q2, Q3, Q6, Q10, `choose`), `contracts/cognosHostService.md` (D4 dataSources rule; dead-but-kept `cognosAPI.dataSources`; dashboard facet catalogue)  
**Related rules:** `feature-structure.mdc` (`KDB.js` beyond bootstrap wiring needs **explicit PO**), `module-public-api.mdc`, `kdb-object.mdc`, `error-handling.mdc`, `amd.mdc`, `naming.mdc`, `cognos-adapter.mdc`

---

## 1. Purpose

When Cognos reports a DataSources source in `error` at dashboard boot, show a blocking home dialog with two navigation actions (close dashboard / minimize to home). Chrome = body two Startseite + header `×` (no footer **Nein**). WP7 is a second caller of the same helper with watchdog copy. Do not revive the Glass Type2 footer two-button hack.

---

## Contract vs codebase (captain, 2026-09-08)

This is **not** silent drift between an approved cubes-dialog contract and live JS. There is **no** prior WP6 delta. Naslag, wave-2 stub, and live tree **agree**: the dialog is missing.

The deeper split:

| Layer | What is true |
|---|---|
| Product gap | Legacy dialog + two nav actions are absent. |
| `messageService` | Contract and code **match**. Parent **capability 6** already names this gap: *choice → consumer-owned navigation (close/minimize)*; evidence `uiUxDialogsAndHomeFunctions.js:197-320`. `choose` is N-way (`createMessageService.js:82`). Live consumer: tab-move only (`confirmAndDispatchTabMove.js:26`); tabs maps `pos-N` via `parseTargetPosition` (`:32–34`, `:63–66`). Service copies the id (`buildMessageResult.js:17–20`) and does **not** navigate (`messageService.md` ~310). |
| Detector | Legacy was a **one-shot boot snapshot**, not a poll. Live census 2026-09-08: `hasErrorDataSource` **0**, `Daten-Cubes` **0**, `cube`/`Cube` **0**, `showKDBHomeMessage` **0**, both Startseite button strings **0**, `hasError` **0**. **NO live cube detector.** |
| `cognosAPI.dataSources` | Layer-1 theme **exists** (`dataSources.js`, registered in `__orchestratorCognosAPI.js:23`) and is **dead-but-kept** (0 callers). `getDataSourceList` at `:19` is a list wrapper only — **no** `getState()==="error"` scan even in layer-1. `cognosHostService.md` §4: *“No dataSources facet until a consumer exists.”* **Code matches that contract.** Recreating the snapshot = **new cognosHost facet/op**. |
| Nav | Legacy close = `location.replace(origin + "/cognos/bi/?perspective=home")`. Legacy minimize = `openAppView("home")` then Glass X. Live: `location.replace` **0**, `perspective=home` **0**. Layer-1 `openAppView` (`dashboard.js:114`) has **0 callers** and is **not** on the dashboard facet. `getDashboardBiBaseUrl` (`getDashboardBiBaseUrl.js:21`) is the share `/cognos/bi/` prefix only. `glassMessages.js:23` `showErrorMessage` has **0 callers** — do not revive Type2. |
| `KDB.js` | Does **not** call DataSources / `openAppView` / `location.replace` / `perspective=home`. `showAlert` at `:251` is **generic render-fail**. **No** `choose(`. Line count **411** (under 500 bootstrap exception). A cubes hook is **lifecycle / feature behavior**, not AMD wiring → explicit PO. |

**Verdict:** logic exists in legacy **and** in dead layer-1 wrappers; it is **not** implemented as a consumer, and ring-1 **must not** grow a dataSources facet without PO + this (or a sibling) contract.

**Rejected as detector equivalents** (census, do not re-open):

| Candidate | Why not |
|---|---|
| tableData `markTableFailed` / `TABLE_DATA_LOAD_FAILED` / `tableData:loadFailed` (`runLoadTableWork.js:39,78,91,105`) | Generic table toast; **no other subscribers**; no cube copy; no home dialog; no close/minimize. |
| `source_ready` tables (`tables.js:16–29`, e.g. `Personal_KDBReady`) | Config + `load:true` only. **No consumer** treats them as cube-unavailable. |
| `createChromeChecks.js:136` | Chrome-selector miss `showAlert`, not DataSources `getState`. |
| `scheduleLoadingWatchdog.js:29` | Overlay timeout `finishLoading` only (WP7). |
| `api.dataSourceContext` / `resolveMetricsDataSource.js` / `contracts/dataSourceContext.md` | Metrics name-resolver stub. **Not** a Cognos DataSources error snapshot. |
| visualization `setDataSource` / binding `datasourceId` | Per-widget write/plan validation, not boot cube availability. |

---

## TODO — Proposal series (**locked** — 2026-09-08)

PO: KEEP + captain recs. Mechanism = Recommended package. **PO follow-up 2026-09-08:** Q4-D for home dialog only (`choose({ showCancel: false })`); tab-move still **Nein**. Do not re-open detector C/D/E/F. WP7 = second caller of `presentHomeChoice` (not `showAlert`).

| # | Question | Options (pros / cons) | Captain recommendation (not Approved) |
|---|---|---|---|
| 1 | **Detector** | **A. Cancel WP6.** *PO rejected 2026-09-08.* **B. WP6 is the D4 consumer.** New `cognosHost.dataSources.hasErrorDataSource`. Legacy scan `getState()==="error"` inside ring 1. **C/D** *Reject.* **E. Op on dashboard facet.** Fallback only. **F. Ring-1 flatten with no published op.** Uncallable from features. | **B — KEEP (PO).** Flatten F lives **inside** the new facet. Inner ring already lists sources; adapter adds the boolean. |
| 2 | **Dialog surface** | **A. `message.choose`.** Two opaque `{id,label}` rows; service returns id; no new method. Live: N-way already; `showAlert` = one OK (`:54`); `confirm` = binary (`:72`). **B. `showAlert`.** One OK — loses two nav actions. Correct **only** if Q1 = cancel (WP7 fallback). **C. `confirm`.** Binary `confirmed`; cannot carry two nav ids. **D. New `messageService` method.** *Forbidden* (PROGRAM). | **A if Q1 keeps WP6. B only if Q1 cancels.** Never C/D. Parent capability 6 already assigned this to `choose`. Do not revive Glass footer hacks (Q3). |
| 3 | **Who maps choose-ids → host close / minimize** | **A. `KDB3/js/core/homeDialog/`** (not a service, not `helpers`/`shared`, not inside message/loading). `presentHomeChoice.js` awaits `choose`, maps ids, injects stamped dashboard facet. WP6+WP7 AMD-import it. **B. `messageService` interprets ids.** *Forbidden.* **C. Facets message the user.** *Forbidden.* **D. loadingService / `__orchestratorServices` owns it.** Wrong owner; loading create is AMD 6 (cap); orchestrator already 11. **E. Consumer `location.replace` after reading `getDashboardBiBaseUrl`.** shareControls copies a URL; it does not navigate. Duplicate + layering smell. **F. Hardcode `origin+"/cognos/bi/?perspective=home"`.** Misses gateway prefixes the live matcher already handles. **G. Skip minimize.** Product loss of capability 6. | **A + host ops below.** Ids `home-close` → `dashboard.replaceWithBiHomePerspective` (ring 1: existing `getDashboardBiBaseUrl` `:24` + `"?perspective=home"` then `location.replace`). `home-minimize` → `dashboard.openAppView("home")` on **existing** dashboard facet wrapping layer-1 `:114` (discard thenable; do not use `readDashboardHostValue`). Fail-closed `choice === null` → no nav. **Not B–G.** |
| 4 | **Shared chrome with WP7** | **A. One helper, two copy packs.** WP6 owns the shell; WP7 is a second caller (their draft Q2 is **BLOCKED on WP6**). Live `choose` = header `×` + body N choices + **always** footer cancel (`buildMessageDialog.js:67–68`). Tab-move already uses that (`confirmAndDispatchTabMove.js:26–31`, no `cancelLabel`). **B. If Q1 cancels:** WP7 `showAlert` one-OK. **C. WP7 invents a second shell.** *Forbidden.* **D. Hide footer cancel via parent `choose` change.** Needs `showCancel: false`; omit/`""` still shows **Nein**. **E. `labels.de.homeDialog`** vs literals vs `labels.de.loading`. | **A + accept live `choose` chrome** (two Startseite body choices + footer `Nein` + `×`). **Copy: `labels.de.homeDialog`.** Candidate ids: `home-close` / `home-minimize`. **B if Q1-A.** |
| 5 | **Boot hook site** | Current `renderKDB` **315**: spinner **327** → `startModules` **328** → lift **330**. **A. Inline in `renderKDB`.** *Con:* feature behavior in `KDB.js` (411/500, 31 AMD). **B. After 328.** Later than legacy. **C. `core/homeDialog/` helper; one-line `await` from `renderKDB` at 327→328.** +1 import → 32. Helper AMD ≤10. Still explicit PO for the **call**. **D. No hook** = Q1-A. | **C at 327→328** if Q1-B. Overlay up, modules not mounted, boot continues. Detection + `choose` stay out of `KDB.js`. **Not B.** |

---

## Recommended package (**locked** 2026-09-08)

1. **Trigger:** `cognosHost.dataSources.hasErrorDataSource` → `Outcome<boolean>` (async). Missing `getDataSourceList` → immediate `data: false`. Else **one** bounded **settlement poll** (150ms / 15s, abort on cognosHost destroy): continue while the list is empty **or** any item is unsettled (`loading` / unknown / throw / missing `getState`). **First `"error"` stops the wait.** All `"ready"` also stops. Then one decision: any `"error"` → dialog; all `"ready"` → no dialog. Timeout still-loading → `data: false` + skip warn. **Not** poll-until-error (killed C). **Not** list-length-then-one-shot.
2. **When:** `renderKDB` after `startDashboardInitialization` **327**, before `startModules` **328**. **Await** `presentCubesUnavailable`, then mount.
3. **Message:** `message.choose`. Copy + Startseite labels in `labels.de.homeDialog`. Ids `home-close` / `home-minimize`. Chrome = body two choices + header `×`. `presentHomeChoice` passes `showCancel: false`. No new `messageService` method. Tab-move omits the flag (Nein stays).
4. **Nav:** `dashboard.replaceWithBiHomePerspective` + `dashboard.openAppView("home")`. Map in `core/homeDialog/presentHomeChoice.js`.
5. **WP7:** second caller: same helper, watchdog title/body from `labels.de.loading`, same Startseite ids.
6. **`KDB.js`:** orch wiring in `setupCoreFactories` after services + one `await` at 327→328. No detector in `KDB.js`.
7. **Must not:** Glass Type2; new `messageService` method; `_KDB.services.homeDialog`; consumer `location.replace`; `_KDB.cognosAPI` from `homeDialog` / features / loading.

---

## 2. Closed product decisions (locked)

| # | Lock |
|---|---|
| 1 | Exact DE **title:** `Daten-Cubes nicht verfügbar` |
| 2 | Exact DE **body:** `Die benötigten Daten-Cubes können derzeit nicht geladen werden. Möglicherweise läuft die Beladung derzeit noch, Sie verfügen nicht über die erforderlichen Berechtigungen oder es ist ein Fehler aufgetreten.` |
| 3 | Exact DE **actions** (Cognos-test follow-up 2026-09-08; Type2 long strings were a **fact**, not a wrap lock): `Dashboard schließen` / `Dashboard minimalisieren`. **Not** bare `Schließen` — header `×` aria is already `labels.de.message.close` = `Schließen`. Keep **two** actions (`home-close` / `home-minimize`). Do **not** make WP6 close-only. |
| 4 | Two **navigation** actions, not OK/cancel confirm. Service returns opaque ids; **consumer** maps to host close / minimize (`messageService.md` Q10). |
| 5 | No new `messageService` method. Use existing `choose` if the two-action dialog ships. |
| 6 | Do **not** revive Glass Type2 + footer two-button hack (`uiUxDialogsAndHomeFunctions.js` ~197–322). |
| 7 | Do **not** fake a cube detector. Do **not** poll **until** `error` (killed rec **C** — healthy boards would always pay 15s). **Authorized 2026-09-08 (settlement):** bounded poll of sync `getState()` while empty or unsettled. Host enum: `loading` / `ready` / `error`. First `"error"` wins immediately (do not wait for sibling packages). Stop also when every item is `"ready"` or `"error"`. Then: any `"error"` → WP6 dialog; all `"ready"` → `startModules`. Stuck `"loading"` → skip + warn. Sync `getState` only; no `getLocalizedName`; no `ds.on`. One 15s budget, not stacked waiters. |
| 8 | Caller-owned copy (`messageService.md` Q6). Cube title/body + two Startseite labels: **`_KDB.config.labels.de.homeDialog`** (new bucket; merge next to the shared helper owner). Do **not** put cube sentences in `labels.de.message` or `labels.de.loading`. Empty/missing labels → warn, no hardcoded DE. |
| 9 | `KDB.js` changes beyond bootstrap wiring need **explicit PO**. |
| 10 | New facet/ops **authorized by KEEP:** `cognosHost.dataSources.hasErrorDataSource`; dashboard `replaceWithBiHomePerspective` + `openAppView`. No new top-level `_KDB.*`. `runtime.<owner>.adapters` is **not** this path (`cognos-adapter.mdc`). |
| 11 | WP7 is a **second caller** of `presentHomeChoice` (watchdog copy). This delta does not edit PDF `watchdogMs` or overlay CSS. |
| 12 | Watchdog copy (for the shared-shell design only; WP7 owns the lock): title `Dashboard nicht vollständig geladen`; body `Das Dashboard oder die benötigten Daten konnten nicht innerhalb von 5 Minuten vollständig geladen werden. Möglicherweise ist ein Fehler aufgetreten.` |
| 13 | Opaque ids **`home-close`** / **`home-minimize`**. Service does not interpret them. `cancelLabel: ""` still does **not** hide footer Nein. Home dialog uses **`showCancel: false`** (strict). × / Escape / backdrop still dismiss with no nav. Tab-move does not pass the flag. No CSS-hide. |
| 14 | Shared **instruction** (both WP6 and WP7, one key): `navInstruction` = `Wechseln Sie zur Startseite.` Concat in `presentHomeChoice` onto `message` with `"\n\n"` when nonempty (`pre-wrap`). Do **not** put this in `labels.de.loading` or cube/watchdog bodies. Do **not** add it to the close/minimize fail-closed gate (warn-and-omit). Indicative `Sie wechseln zur Startseite.` stays **killed** (lie on dismiss). `×` / Escape / backdrop still do **not** navigate. |
| 15 | **Layout:** shorter labels stay. Equal-width, horizontally centered home-dialog choices live in **`messageService.css`** (PO 2026-09-08: no per-variant CSS file). Scope with `:has([data-kdb-message-choice="home-close"])` so tab-move `.kdb-message-dialog__choice` is unchanged. Technique: shrink-wrapped equal columns (`grid-auto-flow: column; grid-auto-columns: 1fr; width: max-content; margin-inline: auto; gap: 8px`), not full-row `flex: 1`. `box-sizing: border-box` on those scoped choice buttons. No new CSS file. No new `messageService` method. No unscoped restyle of `.kdb-message-dialog__choice`. |
| 16 | **Timing / native Cognos:** the ~20s **before** `render()` remains host work. **After** spinner, before `startModules`: **one** 15s / 150ms settlement wait (empty list **and** `loading` share that window). Missing `getDataSourceList`: **immediate** `ok` + `false`. Host **throw**: do **not** retry ticks. Thenable list: unwrap once per tick, then apply the settlement predicate. Re-call `getDataSourceList` each tick (do not freeze the first array). `presentCubesUnavailable` **must await**. Skip (not `ok && data === true`): one `console.warn` with `ok` / `data` / `outcome` / `reason`. Native `Datenaufbereitung … Personal_BW_KDB` is the same package as a list item with `getState()==="error"` + localized name `Personal_BW_KDB` — still **not** a KDB string to copy. |

Legacy nav **facts** (not locked mechanism): close was full-page `location.replace` to Cognos BI home perspective; minimize was `openAppView("home")`. There was **no** `closeDashboard` API in the legacy tree.

### Cognos-test follow-up (2026-09-08) — what was killed

Army vs live `presentHomeChoice` / `choose` / `messageLabels.close`:

- **Minimize C (WP6 close-only, WP7 both)** — killed. Boolean `includeMinimize` is default-polarity FAIL; close-only WP6 reopens locks 4/13; body `Schließen` collides with `×` aria; WP7 would lose park-to-home if the default leaked. Keep-both stays. Optional `choices` override is **not** shipped.
- **Bare `Schließen` / `Minimalisieren`** — killed as button copy (× collision).
- **`Sie wechseln zur Startseite.`** — killed as instruction (lie on dismiss).
- **Naive B (150ms/60s inside `hasErrorDataSource`, no abort, no E2 fast path)** — killed. Over 150; 60s tax on empty-valid boards; Promise miss if presenter does not await; missing-feature wait if throws are retried.
- **Error-state poll until `listHasError` (C)** — still killed. Healthy boards would always pay the full budget. **Settlement ≠ C:** stop on all-terminal / first error; healthy all-`ready` stops on tick 0.
- **List-length wait then one-shot (sharpened B)** — superseded 2026-09-08. PO: four packages already present while `Personal_BW_KDB` still not `"error"`.
- **Thenable-only A** — killed. Live/legacy `getDataSourceList` is a sync passthrough.
- **Two stacked waiters** (nonempty + settlement) — killed. One 15s loop.

---

## 3. Candidate files (inputs, not allowlist)

Do not treat this table as an execution allowlist. Line counts: army physical file (2026-09-08).

| Path | Lines | AMD | Note |
|---|---|---|---|
| `KDB3/js/KDB.js` | 411 | 31 | `renderKDB:315`. Closest slot: after spinner **327**, before `startModules` **328**. +1 import → 32 (already >10). Cubes **call** = explicit PO. |
| `KDB3/js/core/services/messageService/createMessageService.js` | 138 | 5 | `choose` already exists. Do not add a method. |
| `KDB3/js/dashboard/tabs/effects/confirmAndDispatchTabMove.js` | 95 | 4 | Only live `choose` caller. Do not overload with nav. |
| `KDB3/js/core/cognosAPI/dataSources.js` | 31 | 0 | Dead-but-kept layer-1 (6 ops). **0** `hasErrorDataSource`. List only — no `getState` helper. |
| `KDB3/js/core/cognosAPI/dashboard.js` | 106 | — | Layer-1 `openAppView` at `:114`, **0 callers**. **Not** on the dashboard facet. |
| `KDB3/js/core/services/cognosHost/facets/dashboard/createDashboardAdapter.js` | 33 | 2 | `getDashboardBiBaseUrl` at `:24`. Candidate home for `openAppView` + `replaceWithBiHomePerspective`. |
| `KDB3/js/core/services/cognosHost/composeCognosHostEdgeFacets.js` | 24 | 3 | +1 for new `dataSources` facet → AMD 4. |
| `KDB3/js/core/services/cognosHost/createCognosHostService.js` | 93 | 4 | One-line public key if Q1-B. |
| `KDB3/js/core/homeDialog/` | — | — | **Does not exist.** Candidate owner of `presentHomeChoice` + `labels.de.homeDialog`. Not a service. |
| `KDB3/js/core/services/loadingService/effects/scheduleLoadingWatchdog.js` | 37 | 1 | WP7: 300s → `finishLoading` only (`:26–29`). **Do not edit in WP6**. |
| `KDB3/js/core/services/messageService/view/buildMessageDialog.js` | 119 | 1 | Choose = body N choices + footer cancel. |
| `KDB3/js/core/services/messageService/config/messageLabels.js` | 14 | 0 | Generic OK / Ja / Nein / Schließen. **No** cubes / Startseite. |

**Must not (this WP, regardless of series outcome):** Glass footer hacks; new `messageService` method; `_KDB.cognosAPI` / `__getDashboardAPI` from feature files; fake detector; WP2 / SSS; PDF `watchdogMs` 1800000; ticking PROGRAM **6** before Cognos green.

---

## 4. Out of scope

- WP7 implementation (second caller only).  
- WP2 Dienststelle toast. SSS. Wave-1 numbers.  
- Invert-selection English `alert`, geodata popover, dead Leitung banner.  
- Cognos-native data-prep chrome (`Datenaufbereitung … nicht erfolgreich abgeschlossen`).  
- Deleting dead layer-1 `cognosAPI.dataSources` (forbidden unless PO orders).  
- New top-level `_KDB.*` namespace.

---

## 5. Acceptance

1. Boot + DataSources `getState()==="error"` → §2 title/body + `navInstruction` + two short actions (lock 3); close/minimize map to host ops; `choice === null` (×/Escape/backdrop) does not navigate; then `startModules`. No footer **Nein** on this dialog. Tab-move `choose` still shows **Nein**.  
2. Missing DataSources feature → **no** dialog.  
3. Tab-move `choose` unchanged.  
4. `KDB.js` render-fail `showAlert` unchanged.  
5. No Glass two-button footer hack.  
6. WP7 boot 300s: same two Startseite actions, watchdog title/body.

---

## 6. Parent one-liners (after dual review + JS, not before)

- `messageService.md`: WP6/WP7 is a live consumer of Legacy Survey **capability 6** (tab-move stays the other `choose` caller). Q10 unchanged: service does not navigate. `showCancel: false` is home-dialog only.  
- `cognosHostService.md`: D4 consumer exists — `dataSources.hasErrorDataSource` + dashboard `replaceWithBiHomePerspective` / `openAppView`. Stamp: `_KDB.runtime.homeDialog`.

---

## 7. Open questions (PO)

None for mechanism. Cognos green 2026-09-08. PROGRAM **6** `[x]`.

---

## Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-08 | Draft | WP6 captain | Series **OPEN**. Legacy strings + nav facts from army. Live: zero `hasErrorDataSource`; `choose` = tab-move only; `cognosAPI.dataSources` dead-but-kept. No JS. Waiting PO on Q1 A vs B. |
| 2026-09-08 | Draft (patched) | WP6 captain | Army choose+nav: N-way YES; cognosHost close/minimize **NONE**; `KDB.js` cubes dialog **NO**; labels.de.message generic only. Parent capability 6 already named this dialog. Live `choose` chrome = body choices + footer `Nein`. |
| 2026-09-08 | Draft (patched) | WP6 captain | Army detector census: **NO live cube detector**. `hasErrorDataSource` 0, `Daten-Cubes` 0. tableData / `source_ready` / chrome-miss / watchdog / `dataSourceContext` are **not** equivalents. Q1-C/D closed. Still waiting PO on Q1 A vs B. |
| 2026-09-08 | Draft (patched) | WP6 captain | Army DataSources/home: no `getState` scan in layer-1; `openAppView` dead (0 callers); home-perspective wrapper **NONE**; `location.replace` 0. Recreating snapshot needs **new cognosHost facet/op**. `KDB.js` **411**. Live host census complete. Series still OPEN on Q1 A vs B. |
| 2026-09-08 | Draft (patched) | WP6 captain | Army labels/chrome: `labels.de.homeDialog`; accept live `choose` (Nein + ×); `""` does not hide Nein; ids `home-close` / `home-minimize`. Tab-move already this chrome. |
| 2026-09-08 | Draft (patched) | WP6 captain | Army boot-hook: **C at 327→328** (helper; overlay up, before `startModules`). `KDB.js` AMD 31. Inline A/B rejected unless PO wants logic in `KDB.js`. |
| 2026-09-08 | Draft (patched) | WP6 captain | Army facet+nav: new `dataSources.hasErrorDataSource`; dashboard `replaceWithBiHomePerspective` + `openAppView`; `core/homeDialog/presentHomeChoice`. Series complete. Waiting PO keep vs cancel. |
| 2026-09-08 | Draft (KEEP) | PO vastenburg | KEEP WP6. Filename OK. Signal = legacy `getState()==="error"` via cognosAPI + cognosHost adapter. Chrome Q4 + WP7 alignment still open. |
| 2026-09-08 | **Approved** (mechanism) | PO vastenburg | Go with captain recs: live `choose` (Nein+×); WP7 second caller of `presentHomeChoice`. Spec + implement in a **fresh** chat. |
| 2026-09-08 | JS dual-review | implement captain + army | No FAIL. `KDB.js` 424 / AMD 32. PROGRAM **6** still `[ ]` until Cognos green. |
| 2026-09-08 | PO follow-up | PO vastenburg | Footer **Nein** inhoudelijk ongepast. `choose({ showCancel: false })` on home dialog only. Tabs unchanged. No CSS-hide. |
| 2026-09-08 | Cognos-test follow-up | PO vastenburg + captain | Native Datenaufbereitung = not KDB. ~20s = host before `render()` (document only). Copy: short two actions + `navInstruction` (`können`). Minimize C **killed** — keep both. No CSS. No error-state poll. |
| 2026-09-08 | Detector wait (sharpened B) | PO go-if-stands + army | List-length wait 150ms/15s then one-shot `getState`. Missing feature immediate. Presenter awaits. Skip warn. Not 60s. Not C. |
| 2026-09-08 | Settlement poll | PO go-if-stands + army | Wait while empty/`loading`/unsettled; first `"error"` wins; all `"ready"` → no dialog. One wait file. Not C. Not `ds.on`. |
| 2026-09-08 | Copy/layout series | PO vastenburg | Q1-B `Wechseln Sie zur Startseite.` (indicative `Sie wechseln…` stays killed). Q2 equal-width centered choices. CSS **in** `messageService.css` (no `homeDialog.css`). Native timing gap accepted. |
| 2026-09-08 | Copy/layout JS | captain + army | Writer allowlist shipped. Dual review this-slice PASS. HEAD-diff noise = prior copy concat. PROGRAM **6** still `[ ]` until PO hertest. |
| 2026-09-08 | Cognos green | PO vastenburg | Dialog + copy/layout green. Hygiene army NIT only. PROGRAM **6** `[x]`. |
