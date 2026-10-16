# Contract Delta: cognosButtons invert — IBM allow-list + developer overlays

> Product ack PO vastenburg 2026-09-02: user-mode keeps **four dashboard-level IBM controls**. All other IBM toolbar items and plugin containers hide. Developer mode (`#main.KDB_developerMode`) shows the hidden set with SUPER/USER overlays. Allow-list stays **normal** (no overlay) in both modes. Old deny-list in `cognosButtons.css` is **commented out**, not deleted.
>
> **2026-09-02 WP2:** also hide IBM `.widgetHeader .widgetIcons > .dataWidgetIcon` in user mode. Gear is `.KDB_widgetSettingsButton` (no `.dataWidgetIcon`) and stays visible. Canvas T1 PKZ **is** a `.dataWidgetIcon` in that host — exclude `:has(.kdb_hyperlink_icon)`. Do not hide the `.widgetIcons` shell.
>
> **2026-09-03:** Plugin-container invert is **dashboard action bar only**: `[id="com.ibm.bi.dashboard.toolbars.actionBar"] .pluginContainer`, not `[id$="PluginContainer"]` (that glob hits Cognos main-menu plugins, e.g. `whatIfPluginContainer`). Edit-toggle id stays excluded. Same subject on hide / dim / SUPER / USER.

---

**Status:** `Implemented` — PO Cognos 2026-09-02 in order; **2026-09-03** plugin invert scoped to actionBar `.pluginContainer`.
**Type:** `CSS catalog contract delta` (no new module, no JS)
**Authoring AI:** Cursor Grok 4.6 (coordinator), 2026-09-02
**Reviewed by:** PO vastenburg
**Related rules:** `feature-structure.mdc` (Module Contract First), `dom.mdc` (IBM ids stay in this CSS file; JS catalog remains `#main` only), `cognos-adapter.mdc` (no `_KDB.cognosAPI` from CSS/JS in this WP)

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/kdb-ready-halt-developer-mode-contractdelta.md` §5 + §8 | Deny-list of named IBM ids → invert + allow-list |
| `contracts/kdbControl-developer-mode-toggle-contractdelta.md` | Class owner / polarity unchanged. This WP only changes **which** IBM nodes the class reveals. |
| `contracts/leftover-widgets-developer-hide-contractdelta.md` | Unchanged. Other surface (`visibility` on leftover `.widget`). Same class. |
| `contracts/widgetVis-drillthrough-service-contractdelta.md` / `widgetVis.md` | T1 PKZ host unchanged; sibling IBM `.dataWidgetIcon` now hidden here |

---

## 1. Purpose

End users must see only these IBM dashboard controls (plus existing KDB chrome that this sheet never targeted):

| Keep (always, no SUPER/USER) | Selector (exact, case-sensitive) |
|---|---|
| Full screen | `[data-id="FullScreen"]` |
| Zoom | `[data-id="zoomAction"]` |
| Filter dock toggle | `[data-id="filterDock"]` |
| Edit / view toggle | `[id="com.ibm.bi.dashboard.editToggleButtonPluginContainer"]` |

Everything else that this sheet owns: **off** in user mode; **on + dim + SUPER/USER** in developer mode.

These four strings are **PO Cognos-DOM knowledge**. They do not appear in the KDB JS catalog. Proof is Cognos after implement, not a repo grep.

---

## 2. Ownership (unchanged)

| Concern | Owner |
|---|---|
| Class `KDB_developerMode` on `#main` | **properties** (`applyDeveloperMode`) |
| Hide/overlay catalog | **`KDB3/css/cognosButtons.css` only** |
| Leftover widgets | `leftoverWidgets.css` — do not merge |
| PDF capture chrome | `pdfCapture.css` / `kdb-pdf-capturing` — do not merge |
| Gear `KDB_hide` | widgetSettings — do not reuse |

No JS. No new `_KDB` namespace. No `classList` on `#main` from this WP. kdbControl does not change.

---

## 3. User mode (`#main:not(.KDB_developerMode)`)

Three hide families **plus header IBM icons**. Gate every hide with `#main:not(.KDB_developerMode)`. `display: none !important`.

### 3.1 Toolbar items (invert)

Hide every `.ba-common-toolbar__item` **except** an item that **is or contains** one of:

- `[data-id="FullScreen"]`
- `[data-id="zoomAction"]`
- `[data-id="filterDock"]`
- `[id="com.ibm.bi.dashboard.editToggleButtonPluginContainer"]`

Keep-matcher must cover `data-id` on the item **or** a descendant (`:not([data-id]):not(:has([data-id]))` per token). Do **not** use `*=` / substring match.

`[data-id="filterDock"]` is **not** `#filterDockContainer`. Do not write `[id*="filterDock"]`.

### 3.2 Plugin containers (action bar only)

```css
#main:not(.KDB_developerMode)
  [id="com.ibm.bi.dashboard.toolbars.actionBar"]
  .pluginContainer:not([id="com.ibm.bi.dashboard.editToggleButtonPluginContainer"])
```

- Class `.pluginContainer` (IBM host), **not** `[id$="PluginContainer"]`.
- Scope: descendants of `[id="com.ibm.bi.dashboard.toolbars.actionBar"]` only. Main-menu plugins (e.g. `#com.ibm.ca.whatIf.whatIfPluginContainer`) stay out.
- Edit-toggle keep: `:not` that exact id.
- Named share/save/undo/redo ids are a **subset** if they are `.pluginContainer` in this bar. Do not re-list them as live named hides.
- KDB share/history/PDF roots are `.kdb-*-controls` in `.leading`, **not** `.pluginContainer`.

