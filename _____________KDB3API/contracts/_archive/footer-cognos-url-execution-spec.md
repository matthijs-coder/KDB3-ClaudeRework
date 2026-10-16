# Execution Spec: `footer` Cognos URL from location

> Mechanical spec. Architecture: `footer-cognos-url-contractdelta.md`. DEX stays hardcoded. No facet. No footer state.

---

**Status:** `Frozen` — PO Cognos green 2026-09-02
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-02
**Executing AI:** grok 4.6 subagent
**Reviewer:** captain + dual grok 4.6 + PO Cognos

---

## Exclusive allowlist

**May edit:**

- `KDB3/js/dashboard/footer/view/buildFooterChrome.js` only

**Must not edit:** `syncFooterFromState.js`, reducer, initialState, controller, effects, `getDashboardBiBaseUrl.js`, `baseLinks.js`, `KDB.js`, history, `.mdc`, git.

---

## Section A (echo before files)

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/dom.mdc` — chrome builder may read `document.location`; not `_KDB.state.tabs` / facet.
3. `_____________KDB3API/.cursor/rules/amd.mdc` — stay 1 AMD; factory-scope helper; no nested functions inside `buildFooterChrome`.
4. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on the URL helper.
5. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` / `__getDashboardAPI` / facet from chrome.
6. `_____________KDB3API/.cursor/rules/naming.mdc` — English helper name e.g. `resolveFooterServerUrl`.
7. `_____________KDB3API/contracts/footer-cognos-url-contractdelta.md`
8. This spec.

---

## Section C

#### `KDB3/js/dashboard/footer/view/buildFooterChrome.js`

- **AMD:** keep `"../../../core/cognosHost/config/rootChromeSelectors.js"` only.
- **Factory-scope:** `function resolveFooterServerUrl()` (not nested in `buildFooterChrome` / `div`).
- **Body of helper:**
  1. try/catch; on catch `console.error("[footer.resolveFooterServerUrl]", err); return ""`
  2. `loc = document.location` if `typeof document !== "undefined"` else null; if !loc return `""`
  3. `href = String(loc.href || "")`; `parts = href.split("/")`
  4. if `parts.length < 4` return `loc.origin || ""`
  5. return `loc.protocol + "//" + loc.host + "/" + parts[3]`
- Replace the hardcoded DEV string: `rightUrl.textContent = resolveFooterServerUrl();`
- Keep `centerDex.textContent = "Data Excellence Conform"`.
- Keep page indicator chrome `"1"` (sync already overwrites when index is a number).
- Do not add `rightUrlEl` to the return object.
- **Lines:** current 48; stay ≤ 80.
- **Rules:** `amd.mdc`; `dom.mdc`; `error-handling.mdc`; `cognos-adapter.mdc`.

---

## Section J

1. No `bi-dev.digital-wien.gv.at` literal in footer JS.
2. DEX literal unchanged.
3. Chrome AMD still 1. Controller 9. Effects 5.
4. No facet / `_KDB.cognosAPI` in this file.
5. Helper is factory-scope.
6. Report Section L.

---

## Section K

- Edit other footer files; facet; `baseLinks.js`; 10th/6th AMD; git; skip Section A.

---

## Section M

PO: on DEV the line still looks like `https://bi-dev.digital-wien.gv.at/cognos`; on TEST `bi-test`; on PROD `https://bi.digital-wien.gv.at/cognos`. DEX unchanged.
