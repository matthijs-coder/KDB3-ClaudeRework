# Execution spec: kdbControl framework tranche 2 (visual parity, Strategy B)

**Contract:** [kdbControl.md](./kdbControl.md) Section 13. **Mapping:** [kdbControl-framework-visual-parity-mapping.md](./kdbControl-framework-visual-parity-mapping.md). **Fix fragments (if JS is touched):** [kdbControl-framework-fix-spec.md](./kdbControl-framework-fix-spec.md), [kdbControl-framework-fix2-spec.md](./kdbControl-framework-fix2-spec.md).

---

## Section A — Pre-flight echo (before any change)

- **Strategy B:** English technical state/DOM (`metrics`, current ids/BEM); no legacy-only class shims; rewrite legacy *concepts* onto current selectors per mapping table.
- **Forbidden:** Cognos, new events, services, API surface, `controlDefinitions[]`, `registerControl`, business behavior, legacy file edits.
- **JS/DOM:** Change builders or `syncFrameworkViewFromState.js` only if execution documents a parity gap that CSS cannot fix; otherwise CSS + harness wiring only.
- **Line limits:** Any touched `.js` must stay under fix-spec D1 / framework hard limits; no nested listener functions in `__controller` (amd.mdc); runtime context only via `_KDB.runtime.kdbControl.frameworkBindContext` (fix2).

---

## CSS location choice

**Chosen:** `TEST/kdbControl-port/harness/css/`.

**Why:** Styles are harness-delivered for the port; relative `<link>` paths stay stable when opening `harness/index.html` via `file://` or a static server; no coupling of visual test CSS into production-shaped `kdbControl/framework/` until a later packaging decision.

---

## Files in scope

| File | Rules to apply |
|------|----------------|
| [TEST/kdbControl-port/harness/index.html](../../TEST/kdbControl-port/harness/index.html) | Link external CSS; remove duplicated inline rules moved to `harness/css/`. |
| [TEST/kdbControl-port/harness/css/kdb-control-harness-base.css](../../TEST/kdbControl-port/harness/css/kdb-control-harness-base.css) | Visibility/section behavior required by existing sync (mapping rows 26, 34–35, 43–44). |
| [TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice1.css](../../TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice1.css) | Shell + collapse strip (mapping rows 22–27). |
| [TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice2.css](../../TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice2.css) | Header + top toggles (mapping rows 28–34). |
| [TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice3.css](../../TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice3.css) | Panel + section chrome (mapping rows 36–44, 54; `.kdb-control_section_open`). |
| [TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice4.css](../../TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice4.css) | Primitive gallery polish only (mapping row 44). |
| [TEST/kdbControl-port/harness/harness.js](../../TEST/kdbControl-port/harness/harness.js) | Anti-D1: mandatory try/catch on named executables; mount/destroy convert errors; no API changes. |

**Not in scope (this execution):** `kdbControl/**/*.js` unchanged — no documented DOM parity gap.

---

## Slice traceability (legacy concept → current selector)

### Slice 1 — Shell and collapse

| Legacy (reference) | Current target |
|--------------------|----------------|
| `#kdb-control_top-level_container` grid + collapsed column | `#kdb-control-root.kdb-control`, `.kdb-control_collapsed` |
| `#kdb-control_arrow_container` | `#kdb-control-arrow.kdb-control__collapse-arrow` |
| `#kdb-control_content_container` inner layout | `#kdb-control-content.kdb-control__content`, `.kdb-control_content_hidden` |

### Slice 2 — Header and top toggles

| Legacy (reference) | Current target |
|--------------------|----------------|
| `#kdb-control_header_container`, `#kdb-control_title_text` | `.kdb-control__header`, `.kdb-control__header-title` |
| `#kdb-control_main-toggles_container`, `.kdb-control_button-layout` | `#kdb-control-main-toggles`, `.kdb-control__top-toggle` |
| `.kdb-control_selected` (toggle) | `.kdb-control__top-toggle.kdb-control_selected` |

**toggleButton.css:** Not imported; legacy `KDB_ToggleButton_*` is for switch widgets, not the main three-way panel toggles. Top toggle chrome comes from `.kdb-control_button-layout` concepts mapped to `.kdb-control__top-toggle`.

### Slice 3 — Panel chrome

| Legacy (reference) | Current target |
|--------------------|----------------|
| `#kdb-control_kennzahlen_container` | `#kdb-control_metrics_container`, `.kdb-control__panel-metrics` |
| `#kdb-control_toolbox_container` | `#kdb-control_toolbox_container`, `.kdb-control__panel-toolbox` |
| settings container blocks | `#kdb-control_settings_container`, `.kdb-control__panel-settings` |
| `.kdb-control_toolbox-toggle_container` / settings-toggle | `.kdb-control__section-shell`, `.kdb-control__section-head`, `.kdb-control__section-body`, `.kdb-control_section_open` |
| `.KDB_visible` / selected on panels | `.kdb-control__panel.KDB_visible`, `.kdb-control__panel.kdb-control_selected` |

### Slice 4 — Primitive polish

| Legacy (reference) | Current target |
|--------------------|----------------|
| Inert control rows (gallery only) | `.kdb-control__primitive-gallery`, `.kdb-control__gallery-row`, `.kdb-control__gallery-input`, `.kdb-control__inert-btn` |

---

## Acceptance

- **Viewport:** Side-by-side checkpoint definition: **1280×720 CSS pixels** (harness left column); parity CSS targets the control root max-width 28rem inside that viewport.
- **Anti-D1:** Harness `mount` / `destroy` buttons wrap API calls in try/catch and log errors to `#harness-debug-log`.
- **Anti-D2:** No changes to `createKdbControlController.js` teardown order; manual verify: destroy still clears `abortControllers.frameworkView` and DOM (existing tranche 1 behavior).
- **Lint:** `ReadLints` on any edited `.js` (harness.js only).

---

## Checkpoint (Executor stop)

Stop after: contract §13 CP-1 log + this spec + harness CSS slices 1–4 + harness wiring + anti-D1 harness + acceptance documented above. No further tranche-2 work beyond this spec without a new CP.
