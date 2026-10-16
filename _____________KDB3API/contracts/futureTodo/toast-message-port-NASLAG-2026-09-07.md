# Naslag — toast / dialog port (legacy vs current)

> Facts for captains and Grok 4.6 army. **Not** law. Law = the WP `*-contractdelta.md` + parents.
>
> Program / checklist: `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md`
>
> Closed investigation **2026-09-07**. Do **not** re-census the whole tree. Verify **your WP** files vs this section before coding.

**Trees**

| Role | Path |
|---|---|
| Current | `_____________KDB3API/KDB3/js/**` |
| Legacy | `laatsteOriginal/KDB2/**` |
| Message API | `_KDB.services.message` — `notify`, `notifyAnchored`, `showAlert`, `confirm`, `choose`, `showCopyable` (`contracts/messageService.md`) |

Current production has **no** feature-file `glassMessages` bypass, **no** native `alert`/`confirm`/`prompt` in app JS. Dialogs go through messageService.

---

## Do not re-investigate as “missing toasts”

| Item | Why |
|---|---|
| specialSingleSelect Personengruppe / Dienststellenleitung | Silent in **both** trees. Not a toast gap. Wave 3 only. |
| Leitung widget banner | Legacy **dead** (commented call + wrong namespace + CSS class mismatch). `specialSingleSelect.md` §17 OOS. |
| Invert English `alert` | Legacy only; current singleSelect has no invert. Out of this program. |
| Geodata Cognos popover | Legacy live; current absent; `messageService.md` OOS (widget-owned). Out of this program. |
| Fullscreen Ja/Nein prompt | Legacy **0 callers**. |
| PDF errors | Current **extra** (`showAlert`); legacy had none. |
| Dienststelle **restore** missing/fallback | Current **live** writeback `notify` (`dienststelleRestoreFallbackMessage` / `MissingMessage`). Changed surface, not missing. Wave 2 WP2 is **user OK empty**, not restore. |
| Share URL miss | Current German `showAlert` (was Dutch toast). |
| Dimension measure toasts | Current **English** `notifyAnchored` via `warnSettingsMessage`. Not in wave 1–3 unless PO adds a copy WP. |
| Tabs delete / duplicate / move | Already on messageService. WP8 is **add** only. |

---

## Number 1 — Unsaved discard confirm (wave 1)

**Legacy (live)**  
- `laatsteOriginal/KDB2/js/writeback/setupWBParameterSetFunction.js` ~348–360 and ~525–536  
- Shell: `uiUxDialogsAndHomeFunctions.js` `confirmDiscardUnsavedChanges` ~15–195  
- Trigger: parameterset dropdown **change** (not default, not URL restore)  
- Surface: Glass Type3 + **hidden Cognos footer** + injected buttons  
- Title: `Nicht gespeicherte Änderungen`  
- Body: `Hinweis: Beim Öffnen eines Dashboards aus dem Dropdown werden nicht gespeicherte Änderungen verworfen.\n\nMöchten Sie fortfahren?`  
- Buttons: `OK` / `Abbrechen`

**Current**  
- **No** confirm. Flag only: `_KDB.runtime.writeback.skipDiscardConfirmOnce` (`ensureWritebackRuntime.js`, set in `selectParameterSetById.js`). **Flag is never read.**  
- Contract: `writeback-urlParameterId-contractdelta.md` §5 / §11 — *“Port of discard-confirm UI (only reserve skipDiscardConfirmOnce)”*; later confirm **must** honor the flag **or** overlay-active (modal under overlay deadlocks URL waiter).  
- `historyControls` is undo/redo **only**. It is **not** this owner.

**Hook (file map 2026-09-07 — do not invent a select `change` listener):** live KDB has **no** `addEventListener` on `#selectParameterSet`. Cognos calls `window.top.WBParameterSetFunction` → `cognosWritebackBridge.bridgeSet` → `writebackSet.restore()`. KDB **synthesizes** `change` only in `selectParameterSetById.js` after setting the skip flag. Confirm belongs on the **restore / bridgeSet** entry (new `bridge/` helper), not a new DOM listener.

**Clone:** `KDB3/js/dashboard/tabs/effects/confirmAndDispatchTabDelete.js` (`confirm` → fail-closed if missing → continue only on `confirmed === true`). Override labels `OK` / `Abbrechen`.

