# Vendored libraries

Third-party code loaded by KDB3. Do not edit these files by hand. jQuery and jQuery UI (JS) come from the Cognos host and are not shipped here.

## JS (`js/core/libraries/`)

| Library | Version | File | Loader | License | Used for |
|---|---|---|---|---|---|
| jsTree | 3.3.17 (header URL says 3.3.12) | `jstree.min.js` | `dashboard/metricsTree/view.js:3` | MIT | Metrics tree |
| html2canvas | 1.4.1 | `html2canvas.min.js` | `workflows/pdfExport/vendors.js:10` (runtime `require`) | MIT | Dashboard PDF export (DOM to canvas) |
| jsPDF | 2.4.0 | `jspdf.umd.min.js` | `workflows/pdfExport/vendors.js:9` (runtime `require`) | MIT | Dashboard PDF export (PDF document) |

## CSS (`css/libraries/`)

| Library | Version | File | Loader | License | Used for |
|---|---|---|---|---|---|
| jsTree default theme | 3.3.12 | `style.min.css`, sprites `32px.png`, `40px.png` | `core/css/config/cssHrefList.js` | MIT | Metrics tree styling |
| jQuery UI base theme | 1.13.0 | `jquery-ui.css` | `core/css/config/cssHrefList.js` | MIT | Resizable/draggable/sortable handles and widget styles (jQuery UI JS is provided by the host) |

`jquery-ui.css` refers to `images/ui-icons_*.png`, which are not shipped in `css/libraries/`.

Font Awesome 5.15.1 (`all.min.css`) was removed in WS-P: no `fa-*` class was used and its webfonts were never shipped. `jquery-ui.min.js` was removed in PR #1.

## Encoding policy

All files are UTF-8 with CRLF line endings. JS files that contain non-ASCII characters (`html2canvas.min.js`, `jspdf.umd.min.js`; jsPDF has non-ASCII bytes inside its string literals) keep a UTF-8 BOM so the loader cannot guess a wrong charset. `jstree.min.js` and the CSS files are pure ASCII.

Re-encoding from UTF-16 LE was lossless: decoding the old files gives exactly the bytes of the new files (without the BOM).

## Update procedure

1. Replace the file. Keep the name, or update the loader path.
2. Keep the encoding policy above (BOM on JS with non-ASCII content).
3. Run `node tools/check-all.mjs`.
4. Smoke: checklist item 1.13 (PDF export) and the WS-K metrics tree items in `tools/smoke-checklist.md`.

## Known debt

- jsPDF 2.4.0 should move to 2.5.x (ReDoS fixes).
- `jquery-ui.css` can be trimmed to the parts actually used.
