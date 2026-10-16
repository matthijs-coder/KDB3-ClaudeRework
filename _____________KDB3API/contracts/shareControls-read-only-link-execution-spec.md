# Execution Spec: share link KDB read-only chrome (pad A)

> Mechanical spec for grok 4.6. Architecture lives in `contracts/shareControls-read-only-link-contractdelta.md`. Do not re-decide pad A, polarity, token, or hide-set.

---

**Status:** `Executed` — PO Cognos green 2026-09-04. Do not re-run W1–W4.  
**Live law:** `shareControls-read-only-link-contractdelta.md` — token `readOnly=1` exact; inbound A/B query-then-hash; second apply in `KDB.js`. Do not restore hex `7c91e04b2a1f` or hash-only apply.
**Module / contract:** `contracts/shareControls-read-only-link-contractdelta.md` (amends `shareControls.md` + `messageService.md`)
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-04
**Executing AI:** grok 4.6 army W1–W4
**Reviewer:** next captain + fresh dual grok 4.6 review + PO Cognos

---

## Exclusive allowlists

No two writers on the same file. Do not merge slices.

### W1 — token/class/labels + hide CSS

**May create:**

- `KDB3/js/dashboard/controls/shareControls/config/shareReadOnlyToken.js`
- `KDB3/js/dashboard/controls/shareControls/config/shareReadOnlyClass.js`
- `KDB3/css/shareReadOnly.css`

**May edit:**

- `KDB3/js/dashboard/controls/shareControls/config/shareLabels.js`
- `KDB3/js/core/css/config/cssHrefList.js`

**Must not edit:** orchestrator, apply helper, `bindShareClick`, `buildShareDashboardLink`, messageService, `KDB.js`.

### W2 — inbound reconcile

**May create:**

- `KDB3/js/dashboard/controls/shareControls/effects/applyShareReadOnlyChrome.js`

**May edit:**

- `KDB3/js/dashboard/controls/shareControls/__orchestratorShareControls.js`

**Must not edit:** W1 files, W3 files, messageService, `KDB.js`, `cleanupShareControlsRuntime.js`.

### W3 — outbound dual URL + dialog open

**May create:**

- `KDB3/js/dashboard/controls/shareControls/effects/openShareCopyDialog.js`

**May edit:**

- `KDB3/js/dashboard/controls/shareControls/effects/buildShareDashboardLink.js`
- `KDB3/js/dashboard/controls/shareControls/effects/bindShareClick.js`

**Must not edit:** controller (AMD already 6), orchestrator, apply helper, messageService, `KDB.js`.

### W4 — copyable toggle UI

**May create:**

- `KDB3/js/core/services/messageService/view/appendCopyableToggle.js`
- `KDB3/js/core/services/messageService/view/bindCopyableToggle.js`

**May edit:**

- `KDB3/js/core/services/messageService/view/buildMessageDialog.js`
- `KDB3/js/core/services/messageService/view/bindMessageDialog.js`
- `KDB3/css/messageService.css`

**Must not edit:** `createModalQueue.js`, `createMessageService.js`, `renderMessageDialog.js` (unless a one-line AMD pass-through is proven required — default: **do not**), shareControls, `KDB.js`.

---

## Section A. Pre-flight read list

Echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — no new `_KDB` top-level; class token in owner config.
2. `_____________KDB3API/.cursor/rules/state.mdc` — no state subtree; URL class is chrome, not persist.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — destroy does not `classList` `#main`; no new runtime bucket.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — share is `{ mount, destroy, applyReadOnlyChrome }`; `showCopyable` optional `toggle` is named-method growth, not dispatch.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — no `helpers/`; verb+noun files; orch stays wiring; contract first (delta is law).
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English ids; German only in labels; CSS `kdb-share-read-only`; `isKdbReadOnly`.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on apply, click open, toggle change; no throw on missing host.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — `dashboardClassHost` + `querySelector`; no `getElementById("main")`; second share document-root exception.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — factory-scope named helpers; no nested functions in entry bodies; controller stays ≤6 AMD; orch 4→5.
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` / `__getDashboardAPI` / new facet.
12. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — do not invent a lifecycle for this class.
13. `_____________KDB3API/contracts/shareControls-read-only-link-contractdelta.md` — pad A; token `readOnly=1` exact; add **or** remove class; hide-set only those four subjects.
14. This execution spec.

---

## Section B. Folder tree (create / edit order)

```
KDB3/js/dashboard/controls/shareControls/config/shareReadOnlyToken.js
KDB3/js/dashboard/controls/shareControls/config/shareReadOnlyClass.js
KDB3/js/dashboard/controls/shareControls/config/shareLabels.js
KDB3/css/shareReadOnly.css
KDB3/js/core/css/config/cssHrefList.js
KDB3/js/dashboard/controls/shareControls/effects/readShareReadOnlyTokenPresent.js
KDB3/js/dashboard/controls/shareControls/effects/applyShareReadOnlyChrome.js
KDB3/js/dashboard/controls/shareControls/__orchestratorShareControls.js
KDB3/js/KDB.js
KDB3/js/dashboard/controls/shareControls/effects/buildShareDashboardLink.js
KDB3/js/dashboard/controls/shareControls/effects/openShareCopyDialog.js
KDB3/js/dashboard/controls/shareControls/effects/bindShareClick.js
KDB3/js/core/services/messageService/view/appendCopyableToggle.js
KDB3/js/core/services/messageService/view/bindCopyableToggle.js
KDB3/js/core/services/messageService/view/buildMessageDialog.js
KDB3/js/core/services/messageService/view/bindMessageDialog.js
KDB3/css/messageService.css
```

No `helpers/`. `KDB.js`: one `applyReadOnlyChrome()` wiring line in `finishDashboardInitialization` only (no extra AMD).

---

## Section C. Per-file specifications

#### `KDB3/js/dashboard/controls/shareControls/config/shareReadOnlyToken.js`

- **Role:** constants object
- **Lines:** target 12 (hard 40)
- **AMD:** `define([], function () { ... })`
- **Return:** `{ TOKEN_KEY: "readOnly", TOKEN_VALUE: "1" }` — exact strings.
- **Rules to apply:** `amd.mdc`, `naming.mdc` (`TOKEN_KEY` / `TOKEN_VALUE` UPPER_SNAKE).

#### `KDB3/js/dashboard/controls/shareControls/config/shareReadOnlyClass.js`

- **Role:** constants object (same shape as `dashboardPdf/config/captureChromeClass.js`)
- **Lines:** target 10 (hard 40)
- **Return:** `{ SHARE_READ_ONLY_CLASS: "kdb-share-read-only" }`
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `kdb-object.mdc` (token in owner config, not `_KDB.*`).

#### `KDB3/js/dashboard/controls/shareControls/config/shareLabels.js`

- **Role:** German labels
- **Lines:** live 14 → ~18
- **Change:** add `readOnlyToggleLabel: "Nur Lesen"` and `readOnlyToggleTitle: "Ohne KDB-Steuerung und Widget-Einstellungen"`. Do not change existing keys.
- **Rules to apply:** `naming.mdc` (German only here).

#### `KDB3/css/shareReadOnly.css`

- **Role:** hide-set
- **Lines:** target 8 (hard 40)
- **Exact rules:**

```css
#main.kdb-share-read-only #kdb-control-root,
#main.kdb-share-read-only .KDB_widgetSettingsButton,
#main.kdb-share-read-only .KDB_widgetSettings,
#main.kdb-share-read-only .KDB_focusModeSettingsPanel {
  display: none !important;
}
```

- Do **not** add maximize, drillthrough, `.widgetIcons`, leftover, or PDF subjects.
- **Rules to apply:** `dom.mdc` (class host `#main`); `naming.mdc` (`kdb-` kebab).

#### `KDB3/js/core/css/config/cssHrefList.js`

- **Role:** href list
- **Change:** insert `"./v1/ext/KDB3/css/shareReadOnly.css"` **immediately after** `"./v1/ext/KDB3/css/shareControls.css"` (today line 7). Do not reorder other rows.
- **Rules to apply:** `feature-structure.mdc` (one-line wiring).