**Size smells:** `cognosWritebackBridge.js` ~282 — do **not** thicken. `createWritebackSetService.js` AMD **10/10**, ~148 lines — do **not** grow `restore()`; new helper.

**Review 2026-09-07:** no dirty bit in `restore()`/`bridgeSet` (`statusKind` only). `skipDiscardConfirmOnce` never read/cleared. Overlay name is `urlShareBootOverlayActive`. Confirm **not** in `executeRestoreRun.js`. No live API to revert `#selectParameterSet` (value already new when SET runs). Skip `statusKind==="default"` / host `newDashboard` = PO locks on the WP1 delta.

**Do not:** native `confirm`; confirm during URL inbound / boot overlay; ignore `skipDiscardConfirmOnce`; edit share URL parse; `KDB.js`; `historyControls/**`; `waitForParameterSetSelectReady.js`; `executeRestoreRun.js`.

---

## Number 3 — Top-N without grouping dimension (wave 1)

**Legacy (live)**  
- `widgetDropdownOptionHandlersHelpers.js` ~203–251  
- Trigger: Top-N chosen while grouping is default/none  
- Surface: **anchored** toast on the widget  
- Copy: `Um die Top-N Funktion zu verwenden, muss zuerst eine Gruppierungsdimension gewählt werden.`

**Current**  
- `widgetVis.md` §7.1.2: absent dimension **blocks TopN helper**; `topNGate.js` returns `null` helper — **silent success**, no toast.  
- `widgetTopN.md`: toast stays outside `widgetTopN`.  
- `widgetSettings.md`: optimistic dropdown; commit only after success; fail → `topNDropdownSafeguard` / `finalizeVisIntentResult.js`.  
- Click with dimension `none` still **dispatches** `applyTopNChoice`.

**Owner for toast:** `widgetSettings` pre-dispatch (new helper). Pattern: `kdbControl/settings/warnSettingsMessage.js`. Do **not** put copy in `widgetTopN/**`.

**Review 2026-09-07:** no pre-dispatch gate. `topNGate.js:101-102` silent `null` helper; apply can still commit `topNChoice`. New file `widgetSettings/effects/validateTopNGroupingDimension.js` hooked in `executeIntent` before `_dispatchToTargetApi`. `topNDropdownSafeguard` must be called from that guard (blocked dispatch never reaches finalize). `dispatchWidgetSettingsIntent.js` AMD 8→9 **only if PO confirms**. Startup is `applyStartupSettings` batch — no this toast.

**Do not grow:** `handleApplySetting.js` (146), `topNGate.js` (185), `actionRouter.js` (AMD 14), `bindWidgetSettingsPanel.js` (208), `finalizeVisIntentResult.js` (AMD 9). Extract the guard; do not inline.

**Do not:** dispatch `applyTopNChoice` when dimension is absent sentinel (`none` / `default` / `""`); commit `topNChoice` in that case; touch `widgetTopN/**`; import/extend `warnSettingsMessage.js`.

---

## Number 4 — Max widgets per tab / launchpad exhausted (wave 1)

**Legacy (live)**  
- `widgetLaunchpadHelpers.js` ~68–72 `getWidgetFromLaunchpad`  
- Trigger: drop / PS restore, no unclaimed slot  
- Surface: global toast error  
- Copy: `Die maximale Anzahl von Widgets pro Tab ist bereits in Verwendung`

**Current**  
- `widgetBase.md` dropCreate: claim from launchpad `readSlotWidgets`; else `WIDGET_BASE_WIDGET_ID_MISSING`.  
- Live: `resolveDropClaim.js` ~46–47 / `handleDropCreate.js` ~23–24 return that code. **No** `notify`.  
- `launchpad` is environment-only (no widget movement, no toast).

**Toast only when the eligible claim list is empty** (pad exhausted). Do not toast every ID-resolution failure (bad originId, launchpad not ready — those keep coded errors).

**Call site:** `subscribeDropValidated.js` (room to await `dropCreate`) — **not** `handleDropCreate.js` (AMD 13). `publishValidatedDrop.js` already shows how drop `notify` looks.

