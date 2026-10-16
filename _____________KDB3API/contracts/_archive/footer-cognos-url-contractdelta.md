# Contract Delta: `footer` Cognos URL from current location

> Delta on top of `contracts/footer.md`.
> Replaces hardcoded `https://bi-dev.digital-wien.gv.at/cognos` with the **current dashboard host** + first path segment (legacy). **PROD has no `-prod` token.**
> **Data Excellence Conform stays hardcoded.** No JS in this document.
> `Implemented` — PO vastenburg **green** 2026-09-02 (Cognos).

---

**Status:** `Implemented` — PO vastenburg **green** 2026-09-02 (Cognos)
**Parent contract:** `contracts/footer.md`
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-02
**Reviewed by:** PO (vastenburg) 2026-09-02 — live Cognos green; DEX hardcoded OK

---

## 0. Diagnosis

| Layer | Fact |
|---|---|
| Live (shipped) | `buildFooterChrome.js` `resolveFooterServerUrl()` from `document.location`. No `rightUrlEl`. Sync does not own the URL. |
| Legacy (KDB2 / _______KDB3 / REDESIGN2) | `protocol + "//" + host + "/" + href.split("/")[3]` from **current location**. No DEV/TEST/PROD map. Typical: `https://<host>/cognos`. Plain text, not `<a>`. Once at DOM build. Not footer state. |
| Drillthrough `baseLinks.js` | Separate dxportal map. **Not** this leftover. |
| `getDashboardBiBaseUrl` | `…/cognos/bi/` for **share**. Different product. Do **not** paint as-is. |
| Footer `dashboardFacet` | Stamp is **`getUserName` only**. Location is not a Cognos SDK read. View must not call the facet. |

**Type 3:** stub DEV host.

---

## 1. Purpose

Right-column URL text is **`https://<current-host>/cognos`** (first path segment of `document.location.href`), so:

| Env | Host (no map; location already has it) |
|---|---|
| DEV | `bi-dev.digital-wien.gv.at` |
| TEST | `bi-test.digital-wien.gv.at` |
| PROD | `bi.digital-wien.gv.at` (**not** `bi-prod`) |

**Data Excellence Conform** remains the literal `"Data Excellence Conform"`.

---

## 2. Paint

Factory-scope helper in **`buildFooterChrome.js`** (legacy `resolveServerUrl`):

- `document.location` (not `window.top`; same document as share-d4).
- `parts = href.split("/")`; if `parts.length < 4` → `location.origin` or `""`.
- else `protocol + "//" + host + "/" + parts[3]`.
- try/catch → `""` (do not throw out of chrome build).
- Assign to the existing unnamed right URL `div.textContent`.
- Shape: **no** `/bi/`, **no** trailing `/`, **not** `<a>`.

Hide/show tears down footer DOM; `ensureFooterMounted` rebuilds chrome → URL is fresh. **No** footer state. **No** `rightUrlEl` plumbing. **No** `__mountSync` load. **No** new facet op.

---

## 3. Out of scope

- DEX string, page indicator, `canvasExtensionBottom`, `getUserName`.
- Binding `getDashboardBiBaseUrl` / `getEnvironmentSource` on this leftover.
- History / writeback.
- 10th controller import, 6th effects import.

---

## 4. Approval log

| Date | Actor | Note |
|------|-------|------|
| 2026-09-02 | PO | DEX hardcoded OK; URL host must follow DEV/TEST/PROD (prod no extra token). |
| 2026-09-02 | army | Legacy = location first segment, not env map. |
| 2026-09-02 | dual review | Mechanical + semantic PASS. JS in `buildFooterChrome.js` only. |
| 2026-09-02 | PO (vastenburg) | Cognos green. `Approved-for-implementation` → `Implemented`. Leftover closed. |