#### `KDB3/js/dashboard/controls/shareControls/effects/readShareReadOnlyTokenPresent.js`

- **Role:** SET-ladder parse (fork; **do not** import `readUrlParameterId`)
- **AMD:** `["../config/shareReadOnlyToken.js"]`
- **Return:** boolean. A = `performance.getEntriesByType("navigation")[0].name`; B = `document.location.href`. Per candidate: query `TOKEN_KEY` then hash `?`-slice. Present iff exact `TOKEN_VALUE` `"1"`.
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`, `naming.mdc`.

#### `KDB3/js/dashboard/controls/shareControls/effects/applyShareReadOnlyChrome.js`

- **Role:** effect — host + add/remove class (parse lives in `readShareReadOnlyTokenPresent.js`)
- **AMD imports (order):** `"../config/shareReadOnlyClass.js"`, `"./readShareReadOnlyTokenPresent.js"`
- **Factory-scope:** `readDashboardClassHostSelector`, `resolveDashboardClassHost` (`querySelector(dashboardClassHost)`; no `getElementById("main")`)
- **Entry:** `applyShareReadOnlyChrome(_KDB)` — missing host: warn + return (no add/remove). If token present: `classList.add`; else `remove`. Catch: `console.error("[shareControls.applyShareReadOnlyChrome] failed", err)` — no throw.
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`, `dom.mdc`, `cognos-adapter.mdc`, `state.mdc`.

#### `KDB3/js/dashboard/controls/shareControls/__orchestratorShareControls.js`

- **Role:** orchestrator
- **AMD:** 5 including `"./effects/applyShareReadOnlyChrome.js"` as `_applyShareReadOnlyChrome`.
- **Body:** after `stampDashboardFacet`, `_applyShareReadOnlyChrome(_KDB)`; assign controller; `_KDB.api.shareControls.applyReadOnlyChrome = applyReadOnlyChrome.bind(null, _KDB)` (factory-scope helper, not nested in `__orchestrator`).
- **Rules to apply:** `feature-structure.mdc`, `amd.mdc`, `kdb-object.mdc`.

#### `KDB3/js/KDB.js`

- **Change only:** `finishDashboardInitialization` — if `api.shareControls.applyReadOnlyChrome` exists, call it **immediately before** `whenUrlShareRestoreSettled`. Same `_isDisposed` guard. No extra AMD.

#### `KDB3/js/dashboard/controls/shareControls/effects/buildShareDashboardLink.js`

- **Role:** URL builder
- **Lines:** live 22 → target ~28 (hard 80)
- **AMD:** add `"../config/shareReadOnlyToken.js"` as `_shareReadOnlyToken` (2 imports).
- **Change:** after `params.set("parameterLabel", ...)`:

```js
if (input.isKdbReadOnly === true) {
  params.set(_shareReadOnlyToken.TOKEN_KEY, _shareReadOnlyToken.TOKEN_VALUE);
}
```

Keep `biBase + "#" + params.toString()`. No braces. Do not put token in `shareLinkHashKeys.js`.
- **Rules to apply:** `amd.mdc`, `naming.mdc` (`isKdbReadOnly`).

#### `KDB3/js/dashboard/controls/shareControls/effects/openShareCopyDialog.js`

- **Role:** effect — dual URL + `showCopyable`
- **Lines:** target 50 (hard 120)
- **AMD:** `"./buildShareDashboardLink.js"`
- **Entry:** `function openShareCopyDialog(_KDB, _input)`
  1. try
  2. `linkInput` = `{ biBase, boardId, id, label, emptyParameterLabel }` from `_input`
  3. `editUrl = _buildShareDashboardLink` with `isKdbReadOnly: false`
  4. `readOnlyUrl = _buildShareDashboardLink` with `isKdbReadOnly: true`
  5. `_KDB.services.message.showCopyable({ title: _input.title, message: "", copyText: readOnlyUrl, toggle: { label: labels.readOnlyToggleLabel, title: labels.readOnlyToggleTitle, isChecked: true, copyTextChecked: readOnlyUrl, copyTextUnchecked: editUrl } })`
  6. catch: `console.error("[shareControls.openShareCopyDialog] failed", err)`
