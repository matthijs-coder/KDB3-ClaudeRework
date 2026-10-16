# CP-2 handoff — header / footer / kdbControl toolbox (sandbox)

**Date:** 2026-05-13  
**Scope:** `TEST/kdbControl-port/` only (no production tree).  
**Role:** Verification + handoff report; no new feature work beyond minimal AMD/harness alignment.

---

## 1. AMD / RequireJS policy (final verified)

| Rule | Status |
|------|--------|
| One canonical module id per script URL | **Pass** — kdbControl uses `header/...`, `footer/...`; harness uses `header/...`, `footer/...`, `kdbControl/...`. |
| Avoid parent-relative header imports from kdbControl resolving to legacy dashboard-canvas duplicate ids | **Pass** — `kdbControl/framework/__orchestratorFramework.js` and `syncFrameworkViewFromState.js` use `header/...` / `footer/...`. |
| Footer → header imports | **Pass** (this handoff) — `footer/events/eventNames.js` and `footer/state/selectors.js` now depend on **`header/events/eventNames`** and **`header/state/selectors`** (no parent-relative header import). |
| `require.config.paths` uses canonical aliases only | **Pass** — `harness/index.html`: `header`, `footer`, `kdbControl`, `authoring`, `harness`. Legacy `dashboard/canvas/*` aliases removed to avoid mixed module ids for the same files. |

---

## 2. HTTP / browser smoke

- Served repo root: `TEST/kdbControl-port` with `python -m http.server 8765`.
- Opened `http://127.0.0.1:8765/harness/index.html?cp2=final3` in browser.
- RequireJS completed harness load: **Pass**.
- Console after full run: **Pass** — no timeout, no scripterror, no destroy errors. Only Cursor browser native-dialog override warnings were present.

---

## 3. Acceptance matrix (browser final)

| # | Criterion | Result | Notes |
|---|-----------|--------|--------|
| 1 | Harness over HTTP; geen RequireJS timeout/scripterror | **Pass** | Browser-run via HTTP; no RequireJS timeout/scripterror. |
| 2 | Mount: `_KDB.api.header`, `footer`, `kdbControl` bestaan | **Pass** | Mount completed; debug-log showed lifecycle mounted and header/footer API state. |
| 3 | Kopfzeile toggle: header DOM active/remove | **Pass** | Header rendered visibly with harness-only fallback label `Kopfzeile`; removal cleared the chrome. |
| 4 | Fußzeile guard: footer alleen bij actieve header | **Pass** | Footer toggle while header idle left footer state `idle`; no DOM chrome appeared. |
| 5 | Header removed terwijl footer active → footer removed + DOM weg | **Pass** | With footer visible, header toggle-off removed both header and footer chrome. |
| 6 | Untertitel toggle: state/DOM | **Pass** | Toolbox `Untertitel anzeigen` toggled subtitle visible; subtitle radio became available. |
| 7 | Title/subtitle radio → juiste edit target + sync | **Pass** | `Titel bearbeiten` showed `Title draft`; `Titel und Untertitel bearbeiten` showed `Subtitle draft`. |
| 8 | Destroy: DOM/subscriptions, geen console errors | **Pass** | Destroy returned harness to button-only state; console stayed free of application errors. |
| 9 | Geen `_KDB.state.header/footer` writes vanuit kdbControl | **Pass** | Grep `kdbControl/**` op `_KDB.state.header` / `_KDB.state.footer`: alleen comment in `createKdbControlReducer.js`. Assignments blijven onder `header/` en `footer/`. |

---

## 4. Grep proof (foreign writes)

Command-style check (workspace grep):

- `_KDB.state.header =` → only `header/__orchestratorHeader.js`, `header/createHeaderController.js`.
- `_KDB.state.footer =` → only `footer/__orchestratorFooter.js`, `footer/createFooterController.js`.
- `kdbControl` subtree: no assignments to `state.header` / `state.footer`.

---

## 5. Files changed in this handoff

| File | Change |
|------|--------|
| `harness/index.html` | Removed legacy `dashboard/canvas/*` aliases; cache-busted harness base CSS for this final verification page load. |
| `harness/css/kdb-control-harness-base.css` | Added harness-only dashboard chrome visibility and readable debug-log styling. |
| `reports/CP-2-header-footer-kdbControl-toolbox-handoff.md` | Updated final CP-2 browser pass result. |

---

## 6. Remaining notes

1. **Header visibility:** fixed in harness CSS, not left as cosmetic. The visible `Kopfzeile` label is CSS-only placeholder chrome; it does not change header state/API/contract.
2. **`file://`:** blijft riskant voor RequireJS + OneDrive; **HTTP** vanaf `TEST/kdbControl-port` blijft de aanbevolen testmodus.

---

## 7. Overall

**CP-2 sandbox tranche:** **PASS** for AMD/RequireJS, browser acceptance, header/footer guard behavior, header visibility, destroy, and kdbControl ownership checks.