### 3.3 In-widget IBM (named, keep)

Still hide (not toolbar items, not PluginContainers):

- `.dataWidget.dataWidgetFilters`
- `.liveWidgetNarrativeInsights`
- `.liveWidgetForecast`

Same SUPER/USER treatment as the invert set when developer is on.

### 3.4 Widget-header IBM icons (WP2)

```css
#main:not(.KDB_developerMode)
  .widgetHeader .widgetIcons > .dataWidgetIcon:not(:has(.kdb_hyperlink_icon))
```

- Direct child `>` only (same grain as `widgetChromeSelectors.js` `canvasIconsSelector`).
- **Keep:** `.KDB_widgetSettingsButton` (not `.dataWidgetIcon`).
- **Keep:** T1 PKZ wrapper — it **is** `.widgetHeader .widgetIcons > .dataWidgetIcon` with inner `.kdb_hyperlink_icon`. The `:not(:has(.kdb_hyperlink_icon))` is mandatory. Do not use `:not(.liveWidgetAnnotations)` (T1 and natives share that class).
- **Keep:** S2 `.kdb-datapoint-pkz`, canvas `.kdb-widget-maximize`, settings `[data-kdb-settings-icon-action]` (not under `.widgetHeader .widgetIcons`).
- **Do not** hide `.widgetIcons` as a shell (kills gear). **Do not** hide generic `.dataWidgetIcon` (kills settings bar).

Same SUPER/USER as §3.1–3.3 when developer is on. T1 PKZ: no overlay (excluded from this selector).

---

## 4. Developer mode (`#main.KDB_developerMode`)

Hide rules **do not match** → the invert set becomes visible.

Dim + `::before { content: "SUPER" }` + `::after { content: "USER" }`: copy the **existing** overlay declarations onto the **same invert set** as §3 (toolbar items minus allow-list, actionBar `.pluginContainer` minus editToggle, three in-widget classes, header IBM `.dataWidgetIcon` minus T1 PKZ).

**Allow-list four: no dim, no SUPER, no USER** — they look like production in both modes.

KDB chrome (`.kdb-share-controls`, `.kdb-history-controls`, `.kdb-pdf-export-controls`, `#kdb-control-root`, `#filterDockContainer`, tabs, gear, T1/S2 PKZ, maximize) is **not** in this sheet’s overlay selectors.

---

## 5. File discipline

Path: `KDB3/css/cognosButtons.css` only.

1. Wrap today’s live deny-list (hide + dim + SUPER + USER + ResetDashboard `::after` tweak) in **one** comment block. Header: `legacy deny-list 2026-09-02 — keep until invert is Cognos-verified`. Do **not** delete.
2. Append the new invert rules **after** the comment block.
3. Do not edit `cssHrefList.js`, leftover, pdfCapture, widgetVis, kdbControl, properties JS.

---

## 6. Out of scope

- Hiding the `.widgetIcons` **shell** or generic `.dataWidgetIcon` (gear / settings bar / T1 PKZ).
- `.actionToolbarPopover` wholesale hide (already omitted on purpose in `canvas.css`).
- Gear `KDB_hide`, leftover widgets, PDF capture, tab list, filter-dock **panel** (`#filterDockContainer`).
- JS MutationObserver / IBM id catalog in JS.
- `[id$="PluginContainer"]` glob (Cognos main-menu).
- Renaming persist-id `KDBHideWidgetsToggle` or moving leftover CSS off `KDB_developerMode`.
- Replanting T1 PKZ off `.widgetHeader .widgetIcons`.

---

## 7. Acceptance

1. User mode: FullScreen, zoomAction, filterDock, editToggle **visible and unstyled** (no SUPER/USER).
2. User mode: other `.ba-common-toolbar__item` hidden; actionBar `.pluginContainer` hidden except editToggle; three in-widget classes hidden; IBM `.widgetHeader .widgetIcons > .dataWidgetIcon` hidden except T1 PKZ (`:has(.kdb_hyperlink_icon)`). Cognos main-menu `.pluginContainer` (outside actionBar) **not** hidden.
3. User mode: KDB share / history / PDF / kdbControl / filter dock panel / tabs / gear / T1+S2 PKZ still visible.
4. Developer on: hidden IBM set visible with dim + SUPER/USER. Allow-list four still without overlay.
5. Developer off: same as (1)–(3). Class owner still properties.
6. Old deny-list present as comments in `cognosButtons.css`.

---

## 8. Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-02 | Draft | — | PO named the four keepers and overlay rule. Widget-header leak called out in §6. |
| 2026-09-02 | Draft → Approved | PO vastenburg | Widget-header later. Implement: comment old CSS, do not delete. |
| 2026-09-02 | Approved (WP2) | PO vastenburg | Hide `.widgetHeader .widgetIcons .dataWidgetIcon`. Captain: exclude T1 PKZ `:has(.kdb_hyperlink_icon)`; do not hide gear (not that class). |
| 2026-09-02 | Implemented | PO vastenburg | Cognos host: FullScreen/zoom/filterDock/editToggle; KDB share/history/PDF/filterpaneel; gear+T1 PKZ; developer SUPER/USER. WP closed. |
| 2026-09-03 | Implemented (actionBar scope) | PO vastenburg | Replace `[id$="PluginContainer"]` with `[id="com.ibm.bi.dashboard.toolbars.actionBar"] .pluginContainer`. Hide/dim/SUPER/USER. |
