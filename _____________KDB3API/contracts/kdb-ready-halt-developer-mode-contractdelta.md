# Contract Delta: Ready halt + developer-mode class + Cognos-button CSS

> Product ack PO vastenburg 2026-08-27. Superuser was **out of this WP** (JS later). **2026-09-02:** SuperUser visibility + kdbControl developer-mode toggle: [kdbControl-developer-mode-toggle-contractdelta.md](./kdbControl-developer-mode-toggle-contractdelta.md). Class owner stays properties. Overlay-port / `KDB_superuser` still out. No leftover-widget hide in *this* 2026-08-27 WP, no park-gate, no new events.

---

**Status:** `Implemented` — code review PASS 2026-08-27; Cognos-host niet in-browser geverifieerd
**Parents:** `contracts/properties.md`, `contracts/core.md` (boot order), chrome catalog (`KDB3/js/core/cognosHost/config/rootChromeSelectors.js`)
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6 (captain), 2026-08-27
**Reviewed by:** pending PO

---

## 1. Purpose

Two developer knobs, two jobs:

1. **Ready** (`KDBReadyToggle`) — legacy polarity: KDB draait alleen als de toggle **true** is. Anders halt ná core, vóór modules (native Cognos-dashboard, geen park/UI).
2. **Developer modus** (persist-id blijft `KDBHideWidgetsToggle`) — zet class `KDB_developerMode` op de Cognos-shell `#main`, zodat geporte Cognos-knop-CSS ze toont. Default uit = knoppen verborgen.

Park, launchpad, widgetBase routing: **ongewijzigd**. Geen `properties:hideWidgetsToggled`. Geen `KDB_superuser` in deze WP.

---

## 2. Ready halt (legacy)

**Polarity:** `KDBReadyToggle === true` → boot gaat door. Ontbreekt / `false` / overig → halt. Loader blijft `null` → `false` (`loadToggleProperties`). Productie-dashboards moeten Ready **aan** zetten om KDB te gebruiken.

**Anker:** `KDB.js` `renderKDB`, ná `await setupCore()`, **vóór** `startDashboardInitialization` / `startModules`.

- Properties + CSS-inject zijn dan al gebeurd (developer-class kan al op `#main`).
- Park, tabs-traverse, launchpad, widgetBase.mount starten niet.
- Geen live-subscribe op Ready: flip ná boot vereist **reload**.
- Geen nieuwe lifecycle-framework. Early `return` (false/void consistent met huidige `renderKDB`-foutpaden). Optioneel bestaande status alleen als die enum al bestaat; niet uitvinden.

`spec.json` id/label `"Ready"` blijven. Geen `defaultValue` in spec (runtime-default is al false).

Amends `properties.md`: `KDB.js` **is** de Ready-consumer (halt). Regel 39 is niet langer stale voor Ready.

---

## 3. Developer modus (class only)

**Persist-id:** `KDBHideWidgetsToggle` (Cognos-binding; niet hernoemen).  
**spec.json label:** `Developers modus (visibility widgets and buttons)`.  
**Runtime:** `_KDB.properties.KDBHideWidgetsToggle`. Default `false` = geen class.

| Waarde | DOM |
|---|---|
| `true` | class `KDB_developerMode` **aan** op catalogus-node |
| `false` / ontbreekt | class **af** / niet zetten |

**Q11/Q12 close:** owner van de reactie is **properties zelf** (DOM-class). Geen launchpad-dispatch, geen widgetBase-dispatch, geen event. `applyHideWidgetsToggleChange` schrijft de boolean **en** togglet de class. Bestaande `change:property:KDBHideWidgetsToggle`-subscribe blijft (live flip).

Boot: zelfde apply ná properties-load in `setupCore`, zodat de class staat **vóór** een eventuele Ready-halt.

`widgetBase.md` L48 blijft: park **niet** gated op deze toggle.

---

## 4. Catalogus + class-token (één Cognos-plek)

Niet `core/config`. Niet hardcoded `"main"` in properties-effects.

