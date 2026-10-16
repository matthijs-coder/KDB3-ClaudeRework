# Contract Delta: PDF overlay sandwich captions (session + stage)

> Sticky German session line **above** the spinner for the whole PDF overlay; changing stage line **below**. Spinner **80px** (Cognos taste first). Same tab-list mount. No second `startLoading`. Encode unchanged.

---

**Status:** `Approved` — PO vastenburg 2026-09-04; Cognos green; WP closed (spinner 80; sandwich).
**Type:** `shared service contract delta` + `dashboardPdf` caller wiring
**Authoring AI:** Cursor Grok 4.6 (coordinator), 2026-09-04
**Reviewed by:** army layout/API stress 2026-09-04; PO product + Cognos numbers + go same day
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`, `cognos-adapter.mdc`

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/loadingService-dashboardPdf-progress-caption-contractdelta.md` | Lock 4 (duration only on start line); compact CSS 32px / 11px; start `messageKey: "pdfExport"` on the single caption |
| `contracts/loadingService.md` | `startLoading` options: optional session caption |
| `contracts/loadingService-overlay-coverage-contractdelta.md` | Markup: still Cognos spinner + `.KDB_loadingMessage`; optional second node only when session caption is used |
| `contracts/dashboardPdf.md` | Execution Contract §2 start uses `sessionMessageKey: "pdfExport"` (not stage `messageKey`) |

**Reaffirmed:** overlay stays tab-list inner, never `.pagegenericPage`. Tab-page overlay still skipped for `source === "dashboardPdf"`. `watchdogMs: 1800000`. Double-rAF before html2canvas. No encode change. No DE in `dashboardPdf/**`. No events. No second `startLoading`. Catalog strings in `loadingLabels.js` unchanged (`Minuten`, no freeze clause on `pdfTabCapture`).

---

## 1. Purpose

Cognos showed the 32px compact spinner in a **161px** mount (too small) and the duration sentence only until `pdfTitle` overwrote the one `<p>`. This WP keeps that sentence visible for the whole overlay (including html2canvas freeze) as a **session** line above the spinner, and keeps stage/tab n-of-m **below**. It does not move the overlay onto the canvas.

---

## 2. Closed product decisions (PO vastenburg 2026-09-04)

| # | Decision |
|---|---|
| 1 Sandwich | Session line **above** spinner, stage line **below**, for the whole PDF overlay lifetime. |
| 2 Spinner | **80px** first (not 32, not 110). Taste; 110 remains a later PO call. |
| 3 Caption size | **14px / 1.4** for both session and stage on the PDF mount (drop the 11px compact). |
| 4 Overflow | Keep `overflow: hidden` on the PDF tab-list + `.KDB_loading`. Do not spill onto the canvas. |
| 5 Copy | Keep `pdfExport` = `PDF-Export läuft – das kann einige Minuten dauern`. Do not switch to `Momente`. Stage keys unchanged. Capture line gets **no** extra freeze sentence. |
| 6 Lock 4 (amended) | Duration hint is the **sticky session line** for the whole overlay. Stage lines replace each other **below** the spinner only. Duration is **not** spliced into `pdfTabCapture`. |
| 7 Encode / mount | Unchanged: no JPEG/scale/`toBlob`; no overlay on `.pagegenericPage`. |

---

## 3. Opt-in session caption (not a PDF `mountKey` special-case)

Do **not** branch loadingService on `"dashboard-pdf-export"`. Boot / SET / GET / vis / tree / slot stay one caption **below** the spinner.

`startLoading` gains optional session fields. Same resolve rule as stage (`message` if non-empty string, else `labels.de.loading[messageKey]`, else empty):

```js
startLoading({
  mountEl?,
  mountKey?,
  transparent?,
  watchdogMs?,
  message?,              // stage (or the only caption when session resolves empty)
  messageKey?,
  sessionMessage?,       // optional sticky line
  sessionMessageKey?
})
```

When the resolved session string is **non-empty**:

- Ensure `<p class="KDB_loadingSessionMessage">` is a **direct child** of the stored spinner container, **before** `.loading_indicator`.
- Stage remains `<p class="KDB_loadingMessage">` **after** the spinner (existing node).
- DOM order = sandwich (container is already column flex; spinner is `position: relative` under `.KDB_loading`). No extra mount class; do not stamp `KDB_loading--sessionStage`.

When session resolves **empty**: do not insert the session node. Markup stays overlay-coverage (spinner + one `.KDB_loadingMessage`).

`updateLoadingMessage` still `{ handle?, mountKey?, message?, messageKey? }`. It writes **only** `.KDB_loadingMessage` (stage). It must **not** use a generic `.KDB_loadingMessage` query that could hit a session node (session uses a **different class**). It never changes session text, `activeCount`, overlay insert, watchdog, or `KDB_loading`.