**Review 2026-09-07:** `subscribeDropValidated.js` fire-and-forgets `dropCreate` (27 lines — room to await). `WIDGET_BASE_WIDGET_ID_MISSING` / English “No eligible widget shell…” is **shared**, not exhaustion. Distinguish via `readSlotWidgets` + eligible count; **do not mint** a new error code unless PO asks. PROGRAM lock 4 = `notify` **warning**; delta/legacy = **error** — PO. Restore toast default = **no** (`placeSerializedWidgetEntry.js`) until PO reopens.

**Do not:** write `_KDB.state.launchpad` from widgetBase; read `_KDB.runtime.launchpad`; grow `handleDropCreate.js` (AMD 13) / `createWidgetBaseController.js` (AMD 28); toast GET restore exhaustion in `placeSerializedWidgetEntry.js` unless PO reopens.

---

## Number 5 — Header/footer zoom hint (wave 1)

**Legacy (live)**  
- `dashboardHeaderHelpers.js` ~211–228 **and** `dashboardFooterHelpers.js` ~117–136  
- Trigger: `setTopHeader("on")` / `setBottomFooter("on")` (toggle or PS restore)  
- Surface: anchored toast on filter dock  
- Copy (identical; **can fire twice**):  
  `Sie können das Zoom-Symbol oben rechts im Dashboard verwenden und dort „An Seite anpassen“ auswählen, um die Dashboard-Größe an geänderte Header-/Footer-Einstellungen anzupassen.`

**Current**  
- Live actions: `header/toggle|show|hide`, `footer/toggle|show|hide` (not legacy `setTopHeader` names). Reducers `active`↔`removed`. Footer **show blocked** if header is not `active`.  
- Toolbox: `fillToolboxHeaderFooter.js` / `bindFrameworkKdbActionToggles.js`. **No** messageService.

**Program lock:** **one** toast, not the legacy double. Fire on transition **into** `active`. Not on hide. Not on Untertitel/title-edit.

**Review 2026-09-07:** live `message.notify()` does **not** honor `code`/`dedupeKey` (global toasts may overlap; collapse is `notifyAnchored` only — `messageService.md` Q4). Restore both-on is `runNormalRestore.js` (`header/parameterSetRestoreRequested` then `footer/…`); inner `show` is in each `handleParameterSetRestore.js`. Footer cannot become `active` unless header is already `active`. Helper path: `dashboard/header/effects/notifyZoomHint.js` (not `canvas/header`). Burst mechanism is a **PO lock** on the WP5 delta.

**Do not grow:** `createHeaderController.js` (**152**, already over 150), `createFooterController.js` (AMD 9). New effect file.

**Do not:** edit footer date/user/page/url deltas; `setDashboardZoom` / `cognosAPI/dashboard.js`; writeback `mapV2HeaderFooter.js`; `KDB.js`.

---

## Number 8 — Max tabs on ADD (wave 1)

**Legacy (live)**  
- `configurationToolboxHelpers.js` ~64–67 (add) and ~677–679 (duplicate)  
- Copy: `Es können maximal 5 Registerkarten angelegt werden.`

**Shipped 2026-09-07 (PROGRAM 8 `[x]`, Cognos green).** Law: `contracts/tabs-add-max-visible-toast-contractdelta.md`. Live: `kdbControl/framework/dispatchToolboxTabsAdd.js` (API-only `getState`/`dispatch`/`notify`). Binder trampoline stays; add no longer fire-and-forget. Fill still always shows the button. Sync does **not** disable add.

**Current**  
- Duplicate **has** toast: `confirmAndDispatchTabDuplicate.js` + `tabs/config/defaults.js` `TAB_DUPLICATE_MAX_VISIBLE_TEXT` = `Maximale Anzahl an Registerkarten erreicht.` (no hardcoded 5).  
- Add: kdbControl consults `getState().canAdd` on click; `canAdd !== true` → `_KDB.services.message.notify` (cloned duplicate sentence, `code: "TABS_MAX_VISIBLE"`), no `tabs/add`. Hidden user tab → `tabs/add` as today.  
- Reducer `TABS_NO_HIDDEN_TAB` English diagnostic stays if something else still dispatches a doomed add. **Not** user copy. **Not** `TABS_MAX_VISIBLE`.

**Reuse duplicate user copy** `TAB_DUPLICATE_MAX_VISIBLE_TEXT` (clone in kdbControl; MUST: no `tabs/config` AMD from kdbControl). Fail-closed on **`notify`**.