- Labels from `_input.labels`. Do not hardcode German here.
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`, `module-public-api.mdc` (direct `message.showCopyable`), `events.mdc` (none).

#### `KDB3/js/dashboard/controls/shareControls/effects/bindShareClick.js`

- **Role:** click bind
- **Lines:** live 110; `onShareClick` must stay **≤60**. Target file ≤120.
- **AMD:** replace `buildShareDashboardLink` with `"./openShareCopyDialog.js"`. Keep `readDashboardFacet`. Total **2**.
- **Change:** after successful boardId + biBase + `labelText` / title resolve, call `_openShareCopyDialog(_KDB, { biBase, boardId, id: selected.id, label: selected.label, emptyParameterLabel, title, labels })`. Remove inlined `showCopyable` / `_buildShareDashboardLink` from `onShareClick`. Keep alerts and missing-facet warn.
- **Rules to apply:** `amd.mdc` (no nested functions in `onShareClick`), `error-handling.mdc`, `feature-structure.mdc` (controller-fn ≤60).

#### `KDB3/js/core/services/messageService/view/appendCopyableToggle.js`

- **Role:** view builder
- **Lines:** target 55 (hard 120)
- **AMD:** `[]`
- **Factory-scope:** `function isCopyableToggleValid(_toggle)` — object; `label` non-empty string; `title` string (may be empty); `isChecked` boolean; `copyTextChecked` / `copyTextUnchecked` non-empty strings. Else false.
- **Entry:** `function appendCopyableToggle(_ownerDocument, _bodyEl, _options)`
  1. try
  2. if `!isCopyableToggleValid(options.toggle)`: if `options.toggle` is present, `console.warn("[messageService.appendCopyableToggle] invalid toggle ignored")`; return null
  3. Build **text** switch (not icon), same classes as `createToggleSwitch` **without** `data-kdb-action`:
     - wrapper `div.kdb-message-dialog__toggle`
     - `label.kdb-control_switch-row.KDB_ToggleButton` (`title` attr = `toggle.title` or `toggle.label`)
     - `span.kdb-control_switch-label` text = `toggle.label`
     - `span.kdb-control_switch-track` > `input.kdb-control_switch-input` type checkbox + `span.KDB_ToggleButton_slider.KDB_ToggleButton_round`
  4. `input.checked = toggle.isChecked === true`; `aria-label` = `toggle.label`
  5. Insert wrapper **before** the textarea (caller passes bodyEl; this function appends the wrapper then caller appends textarea — **or** insertBefore textarea if already in body). Spec: **caller** (`buildMessageDialog`) appends toggle **then** textarea so toggle is above the URL.
  6. return `inputEl`
  7. catch: `console.error("[messageService.appendCopyableToggle] failed", err)`; return null
- **No** kdbControl JS import. **No** `data-kdb-action`.
- **Rules to apply:** `amd.mdc`, `dom.mdc`, `error-handling.mdc`, `naming.mdc`.

#### `KDB3/js/core/services/messageService/view/bindCopyableToggle.js`

- **Role:** view binder
- **Lines:** target 40 (hard 80)
- **AMD:** `[]` — receive `registerListener`? **Do not** duplicate listener bookkeeping. Export `function bindCopyableToggle(_registerListener, _runtime, _handle, _request)` called from `bindMessageDialog`.
  1. try
  2. if no `_handle.toggleInputEl` or no `_handle.copyTextEl` return
  3. `_registerListener(runtime, handle, handle.toggleInputEl, "change", onToggleChange)` where `onToggleChange` is a **factory-scope** named function `syncCopyableToggleFromInput(_handle, _request, _event)`:
     - read `input.checked`
     - url = checked ? `toggle.copyTextChecked` : `toggle.copyTextUnchecked`
     - `_request.options.copyText = url`
     - `_handle.copyTextEl.value = url`
  4. catch: `console.error("[messageService.bindCopyableToggle] failed", err)`
- **Do not** clone options. Mutate `request.options.copyText`.
- **Rules to apply:** `amd.mdc` (change handler at factory scope, not inside `__controller`), `error-handling.mdc`.

#### `KDB3/js/core/services/messageService/view/buildMessageDialog.js`

- **Role:** view builder
- **Lines:** live 115 → target ~125 (hard 150)
- **AMD:** add `"./appendCopyableToggle.js"`
- **Change:** for `copyable`, call `_appendCopyableToggle(doc, bodyEl, options)` **before** `appendCopyableContent`. Store `toggleInputEl` on the returned handle (`null` if no toggle). Keep existing copyable textarea path.
- **Rules to apply:** `amd.mdc`, `dom.mdc`, `feature-structure.mdc` (≤150).

#### `KDB3/js/core/services/messageService/view/bindMessageDialog.js`

- **Role:** view binder
- **Lines:** live 130 → must stay ≤150. **Do not** inline the toggle handler.
- **AMD:** add `"./bindCopyableToggle.js"`
- **Change:**
  1. `readFocusable` selector becomes `button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])`
  2. After `bindCopySelection`, call `_bindCopyableToggle(registerListener, _runtime, _handle, _request)`
  3. Initial focus stays on textarea (`focusInitialControl` unchanged)
- **Rules to apply:** `amd.mdc`, `dom.mdc`, `error-handling.mdc`.

#### `KDB3/css/messageService.css`

- **Role:** dialog alignment only
- **Add** at end (do not restyle the kdbControl switch geometry):

```css
.kdb-message-dialog__toggle {
  display: flex;
  justify-content: flex-start;
  margin: 0 0 12px;
}
.kdb-message-dialog__toggle .kdb-control_switch-row {
  justify-content: flex-start;
  max-width: none;
  width: auto;
}
```

- **Rules to apply:** `naming.mdc`.

---

## Section D–I

No reducer, no selectors, no harness, no new public methods on `_KDB.api.shareControls`. `showCopyable` options grow as the delta. No `_KDB.state` init.

---

## Section J. Acceptance criteria

1. Every Section B path exists (except `createModalQueue.js` — **not** in B).
2. Token exact `readOnly` / `1`. Class exact `kdb-share-read-only`.
3. Apply **adds and removes**. Destroy / cleanupShareControlsRuntime **unchanged**.
4. `onShareClick` ≤60. Controller AMD still **6**. Orch AMD **5**. No file >150. No nested functions in AMD entry bodies.
5. Hide CSS has exactly the four subjects. No PDF hide-set copy.
6. `showCopyable` without `toggle` still works (omit → no checkbox).
7. Copy uses mutated `options.copyText` (do not edit queue unless dual review proves stale paste).
8. No `_KDB.cognosAPI`, no `__getDashboardAPI`, no `readUrlParameterId` edit, no extra `KDB.js` AMD (the `applyReadOnlyChrome` wiring line is required), no `hidWs` / `KDB_developerMode` reuse.
9. Pre-flight 14 echoes submitted.

---

## Section K. Forbidden

- `.cursor/rules/*.mdc`, `_template.md`, `_executionSpecTemplate.md`
- Parent contracts except **captain** one-line patches **after** dual review (not writers)
- Extra `KDB.js` AMD; writeback; leftoverWidgets; pdfCapture; kdbControl JS; widgetSettings JS; `createModalQueue.js` (default). The existing `applyReadOnlyChrome()` call in `finishDashboardInitialization` stays.
- `helpers/` / `common/` / `shared/` / leftover `Support`
- ES modules in `KDB3/js/**`
- git commit/push unless PO asks
- Invent HMAC/SHA, readable hash keys, toolbar toggle, custom share modal
- Skip Section A

---

## Section L. Reporting template

1. Pre-flight echo (14)
2. File checklist: path, lines, AMD count, matches spec | deviation
3. Deviations with motivation
4. Section J pass/fail
5. Open questions

---

## Section M. Reviewer handoff (captain)

1. Confirm delta **Approved** before treating writers as authorized.
2. Fresh dual review (mechanical MUST + semantic delta vs code), **not** the writers.
3. One-line parent patches (`shareControls.md` §0/§8/§9/§10, `messageService.md` Q11 + method table) — captain, not army.
4. PO Cognos checklist = delta §10 (Dutch briefing).
5. ReadLints on touched JS.
