# Execution Spec: cognosButtons allow-list invert

> Mechanical spec for grok 4.6. Architecture lives in `cognosButtons-allowlist-invert-contractdelta.md` (**Approved**, PO vastenburg 2026-09-02). CSS-only. Do not re-decide the four keepers, widget-header later, or class owner.

---

**Status:** `Frozen` — executed + dual review + PO Cognos 2026-09-02. **2026-09-03:** plugin atom = actionBar `.pluginContainer`, not `[id$="PluginContainer"]`.
**Module / contract:** `contracts/cognosButtons-allowlist-invert-contractdelta.md` (amends Ready-halt §5)
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-02
**Executing AI:** grok 4.6 army (W1 CSS)
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist

### W1 CSS (one writer)

**May edit:** `KDB3/css/cognosButtons.css`

**Must not edit:** anything else (`cssHrefList.js`, leftoverWidgets, pdfCapture, widgetVis, widgetSettings, kdbControl, properties, JS, `.mdc`, other contracts except if captain already patched parents).

---

## Section A. Pre-flight read list

Echo **one sentence** per row **before** writing the file. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — no new `_KDB` keys; this WP is CSS-only.
2. `_____________KDB3API/.cursor/rules/state.mdc` — no state writes.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — no runtime buckets.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no API change; properties still owns `applyDeveloperMode`.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — CSS-only; no vague folders; contract already approved.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — keep IBM selector strings exact (`FullScreen`, `zoomAction`, `filterDock`).
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — N/A (no JS).
9. `_____________KDB3API/.cursor/rules/dom.mdc` — IBM ids stay in this CSS file; JS catalog remains `#main` only.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — N/A (no JS).
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` / `__getDashboardAPI`.
12. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — do not invent a lifecycle for CSS gates.
13. `_____________KDB3API/contracts/cognosButtons-allowlist-invert-contractdelta.md` — four keepers always visible without overlay; invert hide otherwise; comment old, do not delete.
14. This execution spec.

---

## Section B. Folder tree

No new files. Edit only:

```
KDB3/css/cognosButtons.css
```

---

## Section C. Per-file specification

#### `KDB3/css/cognosButtons.css`

- **Role:** CSS catalog for IBM chrome hide + developer overlays
- **Lines:** legacy block (~139 commented) + new invert (~80–120 live). No JS line-limit. Keep scannable.
- **AMD / factory:** none

### C1. Comment the old file — do not delete

The current file **contains nested `/* */` comments** (`/* topbar */`, commented-out selectors). A naive wrap `/* … entire file … */` **will truncate at the first `*/`**.

Required procedure:

1. Read the entire current file.
2. Build a **legacy block** that starts with:

```css
/*
legacy deny-list 2026-09-02 — keep until invert is Cognos-verified

```

3. Copy **every original line** into that block. Neutralize inner comment tokens so the outer block stays open:
   - replace every `/*` inside the copied body with `[*`
   - replace every `*/` inside the copied body with `*]`
4. Close with `*/` on its own line.
5. **Every original selector and declaration must still be present as text** inside the comment (including already-commented `analyticsView` SUPER/USER lines). Do not omit ResetDashboard `::after` tweak. Do not “clean up” the legacy copy.

Forbidden: delete the deny-list; move it to another file; leave it live **and** add invert (double hide is ok only if legacy is commented).

### C2. Live invert — selector atoms (copy exactly)

**Allow-list tokens (case-sensitive, no `*=`):**

- `[data-id="FullScreen"]`
- `[data-id="zoomAction"]`
- `[data-id="filterDock"]`
- `[id="com.ibm.bi.dashboard.editToggleButtonPluginContainer"]`

**Toolbar except allow-list** (one compound; use on hide, dim, `::before`, `::after`):

```css
.ba-common-toolbar__item:not([data-id="FullScreen"]):not(:has([data-id="FullScreen"])):not([data-id="zoomAction"]):not(:has([data-id="zoomAction"])):not([data-id="filterDock"]):not(:has([data-id="filterDock"])):not([id="com.ibm.bi.dashboard.editToggleButtonPluginContainer"]):not(:has([id="com.ibm.bi.dashboard.editToggleButtonPluginContainer"]))
```

**Plugin except editToggle (action bar only):**

```css
[id="com.ibm.bi.dashboard.toolbars.actionBar"] .pluginContainer:not([id="com.ibm.bi.dashboard.editToggleButtonPluginContainer"])
```

**In-widget (named):**

```css
.dataWidget.dataWidgetFilters
.liveWidgetNarrativeInsights
.liveWidgetForecast
```

**Header IBM icons except T1 PKZ (WP2 — copy exactly):**

```css
.widgetHeader .widgetIcons > .dataWidgetIcon:not(:has(.kdb_hyperlink_icon))
```

Do **not** hide the `.widgetIcons` shell. Do **not** hide generic `.dataWidgetIcon`. Do **not** omit the `:not(:has(.kdb_hyperlink_icon))`. Do not target `#filterDockContainer`, `#kdb-control-root`, `.KDB3Widget`, `.kdb-share-controls`, `.kdb-datapoint-pkz`, `.kdb-widget-maximize`.