**Review 2026-09-07 (superseded — do not implement):** binder was fire-and-forget `tabs/add`; `canAdd` unused. Candidate `tabs/effects/confirmAndDispatchTabAdd.js` was **rejected**. Helper home is `dispatchToolboxTabsAdd.js`. Do not grow the binder past 150; do not notify from `reduceTabsAction.js`.

**Do not:** create a physical Cognos tab; change delete/duplicate/move confirms; `KDB.js`; `createTabsController.js`.

---

## Number 2 — Dienststelle empty OK toast (wave 2)

**Legacy (live)**  
- `hierarchyDefaultsHelpers.js` ~1194–1210 `handleEmptyStelleFilter`  
- Trigger: OK on **empty** Dienststelle hierarchy (not during PS restore / cascade suppress)  
- Anchored toast: `Für den ${_filterName}-Filter ist mindestens eine Auswahl erforderlich. Ohne Auswahl wird automatisch der voreingestellte Standardwert für die (aktuellen) Reiter gesetzt.`

**Current**  
- Defaults still apply (`applyDienststelleDefault.js`) **silent**.  
- `dashboard/filters/dienststelle/**` does **not** call messageService.  
- Restore info toasts are **writeback** (WP not this). `dienststelle.md` covers OK+history, not this toast.

**Do not** confuse with restore H2/H3 or with specialSingleSelect.

---

## Number 6 — Cubes unavailable home dialog (wave 2)

**Legacy (live)**  
- `KDB2.js` ~237–243 `hasErrorDataSource` → `showKDBHomeMessage`  
- Title: `Daten-Cubes nicht verfügbar`  
- Body: `Die benötigten Daten-Cubes können derzeit nicht geladen werden. … Berechtigungen …`  
- Buttons: `Startseite, Dashboard schließen` / `Startseite, Dashboard minimalisieren`  
- Shell: Type2 + footer two-button hack (`uiUxDialogsAndHomeFunctions.js` ~197–322)

**Current**  
- No `hasErrorDataSource` / that copy.  
- `message.choose` exists; **only live caller is tab move**.  
- Boot `KDB.js` `showAlert` is a **generic render failure**, not cubes + navigation.

**Likely needs `KDB.js` + `message.choose`.** `KDB.js` changes beyond bootstrap wiring need **explicit PO** (`feature-structure.mdc`). Stub before coding.

---

## Number 7 — 5-minute load watchdog dialog (wave 2)

**Legacy (live)**  
- `uiUxLoadingFunctions.js` ~117–124 — 300s → **same** home dialog as #6  
- Title: `Dashboard nicht vollständig geladen`  
- Body: `Das Dashboard oder die benötigten Daten konnten nicht innerhalb von 5 Minuten vollständig geladen werden. …`

**Current**  
- `scheduleLoadingWatchdog.js`: still **300000 ms**, then **only** `finishLoading`. No dialog.  
- `loadingService.md` preserves watchdog **timing**, not the home dialog.  
- PDF overlay uses 1800000; do not confuse.

Wave-2 stub: reuse #6 `choose` chrome with different copy; do not start a second overlay.

---

## SSS — wave 3 (not a toast gap)

**Rights:** Alle / Personengruppe / Dienststellenleitung tables; `1` = allowed. Lehrlinge = alias of Personengruppe.

**Both trees:** hide filter if no right or Sicht ≠ BW; silent auto-default when Alle denied; no toast on hide/show/restore of these two filters.

**Live difference (interaction, not messaging):**  
- Legacy: `KDB_hideAlleOption` + CSS `pointer-events: none` on **all** list items when Alle denied.  
- Current: hide Alle/Gesamt rows only; other options remain choosable.

**Current owner:** `KDB3/js/dashboard/filters/specialSingleSelect/**`. Zero `services.message`. Error codes = console/state only.

**Do not** in wave 1–2 JS: revive Leitung banner; add toasts to SSS; change Sicht BW/DEZPV policy without a new Approved delta. SSS **paper** (intake / contract / spec) may run in parallel; see `toast-message-port-sss-captain-handoff-2026-09-08.md`.

---

## Current extras (not gaps; do not rip out)

tableData load-fail `notify`; history undo/redo fail `notify`; writeback save `showAlert`; restore-fail `showAlert`; dragDrop three German `notify`s; chrome flush `showAlert`; PDF `showAlert`; KDB boot `showAlert`.
