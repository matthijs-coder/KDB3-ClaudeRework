# Contract Delta: Hide PKZ drillthrough icon during dashboard PDF capture

> Product ack pending PO vastenburg: hide the PKZ drillthrough icon in live HTML during dashboard PDF export so html2canvas 1.4.1 does not paint it. Capture class already owned by dashboardPdf.

---

**Status:** `Approved` — inner-icon hide stands. Residual empty wrapper and “no `:has()` in pdfCapture.css” are **superseded** by `dashboardPdf-legend-chrome-qa-contractdelta.md` (hide T1/S2 **wrappers** + one `:has()`).
**Parent:** `contracts/dashboardPdf.md`, `contracts/dashboardPdf-capture-chrome-hide-contractdelta.md`
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6, 2026-08-28
**Reviewed by:** PO vastenburg — Approved 2026-08-28 (chat)

---

## 1. Purpose

When `kdb-pdf-capturing` is on `#main`, hide the PKZ drillthrough icon with the same live `display: none !important` hide-set as other authoring chrome. Icon paint is the `<a>` `background-image`. Leftover `visibility: hidden` still paints in html2canvas 1.4.1, so this belongs in `pdfCapture.css`, not leftover-hide.

Amends parent hide-set only. No new class, JS, events, or CSS file.

---

## 2. Product

| Moment | PKZ drillthrough icon |
|---|---|
| Export not running | unchanged (visible as today) |
| `#main.kdb-pdf-capturing` (tab loop) | not painted |
| After outer `finally` | class off; icon as today |

Focus/expand mode: **SHOW** (not hidden; no clone). Out of scope for this delta.

---

## 3. DOM (legacy)

`.widgetHeader .widgetIcons` first child:

```
div.dataWidgetIcon.liveWidgetAnnotations[role="application"]
  a.kdb_hyperlink_icon   ← unique class; background-image is the icon
```

Source: `laatsteOriginal` `addPkzDrillthrough.js` (`addIconAfterElement`).

---

## 4. CSS

Add **one** selector to the existing grouped rule in `KDB3/css/widgets/pdfCapture.css`:

```css
#main.kdb-pdf-capturing .kdb_hyperlink_icon { display: none !important; }
```

Same gate and declaration as the rest of that rule. No second rule. No `:has()`.

### Pitfall — hide the `<a>`, not the wrapper

- Unique token is on the inner `<a class="kdb_hyperlink_icon">`. That is what paints.
- Wrapper `div.dataWidgetIcon.liveWidgetAnnotations` is **shared** with settings icons. Do **not** hide `.dataWidgetIcon` (generic) or `.liveWidgetAnnotations`.
- Do **not** hide `.widgetIcons` (Cognos native icons / remaining chrome).
- Do **not** add `:has()` here. Current `pdfCapture.css` does not use it. Wrapper collapse via `:has(.kdb_hyperlink_icon)` is leftover sizing, not this hide-set.
- Residual empty 20×20 wrapper (leftover `:has` size on the shared div) is accepted. Collapsing it would require hiding the shared wrapper or `:has` — both forbidden.
- Do not tie to gear `KDB_hide` or leftover-hide.

---

## 5. Parent hide-set additions (edit when implementing)

Append `.kdb_hyperlink_icon` to both parent hide-set lists. No other parent wording.

| File | Where | Add |
|---|---|---|
| `contracts/dashboardPdf.md` | Execution Contract stage 2 hide-set sentence | `, .kdb_hyperlink_icon` after `.widget.liveWidget.maximizable .resizeEdge.topRight` |
| `contracts/dashboardPdf-capture-chrome-hide-contractdelta.md` | §3 Hide-set (descendants of the gate) | `- `.kdb_hyperlink_icon` (PKZ drillthrough `<a>`)` |

Ownership unchanged: capture class and hide-set stay dashboardPdf.

---

## 6. Out of scope

- Focus/expand SHOW (one-liner in §2 only)
- leftover-hide, `KDB_developerMode`, gear `KDB_hide`, kdbControl "Buttons verstecken"
- New JS / capture-class / `onclone` / `ignoreElements`
- PKZ drillthrough behavior, icon insert, or migration of `addPkzDrillthrough.js`
- Hiding `.widgetIcons`, `.dataWidgetIcon`, or Cognos native header icons

---

## 7. Files (implementation later)

- `KDB3/css/widgets/pdfCapture.css` — add selector to grouped rule
- `contracts/dashboardPdf.md` — stage 2 hide-set
- `contracts/dashboardPdf-capture-chrome-hide-contractdelta.md` — §3 hide-set

---

## 8. Acceptance

1. During tab capture, html2canvas 1.4.1 does not paint `a.kdb_hyperlink_icon`.
2. Settings icons, Cognos `.widgetIcons` chrome, leftover-hide, and gear `KDB_hide` are unchanged.
3. Focus/expand still shows the icon (this delta does not hide it there).
4. After success, error, or abort, capture class is cleared as today; icon returns.
