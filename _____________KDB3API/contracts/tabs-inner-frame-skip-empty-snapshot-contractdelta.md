# Contract Delta: inner-frame activate-skip + empty-snapshot honesty

> Product ack PO vastenburg 2026-08-27 (probleem 2, aanpak A). Amends skip in restore-activate; empty `routedTabIds` poison. Mutation-CRUD skip later.

---

**Status:** `Implemented` — code review PASS 2026-08-27; Cognos-host niet in-browser geverifieerd
**Parents:** `contracts/tabs-parameterSetRestore-contractdelta.md` §5 / §5.2; `contracts/writeback.md` §6.4 ~1157; `contracts/writeback-t2-item5c-contractdelta.md`; `contracts/widgetBase-lazyLaunchpadRouting-contractdelta.md` §3.4
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6 (captain), 2026-08-27
**Reviewed by:** pending PO

---

## 1. Purpose

Startup-traverse zet `hasBeenActivated` op zichtbare tab 2..n **zonder** inner frame (klik + 150ms, lazy load blijft). Restore skip’t daardoor de echte klik → geen frame → park/vis-fail.

Skip en wait moeten **inner-frame-in-DOM** zijn, tab-gescoped. `getCanvasWhenReady` / `whenCanvasReady` zijn globaal (tab 1 ready ≠ tab 2 frame) en mogen geen per-tab bewijs zijn.

---

## 2. Inner-frame predicate

**Inner frame aanwezig** voor slot `tabId` / `pageId` wanneer:

- wrapper `document.getElementById(tabId)` bestaat, **en**
- die wrapper een descendant matcht op catalogus `page.exactPageRootSelector` (`.pagegenericPage`), **of** `pageId !== tabId` en `document.getElementById(pageId)` is een child/descendant van die wrapper.

Niet als bewijs: `hasBeenActivated`, `isCanvasLoaded`, wrapper-id alleen, `pageId === tabId` zonder class-descendant, document-globale `.pagegenericPage` (dat is tab 1).

Selectors uit `pageChromeSelectors.js`, niet hardcoded in de activate-action als Cognos-string (token/catalogus).

---

## 3. `tabs/parameterSetActivateTabRequested` (SET 18/23)

Vervangt skip-on-`hasBeenActivated` in `parameterSetActivateTab.js` en de tekst in parent §5 / `writeback.md` §6.4.

1. Predicate true → skip click: `{ ok: true, skippedActivation: true, canvasReady: true }`.
2. Anders: bestaande `tabs/traverse` `singleTab`, `includeHiddenDashboardTabs: true`, `waitFor: "canvas"` (150ms blijft **klikmarge**, geen frame-wacht).
3. Daarna **wacht** tot predicate true. Poll-patroon zoals bestaande abortable polls / tab-follow (niet MutationObserver op pages, niet `getCanvasWhenReady` als tab-scoped ready). Cap **4000ms** (tab-follow-orde; niet de 2s van `waitForTabContainer`).
4. Frame-timeout → `{ ok: false }` + `WRITEBACK_TABS_TARGET_MISSING` (of bestaande activate-fail-code) → **SET abort**. Niet 5c-stijl `{ ok: true, canvasReady: false }`.
5. T2-5c `getCanvasWhenReady`-wacht op activate is **geen** per-tab ready. Na inner-frame-wait niet hergebruiken als bewijs dat tab 2 geladen is (globaal, vaak al true). Mag als extra no-op blijven of van activate-pad af; skip/wait hangen niet van 5c af.

Hidden tabs: activate klikt ze al (`includeHiddenDashboardTabs: true`); probleem is wait, niet skip.

Exception (sync 2026-10-06, `writeback-step27-bindPerActiveTab-contractdelta.md` P1): payload `forceShow: true` bypasses both skip checks and always clicks via `tabs/traverse` `singleTab`; the inner-frame wait then resolves immediately and the live-widget wait (`tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md`) runs. Only step 27 sets it; steps 18/23 omit it and keep rule 1.

`ensureSlotReadyForMutation`: **niet** in deze WP (zelfde leugen, latere delta).

---

## 4. Empty-snapshot (`mayMarkRouted`)

Amends `widgetBase-lazyLaunchpadRouting-contractdelta.md` §3.4.

Huidige intentie (“empty alleen ná transfer-ready **voor die tab**”) is gebroken: `whenCanvasReady()` is globaal.

**Regel:** empty snapshot (`routed === skipped === failed === 0`, `missingShells === 0`) mag `routedTabIds[tabId]` **alleen** zetten als de **tab-gescoped inner-frame predicate** true is. Globale canvas-ready telt niet. Empty + geen frame → niet markeren → volgende ensure mag retryen.

Niet-empty + `missingShells > 0`: bestaande 4a (niet markeren) ongewijzigd. Letter B missingShells **niet** heropenen.

`waitForTabContainer` (`getElementById(tabId)` only) blijft te zwak als inner-frame-bewijs; ensure-wait mag dezelfde predicate gebruiken (klein, zelfde WP als het ensure-pad geraakt wordt).

---

## 5. Files (implementatie, niet nu)

- `KDB3/js/dashboard/tabs/actions/parameterSetActivateTab.js`
- klein tabs-effect `waitForTabInnerFrame` (poll catalogus-predicate)
- `KDB3/js/dashboard/widgets/widgetBase/actions/handleEnsureTabWidgetsRouted.js` (`mayMarkRouted`)
- optioneel `waitForScopedShells.js` container-wait → inner frame

Niet: overlay, user-click intercept, alle canvas-tabs bij startup laden, startup-traverse schrappen.

---

## 6. Acceptance

1. Restore van tab 2 die nooit een inner frame had: programmatische klik, wait tot `.pagegenericPage` onder die wrapper, dan `ensureTabWidgetsRouted`, dan place/contentCreate.
2. Tweede activate van dezelfde tab (frame blijft): skip click — except with `forceShow: true` (step 27), which always clicks (§3 exception).
3. Skip niet op `hasBeenActivated` alleen.
4. Tab 2 empty discovery vóór frame: `routedTabIds` niet gezet; latere ensure parkt wél.
5. Frame-timeout: SET faalt zichtbaar, geen stille vis-build.
6. `getCanvasWhenReady` niet gebruikt als “tab 2 is er”.
