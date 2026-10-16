# CP-2 / handoff — kdbControl framework view sandbox

**Datum:** 2026-05-13  
**Contractreferentie:** `_____________KDB3API/contracts/kdbControl.md` (F1–F4, framework-tranche 1), `_____________KDB3API/contracts/anew.md` (structurele beschrijving Steuerungspanel).

---

## 1. Tranche naam

**kdbControl framework view sandbox** — statisch/inert framework-UI in de port-harness (`TEST/kdbControl-port/`), inclusief shell-layout, header, settings-huls, hoofd-toggles (Kennzahlen / Toolbox), toolbox-huls, form-primitieven en collapse-rail.

---

## 2. CP-2 status

**Groen** — door user bevestigd voor de framework view in `TEST/kdbControl-port/` en harness-load.

---

## 3. Wat is opgeleverd

- **Shell / header / settings / main toggles / toolbox:** grid-shell, titelbalk met settings- en info-acties, settings-paneelstructuur met sectie-toggles, hoofdknoppen Kennzahlen en Toolbox met bijbehorende inhoudscontainers (zie `kdbControl/framework/` en harness-mount).
- **Inputs / toggles / radio / action buttons / collapse rail:** inert galerij van primitieven en visuele states (placeholder inputs/selecties per contract F3); thematische styling in losse CSS-segmenten.
- **Inert view-only gedrag:** panel open/dicht, sectie expand/collapse, top-panel (`metrics` / `toolbox` / `settings`), collapse-rail en placeholder-weergave — zonder echte business- of integratie-acties (conform `kdbControl.md` framework tranche 1).
- **CSS thematisch opgesplitst:** onder `TEST/kdbControl-port/harness/css/kdb-control-framework/` — o.a. `shell.css`, `header.css`, `panels.css`, `form-controls.css`, `toggle-button.css`, `form-controls-radios.css`, `action-buttons.css`, `form-controls-focus.css`; geladen vanuit `TEST/kdbControl-port/harness/index.html`. Oude `parity-slice*.css` blijven stubs; inhoud is naar deze map verplaatst/geconsolideerd (zie commentaarregels in de framework-CSS-bestanden).

---

## 4. Expliciet niet opgeleverd

- Geen **Cognos**- of report-runtime-koppeling.
- Geen **header/footer-integratie** met het dashboard (alleen inert toolbox-sectie-structuur waar van toepassing).
- Geen **toolbox business actions** (geen echte tab-/comment-/layout-acties).
- Geen **echte dropdown-, radio- of action-button-semantiek** (geen productie-gedrag; alleen harness/placeholder-verificatie).
- Geen **persistence**, **history**-commits of **tableDataService**-werk.

---

## 5. Acceptatiechecks (harness / handmatig)

| Check | Verwachting |
|--------|----------------|
| **Harness load** | `harness/index.html` laadt base + alle framework-CSS-segmenten + require/harness zonder fouten. |
| **Mount / Destroy** | Knoppen `#harness-mount` / `#harness-destroy` — control mount en teardown zonder lekken van verwachte baseline. |
| **Kennzahlen / Toolbox** | Top-toggles wisselen zichtbare hoofdcontainers; state `activeTopPanel` in lijn met contract (`metrics` / `toolbox` / `settings`). |
| **Settings icon** | Settings-paneel open/dicht via header-actie. |
| **Section expand / collapse** | Settings- en toolbox-sectieknoppen tonen/verbergen doelcontainers binnen toggle-groep. |
| **Collapse rail** | Smalle rail + pijl-state bij in/uitklappen shell (`isCollapsed`). |
| **Inert primitives** | Inputs/radio/toggles tonen placeholder-updates zonder side-effects buiten kdbControl-sandbox-state. |

---

## 6. Scope compliance

- **Geen** wijziging aan **public API**, **state shape** (buiten reeds goedgekeurd framework-subtree), **reducer-contract**, **events** of **services** buiten wat voor deze tranche in contract en CP-1 is vastgelegd — deze tranche bevriest de **view sandbox**; verdere API- of orchestrator-uitbreiding is bewust niet onderdeel van CP-2.

---

## 7. Volgende aanbevolen tranche

**Authoring mode — besluit en integratie vóór** uitdieping van toolbox-gedrag en header/footer-gedrag: vastleggen waar `authoringMode` leeft (kandidaat dashboard-level split per `kdbControl.md` Q3), dan pas diepere toolbox/header-footer builders en subcontainer-DOM (aansluitend op VR2 — lege/inert bodies tot shell groen was).

---

## Bijlage: kernpaden

| Onderdeel | Pad |
|-----------|-----|
| Harness entry | `TEST/kdbControl-port/harness/index.html` |
| Framework modules | `TEST/kdbControl-port/kdbControl/framework/` |
| Thematische CSS | `TEST/kdbControl-port/harness/css/kdb-control-framework/` |