### C3. Live rule blocks (order)

After the legacy comment, emit **four** live blocks.

**Block 1 — user-mode hide**

Selectors (comma-separated), each prefixed with `#main:not(.KDB_developerMode)`:

1. toolbar except allow-list
2. plugin except editToggle
3. `.dataWidget.dataWidgetFilters`
4. `.liveWidgetNarrativeInsights`
5. `.liveWidgetForecast`
6. header IBM icons except T1 PKZ (WP2 atom)

Declarations:

```css
{
  display: none !important;
}
```

**Block 2 — developer dim** (same **six** subjects, prefix `#main.KDB_developerMode`)

```css
{
  position: relative;
  opacity: 0.75 !important;
  filter: grayscale(70%) !important;
}
```

**Block 3 — SUPER `::before`** (same six subjects + `::before`, prefix `#main.KDB_developerMode`)

Copy declarations **exactly** from the current SUPER block (`content: "SUPER"` through `color: #636363`). Do not add `transform`.

**Block 4 — USER `::after`** (same six subjects + `::after`, prefix `#main.KDB_developerMode`)

Copy declarations **exactly** from the current USER block (`content: "USER"` through `color: #636363`, including `transform: translateY(2px)`). Do **not** add the ResetDashboard `translateY(-1px)` exception (it lives only in the commented legacy).

### C4. Overlay polarity

Allow-list four must **not** appear in blocks 1–4 except as `:not(...)` exclusions. They stay undimmed in developer mode.

Do not put SUPER/USER on `.kdb-share-controls`, `.kdb-history-controls`, `.kdb-pdf-export-controls`.

### Rules to apply

- `dom.mdc` — IBM selectors in this CSS file only.
- `naming.mdc` — exact `data-id` / plugin id strings.
- `feature-structure.mdc` — no new folders; CSS-only WP.
- `cognos-adapter.mdc` — no JS Cognos calls.
- Contract §5 — comment old, do not delete.
- Contract §6 — do not hide the `.widgetIcons` shell or generic `.dataWidgetIcon`; WP2 subject is the child `.dataWidgetIcon:not(:has(.kdb_hyperlink_icon))` only.

---

## Section D–I

N/A (no reducer, no JS API, no harness).

---

## Section J. Acceptance (writer self-check)

1. File still `KDB3/css/cognosButtons.css` only.
2. Legacy deny-list fully present inside one comment; inner `/* */` neutralized; no live duplicate of old named `data-id` hide list.
3. User-mode invert hide as §C3 block 1.
4. Developer dim + SUPER + USER on invert set only.
5. Four keepers excluded from hide and overlays.
6. No `.widgetIcons` **shell** hide; no generic `.dataWidgetIcon` hide; T1 PKZ excluded via `:not(:has(.kdb_hyperlink_icon))`. No `#filterDockContainer`.
7. No JS edits. No git commit.
8. WP2 subject present on all four live blocks.

---

## Section K. Forbidden

- Delete or rewrite-away the old rules
- Nested CSS comment wrap that truncates at `/* topbar */`
- `*=` / `[id*="filterDock"]` / `fullscreen` lowercase
- Hide `.widgetIcons` **as a shell**, gear, or T1/S2 PKZ (plain `.dataWidgetIcon` without the `:not(:has(.kdb_hyperlink_icon))` is a fail)
- New events, JS, `_KDB.superUser`, `classList` on `#main`
- Edit `.mdc` or other CSS/JS files
- Invent IBM keepers beyond the four
- Skip Section A echo

---

## Section L. Writer report

1. Pre-flight echo (14 sentences)
2. File path + line count + “legacy commented | invert live”
3. Deviations (must be empty)
4. Self-check §J pass/fail
5. Open questions — stop if blocked; do not improvise

---

## Section M. Reviewer handoff

Fresh grok 4.6 (not the writer):

1. **Mechanical:** only `cognosButtons.css` changed; legacy text still in file; no JS; WP2 atom on all four live blocks.
2. **Semantic:** invert vs four keepers; overlays skip keepers; plugin `$=` + editToggle `:not`; in-widget three still hidden; header IBM `.dataWidgetIcon` hidden except T1 PKZ; gear not targeted; `.widgetIcons` shell not hidden.

PO Cognos:

1. User: FullScreen, zoom, filterDock button, editToggle visible, no SUPER/USER.
2. User: other IBM toolbar items and plugin containers gone; KDB share/history/PDF stay.
3. User: IBM header `.dataWidgetIcon` gone; gear visible; T1 PKZ (selected widget) still visible; S2/maximize still visible.
4. Developer on: hidden IBM set (including native header icons) returns with SUPER/USER; four keepers and T1 PKZ still clean.
5. Filter dock **panel** (`#filterDockContainer`) still works.