| Wat | Waar |
|---|---|
| Cognos-node `#main` | `rootChromeSelectors.js` → `root.dashboardClassHost` = `u.req("#main")` (één key; later mag SU-JS dezelfde node gebruiken — niet deze WP) |
| Class-token | properties-config constante `DEVELOPER_MODE_CLASS` = `"KDB_developerMode"` |
| Resolve | `_KDB.elements.selectors.root.dashboardClassHost` (zelfde register-pad als overige chrome) |

Als de node ontbreekt: geen throw, geen boot-abort; class-skip + bestaande error-log stijl. Ready-halt is onafhankelijk.

Niet: `html`/`body`, `.KDB3Widget`, `#kdb-control-root`, action-bar-node als class-host.

`dom.mdc` document-exception: class op Cognos-shell via catalogus, niet op `documentElement`.

---

## 5. CSS-port `cognosButtons.css`

Bron: `laatsteOriginal/KDB2/css/KDB.css` regels 449–621.

- Nieuw bestand `KDB3/css/cognosButtons.css`.
- Opnemen in `cssHrefList.js`.
- **Alle** `KDB_superuser` → `KDB_developerMode`. Geen AND met superuser. Geen `KDB_superuser` in dit bestand.
- Hide: `#main:not(.KDB_developerMode) … { display: none !important; }`
- Dim + `::before`/`::after` (legacy `"SUPER"` / `"USER"`-copy, ongewijzigd): `#main.KDB_developerMode …`
- Duplicate selectors uit de bron opruimen; geen rest-refactor van andere CSS.
- Cognos-knop-selectors (IBM ids / `ba-common-toolbar` / walkme) blijven in **dit** CSS-bestand (CSS-catalogus voor deze hide-set). JS-catalogus is alleen `#main`.
- **2026-09-02 invert:** named deny-list superseded by allow-list invert in [cognosButtons-allowlist-invert-contractdelta.md](./cognosButtons-allowlist-invert-contractdelta.md). Legacy rules stay as comments in `cognosButtons.css`. Gate and class-owner unchanged.

Host `.KDB3Widget` / `#kdb3widget` niet verbergen via deze sheet.

---

## 6. Files (implementatie, niet nu)

- `KDB3/js/KDB.js` — Ready halt
- `KDB3/spec.json` — developer label
- `KDB3/js/core/properties/applyHideWidgetsToggleChange.js` — class toggle
- properties config (token) + bestaande HideWidgets subscribe/load
- `KDB3/js/core/cognosHost/config/rootChromeSelectors.js` — `dashboardClassHost`
- `KDB3/css/cognosButtons.css` (nieuw) + `cssHrefList.js`

---

## 7. Out of scope

- Superuser JS, `_KDB.superUser`, tabel `superuser`, `hideSuButtons`, overlay-port als aparte SU-feature — **superseded in part 2026-09-02:** SuperUser table read + kdbControl Entwicklermodus toggle + metricsTree Freigabe live in [kdbControl-developer-mode-toggle-contractdelta.md](./kdbControl-developer-mode-toggle-contractdelta.md). Overlay-port and `KDB_superuser` class remain out.
- Leftover-widget CSS-hide / `data-kdb-canvas-placed` / park-gates
- Ready live-subscribe
- `ensureSlotReadyForMutation` inner-frame (andere delta)
- Startup-traverse verwijderen

---

## 8. Acceptance

1. Ready uit + reload: geen `startModules`, Cognos-widgets blijven, geen launchpad-park.
2. Ready aan: huidige boot, plus developer-class volgens toggle.
3. Developer uit: `#main` zonder `KDB_developerMode`; IBM chrome hidden except the invert allow-list ([cognosButtons-allowlist-invert-contractdelta.md](./cognosButtons-allowlist-invert-contractdelta.md)).
4. Developer aan (live of boot): class op `#main`; hidden IBM set zichtbaar (dim/overlay); allow-list remains un-overlaid.
5. `document.querySelector("#main")` / `"main"` niet in properties-featurecode.
6. Geen park-verschil tussen developer aan/uit.