`finishLoading` / `destroy` still tear down the whole spinner container (session node included). Empty stage still hides `.KDB_loadingMessage` as today (`hidden` / `:empty`). Empty session hides `.KDB_loadingSessionMessage` the same way.

No `detailMessage` formatter, no `replacements`, no events, no `_KDB.state` writes from caption updates.

---

## 4. PDF caller

Start (before vendor load, as today):

```js
startLoading({
  mountEl: context.mountEl,
  mountKey: "dashboard-pdf-export",
  transparent: false,
  watchdogMs: 1800000,
  sessionMessageKey: "pdfExport"
})
```

Do **not** also pass `messageKey: "pdfExport"` (that would duplicate the duration line as the stage caption). Stage stays empty until the first `updateLoadingMessage`.

Mid-run stage updates **unchanged**: title / Anhang / save via `bindProgressCaption`; prepare / capture via `captureTabPage` + `formatPdfLoadingCaption`. `{n}` / `{m}` still visible-tab ordinal. Ignore `stage === "capture"` on the progress binder. Double-rAF + abort before html2canvas stays.

Missing loadingService / handle: same coded warnings; export continues; no second overlay.

---

## 5. CSS (PDF mount + generic session node)

Replace the PDF compact spinner/caption block in `KDB3/css/loadingAnimation.css`. **Do not** restyle slot/tree (those stay 32px / 11px). z-index stays **1000**.

```css
.KDB_loading .KDB_loadingSessionMessage {
  margin: 0 0 12px;
  color: #323232;
  font-size: 14px;
  line-height: 1.4;
  text-align: center;
}
.KDB_loading .KDB_loadingSessionMessage:empty,
.KDB_loading .KDB_loadingSessionMessage[hidden] {
  display: none;
  margin: 0;
}

.ba-common-container.ba-common-tabList__innerContainer.KDB_loading {
  overflow: hidden;
}
.ba-common-container.ba-common-tabList__innerContainer.KDB_loading .ba-common-progressIndicator.is-circle.is-large {
  width: 80px;
  height: 80px;
}
.ba-common-container.ba-common-tabList__innerContainer.KDB_loading .KDB_loadingMessage,
.ba-common-container.ba-common-tabList__innerContainer.KDB_loading .KDB_loadingSessionMessage {
  font-size: 14px;
  line-height: 1.4;
}
```

Default `.KDB_loadingMessage` (14px, margin-top 12px) stays the stage line under the spinner. Do not add canvas / `.pagegenericPage` / `#kdb-control-*` selectors.

---

## 6. Out of scope

- Spinner 110px (later PO taste)
- Horizontal row layout
- Concatenating session+stage into one `<p>`
- Branching on `mountKey === "dashboard-pdf-export"` inside loadingService
- Second overlay / overlay on capture root
- Encode quality; pdfExportControls English crumbs
- New events / `_KDB` namespace / lifecycle term / cognosHost facet
- Growing any JS file past 150 / AMD 10 without PO

---

## 7. Acceptance

1. During PDF, overlay is still the tab-list inner mount; canvas has no KDB loading overlay.
2. From click through vendor load: session line `pdfExport` is visible **above** an **80px** spinner; stage `<p>` hidden/empty.
3. From title through last tab / Anhang / save: session line **stays**; stage line below updates. `{n}`/`{m}` = visible-tab ordinal.
4. During `wird erfasst` the session line is still on the overlay (frozen spinner OK). PDF must not contain spinner or captions.
5. Boot / SET / GET / vis / tree / slot: still one caption below spinner; no session node; slot/tree still 32px.
6. `updateLoadingMessage` does not bump `activeCount` or reset watchdog; does not rewrite the session node.
7. `runDashboardPdfExport.js` ≤150. No DE literals in `dashboardPdf/**`.

---

## 8. Cognos checklist (PO)

1. PDF: duration sentence above the circle for the **whole** run; tab n/m (and title/Anhang/save) **below**.
2. Circle looks clearly larger than the 32px trial (80px). If still too small / too big, report — do not self-resize in code.
3. Canvas not covered by the overlay; PDF has no spinner/caption.
4. After download, tab-strip overlay gone.
5. Other loading overlays (boot, tree, slot) unchanged.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-04 | Draft → Approved | PO vastenburg | Sandwich OK; go; spinner 80 first. Live mount 161×664. Lock 4 amended to sticky session line. |
| 2026-09-04 | Hygiene | coordinator | Drop unused `KDB_loading--sessionStage` (DOM order is the sandwich). Launch prompt archived. |
| 2026-09-04 | Cognos green — WP closed | PO vastenburg | Final Cognos check green. |
