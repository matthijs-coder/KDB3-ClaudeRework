# Contract Delta: leftover-hide via developer-mode invert + settings `:has()`

> Product ack PO vastenburg 2026-08-27: inspect = twee knoppen. Ready uit = geen park. Developer aan = geen leftover-hide. Geen `KDB_running`. Geen stamp.

---

**Status:** `Implemented` — code review PASS 2026-08-27; Cognos-host niet in-browser geverifieerd
**Parents:** `contracts/kdb-ready-halt-developer-mode-contractdelta.md` (Ready-halt + `KDB_developerMode` on `#main`); `widgetBase.md` L48 (park niet op deze toggle)
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6 (captain), 2026-08-27
**Reviewed by:** PO vastenburg (product A)

---

## 1. Purpose

Leftover Cognos-widgets (nog niet geparkt, geen KDB-settings-node) zijn onzichtbaar zolang developer-modus **uit** staat. Geplaatste vis/text worden zichtbaar via `:has(.KDB_widgetSettings)`. Host en writeback-tabel blijven zichtbaar. Ready-halt en park-pad ongewijzigd.

Amends Ready-halt-delta §7: leftover-hide is **niet** langer out of scope; het is deze CSS, niet stamp/park-gate.

---

## 2. Product

| Ready | Developer | Leftovers |
|---|---|---|
| false | false | hidden (inspect = beide knoppen) |
| false | true | zichtbaar |
| true | false | hidden tot `:has(.KDB_widgetSettings)`, minus excludes |
| true | true | zichtbaar (debug; flash mag) |

Shells zonder settings-node **mogen** hidden blijven, behalve excludes.

---

## 3. CSS (hide-only)

Nieuw bestand `KDB3/css/widgets/leftoverWidgets.css` (was `KDB3/css/leftoverWidgets.css`; PO 2026-09-10: widgets-folder), opnemen in `cssHrefList.js` (zelfde padstijl als andere `widgets/*.css`).

- `visibility: hidden` — niet `display: none`, niet `opacity: 0`, **geen** `visibility: visible` (steekt door `#KDB_HideSpot`).
- Gate: `#main:not(.KDB_developerMode)` — hergebruik bestaande class; geen nieuwe running-class. **2026-09-02:** kdbControl may turn the class on/off by calling `_KDB.api.properties.applyDeveloperMode` ([kdbControl-developer-mode-toggle-contractdelta.md](./kdbControl-developer-mode-toggle-contractdelta.md)). No leftover-specific JS. Cognos-button invert is a **different** sheet ([cognosButtons-allowlist-invert-contractdelta.md](./cognosButtons-allowlist-invert-contractdelta.md)) — do not merge.
- Subject: `.widget` (niet los `.liveWidget` / `.textWidget` — die zitten ook op toolbar).
- Niet verbergen:
  - `:not(.KDB3Widget):not(#kdb3widget)`
  - `:not(:has(.KDB_widgetSettings))` in de hide-keten (alleen widgets **zonder** die descendant matchen)
  - writeback: `:not([aria-label="WritebackTabel"]):not([aria-label="WritebackTable"]):not([aria-label="WritebackTabel_Get"]):not([aria-label="WritebackTabel_Set"])` — Cognos zet `aria-label` op de widget-root. Legacy titles stay as hygiene. Geen JS-`setAttribute`. **2026-09-11:** Get/Set live leftovers ([writeback-get-set-leftover-titles-contractdelta.md](./writeback-get-set-leftover-titles-contractdelta.md)).

Schets:

```css
#main:not(.KDB_developerMode)
  .widget:not(#kdb3widget):not(.KDB3Widget):not(:has(.KDB_widgetSettings)):not([aria-label="WritebackTabel"]):not([aria-label="WritebackTable"]):not([aria-label="WritebackTabel_Get"]):not([aria-label="WritebackTabel_Set"]) {
  visibility: hidden;
}
```

Class-token `KDB_developerMode` blijft properties-config. `#main` blijft `dashboardClassHost`. Geen hardcoded `getElementById("main")`.

---

## 4. Niet in deze WP

- `KDB_running` / Ready-gate class
- `data-kdb-canvas-placed` / `placeWidgetOnCanvas` stamp
- `cssHrefList` ná Ready verplaatsen
- Developer-apply uit properties halen
- Overlay, userklik-intercept, park-gates — overlay is `loadingService-overlay-coverage-contractdelta.md`, not leftover CSS
- Superuser-JS — **2026-09-02:** SuperUser gates the kdbControl Entwicklermodus control only; leftover-hide stays class-only ([kdbControl-developer-mode-toggle-contractdelta.md](./kdbControl-developer-mode-toggle-contractdelta.md))

---

## 5. Files

- `KDB3/css/widgets/leftoverWidgets.css` (nieuw; relocated 2026-09-10)
- `KDB3/js/core/css/config/cssHrefList.js`

Eventueel comment in `widgetChromeSelectors.js` alleen als er al een writeback-titel-selector-patroon is; geen dode JS-catalogus uitvinden als CSS de hide-set is (zelfde patroon als IBM-ids in `cognosButtons.css`).

---

## 6. Acceptance

1. Ready aan, developer uit: leftovers op tab 1 / eerste open tab 2+ hidden; host zichtbaar; writeback-tabel zichtbaar als aria-label matcht.
2. Developer aan: leftovers zichtbaar (Ready aan of uit).
3. Na drop/restore `placeControls`: vis/text met `.KDB_widgetSettings` zichtbaar zonder developer.
4. Parked shells in hideSpot blijven hidden (geen show-regel).
5. Geen nieuwe JS-class, geen stamp.
